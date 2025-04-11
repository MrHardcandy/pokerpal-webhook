const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// 环境变量（也可以写在 .env 文件中）
const CHANNEL_ACCESS_TOKEN = '你的LINE Channel Access Token';
const QWEN_API_KEY = '你的通义千问 API KEY';

app.use(bodyParser.json());

// LINE webhook 测试 GET 路由（可选）
app.get('/', (req, res) => {
  res.send('PokerPal LINE Bot is live!');
});

// LINE webhook 主路由（必须是 POST /）
app.post('/', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) return res.sendStatus(200);

    const replyToken = events[0].replyToken;
    const userMessage = events[0].message.text;

    // 调用 Qwen API
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: 'qwen-max',
        input: {
          prompt: `你是一个在大阪南波PokerPal俱乐部打工的20岁大学生女孩，讲一口关西腔，平时调皮又爱开玩笑，但在德州扑克技巧上经验老道。现在和玩家对话：${userMessage}`
        }
      },
      {
        headers: {
          Authorization: `Bearer ${QWEN_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const aiReply = response.data.output.text;

    // 回复 LINE 用户
    await axios.post(
      'https://api.line.me/v2/bot/message/reply',
      {
        replyToken,
        messages: [
          {
            type: 'text',
            text: aiReply,
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        }
      }
    );

    res.sendStatus(200);
  } catch (error) {
    console.error('LINE Bot Error:', error.response?.data || error.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
