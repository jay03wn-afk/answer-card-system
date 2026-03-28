const { useState, useEffect, useRef } = React;

const McImg = ({ src, fallback, className, ...props }) => {
    const [error, setError] = useState(false);
    if (error) return <span className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{fallback}</span>;
    return <img src={src} className={className} onError={() => setError(true)} alt={fallback || "img"} {...props} />;
};

// --- 礦車跑酷小遊戲組件 ---
function MinecartGame({ mcData, updateMcData, showAlert, onGameOver, onQuit }) {
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('start'); 
    const [score, setScore] = useState(0);
    
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
        lastJumpTime: 0, 
        lastFrameTime: 0
    });

    const images = useRef({ 
        steve: new Image(), stone: new Image(), diamond: new Image(),
        zombie: new Image(), spider: new Image(), silverfish: new Image(),
        creeper: new Image(), dragon: new Image(), minecart: new Image()
    });

    useEffect(() => {
        images.current.steve.src = "https://minotar.net/helm/Steve/64.png";
        images.current.stone.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/stone.png";
        images.current.diamond.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond.png";
        images.current.zombie.src = "https://minotar.net/helm/Zombie/64.png";
        images.current.spider.src = "https://minotar.net/helm/Spider/64.png";
        images.current.silverfish.src = "https://minotar.net/helm/Silverfish/64.png";
        images.current.creeper.src = "https://minotar.net/helm/Creeper/64.png";
        images.current.dragon.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/dragon_head.png";
        images.current.minecart.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/minecart.png";
        
        bgmRef.current = new Audio("https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/S4.mp3");
        bgmRef.current.loop = true;
        bgmRef.current.volume = 0.4;

        deadSfxRef.current = new Audio("https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/Pou%20Game%20over%20Effects.mp3");
        deadSfxRef.current.volume = 0.6;
        explodeSfxRef.current = new Audio("https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/exEXP.mp3");
        explodeSfxRef.current.volume = 0.8;
        
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
        if (mcData.hunger < 1) {
            showAlert("🍖 史蒂夫太餓了！請先去商店買點東西吃，再來玩礦車吧！");
            return; // 終止，不開始遊戲
        }
        updateMcData({ hunger: mcData.hunger - 1 }, true);
        if (bgmRef.current) {
            bgmRef.current.currentTime = 0;
            bgmRef.current.play().catch(e => console.log("BGM 被阻擋", e));
        }

        gameRef.current = {
            reqId: null,
            player: { x: 50, y: 150, w: 36, h: 40, dy: 0, jumps: 0 },
            obstacles: [],
            diamonds: [],
            speed: 6.5,
            score: 0,
            frames: 0,
            lastSpawnFrame: 0,
            nextDiamondFrame: Math.floor(Math.random() * 240 + 120), 
            groundY: 250,
            targetGroundY: 250,
            isCave: false,
            lastJumpTime: 0,
            lastFrameTime: performance.now()
        };
        gameRef.current.reqId = requestAnimationFrame(loop);
    };

    const jump = () => {
        const now = performance.now();
        // 加入 150ms 冷卻時間，解決手機點一下判定成兩下的 Bug
        if (now - gameRef.current.lastJumpTime < 150) return; 
        gameRef.current.lastJumpTime = now;

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
        
        if (!currentTime) currentTime = performance.now();
        const fpsInterval = 1000 / 60;
        const elapsed = currentTime - state.lastFrameTime;

        if (elapsed < fpsInterval) {
            state.reqId = requestAnimationFrame(loop);
            return;
        }
        state.lastFrameTime = currentTime - (elapsed % fpsInterval);

        const ctx = cvs.getContext('2d');

        // --- 防當機：安全渲染繪圖函式 ---
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

        let prevBottom = state.player.y + state.player.h; 
        state.player.dy += 0.7; 
        state.player.y += state.player.dy;

        // 洞穴地形變換：每 900 frame (約15秒) 切換
        state.isCave = Math.floor(state.frames / 900) % 2 !== 0;

        if (state.isCave) {
            if (state.frames % 150 === 0) {
                state.targetGroundY = 180 + Math.random() * 100; // 地形起伏
            }
        } else {
            state.targetGroundY = 250; 
        }
        
        state.groundY += (state.targetGroundY - state.groundY) * 0.05;

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

        // 地板與深坑判定
        if (state.player.y + state.player.h >= state.groundY) {
            if (!inPit) {
                if (prevBottom <= state.groundY + 15) {
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

        // 障礙物與怪物邏輯
        for (let i = 0; i < state.obstacles.length; i++) {
            let obs = state.obstacles[i];
            if (obs.type === 'pit') {
                obs.x -= state.speed;
                continue;
            }

            if (obs.type === 'dragon') {
                obs.x -= (state.speed + 2.5); // 龍飛很快
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
                // 將 state.speed 減去一個數值（例如 2），讓牠比其他東西慢
                obs.x -= Math.max(2, state.speed - 2.5); 
                
                if (!obs.defused && obs.x < state.player.x + 10) {
                    dead = true;
                    killedByCreeper = true; // 記錄死因
                     } else {
                obs.x -= state.speed; 
            }}

            // 碰撞判定
            if (
                !(obs.type === 'creeper' && obs.defused) &&
                state.player.x + 5 < obs.x + obs.w - 5 &&
                state.player.x + state.player.w - 5 > obs.x + 5 &&
                state.player.y + 5 < obs.y + obs.h - 5 &&
                state.player.y + state.player.h > obs.y + 5
            ) {
                if (obs.type === 'stone') {
                    if (state.player.dy > 0 && prevBottom <= obs.y + 15) {
                        state.player.y = obs.y - state.player.h;
                        state.player.dy = 0;
                        state.player.jumps = 0; 
                    } else dead = true; 
                }else {
                     dead = true;
                      if (obs.type === 'creeper') killedByCreeper = true; // 記錄死因
                    }
            }
        }

        // 鑽石拾取
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
        if (killedByCreeper) {
            // 播放爆炸音效
            if (explodeSfxRef.current) {
                explodeSfxRef.current.currentTime = 0;
                explodeSfxRef.current.play().catch(e => console.log(e));
            }
            // 繪製瞬間爆炸光芒 (兩層橘黃色圓形疊加)
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
        if (state.frames % 100 === 0 && state.speed < 15) state.speed += 0.2;

        let spawnInterval = Math.max(40, 100 - state.speed * 4);
        
        // 隨機生成
        if (state.frames - state.lastSpawnFrame > spawnInterval) {
            if (Math.random() < 0.55) { 
                state.lastSpawnFrame = state.frames;
                let rand = Math.random();
                
                if (state.isCave) {
                    if (rand < 0.2) state.obstacles.push({ type: 'spider', x: LOG_W, y: state.groundY - 40, w: 40, h: 30, dy: 0 });
                    else if (rand < 0.4) state.obstacles.push({ type: 'silverfish', x: LOG_W, y: state.groundY - 20, w: 30, h: 20 });
                    else if (rand < 0.55) state.obstacles.push({ type: 'creeper', x: LOG_W, y: state.groundY - 40, w: 30, h: 40, defused: false });
                    else if (rand < 0.75) {
                        let hType = Math.random() < 0.5 ? 40 : 80;
                        state.obstacles.push({ type: 'stone', x: LOG_W, y: state.groundY - hType, w: 40, h: 40 });
                    } else if (rand < 0.9) state.obstacles.push({ type: 'ceiling_spider', x: LOG_W, y: 40, w: 40, h: 30 });
                    else state.obstacles.push({ type: 'pit', x: LOG_W, y: state.groundY, w: Math.random() * 100 + 100, h: 100 });
                } else {
                    if (rand < 0.25) state.obstacles.push({ type: 'zombie', x: LOG_W, y: state.groundY - 40, w: 30, h: 40 });
                    else if (rand < 0.4) state.obstacles.push({ type: 'creeper', x: LOG_W, y: state.groundY - 40, w: 30, h: 40, defused: false });
                    else if (rand < 0.6) state.obstacles.push({ type: 'dragon', x: LOG_W, y: state.groundY - 120 - Math.random() * 50, w: 60, h: 40 });
                    else if (rand < 0.85) state.obstacles.push({ type: 'stone', x: LOG_W, y: state.groundY - 40, w: 40, h: 40 });
                    else state.obstacles.push({ type: 'pit', x: LOG_W, y: state.groundY, w: Math.random() * 150 + 100, h: 100 });
                }
            }
        }
        
        // 鑽石約 4+-2 秒出現
        if (state.frames >= state.nextDiamondFrame) {
            let dY = state.groundY - 50 - Math.random() * 70;
            if (state.isCave && dY < 80) dY = 80; 
            state.diamonds.push({ x: LOG_W, y: dY, w: 24, h: 24, collected: false });
            state.nextDiamondFrame = state.frames + Math.floor(Math.random() * 240 + 120);
        }

        // --- 繪圖區 ---
        ctx.clearRect(0, 0, LOG_W, LOG_H);
        
        ctx.fillStyle = state.isCave ? '#222222' : '#6bc0ff';
        ctx.fillRect(0, 0, LOG_W, LOG_H);

        if (state.isCave) {
            ctx.fillStyle = '#333333'; // 洞穴天花板
            ctx.fillRect(0, 0, LOG_W, 40);
        }

        ctx.fillStyle = state.isCave ? '#4a4a4a' : '#5A5A5A';
        ctx.fillRect(0, state.groundY, LOG_W, LOG_H - state.groundY);
        ctx.fillStyle = state.isCave ? '#2d2d2d' : '#4A4A4A'; 
        ctx.fillRect(0, state.groundY, LOG_W, 8);
        
        state.obstacles.forEach(obs => {
            if (obs.type === 'pit') {
                ctx.clearRect(obs.x, state.groundY, obs.w, LOG_H - state.groundY);
                ctx.fillStyle = state.isCave ? '#222222' : '#6bc0ff';
                ctx.fillRect(obs.x, state.groundY, obs.w, LOG_H - state.groundY);
            }
        });

        // 怪物與障礙繪製 (全面套用安全防當機繪圖)
        state.obstacles.forEach(obs => {
            if (obs.type === 'stone') {
                drawImgSafe(images.current.stone, obs.x, obs.y, obs.w, obs.h, '#888');
            } else if (obs.type === 'zombie') {
                drawImgSafe(images.current.zombie, obs.x, obs.y, obs.w, obs.h, '#005500');
            } else if (obs.type === 'spider' || obs.type === 'ceiling_spider') {
                drawImgSafe(images.current.spider, obs.x, obs.y, obs.w, obs.h, '#440000');
            } else if (obs.type === 'silverfish') {
                drawImgSafe(images.current.silverfish, obs.x, obs.y, obs.w, obs.h, '#999');
            } else if (obs.type === 'dragon') {
                drawImgSafe(images.current.dragon, obs.x, obs.y, obs.w, obs.h, '#000');
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

        // 礦車與史蒂夫
        drawImgSafe(images.current.minecart, state.player.x - 4, state.player.y + state.player.h - 15, state.player.w + 8, 20, '#555');
        drawImgSafe(images.current.steve, state.player.x + 2, state.player.y - 5, state.player.w - 4, state.player.h - 5, '#ffccaa');

        if (state.isCave && state.frames % 900 < 100) {
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.font = 'bold 20px Courier New';
            ctx.fillText("你進入了危險的洞穴...", LOG_W/2 - 120, LOG_H/2);
        }

        state.reqId = requestAnimationFrame(loop);
    };

    const endGame = (isExploded = false) => {
        setGameState('gameover');
        if (bgmRef.current) bgmRef.current.pause();
        
        // 如果不是被炸死，才播放原本的死亡音效
        if (!isExploded && deadSfxRef.current) {
            deadSfxRef.current.currentTime = 0;
            deadSfxRef.current.play().catch(e=>console.log("音效阻擋", e));
        }
        
        onGameOver(gameRef.current.score); 
        if (gameRef.current.reqId) cancelAnimationFrame(gameRef.current.reqId);
    };

    const handlePointerDown = (e) => {
        e.preventDefault(); 
        if (gameState === 'start') {
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
                    break;
                }
            }
        }

        if (!hitCreeper) jump();
    };

    return (
        <div className="fixed inset-0 z-[80] bg-black bg-opacity-90 flex flex-col items-center justify-center p-2 sm:p-4">
            <div className="bg-gray-800 p-2 border-4 border-gray-600 no-round w-full max-w-4xl relative shadow-2xl">
                <div className="flex justify-between text-white font-bold mb-2 font-mono px-2 text-xl">
                    <span className="flex items-center"><McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond.png" fallback="💎" className="w-6 h-6 mr-2 pixelated" /> {score}</span>
                    <button onClick={onQuit} className="text-red-400 hover:text-red-300 transition-colors">✖ 離開</button>
                </div>
                
                {/* 使用 aspectRatio 徹底解決畫面被壓縮/拉長的 Bug */}
                <div 
                    className="relative w-full flex justify-center items-center overflow-hidden border-4 border-black bg-[#222]" 
                    style={{ aspectRatio: '800/350', touchAction: 'none' }}
                    onPointerDown={handlePointerDown}
                >
                    <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} className="pixelated bg-[#6bc0ff]"></canvas>
                    
                    {gameState === 'start' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
                            <button className="mc-btn px-8 py-4 text-2xl animate-pulse pointer-events-none">🛻 點擊開始</button>
                        </div>
                    )}
                    
                    {gameState === 'gameover' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white">
                            <h2 className="text-4xl font-black mb-2 text-red-500 drop-shadow-md">GAME OVER</h2>
                            <p className="mb-8 font-bold text-xl flex items-center">
                                獲得了 {score} <McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond.png" fallback="💎" className="w-6 h-6 ml-2 pixelated" />
                            </p>
                            <div className="flex space-x-6 z-10">
                                <button onClick={(e) => { e.stopPropagation(); startGame(); }} className="mc-btn px-6 py-3 text-lg">🔄 再玩</button>
                                <button onClick={(e) => { e.stopPropagation(); onQuit(); }} className="mc-btn px-6 py-3 text-lg bg-gray-400">🔙 返回</button>
                            </div>
                        </div>
                    )}
                </div>
                <p className="text-center text-gray-400 text-sm mt-3 font-bold tracking-widest leading-relaxed">
                    點擊畫面任意處跳躍 (可二段跳) <br/> 
                    <span className="text-xs text-yellow-500">
                        ⚠️ 注意：苦力怕靠近時，請盡快「點擊牠」解除爆炸！
                    </span>
                </p>
            </div>
        </div>
    );
}

// --- 礦坑尋寶小遊戲組件 ---
function MiningGame({ user, mcData, updateMcData, onQuit, showAlert }) {
    const [gameState, setGameState] = useState('idle');
    const [board, setBoard] = useState(Array(9).fill(null));
    const [isProcessing, setIsProcessing] = useState(false);
    
    const digSfx = useRef(new Audio('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/block/stone/break1.ogg'));
    const winSfx = useRef(new Audio('https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/win.mp3'));
    const bgmRef = useRef(null);

    const imgStone = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/stone.png";
    const imgDiamond = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond.png";

    const PRIZES = [
        { id: '711', name: '7-11 50元禮券', type: 'real', prob: 0.001, img: 'https://i.postimg.cc/pd20TjLs/638632987880299781.png', desc: '極巨獎！' },
        { id: 'diamond_jackpot', name: '鑽石礦 (+100 💎)', type: 'diamond', amount: 100, prob: 0.049, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/diamond_ore.png' },
        { id: 'diamond_sword', name: '鑽石劍 (稀有裝備)', type: 'item', prob: 0.05, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond_sword.png' },
        { id: 'gold_ore', name: '金礦 (+50 💎)', type: 'diamond', amount: 50, prob: 0.15, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/gold_ore.png' },
        { id: 'iron_ore', name: '鐵礦 (+20 💎)', type: 'diamond', amount: 20, prob: 0.30, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/iron_ore.png' },
        { id: 'coal_ore', name: '煤礦 (+5 💎)', type: 'diamond', amount: 5, prob: 0.45, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/coal_ore.png' }
    ];

    useEffect(() => {
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
        if (mcData.diamonds < 50) {
            return showAlert("💎 你的鑽石不足 50 顆！\n趕快去簽到或做測驗賺取吧！");
        }
        
        if (bgmRef.current) {
            bgmRef.current.play().catch(e => console.log("BGM 自動播放被阻擋", e));
        }

        updateMcData({ diamonds: mcData.diamonds - 50 }, true);
        setBoard(Array(9).fill({ revealed: false, prize: null }));
        setGameState('playing');
    };

    const handleQuit = () => {
        if (bgmRef.current) {
            bgmRef.current.pause();
        }
        onQuit();
    };

    const drawPrize = async () => {
        const r = Math.random();
        let cumulative = 0;
        let selectedPrize = PRIZES[PRIZES.length - 1]; 

        for (let prize of PRIZES) {
            cumulative += prize.prob;
            if (r <= cumulative) {
                selectedPrize = prize;
                break;
            }
        }

        if (selectedPrize.id === '711') {
            try {
                const sysDoc = await window.db.collection('system').doc('mining').get();
                const count = sysDoc.exists ? (sysDoc.data().grandPrizeCount || 0) : 0;
                if (count >= 2) {
                    selectedPrize = PRIZES[1]; 
                } else {
                    await window.db.collection('system').doc('mining').set({
                        grandPrizeCount: window.firebase.firestore.FieldValue.increment(1)
                    }, { merge: true });
                }
            } catch (e) {
                selectedPrize = PRIZES[1]; 
            }
        }
        return selectedPrize;
    };

    const handleDig = async (index) => {
        if (gameState !== 'playing' || isProcessing) return;
        setIsProcessing(true);
        
        try { digSfx.current.currentTime = 0; digSfx.current.play(); } catch(e){}

        const prize = await drawPrize();

        const newBoard = Array(9).fill(null).map((_, i) => {
            if (i === index) return { revealed: true, prize: prize, isPick: true };
            const shouldShowFakeGift = Math.random() < 0.04; 
            let dummy;
            if (shouldShowFakeGift) {
                dummy = PRIZES.find(p => p.id === '711');
            } else {
                const normalPool = PRIZES.filter(p => p.id !== '711');
                dummy = normalPool[Math.floor(Math.random() * normalPool.length)];
            }
            return { revealed: true, prize: dummy, isPick: false };
        });
        
        setBoard(newBoard);
        setGameState('revealed');

        if (prize.amount >= 0 || prize.type === 'item' || prize.type === 'real') {
            setTimeout(() => { try { winSfx.current.currentTime = 0; winSfx.current.volume = 0.8; winSfx.current.play(); } catch(e){} }, 300);
        }

        let updates = {}; 
        let msg = `🎉 恭喜挖到了 ${prize.name}！`;

        if (prize.type === 'diamond') {
            updates.diamonds = mcData.diamonds + prize.amount;
        } else if (prize.type === 'item') {
            if (!(mcData.items || []).includes(prize.id)) {
                updates.items = [...(mcData.items || []), prize.id];
            } else {
               updates.diamonds = mcData.diamonds + 30; 
                msg += " \n(你已擁有此裝備，自動轉換為 30 💎)";
            }
        } else if (prize.type === 'real') {
            msg += "\n\n🎫 請截圖此畫面並聯絡管理員領取獎品！";
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

    return (
        <div className="fixed inset-0 z-[80] bg-black bg-opacity-90 flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
            <div className="bg-[#5c5c5c] border-4 border-[#2d2d2d] no-round max-w-4xl w-full relative shadow-2xl flex flex-col md:flex-row h-[500px]">
                <button onClick={handleQuit} className="absolute -top-4 -right-4 bg-red-600 text-white w-10 h-10 border-2 border-white font-black hover:bg-red-500 z-10 transition-colors">✖</button>
                <div className="w-full md:w-3/5 p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r-4 border-[#2d2d2d]">
                    <h2 className="text-2xl font-black text-white mb-2 drop-shadow-md flex items-center">
                        ⛏️ 礦坑尋寶 <span className="text-sm font-normal text-yellow-300 ml-4 bg-black bg-opacity-40 px-2 py-1 rounded">擁有: {mcData.diamonds} 💎</span>
                    </h2>
                    <p className="text-gray-300 font-bold mb-6 text-sm">每次開挖消耗 50 💎，有機會挖中神級裝備或實體大獎！</p>

                    {gameState === 'idle' ? (
                        <div className="flex-grow flex items-center justify-center w-full">
                            <button onClick={handleStart} className="mc-btn px-8 py-5 text-2xl animate-bounce flex items-center">
                                開始挖礦 (50 <McImg src={imgDiamond} className="w-6 h-6 ml-2 pixelated"/>)
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 w-full max-w-[300px] aspect-square bg-[#3a3a3a] p-2 border-4 border-[#1a1a1a]">
                            {board.map((block, i) => (
                                <button 
                                    key={i} 
                                    disabled={gameState === 'revealed' || isProcessing}
                                    onClick={() => handleDig(i)}
                                    className={`relative w-full h-full border-2 border-black transition-all ${!block.revealed ? 'hover:scale-105 hover:brightness-125 cursor-pointer' : ''}`}
                                >
                                    {!block.revealed ? (
                                        <McImg src={imgStone} className="w-full h-full object-cover pixelated" />
                                    ) : (
                                        <div className={`w-full h-full flex flex-col items-center justify-center p-1 ${block.isPick ? 'bg-yellow-100 border-yellow-500 border-4 animate-in zoom-in' : 'bg-[#5c5c5c] opacity-50'}`}>
                                            <McImg src={block.prize?.img} className="w-10 h-10 pixelated drop-shadow-md mb-1" />
                                            {block.isPick && <span className="text-[10px] font-bold text-black text-center leading-tight truncate w-full">{block.prize?.name.split(' ')[0]}</span>}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {gameState === 'revealed' && (
                        <button onClick={handleStart} className="mt-6 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 border-2 border-black font-bold text-lg shadow-lg">
                            🔄 再挖一次 (50 💎)
                        </button>
                    )}
                </div>

                <div className="w-full md:w-2/5 bg-[#2d2d2d] p-4 flex flex-col h-full">
                    <h3 className="text-yellow-400 font-bold border-b-2 border-gray-600 pb-2 mb-3 shrink-0 flex items-center">
                        📜 我的挖礦紀錄
                    </h3>
                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {(!mcData.miningHistory || mcData.miningHistory.length === 0) ? (
                            <p className="text-gray-500 text-sm text-center mt-10">尚無紀錄，趕快開挖吧！</p>
                        ) : (
                            mcData.miningHistory.map((rec) => (
                                <div key={rec.id} className={`p-2 text-sm border-l-4 bg-opacity-10 flex justify-between items-center ${rec.isBigWin ? 'border-yellow-400 bg-yellow-400 text-yellow-300' : 'border-gray-500 bg-white text-gray-300'}`}>
                                    <span className="font-mono text-gray-500 text-xs shrink-0 w-16">{rec.date}</span>
                                    <span className={`font-bold truncate ${rec.isBigWin ? 'animate-pulse' : ''}`}>{rec.prizeName}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Minecraft 養成遊戲面板組件 ---
function MinecraftDashboard({ user, userProfile, showAlert }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [showMiniGame, setShowMiniGame] = useState(false);
    const [showMiningGame, setShowMiningGame] = useState(false); 
    const [showSandbox, setShowSandbox] = useState(false);

    const mcData = userProfile.mcData || { diamonds: 0, level: 1, exp: 0, hunger: 10, items: [], cats: 0, lastCheckIn: null };
    const expToNextLevel = mcData.level * 20;
    
    const mcBase = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item";
    const imgDiamond = `${mcBase}/diamond.png`;
    const imgSteve = "https://minotar.net/helm/Steve/64.png";

    const storeItems = [
        { id: 'apple', name: '蘋果 (+3 飽食)', type: 'food', cost: 10, value: 3, img: `${mcBase}/apple.png`, icon: '🍎' },
        { id: 'bread', name: '麵包 (+5 飽食)', type: 'food', cost: 15, value: 5, img: `${mcBase}/bread.png`, icon: '🍞' },
        { id: 'beef', name: '烤牛肉 (+8 飽食)', type: 'food', cost: 25, value: 8, img: `${mcBase}/cooked_beef.png`, icon: '🥩' },
        { id: 'golden_apple', name: '金蘋果 (+10飽食/EXP)', type: 'food_exp', cost: 50, value: 10, exp: 10, img: `${mcBase}/golden_apple.png`, icon: '🍏' },
        { id: 'cat', name: '斑點貓咪', type: 'pet', cost: 100, img: `${mcBase}/cat_spawn_egg.png`, icon: '🐱' },
        { id: 'wolf', name: '忠心狗狗', type: 'pet', cost: 120, img: `${mcBase}/wolf_spawn_egg.png`, icon: '🐶' },
        { id: 'parrot', name: '彩色鸚鵡', type: 'pet', cost: 150, img: `${mcBase}/parrot_spawn_egg.png`, icon: '🦜' },
        { id: 'axolotl', name: '六角恐龍', type: 'pet', cost: 200, img: `${mcBase}/axolotl_spawn_egg.png`, icon: '🦎' },
        { id: 'torch', name: '火把 (+5 EXP)', type: 'item', cost: 20, exp: 5, img: `${mcBase}/torch.png`, icon: '🔥' },
        { id: 'wooden_sword', name: '木劍 (+10 EXP)', type: 'item', cost: 50, exp: 10, img: `${mcBase}/wooden_sword.png`, icon: '🗡️' },
        { id: 'shield', name: '盾牌 (+15 EXP)', type: 'item', cost: 80, exp: 15, img: `${mcBase}/shield.png`, icon: '🛡️' },
        { id: 'stone_sword', name: '石劍 (+20 EXP)', type: 'item', cost: 100, exp: 20, img: `${mcBase}/stone_sword.png`, icon: '🗡️' },
        { id: 'bow', name: '弓箭 (+20 EXP)', type: 'item', cost: 100, exp: 20, img: `${mcBase}/bow.png`, icon: '🏹' },
        { id: 'iron_pickaxe', name: '鐵鎬 (+25 EXP)', type: 'item', cost: 120, exp: 25, img: `${mcBase}/iron_pickaxe.png`, icon: '⛏️' },
        { id: 'iron_sword', name: '鐵劍 (+30 EXP)', type: 'item', cost: 150, exp: 30, img: `${mcBase}/iron_sword.png`, icon: '🗡️' },
        { id: 'iron_chestplate', name: '鐵胸甲 (+40 EXP)', type: 'item', cost: 200, exp: 40, img: `${mcBase}/iron_chestplate.png`, icon: '👕' },
        { id: 'diamond_pickaxe', name: '鑽石鎬 (+45 EXP)', type: 'item', cost: 280, exp: 45, img: `${mcBase}/diamond_pickaxe.png`, icon: '⛏️' },
        { id: 'diamond_sword', name: '鑽石劍 (+50 EXP)', type: 'item', cost: 300, exp: 50, img: `${mcBase}/diamond_sword.png`, icon: '🗡️' },
        { id: 'diamond_chestplate', name: '鑽石胸甲 (+80 EXP)', type: 'item', cost: 500, exp: 80, img: `${mcBase}/diamond_chestplate.png`, icon: '💎' },
        { id: 'netherite_sword', name: '獄髓劍 (+100 EXP)', type: 'item', cost: 800, exp: 100, img: `${mcBase}/netherite_sword.png`, icon: '⚔️' },
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
        window.db.collection('users').doc(user.uid).update({
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

    const handleBuy = (item) => {
        if (mcData.diamonds < item.cost) {
            return showAlert(`鑽石不夠喔！需要 ${item.cost} 💎`);
        }

        if (item.type === 'item' && (mcData.items || []).includes(item.id)) {
            return showAlert("這個裝備你已經擁有囉！無法重複購買。");
        }

        let updates = { diamonds: mcData.diamonds - item.cost };
        let msg = "";

        if (item.type === 'food' || item.type === 'food_exp') {
            if (mcData.hunger >= 10) return showAlert("史蒂夫現在很飽了！不需要吃東西。");
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
        } else if (item.type === 'pet') {
            const petList = mcData.pets || [];
            if(item.id === 'cat') updates.cats = (mcData.cats || 0) + 1; 
            updates.pets = [...petList, item.id];
            showAlert(`💕 成功收編！一隻可愛的 ${item.name} 加入了你的家！`);
        } else if (item.type === 'item') {
            let newExp = mcData.exp + item.exp;
            let newLevel = mcData.level;
            if (newExp >= newLevel * 20) {
                newExp -= newLevel * 20;
                newLevel += 1;
                showAlert(`✨ 獲得 ${item.name.split(' ')[0]}！經驗大增，恭喜升級！`);
            } else {
                showAlert(`✨ 獲得 ${item.name.split(' ')[0]}！裝備後感覺變強了！`);
            }
            updates.exp = newExp;
            updates.level = newLevel;
            updates.items = [...(mcData.items || []), item.id];
        }

        updateMcData(updates);
    };

    const handleMiniGameOver = (earnedDiamonds) => {
        if (earnedDiamonds > 0) {
            updateMcData({ diamonds: mcData.diamonds + earnedDiamonds }, true); 
        }
    };

    const ownedItems = storeItems.filter(i => (mcData.items || []).includes(i.id) || (i.id === 'diamond_sword' && (mcData.items || []).includes('鑽石劍')));
    const ownedPets = storeItems.filter(i => (mcData.pets || []).includes(i.id));

    return (
        <div className="mc-bg h-[calc(100dvh-100px)] overflow-y-auto custom-scrollbar p-4 relative">
            
            {showMiniGame && (
        <MinecartGame 
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

            <div className="max-w-5xl mx-auto mc-ui p-6 flex flex-col space-y-6 bg-opacity-90 dark:bg-opacity-80">
                
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
                                <p className="flex items-center text-orange-300"><span className="text-lg mr-1 leading-none">🍖</span> {mcData.hunger}/10</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    <div className="space-y-6 lg:col-span-1">
                        <div className="mc-panel-dark text-white">
                            <h2 className="border-b-2 border-gray-600 pb-2 mb-4 font-bold text-gray-300 flex justify-between items-center">
    <span>🏡 你的家</span>
    <div className="flex space-x-2">
        <button onClick={() => setShowSandbox(true)} className="bg-green-600 hover:bg-green-500 text-white text-xs px-2 py-1 border-2 border-green-800 font-bold transition-colors">
            🏗️ 蓋房子
        </button>
        <button onClick={() => setShowMiningGame(true)} className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-2 py-1 border-2 border-yellow-800 font-bold transition-colors">
            ⛏️ 挖礦
        </button>
        <button onClick={() => setShowMiniGame(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 border-2 border-blue-800 font-bold transition-colors">
            🛻 礦車探險
        </button>
    </div>
</h2>
                            <div className="p-4 mc-bg border-4 border-gray-800 mb-4 h-48 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                                <McImg src={imgSteve} fallback="🧍‍♂️" className="w-16 h-16 pixelated shadow-lg border border-black mb-2" />
                                
                                <div className="flex flex-wrap justify-center gap-1 max-w-full z-10">
                                    {Array.from({ length: mcData.cats || 0 }).map((_, i) => <span key={`cat-${i}`} title="斑點貓" className="text-xl">🐱</span>)}
                                    {ownedPets.map((p, i) => <span key={`pet-${i}`} title={p.name} className="text-xl">{p.icon}</span>)}
                                </div>
                                <div className="absolute bottom-2 flex flex-wrap justify-center gap-2 max-w-full px-2">
                                    {ownedItems.slice(-4).map(item => (
                                        <McImg key={item.id} src={item.img} fallback={item.icon} className="w-6 h-6 pixelated drop-shadow-md" />
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleCheckIn} className="mc-btn w-full py-2 flex justify-center items-center">
                                📅 每日簽到 (+20 <McImg src={imgDiamond} fallback="💎" className="w-4 h-4 mx-1 pixelated"/>)
                            </button>
                        </div>

                        <div className="mc-panel-dark text-white h-full">
                            <h2 className="border-b-2 border-gray-600 pb-2 mb-4 font-bold text-yellow-300">🏆 好友等級排行榜</h2>
                            <div className="space-y-2 overflow-y-auto max-h-[16rem] custom-scrollbar pr-2">
                                {leaderboard.map((lb, idx) => (
                                    <div key={idx} className={`flex justify-between items-center p-3 border-b border-gray-700 ${lb.isMe ? 'bg-white bg-opacity-10 rounded' : ''}`}>
                                        <div className="flex items-center space-x-3">
                                            <span className="font-bold w-6 text-center">{idx === 0 ? '👑' : idx + 1}</span>
                                            <span className="truncate max-w-[100px] text-sm">{lb.name}</span>
                                        </div>
                                        <div className="text-right flex items-center space-x-3">
                                            <span className="text-green-400 font-bold text-sm">Lv.{lb.level}</span>
                                            <span className="text-xs text-gray-300 flex items-center w-10 justify-end"><McImg src={imgDiamond} fallback="💎" className="w-3 h-3 mr-1 pixelated" /> {lb.diamonds}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mc-panel-dark text-white lg:col-span-2">
                        <h2 className="border-b-2 border-gray-600 pb-2 mb-4 font-bold text-gray-300">🛒 雜貨商賈</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[30rem] overflow-y-auto custom-scrollbar pr-2">
                            {storeItems.map((item) => (
                                <button key={item.id} onClick={() => handleBuy(item)} className="mc-btn py-2 flex justify-between px-3 items-center hover:bg-[#b0b0b0]">
                                    <span className="flex items-center text-sm truncate pr-2">
                                        <McImg src={item.img} fallback={item.icon} className="w-5 h-5 mr-2 pixelated shrink-0"/> 
                                        {item.name}
                                    </span>
                                    <span className="text-blue-800 flex items-center text-sm font-black shrink-0">
                                        {item.cost} <McImg src={imgDiamond} fallback="💎" className="w-4 h-4 ml-1 pixelated"/>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
// --- 2D 沙盒建築遊戲組件 ---
// --- 2D 沙盒建築遊戲組件 (旗艦擴充版) ---
function SandboxGame({ user, userProfile, mcData, updateMcData, showAlert, onQuit }) {
    const COLS = 20;
    const ROWS = 12;
    const TOTAL_CELLS = COLS * ROWS;
    const TODAY = new Date().toISOString().split('T')[0];

    // --- 100+ 方塊資料庫 (依稀有度與維度定價) ---
    const CATEGORIES = ['全部', '基礎與礦石', '原木與建材', '地獄(需解鎖)', '末地(需解鎖)', '裝飾與植物'];
    const [activeCategory, setActiveCategory] = useState('全部');

    const BLOCK_TYPES = [
        // 工具
        { id: 'erase', name: '橡皮擦 (拆除)', cat: '工具', img: null, price: 0, special: true },
        { id: 'sign', name: '告示牌 (留言)', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/oak_sign.png', price: 10, special: true, desc: '點擊空地留言(10💎/則)' },
        { id: 'poppy', name: '送小花 (拜訪專用)', cat: '工具', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/poppy.png', price: 0, special: true, desc: '參觀時送給好友' },
        { id: 'gift_box', name: '禮物盒 (送方塊)', cat: '工具', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/chest.png', price: 0, special: true, desc: '打包方塊送給好友' },
        
        // 基礎與礦石 (10-500💎)
        { id: 'dirt', name: '泥土', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/dirt.png', price: 1 },
        { id: 'grass_block_side', name: '草方塊', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/grass_block_side.png', price: 5 },
        { id: 'stone', name: '石頭', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/stone.png', price: 5 },
        { id: 'cobblestone', name: '鵝卵石', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/cobblestone.png', price: 2 },
        { id: 'sand', name: '沙子', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/sand.png', price: 3 },
        { id: 'gravel', name: '礫石', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/gravel.png', price: 3 },
        { id: 'coal_block', name: '煤炭磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/coal_block.png', price: 20 },
        { id: 'iron_block', name: '鐵磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/iron_block.png', price: 50 },
        { id: 'gold_block', name: '金磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/gold_block.png', price: 100 },
        { id: 'lapis_block', name: '青金石磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/lapis_block.png', price: 80 },
        { id: 'emerald_block', name: '綠寶石磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/emerald_block.png', price: 300 },
        { id: 'diamond_block', name: '鑽石磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/diamond_block.png', price: 500 },
        { id: 'obsidian', name: '黑曜石', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/obsidian.png', price: 150 },

        // 原木與建材 (10-80💎)
        ...['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak'].flatMap(wood => [
            { id: `${wood}_log`, name: `${wood}原木`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${wood}_log.png`, price: 10 },
            { id: `${wood}_planks`, name: `${wood}木板`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${wood}_planks.png`, price: 5 }
        ]),
        { id: 'glass', name: '玻璃', cat: '原木與建材', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/glass.png', price: 15 },
        { id: 'bricks', name: '磚塊', cat: '原木與建材', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/bricks.png', price: 20 },
        { id: 'bookshelf', name: '書架', cat: '原木與建材', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/bookshelf.png', price: 30 },
        { id: 'quartz_block', name: '石英磚', cat: '原木與建材', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/quartz_block.png', price: 40 },

        // 地獄 (30-100💎)
        { id: 'netherrack', name: '地獄石', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/netherrack.png', price: 10 },
        { id: 'soul_sand', name: '靈魂沙', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/soul_sand.png', price: 20 },
        { id: 'glowstone', name: '螢光石', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/glowstone.png', price: 50 },
        { id: 'magma_block', name: '岩漿塊', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/magma_block.png', price: 40 },
        { id: 'nether_bricks', name: '地獄磚', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/nether_bricks.png', price: 30 },
        { id: 'crimson_nylium', name: '緋紅菌絲體', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/crimson_nylium.png', price: 40 },
        { id: 'warped_nylium', name: '扭曲菌絲體', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/warped_nylium.png', price: 40 },

        // 末地 (50-200💎)
        { id: 'end_stone', name: '末地石', cat: '末地(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/end_stone.png', price: 50 },
        { id: 'purpur_block', name: '紫珀塊', cat: '末地(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/purpur_block.png', price: 80 },
        { id: 'end_stone_bricks', name: '末地石磚', cat: '末地(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/end_stone_bricks.png', price: 60 },
        { id: 'chorus_flower', name: '紫頌花', cat: '末地(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/chorus_flower.png', price: 100 },

        // 裝飾與植物
        { id: 'crafting_table', name: '工作台', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/crafting_table_front.png', price: 15 },
        { id: 'furnace', name: '熔爐', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/furnace_front.png', price: 20 },
        { id: 'tnt', name: 'TNT', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/tnt_side.png', price: 100 },
        { id: 'oak_leaves', name: '橡木樹葉', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/oak_leaves.png', price: 5 },
        { id: 'cactus', name: '仙人掌', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/cactus_side.png', price: 15 },
        { id: 'pumpkin', name: '南瓜', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/pumpkin_side.png', price: 20 },
        { id: 'melon_side', name: '西瓜', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/melon_side.png', price: 20 }
    ];

    const DIMENSIONS = {
        overworld: { id: 'overworld', name: '主世界', bg: '#87CEEB', cost: 0, requireStr: '' },
        nether: { id: 'nether', name: '地獄', bg: '#2b0000', cost: 1000, requireStr: 'unlockedNether' },
        end: { id: 'end', name: '末地', bg: '#10002b', cost: 2000, requireStr: 'unlockedEnd' }
    };

    // --- 狀態初始化 ---
    const [isBuildMode, setIsBuildMode] = useState(false);
    const [isChestOpen, setIsChestOpen] = useState(false);
    const [currentDimension, setCurrentDimension] = useState('overworld');
    const [localInventory, setLocalInventory] = useState(() => mcData.inventory || { dirt: 50 });
    
    // --- 音效播放函式 ---
    const playChestOpenSound = () => {
        const audio = new Audio('https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/open.mp3');
        audio.volume = 0.5; // 可自由調整音量 (0.0 到 1.0)
        audio.play().catch(e => console.log("音效播放失敗:", e));
    };

    const playChestCloseSound = () => {
        const audio = new Audio('https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/close.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log("音效播放失敗:", e));
    };
    
    const [grids, setGrids] = useState({
        overworld: mcData.sandbox_overworld || mcData.sandboxGrid || Array(TOTAL_CELLS).fill(null),
        nether: mcData.sandbox_nether || Array(TOTAL_CELLS).fill(null),
        end: mcData.sandbox_end || Array(TOTAL_CELLS).fill(null)
    });
    const [specials, setSpecials] = useState({
        overworld: mcData.specials_overworld || {},
        nether: mcData.specials_nether || {},
        end: mcData.specials_end || {}
    });
    
    const [selectedBlock, setSelectedBlock] = useState('erase');
    const [viewingFriend, setViewingFriend] = useState(null); 
    const [friendGrids, setFriendGrids] = useState({});
    const [friendSpecials, setFriendSpecials] = useState({});
    
    const [buyModal, setBuyModal] = useState(null); // { block, amount }
    const [signModal, setSignModal] = useState(null); // { index, isSelf, targetUid }
    const [giftModal, setGiftModal] = useState(null); // { index, targetUid }
    const [giftForm, setGiftForm] = useState({ blockId: '', amount: 1 });
    
    const [visitorLogOpen, setVisitorLogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    
    const isViewingSelf = viewingFriend === null;
    const activeGrid = isViewingSelf ? grids[currentDimension] : (friendGrids[currentDimension] || Array(TOTAL_CELLS).fill(null));
    const activeSpecials = isViewingSelf ? specials[currentDimension] : (friendSpecials[currentDimension] || {});

    // --- 切換參觀好友與紀錄到訪 ---
    const handleViewChange = async (e) => {
        const targetUid = e.target.value;
        if (targetUid === 'self') {
            setViewingFriend(null);
            setIsBuildMode(false);
            setSelectedBlock('erase');
            return;
        }
        
        const friend = (userProfile.friends || []).find(f => f.uid === targetUid);
        if (friend) {
            setViewingFriend(friend);
            setCurrentDimension('overworld');
            setSelectedBlock('poppy'); // 去別人家預設手上拿花
            try {
                const doc = await window.db.collection('users').doc(targetUid).get();
                if (doc.exists) {
                    const data = doc.data().mcData || {};
                    setFriendGrids({
                        overworld: data.sandbox_overworld || data.sandboxGrid || Array(TOTAL_CELLS).fill(null),
                        nether: data.sandbox_nether || Array(TOTAL_CELLS).fill(null),
                        end: data.sandbox_end || Array(TOTAL_CELLS).fill(null)
                    });
                    setFriendSpecials({
                        overworld: data.specials_overworld || {},
                        nether: data.specials_nether || {},
                        end: data.specials_end || {}
                    });

                    // 記錄到訪
                    const newLog = { uid: user.uid, name: userProfile.displayName, time: Date.now() };
                    let currentLog = data.visitorLog || [];
                    if (currentLog.length === 0 || currentLog[0].uid !== user.uid || (Date.now() - currentLog[0].time > 3600000)) {
                        window.db.collection('users').doc(targetUid).update({
                            'mcData.visitorLog': [newLog, ...currentLog].slice(0, 20)
                        }).catch(err => console.log("寫入拜訪紀錄失敗", err));
                    }
                }
            } catch(err) {
                showAlert("無法讀取好友的房子！");
            }
        }
    };

    // --- 輔助：即時刪除資料庫中的 Specials (避免存檔覆蓋) ---
    const removeSpecialFromDB = async (uid, dim, index) => {
        try {
            const doc = await window.db.collection('users').doc(uid).get();
            const dbSpecials = doc.data()?.mcData[`specials_${dim}`] || {};
            delete dbSpecials[index];
            await window.db.collection('users').doc(uid).update({
                [`mcData.specials_${dim}`]: dbSpecials
            });
        } catch(e) { console.error(e); }
    };

    // --- 網格點擊邏輯 (建築、送花、留言、禮物盒) ---
    const handleCellClick = async (index) => {
        const hasSpecial = activeSpecials[index];

        if (isViewingSelf) {
            // [自己家 - 不限模式] 點擊小花：收成鑽石
            if (hasSpecial && hasSpecial.type === 'poppy') {
                const newSpecials = { ...specials };
                delete newSpecials[currentDimension][index];
                setSpecials(newSpecials);
                updateMcData({ diamonds: mcData.diamonds + 3 }, true);
                removeSpecialFromDB(user.uid, currentDimension, index);
                return showAlert(`🌺 你收起了 ${hasSpecial.fromName} 送的小花！\n獲得 3 💎 獎勵！`);
            }

            // [自己家 - 不限模式] 點擊禮物盒：獲得方塊
            if (hasSpecial && hasSpecial.type === 'gift_box') {
                const bInfo = BLOCK_TYPES.find(b => b.id === hasSpecial.blockId);
                const bName = bInfo ? bInfo.name : '未知方塊';
                
                const newSpecials = { ...specials };
                delete newSpecials[currentDimension][index];
                setSpecials(newSpecials);
                
                const newInv = { ...localInventory };
                newInv[hasSpecial.blockId] = (newInv[hasSpecial.blockId] || 0) + hasSpecial.amount;
                setLocalInventory(newInv);

                removeSpecialFromDB(user.uid, currentDimension, index);
                // 順便把庫存更新到雲端
                window.db.collection('users').doc(user.uid).update({ 'mcData.inventory': newInv });
                
                return showAlert(`🎁 你打開了 ${hasSpecial.fromName} 送的禮物！\n獲得 ${hasSpecial.amount} 個 ${bName}！`);
            }

            // [自己家] 點擊告示牌：閱讀或拆除
            if (hasSpecial && hasSpecial.type === 'sign') {
                if (isBuildMode && selectedBlock === 'erase') {
                    // 拆除告示牌
                    const newSpecials = { ...specials };
                    delete newSpecials[currentDimension][index];
                    setSpecials(newSpecials);
                    removeSpecialFromDB(user.uid, currentDimension, index);
                } else {
                    return showAlert(`📜 告示牌留言：\n\n「${hasSpecial.text}」\n- ${hasSpecial.fromName || '屋主'}`);
                }
                return;
            }

            if (!isBuildMode) return; // ✅ 若非建築模式，以下邏輯不執行

            // [自己家 - 建築模式] 放置告示牌
            if (selectedBlock === 'sign') {
                if (activeGrid[index]) return showAlert('❌ 告示牌只能插在空地上！');
                const signCount = Object.values(specials[currentDimension]).filter(s => s.type === 'sign').length;
                if (signCount >= 5) return showAlert('❌ 每個維度最多只能放置 5 個告示牌！');
                if (mcData.diamonds < 10) return showAlert('💎 放置告示牌需要 10 鑽石！');
                return setSignModal({ index, isSelf: true, targetUid: user.uid });
            }

            // [自己家 - 建築模式] 建築與拆除 (包含庫存計算)
            const currentBlock = grids[currentDimension][index];
            if (currentBlock === selectedBlock && selectedBlock !== 'erase') return; 

            const newGrid = [...grids[currentDimension]];
            const newInv = { ...localInventory };
            
            if (selectedBlock !== 'erase' && selectedBlock !== 'sign' && selectedBlock !== 'poppy' && selectedBlock !== 'gift_box') {
                if ((newInv[selectedBlock] || 0) <= 0) return showAlert(`❌ 庫存不足，請先至右側商店購買！`);
                newInv[selectedBlock] -= 1; 
            }

            if (currentBlock && currentBlock !== 'erase') {
                newInv[currentBlock] = (newInv[currentBlock] || 0) + 1; // 退還
            }

            newGrid[index] = selectedBlock === 'erase' ? null : selectedBlock;
            
            // 👇 修改這段：觸發音效邏輯並傳入動作類型
            if (selectedBlock === 'erase') {
                if (currentBlock) playBlockSound(currentBlock, 'break'); // 使用橡皮擦，播放「破壞」音效
            } else {
                playBlockSound(selectedBlock, 'place'); // 建築模式下，播放「放置」音效
            }

            setGrids({ ...grids, [currentDimension]: newGrid });
            setLocalInventory(newInv);
            setHasUnsavedChanges(true); // 標記有變更尚未儲存 (如果你有保留這個功能的話) // 👇 標記有變更尚未儲存

        } else {
            // ==================
            //      [好友家] 
            // ==================
            if (hasSpecial && hasSpecial.type === 'sign') {
                return showAlert(`📜 告示牌留言：\n\n「${hasSpecial.text}」\n- ${hasSpecial.fromName || '屋主'}`);
            }
            
            // [好友家] 送花邏輯
            if (selectedBlock === 'poppy') {
                if (activeGrid[index] || hasSpecial) return showAlert('❌ 小花只能種在空地上喔！');
                let dailyData = mcData.dailyFlowers || { date: '', sentTo: [] };
                if (dailyData.date !== TODAY) dailyData = { date: TODAY, sentTo: [] };

                if (dailyData.sentTo.length >= 5) return showAlert('⚠️ 今日送花次數已達上限 (5/5)！');
                if (dailyData.sentTo.includes(viewingFriend.uid)) return showAlert('⚠️ 你今天已經送過花給這位好友了！');

                try {
                    // 即時更新對方資料庫
                    const doc = await window.db.collection('users').doc(viewingFriend.uid).get();
                    const dbSpecials = doc.data().mcData[`specials_${currentDimension}`] || {};
                    dbSpecials[index] = { type: 'poppy', fromUid: user.uid, fromName: userProfile.displayName };
                    
                    await window.db.collection('users').doc(viewingFriend.uid).update({
                        [`mcData.specials_${currentDimension}`]: dbSpecials
                    });
                    
                    // 更新自己畫面上的 FriendSpecials 以即時顯示
                    setFriendSpecials(prev => ({
                        ...prev, [currentDimension]: { ...prev[currentDimension], [index]: dbSpecials[index] }
                    }));

                    // 扣除次數與發送獎勵給自己
                    dailyData.sentTo.push(viewingFriend.uid);
                    updateMcData({ dailyFlowers: dailyData, diamonds: mcData.diamonds + 1 }, true);
                    showAlert('🌺 送花成功！對方收到後可獲得 3 💎，你也獲得了 1 💎 的熱心獎勵！');
                } catch(e) {
                    showAlert('送花失敗：' + e.message);
                }
            }

            // [好友家] 放禮物盒
            if (selectedBlock === 'gift_box') {
                if (activeGrid[index] || hasSpecial) return showAlert('❌ 禮物盒只能放在空地上！');
                return setGiftModal({ index, targetUid: viewingFriend.uid });
            }

            // [好友家] 留告示牌
            if (selectedBlock === 'sign') {
                if (activeGrid[index] || hasSpecial) return showAlert('❌ 告示牌只能插在空地上！');
                if (mcData.diamonds < 10) return showAlert('💎 放置告示牌需要 10 鑽石！');
                const signCount = Object.values(friendSpecials[currentDimension]).filter(s => s.type === 'sign').length;
                if (signCount >= 5) return showAlert('❌ 對方此維度的告示牌已滿！');
                return setSignModal({ index, isSelf: false, targetUid: viewingFriend.uid });
            }
        }
    };

    // --- 放置告示牌 ---
    const submitSign = async () => {
        const text = document.getElementById('signInput').value.trim();
        if (!text) return setSignModal(null);
        if (text.length > 30) return showAlert('❌ 留言太長了，最多 30 個字！');
        
        const { index, isSelf, targetUid } = signModal;
        updateMcData({ diamonds: mcData.diamonds - 10 }, true);
        const signData = { type: 'sign', text, fromUid: user.uid, fromName: userProfile.displayName };

        try {
            const doc = await window.db.collection('users').doc(targetUid).get();
            const dbSpecials = doc.data()?.mcData[`specials_${currentDimension}`] || {};
            dbSpecials[index] = signData;
            
            await window.db.collection('users').doc(targetUid).update({
                [`mcData.specials_${currentDimension}`]: dbSpecials
            });

            if (isSelf) {
                setSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: signData } }));
            } else {
                setFriendSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: signData } }));
                showAlert('✅ 成功在好友家留下告示牌！');
            }
        } catch(e) {
            showAlert('放置失敗：' + e.message);
        }
        setSignModal(null);
    };

    // --- 放置禮物盒 ---
    const submitGift = async () => {
        if (!giftForm.blockId || giftForm.amount <= 0) return;
        const { index, targetUid } = giftModal;
        
        const newInv = { ...localInventory };
        newInv[giftForm.blockId] -= giftForm.amount;
        setLocalInventory(newInv);

        const giftData = { 
            type: 'gift_box', 
            blockId: giftForm.blockId, 
            amount: giftForm.amount, 
            fromUid: user.uid, 
            fromName: userProfile.displayName 
        };

        try {
            const doc = await window.db.collection('users').doc(targetUid).get();
            const dbSpecials = doc.data()?.mcData[`specials_${currentDimension}`] || {};
            dbSpecials[index] = giftData;
            
            await window.db.collection('users').doc(targetUid).update({
                [`mcData.specials_${currentDimension}`]: dbSpecials
            });

            setFriendSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: giftData } }));
            updateMcData({ inventory: newInv }, true);
            showAlert(`✅ 成功送出禮物盒！`);
        } catch(e) {
            showAlert('送禮失敗：' + e.message);
            newInv[giftForm.blockId] += giftForm.amount; // 失敗退還
            setLocalInventory(newInv);
        }

        setGiftModal(null);
        setGiftForm({ blockId: '', amount: 1 });
    };

    // --- 解鎖維度 ---
    const handleUnlockDimension = (dimKey) => {
        const dim = DIMENSIONS[dimKey];
        if (mcData.diamonds < dim.cost) return showAlert(`💎 鑽石不足！解鎖需要 ${dim.cost} 💎`);
        updateMcData({
            diamonds: mcData.diamonds - dim.cost,
            [dim.requireStr]: true
        }, true);
        showAlert(`🎉 恭喜！成功解鎖【${dim.name}】維度！`);
    };

    // --- 儲存自己的房子與庫存 ---
    const handleSave = () => {
        setIsSaving(true);
        // 互動資料(小花、禮物、告示牌)已即時儲存，這裡僅覆蓋建築網格與庫存，徹底避免覆蓋掉剛剛別人送的禮物！
        window.db.collection('users').doc(user.uid).update({
            // ... 省略 ...
        }).then(() => {
            showAlert("✅ 建築與庫存進度皆已儲存！");
            updateMcData({ 
                sandbox_overworld: grids.overworld, sandbox_nether: grids.nether, sandbox_end: grids.end,
                inventory: localInventory 
            }, true); 
            setHasUnsavedChanges(false); // 👇 儲存成功後重置狀態
        }).catch(e => showAlert('儲存失敗：' + e.message))
          .finally(() => setIsSaving(false));
    };
    // --- 退出檢查邏輯 ---
    const handleQuit = () => {
        if (hasUnsavedChanges) {
            // 打開自訂的警告視窗
            setShowQuitConfirm(true); 
        } else {
            // 沒變動過，直接退出
            onQuit();
        }
    };

    // --- 購買方塊邏輯 ---
    const handleConfirmBuy = () => {
        const amt = parseInt(buyModal.amount);
        if (isNaN(amt) || amt <= 0) return showAlert("數量無效！");
        
        const totalCost = buyModal.block.price * amt;
        if (mcData.diamonds < totalCost) return showAlert("💎 鑽石不足！");

        const newInv = { ...localInventory, [buyModal.block.id]: (localInventory[buyModal.block.id] || 0) + amt };
        setLocalInventory(newInv);
        updateMcData({ diamonds: mcData.diamonds - totalCost, inventory: newInv }, true);
        
        showAlert(`✅ 成功購買 ${amt} 個 ${buyModal.block.name}！\n已放入左側庫存箱子中。`);
        setBuyModal(null);
    };

    // --- UI 過濾 (商店不再顯示工具) ---
    const displayedBlocks = BLOCK_TYPES.filter(b => {
        if (b.special || b.id === 'erase') return false; // 從商店清單隱藏工具
        if (activeCategory === '全部') return true;
        if (activeCategory === '地獄(需解鎖)') return b.cat === '地獄(需解鎖)' && mcData.unlockedNether;
        if (activeCategory === '末地(需解鎖)') return b.cat === '末地(需解鎖)' && mcData.unlockedEnd;
        return b.cat === activeCategory;
    });

// --- 方塊音效播放函式 ---
    // --- 方塊音效播放函式 (區分放置與破壞) ---
    // action 傳入 'place' 或 'break'
    const playBlockSound = (blockId, action) => {
        if (!blockId || blockId === 'erase') return;

        let soundType = 'stone'; // 預設使用石頭音效

        // 根據方塊 ID 進行分類
        if (['glass', 'glowstone'].includes(blockId)) {
            soundType = 'glass';
        } else if (['dirt'].includes(blockId)) {
            soundType = 'dirt';
        } else if (['grass_block_side', 'oak_leaves', 'cactus', 'pumpkin', 'melon_side', 'crimson_nylium', 'warped_nylium', 'chorus_flower'].includes(blockId)) {
            soundType = 'grass';
        } else if (['sand', 'gravel', 'soul_sand', 'tnt'].includes(blockId)) {
            soundType = 'sand';
        } else if (blockId.includes('log') || blockId.includes('planks') || ['bookshelf', 'crafting_table', 'sign'].includes(blockId)) {
            soundType = 'wood';
        }

        // 定義【放置】與【破壞】的音效網址 (請替換為你實際的 GitHub Raw 網址)
        const soundUrls = {
            place: {
                glass: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/glass_place.mp3',
                stone: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/stone_place_destroy.mp3',
                wood: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/wood_place.mp3',
                dirt: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/dirt_place.mp3',
                grass: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/grass_place.mp3',
                sand: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/sand_place.mp3'
            },
            break: {
                glass: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/glass_destroy.mp3',
                stone: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/stone_place_destroy.mp3',
                wood: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/wood_destroy.mp3',
                dirt: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/dirt_destroy.mp3',
                grass: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/grass_destroy.mp3',
                sand: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/sand_destroy.mp3'
            }
        };

        // 根據傳入的 action 和分類取得對應網址
        const audio = new Audio(soundUrls[action][soundType]);
        audio.volume = 0.5; // 音量可自行調整 (0.0 ~ 1.0)
        audio.play().catch(e => console.log("音效播放失敗:", e));
    };


    return (
        <div className="fixed inset-0 z-[80] bg-black bg-opacity-90 flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in">
            <div className="p-2 border-4 border-gray-600 no-round w-full max-w-7xl relative shadow-2xl flex flex-col md:flex-row h-[90dvh]" style={{ backgroundColor: DIMENSIONS[currentDimension].bg }}>
                
                {/* 關閉與訪客紀錄按鈕 */}
                <button onClick={handleQuit} className="absolute -top-4 -right-4 bg-red-600 text-white w-10 h-10 border-2 border-white font-black hover:bg-red-500 z-50 transition-colors shadow-lg">✖</button>
                {isViewingSelf && (
                    <button onClick={() => setVisitorLogOpen(true)} className="absolute -top-4 right-8 bg-blue-600 text-white px-4 h-10 border-2 border-white font-black hover:bg-blue-500 z-50 transition-colors shadow-lg">
                        👣 到訪紀錄
                    </button>
                )}

                {/* 左側：庫存箱子按鈕 */}
                {isViewingSelf && (
                    <button onClick={() => { playChestOpenSound(); setIsChestOpen(true); }} className="absolute left-0 top-1/2 transform -translate-y-1/2 -ml-2 md:ml-0 bg-[#8b5a2b] border-4 border-[#3e2723] p-2 rounded-r-lg shadow-2xl z-50 hover:scale-105 transition-transform flex flex-col items-center">
                        <McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/chest_front.png" className="w-10 h-10 pixelated drop-shadow-lg" />
                        <span className="block text-white text-[10px] font-bold mt-1 bg-black bg-opacity-70 px-1 rounded">庫存箱子</span>
                    </button>
                )}

                {/* 👇 新增：未儲存退出警告視窗 */}
            {showQuitConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]">
                    <div className="bg-gray-800 border-4 border-red-600 p-6 rounded-lg shadow-2xl max-w-sm text-center transform scale-100 animate-pulse-once">
                        <div className="text-red-500 text-5xl mb-4">⚠️</div>
                        <h2 className="text-white font-black text-xl mb-2">尚未儲存！</h2>
                        <p className="text-gray-300 text-sm mb-6">
                            你有未儲存的建築或庫存進度。<br />
                            現在退出將會<span className="text-red-400 font-bold">永久遺失</span>剛剛的變更！
                        </p>
                        
                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={() => setShowQuitConfirm(false)} 
                                className="px-4 py-2 bg-gray-600 text-white font-bold rounded hover:bg-gray-500 transition-colors"
                            >
                                取消 (留下儲存)
                            </button>
                            <button 
                                onClick={onQuit} 
                                className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-500 transition-colors shadow-lg shadow-red-500/30"
                            >
                                忍痛退出
                            </button>
                        </div>
                    </div>
                </div>
            )}

                {/* 底部：當前手持指示器 */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 border-4 border-gray-600 p-2 rounded shadow-2xl flex items-center space-x-3 z-40 pointer-events-none">
                    <span className="text-white text-xs font-bold">目前拿著:</span>
                    {selectedBlock === 'erase' ? <span className="text-xl">🧹</span> : (BLOCK_TYPES.find(b=>b.id===selectedBlock)?.img && <McImg src={BLOCK_TYPES.find(b=>b.id===selectedBlock).img} className="w-8 h-8 pixelated" />)}
                    <span className="text-yellow-400 text-xs font-bold">{BLOCK_TYPES.find(b=>b.id===selectedBlock)?.name || '橡皮擦'}</span>
                </div>

                {/* 主畫布區 */}
                <div className="flex-grow flex flex-col items-center justify-center p-2 relative w-full md:w-3/4">
                    
                    {/* 頂部控制列 */}
                    <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-2 bg-black bg-opacity-60 p-2 text-white font-bold gap-2">
                        <div className="flex items-center space-x-2">
                            <span>{isViewingSelf ? `🏠 我的基地` : `👀 ${viewingFriend.name} 的家`}</span>
                            
                            <select onChange={(e) => setCurrentDimension(e.target.value)} value={currentDimension} className="bg-gray-800 text-white border border-gray-500 px-2 py-1 outline-none text-sm font-bold">
                                <option value="overworld">🌍 主世界</option>
                                {(isViewingSelf ? mcData.unlockedNether : (viewingFriend?.mcData?.unlockedNether)) && <option value="nether">🔥 地獄</option>}
                                {(isViewingSelf ? mcData.unlockedEnd : (viewingFriend?.mcData?.unlockedEnd)) && <option value="end">🌌 末地</option>}
                            </select>

                            {/* 建築/查看模式切換 */}
                            {isViewingSelf && (
                                <div className="ml-2 flex bg-gray-800 border border-gray-600 rounded overflow-hidden">
                                    <button onClick={() => setIsBuildMode(false)} className={`px-2 py-1 text-xs ${!isBuildMode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>👀 查看/互動</button>
                                    <button onClick={() => setIsBuildMode(true)} className={`px-2 py-1 text-xs ${isBuildMode ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>🔨 建築模式</button>
                                </div>
                            )}
                        </div>

                        <select onChange={handleViewChange} className="bg-blue-900 text-white border border-blue-500 px-2 py-1 outline-none text-sm font-bold w-full sm:w-auto">
                            <option value="self">🏠 回到我的家</option>
                            {(userProfile.friends || []).map(f => <option key={f.uid} value={f.uid}>👀 去 {f.name} 家</option>)}
                        </select>
                    </div>

                    {/* 2D 網格容器 */}
                    <div className="w-full flex-grow flex items-center justify-center overflow-hidden bg-black bg-opacity-30 p-1 border-2 border-black shadow-inner">
                        <div 
                            className="grid w-full max-h-full" 
                            style={{ 
                                backgroundColor: DIMENSIONS[currentDimension].bg,
                                gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                                maxWidth: `calc((100vh - 180px) * (${COLS}/${ROWS}))` 
                            }}
                        >
                            {activeGrid.map((cellId, i) => {
                                const blockInfo = BLOCK_TYPES.find(b => b.id === cellId);
                                const specialInfo = activeSpecials[i];
                                const isSpecialSign = specialInfo?.type === 'sign';
                                const isSpecialPoppy = specialInfo?.type === 'poppy';
                                const isSpecialGift = specialInfo?.type === 'gift_box';

                                return (
                                    <div 
                                        key={i} 
                                        onPointerDown={(e) => { e.preventDefault(); handleCellClick(i); }}
                                        onPointerEnter={(e) => { if (e.buttons === 1) handleCellClick(i); }} 
                                        className={`w-full aspect-square border-[0.5px] border-black border-opacity-20 relative cursor-crosshair ${!cellId && !specialInfo ? 'hover:bg-white hover:bg-opacity-30' : ''}`}
                                        style={{ touchAction: 'none' }}
                                    >
                                        {blockInfo && blockInfo.img && <McImg src={blockInfo.img} className="w-full h-full object-cover pixelated" />}
                                        
                                        {/* 渲染告示牌 */}
                                        {isSpecialSign && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/oak_sign.png" className="w-3/4 h-3/4 pixelated drop-shadow-md animate-pulse" />
                                            </div>
                                        )}
                                        
                                        {/* 渲染小花 */}
                                        {isSpecialPoppy && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                                                <McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/poppy.png" className="w-3/4 h-3/4 pixelated drop-shadow-md animate-bounce" />
                                            </div>
                                        )}

                                        {/* 渲染禮物盒 */}
                                        {isSpecialGift && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/chest.png" className="w-3/4 h-3/4 pixelated drop-shadow-md animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {isViewingSelf && (
                        <button onClick={handleSave} disabled={isSaving || !isBuildMode} className={`mt-3 font-black px-8 py-2 border-2 shadow-lg w-full sm:w-auto shrink-0 ${isBuildMode ? 'bg-green-600 hover:bg-green-500 text-white border-black' : 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed'}`}>
                            {isSaving ? '儲存中...' : (isBuildMode ? '💾 儲存所有進度' : '切換至建築模式以進行儲存')}
                        </button>
                    )}
                </div>

                {/* 右側：方塊商店與工具列 */}
                <div className="w-full md:w-1/4 bg-[#333] p-3 flex flex-col border-t-4 md:border-t-0 md:border-l-4 border-gray-700">
                    <h3 className="text-yellow-400 font-bold border-b-2 border-gray-600 pb-2 mb-2 shrink-0 flex justify-between items-center">
                        <span>💰 方塊商店</span>
                        <span className="text-sm bg-black bg-opacity-50 px-2 py-1 rounded border border-gray-600 truncate">💎 {mcData.diamonds}</span>
                    </h3>

                    {/* 分類按鈕與參觀工具 */}
                    {isViewingSelf ? (
                        <div className="flex flex-wrap gap-1 mb-2 shrink-0 border-b border-gray-600 pb-2">
                            {CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => setActiveCategory(cat)} className={`text-[10px] px-2 py-1 font-bold ${activeCategory === cat ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-white hover:bg-gray-500'}`}>
                                    {cat.replace('(需解鎖)', '')}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-blue-900 bg-opacity-50 border border-blue-500 p-2 mb-2 shrink-0 flex flex-col gap-1">
                            <p className="text-xs text-blue-200 font-bold mb-1">參觀模式工具：</p>
                            <button onClick={() => setSelectedBlock('poppy')} className={`w-full py-1 text-xs font-bold border ${selectedBlock === 'poppy' ? 'bg-pink-500 border-pink-700 text-white' : 'bg-gray-700 text-gray-300 border-gray-500 hover:bg-gray-600'}`}>
                                🌺 送小花
                            </button>
                            <button onClick={() => setSelectedBlock('gift_box')} className={`w-full py-1 text-xs font-bold border ${selectedBlock === 'gift_box' ? 'bg-purple-500 border-purple-700 text-white' : 'bg-gray-700 text-gray-300 border-gray-500 hover:bg-gray-600'}`}>
                                🎁 放禮物盒
                            </button>
                            <button onClick={() => setSelectedBlock('sign')} className={`w-full py-1 text-xs font-bold border ${selectedBlock === 'sign' ? 'bg-yellow-600 border-yellow-800 text-white' : 'bg-gray-700 text-gray-300 border-gray-500 hover:bg-gray-600'}`}>
                                📜 留告示牌
                            </button>
                        </div>
                    )}

                    {/* 未解鎖提示 */}
                    {isViewingSelf && activeCategory === '地獄(需解鎖)' && !mcData.unlockedNether && (
                        <div className="flex flex-col items-center justify-center p-4 bg-red-900 bg-opacity-50 border border-red-500 mt-2">
                            <p className="text-xs text-red-200 mb-2 font-bold text-center">解鎖地獄維度與專屬方塊</p>
                            <button onClick={() => handleUnlockDimension('nether')} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 border border-red-800">花費 1000 💎 解鎖</button>
                        </div>
                    )}
                    {isViewingSelf && activeCategory === '末地(需解鎖)' && !mcData.unlockedEnd && (
                        <div className="flex flex-col items-center justify-center p-4 bg-purple-900 bg-opacity-50 border border-purple-500 mt-2">
                            <p className="text-xs text-purple-200 mb-2 font-bold text-center">解鎖末地維度與專屬方塊</p>
                            <button onClick={() => handleUnlockDimension('end')} className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 border border-purple-800">花費 2000 💎 解鎖</button>
                        </div>
                    )}

                    {/* 方塊與工具列表 */}
                    {isViewingSelf && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-1 overflow-y-auto custom-scrollbar pr-1 flex-grow content-start pb-10">
                            
                            {/* 工具列獨立顯示 */}
                            {(activeCategory === '全部' || activeCategory === '裝飾與植物') && BLOCK_TYPES.filter(b => b.special && isViewingSelf && b.id !== 'poppy' && b.id !== 'gift_box').map(block => {
                                const isSelected = selectedBlock === block.id;
                                return (
                                    <div key={block.id} className={`flex flex-col items-center p-1 border transition-all ${isSelected ? 'border-yellow-400 bg-yellow-400 bg-opacity-20 scale-105 z-10' : 'border-gray-600 bg-gray-800'}`}>
                                        {block.img ? <McImg src={block.img} className="w-6 h-6 pixelated mb-1 drop-shadow-md" fallback="🔧"/> : <span className="w-6 h-6 flex items-center justify-center text-lg mb-1">🧹</span>}
                                        <span className="text-[9px] text-white font-bold mb-1 text-center w-full truncate">{block.name}</span>
                                        <button onClick={() => setSelectedBlock(block.id)} className={`text-[9px] w-full py-1 font-bold border ${isSelected ? 'bg-yellow-500 text-black border-yellow-600' : 'bg-gray-600 text-white border-gray-500 hover:bg-gray-500'}`}>
                                            {isSelected ? '使用中' : '選擇工具'}
                                        </button>
                                    </div>
                                );
                            })}

                            {/* 商店購買列表 (隱藏庫存顯示，專注於購買) */}
                            {displayedBlocks.map(block => {
                                return (
                                    <div key={block.id} className="flex flex-col items-center p-1 border border-gray-600 bg-gray-800 transition-all hover:bg-gray-700">
                                        <McImg src={block.img} className="w-6 h-6 pixelated mb-1 drop-shadow-md" fallback="📦"/>
                                        <span className="text-[9px] text-white font-bold mb-1 text-center w-full truncate" title={block.name}>{block.name}</span>
                                        <span className="text-[8px] text-yellow-300 font-bold mb-1 bg-black bg-opacity-40 px-1 rounded-full w-full text-center">{block.price} 💎</span>
                                        
                                        <button onClick={() => setBuyModal({ block, amount: 1 })} className="mt-auto text-[9px] w-full py-1 font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-inner border border-blue-400">
                                            購買
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* --- 我的大箱子庫存 (Modal) --- */}
            {isChestOpen && (
                <div className="absolute inset-0 z-[100] bg-black bg-opacity-70 flex items-center justify-center p-4">
                    <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] p-3 w-full max-w-2xl shadow-2xl relative">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <h3 className="text-[#373737] font-bold text-lg">🧰 我的大箱子庫存 <span className="text-xs text-blue-700 ml-2">(點擊方塊拿在手上)</span></h3>
                            <button onClick={() => { playChestCloseSound(); setIsChestOpen(false); }} className="text-red-600 font-black text-xl hover:scale-110">✖</button>
                        </div>
                        <div className="bg-[#8b8b8b] p-2 grid grid-cols-6 sm:grid-cols-9 gap-1 border-2 border-[#373737] shadow-inner min-h-[40vh] max-h-[60vh] overflow-y-auto content-start">
                            {Object.entries(localInventory).filter(([id, count]) => count > 0).map(([id, count]) => {
                                const bInfo = BLOCK_TYPES.find(b => b.id === id);
                                if (!bInfo) return null;
                                return (
                                    <div 
                                        key={id} 
                                        onClick={() => { setSelectedBlock(id); playChestCloseSound(); setIsChestOpen(false); if(!isBuildMode) setIsBuildMode(true); }}
                                        className="bg-[#8b8b8b] border-2 border-[#ffffff] border-r-[#373737] border-b-[#373737] aspect-square flex flex-col items-center justify-center relative group hover:bg-[#a0a0a0] cursor-pointer"
                                    >
                                        <McImg src={bInfo.img} className="w-8 h-8 pixelated drop-shadow-md" />
                                        <span className="absolute bottom-0 right-1 text-white text-[10px] font-black drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{count}</span>
                                        {/* Tooltip */}
                                        <div className="hidden group-hover:block absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 border border-gray-400">
                                            {bInfo.name}
                                        </div>
                                    </div>
                                );
                            })}
                            {Object.values(localInventory).every(count => count <= 0) && (
                                <p className="col-span-full text-[#373737] font-bold text-center mt-10">你的庫存空空如也，去右側商店買點建材吧！</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- 購買彈窗 (網頁內 Modal) --- */}
            {buyModal && (
                <div className="absolute inset-0 z-[100] bg-black bg-opacity-70 flex flex-col items-center justify-center p-4">
                    <div className="bg-[#333] border-4 border-gray-600 p-6 w-full max-w-xs shadow-2xl flex flex-col items-center relative">
                        <h3 className="text-white font-bold mb-4 text-lg">購買 【{buyModal.block.name}】</h3>
                        <McImg src={buyModal.block.img} className="w-16 h-16 pixelated mb-4 drop-shadow-lg" />
                        
                        <div className="flex items-center space-x-4 mb-4">
                            <button onClick={() => setBuyModal({...buyModal, amount: Math.max(1, buyModal.amount - 1)})} className="bg-gray-700 text-white w-8 h-8 font-black border-2 border-gray-500 hover:bg-gray-600">-</button>
                            <input 
                                type="number" 
                                value={buyModal.amount} 
                                onChange={(e) => setBuyModal({...buyModal, amount: Math.max(1, parseInt(e.target.value) || 1)})}
                                className="w-16 text-center font-bold p-1 border-2 border-gray-500 bg-gray-900 text-white outline-none"
                            />
                            <button onClick={() => setBuyModal({...buyModal, amount: buyModal.amount + 1})} className="bg-gray-700 text-white w-8 h-8 font-black border-2 border-gray-500 hover:bg-gray-600">+</button>
                        </div>
                        
                        <p className="text-yellow-400 font-bold mb-6">總價：{buyModal.block.price * buyModal.amount} 💎</p>
                        
                        <div className="flex space-x-2 w-full">
                            <button onClick={() => setBuyModal(null)} className="flex-1 bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 border-2 border-black">取消</button>
                            <button onClick={handleConfirmBuy} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 border-2 border-black">確認購買</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 準備禮物盒彈窗 --- */}
            {giftModal && (
                <div className="absolute inset-0 z-[100] bg-black bg-opacity-70 flex flex-col items-center justify-center p-4">
                    <div className="bg-[#d4a373] border-8 border-[#8b5a2b] p-6 w-full max-w-sm shadow-2xl flex flex-col items-center pixelated-border">
                        <h3 className="text-[#3e2723] font-black mb-2 text-lg">🎁 準備一份禮物</h3>
                        <p className="text-[#3e2723] text-xs font-bold mb-4">請從你的庫存選擇要送給好友的方塊</p>
                        
                        <div className="w-full bg-[#faedcd] p-2 border-2 border-[#8b5a2b] mb-4 h-48 overflow-y-auto custom-scrollbar grid grid-cols-4 sm:grid-cols-5 gap-2 content-start shadow-inner">
                            {Object.entries(localInventory).filter(([id, count]) => count > 0 && id !== 'gift_box').map(([id, count]) => {
                                const bInfo = BLOCK_TYPES.find(b => b.id === id);
                                if (!bInfo) return null;
                                const isSel = giftForm.blockId === id;
                                return (
                                    <div 
                                        key={id} 
                                        onClick={() => setGiftForm({ blockId: id, amount: 1 })} 
                                        className={`flex flex-col items-center cursor-pointer p-1 border-2 transition-all ${isSel ? 'border-blue-500 bg-blue-200 scale-105' : 'border-transparent hover:bg-[#e0d3b6]'}`}
                                    >
                                        <McImg src={bInfo.img} className="w-8 h-8 pixelated" />
                                        <span className="text-[10px] text-center font-bold text-black mt-1">{count}</span>
                                    </div>
                                );
                            })}
                            {Object.values(localInventory).every(count => count <= 0) && (
                                <p className="col-span-full text-center text-red-600 font-bold text-xs mt-4">你沒有任何可以送的方塊喔！</p>
                            )}
                        </div>

                        {giftForm.blockId ? (
                            <div className="flex items-center space-x-2 mb-4 bg-white p-2 border-2 border-[#8b5a2b]">
                                <span className="text-black font-bold text-sm">打包數量:</span>
                                <input 
                                    type="number" 
                                    value={giftForm.amount} 
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 1;
                                        const max = localInventory[giftForm.blockId] || 1;
                                        setGiftForm({ ...giftForm, amount: Math.min(Math.max(1, val), max) });
                                    }} 
                                    className="w-16 p-1 border-2 border-gray-400 bg-gray-100 text-center font-bold outline-none" 
                                />
                                <span className="text-gray-600 text-xs font-bold">/ {localInventory[giftForm.blockId]}</span>
                            </div>
                        ) : (
                            <p className="text-red-600 font-bold mb-4 text-sm bg-red-100 px-4 py-1 rounded">請點擊上方選擇方塊</p>
                        )}
                        
                        <div className="flex space-x-2 w-full">
                            <button onClick={() => { setGiftModal(null); setGiftForm({ blockId: '', amount: 1}); }} className="flex-1 bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 border-2 border-black shadow-md">取消</button>
                            <button onClick={submitGift} disabled={!giftForm.blockId} className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold py-2 border-2 border-black shadow-md disabled:opacity-50 disabled:cursor-not-allowed">打包送出</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 告示牌留言彈窗 --- */}
            {signModal !== null && (
                <div className="absolute inset-0 z-[100] bg-black bg-opacity-70 flex flex-col items-center justify-center p-4">
                    <div className="bg-[#d4a373] border-8 border-[#8b5a2b] p-6 w-full max-w-sm shadow-2xl flex flex-col items-center pixelated-border">
                        <h3 className="text-[#3e2723] font-black mb-4 text-lg">✏️ 留下告示牌訊息</h3>
                        <textarea 
                            id="signInput"
                            placeholder="請輸入留言 (最多30字)..." 
                            maxLength="30"
                            className="w-full h-24 p-2 bg-[#faedcd] border-2 border-[#8b5a2b] text-[#3e2723] font-bold outline-none resize-none mb-4 custom-scrollbar"
                        ></textarea>
                        <p className="text-[#3e2723] font-bold text-xs mb-4">放置消耗：10 💎</p>
                        <div className="flex space-x-2 w-full">
                            <button onClick={() => setSignModal(null)} className="flex-1 bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 border-2 border-black">取消</button>
                            <button onClick={submitSign} className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold py-2 border-2 border-black">插上告示牌</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 訪客紀錄彈窗 --- */}
            {visitorLogOpen && (
                <div className="absolute inset-0 z-[100] bg-black bg-opacity-70 flex flex-col items-center justify-center p-4">
                    <div className="bg-[#333] border-4 border-gray-600 p-4 w-full max-w-sm shadow-2xl flex flex-col h-[60dvh]">
                        <div className="flex justify-between items-center mb-4 border-b-2 border-gray-600 pb-2">
                            <h3 className="text-white font-bold text-lg">👣 基地到訪紀錄</h3>
                            <button onClick={() => setVisitorLogOpen(false)} className="text-red-400 hover:text-red-300 font-bold">✖ 關閉</button>
                        </div>
                        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2">
                            {(!mcData.visitorLog || mcData.visitorLog.length === 0) ? (
                                <p className="text-gray-400 text-center text-sm mt-10">尚無訪客紀錄，多邀請好友來參觀吧！</p>
                            ) : (
                                mcData.visitorLog.map((log, i) => (
                                    <div key={i} className="bg-gray-800 p-2 border-l-4 border-blue-500 flex justify-between items-center">
                                        <span className="text-blue-300 font-bold text-sm">{log.name}</span>
                                        <span className="text-gray-500 text-xs">{new Date(log.time).toLocaleString('zh-TW', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
