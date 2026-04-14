// 🚀 從全域引入共用組件，防止 React 找不到變數而引發白屏崩潰！
const { ContentEditableEditor, parseSmilesToHtml } = window;
// 修改後的 McImg，能同時處理舊的 Base64 與新的 URL
function McImg({ src, fallback, className }) {
    const [hasError, setHasError] = useState(false);
    
    // 如果 src 沒值，直接顯示 fallback
    if (!src) return <span className={className}>{fallback}</span>;
    if (hasError) return <span className={className}>{fallback}</span>;

    return (
        <img 
            src={src} 
            className={className} 
            onError={() => setHasError(true)} 
            alt={fallback} 
            // 💡 提示：如果是 URL，瀏覽器會非同步加載；如果是 Base64，瀏覽器會直接解析
            loading="lazy" 
        />
    );
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
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 w-full max-w-sm rounded-3xl shadow-2xl transform transition-all border border-stone-200 dark:border-stone-700">
                <h3 className="font-bold text-xl mb-3 flex items-center gap-2 text-stone-800 dark:text-stone-100">
                    <span className="material-symbols-outlined text-[24px]">{dialog.type === 'alert' ? 'info' : 'help'}</span>
                    <span>{dialog.type === 'alert' ? '系統提示' : '請確認'}</span>
                </h3>
                <p className="mb-5 text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{dialog.message}</p>
                {dialog.type === 'prompt' && (
                    <input type="text" className="w-full mb-5 p-3 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-black dark:focus:border-white text-sm" value={inputValue} onChange={e => setInputValue(e.target.value)} autoFocus />
                )}
                <div className="flex justify-end space-x-3 mt-2 border-t border-gray-100 dark:border-stone-700 pt-4">
                    {(dialog.type === 'confirm' || dialog.type === 'prompt') && (
                        <button onClick={onClose} className="bg-stone-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-5 py-2 rounded-2xl font-bold text-sm hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors">取消</button>
                    )}
                    <button onClick={handleConfirm} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-5 py-2 rounded-2xl font-bold text-sm hover:bg-stone-800 dark:hover:bg-gray-300 transition-colors">確定</button>
                </div>
            </div>
        </div>
    );
}

function TutorialOverlay({ onComplete, onNavigate }) {
    const [step, setStep] = React.useState(0);

    // ✨ 重新設計的互動步驟：加入 action 提示使用者實際去操作
    const steps = [
        {
            title: "歡迎來到 JJay 線上測驗",
            icon: "rocket_launch",
            content: "接下來的導覽不會擋住你的畫面！\n你可以一邊看我的提示，一邊實際點擊網頁玩玩看。",
            action: "準備好就點擊「出發」！",
            color: "from-stone-300 to-stone-400",
            targetTab: null
        },
        {
            title: "第一站：JJay 日報",
            icon: "newspaper",
            content: "每天最新的考試重點都在這。",
            action: "試試看：點進最新電子報將頁面往下滑到最底，點擊「領取每日鑽石」按鈕！",
            color: "from-amber-500 to-orange-600",
            targetTab: 'newspaper'
        },
        {
            title: "第二站：我的題庫",
            icon: "library_books",
            content: "這是你的個人專屬書架。",
            action: "試試看：點擊上方「＋新測驗」按鈕，隨便輸入幾個字看看系統反應！",
            color: "from-emerald-400 to-teal-600",
            targetTab: 'dashboard'
        },
        {
            title: "第三站：任務牆",
            icon: "task_alt",
            content: "每天完成每日任務可賺取大量鑽石。",
            action: "試試看：點擊左側任一個任務的「挑戰」按鈕，或者切換上方的標籤！",
            color: "from-rose-400 to-red-600",
            targetTab: 'taskwall'
        },
        {
            title: "第四站：錯題整理",
            icon: "menu_book",
            content: "你所有寫錯的題目都會自動收錄到這。",
            action: "試試看：點擊「新增錯題資料夾」按鈕，試著建立一個自己的專屬分類！",
            color: "from-red-500 to-red-800",
            targetTab: 'wrongbook'
        },
        {
            title: "第五站：社群交流",
            icon: "forum",
            content: "不再是一個人讀書！",
            action: "試試看：透過電子信箱加入好友！",
            color: "from-indigo-400 to-blue-600",
            targetTab: 'social'
        },
        {
            title: "第六站：史蒂夫養成",
            icon: "sports_esports",
            content: "用賺來的鑽石佈置你的專屬家園。",
            action: "試試看：點擊畫面上方的「史萊姆排球」按鈕，體驗超刺激的排球遊戲！",
            color: "from-amber-400 to-yellow-600",
            targetTab: 'minecraft'
        },
        {
            title: "最後一站：戰況追蹤",
            icon: "trending_up",
            content: "這裡有超強的打卡系統與 AI 口訣生成器。",
            action: "試試看：點擊任一科目展開選單，試著點擊「速讀/細讀」按鈕完成一次打卡吧！",
            color: "from-cyan-400 to-blue-600",
            targetTab: 'examProgress'
        }
    ];

    // 監聽步驟切換頁面
    React.useEffect(() => {
        const currentStep = steps[step];
        if (currentStep && currentStep.targetTab && onNavigate) {
            onNavigate(currentStep.targetTab);
        }
    }, [step]);

    const nextStep = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    const current = steps[step];

    return (
        /* ✨ 關鍵修改：pointer-events-none 讓這個滿版容器不會擋住滑鼠點擊，
           但保留子元素 (卡片本身) 的 pointer-events-auto 讓按鈕可以按 */
        <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col justify-end items-end p-4 md:p-8">
            
            {/* 懸浮導覽卡片 */}
            <div key={step} className="pointer-events-auto bg-[#FCFBF7] dark:bg-stone-900 p-6 w-full sm:w-[400px] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 border-stone-200 dark:border-stone-700 animate-fade-in-up relative overflow-hidden flex flex-col">
                
                {/* 頂部進度條 */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-200 dark:bg-stone-800">
                    <div 
                        className={`h-full bg-gradient-to-r ${current.color} transition-all duration-500`}
                        style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                    ></div>
                </div>

                <div className="flex items-start gap-4 mt-2 mb-4">
                    <div className={`w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center text-white shadow-lg`}>
                        <span className="material-symbols-outlined text-[28px]">{current.icon}</span>
                    </div>
                    <div>
                        <span className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500 block mb-1">
                            導覽進度 {step + 1} / {steps.length}
                        </span>
                        <h2 className="text-lg font-black text-stone-800 dark:text-stone-100 leading-tight">
                            {current.title}
                        </h2>
                    </div>
                </div>

                <p className="text-sm font-bold text-stone-600 dark:text-stone-300 mb-4 whitespace-pre-wrap">
                    {current.content}
                </p>

                {/* 互動指示區塊：用搶眼的顏色吸引使用者去點擊背景的 UI */}
                <div className={`mb-6 p-3 rounded-xl bg-gradient-to-r ${current.color} bg-opacity-10 border border-current text-sm font-bold text-stone-800 dark:text-white`}>
                    <div className="animate-pulse">{current.action}</div>
                </div>

                <div className="flex gap-3 mt-auto">
                    {step > 0 && (
                        <button onClick={() => setStep(step - 1)} className="w-1/3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 py-3 font-black rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-sm">
                            上一步
                        </button>
                    )}
                    <button 
                        onClick={nextStep} 
                        className={`flex-1 flex justify-center items-center gap-2 bg-gradient-to-r ${current.color} text-white py-3 font-black rounded-xl hover:opacity-90 transition-transform active:scale-95 shadow-md text-sm`}
                    >
                        {step < steps.length - 1 ? (
                            <>測試完畢，下一站 <span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
                        ) : (
                            <><span className="material-symbols-outlined text-[18px]">check_circle</span> 結束導覽</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AuthScreen({ showAlert }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // ✨ 1. 保留信箱「登入」功能 (移除註冊功能)
    const handleEmailLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        const safeEmail = email.trim().toLowerCase(); 
        
        window.auth.signInWithEmailAndPassword(safeEmail, password)
            .catch(err => {
                let errorMsg = err.message;
                if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                    errorMsg = "帳號或密碼錯誤！";
                }
                showAlert('登入失敗：\n' + errorMsg);
            })
            .finally(() => setLoading(false));
    };

    // ✨ 2. 新增 Google 登入處理邏輯
    // ✨ 2. 新增 Google 登入處理邏輯
    const handleGoogleLogin = async () => {
        setLoading(true);
        let user = null;
        
        // 第一階段：處理 Google 帳號驗證
        try {
            const provider = new window.firebase.auth.GoogleAuthProvider();
            const result = await window.auth.signInWithPopup(provider);
            user = result.user;
        } catch (err) {
            // 如果是在這階段失敗，才是真正的登入失敗
            if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
                showAlert('Google 登入失敗：\n' + err.message);
            }
            setLoading(false);
            return; // 登入失敗就中斷
        }

        // 第二階段：檢查是否為新用戶並建立資料 (加上獨立的 Try-Catch 防護)
        if (user) {
            try {
                // 檢查這個 Google 帳號是不是第一次登入
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                
                if (!userDoc.exists) {
                    // 如果是新用戶，建立預設資料庫檔案
                    const initMcData = { diamonds: 0, level: 1, exp: 0, hunger: 10, items: [], cats: 0, lastCheckIn: null };
                    await window.db.collection('users').doc(user.uid).set({ 
                        email: user.email, 
                        friends: [], 
                        unreadChats: {}, 
                        folders: ['未分類'], 
                        mcData: initMcData,
                        hasSeenTutorial: false,
                        avatar: user.photoURL || null,      // 直接使用 Google 大頭照
                        displayName: user.displayName || "", // 直接使用 Google 暱稱
                        bio: "",
                        subscriptions: ['藥學電子報'] 
                    });
                }
            } catch (dbErr) {
                // 🛑 核心修復：忽略「client is offline」等資料庫瞬斷錯誤
                // 因為 Auth 驗證已經成功，系統底層其實已經登入了，不要因為網路小抖動就跳出嚇人的失敗警告
                console.warn("檢查新用戶資料失敗 (可能是網路瞬斷)，但不影響登入:", dbErr);
            }
        }
        
        setLoading(false);
    };

    return (
        <div className="flex h-[100dvh] bg-stone-50 dark:bg-stone-900 overflow-hidden">
            
            {/* 左側：自訂圖片區塊 (只在平板 md 尺寸以上顯示) */}
            <div className="hidden md:flex md:w-1/2 relative items-center justify-center bg-stone-800">
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
            <div className="flex w-full md:w-1/2 items-center justify-center p-4 overflow-y-auto bg-stone-50 dark:bg-stone-900">
                <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 shadow-2xl w-full max-w-sm border-t-4 border-amber-500 rounded-3xl">
                    
                   <div className="w-20 h-20 bg-stone-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-stone-200 dark:border-gray-600 overflow-hidden text-stone-800 dark:text-white">
                        <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>edit_document</span>
                    </div>
                    
                    <h2 className="text-2xl font-black mb-6 tracking-tight text-center dark:text-white">登入你的帳號</h2>
                    
                    {/* ✨ 3. Google 登入按鈕 (放在最顯眼的位置) */}
                    <button 
                        type="button" 
                        onClick={handleGoogleLogin} 
                        className="w-full bg-[#FCFBF7] dark:bg-gray-700 text-gray-700 dark:text-white border-2 border-stone-200 dark:border-gray-600 p-3 font-black rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm active:scale-95 flex items-center justify-center gap-3 mb-6" 
                        disabled={loading}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        使用 Google 帳號登入/註冊
                    </button>

                    <div className="relative flex py-2 items-center mb-6">
                        <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold">老玩家信箱登入</span>
                        <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    </div>

                    <form onSubmit={handleEmailLogin}>
                        <input type="email" placeholder="電子郵件" className="w-full mb-4 p-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-stone-900 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-black dark:focus:border-white transition-colors" value={email} onChange={e => setEmail(e.target.value)} required />
                        <input type="password" placeholder="密碼" className="w-full mb-6 p-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-stone-900 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-black dark:focus:border-white transition-colors" value={password} onChange={e => setPassword(e.target.value)} required />
                        
                        <button type="submit" className="w-full bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 p-3 font-black rounded-2xl hover:bg-stone-800 dark:hover:bg-gray-300 transition-colors shadow-md active:scale-95" disabled={loading}>
                            {loading ? '處理中...' : '舊帳號登入'}
                        </button>
                    </form>
                    
                    <p className="text-xs text-center text-gray-400 mt-6 font-bold">
                        新用戶請直接點擊上方 Google 按鈕進行登入。
                    </p>
                </div>
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
        <div className="flex h-full items-center justify-center p-4 bg-gray-50 dark:bg-stone-900 overflow-y-auto">
            <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 shadow-md w-full max-w-sm rounded-2xl border border-stone-200 dark:border-stone-700 text-center">
                <h2 className="text-xl font-bold mb-4 dark:text-white">歡迎加入！請設定你的社群暱稱</h2>
                <input type="text" placeholder="例如：藥神、JJay..." className="w-full mb-6 p-3 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-black dark:focus:border-white text-center" value={name} onChange={e => setName(e.target.value)} onFocus={handleFocusScroll} />
                <button onClick={saveProfile} className="w-full bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 p-3 font-bold rounded-2xl hover:bg-stone-800 dark:hover:bg-gray-300">完成設定</button>
            </div>
        </div>
    );
}

// 新增功能：個人檔案頁面與大頭照壓縮
// 新增功能：個人檔案頁面與大頭照壓縮 (加入暱稱修改功能)
function ProfilePage({ user, userProfile, showAlert }) {
    const [bio, setBio] = useState(userProfile.bio || "");
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
                const MAX_DIM = 200; 
                if (w > h && w > MAX_DIM) { h *= MAX_DIM / w; w = MAX_DIM; }
                else if (h > MAX_DIM) { w *= MAX_DIM / h; h = MAX_DIM; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                
                canvas.toBlob(async (blob) => {
                    if (!blob) return showAlert("[錯誤] 圖片處理失敗");
                    showAlert("[提示] 圖片上傳中，請稍候...", "提示"); 
                    
                    try {
                        const filePath = `avatars/${user.uid}_${Date.now()}.jpg`;
                        const storageRef = window.storage.ref(filePath);
                        await storageRef.put(blob);
                        const downloadURL = await storageRef.getDownloadURL();
                        await window.db.collection('users').doc(user.uid).update({ avatar: downloadURL });
                        showAlert("[成功] 頭像更新成功！");
                    } catch (err) {
                        showAlert("[錯誤] 頭像上傳失敗：" + err.message);
                    }
                }, 'image/jpeg', 0.6);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const saveProfile = () => {
        if (!displayName.trim()) return showAlert("[錯誤] 社群暱稱不能為空！");
        setIsSaving(true);
        window.db.collection('users').doc(user.uid).update({ 
            bio: bio,
            displayName: displayName.trim() 
        })
          .then(() => showAlert("[成功] 個人檔案已儲存變更！"))
          .catch(e => showAlert("[錯誤] 儲存失敗：" + e.message))
          .finally(() => setIsSaving(false));
    };

    const handleLinkGoogle = async () => {
        try {
            const provider = new window.firebase.auth.GoogleAuthProvider();
            const result = await user.linkWithPopup(provider);
            
            if (!userProfile.avatar && result.user.photoURL) {
                await window.db.collection('users').doc(user.uid).update({
                    avatar: result.user.photoURL
                });
            }
            
            showAlert("[成功] 成功綁定 Google 帳號！\n以後您可以直接使用 Google 一鍵登入，所有資料已完美保留！");
        } catch (err) {
            if (err.code === 'auth/credential-already-in-use') {
                showAlert("[錯誤] 綁定失敗：這個 Google 帳號已經被另一個帳號註冊過了！請使用其他 Google 帳號。");
            } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
                showAlert("[錯誤] 綁定失敗：" + err.message);
            }
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-8 mt-10 bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xl rounded-3xl">
            <h2 className="text-2xl font-black mb-6 text-stone-800 dark:text-stone-100 border-b border-stone-200 dark:border-stone-700 pb-4">個人檔案設定</h2>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="flex flex-col items-center">
                    <div className="w-32 h-32 bg-stone-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border-4 border-gray-300 dark:border-gray-600 mb-4 cursor-pointer" onClick={() => fileInputRef.current.click()}>
{userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-4xl text-gray-400">person</span>}                    </div>
                    <button onClick={() => fileInputRef.current.click()} className="text-sm font-bold bg-stone-50 dark:bg-gray-700 px-4 py-2 hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors dark:text-white border border-gray-300 dark:border-gray-600 rounded-2xl">更換大頭照</button>
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                </div>
                <div className="flex-grow w-full">
                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">社群暱稱</label>
                    <input 
                        type="text" 
                        value={displayName} 
                        onChange={e => setDisplayName(e.target.value)} 
                        className="w-full mb-4 p-3 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white outline-none rounded-2xl focus:border-black dark:focus:border-white" 
                        placeholder="請輸入你的社群暱稱..."
                    />
                    
                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">關於我 (自我介紹)</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full h-32 mb-4 p-3 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white outline-none resize-none rounded-2xl focus:border-black dark:focus:border-white" placeholder="寫點關於你自己的事吧..."></textarea>
                    
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                        <button onClick={saveProfile} disabled={isSaving} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-6 py-2 font-bold rounded-2xl hover:bg-stone-800 dark:hover:bg-gray-300 transition-colors">
                            {isSaving ? '儲存中...' : '儲存變更'}
                        </button>
                        
                        {user.providerData.every(p => p.providerId !== 'google.com') && (
                            <button 
                                onClick={handleLinkGoogle} 
                                className="bg-[#FCFBF7] dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 px-6 py-2 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                綁定 Google 帳號
                            </button>
                        )}
                        
                        <button 
                            onClick={() => {
                                window.db.collection('users').doc(user.uid).update({ hasSeenTutorial: false })
                            }} 
                            className="bg-stone-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-6 py-2 font-bold rounded-2xl hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[18px]">menu_book</span> 重新觀看新手教學
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
        const nextWeek = now + 14 * 24 * 60 * 60 * 1000; 

        window.db.collection('calendarEvents').get().then(snap => {
            const upcoming = [];
            snap.docs.forEach(doc => {
                const data = doc.data();
                if (subs.includes(data.category)) {
                    const eventTime = new Date(data.date).getTime();
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
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
        <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 w-full max-w-sm rounded-3xl shadow-2xl transform transition-all border border-stone-100 dark:border-stone-700">
                <button onClick={closePopup} className="absolute top-3 right-3 text-gray-400 hover:text-stone-800 dark:hover:text-white font-bold text-xl flex items-center"><span className="material-symbols-outlined">close</span></button>
                <h3 className="text-xl font-black mb-4 flex items-center dark:text-white border-b-2 border-stone-200 dark:border-stone-700 pb-2 gap-2">
                    <span className="material-symbols-outlined text-[24px]">event</span> 近期考試提醒
                </h3>
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    {examAlerts.map(ex => {
                        const daysLeft = Math.ceil((new Date(ex.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        return (
                            <div key={ex.id} className="p-3 bg-gray-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 border-l-4 border-l-amber-500">
                                <div className="text-xs font-bold text-gray-500 mb-1">{ex.category}</div>
                                <div className="font-bold text-gray-800 dark:text-gray-200">{ex.title}</div>
                                <div className="text-sm mt-1 text-red-500 font-bold">倒數 {daysLeft} 天 ({ex.date})</div>
                            </div>
                        );
                    })}
                </div>
                <label className="flex items-center space-x-2 text-sm cursor-pointer dark:text-gray-300 font-bold justify-center border-t border-gray-100 dark:border-stone-700 pt-4">
                    <input type="checkbox" checked={hideToday} onChange={e => setHideToday(e.target.checked)} className="w-4 h-4 accent-black" />
                    <span>今日不再顯示此提醒</span>
                </label>
                <button onClick={closePopup} className="mt-4 w-full bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 font-bold py-2 hover:bg-stone-800 transition-colors">我知道了</button>
            </div>
        </div>
    );
}

// ==========================================
// ✨ 新增：JJay 日報與行事曆核心系統
// ==========================================
// ==========================================
// ✨ 新增：JJay 日報與行事曆核心系統 (全新升級版)
// ==========================================
function NewsMiniRichEditor({ value, onChange, placeholder }) {
    const editorRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value && !isFocused) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value, isFocused]);
    return (
        <div className="relative w-full border-2 border-black dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 rounded-2xl">
            {!value && !isFocused && <div className="absolute top-3 left-3 text-gray-400 pointer-events-none text-sm z-10 font-bold">{placeholder}</div>}
            <div ref={editorRef} contentEditable onFocus={() => setIsFocused(true)} onBlur={() => { setIsFocused(false); onChange(editorRef.current.innerHTML); }} onInput={() => onChange(editorRef.current.innerHTML)} className="w-full h-48 p-3 text-stone-800 dark:text-white outline-none custom-scrollbar overflow-y-auto font-medium leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} />
        </div>
    );
}

function NewspaperDashboard({ user, userProfile, showAlert, showConfirm, showPrompt, onContinueQuiz, targetNewsId, onClose, onRequireLogin }) {
    const isAdmin = user && (user.email === 'jay03wn@gmail.com' || userProfile?.isAuthorized);
    const [newsList, setNewsList] = useState(window._cachedNews || []);
    const [events, setEvents] = useState(window._cachedEvents || []);
    const [categories, setCategories] = useState(window._cachedCats || ['藥學電子報', '未分類']);
    const [loading, setLoading] = useState(!window._hasLoadedNews);
    const [subs, setSubs] = useState(userProfile?.subscriptions || ['藥學電子報']);
    const [activeFeedTab, setActiveFeedTab] = useState('subscribed'); 
    
    const [showEditor, setShowEditor] = useState(false);
    const [editMode, setEditMode] = useState(''); 
    const [editingId, setEditingId] = useState(null);
    const [newsTitle, setNewsTitle] = useState('');
    const [newsCat, setNewsCat] = useState('藥學電子報');
    const [newsContent, setNewsContent] = useState('');
    const [embeddedQaId, setEmbeddedQaId] = useState('');
    const [embeddedQuizCode, setEmbeddedQuizCode] = useState('');
    
    const [rewardType, setRewardType] = useState('none'); 
    const [rewardVal1, setRewardVal1] = useState(''); 
    const [rewardVal2, setRewardVal2] = useState(''); 

    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventCat, setEventCat] = useState('藥學電子報');

    const [viewingNews, setViewingNews] = useState(null);
    const [newsComments, setNewsComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [hasClaimed, setHasClaimed] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let unsubNews = () => {};
        let unsubEvents = () => {};
        let unsubCats = () => {};

        const loadData = () => {
            unsubCats = window.db.collection('settings').doc('newspaper').onSnapshot(doc => {
                if (doc.exists && doc.data().categories && isMounted) {
                    const loadedCats = doc.data().categories;
                    if (!loadedCats.includes('未分類')) loadedCats.push('未分類');
                    window._cachedCats = loadedCats;
                    setCategories(loadedCats);
                }
            });

            if (targetNewsId) {
                if (!window.db) return; 
                unsubNews = window.db.collection('newsletters').doc(targetNewsId).onSnapshot(doc => {
                    if (!isMounted) return;
                    if (doc.exists) {
                        const loaded = { id: doc.id, ...doc.data() };
                        setNewsList([loaded]);
                        setViewingNews(loaded);
                    } else {
                        showAlert('[錯誤] 找不到此電子報，可能已被刪除！');
                    }
                    setLoading(false);
                }, err => {
                    console.warn("特定報紙監聽延遲:", err.message);
                    setLoading(false);
                });
            } else {
                unsubNews = window.db.collection('newsletters')
                .orderBy('createdAt', 'desc')
                .limit(5) 
                .onSnapshot(snap => {
                    if (!isMounted) return;
                    const data = snap.docs.map(d => ({id: d.id, ...d.data()}));
                    window._cachedNews = data;
                    window._hasLoadedNews = true; 
                    setNewsList(data);
                    setLoading(false);
                }, err => {
                    console.warn("電子報清單監聽延遲:", err.message);
                    setLoading(false);
                });

                unsubEvents = window.db.collection('calendarEvents').orderBy('date', 'asc').onSnapshot(snap => {
                    if (!isMounted) return;
                    const data = snap.docs.map(d => ({id: d.id, ...d.data()}));
                    window._cachedEvents = data;
                    setEvents(data);
                }, err => console.warn("行事曆監聽延遲:", err.message));
            }
        };
        
        loadData();
        return () => { isMounted = false; unsubNews(); unsubEvents(); unsubCats(); };
    }, [targetNewsId]);

    useEffect(() => {
        if (!viewingNews) return;
        
        setHasClaimed(true); 
        setIsClaiming(false);

        let unsubComments = () => {};
        
        if (user) {
            const checkClaim = async () => {
                const doc = await window.db.collection('users').doc(user.uid).collection('newsRewards').doc(viewingNews.id).get();
                setHasClaimed(doc.exists); 
            };
            checkClaim();
        }

        unsubComments = window.db.collection('newsletters').doc(viewingNews.id).collection('comments').orderBy('createdAt', 'asc').onSnapshot(snap => {
            setNewsComments(snap.docs.map(d => ({id: d.id, ...d.data()})));
        });

        return () => unsubComments();
    }, [viewingNews, user]);

    const toggleSub = async (cat) => {
        if (!user || cat === '未分類') return;
        let newSubs = [...subs];
        if (newSubs.includes(cat)) newSubs = newSubs.filter(c => c !== cat);
        else newSubs.push(cat);
        setSubs(newSubs);
        await window.db.collection('users').doc(user.uid).update({ subscriptions: newSubs });
    };

    const handleAddCategory = () => {
        showPrompt('請輸入新的電子報分類名稱：', '', async (val) => {
            if (val && !categories.includes(val)) {
                await window.db.collection('settings').doc('newspaper').update({
                    categories: window.firebase.firestore.FieldValue.arrayUnion(val)
                });
                showAlert('[成功] 分類新增成功！');
            }
        });
    };

    const saveNews = async () => {
        if (!newsTitle || !newsContent) return showAlert('[提示] 標題與內容為必填！');
        const data = {
            title: newsTitle,
            category: newsCat || '未分類',
            content: newsContent,
            embeddedQaId,
            embeddedQuizCode,
            rewardType,
            rewardVal1,
            rewardVal2,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        if (editingId) {
            await window.db.collection('newsletters').doc(editingId).update(data);
            showAlert('[成功] 報紙更新成功！');
        } else {
            data.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
            data.likes = [];
            await window.db.collection('newsletters').add(data);
            showAlert('[成功] 報紙發佈成功！');
        }
        closeEditor();
    };

    const saveEvent = async () => {
        if (!eventTitle || !eventDate) return showAlert('[提示] 標題與日期為必填！');
        const data = { title: eventTitle, date: eventDate, category: eventCat, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() };
        if (editingId) {
            await window.db.collection('calendarEvents').doc(editingId).update(data);
            showAlert('[成功] 考試日程更新成功！');
        } else {
            await window.db.collection('calendarEvents').add(data);
            showAlert('[成功] 考試日程新增成功！');
        }
        closeEditor();
    };

    const deleteNews = (id) => { showConfirm('確定刪除這篇報紙？無法復原！', async () => { await window.db.collection('newsletters').doc(id).delete(); if(viewingNews?.id === id) setViewingNews(null); }); };
    const deleteEvent = (id) => { showConfirm('確定刪除這個考試日程？', async () => await window.db.collection('calendarEvents').doc(id).delete()); };

    const openNewsEditor = (news = null) => {
        setEditMode('news');
        if (news) {
            setEditingId(news.id); setNewsTitle(news.title); setNewsCat(news.category);
            setNewsContent(news.content); setEmbeddedQaId(news.embeddedQaId || '');
            setEmbeddedQuizCode(news.embeddedQuizCode || '');
            setRewardType(news.rewardType || 'none'); setRewardVal1(news.rewardVal1 || ''); setRewardVal2(news.rewardVal2 || '');
        } else {
            setEditingId(null); setNewsTitle(''); setNewsCat(categories[0]);
            setNewsContent(''); setEmbeddedQaId(''); setEmbeddedQuizCode('');
            setRewardType('none'); setRewardVal1(''); setRewardVal2('');
        }
        setShowEditor(true);
    };

    const openEventEditor = (ev = null) => {
        setEditMode('event');
        if (ev) { setEditingId(ev.id); setEventTitle(ev.title); setEventDate(ev.date); setEventCat(ev.category); } 
        else { setEditingId(null); setEventTitle(''); setEventDate(''); setEventCat(categories[0]); }
        setShowEditor(true);
    };

    const closeEditor = () => { setShowEditor(false); setEditMode(''); setEditingId(null); };

    const toggleLike = async () => {
        if (!user) return onRequireLogin && onRequireLogin();
        const likes = viewingNews.likes || [];
        const isLiked = likes.includes(user.uid);
        
        setViewingNews(prev => ({ ...prev, likes: isLiked ? prev.likes.filter(id => id !== user.uid) : [...(prev.likes || []), user.uid] }));
        
        if (isLiked) {
            await window.db.collection('newsletters').doc(viewingNews.id).update({ likes: window.firebase.firestore.FieldValue.arrayRemove(user.uid) });
        } else {
            await window.db.collection('newsletters').doc(viewingNews.id).update({ likes: window.firebase.firestore.FieldValue.arrayUnion(user.uid) });
        }
    };

    const postComment = async () => {
        if (!newComment.trim()) return showAlert("[提示] 請輸入留言內容！");
        if (!user) return onRequireLogin && onRequireLogin();
        await window.db.collection('newsletters').doc(viewingNews.id).collection('comments').add({
            uid: user.uid,
            userName: userProfile.displayName || '匿名讀者',
            text: newComment.trim(),
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        setNewComment('');
    };

    const claimReward = async () => {
        if (hasClaimed || isClaiming || !user || !viewingNews.rewardType || viewingNews.rewardType === 'none') return;
        
        setIsClaiming(true);

        try {
            const safetyCheck = await window.db.collection('users').doc(user.uid).collection('newsRewards').doc(viewingNews.id).get();
            if (safetyCheck.exists) {
                setHasClaimed(true); 
                setIsClaiming(false);
                return showAlert("[警告] 系統偵測到您已領取過此獎勵囉！");
            }
        } catch (e) {
            setIsClaiming(false);
            return;
        }
        
        setIsClaiming(true);
        
        let amount = 0;
        if (viewingNews.rewardType === 'fixed') {
            amount = Number(viewingNews.rewardVal1) || 0;
        } else if (viewingNews.rewardType === 'random') {
            const min = Number(viewingNews.rewardVal1) || 0;
            const max = Number(viewingNews.rewardVal2) || 0;
            amount = Math.floor(Math.random() * (max - min + 1)) + min;
        }

        if (amount > 0) {
            setHasClaimed(true); 
            showAlert(`[恭喜] 你${viewingNews.rewardType === 'random' ? '抽中' : '獲得'}了 ${amount} 閱讀獎勵！`);

            const rewardRef = window.db.collection('users').doc(user.uid).collection('newsRewards').doc(viewingNews.id);
            
            rewardRef.set({
                claimedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                amount: amount
            }).then(() => {
                return window.db.collection('users').doc(user.uid).set({
                    mcData: { diamonds: window.firebase.firestore.FieldValue.increment(amount) }
                }, { merge: true });
            }).catch(e => {
                console.error("獎勵背景同步失敗", e);
                setHasClaimed(false);
            });
        }
        setIsClaiming(false);
    };

    const handleShareNews = (news) => {
        const url = `${window.location.origin}/?newsId=${news.id}`;
        const text = `[推薦] JJay 日報\n【${news.category}】${news.title}\n\n點擊下方連結，立即閱讀完整內容！\n${url}`;
        navigator.clipboard.writeText(text);
        showAlert(`[成功] 已複製電子報專屬連結與文案！快貼給朋友吧！`);
    };

    const displayedNews = activeFeedTab === 'subscribed' ? newsList.filter(n => subs.includes(n.category) || isAdmin) : newsList;

    return (
        <div className={`max-w-[1600px] w-full mx-auto p-4 h-full overflow-y-auto custom-scrollbar w-full ${targetNewsId ? 'bg-[#FCFBF7] dark:bg-stone-900 border-4 border-black' : ''}`}>
            
           <div className="flex flex-wrap justify-between items-center mb-6 border-b-2 border-black dark:border-white pb-2 gap-3 shrink-0">
                <h1 className="text-2xl font-black dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-[28px]">newspaper</span> JJay 日報</h1>
                {targetNewsId && !user && (
                    <button onClick={() => onClose ? onClose() : window.history.replaceState({}, '', window.location.pathname)} className="text-gray-500 font-bold text-sm hover:text-stone-800 dark:hover:text-white transition-colors">
                        ⬅ 返回首頁
                    </button>
                )}
                {isAdmin && !targetNewsId && (
                    <div className="flex gap-2">
                        <button onClick={handleAddCategory} className="bg-stone-100 text-stone-800 px-3 py-1 text-sm font-bold border border-black rounded-2xl hover:bg-gray-300 transition-colors">+ 新增類別</button>
                        <button onClick={() => openEventEditor()} className="bg-stone-800 text-white px-3 py-1 text-sm font-bold rounded-2xl hover:bg-stone-800 transition-colors">+ 新增考試</button>
                        <button onClick={() => openNewsEditor()} className="bg-amber-600 text-white px-3 py-1 text-sm font-bold rounded-2xl hover:bg-amber-700 transition-colors">+ 發佈報紙</button>
                    </div>
                )}
            </div>

            {showEditor && (
                <div className="mb-8 p-6 bg-amber-50 dark:bg-stone-800 border-2 border-black dark:border-white rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-300 dark:border-gray-600 pb-2">
                        <h2 className="text-xl font-black dark:text-white flex items-center gap-2">
                            {editMode === 'news' ? (editingId ? <><span className="material-symbols-outlined text-[24px]">edit_document</span> 編輯報紙</> : <><span className="material-symbols-outlined text-[24px]">campaign</span> 發佈新報紙</>) : (editingId ? <><span className="material-symbols-outlined text-[24px]">edit_calendar</span> 編輯考試</> : <><span className="material-symbols-outlined text-[24px]">event_note</span> 新增考試</>)}
                        </h2>
                        <button onClick={closeEditor} className="text-gray-500 font-bold hover:text-red-500 flex items-center"><span className="material-symbols-outlined text-[20px]">close</span> 關閉</button>
                    </div>
                    
                    {editMode === 'news' ? (
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-600 dark:text-gray-300">報紙標題</label>
                            <input type="text" placeholder="例如：藥學週報 #12" value={newsTitle} onChange={e=>setNewsTitle(e.target.value)} className="w-full p-3 border border-black dark:bg-gray-700 dark:text-white rounded-2xl outline-none" />
                            
                            <label className="block text-sm font-bold text-gray-600 dark:text-gray-300">發佈類別 (頻道)</label>
                            <select value={newsCat} onChange={e=>setNewsCat(e.target.value)} className="w-full p-3 border border-black dark:bg-gray-700 dark:text-white rounded-2xl outline-none cursor-pointer">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            
                            <div className="flex justify-between items-end mt-4 mb-1">
                                <label className="block text-sm font-bold text-gray-600 dark:text-gray-300">報紙內容 (支援圖文與格式)</label>
                                <select value="" onChange={e => { 
                                    if(e.target.value) {
                                        const htmlBlock = `<div style="padding:12px; background-color:#eff6ff; border-left:4px solid #3b82f6; margin:10px 0; font-weight:bold; color:#1e40af;">[考試提醒]：【${e.target.value.split('|')[0]}】將於 ${e.target.value.split('|')[1]} 舉行！</div><p><br></p>`;
                                        setNewsContent(prev => prev + htmlBlock);
                                    }
                                }} className="p-1 border border-gray-300 text-xs dark:bg-gray-700 dark:text-white outline-none cursor-pointer">
                                    <option value="" disabled>[+] 嵌入近期考試方塊...</option>
                                    {events.map(ev => (
                                        <option key={ev.id} value={`${ev.title}|${ev.date.replace('T', ' ')}`}>{ev.title} ({ev.date})</option>
                                    ))}
                                </select>
                            </div>
                            <ContentEditableEditor 
                                value={newsContent} 
                                onChange={setNewsContent} 
                                placeholder="在此貼上文章內容或圖片，圖片將自動壓縮並上傳至雲端..." 
                                showAlert={showAlert} 
                            />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#FCFBF7] dark:bg-stone-900 p-4 border border-dashed border-gray-400">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">link</span> 嵌入快問快答 ID (選填)</label>
                                    <input type="text" placeholder="輸入 QA 的資料庫 ID" value={embeddedQaId} onChange={e=>setEmbeddedQaId(e.target.value)} className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white text-sm rounded-2xl outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">move_to_inbox</span> 嵌入試卷代碼 (選填)</label>
                                    <input type="text" placeholder="輸入 6 碼試卷代碼" value={embeddedQuizCode} onChange={e=>setEmbeddedQuizCode(e.target.value)} className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white text-sm rounded-2xl outline-none" />
                                </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-400 mt-4">
                                <label className="block text-sm font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">redeem</span> 閱讀獎勵設定 (放置於報紙最下方)</label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <select value={rewardType} onChange={e=>setRewardType(e.target.value)} className="p-2 border border-gray-300 rounded-2xl font-bold dark:bg-stone-800 dark:text-white">
                                        <option value="none">無獎勵</option>
                                        <option value="fixed">領取固定鑽石</option>
                                        <option value="random">隨機紅包 (區間)</option>
                                    </select>
                                    {rewardType === 'fixed' && <input type="number" placeholder="鑽石數量" value={rewardVal1} onChange={e=>setRewardVal1(e.target.value)} className="p-2 border border-gray-300 rounded-2xl w-32" />}
                                    {rewardType === 'random' && (
                                        <div className="flex items-center gap-2">
                                            <input type="number" placeholder="最小" value={rewardVal1} onChange={e=>setRewardVal1(e.target.value)} className="p-2 border border-gray-300 rounded-2xl w-24" />
                                            <span>~</span>
                                            <input type="number" placeholder="最大" value={rewardVal2} onChange={e=>setRewardVal2(e.target.value)} className="p-2 border border-gray-300 rounded-2xl w-24" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <button onClick={saveNews} className="w-full bg-amber-600 text-white font-black py-3 text-lg rounded-2xl hover:bg-amber-700 transition-colors shadow-sm mt-4 flex items-center justify-center gap-2"><span className="material-symbols-outlined">publish</span> 發佈報紙</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-600 dark:text-gray-300">考試名稱</label>
                            <input type="text" placeholder="例如: 藥理學期中考" value={eventTitle} onChange={e=>setEventTitle(e.target.value)} className="w-full p-3 border border-black dark:bg-gray-700 dark:text-white rounded-2xl outline-none" />
                            <label className="block text-sm font-bold text-gray-600 dark:text-gray-300">考試日期與時間</label>
                            <input type="datetime-local" value={eventDate} onChange={e=>setEventDate(e.target.value)} className="w-full p-3 border border-black dark:bg-gray-700 dark:text-white rounded-2xl outline-none cursor-pointer" />
                            <label className="block text-sm font-bold text-gray-600 dark:text-gray-300">所屬類別</label>
                            <select value={eventCat} onChange={e=>setEventCat(e.target.value)} className="w-full p-3 border border-black dark:bg-gray-700 dark:text-white rounded-2xl outline-none cursor-pointer">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button onClick={saveEvent} className="w-full bg-emerald-600 text-white font-black py-3 text-lg rounded-2xl hover:bg-emerald-700 transition-colors shadow-sm mt-4 flex items-center justify-center gap-2"><span className="material-symbols-outlined">save</span> 儲存考試</button>
                        </div>
                    )}
                </div>
            )}

            {!viewingNews && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        {!targetNewsId && user && (
                            <div className="flex border-b-2 border-stone-200 dark:border-stone-700 mb-4">
                                <button onClick={() => setActiveFeedTab('subscribed')} className={`pb-2 px-4 font-black text-lg transition-colors flex items-center gap-2 ${activeFeedTab === 'subscribed' ? 'border-b-4 border-black dark:border-white text-stone-800 dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                                    <span className="material-symbols-outlined text-[20px]">rss_feed</span> 我的訂閱頻道
                                </button>
                                <button onClick={() => setActiveFeedTab('all')} className={`pb-2 px-4 font-black text-lg transition-colors flex items-center gap-2 ${activeFeedTab === 'all' ? 'border-b-4 border-black dark:border-white text-stone-800 dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                                    <span className="material-symbols-outlined text-[20px]">explore</span> 探索所有文章
                                </button>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-16 bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                                <div className="w-12 h-12 border-4 border-stone-200 dark:border-gray-600 border-t-black dark:border-white rounded-full animate-spin mb-4"></div>
                                <div className="text-gray-500 font-bold animate-pulse">電子報派送中...</div>
                            </div>
                        ) : displayedNews.length === 0 ? (
                            <div className="text-gray-500 font-bold p-10 text-center bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 shadow-sm rounded-2xl">目前沒有電子報。</div>
                        ) : (
                            displayedNews.map(news => {
                                const tmp = document.createElement('div');
                                tmp.innerHTML = news.content || '';
                                let plainText = tmp.textContent || tmp.innerText || '';
                                if (plainText.length > 80) plainText = plainText.substring(0, 80) + '...';

                                return (
                                    <div key={news.id} onClick={() => setViewingNews(news)} className="bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 cursor-pointer hover:shadow-xl hover:border-amber-400 hover:-tranamber-y-1 transition-all duration-300 group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-black bg-stone-800 dark:bg-stone-700 text-amber-400 px-3 py-1 rounded-full tracking-widest shadow-sm">{news.category}</span>
                                            <span className="text-xs text-gray-500 font-bold">{news.createdAt?.toDate().toLocaleDateString('zh-TW')}</span>
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-black mb-2 dark:text-white group-hover:text-amber-600 transition-colors">{news.title}</h2>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm font-bold mb-4">{plainText}</p>
                                        
                                        <div className="flex justify-between items-center border-t border-gray-100 dark:border-stone-700 pt-3">
                                            <div className="flex gap-4">
                                                <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">favorite</span> {news.likes?.length || 0}</span>
                                                <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">chat_bubble</span> 留言</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {news.rewardType && news.rewardType !== 'none' && <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 border border-amber-300 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">redeem</span> 獎勵</span>}
                                                {(news.embeddedQaId || news.embeddedQuizCode) && <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 border border-amber-300 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">quiz</span> 測驗</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {!targetNewsId && user && (
                        <div className="lg:col-span-1">
                            <div className="bg-gray-50 dark:bg-stone-800 border-2 border-black dark:border-gray-600 p-5 rounded-2xl mb-6">
                                <h3 className="font-black mb-3 text-sm dark:text-white flex items-center gap-2"><span className="material-symbols-outlined">rss_feed</span> 頻道訂閱管理</h3>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(cat => {
                                        if (cat === '未分類') return null;
                                        return (
                                            <label key={cat} className={`flex items-center space-x-1 cursor-pointer px-2 py-1 border transition-colors ${subs.includes(cat) ? 'bg-stone-800 text-white border-black' : 'bg-[#FCFBF7] text-gray-600 border-gray-300 hover:bg-stone-50'}`}>
                                                <input type="checkbox" checked={subs.includes(cat)} onChange={() => toggleSub(cat)} className="hidden" />
                                                <span className="font-bold text-[10px] flex items-center gap-1">{subs.includes(cat) ? <span className="material-symbols-outlined text-[12px]">check</span> : '+'} {cat}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-[#FCFBF7] dark:bg-stone-800 border-2 border-black dark:border-gray-600 p-5 rounded-2xl shadow-xl sticky top-4">
                                <h2 className="text-xl font-black mb-5 flex items-center border-b-2 border-black dark:border-gray-600 pb-2 dark:text-white tracking-widest gap-2"><span className="material-symbols-outlined">calendar_month</span> 考試行事曆</h2>
                                <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                                    {events.filter(e => subs.includes(e.category) || isAdmin).length === 0 ? (
                                        <div className="text-sm text-gray-500 font-bold text-center py-4 border border-dashed border-gray-300">近期無考試安排。</div>
                                    ) : (
                                        events.filter(e => subs.includes(e.category) || isAdmin).map(ev => {
                                            const daysLeft = Math.ceil((new Date(ev.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                            const isPast = daysLeft < 0;
                                            return (
                                                <div key={ev.id} className={`p-4 border-l-4 border border-gray-100 dark:border-stone-700 relative ${isPast ? 'border-l-gray-400 bg-gray-50 dark:bg-stone-900 opacity-50' : (daysLeft <= 7 ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20' : 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20')}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] font-black text-white bg-gray-400 px-1.5 py-0.5">{ev.category}</span>
                                                        {isAdmin && <button onClick={() => deleteEvent(ev.id)} className="text-[10px] text-red-600 font-bold px-1 border flex items-center"><span className="material-symbols-outlined text-[12px]">delete</span></button>}
                                                    </div>
                                                    <div className={`font-black text-sm ${isPast ? 'line-through text-gray-500' : 'dark:text-white'}`}>{ev.title}</div>
                                                    <div className={`text-xs mt-1 font-black ${isPast ? 'text-gray-400' : (daysLeft <= 7 ? 'text-red-600' : 'text-amber-600')}`}>
                                                        {ev.date} {isPast ? '(已結束)' : `(倒數 ${daysLeft} 天)`}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {viewingNews && (
                <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 animate-fade-in">
                    <div className="bg-stone-50 dark:bg-stone-900 w-full max-w-3xl h-[95vh] rounded-3xl relative shadow-2xl border border-stone-200 dark:border-stone-700 flex flex-col overflow-hidden">
                        
                        <div className="bg-stone-800 dark:bg-stone-950 text-amber-50 px-5 py-4 flex justify-between items-center shrink-0 shadow-md z-10 border-b border-stone-700">
                            <h2 className="text-lg font-black truncate pr-4 text-amber-400 flex items-center gap-2"><span className="material-symbols-outlined">article</span> {viewingNews.title}</h2>
                            <button onClick={() => setViewingNews(null)} className="text-xl hover:text-amber-200 font-bold transition-colors flex items-center"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <div className="p-4 sm:p-8 flex-grow overflow-y-auto custom-scrollbar relative">
                            <div className="flex justify-between items-end mb-6 border-b border-stone-200 dark:border-stone-700 pb-4">
                                <div>
                                    <span className="text-xs font-black bg-stone-100 text-stone-800 px-2 py-1 tracking-widest mr-2">{viewingNews.category}</span>
                                    <span className="text-xs text-gray-500 font-bold">{viewingNews.createdAt?.toDate().toLocaleDateString('zh-TW')}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleShareNews(viewingNews)} className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">share</span> 分享</button>
                                    {isAdmin && <button onClick={() => { setViewingNews(null); openNewsEditor(viewingNews); }} className="text-xs font-bold text-amber-700600 bg-amber-70050 border border-amber-700200 px-2 py-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">edit</span> 編輯</button>}
                                    {isAdmin && <button onClick={() => deleteNews(viewingNews.id)} className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">delete</span> 刪除</button>}
                                </div>
                            </div>

                            <style dangerouslySetInnerHTML={{__html: `
.news-rich-text { background-color: white !important; color: black !important; padding: 20px; border: 1px solid #ddd; }
.news-rich-text * { color: black !important; } 
.news-rich-text img { max-width: 100%; height: auto; display: block; margin: 10px auto; border: 1px solid #ccc; }
.news-rich-text p { margin-bottom: 1em; }
                            `}} />
                            <div className="news-rich-text text-gray-800 dark:text-gray-200 text-base leading-relaxed mb-8 font-medium" dangerouslySetInnerHTML={{ __html: viewingNews.content }}></div>

                            {(viewingNews.embeddedQaId || viewingNews.embeddedQuizCode) && (
                                <div className="bg-amber-50 dark:bg-stone-800 p-4 border-2 border-dashed border-amber-300 dark:border-gray-600 mb-8 flex flex-col sm:flex-row gap-4">
                                    {viewingNews.embeddedQaId && (
                                        <button onClick={() => {
                                            if (!user) return onRequireLogin && onRequireLogin();
                                            window.location.href = `/?qaId=${viewingNews.embeddedQaId}`;
                                        }} className="flex-1 bg-stone-600100 border border-rose-500 text-stone-600700 font-black py-3 hover:bg-stone-600200 transition-colors rounded-2xl shadow-sm flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined">bolt</span> 挑戰相關快問快答
                                        </button>
                                    )}
                                    {viewingNews.embeddedQuizCode && (
                                        <button onClick={() => {
                                            if (!user) return onRequireLogin && onRequireLogin();
                                            navigator.clipboard.writeText(viewingNews.embeddedQuizCode);
                                            showAlert(`[成功] 已複製試卷代碼: ${viewingNews.embeddedQuizCode}\n\n請前往「我的題庫」，點擊「輸入代碼」下載此測驗卷！`);
                                        }} className="flex-1 bg-[#FCFBF7] border border-amber-400 text-amber-700 font-black py-3 hover:bg-amber-50 transition-colors rounded-2xl shadow-sm flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined">move_to_inbox</span> 領取試卷 ({viewingNews.embeddedQuizCode})
                                        </button>
                                    )}
                                </div>
                            )}

                            {viewingNews.rewardType && viewingNews.rewardType !== 'none' && (
                                <div className="mt-10 mb-8 p-6 bg-amber-50 dark:bg-amber-900/20 border-4 border-amber-400 text-center shadow-inner">
                                    <h3 className="text-xl font-black text-amber-800 dark:text-amber-400 mb-2 flex items-center justify-center gap-2"><span className="material-symbols-outlined">redeem</span> 專屬閱讀獎勵</h3>
                                   {!user ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <p className="font-bold text-gray-500">請登入以領取專屬獎勵。</p>
                                            <button onClick={() => onRequireLogin && onRequireLogin()} className="bg-stone-800 text-white px-8 py-3 font-black text-lg rounded-2xl hover:bg-stone-800 transition-colors shadow-xl active:shadow-none active:tranamber-x-1 active:tranamber-y-1 flex items-center gap-2">
                                                <span className="material-symbols-outlined">login</span> 立即登入解鎖鑽石
                                            </button>
                                        </div>
                                    ) : hasClaimed ? (
                                        <p className="font-bold text-emerald-600 text-lg flex items-center justify-center gap-2"><span className="material-symbols-outlined">check_circle</span> 你已成功領取此篇的閱讀獎勵！</p>
                                    ) : (
                                        <>
                                            <p className="text-sm font-bold text-amber-700 dark:text-amber-500 mb-4">感謝你的閱讀！點擊下方按鈕領取獎勵鑽石。</p>
                                            <button 
                                                onClick={claimReward} 
                                                disabled={isClaiming} 
                                                className={`bg-amber-400 hover:bg-amber-500 text-stone-800 font-black px-8 py-3 shadow-xl active:shadow-none active:tranamber-x-1 active:tranamber-y-1 transition-all flex items-center justify-center gap-2 mx-auto ${isClaiming ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {isClaiming ? '處理中...' : (viewingNews.rewardType === 'fixed' ? <><span className="material-symbols-outlined">diamond</span> 立即領取 {viewingNews.rewardVal1} 鑽石</> : <><span className="material-symbols-outlined">redeem</span> 抽取隨機鑽石紅包</>)}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="border-t-2 border-stone-200 dark:border-stone-700 pt-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <button onClick={toggleLike} className={`font-black px-6 py-2 border-2 transition-colors flex items-center gap-2 ${viewingNews.likes?.includes(user?.uid) ? 'bg-stone-600100 border-stone-600500 text-stone-600700' : 'bg-stone-50 dark:bg-stone-800 border-gray-300 dark:border-gray-600 hover:bg-stone-100 dark:hover:bg-gray-700 dark:text-white'}`}>
                                        <span className="material-symbols-outlined">{viewingNews.likes?.includes(user?.uid) ? 'favorite' : 'favorite_border'}</span> {viewingNews.likes?.includes(user?.uid) ? '已按讚' : '給個讚'} ({viewingNews.likes?.length || 0})
                                    </button>
                                </div>

                                <h4 className="font-black mb-4 dark:text-white text-lg flex items-center gap-2"><span className="material-symbols-outlined">forum</span> 讀者留言區</h4>
                                <div className="space-y-3 mb-6">
                                    {newsComments.length === 0 ? <p className="text-sm text-gray-400 font-bold">還沒有人留言，來搶頭香吧！</p> : 
                                        newsComments.map(c => (
                                            <div key={c.id} className="bg-gray-50 dark:bg-stone-800 p-4 border border-stone-200 dark:border-stone-700 rounded-2xl">
                                                <div className="flex justify-between text-xs text-gray-500 mb-2">
                                                    <span className="font-bold text-amber-600 dark:text-amber-400">{c.userName}</span>
                                                    <span>{c.createdAt?.toDate().toLocaleString('zh-TW')}</span>
                                                </div>
                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{c.text}</p>
                                            </div>
                                        ))
                                    }
                                </div>
                                
                                {user ? (
                                    <div className="flex gap-2">
                                        <textarea value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="分享你的想法..." className="flex-grow p-3 border-2 border-gray-300 dark:border-gray-600 bg-[#FCFBF7] text-stone-800 rounded-2xl text-sm outline-none resize-none h-12 custom-scrollbar font-bold focus:border-black dark:focus:border-white" />
                                        <button onClick={postComment} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-6 font-black rounded-2xl transition-colors hover:bg-stone-800 dark:hover:bg-[#FCFBF7]">送出</button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => onRequireLogin && onRequireLogin()} 
                                        className="w-full flex justify-center items-center gap-2 text-center font-bold text-gray-600 dark:text-gray-300 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 transition-colors rounded-2xl"
                                    >
                                        <span className="material-symbols-outlined">lock</span> 登入後即可參與留言討論，點此快速登入
                                    </button>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
