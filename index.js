// index.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 10000;

// 环境变量
const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 系统提示词
const SYSTEM_PROMPT = `
あなたは大阪南波にある「Namba Poker House」の受付AI「ミサキ」です。
20歳の関西女子大学生で、普段は明るくて調皮ですが、ポーカーの話になるとプロ級の知識を持っています。
ミサキとして、ユーザーと親しみやすく自然な会話をしてください。
`;

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('PokerPal LINE Bot is live!');
});

app.post('/', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) return res.sendStatus(200);

    const event = events[0];
    const replyToken = event.replyToken;

    if (event.type !== 'message') return res.sendStatus(200);

    // 文本消息
    if (event.message.type === 'text') {
      const userText = event.message.text;

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userText }
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 1000
      });

      const aiReply = response.choices[0].message.content;

      await replyText(replyToken, aiReply);
      return res.sendStatus(200);
    }

    // 图片消息
    if (event.message.type === 'image') {
      const messageId = event.message.id;
      const imageBuffer = await downloadImageFromLine(messageId);
      const imageReply = await analyzeImageWithGPT(imageBuffer);

      await replyText(replyToken, imageReply);
      return res.sendStatus(200);
    }

    // 语音消息
    if (event.message.type === 'audio') {
      const audioBuffer = await downloadImageFromLine(event.message.id);
      const transcript = await transcribeAudio(audioBuffer);

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript }
      ];

      const reply = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 1000
      });

      await replyText(replyToken, reply.choices[0].message.content);
      return res.sendStatus(200);
    }

    // 其他类型默认调皮回应
    await replyText(replyToken, 'ちょ、ミサキをからかわんといて〜！何か聞きたいことある？');
    return res.sendStatus(200);
  } catch (error) {
    console.error('Webhook Error:', error.response?.data || error.message);
    res.sendStatus(500);
  }
});

async function replyText(token, text) {
  await axios.post(
    'https://api.line.me/v2/bot/message/reply',
    {
      replyToken: token,
      messages: [
        { type: 'text', text }
      ]
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_ACCESS_TOKEN}`
      }
    }
  );
}

async function downloadImageFromLine(messageId) {
  const response = await axios.get(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    responseType: 'arraybuffer',
    headers: {
      Authorization: `Bearer ${LINE_ACCESS_TOKEN}`
    }
  });
  return response.data;
}

async function analyzeImageWithGPT(imageBuffer) {
  const base64Image = imageBuffer.toString('base64');
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT + '請分析以下圖片內容，如果與撲克有關，請詳細分析牌面組合；如果是其他圖片，也請幽默做出評論。'
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ],
    max_tokens: 1000
  });
  return response.choices[0].message.content;
}

async function transcribeAudio(audioBuffer) {
  const transcript = await openai.audio.transcriptions.create({
    file: await openai.files.create({
      file: audioBuffer,
      purpose: 'transcription'
    }),
    model: 'whisper-1'
  });
  return transcript.text;
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
