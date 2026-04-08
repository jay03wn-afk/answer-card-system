export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) return res.status(200).json({ result: "❌ 錯誤：找不到金鑰。" });
    const API_KEY = rawKey.trim();

    const { prompt } = req.body || {};
    if (!prompt) return res.status(200).json({ result: "❌ 錯誤：未收到內容。" });

    // ✨ 根據你的清單，使用最保險的「通用型號」路徑
    // 這個型號在免費層級通常有每分鐘 15 次的額度
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    });

    const data = await response.json();

    if (data.error) {
      // 如果還是報錯，我們把錯誤訊息簡化顯示
      return res.status(200).json({ result: `❌ Google 提示：${data.error.message}` });
    }

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(200).json({ result: data.candidates[0].content.parts[0].text });
    } else {
      return res.status(200).json({ result: "❌ AI 暫時沒靈感，請等一下再試試看。" });
    }

  } catch (err) {
    return res.status(200).json({ result: `❌ 系統意外：${err.message}` });
  }
}
