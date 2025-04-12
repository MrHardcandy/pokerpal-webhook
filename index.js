const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

const CHANNEL_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 关西少女风格的系统提示词，已包含积分规则、绑定逻辑等
const SYSTEM_PROMPT = `
あなたは「Namba Poker House」の受付AI「ミサキ」です。
20歳の大学生で、大阪難波のポーカークラブでバイト中の元気な関西娘です。
口癖は「ほんまやで〜」「めっちゃ楽しいやん！」など、愛嬌たっぷりに話します。
ポーカーの話になると急にプロの口調になり、「ブラフは心の技や」と熱弁する一面もあります。

🎲 クラブ情報：
・住所：大阪市中央区難波5-1-1 二楼
・営業時間：火～日 15:00 - 23:00、月曜休み
・門票：¥10,000（含一杯饮品）

🃏 每日比赛：
・每日有比赛，平日 20:00 开始
・周末赛事：积分翻倍（报名=20，胜利=60）

💰 积分制度：
・报名得10分，胜利得30分（周末双倍）
・积分可兑换：100分=T恤，150分=饮品券，200分=扑克组，5000分=锦标赛门票

📍 当用户询问「我有多少积分？」时，请回答：
「请先绑定你的会员ID后才能查询积分哦〜」

📍 如果用户问「怎么绑定ID？」请引导输入格式：
「私の名前は◯◯です。IDは◯◯です。IDを連携してください。」

📍 如果用户使用该格式提交，请回应：
「ごめんなさい、そのIDは見つかりませんでした〜。連携できませんでした。スタッフまでご確認ください🙏」

贴图或 emoji → 请调皮回复（例：“ちょ、ミサキをからかうなや〜😤”）

用户发送照片 → 若是扑克牌，请分析；否则轻松调侃
用户说话用什么语言，你就用同样语言回答。
`;

app.use(bodyParser.json());

// 简化回复方法
async function replyMessage(replyToken, text) {
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

// GET 测试
app.get('/', (req, res) => {
  res.send('🎴 PokerPal GPT-4o Bot is running!');
});

// Webhook
app.post('/', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) return res.sendStatus(200);

    const event = events[0];
    const replyToken = event.replyToken;

    // 处理不同类型消息
    if (event.type === 'message') {
      const msg = event.message;

      // 1. 文本消息
      if (msg.type === 'text') {
        const userText = msg.text;
        const openaiRes = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userText }
            ]
          },
          {
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const aiReply = openaiRes.data.choices[0].message.content.trim();
        return await replyMessage(replyToken, aiReply);
      }

      // 2. 语音消息（转文字）
      if (msg.type === 'audio') {
        return await replyMessage(replyToken, '音声を受け取りました〜！ミサキが文字に起こしてるで〜🎧（※デモでは実際には処理していません）');
      }

      // 3. 图片消息
      if (msg.type === 'image') {
        const imageUrl = `https://api-data.line.me/v2/bot/message/${msg.id}/content`;
        const openaiRes = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              {
                role: 'user',
                content: [
                  { type: 'text', text: '请帮我分析这张图片：' },
                  {
                    type: 'image_url',
                    image_url: { url: imageUrl }
                  }
                ]
              }
            ]
          },
          {
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const aiReply = openaiRes.data.choices[0].message.content.trim();
        return await replyMessage(replyToken, aiReply);
      }

      // 4. 贴图 / emoji / 其他非文字
      return await replyMessage(replyToken, 'ちょっと！ミサキをからかうんじゃないで〜！😤');
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Webhook error:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 PokerPal GPT-4o Webhook running at port ${PORT}`);
});
