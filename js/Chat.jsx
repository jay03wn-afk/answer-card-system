// --- 大頭照動態載入組件 ---
const UserAvatar = ({ uid, name, className }) => {
    const [avatar, setAvatar] = useState(null);
    useEffect(() => {
        // 從資料庫獲取大頭照
        window.db.collection('users').doc(uid).get().then(doc => {
            if (doc.exists && doc.data().avatar) {
                setAvatar(doc.data().avatar);
            }
        }).catch(e => console.log(e));
    }, [uid]);

    if (avatar) {
        return <img src={avatar} className={`${className} object-cover`} alt={name} />;
    }
    return (
        <div className={`${className} flex items-center justify-center font-bold text-gray-500 dark:text-gray-300`}>
            {name ? name.charAt(0) : '?'}
        </div>
    );
};

// --- 聊天室與系統 ---
function SocialDashboard({ user, userProfile, showAlert, showPrompt }) {
    const friends = userProfile.friends || [];
    const [searchQuery, setSearchQuery] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [activeProfile, setActiveProfile] = useState(null); // ✨ 新增：控制右側個人檔案顯示
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [previewImg, setPreviewImg] = useState(null);
    
    const messagesEndRef = useRef(null);
    const chatInputRef = useRef(null); 
    const fileInputRef = useRef(null);
    
    const [messageLimit, setMessageLimit] = useState(15); // 放寬至 15 條
    const [lastMsgIdForScroll, setLastMsgIdForScroll] = useState(null);

    const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

    // ✨ 新增：限時動態狀態 (群組化每個人的全部考題)
    const [friendsQAGroups, setFriendsQAGroups] = useState([]);

    // 1. 自動生成數位 ID (10碼)
    useEffect(() => {
        if (user && !userProfile.numericId) {
            const newId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
            window.db.collection('users').doc(user.uid).update({ numericId: newId });
        }
    }, [user, userProfile]);

    // 2. 監聽好友申請
    useEffect(() => {
        if (!user) return;
        return window.db.collection('users').doc(user.uid).collection('friendRequests')
            .onSnapshot(snap => {
                setPendingRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
    }, [user]);

    useEffect(() => {
        if (!friends || friends.length === 0) {
            setFriendsQAGroups([]);
            return;
        }
        const friendUids = friends.map(f => f.uid);
        
        // ✨ 加入錯誤攔截器，避免權限切換瞬間產生的紅字導致整個畫面崩潰
        const unsub = window.db.collection('fastQA')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snap => {
                const now = Date.now();
                const qas = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(q => q.endTime > now && friendUids.includes(q.creatorUid));
                
                const groups = {};
                qas.forEach(q => {
                    if (!groups[q.creatorUid]) {
                        groups[q.creatorUid] = { 
                            creatorUid: q.creatorUid, 
                            creatorName: q.creatorName, 
                            qaIds: [] 
                        };
                    }
                    groups[q.creatorUid].qaIds.push(q.id);
                });
                setFriendsQAGroups(Object.values(groups));
            }, err => {
                console.warn("限時動態讀取中斷 (可忽略的權限重置):", err.message);
            });
            
        return () => unsub();
    }, [friends]);

    useEffect(() => {
        if (activeChat && userProfile && userProfile.unreadChats && userProfile.unreadChats[activeChat.uid]) {
            db.collection('users').doc(user.uid).update({
                [`unreadChats.${activeChat.uid}`]: firebase.firestore.FieldValue.delete()
            }).catch(e => console.error("清除紅點失敗", e));
        }
    }, [activeChat, userProfile, user.uid]);

    useEffect(() => {
        if(!activeChat) return;
        const chatId = getChatId(user.uid, activeChat.uid);
        const unsub = db.collection('chats').doc(chatId).collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(messageLimit)
            .onSnapshot(snapshot => {
                const now = Date.now();
                const msgs = [];
                
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.type === 'image' && data.expiresAt && data.expiresAt < now) {
                        doc.ref.delete().catch(e => console.error("刪除圖片失敗", e));
                    } else {
                        msgs.push({ id: doc.id, ...data });
                    }
                });
                
                const reversedMsgs = msgs.reverse();
                setMessages(reversedMsgs);
                
                const unreadDocs = snapshot.docs.filter(doc => doc.data().senderId !== user.uid && !doc.data().read);
                if (unreadDocs.length > 0) {
                    const batch = db.batch();
                    unreadDocs.forEach(doc => {
                        batch.update(doc.ref, { read: true });
                    });
                    batch.commit().catch(e => console.error("更新已讀狀態失敗", e));
                }

                if (reversedMsgs.length > 0) {
                    const latestMsgId = reversedMsgs[reversedMsgs.length - 1].id;
                    if (latestMsgId !== lastMsgIdForScroll || messageLimit === 5) {
                        setLastMsgIdForScroll(latestMsgId);
                        setTimeout(() => {
                            if (messagesEndRef.current) {
                                messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
                            }
                        }, 100);
                    }
                }
            });

        const cleanupInterval = setInterval(() => {
            setMessages(prev => prev.filter(m => !(m.type === 'image' && m.expiresAt && m.expiresAt < Date.now())));
        }, 60000);

        return () => {
            unsub();
            clearInterval(cleanupInterval);
        };
    }, [activeChat, user.uid, messageLimit]);

    // 3. 搜尋好友 (電子信箱或 10 碼 ID)
    const handleSearch = async () => {
        if (!searchQuery) return;
        setIsSearching(true);
        try {
            let userDoc = null;
            if (searchQuery.includes('@')) {
                const snap = await window.db.collection('users').where('email', '==', searchQuery).get();
                if (!snap.empty) userDoc = snap.docs[0];
            } else {
                const snap = await window.db.collection('users').where('numericId', '==', searchQuery).get();
                if (!snap.empty) userDoc = snap.docs[0];
            }

            if (userDoc) {
                setFoundUser({ uid: userDoc.id, ...userDoc.data() });
            } else {
                showAlert('找不到該用戶，請檢查 ID 或 Email 是否正確。');
            }
        } catch (e) { showAlert('搜尋出錯：' + e.message); }
        setIsSearching(false);
    };

    // ✨ 新增：查看好友個人檔案 (解決 viewUserProfile is not defined)
    const viewUserProfile = async (uid) => {
        try {
            const doc = await window.db.collection('users').doc(uid).get();
            if (doc.exists) {
                setActiveProfile({ uid: doc.id, ...doc.data() });
                setActiveChat(null); // 關閉聊天室，顯示個人檔案
            }
        } catch (e) { console.error(e); }
    };

    // 4. 送出好友申請
    const sendFriendRequest = async (targetUser) => {
        if (targetUser.uid === user.uid) return showAlert('不能加自己為好友！');
        if (userProfile.friends?.some(f => f.uid === targetUser.uid)) return showAlert('你們已經是好友了。');

        try {
            await window.db.collection('users').doc(targetUser.uid).collection('friendRequests').doc(user.uid).set({
                fromUid: user.uid,
                fromName: userProfile.displayName || '匿名用戶',
                fromEmail: user.email,
                fromAvatar: userProfile.avatar || '',
                timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
            });
            showAlert('好友申請已送出！等待對方確認。');
            setFoundUser(null);
            setSearchQuery('');
        } catch (e) { showAlert('申請失敗：' + e.message); }
    };

    // 同意好友申請
    const acceptRequest = async (req) => {
        try {
            const batch = window.db.batch();
            batch.update(window.db.collection('users').doc(user.uid), {
                friends: window.firebase.firestore.FieldValue.arrayUnion({ uid: req.fromUid, name: req.fromName, email: req.fromEmail })
            });
            batch.update(window.db.collection('users').doc(req.fromUid), {
                friends: window.firebase.firestore.FieldValue.arrayUnion({ uid: user.uid, name: userProfile.displayName, email: user.email })
            });
            batch.delete(window.db.collection('users').doc(user.uid).collection('friendRequests').doc(req.fromUid));
            await batch.commit();
            showAlert(`已加入 ${req.fromName} 為好友！`);
        } catch (e) { showAlert('加入失敗：' + e.message); }
    };

    // 拒絕好友申請
    const rejectRequest = async (req) => {
        try {
            await window.db.collection('users').doc(user.uid).collection('friendRequests').doc(req.fromUid).delete();
        } catch (e) { console.error(e); }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if(!newMessage.trim() || !activeChat) return;
        const chatId = getChatId(user.uid, activeChat.uid);
        db.collection('chats').doc(chatId).collection('messages').add({
            text: newMessage.trim(),
            senderId: user.uid,
            senderName: userProfile.displayName,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'text',
            read: false
        }).then(() => {
            setNewMessage('');
            db.collection('users').doc(activeChat.uid).set({
                unreadChats: { [user.uid]: true }
            }, { merge: true });
            
            setTimeout(() => {
                if (chatInputRef.current) chatInputRef.current.focus();
            }, 10);
        });
    };

    // 5. 開放圖片上傳並限制 5 張過期機制
    const handleImageUpload = (e) => {
        if (!activeChat) return;
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                let w = img.width;
                let h = img.height;
                const MAX_DIM = 800; 
                if (w > h && w > MAX_DIM) {
                    h *= MAX_DIM / w;
                    w = MAX_DIM;
                } else if (h > MAX_DIM) {
                    w *= MAX_DIM / h;
                    h = MAX_DIM;
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5); 

                const chatId = getChatId(user.uid, activeChat.uid);
                
                try {
                    // 執行圖片過期機制：找出這個聊天室的所有圖片，如果即將超過 5 張，將最舊的標記為過期
                    const chatRef = window.db.collection('chats').doc(chatId).collection('messages');
                    const imgSnap = await chatRef.where('type', '==', 'image').orderBy('timestamp', 'desc').limit(5).get();
                    
                    if (imgSnap.size >= 5) {
                         const oldDocs = imgSnap.docs.slice(4); // 取得第5張之後的舊圖片
                         const batch = window.db.batch();
                         oldDocs.forEach(d => batch.update(d.ref, { expired: true, text: '(圖片已過期)' }));
                         await batch.commit();
                    }

                    await chatRef.add({
                        type: 'image',
                        imageUrl: compressedBase64,
                        senderId: user.uid,
                        senderName: userProfile.displayName,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        expiresAt: Date.now() + 10 * 60 * 1000, // 依然保留 10 分鐘閱後即焚機制
                        read: false,
                        expired: false
                    });
                    
                    db.collection('users').doc(activeChat.uid).set({
                        unreadChats: { [user.uid]: true }
                    }, { merge: true });
                } catch (err) {
                    showAlert("圖片上傳失敗：" + err.message);
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = ''; 
    };

    const playRPS = () => {
        if(!activeChat) return;
        const choices = [
            { icon: 'back_hand', name: '石頭' },
            { icon: 'content_cut', name: '剪刀' },
            { icon: 'front_hand', name: '布' }
        ];
        const result = choices[Math.floor(Math.random() * choices.length)];
        const chatId = getChatId(user.uid, activeChat.uid);
        
        db.collection('chats').doc(chatId).collection('messages').add({
            text: `出了 ${result.name}`,
            senderId: user.uid,
            senderName: userProfile.displayName,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'game_rps',
            rpsIcon: result.icon,
            read: false
        }).then(() => {
            db.collection('users').doc(activeChat.uid).set({
                unreadChats: { [user.uid]: true }
            }, { merge: true });
        });
    };

    // 更新：贈送鑽石系統 (加入每日額度限制)
    const sendGift = () => {
        if(!activeChat) return;
        const today = new Date().toISOString().split('T')[0];
        const currentDiamonds = userProfile?.mcData?.diamonds || 0;
        const myMcData = userProfile?.mcData || {};
        
        let myGiftData = myMcData.giftData || { date: '', amount: 0 };
        if (myGiftData.date !== today) myGiftData = { date: today, amount: 0 };
        
        const remainingGiftQuota = Math.max(0, 100 - myGiftData.amount);

        showPrompt(`請輸入要贈送的鑽石數量\n(目前擁有: ${currentDiamonds} 💎 | 今日剩餘額度: ${remainingGiftQuota}/100 💎)：`, "10", (amount) => {
            const giftAmount = parseInt(amount, 10);
            if (isNaN(giftAmount) || giftAmount <= 0) return showAlert('請輸入有效的數字！');
            if (giftAmount > currentDiamonds) return showAlert('鑽石餘額不足！趕快去簽到或做測驗賺取吧。');
            if (myGiftData.amount + giftAmount > 100) return showAlert(`送禮失敗！\n您今日的收發額度已超過上限 (剩餘: ${remainingGiftQuota} 💎)`);

            // 檢查對方的額度
            db.collection('users').doc(activeChat.uid).get().then(doc => {
                if(doc.exists) {
                    const friendMcData = doc.data().mcData || { diamonds: 0, level: 1, exp: 0, hunger: 10, items: [], cats: 0 };
                    let friendGiftData = friendMcData.giftData || { date: '', amount: 0 };
                    if (friendGiftData.date !== today) friendGiftData = { date: today, amount: 0 };
                    
                    if (friendGiftData.amount + giftAmount > 100) {
                        return showAlert(`贈送失敗！\n對方的今日收禮額度已經滿了。`);
                    }

                    // 執行扣款與額度更新 (自己)
                    const newMyDiamonds = currentDiamonds - giftAmount;
                    myGiftData.amount += giftAmount;
                    db.collection('users').doc(user.uid).set({
                        mcData: { ...myMcData, diamonds: newMyDiamonds, giftData: myGiftData }
                    }, { merge: true });

                    // 執行加款與額度更新 (對方)
                    friendGiftData.amount += giftAmount;
                    db.collection('users').doc(activeChat.uid).set({
                        mcData: { ...friendMcData, diamonds: (friendMcData.diamonds || 0) + giftAmount, giftData: friendGiftData }
                    }, { merge: true });

                    // 傳送贈禮訊息
                    const chatId = getChatId(user.uid, activeChat.uid);
                    db.collection('chats').doc(chatId).collection('messages').add({
                        text: `送出了 ${giftAmount} 顆鑽石 💎！`,
                        senderId: user.uid,
                        senderName: userProfile.displayName,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        type: 'gift',
                        giftAmount: giftAmount,
                        read: false
                    }).then(() => {
                        db.collection('users').doc(activeChat.uid).set({
                            unreadChats: { [user.uid]: true }
                        }, { merge: true });
                        showAlert(`✅ 成功贈送 ${giftAmount} 💎！今日額度還剩 ${100 - myGiftData.amount} 💎`);
                    });
                }
            });
        }, "🎁 贈送鑽石");
    };

    // 🚀 系統重寫：輕量化指標下載邏輯
    const downloadSharedQuiz = async (quizData) => {
        window.showToast("正在下載好友分享的試題...", "loading"); // ✨ 新增：點擊下載時顯示右下角轉圈圈

        try {
            // 1. 檢查是否已經擁有這把鑰匙
            if (quizData.shortCode) {
                const check = await db.collection('users').doc(user.uid).collection('quizzes').where('shortCode', '==', quizData.shortCode).get();
                if (!check.empty) {
                    window.showToast("下載失敗：重複加入", "error"); // ✨ 新增錯誤提示
                    return showAlert('⚠️ 你已經擁有此試卷！', '重複加入');
                }
            }

            // 2. 建立本地「空殼」作答卡，只存最重要的鑰匙 (shortCode)
            const numQ = Number(quizData.numQuestions || 50);
            await db.collection('users').doc(user.uid).collection('quizzes').add({
                testName: (quizData.testName || '未命名試卷') + ' (來自好友)',
                numQuestions: numQ,
                userAnswers: Array(numQ).fill(''),
                starred: Array(numQ).fill(false),
                isShared: true, 
                shortCode: quizData.shortCode || null, // ✨ 核心：這把鑰匙決定了題目內容
                creatorUid: quizData.ownerId || quizData.senderId, 
                creatorQuizId: quizData.quizId,
                folder: '未分類', 
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            window.showToast("成功接收好友試題！", "success"); // ✨ 新增：成功時變成綠色打勾
            showAlert('✅ 已成功存入！\n題目將在進入作答時自動載入最新版本。');
        } catch (e) {
            window.showToast("下載失敗", "error"); // ✨ 新增錯誤提示
            showAlert('下載失敗：'+e.message);
        }
    };

    const lastMyMsgId = (messages || []).slice().reverse().find(m => m.senderId === user.uid)?.id;

    return (
        <div className="w-full max-w-5xl mx-auto px-0 md:px-4 pt-0 flex flex-col md:grid md:grid-cols-3 gap-0 md:gap-4 h-[calc(100dvh-80px)] min-h-[calc(100vh-80px)] md:h-full relative overflow-hidden">
            
            {previewImg && (
                <div onClick={() => setPreviewImg(null)} className="fixed inset-0 z-[200] bg-stone-800 bg-opacity-90 flex items-center justify-center p-4 cursor-zoom-out">
                    <img src={previewImg} className="max-w-full max-h-full object-contain" />
                    <span className="absolute top-6 right-6 text-white text-3xl font-bold">✖</span>
                </div>
            )}

            <div className={`w-full md:w-auto bg-[#FCFBF7] dark:bg-stone-800 border-0 md:border border-stone-200 dark:border-stone-700 shadow-sm rounded-2xl flex-col h-full overflow-hidden transition-colors ${(activeChat || activeProfile) ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
                    <div className="flex gap-2 mb-3">
                        <input 
                            type="text" 
                            placeholder="輸入 10 碼 ID 或 Email..." 
                            className="flex-1 p-2.5 text-sm bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-stone-800 dark:text-white" 
                            value={searchQuery} 
                            onChange={e=>setSearchQuery(e.target.value)} 
                            onFocus={handleFocusScroll}
                        />
                        <button onClick={handleSearch} disabled={isSearching} className="bg-amber-500 text-white px-4 rounded-xl font-bold text-sm active:scale-95 transition-transform flex items-center justify-center shadow-sm">
                            {isSearching ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : <span className="material-symbols-outlined text-[20px]">search</span>}
                        </button>
                    </div>

                    {/* 搜尋結果：顯示個人檔案預覽 */}
                    {foundUser && (
                        <div className="p-3 bg-white dark:bg-stone-800 border border-amber-200 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-3 mb-3">
                                {/* ✨ 點擊搜尋結果頭像 -> 打開右側個人檔案 */}
                                <div onClick={() => viewUserProfile(foundUser.uid)} className="cursor-pointer hover:scale-105 transition-transform" title="查看完整檔案">
                                    <UserAvatar uid={foundUser.uid} name={foundUser.displayName} className="w-12 h-12 rounded-full border-2 border-amber-100 hover:border-amber-400" />
                                </div>
                                <div>
                                    <div className="font-black text-stone-800 dark:text-stone-100">{foundUser.displayName || '匿名'}</div>
                                    <div className="text-[10px] text-stone-400 font-mono">ID: {foundUser.numericId}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => sendFriendRequest(foundUser)} className="flex-1 py-2 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 text-xs font-bold rounded-lg hover:bg-black transition-colors">送出申請</button>
                                <button onClick={() => setFoundUser(null)} className="px-3 py-2 bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300 text-xs font-bold rounded-lg">取消</button>
                            </div>
                        </div>
                    )}

                    {/* 待處理申請通知 */}
                    {pendingRequests.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {pendingRequests.map(req => (
                                <div key={req.id} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
                                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-200 truncate flex-1 mr-2">{req.fromName} 想加你好友</span>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => acceptRequest(req)} className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg active:scale-90 transition-all"><span className="material-symbols-outlined text-[14px]">check</span></button>
                                        <button onClick={() => rejectRequest(req)} className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg active:scale-90 transition-all"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ✨ 新增：好友快問快答 IG 限時動態 (多題連播支援) */}
                {friendsQAGroups.length > 0 && (
                    <div className="p-3 border-b border-gray-100 dark:border-stone-700 flex gap-3 overflow-x-auto custom-scrollbar bg-white dark:bg-stone-800 shrink-0 shadow-inner">
                        {friendsQAGroups.map(group => (
                            <div 
                                key={group.creatorUid} 
                                onClick={() => window.dispatchEvent(new CustomEvent('openFastQAStory', { detail: group.qaIds }))} 
                                className="flex flex-col items-center gap-1 cursor-pointer shrink-0 w-14 group relative" 
                                title={`點擊挑戰 ${group.creatorName} 的 ${group.qaIds.length} 題快問快答！`}
                            >
                                <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 to-rose-500 shrink-0 relative">
                                    <div className="w-full h-full bg-white dark:bg-stone-800 rounded-full p-[2px] overflow-hidden flex items-center justify-center">
                                        <UserAvatar uid={group.creatorUid} name={group.creatorName} className="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform" />
                                    </div>
                                    {/* 顯示有幾題 */}
                                    <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-stone-800">
                                        {group.qaIds.length}
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-stone-600 dark:text-stone-300 truncate w-full text-center">{group.creatorName}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex-grow overflow-y-auto p-2 custom-scrollbar bg-[#FCFBF7] dark:bg-stone-900">
                    {friends.length === 0 ? <p className="text-center text-gray-400 text-sm mt-10 font-bold">尚無好友，趕快透過 ID 搜尋吧！</p> : null}
                    {(friends || []).map(f => (
                        <div key={f.uid} className={`p-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-stone-800 transition-colors flex items-center space-x-3 ${activeChat && activeChat.uid === f.uid ? 'bg-amber-50 dark:bg-gray-700 border-amber-100 dark:border-gray-600' : ''}`}>
                            {/* ✨ 點擊頭像 -> 打開右側個人檔案 */}
                            <div onClick={() => viewUserProfile(f.uid)} className="shrink-0 cursor-pointer hover:scale-105 transition-transform" title="查看個人檔案">
                                <UserAvatar uid={f.uid} name={f.name} className="w-10 h-10 bg-stone-100 dark:bg-gray-600 border-2 border-transparent hover:border-amber-400 rounded-full" />
                            </div>
                            {/* ✨ 點擊名字區域 -> 打開聊天室 */}
                            <div className="flex-grow overflow-hidden cursor-pointer" onClick={() => { setActiveChat(f); setActiveProfile(null); setMessageLimit(15); }}>
                                <div className="font-bold text-sm truncate dark:text-gray-200">{f.name}</div>
                                <div className="text-xs text-gray-400 truncate font-mono">{f.email}</div>
                            </div>
                            {userProfile && userProfile.unreadChats && userProfile.unreadChats[f.uid] && (
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className={`flex-1 min-h-0 w-full md:w-auto md:col-span-2 bg-[#FCFBF7] dark:bg-stone-800 border-0 md:border border-stone-200 dark:border-stone-700 shadow-sm rounded-2xl flex-col h-full transition-colors ${(activeChat || activeProfile) ? 'flex' : 'hidden md:flex'}`}>
                
                {/* ✨ 狀態一：右側大畫面 - 玩家個人檔案 */}
                {activeProfile ? (
                    <div className="flex flex-col h-full bg-[#FCFBF7] dark:bg-stone-900 relative">
                        {/* 頂部標題 */}
                        <div className="p-4 flex items-center shrink-0 border-b border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-stone-800/80 backdrop-blur-md z-20">
                            <button onClick={() => setActiveProfile(null)} className="md:hidden flex items-center justify-center w-8 h-8 mr-3 bg-stone-100 dark:bg-gray-700 rounded-full hover:bg-stone-200 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            </button>
                            <span className="font-black text-stone-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500">account_circle</span> 玩家檔案
                            </span>
                        </div>
                        
                        {/* 檔案內容區 */}
                        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 flex flex-col items-center relative">
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-200/40 to-transparent dark:from-amber-900/20"></div>
                            
                            <div className="relative z-10 mb-4 mt-2">
                                <UserAvatar uid={activeProfile.uid} name={activeProfile.displayName} className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-white dark:border-stone-800 shadow-xl text-5xl bg-stone-100 dark:bg-stone-700" />
                            </div>
                            
                            <h2 className="text-2xl md:text-3xl font-black text-stone-800 dark:text-white mb-2 relative z-10">{activeProfile.displayName || '匿名用戶'}</h2>
                            <div className="text-xs font-mono text-stone-500 bg-white dark:bg-stone-800 px-4 py-1.5 rounded-full mb-6 shadow-sm border border-stone-200 dark:border-stone-700 relative z-10">
                                數位 ID: <span className="font-bold text-stone-800 dark:text-gray-300">{activeProfile.numericId || '未知'}</span>
                            </div>
                            
                            <div className="w-full max-w-sm bg-white dark:bg-stone-800 p-5 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 mb-6 relative z-10">
                                <h3 className="text-[11px] font-bold text-gray-400 mb-2 border-b border-gray-100 dark:border-gray-700 pb-1.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">edit_note</span> 個人簡介
                                </h3>
                                <p className="text-sm text-stone-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-medium">
                                    {activeProfile.bio || '這名玩家很神秘，還沒有寫下任何自我介紹...'}
                                </p>
                            </div>

                            <div className="w-full max-w-sm flex gap-3 mb-8 relative z-10">
                                <div className="flex-1 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/40 dark:to-stone-800 p-3 rounded-2xl border border-amber-200 dark:border-amber-800 flex flex-col items-center justify-center shadow-sm hover:scale-105 transition-transform">
                                    <span className="material-symbols-outlined text-2xl text-amber-500 mb-1">kid_star</span>
                                    <div className="text-[10px] text-amber-600 dark:text-amber-500 font-bold mb-0.5">學習等級</div>
                                    <div className="text-lg font-black text-amber-800 dark:text-amber-400">Lv. {activeProfile.mcData?.level || 1}</div>
                                </div>
                                <div className="flex-1 bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-900/40 dark:to-stone-800 p-3 rounded-2xl border border-cyan-200 dark:border-cyan-800 flex flex-col items-center justify-center shadow-sm hover:scale-105 transition-transform">
                                    <span className="material-symbols-outlined text-2xl text-cyan-500 mb-1">diamond</span>
                                    <div className="text-[10px] text-cyan-600 dark:text-cyan-500 font-bold mb-0.5">擁有財富</div>
                                    <div className="text-lg font-black text-cyan-800 dark:text-cyan-400">{activeProfile.mcData?.diamonds || 0} <span className="text-[10px]">鑽</span></div>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full max-w-sm relative z-10 mt-auto">
                                {friends.some(f => f.uid === activeProfile.uid) ? (
                                    <button onClick={() => { setActiveChat({uid: activeProfile.uid, name: activeProfile.displayName, email: activeProfile.email}); setActiveProfile(null); setMessageLimit(15); }} className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-md active:scale-95">
                                        <span className="material-symbols-outlined">chat</span> 發送訊息
                                    </button>
                                ) : activeProfile.uid !== user.uid ? (
                                    <button onClick={() => sendFriendRequest(activeProfile)} className="flex-1 py-3.5 bg-stone-800 hover:bg-black dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-800 font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-md active:scale-95">
                                        <span className="material-symbols-outlined">person_add</span> 送出申請
                                    </button>
                                ) : (
                                    <button className="flex-1 py-3.5 bg-gray-200 dark:bg-stone-700 text-gray-500 font-black rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                                        <span className="material-symbols-outlined">person</span> 這是你自己
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                
                /* ✨ 狀態二：聊天室畫面 */
                ) : activeChat ? (
                    <>
                        <div className="p-4 border-b border-stone-200 dark:border-stone-700 font-bold flex items-center space-x-2 shrink-0 bg-[#FCFBF7] dark:bg-stone-800 dark:text-white">
                             <button onClick={() => setActiveChat(null)} className="md:hidden flex items-center justify-center w-8 h-8 mr-2 text-lg bg-stone-50 dark:bg-gray-700 rounded-full hover:bg-stone-100 transition-colors">⬅️</button>
                                <span className="text-xl">💬</span>
                                <span className="truncate">與 {activeChat.name} 的聊天室</span>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-stone-900 custom-scrollbar">
                            
                            {(messages || []).length >= messageLimit && (
                                <div className="flex justify-center mb-4">
                                    <button onClick={() => setMessageLimit(p => p + 10)} className="bg-[#FCFBF7] dark:bg-stone-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs px-4 py-2 font-bold hover:bg-stone-50 dark:hover:bg-gray-700 transition-colors rounded-2xl shadow-sm">
                                        ⬆️ 點擊載入更早的訊息...
                                    </button>
                                </div>
                            )}

                            {(messages || []).map(msg => {
                                const isMe = msg.senderId === user.uid;
                                const timeStr = msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '';
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-4`}>
                                        <div className={`max-w-[85%] md:max-w-[70%] p-3 text-sm rounded-2xl ${isMe ? 'bg-stone-800 text-white dark:bg-amber-600' : 'bg-[#FCFBF7] border border-stone-200 dark:border-stone-700 text-stone-800 dark:bg-gray-700 dark:text-white shadow-sm'}`}>
                                            {(() => {
                                                if (msg.type === 'image') {
                                                    const minsLeft = Math.max(0, Math.ceil((msg.expiresAt - Date.now()) / 60000));
                                                    return (
                                                        <div className="text-center">
                                                            <img onClick={() => setPreviewImg(msg.imageUrl)} src={msg.imageUrl} className="max-w-full max-h-48 object-contain mb-1 rounded border border-gray-300 dark:border-gray-600 cursor-zoom-in" alt="已上傳圖片" />
                                                            <p className="text-[10px] text-amber-400 font-bold">⏱ 閱後即焚：大約 {minsLeft} 分鐘後刪除</p>
                                                        </div>
                                                    );
                                                } else if (msg.type === 'game_rps') {
                                                    return (
                                                        <div className="text-center py-2 px-4">
                                                            <span className="material-symbols-outlined text-5xl">{msg.rpsIcon}</span>
                                                            <p className="mt-2 font-bold">{msg.text}</p>
                                                        </div>
                                                    );
                                                } else if (msg.type === 'gift') {
                                                    return (
                                                        <div className="text-center py-2 px-4">
                                                            <span className="text-4xl leading-none">🎁</span>
                                                            <p className="mt-2 font-bold text-amber-300 drop-shadow">{msg.text}</p>
                                                        </div>
                                                    );
                                                } else if (msg.type === 'score_share') {
                                                    return (
                                                        <div className="text-center px-2 py-1">
                                                            <p className={`mb-2 font-bold ${isMe ? 'text-amber-300' : 'text-amber-400'}`}>🏆 戰績炫耀</p>
                                                            <p className="mb-1 text-sm font-bold truncate">{msg.scoreData?.testName}</p>
                                                            <h3 className={`text-3xl font-black mb-1 ${isMe ? 'text-white' : 'text-red-500'}`}>{msg.scoreData?.score} 分</h3>
                                                            <p className={`text-xs mb-3 ${isMe ? 'text-gray-300' : 'text-gray-400'}`}>答對 {msg.scoreData?.correctCount} / {msg.scoreData?.total} 題</p>
                                                            {!isMe && msg.quizData && msg.quizData.isTaskQuiz && (
                                                                <button onClick={() => showAlert(`🎯 這是一份公開任務！\n\n請前往「🎯 任務牆」搜尋：\n「${msg.scoreData?.testName}」\n即可進行挑戰並獲取鑽石獎勵！`)} className="bg-amber-400 dark:bg-amber-500 text-stone-800 px-4 py-1.5 rounded-2xl font-bold text-xs border border-amber-500 hover:bg-amber-500 w-full transition-colors shadow-sm">去任務牆挑戰</button>
                                                            )}
                                                            {!isMe && msg.quizData && !msg.quizData.isTaskQuiz && (
                                                                <button onClick={() => downloadSharedQuiz(msg.quizData)} className="bg-[#FCFBF7] dark:bg-stone-100 text-stone-800 px-4 py-1.5 rounded-2xl font-bold text-xs border border-stone-200 hover:bg-stone-50 dark:hover:bg-[#FCFBF7] w-full transition-colors">下載這份試卷</button>
                                                            )}
                                                        </div>
                                                    );
                                                } else if (msg.type === 'quiz_share') {
                                                    return (
                                                        <div className="text-center">
                                                            <p className="mb-2 font-bold text-amber-400">📝 分享了一份試卷</p>
                                                            <p className="mb-3 font-bold">{msg.quizData?.testName || '未命名試卷'}</p>
                                                            {!isMe && msg.quizData && (
                                                                <button onClick={() => downloadSharedQuiz(msg.quizData)} className="bg-[#FCFBF7] dark:bg-stone-100 text-stone-800 px-4 py-1.5 rounded-2xl font-bold text-xs border border-stone-200 hover:bg-stone-50 dark:hover:bg-[#FCFBF7] w-full transition-colors">下載試卷</button>
                                                            )}
                                                        </div>
                                                    );
                                                } else {
    return <p className="break-all sm:break-words whitespace-pre-wrap">{msg.text || '未知訊息'}</p>;
}
                                            })()}
                                        </div>
                                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center space-x-2 px-1">
                                            <span>{timeStr}</span>
                                            {isMe && msg.id === lastMyMsgId && <span>{msg.read ? '已讀' : '未讀'}</span>}
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={sendMessage} className="p-2 md:p-3 border-t border-stone-200 dark:border-stone-700 flex gap-1 sm:gap-2 bg-[#FCFBF7] dark:bg-stone-800 shrink-0 items-center overflow-hidden w-full box-border">
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={playRPS} className="bg-stone-50 dark:bg-gray-700 text-base sm:text-xl px-2 sm:px-3 py-2 rounded-2xl border border-gray-300 dark:border-gray-600 hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors shrink-0" title="猜拳"><span className="material-symbols-outlined">front_hand</span></button>
    
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={sendGift} className="bg-stone-50 dark:bg-gray-700 text-base sm:text-xl px-2 sm:px-3 py-2 rounded-2xl border border-gray-300 dark:border-gray-600 hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors shrink-0" title="贈送鑽石"><span className="material-symbols-outlined">redeem</span></button>
    
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => fileInputRef.current.click()} className="bg-stone-50 dark:bg-gray-700 text-base sm:text-xl px-2 sm:px-3 py-2 rounded-2xl border border-gray-300 dark:border-gray-600 hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors shrink-0" title="上傳圖片(閱後即焚)"><span className="material-symbols-outlined">image</span></button>
    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
    
    {/* ✨ 重要修正：強制加入 text-base (16px) 防止 iOS Safari 自動放大，並且給予 flex-1 w-full 完美佔據剩餘空間 */}
    <input type="text" ref={chatInputRef} placeholder="輸入訊息..." className="flex-1 min-w-0 w-full p-2 text-base border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none" value={newMessage} onChange={e=>setNewMessage(e.target.value)} onFocus={handleFocusScroll} />
    
    <button type="submit" onMouseDown={e => e.preventDefault()} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-3 sm:px-4 py-2 rounded-2xl font-bold text-sm sm:text-base hover:bg-stone-800 dark:hover:bg-gray-300 transition-colors shrink-0 whitespace-nowrap">傳送</button>
</form>
                    </>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold bg-gray-50 dark:bg-stone-900">請從左側選擇好友開始聊天</div>
                )}
            </div>
        </div>
    );
}