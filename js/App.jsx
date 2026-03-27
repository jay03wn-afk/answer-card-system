function Main() {
    const { useState, useEffect } = React;

    // --- 基礎 App 狀態 ---
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState({ displayName: '載入中...', folders: [] });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activeQuizRecord, setActiveQuizRecord] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- 自定義 Modal 狀態控制中心 ---
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        type: 'alert', // 'alert' | 'confirm' | 'prompt'
        title: '',
        message: '',
        onConfirm: null,
        defaultValue: ''
    });
    const [promptInput, setPromptInput] = useState('');

    // --- 重新定義彈窗函數 (取代原生 window.alert/confirm/prompt) ---
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

    // 監聽 Firebase 登入狀態
    useEffect(() => {
        const unsubscribe = window.auth.onAuthStateChanged(u => {
            if (u) {
                setUser(u);
                window.db.collection('users').doc(u.uid).onSnapshot(doc => {
                    if (doc.exists) setUserProfile(doc.data());
                    setLoading(false);
                });
            } else {
                setUser(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // --- 內建自定義 Modal 元件 ---
    const CustomModal = () => {
        if (!modalConfig.isOpen) return null;
        return (
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
                                if(e.key === 'Enter') {
                                    modalConfig.onConfirm(promptInput);
                                    closeModal();
                                }
                            }}
                        />
                    )}

                    <div className="flex justify-end space-x-3">
                        {modalConfig.type !== 'alert' && (
                            <button 
                                onClick={closeModal}
                                className="px-4 py-2 font-bold text-gray-500 hover:text-red-500 transition-colors"
                            >
                                取消
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                if (modalConfig.type === 'prompt') {
                                    modalConfig.onConfirm(promptInput);
                                } else if (modalConfig.onConfirm) {
                                    modalConfig.onConfirm();
                                }
                                closeModal();
                            }}
                            className="bg-black dark:bg-gray-200 text-white dark:text-black px-8 py-2 font-black no-round hover:bg-gray-800 dark:hover:bg-white transition-transform active:scale-95 shadow-md"
                        >
                            確定
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const TopNav = () => (
        <div className="bg-black dark:bg-gray-950 text-white px-4 flex justify-between items-center shadow-md h-14 shrink-0 relative z-20 overflow-x-auto custom-scrollbar transition-colors">
            <div className="flex space-x-6 items-center h-full whitespace-nowrap">
                <span className="font-black text-lg tracking-widest mr-4">JJay</span>
                <button onClick={() => setActiveTab('dashboard')} className={`h-full px-2 font-bold transition-colors ${activeTab === 'dashboard' ? 'border-b-4 border-white text-white' : 'text-gray-400 hover:text-white'}`}>我的題庫</button>
                <button onClick={() => setActiveTab('social')} className={`flex items-center h-full px-2 font-bold transition-colors ${activeTab === 'social' ? 'border-b-4 border-white text-white' : 'text-gray-400 hover:text-white'}`}>社群交流</button>
                <button onClick={() => setActiveTab('minecraft')} className={`flex items-center h-full px-2 font-bold transition-colors ${activeTab === 'minecraft' ? 'border-b-4 border-white text-white' : 'text-gray-400 hover:text-white'}`}>⛏️ 史蒂夫養成</button>
                <button onClick={() => setActiveTab('profile')} className={`flex items-center h-full px-2 font-bold transition-colors ${activeTab === 'profile' ? 'border-b-4 border-white text-white' : 'text-gray-400 hover:text-white'}`}>👤 個人檔案</button>
            </div>
            {user && (
                <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-gray-700 no-round overflow-hidden border border-gray-600">
                        {userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-xs">👤</div>}
                    </div>
                    <button onClick={() => window.auth.signOut()} className="text-xs font-bold opacity-60 hover:opacity-100 transition-opacity">登出</button>
                </div>
            )}
        </div>
    );

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white font-mono">
            <div className="text-2xl mb-4 animate-bounce">💊</div>
            <div>載入中...</div>
        </div>
    );

    // 如果未登入，顯示登入畫面
    if (!user) return <AuthScreen showAlert={showAlert} />;

    return (
        <div className="h-[100dvh] flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900 transition-colors">
            {/* 注入自定義 Modal */}
            <CustomModal />

            {activeTab !== 'activeQuiz' && <TopNav />}
            
            {activeTab !== 'activeQuiz' ? (
                <div className="flex-grow pt-6 overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors">
                    {activeTab === 'dashboard' && <Dashboard user={user} userProfile={userProfile} onStartNew={(folderName) => { setActiveQuizRecord({ folder: folderName }); setActiveTab('activeQuiz'); }} onContinueQuiz={(rec) => { setActiveQuizRecord(rec); setActiveTab('activeQuiz'); }} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} />}
                    {activeTab === 'social' && <SocialDashboard user={user} userProfile={userProfile} showAlert={showAlert} />}
                    {activeTab === 'minecraft' && <MinecraftDashboard user={user} userProfile={userProfile} showAlert={showAlert} />}
                    {activeTab === 'profile' && <ProfilePage user={user} userProfile={userProfile} showAlert={showAlert} />}
                </div>
            ) : (
                <QuizApp key={activeQuizRecord ? activeQuizRecord.id : 'new-quiz'} currentUser={user} userProfile={userProfile} activeQuizRecord={activeQuizRecord} onBackToDashboard={() => setActiveTab('dashboard')} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} />
            )}
        </div>
    );
}

// 渲染到根節點
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Main />);