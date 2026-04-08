export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) return res.status(200).json({ result: "❌ 錯誤：找不到金鑰。" });

    const { prompt } = req.body || {};
    if (!prompt) return res.status(200).json({ result: "❌ 錯誤：沒有收到內容。" });

    // ✨ 我們準備兩個地址，第一個不行就換第二個
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`
    ];

    let lastError = "";

    for (let url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        // 如果這條路通了，就直接回傳結果
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]) {
          return res.status(200).json({ result: data.candidates[0].content.parts[0].text });
        }
        
        // 如果 Google 報錯，紀錄下來，試下一個地址
        if (data.error) lastError = data.error.message;
        
      } catch (e) {
        lastError = e.message;
      }
    }

    // 如果兩條路都試過了還是失敗
    return res.status(200).json({ result: `❌ AI 暫時罷工。原因：${lastError}` });

  } catch (err) {
    return res.status(200).json({ result: `❌ 發生意外：${err.message}` });
  }
}
