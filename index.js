const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  const incoming = req.body;
  const userMsg = incoming.message?.payload?.text || '未收到消息';

  console.log("💬 用户说：", userMsg);

  const reply = `ミサキです～欢迎光临南波扑克俱乐部❤️！你刚说了：「${userMsg}」`;

  res.json({
    message: {
      type: "text",
      text: reply
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Webhook running on port ${port}`);
});
