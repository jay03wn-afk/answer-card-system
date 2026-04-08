export default async function handler(req, res) {
  // 只接受 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '請使用 POST 請求' });
  }

  // 從 Vercel 後台讀取你的金鑰
  const API_KEY = process.env.GEMINI_API_KEY;

  try {
    const { prompt } = req.body;
    
    // 呼叫 Gemini 1.5 Flash API (速度最快適合想口訣)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    
    // 抓出 AI 回答的文字傳回給前端
    const text = data.candidates[0].content.parts[0].text;
    res.status(200).json({ result: text });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI 產生失敗，請確認伺服器設定' });
  }
}
