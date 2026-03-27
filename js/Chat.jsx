function SocialDashboard({ user, userProfile, showAlert }) {
    const friends = userProfile.friends || [];
    const [searchEmail, setSearchEmail] = useState('');
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [previewImgUrl, setPreviewImgUrl] = useState(null); // 預覽圖片
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [messageLimit, setMessageLimit] = useState(5);

    const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

    useEffect(() => {
        if(!activeChat) return;
        const chatId = getChatId(user.uid, activeChat.uid);
        const unsub = db.collection('chats').doc(chatId).collection('messages')
            .orderBy('timestamp', 'desc').limit(messageLimit)
            .onSnapshot(snapshot => {
                const msgs = [];
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.type === 'image' && data.expiresAt && data.expiresAt < Date.now()) doc.ref.delete();
                    else msgs.push({ id: doc.id, ...data });
                });
                setMessages(msgs.reverse());
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            });
        return () => unsub();
    }, [activeChat, user.uid, messageLimit]);

    const handleAddFriend = () => {
        const cleanEmail = searchEmail.trim().toLowerCase(); 
        if(!cleanEmail || cleanEmail === user.email.toLowerCase()) return;
        db.collection('users').where('email', '==', cleanEmail).get().then(snap => {
            if(snap.empty) return showAlert('找不到使用者');
            const target = snap.docs[0];
            if(friends.find(f => f.uid === target.id)) return showAlert('已經是好友了');
            db.collection('users').doc(user.uid).update({ friends: firebase.firestore.FieldValue.arrayUnion({ uid: target.id, name: target.data().displayName, email: target.data().email }) });
            db.collection('users').doc(target.id).update({ friends: firebase.firestore.FieldValue.arrayUnion({ uid: user.uid, name: userProfile.displayName, email: user.email }) });
            showAlert(`已加入 ${target.data().displayName}！`); setSearchEmail('');
        });
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if(!newMessage.trim() || !activeChat) return;
        const chatId = getChatId(user.uid, activeChat.uid);
        db.collection('chats').doc(chatId).collection('messages').add({
            text: newMessage.trim(), senderId: user.uid, timestamp: firebase.firestore.FieldValue.serverTimestamp(), type: 'text'
        }).then(() => setNewMessage(''));
    };

    const handleImageUpload = (e) => {
        if (!activeChat || !e.target.files[0]) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const chatId = getChatId(user.uid, activeChat.uid);
            db.collection('chats').doc(chatId).collection('messages').add({
                type: 'image', imageUrl: event.target.result, senderId: user.uid, timestamp: firebase.firestore.FieldValue.serverTimestamp(), expiresAt: Date.now() + 600000 
            });
        };
        reader.readAsDataURL(e.target.files[0]);
    };

    return (
        <div className="max-w-6xl mx-auto p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100dvh-100px)] relative">
            
            {/* 圖片全螢幕預覽 */}
            {previewImgUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-[200] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setPreviewImgUrl(null)}>
                    <img src={previewImgUrl} className="max-w-full max-h-full object-contain" />
                    <span className="absolute top-6 right-6 text-white text-3xl font-bold">✖</span>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 border flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b">
                    <div className="flex space-x-2"><input type="email" placeholder="輸入信箱..." className="flex-grow p-2 border" value={searchEmail} onChange={e=>setSearchEmail(e.target.value)} /><button onClick={handleAddFriend} className="bg-black text-white px-3 py-2">加入</button></div>
                </div>
                <div className="flex-grow overflow-y-auto p-2">
                    {(friends || []).map(f => (
                        <div key={f.uid} onClick={() => setActiveChat(f)} className={`p-3 border-b cursor-pointer ${activeChat?.uid === f.uid ? 'bg-orange-50' : ''}`}>
                            <div className="font-bold">{f.name}</div><div className="text-xs text-gray-400">{f.email}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="md:col-span-2 bg-white dark:bg-gray-800 border flex flex-col h-full overflow-hidden">
                {activeChat ? (
                    <>
                        <div className="p-4 border-b font-bold dark:text-white">💬 與 {activeChat.name}</div>
                        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                            {/* 防白屏保護: (messages || []) */}
                            {(messages || []).map(msg => (
                                <div key={msg.id} className={`flex flex-col ${msg.senderId === user.uid ? 'items-end' : 'items-start'} mb-4`}>
                                    <div className={`max-w-[70%] p-3 text-sm ${msg.senderId === user.uid ? 'bg-black text-white' : 'bg-white border text-black dark:bg-gray-700 dark:text-white'}`}>
                                        {msg.type === 'image' ? 
                                            <img src={msg.imageUrl} className="max-w-full max-h-48 cursor-zoom-in" onClick={() => setPreviewImgUrl(msg.imageUrl)} /> : 
                                            <p>{msg.text}</p>
                                        }
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={sendMessage} className="p-3 border-t flex space-x-2 bg-white dark:bg-gray-800">
                            <button type="button" onClick={() => fileInputRef.current.click()} className="bg-gray-100 px-3 py-2">🖼️</button>
                            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                            <input type="text" placeholder="輸入訊息..." className="flex-grow p-2 border" value={newMessage} onChange={e=>setNewMessage(e.target.value)} />
                            <button type="submit" className="bg-black text-white px-4 py-2">傳送</button>
                        </form>
                    </>
                ) : <div className="flex-grow flex items-center justify-center text-gray-400">請選擇好友</div>}
            </div>
        </div>
    );
}
