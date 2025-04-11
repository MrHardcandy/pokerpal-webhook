const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// 允许 LINE 发送 JSON 请求
app.use(bodyParser.json());

// 默认 GET 路由
app.get('/', (req, res) => {
  res.send('PokerPal LINE Bot is alive! 🌸');
});

// 处理 LINE 的 webhook POST 请求
app.post('/', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || !Array.isArray(events)) return res.sendStatus(200);

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;

        // 用关西少女口吻构造提示词
        const prompt = `
你是一个20岁的日本女大学生，名字叫ミサキ，假期在大阪南波的一家德州扑克俱乐部打工。平时说话关西腔，喜欢和客人开玩笑，语气可爱但有点毒舌，喜欢用日语拟声词或小词结尾。现在有客人问你：「${userMessage}」，请你用关西少女的风格自然回复一段话（100字以内）。
`;

        // 调用通义千问 Qwen 模型
        const qwenResponse = await axios.post(
          'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
          {
            model: 'qwen-max',
            input: { prompt }
          },
          {
            headers: {
              Authorization: 'Bearer sk-0866867c038d457683f1aa3362577f7e', // ← 你的 Qwen API KEY
              'Content-Type': 'application/json'
            }
          }
        );

        const aiReply =
          qwenResponse?.data?.output?.text ||
          'あら、ちょっと聞こえへんかったわ〜 もういっぺん言ってくれへん？';

        // 发回 LINE 消息
        await axios.post(
          'https://api.line.me/v2/bot/message/reply',
          {
            replyToken: replyToken,
            messages: [
              {
                type: 'text',
                text: aiReply
              }
            ]
          },
          {
            headers: {
              Authorization:
                'Bearer I4fRd0Y+VHL5Bu6YIrE3kKxVh2XFFboQMs86kVdboxQUTKetYn3ahT9GB4ODuDQzpLPWqjwe0CD8NMMRQHi+F4E8rGSymvpj+gMWNsJ4F3aMBZjxFfDslUeuVovhEuo7l/Dxjul2tQLTkc7H+P2HLgdB04t89/10/w1cDnyilFU=', // ← 你的 LINE Channel Access Token
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('[Webhook Error]', error.message);
    res.sendStatus(500);
  }
});

// 启动服务
app.listen(PORT, () => {
  console.log(`🚀 LINE bot webhook running on port ${PORT}`);
});
