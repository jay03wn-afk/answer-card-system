function McImg({ src, fallback, className }) {
    const [hasError, setHasError] = useState(false);
    if (hasError) return <span className={`${className} inline-flex items-center justify-center`} style={{ fontSize: '1.2em' }}>{fallback}</span>;
    return <img src={src} className={className} onError={() => setHasError(true)} alt={fallback} />;
}

function DialogOverlay({ dialog, onClose }) {
    const [inputValue, setInputValue] = useState('');
    useEffect(() => { if (dialog && dialog.type === 'prompt') setInputValue(dialog.defaultValue || ''); }, [dialog]);
    if (!dialog) return null;
    const handleConfirm = () => {
        if (dialog.onConfirm) {
            if (dialog.type === 'prompt') dialog.onConfirm(inputValue);
            else dialog.onConfirm();
        }
        onClose();
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-sm no-round shadow-2xl transform transition-all border-t-4 border-black dark:border-gray-500">
                <h3 className="font-bold text-lg mb-3 flex items-center dark:text-white">
                    {dialog.type === 'alert' ? 'ℹ️ 系統提示' : '🤔 請確認'}
                </h3>
                <p className="mb-5 text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{dialog.message}</p>
                {dialog.type === 'prompt' && (
                    <input type="text" className="w-full mb-5 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm" value={inputValue} onChange={e => setInputValue(e.target.value)} autoFocus />
                )}
                <div className="flex justify-end space-x-3 mt-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                    {(dialog.type === 'confirm' || dialog.type === 'prompt') && (
                        <button onClick={onClose} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-5 py-2 no-round font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
                    )}
                    <button onClick={handleConfirm} className="bg-black dark:bg-gray-200 text-white dark:text-black px-5 py-2 no-round font-bold text-sm hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors">確定</button>
                </div>
            </div>
        </div>
    );
}

function TutorialOverlay({ onComplete }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-gray-800 p-8 w-full max-w-lg no-round shadow-2xl relative border-t-4 border-black dark:border-gray-500 animate-fade-in-up">
                <h2 className="text-2xl font-black mb-6 text-center tracking-wider dark:text-white">🎉 歡迎加入 JJay 線上測驗</h2>
                <div className="space-y-6 text-gray-700 dark:text-gray-300 mb-8">
                    <div>
                        <p className="font-bold border-l-4 border-black dark:border-gray-400 pl-3 text-lg dark:text-gray-100">📖 我的題庫</p>
                        <p className="pl-4 mt-1 text-sm leading-relaxed">首創雙螢幕排版，貼上雲端題本或純文字，左邊看題、右邊畫卡，並支援資料夾與測驗代碼功能。</p>
                    </div>
                    <div>
                        <p className="font-bold border-l-4 border-blue-500 pl-3 text-lg dark:text-gray-100">💬 社群交流</p>
                        <p className="pl-4 mt-1 text-sm leading-relaxed">不再是一個人讀書！新增好友即時對話，還能一鍵打包你的測驗卷分享給好友作答、互相炫耀成績。支援圖片閱後即焚！</p>
                    </div>
                    <div>
                        <p className="font-bold border-l-4 border-orange-500 pl-3 text-lg dark:text-gray-100">⛏️ 史蒂夫養成</p>
                        <p className="pl-4 mt-1 text-sm leading-relaxed">讀書也要有儀式感。賺取鑽石佈置你的 Minecraft 家園，還能玩滑板小遊戲與好友競爭等級！</p>
                    </div>
                </div>
                <button onClick={onComplete} className="w-full bg-black dark:bg-gray-200 text-white dark:text-black p-3 font-bold no-round hover:bg-gray-800 dark:hover:bg-gray-300 text-lg transition-colors">
                    🚀 開始體驗
                </button>
            </div>
        </div>
    );
}

function AuthScreen({ showAlert }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = (e) => {
        e.preventDefault();
        setLoading(true);
        const safeEmail = email.trim().toLowerCase(); 
        
        try {
            // 加入 window 確保正確調用全域 firebase
            const request = isSignUp 
                ? window.auth.createUserWithEmailAndPassword(safeEmail, password)
                : window.auth.signInWithEmailAndPassword(safeEmail, password);
            
            request.then((cred) => {
                if (isSignUp) {
                    const initMcData = { diamonds: 0, level: 1, exp: 0, hunger: 10, items: [], cats: 0, lastCheckIn: null };
                    return window.db.collection('users').doc(cred.user.uid).set({ 
                        email: safeEmail, 
                        friends: [], 
                        unreadChats: {}, 
                        folders: ['未分類'], 
                        mcData: initMcData,
                        hasSeenTutorial: false,
                        avatar: null,
                        bio: "",
                        subscriptions: ['藥學電子報'] // ✨ 預設訂閱藥學電子報
                    }).catch(err => showAlert("註冊成功，但建立資料庫檔案失敗: " + err.message));
                }
                // ✨ 核心修復：移除了原本 else 的 { merge: true } 寫入操作。
                // 這樣 Firebase 就不會觸發「樂觀更新 (Optimistic UI)」用不完整的快取去騙系統，
                // 系統會乖乖等待雲端的完整資料載入，徹底解決暱稱畫面閃爍、亂跳的問題！
            })
            .catch(err => {
                let errorMsg = err.message;
                if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                    errorMsg = "帳號或密碼錯誤！";
                } else if (err.code === 'auth/email-already-in-use') {
                    errorMsg = "此信箱已經註冊過了！";
                }
                showAlert('認證失敗：\n' + errorMsg);
            })
            .finally(() => setLoading(false));
            
        } catch (err) {
            showAlert('系統執行錯誤：' + err.message);
            setLoading(false);
        }
    };

    return (
        <div className="flex h-[100dvh] bg-gray-100 dark:bg-gray-900 overflow-hidden">
            
            {/* 左側：自訂圖片區塊 (只在平板 md 尺寸以上顯示) */}
            <div className="hidden md:flex md:w-1/2 relative items-center justify-center bg-black">
                <img 
                    src="https://i.postimg.cc/024yhvHB/Gemini-Generated-Image-ln5ls1ln5ls1ln5l.png" 
                    alt="登入背景" 
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
                <div className="relative z-10 text-center text-white p-8">
                    <h1 className="text-5xl font-black mb-4 tracking-widest drop-shadow-lg">JJay線上測驗</h1>
                    <p className="text-xl font-bold text-gray-200 drop-shadow-md">任務導向學習</p>
                </div>
            </div>

            {/* 右側：登入表單區塊 */}
            <div className="flex w-full md:w-1/2 items-center justify-center p-4 overflow-y-auto">
                <form onSubmit={handleAuth} className="bg-white dark:bg-gray-800 p-8 shadow-2xl w-full max-w-sm border-t-4 border-black dark:border-white no-round">
                    
                    {/* 如果你想把原本的 Emoji 換成 Logo 圖片，可以改這裡 */}
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-gray-200 dark:border-gray-600 overflow-hidden">
                        {/* 若有 Logo 圖片可解開下方註解替換 Emoji */}
                        {/* <img src="你的Logo網址.png" className="w-full h-full object-cover" /> */}
                        <span className="text-4xl font-black">📝</span>
                    </div>
                    
                    <h2 className="text-2xl font-black mb-6 tracking-tight text-center dark:text-white">登入你的帳號</h2>
                    
                    <input type="email" placeholder="電子郵件" className="w-full mb-4 p-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white transition-colors" value={email} onChange={e => setEmail(e.target.value)} onFocus={handleFocusScroll} required />
                    
                    <input type="password" placeholder="密碼" className="w-full mb-8 p-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white transition-colors" value={password} onChange={e => setPassword(e.target.value)} onFocus={handleFocusScroll} required />
                    
                    <button type="submit" className="w-full bg-black dark:bg-gray-200 text-white dark:text-black p-3 font-black no-round hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors shadow-md active:scale-95" disabled={loading}>
                        {loading ? '處理中...' : (isSignUp ? '建立新帳號' : '登入')}
                    </button>
                    
                    <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-6 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors" disabled={loading}>
                        {isSignUp ? '已有帳號？返回登入' : '還沒有帳號？立即註冊'}
                    </button>
                </form>
            </div>
            
        </div>
    );
}

function ProfileSetup({ user, onComplete, showAlert }) {
    const [name, setName] = useState('');
    const saveProfile = () => {
        if(!name.trim()) return showAlert('請輸入社群暱稱！');
        window.db.collection('users').doc(user.uid).set({ displayName: name.trim() }, { merge: true })
          .then(() => onComplete(name.trim()))
          .catch(e => showAlert('設定失敗：' + e.message));
    };
    return (
        <div className="flex h-full items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 p-8 shadow-md w-full max-w-sm no-round border border-gray-200 dark:border-gray-700 text-center">
                <h2 className="text-xl font-bold mb-4 dark:text-white">歡迎加入！請設定你的社群暱稱</h2>
                <input type="text" placeholder="例如：藥神、JJay..." className="w-full mb-6 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-center" value={name} onChange={e => setName(e.target.value)} onFocus={handleFocusScroll} />
                <button onClick={saveProfile} className="w-full bg-black dark:bg-gray-200 text-white dark:text-black p-3 font-bold no-round hover:bg-gray-800 dark:hover:bg-gray-300">完成設定</button>
            </div>
        </div>
    );
}

// 新增功能：個人檔案頁面與大頭照壓縮
// 新增功能：個人檔案頁面與大頭照壓縮 (加入暱稱修改功能)
function ProfilePage({ user, userProfile, showAlert }) {
    const [bio, setBio] = useState(userProfile.bio || "");
    // 1. 新增 displayName 的 state
    const [displayName, setDisplayName] = useState(userProfile.displayName || ""); 
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                const MAX_DIM = 200; // 壓縮頭像
                if (w > h && w > MAX_DIM) { h *= MAX_DIM / w; w = MAX_DIM; }
                else if (h > MAX_DIM) { w *= MAX_DIM / h; h = MAX_DIM; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                
                window.db.collection('users').doc(user.uid).update({ avatar: compressedBase64 })
                  .then(() => showAlert("✅ 頭像更新成功！"))
                  .catch(err => showAlert("頭像上傳失敗：" + err.message));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // 2. 更新儲存邏輯，連同 displayName 一起存
    const saveProfile = () => {
        if (!displayName.trim()) return showAlert("社群暱稱不能為空！");
        
        setIsSaving(true);
        window.db.collection('users').doc(user.uid).update({ 
            bio: bio,
            displayName: displayName.trim() 
        })
          .then(() => showAlert("✅ 個人檔案已儲存變更！"))
          .catch(e => showAlert("儲存失敗：" + e.message))
          .finally(() => setIsSaving(false));
    };

    return (
        <div className="max-w-3xl mx-auto p-6 mt-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round">
            <h2 className="text-2xl font-black mb-6 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">個人檔案設定</h2>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="flex flex-col items-center">
                    <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border-4 border-gray-300 dark:border-gray-600 mb-4 cursor-pointer" onClick={() => fileInputRef.current.click()}>
                        {userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" /> : <span className="text-4xl text-gray-400">👤</span>}
                    </div>
                    <button onClick={() => fileInputRef.current.click()} className="text-sm font-bold bg-gray-100 dark:bg-gray-700 px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors dark:text-white border border-gray-300 dark:border-gray-600 no-round">更換大頭照</button>
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                </div>
                <div className="flex-grow w-full">
                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">社群暱稱</label>
                    {/* 3. 將原本鎖死的 div 換成可以編輯的 input */}
                    <input 
                        type="text" 
                        value={displayName} 
                        onChange={e => setDisplayName(e.target.value)} 
                        className="w-full mb-4 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white outline-none no-round focus:border-black dark:focus:border-white" 
                        placeholder="請輸入你的社群暱稱..."
                    />
                    
                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">關於我 (自我介紹)</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full h-32 mb-4 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white outline-none resize-none no-round focus:border-black dark:focus:border-white" placeholder="寫點關於你自己的事吧..."></textarea>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={saveProfile} disabled={isSaving} className="bg-black dark:bg-gray-200 text-white dark:text-black px-6 py-2 font-bold no-round hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors">
                            {isSaving ? '儲存中...' : '儲存變更'}
                        </button>
                        
                        {/* ✨ 新增：重新觀看新手教學的按鈕 (把狀態改回 false 即可自動觸發) */}
                        <button 
                            onClick={() => {
                                window.db.collection('users').doc(user.uid).update({ hasSeenTutorial: false })
                                .then(() => showAlert('✅ 已為您重新開啟新手教學視窗！', '提示'));
                            }} 
                            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-6 py-2 font-bold no-round hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            📖 重新觀看新手教學
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
// ==========================================
// ✨ 新增：近期考試彈出提醒元件
// ==========================================
function ExamAlertPopup({ user, userProfile }) {
    const [examAlerts, setExamAlerts] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [hideToday, setHideToday] = useState(false);

    useEffect(() => {
        const todayStr = new Date().toDateString();
        const hideCookie = localStorage.getItem('hideExamAlert_' + user.uid);
        if (hideCookie === todayStr) return;

        const subs = userProfile.subscriptions || ['藥學電子報'];
        const now = new Date().getTime();
        const nextWeek = now + 14 * 24 * 60 * 60 * 1000; // 抓未來 14 天內

        window.db.collection('calendarEvents').get().then(snap => {
            const upcoming = [];
            snap.docs.forEach(doc => {
                const data = doc.data();
                if (subs.includes(data.category)) {
                    const eventTime = new Date(data.date).getTime();
                    // 檢查是否在未來 14 天內
                    if (eventTime >= now && eventTime <= nextWeek) {
                        upcoming.push({ id: doc.id, ...data });
                    }
                }
            });
            if (upcoming.length > 0) {
                upcoming.sort((a,b) => new Date(a.date) - new Date(b.date));
                setExamAlerts(upcoming);
                setShowPopup(true);
            }
        });
    }, [user.uid, userProfile.subscriptions]);

    const closePopup = () => {
        if (hideToday) {
            localStorage.setItem('hideExamAlert_' + user.uid, new Date().toDateString());
        }
        setShowPopup(false);
    };

    if (!showPopup) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm border-2 border-black dark:border-white no-round shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 relative">
                <button onClick={closePopup} className="absolute top-3 right-3 text-gray-400 hover:text-black dark:hover:text-white font-bold text-xl">✖</button>
                <h3 className="text-xl font-black mb-4 flex items-center dark:text-white border-b-2 border-gray-200 dark:border-gray-700 pb-2">
                    📅 近期考試提醒
                </h3>
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    {examAlerts.map(ex => {
                        const daysLeft = Math.ceil((new Date(ex.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        return (
                            <div key={ex.id} className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-500">
                                <div className="text-xs font-bold text-gray-500 mb-1">{ex.category}</div>
                                <div className="font-bold text-gray-800 dark:text-gray-200">{ex.title}</div>
                                <div className="text-sm mt-1 text-red-500 font-bold">倒數 {daysLeft} 天 ({ex.date})</div>
                            </div>
                        );
                    })}
                </div>
                <label className="flex items-center space-x-2 text-sm cursor-pointer dark:text-gray-300 font-bold justify-center border-t border-gray-100 dark:border-gray-700 pt-4">
                    <input type="checkbox" checked={hideToday} onChange={e => setHideToday(e.target.checked)} className="w-4 h-4 accent-black" />
                    <span>今日不再顯示此提醒</span>
                </label>
                <button onClick={closePopup} className="mt-4 w-full bg-black dark:bg-gray-200 text-white dark:text-black font-bold py-2 hover:bg-gray-800 transition-colors">我知道了</button>
            </div>
        </div>
    );
}

// ==========================================
// ✨ 新增：JJay 日報與行事曆核心系統
// ==========================================
function NewspaperDashboard({ user, userProfile, showAlert, showConfirm, showPrompt, onContinueQuiz, targetNewsId, onClose, onRequireLogin }) {
    const isAdmin = user && user.email === 'jay03wn@gmail.com';
    const [newsList, setNewsList] = useState([]);
    const [events, setEvents] = useState([]);
    const [todayTasks, setTodayTasks] = useState([]);
    const [categories, setCategories] = useState(['藥學電子報']);
    const [loading, setLoading] = useState(true);
    
    
    // 取得使用者目前的訂閱狀態 (若無則預設)
    const [subs, setSubs] = useState(userProfile?.subscriptions || ['藥學電子報']);
    
    // 編輯器狀態
    const [showEditor, setShowEditor] = useState(false);
    const [editMode, setEditMode] = useState(''); // 'news' 或 'event'
    const [editingId, setEditingId] = useState(null);
    
    // 報紙表單
    const [newsTitle, setNewsTitle] = useState('');
    const [newsCat, setNewsCat] = useState('藥學電子報');
    const [newsContent, setNewsContent] = useState('');
    const [embeddedQaId, setEmbeddedQaId] = useState('');
    const [embeddedQuizCode, setEmbeddedQuizCode] = useState('');
    
    // 行事曆表單
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventCat, setEventCat] = useState('藥學電子報');

    // 分享彈窗文本
    const [shareNews, setShareNews] = useState(null);

    useEffect(() => {
        let unsubNews = () => {};
        let unsubEvents = () => {};
        let unsubCats = () => {};

        const loadData = async () => {
            setLoading(true);
            
            // 讀取分類設定
            unsubCats = window.db.collection('settings').doc('newspaper').onSnapshot(doc => {
                if (doc.exists && doc.data().categories) {
                    setCategories(doc.data().categories);
                } else if (isAdmin) {
                    window.db.collection('settings').doc('newspaper').set({ categories: ['藥學電子報'] });
                }
            });

            if (targetNewsId) {
                // 訪客專屬連結模式，只讀取單篇
                unsubNews = window.db.collection('newsletters').doc(targetNewsId).onSnapshot(doc => {
                    if (doc.exists) {
                        setNewsList([{ id: doc.id, ...doc.data() }]);
                    } else {
                        showAlert('找不到此電子報，可能已被刪除！');
                    }
                    setLoading(false);
                });
            } else {
                // 一般模式，讀取所有報紙跟考試
                unsubNews = window.db.collection('newsletters').orderBy('createdAt', 'desc').onSnapshot(snap => {
                    setNewsList(snap.docs.map(d => ({id: d.id, ...d.data()})));
                    setLoading(false);
                });
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                window.db.collection('publicTasks')
                    .where('createdAt', '>=', startOfToday)
                    .orderBy('createdAt', 'desc')
                    .onSnapshot(snap => {
                        setTodayTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    });
            }
        };
        loadData();
        return () => { unsubNews(); unsubEvents(); unsubCats(); };
    }, [targetNewsId, isAdmin]);

    // 切換訂閱狀態
    const toggleSub = async (cat) => {
        if (!user) return;
        let newSubs = [...subs];
        if (newSubs.includes(cat)) {
            newSubs = newSubs.filter(c => c !== cat);
        } else {
            newSubs.push(cat);
        }
        setSubs(newSubs);
        await window.db.collection('users').doc(user.uid).update({ subscriptions: newSubs });
    };

    // 管理員：新增類別
    const handleAddCategory = () => {
        showPrompt('請輸入新的電子報/行事曆分類名稱：', '', async (val) => {
            if (val && !categories.includes(val)) {
                await window.db.collection('settings').doc('newspaper').update({
                    categories: window.firebase.firestore.FieldValue.arrayUnion(val)
                });
                showAlert('分類新增成功！');
            }
        });
    };

    // 儲存報紙
    const saveNews = async () => {
        if (!newsTitle || !newsContent) return showAlert('標題與內容為必填！');
        const data = {
            title: newsTitle,
            category: newsCat,
            content: newsContent,
            embeddedQaId,
            embeddedQuizCode,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        if (editingId) {
            await window.db.collection('newsletters').doc(editingId).update(data);
            showAlert('✅ 報紙更新成功！');
        } else {
            data.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
            await window.db.collection('newsletters').add(data);
            showAlert('✅ 報紙發佈成功！');
        }
        closeEditor();
    };

    // 儲存考試
    const saveEvent = async () => {
        if (!eventTitle || !eventDate) return showAlert('標題與日期為必填！');
        const data = {
            title: eventTitle,
            date: eventDate,
            category: eventCat,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        if (editingId) {
            await window.db.collection('calendarEvents').doc(editingId).update(data);
            showAlert('✅ 考試日程更新成功！');
        } else {
            await window.db.collection('calendarEvents').add(data);
            showAlert('✅ 考試日程新增成功！');
        }
        closeEditor();
    };

    const deleteNews = (id) => {
        showConfirm('確定刪除這篇報紙？這動作無法復原！', async () => {
            await window.db.collection('newsletters').doc(id).delete();
        });
    };
    
    const deleteEvent = (id) => {
        showConfirm('確定刪除這個考試日程？', async () => {
            await window.db.collection('calendarEvents').doc(id).delete();
        });
    };

    const openNewsEditor = (news = null) => {
        setEditMode('news');
        if (news) {
            setEditingId(news.id); setNewsTitle(news.title); setNewsCat(news.category);
            setNewsContent(news.content); setEmbeddedQaId(news.embeddedQaId || '');
            setEmbeddedQuizCode(news.embeddedQuizCode || '');
        } else {
            setEditingId(null); setNewsTitle(''); setNewsCat(categories[0]);
            setNewsContent(''); setEmbeddedQaId(''); setEmbeddedQuizCode('');
        }
        setShowEditor(true);
    };

    const openEventEditor = (ev = null) => {
        setEditMode('event');
        if (ev) {
            setEditingId(ev.id); setEventTitle(ev.title); setEventDate(ev.date); setEventCat(ev.category);
        } else {
            setEditingId(null); setEventTitle(''); setEventDate(''); setEventCat(categories[0]);
        }
        setShowEditor(true);
    };

    const closeEditor = () => { setShowEditor(false); setEditMode(''); setEditingId(null); };

    // 處理報紙內容渲染 (訪客只顯示前10行)
    const renderNewsContent = (content, isGuest) => {
        let lines = content.split('\n');
        if (isGuest && lines.length > 10) {
            lines = lines.slice(0, 10);
            return (
                <>
                    <p className="whitespace-pre-wrap leading-relaxed">{lines.join('\n')}</p>
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 text-center border-2 border-dashed border-gray-400 font-bold">
                        ... 以下內容已隱藏，請 <button onClick={() => onRequireLogin && onRequireLogin()} className="text-blue-600 underline">登入或註冊</button> 以觀看完整電子報與相關測驗。
                    </div>
                </>
            );
        }
        return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
    };

    // 產生分享文本
    const handleShareNews = (news) => {
        const url = `${window.location.origin}${window.location.pathname}?newsId=${news.id}`;
        const text = `📰 JJay電子報：【${news.title}】\n\n${news.content.split('\n').slice(0, 3).join('\n')}...\n\n👉 點此閱讀完整內容並下載測驗：\n${url}`;
        setShareNews(text);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-16">
            <div className="text-4xl mb-4 animate-spin">📰</div>
            <div className="text-gray-500 font-bold animate-pulse">電子報派送中...</div>
        </div>
    );

    return (
        <div className={`max-w-6xl mx-auto p-4 h-full overflow-y-auto custom-scrollbar w-full ${targetNewsId ? 'bg-white dark:bg-gray-900 border-4 border-black' : ''}`}>
            <div className="flex flex-wrap justify-between items-center mb-6 border-b-2 border-black dark:border-white pb-2 gap-3">
                <h1 className="text-2xl font-black dark:text-white flex items-center">📰 JJay 日報與行事曆</h1>
                
                {targetNewsId && !user && (
                    <button onClick={() => onClose ? onClose() : window.history.replaceState({}, '', window.location.pathname)} className="text-gray-500 font-bold text-sm hover:text-black dark:hover:text-white transition-colors">
                        ⬅ 返回首頁
                    </button>
                )}

                {isAdmin && !targetNewsId && (
                    <div className="flex gap-2">
                        <button onClick={handleAddCategory} className="bg-gray-200 text-black px-3 py-1 text-sm font-bold border border-black no-round hover:bg-gray-300 transition-colors">+ 新增類別</button>
                        <button onClick={() => openEventEditor()} className="bg-black text-white px-3 py-1 text-sm font-bold no-round hover:bg-gray-800 transition-colors">+ 新增考試</button>
                        <button onClick={() => openNewsEditor()} className="bg-blue-600 text-white px-3 py-1 text-sm font-bold no-round hover:bg-blue-700 transition-colors">+ 發佈報紙</button>
                    </div>
                )}
            </div>

            {/* 訂閱面板 (一般登入模式才顯示) */}
            {!targetNewsId && user && (
                <div className="mb-6 bg-white dark:bg-gray-800 p-5 border border-gray-200 dark:border-gray-700 shadow-sm no-round">
                    <h3 className="font-black mb-3 text-lg dark:text-white flex items-center gap-2">📡 我的訂閱頻道</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-bold">勾選以接收對應分類的電子報與考試行事曆提醒。</p>
                    <div className="flex flex-wrap gap-3">
                        {categories.map(cat => (
                            <label key={cat} className={`flex items-center space-x-2 cursor-pointer px-4 py-2 border transition-colors ${subs.includes(cat) ? 'bg-black text-white border-black dark:bg-gray-200 dark:text-black' : 'bg-gray-50 text-gray-600 border-gray-300 dark:bg-gray-900 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                <input type="checkbox" checked={subs.includes(cat)} onChange={() => toggleSub(cat)} className="hidden" />
                                <span className="font-bold text-sm">{subs.includes(cat) ? '✔ 已訂閱' : '+ 訂閱'} {cat}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* 管理員編輯器 */}
            {showEditor && (
                <div className="mb-8 p-6 bg-blue-50 dark:bg-gray-800 border-2 border-black dark:border-white no-round shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-300 dark:border-gray-600 pb-2">
                        <h2 className="text-xl font-black dark:text-white">{editMode === 'news' ? (editingId ? '📝 編輯報紙' : '📢 發佈新報紙') : (editingId ? '📝 編輯考試' : '📅 新增考試')}</h2>
                        <button onClick={closeEditor} className="text-gray-500 font-bold hover:text-red-500">✖ 關閉</button>
                    </div>
                    
                    {editMode === 'news' ? (
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-600 dark:text-gray-300">報紙標題</label>
                            <input type="text" placeholder="例如：藥學週報 #12" value={newsTitle} onChange={e=>setNewsTitle(e.target.value)} className="w-full p-3 border border-black dark:bg-gray-700 dark:text-white no-round outline-none" />
                            
                            <label className="block text-sm font-bold text-gray-600 dark:text-gray-300">發佈類別 (頻道)</label>
                            <select value={newsCat} onChange={e=>setNewsCat(e.target.value)} className="w-full p-3 border border-black dark:bg-gray-700 dark:text-white no-round outline-none cursor-pointer">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            
                            <label className="block text-sm font-bold text-gray-600 dark:text-gray-300">報紙內容 (純文字)</label>
                            <textarea placeholder="在這裡輸入電子報內容，支援換行排版..." value={newsContent} onChange={e=>setNewsContent(e.target.value)} className="w-full h-48 p-3 border border-black dark:bg-gray-700 dark:text-white no-round outline-none custom-scrollbar"></textarea>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-900 p-4 border border-dashed border-gray-400">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">🔗 嵌入快問快答 ID (選填)</label>
                                    <input type="text" placeholder="輸入 QA 的資料庫 ID" value={embeddedQaId} onChange={e=>setEmbeddedQaId(e.target.value)} className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white text-sm no-round outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">📥 嵌入試卷代碼 (選填)</label>
                                    <input type="text" placeholder="輸入 6 碼試卷代碼" value={embeddedQuizCode} onChange={e=>setEmbeddedQuizCode(e.target.value)} className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white text-sm no-round outline-none" />
                                </div>
                            </div>
                            
                            <button onClick={saveNews} className="w-full bg-blue-600 text-white font-black py-3 text-lg no-round hover:bg-blue-700 transition-colors shadow-sm mt-4">💾 儲存報紙</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-600 dark:text-gray-300">考試名稱</label>
                            <input type="text" placeholder="例如: 藥理學期中考" value={eventTitle} onChange={e=>setEventTitle(e.target.value)} className="w-full p-3 border border-black dark:bg-gray-700 dark:text-white no-round outline-none" />
                            
                            <label className="block text-sm font-bold text-gray-600 dark:text-gray-300">考試日期</label>
                            <input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)} className="w-full p-3 border border-black dark:bg-gray-700 dark:text-white no-round outline-none cursor-pointer" />
                            
                            <label className="block text-sm font-bold text-gray-600 dark:text-gray-300">所屬類別</label>
                            <select value={eventCat} onChange={e=>setEventCat(e.target.value)} className="w-full p-3 border border-black dark:bg-gray-700 dark:text-white no-round outline-none cursor-pointer">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            
                            <button onClick={saveEvent} className="w-full bg-green-600 text-white font-black py-3 text-lg no-round hover:bg-green-700 transition-colors shadow-sm mt-4">💾 儲存考試</button>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 左側：電子報文章列表 */}
                <div className="lg:col-span-2 space-y-8">
                    {newsList.filter(n => targetNewsId || subs.includes(n.category) || isAdmin).length === 0 ? (
                        <div className="text-gray-500 font-bold p-10 text-center bg-white dark:bg-gray-800 border border-gray-200 shadow-sm no-round">目前沒有符合您訂閱頻道的電子報。</div>
                    ) : (
                        newsList.filter(n => targetNewsId || subs.includes(n.category) || isAdmin).map(news => (
                            <article key={news.id} className="bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600 no-round shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] p-6 relative">
                                <div className="flex justify-between items-start mb-4 border-b-2 border-gray-100 dark:border-gray-700 pb-3">
                                    <div>
                                        <span className="text-xs font-black bg-black text-white px-2 py-1 mr-2 tracking-widest">{news.category}</span>
                                        <span className="text-xs text-gray-500 font-bold">{news.createdAt?.toDate().toLocaleDateString('zh-TW') || '剛剛'}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => handleShareNews(news)} className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-gray-900 px-2 py-1 no-round border border-blue-200 transition-colors">🔗 分享</button>
                                        {isAdmin && (
                                            <>
                                                <button onClick={() => openNewsEditor(news)} className="text-sm font-bold text-purple-600 bg-purple-50 dark:bg-gray-900 px-2 py-1 no-round border border-purple-200">編輯</button>
                                                <button onClick={() => deleteNews(news.id)} className="text-sm font-bold text-red-600 bg-red-50 dark:bg-gray-900 px-2 py-1 no-round border border-red-200">刪除</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                <h2 className="text-3xl font-black mb-5 dark:text-white leading-tight tracking-tight">{news.title}</h2>
                                
                                <div className="text-gray-800 dark:text-gray-200 text-base mb-6 font-medium bg-gray-50 dark:bg-gray-900 p-5 border-l-4 border-black dark:border-gray-500">
                                    {renderNewsContent(news.content, !user)}
                                </div>
                                
                                {/* 嵌入區塊 (訪客看得到框，但點擊要求登入) */}
                                {(news.embeddedQaId || news.embeddedQuizCode) && (
                                    <div className="bg-white dark:bg-gray-800 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 mt-6 flex flex-col sm:flex-row gap-4">
                                        {news.embeddedQaId && (
                                            <button onClick={() => {
                                                if (!user) return onRequireLogin && onRequireLogin();
                                                window.location.href = `/?qaId=${news.embeddedQaId}`;
                                            }} className="flex-1 bg-pink-100 border border-pink-400 text-pink-700 font-black py-3 hover:bg-pink-200 transition-colors no-round shadow-sm text-center">
                                                ⚡ 挑戰本期快問快答
                                            </button>
                                        )}
                                        {news.embeddedQuizCode && (
                                            <button onClick={() => {
                                                if (!user) return onRequireLogin && onRequireLogin();
                                                navigator.clipboard.writeText(news.embeddedQuizCode);
                                                showAlert(`✅ 已複製試卷代碼: ${news.embeddedQuizCode}\n\n請前往「我的題庫」，點擊右上角「📥 輸入代碼」即可下載此測驗卷！`);
                                            }} className="flex-1 bg-blue-100 border border-blue-400 text-blue-700 font-black py-3 hover:bg-blue-200 transition-colors no-round shadow-sm text-center">
                                                📥 領取專屬測驗卷 ({news.embeddedQuizCode})
                                            </button>
                                        )}
                                    </div>
                                )}
                            </article>
                        ))
                    )}
                </div>

                {/* 右側：行事曆區塊 (訪客隱藏) */}
                {!targetNewsId && user && (
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600 p-5 no-round shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] sticky top-4">
                            <h2 className="text-xl font-black mb-5 flex items-center border-b-2 border-black dark:border-gray-600 pb-2 dark:text-white tracking-widest">
                                📅 考試行事曆
                            </h2>
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                                {events.filter(e => subs.includes(e.category) || isAdmin).length === 0 ? (
                                    <div className="text-sm text-gray-500 font-bold text-center py-8 border border-dashed border-gray-300">近期無考試安排，放假囉！</div>
                                ) : (
                                    events.filter(e => subs.includes(e.category) || isAdmin).map(ev => {
                                        const daysLeft = Math.ceil((new Date(ev.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                        const isPast = daysLeft < 0;
                                        return (
                                            <div key={ev.id} className={`p-4 border-l-4 border border-gray-100 dark:border-gray-700 relative ${isPast ? 'border-l-gray-400 bg-gray-50 dark:bg-gray-900 opacity-50' : (daysLeft <= 7 ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20' : 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20')}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-black text-white bg-gray-400 px-1.5 py-0.5 tracking-widest">{ev.category}</span>
                                                    {isAdmin && (
                                                        <div className="flex gap-2">
                                                            <button onClick={() => openEventEditor(ev)} className="text-[10px] text-purple-600 font-bold bg-white px-1 border">編輯</button>
                                                            <button onClick={() => deleteEvent(ev.id)} className="text-[10px] text-red-600 font-bold bg-white px-1 border">刪除</button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`font-black text-base ${isPast ? 'line-through text-gray-500' : 'dark:text-white'}`}>{ev.title}</div>
                                                <div className={`text-sm mt-1 font-black ${isPast ? 'text-gray-400' : (daysLeft <= 7 ? 'text-red-600' : 'text-blue-600')}`}>
                                                    {ev.date} {isPast ? '(已結束)' : `(倒數 ${daysLeft} 天)`}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                        {/* 🔥 今日新增試題區塊 */}
                        <div className="bg-yellow-50 dark:bg-gray-800 border-2 border-yellow-400 dark:border-yellow-600 p-5 mt-6 no-round shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
                            <h2 className="text-xl font-black mb-5 flex items-center border-b-2 border-yellow-400 dark:border-yellow-600 pb-2 dark:text-white tracking-widest text-yellow-800">
                                🔥 今日新增試題
                            </h2>
                            <div className="space-y-4 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                                {todayTasks.length === 0 ? (
                                    <div className="text-sm text-gray-500 font-bold text-center py-6 border border-dashed border-gray-300">今天還沒有新試題，休息一下吧！</div>
                                ) : (
                                    todayTasks.map(task => (
                                        <div key={task.id} className="bg-white dark:bg-gray-700 p-3 border border-yellow-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                                            <h3 className="font-bold text-sm mb-3 truncate dark:text-white">{task.testName}</h3>
                                            <button onClick={() => {
                                                showAlert("請前往「🎯 任務牆」搜尋並開始這份新任務！");
                                            }} className="w-full text-xs bg-yellow-400 hover:bg-yellow-500 text-black py-2 font-black transition-colors shadow-sm">
                                                前往挑戰 ➡️
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 分享報紙連結的專屬文字框 */}
            {shareNews && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-sm no-round shadow-2xl border-4 border-black">
                        <h3 className="font-black mb-4 flex justify-between items-center text-xl dark:text-white">
                            <span>🔗 分享電子報</span>
                            <button onClick={() => setShareNews(null)} className="text-gray-400 hover:text-red-500 transition-colors">✕</button>
                        </h3>
                        <textarea readOnly value={shareNews} className="w-full h-40 p-4 text-sm border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 mb-5 outline-none resize-none no-round leading-relaxed font-bold" onClick={(e) => e.target.select()} />
                        <button onClick={() => { navigator.clipboard.writeText(shareNews); showAlert('✅ 已複製分享文本，快去貼給好友吧！'); setShareNews(null); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 text-lg no-round transition-colors shadow-md">
                            📋 複製分享文本
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
