const { useState, useEffect, useRef } = React;

// --- 史萊姆排球小遊戲組件 (WebRTC 雙人連線版) ---
// --- 史萊姆排球小遊戲組件 (WebRTC 雙人連線版) ---
function VolleyballGame({ user, mcData, updateMcData, onQuit, showAlert }) {
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('start');
    const [score, setScore] = useState({ player: 0, opponent: 0 });
    const [pointMessage, _setPointMessage] = useState('');
    const pointMsgRef = useRef('');

    // ✨ 修復：攔截並同步文字，讓 Host 隨時能拿到最新文字廣播出去
    const setPointMessage = (msg) => {
        pointMsgRef.current = typeof msg === 'function' ? msg(pointMsgRef.current) : msg;
        _setPointMessage(msg);
    };

    // ✨ 1. 觸控按鈕自定義設定狀態 (從資料庫讀取)
    const [touchSettings, setTouchSettings] = useState(
        mcData.volleyball_touch || { layout: 'overlay', scale: 1, dpadX: 0, dpadY: 0, actionX: 0, actionY: 0 }
    );

    // ✨ 2. 網路連線狀態 (WebRTC)
    const netModeRef = useRef('offline'); // 'offline', 'host', 'guest'
    const [netModeUI, setNetModeUI] = useState('offline');
    const [peerId, setPeerId] = useState('');
    const [joinId, setJoinId] = useState('');
    const [connStatus, setConnStatus] = useState('');
    const peerRef = useRef(null);
    const connRef = useRef(null);

    const setNetMode = (mode) => {
        netModeRef.current = mode;
        setNetModeUI(mode);
    };

    // 動態載入免費的 PeerJS 連線套件
    useEffect(() => {
        if (!document.getElementById('peerjs-script')) {
            const script = document.createElement('script');
            script.id = 'peerjs-script';
            script.src = "https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js";
            document.body.appendChild(script);
        }
        return () => {
            if (peerRef.current) peerRef.current.destroy();
        };
    }, []);

    // 自定義按鍵狀態
    const [showSettings, setShowSettings] = useState(false);
    const [bindingKey, setBindingKey] = useState(null);
    const [keyBindings, setKeyBindings] = useState(
        mcData.volleyball_keys || { left: 'KeyA', right: 'KeyD', jump: 'Space', block: 'KeyE', spike: 'KeyF' }
    );
    const bindingsRef = useRef(keyBindings);

    const [showTips, setShowTips] = useState(true);
    const tipsRef = useRef(true);
    useEffect(() => { tipsRef.current = showTips; }, [showTips]);

    const bgmRef = useRef(null);
    const images = useRef({ steve: new Image(), villager: new Image(), slime: new Image() });

    useEffect(() => {
        bindingsRef.current = keyBindings;
    }, [keyBindings]);

    useEffect(() => {
        images.current.steve.src = "https://minotar.net/helm/Steve/64.png";
        images.current.villager.src = "https://minotar.net/helm/Villager/64.png";
        images.current.slime.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/slime_ball.png";

        preloadFastSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/mob/slime/attack1.ogg');
        preloadFastSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/player/levelup.ogg');
        preloadFastSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/mob/villager/no1.ogg');
        preloadFastSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/item/shield/block1.ogg');
        preloadFastSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/player/attack/sweep1.ogg');
        preloadFastSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/generic/explode1.ogg');

        bgmRef.current = new Audio("https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/S4.mp3"); 
        bgmRef.current.loop = true;
        bgmRef.current.volume = 0.3;
        
        return () => {
            if (bgmRef.current) bgmRef.current.pause();
            if (gameRef.current.reqId) cancelAnimationFrame(gameRef.current.reqId);
        };
    }, []);

    // ✨ 連線功能邏輯
    const createRoom = () => {
        if (!window.Peer) return showAlert("連線套件載入中，請稍後...");
        setNetMode('host');
        setConnStatus('建立房間中...');
        // ✨ 修改：生成 5 位數字的簡單房號
        const simpleId = Math.floor(10000 + Math.random() * 90000).toString();
        const peer = new window.Peer(simpleId);
        peerRef.current = peer;
        peer.on('open', (id) => { setPeerId(id); setConnStatus('等待對手加入...'); });
        peer.on('connection', (conn) => {
            connRef.current = conn;
            setConnStatus('對手已加入！準備開始...');
            conn.on('data', (data) => {
                if (data.type === 'keys') gameRef.current.opponentKeys = data.keys;
            });
            setTimeout(() => startGame('host'), 1000);
        });
    };

    const joinRoom = () => {
        if (!joinId) return showAlert("請先輸入房主 ID");
        if (!window.Peer) return showAlert("連線套件載入中，請稍後...");
        setConnStatus('連線中...');
        const peer = new window.Peer();
        peerRef.current = peer;
        peer.on('open', () => {
                // ✨ 核心修復 2：開啟 UDP 模式 (reliable: false)，丟失封包不等待，徹底消除累積延遲
                const conn = peer.connect(joinId, { reliable: false });
                connRef.current = conn;
                conn.on('open', () => {
                    setConnStatus('連線成功！等待房主開球...');
                    startGame('guest');
                });
                conn.on('data', (data) => {
                    if (data.type === 'state' && gameRef.current) {
                        // ✨ 核心修復 3：檢查幀數，丟棄遲到的舊封包，確保畫面永遠是最新的
                        if (data.frame < (gameRef.current.lastFrame || 0)) return;
                        gameRef.current.lastFrame = data.frame;

                        gameRef.current.ball = data.state.ball;
                        gameRef.current.player = data.state.player;
                        gameRef.current.opponent = data.state.opponent;
                        gameRef.current.serveTimer = data.state.serveTimer;
                        
                        // ✨ 關鍵修復 1：只有分數改變時才更新 React UI，避免每秒 60 次無意義重新渲染導致畫面卡死
                        if (gameRef.current.score.p !== data.state.score.p || gameRef.current.score.o !== data.state.score.o) {
                            gameRef.current.score = data.state.score;
                            setScore({ player: data.state.score.p, opponent: data.state.score.o });
                        }
                        
                        // ✨ 關鍵修復 2：避免過時的變數範圍 (Stale Closure) 導致無窮渲染
                        setPointMessage(prevMsg => {
                            if (prevMsg !== data.state.msg) return data.state.msg;
                            return prevMsg;
                        });
                        
                    } else if (data.type === 'sound') {
                } else if (data.type === 'sound') {
                    playCachedSound(data.url);
                } else if (data.type === 'gameover') {
                    endGame(true);
                }
            });
        });
    };

    const gameRef = useRef({
        reqId: null,
        w: 800,
        h: 400,
        groundY: 320, 
        net: { x: 395, y: 190, w: 10, h: 130 }, 
        ball: { x: 200, y: 100, vx: 0, vy: 0, r: 25 },
        player: { 
            x: 200, y: 350, vx: 0, vy: 0, speed: 6.5, jump: -11.5, r: 30,
            stamina: 100, blockCd: 0, spikeCd: 0, blockActive: 0, spikeActive: 0
        },
        opponent: { 
            x: 600, y: 350, vx: 0, vy: 0, speed: 5.5, jump: -11.5, r: 30,
            stamina: 100, blockCd: 0, spikeCd: 0, blockActive: 0, spikeActive: 0 
        },
        keys: { left: false, right: false, up: false, block: false, spike: false },
        score: { p: 0, o: 0 },
        touches: { p: 0, o: 0 },
        lastHitTime: { p: 0, o: 0 },
        serving: 'player', 
        isServing: true,
        isPointOver: false,
        serveTimer: 0,         
        serveSkillLockP: false,
        serveSkillLockO: false,
        opponentKeys: { left: false, right: false, up: false, block: false, spike: false } // ✨ 連線對手按鍵
    });

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.repeat) return; // ✨ 核心修復 1：拒絕鍵盤長按造成的無效連發 (這是癱瘓網路的主因)
            if (bindingKey) {
                e.preventDefault();
                setKeyBindings(prev => ({ ...prev, [bindingKey]: e.code }));
                setBindingKey(null);
                return;
            }
            const keys = gameRef.current.keys;
            const binds = bindingsRef.current;
            if (e.code === binds.left || e.code === 'ArrowLeft') keys.left = true;
            if (e.code === binds.right || e.code === 'ArrowRight') keys.right = true;
            if (e.code === binds.jump || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); keys.up = true; }
            if (e.code === binds.block) keys.block = true;
            if (e.code === binds.spike) keys.spike = true;
            
            if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys });
        };
        const handleKeyUp = (e) => {
            if (bindingKey) return;
            const keys = gameRef.current.keys;
            const binds = bindingsRef.current;
            if (e.code === binds.left || e.code === 'ArrowLeft') keys.left = false;
            if (e.code === binds.right || e.code === 'ArrowRight') keys.right = false;
            if (e.code === binds.jump || e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
            if (e.code === binds.block) keys.block = false;
            if (e.code === binds.spike) keys.spike = false;

            if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys });
        };
        window.addEventListener('keydown', handleKeyDown, { passive: false });
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [bindingKey]);

    const resetPositions = () => {
        const state = gameRef.current;
        state.player.x = 200; state.player.y = state.groundY; state.player.vx = 0; state.player.vy = 0;
        state.opponent.x = 600; state.opponent.y = state.groundY; state.opponent.vx = 0; state.opponent.vy = 0;
        if (state.serving === 'player') { state.ball.x = 200; state.ball.y = 220; } 
        else { state.ball.x = 600; state.ball.y = 220; }
        state.ball.vx = 0; state.ball.vy = 0;
        state.touches.p = 0; state.touches.o = 0;
        state.isPointOver = false;
        state.isServing = true;
        state.serveTimer = 45; 
        state.serveSkillLockP = false;
        state.serveSkillLockO = false;
        setPointMessage('');
    };

    const startGame = (mode = netModeRef.current) => {
        if (mcData.hunger < 1) {
            showAlert("🍖 史蒂夫太餓了！請先去商店吃點東西再來打排球！");
            return;
        }
        updateMcData({ hunger: mcData.hunger - 1 }, true); // 無論連線或單機皆扣飽食度
        
        setGameState('playing');
        setScore({ player: 0, opponent: 0 });
        setPointMessage('');
        gameRef.current.score = { p: 0, o: 0 };
        gameRef.current.serving = 'player';
        gameRef.current.player.stamina = 100;
        gameRef.current.opponent.stamina = 100; 
        resetPositions();
        
        if (bgmRef.current) { bgmRef.current.currentTime = 0; bgmRef.current.play().catch(()=>{}); }
        if (gameRef.current.reqId) cancelAnimationFrame(gameRef.current.reqId);
        gameRef.current.reqId = requestAnimationFrame(loop);
    };

    const loop = (timestamp) => {
        const state = gameRef.current;
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');

        // ✨ 核心修復：獨立物理邏輯，根據螢幕刷新率動態決定執行次數 (解決 30fps 慢動作與 240fps 加速)
        if (!timestamp) timestamp = performance.now();
        if (!state.lastTime) state.lastTime = timestamp;
        let elapsed = timestamp - state.lastTime;
        if (elapsed > 100) elapsed = 100; // 避免分頁切換回來後爆發性加速
        state.lastTime = timestamp;
        state.accumulator = (state.accumulator || 0) + elapsed;
        const timeStep = 1000 / 60; // 遊戲內部物理時間固定為 60Hz

        // ✨ 網路音效同步包裝
        const triggerNetSound = (url) => {
            playCachedSound(url);
            if (netModeRef.current === 'host' && connRef.current) {
                connRef.current.send({ type: 'sound', url });
            }
        };

        // ✨ 進入時間步長循環 (幀數落後會連續執行補上，幀數過快會跳過)
        while (state.accumulator >= timeStep) {
            state.accumulator -= timeStep;

            // ✨ 若是 Guest，跳過所有物理運算，只負責往下跑去畫圖
            if (netModeRef.current !== 'guest' && !state.isPointOver) {
            
            if (state.serveTimer > 0) {
                state.serveTimer--;
                if (state.serveTimer === 15) triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/block/bell/use.ogg');
                state.ball.vx = 0; state.ball.vy = 0;
            } else {
                if (!state.isServing) state.ball.vy += 0.35;
            }

            // ✨ 移除根據球過網來解鎖技能的舊邏輯，改為「對手擊球後解鎖」

            state.player.vy += 0.6;
            state.opponent.vy += 0.6;

            state.player.stamina = Math.min(100, state.player.stamina + 0.25);
            if (state.player.blockCd > 0) state.player.blockCd--;
            if (state.player.spikeCd > 0) state.player.spikeCd--;
            if (state.player.blockActive > 0) state.player.blockActive--;
            if (state.player.spikeActive > 0) state.player.spikeActive--;

            state.opponent.stamina = Math.min(100, state.opponent.stamina + 0.25);
            if (state.opponent.blockCd > 0) state.opponent.blockCd--;
            if (state.opponent.spikeCd > 0) state.opponent.spikeCd--;
            if (state.opponent.blockActive > 0) state.opponent.blockActive--;
            if (state.opponent.spikeActive > 0) state.opponent.spikeActive--;

            if (!state.isServing && !state.serveSkillLockP) {
                if (state.keys.block && state.player.blockCd === 0 && state.player.stamina >= 25) {
                    state.player.stamina -= 25; state.player.blockActive = 20; state.player.blockCd = 90;
                    triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/item/shield/block1.ogg');
                }
                if (state.keys.spike && state.player.spikeCd === 0 && state.player.stamina >= 30) {
                    state.player.stamina -= 30; state.player.spikeActive = 15; state.player.spikeCd = 120;
                    triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/player/attack/sweep1.ogg');
                }
            }

            if (state.keys.left) state.player.vx = -state.player.speed;
            else if (state.keys.right) state.player.vx = state.player.speed;
            else state.player.vx = 0;

            if (state.keys.up && state.player.y >= state.groundY) {
                state.player.vy = state.player.jump;
            }

            if (state.ball.x < state.net.x) state.touches.o = 0;
            if (state.ball.x > state.net.x + state.net.w) state.touches.p = 0;

            // --- 🤖 對手控制邏輯 (Host 模式為真人，Offline 模式為 AI) ---
            if (netModeRef.current === 'host') {
                const oKeys = state.opponentKeys;
                if (oKeys.left) state.opponent.vx = -state.opponent.speed;
                else if (oKeys.right) state.opponent.vx = state.opponent.speed;
                else state.opponent.vx = 0;

                if (oKeys.up && state.opponent.y >= state.groundY) state.opponent.vy = state.opponent.jump;

                if (!state.isServing && !state.serveSkillLockO) {
                    if (oKeys.spike && state.opponent.spikeCd === 0 && state.opponent.stamina >= 30) {
                        state.opponent.stamina -= 30; state.opponent.spikeActive = 15; state.opponent.spikeCd = 100;
                        triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/player/attack/sweep1.ogg');
                    }
                    if (oKeys.block && state.opponent.blockCd === 0 && state.opponent.stamina >= 25 && state.opponent.y < state.groundY) {
                        state.opponent.stamina -= 25; state.opponent.blockActive = 20; state.opponent.blockCd = 90;
                        triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/item/shield/block1.ogg');
                    }
                }
            } else {
                let aiTargetX = 600; 
                let aiShouldJump = false;
                let aiTryBlock = false;
                let aiTrySpike = false;

               if (!state.isServing) {
                    if (state.ball.x > state.net.x) {
                        // 🏐【進攻/接球狀態】球在 AI 半場
                        let offset = 15; 
                        if (state.touches.o >= 1) offset = 30; 
                        
                        // ✨ 極限救球機制：如果球已經很低了且 AI 距離較遠，取消防守站位，全速往球的落點衝過去！
                        if (state.ball.y > 200 && state.opponent.x - state.ball.x > 30) {
                            offset = -10; 
                        }

                        aiTargetX = state.ball.x + (state.ball.vx * 10) + offset; 
                        
                        // 確保不會跑出場外或撞網
                        if (aiTargetX < state.net.x + 35) aiTargetX = state.net.x + 35;
                        if (aiTargetX > state.w - 30) aiTargetX = state.w - 30;
// 判斷跳躍時機
                        let xDist = state.opponent.x - state.ball.x; 
                        
                        // 1. 防守跳躍：擴大跳躍範圍，讓 AI 積極往前撲接小球
                        if (xDist > -25 && xDist < 90 && state.ball.y > 100 && state.ball.y < 300 && state.ball.vy > -1) {
                            aiShouldJump = true;
                        }
                        
                        // 2. ✨ 強化版攻擊預判跳躍：只要球正飛過來且有一定高度，AI 走到定點附近就提早起跳！
                        if (state.ball.vx > 0 && state.ball.x > state.net.x - 30 && state.ball.y < 280) {
                            // 如果 AI 距離自己預判的落點 (aiTargetX) 已經很近了，就直接起跳準備空中擊球
                            if (Math.abs(state.opponent.x - aiTargetX) < 40) {
                                aiShouldJump = true;
                            }
                        }
                        
                        // 3. 原本的攻擊跳躍保留作為極限補救
                        if (state.ball.x < state.net.x + 200 && xDist > -20 && xDist < 80 && state.ball.y < 200 && state.ball.vy < 3) {
                            aiShouldJump = true;
                        }

                       // ✨ 動態計算安全殺球高度：稍微放寬限制，讓 AI 更有侵略性
                        let safeSpikeY = state.net.y - 5 - ((state.opponent.x - state.net.x) * 0.15);

                        // ✨ 判斷殺球時機 (全場皆可殺，放寬 X/Y 軸的擊球判定寬容度)
                        if (state.opponent.y < state.groundY - 10 && 
                            state.ball.y < safeSpikeY && 
                            state.ball.x < state.opponent.x + 30 &&   // 放寬前方判定
                            state.ball.x > state.opponent.x - 50 &&   // 放寬後方判定
                            state.ball.y < state.opponent.y + 30 &&   // 放寬下方判定
                            state.ball.y > state.opponent.y - 80 &&   // 放寬上方判定
                            state.opponent.stamina >= 30) {           // 確保有足夠體力 (30)
                            
                            // ✨ 能殺就殺：大幅提升觸發率 (從 12% 提升到 85%)，保留一點點隨機性讓動作看起來自然
                            if (Math.random() < 0.85) {
                                aiTrySpike = true;
                            }
                        }
                    } else {
                        // 🛡️【防守狀態】球在玩家半場
                        if (state.ball.vx > 0) {
                            // ⚾ 球正飛向 AI：判斷落點
                            if (state.ball.vx > 7 && state.ball.y < 250) {
                                // 玩家殺球！快速後退準備接球
                                aiTargetX = 720; 
                                // 只有球極低且快過網時，才緊急攔網
                                if (state.ball.x > state.net.x - 60 && state.ball.y < 180 && state.opponent.stamina >= 40) {
                                    aiTargetX = state.net.x + 35;
                                    aiShouldJump = true;
                                    aiTryBlock = true;
                                }
                            } else {
                                // 一般球或高吊球，根據球的位置與速度動態預判落點
                                aiTargetX = state.ball.x + (state.ball.vx * 30);
                                
                                // ✨ 針對網前小球(球速慢)特化：強制把預判點拉到網前，避免傻傻站後場
                                if (state.ball.vx < 4.5) {
                                    aiTargetX = state.net.x + 50;
                                }

                                if (aiTargetX < state.net.x + 40) aiTargetX = state.net.x + 40;
                                if (aiTargetX > 760) aiTargetX = 760;
                            }
                        } else {
                            // 🕵️ 球還沒飛過來 (可能是剛發球或往後飛)
                            // ✨ 取代固定站位，改為「鏡像隨動」，球靠近網子 AI 就跟著靠近
                            aiTargetX = 600 - ((state.net.x - state.ball.x) * 0.4);
                            if (aiTargetX < state.net.x + 60) aiTargetX = state.net.x + 60;
                            if (aiTargetX > 700) aiTargetX = 700;
                        }
                    }
                } else {
                     // 🎾【發球狀態】
                     if (state.serving === 'opponent') {
                         aiTargetX = state.ball.x + 20; 
                         if (Math.abs(state.opponent.x - aiTargetX) < 15) {
                             aiShouldJump = true;
                             if (state.opponent.y >= state.groundY) state.opponent.vx = -state.opponent.speed;
                         }
                     } else {
                         aiTargetX = 660;
                     }
                }

                // AI 移動執行
                if (state.opponent.x < aiTargetX - 10) state.opponent.vx = state.opponent.speed;
                else if (state.opponent.x > aiTargetX + 10) state.opponent.vx = -state.opponent.speed;
                else state.opponent.vx = 0;

                // AI 跳躍執行
                if (aiShouldJump && state.opponent.y >= state.groundY) state.opponent.vy = state.opponent.jump;

                // AI 技能執行
                if (!state.isServing && !state.serveSkillLockO) {
                    if (aiTrySpike && state.opponent.spikeCd === 0 && state.opponent.stamina >= 30) {
                        state.opponent.stamina -= 30; state.opponent.spikeActive = 15; state.opponent.spikeCd = 100;
                        triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/player/attack/sweep1.ogg');
                    }
                    else if (aiTryBlock && state.opponent.blockCd === 0 && state.opponent.stamina >= 25 && state.opponent.y < state.groundY) {
                        state.opponent.stamina -= 25; state.opponent.blockActive = 20; state.opponent.blockCd = 90;
                        triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/item/shield/block1.ogg');
                    }
                }
            }
            // --- 🤖 AI 邏輯結束 ---

            if (state.serveTimer > 0) {
                state.player.vx = 0;
                state.opponent.vx = 0;
                if (state.player.y >= state.groundY) state.player.vy = 0;
                if (state.opponent.y >= state.groundY) state.opponent.vy = 0;
            }

            state.player.x += state.player.vx; state.player.y += state.player.vy;
            state.opponent.x += state.opponent.vx; state.opponent.y += state.opponent.vy;
            state.ball.x += state.ball.vx; state.ball.y += state.ball.vy;

            if (state.player.y > state.groundY) { state.player.y = state.groundY; state.player.vy = 0; }
            if (state.opponent.y > state.groundY) { state.opponent.y = state.groundY; state.opponent.vy = 0; }

            if (state.player.x - state.player.r < 0) state.player.x = state.player.r;
            if (state.player.x + state.player.r > state.net.x) state.player.x = state.net.x - state.player.r;
            if (state.opponent.x - state.opponent.r < state.net.x + state.net.w) state.opponent.x = state.net.x + state.net.w + state.opponent.r;
            if (state.opponent.x + state.opponent.r > state.w) state.opponent.x = state.w - state.opponent.r;

            if (state.ball.x - state.ball.r < 0) { state.ball.x = state.ball.r; state.ball.vx *= -0.8; }
            if (state.ball.x + state.ball.r > state.w) { state.ball.x = state.w - state.ball.r; state.ball.vx *= -0.8; }

            const bx = state.ball.x, by = state.ball.y, br = state.ball.r;
            const nx = state.net.x, ny = state.net.y, nw = state.net.w, nh = state.net.h;
            if (bx + br > nx && bx - br < nx + nw && by + br > ny && by - br < ny + nh) {
                if (by < ny + 5 && state.ball.vy > 0) {
                    state.ball.y = ny - br; state.ball.vy *= -0.8;
                } else {
                    if (bx < nx + nw/2) { state.ball.x = nx - br; state.ball.vx *= -0.8; }
                    else { state.ball.x = nx + nw + br; state.ball.vx *= -0.8; }
                }
            }

           const checkHit = (p, isPlayer) => {
                let now = performance.now();
                let lastHit = isPlayer ? state.lastHitTime.p : state.lastHitTime.o;
                if (now - lastHit < 100) return; 

                // ✨ 修復：讓村民也能物理觸發技能判定 (原本只有動畫)
                let isBlockingHit = p.blockActive > 0;
                let isSpikingHit = p.spikeActive > 0;
                
                let hitOccurred = false;
                let actualHitType = 'body'; 
                let hitVectorX = state.ball.x - p.x;
                let hitVectorY = state.ball.y - p.y;

                if (isSpikingHit) {
                    let progress = 1 - (p.spikeActive / 15);
                    let angle = progress * Math.PI * 2;
                    let dirMultiplier = isPlayer ? 1 : -1;
                    let handX = p.x + (15 * dirMultiplier) + Math.sin(angle * dirMultiplier) * 20; 
                    let handY = p.y - Math.cos(angle * dirMultiplier) * 20;
                    
                    let hdx = state.ball.x - handX;
                    let hdy = state.ball.y - handY;
                    let handDist = Math.sqrt(hdx*hdx + hdy*hdy);
                    
                    if (handDist < state.ball.r + 35) {
                        hitOccurred = true; actualHitType = 'spike'; hitVectorX = hdx; hitVectorY = hdy;
                    }
                }

                if (isBlockingHit && !hitOccurred) {
                    let blockLeft = p.x - 25, blockRight = p.x + 25, blockTop = p.y - p.r - 25, blockBottom = p.y - p.r + 10;
                    let testX = state.ball.x, testY = state.ball.y;
                    
                    if (state.ball.x < blockLeft) testX = blockLeft; else if (state.ball.x > blockRight) testX = blockRight;
                    if (state.ball.y < blockTop) testY = blockTop; else if (state.ball.y > blockBottom) testY = blockBottom;
                    
                    let bdx = state.ball.x - testX, bdy = state.ball.y - testY;
                    let blockDist = Math.sqrt(bdx*bdx + bdy*bdy);
                    
                    if (blockDist < state.ball.r) {
                        hitOccurred = true; actualHitType = 'block'; hitVectorX = state.ball.x - p.x; hitVectorY = state.ball.y - (p.y - 15);
                    }
                }

                if (!hitOccurred) {
                    let bdx = state.ball.x - p.x, bdy = state.ball.y - p.y;
                    let bodyDist = Math.sqrt(bdx*bdx + bdy*bdy);
                    if (bodyDist < state.ball.r + p.r) {
                        hitOccurred = true; actualHitType = 'body'; hitVectorX = bdx; hitVectorY = bdy;
                    }
                }

                if (hitOccurred) {
                    if (isPlayer) state.lastHitTime.p = now; else state.lastHitTime.o = now;

                    triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/mob/slime/attack1.ogg');
                    let wasServing = state.isServing;
                    
                    if (state.isServing) {
                        state.isServing = false;
                        state.serveSkillLockP = true;
                        state.serveSkillLockO = true;
                    }

                    if (isPlayer) {
                        state.touches.p += 1;
                        state.serveSkillLockO = false; // ✨ 玩家擊球後，解除對手的技能封印
                        
                        if (state.touches.p >= 4) {
                            state.isPointOver = true; state.score.o += 1; state.serving = 'opponent';
                            triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/mob/villager/no1.ogg');
                            setScore({ player: state.score.p, opponent: state.score.o });
                            setPointMessage(`❌ 左側連擊 4 次犯規！右側得分！`);
                            if (state.score.o >= 10) setTimeout(() => endGame(), 500);
                            else setTimeout(() => resetPositions(), 800);
                            return;
                        }
                    } else {
                        state.touches.o += 1;
                        state.serveSkillLockP = false; // ✨ 對手擊球後，解除玩家的技能封印
                        
                        if (state.touches.o >= 4) {
                            state.isPointOver = true; state.score.p += 1; state.serving = 'player';
                            triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/player/levelup.ogg');
                            setScore({ player: state.score.p, opponent: state.score.o });
                            setPointMessage(`❌ 右側連擊 4 次犯規！左側得分！`);
                            if (state.score.p >= 10) setTimeout(() => endGame(), 500);
                            else setTimeout(() => resetPositions(), 800);
                            return;
                        }
                    }

                    let dist = Math.sqrt(hitVectorX*hitVectorX + hitVectorY*hitVectorY) || 1;
                    let nxVec = hitVectorX / dist; 
                    let nyVec = hitVectorY / dist;
                    let speed = Math.sqrt(state.ball.vx*state.ball.vx + state.ball.vy*state.ball.vy);
                    let pSpeed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
                    let bounceSpeed = Math.max(7, speed * 0.7 + pSpeed * 0.5);

                    

                    if (actualHitType === 'spike') {
                        bounceSpeed = 22; nyVec = 0.3; nxVec = (isPlayer ? 1 : -1) * 2.0; 
                        triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/generic/explode1.ogg');
                    } else if (actualHitType === 'block') {
                        bounceSpeed = 12; nyVec = -1.2; nxVec = (hitVectorX > 0 ? 1 : -1) * 0.5;
                        triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/item/shield/block1.ogg');
                    } else {
                        // ✨ 修改：如果是發球，保留拋物線初速，不要被一般擊球邏輯降速
                        bounceSpeed = wasServing ? bounceSpeed : Math.min(bounceSpeed, 13);
                        if (nyVec > 0) nyVec = -nyVec; 
                    }

                    let nMag = Math.sqrt(nxVec*nxVec + nyVec*nyVec);
                    state.ball.vx = (nxVec / nMag) * bounceSpeed + (p.vx * 0.4);
                    state.ball.vy = (nyVec / nMag) * bounceSpeed - 2; 
                    
                    if (actualHitType === 'spike') {
                         state.ball.x += state.ball.vx * 0.5; state.ball.y += state.ball.vy * 0.5;
                    } else if (actualHitType === 'block') {
                         state.ball.x = p.x + (nxVec / nMag) * (state.ball.r + p.r + 10); state.ball.y = p.y - p.r - 20 - state.ball.r;
                    } else {
                         state.ball.x = p.x + (nxVec / nMag) * (state.ball.r + p.r); state.ball.y = p.y + (nyVec / nMag) * (state.ball.r + p.r);
                    }
                }
            };
            
            if (!state.isPointOver) checkHit(state.player, true);
            if (!state.isPointOver) checkHit(state.opponent, false);

            if (!state.isPointOver && state.ball.y + state.ball.r > state.groundY) {
                state.isPointOver = true;
                if (state.ball.x < state.w / 2) {
                    state.score.o += 1; state.serving = 'opponent';
                    triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/mob/villager/no1.ogg');
                    setPointMessage(`👇 球落地了！${netModeRef.current === 'offline' ? '村民' : '右方'}得分！`);
                } else {
                    state.score.p += 1; state.serving = 'player';
                    triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/player/levelup.ogg');
                    setPointMessage(`👇 球落地了！${netModeRef.current === 'offline' ? '史蒂夫' : '左方'}得分！`);
                }
                setScore({ player: state.score.p, opponent: state.score.o });
                
                if (state.score.p >= 10 || state.score.o >= 10) setTimeout(() => endGame(), 500);
                else setTimeout(() => resetPositions(), 800); 
            }

            // ✨ 每幀結束時，Host 把最新狀態廣播給 Guest
            if (netModeRef.current === 'host' && connRef.current) {
                state.frameCount = (state.frameCount || 0) + 1;
                if (state.frameCount % 2 === 0) {
                    connRef.current.send({
                        type: 'state',
                        frame: state.frameCount, // ✨ 加上幀數 ID 標籤，讓訪客可以辨識新舊
                        state: { ball: state.ball, player: state.player, opponent: state.opponent, score: state.score, serveTimer: state.serveTimer, msg: pointMsgRef.current }
                    });
                }
            }
        } // End of Host & Offline Physics Bypass
        
        } // End of while loop for physics

        // ======================= 繪圖區域 (所有模式共用) =======================
        ctx.clearRect(0, 0, state.w, state.h);
        ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, state.w, state.h);
        ctx.fillStyle = '#4CAF50'; ctx.fillRect(0, state.groundY, state.w, state.h - state.groundY);
        ctx.fillStyle = '#388E3C'; ctx.fillRect(0, state.groundY, state.w, 10);

        ctx.fillStyle = '#D3D3D3'; ctx.fillRect(state.net.x, state.net.y, state.net.w, state.net.h);
        ctx.strokeStyle = '#A9A9A9'; ctx.strokeRect(state.net.x, state.net.y, state.net.w, state.net.h);

        const drawImageSafe = (img, x, y, w, h) => {
            if(img.complete && img.naturalWidth > 0) ctx.drawImage(img, x, y, w, h);
        };

        // ===== 畫對手 (村民/真人) 與技能特效 =====
        ctx.save();
        ctx.translate(state.opponent.x, state.opponent.y);
        drawImageSafe(images.current.villager, -state.opponent.r, -state.opponent.r, state.opponent.r*2, state.opponent.r*2);
        
        ctx.fillStyle = '#6e4c34'; 
        if (state.opponent.blockActive > 0) {
            ctx.fillRect(-20, -state.opponent.r - 20, 10, 30);
            ctx.fillRect(10, -state.opponent.r - 20, 10, 30);
            ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
            ctx.fillRect(-25, -state.opponent.r - 25, 50, 35);
            ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(-25, -state.opponent.r - 25, 50, 35);
        } else if (state.opponent.spikeActive > 0) {
            let progress = 1 - (state.opponent.spikeActive / 15); 
            let angle = -(progress * Math.PI * 2); 
            ctx.save();
            ctx.translate(-15, 0); 
            ctx.rotate(angle);
            ctx.fillRect(-5, -25, 10, 25);
            
            ctx.translate(0, -20);
            ctx.fillStyle = 'rgba(255, 50, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 50, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
        
        ctx.fillStyle = '#555'; ctx.fillRect(state.opponent.x - 20, state.opponent.y + state.opponent.r + 5, 40, 6);
        ctx.fillStyle = state.opponent.stamina > 30 ? '#00FF00' : '#FF0000';
        ctx.fillRect(state.opponent.x - 20, state.opponent.y + state.opponent.r + 5, 40 * (state.opponent.stamina / 100), 6);
        ctx.fillStyle = '#222'; ctx.fillRect(state.opponent.x - 20, state.opponent.y + state.opponent.r + 13, 19, 4);
        ctx.fillStyle = state.opponent.blockCd === 0 ? '#00BFFF' : '#555';
        ctx.fillRect(state.opponent.x - 20, state.opponent.y + state.opponent.r + 13, 19 * (1 - state.opponent.blockCd / 90), 4);
        ctx.fillStyle = '#222'; ctx.fillRect(state.opponent.x + 1, state.opponent.y + state.opponent.r + 13, 19, 4);
        ctx.fillStyle = state.opponent.spikeCd === 0 ? '#FF8C00' : '#555';
        ctx.fillRect(state.opponent.x + 1, state.opponent.y + state.opponent.r + 13, 19 * (1 - state.opponent.spikeCd / 100), 4);

        // ===== 畫玩家 (史蒂夫) 與技能特效 =====
        ctx.save();
        ctx.translate(state.player.x, state.player.y);
        drawImageSafe(images.current.steve, -state.player.r, -state.player.r, state.player.r*2, state.player.r*2);

        ctx.fillStyle = '#b08d6c';
        if (state.player.blockActive > 0) {
            ctx.fillRect(-20, -state.player.r - 20, 10, 30);
            ctx.fillRect(10, -state.player.r - 20, 10, 30);
            ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
            ctx.fillRect(-25, -state.player.r - 25, 50, 35);
            ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(-25, -state.player.r - 25, 50, 35);
        } else if (state.player.spikeActive > 0) {
            let progress = 1 - (state.player.spikeActive / 15); 
            let angle = progress * Math.PI * 2; 
            ctx.save();
            ctx.translate(15, 0); 
            ctx.rotate(angle);
            ctx.fillRect(-5, -25, 10, 25);
            
            ctx.translate(0, -20);
            ctx.fillStyle = 'rgba(255, 50, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 50, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();

        if (tipsRef.current && netModeRef.current !== 'guest') {
            let dx = state.ball.x - state.player.x;
            let dy = state.ball.y - state.player.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if (!state.isServing) {
                if (state.ball.y < state.net.y - 10 && state.player.y < state.groundY && dist < 120 && state.ball.x < state.net.x) {
                    ctx.fillStyle = 'rgba(255, 50, 0, 0.9)';
                    ctx.font = 'bold 20px "Courier New"';
                    ctx.textAlign = 'center';
                    ctx.fillText('💥 殺球!', state.player.x, state.player.y - state.player.r - 40);
                    
                    ctx.strokeStyle = 'rgba(255, 100, 0, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.arc(state.player.x + 15, state.player.y - 20, 50, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]); 
                }
                else if (state.ball.x > state.net.x - 60 && state.ball.x < state.net.x + 20 && state.ball.vx < 0 && state.ball.y > 100 && state.ball.y < 250) {
                    ctx.fillStyle = 'rgba(0, 150, 255, 0.9)';
                    ctx.font = 'bold 20px "Courier New"';
                    ctx.textAlign = 'center';
                    ctx.fillText('🛡️ 攔網!', state.net.x - 30, state.net.y - 20);
                }
            }
        }
        
        ctx.fillStyle = '#555'; ctx.fillRect(state.player.x - 20, state.player.y + state.player.r + 5, 40, 6);
        ctx.fillStyle = state.player.stamina > 30 ? '#00FF00' : '#FF0000';
        ctx.fillRect(state.player.x - 20, state.player.y + state.player.r + 5, 40 * (state.player.stamina / 100), 6);
        ctx.fillStyle = '#222'; ctx.fillRect(state.player.x - 20, state.player.y + state.player.r + 13, 19, 4);
        ctx.fillStyle = state.player.blockCd === 0 ? '#00BFFF' : '#555';
        ctx.fillRect(state.player.x - 20, state.player.y + state.player.r + 13, 19 * (1 - state.player.blockCd / 90), 4);
        ctx.fillStyle = '#222'; ctx.fillRect(state.player.x + 1, state.player.y + state.player.r + 13, 19, 4);
        ctx.fillStyle = state.player.spikeCd === 0 ? '#FF8C00' : '#555';
        ctx.fillRect(state.player.x + 1, state.player.y + state.player.r + 13, 19 * (1 - state.player.spikeCd / 120), 4);

        ctx.save();
        ctx.translate(state.ball.x, state.ball.y);
        ctx.rotate(state.ball.x * 0.05);
        drawImageSafe(images.current.slime, -state.ball.r, -state.ball.r, state.ball.r*2, state.ball.r*2);
        ctx.restore();

        if (state.ball.y + state.ball.r < 0) {
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.moveTo(state.ball.x, 25);
            ctx.lineTo(state.ball.x - 10, 10);
            ctx.lineTo(state.ball.x + 10, 10);
            ctx.fill();
            ctx.fillRect(state.ball.x - 4, 0, 8, 15);
        }

        if (state.serveTimer > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, state.w, state.h);
            ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
            ctx.font = 'bold 50px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(state.serveTimer > 15 ? 'READY...' : 'GO!', state.w/2, state.h/2);
        }

        state.reqId = requestAnimationFrame(loop);
    };

    const endGame = (fromNet = false) => {
        setGameState('gameover');
        if (bgmRef.current) bgmRef.current.pause();
        
        if (netModeRef.current === 'host' && connRef.current && !fromNet) {
            connRef.current.send({ type: 'gameover' });
        }
        
        let iWon = false;
        if (netModeRef.current === 'guest') {
            iWon = gameRef.current.score.o > gameRef.current.score.p; // Guest controls the right side
        } else {
            iWon = gameRef.current.score.p > gameRef.current.score.o; // Host/Offline controls the left side
        }

        if (iWon) {
            const reward = netModeRef.current === 'offline' ? 30 : 50; 
            updateMcData({ diamonds: mcData.diamonds + reward }, true);
            playCachedSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/ui/toast/challenge_complete.ogg');
            showAlert(`🎉 恭喜你戰勝了${netModeRef.current === 'offline' ? '村民' : '對手'}！\n獲得 ${reward} 💎`);
        } else {
            showAlert(`💀 你輸給了${netModeRef.current === 'offline' ? '村民' : '對手'}... 再接再厲！`);
        }
        if (gameRef.current.reqId) cancelAnimationFrame(gameRef.current.reqId);
    };

    return (
        <div className="fixed inset-0 z-[80] bg-stone-800 bg-opacity-90 flex flex-col items-center justify-center p-2 sm:p-4 touch-none">
            
            {showSettings && (
               <div className="absolute inset-0 bg-stone-800 bg-opacity-80 z-[100] flex items-center justify-center pointer-events-auto p-4">
                   <div className="bg-stone-800 p-6 border-4 border-gray-600 text-white rounded-lg shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
                       <h3 className="mb-4 text-xl font-bold text-center text-amber-400">⚙️ 自定義按鍵設定</h3>
                       <p className="text-sm text-gray-400 mb-4 text-center">點擊按鈕後按下您想綁定的鍵</p>
                       {Object.entries(keyBindings).map(([action, key]) => (
                           <div key={action} className="mb-3 flex justify-between items-center bg-stone-900 p-2 rounded">
                               <span className="font-bold text-gray-300">
                                   {action === 'left' ? '⬅️ 左移' : action === 'right' ? '➡️ 右移' : action === 'jump' ? '⬆️ 跳躍' : action === 'block' ? '🛡️ 攔網' : '⚔️ 殺球'}
                               </span>
                               <button
                                   onClick={() => setBindingKey(action)}
                                   className={`px-4 py-1 font-bold rounded border ${bindingKey === action ? 'bg-amber-600 border-amber-400 text-white animate-pulse' : 'bg-gray-700 border-gray-500 hover:bg-gray-600'}`}
                               >
                                   {bindingKey === action ? '請按鍵...' : key.replace('Key', '').replace('Arrow', '')}
                               </button>
                           </div>
                       ))}
                       
                       <div className="mb-3 flex justify-between items-center bg-stone-900 p-2 rounded mt-4 border-t-2 border-stone-700">
                           <span className="font-bold text-gray-300">💡 顯示最佳擊球時機提示</span>
                           <button 
                               onClick={() => setShowTips(!showTips)}
                               className={`px-4 py-1 font-bold rounded border ${showTips ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-red-600 border-red-400 text-white'}`}
                           >
                               {showTips ? '開 啟' : '關 閉'}
                           </button>
                       </div>

                       <div className="mb-3 bg-stone-900 p-2 rounded mt-2 border-t-2 border-stone-700">
                           <div className="flex justify-between items-center mb-2">
                               <span className="font-bold text-gray-300">📱 觸控按鈕佈局</span>
                               <button 
                                   onClick={() => setTouchSettings(p => ({...p, layout: p.layout === 'overlay' ? 'outside' : 'overlay'}))}
                                   className="px-4 py-1 font-bold rounded border bg-amber-600 border-amber-400 text-white"
                               >
                                   {touchSettings.layout === 'overlay' ? '畫面內 (浮動)' : '畫面外 (下方)'}
                               </button>
                           </div>
                           {touchSettings.layout === 'overlay' && (
                               <div className="flex flex-col gap-3 mt-3 border-t border-stone-700 pt-3">
                                   <div className="flex justify-between text-xs text-gray-300 items-center">
                                       <span>整體大小比例</span>
                                       <input type="range" min="0.5" max="2" step="0.1" value={touchSettings.scale} onChange={e => setTouchSettings(p => ({...p, scale: parseFloat(e.target.value)}))} className="w-24" />
                                   </div>
                                   {/* ✨ 新增：按鈕透明度調整 */}
                                   <div className="flex justify-between text-xs text-gray-300 items-center">
                                       <span>按鈕透明度</span>
                                       <input type="range" min="0.1" max="1" step="0.1" value={touchSettings.opacity ?? 1} onChange={e => setTouchSettings(p => ({...p, opacity: parseFloat(e.target.value)}))} className="w-24" />
                                   </div>
                                   <div className="flex justify-between text-xs text-gray-300 items-center">
                                       <span>移動鍵 X/Y微調</span>
                                       <div className="flex gap-2">
                                           <input type="range" min="-100" max="200" value={touchSettings.dpadX} onChange={e => setTouchSettings(p => ({...p, dpadX: parseInt(e.target.value)}))} className="w-16"/>
                                           <input type="range" min="-50" max="200" value={touchSettings.dpadY} onChange={e => setTouchSettings(p => ({...p, dpadY: parseInt(e.target.value)}))} className="w-16"/>
                                       </div>
                                   </div>
                                   <div className="flex justify-between text-xs text-gray-300 items-center">
                                       <span>技能鍵 X/Y微調</span>
                                       <div className="flex gap-2">
                                           <input type="range" min="-200" max="100" value={touchSettings.actionX} onChange={e => setTouchSettings(p => ({...p, actionX: parseInt(e.target.value)}))} className="w-16"/>
                                           <input type="range" min="-50" max="200" value={touchSettings.actionY} onChange={e => setTouchSettings(p => ({...p, actionY: parseInt(e.target.value)}))} className="w-16"/>
                                       </div>
                                   </div>
                               </div>
                           )}
                       </div>

                       <button onClick={() => {
                           updateMcData({ volleyball_keys: keyBindings, volleyball_touch: touchSettings }, true);
                           setShowSettings(false);
                       }} className="mt-4 bg-emerald-600 hover:bg-emerald-500 font-bold py-2 w-full rounded border-2 border-black active:tranamber-y-1">完成並儲存</button>
                   </div>
               </div>
            )}

            <div className="bg-stone-800 p-2 border-4 border-gray-600 w-full max-w-6xl relative shadow-2xl flex flex-col items-center pointer-events-auto">
                <div className="w-full flex justify-between items-center text-white font-bold mb-2 font-mono px-2 text-xl">
                    <span className="text-amber-400">{netModeUI === 'guest' ? '對手' : '史蒂夫'}: {score.player}</span>
                    <span className="text-amber-400 text-sm hidden sm:inline">先得 10 分者獲勝</span>
                    <div className="flex gap-4 items-center">
                        <span className="text-red-400">{netModeUI === 'offline' ? '村民' : netModeUI === 'host' ? '對手' : '我'}: {score.opponent}</span>
                        <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white transition-colors text-lg">⚙️</button>
                        <button onClick={onQuit} className="text-gray-400 hover:text-white transition-colors text-lg">✖</button>
                    </div>
                </div>

                <div className="relative w-full overflow-hidden border-4 border-black shrink-0 max-h-[65vh] md:max-h-none" style={{ aspectRatio: '800/400' }}>
                    <canvas ref={canvasRef} width={800} height={400} className="w-full h-full object-contain bg-[#87CEEB] pixelated"></canvas>
                    
                    {pointMessage && gameState === 'playing' && (
                        <div className="absolute top-1/4 left-1/2 transform -tranamber-x-1/2 -tranamber-y-1/2 bg-stone-800 bg-opacity-70 text-white font-bold text-2xl sm:text-3xl px-6 py-3 rounded-lg border-2 border-amber-400 z-10 whitespace-nowrap animate-bounce">
                            {pointMessage}
                        </div>
                    )}

                    {gameState === 'start' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-800 bg-opacity-80 text-white z-20 px-4">
                            <h2 className="text-4xl font-black mb-4 text-rose-500 drop-shadow-md tracking-widest">🏐 史萊姆排球</h2>
                            <p className="mb-4 font-bold text-center text-sm sm:text-base">把史萊姆球打過網得分！<br/><span className="text-amber-300">支援單機打村民，與 WebRTC 線上真人連線！</span></p>
                            
                            {netModeUI === 'offline' && !connStatus ? (
                                <div className="flex flex-col gap-3 w-full max-w-sm">
                                    <button onClick={() => { setNetMode('offline'); startGame('offline'); }} className="bg-stone-600600 hover:bg-rose-500 border-4 border-stone-600800 text-white font-bold py-3 text-xl shadow-lg active:tranamber-y-1 pixelated-border">單人模式 (打村民 - 耗1飽食)</button>
                                    <button onClick={createRoom} className="bg-amber-600 hover:bg-amber-500 border-4 border-amber-800 text-white font-bold py-3 text-xl shadow-lg active:tranamber-y-1 pixelated-border">📡 建立線上房間 (房主)</button>
                                    <button onClick={() => {
                                        if (!window.Peer) return showAlert("套件載入中...");
                                        setNetMode('guest');
                                    }} className="bg-emerald-600 hover:bg-emerald-500 border-4 border-emerald-800 text-white font-bold py-3 text-xl shadow-lg active:tranamber-y-1 pixelated-border">🤝 加入線上房間 (訪客)</button>
                                </div>
                            ) : netModeUI === 'host' ? (
                                <div className="text-center bg-stone-800 p-6 border-4 border-gray-600 rounded max-w-sm w-full">
                                    <p className="text-amber-400 font-bold mb-2">你的房間 ID (請複製給朋友)：</p>
                                    <div className="bg-stone-800 p-3 select-all text-xl tracking-widest mb-4 font-mono break-all">{peerId || '生成中...'}</div>
                                    <p className="animate-pulse font-bold text-lg mb-4">{connStatus}</p>
                                    <button onClick={() => { setNetMode('offline'); setConnStatus(''); if(peerRef.current) peerRef.current.destroy(); }} className="w-full bg-gray-600 hover:bg-gray-500 py-2 font-bold border-4 border-gray-800 pixelated-border">返回</button>
                                </div>
                            ) : netModeUI === 'guest' && !connRef.current ? (
                                <div className="text-center bg-stone-800 p-6 border-4 border-gray-600 rounded max-w-sm w-full flex flex-col gap-3">
                                    <p className="text-emerald-400 font-bold mb-2 text-lg">請輸入房主給你的 ID：</p>
                                    <input type="text" value={joinId} onChange={e => setJoinId(e.target.value)} className="text-stone-800 font-mono font-bold p-3 text-center border-2 border-gray-900" placeholder="貼上房間 ID..."/>
                                    <button onClick={joinRoom} className="bg-emerald-600 hover:bg-emerald-500 font-bold py-3 border-4 border-emerald-800 pixelated-border text-xl">連線加入</button>
                                    <p className="font-bold text-amber-300">{connStatus}</p>
                                    <button onClick={() => { setNetMode('offline'); setConnStatus(''); if(peerRef.current) peerRef.current.destroy(); }} className="w-full bg-gray-600 hover:bg-gray-500 py-2 font-bold border-4 border-gray-800 pixelated-border">返回</button>
                                </div>
                            ) : (
                                <div className="bg-stone-800 bg-opacity-70 p-6 rounded border-2 border-amber-500">
                                    <p className="animate-pulse text-2xl text-amber-300 font-bold">{connStatus}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {gameState === 'gameover' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-800 bg-opacity-80 text-white z-20">
                            <h2 className="text-5xl font-black mb-4 drop-shadow-md">
                                {netModeUI === 'guest' ? (score.opponent > score.player ? '🏆 挑戰成功！' : '💀 挑戰失敗...') : (score.player > score.opponent ? '🏆 挑戰成功！' : '💀 挑戰失敗...')}
                            </h2>
                            <p className="text-2xl mb-8 font-bold">最終比分 - {score.player} : {score.opponent}</p>
                            <div className="flex gap-4">
                                {netModeUI === 'offline' && <button onClick={() => startGame('offline')} className="bg-emerald-600 hover:bg-emerald-500 border-4 border-emerald-800 text-white font-bold py-2 px-6 text-lg active:tranamber-y-1 pixelated-border">🔄 再來一局</button>}
                                <button onClick={() => { setNetMode('offline'); setConnStatus(''); if(peerRef.current) peerRef.current.destroy(); onQuit(); }} className="bg-gray-600 hover:bg-gray-500 border-4 border-gray-800 text-white font-bold py-2 px-6 text-lg active:tranamber-y-1 pixelated-border">🔙 離開對戰</button>
                            </div>
                        </div>
                    )}

                    {/* ✨ 觸控按鈕 (支援自定義位置大小與防反白) */}
                    {gameState === 'playing' && touchSettings.layout === 'overlay' && (
                        <div className="absolute inset-0 z-10 2xl:hidden pointer-events-none" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none', userSelect: 'none', touchAction: 'none' }}>
                            {/* 左側移動控制 (加入透明度 opacity 設定) */}
                            <div className="absolute flex gap-2 pointer-events-auto" style={{ bottom: `${12 + touchSettings.dpadY}px`, left: `${12 + touchSettings.dpadX}px`, transform: `scale(${touchSettings.scale})`, transformOrigin: 'bottom left', opacity: touchSettings.opacity ?? 1 }}>
                                <button 
                                    onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.left = true; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}}
                                    onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.left = false; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}}
                                    style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                                    className="select-none touch-none bg-stone-800/40 text-white/90 w-14 h-14 font-bold text-2xl rounded-full border-2 border-white/40 active:bg-stone-800/60 flex items-center justify-center backdrop-blur-sm"
                                >←</button>
                                <button 
                                    onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.right = true; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}}
                                    onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.right = false; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}}
                                    style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                                    className="select-none touch-none bg-stone-800/40 text-white/90 w-14 h-14 font-bold text-2xl rounded-full border-2 border-white/40 active:bg-stone-800/60 flex items-center justify-center backdrop-blur-sm"
                                >→</button>
                            </div>
                            {/* 右側技能控制 (加入透明度 opacity 設定) */}
                            <div className="absolute flex gap-2 pointer-events-auto" style={{ bottom: `${12 + touchSettings.actionY}px`, right: `${12 - touchSettings.actionX}px`, transform: `scale(${touchSettings.scale})`, transformOrigin: 'bottom right', opacity: touchSettings.opacity ?? 1 }}>
                                <button 
                                    onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.block = true; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}}
                                    onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.block = false; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}}
                                    style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                                    className="select-none touch-none bg-amber-700600/60 text-white/90 w-12 h-12 font-bold text-xl rounded-full border-2 border-amber-700300/60 active:bg-amber-700600/90 flex flex-col items-center justify-center backdrop-blur-sm shadow-lg"
                                >🛡️</button>
                                <button 
                                    onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.spike = true; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}}
                                    onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.spike = false; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}}
                                    style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                                    className="select-none touch-none bg-red-600/60 text-white/90 w-12 h-12 font-bold text-xl rounded-full border-2 border-red-300/60 active:bg-red-600/90 flex flex-col items-center justify-center backdrop-blur-sm shadow-lg"
                                >⚔️</button>
                                <button 
                                    onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.up = true; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}}
                                    onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.up = false; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}}
                                    style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                                    className="select-none touch-none bg-amber-600/60 text-white/90 w-14 h-14 font-bold text-2xl rounded-full border-2 border-amber-300/60 active:bg-amber-600/90 flex items-center justify-center backdrop-blur-sm shadow-lg"
                                >↑</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 畫面外的按鈕模式 */}
                {gameState === 'playing' && touchSettings.layout === 'outside' && (
                    <div className="flex justify-between w-full mt-2 px-2 2xl:hidden gap-1 shrink-0" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none', userSelect: 'none', touchAction: 'none' }}>
                        <div className="flex gap-2">
                            <button onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.left = true; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}} onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.left = false; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}} style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }} className="select-none touch-none bg-gray-700 text-white w-14 h-14 font-bold text-2xl rounded-lg border-b-4 border-gray-900 active:border-b-0 active:tranamber-y-1 flex items-center justify-center">←</button>
                            <button onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.right = true; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}} onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.right = false; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}} style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }} className="select-none touch-none bg-gray-700 text-white w-14 h-14 font-bold text-2xl rounded-lg border-b-4 border-gray-900 active:border-b-0 active:tranamber-y-1 flex items-center justify-center">→</button>
                        </div>
                        <div className="flex gap-2">
                            <button onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.block = true; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}} onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.block = false; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}} style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }} className="select-none touch-none bg-amber-700600 text-white w-14 h-14 font-bold text-sm rounded-lg border-b-4 border-amber-700800 active:border-b-0 active:tranamber-y-1 flex flex-col items-center justify-center"><span>🛡️</span><span>攔網</span></button>
                            <button onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.spike = true; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}} onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.spike = false; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}} style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }} className="select-none touch-none bg-red-600 text-white w-14 h-14 font-bold text-sm rounded-lg border-b-4 border-red-800 active:border-b-0 active:tranamber-y-1 flex flex-col items-center justify-center"><span>⚔️</span><span>殺球</span></button>
                            <button onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.up = true; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}} onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.up = false; if (netModeRef.current === 'guest' && connRef.current) connRef.current.send({ type: 'keys', keys: gameRef.current.keys });}} style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }} className="select-none touch-none bg-amber-600 text-white w-14 h-14 font-bold text-xl rounded-lg border-b-4 border-amber-800 active:border-b-0 active:tranamber-y-1 flex items-center justify-center">↑</button>
                        </div>
                    </div>
                )}

                <p className="text-gray-400 text-xs sm:text-sm mt-2 font-bold tracking-widest text-center hidden 2xl:block">
                    預設控制：【A/D/方向鍵】移動，【W/空白鍵/↑】跳躍，【E】攔網，【F】殺球
                </p>
            </div>
        </div>
    );
}

const McImg = ({ src, fallback, className, ...props }) => {
    const [error, setError] = useState(false);
    if (error) return <span className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{fallback}</span>;
    return <img src={src} className={className} onError={() => setError(true)} alt={fallback || "img"} {...props} />;
};
// ✨ 升級版：Web Audio API 核心系統 (無延遲引擎)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const audioBufferCache = {};

// 預先載入並將音檔解碼為記憶體緩衝區
const preloadFastSound = async (url) => {
    if (audioBufferCache[url]) return; 
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioBufferCache[url] = audioBuffer;
    } catch (e) {
        console.warn("Web Audio API 載入失敗，退回傳統模式:", url, e);
    }
};

// 保持原函數名稱 playCachedSound，這樣你其他地方完全不用改！
const playCachedSound = (url) => {
    // 解決瀏覽器自動播放限制
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (!audioBufferCache[url]) {
        // 如果還沒載入完，退回使用傳統 Audio
        const fallbackAudio = new Audio(url);
        fallbackAudio.volume = 0.6;
        fallbackAudio.play().catch(() => {});
        return;
    }

    // 建立無延遲音源節點
    const source = audioCtx.createBufferSource();
    source.buffer = audioBufferCache[url];
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.6; // 統一音量 0.6
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0); // 🚀 零延遲立即播放
};
// --- 礦車跑酷小遊戲組件 ---
// --- 礦車跑酷小遊戲組件 ---
// --- 礦車跑酷小遊戲組件 ---
function MinecartGame({ user, userProfile, mcData, updateMcData, showAlert, onGameOver, onQuit }) {
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

// --- 礦坑尋寶小遊戲組件 ---
// --- 礦坑尋寶小遊戲組件 ---
function MiningGame({ user, mcData, updateMcData, onQuit, showAlert }) {
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
    
    // ✨ 新增裂痕階段的貼圖
    const crackStage1 = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/destroy_stage_2.png";
    const crackStage2 = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/destroy_stage_6.png";

    const PRIZES = [
        { id: '711', name: '7-11 50元禮券', type: 'real', prob: 0.001, img: 'https://i.postimg.cc/pd20TjLs/638632987880299781.png', desc: '極巨獎！' },
        { id: 'diamond_jackpot', name: '鑽石礦 (+100 💎)', type: 'diamond', amount: 100, prob: 0.049, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/diamond_ore.png' },
        { id: 'pack_legendary', name: '終界寶箱 (禮包)', type: 'pack', prob: 0.02, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/respawn_anchor_top.png' },
        { id: 'pack_rare', name: '廢棄礦井箱 (禮包)', type: 'pack', prob: 0.08, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/barrel_side.png' },
        { id: 'gold_ore', name: '金礦 (+50 💎)', type: 'diamond', amount: 50, prob: 0.15, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/gold_ore.png' },
        { id: 'iron_ore', name: '鐵礦 (+20 💎)', type: 'diamond', amount: 20, prob: 0.25, img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/iron_ore.png' },
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
        // ✨ 初始化 state 加上 hits 與 isHit 屬性
        setBoard(Array(9).fill({ revealed: false, prize: null, hits: 0, isHit: false }));
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

        const currentBlock = board[index];

        // ✨ 逐漸破壞邏輯：前 2 下只會產生音效與裂痕
        if (currentBlock.hits < 2) {
            try { 
                hitSfx.current.currentTime = 0; 
                hitSfx.current.play(); 
            } catch(e){}

            setBoard(prev => {
                const newBoard = [...prev];
                newBoard[index] = { ...newBoard[index], hits: currentBlock.hits + 1, isHit: true };
                return newBoard;
            });

            // 短暫延遲後移除點擊特效
            setTimeout(() => {
                setBoard(prev => {
                    const newBoard = [...prev];
                    if (newBoard[index]) newBoard[index].isHit = false;
                    return newBoard;
                });
            }, 100);
            return;
        }

        // ✨ 第 3 下，正式挖開
        setIsProcessing(true);
        try { breakSfx.current.currentTime = 0; breakSfx.current.play(); } catch(e){}

        const prize = await drawPrize();

        const newBoard = Array(9).fill(null).map((_, i) => {
            if (i === index) return { revealed: true, prize: prize, isPick: true, hits: 3, isHit: false };
            const shouldShowFakeGift = Math.random() < 0.04; 
            let dummy;
            if (shouldShowFakeGift) {
                dummy = PRIZES.find(p => p.id === '711');
            } else {
                const normalPool = PRIZES.filter(p => p.id !== '711');
                dummy = normalPool[Math.floor(Math.random() * normalPool.length)];
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
            updates.diamonds = mcData.diamonds + prize.amount;
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
        <div className="fixed inset-0 z-[80] bg-stone-800 bg-opacity-90 flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
            <div className="bg-[#5c5c5c] border-4 border-[#2d2d2d] rounded-2xl max-w-4xl w-full relative shadow-2xl flex flex-col md:flex-row h-[500px]">
                <button onClick={handleQuit} className="absolute -top-4 -right-4 bg-red-600 text-white w-10 h-10 border-2 border-white font-black hover:bg-red-500 z-10 transition-colors">✖</button>
                <div className="w-full md:w-3/5 p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r-4 border-[#2d2d2d]">
                    <h2 className="text-2xl font-black text-white mb-2 drop-shadow-md flex items-center">
                        ⛏️ 礦坑尋寶 <span className="text-sm font-normal text-amber-300 ml-4 bg-stone-800 bg-opacity-40 px-2 py-1 rounded">擁有: {mcData.diamonds} 💎</span>
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
                                    style={block.isHit ? { transform: 'scale(0.95)', filter: 'brightness(1.5)' } : {}}
                                    className={`relative w-full h-full border-2 border-black transition-all duration-75 ${!block.revealed ? 'hover:scale-105 hover:brightness-110 cursor-pointer' : ''}`}
                                >
                                    {!block.revealed ? (
                                        <>
                                            <McImg src={imgStone} className="w-full h-full object-cover pixelated" />
                                            {/* ✨ 依照打擊次數疊加不同深度的裂痕 */}
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
                            🔄 再挖一次 (50 💎)
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
        </div>
    );
}

// --- Minecraft 養成遊戲面板組件 ---
function MinecraftDashboard({ user, userProfile, showAlert }) {
   const [leaderboard, setLeaderboard] = useState([]);
    const [showMiniGame, setShowMiniGame] = useState(false);
    const [showMiningGame, setShowMiningGame] = useState(false); 
    const [showSandbox, setShowSandbox] = useState(false);
    const [showVolleyball, setShowVolleyball] = useState(false);
    
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
        items: rawMcData.items || [],
        lastCheckIn: rawMcData.lastCheckIn || null,
        packs: rawMcData.packs || {}
    };
    
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
        const today = new Date().toISOString().split('T')[0];
        if (mcData.lastCheckIn === today) {
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
            lastCheckIn: today,
            packs: newPacks
        });
        showAlert("✅ 簽到成功！獲得 20 💎 與 10 EXP\n(史蒂夫消耗了 2 點飽食度)\n🎁 額外獲得 1 個【每日簽到箱】，已放入終界儲物箱中！");
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
                    <button onClick={() => setShowVolleyball(true)} className="bg-stone-600600 hover:bg-rose-500 text-white text-[10px] sm:text-xs px-3 py-1.5 border-2 border-stone-600800 font-bold transition-colors whitespace-nowrap shadow-md">
                        🏐 史萊姆排球
                    </button>
                </div>

                <div className="mc-panel-dark w-full md:w-auto text-white">
                        <div className="flex space-x-6 text-sm items-center font-bold">
                            <div className="text-center">
                                <p className="text-emerald-400 text-lg">Lv. {mcData.level}</p>
                                <p className="text-xs text-gray-300">EXP: {mcData.exp}/{expToNextLevel}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="flex items-center text-amber-300"><McImg src={imgDiamond} fallback="💎" className="w-4 h-4 mr-1 pixelated" /> {mcData.diamonds}</p>
                                <p className="flex items-center text-amber-300"><span className="text-lg mr-1 leading-none">🍖</span> {mcData.hunger}/10</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    <div className="space-y-6 lg:col-span-1">
                        <div className="mc-panel-dark text-white">
                            <h2 className="border-b-2 border-gray-600 pb-2 mb-4 font-bold text-gray-300 flex justify-between items-center">
                             <span>🏡 你的家</span>
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
                            <button onClick={handleCheckIn} className="mc-btn w-full py-2 flex justify-center items-center mb-2">
                                📅 每日簽到 (+20 <McImg src={imgDiamond} fallback="💎" className="w-4 h-4 mx-1 pixelated"/>)
                            </button>
                            {/* ✨ 修正：終界儲物箱專屬開啟音效 */}
                            <button onClick={() => {
                                playCachedSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/block/enderchest/open.ogg');
                                setShowEnderChest(true);
                            }} className="w-full py-2 flex justify-center items-center bg-amber-700900 hover:bg-amber-700800 text-white font-bold border-2 border-[#10002b] shadow-md transition-colors">
                                🔮 終界儲物箱 ({Object.values(mcData.packs || {}).reduce((a, b) => a + b, 0)})
                            </button>
                        </div>

                        <div className="mc-panel-dark text-white h-full">
                            <h2 className="border-b-2 border-gray-600 pb-2 mb-4 font-bold text-amber-300">🏆 好友等級排行榜</h2>
                            <div className="space-y-2 overflow-y-auto max-h-[16rem] custom-scrollbar pr-2">
                                {leaderboard.map((lb, idx) => (
                                    <div key={idx} className={`flex justify-between items-center p-3 border-b border-stone-700 ${lb.isMe ? 'bg-[#FCFBF7] bg-opacity-10 rounded' : ''}`}>
                                        <div className="flex items-center space-x-3">
                                            <span className="font-bold w-6 text-center">{idx === 0 ? '👑' : idx + 1}</span>
                                            <span className="truncate max-w-[100px] text-sm">{lb.name}</span>
                                        </div>
                                        <div className="text-right flex items-center space-x-3">
                                            <span className="text-emerald-400 font-bold text-sm">Lv.{lb.level}</span>
                                            <span className="text-xs text-gray-300 flex items-center w-10 justify-end"><McImg src={imgDiamond} fallback="💎" className="w-3 h-3 mr-1 pixelated" /> {lb.diamonds}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mc-panel-dark text-white lg:col-span-2 flex flex-col">
                        <h2 className="border-b-2 border-gray-600 pb-2 mb-4 font-bold text-gray-300">🛒 村民商賈</h2>
                        
                        <div className="flex items-center space-x-4 mb-4 bg-stone-800 p-3 border-4 border-gray-600 shadow-inner">
                            {/* ✨ 修正：將村民改為 button 增加點擊範圍與回饋，並擴充多種對話 */}
                            <button 
                                className={`shrink-0 transition-transform duration-200 focus:outline-none active:scale-90 ${villagerAnim === 'yes' ? 'tranamber-y-2' : villagerAnim === 'no' ? '-tranamber-x-2' : villagerAnim === 'idle' ? 'scale-110' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    playVillagerSound('idle');
                                    const speeches = [
                                        "呼嗯... 看看有沒有需要的？", 
                                        "哈啊... 這裡只有頂級好貨。", 
                                        "嗯哼，隨便看隨便挑。", 
                                        "哈！買點什麼吧朋友！", 
                                        "嗯嗯... 今天天氣真不錯。"
                                    ];
                                    setVillagerSpeech(speeches[Math.floor(Math.random() * speeches.length)]);
                                    setVillagerAnim('idle');
                                    setTimeout(() => setVillagerAnim(""), 200); 
                                }}
                            >
                                <McImg 
                                    src="https://minotar.net/helm/Villager/64.png" 
                                    fallback="🧑‍🌾" 
                                    className="w-16 h-16 pixelated border-2 border-black drop-shadow-lg cursor-pointer hover:brightness-110" 
                                />
                            </button>
                            <div className="relative bg-[#FCFBF7] text-stone-800 p-3 flex-1 shadow-md font-bold text-sm border-2 border-black pixelated-border">
                                <div className="absolute top-1/2 -left-[10px] transform -tranamber-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-r-[10px] border-r-white border-b-8 border-b-transparent"></div>
                                <div className="absolute top-1/2 -left-[13px] transform -tranamber-y-1/2 w-0 h-0 border-t-[9px] border-t-transparent border-r-[12px] border-r-black border-b-[9px] border-b-transparent -z-10"></div>
                                {villagerSpeech}
                            </div>
                        </div>

                        {/* ✨ 商店分類標籤 */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {STORE_CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => setStoreCat(cat)} className={`px-2 py-1 text-xs font-bold border-2 ${storeCat === cat ? 'bg-amber-600 border-amber-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[20rem] overflow-y-auto custom-scrollbar pr-2">
                            {/* ✨ 過濾並套用分類 */}
                            {storeItems.filter(item => !item.hide && (storeCat === '全部' || item.cat === storeCat)).map((item) => (
                                <button key={item.id} onClick={() => handleBuy(item)} className="mc-btn py-2 flex justify-between px-3 items-center hover:bg-[#b0b0b0]">
                                    <span className="flex items-center text-sm truncate pr-2">
                                        <McImg src={item.img} fallback={item.icon} className="w-5 h-5 mr-2 pixelated shrink-0"/> 
                                        {item.name}
                                    </span>
                                    <span className="text-amber-800 flex items-center text-sm font-black shrink-0">
                                        {item.cost} <McImg src={imgDiamond} fallback="💎" className="w-4 h-4 ml-1 pixelated"/>
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
        </div>
    );
}

// --- 2D 沙盒建築遊戲組件 (旗艦擴充版) ---
function SandboxGame({ user, userProfile, mcData, updateMcData, showAlert, onQuit }) {
    const ROWS = 12;
    const [cols, setCols] = useState(mcData.sandbox_cols || 20);
    const TOTAL_CELLS = cols * ROWS;

    const [mapScale, setMapScale] = useState(1); 
    const mapScaleRef = useRef(mapScale); 
    const initialPinchDist = useRef(0); 
    const mapContainerRef = useRef(null); 
    
    const CATEGORIES = ['全部', '基礎與礦石', '原木與建材', '羊毛與佈置', '地獄(需解鎖)', '末地(需解鎖)', '裝飾與植物'];
    const [activeCategory, setActiveCategory] = useState('全部');

    const WOOD_TYPES = [
        { id: 'oak', name: '橡木' }, { id: 'spruce', name: '杉木' }, { id: 'birch', name: '白樺木' },
        { id: 'jungle', name: '叢林木' }, { id: 'acacia', name: '金合歡木' }, { id: 'dark_oak', name: '深色橡木' }
    ];
    
    const WOOL_COLORS = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    const WOOL_NAMES = ['白', '橙', '紫紅', '淡藍', '黃', '黃綠', '粉紅', '灰', '淡灰', '青', '紫', '藍', '棕', '綠', '紅', '黑'];

    const BLOCK_TYPES = [
        // 工具
        { id: 'erase', name: '鐵鎬 (拆除)', cat: '工具', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/iron_pickaxe.png', price: 0, special: true },
        { id: 'sign', name: '告示牌 (留言)', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/oak_sign.png', price: 10, special: true, desc: '點擊空地留言(10💎/則)' },
        { id: 'poppy', name: '送小花 (拜訪專用)', cat: '工具', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/poppy.png', price: 0, special: true, desc: '參觀時送給好友' },
        { id: 'gift_box', name: '禮物盒 (送方塊)', cat: '工具', img: 'https://i.postimg.cc/bwPx54VC/Minecraft-Chest.jpg', price: 0, special: true, desc: '打包方塊送給好友' },
        { id: 'poop', name: '惡作劇大便', cat: '工具', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/cocoa_beans.png', price: 0, special: true, desc: '在好友家拉一坨大便' },
        { id: 'photo_map', name: '私人照片', cat: '工具', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/filled_map.png', price: 50, special: true, desc: '寄送照片給好友' },

        // 基礎與礦石
        { id: 'dirt', name: '泥土', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/dirt.png', price: 1 },
        { id: 'grass_block_side', name: '草方塊', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/grass_block_side.png', price: 5 },
        { id: 'stone', name: '石頭', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/stone.png', price: 5 },
        { id: 'cobblestone', name: '鵝卵石', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/cobblestone.png', price: 2 },
        { id: 'sand', name: '沙子', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/sand.png', price: 3 },
        { id: 'gravel', name: '礫石', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/gravel.png', price: 3 },
        { id: 'stone_slab', name: '石頭半磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/stone.png', price: 2, storeStyle: { clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)' } },
        { id: 'cobblestone_stairs', name: '石磚樓梯', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/cobblestone.png', price: 5, storeStyle: { clipPath: 'polygon(0 50%, 50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%)' } },
        { id: 'iron_door', name: '鐵門', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/iron_door.png', price: 30 },
        { id: 'coal_block', name: '煤炭磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/coal_block.png', price: 20 },
        { id: 'iron_block', name: '鐵磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/iron_block.png', price: 50 },
        { id: 'gold_block', name: '金磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/gold_block.png', price: 100 },
        { id: 'lapis_block', name: '青金石磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/lapis_block.png', price: 80 },
        { id: 'emerald_block', name: '綠寶石磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/emerald_block.png', price: 300 },
        { id: 'diamond_block', name: '鑽石磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/diamond_block.png', price: 500 },
        { id: 'obsidian', name: '黑曜石', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/obsidian.png', price: 150 },

        ...WOOD_TYPES.flatMap(wood => [
            { id: `${wood.id}_log`, name: `${wood.name}原木`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${wood.id}_log.png`, price: 10 },
            { id: `${wood.id}_planks`, name: `${wood.name}木板`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${wood.id}_planks.png`, price: 5 },
            { id: `${wood.id}_slab`, name: `${wood.name}半磚`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${wood.id}_planks.png`, price: 2, storeStyle: { clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)' } },
            { id: `${wood.id}_stairs`, name: `${wood.name}樓梯`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${wood.id}_planks.png`, price: 5, storeStyle: { clipPath: 'polygon(0 50%, 50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%)' } },
            { id: `${wood.id}_door`, name: `${wood.name}門`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/${wood.id}_door.png`, price: 10 },
            { id: `${wood.id}_trapdoor`, name: `${wood.name}地板門`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${wood.id}_trapdoor.png`, price: 10, storeStyle: { clipPath: 'polygon(0 80%, 100% 80%, 100% 100%, 0 100%)'} }
        ]),
        { id: 'chest_block', name: '儲物箱', cat: '原木與建材', img: 'https://i.postimg.cc/bwPx54VC/Minecraft-Chest.jpg', price: 20 },
        { id: 'glass', name: '玻璃', cat: '原木與建材', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/glass.png', price: 15 },
        { id: 'bricks', name: '磚塊', cat: '原木與建材', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/bricks.png', price: 20 },
        { id: 'bookshelf', name: '書架', cat: '原木與建材', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/bookshelf.png', price: 30 },
        { id: 'quartz_block', name: '石英磚', cat: '原木與建材', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/quartz_block.png', price: 40 },

        ...WOOL_COLORS.map((color, idx) => ({
            id: `${color}_wool`, name: `${WOOL_NAMES[idx]}色羊毛`, cat: '羊毛與佈置', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${color}_wool.png`, price: 5
        })),

        { id: 'netherrack', name: '地獄石', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/netherrack.png', price: 10 },
        { id: 'soul_sand', name: '靈魂沙', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/soul_sand.png', price: 20 },
        { id: 'glowstone', name: '螢光石', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/glowstone.png', price: 50 },
        { id: 'magma_block', name: '岩漿塊', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/magma.png', price: 40 },
        { id: 'nether_bricks', name: '地獄磚', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/nether_bricks.png', price: 30 },
        { id: 'crimson_nylium', name: '緋紅菌絲體', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/crimson_nylium_side.png', price: 40 },
        { id: 'warped_nylium', name: '扭曲菌絲體', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/warped_nylium_side.png', price: 40 },

        { id: 'end_stone', name: '末地石', cat: '末地(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/end_stone.png', price: 50 },
        { id: 'purpur_block', name: '紫珀塊', cat: '末地(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/purpur_block.png', price: 80 },
        { id: 'end_stone_bricks', name: '末地石磚', cat: '末地(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/end_stone_bricks.png', price: 60 },
        { id: 'chorus_flower', name: '紫頌花', cat: '末地(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/chorus_flower.png', price: 100 },

        { id: 'crafting_table', name: '工作台', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/crafting_table_front.png', price: 15 },
        { id: 'furnace', name: '熔爐', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/furnace_front.png', price: 20 },
        { id: 'tnt', name: 'TNT', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/tnt_side.png', price: 100 },
        { id: 'oak_leaves', name: '橡木樹葉', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/oak_leaves.png', price: 5 },
        { id: 'cactus', name: '仙人幼', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/cactus_side.png', price: 15 },
        { id: 'pumpkin', name: '南瓜', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/pumpkin_side.png', price: 20 },
        { id: 'melon_side', name: '西瓜', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/melon_side.png', price: 20 }
    ];

    const DIMENSIONS = {
        overworld: { id: 'overworld', name: '主世界', bg: '#87CEEB', cost: 0, requireStr: '' },
        nether: { id: 'nether', name: '地獄', bg: '#2b0000', cost: 1000, requireStr: 'unlockedNether' },
        end: { id: 'end', name: '末地', bg: '#10002b', cost: 2000, requireStr: 'unlockedEnd' }
    };

    const [isBuildMode, setIsBuildMode] = useState(false);
    const [buildLayer, setBuildLayer] = useState('foreground'); 
    const lastActionRef = useRef({ index: -1, time: 0 });
    const [isChestOpen, setIsChestOpen] = useState(false);
    const [currentDimension, setCurrentDimension] = useState('overworld');
    const [localInventory, setLocalInventory] = useState(() => mcData.inventory || { dirt: 50 });
    const [confirmDialog, setConfirmDialog] = useState(null); 
    
    // ✨ 新增收件箱狀態
    const [showInbox, setShowInbox] = useState(false);

    const [dragActiveBlock, setDragActiveBlock] = useState(null); 
    const sandboxBgmRef = useRef(null);

    const [hotbar, setHotbar] = useState(() => mcData.sandbox_hotbar || ['erase', null, null, null, null, null, null, null, null]);
    const [activeHotbarIndex, setActiveHotbarIndex] = useState(0);
    const selectedBlock = hotbar[activeHotbarIndex];

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key >= '1' && e.key <= '9') {
                setActiveHotbarIndex(parseInt(e.key) - 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const mapNode = mapContainerRef.current;
        if (!mapNode) return;

        const getDistance = (touches) => {
            if (touches.length < 2) return 0;
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const handleTouchStart = (e) => {
            if (e.touches.length === 2) {
                initialPinchDist.current = getDistance(e.touches);
                if (e.cancelable) e.preventDefault();
            }
        };

        const handleTouchMove = (e) => {
            if (e.touches.length === 2 && initialPinchDist.current > 0) {
                if (e.cancelable) e.preventDefault();
                const currentDist = getDistance(e.touches);
                const newScaleFactor = currentDist / initialPinchDist.current;
                
                let newScale = mapScaleRef.current * newScaleFactor;
                // ✨ 限制範圍在 1 ~ 3 之間
                newScale = Math.min(Math.max(newScale, 1), 3); 
                
                const gridNode = mapNode.querySelector('.grid-origin');
                if (gridNode) {
                    gridNode.style.height = `${newScale * 100}%`;
                }
                
                initialPinchDist.current = currentDist;
                mapScaleRef.current = newScale;
            }
        };

        const handleTouchEnd = (e) => {
            if (e.touches.length < 2) {
                initialPinchDist.current = 0;
                setMapScale(mapScaleRef.current);
            }
        };

        mapNode.addEventListener('touchstart', handleTouchStart, { passive: false });
        mapNode.addEventListener('touchmove', handleTouchMove, { passive: false });
        mapNode.addEventListener('touchend', handleTouchEnd);

        return () => {
            mapNode.removeEventListener('touchstart', handleTouchStart);
            mapNode.removeEventListener('touchmove', handleTouchMove);
            mapNode.removeEventListener('touchend', handleTouchEnd);
        };
    }, []); 

    useEffect(() => {
        sandboxBgmRef.current = new Audio("https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/sandbgm.mp3");
        sandboxBgmRef.current.loop = true;
        sandboxBgmRef.current.volume = 0.3;
        sandboxBgmRef.current.play().catch(e => console.log("BGM 播放阻擋", e));
        return () => { if (sandboxBgmRef.current) { sandboxBgmRef.current.pause(); sandboxBgmRef.current.currentTime = 0; } };
    }, []);

    const playChestOpenSound = () => new Audio('https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/open.mp3').play().catch(e => {});
    const playChestCloseSound = () => new Audio('https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/close.mp3').play().catch(e => {});
    const playBlockSound = (blockId, action) => {
        if (!blockId || blockId === 'erase') return;
        let soundType = 'stone';
        if (['glass', 'glowstone'].includes(blockId)) soundType = 'glass';
        else if (['dirt'].includes(blockId)) soundType = 'dirt';
        else if (['grass_block_side', 'oak_leaves', 'cactus', 'pumpkin', 'melon_side', 'crimson_nylium', 'warped_nylium', 'chorus_flower', 'poppy', 'tnt'].includes(blockId)) soundType = 'grass';
        else if (['sand', 'gravel', 'soul_sand'].includes(blockId)) soundType = 'sand';
        else if (blockId.includes('log') || blockId.includes('planks') || blockId.includes('door') || blockId.includes('wool') || ['bookshelf', 'crafting_table', 'sign', 'chest_block'].includes(blockId)) soundType = 'wood';

        const soundUrls = {
            place: { glass: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/glass_place.mp3', stone: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/stone_place_destroy.mp3', wood: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/wood_place.mp3', dirt: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/dirt_place.mp3', grass: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/grass_place.mp3', sand: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/sand_place.mp3' },
            break: { glass: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/glass_destroy.mp3', stone: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/stone_place_destroy.mp3', wood: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/wood_destroy.mp3', dirt: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/dirt_destroy.mp3', grass: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/grass_destroy.mp3', sand: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/sand_destroy.mp3' }
        };
        playCachedSound(soundUrls[action][soundType]);
    };

    const padGrid = (arr, c) => arr && arr.length ? [...arr] : Array(c * ROWS).fill(null);
    const [grids, setGrids] = useState({ overworld: padGrid(mcData.sandbox_overworld, cols), nether: padGrid(mcData.sandbox_nether, cols), end: padGrid(mcData.sandbox_end, cols) });
    const [bgGrids, setBgGrids] = useState({ overworld: padGrid(mcData.sandbox_bg_overworld, cols), nether: padGrid(mcData.sandbox_bg_nether, cols), end: padGrid(mcData.sandbox_bg_end, cols) });
    const [specials, setSpecials] = useState({ overworld: mcData.specials_overworld || {}, nether: mcData.specials_nether || {}, end: mcData.specials_end || {} });
    
    const [viewingFriend, setViewingFriend] = useState(null); 
    const [friendGrids, setFriendGrids] = useState({});
    const [friendBgGrids, setFriendBgGrids] = useState({});
    const [friendSpecials, setFriendSpecials] = useState({});
    const [friendCols, setFriendCols] = useState(20);
    
    const [buyModal, setBuyModal] = useState(null);
    const [signModal, setSignModal] = useState(null);
    const [chestUi, setChestUi] = useState(null);
    const [specialBlockModal, setSpecialBlockModal] = useState(null); 
    const [visitorLogOpen, setVisitorLogOpen] = useState(false);
    
    const photoInputRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    
    const isViewingSelf = viewingFriend === null;
    const activeCols = isViewingSelf ? cols : friendCols;
    const activeGrid = isViewingSelf ? grids[currentDimension] : (friendGrids[currentDimension] || Array(activeCols*ROWS).fill(null));
    const activeBgGrid = isViewingSelf ? bgGrids[currentDimension] : (friendBgGrids[currentDimension] || Array(activeCols*ROWS).fill(null));
    const activeSpecials = isViewingSelf ? specials[currentDimension] : (friendSpecials[currentDimension] || {});

    const requestExpand = (direction) => {
        setConfirmDialog({
            title: `🌐 擴張${direction === 'left' ? '左邊' : '右邊'}領地`,
            desc: "確定要花費 200 💎 增加一整排的建築空間嗎？\n(可無限擴張，並獲得順滑捲動軸)",
            cost: 200,
            action: () => doExpand(direction)
        });
    };

    const doExpand = (dir) => {
        if (mcData.diamonds < 200) return showAlert("💎 鑽石不足，無法擴張！");
        updateMcData({ diamonds: mcData.diamonds - 200 }, true);
        
        const newCols = cols + 1;
        const expandArray = (arr) => {
            const newArr = [];
            for(let r=0; r<ROWS; r++) {
                if (dir === 'left') newArr.push(null);
                newArr.push(...(arr || Array(cols*ROWS).fill(null)).slice(r * cols, (r+1) * cols));
                if (dir === 'right') newArr.push(null);
            }
            return newArr;
        };

        const expandSpecials = (oldSpec) => {
            const newSpec = {};
            for (let oldIdx in oldSpec) {
                let r = Math.floor(oldIdx / cols);
                let c = oldIdx % cols;
                let newC = dir === 'left' ? c + 1 : c;
                newSpec[r * newCols + newC] = oldSpec[oldIdx];
            }
            return newSpec;
        };

        setGrids({ overworld: expandArray(grids.overworld), nether: expandArray(grids.nether), end: expandArray(grids.end) });
        setBgGrids({ overworld: expandArray(bgGrids.overworld), nether: expandArray(bgGrids.nether), end: expandArray(bgGrids.end) });
        setSpecials({ overworld: expandSpecials(specials.overworld), nether: expandSpecials(specials.nether), end: expandSpecials(specials.end) });
        setCols(newCols); setHasUnsavedChanges(true);
        showAlert(`🎉 擴張成功！領地變得更寬廣了！`);
    };

    const handleViewChange = async (e) => {
        const targetUid = e.target.value;
        if (targetUid === 'self') {
            setViewingFriend(null); setIsBuildMode(false); setActiveHotbarIndex(0); return;
        }
        const friend = (userProfile.friends || []).find(f => f.uid === targetUid);
        if (friend) {
            setViewingFriend(friend); setCurrentDimension('overworld');
            try {
                const doc = await window.db.collection('users').doc(targetUid).get();
                if (doc.exists) {
                    const data = doc.data().mcData || {};
                    const fCols = data.sandbox_cols || 20;
                    setFriendCols(fCols);
                    setFriendGrids({ overworld: padGrid(data.sandbox_overworld, fCols), nether: padGrid(data.sandbox_nether, fCols), end: padGrid(data.sandbox_end, fCols) });
                    setFriendBgGrids({ overworld: padGrid(data.sandbox_bg_overworld, fCols), nether: padGrid(data.sandbox_bg_nether, fCols), end: padGrid(data.sandbox_bg_end, fCols) });
                    setFriendSpecials({ overworld: data.specials_overworld || {}, nether: data.specials_nether || {}, end: data.specials_end || {} });

                    const newLog = { uid: user.uid, name: userProfile.displayName, time: Date.now() };
                    let currentLog = data.visitorLog || [];
                    if (currentLog.length === 0 || currentLog[0].uid !== user.uid || (Date.now() - currentLog[0].time > 3600000)) {
                        window.db.collection('users').doc(targetUid).update({ 'mcData.visitorLog': [newLog, ...currentLog].slice(0, 20) });
                    }
                }
            } catch(err) { showAlert("無法讀取好友的房子！"); }
        }
    };

    const removeSpecialFromDB = async (uid, dim, index) => {
        try {
            const doc = await window.db.collection('users').doc(uid).get();
            const dbSpecials = doc.data()?.mcData[`specials_${dim}`] || {};
            delete dbSpecials[index];
            await window.db.collection('users').doc(uid).update({ [`mcData.specials_${dim}`]: dbSpecials });
        } catch(e) {}
    };

    // --- 收件箱處理邏輯 ---
    const handleInboxAction = (item, action) => {
        const newInbox = (mcData.inbox || []).filter(i => i.id !== item.id);
        
        if (action === 'delete') {
            updateMcData({ inbox: newInbox }, true);
        } else if (action === 'claim') {
            updateMcData({ inbox: newInbox, diamonds: mcData.diamonds + 3 }, true);
            showAlert(`🌺 你收下了 ${item.fromName} 的小花，獲得 3 💎！`);
        } else if (action === 'open') {
            // 原本由好友隨機給的包裹，若是沒有 blockId 就給隨機建材
            const blockId = item.blockId || 'oak_log'; 
            const amount = item.amount || Math.floor(Math.random() * 5) + 1;
            const bInfo = BLOCK_TYPES.find(b => b.id === blockId);
            const newInv = { ...localInventory }; 
            newInv[blockId] = (newInv[blockId] || 0) + amount; 
            setLocalInventory(newInv);
            updateMcData({ inbox: newInbox, inventory: newInv }, true);
            showAlert(`🎁 打開了 ${item.fromName} 的禮物！\n獲得 ${amount} 個 ${bInfo ? bInfo.name : '未知方塊'}！`);
        } else if (action === 'read') {
            const newLog = { uid: item.fromUid, name: item.fromName, time: Date.now(), msg: item.text };
            const currentLog = mcData.visitorLog || [];
            updateMcData({ inbox: newInbox, visitorLog: [newLog, ...currentLog].slice(0, 20) }, true);
            showAlert(`📜 ${item.fromName} 的留言：\n\n「${item.text}」\n\n(已收錄至您的到訪紀錄中)`);
        } else if (action === 'view') {
            // 更新該照片的過期時間為 10 分鐘後
            const newExpire = Date.now() + 10 * 60 * 1000;
            const updatedInbox = (mcData.inbox || []).map(i => 
                i.id === item.id ? { ...i, expiresAt: newExpire } : i
            );
            updateMcData({ inbox: updatedInbox }, true);
            
            setSpecialBlockModal({ 
                type: 'photo_view', 
                index: -1, 
                data: item.img,
                from: item.fromName,
                expiresAt: newExpire
            });
            setShowInbox(false); // 關閉收件箱避免擋住圖片
            showAlert('⚠️ 注意：為了保護隱私，此照片將在 10 分鐘後自動銷毀！');
        }
    };

    const handleCellClick = async (index) => {
        const now = Date.now();
        if (lastActionRef.current.index === index && now - lastActionRef.current.time < 200) return;
        lastActionRef.current = { index, time: now };

        const hasSpecial = activeSpecials[index];
        const currentFg = activeGrid[index];
        const currentBg = activeBgGrid[index];

        // --- 查看/互動模式邏輯 ---
        if (!isBuildMode) {
            // 訪客放置
            if (!isViewingSelf && ['poppy', 'sign', 'poop', 'photo_map'].includes(selectedBlock)) {
                // 允許放在方塊上，但避免覆蓋掉門、箱子或其他禮物
                if (hasSpecial) return showAlert('❌ 這裡已經有特殊機關或物品了，換個位子放吧！');
                
                if (selectedBlock === 'photo_map') {
    // 檢查是否為 jay03wn@gmail.com 或 獲授權人員
    const isAuth = user && (user.email === 'jay03wn@gmail.com' || userProfile?.isAuthorized);
    if (!isAuth) {
        return showAlert("📸 私人照片功能僅限管理員或經授權的用戶使用！");
    }

    if (mcData.diamonds < 50) return showAlert('💎 寄送私人照片需要 50 鑽石！');
                    
                    const today = new Date().toISOString().split('T')[0];
                    const currentPhotoLog = mcData.photoSentLog?.date === today ? mcData.photoSentLog : { date: today, count: 0 };
                    
                    if (currentPhotoLog.count >= 5) {
                        return showAlert('❌ 一天最多只能寄送 5 張照片喔！請明天再來。');
                    }

                    setConfirmDialog({
                        title: '📸 寄送私人照片',
                        desc: `確定要花費 50 💎 選擇並寄送照片嗎？\n(今日已發送：${currentPhotoLog.count}/5)\n(照片將在對方查看後存入收件箱)`,
                        cost: 50,
                        action: () => triggerPhotoUpload(index, viewingFriend.uid)
                    });
                    return;
                }
                
                if (selectedBlock === 'sign') {
                    if (mcData.diamonds < 10) return showAlert('💎 留言需要 10 鑽石！');
                    return setSignModal({ index, isSelf: false, targetUid: viewingFriend.uid });
                }
                
                if (selectedBlock === 'poppy') {
                    const today = new Date().toISOString().split('T')[0];
                    const poppySentLog = mcData.poppySent || {};
                    if (poppySentLog[viewingFriend.uid] === today) {
                        return showAlert('❌ 你今天已經送過小花給這位好友囉！明天再來吧！');
                    }
                    
                    const newHotbar = [...hotbar];
                    newHotbar[activeHotbarIndex] = null;
                    setHotbar(newHotbar);
                    updateMcData({ 
                        diamonds: mcData.diamonds + 1, 
                        poppySent: { ...poppySentLog, [viewingFriend.uid]: today } 
                    }, true);

                    const poppyData = { type: 'poppy', fromUid: user.uid, fromName: userProfile.displayName };
                    setFriendSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: poppyData } }));
                    
                    window.db.collection('users').doc(viewingFriend.uid).get().then(doc => {
                        const dbSpecials = doc.data()?.mcData[`specials_${currentDimension}`] || {};
                        dbSpecials[index] = poppyData;
                        window.db.collection('users').doc(viewingFriend.uid).update({ [`mcData.specials_${currentDimension}`]: dbSpecials });
                    });
                    
                    return showAlert('🌺 成功在好友家種下小花！\n你獲得了 1 💎 獎勵！');
                }

                if (selectedBlock === 'poop') {
                    const now = Date.now();
                    const oneHourAgo = now - 3600000;
                    const bonus = mcData.laxativeBonus || 0;
                    
                    let isWatery = false;
                    let newBonus = bonus;
                    let alertMsg = '';

                    // --- 優先檢查瀉藥邏輯 ---
                    if (bonus > 0) {
                        // 吃了瀉藥，立刻拉水便！
                        isWatery = true;
                        newBonus = bonus - 1;
                        alertMsg = '🌊 噗嚕嚕！史帝夫吃了瀉藥肚子劇痛，立刻拉出了一坨噁心的水便！🤢';
                    } else {
                        // 沒有藥效，檢查正常限制
                        const recentPoops = (mcData.poopTimestamps || []).filter(t => t > oneHourAgo);
                        if (recentPoops.length >= 5) {
                            return showAlert('❌ 肚子拉空了！一小時只能拉 5 次，除非去商城買瀉藥觸發水便。');
                        }
                        
                        isWatery = false;
                        newBonus = 0;
                        alertMsg = '💩 成功在好友家偷偷拉了一坨大便！';
                    }

                    // 無論是否為水便，都記錄時間戳 (水便也算在每小時次數內)
                    const finalRecentPoops = (mcData.poopTimestamps || []).filter(t => t > oneHourAgo);

                    const itemData = { 
                        type: 'poop', 
                        fromUid: user.uid, 
                        fromName: userProfile.displayName, 
                        isWatery: isWatery // 標記是否為水便
                    };
                    
                    // 更新本地狀態和 DB (增加噁心警示)
                    updateMcData({ 
                        poopTimestamps: [...finalRecentPoops, now],
                        laxativeBonus: newBonus
                    }, true);
                    
                    showAlert(alertMsg);

                    // --- 同步到 DB 的邏輯 (與原本相同，確保 itemData 包含 isWatery) ---
                    setFriendSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: itemData } }));
                    
                    window.db.collection('users').doc(viewingFriend.uid).get().then(doc => {
                        const dbSpecials = doc.data()?.mcData[`specials_${currentDimension}`] || {};
                        dbSpecials[index] = itemData;
                        window.db.collection('users').doc(viewingFriend.uid).update({ [`mcData.specials_${currentDimension}`]: dbSpecials });
                    });
                    
                    const newHotbar = [...hotbar];
                    newHotbar[activeHotbarIndex] = null;
                    setHotbar(newHotbar);
                    return;
                }
            }

            // 屋主互動
            if (hasSpecial) {
                // ✨ 將地圖上的禮物自動存入收件箱 (保存1天)
                if (['photo_map', 'poop', 'poppy', 'gift_box', 'sign'].includes(hasSpecial.type) && isViewingSelf) {
                    const newInbox = [...(mcData.inbox || [])];
                    const now = Date.now();
                    newInbox.push({
                        ...hasSpecial,
                        id: now + Math.random().toString(), // 賦予唯一ID
                        collectedAt: now,
                        expiresAt: now + 24 * 60 * 60 * 1000 // 一天後過期
                    });
                    
                    // 從地圖移除
                    const newSpecials = { ...specials };
                    newSpecials[currentDimension] = { ...specials[currentDimension] };
                    delete newSpecials[currentDimension][index];
                    setSpecials(newSpecials);
                    removeSpecialFromDB(user.uid, currentDimension, index);
                    
                    updateMcData({ inbox: newInbox }, true);
                    return showAlert(`📥 物品已自動存入「收件箱」(保存 1 天)！\n請點擊商店上方的收件箱按鈕查看或清理。`);
                }
            }

            // 開關門邏輯 (互動模式)
            if (currentFg && (currentFg.endsWith('_door') || currentFg.endsWith('_trapdoor'))) {
                const currentOpen = hasSpecial?.open || false;
                const isDoor = !currentFg.endsWith('_trapdoor');
                
                const updateDoorSpecials = (prev) => {
                    const newSpec = { ...prev };
                    newSpec[currentDimension] = { ...newSpec[currentDimension] }; // 深層拷貝
                    if (isDoor) {
                        const isTop = hasSpecial?.half === 'top';
                        const topIdx = isTop ? index : index - activeCols;
                        const botIdx = isTop ? index + activeCols : index;
                        if(botIdx >= 0 && botIdx < TOTAL_CELLS) newSpec[currentDimension][botIdx] = { ...newSpec[currentDimension][botIdx], open: !currentOpen };
                        if(topIdx >= 0 && topIdx < TOTAL_CELLS) newSpec[currentDimension][topIdx] = { ...newSpec[currentDimension][topIdx], open: !currentOpen };
                    } else {
                        newSpec[currentDimension][index] = { ...newSpec[currentDimension][index], open: !currentOpen };
                    }
                    return newSpec;
                };

                if (isViewingSelf) { setSpecials(updateDoorSpecials); setHasUnsavedChanges(true); } 
                else setFriendSpecials(updateDoorSpecials);
                
                const doorAudio = new Audio(!currentOpen ? 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/door_open.mp3' : 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/door_close.mp3');
                doorAudio.volume = 0.6;
                doorAudio.play().catch(e => {});
                return;
            }

            if (currentFg === 'chest_block') {
                if (isViewingSelf) { setChestUi({ index, inventory: hasSpecial?.items || {} }); playChestOpenSound(); } 
                else showAlert('🔒 這是私人的儲物箱，上了鎖你打不開！');
                return;
            }
            return;
        }

        // --- 建築模式邏輯 (僅自己家) ---
        if (!isViewingSelf) return;

        const newInv = { ...localInventory };
        
        const removeFromHotbarIfEmpty = (inv, block) => {
            if ((inv[block] || 0) <= 0) {
                const newHotbar = [...hotbar];
                for (let i = 0; i < newHotbar.length; i++) {
                    if (newHotbar[i] === block) newHotbar[i] = null;
                }
                setHotbar(newHotbar);
            }
        };

        // --- 處理背景牆模式 (Background) ---
        if (buildLayer === 'background') {
            if (!selectedBlock) return;
            if (currentBg === selectedBlock && selectedBlock !== 'erase') return;
            const newBgGrid = [...bgGrids[currentDimension]];

            if (selectedBlock !== 'erase') {
                if ((newInv[selectedBlock] || 0) <= 0) return showAlert(`❌ 庫存不足，請先購買！`);
                newInv[selectedBlock] -= 1;
                removeFromHotbarIfEmpty(newInv, selectedBlock);
                newBgGrid[index] = selectedBlock;
                playBlockSound(selectedBlock, 'place');
            } else {
                if (currentBg) playBlockSound(currentBg, 'break');
                newBgGrid[index] = null;
            }

            if (currentBg && currentBg !== 'erase') newInv[currentBg] = (newInv[currentBg] || 0) + 1;
            setBgGrids({ ...bgGrids, [currentDimension]: newBgGrid });
            setLocalInventory(newInv); setHasUnsavedChanges(true);
            return;
        }

        // --- 處理前景實體模式 (Foreground) ---
        // ✨ 修改：若 selectedBlock === 'erase' (鐵鎬)，會跳過互動翻轉，直接進入下方的拆除邏輯
        if (currentFg && selectedBlock !== 'erase') {
            if (currentFg.includes('_log')) {
                setSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: { type: 'rotation', rotation: (hasSpecial?.rotation || 0) === 0 ? 90 : 0 } } }));
                playBlockSound(currentFg, 'place'); setHasUnsavedChanges(true); return;
            }
            if (currentFg.includes('_slab')) {
                setSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: { type: 'rotation', position: (hasSpecial?.position || 'bottom') === 'bottom' ? 'top' : 'bottom' } } }));
                playBlockSound(currentFg, 'place'); setHasUnsavedChanges(true); return;
            }
            if (currentFg.includes('_stairs')) {
                const seq = ['bottom-right', 'bottom-left', 'top-left', 'top-right'];
                setSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: { type: 'rotation', rotation: seq[(seq.indexOf(hasSpecial?.rotation || 'bottom-right') + 1) % 4] } } }));
                playBlockSound(currentFg, 'place'); setHasUnsavedChanges(true); return;
            }
            // 門的方向切換 (向左開 / 向右開)
            if (currentFg.endsWith('_door') && !currentFg.endsWith('_trapdoor')) {
                const isTop = hasSpecial?.half === 'top';
                const topIdx = isTop ? index : index - cols;
                const botIdx = isTop ? index + cols : index;
                const newHinge = (hasSpecial?.hinge || 'left') === 'left' ? 'right' : 'left';
                
                setSpecials(prev => {
                    const newSpec = { ...prev };
                    newSpec[currentDimension] = { ...newSpec[currentDimension] };
                    if(botIdx >= 0 && botIdx < TOTAL_CELLS) newSpec[currentDimension][botIdx] = { ...newSpec[currentDimension][botIdx], hinge: newHinge };
                    if(topIdx >= 0 && topIdx < TOTAL_CELLS) newSpec[currentDimension][topIdx] = { ...newSpec[currentDimension][topIdx], hinge: newHinge };
                    return newSpec;
                });
                playBlockSound(currentFg, 'place'); 
                setHasUnsavedChanges(true); 
                return;
            }
            
            // 地板門：切換貼齊面 (底端、頂端、出紙面)
            if (currentFg.includes('_trapdoor')) {
                const facings = ['bottom', 'top', 'face']; 
                const currentFacing = hasSpecial?.facing || 'bottom';
                const nextFacing = facings[(facings.indexOf(currentFacing) + 1) % facings.length];
                
                setSpecials(prev => ({ 
                    ...prev, 
                    [currentDimension]: { 
                        ...prev[currentDimension], 
                        [index]: { ...hasSpecial, type: 'trapdoor', facing: nextFacing } 
                    } 
                }));
                playBlockSound(currentFg, 'place'); 
                setHasUnsavedChanges(true); 
                return;
            }
        }

        if (!selectedBlock) return;

        if (selectedBlock === 'erase' && currentFg === 'chest_block') {
            if (Object.values(hasSpecial?.items || {}).some(c => c > 0)) return showAlert('❌ 請先至「👀互動模式」將箱子裡的東西清空才能拆除！');
        }

        if (selectedBlock === 'sign') {
            if (hasSpecial) return showAlert('❌ 這裡已經有特殊機關或物品了，換個位子插吧！');
            if (Object.values(specials[currentDimension]).filter(s => s.type === 'sign').length >= 5) return showAlert('❌ 每個維度最多只能放 5 個告示牌！');
            if (mcData.diamonds < 10) return showAlert('💎 放置告示牌需要 10 鑽石！');
            return setSignModal({ index, isSelf: true, targetUid: user.uid });
        }

        if (currentFg === selectedBlock && selectedBlock !== 'erase') return; 

        // ✨ 確保 React State 能確實捕捉到所有變化，避免物件覆蓋 Bug
        const newFgGrid = [...grids[currentDimension]];
        const newSpecials = { ...specials, [currentDimension]: { ...specials[currentDimension] } }; 
        const isPlacingDoor = selectedBlock.endsWith('_door') && !selectedBlock.endsWith('_trapdoor');
        
        if (isPlacingDoor && selectedBlock !== 'erase') {
            if (index - cols < 0 || newFgGrid[index - cols] !== null) return showAlert('❌ 空間不足！木門需要上下兩格的空間！');
        }

        if (selectedBlock !== 'erase' && !['sign', 'poppy', 'gift_box'].includes(selectedBlock)) {
            if ((newInv[selectedBlock] || 0) <= 0) return showAlert(`❌ 庫存不足，請購買！`);
            newInv[selectedBlock] -= 1; 
            removeFromHotbarIfEmpty(newInv, selectedBlock);
        }

        // 拆除原方塊
        if (currentFg && currentFg !== 'erase') {
            const isRemovingDoor = currentFg.endsWith('_door') && !currentFg.endsWith('_trapdoor');
            newInv[currentFg] = (newInv[currentFg] || 0) + 1;
            
            if (isRemovingDoor) {
                // ✨ 修正門拆除邏輯：更嚴謹地透過 Grid 驗證確保兩半截都能順利被拆除
                let topIdx = index;
                let botIdx = index;
                if (hasSpecial?.half === 'top' || newFgGrid[index + cols] === currentFg) {
                    topIdx = index;
                    botIdx = index + cols;
                } else {
                    topIdx = index - cols;
                    botIdx = index;
                }
                
                if (topIdx >= 0 && newFgGrid[topIdx] === currentFg) { 
                    newFgGrid[topIdx] = null; 
                    delete newSpecials[currentDimension][topIdx]; 
                }
                if (botIdx < TOTAL_CELLS && newFgGrid[botIdx] === currentFg) { 
                    newFgGrid[botIdx] = null; 
                    delete newSpecials[currentDimension][botIdx]; 
                }
            } else {
                newFgGrid[index] = null; 
                delete newSpecials[currentDimension][index];
            }
        }

        if (selectedBlock !== 'erase') {
            newFgGrid[index] = selectedBlock;
            if (selectedBlock === 'chest_block') {
                newSpecials[currentDimension][index] = { type: 'chest', items: {} };
            } else if (isPlacingDoor) {
                newFgGrid[index] = selectedBlock; newFgGrid[index - cols] = selectedBlock;
                newSpecials[currentDimension][index] = { type: 'door', half: 'bottom', open: false, hinge: 'left' };
                newSpecials[currentDimension][index - cols] = { type: 'door', half: 'top', open: false, hinge: 'left' };
            } else if (selectedBlock.includes('_trapdoor')) {
                // 初始化地板門
                newSpecials[currentDimension][index] = { type: 'trapdoor', facing: 'bottom', open: false };
            } else {
                delete newSpecials[currentDimension][index];
            }
            playBlockSound(selectedBlock, 'place');
        } else {
            if (currentFg) playBlockSound(currentFg, 'break');
            if (hasSpecial?.type === 'sign') removeSpecialFromDB(user.uid, currentDimension, index);
        }

        setGrids({ ...grids, [currentDimension]: newFgGrid });
        setSpecials(newSpecials);
        setLocalInventory(newInv);
        setHasUnsavedChanges(true); 
    };

    const handleChestItemTransfer = (blockId, direction) => {
        const { index } = chestUi;
        const chestItems = { ...(specials[currentDimension][index]?.items || {}) };
        const currentLocal = { ...localInventory };

        if (direction === 'toChest') {
            if (!currentLocal[blockId] || currentLocal[blockId] <= 0) return;
            currentLocal[blockId] -= 1; chestItems[blockId] = (chestItems[blockId] || 0) + 1;
        } else {
            if (!chestItems[blockId] || chestItems[blockId] <= 0) return;
            chestItems[blockId] -= 1; currentLocal[blockId] = (currentLocal[blockId] || 0) + 1;
        }

        setLocalInventory(currentLocal);
        setSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: { ...prev[currentDimension][index], type: 'chest', items: chestItems } } }));
        setHasUnsavedChanges(true);
    };

    const handleDragStart = (e, type, idOrIdx) => {
        e.dataTransfer.setData('type', type);
        if (type === 'inventory') e.dataTransfer.setData('blockId', idOrIdx);
        else if (type === 'hotbar') e.dataTransfer.setData('sourceIdx', idOrIdx);
        
        const imgNode = e.target.querySelector('img');
        if (imgNode) e.dataTransfer.setDragImage(imgNode, 16, 16);
    };

    const handleInventoryDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const type = e.dataTransfer.getData('type');
        if (type === 'hotbar') {
            const srcIdx = parseInt(e.dataTransfer.getData('sourceIdx'));
            const newHotbar = [...hotbar];
            newHotbar[srcIdx] = null; 
            setHotbar(newHotbar);
        }
    };

    const handleHotbarDrop = (e, dropIdx) => {
        e.preventDefault();
        e.stopPropagation(); 
        const type = e.dataTransfer.getData('type');
        const blockId = e.dataTransfer.getData('blockId');
        
        const newHotbar = [...hotbar];
        if (type === 'inventory') {
            const existingIdx = newHotbar.indexOf(blockId);
            if (existingIdx !== -1) newHotbar[existingIdx] = null;
            newHotbar[dropIdx] = blockId;
        } else if (type === 'hotbar') {
            const srcIdx = parseInt(e.dataTransfer.getData('sourceIdx'));
            const temp = newHotbar[dropIdx];
            newHotbar[dropIdx] = newHotbar[srcIdx];
            newHotbar[srcIdx] = temp;
        }
        setHotbar(newHotbar);
        setActiveHotbarIndex(dropIdx);
    };

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
            await window.db.collection('users').doc(targetUid).update({ [`mcData.specials_${currentDimension}`]: dbSpecials });
            
            if (isSelf) { 
                setSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: signData } })); 
                setHasUnsavedChanges(true); 
            } else {
                setFriendSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: signData } }));
                showAlert('✅ 成功在好友家留下告示牌！');
            }
        } catch(e) {
            console.error(e);
        }
        setSignModal(null);
    };

    const handleSave = () => {
        setIsSaving(true);
        window.db.collection('users').doc(user.uid).update({
            'mcData.sandbox_overworld': grids.overworld, 'mcData.sandbox_nether': grids.nether, 'mcData.sandbox_end': grids.end,
            'mcData.sandbox_bg_overworld': bgGrids.overworld, 'mcData.sandbox_bg_nether': bgGrids.nether, 'mcData.sandbox_bg_end': bgGrids.end,
            'mcData.specials_overworld': specials.overworld, 'mcData.specials_nether': specials.nether, 'mcData.specials_end': specials.end,
            'mcData.inventory': localInventory, 'mcData.sandbox_hotbar': hotbar, 'mcData.sandbox_cols': cols
        }).then(() => {
            showAlert("✅ 建築、背景、領地擴張與快捷欄皆已儲存！");
            updateMcData({ 
                sandbox_overworld: grids.overworld, sandbox_nether: grids.nether, sandbox_end: grids.end,
                sandbox_bg_overworld: bgGrids.overworld, sandbox_bg_nether: bgGrids.nether, sandbox_bg_end: bgGrids.end,
                specials_overworld: specials.overworld, specials_nether: specials.nether, specials_end: specials.end,
                inventory: localInventory, sandbox_hotbar: hotbar, sandbox_cols: cols
            }, true); 
            setHasUnsavedChanges(false);
        }).finally(() => setIsSaving(false));
    };

    const handleQuit = () => {
        if (hasUnsavedChanges) setShowQuitConfirm(true); 
        else onQuit();
    };

    const handlePhotoFilesSelected = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return showAlert('❌ 請選擇圖片檔案！');
        if (file.size > 5 * 1024 * 1024) return showAlert('❌ 圖片太大了，請選擇 5MB 以下的圖片！');
        if (!window.currentPhotoTarget) return;

        try {
            const { index, targetUid } = window.currentPhotoTarget;
            
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
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
                    
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                    
                    if (compressedBase64.length > 500000) {
                        return showAlert('❌ 圖片壓縮後依然過大，請選擇更小的圖片或降低解析度！');
                    }

                    const today = new Date().toISOString().split('T')[0];
                    const currentPhotoLog = mcData.photoSentLog?.date === today ? mcData.photoSentLog : { date: today, count: 0 };

                    updateMcData({ 
                        diamonds: mcData.diamonds - 50,
                        photoSentLog: { date: today, count: currentPhotoLog.count + 1 }
                    }, true);

                    const photoData = { 
                        type: 'photo_map',
                        img: compressedBase64,
                        fromUid: user.uid, 
                        fromName: userProfile.displayName,
                        sentAt: Date.now()
                    };
                    
                    setFriendSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: photoData } }));
                    
                    const doc = await window.db.collection('users').doc(targetUid).get();
                    const dbSpecials = doc.data()?.mcData[`specials_${currentDimension}`] || {};
                    dbSpecials[index] = photoData;
                    await window.db.collection('users').doc(targetUid).update({ [`mcData.specials_${currentDimension}`]: dbSpecials });

                    showAlert('📸 照片已成功寄出！將以「地圖」形式出現在好友家。');
                    window.currentPhotoTarget = null; 
                    e.target.value = ''; 
                };
            };
        } catch (err) {
            console.error(err);
            showAlert('❌ 寄送照片時發生錯誤。');
        }
    };

    const triggerPhotoUpload = (index, targetUid) => {
        window.currentPhotoTarget = { index, targetUid };
        photoInputRef.current.click();
    };

    const handleConfirmBuy = () => {
        const amt = parseInt(buyModal.amount);
        if (isNaN(amt) || amt <= 0) return showAlert("數量無效！");
        const totalCost = buyModal.block.price * amt;
        if (mcData.diamonds < totalCost) return showAlert("💎 鑽石不足！");

        const newInv = { ...localInventory, [buyModal.block.id]: (localInventory[buyModal.block.id] || 0) + amt };
        setLocalInventory(newInv); updateMcData({ diamonds: mcData.diamonds - totalCost, inventory: newInv }, true);
        showAlert(`✅ 購買成功！已放入左側庫存中。`); setBuyModal(null);
    };

    const displayedBlocks = BLOCK_TYPES.filter(b => {
        if (b.special || b.id === 'erase') return false; 
        if (activeCategory === '全部') return true;
        if (activeCategory === '地獄(需解鎖)') return b.cat === '地獄(需解鎖)' && mcData.unlockedNether;
        if (activeCategory === '末地(需解鎖)') return b.cat === '末地(需解鎖)' && mcData.unlockedEnd;
        return b.cat === activeCategory;
    });

    return (
<div className="fixed inset-0 z-[80] bg-stone-800 bg-opacity-90 flex flex-col items-center p-2 sm:p-4 animate-in fade-in select-none overflow-y-auto overflow-x-hidden custom-scrollbar">
    <div className="p-2 border-4 border-gray-600 rounded-2xl w-full max-w-7xl relative shadow-2xl flex flex-col md:flex-row my-auto h-auto min-h-[90dvh] md:h-[90dvh] shrink-0" style={{ backgroundColor: DIMENSIONS[currentDimension].bg }}>
                
                {showQuitConfirm && (
                    <div className="fixed inset-0 bg-stone-800 bg-opacity-75 flex items-center justify-center z-[100]">
                        <div className="bg-stone-800 border-4 border-red-600 p-6 rounded-lg shadow-2xl max-w-sm text-center transform scale-100 animate-pulse-once">
                            <div className="text-red-500 text-5xl mb-4">⚠️</div>
                            <h2 className="text-white font-black text-xl mb-2">尚未儲存！</h2>
                            <p className="text-gray-300 text-sm mb-6">你有未儲存的建築或擴張進度。<br />現在退出將會<span className="text-red-400 font-bold">永久遺失</span>剛剛的變更！</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setShowQuitConfirm(false)} className="px-4 py-2 bg-gray-600 text-white font-bold rounded hover:bg-gray-500 transition-colors">取消</button>
                                <button onClick={onQuit} className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-500 transition-colors shadow-lg">忍痛退出</button>
                            </div>
                        </div>
                    </div>
                )}

                {visitorLogOpen && (
                    <div className="fixed inset-0 z-[150] bg-stone-800 bg-opacity-70 flex flex-col items-center justify-center p-4">
                        <div className="bg-[#333] border-4 border-gray-600 p-4 w-full max-w-md shadow-2xl flex flex-col h-[60dvh]">
                            <div className="flex justify-between items-center mb-4 border-b-2 border-gray-600 pb-2">
                                <h3 className="text-white font-bold text-lg">👣 基地到訪與留言紀錄</h3>
                                <button onClick={() => setVisitorLogOpen(false)} className="text-red-400 hover:text-red-300 font-bold">✖ 關閉</button>
                            </div>
                            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2">
                                {(!mcData.visitorLog || mcData.visitorLog.length === 0) ? (
                                    <p className="text-gray-400 text-center text-sm mt-10">尚無訪客紀錄，多邀請好友來參觀吧！</p>
                                ) : (
                                    mcData.visitorLog.map((log, i) => (
                                        <div key={i} className="bg-stone-800 p-3 border-l-4 border-amber-500 flex flex-col justify-center">
                                            <div className="flex justify-between items-center">
                                                <span className="text-amber-300 font-bold text-sm">{log.name} <span className="text-gray-400 font-normal">{log.msg ? '留下了告示牌' : '來訪了'}</span></span>
                                                <span className="text-gray-500 text-xs">{new Date(log.time).toLocaleString('zh-TW', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            {log.msg && (
                                                <p className="text-gray-200 mt-2 text-sm bg-stone-800 bg-opacity-30 p-2 rounded border border-stone-700">
                                                    「{log.msg}」
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {showInbox && (
                    <div className="fixed inset-0 z-[150] bg-stone-800 bg-opacity-80 flex flex-col items-center justify-center p-4">
                        <div className="bg-[#333] border-4 border-gray-600 p-4 w-full max-w-lg shadow-2xl flex flex-col h-[70dvh]">
                            <div className="flex justify-between items-center mb-4 border-b-2 border-gray-600 pb-2">
                                <h3 className="text-white font-bold text-lg">📥 收件箱 (保存1天)</h3>
                                <button onClick={() => setShowInbox(false)} className="text-red-400 hover:text-red-300 font-bold">✖ 關閉</button>
                            </div>
                            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2">
                                {(!mcData.inbox || mcData.inbox.filter(i => i.expiresAt > Date.now()).length === 0) ? (
                                    <p className="text-gray-400 text-center text-sm mt-10">收件箱是空的喔！</p>
                                ) : (
                                    mcData.inbox.filter(i => i.expiresAt > Date.now()).map(item => (
                                        <div key={item.id} className="bg-stone-800 p-3 border-l-4 border-amber-500 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                {item.type === 'poop' && <span className="text-2xl">💩</span>}
                                                {item.type === 'poppy' && <span className="text-2xl">🌺</span>}
                                                {item.type === 'gift_box' && <span className="text-2xl">🎁</span>}
                                                {item.type === 'sign' && <span className="text-2xl">📜</span>}
                                                {item.type === 'photo_map' && <span className="text-2xl">📸</span>}
                                                <div>
                                                    <p className="text-white font-bold text-sm">來自: {item.fromName}</p>
                                                    <p className="text-gray-400 text-xs">剩下 {Math.ceil((item.expiresAt - Date.now())/3600000)} 小時過期</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {item.type === 'photo_map' && (
                                                    <button onClick={() => handleInboxAction(item, 'view')} className="bg-amber-600 text-white px-2 py-1 text-xs font-bold rounded">查看</button>
                                                )}
                                                {item.type === 'sign' && (
                                                    <button onClick={() => handleInboxAction(item, 'read')} className="bg-amber-600 text-white px-2 py-1 text-xs font-bold rounded">閱讀</button>
                                                )}
                                                {item.type === 'gift_box' && (
                                                    <button onClick={() => handleInboxAction(item, 'open')} className="bg-emerald-600 text-white px-2 py-1 text-xs font-bold rounded">打開</button>
                                                )}
                                                {item.type === 'poppy' && (
                                                    <button onClick={() => handleInboxAction(item, 'claim')} className="bg-stone-600600 text-white px-2 py-1 text-xs font-bold rounded">領3💎</button>
                                                )}
                                                <button onClick={() => handleInboxAction(item, 'delete')} className="bg-red-600 text-white px-2 py-1 text-xs font-bold rounded">丟棄</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <input 
                    type="file" 
                    ref={photoInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                    onChange={handlePhotoFilesSelected}
                />

                {specialBlockModal?.type === 'photo_view' && (
                    <div className="fixed inset-0 z-[140] bg-stone-800 bg-opacity-90 flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in select-text">
                        <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] p-3 w-full max-w-4xl shadow-2xl relative flex flex-col h-[90vh]">
                            
                            <div className="flex justify-between items-center mb-2 px-1 border-b-2 border-gray-400 pb-1 shrink-0">
                                <div>
                                    <h3 className="text-[#373737] font-bold text-lg inline-block">📸 來自 {specialBlockModal.from} 的私人照片</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a 
                                        href={specialBlockModal.data} 
                                        download={`photo_from_${specialBlockModal.from}.jpg`}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded text-sm shadow border border-black"
                                    >
                                        📥 下載
                                    </a>
                                    <button onClick={() => setSpecialBlockModal(null)} className="text-red-600 font-black text-xl hover:scale-110">✖</button>
                                </div>
                            </div>

                            <div className="flex-grow bg-stone-800 p-1 border-2 border-[#373737] shadow-inner overflow-auto custom-scrollbar flex items-center justify-center">
                                <img 
                                    src={specialBlockModal.data} 
                                    alt="Sent private photo"
                                    className="pixelated max-w-none transition-transform duration-200 origin-center"
                                    style={{ transform: `scale(${window.tempPhotoScale || 1})` }}
                                    onWheel={(e) => {
                                        e.preventDefault();
                                        if (!window.tempPhotoScale) window.tempPhotoScale = 1;
                                        const newScale = e.deltaY > 0 ? window.tempPhotoScale * 0.9 : window.tempPhotoScale * 1.1;
                                        window.tempPhotoScale = Math.max(0.5, Math.min(3, newScale));
                                        e.target.style.transform = `scale(${window.tempPhotoScale})`;
                                    }}
                                />
                            </div>
                            
                            <p className="text-[#373737] font-bold text-center text-xs mt-2 shrink-0">提示：使用滑鼠滾輪可縮放圖片大小。</p>
                        </div>
                    </div>
                )}

                {confirmDialog && (
                    <div className="fixed inset-0 bg-stone-800 bg-opacity-80 flex items-center justify-center z-[120]">
                        <div className="bg-stone-800 border-4 border-gray-600 p-6 rounded-lg shadow-2xl max-w-sm text-center transform scale-100 animate-in zoom-in">
                            <h2 className="text-white font-black text-xl mb-2">{confirmDialog.title}</h2>
                            <p className="text-amber-400 font-bold text-sm mb-6 whitespace-pre-line">{confirmDialog.desc}</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 bg-gray-600 text-white font-bold hover:bg-gray-500 border border-black shadow-lg">考慮一下</button>
                                <button onClick={() => { confirmDialog.action(); setConfirmDialog(null); }} className="px-4 py-2 bg-emerald-600 text-white font-bold hover:bg-emerald-500 border border-black shadow-lg">確認花費 {confirmDialog.cost} 💎</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-none md:flex-1 flex flex-col items-center p-1 md:p-2 w-full md:w-3/4 relative h-[65vh] md:h-full shrink-0">
                    
                    <div className="w-full flex flex-col xl:flex-row justify-between items-start xl:items-center mb-2 bg-stone-800 bg-opacity-60 p-2 text-white font-bold gap-2 z-10 shrink-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span>{isViewingSelf ? `🏠 我的基地` : `👀 ${viewingFriend.name} 的家`}</span>
                            
                            <select onChange={(e) => setCurrentDimension(e.target.value)} value={currentDimension} className="bg-stone-800 text-white border border-gray-500 px-2 py-1 outline-none text-sm font-bold cursor-pointer">
                                <option value="overworld">🌍 主世界</option>
                                {(isViewingSelf ? mcData.unlockedNether : (viewingFriend?.mcData?.unlockedNether)) && <option value="nether">🔥 地獄</option>}
                                {(isViewingSelf ? mcData.unlockedEnd : (viewingFriend?.mcData?.unlockedEnd)) && <option value="end">🌌 末地</option>}
                            </select>

                            {isViewingSelf && !mcData.unlockedNether && (
                                <button 
                                    onClick={() => setConfirmDialog({ 
                                        title: '🔥 解鎖地獄', 
                                        desc: '確定要花費 1000 💎 解鎖充滿熔岩與危險的地獄維度嗎？', 
                                        cost: 1000, 
                                        action: () => { 
                                            if (mcData.diamonds < 1000) return showAlert('💎 鑽石不足，無法解鎖地獄！');
                                            updateMcData({ diamonds: mcData.diamonds - 1000, unlockedNether: true }, true); 
                                            showAlert('🎉 解鎖地獄！'); 
                                        } 
                                    })} 
                                    className="bg-red-800 hover:bg-red-700 text-white text-[10px] px-2 py-1 border border-red-400"
                                >
                                    🔓解鎖地獄(1000💎)
                                </button>
                            )}

                            {isViewingSelf && !mcData.unlockedEnd && (
                                <button 
                                    onClick={() => setConfirmDialog({ 
                                        title: '🌌 解鎖末地', 
                                        desc: '確定要花費 2000 💎 解鎖充滿紫頌花與神秘的末地維度嗎？', 
                                        cost: 2000, 
                                        action: () => { 
                                            if (mcData.diamonds < 2000) return showAlert('💎 鑽石不足，無法解鎖末地！');
                                            updateMcData({ diamonds: mcData.diamonds - 2000, unlockedEnd: true }, true); 
                                            showAlert('🎉 解鎖末地！'); 
                                        } 
                                    })} 
                                    className="bg-amber-700800 hover:bg-amber-700700 text-white text-[10px] px-2 py-1 border border-amber-700400"
                                >
                                    🔓解鎖末地(2000💎)
                                </button>
                            )}
                            {isViewingSelf && (
                                <div className="flex items-center space-x-2">
                                    <div className="flex bg-stone-800 border border-gray-600 rounded overflow-hidden">
                                        <button onClick={() => setIsBuildMode(false)} className={`px-2 py-1 text-xs ${!isBuildMode ? 'bg-amber-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>👀 查看互動</button>
                                        <button onClick={() => { setIsBuildMode(true); setBuildLayer('foreground'); }} className={`px-2 py-1 text-xs ${isBuildMode ? 'bg-amber-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>🔨 建築</button>
                                    </div>
                                    
                                    {isBuildMode && (
                                        <div className="flex bg-stone-800 border border-gray-600 rounded overflow-hidden ml-1">
                                            <button onClick={() => setBuildLayer('foreground')} className={`px-2 py-1 text-xs ${buildLayer === 'foreground' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>🧱 前景</button>
                                            <button onClick={() => setBuildLayer('background')} className={`px-2 py-1 text-xs ${buildLayer === 'background' ? 'bg-[#5c4033] text-white' : 'text-gray-400 hover:bg-gray-700'}`}>🖼️ 背景</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select onChange={handleViewChange} className="bg-amber-900 text-white border border-amber-500 px-2 py-1 outline-none text-sm font-bold cursor-pointer">
                                <option value="self">🏠 回到我的家</option>
                                {(userProfile.friends || []).map(f => <option key={f.uid} value={f.uid}>👀 去 {f.name} 家</option>)}
                            </select>
                            {isViewingSelf && <button onClick={() => setVisitorLogOpen(true)} className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 border border-white font-bold text-sm transition-colors shadow-md">👣 紀錄</button>}
                            <button onClick={handleQuit} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 border border-white font-black text-sm transition-colors shadow-lg">✖ 退出</button>
                        </div>
                    </div>

                    {/* ✨ 修改畫布的包裹容器，加入縮放按鈕並且移除 transform */}
                    <div className="w-full flex-grow relative border-2 border-black overflow-hidden flex flex-col bg-stone-800">
                        <div className="absolute top-2 right-2 z-40 flex flex-col gap-2">
                            <button 
                                onClick={() => { let n = Math.min(mapScale + 0.25, 3); setMapScale(n); mapScaleRef.current = n; }} 
                                className="bg-[#8b8b8b] text-white w-10 h-10 font-black border-2 border-[#FCFBF7] border-r-[#373737] border-b-[#373737] hover:bg-[#a0a0a0] shadow-lg flex items-center justify-center text-xl active:border-t-[#373737] active:border-l-[#373737] active:border-r-white active:border-b-white cursor-pointer"
                            >➕</button>
                            <button 
                                onClick={() => { let n = Math.max(mapScale - 0.25, 1); setMapScale(n); mapScaleRef.current = n; }} 
                                className="bg-[#8b8b8b] text-white w-10 h-10 font-black border-2 border-[#FCFBF7] border-r-[#373737] border-b-[#373737] hover:bg-[#a0a0a0] shadow-lg flex items-center justify-center text-xl active:border-t-[#373737] active:border-l-[#373737] active:border-r-white active:border-b-white cursor-pointer"
                            >➖</button>
                        </div>
                        
                        <div ref={mapContainerRef} className="w-full h-full overflow-auto custom-scrollbar p-1 relative flex">
                            {isViewingSelf && (
                                <button onClick={() => requestExpand('left')} className="sticky left-0 top-0 bottom-0 w-8 flex-shrink-0 bg-stone-800 bg-opacity-60 hover:bg-opacity-80 text-white font-black z-20 flex items-center justify-center border-r border-gray-600 transition-all">➕</button>
                            )}
                            
                            {/* ✨ 替換原先的 scale，使用 height 搭配 aspect-ratio 做原生擴縮，解決浮動問題 */}
                            <div className="grid grid-origin bg-opacity-90 shrink-0" 
                                style={{      
                                    backgroundColor: DIMENSIONS[currentDimension].bg,      
                                    gridTemplateColumns: `repeat(${activeCols}, 1fr)`,
                                    gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                                    height: `${mapScale * 100}%`,
                                    aspectRatio: `${activeCols} / ${ROWS}` 
                                }}>
                                {activeGrid.map((fgCellId, i) => {
                                    const bgCellId = activeBgGrid[i];
                                    const fgInfo = BLOCK_TYPES.find(b => b.id === fgCellId);
                                    const bgInfo = BLOCK_TYPES.find(b => b.id === bgCellId);
                                    const specialInfo = activeSpecials[i];
                                    
                                    let fgStyle = { width: '100%', height: '100%' };
                                    let fgImgSrc = fgInfo?.img;
                                    let bgImgSrc = bgInfo?.img;
                                    
                                    if (fgCellId) {
                                        if (fgCellId.includes('_log') && specialInfo?.rotation) fgStyle.transform = `rotate(${specialInfo.rotation}deg)`;
                                        else if (fgCellId.includes('_slab')) fgStyle.clipPath = (specialInfo?.position || 'bottom') === 'bottom' ? 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)' : 'polygon(0 0, 100% 0, 100% 50%, 0 50%)';
                                        else if (fgCellId.includes('_stairs')) {
                                            const rot = specialInfo?.rotation || 'bottom-right';
                                            if (rot === 'bottom-right') fgStyle.clipPath = 'polygon(0 50%, 50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%)';
                                            else if (rot === 'bottom-left') fgStyle.clipPath = 'polygon(0 0, 50% 0, 50% 50%, 100% 50%, 100% 100%, 0 100%)';
                                            else if (rot === 'top-right') fgStyle.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 50% 100%, 50% 50%, 0 50%)';
                                            else if (rot === 'top-left') fgStyle.clipPath = 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)';
                                        } else if (fgCellId.endsWith('_door') && !fgCellId.endsWith('_trapdoor')) {
                                            fgImgSrc = `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${fgCellId.split('_door')[0]}_door_${specialInfo?.half || 'bottom'}.png`;
                                            const hinge = specialInfo?.hinge || 'left';
                                            
                                            if (hinge === 'left') {
                                                fgStyle.transformOrigin = 'left'; 
                                                fgStyle.transform = specialInfo?.open ? 'scaleX(0.2)' : 'none';
                                            } else {
                                                if (specialInfo?.open) {
                                                    fgStyle.transformOrigin = 'right';
                                                    fgStyle.transform = 'scaleX(0.2)'; 
                                                } else {
                                                    fgStyle.transformOrigin = 'center';
                                                    fgStyle.transform = 'scaleX(-1)'; 
                                                }
                                            }
                                        } else if (fgCellId.includes('_trapdoor')) {
                                            const facing = specialInfo?.facing || 'bottom'; 
                                            const isOpen = specialInfo?.open || false;

                                            if (facing === 'bottom') {
                                                fgStyle.clipPath = isOpen ? 'polygon(0 0, 20% 0, 20% 100%, 0 100%)' : 'polygon(0 80%, 100% 80%, 100% 100%, 0 100%)';
                                            } else if (facing === 'top') {
                                                fgStyle.clipPath = isOpen ? 'polygon(0 0, 20% 0, 20% 100%, 0 100%)' : 'polygon(0 0, 100% 0, 100% 20%, 0 20%)';
                                            } else if (facing === 'face') {
                                                fgStyle.clipPath = isOpen ? 'polygon(0 0, 100% 0, 100% 20%, 0 20%)' : 'none'; 
                                            }
                                        }
                                    }

                                    return (
                                        <div 
                                            key={i} onPointerDown={(e) => { handleCellClick(i); }} onPointerEnter={(e) => { if (e.buttons === 1) handleCellClick(i); }} 
                                            className={`w-full aspect-square relative cursor-crosshair ${(!fgCellId && !bgCellId) ? 'border-[0.5px] border-black border-opacity-20 hover:bg-[#FCFBF7] hover:bg-opacity-30' : ''}`}
                                            style={{ touchAction: 'pan-x pan-y' }}
                                        >
                                            {bgImgSrc && (
                                                <div className="absolute inset-0 pointer-events-none" style={{ filter: 'brightness(0.4) saturate(0.8)' }}>
                                                    <McImg src={bgInfo?.img} className="w-full h-full object-cover pixelated" />
                                                </div>
                                            )}
                                            {fgImgSrc && (
                                                <div className="absolute inset-0 transition-all duration-200 pointer-events-none" style={fgStyle}>
                                                    <McImg src={fgImgSrc} className="w-full h-full object-cover pixelated drop-shadow-sm" />
                                                </div>
                                            )}
                                            {specialInfo?.type === 'sign' && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/oak_sign.png" className="w-1/2 h-1/2 pixelated drop-shadow-md animate-bounce" /></div>}
                                            {specialInfo?.type === 'poppy' && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/poppy.png" className="w-1/2 h-1/2 pixelated drop-shadow-md animate-bounce" /></div>}
{specialInfo?.type === 'poop' && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    {specialInfo.isWatery ? (
                                                        // 水便的噁心視覺效果：較大、綠褐色調、半透明、滲出感
                                                        <McImg 
                                                            src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/mud.png" 
                                                            className="w-2/3 h-2/3 pixelated drop-shadow-xl opacity-90 sepia hue-rotate-[70deg] contrast-125 animate-pulse" // 加上 sepia 和 hue-rotate 讓它變黃綠色，animate-pulse 讓它有呼吸感
                                                            style={{ imageRendering: 'pixelated' }}
                                                        />
                                                    ) : (
                                                        // 普通大便
                                                        <McImg 
                                                            src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/cocoa_beans.png"
                                                            className="w-1/2 h-1/2 pixelated drop-shadow-md animate-bounce" 
                                                        />
                                                    )}
                                                </div>
                                            )}                                           {specialInfo?.type === 'photo_map' && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/filled_map.png" className="w-1/2 h-1/2 pixelated drop-shadow-md animate-bounce" /></div>}
                                            {specialInfo?.type === 'gift_box' && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><McImg src="https://i.postimg.cc/bwPx54VC/Minecraft-Chest.jpg" className="w-3/4 h-3/4 pixelated drop-shadow-md animate-pulse" /></div>}
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {isViewingSelf && (
                                <button onClick={() => requestExpand('right')} className="sticky right-0 top-0 bottom-0 w-8 flex-shrink-0 bg-stone-800 bg-opacity-60 hover:bg-opacity-80 text-white font-black z-20 flex items-center justify-center border-l border-gray-600 transition-all">➕</button>
                            )}
                        </div>
                    </div>

                    <div className="w-full flex flex-col sm:flex-row justify-between items-center mt-3 gap-2 shrink-0">
                        {isViewingSelf && (
                            <button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges} className={`font-black px-6 py-2 border-2 shadow-lg w-full sm:w-auto ${hasUnsavedChanges ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-black animate-pulse' : 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed'}`}>
                                {isSaving ? '儲存中...' : (hasUnsavedChanges ? '💾 儲存進度' : '進度已儲存')}
                            </button>
                        )}
                        
                        <div className="flex justify-center space-x-[2px] p-[2px] bg-[#3a3a3a] border-4 border-[#222] shadow-2xl mx-auto">
                            {hotbar.map((blockId, idx) => {
                                const isActive = activeHotbarIndex === idx;
                                const bInfo = blockId ? BLOCK_TYPES.find(b => b.id === blockId) : null;
                                const count = blockId && !bInfo?.special ? localInventory[blockId] || 0 : '';
                                
                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => setActiveHotbarIndex(idx)}
                                        className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center relative cursor-pointer bg-[#8b8b8b] transition-all
                                            ${isActive ? 'border-4 border-white z-10 scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-2 border-[#555] hover:bg-[#a0a0a0]'}`}
                                    >
                                        {bInfo && <McImg src={bInfo.img} className="w-[80%] h-[80%] pixelated drop-shadow-md pointer-events-none" style={bInfo.storeStyle} />}
                                        {count !== '' && count > 0 && <span className="absolute bottom-0 right-[2px] text-white text-[10px] sm:text-xs font-black drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{count}</span>}
                                        <span className={`absolute top-0 left-[2px] text-[8px] font-black ${isActive?'text-amber-300':'text-gray-300'} drop-shadow-[1px_1px_0_rgba(0,0,0,1)]`}>{idx + 1}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

<div className="w-full h-auto md:h-full md:w-1/4 bg-[#333] p-2 md:p-3 flex flex-col border-t-4 md:border-t-0 md:border-l-4 border-stone-700 shrink-0 relative">
                    <h3 className="text-amber-400 font-bold border-b-2 border-gray-600 pb-2 mb-2 shrink-0 flex justify-between items-center">
                        <span>💰 方塊商店</span>
                        <span className="text-sm bg-stone-800 bg-opacity-50 px-2 py-1 rounded border border-gray-600 truncate">💎 {mcData.diamonds}</span>
                    </h3>

                    {isViewingSelf && (
                        <>
                            <button onClick={() => { playChestOpenSound(); setIsChestOpen(true); }} className="w-full bg-[#8b5a2b] hover:bg-[#a06830] border-2 border-[#3e2723] p-2 mb-2 rounded shadow-md flex items-center justify-center space-x-2 transition-colors shrink-0">
                                <McImg src="https://i.postimg.cc/bwPx54VC/Minecraft-Chest.jpg" className="w-6 h-6 pixelated drop-shadow-lg" fallback="📦" />
                                <span className="text-white font-bold text-sm">打開大背包 (裝備至快捷列)</span>
                            </button>
                            <button onClick={() => setShowInbox(true)} className="w-full bg-amber-600 hover:bg-amber-500 border-2 border-[#1e3a8a] p-2 mb-2 rounded shadow-md flex items-center justify-center space-x-2 transition-colors shrink-0">
                                <span className="text-white font-bold text-sm">📥 收件箱 ({(mcData.inbox || []).filter(i => i.expiresAt > Date.now()).length})</span>
                            </button>
                        </>
                    )}

                    {isViewingSelf ? (
                        <div className="flex flex-wrap gap-1 mb-2 shrink-0 border-b border-gray-600 pb-2">
                            {CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => setActiveCategory(cat)} className={`text-[10px] px-2 py-1 font-bold ${activeCategory === cat ? 'bg-amber-500 text-stone-800' : 'bg-gray-600 text-white hover:bg-gray-500'}`}>
                                    {cat.replace('(需解鎖)', '')}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-amber-900 bg-opacity-50 border border-amber-500 p-2 mb-2 shrink-0 flex flex-col gap-1">
                            <p className="text-xs text-amber-200 font-bold mb-1">參觀模式工具：</p>
                            
                            <button onClick={() => { 
                                const h = [...hotbar]; 
                                h[activeHotbarIndex] = null; 
                                setHotbar(h); 
                            }} className={`w-full py-1 text-xs font-bold border ${!selectedBlock ? 'bg-stone-100 border-white text-stone-800 shadow-inner' : 'bg-gray-700 text-gray-300 border-gray-500'}`}>🤚 空手</button>

                            <button onClick={() => { 
                                const h = [...hotbar]; 
                                const existingIdx = h.indexOf('poppy');
                                if (existingIdx !== -1) h[existingIdx] = null;
                                h[activeHotbarIndex] = 'poppy'; 
                                setHotbar(h); 
                            }} className={`w-full py-1 text-xs font-bold border ${selectedBlock === 'poppy' ? 'bg-rose-500 border-stone-600700 text-white' : 'bg-gray-700 text-gray-300 border-gray-500'}`}>🌺 送小花</button>
                            <button onClick={() => { 
                                const h = [...hotbar]; 
                                const existingIdx = h.indexOf('sign');
                                if (existingIdx !== -1) h[existingIdx] = null;
                                h[activeHotbarIndex] = 'sign'; 
                                setHotbar(h); 
                            }} className={`w-full py-1 text-xs font-bold border ${selectedBlock === 'sign' ? 'bg-amber-600 border-amber-800 text-white' : 'bg-gray-700 text-gray-300 border-gray-500'}`}>📜 留告示牌</button>
                            <button onClick={() => { 
                                const h = [...hotbar]; 
                                const existingIdx = h.indexOf('poop');
                                if (existingIdx !== -1) h[existingIdx] = null;
                                h[activeHotbarIndex] = 'poop'; 
                                setHotbar(h); 
                            }} className={`w-full py-1 text-xs font-bold border ${selectedBlock === 'poop' ? 'bg-amber-800 border-amber-950 text-white' : 'bg-gray-700 text-gray-300 border-gray-500'}`}>💩 放大便</button>
                            <button onClick={() => { 
                                const h = [...hotbar]; 
                                const existingIdx = h.indexOf('photo_map');
                                if (existingIdx !== -1) h[existingIdx] = null;
                                h[activeHotbarIndex] = 'photo_map'; 
                                setHotbar(h); 
                            }} className={`w-full py-1 text-xs font-bold border ${selectedBlock === 'photo_map' ? 'bg-emerald-600 border-emerald-800 text-white' : 'bg-gray-700 text-gray-300 border-gray-500'}`}>📸 寄照片 (50💎)</button>
                        </div>
                    )}

                    {isViewingSelf && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-1 md:overflow-y-auto custom-scrollbar pr-1 flex-grow content-start pb-4">
                            {(activeCategory === '全部' || activeCategory === '裝飾與植物') && BLOCK_TYPES.filter(b => b.special && isViewingSelf && b.id !== 'poppy' && b.id !== 'gift_box').map(block => (
                                <div key={block.id} className="flex flex-col items-center p-1 border border-gray-600 bg-stone-800 transition-all hover:bg-gray-700">
                                    {block.img && <McImg src={block.img} className="w-6 h-6 pixelated mb-1 drop-shadow-md" style={block.storeStyle} fallback="🔧"/>}
                                    <span className="text-[9px] text-white font-bold mb-1 text-center w-full truncate">{block.name}</span>
                                    <button onClick={() => { 
                                        const h = [...hotbar]; 
                                        const existingIdx = h.indexOf(block.id);
                                        if (existingIdx !== -1) h[existingIdx] = null;
                                        h[activeHotbarIndex] = block.id; 
                                        setHotbar(h); 
                                    }} className="text-[9px] w-full py-1 font-bold border bg-gray-600 text-white border-gray-500 hover:bg-gray-500">放快捷列</button>
                                </div>
                            ))}
                            {displayedBlocks.map(block => (
                                <div key={block.id} className="flex flex-col items-center p-1 border border-gray-600 bg-stone-800 transition-all hover:bg-gray-700">
                                    <div className="relative w-full flex justify-center cursor-pointer group" onClick={() => { 
                                        const h = [...hotbar]; 
                                        const existingIdx = h.indexOf(block.id);
                                        if (existingIdx !== -1) h[existingIdx] = null;
                                        h[activeHotbarIndex] = block.id; 
                                        setHotbar(h); 
                                    }}>
                                        <McImg src={block.img} className="w-6 h-6 pixelated mb-1 drop-shadow-md group-hover:scale-110 transition-transform" style={block.storeStyle} fallback="📦"/>
                                    </div>
                                    <span className="text-[9px] text-white font-bold mb-1 text-center w-full truncate" title={block.name}>{block.name}</span>
                                    <span className="text-[8px] text-amber-300 font-bold mb-1 bg-stone-800 bg-opacity-40 px-1 rounded-full w-full text-center">{block.price} 💎</span>
                                    <button onClick={() => setBuyModal({ block, amount: 1 })} className="mt-auto text-[9px] w-full py-1 font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-inner border border-amber-400">購買</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {chestUi && (
                <div className="absolute inset-0 z-[110] bg-stone-800 bg-opacity-70 flex flex-col items-center justify-center p-4">
                    <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] p-3 w-full max-w-2xl shadow-2xl relative">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <h3 className="text-[#373737] font-bold text-lg">📦 實體儲物箱</h3>
                            <button onClick={() => { playChestCloseSound(); setChestUi(null); }} className="text-red-600 font-black text-xl hover:scale-110">✖</button>
                        </div>
                        <p className="text-[#373737] font-bold mb-1">箱子內部 (點擊取出)</p>
                        <div className="bg-[#8b8b8b] p-2 grid grid-cols-6 sm:grid-cols-9 gap-1 border-2 border-[#373737] shadow-inner h-32 overflow-y-auto mb-4 content-start">
                            {Object.entries(specials[currentDimension][chestUi.index]?.items || {}).filter(([id, count]) => count > 0).map(([id, count]) => {
                                const bInfo = BLOCK_TYPES.find(b => b.id === id);
                                if (!bInfo) return null;
                                return (
                                    <div key={`chest-${id}`} onClick={() => handleChestItemTransfer(id, 'toLocal')} className="bg-[#8b8b8b] border-2 border-[#FCFBF7] border-r-[#373737] border-b-[#373737] aspect-square flex flex-col items-center justify-center relative hover:bg-[#a0a0a0] cursor-pointer">
                                        <McImg src={bInfo.img} className="w-8 h-8 pixelated drop-shadow-md" style={bInfo.storeStyle} />
                                        <span className="absolute bottom-0 right-1 text-white text-[10px] font-black drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[#373737] font-bold mb-1">我的庫存 (點擊放入)</p>
                        <div className="bg-[#8b8b8b] p-2 grid grid-cols-6 sm:grid-cols-9 gap-1 border-2 border-[#373737] shadow-inner h-32 overflow-y-auto content-start">
                            {Object.entries(localInventory).filter(([id, count]) => count > 0).map(([id, count]) => {
                                const bInfo = BLOCK_TYPES.find(b => b.id === id);
                                if (!bInfo) return null;
                                return (
                                    <div key={`inv-${id}`} onClick={() => handleChestItemTransfer(id, 'toChest')} className="bg-[#8b8b8b] border-2 border-[#FCFBF7] border-r-[#373737] border-b-[#373737] aspect-square flex flex-col items-center justify-center relative hover:bg-[#a0a0a0] cursor-pointer">
                                        <McImg src={bInfo.img} className="w-8 h-8 pixelated drop-shadow-md" style={bInfo.storeStyle} />
                                        <span className="absolute bottom-0 right-1 text-white text-[10px] font-black drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {isChestOpen && (
                <div 
                    className="absolute inset-0 z-[100] bg-stone-800 bg-opacity-70 flex items-center justify-center p-4"
                    onDragOver={e => e.preventDefault()} 
                    onDrop={handleInventoryDrop} 
                >
                    <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] p-3 w-full max-w-2xl shadow-2xl relative">
                        <div className="flex justify-between items-center mb-2 px-1 border-b-2 border-gray-400 pb-1">
                            <div>
                                <h3 className="text-[#373737] font-bold text-lg inline-block">🧰 我的庫存</h3>
                                <span className="text-xs text-amber-700 ml-2 font-bold block sm:inline-block">
                                    快捷列 (裝備捷徑，清空不消耗庫存)：拖放裝備，往上拖或雙擊即可清空。
                                </span>
                            </div>
                            <button onClick={() => { playChestCloseSound(); setIsChestOpen(false); setDragActiveBlock(null); }} className="text-red-600 font-black text-xl hover:scale-110">✖</button>
                        </div>
                        
                        <div className="bg-[#8b8b8b] p-2 grid grid-cols-6 sm:grid-cols-9 gap-1 border-2 border-[#373737] shadow-inner h-[30vh] overflow-y-auto content-start">
                            {Object.entries(localInventory).filter(([id, count]) => count > 0 || ['erase'].includes(id)).map(([id, count]) => {
                                const bInfo = BLOCK_TYPES.find(b => b.id === id);
                                if (!bInfo) return null;
                                return (
                                    <div 
                                        key={id} 
                                        draggable 
                                        onDragStart={(e) => handleDragStart(e, 'inventory', id)}
                                        onClick={() => setDragActiveBlock(id)} 
                                        className={`bg-[#8b8b8b] border-2 aspect-square flex flex-col items-center justify-center relative group hover:bg-[#a0a0a0] cursor-pointer transition-all ${dragActiveBlock === id ? 'border-amber-300 shadow-[0_0_10px_yellow]' : 'border-[#FCFBF7] border-r-[#373737] border-b-[#373737]'}`}
                                    >
                                        <McImg src={bInfo.img} className="w-8 h-8 pixelated drop-shadow-md pointer-events-none" style={bInfo.storeStyle} />
                                        {count > 0 && <span className="absolute bottom-0 right-1 text-white text-[10px] font-black drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{count}</span>}
                                        <div className="hidden group-hover:block absolute -top-6 left-1/2 transform -tranamber-x-1/2 bg-stone-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 border border-gray-400">{bInfo.name}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <h3 className="text-[#373737] font-bold text-sm mt-3 mb-1 px-1">📥 快捷列 (請在此拖放或點擊替換)</h3>
                        <div className="flex justify-center gap-1 sm:gap-2 p-2 bg-[#5c5c5c] border-2 border-[#373737] shadow-inner">
                            {hotbar.map((blockId, idx) => {
                                const bInfo = blockId ? BLOCK_TYPES.find(b => b.id === blockId) : null;
                                const count = blockId && !bInfo?.special ? localInventory[blockId] || 0 : '';
                                return (
                                    <div 
                                        key={`hotbar-edit-${idx}`}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => handleHotbarDrop(e, idx)}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, 'hotbar', idx)}
                                        onDoubleClick={() => {
                                            const newHotbar = [...hotbar];
                                            newHotbar[idx] = null;
                                            setHotbar(newHotbar);
                                        }}
                                        onClick={() => {
                                            if (dragActiveBlock) {
                                                const newHotbar = [...hotbar];
                                                const existingIdx = newHotbar.indexOf(dragActiveBlock);
                                                if (existingIdx !== -1) newHotbar[existingIdx] = null;
                                                newHotbar[idx] = dragActiveBlock;
                                                setHotbar(newHotbar);
                                                setDragActiveBlock(null);
                                            }
                                        }}
                                        className="w-10 h-10 sm:w-12 sm:h-12 bg-[#8b8b8b] border-2 border-[#FCFBF7] border-r-[#373737] border-b-[#373737] flex items-center justify-center relative cursor-pointer hover:bg-[#a0a0a0] transition-colors"
                                    >
                                        {bInfo && <McImg src={bInfo.img} className="w-[80%] h-[80%] pixelated drop-shadow-md pointer-events-none" style={bInfo.storeStyle} />}
                                        {count !== '' && count > 0 && <span className="absolute bottom-0 right-[2px] text-white text-[10px] font-black drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{count}</span>}
                                        <span className="absolute top-0 left-[2px] text-[8px] font-black text-gray-300 drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{idx + 1}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {buyModal && (
                <div className="absolute inset-0 z-[100] bg-stone-800 bg-opacity-70 flex flex-col items-center justify-center p-4">
                    <div className="bg-[#333] border-4 border-gray-600 p-6 w-full max-w-xs shadow-2xl flex flex-col items-center relative">
                        <h3 className="text-white font-bold mb-4 text-lg">購買 【{buyModal.block.name}】</h3>
                        <McImg src={buyModal.block.img} className="w-16 h-16 pixelated mb-4 drop-shadow-lg" style={buyModal.block.storeStyle} />
                        <div className="flex items-center space-x-4 mb-4">
                            <button onClick={() => setBuyModal({...buyModal, amount: Math.max(1, buyModal.amount - 1)})} className="bg-gray-700 text-white w-8 h-8 font-black border-2 border-gray-500 hover:bg-gray-600">-</button>
                            <input type="number" value={buyModal.amount} onChange={(e) => setBuyModal({...buyModal, amount: Math.max(1, parseInt(e.target.value) || 1)})} className="w-16 text-center font-bold p-1 border-2 border-gray-500 bg-stone-900 text-white outline-none"/>
                            <button onClick={() => setBuyModal({...buyModal, amount: buyModal.amount + 1})} className="bg-gray-700 text-white w-8 h-8 font-black border-2 border-gray-500 hover:bg-gray-600">+</button>
                        </div>
                        <p className="text-amber-400 font-bold mb-6">總價：{buyModal.block.price * buyModal.amount} 💎</p>
                        <div className="flex space-x-2 w-full">
                            <button onClick={() => setBuyModal(null)} className="flex-1 bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 border-2 border-black">取消</button>
                            <button onClick={handleConfirmBuy} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 border-2 border-black">確認購買</button>
                        </div>
                    </div>
                </div>
            )}

            {signModal !== null && (
                <div className="absolute inset-0 z-[100] bg-stone-800 bg-opacity-70 flex flex-col items-center justify-center p-4">
                    <div className="bg-[#d4a373] border-8 border-[#8b5a2b] p-6 w-full max-w-sm shadow-2xl flex flex-col items-center pixelated-border">
                        <h3 className="text-[#3e2723] font-black mb-4 text-lg">✏️ 留下告示牌訊息</h3>
                        <textarea id="signInput" placeholder="請輸入留言 (最多30字)..." maxLength="30" className="w-full h-24 p-2 bg-[#faedcd] border-2 border-[#8b5a2b] text-[#3e2723] font-bold outline-none resize-none mb-4 custom-scrollbar"></textarea>
                        <p className="text-[#3e2723] font-bold text-xs mb-4">放置消耗：10 💎</p>
                        <div className="flex space-x-2 w-full">
                            <button onClick={() => setSignModal(null)} className="flex-1 bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 border-2 border-black">取消</button>
                            <button onClick={submitSign} className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 border-2 border-black">插上</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
