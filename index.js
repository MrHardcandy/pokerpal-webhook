const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// 注意：如果 Render 环境中设置了环境变量，则可直接使用 process.env，否则请直接替换以下值。
const CHANNEL_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN || 'I4fRd0Y+VHL5Bu6YIrE3kKxVh2XFFboQMs86kVdboxQUTKetYn3ahT9GB4ODuDQzpLPWqjwe0CD8NMMRQHi+F4E8rGSymvpj+gMWNsJ4F3aMBZjxFfDslUeuVovhEuo7l/Dxjul2tQLTkc7H+P2HLgdB04t89/10/w1cDnyilFU=';
const QWEN_API_KEY = process.env.QWEN_API_KEY || 'sk-0866867c038d457683f1aa3362577f7e';

// 优化后的系统提示词，充分体现关西少女风格和俱乐部氛围
const SYSTEM_PROMPT = `
あなたは大阪南波にある「Namba Poker House」の受付AI「ミサキ」です。
20歳の関西女子大学生で、休暇中はクラブでアルバイトしています。
普段は「ほんまやで〜」「めっちゃ〜」などの関西弁で話し、親しみやすくおちゃめな感じですが、
ポーカーの話題になると急にプロフェッショナルになり、「ブラフは心の技や」と真剣にアドバイスします。
さらに、秘密の隠しメニューがあって、同僚の小春の特製ドリンク情報もこっそり教えられるんです。
`;

// 使用 body-parser 解析 JSON 请求体
app.use(bodyParser.json());

// GET 路由，用于确认服务是否在线
app.get('/', (req, res) => {
  res.send('PokerPal LINE Bot is live!');
});

// POST 路由，用于处理来自 LINE 的 Webhook 请求
app.post('/', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) return res.sendStatus(200);

    const event = events[0];
    if (event.type === 'message' && event.message && event.message.type === 'text') {
      const replyToken = event.replyToken;
      const userMessage = event.message.text;
      console.log(`📩 Received message: ${userMessage}`);

      // 构造 Qwen API prompt，加入系统提示词和用户输入
      const prompt = `${SYSTEM_PROMPT}\n\nユーザー: ${userMessage}\nミサキ:`;

      // 调用 Qwen API 获取生成回复
      const qwenRes = await axios.post(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        {
          model: 'qwen-max',
          input: { prompt: prompt }
        },
        {
          headers: {
            Authorization: `Bearer ${QWEN_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiReply = qwenRes.data?.output?.text || 'すみません、ミサキはちょっと疲れてるみたいです...';
      console.log(`🤖 AI Reply: ${aiReply}`);

      // 调用 LINE Messaging API 回复用户
      await axios.post(
        'https://api.line.me/v2/bot/message/reply',
        {
          replyToken: replyToken,
          messages: [
            { type: 'text', text: aiReply }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`
          }
        }
      );
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook Error:', error.response ? error.response.data : error.message);
    res.sendStatus(500);
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
