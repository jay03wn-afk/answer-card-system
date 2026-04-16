// 從全域 (window) 拿回我們已經搬出去的四個大頁面
const { Dashboard, QuizApp, TaskWallDashboard, WrongBookDashboard } = window;

// ==========================================
// ✨ 國考戰況與 AI 口訣專屬 UI 介面
// ==========================================

function ExamProgressDashboard({ examFeatures, user, showConfirm, showPrompt }) {
    const { useState, useMemo, useEffect } = React;
    const [noteText, setNoteText] = useState('');
    
    // === 常用 Prompt 區狀態 ===
    const [isAddingPrompt, setIsAddingPrompt] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState(null); // 用於編輯模式
    const [newPrompt, setNewPrompt] = useState({ title: '', subjectId: 's1', isQuiz: false, content: '', note: '' });
    const [expandedPromptSubj, setExpandedPromptSubj] = useState({});
    const [promptSettings, setPromptSettings] = useState({});
    const [expandedSettings, setExpandedSettings] = useState({}); // 控制各卡片設定收合

    const DEFAULT_WEIGHTS = useMemo(() => ({
        s1: [{ label: '藥理學', val: 50 }, { label: '藥物化學', val: 50 }],
        s2: [{ label: '藥物分析', val: 50 }, { label: '生藥', val: 31 }, { label: '中藥', val: 19 }],
        s3: [{ label: '藥劑學', val: 56 }, { label: '生物藥劑學', val: 44 }],
        other: [{ label: '自訂科目', val: 100 }]
    }), []);

   // 防呆比例調整：開放輸入，且採用「瀑布式」往後影響，不往前影響
    const handleWeightChange = (promptId, idx, newVal) => {
        setPromptSettings(prev => {
            const current = prev[promptId] || { num: 10, range: '', weights: JSON.parse(JSON.stringify(DEFAULT_WEIGHTS[examFeatures.myPrompts.find(p=>p.id===promptId)?.subjectId || 's1'])) };
            const newWeights = [...current.weights];
            const len = newWeights.length;

            if (len === 1) {
                newWeights[0].val = 100;
            } else {
                // 1. 計算在目前操作的項目「之前」的所有權重總和 (這些是被鎖定的，不可往前影響)
                let lockedSum = 0;
                for (let i = 0; i < idx; i++) {
                    lockedSum += newWeights[i].val;
                }

                // 2. 限制目前輸入的值 (不能超過剩下的扣打，也不能小於 0)
                let maxAllowed = 100 - lockedSum;
                let safeVal = Math.max(0, Math.min(newVal, maxAllowed));
                
                // 3. 把剩下的額度分配給「後方」的科目 (瀑布流分配)
                let remainder = maxAllowed - safeVal;
                newWeights[idx].val = safeVal;

                for (let i = idx + 1; i < len; i++) {
                    if (i === len - 1) {
                        // 最後一項直接拿走所有剩下的，確保總和絕對是 100
                        newWeights[i].val = remainder;
                    } else {
                        // 中間項盡量保持原本的數值，但不超過 remainder
                        let currentVal = newWeights[i].val;
                        let assigned = Math.min(currentVal, remainder);
                        newWeights[i].val = assigned;
                        remainder -= assigned;
                    }
                }

                // 特例：如果使用者硬拉「最後一項」，因為它不能往前影響，強制拉回剩下該有的值
                if (idx === len - 1) {
                    newWeights[idx].val = maxAllowed;
                }
            }
            return { ...prev, [promptId]: { ...current, weights: newWeights } };
        });
    };

    const handleSavePrompt = () => {
        if (!newPrompt.title.trim() || !newPrompt.content.trim()) {
            if (window.setGlobalToast) window.setGlobalToast({ status: 'error', message: '標題與內容不能為空！' });
            return;
        }
        
        let updated;
        if (editingPrompt) {
            updated = examFeatures.myPrompts.map(p => p.id === editingPrompt ? { ...newPrompt, id: p.id } : p);
        } else {
            updated = [...(examFeatures.myPrompts || []), { ...newPrompt, id: Date.now().toString() }];
        }
        
        examFeatures.savePrompts(updated);
        setIsAddingPrompt(false);
        setEditingPrompt(null);
        setNewPrompt({ title: '', subjectId: 's1', isQuiz: false, content: '', note: '' });
        if (window.setGlobalToast) window.setGlobalToast({ status: 'success', message: editingPrompt ? '編輯成功！' : '新增成功！' });
    };

    const handleEditStart = (prompt) => {
        setNewPrompt({ ...prompt });
        setEditingPrompt(prompt.id);
        setIsAddingPrompt(true);
        // 給 React 一點點時間把編輯區塊畫出來，然後滾動過去
        setTimeout(() => {
            document.getElementById('edit-prompt-area')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const handleDeletePrompt = (id) => {
        showConfirm("確定要刪除此 Prompt 嗎？刪除後無法恢復。", () => {
            const updated = (examFeatures.myPrompts || []).filter(p => p.id !== id);
            examFeatures.savePrompts(updated);
            setIsAddingPrompt(false);
            setEditingPrompt(null);
            if (window.setGlobalToast) window.setGlobalToast({ status: 'success', message: '已刪除 Prompt！' });
        });
    };

    const handleSharePrompt = async (prompt) => {
        if (window.setGlobalToast) window.setGlobalToast({ status: 'loading', message: '產生分享代碼中...' });
        const code = await examFeatures.sharePrompt(prompt);
        if (code) {
            navigator.clipboard.writeText(code);
            if (window.setGlobalToast) window.setGlobalToast({ status: 'success', message: `分享代碼「${code}」已複製！朋友點擊匯入並貼上即可。` });
        } else {
            if (window.setGlobalToast) window.setGlobalToast({ status: 'error', message: '分享失敗，請稍後再試。' });
        }
    };

    const handleImportPrompt = () => {
        showPrompt("請貼上 6 位小寫英文字母的分享代碼：", "", async (code) => {
            if (!code || code.trim().length === 0) return;
            const cleanCode = code.trim().toLowerCase();
            
            // 檢查是否已經擁有該代碼的 Prompt
            if (examFeatures.myPrompts && examFeatures.myPrompts.some(p => p.shareCode === cleanCode)) {
                if (window.setGlobalToast) window.setGlobalToast({ status: 'error', message: '您已經匯入或擁有過此 Prompt，無法重複匯入！' });
                return;
            }

            if (window.setGlobalToast) window.setGlobalToast({ status: 'loading', message: '尋找代碼中...' });
            
            const imported = await examFeatures.fetchSharedPrompt(cleanCode);
            if (imported) {
                // 確保匯入的物件帶有 shareCode，作為日後重複檢查的依據
                const updated = [...(examFeatures.myPrompts || []), { ...imported, id: Date.now().toString(), shareCode: cleanCode }];
                examFeatures.savePrompts(updated);
                if (window.setGlobalToast) window.setGlobalToast({ status: 'success', message: `成功匯入：${imported.title}` });
            } else {
                if (window.setGlobalToast) window.setGlobalToast({ status: 'error', message: "找不到該代碼，請確認是否輸入正確。" });
            }
        });
    };

    const handleCopyPrompt = (prompt) => {
        let text = prompt.content;
        if (prompt.isQuiz) {
            const settings = promptSettings[prompt.id] || { num: 10, range: '', weights: DEFAULT_WEIGHTS[prompt.subjectId] };
            let header = `# 題數與佔比\n請根據 [${settings.range || '指定'}] 範圍中的文字、圖表與藥物結構描述，\n出「${settings.num}題」單選題（四選一，A/B/C/D）。\n`;
            settings.weights.forEach(w => {
                header += `- ${w.val}%為「（${w.label}）」試題。\n`;
            });
            text = header + text;
        }
        navigator.clipboard.writeText(text);
        if (window.setGlobalToast) window.setGlobalToast({ status: 'success', message: '已複製 Prompt！' });
    };

    // === AI 口訣區狀態 ===
    const [aiTopic, setAiTopic] = useState('');
    const [aiResult, setAiResult] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    // === 打卡區狀態 ===
    const [expandedSubj, setExpandedSubj] = useState(null);
    const [expandedCat, setExpandedCat] = useState(null);
    const [punchSearch, setPunchSearch] = useState(''); // 新增：打卡區搜尋

    // === 學習軌跡連動區狀態 ===
    const [selectedItems, setSelectedItems] = useState([]);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [logSearch, setLogSearch] = useState(''); // 新增：學習軌跡搜尋
    const [logExpandedSubj, setLogExpandedSubj] = useState(null); // 新增：學習軌跡多層展開
    const [logExpandedCat, setLogExpandedCat] = useState(null);

    const taskTypes = [
        { id: 'skim', label: '速讀', color: 'bg-amber-500' },
        { id: 'deep', label: '細讀', color: 'bg-emerald-500' },
        { id: 'master', label: '熟讀', color: 'bg-amber-500' },
        { id: 'practice', label: '刷題', color: 'bg-rose-500' }
    ];

    const toggleSelectedItem = (itemId) => {
        setSelectedItems(prev => prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]);
    };

    const handleAddLog = (e) => {
        e.preventDefault();
        if (selectedItems.length === 0 && !noteText.trim()) return;

        // 1. 連動更新打卡區：將選中的項目自動標記為已完成 (修復多選無效問題)
        if (selectedItems.length > 0) {
            examFeatures.markTasksDone(selectedItems);
        }

        // 2. 轉換標籤名稱用於顯示
        const subjectLabels = selectedItems.map(id => {
            const [sId, cId, chapIdx, pIdx, type] = id.split('_');
            const subj = examFeatures.EXAM_DATA.find(s => s.id === sId);
            const cat = subj.categories.find(c => c.id === cId);
            const chap = cat.chapters[parseInt(chapIdx)];
            const typeLabel = taskTypes.find(t => t.id === type).label;
            return `${subj.title} > ${chap} (${typeLabel})`;
        });

       examFeatures.addStudyLog(subjectLabels.length > 0 ? subjectLabels : ['📝 一般筆記'], noteText, 'note');
        
        // 3. 清空狀態與提供反饋
        setNoteText('');
        setSelectedItems([]);
        setIsSelectorOpen(false);
        if (window.setGlobalToast) {
            window.setGlobalToast({ status: 'success', message: '打卡成功！已同步更新進度與軌跡。' });
        }
    };

    // === 搜尋過濾邏輯：打卡區 ===
    const filteredPunchData = useMemo(() => {
        if (!punchSearch.trim()) return examFeatures.EXAM_DATA;
        const term = punchSearch.toLowerCase();
        return examFeatures.EXAM_DATA.map(subj => {
            const matchSubj = subj.title.toLowerCase().includes(term);
            const filteredCats = subj.categories.map(cat => {
                const matchCat = cat.title.toLowerCase().includes(term);
                // 重要：保留原本的 Index，避免打卡 ID 錯亂
                const matchedChaps = cat.chapters
                    .map((chapName, chapIdx) => ({ chapName, chapIdx }))
                    .filter(c => c.chapName.toLowerCase().includes(term));
                
                if (matchSubj || matchCat || matchedChaps.length > 0) {
                    return {
                        ...cat,
                        displayChaps: (matchSubj || matchCat) ? cat.chapters.map((chapName, chapIdx) => ({ chapName, chapIdx })) : matchedChaps
                    };
                }
                return null;
            }).filter(Boolean);

            if (matchSubj || filteredCats.length > 0) return { ...subj, categories: filteredCats };
            return null;
        }).filter(Boolean);
    }, [examFeatures.EXAM_DATA, punchSearch]);

    // === 搜尋過濾邏輯：學習軌跡 ===
    const filteredLogData = useMemo(() => {
        if (!logSearch.trim()) return examFeatures.EXAM_DATA;
        const term = logSearch.toLowerCase();
        return examFeatures.EXAM_DATA.map(subj => {
            const matchSubj = subj.title.toLowerCase().includes(term);
            const filteredCats = subj.categories.map(cat => {
                const matchCat = cat.title.toLowerCase().includes(term);
                const matchedChaps = cat.chapters
                    .map((chapName, chapIdx) => ({ chapName, chapIdx }))
                    .filter(c => c.chapName.toLowerCase().includes(term));
                
                if (matchSubj || matchCat || matchedChaps.length > 0) {
                    return {
                        ...cat,
                        displayChaps: (matchSubj || matchCat) ? cat.chapters.map((chapName, chapIdx) => ({ chapName, chapIdx })) : matchedChaps
                    };
                }
                return null;
            }).filter(Boolean);

            if (matchSubj || filteredCats.length > 0) return { ...subj, categories: filteredCats };
            return null;
        }).filter(Boolean);
    }, [examFeatures.EXAM_DATA, logSearch]);

    return (
        <div className="max-w-4xl mx-auto w-full p-4 md:p-6 space-y-6 pb-20">
            {/* === 1. 頂部戰情面板 === */}
            <div className="bg-[#FCFBF7] dark:bg-stone-800 rounded-2xl p-6 shadow-sm border border-cyan-100 dark:border-stone-700 relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-cyan-50/50 dark:bg-cyan-900/20 rounded-tl-full -z-10"></div>
                <div className="flex items-center gap-2 text-amber-700 dark:text-gray-200 mb-2">
                    <span className="material-symbols-outlined text-2xl">donut_large</span>
                    <h2 className="text-xl font-bold">國考備戰總完成度</h2>
                </div>
                <div className="text-4xl font-black text-cyan-600 dark:text-cyan-400 mb-4">
                    {examFeatures.overallProgress}% 
                    <span className="text-sm text-gray-400 ml-2 font-medium">({examFeatures.myTotalPoints} 點)</span>
                </div>
                <div className="h-4 bg-amber-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                    <div 
                        className="h-full bg-cyan-500 rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${Math.min(examFeatures.overallProgress, 100)}%` }}
                    >
                        <div className="absolute inset-0 bg-[#FCFBF7]/20 w-full animate-pulse"></div>
                    </div>
                </div>
              <p className="text-sm text-cyan-700 dark:text-cyan-300 mt-4 font-medium">
                    <span className="material-symbols-outlined text-[16px] align-middle mr-1">trending_up</span> 
                    進度分配：速讀(15%) → 細讀(25%) → 熟讀(30%) → 刷題(30%)
                </p>
            </div>

           {/* === 1.5 常用 Prompt 區 === */}
            <div className="bg-[#FCFBF7] dark:bg-stone-800 rounded-2xl shadow-sm border border-cyan-200 dark:border-stone-700 p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-2xl text-cyan-600">terminal</span>
                        <h2 className="text-xl md:text-2xl font-bold text-cyan-800 dark:text-white">常用 Prompt 區</h2>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleImportPrompt} 
                            className="bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-gray-300 px-3 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-stone-200"
                        >
                            <span className="material-symbols-outlined text-[18px] mr-1">download</span>
                            匯入
                        </button>
                        <button 
                            onClick={() => { setIsAddingPrompt(!isAddingPrompt); setEditingPrompt(null); setNewPrompt({ title: '', subjectId: 's1', isQuiz: false, content: '', note: '' }); }} 
                            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center"
                        >
                            <span className="material-symbols-outlined text-[18px] mr-1">{isAddingPrompt ? 'close' : 'add'}</span>
                            {isAddingPrompt ? '取消' : '新增'}
                        </button>
                    </div>
                </div>

                {isAddingPrompt && (
                    <div id="edit-prompt-area" className="bg-cyan-50 dark:bg-stone-900 p-4 rounded-xl border border-cyan-200 dark:border-stone-700 mb-4 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-cyan-600">{editingPrompt ? 'edit' : 'add_circle'}</span>
                            <span className="font-bold dark:text-white">{editingPrompt ? '編輯 Prompt' : '建立新 Prompt'}</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <input type="text" placeholder="Prompt 標題" className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-cyan-200 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-white outline-none focus:border-cyan-500" value={newPrompt.title} onChange={e => setNewPrompt({...newPrompt, title: e.target.value})} />
                            <select className="px-3 py-2 rounded-lg border border-cyan-200 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-white outline-none" value={newPrompt.subjectId} onChange={e => setNewPrompt({...newPrompt, subjectId: e.target.value})}>
                                {examFeatures.EXAM_DATA.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-bold text-cyan-800 dark:text-cyan-300 cursor-pointer">
                            <input type="checkbox" checked={newPrompt.isQuiz} onChange={e => setNewPrompt({...newPrompt, isQuiz: e.target.checked})} className="w-4 h-4 accent-cyan-500" />
                            這是「出題」類型的 Prompt (複製時可調佔比與題數)
                        </label>
                        <input type="text" placeholder="備註 (選填)" className="w-full px-3 py-2 rounded-lg border border-cyan-200 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-white outline-none text-sm" value={newPrompt.note} onChange={e => setNewPrompt({...newPrompt, note: e.target.value})} />
                        <textarea placeholder="請輸入 Prompt 內容..." className="w-full h-32 px-3 py-2 rounded-lg border border-cyan-200 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-white outline-none resize-none" value={newPrompt.content} onChange={e => setNewPrompt({...newPrompt, content: e.target.value})}></textarea>
                        <div className="flex justify-between items-center">
                            {editingPrompt && (
                                <button onClick={() => handleDeletePrompt(editingPrompt)} className="text-red-500 font-bold flex items-center gap-1 hover:underline">
                                    <span className="material-symbols-outlined text-[18px]">delete</span> 刪除此 Prompt
                                </button>
                            )}
                            <div className="flex gap-2 ml-auto">
                                <button onClick={handleSavePrompt} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-stone-700 dark:hover:bg-white transition-all">
                                    {editingPrompt ? '更新儲存' : '儲存 Prompt'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {examFeatures.EXAM_DATA.map(subj => {
                        const subjPrompts = (examFeatures.myPrompts || []).filter(p => p.subjectId === subj.id);
                        if (subjPrompts.length === 0) return null;
                        const isExpanded = expandedPromptSubj[subj.id] !== false;
                        return (
                            <div key={`prompt-${subj.id}`} className="border border-cyan-100 dark:border-stone-700 rounded-xl overflow-hidden">
                                <button 
                                    onClick={() => setExpandedPromptSubj(prev => ({...prev, [subj.id]: !isExpanded}))}
                                    className="w-full text-left px-4 py-3 bg-cyan-50 dark:bg-stone-800 hover:bg-cyan-100 dark:hover:bg-gray-700 font-bold text-cyan-800 dark:text-gray-200 flex justify-between items-center transition-colors"
                                >
                                    <span>{subj.title} ({subjPrompts.length})</span>
                                    <span className="material-symbols-outlined">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                                </button>
                                {isExpanded && (
                                    <div className="p-3 bg-white dark:bg-stone-900 border-t border-cyan-100 dark:border-stone-700 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {subjPrompts.map(prompt => {
                                            const settings = promptSettings[prompt.id] || { num: 10, range: '', weights: JSON.parse(JSON.stringify(DEFAULT_WEIGHTS[prompt.subjectId])) };
                                            const isSetExpanded = expandedSettings[prompt.id];
                                            return (
                                                <div key={prompt.id} className="border border-gray-200 dark:border-stone-700 rounded-xl p-4 bg-[#FCFBF7] dark:bg-stone-800 flex flex-col shadow-sm relative group">
                                                    <div className="flex justify-between items-start mb-1 pr-1">
                                                        <h3 className="font-bold text-stone-800 dark:text-white text-lg">{prompt.title}</h3>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleSharePrompt(prompt)} className="text-stone-400 hover:text-cyan-500" title="分享"><span className="material-symbols-outlined text-[20px]">share</span></button>
                                                            <button onClick={() => handleEditStart(prompt)} className="text-stone-400 hover:text-cyan-500" title="編輯與刪除"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                                        </div>
                                                    </div>
                                                    {prompt.note && <p className="text-xs text-stone-500 dark:text-gray-400 mb-2">{prompt.note}</p>}
                                                    
                                                    {prompt.isQuiz && (
                                                        <div className="mt-2 mb-3 border border-amber-100 dark:border-stone-700 rounded-lg overflow-hidden">
                                                            <button 
                                                                onClick={() => setExpandedSettings(prev => ({...prev, [prompt.id]: !isSetExpanded}))}
                                                                className="w-full px-3 py-2 bg-amber-50 dark:bg-stone-900 text-amber-800 dark:text-amber-400 text-xs font-bold flex justify-between items-center"
                                                            >
                                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">tune</span> 出題設定 (題數/佔比)</span>
                                                                <span className="material-symbols-outlined text-[16px]">{isSetExpanded ? 'expand_less' : 'expand_more'}</span>
                                                            </button>
                                                            
                                                            {isSetExpanded && (
                                                                <div className="p-3 space-y-3 bg-white dark:bg-stone-800">
                                                                    <div className="flex gap-2">
                                                                        <div className="flex-1">
                                                                            <label className="text-[10px] text-stone-400 block mb-1">題數</label>
                                                                            <input type="number" min="1" className="w-full px-2 py-1 text-sm rounded border border-amber-300 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-white outline-none" value={settings.num} onChange={e => setPromptSettings(prev => ({...prev, [prompt.id]: {...settings, num: e.target.value}}))} />
                                                                        </div>
                                                                        <div className="flex-[2]">
                                                                            <label className="text-[10px] text-stone-400 block mb-1">範圍 (例如 Ch1-5)</label>
                                                                            <input type="text" className="w-full px-2 py-1 text-sm rounded border border-amber-300 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-white outline-none" value={settings.range} onChange={e => setPromptSettings(prev => ({...prev, [prompt.id]: {...settings, range: e.target.value}}))} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2 pt-2 border-t border-amber-50">
                                                                        {settings.weights.map((w, idx) => (
                                                                            <div key={idx} className="flex flex-col gap-1">
                                                                                <div className="flex justify-between items-center text-[10px] font-bold text-amber-700 dark:text-amber-500">
                                                                                    <span>{w.label}</span>
                                                                                    <div className="flex items-center gap-1">
                                                                                        <input
                                                                                            type="number" min="0" max="100" value={w.val}
                                                                                            onChange={e => {
                                                                                                let val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                                                                if (!isNaN(val)) handleWeightChange(prompt.id, idx, val);
                                                                                            }}
                                                                                            className="w-12 px-1 py-0.5 text-right rounded border border-amber-300 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-white outline-none focus:border-amber-500 transition-colors"
                                                                                        />
                                                                                        <span>%</span>
                                                                                    </div>
                                                                                </div>
                                                                                <input 
                                                                                    type="range" min="0" max="100" value={w.val}
                                                                                    className="w-full h-1.5 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                                                    onChange={e => handleWeightChange(prompt.id, idx, parseInt(e.target.value))}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <button onClick={() => handleCopyPrompt(prompt)} className="mt-auto w-full py-2 bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
                                                        <span className="material-symbols-outlined text-[18px]">content_copy</span> 複製 Prompt
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* === 2. 任務打卡區 (含搜尋與雙層選單) === */}
            <div className="bg-[#FCFBF7] dark:bg-stone-800 rounded-2xl shadow-sm border border-amber-200 dark:border-stone-700 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-3xl text-amber-600">book</span>
                    <h2 className="text-xl md:text-2xl font-bold text-amber-800 dark:text-white">各科進度打卡區</h2>
                </div>
                
                {/* 打卡區搜尋框 */}
                <div className="mb-4 relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
                    <input
                        type="text"
                        placeholder="搜尋科目、類別或章節名稱..."
                        value={punchSearch}
                        onChange={(e) => setPunchSearch(e.target.value)}
                        className="w-full px-4 py-2.5 border border-amber-200 dark:border-stone-700 bg-amber-50 dark:bg-stone-900 rounded-xl outline-none text-sm focus:border-cyan-500 dark:text-white transition-colors"
                    />
                    {punchSearch && <button onClick={() => setPunchSearch('')} className="absolute right-3 top-2.5 text-gray-400 font-bold hover:text-gray-600">✖</button>}
                </div>
                
                <div className="space-y-2">
                    {filteredPunchData.length === 0 ? (
                        <div className="text-center py-6 text-amber-400 font-bold text-sm bg-amber-50 dark:bg-stone-900 rounded-xl border border-dashed border-amber-200 dark:border-stone-700">
                            <span className="material-symbols-outlined text-[20px] align-middle mr-1">sentiment_dissatisfied</span>找不到符合的章節範圍
                        </div>
                    ) : filteredPunchData.map(subj => {
                        const isSubjExpanded = punchSearch.trim() || expandedSubj === subj.id;
                        return (
                        <div key={subj.id} className="border border-amber-200 dark:border-stone-700 rounded-xl overflow-hidden">
                            <button 
                                onClick={() => setExpandedSubj(isSubjExpanded ? null : subj.id)}
                                className="w-full text-left px-4 py-3 bg-amber-50 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-gray-700 font-bold text-amber-700 dark:text-gray-200 flex justify-between items-center transition-colors"
                            >
                                <span>{subj.title}</span>
                                <span className="text-cyan-500">{isSubjExpanded ? '▲ 收起' : '▼ 展開'}</span>
                            </button>
                            
                            {isSubjExpanded && (
                                <div className="p-2 bg-[#FCFBF7] dark:bg-stone-900 border-t border-amber-200 dark:border-stone-700">
                                    {subj.categories.map(cat => {
                                        const isCatExpanded = punchSearch.trim() || expandedCat === cat.id;
                                        const chapsToRender = cat.displayChaps || cat.chapters.map((chapName, chapIdx) => ({chapName, chapIdx}));
                                        
                                        return (
                                        <div key={cat.id} className="mb-2 border border-amber-100 dark:border-gray-800 rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => setExpandedCat(isCatExpanded ? null : cat.id)}
                                                className="w-full text-left px-3 py-2 bg-cyan-50/30 dark:bg-cyan-900/10 text-cyan-800 dark:text-cyan-300 font-bold flex justify-between items-center text-sm"
                                            >
                                                <span>{cat.title}</span>
                                                <span>{isCatExpanded ? '▲' : '▼'}</span>
                                            </button>
                                            
                                            {isCatExpanded && (
                                                <div className="p-2 grid grid-cols-1 xl:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                                   {chapsToRender.map(({chapName, chapIdx}) => (
                                                        <div key={chapIdx} className="bg-amber-50 dark:bg-stone-800 p-2 rounded-lg border border-amber-100 dark:border-stone-700">
                                                            <div className="text-xs font-bold text-amber-700 dark:text-gray-300 mb-2">{chapName}</div>
                                                            <div className="flex gap-1">
                                                                {taskTypes.map(type => {
                                                                    const taskId = `${subj.id}_${cat.id}_${chapIdx}_0_${type.id}`;
                                                                    const isDone = examFeatures.myTasks.includes(taskId);
                                                                    return (
                                                                        <button
                                                                            key={type.id}
                                                                            onClick={() => examFeatures.toggleTask(taskId)}
                                                                            className={`flex-1 text-[10px] py-1 rounded font-bold transition-all ${isDone ? `${type.color} text-white` : 'bg-stone-100 dark:bg-gray-700 text-gray-500'}`}
                                                                        >
                                                                            {type.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )})}
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            </div>

            {/* === 3. 學習軌跡 (多層選單與搜尋優化) === */}
            <div className="bg-[#FCFBF7] dark:bg-stone-800 rounded-2xl shadow-sm border border-amber-200 dark:border-stone-700 p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-3xl text-amber-600">history</span>
                    <h2 className="text-xl md:text-2xl font-bold text-amber-800 dark:text-white">每日學習打卡</h2>
                </div>
                
                <div className="mb-6 bg-amber-50 dark:bg-stone-900 p-4 rounded-xl border border-amber-200 dark:border-stone-700">
                    <div className="mb-4 relative">
                        <button 
                            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                            className="w-full py-2.5 px-4 bg-[#FCFBF7] dark:bg-stone-800 border-2 border-dashed border-cyan-300 dark:border-cyan-900 rounded-xl text-cyan-600 dark:text-cyan-400 font-bold text-sm flex justify-between items-center transition-colors hover:bg-cyan-50 dark:hover:bg-cyan-900/10"
                        >
                            {selectedItems.length > 0 ? `已選取 ${selectedItems.length} 個範圍與進度` : <span className="flex items-center"><span className="material-symbols-outlined text-[18px] mr-1">ads_click</span> 點此選取今日學習範圍 (可連動打卡)</span>}
                            <span>{isSelectorOpen ? '▲ 收起' : '▼ 展開選單'}</span>
                        </button>

                        {isSelectorOpen && (
                            <div className="mt-2 bg-[#FCFBF7] dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl shadow-lg absolute w-full z-20">
                                
                                {/* 🔍 軌跡專屬搜尋框 */}
                                <div className="p-3 border-b border-amber-100 dark:border-stone-700 bg-amber-50 dark:bg-stone-900 rounded-t-xl sticky top-0">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="🔍 快速尋找要打卡的範圍..."
                                            value={logSearch}
                                            onChange={(e) => setLogSearch(e.target.value)}
                                            className="w-full px-3 py-2 border border-amber-200 dark:border-gray-600 rounded-lg outline-none text-sm bg-[#FCFBF7] dark:bg-stone-800 dark:text-white focus:border-cyan-500"
                                        />
                                        {logSearch && <button onClick={() => setLogSearch('')} className="absolute right-2.5 top-2 text-gray-400 font-bold">✖</button>}
                                    </div>
                                </div>

                                <div className="p-3 max-h-[350px] overflow-y-auto custom-scrollbar">
                                    {filteredLogData.length === 0 ? (
                                        <div className="text-center py-4 text-amber-400 font-bold text-sm">找不到相關範圍...</div>
                                    ) : filteredLogData.map(subj => {
                                        const isSubjExpanded = logSearch.trim() || logExpandedSubj === subj.id;
                                        return (
                                        <div key={subj.id} className="mb-2 border border-amber-100 dark:border-stone-700 rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => setLogExpandedSubj(isSubjExpanded ? null : subj.id)}
                                                className="w-full text-left px-3 py-2 bg-amber-100 dark:bg-stone-800 hover:bg-amber-200 dark:hover:bg-gray-700 font-bold text-amber-700 dark:text-gray-200 text-sm flex justify-between items-center transition-colors"
                                            >
                                                <span>{subj.title}</span>
                                                <span>{isSubjExpanded ? '▲' : '▼'}</span>
                                            </button>

                                            {isSubjExpanded && (
                                                <div className="p-2 bg-[#FCFBF7] dark:bg-stone-900">
                                                    {subj.categories.map(cat => {
                                                        const isCatExpanded = logSearch.trim() || logExpandedCat === cat.id;
                                                        const chapsToRender = cat.displayChaps || cat.chapters.map((chapName, chapIdx) => ({chapName, chapIdx}));
                                                        return (
                                                            <div key={cat.id} className="mb-2 last:mb-0 border border-amber-50 dark:border-gray-800 rounded">
                                                                <button
                                                                    onClick={() => setLogExpandedCat(isCatExpanded ? null : cat.id)}
                                                                    className="w-full text-left px-2 py-1.5 bg-cyan-50/50 dark:bg-cyan-900/10 text-cyan-800 dark:text-cyan-300 font-bold flex justify-between items-center text-xs"
                                                                >
                                                                    <span>{cat.title}</span>
                                                                    <span>{isCatExpanded ? '▲' : '▼'}</span>
                                                                </button>

                                                                {isCatExpanded && (
                                                                    <div className="p-2 space-y-2">
                                                                        {chapsToRender.map(({chapName, chapIdx}) => (
                                                                            <div key={chapIdx} className="flex flex-wrap gap-1 bg-amber-50 dark:bg-stone-800 p-2 rounded">
                                                                                <div className="w-full text-xs font-bold text-amber-600 dark:text-gray-400 mb-1">{chapName}</div>
                                                                                {taskTypes.map(type => {
                                                                                    const taskId = `${subj.id}_${cat.id}_${chapIdx}_0_${type.id}`;
                                                                                    const isSelected = selectedItems.includes(taskId);
                                                                                    const isAlreadyDone = examFeatures.myTasks.includes(taskId);
                                                                                    return (
                                                                                        <button
                                                                                            key={type.id}
                                                                                            onClick={() => toggleSelectedItem(taskId)}
                                                                                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${isSelected ? 'bg-cyan-500 border-cyan-500 text-white shadow-sm' : isAlreadyDone ? 'bg-amber-200 border-amber-300 text-amber-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-500' : 'bg-[#FCFBF7] border-amber-200 text-amber-500 dark:bg-stone-800 dark:border-gray-600 dark:text-gray-300'}`}
                                                                                        >
                                                                                            {isAlreadyDone && !isSelected ? '✓ ' : ''}{type.label}
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )})}
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleAddLog} className="flex gap-2">
                        <input
                            type="text"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="今日心得筆記 (非必填)..."
                            className="flex-1 px-3 py-2 bg-[#FCFBF7] dark:bg-stone-800 border border-amber-300 dark:border-gray-600 rounded-lg outline-none text-sm text-amber-800 dark:text-white focus:border-cyan-500"
                        />
                        <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95">打卡</button>
                    </form>
                </div>

                {/* 軌跡列表 */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {examFeatures.studyLogs.length === 0 ? (
                        <div className="text-center py-8 text-amber-400 border-2 border-dashed border-amber-100 dark:border-stone-700 rounded-xl">尚無學習紀錄</div>
                    ) : (
                        examFeatures.studyLogs.map((log, index) => (
                            <div key={log.id} className="flex gap-3 relative group">
                                <div className="flex flex-col items-center min-w-[1rem] mt-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full z-10 bg-cyan-400"></div>
                                    {index !== examFeatures.studyLogs.length - 1 && <div className="w-0.5 h-full bg-amber-100 dark:bg-gray-700 -my-1"></div>}
                                </div>
                                <div className="flex-1 pb-6">
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                        <span className="text-[10px] font-medium text-amber-400">{log.date} {log.time}</span>
                                        {log.subjects && log.subjects.map((sub, i) => (
                                            <span key={i} className="text-[10px] font-bold text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 px-2 py-0.5 rounded-full border border-cyan-100 dark:border-cyan-800">{sub}</span>
                                        ))}
                                        <button onClick={() => examFeatures.deleteStudyLog(log.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-[10px] text-red-400 font-bold transition-opacity bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">刪除</button>
                                    </div>
                                    {log.message && <p className="text-sm p-3 rounded-xl bg-amber-50 dark:bg-stone-800/50 border border-amber-100 dark:border-stone-700 text-amber-700 dark:text-gray-300 break-all">{log.message}</p>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
// ============== 貼到這行之上： function Main() { ==============
function Main() {
    const { useState, useEffect } = React;

    // --- 基礎 App 狀態 ---
    const [user, setUser] = useState(null);

    // ✨ 啟動大腦模組 (傳入 Firebase db 與 user)
    const examFeatures = useExamFeatures(window.db, user);

    // ✨ 新增：側邊選單的開關狀態
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // ✨ 新增：一進來就檢查網址有沒有 qaId 或 newsId，存入狀態中
    const [currentQaId, setCurrentQaId] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('qaId');
    });
    const [currentNewsId, setCurrentNewsId] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('newsId');
    });

    // ✨ 新增：用來關閉快問快答與電子報視窗的方法
    const closeFastQA = () => {
        window.history.replaceState({}, document.title, window.location.pathname);
        setCurrentQaId(null);
    };
    const closeNews = () => {
        window.history.replaceState({}, document.title, window.location.pathname);
        setCurrentNewsId(null);
    };
  const [userProfile, setUserProfile] = useState({ displayName: '載入中...', folders: [] });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activeQuizRecord, setActiveQuizRecord] = useState(null);

    // ✨ 全域教學狀態管理
    const [tutorialStep, setTutorialStep] = useState(0);

    const nextTutorialStep = () => setTutorialStep(prev => prev + 1);
    const skipTutorial = () => {
        setTutorialStep(0);
        if (user) {
            window.db.collection('users').doc(user.uid).update({ hasSeenTutorial: true });
            setUserProfile(prev => ({ ...prev, hasSeenTutorial: true }));
        }
    };
    const restartTutorial = () => {
        if (user) {
            window.db.collection('users').doc(user.uid).update({ hasSeenTutorial: false });
            setUserProfile(prev => ({ ...prev, hasSeenTutorial: false }));
        }
        setTutorialStep(1);
        setActiveTab('dashboard'); // 不刷新網頁，直接切回首頁
    };

    // ✨ 新增：全域背景通知狀態 (確保跨網頁切換時皆可顯示)
    const [globalToast, setGlobalToast] = useState(null);

    useEffect(() => {
        window.setGlobalToast = setGlobalToast;
    }, []);

    // ✨ 沉浸式新手教學核心：偵測未完成教學，自動啟動教學步驟 1 (留在首頁)
    useEffect(() => {
        if (userProfile && userProfile.hasSeenTutorial === false && !currentQaId && !currentNewsId && tutorialStep === 0) {
            setTutorialStep(1);
            setActiveTab('dashboard');
        }
    }, [userProfile?.hasSeenTutorial, currentQaId, currentNewsId, tutorialStep]);

    // ✨ 自動滾動機制：確保教學時能滑動到發光按鈕
    // ✨ 沉浸式教學：自動偵測「亮圈」元素並滑動到該位置
    React.useEffect(() => {
        if (tutorialStep > 0) {
            const timer = setTimeout(() => {
                const activeEl = document.querySelector('.tutorial-highlight');
                if (activeEl) {
                    activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [tutorialStep, activeTab, activeQuizRecord]);

    // ✨ 沉浸式教學：自動偵測「亮圈」元素並滑動到該位置
    React.useEffect(() => {
        if (tutorialStep > 0) {
            const timer = setTimeout(() => {
                const activeEl = document.querySelector('.tutorial-highlight');
                if (activeEl) {
                    activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [tutorialStep, activeTab, activeQuizRecord]);

    const renderTutorialOverlay = () => {
        if (!tutorialStep || tutorialStep === 0) return null;
        
        let title = ""; let content = ""; let icon = "school";
        let showNext = true; let nextText = "知道了"; let onNext = nextTutorialStep;
        let pos = "items-center justify-center"; 

        switch (tutorialStep) {
            case 1:
                title = "歡迎來到 JJay 線上測驗！";
                content = "這是專為你打造的沉浸式刷題系統。接下來我們將花 1 分鐘帶你走過完整流程。";
                icon = "rocket_launch";
                break;
            case 2:
                title = "第一步：開始新測驗";
                content = "點擊這個閃爍的按鈕來建立你的第一份考卷吧！";
                icon = "add_circle";
                showNext = false;
                break;
            case 3:
                title = "建置考卷：名稱與分類";
                content = "系統已準備好試卷內容！";
                icon = "drive_file_rename_outline";
                pos = "items-end justify-end pb-10 pr-6 md:pb-24 md:pr-10"; // 移至右下角
                break;
            case 4:
                title = "核心功能：富文本試題";
                content = "這就是最強大的「富文本模式」！\n系統已自動填入試題，你可以看到它完美保留了圖片、表格與排版。";
                icon = "description";
                pos = "items-end justify-end pb-10 pr-6 md:pb-24 md:pr-10"; // 移至右下角
                break;
            case 5:
                title = "最後設定：準備開始！";
                content = "欄位介紹完畢！我們也幫你預設了「偷看答案」功能，這對練習非常實用！\n\n👉 請點擊閃爍的「開始作答」！";
                icon = "settings_suggest";
                pos = "items-start justify-center pt-24"; 
                showNext = false;
                break;
            case 6:
                title = "作答技巧：選項與刪去";
                content = "這是沉浸式介面。你可以用鍵盤 A/B/C/D 作答，或點擊選項旁的「✕」標記刪去法。\n\n👉 請試著「點擊任意一個選項」！";
                icon = "ads_click";
                pos = "items-start justify-end pt-24 pr-10";
                showNext = false;
                break;
            case 7:
                title = "作答技巧：偷看答案";
                content = "遇到不會的題目？點擊「偷看答案」會立即顯示詳解並鎖定該題。\n\n👉 點擊這題閃爍的「偷看答案」按鈕！";
                icon = "key";
                pos = "items-end justify-start pb-24 pl-10"; 
                showNext = false;
                break;
            case 8:
                title = "自由作答時間！";
                content = "偷看答案後，下方會立刻展開該題詳解，且選項將被鎖定。\n\n接下來是你的【自由作答時間】！請自由作答剩下的所有題目。(全部填滿後，才會解鎖「交卷」按鈕喔！)";
                icon = "lock_open";
                pos = "items-center justify-center";
                showNext = true;
                nextText = "開始挑戰";
                onNext = () => setTutorialStep(99);
                break;
            case 9:
                title = "完成測驗：交卷結算";
                content = "太棒了！你已經完成了所有題目。\n\n👉 現在，點擊右上角閃爍的「交卷對答案」按鈕，看看你拿了幾分！";
                icon = "task_alt";
                pos = "items-start justify-end pt-24 pr-10";
                showNext = false;
                break;
            case 10:
                title = "🎉 教學大功告成！";
                content = "成績結算出來囉！交卷後，你可以隨時查閱每一題的詳解，或將重點題目「收錄」至專屬錯題本。\n\n恭喜你學會了所有核心功能，趕快開始你的刷題之旅吧！";
                icon = "celebration";
                nextText = "完成教學";
                onNext = skipTutorial;
                break;
            default: return null;
        }

        return (
            <div className={`fixed inset-0 z-[150] flex ${pos} pointer-events-none p-4`}>
                {/* ✨ 關鍵優化：增加半透明度且在 showNext 時不鎖死點擊，避免黑屏感 */}
                <div className={`absolute inset-0 bg-stone-900 transition-opacity duration-500 ${showNext ? 'opacity-50 pointer-events-none' : 'opacity-85 pointer-events-auto'}`} onClick={(e) => { if(!showNext) e.stopPropagation(); }}></div>
                <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 w-full max-w-md rounded-3xl shadow-2xl border-2 border-amber-500 relative z-[160] pointer-events-auto transform transition-all duration-500">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined text-[32px] text-amber-500">{icon}</span>
                        <h2 className="text-xl font-black text-stone-800 dark:text-white leading-tight">{title}</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 font-bold mb-6 whitespace-pre-wrap leading-relaxed">{content}</p>
                    <div className="flex justify-between items-center">
                        <button onClick={skipTutorial} className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">跳過</button>
                        {showNext && (
                            <button onClick={onNext} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-full font-black shadow-md transition-all flex items-center gap-1 active:scale-95">
                                {nextText} <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    
    // ✨ 修改：加入載入進度條相關狀態
    const [loading, setLoading] = useState(true);
    const [loadingStep, setLoadingStep] = useState('步驟 1/3：抓取雲端數據...');
    const [loadingProgress, setLoadingProgress] = useState(0);

    // 將進度條更新方法綁定到全域，讓其他資料夾的非同步函數可以輕易呼叫
    useEffect(() => {
        window.setGlobalLoading = setLoading;
        window.setGlobalLoadingStep = setLoadingStep;
        window.setGlobalLoadingProgress = setLoadingProgress;
    }, []);

    // 夜間模式狀態 (從 localStorage 讀取記憶)
    const [isDark, setIsDark] = useState(localStorage.getItem('darkMode') === 'true');

    // ✨ 新增：強制顯示登入畫面狀態 (用來打破死迴圈)
    const [forceLoginScreen, setForceLoginScreen] = useState(false);

    // 監聽夜間模式切換並改變 HTML 標籤的 class
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('darkMode', isDark);
    }, [isDark]);

    // --- 自定義 Modal 狀態控制中心 ---
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        type: 'alert',
        title: '',
        message: '',
        onConfirm: null,
        defaultValue: ''
    });
    const [promptInput, setPromptInput] = useState('');

    const showAlert = (msg, title = "系統提示") => {
        setModalConfig({ isOpen: true, type: 'alert', title, message: msg });
    };

    const showConfirm = (msg, onConfirm, title = "請確認") => {
        setModalConfig({ isOpen: true, type: 'confirm', title, message: msg, onConfirm });
    };

    const showPrompt = (msg, def = "", onOk, title = "需要輸入資料") => {
        setPromptInput(def);
        setModalConfig({ isOpen: true, type: 'prompt', title, message: msg, onConfirm: onOk });
    };

    const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

    // ✨ 新增：分享網站功能
    const handleShareSite = () => {
        const shareData = {
            title: 'JJay 線上測驗',
            text: '快來加入 JJay 線上測驗！首創雙螢幕排版、錯題整理，還有社群與史蒂夫養成系統，讓讀書不再孤單！',
            url: window.location.origin
        };
        // 檢查瀏覽器是否支援原生分享 (手機端通常支援)
        if (navigator.share) {
            navigator.share(shareData).catch(err => console.log("分享被取消或失敗", err));
        } else {
            // 不支援原生分享時的備用方案 (複製網址)
            navigator.clipboard.writeText(shareData.url);
            showAlert('已將網站連結複製到剪貼簿！快去貼給朋友吧！', '🔗 分享網站');
        }
    };


    useEffect(() => {
        // 🚀 終極防卡死：稍微放寬時間到 3000 (3秒)，讓 Firebase 有足夠時間去要通行證
        let isAuthResolved = false;
        const forceLoginTimer = setTimeout(() => {
            if (!isAuthResolved) {
                isAuthResolved = true;
                setLoading(false);
            }
        }, 3000);

        const unsubscribe = window.auth.onAuthStateChanged(async (u) => {
            if (!isAuthResolved) {
                isAuthResolved = true;
                clearTimeout(forceLoginTimer);
            }

            if (u) {
                try {
                    // 🚀 終極魔法：強制刷新 Token，強迫 Firestore 乖乖等到「最高權限通行證」發放後再行動！
                    await u.getIdToken(true);
                } catch(e) {
                    console.warn("Token 刷新略過", e);
                }
                
                // 拿到最高權限後，才把 user 交給系統，讓後續功能正常運作
                setUser(u);
                
                let hasResolved = false;
                const profileTimeout = setTimeout(() => {
                    if (!hasResolved) setLoading(false);
                }, 1200);

                // 🚀 終極安全網：加上錯誤攔截器，就算遇到網路閃斷，網頁也絕對不會白屏崩潰！
                window.db.collection('users').doc(u.uid).onSnapshot(
                    { includeMetadataChanges: true }, 
                    doc => {
                        if (doc.exists) setUserProfile(doc.data());
                        if (!hasResolved) {
                            hasResolved = true;
                            setLoading(false);
                            clearTimeout(profileTimeout);
                        }
                    },
                    err => {
                        // 當遇到短暫的權限不同步或離線，默默吞下錯誤並等待自動重連
                        console.warn("🛡️ 已攔截背景同步延遲 (安全忽略):", err.message);
                        if (!hasResolved) {
                            hasResolved = true;
                            setLoading(false);
                            clearTimeout(profileTimeout);
                        }
                    }
                );
            } else {
                setUser(null);
                setLoading(false);
            }
        });
        return () => {
            unsubscribe();
            clearTimeout(forceLoginTimer);
        };
    }, []);

    // --- 新增：國考倒數計時器組件 ---
    // --- 新增：國考倒數計時器組件 ---
    const ExamCountdown = () => {
        const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, totalHours: 0 });

        useEffect(() => {
            // 設定目標時間：2026-07-19 09:00:00 (台灣時間 GMT+8)
            const targetDate = new Date('2026-07-18T09:00:00+08:00').getTime();

            const updateTimer = () => {
                const now = new Date().getTime();
                const diff = targetDate - now;

                if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const totalHours = Math.floor(diff / (1000 * 60 * 60));
                    setTimeLeft({ days, hours, totalHours });
                } else {
                    setTimeLeft({ days: 0, hours: 0, totalHours: 0 });
                }
            };

            updateTimer(); // 初始執行一次
            const intervalId = setInterval(updateTimer, 60000); // 每分鐘更新一次
            return () => clearInterval(intervalId);
        }, []);

        return (
            <div className="hidden md:flex flex-col items-end justify-center mr-2 text-xs font-bold tracking-widest">
                <span className="text-amber-400 drop-shadow">距國考剩 {timeLeft.days} 天 {timeLeft.hours} 小時</span>
                <span className="text-[10px] text-amber-500">(相當於 {timeLeft.totalHours} 小時)</span>
            </div>
        );
    };
    // ---------------------------------

    // ✨ 新增：側邊欄導覽項目切換功能
    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        setIsSidebarOpen(false); // 點擊後自動收起側邊欄
    };

   const topNavContent = (
        <>
            {/* 頂部標題列 (包含漢堡按鈕與工具) */}
            <div className="bg-stone-800 dark:bg-stone-950 text-stone-100 px-4 flex justify-between items-center shadow-lg h-14 shrink-0 relative z-20 transition-colors border-b border-stone-700">
                <div className="flex items-center">
                    {/* 漢堡選單按鈕 */}
                    <button onClick={() => setIsSidebarOpen(true)} className="mr-4 text-2xl hover:text-gray-300 transition-colors focus:outline-none">
                        ☰
                    </button>
                    <span className="font-black text-lg tracking-widest">JJay</span>
                </div>
                
                {user && (
                    <div className="flex items-center space-x-3 md:space-x-4">
                        <ExamCountdown />
                        <button onClick={handleShareSite} className="text-xl hover:scale-110 transition-transform text-stone-300 hover:text-white flex items-center" title="分享網站給好友">
                            <span className="material-symbols-outlined text-[22px]">link</span>
                        </button>
                        <button onClick={() => setIsDark(!isDark)} className="text-xl hover:scale-110 transition-transform text-stone-300 hover:text-white flex items-center" title="切換日/夜間模式">
                            <span className="material-symbols-outlined text-[22px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
                        </button>
                        <div className="w-8 h-8 bg-gray-700 rounded-2xl overflow-hidden border border-gray-600">
                            {userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-stone-300"><span className="material-symbols-outlined text-[18px]">person</span></div>}
                        </div>
                    </div>
                )}
            </div>

            {/* 手機版側邊選單遮罩 (加上 onClick 關閉) */}
                {isSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[90] transition-opacity duration-300"
                        onClick={() => setIsSidebarOpen(false)}
                    ></div>
                )}

            {/* 側邊選單主體 */}
                        <div className={`fixed top-0 left-0 h-full w-64 bg-[#FCFBF7] dark:bg-stone-900 shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                            {/* 側邊欄標題與關閉按鈕 */}
                            <div className="flex justify-between items-center p-4 border-b border-stone-200 dark:border-stone-800 shrink-0">
                                <h2 className="text-xl font-black text-stone-800 dark:text-stone-100 tracking-wider">選單</h2>
                                <button onClick={() => setIsSidebarOpen(false)} className="text-stone-500 hover:text-amber-500 dark:hover:text-amber-400 focus:outline-none transition-colors p-2 cursor-pointer relative z-10">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                <div className="flex-1 overflow-y-auto py-2 flex flex-col custom-scrollbar">
                    <button onClick={() => handleTabClick('newspaper')} className={`text-left px-6 py-4 font-bold transition-colors flex items-center gap-3 ${activeTab === 'newspaper' ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}><span className="material-symbols-outlined text-[20px]">newspaper</span> JJay日報</button>
                    <button onClick={() => handleTabClick('dashboard')} className={`text-left px-6 py-4 font-bold transition-colors flex items-center gap-3 ${activeTab === 'dashboard' ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}><span className="material-symbols-outlined text-[20px]">library_books</span> 我的題庫</button>
                    <button onClick={() => handleTabClick('taskwall')} className={`text-left px-6 py-4 font-bold transition-colors flex items-center gap-3 ${activeTab === 'taskwall' ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}><span className="material-symbols-outlined text-[20px]">task_alt</span> 任務牆</button>
                    <button onClick={() => handleTabClick('wrongbook')} className={`text-left px-6 py-4 font-bold transition-colors flex items-center gap-3 ${activeTab === 'wrongbook' ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}><span className="material-symbols-outlined text-[20px]">menu_book</span> 錯題整理</button>
                    <button onClick={() => handleTabClick('social')} className={`text-left px-6 py-4 font-bold transition-colors flex items-center gap-3 ${activeTab === 'social' ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}><span className="material-symbols-outlined text-[20px]">forum</span> 社群交流</button>
                    <button onClick={() => handleTabClick('minecraft')} className={`text-left px-6 py-4 font-bold transition-colors flex items-center gap-3 ${activeTab === 'minecraft' ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}><span className="material-symbols-outlined text-[20px]">sports_esports</span> 史蒂夫養成</button>
                    
                    {/* ✨ 新增的國考進度追蹤 */}
                    <button onClick={() => handleTabClick('examProgress')} className={`text-left px-6 py-4 font-bold transition-colors flex items-center gap-3 ${activeTab === 'examProgress' ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}><span className="material-symbols-outlined text-[20px]">trending_up</span> 國考戰況追蹤</button>
                    
                    <button onClick={() => handleTabClick('profile')} className={`text-left px-6 py-4 font-bold transition-colors flex items-center gap-3 ${activeTab === 'profile' ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}><span className="material-symbols-outlined text-[20px]">person</span> 個人檔案</button>
                </div>
            </div>
        </>
    );

    if (loading) return (
        <div className="h-[100dvh] flex flex-col items-center justify-center bg-stone-50 text-stone-800 dark:bg-stone-900 dark:text-stone-100 font-mono p-6">
            <div className="text-5xl mb-8 animate-bounce">💊</div>
            <div className="text-lg font-bold mb-3 tracking-widest text-amber-600 dark:text-amber-400 drop-shadow-sm">{loadingStep}</div>
            
            {/* 視覺化進度條 */}
            <div className="w-full max-w-sm bg-[#FCFBF7] dark:bg-stone-800 border border-stone-300 dark:border-stone-600 p-1 rounded-full mb-2 relative h-8 shadow-sm">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-200 ease-out" style={{ width: `${loadingProgress}%` }}></div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow-md tracking-widest">
                    {loadingProgress}%
                </div>
            </div>
            
            <div className="text-xs text-stone-500 font-bold mt-6 animate-pulse">
                {loadingProgress === 100 ? '即將完成...' : '巨量資料處理中，請稍候...'}
            </div>
        </div>
    );

    // ✅ 1. 將 Modal 的 UI 提出來變成一個獨立變數，讓他在哪裡都能顯示
  const SharedModal = modalConfig.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-sm border border-amber-200/50 dark:border-stone-700 shadow-2xl rounded-3xl p-8 transform transition-all">
                <h3 className="text-xl font-black mb-3 dark:text-stone-100 border-b border-stone-100 dark:border-stone-700 pb-3 tracking-tight text-stone-800">
                    {modalConfig.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 font-bold whitespace-pre-wrap leading-relaxed">
                    {modalConfig.message}
                </p>

                {modalConfig.type === 'prompt' && (
                    <input 
                        autoFocus
                        className="w-full p-2 mb-6 border-2 border-black dark:border-gray-600 bg-gray-50 dark:bg-stone-900 dark:text-white rounded-2xl outline-none focus:bg-[#FCFBF7] focus:border-amber-500 transition-colors"
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        onKeyDown={(e) => {
                            // 修正：加入 !e.nativeEvent.isComposing 避免中文輸入法選字時觸發確認
                            if(e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                const currentInput = promptInput;
                                const currentConfirm = modalConfig.onConfirm;
                                closeModal();
                                setTimeout(() => { if (currentConfirm) currentConfirm(currentInput); }, 50);
                            }
                        }}
                    />
                )}

                <div className="flex justify-end space-x-3">
                    {modalConfig.type !== 'alert' && (
                        <button type="button" onClick={closeModal} className="px-4 py-2 font-bold text-gray-500 hover:text-red-500 transition-colors">
                            取消
                        </button>
                    )}
                    <button 
                        type="button"
                        onClick={() => {
                            const currentType = modalConfig.type;
                            const currentConfirm = modalConfig.onConfirm;
                            const currentInput = promptInput;
                            closeModal();
                            setTimeout(() => {
                                if (currentType === 'prompt' && currentConfirm) {
                                    currentConfirm(currentInput);
                                } else if (currentConfirm) {
                                    currentConfirm();
                                }
                            }, 50);
                        }}
                        className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-8 py-2 font-black rounded-2xl hover:bg-stone-800 dark:hover:bg-[#FCFBF7] transition-transform active:scale-95 shadow-md"
                    >
                        確定
                    </button>
                </div>
            </div>
        </div>
    );

    // ==========================================
    // ✨ 新增：訪客分享連結專屬通道 (必須放在 AuthScreen 擋板之前！)
    // ==========================================
    if (!user && (currentQaId || currentNewsId) && !forceLoginScreen) {
        return (
            /* 修改：如果是訪客看分享連結，強行移除 dark mode 的背景影響 */
<div className={`h-[100dvh] overflow-y-auto custom-scrollbar flex flex-col items-center pt-6 sm:pt-12 px-4 transition-colors duration-300 ${isDark ? 'bg-stone-800' : 'bg-stone-60050'}`}>
                {SharedModal} 
                <div className="w-full max-w-3xl z-10 pb-12">
                    {currentQaId && <FastQASection user={null} showAlert={showAlert} showConfirm={showConfirm} targetQaId={currentQaId} onRequireLogin={() => setForceLoginScreen(true)} />}
                    {currentNewsId && <NewspaperDashboard user={null} userProfile={{}} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} targetNewsId={currentNewsId} onRequireLogin={() => setForceLoginScreen(true)} />}
                </div>
            </div>
        );
    }
    // ==========================================
    // 訪客通道結束
    // ==========================================

    // ✅ 2. 修改未登入的判斷：加上 Fragment (<>...</>) 並把 SharedModal 塞進去
    if (!user) return (
        <>
            {SharedModal}
            <AuthScreen showAlert={showAlert} />
        </>
    );

    // ✅ 3. 修改設定暱稱的判斷：一樣把 SharedModal 塞進去
    if (userProfile && userProfile.displayName !== '載入中...' && !userProfile.displayName) {
        return (
            <>
                {SharedModal}
                <ProfileSetup user={user} onComplete={(name) => setUserProfile(prev => ({...prev, displayName: name}))} showAlert={showAlert} />
            </>
        );
    }

 return (
        <div className="h-[100dvh] flex flex-col overflow-hidden bg-[#F0EFEB] dark:bg-stone-900 transition-colors relative duration-500">       
            
            {/* ✨ 全域字體注入：Noto Sans TC 搭配圓潤的 Quicksand */}
            <style dangerouslySetInnerHTML={{__html: `
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Quicksand:wght@400;500;600;700&display=swap');

                /* 強制套用到所有元素，但排除圖示類別以免失效 */
                *:not(.material-symbols-outlined), body, button, input, textarea, select {
                    font-family: 'Quicksand', 'Noto Sans TC', sans-serif !important;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    letter-spacing: 0.02em; /* 增加一點字距，更有高級感 */
                }

                /* 標題類文字可以加粗一點 */
                h1, h2, h3, .font-black {
                    font-weight: 700 !important;
                }
            `}} />
                {/* ✨ 新增：AI 背景生成全域右下角小通知 (不阻擋使用者操作，跨頁面皆存活) */}
            {globalToast && (
                <div className={`fixed bottom-6 right-6 p-4 shadow-2xl z-[9999] border-l-4 transition-all max-w-sm w-full font-bold text-sm flex items-start gap-3 animate-fade-in-up
                    ${globalToast.status === 'loading' ? 'bg-amber-50 border-amber-500 text-amber-800 dark:bg-stone-800 dark:text-amber-300' : 
                      globalToast.status === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-stone-800 dark:text-emerald-300' : 
                      'bg-red-50 border-red-500 text-red-800 dark:bg-stone-800 dark:text-red-300'}`}
                >
                    {globalToast.status === 'loading' && <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5"></div>}
                    <div className="flex-1 leading-relaxed">{globalToast.message}</div>
                    {(globalToast.status === 'success' || globalToast.status === 'error') && (
                        <button onClick={() => setGlobalToast(null)} className="ml-auto text-gray-400 hover:text-stone-800 dark:hover:text-white shrink-0">✕</button>
                    )}
                </div>
            )}
            

            {/* ✅ 4. 主畫面這裡原本一大串的 modal 程式碼，現在只需要呼叫 SharedModal 就好了 */}
            {SharedModal}
            {renderTutorialOverlay()}

            {/* ✨ 新增：已經登入的玩家，如果網址有 qaId 或 newsId，直接蓋一個滿版視窗在最上層 */}
            {user && currentQaId && (
                <div className="fixed inset-0 z-[60] bg-stone-800/80 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
                    <div className="bg-stone-50 dark:bg-stone-900 w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl relative shadow-2xl border-4 border-rose-500">
                        <button onClick={closeFastQA} className="absolute top-4 right-4 text-3xl z-20 hover:scale-110 transition-transform bg-[#FCFBF7] dark:bg-stone-800 rounded-full w-10 h-10 flex items-center justify-center shadow-md border border-gray-300 dark:border-gray-600">❌</button>
                        <div className="p-4 sm:p-8 pt-16">
                            <FastQASection user={user} showAlert={showAlert} showConfirm={showConfirm} targetQaId={currentQaId} onClose={closeFastQA} />
                        </div>
                    </div>
                </div>
            )}
            {user && currentNewsId && (
                <div className="fixed inset-0 z-[60] bg-stone-800/80 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
                    <div className="bg-stone-50 dark:bg-stone-900 w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl relative shadow-2xl border-4 border-amber-400">
                        <button onClick={closeNews} className="absolute top-4 right-4 text-3xl z-20 hover:scale-110 transition-transform bg-[#FCFBF7] dark:bg-stone-800 rounded-full w-10 h-10 flex items-center justify-center shadow-md border border-gray-300 dark:border-gray-600">❌</button>
                        <div className="p-4 sm:p-8 pt-16">
                            <NewspaperDashboard user={user} userProfile={userProfile} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} targetNewsId={currentNewsId} onClose={closeNews} />
                        </div>
                    </div>
                </div>
            )}
            
            {/* ✨ 新增：行事曆考試彈出提醒 */}
            {user && userProfile && <ExamAlertPopup user={user} userProfile={userProfile} />}

            {activeTab !== 'activeQuiz' && topNavContent}
            
            {activeTab !== 'activeQuiz' ? (
                <div className="flex-grow pt-4 md:pt-6 overflow-hidden flex flex-col bg-gray-50 dark:bg-stone-900 transition-colors">
                    {activeTab === 'newspaper' && <NewspaperDashboard user={user} userProfile={userProfile} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} onContinueQuiz={(rec) => { setActiveQuizRecord(rec); setActiveTab('activeQuiz'); }} />}                    {activeTab === 'dashboard' && <Dashboard user={user} userProfile={userProfile} onStartNew={(folderName) => { setActiveQuizRecord({ folder: folderName }); setActiveTab('activeQuiz'); if(tutorialStep===2) setTutorialStep(3); }} onContinueQuiz={(rec) => { setActiveQuizRecord(rec); setActiveTab('activeQuiz'); }} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} tutorialStep={tutorialStep} setTutorialStep={setTutorialStep} />}
                    {activeTab === 'taskwall' && <TaskWallDashboard user={user} showAlert={showAlert} showConfirm={showConfirm} onContinueQuiz={(rec) => { setActiveQuizRecord(rec); setActiveTab('activeQuiz'); }} />}
                    
                    {/* 更新：傳入 onContinueQuiz，實現跳轉功能 */}
                    {activeTab === 'wrongbook' && <WrongBookDashboard user={user} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} onContinueQuiz={(rec) => { setActiveQuizRecord(rec); setActiveTab('activeQuiz'); }} />}
                    
                    {activeTab === 'social' && <SocialDashboard user={user} userProfile={userProfile} showAlert={showAlert} showPrompt={showPrompt} />}
                    {activeTab === 'minecraft' && (
                        <div className="h-full w-full flex flex-col overflow-y-auto custom-scrollbar">
                            
                            <MinecraftDashboard user={user} userProfile={userProfile} showAlert={showAlert} />
                        </div>
                    )}
                    
                   {/* ✨ 正式接上華麗的國考進度與口訣 UI */}
                    {activeTab === 'examProgress' && (
                        <div className="h-full w-full flex flex-col overflow-y-auto custom-scrollbar bg-cyan-50/30 dark:bg-stone-900 transition-colors">
                            <ExamProgressDashboard examFeatures={examFeatures} user={user} showConfirm={showConfirm} showPrompt={showPrompt} />
                        </div>
                    )}

                    {activeTab === 'profile' && <ProfilePage user={user} userProfile={userProfile} showAlert={showAlert} restartTutorial={restartTutorial} />}
                </div>
            ) : (
                <QuizApp key={activeQuizRecord ? activeQuizRecord.id : 'new-quiz'} currentUser={user} userProfile={userProfile} activeQuizRecord={activeQuizRecord} onBackToDashboard={() => setActiveTab('dashboard')} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} tutorialStep={tutorialStep} setTutorialStep={setTutorialStep} />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Main />);
