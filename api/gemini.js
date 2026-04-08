export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const rawKey = process.env.GEMINI_API_KEY;
  if (!rawKey) return res.status(200).json({ result: "❌ 錯誤：找不到金鑰。" });
  const API_KEY = rawKey.trim();
  const { prompt } = req.body || {};

  // ✨ 偵探邏輯：準備多組可能的路徑
  const attempts = [
    { v: 'v1beta', m: 'gemini-1.5-flash' },
    { v: 'v1', m: 'gemini-1.5-flash' },
    { v: 'v1beta', m: 'gemini-pro' }
  ];

  try {
    for (let target of attempts) {
      const url = `https://generativelanguage.googleapis.com/${target.v}/models/${target.m}:generateContent?key=${API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      
      // 如果這組成功了，就直接回傳
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json({ result: data.candidates[0].content.parts[0].text });
      }

      // 如果是「型號找不到」的錯誤，我們繼續試下一個
      console.log(`${target.m} 失敗，嘗試下一個...`);
    }

    // 🕵️‍♂️ 如果全部失敗，啟動「清單掃描儀」
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();
    
    if (listData.models) {
      const modelNames = listData.models.map(m => m.name.split('/').pop()).join(', ');
      return res.status(200).json({ result: `❌ 還是找不到型號。你的 Key 支援的型號有：${modelNames}。請截圖告訴我！` });
    }

    return res.status(200).json({ result: `❌ 偵探任務失敗。Google 回報：${JSON.stringify(listData.error || "未知錯誤")}` });

  } catch (err) {
    return res.status(200).json({ result: `❌ 系統意外：${err.message}` });
  }
}
