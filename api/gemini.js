export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) return res.status(200).json({ result: "❌ 錯誤：找不到金鑰。" });
    const API_KEY = rawKey.trim();

    const { prompt } = req.body || {};
    if (!prompt) return res.status(200).json({ result: "❌ 錯誤：未收到內容。" });

    // ✨ 備援名單：如果第一個塞車，就自動試第二個
    const modelList = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];
    let lastError = "";

    for (let modelName of modelList) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 }
          })
        });

        const data = await response.json();

        // 如果這組型號成功給出口訣，就直接回傳
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          return res.status(200).json({ result: data.candidates[0].content.parts[0].text });
        }

        // 如果回傳的是「High Demand (塞車)」，我們紀錄下來並試下一個
        if (data.error) {
          lastError = data.error.message;
          if (data.error.status === 'UNAVAILABLE' || data.error.code === 429) {
            console.log(`${modelName} 塞車中，切換型號...`);
            continue; 
          }
          // 如果是其他錯誤，就直接跳出
          return res.status(200).json({ result: `❌ Google 報錯：${data.error.message}` });
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    return res.status(200).json({ result: `❌ 目前 AI 忙線中（${lastError}），請隔幾分鐘後再按一次試試看！` });

  } catch (err) {
    return res.status(200).json({ result: `❌ 系統意外：${err.message}` });
  }
}
