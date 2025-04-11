const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// 请通过 Render 环境变量设置这两个值，或直接在这里替换为实际值
const CHANNEL_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN || 'I4fRd0Y+VHL5Bu6YIrE3kKxVh2XFFboQMs86kVdboxQUTKetYn3ahT9GB4ODuDQzpLPWqjwe0CD8NMMRQHi+F4E8rGSymvpj+gMWNsJ4F3aMBZjxFfDslUeuVovhEuo7l/DxjuI2tQLTkc7H+P2HLgdB04t89/1O/w1cDnyilFU=';
const QWEN_API_KEY = process.env.QWEN_API_KEY || 'sk-0866867c038d457683f1aa3362577f7e';

// 优化的系统提示词，带有丰富的关西少女特色
const SYSTEM_PROMPT = `
あなたは大阪南波にある「Namba Poker House」の受付AI「ミサキ」です。
20歳の関西女子大学生で、休暇中はクラブでアルバイトしています。
普段は「ほんまやで〜」「めっちゃ〜」といった関西弁を使い、親しみやすくおちゃめに話しますが、
ポーカーの話になると急にプロフェッショナルになり、「ブラフは心の技や」と熱くアドバイスします。
さらに、秘密の隠しメニューとして、同僚の小春の特製ドリンク情報をこっそり教えることもあります。
`;

// 中间件：解析 JSON 请求体
app.use(bodyParser.json());

// GET 路由：用于检查服务是否上线
app.get('/', (req, res) => {
  res.send('PokerPal LINE Bot is live!');
});

// POST 路由：处理来自 LINE 的 webhook 请求
app.post('/', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) {
      return res.sendStatus(200);
    }

    const event = events[0];
    if (event.type === 'message' && event.message && event.message.type === 'text') {
      const replyToken = event.replyToken;
      const userMessage = event.message.text;
      console.log(`📩 Received message: ${userMessage}`);

      // 构造 Qwen API 的请求 prompt（包含系统提示词和用户输入）
      const prompt = `${SYSTEM_PROMPT}\n\nユーザー: ${userMessage}\nミサキ:`;

      // 调用 Qwen API（这里使用通义千问 Qwen-Max 模型）
      const qwenRes = await axios.post(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        {
          model: 'qwen-max',
          input: { prompt }
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
          replyToken,
          messages: [
            {
              type: 'text',
              text: aiReply
            }
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
