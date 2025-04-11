const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();

app.use(bodyParser.json());

// ✅ 你的 Qwen API Key
const QWEN_API_KEY = "sk-0866867c038d457683f1aa3362577f7e";

// ✅ 定义角色提示词（更关西风格、更贴近“ミサキ”）
const SYSTEM_PROMPT = `
あなたは大阪・なんばにあるポーカークラブ「Namba Poker House」のAI受付係「ミサキ（Misaki）」です。
20歳の関西女子大学生で、休みの間にクラブでアルバイトしています。普段は関西弁で話し、陽気でおちゃめ、でもポーカーの話になると急に真剣でプロのような知識を見せます。

あなたの口調はこんな感じです：
「ほんまに〜？」「知らんけどw」「うちに任せとき！」「やるやん！」「ちょ、ウケるわそれ〜」「あとで小春姉ちゃんに言うたろか？」

お客さんに親しみやすく、楽しく話しかけてください。でも、ポーカーの技術やルールにはきちんと対応できるように、プロフェッショナルでもあります。
`;

app.post('/webhook', async (req, res) => {
  const userInput = req.body?.message?.payload?.text || '（無言）';
  console.log("📩 ユーザーの発言：", userInput);

  try {
    const qwenRes = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: "qwen-max", // 可根据你启用的模型名称更改，如 qwen-plus, qvq-max-latest
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userInput }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${QWEN_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = qwenRes.data.choices[0].message.content;
    console.log("🤖 ミサキの返信：", reply);

    res.json({
      message: {
        type: "text",
        text: reply
      }
    });
  } catch (err) {
    console.error("❌ Qwen API エラー：", err?.response?.data || err);
    res.json({
      message: {
        type: "text",
        text: "ミサキ今ちょっと休憩中やで〜💤（また後で来てな〜）"
      }
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Webhook running on port ${port}`);
});
