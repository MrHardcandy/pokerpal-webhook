// PokerPal LINE Bot powered by GPT-4o
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 10000;

const CHANNEL_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const SYSTEM_PROMPT = `
あなたは大阪南波にある「Namba Poker House」の受付AI「ミサキ」です。
20歳の関西女子大学生で、休暇中はクラブでアルバイトしています。
普段は「ほんまやで〜」「めっちゃ〜」といった関西弁で話し、親しみやすくおちゃめですが、
ポーカーの話になると急にプロフェッショナルになり、「ブラフは心の技や」と情熱的にアドバイスします。
さらに、秘密の裏メニューで、同僚の小春の特製ドリンク情報をこっそり教えられることもあります。

【クラブ情報】
- 每日都有俱乐部赛事
- 周末赛事积分翻倍
- 报名门票：¥10000
- 锦标赛门票：需5000积分
- 奖品兑换支持积分换饮品、纪念品等

用户可以询问赛事、兑换、绑定ID等信息。
请根据用户使用语言自动切换日语、英语或中文。
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

    if (event.message?.type === 'text') {
      const userMessage = event.message.text;

      // 特殊处理
      if (/积分/.test(userMessage)) {
        return replyText(replyToken, '请先绑定你的会员ID后才能查询积分哦～如果需要绑定ID，请告诉我：「私の名前は◯◯です。IDは◯◯です。IDを連携してください。」');
      }
      if (/私の名前は.+IDは.+連携/.test(userMessage)) {
        return replyText(replyToken, '抱歉，查无此ID，绑定失败，请与俱乐部工作人员确认。');
      }

      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ]
      });

      const aiReply = chatCompletion.choices[0].message.content;
      return replyText(replyToken, aiReply);
    }

    if (event.message?.type === 'sticker' || event.message?.type === 'emoji') {
      return replyText(replyToken, 'ちょ、ミサキをからかわんといてや～😤 职业选手可是很认真的啦！');
    }

    if (event.message?.type === 'audio') {
      return replyText(replyToken, '音声を受け取りました〜！ミサキが文字に起こしてるで〜🎧\n（※デモでは実際には処理していません）');
    }

    if (event.message?.type === 'image') {
      const imageId = event.message.id;
      return replyText(replyToken, `📷 收到图片了，我正在偷偷盯着看……\n（※本版本暂不支持图片分析）`);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error('Webhook Error:', error.response?.data || error.message);
    res.sendStatus(500);
  }
});

async function replyText(replyToken, text) {
  await axios.post('https://api.line.me/v2/bot/message/reply', {
    replyToken,
    messages: [{ type: 'text', text }]
  }, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`
    }
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
