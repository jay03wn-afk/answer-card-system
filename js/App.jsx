function Main() {
    const { useState, useEffect } = React;

    // --- 基礎 App 狀態 ---
    const [user, setUser] = useState(null);
    
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
    const completeTutorial = () => {
        if (!user) return;
        window.db.collection('users').doc(user.uid).update({ hasSeenTutorial: true })
            .then(() => setUserProfile(prev => ({ ...prev, hasSeenTutorial: true })))
            .catch(e => console.error("更新新手教學狀態失敗:", e));
    };

    useEffect(() => {
        // 🚀 終極防卡死：1.5 秒內 Auth 沒反應，就直接強行關閉載入畫面，顯示登入表單！
        let isAuthResolved = false;
        const forceLoginTimer = setTimeout(() => {
            if (!isAuthResolved) {
                isAuthResolved = true;
                setLoading(false);
            }
        }, 1500);

        const unsubscribe = window.auth.onAuthStateChanged(u => {
            if (!isAuthResolved) {
                isAuthResolved = true;
                clearTimeout(forceLoginTimer);
            }

            if (u) {
                setUser(u);
                // 🚀 極速啟動：增加 1.2 秒強制超時，確保「步驟 1/3」不會因為網路小抖動而卡死
                let hasResolved = false;
                const profileTimeout = setTimeout(() => {
                    if (!hasResolved) setLoading(false);
                }, 1200);

                window.db.collection('users').doc(u.uid).onSnapshot({ includeMetadataChanges: true }, doc => {
                    if (doc.exists) setUserProfile(doc.data());
                    if (!hasResolved) {
                        hasResolved = true;
                        setLoading(false);
                        clearTimeout(profileTimeout);
                    }
                });
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

    const topNavContent = (
        <div className="bg-black dark:bg-gray-950 text-white px-4 flex justify-between items-center shadow-md h-14 shrink-0 relative z-20 overflow-x-auto custom-scrollbar transition-colors">
            <div className="flex space-x-6 items-center h-full whitespace-nowrap">
                <span className="font-black text-lg tracking-widest mr-4">JJay</span>
                <button onClick={() => setActiveTab('newspaper')} className={`flex items-center h-full px-2 font-bold transition-colors ${activeTab === 'newspaper' ? 'border-b-4 border-white text-white' : 'text-gray-400 hover:text-white'}`}>📰 JJay日報</button>
                <button onClick={() => setActiveTab('dashboard')} className={`h-full px-2 font-bold transition-colors ${activeTab === 'dashboard' ? 'border-b-4 border-white text-white' : 'text-gray-400 hover:text-white'}`}>我的題庫</button>
                <button onClick={() => setActiveTab('taskwall')} className={`flex items-center h-full px-2 font-bold transition-colors ${activeTab === 'taskwall' ? 'border-b-4 border-white text-white' : 'text-gray-400 hover:text-white'}`}>🎯 任務牆</button>
                <button onClick={() => setActiveTab('wrongbook')} className={`flex items-center h-full px-2 font-bold transition-colors ${activeTab === 'wrongbook' ? 'border-b-4 border-white text-white' : 'text-gray-400 hover:text-white'}`}>📓 錯題整理</button>
                
                <button onClick={() => setActiveTab('social')} className={`flex items-center h-full px-2 font-bold transition-colors ${activeTab === 'social' ? 'border-b-4 border-white text-white' : 'text-gray-400 hover:text-white'}`}>社群交流</button>
                <button onClick={() => setActiveTab('minecraft')} className={`flex items-center h-full px-2 font-bold transition-colors ${activeTab === 'minecraft' ? 'border-b-4 border-white text-white' : 'text-gray-400 hover:text-white'}`}>⛏️ 史蒂夫養成</button>
                <button onClick={() => setActiveTab('profile')} className={`flex items-center h-full px-2 font-bold transition-colors ${activeTab === 'profile' ? 'border-b-4 border-white text-white' : 'text-gray-400 hover:text-white'}`}>👤 個人檔案</button>
            </div>
           {user && (
                <div className="flex items-center space-x-3 md:space-x-4">
                    {/* ✅ 將倒數計時器放在這裡 */}
                    <ExamCountdown />
                    
                    {/* ✨ 新增：分享網站按鈕 */}
                    <button onClick={handleShareSite} className="text-xl hover:scale-110 transition-transform" title="分享網站給好友">
                        🔗
                    </button>

                    <button onClick={() => setIsDark(!isDark)} className="text-xl hover:scale-110 transition-transform" title="切換日/夜間模式">
                        {isDark ? '☀️' : '🌙'}
                    </button>
                    <div className="w-8 h-8 bg-gray-700 no-round overflow-hidden border border-gray-600">
                        {userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-xs">👤</div>}
                    </div>
                    <button onClick={() => window.auth.signOut()} className="text-xs font-bold opacity-60 hover:opacity-100 transition-opacity">登出</button>
                </div>
            )}
        </div>
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
                    {activeTab === 'minecraft' && <MinecraftDashboard user={user} userProfile={userProfile} showAlert={showAlert} />}
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
