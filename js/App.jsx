// ==========================================
// ✨ 國考戰況與 AI 口訣專屬 UI 介面
// ==========================================

function ExamProgressDashboard({ examFeatures, user }) {
    const { useState, useMemo } = React;
    const [noteText, setNoteText] = useState('');
    
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
        { id: 'skim', label: '速讀', color: 'bg-blue-500' },
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

        // 1. 連動更新打卡區：將選中的項目自動標記為已完成
        selectedItems.forEach(taskId => {
            if (!examFeatures.myTasks.includes(taskId)) {
                examFeatures.toggleTask(taskId);
            }
        });

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
        
        // 3. 清空狀態
        setNoteText('');
        setSelectedItems([]);
        setIsSelectorOpen(false);
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-teal-100 dark:border-gray-700 relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-teal-50/50 dark:bg-teal-900/20 rounded-tl-full -z-10"></div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-gray-200 mb-2">
                    <span className="text-2xl">🎯</span>
                    <h2 className="text-xl font-bold">國考備戰總完成度</h2>
                </div>
                <div className="text-4xl font-black text-teal-600 dark:text-teal-400 mb-4">
                    {examFeatures.overallProgress}% 
                    <span className="text-sm text-gray-400 ml-2 font-medium">({examFeatures.myTotalPoints} 點)</span>
                </div>
                <div className="h-4 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                    <div 
                        className="h-full bg-teal-500 rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${Math.min(examFeatures.overallProgress, 100)}%` }}
                    >
                        <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                    </div>
                </div>
              <p className="text-sm text-teal-700 dark:text-teal-300 mt-4 font-medium">
                    📈 進度分配：速讀(15%) → 細讀(25%) → 熟讀(30%) → 刷題(30%)
                </p>
            </div>

           

            {/* === 2. 任務打卡區 (含搜尋與雙層選單) === */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">📖</span>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">各科進度打卡區</h2>
                </div>
                
                {/* 🔍 打卡區搜尋框 */}
                <div className="mb-4 relative">
                    <input
                        type="text"
                        placeholder="🔍 搜尋科目、類別或章節名稱..."
                        value={punchSearch}
                        onChange={(e) => setPunchSearch(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 rounded-xl outline-none text-sm focus:border-teal-500 dark:text-white transition-colors"
                    />
                    {punchSearch && <button onClick={() => setPunchSearch('')} className="absolute right-3 top-2.5 text-gray-400 font-bold hover:text-gray-600">✖</button>}
                </div>
                
                <div className="space-y-2">
                    {filteredPunchData.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 font-bold text-sm bg-slate-50 dark:bg-gray-900 rounded-xl border border-dashed border-slate-200 dark:border-gray-700">找不到符合的章節範圍 😢</div>
                    ) : filteredPunchData.map(subj => {
                        const isSubjExpanded = punchSearch.trim() || expandedSubj === subj.id;
                        return (
                        <div key={subj.id} className="border border-slate-200 dark:border-gray-700 rounded-xl overflow-hidden">
                            <button 
                                onClick={() => setExpandedSubj(isSubjExpanded ? null : subj.id)}
                                className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 font-bold text-slate-700 dark:text-gray-200 flex justify-between items-center transition-colors"
                            >
                                <span>{subj.title}</span>
                                <span className="text-teal-500">{isSubjExpanded ? '▲ 收起' : '▼ 展開'}</span>
                            </button>
                            
                            {isSubjExpanded && (
                                <div className="p-2 bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-gray-700">
                                    {subj.categories.map(cat => {
                                        const isCatExpanded = punchSearch.trim() || expandedCat === cat.id;
                                        const chapsToRender = cat.displayChaps || cat.chapters.map((chapName, chapIdx) => ({chapName, chapIdx}));
                                        
                                        return (
                                        <div key={cat.id} className="mb-2 border border-slate-100 dark:border-gray-800 rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => setExpandedCat(isCatExpanded ? null : cat.id)}
                                                className="w-full text-left px-3 py-2 bg-teal-50/30 dark:bg-teal-900/10 text-teal-800 dark:text-teal-300 font-bold flex justify-between items-center text-sm"
                                            >
                                                <span>{cat.title}</span>
                                                <span>{isCatExpanded ? '▲' : '▼'}</span>
                                            </button>
                                            
                                            {isCatExpanded && (
                                                <div className="p-2 grid grid-cols-1 xl:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                                   {chapsToRender.map(({chapName, chapIdx}) => (
                                                        <div key={chapIdx} className="bg-slate-50 dark:bg-gray-800 p-2 rounded-lg border border-slate-100 dark:border-gray-700">
                                                            <div className="text-xs font-bold text-slate-700 dark:text-gray-300 mb-2">{chapName}</div>
                                                            <div className="flex gap-1">
                                                                {taskTypes.map(type => {
                                                                    const taskId = `${subj.id}_${cat.id}_${chapIdx}_0_${type.id}`;
                                                                    const isDone = examFeatures.myTasks.includes(taskId);
                                                                    return (
                                                                        <button
                                                                            key={type.id}
                                                                            onClick={() => examFeatures.toggleTask(taskId)}
                                                                            className={`flex-1 text-[10px] py-1 rounded font-bold transition-all ${isDone ? `${type.color} text-white` : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">⏳</span>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">每日學習打卡</h2>
                </div>
                
                <div className="mb-6 bg-slate-50 dark:bg-gray-900 p-4 rounded-xl border border-slate-200 dark:border-gray-700">
                    <div className="mb-4 relative">
                        <button 
                            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                            className="w-full py-2.5 px-4 bg-white dark:bg-gray-800 border-2 border-dashed border-teal-300 dark:border-teal-900 rounded-xl text-teal-600 dark:text-teal-400 font-bold text-sm flex justify-between items-center transition-colors hover:bg-teal-50 dark:hover:bg-teal-900/10"
                        >
                            {selectedItems.length > 0 ? `已選取 ${selectedItems.length} 個範圍與進度` : '🎯 點此選取今日學習範圍 (可連動打卡)'}
                            <span>{isSelectorOpen ? '▲ 收起' : '▼ 展開選單'}</span>
                        </button>

                        {isSelectorOpen && (
                            <div className="mt-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-lg absolute w-full z-20">
                                
                                {/* 🔍 軌跡專屬搜尋框 */}
                                <div className="p-3 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 rounded-t-xl sticky top-0">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="🔍 快速尋找要打卡的範圍..."
                                            value={logSearch}
                                            onChange={(e) => setLogSearch(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg outline-none text-sm bg-white dark:bg-gray-800 dark:text-white focus:border-teal-500"
                                        />
                                        {logSearch && <button onClick={() => setLogSearch('')} className="absolute right-2.5 top-2 text-gray-400 font-bold">✖</button>}
                                    </div>
                                </div>

                                <div className="p-3 max-h-[350px] overflow-y-auto custom-scrollbar">
                                    {filteredLogData.length === 0 ? (
                                        <div className="text-center py-4 text-slate-400 font-bold text-sm">找不到相關範圍...</div>
                                    ) : filteredLogData.map(subj => {
                                        const isSubjExpanded = logSearch.trim() || logExpandedSubj === subj.id;
                                        return (
                                        <div key={subj.id} className="mb-2 border border-slate-100 dark:border-gray-700 rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => setLogExpandedSubj(isSubjExpanded ? null : subj.id)}
                                                className="w-full text-left px-3 py-2 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 font-bold text-slate-700 dark:text-gray-200 text-sm flex justify-between items-center transition-colors"
                                            >
                                                <span>{subj.title}</span>
                                                <span>{isSubjExpanded ? '▲' : '▼'}</span>
                                            </button>

                                            {isSubjExpanded && (
                                                <div className="p-2 bg-white dark:bg-gray-900">
                                                    {subj.categories.map(cat => {
                                                        const isCatExpanded = logSearch.trim() || logExpandedCat === cat.id;
                                                        const chapsToRender = cat.displayChaps || cat.chapters.map((chapName, chapIdx) => ({chapName, chapIdx}));
                                                        return (
                                                            <div key={cat.id} className="mb-2 last:mb-0 border border-slate-50 dark:border-gray-800 rounded">
                                                                <button
                                                                    onClick={() => setLogExpandedCat(isCatExpanded ? null : cat.id)}
                                                                    className="w-full text-left px-2 py-1.5 bg-teal-50/50 dark:bg-teal-900/10 text-teal-800 dark:text-teal-300 font-bold flex justify-between items-center text-xs"
                                                                >
                                                                    <span>{cat.title}</span>
                                                                    <span>{isCatExpanded ? '▲' : '▼'}</span>
                                                                </button>

                                                                {isCatExpanded && (
                                                                    <div className="p-2 space-y-2">
                                                                        {chapsToRender.map(({chapName, chapIdx}) => (
                                                                            <div key={chapIdx} className="flex flex-wrap gap-1 bg-slate-50 dark:bg-gray-800 p-2 rounded">
                                                                                <div className="w-full text-xs font-bold text-slate-600 dark:text-gray-400 mb-1">{chapName}</div>
                                                                                {taskTypes.map(type => {
                                                                                    const taskId = `${subj.id}_${cat.id}_${chapIdx}_0_${type.id}`;
                                                                                    const isSelected = selectedItems.includes(taskId);
                                                                                    const isAlreadyDone = examFeatures.myTasks.includes(taskId);
                                                                                    return (
                                                                                        <button
                                                                                            key={type.id}
                                                                                            onClick={() => toggleSelectedItem(taskId)}
                                                                                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${isSelected ? 'bg-teal-500 border-teal-500 text-white shadow-sm' : isAlreadyDone ? 'bg-slate-200 border-slate-300 text-slate-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-500' : 'bg-white border-slate-200 text-slate-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'}`}
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
                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 rounded-lg outline-none text-sm text-slate-800 dark:text-white focus:border-teal-500"
                        />
                        <button type="submit" className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95">打卡</button>
                    </form>
                </div>

                {/* 軌跡列表 */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {examFeatures.studyLogs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 dark:border-gray-700 rounded-xl">尚無學習紀錄</div>
                    ) : (
                        examFeatures.studyLogs.map((log, index) => (
                            <div key={log.id} className="flex gap-3 relative group">
                                <div className="flex flex-col items-center min-w-[1rem] mt-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full z-10 bg-teal-400"></div>
                                    {index !== examFeatures.studyLogs.length - 1 && <div className="w-0.5 h-full bg-slate-100 dark:bg-gray-700 -my-1"></div>}
                                </div>
                                <div className="flex-1 pb-6">
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                        <span className="text-[10px] font-medium text-slate-400">{log.date} {log.time}</span>
                                        {log.subjects && log.subjects.map((sub, i) => (
                                            <span key={i} className="text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full border border-teal-100 dark:border-teal-800">{sub}</span>
                                        ))}
                                        <button onClick={() => examFeatures.deleteStudyLog(log.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-[10px] text-red-400 font-bold transition-opacity bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">刪除</button>
                                    </div>
                                    {log.message && <p className="text-sm p-3 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700 text-slate-700 dark:text-gray-300 break-all">{log.message}</p>}
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

    // ✨ 新增：全域背景通知狀態 (確保跨網頁切換時皆可顯示)
    const [globalToast, setGlobalToast] = useState(null);

    useEffect(() => {
        // 將設定全域通知的方法綁定到 window，讓其他組件可以呼叫
        window.setGlobalToast = setGlobalToast;
    }, []);
    
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

    // ✨ 新增：完成新手教學的狀態更新
    // ✨ 新增：完成新手教學的狀態更新
    const completeTutorial = () => {
        if (!user) return;
        window.db.collection('users').doc(user.uid).update({ hasSeenTutorial: true })
            .then(() => setUserProfile(prev => ({ ...prev, hasSeenTutorial: true })))
            .catch(e => console.error("更新新手教學狀態失敗:", e));
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
                <span className="text-yellow-400 drop-shadow">距國考剩 {timeLeft.days} 天 {timeLeft.hours} 小時</span>
                <span className="text-[10px] text-yellow-500">(相當於 {timeLeft.totalHours} 小時)</span>
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
            <div className="bg-black dark:bg-gray-950 text-white px-4 flex justify-between items-center shadow-md h-14 shrink-0 relative z-20 transition-colors">
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
                        <button onClick={handleShareSite} className="text-xl hover:scale-110 transition-transform" title="分享網站給好友">🔗</button>
                        <button onClick={() => setIsDark(!isDark)} className="text-xl hover:scale-110 transition-transform" title="切換日/夜間模式">
                            {isDark ? '☀️' : '🌙'}
                        </button>
                        <div className="w-8 h-8 bg-gray-700 no-round overflow-hidden border border-gray-600">
                            {userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-xs">👤</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* 側邊欄遮罩 (點擊旁邊可以關閉) */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* 側邊選單主體 */}
            <div className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <span className="font-black text-xl dark:text-white tracking-widest">選單</span>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-2xl font-bold text-gray-500 hover:text-black dark:hover:text-white">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto py-2 flex flex-col custom-scrollbar">
                    <button onClick={() => handleTabClick('newspaper')} className={`text-left px-6 py-4 font-bold transition-colors ${activeTab === 'newspaper' ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>📰 JJay日報</button>
                    <button onClick={() => handleTabClick('dashboard')} className={`text-left px-6 py-4 font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>📚 我的題庫</button>
                    <button onClick={() => handleTabClick('taskwall')} className={`text-left px-6 py-4 font-bold transition-colors ${activeTab === 'taskwall' ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>🎯 任務牆</button>
                    <button onClick={() => handleTabClick('wrongbook')} className={`text-left px-6 py-4 font-bold transition-colors ${activeTab === 'wrongbook' ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>📓 錯題整理</button>
                    <button onClick={() => handleTabClick('social')} className={`text-left px-6 py-4 font-bold transition-colors ${activeTab === 'social' ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>💬 社群交流</button>
                    <button onClick={() => handleTabClick('minecraft')} className={`text-left px-6 py-4 font-bold transition-colors ${activeTab === 'minecraft' ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>⛏️ 史蒂夫養成</button>
                    
                    {/* ✨ 新增的國考進度追蹤 */}
                    <button onClick={() => handleTabClick('examProgress')} className={`text-left px-6 py-4 font-bold transition-colors ${activeTab === 'examProgress' ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>📈 國考戰況追蹤</button>
                    
                    <button onClick={() => handleTabClick('profile')} className={`text-left px-6 py-4 font-bold transition-colors ${activeTab === 'profile' ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>👤 個人檔案</button>
                </div>
                <div className="p-4 border-t dark:border-gray-700">
                    <button onClick={() => window.auth.signOut()} className="w-full py-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">登出</button>
                </div>
            </div>
        </>
    );

    if (loading) return (
        <div className="h-[100dvh] flex flex-col items-center justify-center bg-gray-900 text-white font-mono p-6">
            <div className="text-5xl mb-8 animate-bounce">💊</div>
            <div className="text-lg font-bold mb-3 tracking-widest text-cyan-400 drop-shadow-md">{loadingStep}</div>
            
            {/* 視覺化進度條 */}
            <div className="w-full max-w-sm bg-gray-800 border-2 border-gray-600 p-1 no-round mb-2 relative h-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="bg-cyan-500 h-full transition-all duration-200 ease-out" style={{ width: `${loadingProgress}%` }}></div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black mix-blend-difference text-white tracking-widest">
                    {loadingProgress}%
                </div>
            </div>
            
            <div className="text-xs text-gray-500 font-bold mt-6 animate-pulse">
                {loadingProgress === 100 ? '即將完成...' : '巨量資料處理中，請稍候...'}
            </div>
        </div>
    );

    // ✅ 1. 將 Modal 的 UI 提出來變成一個獨立變數，讓他在哪裡都能顯示
    const SharedModal = modalConfig.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm border-2 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] no-round p-6 transform transition-all">
                <h3 className="text-lg font-black mb-2 dark:text-white border-b-2 border-gray-100 dark:border-gray-700 pb-2 tracking-tighter">
                    {modalConfig.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 font-bold whitespace-pre-wrap leading-relaxed">
                    {modalConfig.message}
                </p>

                {modalConfig.type === 'prompt' && (
                    <input 
                        autoFocus
                        className="w-full p-2 mb-6 border-2 border-black dark:border-gray-600 bg-gray-50 dark:bg-gray-900 dark:text-white no-round outline-none focus:bg-white focus:border-blue-500 transition-colors"
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
                        className="bg-black dark:bg-gray-200 text-white dark:text-black px-8 py-2 font-black no-round hover:bg-gray-800 dark:hover:bg-white transition-transform active:scale-95 shadow-md"
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
<div className={`h-[100dvh] overflow-y-auto custom-scrollbar flex flex-col items-center pt-6 sm:pt-12 px-4 transition-colors duration-300 ${isDark ? 'bg-gray-800' : 'bg-pink-50'}`}>
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
        <div className="h-[100dvh] flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900 transition-colors relative">       
            
            {/* ✨ 新增：AI 背景生成全域右下角小通知 (不阻擋使用者操作，跨頁面皆存活) */}
            {globalToast && (
                <div className={`fixed bottom-6 right-6 p-4 shadow-2xl z-[9999] border-l-4 transition-all max-w-sm w-full font-bold text-sm flex items-start gap-3 animate-fade-in-up
                    ${globalToast.status === 'loading' ? 'bg-blue-50 border-blue-500 text-blue-800 dark:bg-gray-800 dark:text-blue-300' : 
                      globalToast.status === 'success' ? 'bg-green-50 border-green-500 text-green-800 dark:bg-gray-800 dark:text-green-300' : 
                      'bg-red-50 border-red-500 text-red-800 dark:bg-gray-800 dark:text-red-300'}`}
                >
                    {globalToast.status === 'loading' && <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5"></div>}
                    <div className="flex-1 leading-relaxed">{globalToast.message}</div>
                    {(globalToast.status === 'success' || globalToast.status === 'error') && (
                        <button onClick={() => setGlobalToast(null)} className="ml-auto text-gray-400 hover:text-black dark:hover:text-white shrink-0">✕</button>
                    )}
                </div>
            )}
            
            {/* ✨ 新增：判斷如果尚未看過新手教學，就渲染已經寫好的教學視窗 (加入 !currentQaId 確保完成快問快答才顯示) */}
            {userProfile && userProfile.hasSeenTutorial === false && !currentQaId && (
                <TutorialOverlay onComplete={completeTutorial} />
            )}

            {/* ✅ 4. 主畫面這裡原本一大串的 modal 程式碼，現在只需要呼叫 SharedModal 就好了 */}
            {SharedModal}

            {/* ✨ 新增：已經登入的玩家，如果網址有 qaId 或 newsId，直接蓋一個滿版視窗在最上層 */}
            {user && currentQaId && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
                    <div className="bg-gray-100 dark:bg-gray-900 w-full max-w-4xl max-h-[95vh] overflow-y-auto no-round relative shadow-2xl border-4 border-pink-400">
                        <button onClick={closeFastQA} className="absolute top-4 right-4 text-3xl z-20 hover:scale-110 transition-transform bg-white dark:bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow-md border border-gray-300 dark:border-gray-600">❌</button>
                        <div className="p-4 sm:p-8 pt-16">
                            <FastQASection user={user} showAlert={showAlert} showConfirm={showConfirm} targetQaId={currentQaId} onClose={closeFastQA} />
                        </div>
                    </div>
                </div>
            )}
            {user && currentNewsId && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
                    <div className="bg-gray-100 dark:bg-gray-900 w-full max-w-4xl max-h-[95vh] overflow-y-auto no-round relative shadow-2xl border-4 border-blue-400">
                        <button onClick={closeNews} className="absolute top-4 right-4 text-3xl z-20 hover:scale-110 transition-transform bg-white dark:bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow-md border border-gray-300 dark:border-gray-600">❌</button>
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
                <div className="flex-grow pt-4 md:pt-6 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
                    {activeTab === 'newspaper' && <NewspaperDashboard user={user} userProfile={userProfile} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} onContinueQuiz={(rec) => { setActiveQuizRecord(rec); setActiveTab('activeQuiz'); }} />}                    {activeTab === 'dashboard' && <Dashboard user={user} userProfile={userProfile} onStartNew={(folderName) => { setActiveQuizRecord({ folder: folderName }); setActiveTab('activeQuiz'); }} onContinueQuiz={(rec) => { setActiveQuizRecord(rec); setActiveTab('activeQuiz'); }} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} />}
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
                        <div className="h-full w-full flex flex-col overflow-y-auto custom-scrollbar bg-teal-50/30 dark:bg-gray-900 transition-colors">
                            <ExamProgressDashboard examFeatures={examFeatures} user={user} />
                        </div>
                    )}

                    {activeTab === 'profile' && <ProfilePage user={user} userProfile={userProfile} showAlert={showAlert} />}
                </div>
            ) : (
                <QuizApp key={activeQuizRecord ? activeQuizRecord.id : 'new-quiz'} currentUser={user} userProfile={userProfile} activeQuizRecord={activeQuizRecord} onBackToDashboard={() => setActiveTab('dashboard')} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Main />);
