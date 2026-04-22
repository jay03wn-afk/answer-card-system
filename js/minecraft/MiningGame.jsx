const { useState, useEffect, useRef } = React;;


  function MiningGame({ user, userProfile, mcData, updateMcData, onQuit, showAlert }) {
    const preloadFastSound = window.preloadFastSound;
    const playCachedSound = window.playCachedSound;
    const McImg = window.McImg;
    const [gameState, setGameState] = useState('idle');
    const [board, setBoard] = useState(Array(9).fill(null));
    const [isProcessing, setIsProcessing] = useState(false);
    
    // ✨ 新增敲擊音效與破壞音效
    const hitSfx = useRef(new Audio('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/block/stone/hit1.ogg'));
    const breakSfx = useRef(new Audio('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/block/stone/break1.ogg'));
    const winSfx = useRef(new Audio('https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/win.mp3'));
    const bgmRef = useRef(null);

    const imgStone = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/stone.png";
    const imgDiamond = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond.png";
    const crackStage1 = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/destroy_stage_2.png";
    const crackStage2 = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/destroy_stage_6.png";

    // ✨ 判斷是否為管理員
    const isAdmin = user && (user.email === 'jay03wn@gmail.com' || userProfile?.isAuthorized);
    
    // ✨ 預設獎池與狀態
    const DEFAULT_PRIZES = [
        { id: '711', name: '7-11 50元禮券', type: 'real', prob: 0.001, img: 'https://i.postimg.cc/pd20TjLs/638632987880299781.png', desc: '極巨獎！', limit: 2, code: '711GIFT50TWD' },
        { id: 'diamond_jackpot', name: '鑽石礦 (+100 💎)', type: 'diamond', amount: 100, prob: 0.049, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/diamond_ore.png' },
        { id: 'pack_legendary', name: '終界寶箱 (禮包)', type: 'pack', prob: 0.02, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/respawn_anchor_top.png' },
        { id: 'pack_rare', name: '廢棄礦井箱 (禮包)', type: 'pack', prob: 0.08, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/barrel_side.png' },
        { id: 'gold_ore', name: '金礦 (+50 💎)', type: 'diamond', amount: 50, prob: 0.15, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/gold_ore.png' },
        { id: 'iron_ore', name: '鐵礦 (+20 💎)', type: 'diamond', amount: 20, prob: 0.25, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/iron_ore.png' },
        { id: 'coal_ore', name: '煤礦 (+5 💎)', type: 'diamond', amount: 5, prob: 0.45, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/coal_ore.png' }
    ];

    // ✨ 提供後台編輯使用的模板圖片庫
    const IMG_TEMPLATES = [
        'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/diamond_ore.png',
        'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/gold_ore.png',
        'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/iron_ore.png',
        'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/coal_ore.png',
        'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/emerald_ore.png',
        'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/lapis_ore.png',
        'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/redstone_ore.png',
        'https://i.postimg.cc/pd20TjLs/638632987880299781.png', // 7-11
        'https://i.postimg.cc/bwPx54VC/Minecraft-Chest.jpg', // 寶箱
        'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/barrel_side.png',
        'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/respawn_anchor_top.png',
        'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond_sword.png',
        'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/totem_of_undying.png'
    ];

    const [prizes, setPrizes] = useState(DEFAULT_PRIZES);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [editingPrize, setEditingPrize] = useState(null); // null 代表清單模式，有資料代表編輯模式
    const [showProbModal, setShowProbModal] = useState(false); // ✨ 新增機率表 Modal 狀態

    useEffect(() => {
        // 從 Firebase 載入獎池資料
        window.db.collection('system').doc('mining').get().then(doc => {
            if (doc.exists && doc.data().prizes) {
                setPrizes(doc.data().prizes);
            }
        }).catch(e => console.error("無法讀取獎池設定", e));

        bgmRef.current = new Audio("https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/QE.mp3");
        bgmRef.current.loop = true;
        bgmRef.current.volume = 0.3;

        return () => {
            if (bgmRef.current) {
                bgmRef.current.pause();
                bgmRef.current.currentTime = 0;
            }
        };
    }, []);

    const handleStart = () => {
        const hasTicket = (mcData.miningTickets && mcData.miningTickets > 0);
        if (!hasTicket && mcData.diamonds < 50) return showAlert("💎 你的鑽石或挖礦券不足！\n趕快去簽到或做測驗賺取吧！");
        if (bgmRef.current) bgmRef.current.play().catch(e => console.log("BGM 自動播放被阻擋", e));

        if (hasTicket) {
            updateMcData({ miningTickets: mcData.miningTickets - 1 }, true);
        } else {
            updateMcData({ diamonds: mcData.diamonds - 50 }, true);
        }
        
        setBoard(Array(9).fill({ revealed: false, prize: null, hits: 0, isHit: false }));
        setGameState('playing');
    };

    const handleQuit = () => {
        if (bgmRef.current) bgmRef.current.pause();
        onQuit();
    };

    const drawPrize = async () => {
        const r = Math.random();
        let cumulative = 0;
        let selectedPrize = prizes[prizes.length - 1]; 

        for (let prize of prizes) {
            cumulative += Number(prize.prob);
            if (r <= cumulative) {
                selectedPrize = prize;
                break;
            }
        }

        // ✨ 檢查庫存與可抽出次數限制
        try {
            const sysDoc = await window.db.collection('system').doc('mining').get();
            const counts = sysDoc.exists ? (sysDoc.data().prizeCounts || {}) : {};
            
            if (selectedPrize.limit && counts[selectedPrize.id] >= selectedPrize.limit) {
                // 若抽完，替換為鑽石礦或其他保底獎項
                selectedPrize = prizes.find(p => p.type === 'diamond') || prizes[0]; 
            } else if (selectedPrize.limit) {
                await window.db.collection('system').doc('mining').set({
                    [`prizeCounts.${selectedPrize.id}`]: window.firebase.firestore.FieldValue.increment(1)
                }, { merge: true });
            }
        } catch (e) {
            selectedPrize = prizes.find(p => p.type === 'diamond') || prizes[0]; 
        }
        return selectedPrize;
    };

    const handleDig = async (index) => {
        if (gameState !== 'playing' || isProcessing) return;
        const currentBlock = board[index];

        if (currentBlock.hits < 2) {
            try { hitSfx.current.currentTime = 0; hitSfx.current.play(); } catch(e){}
            setBoard(prev => {
                const newBoard = [...prev];
                newBoard[index] = { ...newBoard[index], hits: currentBlock.hits + 1, isHit: true };
                return newBoard;
            });
            setTimeout(() => {
                setBoard(prev => {
                    const newBoard = [...prev];
                    if (newBoard[index]) newBoard[index].isHit = false;
                    return newBoard;
                });
            }, 100);
            return;
        }

        setIsProcessing(true);
        try { breakSfx.current.currentTime = 0; breakSfx.current.play(); } catch(e){}

        const prize = await drawPrize();

        const newBoard = Array(9).fill(null).map((_, i) => {
            if (i === index) return { revealed: true, prize: prize, isPick: true, hits: 3, isHit: false };
            const shouldShowFakeGift = Math.random() < 0.04; 
            let dummy;
            if (shouldShowFakeGift) {
                dummy = prizes.find(p => p.id === '711') || prizes[0];
            } else {
                const normalPool = prizes.filter(p => p.id !== '711');
                dummy = normalPool[Math.floor(Math.random() * normalPool.length)] || prizes[0];
            }
            return { revealed: true, prize: dummy, isPick: false, hits: 0, isHit: false };
        });
        
        setBoard(newBoard);
        setGameState('revealed');

        if (prize.amount >= 0 || prize.type === 'item' || prize.type === 'real') {
            setTimeout(() => { try { winSfx.current.currentTime = 0; winSfx.current.volume = 0.8; winSfx.current.play(); } catch(e){} }, 300);
        }

        let updates = {}; 
        let msg = `🎉 恭喜挖到了 ${prize.name}！`;

        if (prize.type === 'diamond') {
            updates.diamonds = mcData.diamonds + Number(prize.amount);
        } else if (prize.type === 'item') {
            if (!(mcData.items || []).includes(prize.id)) {
                updates.items = [...(mcData.items || []), prize.id];
            } else {
               updates.diamonds = mcData.diamonds + 30; 
                msg += " \n(你已擁有此裝備，自動轉換為 30 💎)";
            }
        } else if (prize.type === 'pack') {
            updates.packs = { ...(mcData.packs || {}) };
            updates.packs[prize.id] = (updates.packs[prize.id] || 0) + 1;
            msg += "\n📦 (已自動存入養成頁面的「終界儲物箱」中)";
        } else if (prize.type === 'real') {
            msg += `\n\n🎫 你的兌換序號為：【${prize.code || '未設定序號'}】\n請至左側選單的「服務中心」輸入序號兌換獎品！`;
            showAlert(msg); 
        }

        const historyEntry = {
            id: Date.now(),
            date: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            prizeName: prize.name,
            isBigWin: prize.amount >= 50 || prize.type === 'item' || prize.type === 'real'
        };
        updates.miningHistory = [historyEntry, ...(mcData.miningHistory || [])].slice(0, 20);

        updateMcData(updates, true);
        setIsProcessing(false);
    };

    // ✨ 後台儲存獎池邏輯
    const saveAdminPrizes = async (updatedPrizes) => {
        try {
            await window.db.collection('system').doc('mining').set({ prizes: updatedPrizes }, { merge: true });
            setPrizes(updatedPrizes);
            setEditingPrize(null);
            showAlert("✅ 獎池設定已成功儲存！");
        } catch (e) {
            showAlert("❌ 儲存失敗：" + e.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] bg-gray-950 bg-opacity-90 flex items-center justify-center p-2 sm:p-4 animate-in fade-in font-mono">
            <div className="bg-gray-900 border-2 border-emerald-500/50 rounded-xl max-w-4xl w-full relative shadow-[0_0_30px_rgba(16,185,129,0.3)] flex flex-col md:flex-row h-[500px]">
                
                {/* ✨ 管理員專屬編輯按鈕 */}
                {isAdmin && (
                    <button onClick={() => setShowAdminModal(true)} className="absolute -top-4 right-10 bg-amber-600 text-white px-3 py-1 border border-amber-400 font-bold hover:bg-amber-500 z-10 shadow-[0_0_10px_rgba(251,191,36,0.5)] text-sm rounded">
                        ⚙️ 編輯獎池
                    </button>
                )}
                <button onClick={handleQuit} className="absolute -top-4 -right-4 bg-gray-800 text-gray-400 w-10 h-10 border border-gray-600 font-black hover:text-red-400 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10 transition-all rounded-full">✖</button>
                
                <div className="w-full md:w-3/5 p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-emerald-500/30">
                    <h2 className="text-2xl font-black text-emerald-400 mb-2 drop-shadow-[0_0_5px_rgba(52,211,153,0.6)] flex flex-wrap items-center gap-2">
                        ⛏️ 礦坑尋寶 
                        <span className="text-sm font-normal text-cyan-300 bg-gray-950 border border-cyan-800/50 shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] px-2 py-1 rounded drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">擁有: {mcData.diamonds} 💎</span>
                        <span className="text-sm font-normal text-amber-300 bg-gray-950 border border-amber-800/50 shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] px-2 py-1 rounded drop-shadow-[0_0_5px_rgba(251,191,36,0.4)]">挖礦券: {mcData.miningTickets || 0} 張</span>
                    </h2>
                    <p className="text-gray-400 font-bold mb-6 text-sm">每次開挖優先消耗 1 張挖礦券，否則消耗 50 💎，有機會挖中神級裝備或實體大獎！</p>

                    {gameState === 'idle' ? (
                        <div className="flex-grow flex flex-col items-center justify-center w-full">
                            <button onClick={handleStart} className="bg-emerald-600/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)] hover:shadow-[0_0_25px_rgba(52,211,153,0.6)] px-6 py-4 text-xl sm:text-2xl animate-pulse flex flex-col items-center mb-4 transition-all rounded">
                                <span>開始挖礦</span>
                                <span className="text-sm mt-1 font-bold text-emerald-200/70">
                                    {((mcData.miningTickets || 0) > 0) ? "🎫 消耗 1 張挖礦券" : <span className="flex items-center">消耗 50 <McImg src={imgDiamond} className="w-4 h-4 ml-1 inline pixelated"/></span>}
                                </span>
                            </button>
                            <button onClick={() => setShowProbModal(true)} className="text-amber-400/80 font-bold hover:text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]">
                                🎁 查看獎池與機率
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 w-full max-w-[300px] aspect-square bg-gray-950 p-2 border border-emerald-500/30 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] rounded-md">
                            {board.map((block, i) => (
                                <button 
                                    key={i} 
                                    disabled={gameState === 'revealed' || isProcessing}
                                    onClick={() => handleDig(i)}
                                    style={block.isHit ? { transform: 'scale(0.95)', filter: 'brightness(1.5)' } : {}}
                                    className={`relative w-full h-full border-2 border-black transition-all duration-75 ${!block.revealed ? 'hover:scale-105 hover:brightness-110 cursor-pointer' : ''}`}
                                >
                                    {!block.revealed ? (
                                        <>
                                            <McImg src={imgStone} className="w-full h-full object-cover pixelated" />
                                            {block.hits >= 1 && <McImg src={crackStage1} className="absolute inset-0 w-full h-full object-cover pixelated opacity-80 mix-blend-multiply" />}
                                            {block.hits >= 2 && <McImg src={crackStage2} className="absolute inset-0 w-full h-full object-cover pixelated opacity-90 mix-blend-multiply" />}
                                        </>
                                    ) : (
                                        <div className={`w-full h-full flex flex-col items-center justify-center p-1 ${block.isPick ? 'bg-amber-100 border-amber-500 border-4 animate-in zoom-in' : 'bg-[#5c5c5c] opacity-50'}`}>
                                            <McImg src={block.prize?.img} className="w-10 h-10 pixelated drop-shadow-md mb-1" />
                                            {block.isPick && <span className="text-[10px] font-bold text-stone-800 text-center leading-tight truncate w-full">{block.prize?.name.split(' ')[0]}</span>}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {gameState === 'revealed' && (
                        <button onClick={handleStart} className="mt-6 bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 border-2 border-black font-bold text-lg shadow-lg">
                            🔄 再挖一次 ({((mcData.miningTickets || 0) > 0) ? "消耗 1 張挖礦券 🎫" : "消耗 50 💎"})
                        </button>
                    )}
                </div>

                <div className="w-full md:w-2/5 bg-[#2d2d2d] p-4 flex flex-col h-full">
                    <h3 className="text-amber-400 font-bold border-b-2 border-gray-600 pb-2 mb-3 shrink-0 flex items-center">
                        📜 我的挖礦紀錄
                    </h3>
                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {(!mcData.miningHistory || mcData.miningHistory.length === 0) ? (
                            <p className="text-gray-500 text-sm text-center mt-10">尚無紀錄，趕快開挖吧！</p>
                        ) : (
                            mcData.miningHistory.map((rec) => (
                                <div key={rec.id} className={`p-2 text-sm border-l-4 bg-opacity-10 flex justify-between items-center ${rec.isBigWin ? 'border-amber-400 bg-amber-400 text-amber-300' : 'border-gray-500 bg-[#FCFBF7] text-gray-300'}`}>
                                    <span className="font-mono text-gray-500 text-xs shrink-0 w-16">{rec.date}</span>
                                    <span className={`font-bold truncate ${rec.isBigWin ? 'animate-pulse' : ''}`}>{rec.prizeName}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ✨ 管理員獎池設定 Modal */}
            {isAdmin && showAdminModal && (
                <div className="fixed inset-0 z-[100] bg-black bg-opacity-80 flex justify-center items-center p-4">
                    <div className="bg-stone-800 border-4 border-gray-600 p-6 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4 border-b-2 border-gray-600 pb-2">
                            <h2 className="text-white text-2xl font-black text-amber-400">⚙️ 編輯礦坑獎池</h2>
                            <button onClick={() => { setShowAdminModal(false); setEditingPrize(null); }} className="text-red-500 font-black text-xl hover:text-red-400">✖</button>
                        </div>
                        
                        {!editingPrize ? (
                            // 清單模式
                            <div className="flex flex-col flex-grow overflow-hidden">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-300 font-bold text-sm">目前總機率：{(prizes.reduce((sum, p) => sum + Number(p.prob), 0) * 100).toFixed(1)}%</span>
                                    <button onClick={() => setEditingPrize({ id: 'prize_' + Date.now(), name: '', type: 'diamond', amount: 10, prob: 0.05, img: IMG_TEMPLATES[0] })} className="bg-emerald-600 text-white px-4 py-1 font-bold rounded hover:bg-emerald-500">➕ 新增獎項</button>
                                </div>
                                <div className="overflow-y-auto custom-scrollbar flex-grow space-y-2 pr-2">
                                    {prizes.map((p, idx) => (
                                        <div key={idx} className="bg-stone-900 p-3 rounded border border-gray-700 flex justify-between items-center hover:border-amber-500 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <McImg src={p.img} fallback="📦" className="w-10 h-10 pixelated" />
                                                <div>
                                                    <p className="text-white font-bold">{p.name}</p>
                                                    <p className="text-xs text-gray-400">
                                                        類型: <span className="text-emerald-400">{p.type === 'diamond' ? `鑽石 (${p.amount})` : p.type === 'real' ? '實體獎勵' : p.type === 'pack' ? '禮包' : '裝備'}</span> | 
                                                        機率: <span className="text-amber-400">{(p.prob * 100).toFixed(2)}%</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingPrize(p)} className="bg-amber-600 text-white px-3 py-1 rounded text-sm font-bold">編輯</button>
                                                <button onClick={() => {
                                                    if(confirm("確定刪除此獎項？")) {
                                                        const newP = prizes.filter(item => item.id !== p.id);
                                                        saveAdminPrizes(newP);
                                                    }
                                                }} className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold">刪除</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            // 編輯模式
                            <div className="flex flex-col flex-grow overflow-y-auto custom-scrollbar pr-2">
                                <h3 className="text-white font-bold mb-4">{editingPrize.name ? '✏️ 編輯獎品' : '✨ 新增獎品'}</h3>
                                
                                <label className="text-gray-400 text-xs font-bold mb-1">獎品名稱</label>
                                <input type="text" value={editingPrize.name} onChange={e => setEditingPrize({...editingPrize, name: e.target.value})} className="mb-3 p-2 bg-stone-900 text-white border border-gray-600 rounded outline-none" placeholder="例如：1000鑽石大獎" />
                                
                                <label className="text-gray-400 text-xs font-bold mb-1">抽中機率 (小數點，例如 0.05 代表 5%)</label>
                                <input type="number" step="0.001" value={editingPrize.prob} onChange={e => setEditingPrize({...editingPrize, prob: parseFloat(e.target.value) || 0})} className="mb-3 p-2 bg-stone-900 text-white border border-gray-600 rounded outline-none" />

                                <label className="text-gray-400 text-xs font-bold mb-1">獎勵類型</label>
                                <select value={editingPrize.type} onChange={e => setEditingPrize({...editingPrize, type: e.target.value})} className="mb-3 p-2 bg-stone-900 text-white border border-gray-600 rounded outline-none">
                                    <option value="diamond">💎 鑽石 (直接派發)</option>
                                    <option value="real">🎫 實體物品 (請玩家截圖)</option>
                                    <option value="pack">📦 盲盒禮包 (存入終界箱)</option>
                                    <option value="item">🗡️ 裝備/道具</option>
                                </select>

                                {editingPrize.type === 'diamond' && (
                                    <>
                                        <label className="text-gray-400 text-xs font-bold mb-1">給予的鑽石數量</label>
                                        <input type="number" value={editingPrize.amount || 0} onChange={e => setEditingPrize({...editingPrize, amount: parseInt(e.target.value) || 0})} className="mb-3 p-2 bg-stone-900 text-white border border-gray-600 rounded outline-none" />
                                    </>
                                )}

                                {editingPrize.type === 'real' && (
                                    <>
                                        <label className="text-gray-400 text-xs font-bold mb-1">兌換序號 (12碼，供玩家至服務中心兌換)</label>
                                        <input type="text" maxLength="12" value={editingPrize.code || ''} onChange={e => setEditingPrize({...editingPrize, code: e.target.value})} className="mb-3 p-2 bg-stone-900 text-white border border-gray-600 rounded outline-none" placeholder="例如：ABCDEF123456" />
                                    </>
                                )}
                                
                                <label className="text-gray-400 text-xs font-bold mb-1">可抽出總次數 (留空代表無上限)</label>
                                <input type="number" value={editingPrize.limit || ''} onChange={e => setEditingPrize({...editingPrize, limit: e.target.value === '' ? '' : parseInt(e.target.value)})} className="mb-3 p-2 bg-stone-900 text-white border border-gray-600 rounded outline-none" placeholder="無上限" />

                                <label className="text-gray-400 text-xs font-bold mb-1">快速選取圖片模板</label>
                                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 mb-3 bg-stone-900 p-2 rounded border border-gray-700">
                                    {IMG_TEMPLATES.map(url => (
                                        <div key={url} onClick={() => setEditingPrize({...editingPrize, img: url})} className={`cursor-pointer border-2 p-1 flex items-center justify-center ${editingPrize.img === url ? 'border-amber-400 bg-stone-700' : 'border-transparent hover:border-gray-500'}`}>
                                            <McImg src={url} className="w-8 h-8 pixelated" fallback="📦" />
                                        </div>
                                    ))}
                                </div>

                                <label className="text-gray-400 text-xs font-bold mb-1">或自訂圖片網址 (URL)</label>
                                <input type="text" value={editingPrize.img} onChange={e => setEditingPrize({...editingPrize, img: e.target.value})} className="mb-6 p-2 bg-stone-900 text-white border border-gray-600 rounded outline-none" />

                                <div className="flex gap-4 mt-auto">
                                    <button onClick={() => setEditingPrize(null)} className="flex-1 bg-gray-600 text-white font-bold py-2 rounded hover:bg-gray-500">取消</button>
                                    <button onClick={() => {
                                        if(!editingPrize.name) return showAlert("請填寫獎品名稱！");
                                        let newPrizes = [...prizes];
                                        const existsIndex = newPrizes.findIndex(p => p.id === editingPrize.id);
                                        if (existsIndex >= 0) {
                                            newPrizes[existsIndex] = editingPrize;
                                        } else {
                                            newPrizes.push(editingPrize);
                                        }
                                        saveAdminPrizes(newPrizes);
                                    }} className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded hover:bg-emerald-500">儲存變更</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ✨ 機率表 Modal */}
            {showProbModal && (
                <div className="fixed inset-0 z-[100] bg-black bg-opacity-80 flex justify-center items-center p-4">
                    <div className="bg-stone-800 border-4 border-gray-600 p-6 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center mb-4 border-b-2 border-gray-600 pb-2">
                            <h2 className="text-white text-xl font-black text-amber-400">🎁 礦坑獎池機率表</h2>
                            <button onClick={() => setShowProbModal(false)} className="text-red-500 font-black text-xl hover:text-red-400">✖</button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-grow space-y-2 pr-2">
                            {prizes.sort((a,b) => b.prob - a.prob).map((p, idx) => (
                                <div key={idx} className="bg-stone-900 p-3 rounded border border-gray-700 flex items-center gap-4">
                                    <McImg src={p.img} fallback="📦" className="w-10 h-10 pixelated" />
                                    <div className="flex-grow">
                                        <p className="text-white font-bold">{p.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {p.limit ? `限量: ${p.limit} 份` : '無上限'}
                                        </p>
                                    </div>
                                    <div className="text-amber-400 font-black text-right">
                                        {(p.prob * 100).toFixed(2)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}