// --- 聊天室與系統 ---
function SocialDashboard({ user, userProfile, showAlert }) {
    const friends = userProfile.friends || [];
    const [searchEmail, setSearchEmail] = useState('');
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [previewImg, setPreviewImg] = useState(null); // 新增預覽圖片狀態
    
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
        if (!activeChat) return;
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            showAlert("圖片大小不能超過 10MB！");
            e.target.value = '';
            return;
        }

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

    const downloadSharedQuiz = (quizData) => {
        let originalData;
        db.collection('users').doc(quizData.ownerId).collection('quizzes').doc(quizData.quizId).get()
        .then(doc => {
            if(!doc.exists) throw new Error('該試卷已失效或被擁有者刪除！');
            originalData = doc.data();
            const emptyAnswers = Array(Number(originalData.numQuestions)).fill('');
            const emptyStarred = Array(Number(originalData.numQuestions)).fill(false);
            
            return db.collection('users').doc(user.uid).collection('quizzes').add({
                testName: originalData.testName + ' (來自好友)',
                numQuestions: originalData.numQuestions,
                questionFileUrl: originalData.questionFileUrl || '',
                questionText: originalData.questionText || '',
                correctAnswersInput: originalData.correctAnswersInput || '', 
                userAnswers: emptyAnswers,
                starred: emptyStarred,
                hasTimer: originalData.hasTimer || false,
                timeLimit: originalData.timeLimit || null,
                timeRemaining: originalData.hasTimer ? (originalData.timeLimit * 60) : null,
                isShared: true, 
                folder: '未分類', 
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(newDocRef => {
            return db.collection('users').doc(quizData.ownerId).collection('quizzes').doc(quizData.quizId).update({
                sharedTo: firebase.firestore.FieldValue.arrayUnion({ uid: user.uid, quizId: newDocRef.id })
            });
        })
        .then(() => showAlert('✅ 已成功存入！\n請回到「我的題庫」查看並開始作答。'))
        .catch(e => {
            if (e.message === '該試卷已失效或被擁有者刪除！') showAlert(e.message);
            else showAlert('下載失敗：'+e.message);
        });
    };

    const lastMyMsgId = (messages || []).slice().reverse().find(m => m.senderId === user.uid)?.id;

    return (
        <div className="max-w-6xl mx-auto p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100dvh-100px)] relative">
            
            {/* 圖片全螢幕預覽 */}
            {previewImg && (
                <div onClick={() => setPreviewImg(null)} className="fixed inset-0 z-[200] bg-black bg-opacity-90 flex items-center justify-center p-4 cursor-zoom-out">
                    <img src={previewImg} className="max-w-full max-h-full object-contain" />
                    <span className="absolute top-6 right-6 text-white text-3xl font-bold">✖</span>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round flex flex-col h-full overflow-hidden transition-colors">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0">
                    <h2 className="font-bold mb-3 dark:text-white">加入好友</h2>
                    <div className="flex space-x-2">
                        <input type="email" placeholder="輸入好友信箱..." className="flex-grow p-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none" value={searchEmail} onChange={e=>setSearchEmail(e.target.value)} onFocus={handleFocusScroll} />
                        <button onClick={handleAddFriend} className="bg-black dark:bg-gray-200 text-white dark:text-black px-3 py-2 no-round text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors">加入</button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-2 custom-scrollbar bg-white dark:bg-gray-900">
                    {friends.length === 0 ? <p className="text-center text-gray-400 text-sm mt-10">尚無好友，趕快新增吧！</p> : null}
                    {(friends || []).map(f => (
                        <div key={f.uid} onClick={() => { setActiveChat(f); setMessageLimit(5); }} className={`p-3 border-b border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center space-x-3 ${activeChat && activeChat.uid === f.uid ? 'bg-orange-50 dark:bg-gray-700 border-orange-100 dark:border-gray-600' : ''}`}>
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center font-bold text-gray-500 dark:text-gray-300 shrink-0">{f.name.charAt(0)}</div>
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

            <div className="md:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round flex flex-col h-full overflow-hidden transition-colors">
                {activeChat ? (
                    <>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-bold flex items-center space-x-2 shrink-0 bg-white dark:bg-gray-800 dark:text-white">
                            <span className="text-xl">💬</span>
                            <span>與 {activeChat.name} 的聊天室</span>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 custom-scrollbar">
                            
                            {(messages || []).length >= messageLimit && (
                                <div className="flex justify-center mb-4">
                                    <button onClick={() => setMessageLimit(p => p + 10)} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs px-4 py-2 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors no-round shadow-sm">
                                        ⬆️ 點擊載入更早的訊息...
                                    </button>
                                </div>
                            )}

                            {(messages || []).map(msg => {
                                const isMe = msg.senderId === user.uid;
                                const timeStr = msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '';
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-4`}>
                                        <div className={`max-w-[70%] p-3 text-sm no-round ${isMe ? 'bg-black text-white dark:bg-blue-600' : 'bg-white border border-gray-200 dark:border-gray-700 text-black dark:bg-gray-700 dark:text-white shadow-sm'}`}>
                                            {(() => {
                                                if (msg.type === 'image') {
                                                    const minsLeft = Math.max(0, Math.ceil((msg.expiresAt - Date.now()) / 60000));
                                                    return (
                                                        <div className="text-center">
                                                            <img onClick={() => setPreviewImg(msg.imageUrl)} src={msg.imageUrl} className="max-w-full max-h-48 object-contain mb-1 rounded border border-gray-300 dark:border-gray-600 cursor-zoom-in" alt="已上傳圖片" />
                                                            <p className="text-[10px] text-orange-400 font-bold">⏱ 閱後即焚：大約 {minsLeft} 分鐘後刪除</p>
                                                        </div>
                                                    );
                                                } else if (msg.type === 'game_rps') {
                                                    return (
                                                        <div className="text-center py-2 px-4">
                                                            <span className="text-5xl leading-none">{msg.rpsFace}</span>
                                                            <p className="mt-2 font-bold">{msg.text}</p>
                                                        </div>
                                                    );
                                                } else if (msg.type === 'score_share') {
                                                    return (
                                                        <div className="text-center px-2 py-1">
                                                            <p className={`mb-2 font-bold ${isMe ? 'text-yellow-300' : 'text-yellow-400'}`}>🏆 戰績炫耀</p>
                                                            <p className="mb-1 text-sm font-bold truncate">{msg.scoreData?.testName}</p>
                                                            <h3 className={`text-3xl font-black mb-1 ${isMe ? 'text-white' : 'text-red-500'}`}>{msg.scoreData?.score} 分</h3>
                                                            <p className={`text-xs mb-3 ${isMe ? 'text-gray-300' : 'text-gray-400'}`}>答對 {msg.scoreData?.correctCount} / {msg.scoreData?.total} 題</p>
                                                            {!isMe && msg.quizData && (
                                                                <button onClick={() => downloadSharedQuiz(msg.quizData)} className="bg-white dark:bg-gray-200 text-black px-4 py-1.5 no-round font-bold text-xs border border-gray-200 hover:bg-gray-100 dark:hover:bg-white w-full transition-colors">下載這份試卷</button>
                                                            )}
                                                        </div>
                                                    );
                                                } else if (msg.type === 'quiz_share') {
                                                    return (
                                                        <div className="text-center">
                                                            <p className="mb-2 font-bold text-orange-400">📝 分享了一份試卷</p>
                                                            <p className="mb-3 font-bold">{msg.quizData?.testName || '未命名試卷'}</p>
                                                            {!isMe && msg.quizData && (
                                                                <button onClick={() => downloadSharedQuiz(msg.quizData)} className="bg-white dark:bg-gray-200 text-black px-4 py-1.5 no-round font-bold text-xs border border-gray-200 hover:bg-gray-100 dark:hover:bg-white w-full transition-colors">下載試卷</button>
                                                            )}
                                                        </div>
                                                    );
                                                } else {
                                                    return <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text || '未知訊息'}</p>;
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
                        <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 dark:border-gray-700 flex space-x-2 bg-white dark:bg-gray-800 shrink-0 items-center">
                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={playRPS} className="bg-gray-100 dark:bg-gray-700 text-xl px-3 py-2 no-round border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="猜拳">✌️</button>
                            
                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => fileInputRef.current.click()} className="bg-gray-100 dark:bg-gray-700 text-xl px-3 py-2 no-round border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="上傳圖片(閱後即焚)">🖼️</button>
                            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                            
                            <input type="text" ref={chatInputRef} placeholder="輸入訊息..." className="flex-grow p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none" value={newMessage} onChange={e=>setNewMessage(e.target.value)} onFocus={handleFocusScroll} />
                            <button type="submit" onMouseDown={e => e.preventDefault()} className="bg-black dark:bg-gray-200 text-white dark:text-black px-4 py-2 no-round font-bold hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors">傳送</button>
                        </form>
                    </>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold bg-gray-50 dark:bg-gray-900">請從左側選擇好友開始聊天</div>
                )}
            </div>
        </div>
    );
}