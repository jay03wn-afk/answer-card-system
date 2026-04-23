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
    const [showMj, setShowMj] = useState(false); 
    const [showGameList, setShowGameList] = useState(false); 
    
    // ✨ 衣櫃與皮膚編輯器狀態
    const [showWardrobe, setShowWardrobe] = useState(false);
    const [showSkinEditor, setShowSkinEditor] = useState(false);
    const [drawingColor, setDrawingColor] = useState('#000000');
    const [pixels, setPixels] = useState(Array(256).fill('#ffffff'));
    const [recentColors, setRecentColors] = useState(['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff']);
    const [currentTool, setCurrentTool] = useState('pen');
    const [showEnderChest, setShowEnderChest] = useState(false);
    const [villagerSpeech, setVillagerSpeech] = useState("哼嗯... 看看這些好東西！");
    const [villagerAnim, setVillagerAnim] = useState("");
    const [openedPackResult, setOpenedPackResult] = useState(null); 
    
    const [storeCat, setStoreCat] = useState('全部');
    const STORE_CATEGORIES = ['全部', '食物藥水', '裝備道具', '盲盒禮包'];

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
        packs: rawMcData.packs || {},
        drawingPapers: safeNum(rawMcData.drawingPapers, 0),
        customSkins: rawMcData.customSkins || [],
        ownedSkins: rawMcData.ownedSkins || [],
        equippedSkin: rawMcData.equippedSkin || null
    };
    
    const todayTW = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const isCheckedIn = mcData.lastCheckIn === todayTW;
    
    const expToNextLevel = mcData.level * 20;
    
    const mcBase = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item";
    const imgDiamond = `${mcBase}/diamond.png`;
    const imgSteve = "https://minotar.net/helm/Steve/64.png";

    const generateSkinDataUrl = (pixelsArray) => {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        pixelsArray.forEach((color, i) => {
            const x = i % 16;
            const y = Math.floor(i / 16);
            if (color !== 'transparent') {
                ctx.fillStyle = color;
                ctx.fillRect(x, y, 1, 1);
            }
        });
        return canvas.toDataURL();
    };

    const getEquippedSkinImg = () => {
        if (!mcData.equippedSkin) return imgSteve;
        if (typeof mcData.equippedSkin === 'string' && mcData.equippedSkin.startsWith('skin_')) {
            const found = storeItems.find(i => i.id === mcData.equippedSkin);
            return found ? found.img : imgSteve;
        }
        return generateSkinDataUrl(mcData.equippedSkin);
    };
    const currentSkinImg = getEquippedSkinImg();

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
        { id: 'drawing_paper', name: '繪圖紙 (自訂皮膚)', cat: '裝備道具', type: 'drawing_paper', cost: 1000, img: `${mcBase}/paper.png`, icon: '📝' },
        { id: 'skin_ninja', name: '忍者皮膚', cat: '裝備道具', type: 'skin', cost: 500, img: 'https://minotar.net/helm/Ninja/64.png', icon: '🥷' },
        { id: 'skin_knight', name: '騎士皮膚', cat: '裝備道具', type: 'skin', cost: 500, img: 'https://minotar.net/helm/Knight/64.png', icon: '🛡️' },

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
        } else if (item.type === 'drawing_paper') {
            updates.drawingPapers = mcData.drawingPapers + 1;
            showAlert(`📝 購買成功！獲得 1 張【繪圖紙】，快去衣櫃繪製專屬皮膚吧！`);
        } else if (item.type === 'skin') {
            if (mcData.ownedSkins.includes(item.id)) {
                return showAlert(`❌ 你已經擁有【${item.name}】了！`);
            }
            updates.ownedSkins = [...mcData.ownedSkins, item.id];
            showAlert(`👕 購買成功！【${item.name}】已放入衣櫃！`);
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

    const handleOpenPack = (packId) => {
        if (!mcData.packs || !mcData.packs[packId] || mcData.packs[packId] <= 0) return;
        
        const packData = storeItems.find(i => i.id === packId);
        if (!packData) return;

       let min, max, pools;
        
        const commonPool = ['dirt', 'dirt', 'dirt', 'stone', 'stone', 'stone', 'cobblestone', 'cobblestone', 'sand', 'gravel', 'oak_log', 'oak_planks', 'oak_planks'];
        
        if (packId === 'pack_basic') { min = 50; max = 100; pools = [...commonPool]; }
        else if (packId === 'pack_rare') { min = 100; max = 200; pools = [...commonPool, 'glass', 'glass', 'bricks', 'iron_block', 'chest_block', 'oak_door']; }
        else if (packId === 'pack_epic') { min = 150; max = 250; pools = [...commonPool, 'glass', 'iron_block', 'iron_block', 'gold_block', 'obsidian', 'netherrack', 'netherrack', 'glowstone', 'magma_block']; }
        else if (packId === 'pack_legendary') { min = 200; max = 300; pools = [...commonPool, 'iron_block', 'gold_block', 'obsidian', 'diamond_block', 'emerald_block', 'end_stone', 'end_stone', 'purpur_block']; }
        else { min = 20; max = 20; pools = ['dirt', 'stone', 'cobblestone', 'sand', 'gravel', 'oak_planks']; }
        const totalAmount = Math.floor(Math.random() * (max - min + 1)) + min;
        const newInv = { ...mcData.inventory };
        
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
        
        setShowEnderChest(false); 
        setOpenedPackResult({ packName: packData.name, totalAmount, gained });
    };

    const ownedItems = storeItems.filter(i => (mcData.items || []).includes(i.id) || (i.id === 'diamond_sword' && (mcData.items || []).includes('鑽石劍')));
    const ownedPets = storeItems.filter(i => (mcData.pets || []).includes(i.id));

    // ✨ 繪圖工具功能 (自動儲存顏色 與 油漆桶演算法)
    const updateDrawingColor = (color) => {
        setDrawingColor(color);
        if (color !== 'transparent') {
            setRecentColors(prev => {
                const newColors = prev.filter(c => c !== color);
                return [color, ...newColors].slice(0, 7); // 儲存最近 7 個顏色
            });
        }
    };

    const handlePixelAction = (idx) => {
        if (currentTool === 'pen') {
            const newPixels = [...pixels];
            newPixels[idx] = drawingColor;
            setPixels(newPixels);
        } else if (currentTool === 'fill') {
            const targetColor = pixels[idx];
            if (targetColor === drawingColor) return;
            const newPixels = [...pixels];
            
            // BFS 油漆桶擴散演算法
            newPixels[idx] = drawingColor;
            const queue = [idx];
            while (queue.length > 0) {
                const curr = queue.shift();
                const x = curr % 16;
                const y = Math.floor(curr / 16);
                
                if (x > 0 && newPixels[curr - 1] === targetColor) {
                    newPixels[curr - 1] = drawingColor; queue.push(curr - 1);
                }
                if (x < 15 && newPixels[curr + 1] === targetColor) {
                    newPixels[curr + 1] = drawingColor; queue.push(curr + 1);
                }
                if (y > 0 && newPixels[curr - 16] === targetColor) {
                    newPixels[curr - 16] = drawingColor; queue.push(curr - 16);
                }
                if (y < 15 && newPixels[curr + 16] === targetColor) {
                    newPixels[curr + 16] = drawingColor; queue.push(curr + 16);
                }
            }
            setPixels(newPixels);
        }
    };

    return (
        <div className="bg-[#1e1e1e] h-full overflow-y-auto custom-scrollbar p-4 relative text-[#e0e0e0] font-mono">
            
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

            <div className="max-w-5xl mx-auto p-6 flex flex-col space-y-6 bg-[#3c3c3c] border-4 border-[#555555] border-r-[#111111] border-b-[#111111] shadow-2xl font-mono">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <div>
                        <h1 className="text-2xl font-black mb-2 text-[#ffaa00] tracking-wide drop-shadow-md">⛏️ 史蒂夫的養成天地</h1>
                        <p className="text-sm font-bold text-[#aaaaaa]">完成測驗或遊玩小遊戲來獲取鑽石！</p>
                    </div>

                    <div className="flex flex-wrap gap-2 md:mx-4">
                        <button onClick={() => setShowGameList(true)} className="bg-[#555555] hover:bg-[#666666] text-[#e0e0e0] text-sm sm:text-base px-4 py-2 border-4 border-[#777777] border-r-[#222222] border-b-[#222222] font-bold transition-colors shadow-md flex items-center active:border-t-[#222222] active:border-l-[#222222] active:border-r-[#777777] active:border-b-[#777777]">
                            🎮 遊樂場 (遊戲清單)
                        </button>
                    </div>

                    <div className="bg-[#2d2d2d] border-4 border-[#111111] border-r-[#555555] border-b-[#555555] p-2 w-full md:w-auto text-[#e0e0e0] shrink-0">
                        <div className="flex justify-around md:justify-start md:space-x-8 text-sm items-center font-bold">
                            <div className="text-center bg-[#1e1e1e] border-2 border-[#111111] border-r-[#555555] border-b-[#555555] px-3 py-1">
                                <p className="text-[#55ff55] font-black text-lg drop-shadow-md">Lv. {mcData.level}</p>
                                <p className="text-[10px] text-[#aaaaaa]">EXP: {mcData.exp}/{expToNextLevel}</p>
                            </div>
                            <div className="space-y-1 bg-[#1e1e1e] border-2 border-[#111111] border-r-[#555555] border-b-[#555555] px-3 py-1">
                                <p className="flex items-center text-[#55ffff] drop-shadow-md"><McImg src={imgDiamond} fallback="💎" className="w-4 h-4 mr-1 pixelated" /> {mcData.diamonds}</p>
                                <p className="flex items-center text-[#ffaa00] drop-shadow-md"><span className="text-lg mr-1 leading-none">🍖</span> {mcData.hunger}/10</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 min-h-0 flex-grow">
                    
                    {/* 左側：你的家 & 排行榜 */}
                    <div className="space-y-4 md:space-y-6 lg:col-span-1 flex flex-col">
                        {/* 🏡 你的家 */}
                        <div className="bg-[#3c3c3c] border-4 border-[#555555] border-r-[#111111] border-b-[#111111] p-3 shadow-lg shrink-0">
                            <h2 className="border-b-2 border-[#111111] pb-2 mb-3 font-bold text-[#ffaa00] text-lg flex justify-between items-center drop-shadow-md">
                                <span>🏡 你的家</span>
                            </h2>
                            <div className="p-4 bg-[#1e1e1e] border-4 border-[#111111] border-r-[#555555] border-b-[#555555] mb-3 h-32 sm:h-40 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                                <McImg src={currentSkinImg} fallback="🧍‍♂️" className="w-12 h-12 sm:w-16 sm:h-16 pixelated shadow-lg border-2 border-[#111111] mb-2" />
                                
                                <div className="flex flex-wrap justify-center gap-1 max-w-full z-10">
                                    {Array.from({ length: mcData.cats || 0 }).map((_, i) => <span key={`cat-${i}`} title="斑點貓" className="text-xl drop-shadow-md">🐱</span>)}
                                    {ownedPets.map((p, i) => <span key={`pet-${i}`} title={p.name} className="text-xl drop-shadow-md">{p.icon}</span>)}
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
                                className={`w-full py-2 flex justify-center items-center mb-2 font-black border-4 transition-colors ${isCheckedIn ? 'bg-[#2d2d2d] text-[#777777] border-[#111111] border-r-[#3c3c3c] border-b-[#3c3c3c] cursor-not-allowed' : 'bg-[#555555] hover:bg-[#666666] text-[#e0e0e0] border-[#777777] border-r-[#222222] border-b-[#222222] active:border-t-[#222222] active:border-l-[#222222] active:border-r-[#777777] active:border-b-[#777777]'}`}
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
                            }} className="w-full py-2 flex justify-center items-center bg-[#240d3a] hover:bg-[#341852] text-[#e3a8ff] font-bold border-4 border-[#4a2673] border-r-[#150524] border-b-[#150524] shadow-md transition-colors mb-2 active:border-t-[#150524] active:border-l-[#150524] active:border-r-[#4a2673] active:border-b-[#4a2673]">
                                🔮 終界儲物箱 ({Object.values(mcData.packs || {}).reduce((a, b) => a + b, 0)})
                            </button>
                            <button onClick={() => setShowWardrobe(true)} className="w-full py-2 flex justify-center items-center bg-[#1d5c2d] hover:bg-[#277a3d] text-[#a8ffba] font-bold border-4 border-[#33874c] border-r-[#0f3017] border-b-[#0f3017] shadow-md transition-colors active:border-t-[#0f3017] active:border-l-[#0f3017] active:border-r-[#33874c] active:border-b-[#33874c]">
                                👕 我的衣櫃 (皮膚)
                            </button>
                        </div>

                        {/* 🏆 排行榜 */}
                        <div className="bg-[#3c3c3c] border-4 border-[#555555] border-r-[#111111] border-b-[#111111] p-3 shadow-lg flex flex-col flex-grow min-h-[200px]">
                            <h2 className="border-b-2 border-[#111111] pb-2 mb-3 font-bold text-[#ffaa00] text-lg drop-shadow-md">🏆 好友等級排行榜</h2>
                            <div className="space-y-2 overflow-y-auto max-h-[12rem] lg:max-h-[16rem] custom-scrollbar pr-2 flex-grow">
                                {leaderboard.map((lb, idx) => (
                                    <div key={idx} className={`flex justify-between items-center p-2 border-2 ${lb.isMe ? 'bg-[#2d2d2d] border-[#111111] border-r-[#555555] border-b-[#555555] text-[#55ff55]' : 'bg-[#4a4a4a] border-transparent text-[#cccccc]'} transition-colors`}>
                                        <div className="flex items-center space-x-2 sm:space-x-3">
                                            <span className={`font-bold w-5 sm:w-6 text-center text-sm sm:text-lg ${idx === 0 ? 'drop-shadow-md' : ''}`}>{idx === 0 ? '👑' : idx + 1}</span>
                                            <span className="truncate max-w-[80px] sm:max-w-[100px] text-xs sm:text-sm font-bold">{lb.name}</span>
                                        </div>
                                        <div className="text-right flex items-center space-x-2 sm:space-x-3">
                                            <span className={`font-black text-xs sm:text-sm ${lb.isMe ? 'text-[#55ff55]' : 'text-[#aaaaaa]'}`}>Lv.{lb.level}</span>
                                            <span className={`text-xs font-bold flex items-center w-10 sm:w-12 justify-end ${lb.isMe ? 'text-[#55ffff]' : 'text-[#aaaaaa]'}`}><McImg src={imgDiamond} fallback="💎" className="w-3 h-3 mr-1 pixelated" /> {lb.diamonds}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 右側：村民商賈 */}
                    <div className="bg-[#3c3c3c] border-4 border-[#555555] border-r-[#111111] border-b-[#111111] p-3 sm:p-4 lg:col-span-2 flex flex-col shadow-lg min-h-[400px]">
                        <h2 className="border-b-2 border-[#111111] pb-2 mb-3 font-bold text-[#ffaa00] text-lg drop-shadow-md">🛒 村民商賈</h2>
                        
                        <div className="flex items-center space-x-4 mb-4 bg-[#1e1e1e] p-3 border-4 border-[#111111] border-r-[#555555] border-b-[#555555] shadow-inner shrink-0">
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
                                <McImg src="https://minotar.net/helm/Villager/64.png" fallback="🧑‍🌾" className="w-12 h-12 sm:w-16 sm:h-16 pixelated border-2 border-[#111111] drop-shadow-md cursor-pointer hover:brightness-110" />
                            </button>
                            <div className="relative bg-[#2d2d2d] text-[#e0e0e0] p-3 flex-1 shadow-md font-bold text-xs sm:text-sm border-2 border-[#111111]">
                                <div className="absolute top-1/2 -left-[10px] transform -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-r-[10px] border-r-[#2d2d2d] border-b-8 border-b-transparent z-10"></div>
                                <div className="absolute top-1/2 -left-[13px] transform -translate-y-1/2 w-0 h-0 border-t-[9px] border-t-transparent border-r-[12px] border-r-[#111111] border-b-[9px] border-b-transparent"></div>
                                {villagerSpeech}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
                            {STORE_CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => setStoreCat(cat)} className={`px-2 py-1 text-[10px] sm:text-xs font-bold border-4 active:border-t-[#111111] active:border-l-[#111111] active:border-r-[#555555] active:border-b-[#555555] ${storeCat === cat ? 'bg-[#2d2d2d] border-[#111111] border-r-[#555555] border-b-[#555555] text-[#55ff55]' : 'bg-[#555555] hover:bg-[#666666] border-[#777777] border-r-[#222222] border-b-[#222222] text-[#e0e0e0]'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 overflow-y-auto custom-scrollbar pr-2 flex-grow pb-2">
                            {storeItems.filter(item => !item.hide && (storeCat === '全部' || item.cat === storeCat)).map((item) => (
                                <button key={item.id} onClick={() => handleBuy(item)} className="bg-[#555555] hover:bg-[#666666] border-4 border-[#777777] border-r-[#222222] border-b-[#222222] py-2 px-2 sm:px-3 flex justify-between items-center active:border-t-[#222222] active:border-l-[#222222] active:border-r-[#777777] active:border-b-[#777777] transition-colors">
                                    <span className="flex items-center text-xs sm:text-sm truncate pr-2 text-[#e0e0e0] font-bold">
                                        <McImg src={item.img} fallback={item.icon} className="w-5 h-5 sm:w-6 sm:h-6 mr-2 pixelated shrink-0 drop-shadow-md"/> 
                                        {item.name}
                                    </span>
                                    <span className="text-[#55ffff] flex items-center text-[10px] sm:text-xs font-black shrink-0 bg-[#2d2d2d] px-1.5 py-0.5 border-2 border-[#111111] border-r-[#555555] border-b-[#555555]">
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

            {/* ✨ 遊戲清單 Modal */}
            {showGameList && (
                <div className="fixed inset-0 z-[150] bg-[#111111] bg-opacity-80 flex flex-col items-center justify-center p-4">
                    <div className="bg-[#3c3c3c] border-4 border-[#555555] border-r-[#111111] border-b-[#111111] p-6 w-full max-w-2xl shadow-2xl flex flex-col">
                        <div className="flex justify-between items-center mb-6 border-b-2 border-[#111111] pb-2">
                            <h3 className="text-[#ffaa00] font-black text-xl flex items-center drop-shadow-md">🎮 史蒂夫的遊樂場</h3>
                            <button onClick={() => setShowGameList(false)} className="text-[#ff5555] hover:text-[#ffaaaa] font-bold text-lg">✖ 關閉</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <button onClick={() => { setShowGameList(false); setShowSandbox(true); }} className="bg-[#2d2d2d] hover:bg-[#4a4a4a] text-[#55ff55] py-4 border-4 border-[#555555] border-r-[#111111] border-b-[#111111] font-bold transition-colors shadow-md flex flex-col items-center active:border-t-[#111111] active:border-l-[#111111] active:border-r-[#555555] active:border-b-[#555555]">
                                <span className="text-2xl mb-1">🏗️</span> 蓋房子
                            </button>
                            <button onClick={() => { setShowGameList(false); setShowMiningGame(true); }} className="bg-[#2d2d2d] hover:bg-[#4a4a4a] text-[#ffaa00] py-4 border-4 border-[#555555] border-r-[#111111] border-b-[#111111] font-bold transition-colors shadow-md flex flex-col items-center active:border-t-[#111111] active:border-l-[#111111] active:border-r-[#555555] active:border-b-[#555555]">
                                <span className="text-2xl mb-1">⛏️</span> 挖礦
                            </button>
                            <button onClick={() => { setShowGameList(false); setShowMiniGame(true); }} className="bg-[#2d2d2d] hover:bg-[#4a4a4a] text-[#ffaa00] py-4 border-4 border-[#555555] border-r-[#111111] border-b-[#111111] font-bold transition-colors shadow-md flex flex-col items-center active:border-t-[#111111] active:border-l-[#111111] active:border-r-[#555555] active:border-b-[#555555]">
                                <span className="text-2xl mb-1">🛻</span> 礦車探險
                            </button>
                            <button onClick={() => { setShowGameList(false); setShowVolleyball(true); }} className="bg-[#2d2d2d] hover:bg-[#4a4a4a] text-[#55ffff] py-4 border-4 border-[#555555] border-r-[#111111] border-b-[#111111] font-bold transition-colors shadow-md flex flex-col items-center active:border-t-[#111111] active:border-l-[#111111] active:border-r-[#555555] active:border-b-[#555555]">
                                <span className="text-2xl mb-1">🏐</span> 史萊姆排球
                            </button>
                            <button onClick={() => { setShowGameList(false); setShowPoke(true); }} className="bg-[#2d2d2d] hover:bg-[#4a4a4a] text-[#ff55ff] py-4 border-4 border-[#555555] border-r-[#111111] border-b-[#111111] font-bold transition-colors shadow-md flex flex-col items-center active:border-t-[#111111] active:border-l-[#111111] active:border-r-[#555555] active:border-b-[#555555]">
                                <span className="text-2xl mb-1">🃏</span> 大老二
                            </button>
                            <button onClick={() => { setShowGameList(false); setShowMj(true); }} className="bg-[#2d2d2d] hover:bg-[#4a4a4a] text-[#ff5555] py-4 border-4 border-[#555555] border-r-[#111111] border-b-[#111111] font-bold transition-colors shadow-md flex flex-col items-center active:border-t-[#111111] active:border-l-[#111111] active:border-r-[#555555] active:border-b-[#555555]">
                                <span className="text-2xl mb-1">🀄</span> 麻將
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

            {/* ✨ 衣櫃 Modal */}
            {showWardrobe && (
                <div className="fixed inset-0 z-[160] bg-stone-900 bg-opacity-90 flex flex-col items-center justify-center p-4">
                    <div className="bg-[#3c3c3c] border-4 border-[#555555] border-r-[#111111] border-b-[#111111] p-4 w-full max-w-lg shadow-2xl flex flex-col h-[70dvh]">
                        <div className="flex justify-between items-center mb-4 border-b-2 border-[#111111] pb-2">
                            <h3 className="text-[#55ff55] font-bold text-lg">👕 我的衣櫃</h3>
                            <button onClick={() => setShowWardrobe(false)} className="text-red-400 hover:text-red-300 font-bold">✖ 關閉</button>
                        </div>
                        
                        <div className="flex justify-between items-center bg-[#2d2d2d] p-3 border-2 border-[#111111] mb-4">
                            <span className="text-[#e0e0e0] font-bold">目前裝備:</span>
                            <div className="flex items-center">
                                <McImg src={currentSkinImg} className="w-10 h-10 pixelated mr-3"/>
                                <button onClick={() => updateMcData({ equippedSkin: null }, true)} className="bg-[#ff5555] text-white px-3 py-1 font-bold border-2 border-[#111111]">卸除</button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto custom-scrollbar grid grid-cols-3 gap-3">
                            <div className="bg-[#4a4a4a] border-2 border-[#111111] p-2 flex flex-col items-center justify-between shadow-inner">
                                <span className="text-[#ffaa00] font-bold text-xs mb-1">繪圖紙 x{mcData.drawingPapers}</span>
                                <span className="text-3xl mb-1">📝</span>
                                <button onClick={() => {
                                    if(mcData.drawingPapers > 0) {
                                        setShowWardrobe(false);
                                        setShowSkinEditor(true);
                                        setPixels(Array(256).fill('#ffffff')); // ✨ 預設白畫布
                                    } else {
                                        showAlert("你沒有繪圖紙喔！請到村民商賈購買。");
                                    }
                                }} className="bg-[#555555] text-white px-2 py-1 text-xs font-bold border-2 border-[#111111] hover:bg-[#666666]">開始繪製</button>
                            </div>

                            {mcData.ownedSkins.map((skinId, idx) => {
                                const s = storeItems.find(i => i.id === skinId);
                                if(!s) return null;
                                return (
                                    <div key={idx} className="bg-[#2d2d2d] border-2 border-[#111111] p-2 flex flex-col items-center justify-between">
                                        <span className="text-white font-bold text-xs mb-1 truncate w-full text-center">{s.name}</span>
                                        <McImg src={s.img} className="w-10 h-10 pixelated mb-1"/>
                                        <button onClick={() => updateMcData({ equippedSkin: s.id }, true)} className="bg-[#55ff55] text-black px-2 py-1 text-xs font-bold border-2 border-[#111111] hover:bg-[#77ff77]">裝備</button>
                                    </div>
                                );
                            })}

                            {mcData.customSkins.map((skinObj, idx) => {
                                const skinPixels = Array.isArray(skinObj) ? skinObj : (skinObj.data || Array(256).fill('#ffffff'));
                                return (
                                <div key={`custom-${idx}`} className="bg-[#2d2d2d] border-2 border-[#111111] p-2 flex flex-col items-center justify-between">
                                    <span className="text-white font-bold text-xs mb-1">自訂皮膚 {idx+1}</span>
                                    <img src={generateSkinDataUrl(skinPixels)} className="w-10 h-10 pixelated mb-1 border border-[#555555]" />
                                    <button onClick={() => updateMcData({ equippedSkin: skinPixels }, true)} className="bg-[#55ff55] text-black px-2 py-1 text-xs font-bold border-2 border-[#111111] hover:bg-[#77ff77]">裝備</button>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ✨ 皮膚編輯器 Modal */}
            {showSkinEditor && (
                <div className="fixed inset-0 z-[170] bg-stone-900 flex flex-col items-center justify-center p-2">
                    <div className="bg-[#3c3c3c] border-4 border-[#555555] border-r-[#111111] border-b-[#111111] p-4 w-full max-w-sm flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-[#ffaa00] font-bold">🎨 繪製皮膚 (消耗1張繪圖紙)</h3>
                            <button onClick={() => setShowSkinEditor(false)} className="text-[#ff5555] font-bold">放棄</button>
                        </div>
                        
                        {/* ✨ 工具與顏色選擇區 */}
                        <div className="flex flex-col mb-3 bg-[#2d2d2d] border-2 border-[#111111] p-2 gap-2">
                            <div className="flex justify-between items-center">
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentTool('pen')} className={`px-3 py-1 font-bold text-xs border-2 ${currentTool === 'pen' ? 'bg-[#55ff55] text-black border-[#111111]' : 'bg-[#555555] text-white border-[#111111] hover:bg-[#666666]'}`}>✏️ 畫筆</button>
                                    <button onClick={() => setCurrentTool('fill')} className={`px-3 py-1 font-bold text-xs border-2 ${currentTool === 'fill' ? 'bg-[#55ff55] text-black border-[#111111]' : 'bg-[#555555] text-white border-[#111111] hover:bg-[#666666]'}`}>🪣 填色</button>
                                    <button onClick={() => updateDrawingColor('transparent')} className={`px-3 py-1 font-bold text-xs border-2 ${drawingColor === 'transparent' ? 'bg-[#ffaa00] text-black border-[#111111]' : 'bg-[#555555] text-white border-[#111111] hover:bg-[#666666]'}`}>🧽 橡皮擦</button>
                                </div>
                                <input type="color" value={drawingColor === 'transparent' ? '#ffffff' : drawingColor} onChange={(e) => updateDrawingColor(e.target.value)} className="w-8 h-8 p-0 border-2 border-[#111111] cursor-pointer" />
                            </div>
                            
                            {/* ✨ 歷史顏色調色盤 */}
                            <div className="flex gap-1 items-center">
                                <span className="text-xs text-gray-400 font-bold mr-1">歷史:</span>
                                {recentColors.map((col, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => updateDrawingColor(col)} 
                                        style={{ backgroundColor: col === 'transparent' ? '#333' : col }} 
                                        className={`w-6 h-6 border-2 cursor-pointer hover:scale-110 transition-transform ${drawingColor === col ? 'border-white' : 'border-[#111111]'}`}
                                    ></button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#87CEEB] p-1 border-4 border-[#111111] mb-4 aspect-square flex flex-wrap" 
                             style={{ touchAction: 'none' }}
                             onTouchMove={(e) => {
                                if (currentTool !== 'pen') return;
                                const touch = e.touches[0];
                                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                                if (el && el.dataset.idx !== undefined) {
                                    const idx = parseInt(el.dataset.idx, 10);
                                    const newPixels = [...pixels];
                                    newPixels[idx] = drawingColor;
                                    setPixels(newPixels);
                                }
                             }}>
                            {pixels.map((col, i) => (
                                <div key={i} data-idx={i} 
                                     onPointerDown={() => handlePixelAction(i)}
                                     onPointerEnter={(e) => {
                                         if(e.buttons === 1 && currentTool === 'pen') {
                                             const newPixels = [...pixels];
                                             newPixels[i] = drawingColor;
                                             setPixels(newPixels);
                                         }
                                     }}
                                     style={{ backgroundColor: col === 'transparent' ? 'rgba(0,0,0,0.1)' : col }} 
                                     className="w-[6.25%] h-[6.25%] border-[0.5px] border-black/10 select-none cursor-pointer">
                                </div>
                            ))}
                        </div>

                        <button onClick={() => {
                            const newCustomSkins = [...mcData.customSkins, { data: pixels }];
                            updateMcData({ 
                                drawingPapers: mcData.drawingPapers - 1,
                                customSkins: newCustomSkins,
                                equippedSkin: pixels
                            }, true);
                            showAlert("✨ 皮膚繪製完成並已自動裝備！");
                            setShowSkinEditor(false);
                        }} className="bg-[#55ff55] hover:bg-[#44cc44] text-black font-black py-3 border-4 border-[#111111] w-full text-lg shadow-lg active:scale-95">💾 儲存並裝備皮膚</button>
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
