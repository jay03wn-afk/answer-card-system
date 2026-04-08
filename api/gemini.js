export default async function handler(req, res) {
  // 只接受 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '請使用 POST 請求' });
  }

  // 從 Vercel 後台讀取你的金鑰
  const API_KEY = process.env.GEMINI_API_KEY;

  // 防呆 1：如果沒抓到金鑰，直接告訴前端
  if (!API_KEY) {
    return res.status(200).json({ result: '❌ Vercel 找不到金鑰 (GEMINI_API_KEY)。請確認 Vercel 環境變數，並且一定要按「Redeploy」重新部署！' });
  }

  try {
    const { prompt } = req.body;
    
    // 呼叫 Gemini API
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
    
    // 防呆 2：如果 Google 傳回錯誤訊息，直接顯示在畫面上！
    if (data.error) {
      console.error("Google API 錯誤:", data.error);
      return res.status(200).json({ result: `❌ Google 拒絕了請求，原因：${data.error.message}` });
    }

    // 防呆 3：確保有抓到資料才解析
    if (!data.candidates || data.candidates.length === 0) {
      return res.status(200).json({ result: '❌ Google 回傳了空白資料，請稍後再試。' });
    }

    // 正常抓出 AI 回答的文字傳回給前端
    const text = data.candidates[0].content.parts[0].text;
    res.status(200).json({ result: text });
    
  } catch (error) {
    console.error("伺服器內部錯誤:", error);
    res.status(200).json({ result: `❌ 伺服器發生未知的錯誤：${error.message}` });
  }
}
