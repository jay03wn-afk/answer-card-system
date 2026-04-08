export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      return res.status(200).json({ result: "❌ 錯誤：Vercel 找不到金鑰。請確認環境變數設定。" });
    }

    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(200).json({ result: "❌ 錯誤：沒有收到題目內容。" });
    }

    // ✨ 修正重點：將網址中的 v1beta 改成 v1 (正式版路徑)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();

    if (data.error) {
      // 如果正式版也沒這型號，可能是名稱問題，我們顯示出來
      return res.status(200).json({ result: `❌ Google 報錯：${data.error.message}` });
    }

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ result: text });
    } else {
      return res.status(200).json({ result: "❌ AI 暫時無法回答，請稍後再試。" });
    }

  } catch (err) {
    return res.status(200).json({ result: `❌ 伺服器發生意外：${err.message}` });
  }
}
