export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) return res.status(200).json({ result: "❌ 錯誤：Vercel 沒抓到金鑰。" });
    
    const API_KEY = rawKey.trim();
    const { prompt } = req.body || {};
    if (!prompt) return res.status(200).json({ result: "❌ 錯誤：未收到輸入內容。" });

    // ✨ 根據你的掃描結果，使用確定的型號 gemini-2.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // 額外設定：讓 AI 的口訣回答更具創意
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ result: `❌ Google 拒絕了：${data.error.message}` });
    }

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return res.status(200).json({ result: data.candidates[0].content.parts[0].text });
    } else {
      return res.status(200).json({ result: "❌ AI 暫時無法產生內容，請換個題目試試。" });
    }

  } catch (err) {
    return res.status(200).json({ result: `❌ 系統意外：${err.message}` });
  }
}
