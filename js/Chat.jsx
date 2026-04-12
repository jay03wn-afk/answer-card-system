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
    const [searchEmail, setSearchEmail] = useState('');
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [previewImg, setPreviewImg] = useState(null);
    
    const messagesEndRef = useRef(null);
    const chatInputRef = useRef(null); 
    const fileInputRef = useRef(null);
    
    const [messageLimit, setMessageLimit] = useState(5);
    const [lastMsgIdForScroll, setLastMsgIdForScroll] = useState(null);

    const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

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

    const handleAddFriend = () => {
        const cleanEmail = searchEmail.trim().toLowerCase(); 
        if(!cleanEmail) return;
        if(cleanEmail === user.email.toLowerCase()) return showAlert('不能加自己為好友！');
        
        db.collection('users').where('email', '==', cleanEmail).get()
        .then(snap => {
            if(snap.empty) return showAlert('找不到此信箱的使用者 (請確認對方已登入過系統)');
            const targetUser = snap.docs[0];
            const targetData = targetUser.data();
            const targetUid = targetUser.id;
            
            if(friends.find(f => f.uid === targetUid)) return showAlert('已經是好友了！');

            const batch = db.batch();
            batch.update(db.collection('users').doc(user.uid), {
                friends: firebase.firestore.FieldValue.arrayUnion({ uid: targetUid, name: targetData.displayName, email: targetData.email })
            });
            batch.update(db.collection('users').doc(targetUid), {
                friends: firebase.firestore.FieldValue.arrayUnion({ uid: user.uid, name: userProfile.displayName, email: user.email })
            });
            
            return batch.commit().then(() => {
                showAlert(`已成功加入 ${targetData.displayName}！`);
                setSearchEmail('');
            });
        }).catch(e => showAlert('加入失敗：' + e.message));
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

    const handleImageUpload = (e) => {
    const isAuth = user && (user.email === 'jay03wn@gmail.com' || userProfile?.isAuthorized);
    if (!isAuth) {
        showAlert("⚠️ 權限不足：僅限管理員或受邀創作者上傳圖片。");
        e.target.value = '';
        return;
    }
    if (!activeChat) return;
    const file = e.target.files[0];

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
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
                db.collection('chats').doc(chatId).collection('messages').add({
                    type: 'image',
                    imageUrl: compressedBase64,
                    senderId: user.uid,
                    senderName: userProfile.displayName,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    expiresAt: Date.now() + 10 * 60 * 1000, 
                    read: false
                }).then(() => {
                    db.collection('users').doc(activeChat.uid).set({
                        unreadChats: { [user.uid]: true }
                    }, { merge: true });
                }).catch(err => showAlert("圖片上傳失敗：" + err.message));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = ''; 
    };

    const playRPS = () => {
        if(!activeChat) return;
        const choices = [
            { face: '✊', name: '石頭' },
            { face: '✌️', name: '剪刀' },
            { face: '✋', name: '布' }
        ];
        const result = choices[Math.floor(Math.random() * choices.length)];
        const chatId = getChatId(user.uid, activeChat.uid);
        
        db.collection('chats').doc(chatId).collection('messages').add({
            text: `出了 ${result.name}！`,
            senderId: user.uid,
            senderName: userProfile.displayName,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'game_rps',
            rpsFace: result.face,
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

            <div className={`w-full md:w-auto bg-[#FCFBF7] dark:bg-stone-800 border-0 md:border border-stone-200 dark:border-stone-700 shadow-sm rounded-2xl flex-col h-full overflow-hidden transition-colors ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-100 dark:border-stone-700 bg-gray-50 dark:bg-stone-800 shrink-0">
                    <h2 className="font-bold mb-3 dark:text-white">加入好友</h2>
                    <div className="flex space-x-2">
                        <input type="email" placeholder="輸入好友信箱..." className="flex-grow p-2 text-sm border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none" value={searchEmail} onChange={e=>setSearchEmail(e.target.value)} onFocus={handleFocusScroll} />
                        <button onClick={handleAddFriend} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-3 py-2 rounded-2xl text-sm font-bold hover:bg-stone-800 dark:hover:bg-gray-300 transition-colors">加入</button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-2 custom-scrollbar bg-[#FCFBF7] dark:bg-stone-900">
                    {friends.length === 0 ? <p className="text-center text-gray-400 text-sm mt-10">尚無好友，趕快新增吧！</p> : null}
                    {(friends || []).map(f => (
                        <div key={f.uid} onClick={() => { setActiveChat(f); setMessageLimit(5); }} className={`p-3 border-b border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-stone-800 transition-colors flex items-center space-x-3 ${activeChat && activeChat.uid === f.uid ? 'bg-amber-50 dark:bg-gray-700 border-amber-100 dark:border-gray-600' : ''}`}>
                            <UserAvatar uid={f.uid} name={f.name} className="w-10 h-10 bg-stone-100 dark:bg-gray-600 rounded-full shrink-0" />
                            <div className="flex-grow overflow-hidden">
                                <div className="font-bold text-sm truncate dark:text-gray-200">{f.name}</div>
                                <div className="text-xs text-gray-400 truncate">{f.email}</div>
                            </div>
                            {userProfile && userProfile.unreadChats && userProfile.unreadChats[f.uid] && (
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className={`flex-1 min-h-0 w-full md:w-auto md:col-span-2 bg-[#FCFBF7] dark:bg-stone-800 border-0 md:border border-stone-200 dark:border-stone-700 shadow-sm rounded-2xl flex-col h-full transition-colors ${activeChat ? 'flex' : 'hidden md:flex'}`}>
                {activeChat ? (
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
                                                            <span className="text-5xl leading-none">{msg.rpsFace}</span>
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
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={playRPS} className="bg-stone-50 dark:bg-gray-700 text-base sm:text-xl px-2 sm:px-3 py-2 rounded-2xl border border-gray-300 dark:border-gray-600 hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors shrink-0" title="猜拳">✌️</button>
    
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={sendGift} className="bg-stone-50 dark:bg-gray-700 text-base sm:text-xl px-2 sm:px-3 py-2 rounded-2xl border border-gray-300 dark:border-gray-600 hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors shrink-0" title="贈送鑽石">🎁</button>
    
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => fileInputRef.current.click()} className="bg-stone-50 dark:bg-gray-700 text-base sm:text-xl px-2 sm:px-3 py-2 rounded-2xl border border-gray-300 dark:border-gray-600 hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors shrink-0" title="上傳圖片(閱後即焚)">🖼️</button>
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
