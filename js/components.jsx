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
                        bio: ""
                    }).catch(err => showAlert("註冊成功，但建立資料庫檔案失敗: " + err.message));
                } else {
                    window.db.collection('users').doc(cred.user.uid).set({ email: safeEmail }, { merge: true });
                }
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
        <div className="flex h-full items-center justify-center p-4 overflow-y-auto bg-gray-100 dark:bg-gray-900">
            <form onSubmit={handleAuth} className="bg-white dark:bg-gray-800 p-8 shadow-md w-full max-w-sm no-round border border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 bg-black dark:bg-gray-700 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl font-black">📝</span>
                </div>
                <h1 className="text-xl font-bold mb-6 tracking-tight text-center dark:text-white">JJay線上測驗</h1>
                <input type="email" placeholder="電子郵件" className="w-full mb-3 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white" value={email} onChange={e => setEmail(e.target.value)} onFocus={handleFocusScroll} required />
                <input type="password" placeholder="密碼" className="w-full mb-6 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white" value={password} onChange={e => setPassword(e.target.value)} onFocus={handleFocusScroll} required />
                <button type="submit" className="w-full bg-black dark:bg-gray-200 text-white dark:text-black p-3 font-bold no-round hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors" disabled={loading}>{loading ? '處理中...' : (isSignUp ? '註冊' : '登入')}</button>
                <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors" disabled={loading}>{isSignUp ? '已有帳號？前往登入' : '沒有帳號？前往註冊'}</button>
            </form>
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
function ProfilePage({ user, userProfile, showAlert }) {
    const [bio, setBio] = useState(userProfile.bio || "");
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

    const saveBio = () => {
        setIsSaving(true);
        window.db.collection('users').doc(user.uid).update({ bio })
          .then(() => showAlert("✅ 自我介紹已儲存！"))
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
                    <div className="w-full mb-4 p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed no-round">{userProfile.displayName}</div>
                    
                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">關於我 (自我介紹)</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full h-32 mb-4 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white outline-none resize-none no-round focus:border-black dark:focus:border-white" placeholder="寫點關於你自己的事吧..."></textarea>
                    
                    <button onClick={saveBio} disabled={isSaving} className="bg-black dark:bg-gray-200 text-white dark:text-black px-6 py-2 font-bold no-round hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors">
                        {isSaving ? '儲存中...' : '儲存變更'}
                    </button>
                </div>
            </div>
        </div>
    );
}
