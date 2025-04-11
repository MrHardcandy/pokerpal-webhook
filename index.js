const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// 为 LINE 请求准备
app.use(bodyParser.json());

app.post('/', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || !Array.isArray(events)) {
      return res.sendStatus(200);
    }

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;

        // 调用通义千问 Qwen 模型
        const qwenResponse = await axios.post(
          'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
          {
            model: 'qwen-max',
            input: {
              prompt: `你是一个在大阪南波德州扑克俱乐部打工的20岁关西女孩ミサキ，请用亲切幽默又稍微毒舌的关西语气回答：${userMessage}`,
            }
          },
          {
            headers: {
              'Authorization': 'Bearer sk-0866867c038d457683f1aa3362577f7e',
              'Content-Type': 'application/json'
            }
          }
        );

        const replyText = qwenResponse.data.output.text || 'ごめんやで、ミサキ今ちょっと寝てたわ〜💤';

        // 发送消息回 LINE
        await axios.post(
          'https://api.line.me/v2/bot/message/reply',
          {
            replyToken: replyToken,
            messages: [{ type: 'text', text: replyText }]
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer d0c41c93d4f53fba589ed47b503cdb8e`
            }
          }
        );
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('处理 LINE 消息出错:', err);
    res.sendStatus(500);
  }
});

// 默认 GET 路由
app.get('/', (req, res) => {
  res.send('LINE Bot is running!');
});

app.listen(PORT, () => {
  console.log(`LINE bot webhook running on port ${PORT}`);
});
