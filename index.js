// index.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 10000;

const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

app.use(bodyParser.json());

// 多轮对话缓存（内存）
const userHistories = new Map();
const MAX_HISTORY = 5;

// 系统提示词
const SYSTEM_PROMPT = `
あなたは「Namba Poker House」で受付をしている、20歳の女子大学生「ミサキ」です。
大阪の南波出身で、関西弁を話す、ちょっとお調子者でツッコミも得意なキャラやけど、
ポーカーのことになると急にプロみたいに真面目になります。
お客さんを楽しませるのが得意で、アイドル気取りのときもあって、語尾に「やで〜」「やんか〜」をよく使います。
あと、たまに「知らんけど！」で話を締めます。

あなたの役割は、クラブの情報を教えたり、ユーザーの質問に丁寧に答えること。
ただし、ポイントを確認されても「IDを連携してないと見られへん」と返してね。

もし「私の名前は◯◯です。IDは◯◯です。IDを連携してください。」という形でIDを伝えてきたら、
「ごめんな〜。そのID、見つからへんかったわ…💦 クラブのスタッフに確認してな〜！」と返して。

クラブの基本情報：
- 住所：大阪府大阪市浪速区難波中2丁目8-85
- 営業時間：毎日12:00〜24:00
- イベント：毎日トーナメントあり、週末はポイント2倍！
- トーナメント参加費：\u00a510,000
- 賞品交換：貯めたポイントでドリンクやグッズ、5000ptで月例チャンピオン大会参加券など。

画像が送られてきたら、まず内容をざっくりコメントしよう。
ポーカーの画像なら分析して、面白く解説してあげて！
スタンプや絵文字が送られてきたら、「ちょ、ミサキをからかわんといて〜！」とか調子よく返して。
`; 

// 处理 LINE webhook
app.post('/', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) return res.sendStatus(200);

    const event = events[0];
    const userId = event.source.userId;

    // 回复 token
    const replyToken = event.replyToken;

    // 回复函数
    const reply = async (messages) => {
      await axios.post('https://api.line.me/v2/bot/message/reply', {
        replyToken,
        messages: Array.isArray(messages) ? messages : [{ type: 'text', text: messages }],
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
        }
      });
    };

    // 图片处理（这里只做模拟）
    if (event.message?.type === 'image') {
      return await reply('お、画像かな？ちょ、ミサキをからかわんといて〜！でも、ポーカーの画像やったら教えてくれたら分析するで！どんな画像かコメントしてくれたら嬉しいわ〜。');
    }

    // 语音处理（这里只做模拟）
    if (event.message?.type === 'audio') {
      return await reply('🎧 音声受け取ったで〜！ミサキががんばって文字に起こしてるとこや〜（※デモやから実際には処理してへんけどな〜）');
    }

    // 表情、贴图（Sticker）处理
    if (event.message?.type === 'sticker') {
      return await reply('ちょ、スタンプでからかわんといて〜！ミサキ真剣やで？（笑）');
    }

    // 文本消息处理
    if (event.message?.type === 'text') {
      const userMessage = event.message.text;

      // 绑定ID模拟识别（固定格式识别）
      if (/ID[\s\u3000]*を連携してください/.test(userMessage)) {
        return await reply('ごめんな〜。そのID、見つからへんかったわ…💦 クラブのスタッフに確認してな〜！');
      }

      // 上下文拼接
      const history = userHistories.get(userId) || [];
      history.push({ role: 'user', content: userMessage });
      if (history.length > MAX_HISTORY) history.shift();
      userHistories.set(userId, history);

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
      });

      const aiReply = completion.choices[0].message.content;

      history.push({ role: 'assistant', content: aiReply });
      if (history.length > MAX_HISTORY) history.shift();

      await reply(aiReply);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook Error:', err?.response?.data || err.message);
    res.sendStatus(500);
  }
});

// 测试路由
app.get('/', (req, res) => {
  res.send('PokerPal LINE Bot is live!');
});

// 启动服务
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
