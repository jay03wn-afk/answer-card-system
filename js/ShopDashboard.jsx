// ShopDashboard.jsx
const { useState, useEffect } = React;

function ShopDashboard({ user, userProfile, showAlert, showConfirm, showPrompt }) {
    const [items, setItems] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    
    // ✨ 新增 stock (庫存) 與上傳狀態
    const [form, setForm] = useState({ name: '', desc: '', price: 0, limit: 1, stock: 10, img: '' });
    const [uploadingImg, setUploadingImg] = useState(false);
    
    const isAdmin = user && user.email === 'jay03wn@gmail.com';

    // 取得商店資料
    useEffect(() => {
        const unsub = window.db.collection('shopItems').onSnapshot(snap => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // 產生 10 位英數代碼
    const generateCode = () => Math.random().toString(36).substring(2, 12).toUpperCase();

    // ✨ 新增：處理商品圖片的壓縮與上傳
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImg(true);
        
        // 1. 圖片壓縮 (Canvas)
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.7));
                
                // 2. 上傳到 Storage
                try {
                    const storageRef = window.storage.ref(`shopItems/${Date.now()}_${file.name}`);
                    await storageRef.put(blob);
                    const downloadUrl = await storageRef.getDownloadURL();
                    
                    setForm(prev => ({ ...prev, img: downloadUrl }));
                    if (window.setGlobalToast) window.setGlobalToast({ status: 'success', message: '圖片上傳成功！' });
                } catch (err) {
                    showAlert("圖片上傳失敗：" + err.message);
                } finally {
                    setUploadingImg(false);
                }
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    };

    // 管理員發送兌換圖檔給玩家
    const handleUploadAndReply = async (targetUid, orderId) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            showAlert("正在處理圖片並上傳...");
            
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    let width = img.width;
                    let height = img.height;
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.7));
                    
                    const storageRef = window.storage.ref(`redemptions/${Date.now()}_${file.name}`);
                    await storageRef.put(blob);
                    const downloadUrl = await storageRef.getDownloadURL();

                    await window.db.collection('users').doc(targetUid).collection('mailbox').add({
                        title: '商品兌換資訊',
                        content: `管理員已發送您的兌換券資訊！\n圖片連結：${downloadUrl}`,
                        imageUrl: downloadUrl,
                        isRead: false,
                        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    showAlert("兌換資訊已發送至玩家信箱！");
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const handleBuy = async (item) => {
        const diamonds = userProfile?.mcData?.diamonds || 0;
        
        // ✨ 新增庫存檢查
        if (item.stock <= 0) return showAlert("很抱歉，此商品已被搶購一空！");
        if (diamonds < item.price) return showAlert("鑽石不足！");

        showConfirm(`確定要花費 ${item.price} 鑽石購買「${item.name}」嗎？`, async () => {
            const buyCode = generateCode();
            const batch = window.db.batch();
            
            // 1. 扣除玩家鑽石
            batch.set(window.db.collection('users').doc(user.uid), {
                mcData: { diamonds: diamonds - item.price }
            }, { merge: true });

            // 2. 紀錄玩家訂單
            const orderId = window.db.collection('users').doc(user.uid).collection('orders').doc().id;
            batch.set(window.db.collection('users').doc(user.uid).collection('orders').doc(orderId), {
                productId: item.id,
                productName: item.name,
                code: buyCode,
                price: item.price,
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            // 3. ✨ 扣除商品庫存 (使用 FieldValue 自動減少)
            batch.update(window.db.collection('shopItems').doc(item.id), {
                stock: window.firebase.firestore.FieldValue.increment(-1)
            });

            // 4. 發送重要通知給管理員
            const adminUidSnap = await window.db.collection('users').where('email', '==', 'jay03wn@gmail.com').get();
            if (!adminUidSnap.empty) {
                const adminUid = adminUidSnap.docs[0].id;
                batch.set(window.db.collection('users').doc(adminUid).collection('mailbox').doc(), {
                    title: '新訂單通知！',
                    content: `玩家 ${userProfile.displayName} 購買了「${item.name}」\n購買代碼：${buyCode}\n玩家UID：${user.uid}`,
                    category: 'system_order', 
                    userUid: user.uid,
                    buyCode: buyCode,
                    isRead: false,
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            await batch.commit();
            showAlert(`購買成功！\n您的購買代碼為：${buyCode}\n請等待管理員發送兌換資訊。`);
        });
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black flex items-center gap-2 dark:text-white">
                    <span className="material-symbols-outlined text-amber-500 text-3xl">storefront</span> 
                    JJay 鑽石商店
                </h1>
                {isAdmin && (
                    <button onClick={() => setIsAdding(!isAdding)} className="bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1 hover:bg-stone-700 transition-colors shadow-sm active:scale-95">
                        <span className="material-symbols-outlined text-[18px]">{isAdding ? 'close' : 'add'}</span>
                        {isAdding ? '關閉管理' : '新增商品'}
                    </button>
                )}
            </div>

            {isAdmin && isAdding && (
                <div className="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-stone-200 dark:border-stone-700 mb-6 space-y-3 shadow-md animate-fade-in">
                    <h3 className="font-bold text-amber-600 dark:text-amber-400 border-b border-stone-100 dark:border-stone-700 pb-2 mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">add_business</span> 上架新商品
                    </h3>
                    
                    {/* ✨ 圖片上傳區 */}
                    <div className="flex items-center gap-3 mb-2">
                        <label className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-white px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors border border-stone-300 dark:border-stone-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[18px]">image</span>
                            {uploadingImg ? '圖片壓縮上傳中...' : '上傳商品圖片'}
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImg} />
                        </label>
                        {form.img && <img src={form.img} alt="預覽" className="h-10 w-10 object-cover rounded-md border border-gray-300" />}
                    </div>

                    <input type="text" placeholder="商品名稱" className="w-full p-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-gray-50 dark:bg-stone-700 dark:text-white outline-none focus:border-amber-500 transition-colors font-bold" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
                    <textarea placeholder="內容描述" className="w-full p-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-gray-50 dark:bg-stone-700 dark:text-white outline-none focus:border-amber-500 transition-colors resize-none h-24 font-bold" value={form.desc} onChange={e=>setForm({...form, desc: e.target.value})} />
                    
                    {/* ✨ 加入總庫存輸入欄位 */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold mb-1 block">售價 (鑽石)</label>
                            <input type="number" placeholder="售價" className="w-full p-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-gray-50 dark:bg-stone-700 dark:text-white outline-none focus:border-amber-500 font-bold" value={form.price} onChange={e=>setForm({...form, price: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold mb-1 block">總庫存數量</label>
                            <input type="number" placeholder="庫存" className="w-full p-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-gray-50 dark:bg-stone-700 dark:text-white outline-none focus:border-amber-500 font-bold" value={form.stock} onChange={e=>setForm({...form, stock: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold mb-1 block">每人限購數量</label>
                            <input type="number" placeholder="限購數量" className="w-full p-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-gray-50 dark:bg-stone-700 dark:text-white outline-none focus:border-amber-500 font-bold" value={form.limit} onChange={e=>setForm({...form, limit: Number(e.target.value)})} />
                        </div>
                    </div>

                    <button onClick={() => {
                        if (!form.name || form.price <= 0 || form.stock < 0) return showAlert("請填寫完整的商品名稱、大於0的售價及庫存！");
                        if (uploadingImg) return showAlert("圖片仍在處理中，請稍候...");
                        
                        window.db.collection('shopItems').add({...form, createdAt: window.firebase.firestore.FieldValue.serverTimestamp()});
                        setIsAdding(false);
                        setForm({ name: '', desc: '', price: 0, limit: 1, stock: 10, img: '' });
                        if(window.setGlobalToast) window.setGlobalToast({ status: 'success', message: '商品已上架！' });
                        else showAlert("商品已上架！");
                    }} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1 mt-2">
                        <span className="material-symbols-outlined text-[18px]">publish</span> 確認上架
                    </button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-10 text-stone-500 font-bold animate-pulse flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-3xl animate-spin">sync</span>
                    載入商品中...
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-20 bg-[#FCFBF7] dark:bg-stone-800 border-2 border-dashed border-gray-300 dark:border-stone-700 rounded-3xl text-gray-500 font-bold flex flex-col items-center justify-center gap-3">
                    <span className="material-symbols-outlined text-5xl opacity-50">shopping_basket</span>
                    目前沒有商品上架喔！
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {items.map(item => (
                        <div key={item.id} className="bg-white dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-3xl p-5 flex flex-col shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                            
                            {/* ✨ 顯示商品圖片 */}
                            {item.img && (
                                <div className="w-full h-40 mb-4 rounded-xl overflow-hidden bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shrink-0">
                                    <img src={item.img} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-3 z-10">
                                <div>
                                    <h3 className="text-lg font-black dark:text-white leading-tight pr-2 mb-1">{item.name}</h3>
                                    {/* ✨ 顯示庫存狀況 */}
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.stock > 0 ? 'bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-gray-300' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {item.stock > 0 ? `剩餘庫存: ${item.stock}` : '已售完'}
                                    </span>
                                </div>
                                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-lg text-sm font-black flex items-center gap-1 shadow-sm shrink-0">
                                    <span className="material-symbols-outlined text-[16px]">diamond</span> {item.price}
                                </span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5 flex-grow font-bold whitespace-pre-wrap leading-relaxed z-10">{item.desc}</p>
                            
                            <div className="flex gap-2 z-10 mt-auto">
                                <button 
                                    onClick={() => handleBuy(item)} 
                                    disabled={item.stock <= 0}
                                    className={`flex-1 font-black py-3 rounded-2xl shadow-sm flex items-center justify-center gap-1 transition-all ${item.stock > 0 ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 hover:scale-[1.02] active:scale-95' : 'bg-gray-200 text-gray-500 dark:bg-stone-700 dark:text-stone-500 cursor-not-allowed'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{item.stock > 0 ? 'shopping_cart' : 'production_quantity_limits'}</span> 
                                    {item.stock > 0 ? '立即購買' : '補貨中'}
                                </button>
                                {isAdmin && (
                                    <button onClick={() => showConfirm("確定要下架此商品？", () => window.db.collection('shopItems').doc(item.id).delete())} className="p-3 bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

window.ShopDashboard = ShopDashboard;