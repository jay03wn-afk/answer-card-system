const { useState, useEffect, useRef } = React;

function ServiceCenter({ user, userProfile, showAlert, showConfirm, showPrompt }) {
    const [activeTab, setActiveTab] = useState('redeem'); // redeem, feedback, admin_codes, admin_feedback
    const isAdmin = user && (user.email === 'jay03wn@gmail.com' || userProfile?.isAuthorized);
    
    // 兌換狀態
    const [redeemCode, setRedeemCode] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);
    
    // 反饋狀態
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackType, setFeedbackType] = useState('問題回報'); // ✨ 新增：問題類型
    const [feedbackImage, setFeedbackImage] = useState(null); // ✨ 新增：圖片 { url: '', path: '' }
    const [isUploading, setIsUploading] = useState(false);
    
    // 管理員狀態
    const [codes, setCodes] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [newCode, setNewCode] = useState({ code: '', type: 'contact', content: '', maxUses: 1 });
    const [replyImage, setReplyImage] = useState(null); // ✨ 新增：管理員回覆用的圖片

    useEffect(() => {
        if (isAdmin) {
            // 監聽序號庫
            const unsubCodes = window.db.collection('system').doc('redemptionCodes').onSnapshot(doc => {
                if (doc.exists) setCodes(doc.data().codes || []);
            });
            // 監聽反饋與領獎申請
            const unsubFeedback = window.db.collection('feedbacks').orderBy('createdAt', 'desc').onSnapshot(snap => {
                setFeedbacks(snap.docs.map(d => ({id: d.id, ...d.data()})));
            });
            return () => { unsubCodes(); unsubFeedback(); };
        }
    }, [isAdmin]);

    // 🔄 ✨ 新增：圖片壓縮與上傳核心邏輯
    const uploadImage = (file, folder = 'feedback_images') => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    const MAX = 1024;
                    if (w > h && w > MAX) { h *= MAX/w; w = MAX; }
                    else if (h > MAX) { w *= MAX/h; h = MAX; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    
                    canvas.toBlob(async (blob) => {
                        try {
                            const path = `${folder}/${user.uid}_${Date.now()}.jpg`;
                            const ref = window.storage.ref(path);
                            await ref.put(blob);
                            const url = await ref.getDownloadURL();
                            resolve({ url, path });
                        } catch (err) { reject(err); }
                    }, 'image/jpeg', 0.7);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    // ✨ 處理檔案選擇
    const handleFileSelect = async (e, type = 'feedback') => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const res = await uploadImage(file, type === 'feedback' ? 'feedback_images' : 'reply_images');
            if (type === 'feedback') setFeedbackImage(res);
            else setReplyImage(res);
            showAlert("圖片上傳並壓縮成功！");
        } catch (err) { showAlert("圖片上傳失敗：" + err.message); }
        setIsUploading(false);
    };

    // 兌換邏輯
    const handleRedeem = async () => {
        const cleanCode = redeemCode.trim().toUpperCase();
        if (cleanCode.length === 0) return showAlert("請輸入兌換序號！");
        setIsRedeeming(true);
        try {
            const sysDoc = await window.db.collection('system').doc('redemptionCodes').get();
            const allCodes = sysDoc.exists ? (sysDoc.data().codes || []) : [];
            const codeObj = allCodes.find(c => c.code === cleanCode);
            
            if (!codeObj) {
                showAlert("找不到此兌換序號，請確認是否輸入正確！");
                setIsRedeeming(false);
                return;
            }

            const usedBy = codeObj.usedBy || [];
            if (usedBy.includes(user.uid)) {
                showAlert("你已經兌換過此序號了！");
                setIsRedeeming(false);
                return;
            }
            if (codeObj.maxUses !== 0 && usedBy.length >= codeObj.maxUses) {
                showAlert("此序號已被兌換完畢！");
                setIsRedeeming(false);
                return;
            }

            // 更新序號為「已使用」
            const updatedCodes = allCodes.map(c => {
                if (c.code === cleanCode) {
                    return { ...c, usedBy: [...(c.usedBy || []), user.uid] };
                }
                return c;
            });
            await window.db.collection('system').doc('redemptionCodes').set({ codes: updatedCodes }, { merge: true });

            if (codeObj.type === 'contact') {
                // 方式 1：聯絡客服
                await window.db.collection('feedbacks').add({
                    uid: user.uid,
                    userName: userProfile.displayName,
                    type: '兌換申請', // ✨ 統一類型名稱
                    code: cleanCode,
                    text: `[系統通知] 使用者申請兌換序號：${cleanCode}`,
                    status: 'pending',
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });
                showAlert("兌換成功！已通知客服，請等待郵件回覆。");
            } else {
                // 方式 2：直接派發文字或圖片
                await window.db.collection('users').doc(user.uid).collection('mailbox').add({
                    title: '獎品兌換成功',
                    content: codeObj.content,
                    isRead: false,
                    isClaimed: false,
                    rewardDiamonds: 0,
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });
                showAlert("兌換成功！獎品（圖片/文字）已發送至您的信箱。");
            }
            setRedeemCode('');
        } catch (e) {
            showAlert("兌換失敗：" + e.message);
        }
        setIsRedeeming(false);
    };

    // 💬 反饋邏輯 (含 1 小時 3 則限制)
    const handleFeedback = async () => {
        if (!feedbackText.trim()) return showAlert("請輸入內容！");
        setIsUploading(true);
        try {
            // ✨ 檢查一小時內的發送次數
            const oneHourAgo = new Date(Date.now() - 3600000);
            const snap = await window.db.collection('feedbacks').where('uid', '==', user.uid).where('createdAt', '>', oneHourAgo).get();
            if (snap.size >= 3) { 
                showAlert("一小時內最多發送三則反饋，請稍候再試。"); 
                setIsUploading(false); 
                return; 
            }

            await window.db.collection('feedbacks').add({
                uid: user.uid,
                userName: userProfile.displayName,
                type: feedbackType, // ✨ 寫入選擇的類型
                text: feedbackText.trim(),
                imageUrl: feedbackImage?.url || null, // ✨ 寫入圖片網址
                imagePath: feedbackImage?.path || null, // ✨ 寫入圖片路徑(供刪除用)
                status: 'pending',
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
            setFeedbackText('');
            setFeedbackImage(null); // 清空預覽
            showAlert("送出成功！感謝您的反饋。");
        } catch (e) {
            showAlert("送出失敗：" + e.message);
        }
        setIsUploading(false);
    };

    // 管理員功能
    const handleSaveCode = async () => {
        if (!newCode.code.trim()) return showAlert("請輸入序號");
        const sysDoc = await window.db.collection('system').doc('redemptionCodes').get();
        const allCodes = sysDoc.exists ? (sysDoc.data().codes || []) : [];
        if (allCodes.find(c => c.code === newCode.code)) return showAlert("序號已存在！");
        
        allCodes.push({ ...newCode, code: newCode.code.toUpperCase(), usedBy: [] });
        await window.db.collection('system').doc('redemptionCodes').set({ codes: allCodes }, { merge: true });
        setNewCode({ code: '', type: 'contact', content: '', maxUses: 1 });
        showAlert("序號新增成功！");
    };

    // 🗑️ ✨ 新增：管理員刪除功能 (確保從 Storage 刪除圖片)
    const handleDeleteFeedback = (fb) => {
        showConfirm("確定刪除此反饋？若有圖片也將從雲端永久刪除。", async () => {
            try {
                if (fb.imagePath) {
                    await window.storage.ref(fb.imagePath).delete().catch(e => console.warn("圖片刪除失敗或已不存在", e));
                }
                await window.db.collection('feedbacks').doc(fb.id).delete();
                showAlert("已從資料庫與雲端刪除。");
            } catch (e) { 
                showAlert("刪除失敗：" + e.message); 
            }
        });
    };

    const handleDeleteCode = async (codeStr) => {
        showConfirm(`確定要刪除序號 ${codeStr}？`, async () => {
            const updatedCodes = codes.filter(c => c.code !== codeStr);
            await window.db.collection('system').doc('redemptionCodes').set({ codes: updatedCodes }, { merge: true });
        });
    };

    const handleReply = (fb) => {
        showPrompt("回覆內容 (將寄送系統信件)：", "", async (replyText) => {
            if (!replyText) return;
            await window.db.collection('users').doc(fb.uid).collection('mailbox').add({
                title: '客服中心回覆',
                content: replyText,
                imageUrl: replyImage?.url || null, // ✨ 管理員回覆的圖片
                isRead: false,
                isClaimed: false,
                rewardDiamonds: 0,
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
            await window.db.collection('feedbacks').doc(fb.id).update({ status: 'replied' });
            setReplyImage(null); // 回覆完清空選取的圖片
            showAlert("已寄出回覆信件！");
        });
    };

    return (
        <div className="max-w-4xl mx-auto w-full p-4 md:p-6 space-y-6 pb-20">
            <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-3xl text-cyan-600">support_agent</span>
                <h1 className="text-2xl font-black text-stone-800 dark:text-white">服務中心</h1>
            </div>

            {/* 頁籤 */}
            <div className="flex gap-2 border-b-2 border-stone-200 dark:border-stone-700 mb-6 pb-2 overflow-x-auto">
                <button onClick={() => setActiveTab('redeem')} className={`flex items-center gap-1 px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === 'redeem' ? 'bg-cyan-600 text-white' : 'text-gray-500'}`}>
                    <span className="material-symbols-outlined text-[18px]">redeem</span> 兌換獎品
                </button>
                <button onClick={() => setActiveTab('feedback')} className={`flex items-center gap-1 px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === 'feedback' ? 'bg-cyan-600 text-white' : 'text-gray-500'}`}>
                    <span className="material-symbols-outlined text-[18px]">chat</span> 問題反饋
                </button>
                {isAdmin && (
                    <>
                        <button onClick={() => setActiveTab('admin_codes')} className={`flex items-center gap-1 px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === 'admin_codes' ? 'bg-amber-600 text-white' : 'text-gray-500'}`}>
                            <span className="material-symbols-outlined text-[18px]">settings</span> 管理序號
                        </button>
                        <button onClick={() => setActiveTab('admin_feedback')} className={`flex items-center gap-1 px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === 'admin_feedback' ? 'bg-amber-600 text-white' : 'text-gray-500'}`}>
                            <span className="material-symbols-outlined text-[18px]">inbox</span> 處理請求
                        </button>
                    </>
                )}
            </div>

            {/* 內容區 */}
            {activeTab === 'redeem' && (
                <div className="bg-white dark:bg-stone-800 p-8 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 text-center max-w-md mx-auto">
                    <span className="material-symbols-outlined text-[64px] text-amber-500 mb-4">redeem</span>
                    <h2 className="text-xl font-black mb-2 dark:text-white">輸入兌換序號</h2>
                    <input 
                        type="text" maxLength="12" placeholder="請輸入 12 碼序號" value={redeemCode} 
                        onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                        className="w-full text-center tracking-widest text-xl font-mono p-3 border-2 border-cyan-300 rounded-xl bg-white dark:bg-stone-900 dark:text-white mb-4 outline-none uppercase"
                    />
                    <button onClick={handleRedeem} disabled={isRedeeming} className="w-full bg-cyan-600 text-white font-black py-3 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50">
                        {isRedeeming ? '處理中...' : '立即兌換'}
                    </button>
                </div>
            )}

            {activeTab === 'feedback' && (
                <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 max-w-xl mx-auto">
                    <h2 className="text-lg font-black mb-4 dark:text-white">回報問題與建議</h2>
                    
                    {/* ✨ 類別選擇 */}
                    <select value={feedbackType} onChange={e => setFeedbackType(e.target.value)} className="w-full p-3 border border-stone-300 dark:border-stone-600 rounded-xl bg-white dark:bg-stone-900 dark:text-white mb-3 outline-none focus:border-cyan-500 font-bold">
                        <option value="問題回報">問題回報 (Bug)</option>
                        <option value="功能建議">功能建議</option>
                        <option value="檢舉投訴">檢舉投訴</option>
                        <option value="其他">其他</option>
                    </select>

                    <textarea 
                        rows="5" placeholder="描述您的問題 (一小時限發 3 則)..." value={feedbackText}
                        onChange={e => setFeedbackText(e.target.value)}
                        className="w-full p-3 border border-stone-300 dark:border-stone-600 rounded-xl bg-white dark:bg-stone-900 dark:text-white mb-3 outline-none focus:border-cyan-500 resize-none"
                    ></textarea>

                    {/* ✨ 圖片上傳區 */}
                    <div className="flex items-center justify-between mb-4 bg-stone-50 dark:bg-stone-900 p-3 rounded-xl border border-dashed border-stone-300 dark:border-stone-600">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-stone-500">image</span>
                            <span className="text-xs font-bold text-gray-500">{feedbackImage ? "圖片已就緒" : "可附上一張截圖"}</span>
                        </div>
                        <input type="file" id="fbFile" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'feedback')} />
                        <label htmlFor="fbFile" className="text-xs bg-cyan-600 text-white px-3 py-1.5 rounded-lg cursor-pointer font-bold transition-colors hover:bg-cyan-700">選擇圖片</label>
                    </div>
                    {/* 圖片預覽 */}
                    {feedbackImage && (
                        <div className="mb-4 relative inline-block">
                            <img src={feedbackImage.url} className="h-24 rounded border-2 border-cyan-500 shadow-sm"/>
                            <button onClick={() => setFeedbackImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md">✕</button>
                        </div>
                    )}

                    <button onClick={handleFeedback} disabled={isUploading} className="w-full bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 font-black py-3 rounded-xl disabled:opacity-50">
                        {isUploading ? '處理中...' : '送出回報'}
                    </button>
                </div>
            )}

            {activeTab === 'admin_codes' && isAdmin && (
                <div className="space-y-6">
                    <div className="bg-amber-50 dark:bg-stone-900/50 p-6 rounded-2xl border border-amber-200 dark:border-stone-700">
                        <h3 className="font-black mb-4 dark:text-white flex items-center gap-1">
                            <span className="material-symbols-outlined text-[20px]">add_circle</span> 新增序號
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="序號 (12碼)" value={newCode.code} onChange={e => setNewCode({...newCode, code: e.target.value})} className="p-2 border border-stone-300 dark:border-stone-600 rounded dark:bg-stone-800 dark:text-white outline-none focus:border-amber-500" />
                            <input type="number" placeholder="限兌次數 (0=不限)" value={newCode.maxUses} onChange={e => setNewCode({...newCode, maxUses: parseInt(e.target.value)})} className="p-2 border border-stone-300 dark:border-stone-600 rounded dark:bg-stone-800 dark:text-white outline-none focus:border-amber-500" />
                            <select value={newCode.type} onChange={e => setNewCode({...newCode, type: e.target.value})} className="p-2 border border-stone-300 dark:border-stone-600 rounded dark:bg-stone-800 dark:text-white outline-none focus:border-amber-500">
                                <option value="contact">方式 1：聯絡客服</option>
                                <option value="direct">方式 2：直發文字圖片</option>
                            </select>
                            {newCode.type === 'direct' && <input type="text" placeholder="派發內容 (文字或網址)" value={newCode.content} onChange={e => setNewCode({...newCode, content: e.target.value})} className="p-2 border border-stone-300 dark:border-stone-600 rounded dark:bg-stone-800 dark:text-white outline-none focus:border-amber-500" />}
                        </div>
                        <button onClick={handleSaveCode} className="mt-4 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-6 rounded transition-colors">儲存</button>
                    </div>
                    <div className="bg-white dark:bg-stone-800 p-4 rounded-xl border border-stone-200 dark:border-stone-700">
                        {codes.map(c => (
                            <div key={c.code} className="flex justify-between items-center py-2 border-b border-stone-100 dark:border-stone-700 last:border-0 dark:text-white">
                                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{c.code}</span>
                                <span className="text-xs">{c.type === 'contact' ? '客服' : '直發'} ({c.usedBy?.length}/{c.maxUses === 0 ? '∞' : c.maxUses})</span>
                                <button onClick={() => handleDeleteCode(c.code)} className="text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">刪除</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'admin_feedback' && isAdmin && (
                <div className="space-y-4">
                    {/* ✨ 管理員回覆圖片選擇區 */}
                    <div className="p-4 bg-amber-50 dark:bg-stone-900 border border-amber-200 dark:border-stone-700 rounded-xl mb-4 shadow-sm">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-black text-amber-800 dark:text-amber-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[18px]">image</span> 回覆前選取圖片 (選填)
                            </h3>
                            <input type="file" id="replyFile" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'reply')} />
                            <label htmlFor="replyFile" className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg cursor-pointer font-bold transition-colors">點此選圖</label>
                        </div>
                        {replyImage && (
                            <div className="mt-3 flex items-center gap-3">
                                <img src={replyImage.url} className="h-16 rounded border border-amber-200 shadow-sm"/>
                                <button onClick={() => setReplyImage(null)} className="text-red-500 text-xs font-bold hover:underline">移除圖片</button>
                            </div>
                        )}
                    </div>

                    {feedbacks.map(fb => (
                        <div key={fb.id} className={`p-4 border rounded-xl shadow-sm ${fb.status === 'replied' ? 'bg-gray-50 border-gray-200 dark:bg-stone-900 dark:border-stone-700 opacity-70' : 'bg-white border-amber-300 dark:bg-stone-800 dark:border-amber-600'}`}>
                            <div className="flex justify-between items-center text-xs mb-2 text-gray-500 dark:text-gray-400">
                                <span className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                                    <span className={`px-1.5 py-0.5 rounded text-white text-[10px] ${fb.type === '兌換申請' ? 'bg-rose-500' : 'bg-cyan-600'}`}>{fb.type}</span> 
                                    {fb.userName}
                                </span>
                                <span>{fb.createdAt?.toDate().toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-800 dark:text-gray-200 mb-3 whitespace-pre-wrap">{fb.text}</p>
                            
                            {/* ✨ 顯示用戶上傳的圖片 */}
                            {fb.imageUrl && (
                                <div className="mb-3">
                                    <img src={fb.imageUrl} className="max-h-40 rounded border border-gray-200 dark:border-stone-600 cursor-zoom-in shadow-sm hover:opacity-90 transition-opacity" onClick={() => window.open(fb.imageUrl, '_blank')} alt="附圖" />
                                </div>
                            )}

                            <div className="flex justify-end gap-2 items-center">
                                {/* 修改：刪除按鈕現在會觸發包含圖片刪除的 handleDeleteFeedback */}
                                <button onClick={() => handleDeleteFeedback(fb)} className="text-red-500 hover:text-red-600 text-sm px-3 py-1 font-bold">刪除紀錄</button>
                                
                                {fb.status !== 'replied' ? (
                                    <button onClick={() => handleReply(fb)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors">
                                        {replyImage ? '帶圖回覆' : '回覆信件'}
                                    </button>
                                ) : (
                                    <span className="text-gray-400 text-sm font-bold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">check_circle</span> 已回覆
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

window.ServiceCenter = ServiceCenter;