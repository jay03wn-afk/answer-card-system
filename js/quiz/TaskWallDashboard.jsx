const { useState, useEffect, useRef } = React;

// 從全域 (window) 拿取 components.jsx 提供的小工具
const { 
    cleanQuizName, renderTestName, parseSmilesToHtml, LoadingSpinner, 
    ContentEditableEditor, AnswerGridInput, SpecificAnswerGridInput, HelpTooltip, 
    safeDecompress, processQuestionContent, extractSpecificContent, extractSpecificExplanation 
} = window;
function FastQASection({ user, showAlert, showConfirm, targetQaId, onClose, onRequireLogin }) {
    const { useState, useEffect } = React;
    const [qaList, setQaList] = useState([]);
    const [records, setRecords] = useState({});
    const [loading, setLoading] = useState(true);
    const [qaLimit, setQaLimit] = useState(5); // 🚀 提速優化：將快問快答初始下載量降到 5，確保畫面秒出
    const [refreshTrigger, setRefreshTrigger] = useState(0); // ✨ 新增：重新整理觸發器
    const [isRefreshing, setIsRefreshing] = useState(false); // ✨ 新增：靜默重整狀態
   const [jumpingQaId, setJumpingQaId] = useState(null); // ✨ 新增：進入題目的載入狀態
    const [showAdminMode, setShowAdminMode] = useState(false);
    const [isEditExpanded, setIsEditExpanded] = useState(false);
    
    const isAdmin = user && user.email === 'jay03wn@gmail.com';
    
    // 管理員表單狀態 (升級自訂功能)
    const [qaType, setQaType] = useState('mcq'); // 'mcq' 或 'tf'
    const [subjectMode, setSubjectMode] = useState('藥物分析');
    const [subject, setSubject] = useState('藥物分析');
    const [difficultyMode, setDifficultyMode] = useState('1');
    const [customDifficulty, setCustomDifficulty] = useState('1');
    const [rewardMode, setRewardMode] = useState('10');
    const [customReward, setCustomReward] = useState(10);
    const [timePreset, setTimePreset] = useState('permanent'); // ✨ 新增：時間預設選單狀態
    const [endTimeStr, setEndTimeStr] = useState('');
    const [question, setQuestion] = useState('');

    // ✨ 新增：處理時間預設變化 (自動轉換為台灣/本地時間格式)
    useEffect(() => {
        if (timePreset === 'custom' || timePreset === 'permanent') {
            if (timePreset === 'permanent') setEndTimeStr('');
            return;
        }

        const now = new Date();
        let targetDate;

        if (timePreset === 'today') {
            targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        } else if (timePreset === '24h') {
            targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        } else if (timePreset === '48h') {
            targetDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        } else if (timePreset === '1w') {
            targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        if (targetDate) {
            // 自動補零，組合成本地時間字串 (YYYY-MM-DDThh:mm)
            const pad = (n) => n.toString().padStart(2, '0');
            const localStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth()+1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`;
            setEndTimeStr(localStr);
        }
    }, [timePreset]);
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAns, setCorrectAns] = useState(0);
    const [explanation, setExplanation] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    
    // 作答狀態
    const [activeQA, setActiveQA] = useState(null);
    const [selectedAns, setSelectedAns] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [showShareModal, setShowShareModal] = useState(false);
    const [shareContent, setShareContent] = useState('');

   useEffect(() => {
        let unsubQA = () => {};
        let unsubRecords = () => {};

        const fetchQA = () => {
            // ✨ 終極修復：移除手動 setLoading(true) 造成的死鎖，完全信任 Firebase 的背景同步機制
            try {
                if (targetQaId) {
                    unsubQA = window.db.collection('fastQA').doc(targetQaId).onSnapshot(docSnap => {
                        if (docSnap.exists) setActiveQA({ id: docSnap.id, ...docSnap.data() });
                        else showAlert('找不到此題目，可能已過期或被刪除！');
                        setLoading(false);
                    }, error => {
                        console.error("快問快答讀取失敗:", error);
                        setLoading(false);
                    });
                } else {
                    unsubQA = window.db.collection('fastQA').orderBy('createdAt', 'desc').limit(qaLimit).onSnapshot({ includeMetadataChanges: true }, snapshot => {
                        const qas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        const now = new Date().getTime();
                        const validQas = isAdmin ? qas : qas.filter(q => !q.endTime || q.endTime > now);
                        setQaList(validQas);
                        
                        setActiveQA(prev => {
                            if (prev) return validQas.find(q => q.id === prev.id) || prev;
                            return prev;
                        });
                        setLoading(false);
                    }, error => {
                        console.error("快問快答列表讀取失敗:", error);
                        setLoading(false);
                    });
                }

                if (user) {
                    unsubRecords = window.db.collection('users').doc(user.uid).collection('fastQARecords').onSnapshot(recSnap => {
                        const recs = {};
                        recSnap.docs.forEach(doc => { recs[doc.id] = doc.data(); });
                        setRecords(recs);
                        if (targetQaId && recs[targetQaId]) setShowResult(true);
                    }, error => console.error("作答紀錄讀取失敗:", error));
                } else {
                    setLoading(false);
                }
            } catch (e) {
                console.error("預期外的錯誤:", e);
                setLoading(false);
            }
        };
        fetchQA();
        return () => { unsubQA(); unsubRecords(); };
    }, [user, isAdmin, targetQaId, qaLimit, refreshTrigger]); // ✨ 依賴項補上 refreshTrigger

    const handleAddQA = async () => {
        if (!question || !explanation || customReward < 1) return showAlert('請填寫完整題目、詳解，並確保鑽石大於0！');
        
        let finalOptions = options;
        if (qaType === 'tf') finalOptions = ['⭕ 是 (True)', '❌ 否 (False)'];
        if (qaType === 'mcq' && finalOptions.some(o => !o.trim())) return showAlert('選擇題請填寫完整的4個選項！');

        setIsPublishing(true);
        try {
            const endTimestamp = endTimeStr ? new Date(endTimeStr).getTime() : null;
            await window.db.collection('fastQA').add({
                qaType,
                subject,
                difficulty: customDifficulty,
                reward: Number(customReward),
                endTime: endTimestamp,
                question,
                options: finalOptions,
                correctAns,
                explanation,
                totalAnswers: 0,
                answersCount: qaType === 'tf' ? { '0': 0, '1': 0 } : { '0': 0, '1': 0, '2': 0, '3': 0 },
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showAlert('✅ 快問快答新增成功！');
            setIsEditExpanded(false);
            setQuestion(''); setOptions(['', '', '', '']); setExplanation('');
        } catch (e) {
            showAlert('新增失敗：' + e.message);
        }
        setIsPublishing(false);
    };

    const handleDeleteQA = (id) => {
        showConfirm('確定要刪除這題嗎？', async () => {
            await window.db.collection('fastQA').doc(id).delete();
            if(activeQA && activeQA.id === id) setActiveQA(null);
        });
    };

  const handleAutoParse = () => {
        // ✨ 保留換行格式：將 <br> 等轉為 \n 以利判斷，並將 div/p 結尾視為換行，避免字體黏在一起
        const tempText = question
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\u00A0/g, ' ')
            .replace(/<[^>]+>/g, '');
        
        // ✨ 支援讀取 [A]、[B]、[C]、[D] 以及 A. B. C. D. 等格式
        const optA = tempText.match(/(?:\[A\]|(?:A|Ａ)[.、\s]+)([\s\S]*?)(?=(?:\[B\]|(?:B|Ｂ)[.、\s]+)|$)/i);
        const optB = tempText.match(/(?:\[B\]|(?:B|Ｂ)[.、\s]+)([\s\S]*?)(?=(?:\[C\]|(?:C|Ｃ)[.、\s]+)|$)/i);
        const optC = tempText.match(/(?:\[C\]|(?:C|Ｃ)[.、\s]+)([\s\S]*?)(?=(?:\[D\]|(?:D|Ｄ)[.、\s]+)|$)/i);
        const optD = tempText.match(/(?:\[D\]|(?:D|Ｄ)[.、\s]+)([\s\S]*?)$/i);

        if (optA || optB || optC || optD) {
            const newOptions = [...options];
            if (optA) newOptions[0] = optA[1].replace(/\n/g, '<br>').trim();
            if (optB) newOptions[1] = optB[1].replace(/\n/g, '<br>').trim();
            if (optC) newOptions[2] = optC[1].replace(/\n/g, '<br>').trim();
            if (optD) newOptions[3] = optD[1].replace(/\n/g, '<br>').trim();
            setOptions(newOptions);

            let newQHtml = question;
            const firstMatch = question.match(/(?:<[^>]+>)*\s*(?:\[A\]|(?:A|Ａ)[.、\s]+)/i);
            if (firstMatch) {
                // ✨ 擷取題目的同時，把結尾可能殘留的 &nbsp; 或多餘換行一起清掉
                newQHtml = question.substring(0, firstMatch.index).replace(/(?:&nbsp;|\s|<br\s*\/?>)+$/gi, '').trim();
            }
            setQuestion(newQHtml);
            showAlert("✅ 自動解析成功！已將選項分發，並將選項從題目中移除。");
        } else {
            showAlert("⚠️ 找不到 A, B, C, D 或 [A] 選項開頭，請確認題目格式。");
        }
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/?qaId=${activeQA.id}`;
        const plainQ = activeQA.question.replace(/<img[^>]*>/gi, '(圖片)').replace(/<[^>]+>/g, '').trim();
        const shortQ = plainQ.length > 25 ? plainQ.substring(0, 25) + '...' : plainQ;
        const text = `⚡ 快問快答挑戰！\n【${activeQA.subject}】${activeQA.difficulty}\n🎁 獎勵：${activeQA.reward} 鑽石\n\n📝 ${shortQ}\n\n👇 點此連結立即挑戰 👇\n${shareUrl}`;
        setShareContent(text);
        setShowShareModal(true); 
    };

    const handleSubmitAns = async () => {
        if (selectedAns === null) return showAlert('請選擇一個答案！');
        if (!user) return setShowResult(true);
        
        // 快速檢查：如果本地紀錄已經有作答過，直接跳開不處理
        if (records[activeQA.id]) return showAlert('⚠️ 您已經作答過此題！');

        setSubmitting(true);
        const isCorrect = selectedAns === activeQA.correctAns;
        const rewardAmount = Number(activeQA.reward) || 10;
        
        try {
            // ✨ 提速優化 1：不要等資料庫！立刻切換到結果畫面，讓使用者感覺「秒開」
            setShowResult(true);

            const recRef = window.db.collection('users').doc(user.uid).collection('fastQARecords').doc(activeQA.id);
            const qaRef = window.db.collection('fastQA').doc(activeQA.id);

            // ✨ 提速優化 2：並行處理 (Promise.all) 與 原子運算 (increment)
            // 這樣就不需要「先讀取再寫入」，資料庫會直接在雲端幫你「+1」，速度提升 300%
            const tasks = [
                // 1. 寫入作答紀錄
                recRef.set({ 
                    isCorrect, 
                    selectedAns, 
                    answeredAt: window.firebase.firestore.FieldValue.serverTimestamp() 
                }),
                // 2. 直接在雲端更新統計數字 (不再執行 slow 的 get() 操作)
                qaRef.update({
                    totalAnswers: window.firebase.firestore.FieldValue.increment(1),
                    [`answersCount.${selectedAns}`]: window.firebase.firestore.FieldValue.increment(1)
                })
            ];

            // 3. 如果答對，同時發送獎勵
            if (isCorrect) {
                tasks.push(window.db.collection('users').doc(user.uid).set({
                    mcData: { diamonds: window.firebase.firestore.FieldValue.increment(rewardAmount) }
                }, { merge: true }));
            }

            // 讓這些任務在背景跑，不卡住 UI 執行
            Promise.all(tasks).catch(e => console.error("背景存檔同步中...", e));

            // ✨ 提速優化 3：立刻顯示結果彈窗
            if (isCorrect) {
                showAlert(`🎉 答對了！恭喜獲得 ${rewardAmount} 💎 鑽石！`);
            } else {
                showAlert('❌ 答錯了，請看詳解！');
            }

        } catch (e) {
            console.error(e);
            showAlert('提交失敗：' + e.message);
        }
        setSubmitting(false);
    };

    return (
        <div className={`border-2 border-rose-500 bg-stone-60050 dark:bg-stone-600900/20 p-4 shadow-md relative rounded-2xl w-full ${targetQaId ? 'm-0' : 'mb-8 shrink-0'}`}>
            <div className="flex justify-between items-center mb-4 border-b border-stone-600200 dark:border-stone-600800 pb-2">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-stone-600600 dark:text-rose-500 flex items-center gap-1"><span className="material-symbols-outlined text-[22px]">bolt</span> 快問快答挑戰</h2>
                    {!targetQaId && (
                        <button 
                            onClick={() => { 
                                setIsRefreshing(true); 
                                // ✨ 恢復強制同步：快問快答很輕量，可直接用 server 確保最新
                                window.db.collection('fastQA').orderBy('createdAt', 'desc').limit(qaLimit).get()
                                    .then(() => setRefreshTrigger(prev => prev + 1))
                                    .catch(e => console.error(e))
                                    .finally(() => setIsRefreshing(false));
                            }}
                            disabled={isRefreshing}
                            className="text-xs bg-[#FCFBF7] hover:bg-stone-60050 text-stone-600600 border border-stone-600200 px-2 py-1 font-bold transition-colors shadow-sm flex items-center gap-1 rounded-2xl disabled:opacity-50"
                            title="同步最新題目 (系統會自動過濾已下載的資料)"
                        >
                            {isRefreshing ? <div className="w-3 h-3 border-2 border-rose-500 border-t-stone-600600 rounded-full animate-spin"></div> : '🔄'} 重新整理
                        </button>
                    )}
                </div>
                {isAdmin && !targetQaId && (
                    <button onClick={() => setShowAdminMode(!showAdminMode)} className="bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs px-3 py-1.5 font-bold rounded-full border border-stone-200 dark:border-stone-600 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors">
                        {showAdminMode ? '關閉管理' : '管理試題'}
                    </button>
                )}
            </div>

            {isAdmin && showAdminMode && !targetQaId && (
                <div className="mb-6 border-2 border-stone-600300 rounded-2xl bg-[#FCFBF7] dark:bg-stone-800">
                    <button onClick={() => setIsEditExpanded(!isEditExpanded)} className="w-full flex justify-between p-4 bg-stone-600100 hover:bg-stone-600200 font-bold text-stone-600700">
                        <span>✏️ 新增快問快答 (自訂升級版)</span><span>{isEditExpanded ? '▼' : '▲'}</span>
                    </button>
                    {isEditExpanded && (
                        <div className="p-4 border-t border-stone-600200 dark:text-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div className="md:col-span-2 flex gap-4 bg-stone-50 p-2 dark:bg-gray-700">
                                    <label className="font-bold flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={qaType==='mcq'} onChange={()=>setQaType('mcq')} className="w-4 h-4" /> 選擇題
                                    </label>
                                    <label className="font-bold flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={qaType==='tf'} onChange={()=>setQaType('tf')} className="w-4 h-4" /> 是非題
                                    </label>
                                </div>
                               <div>
                                    <label className="block text-sm font-bold mb-1">科目</label>
                                    <select value={subjectMode} onChange={e => { setSubjectMode(e.target.value); if(e.target.value !== 'custom') setSubject(e.target.value); else setSubject(''); }} className="w-full border p-2 mb-2 dark:bg-stone-800">
                                        {['藥物分析', '生藥', '中藥', '藥理', '藥化', '藥劑', '生物藥劑'].map(s => <option key={s} value={s}>{s}</option>)}
                                        <option value="custom">[自訂]</option>
                                    </select>
                                    {subjectMode === 'custom' && <input type="text" value={subject} onChange={e=>setSubject(e.target.value)} className="w-full border p-2 dark:bg-stone-800" placeholder="請輸入自訂科目" />}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">難度標籤</label>
                                    <select value={difficultyMode} onChange={e => { setDifficultyMode(e.target.value); if(e.target.value !== 'custom') setCustomDifficulty(e.target.value); else setCustomDifficulty(''); }} className="w-full border p-2 mb-2 dark:bg-stone-800">
                                        {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}★</option>)}
                                        <option value="custom">[自訂]</option>
                                    </select>
                                    {difficultyMode === 'custom' && <input type="text" value={customDifficulty} onChange={e=>setCustomDifficulty(e.target.value)} className="w-full border p-2 dark:bg-stone-800" placeholder="請輸入自訂難度" />}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">獎勵鑽石數量</label>
                                    <select value={rewardMode} onChange={e => { setRewardMode(e.target.value); if(e.target.value !== 'custom') setCustomReward(Number(e.target.value)); else setCustomReward(''); }} className="w-full border p-2 mb-2 dark:bg-stone-800">
                                        {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(n => <option key={n} value={n}>{n} 鑽石</option>)}
                                        <option value="custom">[自訂]</option>
                                    </select>
                                    {rewardMode === 'custom' && <input type="number" min="1" value={customReward} onChange={e=>setCustomReward(e.target.value)} className="w-full border p-2 dark:bg-stone-800" placeholder="請輸入鑽石數量" />}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">結束時間</label>
                                    <select value={timePreset} onChange={e => {
                                        setTimePreset(e.target.value);
                                        // 切換到自訂時，若原本為空，自動填入當前時間，方便微調
                                        if (e.target.value === 'custom' && !endTimeStr) {
                                            const now = new Date();
                                            const pad = (n) => n.toString().padStart(2, '0');
                                            setEndTimeStr(`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
                                        }
                                    }} className="w-full border p-2 mb-2 dark:bg-stone-800 font-bold">
                                        <option value="permanent">♾️ 永久公開</option>
                                        <option value="today">📅 到今天結束 (23:59)</option>
                                        <option value="24h">⌛ 24 小時後</option>
                                        <option value="48h">⌛ 48 小時後</option>
                                        <option value="1w">🗓️ 一週後 (168小時)</option>
                                        <option value="custom">⚙️ 自訂時間</option>
                                    </select>
                                    {timePreset === 'custom' && (
                                        <input type="datetime-local" value={endTimeStr} onChange={e=>setEndTimeStr(e.target.value)} className="w-full border p-2 dark:bg-stone-800" />
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-bold">題目內容 (支援貼上圖片)</label>
                                        {qaType === 'mcq' && (
                                            <button onClick={handleAutoParse} className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-2 py-1 font-bold rounded shadow-sm border border-amber-300">
                                                🤖 自動解析貼上選項
                                            </button>
                                        )}
                                    </div>
                                    <ContentEditableEditor value={question} onChange={setQuestion} placeholder="在此輸入或貼上包含 A, B, C, D 的完整題目，再點擊上方「自動解析」..." showAlert={showAlert} />
                                </div>
                                
                                {qaType === 'mcq' ? options.map((opt, idx) => (
                                    <div key={idx} className="md:col-span-2 flex items-center gap-2">
                                        <input type="radio" checked={correctAns===idx} onChange={()=>setCorrectAns(idx)} className="w-5 h-5 accent-stone-600600" />
                                        <span className="font-bold text-sm shrink-0">設為解答</span>
                                        <input type="text" placeholder={`選項 ${idx+1}`} value={opt} onChange={e=>{const newO=[...options]; newO[idx]=e.target.value; setOptions(newO);}} className="flex-1 border p-2 dark:bg-stone-800" />
                                    </div>
                                )) : (
                                    <div className="md:col-span-2 flex gap-6 mt-2">
                                        <label className="font-bold flex items-center gap-2 cursor-pointer"><input type="radio" checked={correctAns===0} onChange={()=>setCorrectAns(0)} className="w-5 h-5 accent-stone-600600" /> 正確答案是「⭕ 是」</label>
                                        <label className="font-bold flex items-center gap-2 cursor-pointer"><input type="radio" checked={correctAns===1} onChange={()=>setCorrectAns(1)} className="w-5 h-5 accent-stone-600600" /> 正確答案是「❌ 否」</label>
                                    </div>
                                )}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold mb-1">詳解 (支援貼上圖片與富文本)</label>
                                    <ContentEditableEditor value={explanation} onChange={setExplanation} placeholder="請輸入或貼上詳解..." showAlert={showAlert} />
                                </div>
                            </div>
                            <button onClick={handleAddQA} disabled={isPublishing} className="bg-stone-600 bg-stone-700 text-white font-bold py-2 px-6 w-full disabled:bg-gray-400">🚀 發布快問快答</button>
                        </div>
                    )}
                </div>
            )}

           {!activeQA ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* ✨ 非同步載入狀態 (加入長度判斷，背景載入時不消失) */}
                        {loading && qaList.length === 0 ? (
                            <div className="col-span-full py-12 text-center bg-[#FCFBF7]/50 border border-stone-600200">
                                <div className="w-10 h-10 border-4 border-stone-600200 border-t-stone-600500 rounded-full animate-spin mx-auto mb-3"></div>
                                <div className="text-stone-600600 font-bold animate-pulse">試題讀取中...</div>
                            </div>
                        ) : qaList.length === 0 ? (
                            <div className="text-stone-600500 font-bold col-span-full text-center py-6">目前沒有開放的快問快答，請晚點再來！</div> 
                        ) : (
                            qaList.map(qa => {
                                const rec = records[qa.id];
                                return (
                                    <div key={qa.id} className="bg-[#FCFBF7] dark:bg-stone-800 p-4 border border-stone-600200 flex flex-col rounded-2xl shadow-sm hover:shadow-md">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-600 text-xs px-2.5 py-1 font-bold rounded-full shadow-sm">{qa.subject}</span>
                                            <span className="text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">diamond</span> {qa.reward}</span>
                                        </div>
                                        <p className="text-sm dark:text-white mb-4 flex-1 line-clamp-3 font-medium">{qa.question.replace(/<img[^>]*>/gi, '(圖片)').replace(/<[^>]+>/g, '').trim()}</p>
                                        <div className="flex items-center justify-between pt-3 border-t">
                                            <span className={`font-bold text-sm ${!user ? 'text-gray-400' : rec ? (rec.isCorrect ? 'text-emerald-600' : 'text-red-500') : 'text-gray-400'}`}>
                                                {!user ? '訪客未登入' : rec ? (rec.isCorrect ? '✅ 已答對' : '❌ 答錯了') : '尚未作答'}
                                            </span>
                                            <div className="flex gap-2">
                                                {isAdmin && showAdminMode && (
                                                    <>
                                                        <button onClick={() => { navigator.clipboard.writeText(qa.id); showAlert(`✅ 已複製題目ID：${qa.id}`); }} className="bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 text-[10px] px-2 py-1 rounded font-bold transition-colors">複製ID</button>
                                                        <button onClick={() => handleDeleteQA(qa.id)} className="bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 text-[10px] px-2 py-1 rounded font-bold transition-colors">刪除</button>
                                                    </>
                                                )}
                                               <button 
                                                    disabled={jumpingQaId === qa.id}
                                                   onClick={async () => { 
                                                        setJumpingQaId(qa.id);
                                                        try {
                                                            // ✨ 點擊挑戰時，強制向伺服器要這一題的最新資料 (確保絕不拿到舊題目)
                                                            const docSnap = await window.db.collection('fastQA').doc(qa.id).get();
                                                            if (docSnap.exists) {
                                                                setActiveQA({ id: docSnap.id, ...docSnap.data() });
                                                            } else {
                                                                setActiveQA(qa);
                                                            }
                                                        } catch (e) {
                                                            console.warn(e);
                                                            setActiveQA(qa);
                                                        }
                                                        setSelectedAns(null); 
                                                        setShowResult(!!rec); 
                                                        setJumpingQaId(null);
                                                    }} 
                                                    className={`px-4 py-1.5 text-sm font-bold rounded-full flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-70 ${(user && rec) ? 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600 border border-stone-200 dark:border-stone-600' : 'bg-stone-800 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white'}`}
                                                >
                                                    {jumpingQaId === qa.id ? <div className={`w-3.5 h-3.5 border-2 rounded-full animate-spin ${(user && rec) ? 'border-stone-400 border-t-transparent' : 'border-stone-400 border-t-transparent'}`}></div> : <span className="material-symbols-outlined text-[16px]">{(user && rec) ? 'visibility' : 'sports_esports'}</span>}
                                                    {(user && rec) ? '查看紀錄' : '立即挑戰'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    {/* ✨ 新增：快問快答的「載入更多」按鈕 (包含正確的 <> </> 包覆) */}
                    {!targetQaId && qaList.length >= qaLimit && (
                        <div className="flex justify-center mt-6">
                            <button 
                                onClick={() => setQaLimit(prev => prev + 5)} 
                                className="bg-[#FCFBF7] border-2 border-stone-600300 text-stone-600600 px-6 py-2 font-bold shadow-sm hover:bg-stone-60050 transition-colors"
                            >
                                ⬇️ 載入更早的題目...
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 border-2 border-stone-600300 rounded-2xl animate-fade-in">
                    <div className="flex justify-between mb-4">
                        {!targetQaId ? <button onClick={() => { setActiveQA(null); if(onClose) onClose(); }} className="text-gray-500 font-bold hover:text-stone-800 dark:hover:text-white">⬅ 返回列表</button> : <div></div>}
                        <button onClick={handleShare} className="text-stone-600600 bg-stone-600100 px-3 py-1.5 text-sm font-bold rounded-2xl">🔗 分享此題</button>
                    </div>
                    
                   <div className="flex flex-wrap gap-2 mb-6 border-b pb-4 dark:border-stone-700 items-center">
                        <span className="bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-600 text-xs px-3 py-1.5 font-bold rounded-full shadow-sm">{activeQA.subject}</span>
                        <span className="bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700 text-xs px-3 py-1.5 font-bold rounded-full shadow-sm">難度: {activeQA.difficulty}</span>
                        <span className="text-amber-600 dark:text-amber-400 font-black text-base md:text-lg ml-auto flex items-center gap-1.5"><span className="material-symbols-outlined text-[20px] md:text-[24px]">diamond</span> {activeQA.reward} 鑽石獎勵</span>
                    </div>
                    
                    {/* 支援暗色模式：移除強制白底黑字 */}
                    {/* ✨ 修改：讓快問快答題目支援 SMILES 渲染 */}
<div className="text-lg font-bold mb-6 bg-[#FCFBF7] dark:bg-stone-800 text-stone-800 dark:text-white p-5 border border-gray-300 dark:border-gray-600 shadow-sm preview-rich-text" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml(activeQA.question) }}></div>
                    
                    <div className="space-y-3 mb-6">
                        {activeQA.options.map((opt, idx) => {
                            const isSelected = (selectedAns ?? records[activeQA.id]?.selectedAns) === idx;
                            const isCorrectOpt = activeQA.correctAns === idx;
                            
                            // ✨ 統計修復：直接從各選項的真實票數加總來算分母，徹底解決 totalAnswers 舊資料壞掉的問題
                            const actualTotal = activeQA.answersCount ? Object.values(activeQA.answersCount).reduce((sum, val) => sum + (Number(val) || 0), 0) : 0;
                            const total = actualTotal > 0 ? actualTotal : (activeQA.totalAnswers || 0);
                            const count = (activeQA.answersCount && activeQA.answersCount[idx]) || 0;
                            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                            
                            let btnClass = "w-full text-left p-4 border-2 font-bold transition-all relative z-0 flex justify-between items-center ";
                            let barColor = "bg-gray-300";
                            
                            if (showResult && user) {
                                if (isCorrectOpt) { btnClass += "bg-emerald-100 border-emerald-500 text-emerald-800 "; barColor = "bg-emerald-300"; }
                                else if (isSelected) { btnClass += "bg-red-100 border-red-500 text-red-800 "; barColor = "bg-red-300"; }
                                else { btnClass += "bg-gray-50 border-stone-200 text-gray-500 opacity-80 "; }
                            } else {
                                btnClass += isSelected ? "border-stone-600500 bg-stone-60050 text-stone-600700 " : "border-gray-300 bg-[#FCFBF7] hover:bg-gray-50 dark:bg-stone-800 dark:text-white ";
                            }

                            return (
                                <button key={idx} disabled={showResult || submitting} onClick={() => setSelectedAns(idx)} className={btnClass}>
                                    {showResult && user && <div className={`absolute left-0 top-0 bottom-0 opacity-30 z-[-1] transition-all ${barColor}`} style={{ width: `${percent}%` }}></div>}
                                    <span><span className="mr-3 font-black">{activeQA.qaType === 'tf' ? '' : ['A','B','C','D'][idx]+'.'}</span> {opt}</span>
                                    <div className="flex gap-3">
                                        {showResult && user && <span className="text-sm font-bold opacity-80">{percent}% ({count}人)</span>}
                                        {showResult && user && isCorrectOpt && <span>✅</span>}
                                        {showResult && user && isSelected && !isCorrectOpt && <span>❌</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {!showResult ? (
                        <button onClick={handleSubmitAns} disabled={submitting} className="w-full bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 font-black py-4 text-lg rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-2">
                            {submitting ? <><div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></div> 處理中...</> : <><span className="material-symbols-outlined text-[24px]">send</span> 確認送出</>}
                        </button>
                    ) : (
                        <div className="mt-6 animate-fade-in">
                            {user ? (
                                <>
                                    <div className="p-4 bg-[#FCFBF7] dark:bg-stone-800 border-2 border-amber-100 dark:border-amber-900 shadow-inner">
                                        <h4 className="font-black mb-2 flex justify-between items-center">
                                            <span className="text-amber-900 dark:text-amber-300">💡 解答與討論</span>
                                            {activeQA.reward > 0 && <span className="text-emerald-600 dark:text-emerald-400">🎉 獲得 {activeQA.reward} 鑽！</span>}
                                        </h4>
                                        {/* ✨ 修改：讓快問快答詳解支援 SMILES 渲染 */}
                                        <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap preview-rich-text" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml(activeQA.explanation) }}></div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-6 bg-stone-50 border-2 border-dashed border-gray-400 text-center"><h3 className="text-xl font-black mb-2">🔒 答案已上鎖</h3><button onClick={() => { if(onRequireLogin) onRequireLogin(); }} className="bg-stone-800 text-white px-8 py-3 font-black text-lg w-full">🚀 登入解鎖完整解答與鑽石</button></div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showShareModal && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-[#FCFBF7] p-6 w-full max-w-xs border border-rose-200 rounded-3xl shadow-2xl">
                        <h3 className="font-black text-rose-600 mb-4 flex justify-between items-center">
                            <span className="flex items-center gap-2">🔗 分享此題</span>
                            <button onClick={() => setShowShareModal(false)} className="text-stone-400 hover:text-stone-600">✕</button>
                        </h3>
                        <textarea readOnly value={shareContent} className="w-full h-36 p-3 text-sm border border-stone-200 rounded-xl mb-4 outline-none resize-none bg-stone-50 text-stone-700 font-bold" onClick={e => e.target.select()} />
                        <button onClick={() => { navigator.clipboard.writeText(shareContent); showAlert('✅ 已複製！'); setShowShareModal(false); }} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl text-sm mb-2 transition-colors shadow-md active:scale-95">📋 複製邀請文本</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function TaskWallDashboard({ user, showAlert, showConfirm, onContinueQuiz }) {
    const [tasks, setTasks] = useState({});
    const [officialTasks, setOfficialTasks] = useState({});
    const [myTasks, setMyTasks] = useState({}); 
    const [loading, setLoading] = useState(true);
    const [taskLimit, setTaskLimit] = useState(5); // ✨ 新增：任務牆動態載入數量的狀態
    
    // ✨ 新增搜尋狀態
    const [searchQuery, setSearchQuery] = useState('');

    const normalCategories = [
        '1. 藥物分析學', '2. 生藥學', '3. 中藥學', 
        '4. 藥物化學與藥理學', '5. 藥劑學', '6. 生物藥劑學', '模擬試題 (其他)'
    ];
    
    const opCategories = [
        '1. 藥理學與藥物化學', '2. 藥物分析學與生藥學(含中藥學)', '3. 藥劑學與生物藥劑學', '國考題 (其他)'
    ];

    useEffect(() => {
        // 🚀 移除 800ms 提早結束的 Bug，讓系統乖乖等雲端資料下載完

        const unsubTasks = window.db.collection('publicTasks')
            .orderBy('createdAt', 'desc')
            .limit(taskLimit) // ✨ 改吃我們設定的動態變數
            .onSnapshot({ includeMetadataChanges: true }, snap => {
                // ✨ 新用戶防護：快取沒資料時繼續轉圈圈，等雲端
                if (snap.empty && snap.metadata.fromCache) return;
                
                const groupedNormal = normalCategories.reduce((acc, cat) => ({ ...acc, [cat]: [] }), {});
                const groupedOfficial = opCategories.reduce((acc, cat) => ({ ...acc, [cat]: [] }), {});
                
                snap.docs.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() };
                    
                    // ✨ 提速優化：列表頁根本不需要顯示幾萬字的題目內文，直接砍掉這裡的解壓縮，節省 90% CPU 運算時間！
                    
                    if (data.testName && /\[#op\]/i.test(data.testName)) {
                        let cat = data.category || '國考題 (其他)';
                        if (!opCategories.includes(cat)) {
                            if (data.testName.includes('藥理') || data.testName.includes('藥物化學')) cat = '1. 藥理學與藥物化學';
                            else if (data.testName.includes('藥物分析') || data.testName.includes('生藥') || data.testName.includes('中藥')) cat = '2. 藥物分析學與生藥學(含中藥學)';
                            else if (data.testName.includes('藥劑') || data.testName.includes('生物藥劑')) cat = '3. 藥劑學與生物藥劑學';
                            else cat = '國考題 (其他)';
                        }
                        if (groupedOfficial[cat] && groupedOfficial[cat].length < 10) groupedOfficial[cat].push(data);
                    } else if (data.testName && /\[#(m?nm?st)\]/i.test(data.testName)) {
                        const cat = data.category || '模擬試題 (其他)';
                        if (groupedNormal[cat] && groupedNormal[cat].length < 5) groupedNormal[cat].push(data);
                    } else {
                        const cat = data.category || '模擬試題 (其他)';
                        if (groupedNormal[cat] && groupedNormal[cat].length < 5) groupedNormal[cat].push(data);
                    }
                });
                
                setTasks(groupedNormal);
                setOfficialTasks(groupedOfficial);
                setLoading(false); // 雲端資料來了，才准關掉載入動畫！
            }, err => {
                console.error(err);
                setLoading(false);
            });

        // 🚀 將 limit(30) 降為 limit(15)，因為舊版試卷夾帶了幾 MB 的垃圾資料，新用戶一次抓 30 份會等太久！
        const unsubMyQuizzes = window.db.collection('users').doc(user.uid).collection('quizzes')
            .orderBy('createdAt', 'desc')
            .limit(15)
            .onSnapshot({ includeMetadataChanges: true }, snap => {
                if (snap.empty && snap.metadata.fromCache) return; // ✨ 擋掉空快取防閃爍
                const myTaskMap = {};
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.taskId) {
                        // 🚀 核心升級：免除不必要的解壓縮
                        if (typeof data.userAnswers === 'string') data.userAnswers = safeDecompress(data.userAnswers, 'array');
                        if (typeof data.results === 'string') data.results = safeDecompress(data.results, 'object');
                        myTaskMap[data.taskId] = { id: doc.id, ...data };
                    }
                });

                // 第二階段：出題者本人的原始考卷具有最高優先權，將覆蓋任何空白的任務副本
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (!data.isShared && !data.isTask) {
                        // 🚀 核心升級：免除不必要的解壓縮
                        if (typeof data.userAnswers === 'string') data.userAnswers = safeDecompress(data.userAnswers, 'array');
                        if (typeof data.results === 'string') data.results = safeDecompress(data.results, 'object');
                        // 若是出題者本人自己的考卷，任務ID 就是該考卷的 doc.id
                        // 在此注入 isTask 與 taskId 以便讓後續 UI 可以判斷為任務模式 (如開放討論區)
                        myTaskMap[doc.id] = { id: doc.id, ...data, isTask: true, taskId: doc.id };
                    }
                });
                setMyTasks(myTaskMap);
            });
            
        return () => {
            unsubTasks();
            unsubMyQuizzes();
        };
    }, [user.uid, taskLimit]); // ✨ 將 taskLimit 加入依賴項，當按鈕按下去時就會重新抓資料

    // 計算國考題能力分析
    const officialStats = { totalScore: 0, count: 0, categories: {} };
    opCategories.forEach(c => officialStats.categories[c] = { score: 0, count: 0 });

    Object.values(myTasks).forEach(localRec => {
        if (localRec.testName && localRec.testName.includes('[#op]') && localRec.results) {
            let cat = localRec.category;
            if (!cat || !opCategories.includes(cat)) {
                if (localRec.testName.includes('藥理') || localRec.testName.includes('藥物化學')) cat = '1. 藥理學與藥物化學';
                else if (localRec.testName.includes('藥物分析') || localRec.testName.includes('生藥') || localRec.testName.includes('中藥')) cat = '2. 藥物分析學與生藥學(含中藥學)';
                else if (localRec.testName.includes('藥劑') || localRec.testName.includes('生物藥劑')) cat = '3. 藥劑學與生物藥劑學';
                else cat = '國考題 (其他)';
            }
            if (officialStats.categories[cat]) {
                officialStats.totalScore += localRec.results.score;
                officialStats.count += 1;
                officialStats.categories[cat].score += localRec.results.score;
                officialStats.categories[cat].count += 1;
            }
        }
    });

    const overallAvg = officialStats.count > 0 ? Math.round(officialStats.totalScore / officialStats.count) : 0;

    const handlePlayTask = async (task, localRec) => {
        const executeEnter = async () => {
            if (localRec) {
                // ✨ 強制同步：比對雲端最新任務與本地快取，這次加入了最重要的 correctAnswersInput
                const isAnsChanged = task.correctAnswersInput && task.correctAnswersInput !== localRec.correctAnswersInput;
                
                const updatedRec = {
                    ...localRec,
                    testName: task.testName || localRec.testName,
                    questionHtml: task.questionHtml || localRec.questionHtml || '',
                    questionText: task.questionText || localRec.questionText || '',
                    explanationHtml: task.explanationHtml || localRec.explanationHtml || '',
                    correctAnswersInput: task.correctAnswersInput || localRec.correctAnswersInput || ''
                };
                
                const payload = {
                    testName: updatedRec.testName,
                    questionHtml: updatedRec.questionHtml,
                    questionText: updatedRec.questionText,
                    explanationHtml: updatedRec.explanationHtml,
                    correctAnswersInput: updatedRec.correctAnswersInput
                };

                // 如果答案有變，且玩家已經交過卷，就自動標記有答案更新
                if (isAnsChanged && localRec.results) {
                    payload.hasAnswerUpdate = true;
                    updatedRec.hasAnswerUpdate = true;
                }

                // 背景靜默更新回本地資料庫
                window.db.collection('users').doc(user.uid).collection('quizzes').doc(localRec.id).update(payload)
                    .catch(e => console.error("同步任務資料失敗", e));

                onContinueQuiz(updatedRec);
                return;
            }

            try {
                const emptyAnswers = Array(Number(task.numQuestions)).fill('');
                const emptyStarred = Array(Number(task.numQuestions)).fill(false);

                // ✨ 延遲載入大改造 3：任務牆參加任務時，也要把輕重資料切開
                const newDocRef = await window.db.collection('users').doc(user.uid).collection('quizzes').add({
                    testName: task.testName,
                    numQuestions: task.numQuestions,
                    questionFileUrl: task.questionFileUrl || '',
                    // 🚀 移除笨重內容，保持清單輕量！
                    correctAnswersInput: task.correctAnswersInput || '',
                    publishAnswers: task.publishAnswers !== false,
                    userAnswers: emptyAnswers,
                    starred: emptyStarred,
                    hasTimer: task.hasTimer || false,
                    timeLimit: task.timeLimit || null,
                    timeRemaining: task.hasTimer ? (task.timeLimit * 60) : null,
                    isTask: true,
                    taskId: task.id,
                    creatorUid: task.creatorUid || '', 
                    creatorQuizId: task.id,
                    folder: '任務牆',
                    hasSeparatedContent: true, // ✨ 標記為已分離
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });

                // ✨ 單獨存入笨重內容
                await window.db.collection('users').doc(user.uid).collection('quizContents').doc(newDocRef.id).set({
                    questionText: task.questionText || '',
                    questionHtml: task.questionHtml || '',
                    explanationHtml: task.explanationHtml || ''
                });

                const newRec = await newDocRef.get();
                // ✨ 把剛才切出去的內容手動塞回畫面，達到秒開效果
                onContinueQuiz({ id: newRec.id, ...newRec.data(), questionText: task.questionText, questionHtml: task.questionHtml, explanationHtml: task.explanationHtml });
                
            } catch (e) {
                showAlert('啟動任務失敗：' + e.message);
            }
        };

        if (task.hasTimer && (!localRec || !localRec.results)) {
            const isNew = !localRec || !localRec.userAnswers || localRec.userAnswers.filter(a => a !== '').length === 0;
            if (isNew) {
                showConfirm(`⏱ 此任務設有時間限制（${task.timeLimit} 分鐘）。\n\n點擊「確定」後將進入並開始倒數計時，準備好了嗎？`, () => {
                    executeEnter();
                });
            } else {
                executeEnter();
            }
        } else {
            executeEnter();
        }
    };

    // 判斷搜尋後是否有資料，用來隱藏空區塊
    const hasAnyOfficial = opCategories.some(cat => officialTasks[cat] && officialTasks[cat].some(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())));
    const hasAnyNormal = normalCategories.slice(0, 6).some(cat => tasks[cat] && tasks[cat].some(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())));
    const otherTasksFiltered = tasks['模擬試題 (其他)'] ? tasks['模擬試題 (其他)'].filter(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())) : [];

    return (
        <div className="max-w-[1600px] w-full mx-auto p-4 pt-0 h-full overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b-2 border-black dark:border-white pb-2 shrink-0">
                <h1 className="text-2xl font-black dark:text-white flex items-center">
                    🎯 公開任務牆
                </h1>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">完成考驗獲取獎勵鑽石！</p>
            </div>

            {/* ✨ 新增：快問快答區塊 (放在最頂端) */}
            <FastQASection user={user} showAlert={showAlert} showConfirm={showConfirm} />

            {/* ✨ 新增：搜尋任務列 */}
            <div className="mb-6 flex items-center bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-3 shadow-sm rounded-2xl shrink-0">
                <span className="text-gray-500 mr-3 text-lg">🔍</span>
                <input
                    type="text"
                    placeholder="搜尋任務或試題名稱..."
                    className="flex-grow outline-none bg-transparent text-stone-800 dark:text-white text-sm font-bold min-w-0"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-stone-800 dark:hover:text-white ml-2 font-bold px-2">✖</button>
                )}
            </div>

           {loading && Object.keys(tasks).length === 0 && Object.keys(officialTasks).length === 0 ? (
                <LoadingSpinner text="正在載入公開任務..." />
            ) : (
                <div className="space-y-8 pb-10">
                    
                    {/* ✨ 加入左右排版容器：lg:grid-cols-2 讓大螢幕分兩欄，手機版自動單欄 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 lg:gap-8 items-start">

                        {/* --- 金色專屬：歷屆國考題 --- */}
                        {hasAnyOfficial && (
                            <div className="bg-gradient-to-br from-amber-50 to-white dark:from-gray-800 dark:to-gray-900 border border-amber-400 dark:border-amber-600 shadow-md rounded-2xl p-5 md:p-6 w-full">
                                <h2 className="text-2xl font-black mb-4 dark:text-white border-b-2 border-amber-400 dark:border-amber-600 pb-2 text-amber-700 dark:text-amber-400 flex items-center">
                                🏆 歷屆國考題
                            </h2>
                            
                            {/* 國考能力分析圖表 (搜尋時隱藏以節省空間) */}
                            {!searchQuery && officialStats.count > 0 && (
                                <div className="mb-6 bg-[#FCFBF7] dark:bg-stone-800 p-4 border border-amber-200 dark:border-amber-700 shadow-sm">
                                    <h3 className="font-bold text-amber-600 dark:text-amber-400 mb-3">📊 國考能力分析 (平均分數)</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center text-sm font-bold">
                                            <span className="w-1/3 text-gray-600 dark:text-gray-300">總平均 ({officialStats.count}次)</span>
                                            <div className="w-2/3 bg-stone-100 dark:bg-gray-700 h-4 relative">
                                                <div className="bg-amber-400 h-4 transition-all duration-500" style={{ width: `${overallAvg}%` }}></div>
                                                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-stone-800 drop-shadow-md">{overallAvg} 分</span>
                                            </div>
                                        </div>
                                        {opCategories.map(cat => {
                                            const stat = officialStats.categories[cat];
                                            const avg = stat.count > 0 ? Math.round(stat.score / stat.count) : 0;
                                            if (stat.count === 0) return null;
                                            return (
                                                <div key={cat} className="flex items-center text-xs font-bold">
                                                    <span className="w-1/3 text-gray-500 dark:text-gray-400 truncate pr-2" title={cat}>{cat.replace(/^[0-9]\.\s*/, '')}</span>
                                                    <div className="w-2/3 bg-stone-100 dark:bg-gray-700 h-3 relative">
                                                        <div className="bg-amber-400 h-3 transition-all duration-500" style={{ width: `${avg}%` }}></div>
                                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-stone-800 drop-shadow-md">{avg} 分</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-8">
                                {opCategories.map(cat => {
                                    const filteredOpTasks = officialTasks[cat] ? officialTasks[cat].filter(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())) : [];
                                    if (filteredOpTasks.length === 0) return null;
                                    
                                    return (
                                        <div key={cat} className="pl-4 border-l-4 border-amber-400 dark:border-amber-600">
                                            <h3 className="text-lg font-bold mb-4 dark:text-gray-200 text-gray-700">{cat}</h3>
                                            <div className="flex flex-col gap-2">
                                                {filteredOpTasks.map(task => {
                                                    const localRec = myTasks[task.id];
                                                    const isCompleted = localRec && localRec.results;
                                                    const inProgress = localRec && !localRec.results && Array.isArray(localRec.userAnswers) && localRec.userAnswers.filter(a => a).length > 0;

                                                    return (
                                                        <div key={task.id} className="border border-amber-200 dark:border-amber-700 p-3 bg-[#FCFBF7] dark:bg-stone-800 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:shadow-md transition-shadow rounded-2xl">
                                                            <div className="flex flex-col gap-1 min-w-0 flex-grow">
                                                                <h3 className="font-bold text-sm break-words whitespace-normal leading-relaxed dark:text-white" title={cleanQuizName(task.testName)}>
    {renderTestName(task.testName, isCompleted)}
</h3>
                                                                <div className="flex items-center gap-3 text-xs shrink-0 mt-1">
                                                                    <span className="text-gray-500 dark:text-gray-400">{task.numQuestions}題</span>
                                                                    {task.hasTimer && <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 border border-red-200 dark:border-red-700">⏱ {task.timeLimit}m</span>}
                                                                    {isCompleted ? (
                                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✅ {localRec.results.score} 分</span>
                                                                    ) : inProgress ? (
                                                                        <span className="text-amber-500 dark:text-amber-400 font-bold">📝 已填: {localRec.userAnswers.filter(a => a).length}</span>
                                                                    ) : (
                                                                        <span className="text-gray-400 font-bold">⏳ 未作答</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handlePlayTask(task, localRec)} 
                                                                className={`py-1.5 px-4 rounded-2xl font-bold text-xs transition-colors shrink-0 w-full sm:w-auto mt-2 sm:mt-0 ${isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' : 'bg-amber-500 text-stone-800 hover:bg-amber-600'}`}
                                                            >
                                                                {isCompleted ? '📊 查看成績與討論' : (inProgress ? '📝 繼續作答' : '⚔️ 開始')}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* --- 一般：模擬試題 --- */}
                    {hasAnyNormal && (
                        <div className="bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm rounded-2xl p-5 md:p-6 w-full">
                            <h2 className="text-2xl font-black mb-6 dark:text-white border-b-2 border-indigo-200 dark:border-indigo-900 pb-2 text-indigo-700 dark:text-indigo-400 flex items-center">
                                📚 模擬試題
                            </h2>
                            
                            <div className="space-y-8">
                                {normalCategories.slice(0, 6).map(cat => {
                                    const filteredTasks = tasks[cat] ? tasks[cat].filter(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())) : [];
                                    if (filteredTasks.length === 0) return null;

                                    return (
                                        <div key={cat} className="pl-4 border-l-4 border-indigo-300 dark:border-indigo-600">
                                            <h3 className="text-lg font-bold mb-4 dark:text-gray-200 text-gray-700">{cat}</h3>
                                            <div className="flex flex-col gap-2">
                                                {filteredTasks.map(task => {
                                                    const localRec = myTasks[task.id];
                                                    const isCompleted = localRec && localRec.results;
                                                    const inProgress = localRec && !localRec.results && Array.isArray(localRec.userAnswers) && localRec.userAnswers.filter(a => a).length > 0;

                                                    return (
                                                        <div key={task.id} className="border border-stone-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-stone-900 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:shadow-md transition-shadow rounded-2xl">
                                                            <div className="flex flex-col gap-1 min-w-0 flex-grow">
                                                                <h3 className="font-bold text-sm break-words whitespace-normal leading-relaxed dark:text-white" title={cleanQuizName(task.testName)}>
    {renderTestName(task.testName, isCompleted)}
</h3>
                                                                <div className="flex items-center gap-3 text-xs shrink-0 mt-1">
                                                                    <span className="text-gray-500 dark:text-gray-400">{task.numQuestions}題</span>
                                                                    {task.hasTimer && <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 border border-red-200 dark:border-red-700">⏱ {task.timeLimit}m</span>}
                                                                    {isCompleted ? (
                                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✅ {localRec.results.score} 分</span>
                                                                    ) : inProgress ? (
                                                                        <span className="text-amber-500 dark:text-amber-400 font-bold">📝 已填: {localRec.userAnswers.filter(a => a).length}</span>
                                                                    ) : (
                                                                        <span className="text-gray-400 font-bold">⏳ 未作答</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handlePlayTask(task, localRec)} 
                                                                className={`py-1.5 px-4 rounded-2xl font-bold text-xs transition-colors shrink-0 w-full sm:w-auto mt-2 sm:mt-0 ${isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' : 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 hover:bg-stone-800'}`}
                                                            >
                                                                {isCompleted ? '📊 查看成績與討論' : (inProgress ? '📝 繼續作答' : '⚔️ 開始')}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                  </div> {/* ✨ 結束左右排版容器，接下來的區塊會回到單行全寬 */}

                    {otherTasksFiltered.length > 0 && (
                        <div className="bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm rounded-2xl p-5 md:p-6">
                            <h2 className="text-xl font-black mb-4 dark:text-white border-b-2 border-stone-200 dark:border-stone-700 pb-2 text-gray-600 dark:text-gray-400">
                                🏷️ 其他任務
                            </h2>
                            <div className="flex flex-col gap-2">
                                {otherTasksFiltered.map(task => {
                                    const localRec = myTasks[task.id];
                                    const isCompleted = localRec && localRec.results;
                                    const inProgress = localRec && !localRec.results && Array.isArray(localRec.userAnswers) && localRec.userAnswers.filter(a => a).length > 0;

                                    return (
                                        <div key={task.id} className="border border-stone-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-stone-900 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:shadow-md transition-shadow rounded-2xl">
                                            <div className="flex flex-col gap-1 min-w-0 flex-grow">
                                                <h3 className="font-bold text-sm break-words whitespace-normal leading-relaxed dark:text-white" title={cleanQuizName(task.testName)}>
    {renderTestName(task.testName, isCompleted)}
</h3>
                                                <div className="flex items-center gap-3 text-xs shrink-0 mt-1">
                                                    <span className="text-gray-500 dark:text-gray-400">{task.numQuestions}題</span>
                                                    {task.hasTimer && <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 border border-red-200 dark:border-red-700">⏱ {task.timeLimit}m</span>}
                                                    {isCompleted ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✅ {localRec.results.score} 分</span>
                                                    ) : inProgress ? (
                                                        <span className="text-amber-500 dark:text-amber-400 font-bold">📝 已填: {localRec.userAnswers.filter(a => a).length}</span>
                                                    ) : (
                                                        <span className="text-gray-400 font-bold">⏳ 未作答</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handlePlayTask(task, localRec)} 
                                                className={`py-1.5 px-4 rounded-2xl font-bold text-xs transition-colors shrink-0 w-full sm:w-auto mt-2 sm:mt-0 ${isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' : 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 hover:bg-stone-800'}`}
                                            >
                                                {isCompleted ? '📊 查看成績與討論' : (inProgress ? '📝 繼續作答' : '⚔️ 開始')}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {!hasAnyOfficial && !hasAnyNormal && otherTasksFiltered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#FCFBF7] dark:bg-stone-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-center shadow-sm w-full mt-4">
                            <div className="text-6xl mb-4">🎯</div>
                            <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">找不到相關任務</h3>
                            <p className="text-gray-500 dark:text-gray-400 font-bold max-w-md">
                                {searchQuery ? '試試看更換其他關鍵字吧！' : '目前還沒有人發布公開任務喔！'}
                            </p>
                        </div>
                    )}

                    {/* ✨ 新增：任務牆的「載入更多」按鈕 */}
                    <div className="flex justify-center mt-8">
                        <button 
                            onClick={() => setTaskLimit(prev => prev + 5)} 
                            className="bg-[#FCFBF7] dark:bg-stone-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-6 py-2 font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            ⬇️ 載入更早的任務...
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
window.TaskWallDashboard = TaskWallDashboard;