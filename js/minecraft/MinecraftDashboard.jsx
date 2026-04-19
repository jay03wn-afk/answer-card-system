const { useState, useEffect, useRef } = React;

  function MinecraftDashboard({ user, userProfile, showAlert }) {
    const preloadFastSound = window.preloadFastSound;
    const playCachedSound = window.playCachedSound;
    const McImg = window.McImg;
   const [leaderboard, setLeaderboard] = useState([]);
    const [showMiniGame, setShowMiniGame] = useState(false);
    const [showMiningGame, setShowMiningGame] = useState(false); 
    const [showSandbox, setShowSandbox] = useState(false);
    const [showVolleyball, setShowVolleyball] = useState(false);
    const [showPoke, setShowPoke] = useState(false);
    const [showMj, setShowMj] = useState(false); // ✨ 新增麻將狀態
    
    // ✨ 新增：村民狀態與終界儲物箱狀態
    const [showEnderChest, setShowEnderChest] = useState(false);
    const [villagerSpeech, setVillagerSpeech] = useState("哼嗯... 看看這些好東西！");
    const [villagerAnim, setVillagerAnim] = useState("");
    const [openedPackResult, setOpenedPackResult] = useState(null); // ✨ 新增：記錄開箱結果的狀態
    
    // ✨ 新增：商店分類標籤狀態
    const [storeCat, setStoreCat] = useState('全部');
    const STORE_CATEGORIES = ['全部', '食物藥水', '裝備道具', '盲盒禮包'];

    // ✨ 修正：確保 mcData 的數值不為 NaN
    const rawMcData = userProfile.mcData || {};
    const safeNum = (val, def) => {
        const num = Number(val);
        return !isNaN(num) ? num : def;
    };
    
    const mcData = {
        ...rawMcData,
        diamonds: safeNum(rawMcData.diamonds, 0),
        level: safeNum(rawMcData.level, 1),
        exp: safeNum(rawMcData.exp, 0),
        hunger: safeNum(rawMcData.hunger, 10),
        cats: safeNum(rawMcData.cats, 0),
        sandbox_cols: safeNum(rawMcData.sandbox_cols, 20),
        miningTickets: safeNum(rawMcData.miningTickets, 0),
        items: rawMcData.items || [],
        lastCheckIn: rawMcData.lastCheckIn || null,
        packs: rawMcData.packs || {}
    };
    
    const todayTW = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const isCheckedIn = mcData.lastCheckIn === todayTW;
    
    const expToNextLevel = mcData.level * 20;
    
    const mcBase = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item";
    const imgDiamond = `${mcBase}/diamond.png`;
    const imgSteve = "https://minotar.net/helm/Steve/64.png";

    // ✨ 更新：加入武器、不死圖騰與分類
    const storeItems = [
        { id: 'apple', name: '蘋果 (+3 飽食)', cat: '食物藥水', type: 'food', cost: 10, value: 3, img: `${mcBase}/apple.png`, icon: '🍎' },
        { id: 'bread', name: '麵包 (+5 飽食)', cat: '食物藥水', type: 'food', cost: 15, value: 5, img: `${mcBase}/bread.png`, icon: '🍞' },
        { id: 'beef', name: '烤牛肉 (+8 飽食)', cat: '食物藥水', type: 'food', cost: 25, value: 8, img: `${mcBase}/cooked_beef.png`, icon: '🥩' },
        { id: 'golden_apple', name: '金蘋果 (+10飽食/EXP)', cat: '食物藥水', type: 'food_exp', cost: 50, value: 10, exp: 10, img: `${mcBase}/golden_apple.png`, icon: '🍏' },
        { id: 'laxative', name: '瀉藥 (多拉2坨水便)', cat: '食物藥水', type: 'medicine', cost: 30, value: 2, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/ghast_tear.png', icon: '💊' },
        
        { id: 'stone_sword', name: '石劍 (礦車擋1次怪)', cat: '裝備道具', type: 'weapon', cost: 10, durability: 1, img: `${mcBase}/stone_sword.png`, icon: '🗡️' },
        { id: 'iron_sword', name: '鐵劍 (礦車擋2次怪)', cat: '裝備道具', type: 'weapon', cost: 25, durability: 2, img: `${mcBase}/iron_sword.png`, icon: '🗡️' },
        { id: 'diamond_sword', name: '鑽石劍 (礦車擋3次怪)', cat: '裝備道具', type: 'weapon', cost: 60, durability: 3, img: `${mcBase}/diamond_sword.png`, icon: '🗡️' },
        { id: 'totem', name: '不死圖騰 (礦車免死1次)', cat: '裝備道具', type: 'magic', cost: 40, img: `${mcBase}/totem_of_undying.png`, icon: '🗿' },

        { id: 'pack_basic', name: '村莊木箱 (隨機方塊)', cat: '盲盒禮包', type: 'pack', cost: 100, img: 'https://i.postimg.cc/bwPx54VC/Minecraft-Chest.jpg', icon: '📦' },
        { id: 'pack_rare', name: '廢棄礦井箱 (進階方塊)', cat: '盲盒禮包', type: 'pack', cost: 300, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/barrel_side.png', icon: '🎁' },
        { id: 'pack_epic', name: '地獄遺跡箱 (珍稀方塊)', cat: '盲盒禮包', type: 'pack', cost: 600, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/nether_bricks.png', icon: '🔮' },
        { id: 'pack_legendary', name: '終界寶箱 (極稀有方塊)', cat: '盲盒禮包', type: 'pack', cost: 1000, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/respawn_anchor_top.png', icon: '🌟' },
        { id: 'pack_checkin', name: '每日簽到箱 (普通方塊)', cat: '盲盒禮包', type: 'pack', cost: 0, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/beehive_side.png', icon: '🛢️', hide: true }
    ];

    useEffect(() => {
        const fetchLeaderboard = async () => {
            const friendUids = (userProfile.friends || []).map(f => f.uid);
            if (friendUids.length === 0) {
                setLeaderboard([{ name: userProfile.displayName, ...mcData, isMe: true }]);
                return;
            }
            try {
                const board = [{ name: userProfile.displayName, ...mcData, isMe: true }];
                const promises = friendUids.map(uid => window.db.collection('users').doc(uid).get());
                const results = await Promise.all(promises);
                
                results.forEach(doc => {
                    if (doc.exists) {
                        const data = doc.data();
                        if (data.mcData) {
                            board.push({ name: data.displayName, ...data.mcData, isMe: false });
                        }
                    }
                });
                
                board.sort((a, b) => {
                    if (b.level !== a.level) return b.level - a.level;
                    return b.exp - a.exp;
                });
                
                setLeaderboard(board);
            } catch (e) {
                console.error("讀取排行榜失敗", e);
            }
        };
        fetchLeaderboard();
    }, [userProfile.friends, mcData]);

    const updateMcData = (updates, silent = false) => {
        // ✨ 改用 Firestore 的「點標記法」進行局部更新
        // 這樣結算鑽石時，就不會把舊的裝備狀態又覆蓋回資料庫了
        const dbUpdates = {};
        for (const key in updates) {
            dbUpdates[`mcData.${key}`] = updates[key];
        }

        window.db.collection('users').doc(user.uid).update(dbUpdates).catch(e => {
            if (!silent) showAlert('更新失敗：' + e.message);
        });
    };

    const handleCheckIn = () => {
        if (isCheckedIn) {
            return showAlert("今日已經簽到過囉！");
        }
        
        let newHunger = mcData.hunger - 2; 
        if (newHunger < 0) newHunger = 0;

        // ✨ 簽到時發放一個每日簽到箱
        const newPacks = { ...(mcData.packs || {}) };
        newPacks['pack_checkin'] = (newPacks['pack_checkin'] || 0) + 1;

        updateMcData({ 
            diamonds: mcData.diamonds + 20, 
            exp: mcData.exp + 10,
            hunger: newHunger,
            lastCheckIn: todayTW,
            packs: newPacks,
            miningTickets: mcData.miningTickets + 1
        });
        showAlert("✅ 簽到成功！獲得 20 💎、10 EXP 與 1 張挖礦券！\n(史蒂夫消耗了 2 點飽食度)\n🎁 額外獲得 1 個【每日簽到箱】，已放入終界儲物箱中！");
    };

    const handleBuy = (item) => {
        if (mcData.diamonds < item.cost) {
            playVillagerSound('no');
            setVillagerAnim('no');
            setVillagerSpeech("哼... 你的鑽石好像不夠買這個。");
            setTimeout(() => setVillagerAnim(""), 300);
            return showAlert(`鑽石不夠喔！需要 ${item.cost} 💎`);
        }

        let updates = { diamonds: mcData.diamonds - item.cost };
        let msg = "";

        if (item.type === 'food' || item.type === 'food_exp') {
            if (mcData.hunger >= 10) return showAlert("史蒂夫現在很飽了！不需要吃東西。");
            playCachedSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/random/eat1.ogg');
            updates.hunger = Math.min(10, mcData.hunger + item.value);
            msg = `🤤 史蒂夫吃下了 ${item.name.split(' ')[0]}，飽食度大增！`;
            
            if (item.exp) {
                let newExp = mcData.exp + item.exp;
                let newLevel = mcData.level;
                if (newExp >= newLevel * 20) {
                    newExp -= newLevel * 20;
                    newLevel += 1;
                    msg += `\n🌟 經驗值滿滿，恭喜升級！`;
                }
                updates.exp = newExp;
                updates.level = newLevel;
            }
            showAlert(msg);
        } else if (item.type === 'medicine') {
            playCachedSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/random/drink.ogg');
            updates.laxativeBonus = (mcData.laxativeBonus || 0) + item.value;
            showAlert(`🧪 史蒂夫一口乾了瀉藥... 肚子發出不妙的水聲！\n(額外獲得 ${item.value} 次噴水便機會)`);
        } else if (item.type === 'pack') {
            updates.packs = { ...(mcData.packs || {}) };
            updates.packs[item.id] = (updates.packs[item.id] || 0) + 1;
            showAlert(`📦 購買成功！【${item.name}】已為您存入「終界儲物箱」中！`);
        } else if (item.type === 'weapon') {
            if (mcData.activeSword) {
                return showAlert(`❌ 你的背包裡已經有一把【${mcData.activeSword.name}】了，請先在礦車遊戲中消耗掉它！`);
            }
            updates.activeSword = { id: item.id, name: item.name, durability: item.durability };
            showAlert(`🗡️ 購買成功！【${item.name}】已自動裝備，將在礦車遊戲中為你斬殺怪物！`);
        } else if (item.type === 'magic') {
            if (mcData.hasTotem) {
                return showAlert(`❌ 你已經擁有一個【不死圖騰】了，請先消耗掉它再買！`);
            }
            updates.hasTotem = true;
            showAlert(`🗿 購買成功！【不死圖騰】已自動裝備，將在礦車遊戲中為你擋下一次致命傷害！`);
        }

        playVillagerSound('yes');
        setVillagerAnim('yes');
        setVillagerSpeech("哈！真是筆好交易，感謝惠顧！");
        setTimeout(() => setVillagerAnim(""), 300);

        updateMcData(updates);
    };

    const handleMiniGameOver = (earnedDiamonds) => {
        if (earnedDiamonds > 0) {
            updateMcData({ diamonds: mcData.diamonds + earnedDiamonds }, true); 
        }
    };
    // ✨ 村民語音處理 (修正：換成最穩定有效的 1.16.5 官方路徑)
    const playVillagerSound = (type) => {
        const urls = {
            idle: [
                'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/mob/villager/idle1.ogg',
                'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/mob/villager/idle2.ogg',
                'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/mob/villager/idle3.ogg'
            ],
            yes: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/mob/villager/yes1.ogg',
            no: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/mob/villager/no1.ogg'
        };
        
        try {
            if (type === 'idle' && Array.isArray(urls.idle)) {
                const randomIdleUrl = urls.idle[Math.floor(Math.random() * urls.idle.length)];
                playCachedSound(randomIdleUrl);
            } else {
                playCachedSound(urls[type]);
            }
        } catch (e) {
            console.log("村民音效播放失敗", e);
        }
    };

    // ✨ 終界儲物箱開禮包邏輯
    const handleOpenPack = (packId) => {
        if (!mcData.packs || !mcData.packs[packId] || mcData.packs[packId] <= 0) return;
        
        const packData = storeItems.find(i => i.id === packId);
        if (!packData) return;

       let min, max, pools;
        
        // ✨ 定義「常見方塊池」：放入大量泥土、石頭、木材來稀釋高級方塊，讓鑽石等高級方塊變得更稀有
        const commonPool = ['dirt', 'dirt', 'dirt', 'stone', 'stone', 'stone', 'cobblestone', 'cobblestone', 'sand', 'gravel', 'oak_log', 'oak_planks', 'oak_planks'];
        
        if (packId === 'pack_basic') { min = 50; max = 100; pools = [...commonPool]; }
        else if (packId === 'pack_rare') { min = 100; max = 200; pools = [...commonPool, 'glass', 'glass', 'bricks', 'iron_block', 'chest_block', 'oak_door']; }
        else if (packId === 'pack_epic') { min = 150; max = 250; pools = [...commonPool, 'glass', 'iron_block', 'iron_block', 'gold_block', 'obsidian', 'netherrack', 'netherrack', 'glowstone', 'magma_block']; }
        else if (packId === 'pack_legendary') { min = 200; max = 300; pools = [...commonPool, 'iron_block', 'gold_block', 'obsidian', 'diamond_block', 'emerald_block', 'end_stone', 'end_stone', 'purpur_block']; }
        else { min = 20; max = 20; pools = ['dirt', 'stone', 'cobblestone', 'sand', 'gravel', 'oak_planks']; }
        const totalAmount = Math.floor(Math.random() * (max - min + 1)) + min;
        const newInv = { ...mcData.inventory };
        
        let resultText = `🎉 碰！打開了 ${packData.name}！\n\n獲得了總計 ${totalAmount} 個方塊 (隨機分配)：\n`;
        
        const gained = {};
        for (let i = 0; i < totalAmount; i++) {
            const b = pools[Math.floor(Math.random() * pools.length)];
            newInv[b] = (newInv[b] || 0) + 1;
            gained[b] = (gained[b] || 0) + 1;
        }

        const newPacks = { ...mcData.packs };
        newPacks[packId] -= 1;

        updateMcData({ packs: newPacks, inventory: newInv }, true);
        playCachedSound('https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/open.mp3');
        
        // ✨ 觸發豪華開箱動畫視窗，並自動關閉背景的儲物箱
        setShowEnderChest(false); 
        setOpenedPackResult({ packName: packData.name, totalAmount, gained });
    };
    const ownedItems = storeItems.filter(i => (mcData.items || []).includes(i.id) || (i.id === 'diamond_sword' && (mcData.items || []).includes('鑽石劍')));
    const ownedPets = storeItems.filter(i => (mcData.pets || []).includes(i.id));

    return (
        <div className="mc-bg h-full overflow-y-auto custom-scrollbar p-4 relative">
            
            {showMiniGame && (
        <MinecartGame 
            user={user}
            userProfile={userProfile}
            mcData={mcData}
            updateMcData={updateMcData}
            showAlert={showAlert}
            onGameOver={handleMiniGameOver} 
            onQuit={() => setShowMiniGame(false)} 
        />
    )}

            {showMiningGame && (
                <MiningGame 
                    user={user}
                    mcData={mcData}
                    updateMcData={updateMcData}
                    showAlert={showAlert}
                    onQuit={() => setShowMiningGame(false)}
                />
            )}
            {showSandbox && (
                <SandboxGame 
                  user={user}
                 userProfile={userProfile}
                    mcData={mcData}
                 updateMcData={updateMcData}
                    showAlert={showAlert}
                    onQuit={() => setShowSandbox(false)}
             />
            )}
            
            {showVolleyball && (
                <VolleyballGame 
                    user={user}
                    userProfile={userProfile}
                    mcData={mcData}
                    updateMcData={updateMcData}
                    showAlert={showAlert}
                    onQuit={() => setShowVolleyball(false)}
                />
            )}

            <div className="max-w-5xl mx-auto mc-ui p-6 flex flex-col space-y-6 bg-opacity-90 dark:bg-opacity-80">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
    <div>
        <h1 className="text-2xl font-black mb-2 text-gray-800 dark:text-gray-100 tracking-wide drop-shadow-md">⛏️ 史蒂夫的養成天地</h1>
        <p className="text-sm font-bold text-gray-600 dark:text-gray-300">完成測驗或遊玩小遊戲來獲取鑽石！</p>
    </div>

    <div className="flex flex-wrap gap-2 md:mx-4">
        <button onClick={() => setShowSandbox(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-xs px-3 py-1.5 border-2 border-emerald-800 font-bold transition-colors whitespace-nowrap shadow-md">
            🏗️ 蓋房子
        </button>
        <button onClick={() => setShowMiningGame(true)} className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] sm:text-xs px-3 py-1.5 border-2 border-amber-800 font-bold transition-colors whitespace-nowrap shadow-md">
            ⛏️ 挖礦
        </button>
        <button onClick={() => setShowMiniGame(true)} className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] sm:text-xs px-3 py-1.5 border-2 border-amber-800 font-bold transition-colors whitespace-nowrap shadow-md">
                        🛻 礦車探險
                    </button>
                    <button onClick={() => setShowVolleyball(true)} className="bg-stone-600 hover:bg-rose-500 text-white text-[10px] sm:text-xs px-3 py-1.5 border-2 border-stone-600800 font-bold transition-colors whitespace-nowrap shadow-md">
                        🏐 史萊姆排球
                    </button>
                    <button onClick={() => setShowPoke(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] sm:text-xs px-3 py-1.5 border-2 border-indigo-800 font-bold transition-colors shadow-md flex items-center">
                        <span className="material-symbols-outlined text-[14px] mr-1">style</span>大老二
                    </button>
                    <button onClick={() => setShowMj(true)} className="bg-red-600 hover:bg-red-500 text-white text-[10px] sm:text-xs px-3 py-1.5 border-2 border-red-800 font-bold transition-colors shadow-md flex items-center">
                        <span className="material-symbols-outlined text-[14px] mr-1">grid_view</span>麻將
                    </button>
                </div>

                <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] p-2 w-full md:w-auto text-[#373737] shadow-lg shrink-0">
                        <div className="flex justify-around md:justify-start md:space-x-8 text-sm items-center font-bold">
                            <div className="text-center bg-[#8b8b8b] border-2 border-[#555] border-r-white border-b-white px-3 py-1">
                                <p className="text-emerald-800 font-black text-lg">Lv. {mcData.level}</p>
                                <p className="text-[10px] text-[#373737]">EXP: {mcData.exp}/{expToNextLevel}</p>
                            </div>
                            <div className="space-y-1 bg-[#8b8b8b] border-2 border-[#555] border-r-white border-b-white px-3 py-1">
                                <p className="flex items-center text-[#373737]"><McImg src={imgDiamond} fallback="💎" className="w-4 h-4 mr-1 pixelated" /> {mcData.diamonds}</p>
                                <p className="flex items-center text-[#373737]"><span className="text-lg mr-1 leading-none">🍖</span> {mcData.hunger}/10</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 min-h-0 flex-grow">
                    
                    {/* 左側：你的家 & 排行榜 */}
                    <div className="space-y-4 md:space-y-6 lg:col-span-1 flex flex-col">
                        {/* 🏡 你的家 */}
                        <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] p-3 shadow-xl shrink-0">
                            <h2 className="border-b-2 border-[#555] pb-2 mb-3 font-bold text-[#373737] text-lg flex justify-between items-center">
                             <span>🏡 你的家</span>
                            </h2>
                            <div className="p-4 bg-[#8b8b8b] border-2 border-[#555] border-r-white border-b-white mb-3 h-32 sm:h-40 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                                <McImg src={imgSteve} fallback="🧍‍♂️" className="w-12 h-12 sm:w-16 sm:h-16 pixelated shadow-lg border-2 border-[#373737] mb-2" />
                                
                                <div className="flex flex-wrap justify-center gap-1 max-w-full z-10">
                                    {Array.from({ length: mcData.cats || 0 }).map((_, i) => <span key={`cat-${i}`} title="斑點貓" className="text-xl">🐱</span>)}
                                    {ownedPets.map((p, i) => <span key={`pet-${i}`} title={p.name} className="text-xl">{p.icon}</span>)}
                                </div>
                                <div className="absolute bottom-2 flex flex-wrap justify-center gap-2 max-w-full px-2">
                                    {ownedItems.slice(-4).map(item => (
                                        <McImg key={item.id} src={item.img} fallback={item.icon} className="w-5 h-5 sm:w-6 sm:h-6 pixelated drop-shadow-md" />
                                    ))}
                                </div>
                            </div>
                            <button 
                                onClick={handleCheckIn} 
                                disabled={isCheckedIn}
                                className={`w-full py-2 flex justify-center items-center mb-2 font-black border-2 transition-colors ${isCheckedIn ? 'bg-[#555555] text-[#aaaaaa] border-[#444444] cursor-not-allowed' : 'bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#373737] border-white border-r-[#555] border-b-[#555] active:border-t-[#555] active:border-l-[#555] active:border-r-white active:border-b-white'}`}
                            >
                                {isCheckedIn ? (
                                    "✅ 今日已簽到"
                                ) : (
                                    <>📅 每日簽到 (+20 <McImg src={imgDiamond} fallback="💎" className="w-4 h-4 mx-1 pixelated"/> +1 🎫)</>
                                )}
                            </button>
                            <button onClick={() => {
                                playCachedSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/block/enderchest/open.ogg');
                                setShowEnderChest(true);
                            }} className="w-full py-2 flex justify-center items-center bg-[#5c4033] hover:bg-[#6b4c3a] text-white font-bold border-2 border-[#8b5a2b] border-r-[#3e2723] border-b-[#3e2723] shadow-md transition-colors active:border-t-[#3e2723] active:border-l-[#3e2723] active:border-r-[#8b5a2b] active:border-b-[#8b5a2b]">
                                🔮 終界儲物箱 ({Object.values(mcData.packs || {}).reduce((a, b) => a + b, 0)})
                            </button>
                        </div>

                        {/* 🏆 排行榜 */}
                        <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] p-3 shadow-xl flex flex-col flex-grow min-h-[200px]">
                            <h2 className="border-b-2 border-[#555] pb-2 mb-3 font-bold text-[#373737] text-lg">🏆 好友等級排行榜</h2>
                            <div className="space-y-2 overflow-y-auto max-h-[12rem] lg:max-h-[16rem] custom-scrollbar pr-2 flex-grow">
                                {leaderboard.map((lb, idx) => (
                                    <div key={idx} className={`flex justify-between items-center p-2 border-2 ${lb.isMe ? 'bg-[#8b8b8b] border-[#555] border-r-white border-b-white text-white shadow-inner' : 'bg-[#a0a0a0] border-transparent text-[#373737]'} transition-colors`}>
                                        <div className="flex items-center space-x-2 sm:space-x-3">
                                            <span className="font-bold w-5 sm:w-6 text-center text-sm sm:text-lg">{idx === 0 ? '👑' : idx + 1}</span>
                                            <span className="truncate max-w-[80px] sm:max-w-[100px] text-xs sm:text-sm font-bold">{lb.name}</span>
                                        </div>
                                        <div className="text-right flex items-center space-x-2 sm:space-x-3">
                                            <span className="text-emerald-800 font-black text-xs sm:text-sm">Lv.{lb.level}</span>
                                            <span className="text-xs font-bold flex items-center w-10 sm:w-12 justify-end"><McImg src={imgDiamond} fallback="💎" className="w-3 h-3 mr-1 pixelated" /> {lb.diamonds}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 右側：村民商賈 */}
                    <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] p-3 sm:p-4 lg:col-span-2 flex flex-col shadow-xl min-h-[400px]">
                        <h2 className="border-b-2 border-[#555] pb-2 mb-3 font-bold text-[#373737] text-lg">🛒 村民商賈</h2>
                        
                        <div className="flex items-center space-x-4 mb-4 bg-[#8b8b8b] p-3 border-2 border-[#555] border-r-white border-b-white shadow-inner shrink-0">
                            <button 
                                className={`shrink-0 transition-transform duration-200 focus:outline-none active:scale-90 ${villagerAnim === 'yes' ? 'translate-y-2' : villagerAnim === 'no' ? '-translate-x-2' : villagerAnim === 'idle' ? 'scale-110' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    playVillagerSound('idle');
                                    const speeches = ["呼嗯... 看看有沒有需要的？", "哈啊... 這裡只有頂級好貨。", "嗯哼，隨便看隨便挑。", "哈！買點什麼吧朋友！", "嗯嗯... 今天天氣真不錯。"];
                                    setVillagerSpeech(speeches[Math.floor(Math.random() * speeches.length)]);
                                    setVillagerAnim('idle');
                                    setTimeout(() => setVillagerAnim(""), 200); 
                                }}
                            >
                                <McImg src="https://minotar.net/helm/Villager/64.png" fallback="🧑‍🌾" className="w-12 h-12 sm:w-16 sm:h-16 pixelated border-2 border-[#373737] drop-shadow-lg cursor-pointer hover:brightness-110" />
                            </button>
                            <div className="relative bg-[#FCFBF7] text-[#373737] p-3 flex-1 shadow-md font-bold text-xs sm:text-sm border-2 border-[#373737] pixelated-border">
                                <div className="absolute top-1/2 -left-[10px] transform -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-r-[10px] border-r-[#FCFBF7] border-b-8 border-b-transparent z-10"></div>
                                <div className="absolute top-1/2 -left-[13px] transform -translate-y-1/2 w-0 h-0 border-t-[9px] border-t-transparent border-r-[12px] border-r-[#373737] border-b-[9px] border-b-transparent"></div>
                                {villagerSpeech}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
                            {STORE_CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => setStoreCat(cat)} className={`px-2 py-1 text-[10px] sm:text-xs font-bold border-2 active:border-t-[#555] active:border-l-[#555] active:border-r-white active:border-b-white ${storeCat === cat ? 'bg-[#555] border-[#373737] border-r-[#8b8b8b] border-b-[#8b8b8b] text-white shadow-inner' : 'bg-[#8b8b8b] border-white border-r-[#555] border-b-[#555] text-[#373737] hover:bg-[#a0a0a0]'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 overflow-y-auto custom-scrollbar pr-2 flex-grow pb-2">
                            {storeItems.filter(item => !item.hide && (storeCat === '全部' || item.cat === storeCat)).map((item) => (
                                <button key={item.id} onClick={() => handleBuy(item)} className="bg-[#8b8b8b] hover:bg-[#a0a0a0] border-2 border-white border-r-[#555] border-b-[#555] py-2 px-2 sm:px-3 flex justify-between items-center active:border-t-[#555] active:border-l-[#555] active:border-r-white active:border-b-white transition-all">
                                    <span className="flex items-center text-xs sm:text-sm truncate pr-2 text-[#373737] font-bold">
                                        <McImg src={item.img} fallback={item.icon} className="w-5 h-5 sm:w-6 sm:h-6 mr-2 pixelated shrink-0"/> 
                                        {item.name}
                                    </span>
                                    <span className="text-emerald-900 flex items-center text-[10px] sm:text-xs font-black shrink-0 bg-[#c6c6c6] px-1.5 py-0.5 border border-[#555]">
                                        {item.cost} <McImg src={imgDiamond} fallback="💎" className="w-3 h-3 sm:w-4 sm:h-4 ml-1 pixelated"/>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

           {/* ✨ 開啟禮包結果豪華 Modal */}
            {openedPackResult && (
                <div className="fixed inset-0 z-[250] bg-stone-800 bg-opacity-85 flex flex-col items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-[#10002b] border-4 border-amber-700800 p-4 sm:p-6 w-full max-w-2xl shadow-2xl flex flex-col relative rounded-sm">
                        <h3 className="text-amber-700300 font-black text-2xl mb-2 text-center drop-shadow-md">🎉 開箱成功！</h3>
                        <p className="text-white text-center mb-4 font-bold text-sm sm:text-base">
                            打開了【{openedPackResult.packName}】<br/>
                            總共獲得 <span className="text-amber-400 font-black text-lg">{openedPackResult.totalAmount}</span> 個方塊：
                        </p>
                        
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar p-3 bg-stone-800 bg-opacity-50 border-2 border-amber-700900 shadow-inner">
                            {Object.entries(openedPackResult.gained).map(([blockId, count]) => {
                                // 方塊圖庫查找表
                                const lookup = {
                                    dirt: { name: '泥土', img: 'block/dirt.png' }, stone: { name: '石頭', img: 'block/stone.png' }, cobblestone: { name: '鵝卵石', img: 'block/cobblestone.png' }, sand: { name: '沙子', img: 'block/sand.png' }, gravel: { name: '礫石', img: 'block/gravel.png' }, oak_log: { name: '橡木原木', img: 'block/oak_log.png' }, oak_planks: { name: '橡木木板', img: 'block/oak_planks.png' }, glass: { name: '玻璃', img: 'block/glass.png' }, bricks: { name: '磚塊', img: 'block/bricks.png' }, iron_block: { name: '鐵磚', img: 'block/iron_block.png' }, chest_block: { name: '儲物箱', img: 'https://i.postimg.cc/bwPx54VC/Minecraft-Chest.jpg', abs: true }, oak_door: { name: '橡木門', img: 'item/oak_door.png' }, gold_block: { name: '金磚', img: 'block/gold_block.png' }, obsidian: { name: '黑曜石', img: 'block/obsidian.png' }, netherrack: { name: '地獄石', img: 'block/netherrack.png' }, glowstone: { name: '螢光石', img: 'block/glowstone.png' }, magma_block: { name: '岩漿塊', img: 'block/magma.png' }, diamond_block: { name: '鑽石磚', img: 'block/diamond_block.png' }, emerald_block: { name: '綠寶石磚', img: 'block/emerald_block.png' }, end_stone: { name: '末地石', img: 'block/end_stone.png' }, purpur_block: { name: '紫珀塊', img: 'block/purpur_block.png' }
                                };
                                const info = lookup[blockId] || { name: blockId, img: 'block/dirt.png' };
                                const imgSrc = info.abs ? info.img : `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/${info.img}`;
                                
                                return (
                                    <div key={blockId} className="flex flex-col items-center p-2 bg-stone-800 border-2 border-gray-600 hover:border-amber-400 transition-colors shadow-md group">
                                        <McImg src={imgSrc} fallback="📦" className="w-10 h-10 pixelated drop-shadow-md mb-2 group-hover:scale-110 transition-transform" />
                                        <span className="text-white text-[10px] sm:text-xs font-bold text-center truncate w-full">{info.name}</span>
                                        <span className="text-amber-400 font-black text-sm mt-1">x{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="mt-5 flex justify-center">
                            <button onClick={() => setOpenedPackResult(null)} className="bg-amber-700600 hover:bg-amber-700500 text-white px-8 py-3 font-black text-lg border-2 border-black shadow-lg transition-transform active:scale-95">
                                收下獎勵 (已存入沙盒)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✨ 終界儲物箱 Modal */}
            {showEnderChest && (
                <div className="fixed inset-0 z-[150] bg-stone-800 bg-opacity-80 flex flex-col items-center justify-center p-4">
                    <div className="bg-[#10002b] border-4 border-amber-700800 p-4 w-full max-w-lg shadow-2xl flex flex-col h-[70dvh]">
                        <div className="flex justify-between items-center mb-4 border-b-2 border-amber-700500 pb-2">
                            <h3 className="text-amber-700300 font-bold text-lg flex items-center"><McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/ender_chest_front.png" className="w-6 h-6 mr-2 pixelated"/> 終界儲物箱 (我的禮包)</h3>
                            <button onClick={() => {
                                // ✨ 終界儲物箱專屬關閉音效
                                playCachedSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/block/enderchest/close.ogg');
                                setShowEnderChest(false);
                            }} className="text-red-400 hover:text-red-300 font-bold">✖ 關閉</button>
                        </div>
                        <p className="text-gray-400 text-xs mb-3 font-bold">開啟禮包後，抽到的方塊會自動送到沙盒遊戲庫存中！</p>
                        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2">
                            {(!mcData.packs || Object.keys(mcData.packs).filter(k => mcData.packs[k] > 0).length === 0) ? (
                                <p className="text-gray-500 text-center text-sm mt-10">你的儲物箱空空的，快去村民商賈那裡買點禮包吧！</p>
                            ) : (
                                Object.entries(mcData.packs).filter(([id, count]) => count > 0).map(([id, count]) => {
                                    const packInfo = storeItems.find(i => i.id === id);
                                    if(!packInfo) return null;
                                    return (
                                        <div key={id} className="bg-stone-800 p-3 border-l-4 border-amber-700500 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <McImg src={packInfo.img} className="w-10 h-10 pixelated drop-shadow-md"/>
                                                <div>
                                                    <p className="text-white font-bold text-sm">{packInfo.name}</p>
                                                    <p className="text-gray-400 text-xs">擁有數量: <span className="text-amber-400 font-black">{count}</span></p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleOpenPack(id)} className="bg-amber-700600 hover:bg-amber-700500 text-white px-4 py-2 font-black border-2 border-black shadow-lg">打開</button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showPoke && (
                <Poke 
                    user={user}
                    userProfile={userProfile}
                    showAlert={showAlert}
                    onQuit={() => setShowPoke(false)}
                />
            )}

            {showMj && (
                <Mj 
                    user={user}
                    userProfile={userProfile}
                    showAlert={showAlert}
                    onQuit={() => setShowMj(false)}
                />
            )}
        </div>
    );
}