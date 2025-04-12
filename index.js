const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config(); // 加载环境变量

const app = express();
const PORT = process.env.PORT || 10000;

// 从环境变量读取密钥
const CHANNEL_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 使用 GPT-4o mini 模型
const MODEL = 'gpt-4o';

// 系统提示词（关西少女人设）
const SYSTEM_PROMPT = `
あなたは大阪南波にある「Namba Poker House」の受付AI「ミサキ」です。
20歳の関西女子大学生で、休暇中はクラブでアルバイトしています。
普段は「ほんまやで〜」「めっちゃ〜」といった関西弁で話し、親しみやすくおちゃめですが、
ポーカーの話になると急にプロフェッショナルになり、「ブラフは心の技や」と情熱的にアドバイスします。
さらに、秘密の裏メニューで、同僚の小春の特製ドリンク情報をこっそり教えられることもあります。
`;

// 中间件
app.use(bodyParser.json());

// 测试用 GET 路由
app.get('/', (req, res) => {
  res.send('PokerPal LINE Bot is live!');
});

// 主 Webhook 路由
app.post('/', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) return res.sendStatus(200);

    const event = events[0];
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;
      const replyToken = event.replyToken;

      console.log('📩 收到用户消息：', userMessage);

      // 请求 OpenAI GPT-4o mini
      const openaiResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiReply = openaiResponse.data.choices[0].message.content || 'ミサキはちょっと疲れてるみたいやね…';
      console.log('🤖 AI 回复：', aiReply);

      // 通过 LINE API 回复用户
      await axios.post(
        'https://api.line.me/v2/bot/message/reply',
        {
          replyToken,
          messages: [{ type: 'text', text: aiReply }]
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
    console.error('❌ Webhook 错误：', error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 LINE GPT-4o Webhook 运行中，端口 ${PORT}`);
});
