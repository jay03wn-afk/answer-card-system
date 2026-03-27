// --- 滑板二段跳小遊戲組件 ---
function SkateboardGame({ onGameOver, onQuit }) {
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('start'); 
    const [score, setScore] = useState(0);
    
    const bgmRef = useRef(null);
    
    const LOG_W = 800;
    const LOG_H = 350;
    
    const gameRef = useRef({
        reqId: null,
        player: { x: 50, y: 0, w: 40, h: 40, dy: 0, jumps: 0 },
        obstacles: [],
        diamonds: [],
        speed: 6,
        score: 0,
        frames: 0,
        lastSpawnFrame: 0,
        groundY: 250,
        lastFrameTime: 0
    });

    const images = useRef({ 
        steve: new Image(), 
        stone: new Image(), 
        diamond: new Image(),
        zombie: new Image(),
        husk: new Image()
    });

    useEffect(() => {
        images.current.steve.src = "https://minotar.net/helm/Steve/64.png";
        images.current.stone.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/stone.png";
        images.current.diamond.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond.png";
        images.current.zombie.src = "https://minotar.net/helm/Zombie/64.png";
        images.current.husk.src = "https://minotar.net/helm/Husk/64.png";
        
        bgmRef.current = new Audio("https://raw.githubusercontent.com/libgdx/libgdx-demo-superjumper/master/android/assets/data/music.mp3");
        bgmRef.current.loop = true;
        bgmRef.current.volume = 0.4;
        
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
        setGameState('playing');
        setScore(0);
        
        if (bgmRef.current) {
            bgmRef.current.currentTime = 0;
            bgmRef.current.play().catch(e => console.log("BGM 自動播放被阻擋", e));
        }

        gameRef.current = {
            reqId: null,
            player: { x: 50, y: 150, w: 40, h: 40, dy: 0, jumps: 0 },
            obstacles: [],
            diamonds: [],
            speed: 6.5,
            score: 0,
            frames: 0,
            lastSpawnFrame: 0,
            groundY: 250,
            lastFrameTime: performance.now()
        };
        gameRef.current.reqId = requestAnimationFrame(loop);
    };

    const jump = () => {
        const p = gameRef.current.player;
        if (p.jumps < 2) {
            p.dy = -11.5; 
            p.jumps++;
        }
    };

    const loop = (currentTime) => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const state = gameRef.current;
        
        // 鎖定 60 FPS
        if (!currentTime) currentTime = performance.now();
        const fpsInterval = 1000 / 60;
        const elapsed = currentTime - state.lastFrameTime;

        if (elapsed < fpsInterval) {
            state.reqId = requestAnimationFrame(loop);
            return;
        }
        state.lastFrameTime = currentTime - (elapsed % fpsInterval);

        const ctx = cvs.getContext('2d');
        let prevBottom = state.player.y + state.player.h; 
        
        state.player.dy += 0.7; 
        state.player.y += state.player.dy;

        let inPit = false;
        let dead = false;
        let landedOnPlatform = false;

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
                if (prevBottom <= state.groundY + 10) {
                    state.player.y = state.groundY - state.player.h;
                    state.player.dy = 0;
                    state.player.jumps = 0;
                } else {
                    dead = true;
                }
            }
        }

        if (state.player.y > LOG_H) {
            endGame();
            return;
        }

        for (let i = 0; i < state.obstacles.length; i++) {
            let obs = state.obstacles[i];
            
            if (obs.type === 'pit') {
                obs.x -= state.speed;
                continue;
            }

            if (obs.type === 'zombie') {
                obs.x -= (state.speed + 1.2); 
            } else if (obs.type === 'husk') {
                obs.x -= (state.speed + 1.2); 
                
                // 新增功能: Husk AI (玩家在地面的時候，主動跳躍越過玩家)
                let dist = obs.x - (state.player.x + state.player.w);
                if (dist > 20 && dist < 110 && state.player.y >= state.groundY - 10 && obs.y >= state.groundY - obs.h - 5) {
                    obs.dy = -13.5; // 飛越玩家
                }

                obs.dy += 0.7;
                obs.y += obs.dy;
                if (obs.y + obs.h >= state.groundY) {
                    obs.y = state.groundY - obs.h;
                    obs.dy = 0;
                }
            } else {
                obs.x -= state.speed;
            }

            if (
                state.player.x + 8 < obs.x + obs.w - 8 &&
                state.player.x + state.player.w - 8 > obs.x + 8 &&
                state.player.y + 5 < obs.y + obs.h - 5 &&
                state.player.y + state.player.h > obs.y + 5
            ) {
                if (obs.type === 'stone') {
                    if (state.player.dy > 0 && prevBottom <= obs.y + 15) {
                        state.player.y = obs.y - state.player.h;
                        state.player.dy = 0;
                        state.player.jumps = 0; 
                        landedOnPlatform = true;
                    } else {
                        dead = true; 
                    }
                } else if (obs.type === 'zombie' || obs.type === 'husk') {
                    dead = true; 
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
                state.score += 1;
                setScore(state.score);
            }
        });

        if (dead) {
            endGame();
            return;
        }

        state.frames++;
        
        if (state.frames % 100 === 0 && state.speed < 15) {
            state.speed += 0.2;
        }

        // 地形生成
        let spawnInterval = Math.max(40, 100 - state.speed * 4);
        const lastObs = state.obstacles[state.obstacles.length - 1];
        if (lastObs && lastObs.type === 'pit') {
            spawnInterval = Math.max(spawnInterval, Math.floor((lastObs.w / state.speed) + 20));
        }

        if (state.frames - state.lastSpawnFrame > spawnInterval) {
            if (Math.random() < 0.55) { 
                state.lastSpawnFrame = state.frames;
                let rand = Math.random();
                if (rand < 0.3) {
                    state.obstacles.push({ type: 'stone', x: LOG_W, y: state.groundY - 40, w: 40, h: 40 });
                } else if (rand < 0.6) {
                    // 坑洞寬度 150 + 150*
                    state.obstacles.push({ type: 'pit', x: LOG_W, y: state.groundY, w: Math.random() * 150 + 150, h: 100 });
                } else if (rand < 0.8) {
                    state.obstacles.push({ type: 'zombie', x: LOG_W, y: state.groundY - 40, w: 40, h: 40 });
                } else {
                    state.obstacles.push({ type: 'husk', x: LOG_W, y: state.groundY - 40, w: 40, h: 40, dy: 0 }); 
                }
            }
        }
        
        // 鑽石頻率 400+300*
        if (state.frames % Math.floor(Math.random() * 300 + 400) === 0) {
            let dY = state.groundY - 50 - Math.random() * 100;
            state.diamonds.push({ x: LOG_W, y: dY, w: 24, h: 24, collected: false });
        }

        // 渲染
        ctx.clearRect(0, 0, LOG_W, LOG_H);
        
        ctx.fillStyle = '#5A5A5A';
        ctx.fillRect(0, state.groundY, LOG_W, LOG_H - state.groundY);
        ctx.fillStyle = '#4A4A4A'; 
        ctx.fillRect(0, state.groundY, LOG_W, 8);
        
        state.obstacles.forEach(obs => {
            if (obs.type === 'pit') {
                ctx.clearRect(obs.x, state.groundY, obs.w, LOG_H - state.groundY);
            }
        });

        state.obstacles.forEach(obs => {
            if (obs.type === 'stone') {
                if (images.current.stone.complete) ctx.drawImage(images.current.stone, obs.x, obs.y, obs.w, obs.h);
                else { ctx.fillStyle = '#888'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h); }
            } else if (obs.type === 'zombie') {
                if (images.current.zombie.complete) ctx.drawImage(images.current.zombie, obs.x, obs.y, obs.w, obs.h);
                else { ctx.fillStyle = '#005500'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h); }
            } else if (obs.type === 'husk') {
                if (images.current.husk.complete) ctx.drawImage(images.current.husk, obs.x, obs.y, obs.w, obs.h);
                else { ctx.fillStyle = '#b3a172'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h); }
            }
        });

        state.diamonds.forEach(d => {
            if (!d.collected) {
                if (images.current.diamond.complete) ctx.drawImage(images.current.diamond, d.x, d.y, d.w, d.h);
                else { ctx.fillStyle = '#00ffff'; ctx.fillRect(d.x, d.y, d.w, d.h); }
            }
        });

        if (images.current.steve.complete) {
            ctx.drawImage(images.current.steve, state.player.x, state.player.y, state.player.w, state.player.h);
        } else {
            ctx.fillStyle = '#ffccaa';
            ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
        }
        
        ctx.fillStyle = '#8b4513'; 
        ctx.fillRect(state.player.x - 4, state.player.y + state.player.h - 2, state.player.w + 8, 6);
        ctx.fillStyle = '#111'; 
        ctx.fillRect(state.player.x + 2, state.player.y + state.player.h + 4, 8, 8);
        ctx.fillRect(state.player.x + state.player.w - 10, state.player.y + state.player.h + 4, 8, 8);

        state.reqId = requestAnimationFrame(loop);
    };

    const endGame = () => {
        setGameState('gameover');
        if (bgmRef.current) bgmRef.current.pause();
        onGameOver(gameRef.current.score); 
        if (gameRef.current.reqId) cancelAnimationFrame(gameRef.current.reqId);
    };

    return (
        <div className="fixed inset-0 z-[80] bg-black bg-opacity-90 flex flex-col items-center justify-center p-2 sm:p-4">
            <div className="bg-gray-800 p-2 border-4 border-gray-600 no-round max-w-3xl w-full relative shadow-2xl">
                <div className="flex justify-between text-white font-bold mb-2 font-mono px-2 text-xl">
                    <span className="flex items-center"><McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond.png" fallback="💎" className="w-6 h-6 mr-2 pixelated" /> {score}</span>
                    <button onClick={onQuit} className="text-red-400 hover:text-red-300 transition-colors">✖ 離開</button>
                </div>
                
                <div 
                    className="bg-[#6bc0ff] relative w-full overflow-hidden border-4 border-black" 
                    style={{ height: '350px' }}
                    onMouseDown={(e) => { e.preventDefault(); if(gameState==='playing') jump(); }}
                    onTouchStart={(e) => { e.preventDefault(); if(gameState==='playing') jump(); }}
                >
                    <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} className="pixelated block"></canvas>
                    
                    {gameState === 'start' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
                            <button onClick={startGame} className="mc-btn px-8 py-4 text-2xl animate-pulse">🛹 開始跑酷</button>
                        </div>
                    )}
                    
                    {gameState === 'gameover' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white">
                            <h2 className="text-4xl font-black mb-2 text-red-500 drop-shadow-md">GAME OVER</h2>
                            <p className="mb-8 font-bold text-xl flex items-center">
                                獲得了 {score} <McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond.png" fallback="💎" className="w-6 h-6 ml-2 pixelated" />
                            </p>
                            <div className="flex space-x-6">
                                <button onClick={startGame} className="mc-btn px-6 py-3 text-lg">🔄 再玩</button>
                                <button onClick={onQuit} className="mc-btn px-6 py-3 text-lg bg-gray-400">🔙 返回</button>
                            </div>
                        </div>
                    )}
                </div>
                <p className="text-center text-gray-400 text-sm mt-3 font-bold tracking-widest leading-relaxed">
                    點擊/觸控以跳躍 (可二段跳) <br/> 
                    <span className="text-xs text-gray-500">
                        沙漠殭屍(黃)靠近時會主動飛過你頭頂，站在地上不動即可閃避。
                    </span>
                </p>
            </div>
        </div>
    );
}

// Minecraft 養成遊戲面板組件
function MinecraftDashboard({ user, userProfile, showAlert }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [showMiniGame, setShowMiniGame] = useState(false);
    
    const mcData = userProfile.mcData || { diamonds: 0, level: 1, exp: 0, hunger: 10, items: [], cats: 0, lastCheckIn: null };
    const expToNextLevel = mcData.level * 20;

    useEffect(() => {
        const fetchLeaderboard = async () => {
            const friendUids = (userProfile.friends || []).map(f => f.uid);
            if (friendUids.length === 0) {
                setLeaderboard([{ name: userProfile.displayName, ...mcData, isMe: true }]);
                return;
            }
            try {
                const board = [{ name: userProfile.displayName, ...mcData, isMe: true }];
                const promises = friendUids.map(uid => db.collection('users').doc(uid).get());
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
        db.collection('users').doc(user.uid).update({
            mcData: { ...mcData, ...updates }
        }).catch(e => {
            if (!silent) showAlert('更新失敗：' + e.message);
        });
    };

    const handleCheckIn = () => {
        const today = new Date().toISOString().split('T')[0];
        if (mcData.lastCheckIn === today) {
            return showAlert("今日已經簽到過囉！");
        }
        
        let newHunger = mcData.hunger - 2; 
        if (newHunger < 0) newHunger = 0;

        updateMcData({ 
            diamonds: mcData.diamonds + 20, 
            exp: mcData.exp + 10,
            hunger: newHunger,
            lastCheckIn: today 
        });
        showAlert("✅ 簽到成功！獲得 20 💎 與 10 EXP\n(史蒂夫消耗了 2 點飽食度)");
    };

    const handleBuy = (item, cost, type) => {
        if (mcData.diamonds < cost) {
            return showAlert(`鑽石不夠喔！需要 ${cost} 💎`);
        }

        let updates = { diamonds: mcData.diamonds - cost };

        if (type === 'food') {
            if (mcData.hunger >= 10) return showAlert("史蒂夫現在很飽了！");
            updates.hunger = Math.min(10, mcData.hunger + 3);
            showAlert("🍎 史蒂夫吃下了蘋果，飽食度 +3！");
        } else if (type === 'cat') {
            updates.cats = (mcData.cats || 0) + 1;
            showAlert("🐱 成功收編！一隻鼻子有可愛斑點的小貓加入了你的家！");
        } else if (type === 'sword') {
            let newExp = mcData.exp + 50;
            let newLevel = mcData.level;
            if (newExp >= newLevel * 20) {
                newExp -= newLevel * 20;
                newLevel += 1;
                showAlert("🗡️ 獲得鑽石劍！經驗大增，恭喜升級！");
            } else {
                showAlert("🗡️ 獲得鑽石劍！裝備後感覺變強了，經驗 +50！");
            }
            updates.exp = newExp;
            updates.level = newLevel;
            updates.items = [...(mcData.items || []), '鑽石劍'];
        }

        updateMcData(updates);
    };

    const handleMiniGameOver = (earnedDiamonds) => {
        if (earnedDiamonds > 0) {
            updateMcData({ diamonds: mcData.diamonds + earnedDiamonds }, true); 
        }
    };

    const mcBase = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item";
    const imgDiamond = `${mcBase}/diamond.png`;
    const imgApple = `${mcBase}/apple.png`;
    const imgMeat = `${mcBase}/cooked_beef.png`;
    const imgSword = `${mcBase}/diamond_sword.png`;
    const imgCatEgg = `${mcBase}/cat_spawn_egg.png`;
    const imgSteve = "https://minotar.net/helm/Steve/64.png";

    return (
        <div className="mc-bg h-[calc(100dvh-100px)] overflow-y-auto custom-scrollbar p-4 relative">
            
            {showMiniGame && (
                <SkateboardGame 
                    onGameOver={handleMiniGameOver} 
                    onQuit={() => setShowMiniGame(false)} 
                />
            )}

            <div className="max-w-4xl mx-auto mc-ui p-6 flex flex-col space-y-6 bg-opacity-90 dark:bg-opacity-80">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <div>
                        <h1 className="text-2xl font-black mb-2 text-gray-800 dark:text-gray-100 tracking-wide drop-shadow-md">⛏️ 史蒂夫的養成天地</h1>
                        <p className="text-sm font-bold text-gray-600 dark:text-gray-300">完成測驗或遊玩小遊戲來獲取鑽石！</p>
                    </div>
                    <div className="mc-panel-dark w-full md:w-auto text-white">
                        <div className="flex space-x-6 text-sm items-center font-bold">
                            <div className="text-center">
                                <p className="text-green-400 text-lg">Lv. {mcData.level}</p>
                                <p className="text-xs text-gray-300">EXP: {mcData.exp}/{expToNextLevel}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="flex items-center text-blue-300"><McImg src={imgDiamond} fallback="💎" className="w-4 h-4 mr-1 pixelated" /> {mcData.diamonds}</p>
                                <p className="flex items-center text-orange-300"><McImg src={imgMeat} fallback="🍖" className="w-4 h-4 mr-1 pixelated" /> {mcData.hunger}/10</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div className="space-y-6">
                        <div className="mc-panel-dark text-white">
                            <h2 className="border-b-2 border-gray-600 pb-2 mb-4 font-bold text-gray-300 flex justify-between items-center">
                                <span>🏡 你的家</span>
                                <button onClick={() => setShowMiniGame(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 border-2 border-blue-800 font-bold transition-colors">
                                    🛹 玩滑板遊戲
                                </button>
                            </h2>
                            <div className="text-center p-6 mc-bg border-4 border-gray-800 mb-4 h-36 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                                <McImg src={imgSteve} fallback="🧍‍♂️" className="w-16 h-16 pixelated shadow-lg border border-black" />
                                <div className="flex space-x-2 text-2xl absolute bottom-2 right-2">
                                    {Array.from({ length: mcData.cats || 0 }).map((_, i) => <span key={i} title="斑點貓">🐱</span>)}
                                    {(mcData.items || []).includes('鑽石劍') && <McImg src={imgSword} fallback="🗡️" className="w-8 h-8 pixelated drop-shadow-md" />}
                                </div>
                            </div>
                            <button onClick={handleCheckIn} className="mc-btn w-full py-2 flex justify-center items-center">
                                📅 每日簽到 (+20 <McImg src={imgDiamond} fallback="💎" className="w-4 h-4 mx-1 pixelated"/>)
                            </button>
                        </div>

                        <div className="mc-panel-dark text-white">
                            <h2 className="border-b-2 border-gray-600 pb-2 mb-4 font-bold text-gray-300">🛒 商店</h2>
                            <div className="space-y-3">
                                <button onClick={() => handleBuy('apple', 10, 'food')} className="mc-btn w-full py-2 flex justify-between px-4 items-center">
                                    <span className="flex items-center"><McImg src={imgApple} fallback="🍎" className="w-5 h-5 mr-2 pixelated"/> 買蘋果 (+3 飽食)</span>
                                    <span className="text-blue-800 flex items-center">10 <McImg src={imgDiamond} fallback="💎" className="w-4 h-4 ml-1 pixelated"/></span>
                                </button>
                                <button onClick={() => handleBuy('cat', 100, 'cat')} className="mc-btn w-full py-2 flex justify-between px-4 items-center">
                                    <span className="flex items-center"><McImg src={imgCatEgg} fallback="🥚" className="w-5 h-5 mr-2 pixelated"/> 領養斑點貓咪</span>
                                    <span className="text-blue-800 flex items-center">100 <McImg src={imgDiamond} fallback="💎" className="w-4 h-4 ml-1 pixelated"/></span>
                                </button>
                                <button onClick={() => handleBuy('sword', 300, 'sword')} className="mc-btn w-full py-2 flex justify-between px-4 items-center">
                                    <span className="flex items-center"><McImg src={imgSword} fallback="🗡️" className="w-5 h-5 mr-2 pixelated"/> 鑽石劍 (+50 EXP)</span>
                                    <span className="text-blue-800 flex items-center">300 <McImg src={imgDiamond} fallback="💎" className="w-4 h-4 ml-1 pixelated"/></span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mc-panel-dark text-white h-full">
                        <h2 className="border-b-2 border-gray-600 pb-2 mb-4 font-bold text-yellow-300">🏆 好友等級排行榜</h2>
                        <div className="space-y-2 overflow-y-auto max-h-[22rem] custom-scrollbar pr-2">
                            {leaderboard.map((lb, idx) => (
                                <div key={idx} className={`flex justify-between items-center p-3 border-b border-gray-700 ${lb.isMe ? 'bg-white bg-opacity-10 rounded' : ''}`}>
                                    <div className="flex items-center space-x-3">
                                        <span className="font-bold w-6 text-center">{idx === 0 ? '👑' : idx + 1}</span>
                                        <span className="truncate max-w-[120px]">{lb.name}</span>
                                    </div>
                                    <div className="text-right flex items-center space-x-4">
                                        <span className="text-green-400 font-bold">Lv.{lb.level}</span>
                                        <span className="text-xs text-gray-300 flex items-center w-12 justify-end"><McImg src={imgDiamond} fallback="💎" className="w-3 h-3 mr-1 pixelated" /> {lb.diamonds}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}