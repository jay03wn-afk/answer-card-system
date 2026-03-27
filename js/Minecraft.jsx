function SkateboardGame({ onGameOver, onQuit }) {
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('start'); 
    const [score, setScore] = useState(0);
    const bgmRef = useRef(null);
    const LOG_W = 800; const LOG_H = 350;
    
    const gameRef = useRef({
        reqId: null, player: { x: 50, y: 0, w: 40, h: 40, dy: 0, jumps: 0 }, obstacles: [], diamonds: [], speed: 6, score: 0, frames: 0, lastSpawnFrame: 0, groundY: 250, lastFrameTime: 0
    });

    const images = useRef({ steve: new Image(), stone: new Image(), diamond: new Image(), zombie: new Image(), husk: new Image() });

    useEffect(() => {
        images.current.steve.src = "https://minotar.net/helm/Steve/64.png";
        images.current.stone.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/stone.png";
        images.current.diamond.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/diamond.png";
        images.current.zombie.src = "https://minotar.net/helm/Zombie/64.png";
        images.current.husk.src = "https://minotar.net/helm/Husk/64.png";
        bgmRef.current = new Audio("https://raw.githubusercontent.com/libgdx/libgdx-demo-superjumper/master/android/assets/data/music.mp3");
        bgmRef.current.loop = true; bgmRef.current.volume = 0.4;
        
        const cvs = canvasRef.current;
        if (cvs) {
            const ctx = cvs.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            cvs.width = LOG_W * dpr; cvs.height = LOG_H * dpr; ctx.scale(dpr, dpr);
        }
        return () => { if (gameRef.current.reqId) cancelAnimationFrame(gameRef.current.reqId); if (bgmRef.current) bgmRef.current.pause(); };
    }, []);

    const startGame = () => {
        setGameState('playing'); setScore(0);
        if (bgmRef.current) bgmRef.current.play().catch(e => console.log(e));
        gameRef.current = { ...gameRef.current, player: { x: 50, y: 150, w: 40, h: 40, dy: 0, jumps: 0 }, obstacles: [], diamonds: [], speed: 6.5, score: 0, frames: 0, lastSpawnFrame: 0, lastFrameTime: performance.now() };
        gameRef.current.reqId = requestAnimationFrame(loop);
    };

    const jump = () => {
        const p = gameRef.current.player;
        if (p.jumps < 2) { p.dy = -11.5; p.jumps++; }
    };

    const loop = (currentTime) => {
        const cvs = canvasRef.current; if (!cvs) return;
        const state = gameRef.current;
        if (!currentTime) currentTime = performance.now();
        const fpsInterval = 1000 / 60; const elapsed = currentTime - state.lastFrameTime;
        if (elapsed < fpsInterval) { state.reqId = requestAnimationFrame(loop); return; }
        state.lastFrameTime = currentTime - (elapsed % fpsInterval);

        const ctx = cvs.getContext('2d');
        let prevBottom = state.player.y + state.player.h; 
        state.player.dy += 0.7; state.player.y += state.player.dy;

        let dead = false;
        state.obstacles = state.obstacles.filter(o => o.x + o.w > -50);
        state.diamonds = state.diamonds.filter(d => d.x + d.w > -50 && !d.collected);

        if (state.player.y + state.player.h >= state.groundY) {
            state.player.y = state.groundY - state.player.h; state.player.dy = 0; state.player.jumps = 0;
        }

        for (let i = 0; i < state.obstacles.length; i++) {
            let obs = state.obstacles[i];
            obs.x -= state.speed;

            // HUSK AI: 靠近玩家時主動躍起
            if (obs.type === 'husk') {
                let dist = obs.x - (state.player.x + state.player.w);
                if (dist > 10 && dist < 150 && state.player.y >= state.groundY - 10 && obs.y >= state.groundY - obs.h - 5) {
                    obs.dy = -13.5; 
                }
                obs.dy += 0.7; obs.y += obs.dy;
                if (obs.y + obs.h >= state.groundY) { obs.y = state.groundY - obs.h; obs.dy = 0; }
            }

            if (state.player.x + 8 < obs.x + obs.w - 8 && state.player.x + state.player.w - 8 > obs.x + 8 && state.player.y + 5 < obs.y + obs.h - 5 && state.player.y + state.player.h > obs.y + 5) {
                dead = true; 
            }
        }

        state.diamonds.forEach(d => {
            d.x -= state.speed;
            if (!d.collected && state.player.x < d.x + d.w && state.player.x + state.player.w > d.x && state.player.y < d.y + d.h && state.player.y + state.player.h > d.y) {
                d.collected = true; state.score += 1; setScore(state.score);
            }
        });

        if (dead) { endGame(); return; }

        state.frames++;
        if (state.frames % 100 === 0 && state.speed < 15) state.speed += 0.2;

        if (state.frames - state.lastSpawnFrame > Math.max(40, 100 - state.speed * 4)) {
            if (Math.random() < 0.55) { 
                state.lastSpawnFrame = state.frames;
                let rand = Math.random();
                if (rand < 0.5) state.obstacles.push({ type: 'zombie', x: LOG_W, y: state.groundY - 40, w: 40, h: 40 });
                else state.obstacles.push({ type: 'husk', x: LOG_W, y: state.groundY - 40, w: 40, h: 40, dy: 0 }); 
            }
        }
        
        if (state.frames % Math.floor(Math.random() * 300 + 400) === 0) {
            state.diamonds.push({ x: LOG_W, y: state.groundY - 50 - Math.random() * 100, w: 24, h: 24, collected: false });
        }

        ctx.clearRect(0, 0, LOG_W, LOG_H);
        ctx.fillStyle = '#5A5A5A'; ctx.fillRect(0, state.groundY, LOG_W, LOG_H - state.groundY);
        
        state.obstacles.forEach(obs => {
            if (obs.type === 'zombie' && images.current.zombie.complete) ctx.drawImage(images.current.zombie, obs.x, obs.y, obs.w, obs.h);
            else if (obs.type === 'husk' && images.current.husk.complete) ctx.drawImage(images.current.husk, obs.x, obs.y, obs.w, obs.h);
        });

        state.diamonds.forEach(d => {
            if (!d.collected && images.current.diamond.complete) ctx.drawImage(images.current.diamond, d.x, d.y, d.w, d.h);
        });

        if (images.current.steve.complete) ctx.drawImage(images.current.steve, state.player.x, state.player.y, state.player.w, state.player.h);
        
        state.reqId = requestAnimationFrame(loop);
    };

    const endGame = () => {
        setGameState('gameover');
        if (bgmRef.current) bgmRef.current.pause();
        onGameOver(gameRef.current.score); 
        if (gameRef.current.reqId) cancelAnimationFrame(gameRef.current.reqId);
    };

    return (
        <div className="fixed inset-0 z-[80] bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
            <div className="bg-gray-800 p-2 border-4 border-gray-600 no-round max-w-3xl w-full relative shadow-2xl">
                <div className="flex justify-between text-white font-bold mb-2 font-mono px-2 text-xl">
                    <span>💎 {score}</span>
                    <button onClick={onQuit} className="text-red-400">✖ 離開</button>
                </div>
                <div className="bg-[#6bc0ff] relative w-full overflow-hidden border-4 border-black" style={{ height: '350px' }} onMouseDown={(e) => { e.preventDefault(); if(gameState==='playing') jump(); }}>
                    <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} className="pixelated block"></canvas>
                    {gameState === 'start' && <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60"><button onClick={startGame} className="mc-btn px-8 py-4 text-2xl animate-pulse">🛹 開始跑酷</button></div>}
                    {gameState === 'gameover' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white">
                            <h2 className="text-4xl font-black mb-2 text-red-500 drop-shadow-md">GAME OVER</h2>
                            <p className="mb-8 font-bold text-xl">獲得了 {score} 💎</p>
                            <div className="flex space-x-6"><button onClick={startGame} className="mc-btn px-6 py-3">🔄 再玩</button><button onClick={onQuit} className="mc-btn px-6 py-3 bg-gray-400">🔙 返回</button></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MinecraftDashboard({ user, userProfile, showAlert }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [showMiniGame, setShowMiniGame] = useState(false);
    const mcData = userProfile.mcData || { diamonds: 0, level: 1, exp: 0, hunger: 10, items: [], cats: 0, lastCheckIn: null };

    useEffect(() => {
        const fetchLeaderboard = async () => {
            const friendUids = (userProfile.friends || []).map(f => f.uid);
            if (friendUids.length === 0) return setLeaderboard([{ name: userProfile.displayName, ...mcData, isMe: true }]);
            try {
                const board = [{ name: userProfile.displayName, ...mcData, isMe: true }];
                const promises = friendUids.map(uid => db.collection('users').doc(uid).get());
                const results = await Promise.all(promises);
                results.forEach(doc => {
                    if (doc.exists && doc.data().mcData) board.push({ name: doc.data().displayName, ...doc.data().mcData, isMe: false });
                });
                board.sort((a, b) => b.level !== a.level ? b.level - a.level : b.exp - a.exp);
                setLeaderboard(board);
            } catch (e) { console.error(e); }
        };
        fetchLeaderboard();
    }, [userProfile.friends, mcData]);

    const updateMcData = (updates, silent = false) => {
        db.collection('users').doc(user.uid).update({ mcData: { ...mcData, ...updates } }).catch(e => { if (!silent) showAlert('更新失敗：' + e.message); });
    };

    const handleCheckIn = () => {
        const today = new Date().toISOString().split('T')[0];
        if (mcData.lastCheckIn === today) return showAlert("今日已經簽到過囉！");
        updateMcData({ diamonds: mcData.diamonds + 20, exp: mcData.exp + 10, hunger: Math.max(0, mcData.hunger - 2), lastCheckIn: today });
        showAlert("✅ 簽到成功！獲得 20 💎 與 10 EXP");
    };

    return (
        <div className="mc-bg h-[calc(100dvh-100px)] overflow-y-auto custom-scrollbar p-4 relative">
            {showMiniGame && <SkateboardGame onGameOver={d => { if(d>0) updateMcData({diamonds: mcData.diamonds + d}, true); }} onQuit={() => setShowMiniGame(false)} />}
            <div className="max-w-4xl mx-auto mc-ui p-6 bg-opacity-90 flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-black text-white">⛏️ 史蒂夫的養成天地</h1>
                    <div className="text-white text-sm">Lv. {mcData.level} | 💎 {mcData.diamonds} | 🍖 {mcData.hunger}/10</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="mc-panel-dark text-white space-y-4">
                        <h2 className="border-b-2 border-gray-600 pb-2 font-bold flex justify-between">🏡 你的家 <button onClick={() => setShowMiniGame(true)} className="bg-blue-600 px-2 rounded">玩滑板遊戲</button></h2>
                        <div className="h-36 mc-bg flex justify-center items-center"><McImg src="https://minotar.net/helm/Steve/64.png" className="w-16 h-16 pixelated"/></div>
                        <button onClick={handleCheckIn} className="mc-btn w-full py-2">📅 每日簽到 (+20 💎)</button>
                    </div>
                    <div className="mc-panel-dark text-white">
                        <h2 className="border-b-2 border-gray-600 pb-2 mb-4 font-bold text-yellow-300">🏆 好友等級排行榜</h2>
                        <div className="space-y-2">{leaderboard.map((lb, idx) => <div key={idx} className="flex justify-between border-b border-gray-700 p-2"><span>{idx+1}. {lb.name}</span><span className="text-green-400">Lv.{lb.level} (💎{lb.diamonds})</span></div>)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
