  async function handler(req, res) {
  // 限制僅允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ result: "❌ 錯誤：僅支援 POST 請求。" });
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ result: "❌ 錯誤：伺服器環境變數 GEMINI_API_KEY 未設定。" });
    }

    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ result: "❌ 錯誤：請提供題目內容。" });
    }

    // 建議確認模型名稱，例如：gemini-1.5-flash 或 gemini-2.0-flash
    const MODEL_NAME = "gemini-3.1-flash-lite-preview"; 
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }] 
      })
    });

    const data = await response.json();

    // 1. 處理 Google API 的錯誤回應
    if (data.error) {
      return res.status(response.status).json({ 
        result: `❌ Google API 報錯 (${data.error.code})：${data.error.message}` 
      });
    }

    // 2. 檢查回應內容是否存在 (處理安全過濾或空回應)
    const candidate = data.candidates?.[0];
    
    if (candidate?.finishReason === "SAFETY") {
      return res.status(200).json({ result: "⚠️ AI 回應內容因違反安全政策而被阻擋。" });
    }

    if (candidate?.content?.parts?.[0]?.text) {
      const text = candidate.content.parts[0].text;
      return res.status(200).json({ result: text });
    } else {
      return res.status(200).json({ result: "❌ AI 暫時無法回答（可能受限或格式不符），請換個問法再試。" });
    }

  } catch (err) {
    console.error("Internal Server Error:", err);
    return res.status(500).json({ result: `❌ 伺服器發生意外：${err.message}` });
  }
}
