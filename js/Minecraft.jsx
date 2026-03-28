const { useState, useEffect, useRef } = React;

const McImg = ({ src, fallback, className, ...props }) => {
    const [error, setError] = useState(false);
    if (error) return <span className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{fallback}</span>;
    return <img src={src} className={className} onError={() => setError(true)} alt={fallback || "img"} {...props} />;
};

// --- 礦車跑酷小遊戲組件 ---
function MinecartGame({ onGameOver, onQuit }) {
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('start'); 
    const [score, setScore] = useState(0);
    
    const bgmRef = useRef(null);
    const deadSfxRef = useRef(null);
    
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
                obs.x -= state.speed;
                // 若苦力怕未解除，碰到玩家就死
                if (!obs.defused && obs.x < state.player.x + 10) dead = true;
            } else {
                obs.x -= state.speed; 
            }

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
                } else dead = true; 
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
            endGame();
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

    const endGame = () => {
        setGameState('gameover');
        if (bgmRef.current) bgmRef.current.pause();
        if (deadSfxRef.current) {
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
                    state.score += 5; 
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
                                    <button onClick={() => setShowMiningGame(true)} className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-2 py-1 border-2 border-yellow-800 font-bold transition-colors">
                                        ⛏️ 挖礦
                                    </button>
                                    <button onClick={() => {
                                        if (mcData.hunger < 1) {
                                            return showAlert("🍖 史蒂夫太餓了！請先去商店買點東西吃，再來玩礦車吧！");
                                        }
                                        updateMcData({ hunger: mcData.hunger - 1 }, true);
                                        setShowMiniGame(true);
                                    }} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 border-2 border-blue-800 font-bold transition-colors">
                                        🛻 礦車(耗1🍖)
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