// PokerPal LINE Bot - 支持语音转写与上下文管理
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');
const FormData = require('form-data');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.PORT || 10000;

const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const configuration = new Configuration({ apiKey: OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

const memory = {}; // 上下文内存

const SYSTEM_PROMPT = `
あなたは「Namba Poker House」南波クラブの受付AI「ミサキ」、20歳、関西弁を話す女子大生。
ポーカーにはプロ並みの知識を持ち、お茶目な性格でお客さんと接する。
- 絵文字やスタンプには「ちょ、ミサキをからかわんといて〜！」などで対応。
- 音声メッセージが来たら文字起こしして、その内容で応答。
- 画像には内容を説明しようとする（ポーカー関連なら分析も）
- 积分を尋ねられたら「会員IDを連携してください」と案内。「私の名前は◯◯です。IDは◯◯です…」形式で来たら「查无此ID，绑定失败…」で固定応答。
- イベント、賞品、住所の質問には丁寧に対応。
住所：大阪府大阪市浪速区難波中2丁目10-70 パークスタワー20F。
`;

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('🎴 ミサキはPokerPal LINE Botやで〜！');
});

app.post('/', async (req, res) => {
  const events = req.body.events;
  if (!events || events.length === 0) return res.sendStatus(200);

  for (const event of events) {
    if (event.type !== 'message') continue;

    const userId = event.source.userId;
    const replyToken = event.replyToken;
    const message = event.message;

    try {
      let userInput = '';

      if (message.type === 'text') {
        userInput = message.text;
      } else if (message.type === 'audio') {
        const audioBuffer = await downloadLineFile(message.id);
        const mp3Path = await convertToMp3(audioBuffer);
        const transcription = await transcribeAudio(mp3Path);
        fs.unlinkSync(mp3Path);
        userInput = transcription || '（音声识别失败）';
      } else if (message.type === 'image') {
        userInput = '（用户发送了图片，尝试进行图像分析）';
      } else if (message.type === 'sticker' || message.type === 'emoji') {
        return await replyMessage(replyToken, 'ちょ、ミサキをからかわんといて〜！😤');
      } else {
        userInput = '（未知消息类型）';
      }

      if (!memory[userId]) memory[userId] = [];
      memory[userId].push({ role: 'user', content: userInput });

      const recentMessages = memory[userId].slice(-6);
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...recentMessages
      ];

      const chatRes = await openai.createChatCompletion({
        model: 'gpt-4o',
        messages,
        temperature: 0.7
      });

      const reply = chatRes.data.choices[0].message.content;
      memory[userId].push({ role: 'assistant', content: reply });
      await replyMessage(replyToken, reply);
    } catch (err) {
      console.error('Webhook Error:', err.response?.data || err.message);
    }
  }

  res.sendStatus(200);
});

async function replyMessage(token, text) {
  await axios.post('https://api.line.me/v2/bot/message/reply', {
    replyToken: token,
    messages: [{ type: 'text', text }]
  }, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_ACCESS_TOKEN}`
    }
  });
}

async function downloadLineFile(messageId) {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` }
  });
  return Buffer.from(res.data);
}

async function convertToMp3(buffer) {
  const inputPath = path.join(__dirname, 'temp_input.m4a');
  const outputPath = path.join(__dirname, 'output.mp3');
  fs.writeFileSync(inputPath, buffer);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .save(outputPath)
      .on('end', () => {
        fs.unlinkSync(inputPath);
        resolve(outputPath);
      })
      .on('error', reject);
  });
}

async function transcribeAudio(mp3Path) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(mp3Path));
  formData.append('model', 'whisper-1');

  const res = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      ...formData.getHeaders()
    }
  });

  return res.data.text;
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
