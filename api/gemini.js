export default async function handler(req, res) {
  // 限制僅允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ result: "❌ 錯誤：僅支援 POST 請求。" });
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    const API_KEY = process.env.GROQ_API_KEY; // 確保環境變數已更新

    if (!API_KEY) {
      return res.status(500).json({ result: "❌ 錯誤：伺服器環境變數 GROQ_API_KEY 未設定。" });
    }

    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ result: "❌ 錯誤：請提供題目內容。" });
    }

    // --- Groq 配置 ---
    // 推薦模型：llama-3.3-70b-versatile (最強) 或 llama-3.1-8b-instant (最快)
    const MODEL_NAME = "llama-3.3-70b-versatile"; 
    const API_URL = "https://api.groq.com/openai/v1/chat/completions";

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}` // Groq 使用 Bearer 驗證
      },
      body: JSON.stringify({ 
        model: MODEL_NAME,
        messages: [
          { 
            role: "system", 
            content: "你是一個專業的藥學導師，請根據用戶提供的題目給出詳盡且易懂的解析。" 
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        temperature: 0.7, // 控制隨機性，0.7 適合解釋類任務
        max_tokens: 2048  // 限制回傳長度防止額度消耗過快
      })
    });

    const data = await response.json();

    // 1. 處理 API 的錯誤回應
    if (data.error) {
      return res.status(response.status).json({ 
        result: `❌ Groq API 報錯：${data.error.message}` 
      });
    }

    // 2. 解析回應內容 (OpenAI 格式)
    if (data.choices && data.choices[0]?.message?.content) {
      const text = data.choices[0].message.content;
      return res.status(200).json({ result: text });
    } else {
      return res.status(200).json({ result: "❌ AI 暫時無法回答，請換個問法再試。" });
    }

  } catch (err) {
    console.error("Internal Server Error:", err);
    return res.status(500).json({ result: `❌ 伺服器發生意外：${err.message}` });
  }
}
