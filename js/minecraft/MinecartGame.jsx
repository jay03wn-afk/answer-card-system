const { useState, useEffect, useRef } = React;;


  function MinecartGame({ user, userProfile, mcData, updateMcData, showAlert, onGameOver, onQuit }) {
    const preloadFastSound = window.preloadFastSound;
    const playCachedSound = window.playCachedSound;
    const McImg = window.McImg;
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('start'); 
    const [score, setScore] = useState(0);
    const [distance, setDistance] = useState(0); 
    const [isAudioLoaded, setIsAudioLoaded] = useState(false); // ✨ 新增：音效載入狀態
    
    // --- 排行榜狀態 ---
    const [leaderboard, setLeaderboard] = useState([]);
    const [highScore, setHighScore] = useState(0);

    const bgmRef = useRef(null);
    const deadSfxRef = useRef(null);
    const explodeSfxRef = useRef(null);
    
    const LOG_W = 800;
    const LOG_H = 350;
    
    const gameRef = useRef({
        reqId: null,
        player: { x: 50, y: 0, w: 36, h: 40, dy: 0, jumps: 0 },
        obstacles: [],
        diamonds: [],
        speed: 6,
        score: 0,
        frames: 0,
        lastSpawnFrame: 0,
        nextDiamondFrame: 180,
        groundY: 250,
        targetGroundY: 250, 
        isCave: false,
        isNether: false,
        lastJumpTime: 0, 
        lastFrameTime: 0
    });

    const images = useRef({ 
        steve: new Image(), stone: new Image(), diamond: new Image(),
        zombie: new Image(), spider: new Image(), silverfish: new Image(),
creeper: new Image(), cobweb: new Image(), minecart: new Image(),        netherrack: new Image(), magma: new Image(), ghast: new Image(),
        fireball: new Image(), portal: new Image()
    });

    // 取得本週的唯一字串 (以週日為每週起點)
    const getWeekString = () => {
        const now = new Date();
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
        return `${firstDay.getFullYear()}-${firstDay.getMonth() + 1}-${firstDay.getDate()}`;
    };

    useEffect(() => {
        images.current.steve.src = "https://minotar.net/helm/Steve/64.png";
        images.current.stone.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/stone.png";
        images.current.diamond.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond.png";
        images.current.zombie.src = "https://minotar.net/helm/MHF_Zombie/64.png";
        images.current.spider.src = "https://minotar.net/helm/MHF_Spider/64.png";
        images.current.silverfish.src = "https://minotar.net/helm/MHF_Silverfish/64.png";
        images.current.creeper.src = "https://minotar.net/helm/MHF_Creeper/64.png";
        // ✨ 更新終界龍整體貼圖
// ✨ 終界龍改為蜘蛛網
        images.current.cobweb.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/cobweb.png";        images.current.minecart.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/minecart.png";
        // ✨ 新增 UI 貼圖：鑽石劍與不死圖騰
        images.current.diamond_sword = new Image();
        images.current.diamond_sword.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond_sword.png";
        images.current.totem_of_undying = new Image();
        images.current.totem_of_undying.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/totem_of_undying.png";
        
        images.current.netherrack.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/netherrack.png";
        images.current.magma.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/magma.png";
        images.current.ghast.src = "https://minotar.net/helm/MHF_Ghast/64.png";
        // ✨ 更新火球加上火焰貼圖
        images.current.fireball.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/fire_0.png";
       images.current.portal.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/nether_portal.png";
        
       // ✨ 新增：核心音效強制 Web Audio API 預載機制
        const requiredAudioUrls = [
            "https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/S4.mp3",
            "https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/Pou%20Game%20over%20Effects.mp3",
            "https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/exEXP.mp3",
            "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/entity/creeper/death.ogg", // ✨ 更換為穩定的 1.16.5 音效庫
            "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/item/pickup.ogg",
            "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/block/portal/travel.ogg",
            "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/item/totem/use.ogg"
        ];
        
        // 使用 Promise.all 確保所有音效解碼完成才允許開始遊戲
        Promise.all(requiredAudioUrls.map(url => preloadFastSound(url)))
            .then(() => {
                setIsAudioLoaded(true); // 🚀 全部解碼完成，解鎖開始按鈕
            });

        bgmRef.current = new Audio("https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/S4.mp3");
        bgmRef.current.loop = true;
        bgmRef.current.volume = 0.4;

        deadSfxRef.current = new Audio("https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/Pou%20Game%20over%20Effects.mp3");
        deadSfxRef.current.volume = 0.6;
        explodeSfxRef.current = new Audio("https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/exEXP.mp3");
        explodeSfxRef.current.volume = 0.8;
        
        // --- 排行榜與自動結算系統 ---
        if (user && userProfile) {
            const weekStr = getWeekString();
            const sysRef = window.db.collection('system').doc('minecart');
            
            sysRef.get().then(doc => {
                let data = doc.exists ? doc.data() : { week: weekStr, scores: {}, lastWeek: {} };
                
                // 若換週，備份並重置分數
                if (data.week !== weekStr) {
                    data.lastWeek = data.scores || {};
                    data.scores = {};
                    data.week = weekStr;
                    sysRef.set(data);
                }
                
                // 檢查是否符合上週獎勵發放資格
                if (data.lastWeek && Object.keys(data.lastWeek).length > 0) {
                    const lastWeekRank = Object.entries(data.lastWeek)
                        .map(([uid, info]) => ({ uid, ...info }))
                        .sort((a, b) => b.score - a.score);
                        
                    const myRankIndex = lastWeekRank.findIndex(r => r.uid === user.uid);
                    if (myRankIndex >= 0 && myRankIndex < 3) {
                        const rewardWeekStr = data.week + "_last"; // 標記為已領取此週獎勵
                        if (mcData.minecartRewardClaimedWeek !== rewardWeekStr) {
                            const rewards = [100, 60, 30];
                            const earned = rewards[myRankIndex];
                            updateMcData({ 
                                diamonds: (mcData.diamonds || 0) + earned, 
                                minecartRewardClaimedWeek: rewardWeekStr 
                            }, true);
                            showAlert(`🏆 恭喜！你在上週的礦車小遊戲獲得第 ${myRankIndex + 1} 名！\n獎勵發放：${earned} 💎`);
                        }
                    }
                }

                // 載入當前排行顯示 (確保依據距離數字大小排序並取前6名)
                const currentRanks = Object.entries(data.scores || {})
                    .map(([uid, info]) => ({ uid, ...info }))
                    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
                    .slice(0, 6);
                    
                setLeaderboard(currentRanks);
                setHighScore(data.scores?.[user.uid]?.score || 0);
            });
        }

        const cvs = canvasRef.current;
        if (cvs) {
            const ctx = cvs.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            cvs.width = LOG_W * dpr;
            cvs.height = LOG_H * dpr;
            ctx.scale(dpr, dpr);
        }

        return () => {
            if (gameRef.current.reqId) cancelAnimationFrame(gameRef.current.reqId);
            if (bgmRef.current) {
                bgmRef.current.pause();
                bgmRef.current.currentTime = 0;
            }
        };
    }, []);

    const startGame = () => {
        // 先檢查飽食度，不夠就擋下並退回開始畫面
        if (mcData.hunger < 1) {
            showAlert("🍖 史蒂夫太餓了！請先去商店買點東西吃，再來玩礦車吧！");
            setGameState('start'); 
            return; 
        }
        
        setGameState('playing');
        setScore(0);
        setDistance(0); // ✨ 距離歸零
        updateMcData({ hunger: mcData.hunger - 1 }, true); // 扣除1點飽食度
        
        if (bgmRef.current) {
            bgmRef.current.currentTime = 0;
            bgmRef.current.play().catch(e => console.log("BGM 被阻擋", e));
        }

        gameRef.current = {
            reqId: null,
            // ✨ 載入玩家擁有的劍與圖騰
            activeSword: mcData.activeSword ? { ...mcData.activeSword } : null,
            hasTotem: mcData.hasTotem || false,
            player: { x: 50, y: 150, w: 36, h: 40, dy: 0, jumps: 0 },
            obstacles: [],
            diamonds: [],
            speed: 6.5,
            score: 0,
            distance: 0, // ✨ 內部距離紀錄歸零
            frames: 0,
            lastSpawnFrame: 0,
            // 修改這裡：數字越小，第一顆鑽石出現越快 (原本是 240 + 120)
            nextDiamondFrame: Math.floor(Math.random() * 120 + 60), 
            groundY: 250,
            targetGroundY: 250,
            isCave: false,
            isNether: false,
            lastJumpTime: 0,
            lastFrameTime: performance.now(),
            totemEffectTimer: 0 // ✨ 初始化圖騰特效計時器
        };
        gameRef.current.reqId = requestAnimationFrame(loop);
    };

    const jump = () => {
        const now = performance.now();
        if (now - gameRef.current.lastJumpTime < 150) return; 
        gameRef.current.lastJumpTime = now;

        const p = gameRef.current.player;
        if (p.jumps < 2) {
            p.dy = -11.5; 
            p.jumps++;
        }
    };

    // ✨ 新增空白鍵跳躍支援
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                jump();
            }
        };
        window.addEventListener('keydown', handleKeyDown, { passive: false });
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const loop = (currentTime) => {
            const cvs = canvasRef.current;
            if (!cvs) return;
            const state = gameRef.current;
            
            // ✨ 核心修復：獨立物理邏輯，根據螢幕刷新率動態決定執行次數 (解決 30fps 慢動作與 240fps 加速)
            if (!currentTime) currentTime = performance.now();
            if (!state.lastTime) state.lastTime = currentTime;
            let elapsed = currentTime - state.lastTime;
            if (elapsed > 100) elapsed = 100; // 防止切換視窗回來時物理大暴走
            state.lastTime = currentTime;
            state.accumulator = (state.accumulator || 0) + elapsed;
            const timeStep = 1000 / 60; // 遊戲內部時間固定為 60Hz

            const ctx = cvs.getContext('2d');

            const drawImgSafe = (img, x, y, w, h, fallbackColor) => {
                try {
                    if (img.complete && img.naturalWidth > 0) {
                        ctx.drawImage(img, x, y, w, h);
                    } else {
                        ctx.fillStyle = fallbackColor;
                        ctx.fillRect(x, y, w, h);
                    }
                } catch (e) {
                    ctx.fillStyle = fallbackColor;
                    ctx.fillRect(x, y, w, h);
                }
            };

            // ✨ 將變數宣告提至外層，避免繪圖時找不到變數導致遊戲當機卡死
            let cyclePos = state.frames % 2700;
            const getNetherWaveY = (x, frames, speed) => {
                let worldX = x + (state.worldOffset || 0); 
                return 210 + Math.sin(worldX * 0.004) * 45 + Math.cos(worldX * 0.0025) * 25;
            };

            // ✨ 進入時間步長循環 (幀數落後會連續執行補上，幀數過快會跳過)
            while (state.accumulator >= timeStep) {
                state.accumulator -= timeStep;

                let prevBottom = state.player.y + state.player.h; 
                state.player.dy += 0.7; 
                state.player.y += state.player.dy;

                // 階段計算：草原 (900) -> 洞穴 (900) -> 地獄 (900) 循環
                cyclePos = state.frames % 2700;
                state.isCave = cyclePos >= 900 && cyclePos < 1800;
                state.isNether = cyclePos >= 1800;

                // ✨ 紀錄真實的捲動距離，避免加速時造成地形突然位移 (解決刷新感)
                state.worldOffset = (state.worldOffset || 0) + state.speed;

        if (state.isCave) {
            if (state.frames % 150 === 0) {
                state.targetGroundY = 180 + Math.random() * 100;
            }
            state.groundY += (state.targetGroundY - state.groundY) * 0.05;
        } else if (state.isNether) {
            // ✨ 地獄中，腳下的地板高度加入漸進式過渡
            let targetY = getNetherWaveY(state.player.x + state.player.w / 2, state.frames, state.speed);
            if (cyclePos < 1830) {
                state.groundY += (targetY - state.groundY) * 0.1;
            } else {
                state.groundY = targetY;
            }
        } else {
            state.targetGroundY = 250; 
            state.groundY += (state.targetGroundY - state.groundY) * 0.05;
        }

        let inPit = false;
        let dead = false;
        let killedByCreeper = false;

        state.obstacles = state.obstacles.filter(o => o.x + o.w > -50);
        state.diamonds = state.diamonds.filter(d => d.x + d.w > -50 && !d.collected);

        state.obstacles.forEach(obs => {
            if (obs.type === 'pit') {
                let pCenter = state.player.x + state.player.w / 2;
                if (pCenter > obs.x + 5 && pCenter < obs.x + obs.w - 5) {
                    inPit = true;
                }
            }
        });

       if (state.player.y + state.player.h >= state.groundY) {
            if (!inPit) {
                // ✨ 波浪地形落差較大，增加地獄著陸的寬容度
                let tolerance = state.isNether ? 35 : 15; 
                if (prevBottom <= state.groundY + tolerance) {
                    state.player.y = state.groundY - state.player.h;
                    state.player.dy = 0;
                    state.player.jumps = 0;
                } else {
                    if (state.hasTotem) {
                            state.hasTotem = false;
                            updateMcData({ hasTotem: false }, true);
                            playCachedSound("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/item/totem/use.ogg");
                            state.totemEffectTimer = 60; // ✨ 啟動圖騰特效
                            state.player.y = state.groundY - state.player.h;
                            state.player.dy = 0;
                            state.player.jumps = 0;
                        } else {
                            dead = true; 
                        }
                }
            }
        }

        if (state.player.y > LOG_H) {
            endGame();
            return;
        }

        for (let i = 0; i < state.obstacles.length; i++) {
            let obs = state.obstacles[i];
            if (obs.type === 'pit' || obs.type === 'portal') {
                obs.x -= state.speed;
                if (obs.type === 'portal' && !obs.passed && state.player.x > obs.x) {
                    obs.passed = true;
                    playCachedSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/block/portal/travel.ogg');
                }
                continue;
            }

            if (obs.type === 'ghast') {
                // ✨ 幽靈停留在畫面右側，加上存在時間，若回到主世界則強制高速退場
                obs.life = (obs.life || 0) + 1;
                if (!state.isNether) {
                    obs.x -= (state.speed + 15);
                    obs.y -= 5;
                } else if (obs.life > 240) {
                    obs.x -= (state.speed + 5); // 4秒後飛走
                } else {
                    obs.x = LOG_W - 80; 
                }

                obs.y += Math.sin(state.frames * 0.05) * 1.5; 
                
                // 幽靈發射火球 (機率降低)
                if (Math.random() < 0.005 && obs.x > state.player.x) {
                    playCachedSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/mob/ghast/fireball4.ogg');
                    playCachedSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/mob/ghast/moan1.ogg'); // ✨ 幽靈自己的專屬聲音
                    state.obstacles.push({
                        type: 'fireball',
                        x: obs.x - 10,
                        y: obs.y + obs.h / 2 - 10,
                        w: 30, // 火球變大
                        h: 30,
                        dx: - (state.speed + 3.5), // 火球速度微調
                        dy: (state.player.y - obs.y) * 0.025
                    });
                }
            } else if (obs.type === 'fireball') {
                obs.x += obs.dx;
                obs.y += obs.dy;
                // 添加一點火球的上下飄浮感
                obs.y += Math.sin(state.frames * 0.2) * 2;
            } else if (obs.type === 'spider') {
                obs.x -= (state.speed + 1.5); 
                if (Math.random() < 0.01 && obs.y >= state.groundY - obs.h - 5) obs.dy = -8; 
                if (obs.dy !== undefined) {
                    obs.dy += 0.7;
                    obs.y += obs.dy;
                    if (obs.y + obs.h >= state.groundY) {
                        obs.y = state.groundY - obs.h;
                        obs.dy = 0;
                    }
                }
            } else if (obs.type === 'silverfish') {
                obs.x -= (state.speed + 1.2);
            } else if (obs.type === 'creeper') {
                // 苦力怕速度降低 20%
                obs.x -= Math.max(1.5, (state.speed - 2.5) * 0.8); 
                
                // ✨ 修正：加入 !obs.killed 判斷，避免已經被圖騰擋掉的苦力怕還繼續引爆
                if (!obs.defused && !obs.killed && obs.x < state.player.x + 10) {
                    if (state.hasTotem) {
                        obs.defused = true; // 解除爆炸
                        obs.killed = true;  // 標記死亡
                        state.hasTotem = false;
                        updateMcData({ hasTotem: false }, true);
                        playCachedSound("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/item/totem/use.ogg");
                        state.totemEffectTimer = 60; 
                    } else {
                        dead = true;
                        killedByCreeper = true; 
                    }
                } else {
                    obs.x -= state.speed; 
                }
            
} else if (obs.type === 'magma' || obs.type === 'netherrack_block' || obs.type === 'stone' || obs.type === 'zombie' || obs.type === 'ceiling_spider' || obs.type === 'cobweb') {                obs.x -= state.speed;
                // ✨ 讓岩漿塊自動貼合地獄起伏的表面，不會懸空
                if (obs.type === 'magma' && state.isNether) {
                    obs.y = getNetherWaveY(obs.x + obs.w / 2, state.frames, state.speed) - obs.h + 5; 
                }
            }

            if (
                !obs.killed && // ✨ 如果怪物已經被劍殺死，不再判定碰撞
                !(obs.type === 'creeper' && obs.defused) &&
                obs.type !== 'portal' && // 傳送門是安全的
                state.player.x + 5 < obs.x + obs.w - 5 &&
                state.player.x + state.player.w - 5 > obs.x + 5 &&
                state.player.y + 5 < obs.y + obs.h - 5 &&
                state.player.y + state.player.h > obs.y + 5
            ) {
               if (obs.type === 'stone' || obs.type === 'netherrack_block') {
                    if (state.player.dy > 0 && prevBottom <= obs.y + 15) {
                        state.player.y = obs.y - state.player.h;
                        state.player.dy = 0;
                        state.player.jumps = 0; 
                    } else {
                        if (state.hasTotem) {
                            state.hasTotem = false;
                            updateMcData({ hasTotem: false }, true);
                            playCachedSound("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/item/totem/use.ogg");
                            state.totemEffectTimer = 60; // ✨ 啟動圖騰特效
                            obs.killed = true; // 將牆壁破壞
                        } else {
                            dead = true; 
                        }
                    }
                } else {
                    // ✨ 檢查是否為可以被砍的怪物
                    // ✨ 檢查是否為可以被砍的怪物
                    const isMob = obs.type === 'zombie' || obs.type === 'spider' || obs.type === 'ceiling_spider' || obs.type === 'silverfish';
                    
                    if (isMob && state.activeSword && state.activeSword.durability > 0) {
                        obs.killed = true; 
                        state.activeSword.durability -= 1;
                        playCachedSound("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/player/attack/sweep1.ogg"); // 揮劍斬殺音效
                        
                        // ✨ 新增：播放對應怪物的受傷/死亡音效
                        if (obs.type === 'zombie') {
                            playCachedSound("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/zombie/hurt1.ogg");
                        } else if (obs.type === 'spider' || obs.type === 'ceiling_spider') {
                            playCachedSound("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/spider/death.ogg");
                        } else if (obs.type === 'silverfish') {
                            playCachedSound("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/silverfish/hurt1.ogg");
                        }
                        
                        if (state.activeSword.durability <= 0) {
                            // ✨ 改為 MC 原版工具碎裂音效，並移除 showAlert 中斷彈窗
                            playCachedSound("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/random/break.ogg"); 
                            state.activeSword = null;
                            updateMcData({ activeSword: null }, true);
                        } else {
                            updateMcData({ activeSword: state.activeSword }, true);
                        }
                    } else {
                       // 碰到非生物或是沒有劍可以砍
                        // ✨ 碰到怪物或障礙物時的處理邏輯，確保不死圖騰優先保護
                // 碰到苦力怕的特殊處理 (圖騰保護)
                // 碰到苦力怕的特殊處理 (圖騰保護)
                if (obs.type === 'creeper' && state.hasTotem) {
                    // ✨ 不死圖騰發動，將苦力怕"炸死"移除，玩家沒事
                    obs.killed = true; 
                    obs.defused = true; // ✨ 補上這行，徹底讓前面的距離引爆失效
                    state.hasTotem = false;
                    updateMcData({ hasTotem: false }, true);
                    playCachedSound("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/item/totem/use.ogg");
                    state.totemEffectTimer = 60; // 啟動圖騰特效
                } else if (state.hasTotem) {
                    // 碰到非苦力怕或是沒有特別處理的生物
                    // ✨ 不死圖騰發動，將障礙物破壞/生物擊殺
                    obs.killed = true; 
                    state.hasTotem = false;
                    updateMcData({ hasTotem: false }, true);
                    playCachedSound("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/item/totem/use.ogg");
                    state.totemEffectTimer = 60; // ✨ 啟動圖騰特效
                } else {
                    // 沒有劍可以砍且沒有圖騰保護 -> 死亡
                    dead = true;
                    if (obs.type === 'creeper') killedByCreeper = true; // ✨ 標記是被苦力怕炸死
                }
                    }
                }
            }
        }

        state.diamonds.forEach(d => {
            d.x -= state.speed;
            if (!d.collected &&
                state.player.x < d.x + d.w &&
                state.player.x + state.player.w > d.x &&
                state.player.y < d.y + d.h &&
                state.player.y + state.player.h > d.y
            ) {
                d.collected = true;
                playCachedSound("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/item/pickup.ogg");
                state.score += 1;
                setScore(state.score);
            }
        });

        if (dead) {
        if (killedByCreeper) {
            if (explodeSfxRef.current) {
                explodeSfxRef.current.currentTime = 0;
                explodeSfxRef.current.play().catch(e => console.log(e));
            }
            ctx.fillStyle = 'rgba(255, 100, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, 80, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'rgba(255, 200, 0, 0.9)';
            ctx.beginPath();
            ctx.arc(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, 50, 0, Math.PI * 2);
            ctx.fill();
        }
        endGame(killedByCreeper);
        return;
         }   

        state.frames++;
        
        // ✨ 每3幀大約為1公尺 (60幀=20公尺，5秒300幀=100公尺)
        state.distance = Math.floor(state.frames / 3);
        if (state.frames % 5 === 0) setDistance(state.distance); // 每5幀更新一次畫面，避免卡頓

        if (state.frames % 100 === 0 && state.speed < 15) state.speed += 0.2;

        let spawnInterval = Math.max(40, 100 - state.speed * 4);
        
        // 傳送門生成邏輯 (洞穴尾聲)
        if (cyclePos === 1750) {
            state.obstacles.push({ type: 'portal', x: LOG_W, y: state.groundY - 100, w: 70, h: 100 });
        }

        if (state.frames - state.lastSpawnFrame > spawnInterval) {
            if (Math.random() < 0.55) { 
                state.lastSpawnFrame = state.frames;
                let rand = Math.random();
                
              if (state.isNether) {
                    // ✨ 替換為適應波浪地形的生成，徹底移除醜方塊柱子
                    let currentY = getNetherWaveY(LOG_W, state.frames, state.speed);
                    if (rand < 0.2 && !state.obstacles.some(o => o.type === 'ghast')) state.obstacles.push({ type: 'ghast', x: LOG_W, y: 30 + Math.random() * 60, w: 50, h: 50 }); // 幽靈機率降為 10% 且場上只能有一隻
                    else if (rand < 0.5) state.obstacles.push({ type: 'magma', x: LOG_W, y: currentY - 40, w: 40, h: 40 });
                    else state.obstacles.push({ type: 'pit', x: LOG_W, y: currentY, w: Math.random() * 120 + 80, h: 100 });
                } else if (state.isCave) {
                    if (rand < 0.2) state.obstacles.push({ type: 'spider', x: LOG_W, y: state.groundY - 40, w: 40, h: 30, dy: 0 });
                    else if (rand < 0.4) state.obstacles.push({ type: 'silverfish', x: LOG_W, y: state.groundY - 20, w: 30, h: 20 });
else if (rand < 0.55) {
                        playCachedSound("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/random/fuse.ogg");
                        // ✨ 延遲 0.5 秒才讓苦力怕出現在畫面右側
                        let spawnFrame = state.frames;
                        setTimeout(() => {
                            // 確保遊戲沒有重新開始才生成
                            if (gameRef.current && gameRef.current.frames >= spawnFrame) {
                                gameRef.current.obstacles.push({ type: 'creeper', x: LOG_W, y: gameRef.current.groundY - 40, w: 30, h: 40, defused: false });
                            }
                        }, 500);
                    }              else if (rand < 0.75) {
                        let hType = Math.random() < 0.5 ? 40 : 80;
                        state.obstacles.push({ type: 'stone', x: LOG_W, y: state.groundY - hType, w: 40, h: 40 });
                    } else if (rand < 0.9) state.obstacles.push({ type: 'ceiling_spider', x: LOG_W, y: 40, w: 40, h: 30 });
                    else state.obstacles.push({ type: 'pit', x: LOG_W, y: state.groundY, w: Math.random() * 100 + 100, h: 100 });
                } else {
                    if (rand < 0.25) state.obstacles.push({ type: 'zombie', x: LOG_W, y: state.groundY - 40, w: 30, h: 40 });
                    else if (rand < 0.4) {
                        playCachedSound("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/random/fuse.ogg");
                        // ✨ 延遲 0.5 秒才讓苦力怕出現在畫面右側
                        let spawnFrame = state.frames;
                        setTimeout(() => {
                            if (gameRef.current && gameRef.current.frames >= spawnFrame) {
                                gameRef.current.obstacles.push({ type: 'creeper', x: LOG_W, y: gameRef.current.groundY - 40, w: 30, h: 40, defused: false });
                            }
                        }, 500);
                    }
else if (rand < 0.6) state.obstacles.push({ type: 'cobweb', x: LOG_W, y: state.groundY - 120 - Math.random() * 50, w: 60, h: 60 });                    else if (rand < 0.85) state.obstacles.push({ type: 'stone', x: LOG_W, y: state.groundY - 40, w: 40, h: 40 });
                    else state.obstacles.push({ type: 'pit', x: LOG_W, y: state.groundY, w: Math.random() * 150 + 100, h: 100 });
                }
            }
        }
        
        // 鑽石生成：地獄頻率增加 50%
        // 鑽石生成：地獄頻率增加 50%
        if (state.frames >= state.nextDiamondFrame) {
            let dY = state.groundY - 50 - Math.random() * 70;
            if ((state.isCave || state.isNether) && dY < 80) dY = 80; 
            state.diamonds.push({ x: LOG_W, y: dY, w: 24, h: 24, collected: false });
            
            // 修改這裡：基礎間隔數字越小，鑽石出現越快 (原本是 240 + 120)
            let baseInterval = Math.floor(Math.random() * 120 + 60);
            
            // 地獄頻率會在這個基礎上再增加 50% (間隔減半)
            if (state.isNether) {
                baseInterval = Math.floor(baseInterval * 0.5); 
            }
            state.nextDiamondFrame = state.frames + baseInterval;
        }

        } // End of while loop for physics

        // ======================= 繪圖區域 =======================
        ctx.clearRect(0, 0, LOG_W, LOG_H);
        
        ctx.fillStyle = state.isNether ? '#3a0000' : (state.isCave ? '#222222' : '#6bc0ff');
        ctx.fillRect(0, 0, LOG_W, LOG_H);

        if (state.isNether) {
            ctx.fillStyle = '#550000'; 
            ctx.fillRect(0, 0, LOG_W, 50 + Math.sin(state.frames * 0.05) * 10);
        } else if (state.isCave) {
            ctx.fillStyle = '#333333'; 
            ctx.fillRect(0, 0, LOG_W, 40);
        }

        if (state.isNether) {
             // ✨ 畫出向左捲動、連續起伏的波浪地獄地形
             ctx.fillStyle = '#5A1111';
             ctx.beginPath();
             ctx.moveTo(0, LOG_H);
             for (let x = 0; x <= LOG_W + 20; x += 20) {
                 ctx.lineTo(x, getNetherWaveY(x, state.frames, state.speed));
             }
             ctx.lineTo(LOG_W, LOG_H);
             ctx.fill();
             
             // ✨ 畫出頂部的深色邊緣
             ctx.strokeStyle = '#3A0A0A';
             ctx.lineWidth = 8;
             ctx.beginPath();
             for (let x = 0; x <= LOG_W + 20; x += 20) {
                 let y = getNetherWaveY(x, state.frames, state.speed);
                 if (x === 0) ctx.moveTo(x, y);
                 else ctx.lineTo(x, y);
             }
             ctx.stroke();
        } else {
            ctx.fillStyle = state.isCave ? '#4a4a4a' : '#5A5A5A';
            ctx.fillRect(0, state.groundY, LOG_W, LOG_H - state.groundY);
            ctx.fillStyle = state.isCave ? '#2d2d2d' : '#4A4A4A'; 
            ctx.fillRect(0, state.groundY, LOG_W, 8);
        }
        
        state.obstacles.forEach(obs => {
            if (obs.type === 'pit') {
                // ✨ 自動切除波浪地形，讓岩漿坑完美融合
                let pitY = state.isNether ? getNetherWaveY(obs.x, state.frames, state.speed) - 20 : state.groundY;
                ctx.clearRect(obs.x, pitY, obs.w, LOG_H - pitY);
                if (state.isNether) {
                    ctx.fillStyle = '#3a0000';
                    ctx.fillRect(obs.x, pitY, obs.w, LOG_H - pitY);
                    ctx.fillStyle = '#ff5500'; // 岩漿坑
                    ctx.fillRect(obs.x, LOG_H - 20, obs.w, 20);
                } else {
                    ctx.fillStyle = state.isCave ? '#222222' : '#6bc0ff';
                    ctx.fillRect(obs.x, state.groundY, obs.w, LOG_H - state.groundY);
                }
            }
        });

        state.obstacles.forEach(obs => {
            if (obs.killed) return; // ✨ 被殺死或被圖騰無效化的怪物不畫出來

            if (obs.type === 'stone') {
                drawImgSafe(images.current.stone, obs.x, obs.y, obs.w, obs.h, '#888');
            } else if (obs.type === 'netherrack_block') {
                drawImgSafe(images.current.netherrack, obs.x, obs.y, obs.w, obs.h, '#600');
            } else if (obs.type === 'zombie') {
                drawImgSafe(images.current.zombie, obs.x, obs.y, obs.w, obs.h, '#005500');
            } else if (obs.type === 'spider' || obs.type === 'ceiling_spider') {
                drawImgSafe(images.current.spider, obs.x, obs.y, obs.w, obs.h, '#440000');
            } else if (obs.type === 'silverfish') {
                drawImgSafe(images.current.silverfish, obs.x, obs.y, obs.w, obs.h, '#999');
            } else if (obs.type === 'dragon') {
} else if (obs.type === 'cobweb') {
                drawImgSafe(images.current.cobweb, obs.x, obs.y, obs.w, obs.h, '#fff');            } else if (obs.type === 'ghast') {
                drawImgSafe(images.current.ghast, obs.x, obs.y, obs.w, obs.h, '#fff');
            } else if (obs.type === 'fireball') {
                drawImgSafe(images.current.fireball, obs.x, obs.y, obs.w, obs.h, '#ffaa00');
            } else if (obs.type === 'magma') {
                drawImgSafe(images.current.magma, obs.x, obs.y, obs.w, obs.h, '#ff5500');
                ctx.fillStyle = '#ffaa00';
                if (Math.floor(state.frames / 10) % 2 === 0) ctx.fillRect(obs.x + 8, obs.y - 15, 6, 15);
                if (Math.floor(state.frames / 8) % 2 === 0) ctx.fillRect(obs.x + 24, obs.y - 25, 6, 25);
            } else if (obs.type === 'portal') {
                ctx.globalAlpha = 0.8;
                drawImgSafe(images.current.portal, obs.x, obs.y, obs.w, obs.h, '#aa00ff');
                ctx.globalAlpha = 1.0;
            } else if (obs.type === 'creeper') {
                if (obs.defused) {
                    ctx.globalAlpha = 0.3;
                    drawImgSafe(images.current.creeper, obs.x, obs.y, obs.w, obs.h, 'rgba(255,255,255,0.5)');
                    ctx.globalAlpha = 1.0;
                } else {
                    drawImgSafe(images.current.creeper, obs.x, obs.y, obs.w, obs.h, '#0DA500');
                }
            }
        });

        state.diamonds.forEach(d => {
            if (!d.collected) {
                drawImgSafe(images.current.diamond, d.x, d.y, d.w, d.h, '#00ffff');
            }
        });

        drawImgSafe(images.current.minecart, state.player.x - 4, state.player.y + state.player.h - 15, state.player.w + 8, 20, '#555');
        drawImgSafe(images.current.steve, state.player.x + 2, state.player.y - 5, state.player.w - 4, state.player.h - 5, '#ffccaa');
// 階段提示文字
        if (state.isCave && cyclePos < 1000) {
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.font = 'bold 20px Courier New';
            ctx.fillText("你進入了危險的窄洞穴...", LOG_W/2 - 120, LOG_H/2);
        } else if (cyclePos >= 1700 && cyclePos < 1800) {
            ctx.fillStyle = 'rgba(180,0,255,0.8)';
            ctx.font = 'bold 20px Courier New';
            ctx.fillText("前方出現了地獄傳送門！", LOG_W/2 - 120, LOG_H/2);
        } else if (state.isNether && cyclePos < 1900) {
            ctx.fillStyle = 'rgba(255,50,50,0.8)';
            ctx.font = 'bold 20px Courier New';
            ctx.fillText("🔥 歡迎來到地獄！ 🔥", LOG_W/2 - 110, LOG_H/2);
        }

        // ✨ 繪製左上角裝備與耐久度狀態 (使用貼圖)
        let equipY = 30;
        ctx.textAlign = 'left';
        ctx.font = 'bold 16px Courier New';
        if (state.activeSword) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(10, equipY - 18, 160, 24);
            ctx.fillStyle = '#FCFBF7';
            // ✨ 繪製鑽石劍貼圖
            ctx.drawImage(images.current.diamond_sword, 15, equipY - 16, 16, 16);
            ctx.fillText(` 劍耐久度: ${state.activeSword.durability}`, 35, equipY);
            equipY += 30;
        }
        if (state.hasTotem) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(10, equipY - 18, 160, 24);
            ctx.fillStyle = '#ffaa00';
            // ✨ 繪製不死圖騰貼圖
            ctx.drawImage(images.current.totem_of_undying, 15, equipY - 16, 16, 16);
            ctx.fillText(` 不死圖騰: 1`, 35, equipY);
        }

        // ✨ 不死圖騰全螢幕發動特效
        // ✨ 不死圖騰全螢幕發動特效
        if (state.totemEffectTimer > 0) {
            state.totemEffectTimer--;
            ctx.fillStyle = `rgba(255, 200, 0, ${state.totemEffectTimer / 120})`; // 閃亮金光
            ctx.fillRect(0, 0, LOG_W, LOG_H);
            
            const size = 80 + (60 - state.totemEffectTimer) * 3;
            ctx.globalAlpha = state.totemEffectTimer / 60;
            
            // ✨ 修正：改用載入的不死圖騰真實貼圖，取代 Emoji
            const totemImg = images.current.totem_of_undying;
            if (totemImg && totemImg.complete) {
                ctx.drawImage(totemImg, LOG_W / 2 - size / 2, LOG_H / 2 - size / 2, size, size);
            } else {
                // 備用防呆：若圖片沒載入成功顯示文字
                ctx.font = `${size}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText('🗿', LOG_W / 2, LOG_H / 2 + size / 3);
            }
            ctx.globalAlpha = 1.0;
        }

        state.reqId = requestAnimationFrame(loop);
    };

    const endGame = (isExploded = false) => {
        setGameState('gameover');
        if (bgmRef.current) bgmRef.current.pause();
        
        // ✨ 移除 !isExploded 限制，讓苦力怕炸死時也能播正常死法音效
        if (deadSfxRef.current) {
            deadSfxRef.current.currentTime = 0;
            deadSfxRef.current.play().catch(e=>console.log("音效阻擋", e));
        }
        
        // ✨ 計算獎勵鑽石：沿途撿到的鑽石(score) + 奔跑距離獎勵(每100公尺1顆)
        const earnedDiamonds = gameRef.current.score + Math.floor(gameRef.current.distance / 100);
        // ✨ 排行榜記錄「距離」
        const finalDistance = gameRef.current.distance;
        
        onGameOver(earnedDiamonds); 
        if (gameRef.current.reqId) cancelAnimationFrame(gameRef.current.reqId);
    

        // --- 遊戲結束時上傳分數 (改為記錄距離) ---
        if (user && userProfile && finalDistance > 0) {
            const sysRef = window.db.collection('system').doc('minecart');
            sysRef.get().then(doc => {
                const data = doc.exists ? doc.data() : { week: getWeekString(), scores: {} };
                
                // 防呆檢查：如果剛好跨週
                if (data.week !== getWeekString()) {
                    data.lastWeek = data.scores || {};
                    data.scores = {};
                    data.week = getWeekString();
                }
                if (!data.scores) data.scores = {};
                
                const previousBest = data.scores[user.uid]?.score || 0;
                if (finalDistance > previousBest) {
                    data.scores[user.uid] = { name: userProfile.displayName, score: finalDistance };
                    sysRef.set(data);
                    setHighScore(finalDistance);
                    
                    // 更新畫面上的排行榜 (確保依據距離數字大小排序並取前6名)
                    const currentRanks = Object.entries(data.scores)
                        .map(([uid, info]) => ({ uid, ...info }))
                        .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
                        .slice(0, 6);
                    setLeaderboard(currentRanks);
                }
            });
        }
    };

    const handlePointerDown = (e) => {
        e.preventDefault(); 
        if (gameState === 'start') {
            if (!isAudioLoaded) return; // ✨ 確保音效載入完成才給點擊開始
            startGame();
            return;
        }
        if (gameState !== 'playing') return;

        const cvs = canvasRef.current;
        if (!cvs) return;
        const rect = cvs.getBoundingClientRect();
        
        const scaleX = LOG_W / rect.width;
        const scaleY = LOG_H / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        let hitCreeper = false;
        const state = gameRef.current;

        for (let obs of state.obstacles) {
            if (obs.type === 'creeper' && !obs.defused) {
                if (clickX >= obs.x - 30 && clickX <= obs.x + obs.w + 30 &&
                    clickY >= obs.y - 30 && clickY <= obs.y + obs.h + 30) {
                    obs.defused = true;
                    hitCreeper = true;
                    state.score += 1; 
                    setScore(state.score);
                    // ✨ 點掉苦力怕會出現死亡音效 (移除原本不小心的錯字)
                    playCachedSound("https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/sound-effect-for-editing.mp3");
                    break;
                }
            }
        }

        if (!hitCreeper) jump();
    };

    return (
        <div className="fixed inset-0 z-[80] bg-stone-800 bg-opacity-90 flex flex-col items-center justify-center p-2 sm:p-4">
            <div className="bg-stone-800 p-2 border-4 border-gray-600 rounded-2xl w-full max-w-4xl relative shadow-2xl">
                <div className="flex justify-between text-white font-bold mb-2 font-mono px-2 text-xl">
                    <span className="flex items-center space-x-4">
                        <span className="text-emerald-400">🏃 {distance} m</span>
                        <span className="flex items-center text-amber-300"><McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond.png" fallback="💎" className="w-5 h-5 mr-1 pixelated" /> {score}</span>
                    </span>
                    <button onClick={onQuit} className="text-red-400 hover:text-red-300 transition-colors">✖ 離開</button>
                </div>
                
                <div 
                    className="relative w-full flex justify-center items-center overflow-hidden border-4 border-black bg-[#222]" 
                    style={{ aspectRatio: '800/350', touchAction: 'none' }}
                    onPointerDown={handlePointerDown}
                >
                    <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} className="pixelated bg-[#6bc0ff]"></canvas>
                    
                    {gameState === 'start' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-stone-800 bg-opacity-60">
                            {/* --- 新增：左側排行榜 --- */}
                            <div className="absolute left-2 sm:left-4 top-2 sm:top-4 bottom-2 sm:bottom-4 w-44 sm:w-56 bg-stone-900 bg-opacity-90 border-2 border-amber-600 rounded p-2 flex flex-col z-20 pointer-events-auto shadow-2xl" onPointerDown={(e) => e.stopPropagation()}>
                                <h3 className="text-amber-400 font-bold text-center border-b border-gray-600 mb-2 pb-1 text-sm sm:text-base">🏆 礦車排行榜<br/><span className="text-[10px] sm:text-xs text-gray-400">週日結算 (100/60/30💎)</span></h3>
                                <div className="flex-grow overflow-y-auto custom-scrollbar space-y-1">
                                    {leaderboard.length === 0 ? (
                                        <p className="text-gray-400 text-center text-xs py-4">本週尚無人挑戰，搶下第一吧！</p>
                                    ) : (
                                        leaderboard.map((lb, i) => (
                                            <div key={i} className={`flex justify-between items-center px-1 sm:px-2 py-1 rounded border ${lb.uid === user?.uid ? 'bg-amber-900 bg-opacity-50 border-amber-700' : 'bg-stone-800 border-stone-700'}`}>
                                                <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[65%]">
                                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`} {lb.name}
                                                </span>
                                                <span className="text-emerald-400 font-bold text-[10px] sm:text-xs shrink-0">{lb.score} m</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="text-center mt-2 text-xs sm:text-sm text-gray-400 border-t border-gray-600 pt-2 shrink-0">
                                    我的本週最高: <span className="text-white font-bold">{highScore}</span>
                                </div>
                            </div>
                            
                            <button className={`mc-btn px-6 sm:px-8 py-3 sm:py-4 text-xl sm:text-2xl pointer-events-none z-10 ml-32 sm:ml-48 shadow-lg transition-opacity ${isAudioLoaded ? 'animate-pulse opacity-100' : 'opacity-50'}`}>
                                {isAudioLoaded ? '🛻 點擊開始' : '⏳ 音效載入中...'}
                            </button>
                        </div>
                    )}
                    
                    {gameState === 'gameover' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-800 bg-opacity-80 text-white">
                            <h2 className="text-4xl font-black mb-2 text-red-500 drop-shadow-md">GAME OVER</h2>
                            
                            {/* ✨ 結算面板 */}
                            <div className="flex flex-col items-center bg-stone-800 bg-opacity-50 p-4 rounded-lg mb-6 border-2 border-gray-600">
                                <p className="mb-2 font-bold text-xl flex items-center">
                                    🏃 奔跑距離: <span className="text-emerald-400 ml-2">{distance} m</span>
                                </p>
                                <p className="mb-2 font-bold text-xl flex items-center">
                                    💎 沿途收集: <span className="text-amber-400 ml-2">{score} 顆</span>
                                </p>
                                <div className="h-px w-full bg-gray-500 my-2"></div>
                                <p className="font-black text-2xl flex items-center text-amber-400">
                                    總共獲得 {score + Math.floor(distance / 100)} <McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond.png" fallback="💎" className="w-6 h-6 ml-2 pixelated" />
                                </p>
                                <p className="text-xs text-gray-400 mt-1">(每跑 100m 額外換算 1 顆 💎)</p>
                            </div>

                           <div className="flex space-x-6 z-10">
                                <button onClick={(e) => { e.stopPropagation(); startGame(); }} className="mc-btn px-6 py-3 text-lg">🔄 再玩</button>
                                <button onClick={(e) => { e.stopPropagation(); setGameState('start'); }} className="mc-btn px-6 py-3 text-lg bg-gray-400">🔙 返回</button>
                            </div>
                        </div>
                    )}
                </div>
                <p className="text-center text-gray-400 text-sm mt-3 font-bold tracking-widest leading-relaxed">
                    點擊畫面任意處跳躍 (可二段跳) <br/> 
                    <span className="text-xs text-amber-500">
                        ⚠️ 注意：苦力怕靠近時，請盡快「點擊牠」解除爆炸！
                    </span>
                </p>
            </div>
        </div>
    );
}