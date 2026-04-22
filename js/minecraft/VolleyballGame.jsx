const { useState, useEffect, useRef } = React;


  function VolleyballGame({ user, userProfile, mcData, updateMcData, onQuit, showAlert }) {
    const preloadFastSound = window.preloadFastSound;
    const playCachedSound = window.playCachedSound;
    const McImg = window.McImg;
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('start');
    const [score, setScore] = useState({ player: 0, opponent: 0 });
    const [pointMessage, _setPointMessage] = useState('');
    const pointMsgRef = useRef('');
    const pointMsgTimerRef = useRef(null); // ✨ 新增計時器控制
    const [gameMode, setGameMode] = useState('casual');
    const [rankedStats, setRankedStats] = useState({ sets: [], startTime: 0, totalScore: 0 }); 
    const [rankedLeaderboard, setRankedLeaderboard] = useState([]);
    const [isPaused, setIsPaused] = useState(false); 

    const togglePause = () => {
        if (gameState !== 'playing') return;
        const newPaused = !isPaused;
        setIsPaused(newPaused);
        if (gameRef.current) gameRef.current.isPaused = newPaused;
        if (newPaused) {
            setPointMessage('⏸️ 遊戲暫停', 0); // 暫停時不自動消失
        } else {
            setPointMessage('');
        }
    };

    // ✨ 智慧文字控制：預設 2.5 秒自動消失，傳入 0 則持續顯示
    const setPointMessage = (msg, autoClearMs = 2500) => {
        pointMsgRef.current = typeof msg === 'function' ? msg(pointMsgRef.current) : msg;
        _setPointMessage(msg);
        
        if (pointMsgTimerRef.current) clearTimeout(pointMsgTimerRef.current);
        
        if (msg && autoClearMs > 0) {
            pointMsgTimerRef.current = setTimeout(() => {
                if (pointMsgRef.current === msg) {
                    _setPointMessage('');
                    pointMsgRef.current = '';
                }
            }, autoClearMs);
        }
    };

    const [touchSettings, setTouchSettings] = useState(
        mcData.volleyball_touch || { layout: 'overlay', scale: 1, dpadX: 0, dpadY: 0, actionX: 0, actionY: 0 }
    );

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
        images.current.magma_slime = new Image(); images.current.magma_slime.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/magma_cream.png";
        images.current.netherrack = new Image(); images.current.netherrack.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/netherrack.png";
        images.current.magma = new Image(); images.current.magma.src = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/magma.png";
        
        if (user) {
            window.db.collection('system').doc('volleyball_ranked').get().then(doc => {
                if (doc.exists) {
                    const ranks = Object.entries(doc.data().scores || {})
                        .map(([uid, info]) => ({ uid, ...info }))
                        .sort((a, b) => b.score - a.score).slice(0, 5);
                    setRankedLeaderboard(ranks);
                }
            });
        }

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
        difficulty: 'hard'
    });

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.repeat) return; 
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

    const startGame = (isRanked = false, diff = 'hard') => {
        if (mcData.hunger < 1) {
            showAlert("🍖 史蒂夫太餓了！請先去商店吃點東西再來打排球！");
            return;
        }
        updateMcData({ hunger: mcData.hunger - 1 }, true);
        
        setGameMode(isRanked ? 'ranked' : 'casual');
        gameRef.current.mode = isRanked ? 'ranked' : 'casual';
        gameRef.current.difficulty = isRanked ? 'hard' : diff;
        gameRef.current.opponent.speed = diff === 'easy' ? 4.5 : (diff === 'medium' ? 5.2 : 6.0); 
        
        gameRef.current.groundY = 320; 
        gameRef.current.ballGroundY = isRanked ? 320 + 15 : 320;
        if (isRanked) {
            gameRef.current.currentSet = 1;
            gameRef.current.setWins = { p: 0, o: 0 };
            gameRef.current.setsRecord = [];
            gameRef.current.rankedStartTime = Date.now();
        }

        setGameState('playing');
        setScore({ player: 0, opponent: 0 });
        setPointMessage(isRanked ? '🔥 排位模式：連打三局！' : '比賽開始！');
        gameRef.current.score = { p: 0, o: 0 };
        gameRef.current.serving = 'player';
        gameRef.current.player.stamina = 100;
        gameRef.current.opponent.stamina = 100; 
        resetPositions();
        
        if (bgmRef.current) { 
            if (isRanked) {
                bgmRef.current.src = "https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/clutterfunkVOL.mp3";
            } else {
                bgmRef.current.src = "https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/S4.mp3";
            }
            bgmRef.current.currentTime = 0; 
            bgmRef.current.play().catch(()=>{}); 
        }
        if (gameRef.current.reqId) cancelAnimationFrame(gameRef.current.reqId);
        gameRef.current.reqId = requestAnimationFrame(loop);
    };

    const loop = (timestamp) => {
        const state = gameRef.current;
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');

        if (!timestamp) timestamp = performance.now();
        if (!state.lastTime) state.lastTime = timestamp;
        let elapsed = timestamp - state.lastTime;
        if (elapsed > 100) elapsed = 100; 
        state.lastTime = timestamp;
        state.accumulator = (state.accumulator || 0) + elapsed;
        const timeStep = 1000 / 60; 

        const triggerNetSound = (url) => {
            playCachedSound(url);
        };

        while (state.accumulator >= timeStep) {
            state.accumulator -= timeStep;

            if (!state.isPointOver && !state.isPaused) {
            
                if (state.serveTimer > 0) {
                    state.serveTimer--;
                    if (state.serveTimer === 15) triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/block/bell/use.ogg');
                    state.ball.vx = 0; state.ball.vy = 0;
                } else {
                    if (!state.isServing) state.ball.vy += 0.35;
                }

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

                // --- 🤖 AI 對手邏輯 ---
                let aiTargetX = 600; 
                let aiShouldJump = false;
                let aiTryBlock = false;
                let aiTrySpike = false;
                const diff = state.difficulty || 'hard';

                if (!state.isServing) {
                    if (state.ball.x > state.net.x) {
                        let offset = 15; 
                        if (state.touches.o >= 1) offset = 30; 
                        
                        if (diff === 'hard' && state.ball.y > 200 && state.opponent.x - state.ball.x > 30) {
                            offset = -10; 
                        }

                        aiTargetX = state.ball.x + (state.ball.vx * 10) + offset; 
                        
                        if (aiTargetX < state.net.x + 35) aiTargetX = state.net.x + 35;
                        if (aiTargetX > state.w - 30) aiTargetX = state.w - 30;

                        let xDist = state.opponent.x - state.ball.x; 
                        
                        if (xDist > -25 && xDist < 90 && state.ball.y > 100 && state.ball.y < 300 && state.ball.vy > -1) {
                            aiShouldJump = true;
                        }
                        
                        if (diff !== 'easy' && state.ball.vx > 0 && state.ball.x > state.net.x - 30 && state.ball.y < 280) {
                            if (Math.abs(state.opponent.x - aiTargetX) < 40) {
                                aiShouldJump = true;
                            }
                        }
                        
                        if (state.ball.x < state.net.x + 200 && xDist > -20 && xDist < 80 && state.ball.y < 200 && state.ball.vy < 3) {
                            aiShouldJump = true;
                        }

                        let safeSpikeY = state.net.y - 5 - ((state.opponent.x - state.net.x) * 0.15);

                        if (state.opponent.y < state.groundY - 10 && 
                            state.ball.y < safeSpikeY && 
                            state.ball.x < state.opponent.x + 50 &&
                            state.ball.x > state.opponent.x - 70 &&
                            state.ball.y < state.opponent.y + 50 &&
                            state.ball.y > state.opponent.y - 120 &&
                            state.opponent.stamina >= 30) {
                            
                            let spikeProb = diff === 'easy' ? 0.1 : (diff === 'medium' ? 0.4 : 1.0);
                            if (Math.random() < spikeProb) {
                                aiTrySpike = true;
                            }
                        }
                    } else {
                        if (state.ball.vx > 0) {
                            if (diff === 'hard' && ((state.ball.vx > 7 && state.ball.y < 250) || (state.ball.x > state.net.x - 100 && state.ball.y < 250 && state.ball.vx > 2))) {
                                aiTargetX = 720; 
                                if (state.ball.x > state.net.x - 100 && state.ball.y < 250 && state.opponent.stamina >= 25) {
                                    aiTargetX = state.net.x + 35;
                                    aiShouldJump = true;
                                    aiTryBlock = true;
                                }
                            } else {
                                aiTargetX = state.ball.x + (state.ball.vx * (diff === 'easy' ? 20 : 30));
                                if (diff !== 'easy' && state.ball.vx < 4.5) {
                                    aiTargetX = state.net.x + 50;
                                }
                                if (aiTargetX < state.net.x + 40) aiTargetX = state.net.x + 40;
                                if (aiTargetX > 760) aiTargetX = 760;
                            }
                        } else {
                            aiTargetX = 600 - ((state.net.x - state.ball.x) * 0.4);
                            if (aiTargetX < state.net.x + 60) aiTargetX = state.net.x + 60;
                            if (aiTargetX > 700) aiTargetX = 700;
                        }
                    }
                } else {
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

                if (state.opponent.x < aiTargetX - 10) state.opponent.vx = state.opponent.speed;
                else if (state.opponent.x > aiTargetX + 10) state.opponent.vx = -state.opponent.speed;
                else state.opponent.vx = 0;

                if (aiShouldJump && state.opponent.y >= state.groundY) state.opponent.vy = state.opponent.jump;

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

                const handleScoreCheck = () => {
                    const p = state.score.p;
                    const o = state.score.o;
                    const isRanked = state.mode === 'ranked';
                    
                    if ((p >= 10 && p - o >= 2) || (o >= 10 && o - p >= 2)) {
                        if (isRanked) {
                            state.setsRecord.push({ p, o });
                            if (p > o) state.setWins.p += 1; else state.setWins.o += 1;
                            
                            if (state.currentSet < 3) {
                                state.currentSet += 1;
                                setPointMessage(`🏁 局數結束！目前史蒂夫 ${state.setWins.p} : 村民 ${state.setWins.o}`, 2000);
                                setTimeout(() => {
                                    state.score = { p: 0, o: 0 };
                                    setScore({ player: 0, opponent: 0 });
                                    resetPositions();
                                    setPointMessage(`🔥 第 ${state.currentSet} 局 開始！`);
                                }, 2000);
                            } else {
                                setTimeout(() => endGame(true), 500); 
                            }
                        } else {
                            setTimeout(() => endGame(), 500);
                        }
                    } else {
                        if (p >= 9 && o >= 9 && p === o) setPointMessage('🔥 DEUCE！必須贏兩分！', 1500);
                        setTimeout(() => resetPositions(), 800);
                    }
                };

               const checkHit = (p, isPlayer) => {
                    let now = performance.now();
                    let lastHit = isPlayer ? state.lastHitTime.p : state.lastHitTime.o;
                    if (now - lastHit < 100) return; 

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
                            state.serveSkillLockO = false; 
                            
                            if (state.touches.p >= 4) {
                                state.isPointOver = true; state.score.o += 1; state.serving = 'opponent';
                                triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/mob/villager/no1.ogg');
                                setScore({ player: state.score.p, opponent: state.score.o });
                                setPointMessage(`❌ 左側連擊 4 次犯規！村民得分！`);
                                handleScoreCheck();
                                return;
                            }
                        } else {
                            state.touches.o += 1;
                            state.serveSkillLockP = false; 
                            
                            if (state.touches.o >= 4) {
                                state.isPointOver = true; state.score.p += 1; state.serving = 'player';
                                triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/player/levelup.ogg');
                                setScore({ player: state.score.p, opponent: state.score.o });
                                setPointMessage(`❌ 右側連擊 4 次犯規！史蒂夫得分！`);
                                handleScoreCheck();
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

                const currentBallGroundY = state.ballGroundY || state.groundY;
                if (!state.isPointOver && state.ball.y + state.ball.r > currentBallGroundY) {
                    state.isPointOver = true;
                    if (state.ball.x < state.w / 2) {
                        state.score.o += 1; state.serving = 'opponent';
                        triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/mob/villager/no1.ogg');
                        setPointMessage(`👇 球落地了！村民得分！`);
                    } else {
                        state.score.p += 1; state.serving = 'player';
                        triggerNetSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/player/levelup.ogg');
                        setPointMessage(`👇 球落地了！史蒂夫得分！`);
                    }
                    setScore({ player: state.score.p, opponent: state.score.o });
                    handleScoreCheck();
                }
            }
        }

        ctx.clearRect(0, 0, state.w, state.h);
        
        const drawImageSafe = (img, x, y, w, h) => {
            if(img && img.complete && img.naturalWidth > 0) ctx.drawImage(img, x, y, w, h);
        };

        const isRankedVisual = state.mode === 'ranked';
        const visualGroundY = isRankedVisual ? state.groundY + 15 : state.groundY;

        if (isRankedVisual) {
            ctx.fillStyle = '#3a0000'; ctx.fillRect(0, 0, state.w, state.h);
            for (let x = 0; x < state.w; x += 40) {
                drawImageSafe(images.current.netherrack, x, visualGroundY, 40, 40);
                drawImageSafe(images.current.magma, x, visualGroundY + 40, 40, state.h - visualGroundY - 40);
            }
        } else {
            ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, state.w, state.h);
            ctx.fillStyle = '#4CAF50'; ctx.fillRect(0, visualGroundY, state.w, state.h - visualGroundY);
            ctx.fillStyle = '#388E3C'; ctx.fillRect(0, visualGroundY, state.w, 10);
        }

        ctx.fillStyle = isRankedVisual ? '#8B0000' : '#D3D3D3'; 
        ctx.fillRect(state.net.x, isRankedVisual ? state.net.y + 15 : state.net.y, state.net.w, state.net.h);
        ctx.strokeStyle = isRankedVisual ? '#FF4500' : '#A9A9A9'; 
        ctx.strokeRect(state.net.x, isRankedVisual ? state.net.y + 15 : state.net.y, state.net.w, state.net.h);

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

        if (tipsRef.current) {
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
        ctx.fillRect(state.player.x + 1, state.player.y + state.player.r + 13, 19 * (1 - state.player.spikeCd / 100), 4);

        ctx.save();
        ctx.translate(state.ball.x, state.ball.y);
        ctx.rotate(state.ball.x * 0.05);
        const ballImg = state.mode === 'ranked' ? images.current.magma_slime : images.current.slime;
        drawImageSafe(ballImg, -state.ball.r, -state.ball.r, state.ball.r*2, state.ball.r*2);
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

    const endGame = (isRankedFinal = false) => {
        setGameState('gameover');
        if (bgmRef.current) bgmRef.current.pause();
        
        const state = gameRef.current;
        let iWon = false;
        
        if (isRankedFinal) {
            iWon = state.setWins.p > state.setWins.o;
            
            let totalDiff = 0;
            let totalPlayerPoints = 0;
            state.setsRecord.forEach(s => {
                totalDiff += (s.p - s.o);
                totalPlayerPoints += s.p;
            });
            let calcScore = Math.floor(500 + (state.setWins.p * 800) + (totalPlayerPoints * 50) + (totalDiff * 100));
            if (calcScore < 1) calcScore = 1; 
            
            setRankedStats({ sets: state.setsRecord, startTime: state.rankedStartTime, totalScore: calcScore, wins: state.setWins });
            
            if (iWon) {
                updateMcData({ diamonds: mcData.diamonds + 100 }, true);
                playCachedSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/ui/toast/challenge_complete.ogg');
                showAlert(`🏆 排位賽獲勝！\n總分：${calcScore} 分\n獲得 100 💎！`);
            } else {
                showAlert(`💀 排位賽落敗... 總分：${calcScore} 分`);
            }

            if (user && userProfile) {
                const sysRef = window.db.collection('system').doc('volleyball_ranked');
                sysRef.get().then(doc => {
                    const data = doc.exists ? doc.data() : { scores: {} };
                    const prevBest = data.scores[user.uid]?.score || 0;
                    if (calcScore > prevBest) {
                        data.scores[user.uid] = { name: userProfile.displayName || '無名英雄', score: calcScore, sets: `${state.setWins.p}-${state.setWins.o}` };
                        sysRef.set(data);
                    }
                });
            }

        } else {
            iWon = state.score.p > state.score.o; 

            if (iWon) {
                const reward = 30; 
                updateMcData({ diamonds: mcData.diamonds + reward }, true);
                playCachedSound('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/ui/toast/challenge_complete.ogg');
                showAlert(`🎉 恭喜你戰勝了村民！\n獲得 ${reward} 💎`);
            } else {
                showAlert(`💀 你輸給了村民... 再接再厲！`);
            }
        }
        
        if (state.reqId) cancelAnimationFrame(state.reqId);
    };

    return (
        <div className="fixed inset-0 z-[80] bg-[#111111] bg-opacity-90 flex flex-col items-center justify-center p-2 sm:p-4 touch-none font-mono">
            
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

            <div className="bg-[#3c3c3c] p-3 border-4 border-[#555555] border-r-[#111111] border-b-[#111111] w-full max-w-6xl relative shadow-2xl flex flex-col items-center pointer-events-auto">
               <div className="w-full flex justify-between items-center text-[#e0e0e0] font-bold mb-2 font-mono px-2 text-lg sm:text-xl">
                    <span className="text-[#55ff55] bg-[#1e1e1e] border-2 border-[#111111] border-r-[#555555] border-b-[#555555] px-2 py-1 shadow-inner">史蒂夫: {score.player}</span>
                    <span className="text-[#aaaaaa] text-sm hidden sm:inline bg-[#1e1e1e] border-2 border-[#111111] border-r-[#555555] border-b-[#555555] px-2 py-1 shadow-inner">
                        {gameMode === 'ranked' ? `🔥 第 ${gameRef.current?.currentSet || 1}/3 局` : '先得 10 分者獲勝'}
                    </span>
                    <div className="flex gap-2 sm:gap-4 items-center">
                        <span className="text-[#ff5555] bg-[#1e1e1e] border-2 border-[#111111] border-r-[#555555] border-b-[#555555] px-2 py-1 shadow-inner">村民: {score.opponent}</span>
                        {gameState === 'playing' && (
                            <button onClick={togglePause} className="bg-[#555555] hover:bg-[#666666] border-2 border-[#777777] border-r-[#222222] border-b-[#222222] px-2 py-1 active:border-t-[#222222] active:border-l-[#222222] active:border-r-[#777777] active:border-b-[#777777] transition-colors text-sm">
                                {isPaused ? '▶️' : '⏸️'}
                            </button>
                        )}
                        <button onClick={() => setShowSettings(true)} className="bg-[#555555] hover:bg-[#666666] border-2 border-[#777777] border-r-[#222222] border-b-[#222222] px-2 py-1 active:border-t-[#222222] active:border-l-[#222222] active:border-r-[#777777] active:border-b-[#777777] transition-colors text-sm">⚙️</button>
                        <button onClick={onQuit} className="bg-[#555555] hover:bg-[#ff5555] border-2 border-[#777777] border-r-[#222222] border-b-[#222222] px-2 py-1 active:border-t-[#222222] active:border-l-[#222222] active:border-r-[#777777] active:border-b-[#777777] transition-colors text-sm text-[#ffffff] font-black">✖</button>
                    </div>
                </div>

                <div className="relative w-full overflow-hidden border-4 border-black shrink-0 max-h-[65vh] md:max-h-none" style={{ aspectRatio: '800/400' }}>
                    <canvas ref={canvasRef} width={800} height={400} className="w-full h-full object-contain bg-[#87CEEB] pixelated"></canvas>
                    
                    {/* ✨ 提示文字 Minecraft 風格化 */}
                    {pointMessage && gameState === 'playing' && (
                        <div className="absolute top-[25%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none w-full max-w-[90%] sm:max-w-[70%] flex justify-center">
                            <div className="bg-[#373737]/95 border-4 border-white border-r-[#555] border-b-[#555] text-white font-bold text-lg sm:text-2xl px-6 py-3 shadow-[4px_4px_0_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-200 text-center flex items-center justify-center min-h-[60px] break-words whitespace-pre-wrap">
                                <span className="drop-shadow-[2px_2px_0_rgba(0,0,0,1)] tracking-widest leading-relaxed">
                                    {pointMessage}
                                </span>
                            </div>
                        </div>
                    )}

                    {gameState === 'start' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-20 px-2 sm:px-4 backdrop-blur-sm">
                            <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row gap-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                                
                                {/* 左側：排行榜 */}
                                <div className="flex-1 bg-[#8b8b8b] border-2 border-[#555] border-r-white border-b-white p-3 flex flex-col min-w-[250px] shadow-inner">
                                    <h3 className="text-center font-bold text-[#373737] border-b-2 border-[#555] pb-2 mb-3 text-lg">🏆 排位賽強者榜</h3>
                                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                        {rankedLeaderboard.length === 0 ? (
                                            <p className="text-[#373737] text-center text-sm font-bold mt-4">尚無排名，快來挑戰！</p>
                                        ) : (
                                            rankedLeaderboard.map((lb, i) => (
                                                <div key={i} className="flex justify-between items-center text-sm p-2 bg-[#c6c6c6] border-2 border-[#555] border-r-white border-b-white shadow-inner text-[#373737] font-bold">
                                                    <span className="truncate w-2/3">{i+1}. {lb.name}</span>
                                                    <span className="text-emerald-800">{lb.score} 分</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* 右側：開始選單 */}
                                <div className="flex-[1.5] flex flex-col justify-center">
                                    <h2 className="text-3xl sm:text-4xl font-black mb-2 text-[#373737] text-center drop-shadow-sm">🏐 史萊姆排球</h2>
                                    <p className="mb-6 font-bold text-center text-[#555] text-sm sm:text-base">把球打過網！打敗村民獲得鑽石！</p>
                                    
                                    <div className="flex flex-col gap-3 w-full">
                                        <button onClick={() => startGame(true)} className="bg-[#8b0000] hover:bg-[#a00000] border-2 border-white border-r-[#555] border-b-[#555] text-white font-bold py-3 text-lg sm:text-xl active:border-t-[#555] active:border-l-[#555] active:border-r-white active:border-b-white animate-pulse shadow-md">🔥 排位模式 (最強AI連打三局)</button>
                                        <button onClick={() => startGame(false, 'easy')} className="bg-[#006400] hover:bg-[#008000] border-2 border-white border-r-[#555] border-b-[#555] text-white font-black py-3 text-lg sm:text-xl active:border-t-[#555] active:border-l-[#555] active:border-r-white active:border-b-white shadow-md">🟢 單人休閒 (簡單)</button>
                                        <button onClick={() => startGame(false, 'medium')} className="bg-[#b8860b] hover:bg-[#daa520] border-2 border-white border-r-[#555] border-b-[#555] text-white font-black py-3 text-lg sm:text-xl active:border-t-[#555] active:border-l-[#555] active:border-r-white active:border-b-white shadow-md">🟡 單人休閒 (中等)</button>
                                        <button onClick={() => startGame(false, 'hard')} className="bg-[#5c4033] hover:bg-[#6b4c3a] border-2 border-white border-r-[#555] border-b-[#555] text-white font-black py-3 text-lg sm:text-xl active:border-t-[#555] active:border-l-[#555] active:border-r-white active:border-b-white shadow-md">🔴 單人休閒 (困難)</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {gameState === 'gameover' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-800 bg-opacity-90 text-white z-20 px-4">
                            {gameMode === 'ranked' ? (
                                <>
                                    <h2 className="text-5xl font-black mb-2 text-red-500 drop-shadow-md">
                                        {rankedStats.wins?.p > rankedStats.wins?.o ? '🏆 排位戰勝！' : '💀 排位落敗...'}
                                    </h2>
                                    <p className="text-xl mb-2 font-bold text-amber-400">🔥 綜合積分：{rankedStats.totalScore} 分</p>
                                    <div className="flex gap-4 mb-6">
                                        {rankedStats.sets.map((s, i) => (
                                            <div key={i} className="bg-stone-900 p-2 border-2 border-red-800 rounded text-center shadow-inner">
                                                <p className="text-xs text-gray-400">第 {i+1} 局</p>
                                                <p className={`font-bold ${s.p > s.o ? 'text-emerald-400' : 'text-red-400'}`}>{s.p} : {s.o}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="w-full max-w-sm mb-6 bg-stone-900 border-2 border-gray-600 p-2 rounded shadow-lg">
                                        <h3 className="text-center font-bold text-amber-300 border-b border-gray-600 pb-1 mb-2">🏆 排位強者榜</h3>
                                        {rankedLeaderboard.map((lb, i) => (
                                            <div key={i} className="flex justify-between text-sm px-2 py-1 border-b border-stone-800">
                                                <span>{i+1}. {lb.name}</span>
                                                <span className="text-emerald-400 font-bold">{lb.score} 分</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-5xl font-black mb-4 drop-shadow-md">
                                        {score.player > score.opponent ? '🏆 挑戰成功！' : '💀 挑戰失敗...'}
                                    </h2>
                                    <p className="text-2xl mb-8 font-bold">最終比分 - {score.player} : {score.opponent}</p>
                                </>
                            )}
                            <div className="flex gap-4">
                                <button onClick={() => startGame(gameMode === 'ranked', gameRef.current?.difficulty)} className="bg-emerald-600 hover:bg-emerald-500 border-4 border-emerald-800 text-white font-bold py-2 px-6 text-lg active:-translate-y-1 pixelated-border">🔄 再來一局</button>
                                <button onClick={onQuit} className="bg-gray-600 hover:bg-gray-500 border-4 border-gray-800 text-white font-bold py-2 px-6 text-lg active:-translate-y-1 pixelated-border">🔙 離開</button>
                            </div>
                        </div>
                    )}

                    {/* ✨ 觸控按鈕 (支援自定義位置大小與防反白) */}
                    {gameState === 'playing' && touchSettings.layout === 'overlay' && (
                        <div className="absolute inset-0 z-10 2xl:hidden pointer-events-none" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none', userSelect: 'none', touchAction: 'none' }}>
                            {/* 左側移動控制 */}
                            <div className="absolute flex gap-2 pointer-events-auto" style={{ bottom: `${12 + touchSettings.dpadY}px`, left: `${12 + touchSettings.dpadX}px`, transform: `scale(${touchSettings.scale})`, transformOrigin: 'bottom left', opacity: touchSettings.opacity ?? 1 }}>
                                <button 
                                    onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.left = true; }}
                                    onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.left = false; }}
                                    style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                                    className="select-none touch-none bg-stone-800/40 text-white/90 w-14 h-14 font-bold text-2xl rounded-full border-2 border-white/40 active:bg-stone-800/60 flex items-center justify-center backdrop-blur-sm"
                                >←</button>
                                <button 
                                    onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.right = true; }}
                                    onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.right = false; }}
                                    style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                                    className="select-none touch-none bg-stone-800/40 text-white/90 w-14 h-14 font-bold text-2xl rounded-full border-2 border-white/40 active:bg-stone-800/60 flex items-center justify-center backdrop-blur-sm"
                                >→</button>
                            </div>
                            {/* 右側技能控制 */}
                            <div className="absolute flex gap-2 pointer-events-auto" style={{ bottom: `${12 + touchSettings.actionY}px`, right: `${12 - touchSettings.actionX}px`, transform: `scale(${touchSettings.scale})`, transformOrigin: 'bottom right', opacity: touchSettings.opacity ?? 1 }}>
                                <button 
                                    onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.block = true; }}
                                    onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.block = false; }}
                                    style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                                    className="select-none touch-none bg-[#8b5a2b]/60 text-white/90 w-12 h-12 font-bold text-xl rounded-full border-2 border-[#d4a373]/60 active:bg-[#8b5a2b]/90 flex flex-col items-center justify-center backdrop-blur-sm shadow-lg"
                                >🛡️</button>
                                <button 
                                    onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.spike = true; }}
                                    onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.spike = false; }}
                                    style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                                    className="select-none touch-none bg-red-600/60 text-white/90 w-12 h-12 font-bold text-xl rounded-full border-2 border-red-300/60 active:bg-red-600/90 flex flex-col items-center justify-center backdrop-blur-sm shadow-lg"
                                >⚔️</button>
                                <button 
                                    onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.up = true; }}
                                    onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.up = false; }}
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
                            <button onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.left = true; }} onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.left = false; }} style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }} className="select-none touch-none bg-gray-700 text-white w-14 h-14 font-bold text-2xl rounded-lg border-b-4 border-gray-900 active:border-b-0 active:-translate-y-1 flex items-center justify-center transition-all">←</button>
                            <button onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.right = true; }} onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.right = false; }} style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }} className="select-none touch-none bg-gray-700 text-white w-14 h-14 font-bold text-2xl rounded-lg border-b-4 border-gray-900 active:border-b-0 active:-translate-y-1 flex items-center justify-center transition-all">→</button>
                        </div>
                        <div className="flex gap-2">
                            <button onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.block = true; }} onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.block = false; }} style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }} className="select-none touch-none bg-[#8b5a2b] text-white w-14 h-14 font-bold text-sm rounded-lg border-b-4 border-[#3e2723] active:border-b-0 active:-translate-y-1 flex flex-col items-center justify-center transition-all"><span>🛡️</span><span>攔網</span></button>
                            <button onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.spike = true; }} onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.spike = false; }} style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }} className="select-none touch-none bg-red-600 text-white w-14 h-14 font-bold text-sm rounded-lg border-b-4 border-red-900 active:border-b-0 active:-translate-y-1 flex flex-col items-center justify-center transition-all"><span>⚔️</span><span>殺球</span></button>
                            <button onTouchStart={(e)=>{e.preventDefault(); gameRef.current.keys.up = true; }} onTouchEnd={(e)=>{e.preventDefault(); gameRef.current.keys.up = false; }} style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }} className="select-none touch-none bg-amber-600 text-white w-14 h-14 font-bold text-xl rounded-lg border-b-4 border-amber-900 active:border-b-0 active:-translate-y-1 flex items-center justify-center transition-all">↑</button>
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