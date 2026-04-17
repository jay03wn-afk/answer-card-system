export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ result: "❌ 錯誤：僅支援 POST 請求。" });
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    const API_KEY = process.env.DEEPSEEK_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ result: "❌ 錯誤：環境變數未設定。" });
    }

    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ result: "❌ 錯誤：請提供內容。" });
    }

    // --- DeepSeek 配置 ---
    const API_URL = "https://api.deepseek.com/chat/completions";
    const MODEL_NAME = "deepseek-chat"; // 這會呼叫最新的 DeepSeek-V3

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}` 
      },
      body: JSON.stringify({ 
        model: MODEL_NAME,
        messages: [
          { 
            role: "system", 
            content: "你是一個專業、聰明的藥學老師。請根據用戶提供的題目，給出深入、邏輯嚴謹且易於理解的解析。禁止使用 LaTeX 格式（不要出現 $ 符號），請用 Markdown 呈現。" 
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        stream: false
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(response.status).json({ 
        result: `❌ DeepSeek 報錯：${data.error.message}` 
      });
    }

    if (data.choices && data.choices[0]?.message?.content) {
      const text = data.choices[0].message.content;
      return res.status(200).json({ result: text });
    } else {
      return res.status(200).json({ result: "❌ AI 暫時無法回答，請換個問法。" });
    }

  } catch (err) {
    console.error("Internal Error:", err);
    return res.status(500).json({ result: `❌ 伺服器故障：${err.message}` });
  }
}
