export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) return res.status(200).json({ result: "❌ 錯誤：Vercel 沒抓到 GEMINI_API_KEY。" });
    
    // ✨ 核心修正：自動清理金鑰前後可能存在的「空白鍵」或「換行」
    const API_KEY = rawKey.trim();

    const { prompt } = req.body || {};
    if (!prompt) return res.status(200).json({ result: "❌ 錯誤：沒有收到題目內容。" });

    // ✨ 修正路徑：使用目前最穩定的 v1beta 搭配 1.5 Flash 型號
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // 降低安全門檻，避免藥理學詞彙被誤判
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    const data = await response.json();

    // 檢查 Google 報錯
    if (data.error) {
      return res.status(200).json({ result: `❌ Google 拒絕了：${data.error.message}` });
    }

    // 解析回答文字
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return res.status(200).json({ result: data.candidates[0].content.parts[0].text });
    } else {
      return res.status(200).json({ result: "❌ AI 有回應但內容被擋住了，請試試其他關鍵字。" });
    }

  } catch (err) {
    return res.status(200).json({ result: `❌ 系統崩潰：${err.message}` });
  }
}
