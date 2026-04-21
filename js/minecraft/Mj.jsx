const { useState, useEffect, useRef } = React;

function Mj({ user, userProfile, showAlert, onQuit }) {
    const [gameState, setGameState] = useState('menu');
    const [roomCode, setRoomCode] = useState('');
    
    // 麻將核心狀態
    const [players, setPlayers] = useState([]);
    const [currentTurn, setCurrentTurn] = useState(0); // 當前摸牌/打牌者
    const [wall, setWall] = useState([]); // 牌山
    const [lastDiscard, setLastDiscard] = useState(null); // 海底最後一張牌 { tile, fromIdx }
    const [pendingAction, setPendingAction] = useState(null); // 等待其他玩家吃碰胡的狀態
    
    // 個人UI狀態
    const [myHand, setMyHand] = useState([]);
    const seenTileIds = useRef(new Set());
    
    useEffect(() => {
        if (gameState !== 'playing') seenTileIds.current.clear();
    }, [gameState]);

    const updateMyHandSmartly = (engineHand) => {
        if (!engineHand) return;
        setMyHand(prev => {
            const engineIds = engineHand.map(t => t.id);
            const prevIds = prev.map(t => t.id);
            
            const isSetEqual = engineIds.length === prevIds.length && engineIds.every(id => prevIds.includes(id));
            if (isSetEqual) return prev;
            
            prev.forEach(t => seenTileIds.current.add(t.id));
            
            let nextHand = prev.filter(t => engineIds.includes(t.id));
            const newTiles = engineHand.filter(t => !prevIds.includes(t.id) && !seenTileIds.current.has(t.id));
            
            newTiles.forEach(t => seenTileIds.current.add(t.id));
            
            return [...nextHand, ...newTiles];
        });
    };

    const [selectedTile, setSelectedTile] = useState(null);
    const [actionTimer, setActionTimer] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15); // ✨ 新增：常規回合倒數狀態
    const [autoReadyTimer, setAutoReadyTimer] = useState(60); // ✨ 修改：結算畫面 60 秒防掛網踢人倒數

    // 判斷遊戲是否已達總局數/圈數
    const checkIsGameOver = () => {
        if (!gameContext || !roomSettings) return false;
        if (roomSettings.length === '1局' && gameContext.totalHands >= 1 && gameContext.consecutive === 0) return true;
        if (roomSettings.length === '1圈' && gameContext.wind > 0) return true;
        if (roomSettings.length === '1將' && gameContext.wind === 0 && gameContext.totalHands > 1) return true;
        return false;
    };

    // ✨ 新增：拖曳排序狀態
    const [draggedIdx, setDraggedIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    const [toast, setToast] = useState(null);
    const [roomJoinCode, setRoomJoinCode] = useState('');
    
    const [roomSettings, setRoomSettings] = useState({ turnTime: 20, baseBet: 50, taiBet: 20, length: '1局' }); // ✨ 新增底/台與長度設定
    const [gameContext, setGameContext] = useState({ wind: 0, round: 0, dealer: 0, consecutive: 0, scores: [0,0,0,0], totalHands: 0 }); // ✨ 記錄風圈局數連莊與分數
    const [isHost, setIsHost] = useState(false);
    const [lobbyPlayers, setLobbyPlayers] = useState([]);
    const [summaryData, setSummaryData] = useState(null);
    const [isSpectator, setIsSpectator] = useState(false);
    const [spectators, setSpectators] = useState([]);

    const [chatText, setChatText] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [showChatModal, setShowChatModal] = useState(false);
    const [floatingChats, setFloatingChats] = useState({});

    // ✨ 新增：動畫與洗牌狀態
    const [tingOptions, setTingOptions] = useState(null);
    const [winAnimation, setWinAnimation] = useState(null);
    const [isShuffling, setIsShuffling] = useState(false);
    const [actionBubbles, setActionBubbles] = useState({}); // 吃碰胡文字提示
    const [showQuitModal, setShowQuitModal] = useState(false); // ✨ 新增：自訂離開警告視窗狀態

    // ✨ 強化版音效播放 (加入雙重保險，徹底解決音效消失問題)

    // ✨ 強化版音效播放 (加入雙重保險，徹底解決音效消失問題)
    const playCachedSound = (url) => { 
        if (window.playCachedSound) window.playCachedSound(url); 
        // 防呆機制：若 Web Audio API 被瀏覽器阻擋，退回傳統 <audio> 強制播放
        const fallbackAudio = new Audio(url);
        fallbackAudio.volume = 0.8;
        fallbackAudio.play().catch(e => {});
    };
    const preloadFastSound = (url) => { if (window.preloadFastSound) window.preloadFastSound(url); };

    // ✨ 修正：退回 1.16.5 確保音效庫絕對存在，避免 1.20 部分音效檔案 404 而消失
    const clickSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/ui/button/click.ogg';
    const tileSound = 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/stone_place_destroy.mp3'; 
    const winSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/ui/toast/challenge_complete.ogg';
    const alertSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/block/note_block/chime.ogg';
    const eatSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/entity/player/burp.ogg';
    const anvilSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/block/anvil/use.ogg';
    const totemSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/item/totem/use.ogg';
    const passSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/entity/villager/no1.ogg';
    const dropSound = 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/stone_place_destroy.mp3'; 
    const tingSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/entity/player/levelup.ogg';
    const sortSound = 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/stone_place_destroy.mp3';
    const shuffleSound = 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/mj_wash.mp3';
    
    const aiVillagerSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/mob/villager/idle1.ogg';
    const aiEndermanSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/mob/endermen/idle1.ogg';
    const aiCreeperSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/entity/creeper/primed.ogg';
    const steveEatSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/entity/player/burp.ogg';

    // ✨ 新增專屬小聲音播放器 (洗牌與理牌專用，音量調小不刺耳)
    const playQuietSound = (url) => {
        const a = new Audio(url);
        a.volume = 0.2;
        a.play().catch(()=>{});
    };

    // ✨ 新增：根據玩家播放專屬生物聲音
    const playActorVoice = (idx) => {
        const p = players[idx];
        if (!p) return;
        if (p.id.startsWith('ai_1')) playCachedSound(aiVillagerSound);
        else if (p.id.startsWith('ai_2')) playCachedSound(aiEndermanSound);
        else if (p.id.startsWith('ai_3')) playCachedSound(aiCreeperSound);
        else playCachedSound(steveEatSound); // 真人玩家
    };

    // ✨ 新增：顯示動作氣泡 (吃碰胡提示)
    const triggerActionBubble = (pIdx, text) => {
        setActionBubbles(prev => ({ ...prev, [pIdx]: text }));
        setTimeout(() => setActionBubbles(prev => ({ ...prev, [pIdx]: null })), 2000);
    };

    // ✨ 新增：全局背景音樂 (BGM) 控制
    const bgmRef = useRef(null);

    useEffect(() => {
        const sounds = [clickSound, tileSound, winSound, alertSound, eatSound, anvilSound, totemSound, passSound, dropSound, tingSound, sortSound];
        sounds.forEach(src => preloadFastSound(src));
        
        // ✨ 改為休閒放鬆的 Minecraft 創造模式 BGM
        bgmRef.current = new Audio("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/music/game/creative/creative1.ogg");
        bgmRef.current.loop = true;
        bgmRef.current.volume = 0.2; // 音量微調，避免蓋過麻將的打牌音效

        return () => {
            if (bgmRef.current) {
                bgmRef.current.pause();
                bgmRef.current.src = "";
            }
        };
    }, []); 

    // ✨ 監聽遊戲狀態與聽牌狀態，自動切換/播放背景音樂
    useEffect(() => {
        if (gameState === 'playing') {
            // 如果場上有任何人聽牌，切換成戰鬥/刺激音樂
            const anyTing = players.some(p => p.isTing);
            const targetBgm = anyTing
                ? "https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/clutterfunkVOL.mp3" 
                : "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/music/game/creative/creative1.ogg";

            if (bgmRef.current) {
                if (bgmRef.current.src !== targetBgm) {
                    const wasPlaying = !bgmRef.current.paused;
                    bgmRef.current.src = targetBgm;
                    bgmRef.current.load();
                    if (wasPlaying) bgmRef.current.play().catch(e => console.warn(e));
                } else if (bgmRef.current.paused) {
                    bgmRef.current.play().catch(e => console.warn(e));
                }
            }
        } else {
            if (bgmRef.current) bgmRef.current.pause();
        }
    }, [gameState, players]); 

    // ✨ 統一還原為 Emoji，解決中字突兀的問題
    const TILE_DEFS = {
        'W': ['🀇','🀈','🀉','🀊','🀋','🀌','🀍','🀎','🀏'],
        'T': ['🀙','🀚','🀛','🀜','🀝','🀞','🀟','🀠','🀡'],
        'S': ['🀐','🀑','🀒','🀓','🀔','🀕','🀖','🀗','🀘'],
        'Z': ['🀀','🀁','🀂','🀃','🀄︎','🀅','🀆']
    };

    const getTileColor = (type, val) => {
        if (type === 'W') return 'text-red-600';
        if (type === 'T') return 'text-zinc-950';
        if (type === 'S') return 'text-emerald-700';
        if (type === 'Z') {
            if (val <= 4) return 'text-zinc-950'; // 東南西北
            if (val === 5) return 'text-red-600'; // 中
            if (val === 6) return 'text-emerald-700'; // 發
            if (val === 7) return 'text-zinc-950'; // 白板
        }
        return 'text-zinc-950';
    };

    // ✨ 檢查是否聽牌 (回傳：打出哪張牌的ID -> 可以胡哪些牌的陣列)
    const checkTingOptions = (handCards) => {
        if (handCards.length % 3 !== 2) return null;
        const options = {};
        const uniqueHand = [];
        const seen = new Set();
        handCards.forEach(t => {
            const k = `${t.type}${t.val}`;
            if (!seen.has(k)) { seen.add(k); uniqueHand.push(t); }
        });

        const allTileTypes = [];
        Object.entries(TILE_DEFS).forEach(([type, symbols]) => {
            symbols.forEach((symbol, idx) => allTileTypes.push({ type, val: idx + 1, symbol }));
        });

        uniqueHand.forEach(discardCandidate => {
            const tempHand = handCards.filter(t => t.id !== discardCandidate.id);
            const tingTiles = [];
            allTileTypes.forEach(testTile => {
                if (checkHu([...tempHand, { ...testTile, id: 'test' }])) tingTiles.push(testTile);
            });
            if (tingTiles.length > 0) options[discardCandidate.id] = tingTiles;
        });
        return Object.keys(options).length > 0 ? options : null;
    };

    // 檢查是否可以胡牌 (基礎演算法：遞迴尋找 5搭1眼)
    const checkHu = (handCards) => {
        if (handCards.length % 3 !== 2) return false;
        
        const counts = {};
        handCards.forEach(t => {
            const key = `${t.type}${t.val}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        const tryHu = (cardsMap, remaining) => {
            if (remaining === 0) return true;
            const keys = Object.keys(cardsMap).filter(k => cardsMap[k] > 0).sort();
            const k = keys[0];

            // 嘗試刻子 (碰)
            if (cardsMap[k] >= 3) {
                cardsMap[k] -= 3;
                if (tryHu(cardsMap, remaining - 3)) return true;
                cardsMap[k] += 3;
            }

            // 嘗試順子 (吃) - 字牌不能吃
            if (k[0] !== 'Z' && cardsMap[k] > 0) {
                const type = k[0];
                const val = parseInt(k[1]);
                const k2 = `${type}${val+1}`;
                const k3 = `${type}${val+2}`;
                if (cardsMap[k2] > 0 && cardsMap[k3] > 0) {
                    cardsMap[k]--; cardsMap[k2]--; cardsMap[k3]--;
                    if (tryHu(cardsMap, remaining - 3)) return true;
                    cardsMap[k]++; cardsMap[k2]++; cardsMap[k3]++;
                }
            }
            return false;
        };

        // 尋找將牌 (眼)
        const uniqueKeys = Object.keys(counts).filter(k => counts[k] >= 2);
        for (let eye of uniqueKeys) {
            const tempMap = { ...counts };
            tempMap[eye] -= 2;
            if (tryHu(tempMap, handCards.length - 2)) return true;
        }
        return false;
    };

    // ✨ F5 重新整理與關閉分頁防護
    useEffect(() => {
        if (gameState === 'playing' && roomCode) {
            const handleBeforeUnload = (e) => {
                e.preventDefault();
                e.returnValue = ''; // 觸發瀏覽器原生防護警告
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [gameState, roomCode]);

    // ✨ 離開房間邏輯 (改為顯示網頁內自訂視窗)
    const quitAndLeaveRoom = () => {
        playCachedSound(clickSound);
        if (gameState === 'playing' || gameState === 'lobby') {
            setShowQuitModal(true); // 開啟警告視窗
        } else {
            confirmQuit(); // 如果已經在結算畫面，直接離開不警告
        }
    };

    // ✨ 真實執行退出與扣款邏輯
    const confirmQuit = async () => {
        setShowQuitModal(false);
        if (roomCode && window.db) {
            try {
                const snap = await window.db.collection("mjRooms").doc(roomCode).get();
                if (snap.exists) {
                    const d = snap.data();
                    if (gameState === 'playing') {
                        const penalty = (roomSettings.baseBet || 50) + ((roomSettings.taiBet || 20) * 10);
                        const batch = window.db.batch();
                        
                        // ✨ 修正：安全取得 increment 函式，避免 window.firebase undefined 導致報錯中斷寫入
                        const fb = typeof firebase !== 'undefined' ? firebase : window.firebase;
                        const increment = fb.firestore.FieldValue.increment;
                        
                        const myRef = window.db.collection('users').doc(user.uid);
                        // ✨ 改用 set + merge: true，避免玩家資料庫沒有 mcData 時導致整個寫入崩潰
                        batch.set(myRef, { 
                            coins: increment(-(penalty * 3)),
                            mcData: { diamonds: increment(-(penalty * 3)) }
                        }, { merge: true });

                        const currentPlayers = d.players || [];
                        currentPlayers.forEach(p => {
                            if (p.id !== user.uid && !p.id.startsWith('ai_')) {
                                const otherRef = window.db.collection('users').doc(p.id);
                                batch.set(otherRef, { 
                                    coins: increment(penalty),
                                    mcData: { diamonds: increment(penalty) }
                                }, { merge: true });
                            }
                        });
                        
                        await batch.commit().catch(e => console.error("扣款/發放失敗", e));

                        showToast(`逃跑懲罰！已真實扣除 ${penalty * 3} 💎`);
                        const newScores = [...(d.gameContext?.scores || [0,0,0,0])];
                        const myIdx = currentPlayers.findIndex(pl => pl.id === user.uid);
                        if(myIdx !== -1) {
                            newScores.forEach((_, i) => {
                                if (i === myIdx) newScores[i] -= penalty * 3;
                                else newScores[i] += penalty;
                            });
                        }
                        const p = currentPlayers.map(pl => pl.id === user.uid ? { ...pl, isDisconnected: true } : pl);
                        await window.db.collection("mjRooms").doc(roomCode).update({ players: p, 'gameContext.scores': newScores, status: 'summary', winner: '玩家逃跑', results: p.map(x=>({...x, penalty:0, prize:0})) });
                    } else if (gameState === 'summary') {
                        const p = (d.players || []).map(pl => pl.id === user.uid ? { ...pl, isDisconnected: true } : pl);
                        await window.db.collection("mjRooms").doc(roomCode).update({ players: p });
                    } else {
                        if (isHost) await window.db.collection("mjRooms").doc(roomCode).delete();
                        else {
                            const p = (d.players || []).filter(pl => pl.id !== user.uid);
                            const s = (d.spectators || []).filter(pl => pl.id !== user.uid);
                            await window.db.collection("mjRooms").doc(roomCode).update({ players: p, spectators: s });
                        }
                    }
                }
            } catch(e) {}
        }
        onQuit();
    };

    const AI_AVATARS = {
        'ai_1': 'https://mc-heads.net/avatar/MHF_Villager',
        'ai_2': 'https://mc-heads.net/avatar/MHF_Enderman',
        'ai_3': 'https://mc-heads.net/avatar/MHF_Creeper'
    };

    const startSinglePlayer = () => {
        setRoomCode('');
        setIsHost(true);
        setRoomSettings(prev => ({ ...prev, baseBet: 0 }));
        const singlePlayer = [{ id: user.uid, name: userProfile?.displayName || '史蒂夫', avatar: userProfile?.avatar || '' }];
        setLobbyPlayers(singlePlayer);
        startGameFromLobby(singlePlayer);
    };

    const sortHand = (hand) => {
        return [...hand].sort((a, b) => {
            const typeOrder = { 'W': 1, 'T': 2, 'S': 3, 'Z': 4 };
            if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
            return a.val - b.val;
        });
    };

    const startGameFromLobby = async (finalLobbyPlayers = lobbyPlayers) => {
        playCachedSound(clickSound);
        setSummaryData(null);

        // 1. 產生 136 張牌並洗牌
        let deck = [];
        let idCounter = 0;
        Object.entries(TILE_DEFS).forEach(([type, symbols]) => {
            symbols.forEach((symbol, idx) => {
                const val = idx + 1;
                for (let i = 0; i < 4; i++) {
                    deck.push({ id: `t_${idCounter++}`, type, val, symbol });
                }
            });
        });
        deck.sort(() => Math.random() - 0.5);

        // 2. 建立 4 人名單
        let roster;
        if (gameContext && gameContext.totalHands > 0) {
            // ✨ 修復 BUG：第二局之後，維持原本座位與玩家，絕對不重新洗牌打亂莊家
            roster = finalLobbyPlayers.map(p => ({ ...p, isMe: p.id === user.uid }));
        } else {
            // ✨ 第一局：補足 AI 並隨機分配座位
            roster = finalLobbyPlayers.map(p => ({ ...p, isMe: p.id === user.uid }));
            const aiNames = ['村民 (AI)', '終界使者 (AI)', '苦力怕 (AI)'];
            while (roster.length < 4) {
                const aiIdx = roster.length;
                roster.push({ id: `ai_${aiIdx}`, name: aiNames[aiIdx - 1], isMe: false });
            }
            roster.sort(() => Math.random() - 0.5); 
        }

        // 3. 發牌 (莊家 17 張，閒家 16 張)
        const nextDealerIdx = gameContext ? gameContext.dealer : 0;
        const finalPlayers = roster.map((p, idx) => {
            const count = idx === nextDealerIdx ? 17 : 16;
            const hand = deck.splice(0, count);
            // ✨ 確保新局開始時，聽牌狀態與自動出牌都會重置
            return { ...p, hand: sortHand(hand), melds: [], discards: [], isTing: false };
        });

        const initialGameState = {
            status: 'playing',
            players: finalPlayers,
            wall: deck,
            currentTurn: nextDealerIdx, // ✨ 由莊家先出牌
            lastDiscard: null,
            pendingAction: null
        };

        if (roomCode && isHost) {
            const dbPlayers = finalPlayers.map(p => ({...p, isMe: false}));
            // ✨ 保護其他玩家手牌順序機制：更新資料庫時僅同步公開資訊
            await window.db.collection("mjRooms").doc(roomCode).update({ ...initialGameState, players: dbPlayers });
        } else if (!roomCode) {
            setPlayers(finalPlayers);
            setWall(deck);
            setCurrentTurn(nextDealerIdx);
            setLastDiscard(null);
            setPendingAction(null);
            setGameState('playing');
            setMyHand(finalPlayers.find(p => p.isMe).hand);
        }

        // ✨ 洗牌特效與音效 (畫面已產生，直接覆蓋在遊戲桌面上)
        setIsShuffling(true);
        const shuffleInterval = setInterval(() => playQuietSound(shuffleSound), 250);
        setTimeout(() => {
            clearInterval(shuffleInterval);
            setIsShuffling(false);
        }, 1500);
    };

    // 打牌邏輯
    const discardTile = async (tileId, declareTing = false, dropPos = null) => {
        if (pendingAction) return; // 攔截狀態不可打牌
        
        const myIndex = players.findIndex(p => p.id === user.uid);
        if (currentTurn !== myIndex) return; // 不是我的局

        const tileToDiscard = myHand.find(t => t.id === tileId);
        const newHand = myHand.filter(t => t.id !== tileId);
        
        playCachedSound(tileSound);
        setMyHand(newHand);
        setSelectedTile(null);

        // ✨ 如果宣告聽牌，標記狀態並發音效
        const newPlayers = [...players];
        if (declareTing) {
            playCachedSound(tingSound);
            newPlayers[myIndex] = { ...newPlayers[myIndex], isTing: true }; // 修正：確保狀態正確觸發 React 渲染
        }

        executeDiscard(myIndex, tileToDiscard, newHand, newPlayers, dropPos);
    };

    const executeDiscard = async (pIndex, tileToDiscard, newHand, customPlayers = null, dropPos = null) => {
        playCachedSound(dropSound); // 播放丟入海底的聲音
        const newPlayers = customPlayers ? [...customPlayers] : [...players];
        newPlayers[pIndex].hand = newHand;
        
        let finalDropX = dropPos?.x ?? (Math.random() * 80 + 10);
        let finalDropY = dropPos?.y ?? (Math.random() * 80 + 10);

        // ✨ 加入 dropTime 來記錄絕對出牌順序，並寫入初始座標與隨機旋轉角度
        const tileWithTime = { 
            ...tileToDiscard, 
            dropTime: Date.now(),
            dropX: finalDropX,
            dropY: finalDropY,
            dropRot: dropPos?.rot ?? (Math.random() * 60 - 30) // -30 到 30 度隨機傾斜
        };
        newPlayers[pIndex].discards.push(tileWithTime);

        // ✨ 物理互斥演算法：大幅降低迭代次數 (20 -> 3)，優化海底效能解決卡頓，並維持互斥碰撞效果
        const allDiscards = newPlayers.flatMap(p => p.discards);
        for (let step = 0; step < 3; step++) {
            for (let i = 0; i < allDiscards.length; i++) {
                for (let j = i + 1; j < allDiscards.length; j++) {
                    let d1 = allDiscards[i];
                    let d2 = allDiscards[j];
                    if (d1.dropX == null || d2.dropX == null) continue;
                    
                    let dx = d1.dropX - d2.dropX;
                    let dy = d1.dropY - d2.dropY;
                    
                    // 防呆：如果完全重疊(機率極低但可能發生)，給予微小擾動
                    if (dx === 0 && dy === 0) { dx = Math.random()*0.1 - 0.05; dy = Math.random()*0.1 - 0.05; }

                    // ✨ 升級為橢圓形碰撞箱：考量麻將牌是長方形，X軸與Y軸的排斥半徑必須不同
                    // 這兩個數值精準對應放大後牌的實際視覺大小，確保完全不重疊
                    let minX = 7.5; 
                    let minY = 16.5; 

                    // 橢圓形碰撞公式：小於 1 代表兩張牌重疊了
                    let overlapRatio = (dx*dx) / (minX*minX) + (dy*dy) / (minY*minY);

                    if (overlapRatio < 1 && overlapRatio > 0.001) {
                        let pushFactor = (1 - Math.sqrt(overlapRatio)) * 0.5;
                        d1.dropX += dx * pushFactor;
                        d1.dropY += dy * pushFactor;
                        d2.dropX -= dx * pushFactor;
                        d2.dropY -= dy * pushFactor;
                    }
                }
            }
        }
        
        // 限制在海底框框內，避免推擠後掉出桌外
        allDiscards.forEach(d => {
            if (d.dropX != null) {
                d.dropX = Math.max(5, Math.min(95, d.dropX));
                d.dropY = Math.max(10, Math.min(90, d.dropY));
            }
        });

        const nextTurn = (pIndex + 1) % 4;

        // 檢查是否有人可以吃/碰/胡
        let canIntercept = false;
        let interceptors = [];
        
        newPlayers.forEach((p, idx) => {
            if (idx === pIndex) return;
            const t = tileToDiscard;
            const matchCount = p.hand.filter(ht => ht.type === t.type && ht.val === t.val).length;
            const isHu = checkHu([...p.hand, t]);
            
            // 檢查是否可以「吃」 (只能吃上家的牌，且字牌不能吃)
            let canChow = false;
            // ✨ 聽牌狀態下，底層引擎直接禁止吃牌
            if (idx === (pIndex + 1) % 4 && t.type !== 'Z' && !p.isTing) {
                const typeHand = p.hand.filter(ht => ht.type === t.type);
                const hasV = (v) => typeHand.some(ht => ht.val === v);
                if ((hasV(t.val - 2) && hasV(t.val - 1)) || 
                    (hasV(t.val - 1) && hasV(t.val + 1)) || 
                    (hasV(t.val + 1) && hasV(t.val + 2))) {
                    canChow = true;
                }
            }

            // ✨ 如果聽牌，只有可以胡的時候才算攔截 (吃碰直接光速跳過，不會空等)
            if (isHu || (!p.isTing && matchCount >= 2) || canChow) {
                canIntercept = true;
                interceptors.push(idx);
            }
        });

        const updateData = {
            players: newPlayers.map(p => ({...p, isMe: false})),
            lastDiscard: { tile: tileToDiscard, from: pIndex },
        };

        
        if (canIntercept) {
            updateData.pendingAction = {
                tile: tileWithTime, 
                from: pIndex,
                expires: Date.now() + 20000, // ✨ 延長至 20 秒反應時間
                interceptors: interceptors // ✨ 記錄誰有資格攔截，供 AI 判斷是否提早結束
            };
        } else {
            // 沒有人能攔截，直接換下家摸牌
            const newWall = [...wall];
            if (newWall.length === 0) {
                // 流局
                handleDrawGame();
                return;
            }
            const drawnTile = newWall.shift();
            updateData.players[nextTurn].hand.push(drawnTile);
            updateData.wall = newWall;
            updateData.currentTurn = nextTurn;
            updateData.pendingAction = null;
        }

        if (roomCode) {
            window.db.collection("mjRooms").doc(roomCode).update(updateData);
        }
        setPlayers(updateData.players);
        setLastDiscard(updateData.lastDiscard);
        setPendingAction(updateData.pendingAction);
        if (!canIntercept) {
            setWall(updateData.wall);
            setCurrentTurn(nextTurn);
            if (updateData.players[nextTurn].id === user.uid) {
                updateMyHandSmartly(updateData.players[nextTurn].hand); // ✨ 改用智慧排序，不打亂手牌
            }
        }
    };

    // ✨ 處理攔截 (碰、吃、胡、過) - 支援 AI 強制代打與參數傳遞
    const handleIntercept = async (actionType, specificTiles = null, forceActorIdx = null) => {
        const actorIdx = forceActorIdx !== null ? forceActorIdx : players.findIndex(p => p.id === user.uid);
        const currentHand = players[actorIdx].hand;
        const tile = pendingAction?.tile;
        
        // ✨ 新增：動作優先級判斷 (胡 > 碰/槓 > 吃)
        if (tile && actionType !== 'pass' && actionType !== 'hu') {
            // 1. 檢查是否有其他玩家可以「胡」
            const someoneCanHu = players.some((p, idx) => idx !== actorIdx && idx !== pendingAction.from && checkHu([...p.hand, tile]));
            if (someoneCanHu) {
                if (forceActorIdx === null) showToast("⚠️ 有其他玩家可胡牌 (優先級最高)！請等待對方決定。");
                return; // 攔截動作暫停執行
            }

            // 2. 如果動作是「吃」，檢查是否有其他玩家可以「碰/槓」
            if (actionType === 'chow') {
                const someoneCanPong = players.some((p, idx) => idx !== actorIdx && idx !== pendingAction.from && p.hand.filter(ht => ht.type === tile.type && ht.val === tile.val).length >= 2);
                if (someoneCanPong) {
                    if (forceActorIdx === null) showToast("⚠️ 有其他玩家可碰牌/槓牌 (優先級較高)！請等待對方決定。");
                    return; // 攔截動作暫停執行
                }
            }
        }

        if (actionType === 'pass') {
            if (forceActorIdx === null) playCachedSound(passSound); // 只有真實玩家按才發出村民的拒絕聲
            proceedNextTurnAfterPass();
            return;
        }

        const newPlayers = [...players];
        
        if (actionType === 'hu') {
            playActorVoice(actorIdx);
            setTimeout(() => playCachedSound(totemSound), 300); // 延遲圖騰音效
            triggerActionBubble(actorIdx, "胡！");
            if (!checkHu([...currentHand, tile])) return showToast("牌型不符 (需 5搭1眼)！");
            handleWin(actorIdx, pendingAction.from);
            return;
        }

        if (actionType === 'pong') {
            playActorVoice(actorIdx);
            setTimeout(() => playCachedSound(tileSound), 150); // 加入牌音效
            triggerActionBubble(actorIdx, "碰！");
            const sameTiles = currentHand.filter(t => t.type === tile.type && t.val === tile.val);
            if (sameTiles.length < 2) return showToast("條件不符！");
            
            const used = [sameTiles[0], sameTiles[1]];
            const remainingHand = currentHand.filter(t => t.id !== used[0].id && t.id !== used[1].id);
            
            newPlayers[actorIdx].hand = remainingHand;
            newPlayers[actorIdx].melds.push({ type: 'pong', tiles: [...used, tile] });
            newPlayers[pendingAction.from].discards.pop();

            
            const updateData = { players: newPlayers.map(p => ({...p, isMe: false})), currentTurn: actorIdx, pendingAction: null, lastDiscard: null };
            if (roomCode) window.db.collection("mjRooms").doc(roomCode).update(updateData);
            setPlayers(newPlayers); 
            setCurrentTurn(actorIdx); 
            setPendingAction(null); 
            if(actorIdx === players.findIndex(p=>p.id===user.uid)) {
                updateMyHandSmartly(remainingHand); // ✨ 改用智慧排序
            }
        }

        if (actionType === 'kong') {
            playActorVoice(actorIdx);
            setTimeout(() => playCachedSound(tileSound), 150); // 加入牌音效
            triggerActionBubble(actorIdx, "槓！");
            const sameTiles = currentHand.filter(t => t.type === tile.type && t.val === tile.val);
            if (sameTiles.length < 3) return showToast("條件不符！");
            
            const used = [sameTiles[0], sameTiles[1], sameTiles[2]];
            const remainingHand = currentHand.filter(t => !used.map(u=>u.id).includes(t.id));
            
            const newWall = [...wall];
            if (newWall.length === 0) return handleDrawGame();
            const drawnTile = newWall.shift(); // 槓牌補牌
            remainingHand.push(drawnTile);
            
            newPlayers[actorIdx].hand = remainingHand;
            newPlayers[actorIdx].melds.push({ type: 'kong', tiles: [...used, tile] });
            newPlayers[pendingAction.from].discards.pop();

            
            const updateData = { players: newPlayers.map(p => ({...p, isMe: false})), currentTurn: actorIdx, pendingAction: null, lastDiscard: null, wall: newWall };
            if (roomCode) window.db.collection("mjRooms").doc(roomCode).update(updateData);
            setPlayers(newPlayers); 
            setCurrentTurn(actorIdx);
            setWall(newWall); 
            setPendingAction(null); 
            if(actorIdx === players.findIndex(p=>p.id===user.uid)) {
                updateMyHandSmartly(remainingHand);
            }
        }

        if (actionType === 'chow') {
            playActorVoice(actorIdx);
            setTimeout(() => playCachedSound(tileSound), 150); // 加入牌音效
            triggerActionBubble(actorIdx, "吃！");
            const used = specificTiles; 
            if (!used || used.length !== 2) return showToast("系統錯誤：未選擇吃的牌");
            
            const remainingHand = currentHand.filter(t => t.id !== used[0].id && t.id !== used[1].id);
            // ✨ 將吃進來的那張牌強制放在中間
            const sortedUsed = [...used].sort((a,b)=>a.val-b.val);
            const meldTiles = [sortedUsed[0], tile, sortedUsed[1]];
            
            newPlayers[actorIdx].hand = remainingHand;
            newPlayers[actorIdx].melds.push({ type: 'chow', tiles: meldTiles });
            newPlayers[pendingAction.from].discards.pop();

            
            const updateData = { players: newPlayers.map(p => ({...p, isMe: false})), currentTurn: actorIdx, pendingAction: null, lastDiscard: null };
            if (roomCode) window.db.collection("mjRooms").doc(roomCode).update(updateData);
            setPlayers(newPlayers); 
            setCurrentTurn(actorIdx); 
            setPendingAction(null); 
            if(actorIdx === players.findIndex(p=>p.id===user.uid)) updateMyHandSmartly(remainingHand); // ✨ 改用智慧排序
        }
    };

    const handleSelfKong = async (option) => {
        playCachedSound(anvilSound);
        const pIdx = currentTurn;
        const newPlayers = [...players];
        const p = newPlayers[pIdx];
        let remainingHand = [...p.hand];
        const newWall = [...wall];
        
        if (newWall.length === 0) return handleDrawGame();
        const drawnTile = newWall.shift(); // 補牌

        if (option.type === 'ankong') {
            const usedIds = option.tiles.map(t => t.id);
            remainingHand = remainingHand.filter(t => !usedIds.includes(t.id));
            p.melds.push({ type: 'ankong', tiles: option.tiles });
        } else if (option.type === 'jiagang') {
            remainingHand = remainingHand.filter(t => t.id !== option.tile.id);
            const mIdx = p.melds.findIndex(m => m === option.targetMeld);
            if (mIdx > -1) {
                p.melds[mIdx].type = 'kong';
                p.melds[mIdx].tiles.push(option.tile);
            }
        }

        remainingHand.push(drawnTile);
        p.hand = remainingHand;

        const updateData = { players: newPlayers.map(pl => ({...pl, isMe: false})), wall: newWall };
        if (roomCode) window.db.collection("mjRooms").doc(roomCode).update(updateData);
        setPlayers(newPlayers);
        setWall(newWall);
        if(p.id === user.uid) updateMyHandSmartly(remainingHand);
    };

    const proceedNextTurnAfterPass = async () => {
        const nextTurn = (pendingAction.from + 1) % 4;
        const newWall = [...wall];
        if (newWall.length === 0) return handleDrawGame();

        const drawnTile = newWall.shift();
        const newPlayers = [...players];
        newPlayers[nextTurn].hand.push(drawnTile);

        const updateData = {
            wall: newWall,
            currentTurn: nextTurn,
            pendingAction: null,
            players: newPlayers.map(p => ({...p, isMe: false}))
        };

        if (roomCode) {
            window.db.collection("mjRooms").doc(roomCode).update(updateData);
        }
        setWall(newWall);
        setCurrentTurn(nextTurn);
        setPendingAction(null);
        setPlayers(newPlayers);
        if (newPlayers[nextTurn].id === user.uid) updateMyHandSmartly(newPlayers[nextTurn].hand); // ✨ 改用智慧排序
    };

    // ✨ 核心：結算與台數計算引擎
    const handleWin = async (winnerIdx, loserIdx = null) => {
        playCachedSound(winSound);
        const isZimo = loserIdx === null;
        
        // 1. 還原最終手牌 (如果是放槍，要把海底那張牌算進來)
        let finalHand = players[winnerIdx].hand;
        if (!isZimo && pendingAction && pendingAction.tile) {
            finalHand = [...finalHand, pendingAction.tile];
        }

        // 2. 計算基本台數與明細
        let baseTai = 0;
        let details = [];
        const melds = players[winnerIdx].melds;
        const allTiles = [...finalHand, ...melds.flatMap(m => m.tiles)];
        
        const counts = {};
        allTiles.forEach(t => counts[t.type + t.val] = (counts[t.type + t.val] || 0) + 1);

        // 門清、自摸、全求人 (暗槓不算破壞門清)
        const isMenQing = melds.every(m => m.type === 'ankong');
        if (isMenQing && isZimo) { baseTai += 3; details.push("門清一摸三 (3台)"); } 
        else {
            if (isMenQing) { baseTai += 1; details.push("門清 (1台)"); }
            if (isZimo) { baseTai += 1; details.push("自摸 (1台)"); }
        }
        if (finalHand.length === 2 && !isZimo) { baseTai += 2; details.push("全求人 (2台)"); }

        // 碰碰胡
        let pairCount = 0;
        let isPongPong = true;
        for (let k in counts) {
            if (counts[k] === 2) pairCount++;
            else if (counts[k] >= 3) { /* 刻子或槓子 ok */ }
            else { isPongPong = false; break; }
        }
        if (isPongPong && pairCount === 1 && !melds.some(m => m.type === 'chow')) {
            baseTai += 4; details.push("碰碰胡 (4台)");
        }

        // 三元牌
        let dragons = 0, dragonPairs = 0;
        ['Z5', 'Z6', 'Z7'].forEach(k => { if (counts[k] >= 3) dragons++; else if (counts[k] === 2) dragonPairs++; });
        if (dragons === 3) { baseTai += 8; details.push("大三元 (8台)"); }
        else if (dragons === 2 && dragonPairs === 1) { baseTai += 4; details.push("小三元 (4台)"); }
        else if (dragons > 0) { baseTai += dragons; details.push(`三元牌 (${dragons}台)`); }

        // 四喜牌
        let winds = 0, windPairs = 0;
        ['Z1', 'Z2', 'Z3', 'Z4'].forEach(k => { if (counts[k] >= 3) winds++; else if (counts[k] === 2) windPairs++; });
        if (winds === 4) { baseTai += 16; details.push("大四喜 (16台)"); }
        else if (winds === 3 && windPairs === 1) { baseTai += 8; details.push("小四喜 (8台)"); }

        // 字一色 / 清一色 / 混一色
        const suitCount = [allTiles.some(t=>t.type==='W'), allTiles.some(t=>t.type==='T'), allTiles.some(t=>t.type==='S')].filter(Boolean).length;
        const hasZ = allTiles.some(t=>t.type==='Z');
        if (suitCount === 0 && hasZ) { baseTai += 16; details.push("字一色 (16台)"); } 
        else if (suitCount === 1 && hasZ) { baseTai += 4; details.push("混一色 (4台)"); } 
        else if (suitCount === 1 && !hasZ) { baseTai += 8; details.push("清一色 (8台)"); }

        // 3. 計算金錢與莊家台 (預設玩家 0 為莊家)
        const base = roomSettings.baseBet || 50;
        const taiBet = roomSettings.taiBet || 20;
        let totalPrize = 0;
        
        const results = players.map((p, idx) => {
            if (idx === winnerIdx) return { ...p, penalty: 0 };
            let penalty = 0;
            
            // 判斷此人是否要賠錢 (自摸三家賠，放槍苦主賠)
            if (isZimo || idx === loserIdx) {
                let pTai = baseTai;
                // ✨ 修復 BUG：使用正確的 gameContext.dealer 判斷莊家，而非寫死 0
                if (winnerIdx === gameContext.dealer || idx === gameContext.dealer) pTai += 1; 
                
                penalty = base + (pTai * taiBet); // 底 + 台
                totalPrize += penalty;
            }
            return { ...p, penalty };
        });

        results[winnerIdx].prize = totalPrize;

        // ✨ 連莊與局數計算引擎
        let newContext = { ...gameContext };
        let isDealerWin = (winnerIdx === newContext.dealer);
        
        if (isDealerWin) {
            newContext.consecutive += 1; // 莊家贏，連莊
        } else {
            newContext.dealer = (newContext.dealer + 1) % 4; // 換下家做莊
            newContext.consecutive = 0;
            newContext.round += 1;
            if (newContext.round > 3) {
                newContext.round = 0;
                newContext.wind = (newContext.wind + 1) % 4;
            }
        }
        newContext.totalHands += 1;

        // 計算此局後的累計分數
        newContext.scores = newContext.scores.map((score, i) => {
            if (i === winnerIdx) return score + totalPrize;
            return score - results[i].penalty;
        });

        // 莊家台計算與顯示 (底台+連莊)
        if (winnerIdx === gameContext.dealer || loserIdx === gameContext.dealer) {
            const dTai = 1 + gameContext.consecutive * 2;
            details.push(`莊家連${gameContext.consecutive} (${dTai}台)`);
        }

        // 清除上一局的準備狀態
        const resetPlayersForSummary = players.map(p => ({ ...p, isReady: false, isMe: false })); 

        const updateData = {
            status: 'summary',
            winner: players[winnerIdx].name,
            results,
            isZimo,
            taiDetails: details,
            gameContext: newContext,
            huTile: isZimo ? finalHand[finalHand.length - 1] : pendingAction.tile, 
            dealerIdx: gameContext.dealer,
            players: resetPlayersForSummary
        };

        setAutoReadyTimer(60); // ✨ 進入結算前重置 60 秒自動準備倒數

        // ✨ 真實倒牌動畫資料
        const winAnimData = { 
            winnerIdx, 
            name: players[winnerIdx].name, 
            hand: finalHand,
            isZimo,
            loserName: !isZimo && loserIdx !== null ? players[loserIdx].name : null 
        };

        // ✨ 真實寫入引擎：不論單機或連線，只要有輸贏都實際結算到 Firebase
        const batch = window.db.batch();
        const fb = typeof firebase !== 'undefined' ? firebase : window.firebase;
        const increment = fb.firestore.FieldValue.increment;
        let hasMoneyChange = false;

        results.forEach((r, i) => {
            const uid = players[i].id;
            // 只對真實玩家扣款/加錢 (過濾掉 ai_ 開頭的機器人)
            if (!uid.startsWith('ai_')) {
                const ref = window.db.collection('users').doc(uid);
                const amount = i === winnerIdx ? r.prize : -r.penalty;
                if (amount !== 0) {
                    // ✨ 關鍵修正：使用 set 與 merge: true，完美避開缺乏 mcData 物件導致的報錯崩潰！
                    batch.set(ref, { 
                        coins: increment(amount), 
                        mcData: { diamonds: increment(amount) } 
                    }, { merge: true });
                    hasMoneyChange = true;
                }
            }
        });

        if (roomCode) {
            // 連線模式：更新房間狀態，觸發前端動畫
            const roomRef = window.db.collection("mjRooms").doc(roomCode);
            batch.update(roomRef, { 
                winAnimation: winAnimData,
                pendingAction: null // 清除攔截狀態
            });
            
            await batch.commit().catch(e => console.error("連線結算失敗", e));

            setTimeout(() => {
                window.db.collection("mjRooms").doc(roomCode).update({ ...updateData, winAnimation: null });
            }, 4000);
        } else {
            // 單機模式：只提交金錢變更，然後直接跑動畫
            if (hasMoneyChange) {
                await batch.commit().catch(e => console.error("單機結算失敗", e));
            }
            
            setPendingAction(null);
            setWinAnimation(winAnimData);
            setTimeout(() => {
                setWinAnimation(null);
                setPlayers(resetPlayersForSummary);
                setSummaryData(updateData);
                setGameState('summary');
            }, 4000);
        }
    };

    const handleDrawGame = () => {
        let newContext = { ...gameContext };
        newContext.consecutive += 1; // 流局原莊家連莊
        newContext.totalHands += 1;

        const resetPlayersForSummary = players.map(p => ({ ...p, isReady: false, isMe: false }));
        setAutoReadyTimer(60); // ✨ 進入結算前重置 60 秒自動準備倒數

        const updateData = {
            status: 'summary',
            winner: '流局',
            results: players.map(p => ({ ...p, penalty: 0, prize: 0 })),
            gameContext: newContext,
            dealerIdx: gameContext.dealer,
            players: resetPlayersForSummary
        };
        if (roomCode) window.db.collection("mjRooms").doc(roomCode).update(updateData);
        else setPlayers(resetPlayersForSummary);
        
        setSummaryData(updateData);
        setGameState('summary');
    };

    // Firebase 狀態同步
    useEffect(() => {
        if ((gameState === 'lobby' || gameState === 'playing' || gameState === 'summary') && roomCode) {
            const unsub = window.db.collection("mjRooms").doc(roomCode).onSnapshot((snapshot) => {
                const data = snapshot.data();
                if (data) {
                    if (![...(data.players||[]), ...(data.spectators||[])].find(p=>p.id === user.uid) && !isHost) {
                        showToast("🚪 你已離開房間！");
                        setRoomCode('');
                        setGameState('menu');
                        return;
                    }

                    setLobbyPlayers(data.players || []);
                    if (data.status === 'lobby' && gameState !== 'lobby') setGameState('lobby');

                    if (data.status === 'playing' || data.status === 'summary') {
                        // ✨ 修復 BUG：允許從 summary (結算) 直接無縫進入下一局的 playing
                        if ((gameState === 'lobby' || gameState === 'summary') && data.status === 'playing') setGameState('playing');
                        
                        const syncedPlayers = (data.players || []).map(p => ({ ...p, isMe: p.id === user.uid }));
                        setPlayers(syncedPlayers);
                        setIsSpectator(!syncedPlayers.some(p => p.isMe));
                        
                        const myPlayer = syncedPlayers.find(p => p.isMe);
                        if (myPlayer && data.status !== 'summary') {
                            updateMyHandSmartly(myPlayer.hand); // ✨ 統一透過專屬函式保護排序
                        }

                        setWall(data.wall || []);
                        setCurrentTurn(data.currentTurn);
                        setLastDiscard(data.lastDiscard);
                        setPendingAction(data.pendingAction);

                        if (data.chats) {
                            setChatMessages(data.chats);
                            const lastChat = data.chats[data.chats.length - 1];
                            if (lastChat && Date.now() - lastChat.time < 3000) {
                                setFloatingChats(prev => ({ ...prev, [lastChat.senderId]: lastChat.text }));
                                setTimeout(() => setFloatingChats(prev => ({ ...prev, [lastChat.senderId]: null })), 3000);
                            }
                        }

                        if (data.gameContext) setGameContext(data.gameContext);
                        if (data.roomSettings) setRoomSettings(data.roomSettings);
                        
                        // ✨ 同步倒牌動畫
                        if (data.winAnimation !== undefined) setWinAnimation(data.winAnimation);

                        if (data.status === 'summary') {
                            setSummaryData(data);
                            setGameState('summary');
                        }
                    }
                }
            });
            return () => unsub();
        }
    }, [gameState, roomCode, isHost, user.uid]);

    // ✨ 計算聽牌提示
    useEffect(() => {
        const myPlayer = players.find(p => p.id === user?.uid);
        if (gameState === 'playing' && myPlayer && myPlayer.id === players[currentTurn]?.id && !pendingAction && !myPlayer.isTing) {
            setTingOptions(checkTingOptions(myHand));
        } else {
            setTingOptions(null);
        }
    }, [myHand, currentTurn, gameState, pendingAction, players, user?.uid]);

    // ✨ 聽牌後自動摸打
    useEffect(() => {
        const myPlayer = players.find(p => p.id === user?.uid);
        if (gameState === 'playing' && myPlayer?.isTing && currentTurn === players.findIndex(p=>p.id===user?.uid) && !pendingAction) {
            const timer = setTimeout(() => {
                if (checkHu(myHand)) handleWin(currentTurn, null);
                else discardTile(myHand[myHand.length - 1].id);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [myHand, currentTurn, gameState, pendingAction, players, user?.uid]);

    // ✨ 結算畫面自動倒數與全員準備偵測 (徹底解決換局當機問題)
    useEffect(() => {
        if (gameState === 'summary') {
            const isGameOver = checkIsGameOver();
            
            // 1. 5秒自動準備倒數
            if (!isGameOver && autoReadyTimer > 0) {
                const timer = setTimeout(() => setAutoReadyTimer(prev => prev - 1), 1000);
                return () => clearTimeout(timer);
            } else if (!isGameOver && autoReadyTimer === 0) {
                // 時間到自動觸發準備
                const myPlayer = players.find(p => p.id === user.uid);
                if (myPlayer && !myPlayer.isReady) {
                    const newPlayers = players.map(p => p.id === user.uid ? { ...p, isReady: true, isMe: false } : { ...p, isMe: false });
                    if (roomCode) window.db.collection("mjRooms").doc(roomCode).update({ players: newPlayers });
                    else setPlayers(players.map(p => p.id === user.uid ? { ...p, isReady: true } : p));
                }
            }

            // 2. 房主偵測「全員就緒」後，自動無縫開局
            if ((!roomCode || isHost) && !isGameOver && players.length > 0) {
                const allReady = players.every(p => p.isReady || p.id.startsWith('ai_') || p.isDisconnected);
                if (allReady) {
                    startGameFromLobby(players);
                }
            }
        }
    }, [gameState, autoReadyTimer, players, roomCode, isHost]);

    // ✨ 新增：常規回合的倒數計時器
    useEffect(() => {
        if (gameState !== 'playing' || pendingAction || winAnimation) return; // ✨ 加上 winAnimation 阻斷計時
        
        setTimeLeft(roomSettings.turnTime || 20); // ✨ 配合預設 20 秒
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // ✨ 倒數結束自動出牌 (限自己的回合且非攔截中)
                    if (players[currentTurn]?.id === user.uid && !pendingAction) {
                        const lastTile = myHand[myHand.length - 1];
                        if (lastTile) discardTile(lastTile.id);
                    }
                    return 0;
                }
                if (prev <= 4 && players[currentTurn]?.id === user.uid) playCachedSound(alertSound);
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(timer);
    }, [currentTurn, gameState, pendingAction, roomSettings.turnTime, players, user.uid]);

    // AI 自動打牌與 pending 倒數
    useEffect(() => {
        if (gameState !== 'playing' || winAnimation) return; // ✨ 加上 winAnimation 阻斷計時，防止動畫期間 AI 亂動

        // ✨ 處理 pendingAction (攔截倒數與 AI 自動吃碰胡)
        if (pendingAction) {
            let aiHandled = false;
            let timeoutId;
            let autoHuTimeout; // ✨ 新增：真人自動胡牌的計時器
            
            // ✨ 真人聽牌自動胡牌引擎：如果有攔截資格(只能是胡)，自動幫你喊胡
            const myIdx = players.findIndex(p => p.id === user?.uid);
            const myPlayer = players[myIdx];
            if (myPlayer?.isTing && pendingAction.interceptors?.includes(myIdx)) {
                if (checkHu([...myPlayer.hand, pendingAction.tile])) {
                    autoHuTimeout = setTimeout(() => handleIntercept('hu', null, myIdx), 800);
                }
            }

            // AI 攔截判斷 (單機或房主代管)
            if (!roomCode || isHost) {
                const aiPlayers = players.filter(p => p.id.startsWith('ai_') && players.findIndex(x=>x.id===p.id) !== pendingAction.from);
                const t = pendingAction.tile;
                
                // 1. 優先判斷：有沒有任何 AI 可以胡牌？
                for (let ai of aiPlayers) {
                    if (aiHandled) break;
                    const aiIdx = players.findIndex(p => p.id === ai.id);
                    if (checkHu([...ai.hand, t])) {
                        aiHandled = true; timeoutId = setTimeout(() => handleIntercept('hu', null, aiIdx), 1000); break;
                    }
                }

                // 2. 次優先判斷：有沒有任何 AI 可以碰/槓？
                if (!aiHandled) {
                    for (let ai of aiPlayers) {
                        if (aiHandled) break;
                        const aiIdx = players.findIndex(p => p.id === ai.id);
                        if (ai.hand.filter(ht => ht.type === t.type && ht.val === t.val).length >= 2 && Math.random() > 0.1) {
                            // ✨ 防護：檢查有沒有「真實玩家」可以胡牌 (優先級最高)，有的話 AI 就讓步，不偷碰
                            const humanCanHu = players.some((p, i) => !p.id.startsWith('ai_') && i !== pendingAction.from && checkHu([...p.hand, t]));
                            if (!humanCanHu) {
                                aiHandled = true; timeoutId = setTimeout(() => handleIntercept('pong', null, aiIdx), 1000); break;
                            }
                        }
                    }
                }

                // 3. 最低優先判斷：有沒有任何 AI 可以吃？
                if (!aiHandled) {
                    for (let ai of aiPlayers) {
                        if (aiHandled) break;
                        const aiIdx = players.findIndex(p => p.id === ai.id);
                        if (pendingAction.from === (aiIdx + 3) % 4 && t.type !== 'Z' && Math.random() > 0.15) {
                            // ✨ 防護：檢查有沒有「真實玩家」可以胡或碰/槓 (優先級較高)
                            const humanCanHuOrPong = players.some((p, i) => !p.id.startsWith('ai_') && i !== pendingAction.from && (
                                checkHu([...p.hand, t]) || p.hand.filter(ht => ht.type === t.type && ht.val === t.val).length >= 2
                            ));
                            if (!humanCanHuOrPong) {
                                const typeHand = ai.hand.filter(ht => ht.type === t.type);
                                const getT = v => typeHand.find(ht => ht.val === v);
                                let chowTiles = (getT(t.val-2) && getT(t.val-1)) ? [getT(t.val-2), getT(t.val-1)] : 
                                                (getT(t.val-1) && getT(t.val+1)) ? [getT(t.val-1), getT(t.val+1)] : 
                                                (getT(t.val+1) && getT(t.val+2)) ? [getT(t.val+1), getT(t.val+2)] : null;
                                if (chowTiles) {
                                    aiHandled = true; timeoutId = setTimeout(() => handleIntercept('chow', chowTiles, aiIdx), 1500); break;
                                }
                            }
                        }
                    }
                }
            }

            const interval = setInterval(() => {
                const left = Math.max(0, pendingAction.expires - Date.now());
                setActionTimer(Math.floor(left / 1000));
                
                // ✨ 提早跳過邏輯：如果真人沒有動作可做，且 AI 也決定不攔截，不需苦等 20 秒
                if (!aiHandled && (!roomCode || isHost)) {
                    // 檢查是否有「非斷線的真人」有資格攔截
                    const humanCanAct = pendingAction.interceptors?.some(idx => !players[idx].id.startsWith('ai_') && !players[idx].isDisconnected);
                    if (!humanCanAct && left < 19000) { // 給 1 秒的緩衝視覺停頓
                        clearInterval(interval);
                        proceedNextTurnAfterPass();
                        return;
                    }
                }

                // 如果時間到且沒有 AI 攔截，自動過
                if (left === 0) {
                    clearInterval(interval);
                    if (!aiHandled && (!roomCode || isHost)) proceedNextTurnAfterPass();
                }
            }, 1000);

            return () => { clearInterval(interval); clearTimeout(timeoutId); clearTimeout(autoHuTimeout); };
        }

        // 處理 AI 自動打牌
        const cp = players[currentTurn];
        if (!cp || (!cp.id.startsWith('ai_') && !cp.isDisconnected)) return;
        if (roomCode && !isHost) return; // 連線模式下由房主電腦控制 AI

        const timer = setTimeout(() => {
            // 檢查 AI 是否自摸
            if (checkHu(cp.hand)) {
                handleWin(currentTurn, null);
                return;
            }
            // AI 隨機打出一張牌 (通常打最後一張摸進的)
            const tileToDiscard = cp.hand[cp.hand.length - 1];
            const newHand = cp.hand.slice(0, -1);
            executeDiscard(currentTurn, tileToDiscard, newHand);
            playCachedSound(tileSound);
        }, 1500);

        return () => clearTimeout(timer);
    }, [gameState, currentTurn, pendingAction, players, roomCode, isHost]);


    // ✨ 計算自己目前可用的攔截動作與高亮的牌
    const myIdx = players.findIndex(p => p.id === user?.uid);
    let canHu = false;
    let canPong = false;
    let canKong = false;
    let chowOptions = [];
    let highlightIds = [];
    let selfKongOptions = [];

    // 計算暗槓/加槓 (自己的回合且尚未出牌)
    if (players[currentTurn]?.id === user?.uid && !pendingAction && !isSpectator) {
        const counts = {};
        myHand.forEach(t => {
            const k = `${t.type}_${t.val}`;
            if (!counts[k]) counts[k] = [];
            counts[k].push(t);
        });
        Object.values(counts).forEach(tiles => {
            if (tiles.length === 4) selfKongOptions.push({ type: 'ankong', tiles });
        });
        const myMelds = players[currentTurn].melds || [];
        myMelds.forEach(m => {
            if (m.type === 'pong') {
                const match = myHand.find(t => t.type === m.tiles[0].type && t.val === m.tiles[0].val);
                if (match) selfKongOptions.push({ type: 'jiagang', tile: match, targetMeld: m });
            }
        });
    }

    if (pendingAction && myIdx !== -1 && pendingAction.from !== myIdx && !isSpectator) {
        const t = pendingAction.tile;
        if (checkHu([...myHand, t])) canHu = true;
        
        const matchingTiles = myHand.filter(ht => ht.type === t.type && ht.val === t.val);
        // ✨ 聽牌後禁止吃碰槓，只能胡牌
        if (matchingTiles.length >= 2 && !players[myIdx]?.isTing) {
            canPong = true;
            highlightIds.push(matchingTiles[0].id, matchingTiles[1].id);
        }
        if (matchingTiles.length >= 3 && !players[myIdx]?.isTing) {
            canKong = true;
            highlightIds.push(matchingTiles[2].id);
        }

        // 吃牌只看上家
        if (pendingAction.from === (myIdx + 3) % 4 && t.type !== 'Z' && !players[myIdx]?.isTing) {
            const typeHand = myHand.filter(ht => ht.type === t.type);
            const getTile = (v) => typeHand.find(ht => ht.val === v);
            
            const tM2 = getTile(t.val - 2); const tM1 = getTile(t.val - 1);
            const tP1 = getTile(t.val + 1); const tP2 = getTile(t.val + 2);

            if (tM2 && tM1) { chowOptions.push({ label: `吃 ${tM2.symbol}${tM1.symbol}`, tiles: [tM2, tM1] }); highlightIds.push(tM2.id, tM1.id); }
            if (tM1 && tP1) { chowOptions.push({ label: `吃 ${tM1.symbol}${tP1.symbol}`, tiles: [tM1, tP1] }); highlightIds.push(tM1.id, tP1.id); }
            if (tP1 && tP2) { chowOptions.push({ label: `吃 ${tP1.symbol}${tP2.symbol}`, tiles: [tP1, tP2] }); highlightIds.push(tP1.id, tP2.id); }
        }
    }

    // ✨ UI 輔助渲染組件 (支援 mini 縮小版與超大 Emoji)
   // ✨ 統一渲染麻將牌 - 超立體雕刻風格 (支援拖曳)
    const TileBlock = ({ tile, mini = false, isHighlighted = false, selected = false, onClick = undefined }) => {
        if (!tile) return null;

        // 定義牌面文字雕刻顏色 (模擬實體雕刻後的填色)
        const getTileColor = (type, val) => {
            if (tile.isBack) return 'text-emerald-500'; // 未開牌的綠背，不顯示字
            if (type === 'W') return 'text-red-600'; // 萬
            if (type === 'T') return 'text-zinc-950'; // 筒
            if (type === 'S') return 'text-emerald-700'; // 條
            if (type === 'Z') { // 字牌
                if (val <= 4) return 'text-zinc-950'; // 東南西北
                if (val === 5) return 'text-red-600'; // 中
                if (val === 6) return 'text-emerald-700'; // 發
                if (val === 7) return 'text-zinc-950'; // 白板
            }
            return 'text-zinc-950';
        };

        // 定義牌身顏色 (模擬竹背或玉背)
        const getSideColor = (type, val) => {
            if (tile.isBack) return 'bg-emerald-700'; // 未開牌顯示背面綠色
            // 根據牌型給予不同側邊基色，增加層次
            if (['W', 'D', 'F', 'S'].includes(type)) return 'bg-rose-50'; // 特殊牌用粉白側邊
            return 'bg-amber-100'; // 普通萬筒條用淺黃側邊
        };

        const sideColor = getSideColor(tile.type, tile.val);
        // 牌面永遠是白色
        const faceColor = 'bg-stone-50';

        // 移除 hover:-translate-y-1，避免滑鼠在邊緣時觸發上下跳動的迴圈 (twitching)
        const baseClasses = `relative select-none transition-all duration-300 rounded ${isHighlighted ? 'ring-4 ring-amber-400 scale-105 shadow-2xl z-20' : ''} ${selected ? 'scale-110 -translate-y-3 shadow-2xl z-30 ring-2 ring-emerald-400' : ''} ${onClick ? 'cursor-pointer' : ''}`;

        return (
            <div className={`${baseClasses} ${mini ? 'w-8 h-10 sm:w-10 sm:h-[52px]' : 'w-12 h-16 sm:w-14 sm:h-[72px]'} group relative`} onClick={onClick}>
                
                {/* ✨ 1. 牌背層 (模擬前後立體感，向右下方偏移產生實體厚度) */}
                <div className={`absolute top-[3px] left-[3px] sm:top-[4px] sm:left-[4px] w-full h-full ${tile.isBack ? 'bg-emerald-900' : 'bg-emerald-700'} rounded-md border-2 border-stone-800 shadow-md z-0`}></div>

                {/* ✨ 2. 牌面層 (正面平鋪，蓋在牌背上方，並加上細微內陰影增加真實感) */}
                <div className={`absolute top-0 left-0 w-full h-full ${tile.isBack ? 'bg-emerald-700' : faceColor} rounded-md border-2 border-stone-800 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.9),_inset_-1px_-1px_3px_rgba(0,0,0,0.1)] z-10 flex items-center justify-center overflow-hidden`}>

                    {/* ✨ 3. 牌面字體 (平面置中，完美對齊) */}
                    {!tile.isBack && (
                        <span className={`flex items-center justify-center w-full h-full ${mini ? 'text-[36px] sm:text-[44px]' : 'text-[56px] sm:text-[68px]'} font-black ${getTileColor(tile.type, tile.val)} drop-shadow-sm leading-none pointer-events-none`}>
                            {tile.symbol}
                        </span>
                    )}

                </div>

            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] bg-stone-900 bg-opacity-95 flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in">
            <div className="w-full max-w-6xl flex justify-between items-center mb-2">
                <h1 className="text-2xl font-black text-white tracking-wide drop-shadow-md flex items-center">
                    <span className="material-symbols-outlined mr-2 text-emerald-400">grid_view</span> 
                    史蒂夫麻將 (16張)
                </h1>
                <button onClick={quitAndLeaveRoom} className="bg-[#c6c6c6] hover:bg-red-500 hover:text-white text-[#373737] border-2 border-white border-r-[#555] border-b-[#555] px-3 py-1 font-bold flex items-center">
                    <span className="material-symbols-outlined mr-1 text-sm">close</span> 關閉
                </button>
            </div>

            <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] w-full max-w-6xl shadow-2xl flex flex-col flex-grow relative overflow-hidden">
                
                {gameState === 'menu' && (
                    <div className="flex flex-col items-center justify-center flex-grow space-y-4">
                        <span className="text-8xl drop-shadow-md mb-4 leading-none">🀄</span>
                        <button onClick={() => { playCachedSound(clickSound); startSinglePlayer(); }} className="w-64 py-3 flex justify-center items-center bg-[#8b8b8b] hover:bg-[#a0a0a0] text-white border-4 border-white border-r-[#555] border-b-[#555] text-xl font-black shadow-lg">
                            <span className="material-symbols-outlined mr-2">computer</span> 單人訓練 (打 AI)
                        </button>
                        <button onClick={() => { playCachedSound(clickSound); setGameState('multiplayer_setup'); }} className="w-64 py-3 flex justify-center items-center bg-amber-500 hover:bg-amber-400 text-[#373737] border-4 border-white border-r-[#555] border-b-[#555] text-xl font-black shadow-lg">
                            <span className="material-symbols-outlined mr-2">wifi</span> 多人連線對戰
                        </button>
                    </div>
                )}

                {gameState === 'multiplayer_setup' && (
                    <div className="flex flex-col items-center justify-start sm:justify-center flex-grow space-y-6 p-4 overflow-y-auto custom-scrollbar">
                        <div className="bg-[#8b8b8b] p-6 border-4 border-white border-r-[#555] border-b-[#555] w-full max-w-md shadow-lg my-auto">
                            <h2 className="text-xl font-black text-white mb-4 border-b-2 border-[#555] pb-2">創建新遊戲</h2>
                            <label className="flex items-center text-white font-bold mb-4">
                                <span className="w-24 text-sm">底 / 台:</span>
                                <select className="flex-grow p-1 text-stone-900 font-bold" value={`${roomSettings.baseBet}/${roomSettings.taiBet}`} onChange={e => {
                                    const [b, t] = e.target.value.split('/').map(Number);
                                    setRoomSettings({...roomSettings, baseBet: b, taiBet: t});
                                }}>
                                    <option value="30/10">30底 / 10台</option>
                                    <option value="50/20">50底 / 20台 (標準)</option>
                                    <option value="100/20">100底 / 20台</option>
                                    <option value="100/50">100底 / 50台</option>
                                    <option value="300/100">300底 / 100台</option>
                                </select>
                            </label>
                            <label className="flex items-center text-white font-bold mb-4">
                                <span className="w-24 text-sm">遊戲長度:</span>
                                <select className="flex-grow p-1 text-stone-900 font-bold" value={roomSettings.length} onChange={e => {
                                    setRoomSettings({...roomSettings, length: e.target.value});
                                }}>
                                    <option value="1局">1局 (含連莊直到下莊)</option>
                                    <option value="1圈">1圈 (打完一整個東風圈)</option>
                                    <option value="1將">1將 (打完東南西北四圈)</option>
                                    <option value="無限">無限制</option>
                                </select>
                            </label>
                            <button onClick={async () => {
                                playCachedSound(clickSound);
                                const requiredCoins = roomSettings.baseBet * 10;
                                if ((userProfile?.coins || 1000) < requiredCoins) return showToast(`籌碼不足！建議準備 ${requiredCoins} 💎 以上。`);
                                
                                const code = Math.floor(100000 + Math.random() * 900000).toString();
                                await window.db.collection("mjRooms").doc(code).set({
                                    hostId: user.uid, roomCode: code, status: 'lobby',
                                    roomSettings: roomSettings,
                                    gameContext: { wind: 0, round: 0, dealer: 0, consecutive: 0, scores: [0,0,0,0], totalHands: 0 },
                                    players: [{ id: user.uid, name: userProfile?.displayName || '史蒂夫(房主)', avatar: userProfile?.avatar || '' }]
                                });
                                setRoomCode(code); setIsHost(true); setGameState('lobby');
                            }} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black border-2 border-emerald-400 shadow-md">
                                建立大廳
                            </button>
                        </div>

                        <div className="bg-[#8b8b8b] p-6 border-4 border-white border-r-[#555] border-b-[#555] w-full max-w-md shadow-lg">
                            <h2 className="text-xl font-black text-white mb-4 border-b-2 border-[#555] pb-2">加入房間</h2>
                            <input type="text" maxLength={6} placeholder="輸入 6 位代碼" className="w-full p-2 mb-4 text-center text-xl tracking-widest font-bold" value={roomJoinCode} onChange={(e) => setRoomJoinCode(e.target.value.replace(/\D/g, ''))} />
                            <button onClick={async () => {
                                playCachedSound(clickSound);
                                if(roomJoinCode.length !== 6) return showToast("請輸入 6 位代碼！");
                                const roomRef = window.db.collection("mjRooms").doc(roomJoinCode);
                                const snap = await roomRef.get();
                                if (!snap.exists) return showToast("房間不存在！");
                                const d = snap.data();
                                const reqCoins = (d.roomSettings?.baseBet || 50) * 10;
                                if ((userProfile?.coins || 1000) < reqCoins) return showToast("您的籌碼不足以加入此房間！");
                                
                                await roomRef.update({ players: [...d.players, { id: user.uid, name: userProfile?.displayName || '挑戰者', avatar: userProfile?.avatar || '' }] });
                                setRoomCode(roomJoinCode); setIsHost(false); setGameState('lobby');
                            }} className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-black border-2 border-amber-300 shadow-md">
                                加入連線
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'lobby' && (
                    <div className="flex flex-col items-center justify-center flex-grow p-4">
                        <div className="bg-[#8b8b8b] p-6 border-4 border-white border-r-[#555] border-b-[#555] w-full max-w-md shadow-2xl">
                            <h2 className="text-xl font-black text-white mb-4 flex justify-between">
                                遊戲大廳 <span className="text-amber-400">#{roomCode}</span>
                            </h2>
                            <div className="space-y-2 mb-6">
                                {lobbyPlayers.map((p, i) => (
                                    <div key={i} className="flex items-center bg-stone-200 p-2 border-2 border-[#555] font-bold text-stone-800">
                                        <span className="material-symbols-outlined mr-2">person</span> {p.name}
                                    </div>
                                ))}
                                {[...Array(4 - lobbyPlayers.length)].map((_, i) => (
                                    <div key={i} className="flex items-center bg-stone-400/50 p-2 border-2 border-dashed border-[#555] text-stone-600 font-bold">
                                        等待加入...
                                    </div>
                                ))}
                            </div>
                            {isHost && (
                                <button onClick={() => startGameFromLobby(lobbyPlayers)} className="w-full py-3 bg-emerald-600 text-white font-black border-2 border-emerald-400 shadow-md">
                                    開始遊戲 (補足 AI)
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className="flex flex-col flex-grow relative bg-[#6a994e] overflow-hidden">
                        {/* 頂部資訊列 */}
                        <div className="absolute top-0 w-full flex justify-between p-2 pointer-events-none z-[100]">
                            <div className="flex gap-2">
                                <div className="bg-stone-900/90 text-white px-3 py-1 font-bold text-sm border-2 border-amber-500 shadow-md">
                                    {['東','南','西','北'][gameContext.wind]}風{['一','二','三','四'][gameContext.round]}局 
                                    <span className="text-amber-400 ml-2">連莊 {gameContext.consecutive}</span>
                                </div>
                                <div className="bg-stone-900/80 text-white px-3 py-1 font-mono font-bold text-sm border-2 border-stone-600 hidden sm:block">
                                    剩餘: <span className="text-amber-400">{wall.length}</span> 張
                                </div>
                            </div>
                            
                            {/* ✨ 視覺化倒數進度條 (更新攔截時間為 20 秒) */}
                            <div className="w-32 sm:w-64 h-2 sm:h-3 bg-stone-900 border-2 border-stone-600 rounded-full overflow-hidden shadow-inner mt-1">
                                <div 
                                    className={`h-full transition-all duration-1000 ease-linear ${pendingAction ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                    style={{ width: pendingAction ? `${(actionTimer / 20) * 100}%` : `${(timeLeft / (roomSettings.turnTime || 20)) * 100}%` }}
                                ></div>
                            </div>

                            <button onClick={() => setShowChatModal(true)} className="pointer-events-auto bg-stone-800 text-white p-2 rounded-full shadow-lg hover:bg-stone-700">
                                <span className="material-symbols-outlined">chat</span>
                            </button>
                        </div>

                        {/* ✨ 其他三家狀態 (左、上、右) - 徹底修復重疊問題 */}
                        <div className="absolute inset-0 pointer-events-none z-20">
                            {(() => {
                                const myIdx = players.findIndex(p => p.id === user?.uid) !== -1 ? players.findIndex(p => p.id === user?.uid) : 0;
                                const leftIdx = (myIdx + 3) % 4;
                                const topIdx = (myIdx + 2) % 4;
                                const rightIdx = (myIdx + 1) % 4;

                                const renderOpponent = (pIdx, pos) => {
                                    const p = players[pIdx];
                                    if (!p) return null;
                                    const isTurn = currentTurn === pIdx;
                                    const avatarImg = p.id.startsWith('ai_') ? AI_AVATARS[p.id] : (p.avatar || 'https://minotar.net/helm/Steve/64.png');
                                    
                                    // 取消內部 absolute，讓外層決定絕對位置，徹底避免跑到海底
                                    return (
                                        <div className={`flex ${pos === 'top' ? 'flex-col' : pos === 'left' ? 'flex-row' : 'flex-row-reverse'} items-center gap-2 pointer-events-auto`}>
                                            {/* ✨ 對手動畫：加上發光與脈衝動畫，讓遊戲更生動 */}
                                            <div className={`flex flex-col items-center bg-stone-800/95 p-2 border-2 ${isTurn ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.8)] scale-110 animate-pulse' : 'border-stone-600'} rounded-lg transition-all duration-300`}>
                                                <div className="w-8 h-8 sm:w-12 sm:h-12 mb-1 border-2 border-stone-500 bg-stone-700 relative overflow-hidden">
                                                    {isTurn && <div className="absolute inset-0 bg-amber-400/30 animate-pulse z-10"></div>}
                                                    <img src={avatarImg} alt={p.name} className="w-full h-full object-cover pixelated" />
                                                    {p.isTing && <div className="absolute bottom-0 w-full bg-red-600 text-white text-[8px] sm:text-[10px] font-black text-center shadow-[0_0_10px_red]">聽牌</div>}
                                                </div>
                                                <span className="text-white text-[10px] sm:text-xs font-bold max-w-[80px] truncate">{p.name}</span>
                                                <div className="text-emerald-400 text-[10px] font-bold bg-black/50 px-2 rounded mt-1">剩 {p.hand.length} 張</div>
                                            </div>
                                            
                                            {/* ✨ 獨立出來的麻將顆粒區 (如果倒牌則攤開顯示真實手牌) */}
                                            <div className={`flex ${pos === 'top' ? 'flex-row' : 'flex-col'} gap-[1px] items-center justify-center`}>
                                                {winAnimation?.winnerIdx === pIdx ? (
                                                    <div className={`flex ${pos === 'top' ? 'flex-row' : 'flex-col'} gap-0.5 animate-in zoom-in duration-500 shadow-[0_0_30px_rgba(251,191,36,0.8)] p-2 rounded-lg bg-amber-500/20`}>
                                                        {winAnimation.hand.map((t, i) => (
                                                            <div key={i} style={{ transform: pos === 'left' ? 'rotate(90deg)' : pos === 'right' ? 'rotate(-90deg)' : 'none' }}>
                                                                <TileBlock tile={t} mini={true} isHighlighted={true} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    p.hand.map((_, i) => (
                                                        <div key={i} className={`bg-emerald-700 border border-stone-900 rounded-[2px] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.3)] ${pos === 'top' ? 'w-3 h-5 sm:w-4 sm:h-6' : 'w-5 h-3 sm:w-6 sm:h-4'}`}></div>
                                                    ))
                                                )}
                                            </div>

                                            {p.melds && p.melds.length > 0 && (
                                                <div className={`flex ${pos === 'top' ? 'flex-row' : 'flex-col'} gap-1 bg-black/60 p-1 rounded-lg border border-stone-400 shadow-xl overflow-visible`}>
                                                    {p.melds.map((m, i) => (
                                                        <div key={i} className={`flex ${pos === 'top' ? 'flex-row' : 'flex-col'} gap-1 bg-black/30 p-1 rounded border border-stone-700`}>
                                                            {m.tiles.map((t, j) => (
                                                                // ✨ 左右玩家的門前牌旋轉 90 度並透過負邊距緊湊排列
                                                                <div key={j} className={`${pos !== 'top' ? '-my-2 sm:-my-3 z-10 hover:z-20' : ''}`} style={{ transform: pos === 'left' ? 'rotate(90deg)' : pos === 'right' ? 'rotate(-90deg)' : 'none' }}>
                                                                    <TileBlock tile={t} mini={true} isHidden={m.type === 'ankong' && (j === 1 || j === 2)} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                };

                                return (
                                    <>
                                        {/* ✨ 修復：將上方對手往上推，挪出更多海底空間 */}
                                        <div className="absolute left-1 sm:left-4 top-[35%] sm:top-[40%] -translate-y-1/2 z-10">{renderOpponent(leftIdx, 'left')}</div>
                                        <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-10">{renderOpponent(topIdx, 'top')}</div>
                                        <div className="absolute right-1 sm:right-4 top-[35%] sm:top-[40%] -translate-y-1/2 z-10">{renderOpponent(rightIdx, 'right')}</div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* ✨ 海底與牌山視覺化系統 */}
                        <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] sm:w-[60%] max-w-2xl h-48 sm:h-64 flex items-center justify-center pointer-events-none z-0">
                            
                            {/* ✨ 牌山：獨立在外層，確保不干擾海底 */}
                            <div className="absolute -inset-4 sm:-inset-8 pointer-events-none opacity-40">
                                {['top','bottom','left','right'].map(side => {
                                    const sideTiles = Math.floor(wall.length / 4);
                                    return (
                                        <div key={side} className={`absolute flex gap-[1px] ${side==='top'||side==='bottom'?'flex-row w-full justify-center':'flex-col h-full justify-center'} ${side==='top'?'top-0':side==='bottom'?'bottom-0':side==='left'?'left-0':'right-0'}`}>
                                            {[...Array(Math.min(sideTiles, 18))].map((_, i) => (
                                                <div key={i} className="w-2 h-4 sm:w-3 sm:h-5 bg-emerald-900 border border-stone-900 rounded-sm"></div>
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* ✨ 海底：內部絕對定位，允許拖拉並捕捉坐標 */}
                            <div 
                                className="relative w-full h-full bg-emerald-800/40 border-4 border-dashed border-emerald-900/60 shadow-inner rounded-lg pointer-events-auto"
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedIdx !== null && currentTurn === players.findIndex(p=>p.id===user.uid) && !pendingAction) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        // 抓取滑鼠放開的位置，並轉換成百分比 (%)
                                        const dropX = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
                                        const dropY = Math.max(10, Math.min(90, ((e.clientY - rect.top) / rect.height) * 100));
                                        const dropRot = Math.random() * 60 - 30; // 隨機旋轉角度

                                        const tileToDiscard = myHand[draggedIdx];
                                        // 將座標透過參數傳給出牌引擎
                                        if (tileToDiscard) discardTile(tileToDiscard.id, false, { x: dropX, y: dropY, rot: dropRot });
                                    }
                                    setDraggedIdx(null);
                                    setDragOverIdx(null);
                                }}
                            >
                                {(() => {
                                    // ✨ 效能優化 1：將陣列運算與手機版判斷提出迴圈，避免每張牌都重複計算
                                    const allDiscards = players.flatMap(p => p.discards).sort((a, b) => (a.dropTime || 0) - (b.dropTime || 0));
                                    const isMobile = window.innerWidth < 640;
                                    
                                    return allDiscards.map((t, i) => {
                                        const isLatest = i === allDiscards.length - 1; 
                                        // ✨ 放大海底的牌：最新的一張比較大，其他的維持合適的視覺大小
                                        const scaleValue = isLatest ? (isMobile ? 0.65 : 0.75) : (isMobile ? 0.55 : 0.65);

                                        return (
                                            <div 
                                                key={t.id + i} 
                                                // ✨ 效能優化 2：移除舊牌的 transition-all 與 drop-shadow-md (超級吃效能的元凶)
                                                // 讓舊牌變成靜態渲染，只有最新的那張牌才有動畫與光暈，徹底解決越疊越卡的問題
                                                className={`absolute origin-center ${isLatest ? 'transition-all duration-300 z-50 animate-in zoom-in slide-in-from-top-10 drop-shadow-lg shadow-[0_0_20px_rgba(251,191,36,0.8)]' : 'z-10 opacity-90 shadow-sm'} hover:z-40 hover:opacity-100`}
                                                style={{ 
                                                    // 套用物理排斥引擎算出來的 X/Y 座標與旋轉
                                                    left: `${t.dropX ?? (20 + (i % 10) * 6)}%`, 
                                                    top: `${t.dropY ?? (20 + Math.floor(i / 10) * 15)}%`,
                                                    // ✨ 強制使用 inline CSS 執行縮小與對齊，100% 絕對生效！
                                                    transform: `translate(-50%, -50%) scale(${scaleValue}) rotate(${t.dropRot ?? 0}deg)`,
                                                    // ✨ 效能優化 3：開啟 GPU 硬體加速提示，降低重繪負擔
                                                    willChange: isLatest ? 'transform, opacity' : 'auto'
                                                }}
                                            >
                                                <TileBlock tile={t} isHighlighted={isLatest && pendingAction} />
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        {/* 攔截動作浮動面板 (碰/胡/過) */}
                        {pendingAction && myIdx !== -1 && pendingAction.from !== myIdx && !isSpectator && (
                            (canHu || canPong || canKong || chowOptions.length > 0) ? (
                               
                                <div className="absolute top-[60%] sm:top-[65%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[150] flex gap-3 sm:gap-6 bg-stone-900/95 p-4 sm:p-6 border-4 border-amber-500 shadow-[0_0_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200 flex-wrap justify-center items-center rounded-2xl">
                                    {/* ✨ 超清晰提示：誰打出了哪張牌 */}
                                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-white font-bold bg-stone-900 border-2 border-amber-400 px-6 py-2 text-sm sm:text-lg flex items-center gap-2 whitespace-nowrap shadow-lg rounded-full">
                                        <img src={players[pendingAction.from].id.startsWith('ai_') ? AI_AVATARS[players[pendingAction.from].id] : (players[pendingAction.from].avatar || 'https://minotar.net/helm/Steve/64.png')} className="w-10 h-10 border-2 border-stone-400 pixelated rounded-full" />
                                        <span className="text-amber-300 text-xl">{players[pendingAction.from].name}</span> 打出了
                                        <span className="scale-75 origin-center inline-block -mx-1 -my-4 pointer-events-none"><TileBlock tile={pendingAction.tile} /></span>
                                        <span className="text-red-400 ml-2 animate-pulse">({actionTimer}s)</span>
                                    </div>
                                    {canHu && <button onClick={() => handleIntercept('hu')} className="bg-gradient-to-b from-red-500 to-red-700 text-white px-8 py-4 sm:px-10 sm:py-5 font-black text-3xl sm:text-4xl rounded-2xl shadow-[0_8px_20px_rgba(220,38,38,0.6)] hover:scale-105 active:scale-95 transition-all border-y-4 border-red-300">胡</button>}
                                    {canKong && <button onClick={() => handleIntercept('kong')} className="bg-gradient-to-b from-purple-500 to-purple-700 text-white px-6 py-3 sm:px-8 sm:py-4 font-black text-2xl sm:text-3xl rounded-2xl shadow-[0_8px_20px_rgba(147,51,234,0.6)] hover:scale-105 active:scale-95 transition-all border-y-4 border-purple-300">槓</button>}
                                    {canPong && <button onClick={() => handleIntercept('pong')} className="bg-gradient-to-b from-amber-500 to-amber-700 text-white px-6 py-3 sm:px-8 sm:py-4 font-black text-2xl sm:text-3xl rounded-2xl shadow-[0_8px_20px_rgba(217,119,6,0.6)] hover:scale-105 active:scale-95 transition-all border-y-4 border-amber-300">碰</button>}
                                    {chowOptions.map((opt, i) => (
                                        <button key={i} onClick={() => handleIntercept('chow', opt.tiles)} className="bg-gradient-to-b from-emerald-500 to-emerald-700 text-white px-4 py-3 sm:px-6 sm:py-4 font-black text-2xl sm:text-3xl rounded-2xl shadow-[0_8px_20px_rgba(5,150,105,0.6)] hover:scale-105 active:scale-95 transition-all border-y-4 border-emerald-300 flex items-center">
                                            吃
                                            <span className="flex gap-1 ml-3 pointer-events-none">
                                                <span className={`bg-[#f4ebd0] px-2 rounded shadow-inner text-2xl sm:text-4xl border-2 border-[#d4c3a3] ${getTileColor(opt.tiles[0].type, opt.tiles[0].val)}`}>{opt.tiles[0].symbol}</span>
                                                <span className={`bg-[#f4ebd0] px-2 rounded shadow-inner text-2xl sm:text-4xl border-2 border-[#d4c3a3] ${getTileColor(opt.tiles[1].type, opt.tiles[1].val)}`}>{opt.tiles[1].symbol}</span>
                                            </span>
                                        </button>
                                    ))}
                                    <button onClick={() => handleIntercept('pass')} className="bg-gradient-to-b from-stone-500 to-stone-700 text-white px-6 py-3 sm:px-8 sm:py-4 font-black text-2xl sm:text-3xl rounded-2xl shadow-[0_8px_20px_rgba(120,113,108,0.6)] hover:scale-105 active:scale-95 transition-all border-y-4 border-stone-300">過</button>
                                </div>
                            ) : (
                                <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-stone-900/80 text-amber-400 px-4 py-2 font-bold border-2 border-stone-600 animate-pulse">
                                    等待其他玩家反應... ({actionTimer}s)
                                </div>
                            )
                        )}

                        {/* 自己手牌區 (底部) */}
                        <div className={`absolute bottom-0 w-full bg-[#c6c6c6] border-t-4 transition-all duration-300 p-2 ${players[currentTurn]?.id === user?.uid && !pendingAction ? 'border-t-amber-500 shadow-[0_-10px_30px_rgba(245,158,11,0.4)]' : 'border-t-white'}`}>
                            <div className="flex justify-between items-end mb-2 px-2">
                                <div className="text-[#373737] font-black flex items-center">
                                    <span className="material-symbols-outlined mr-1">person</span> {userProfile?.displayName}
                                    {players[currentTurn]?.id === user?.uid && !pendingAction && (
                                        <span className="ml-4 bg-amber-500 text-white px-2 py-1 text-xs animate-pulse shadow-md border border-stone-800">請打出一張牌</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    
                                    {/* ✨ 新增：自動排序按鈕 */}
                                    <button 
                                        onClick={() => { 
                                            playCachedSound(sortSound); 
                                            setMyHand(sortHand([...myHand])); 
                                        }} 
                                        className="bg-stone-600 hover:bg-stone-500 text-white font-black px-4 py-1 border-2 border-stone-400 shadow-md transition-transform active:scale-95"
                                    >
                                        整理
                                    </button>

                                    {/* 暗槓 / 加槓按鈕 */}
                                    {selfKongOptions.map((opt, i) => (
                                        <button key={`kong-${i}`} onClick={() => handleSelfKong(opt)} className="bg-purple-600 hover:bg-purple-500 text-white font-black px-4 py-1 border-2 border-purple-300 shadow-md animate-pulse">
                                            {opt.type === 'ankong' ? '暗槓' : '加槓'}
                                        </button>
                                    ))}

                                    {/* 檢查自摸按鈕 */}
                                    {players[currentTurn]?.id === user?.uid && checkHu(myHand) && (
                                        <button onClick={() => handleWin(currentTurn, null)} className="bg-red-600 hover:bg-red-500 text-white font-black px-4 py-1 border-2 border-red-300 shadow-md animate-bounce">自摸！</button>
                                    )}
                                    
                                    {/* ✨ 聽牌宣告按鈕 */}
                                    {selectedTile && tingOptions && tingOptions[selectedTile] && !players[myIdx]?.isTing && (
                                        <button onClick={() => discardTile(selectedTile, true)} className="bg-amber-500 hover:bg-amber-400 text-stone-900 font-black px-4 py-1 border-2 border-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-pulse transition-transform active:scale-95">
                                            聽牌並出牌
                                        </button>
                                    )}

                                    <button 
                                        onClick={() => discardTile(selectedTile)} 
                                        disabled={!selectedTile || players[currentTurn]?.id !== user?.uid || !!pendingAction || players[myIdx]?.isTing}
                                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black px-6 py-1 border-2 border-emerald-300 shadow-md transition-transform active:scale-95"
                                    >
                                        打出
                                    </button>
                                </div>
                            </div>
                            
                            {/* ✨ 聽牌提示區加強版 (手牌可以聽牌時即顯示) */}
                            {tingOptions && !players[myIdx]?.isTing && (
                                <div className="absolute -top-24 left-1/2 -translate-x-1/2 bg-stone-900/95 border-4 border-amber-400 px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.6)] flex flex-col items-center gap-2 z-50 animate-in slide-in-from-bottom-4 pointer-events-none whitespace-nowrap w-max">
                                    <span className="text-amber-400 font-black text-lg tracking-widest animate-pulse">✨ 你有牌可以聽了！ ✨</span>
                                    {selectedTile && tingOptions[selectedTile] ? (
                                        <div className="flex gap-2 items-center">
                                            <span className="text-white font-bold">打出此牌聽：</span>
                                            {tingOptions[selectedTile].map((t, i) => (
                                                <span key={i} className={`text-2xl sm:text-3xl font-black bg-stone-100 px-2 py-1 rounded-lg border-2 border-stone-400 shadow-inner ${getTileColor(t.type, t.val)}`}>{t.symbol}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-stone-300 font-bold text-sm">請點擊發光的牌查看能聽什麼</span>
                                    )}
                                </div>
                            )}
                            
                            {/* ✨ 玩家自己的聽牌狀態顯示 (位於遊戲視窗內部) */}
                            {players[myIdx]?.isTing && (
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-red-600 border-2 border-white px-6 py-2 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.8)] text-white font-black animate-pulse z-50 flex items-center gap-2 whitespace-nowrap pointer-events-none">
                                    <span className="material-symbols-outlined">bolt</span> 聽牌狀態 (自動摸打)
                                </div>
                            )}

                            {/* 門前清 (吃碰區) */}
                            {players.find(p=>p.id===user.uid)?.melds.length > 0 && (
                                <div className="flex gap-2 mb-2 px-2">
                                    {players.find(p=>p.id===user.uid).melds.map((m, i) => (
                                        <div key={i} className="flex gap-1 bg-stone-300/50 p-1 rounded border border-stone-400 shadow-inner">
                                            {m.tiles.map((t, j) => <TileBlock key={j} tile={t} isHidden={m.type === 'ankong' && (j === 1 || j === 2)} />)}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ✨ 手牌排列 (真實插入邏輯與發光效果) */}
                            <div className={`flex justify-center gap-0.5 sm:gap-1 px-1 h-20 sm:h-24 items-end ${winAnimation?.winnerIdx === myIdx ? 'animate-in zoom-in duration-500 shadow-[0_-20px_50px_rgba(251,191,36,0.5)] bg-amber-500/20 rounded-t-3xl pt-4' : ''}`}>
                                {myHand.map((tile, index) => {
                                    const isDrawnTile = currentTurn === players.findIndex(p=>p.id===user.uid) && index === myHand.length - 1;
                                    const isDragging = draggedIdx === index;
                                    
                                    // ✨ 判斷拖曳方向來決定「插入空隙」要開在左邊還是右邊
                                    const isDragOverLeft = dragOverIdx === index && draggedIdx > index;
                                    const isDragOverRight = dragOverIdx === index && draggedIdx < index;

                                    return (
                                        <div 
                                            key={tile.id} 
                                            draggable={!players[myIdx]?.isTing} // ✨ 聽牌後鎖定手牌不可拖拉
                                            onDragStart={(e) => { if(players[myIdx]?.isTing) { e.preventDefault(); return; } setDraggedIdx(index); e.dataTransfer.effectAllowed = 'move'; }}
                                            onDragOver={(e) => { 
                                                e.preventDefault(); 
                                                if (draggedIdx !== null && draggedIdx !== index) {
                                                    if (dragOverIdx !== index) {
                                                        playQuietSound(clickSound); // ✨ 牌經過時的理牌噠搭聲
                                                        setDragOverIdx(index);
                                                    }
                                                } 
                                            }}
                                            onDragLeave={() => { if(dragOverIdx === index) setDragOverIdx(null); }}
                                            
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                if (draggedIdx === null || draggedIdx === index) {
                                                    setDragOverIdx(null);
                                                    return;
                                                }
                                                playCachedSound(tileSound);
                                                const newHand = [...myHand];
                                                const [draggedTile] = newHand.splice(draggedIdx, 1);
                                                
                                                // 直接塞進這個 index 位置，配合視覺上出現的邊框空隙，達到完美的「插入兩張牌中間」效果
                                                newHand.splice(index, 0, draggedTile);
                                                
                                                setMyHand(newHand);
                                                setDraggedIdx(null);
                                                setDragOverIdx(null);
                                            }}                                            
                                            onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); }}
                                            // ✨ 修正：將 onClick 改為 onPointerUp，並綁定在外層，避免拖拉事件吃掉點擊
                                            onPointerUp={(e) => {
                                                if (draggedIdx !== null) return; // 如果是拖拉放開，不觸發點擊
                                                playCachedSound(clickSound);
                                                if (selectedTile === tile.id && players[currentTurn]?.id === user?.uid && !pendingAction) {
                                                    discardTile(tile.id);
                                                    // ✨ 移除重複的 playCachedSound(tileSound); 避免打牌時瞬間響兩次
                                                } else {
                                                    setSelectedTile(tile.id === selectedTile ? null : tile.id);
                                                }
                                            }}
                                            className={`transition-all duration-200 cursor-pointer hover:-translate-y-2 ${isDrawnTile ? 'ml-2 sm:ml-4' : ''} ${isDragging ? 'opacity-30 scale-75 -translate-y-4' : ''} ${isDragOverLeft ? 'border-l-[8px] border-l-amber-500 rounded-l-lg pl-1' : ''} ${isDragOverRight ? 'border-r-[8px] border-r-amber-500 rounded-r-lg pr-1' : ''}`}
                                        >
                                            <div className="pointer-events-none">
                                                <TileBlock 
                                                    tile={tile} 
                                                    selected={selectedTile === tile.id}
                                                    // ✨ 讓打出去可以聽牌的牌發光，引導玩家點擊
                                                    isHighlighted={highlightIds.includes(tile.id) || (tingOptions && tingOptions[tile.id] && !players[myIdx]?.isTing)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {/* ✨ 倒牌與放槍特效中心提示 */}
                        {winAnimation && (
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] flex flex-col items-center justify-center animate-in zoom-in slide-in-from-bottom-10 duration-500 pointer-events-none w-full px-4">
                                <div className={`bg-stone-900/95 border-4 rounded-full px-6 sm:px-10 py-4 shadow-[0_0_50px_rgba(251,191,36,0.8)] flex flex-col items-center gap-2 max-w-fit mx-auto ${winAnimation.isZimo ? 'border-amber-500' : 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.8)] animate-pulse'}`}>
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <span className="text-4xl sm:text-5xl animate-bounce drop-shadow-[0_0_10px_rgba(251,191,36,1)] shrink-0">🀄</span>
                                        <h1 className="text-2xl sm:text-4xl font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-center whitespace-nowrap">
                                            {winAnimation.isZimo ? (
                                                <span className="text-amber-400 tracking-wider">✨ {winAnimation.name} 霸氣自摸！</span>
                                            ) : (
                                                <>
                                                    <span className="text-red-400 animate-pulse">💥 {winAnimation.loserName} 放槍！</span>
                                                    <span className="text-emerald-400 tracking-widest">{winAnimation.name} 胡牌啦！</span>
                                                </>
                                            )}
                                        </h1>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* 聊天室 */}
                        {/* ✨ 聊天室 (修復層級與關閉按鈕位置) */}
{showChatModal && (
    <div className="absolute inset-0 z-[300] bg-black/50 flex justify-end pointer-events-auto">
        <div className="w-80 bg-stone-100 h-full flex flex-col shadow-2xl relative">
            <div className="bg-stone-800 text-white p-3 flex justify-between items-center">
                                        <span className="font-bold">對戰聊天室</span>
                                        <button onClick={() => setShowChatModal(false)}><span className="material-symbols-outlined">close</span></button>
                                    </div>
                                    <div className="flex-grow p-3 overflow-y-auto flex flex-col gap-2">
                                        {chatMessages.map((c, i) => (
                                            <div key={i} className={c.senderId === user?.uid ? 'self-end bg-amber-400 p-2 rounded-lg text-sm font-bold shadow-sm' : 'self-start bg-white border border-gray-300 p-2 rounded-lg text-sm font-bold shadow-sm'}>
                                                <span className="text-[10px] text-gray-500 block">{c.senderName}</span>
                                                {c.text}
                                            </div>
                                        ))}
                                    </div>
                                    <form onSubmit={e => {
                                        e.preventDefault();
                                        if(!chatText.trim()) return; // ✨ 移除 !roomCode 限制，允許單機發言
                                        if (roomCode) {
    const roomRef = window.db.collection("mjRooms").doc(roomCode);
    roomRef.get().then(snap => {
        const d = snap.data();
        roomRef.update({ chats: [...(d.chats || []), { senderId: user?.uid, senderName: userProfile?.displayName, text: chatText.trim(), time: Date.now() }] });
    });
}
// ✨ 不論單機還是連線，都在本地清空輸入框並推入訊息列
setChatMessages(prev => [...prev, { senderId: user?.uid, senderName: userProfile?.displayName, text: chatText.trim(), time: Date.now() }]);
setChatText('');
                                    }} className="p-2 border-t flex gap-2 bg-white">
                                        <input type="text" value={chatText} onChange={e=>setChatText(e.target.value)} className="flex-grow px-2 py-1 bg-gray-100 border rounded text-sm" />
                                        <button className="bg-amber-500 text-white px-3 rounded font-bold text-sm">傳送</button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {gameState === 'summary' && summaryData && (
                    <div className="flex flex-col flex-grow items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto custom-scrollbar">
                        <div className="bg-stone-900 border-4 border-amber-500 p-4 sm:p-6 w-full max-w-2xl shadow-2xl text-center my-auto">
                            <h2 className="text-3xl sm:text-4xl font-black text-amber-400 mb-2 drop-shadow-md">
                                {summaryData.winner === '流局' ? '🤝 流局平手' : `🏆 ${summaryData.winner} 胡牌！`}
                            </h2>
                            
                            {summaryData.winner !== '流局' && (
                                <div className="mb-6">
                                    {summaryData.isZimo && (
                                        <p className="text-red-400 font-black text-2xl mb-2 animate-bounce">✨ 霸氣自摸，三家通殺！ ✨</p>
                                    )}
                                    {/* ✨ 顯示台數明細清單 */}
                                    {summaryData.taiDetails && summaryData.taiDetails.length > 0 && (
                                        <div className="flex flex-wrap justify-center gap-2 mt-3">
                                            {summaryData.taiDetails.map((detail, idx) => (
                                                <span key={idx} className="bg-amber-900/80 text-amber-200 border border-amber-500 px-3 py-1 rounded-md text-sm sm:text-base font-bold shadow-md">
                                                    {detail}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="space-y-4 mb-6 text-left w-full max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                                {/* ✨ 結算畫面顯示所有人手牌，並加入胡牌者的倒牌動畫 */}
                                {summaryData.results.map((p, i) => {
                                    const isWinner = p.name === summaryData.winner;
                                    return (
                                        <div key={i} className={`p-3 sm:p-4 border-2 flex flex-col xl:flex-row justify-between items-center gap-4 ${isWinner ? 'bg-amber-900/40 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]' : 'bg-stone-800/80 border-stone-600'}`}>
                                            <div className="flex flex-col items-center xl:items-start w-full xl:w-1/4 shrink-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`font-black text-lg sm:text-xl ${isWinner ? 'text-amber-400 animate-pulse' : 'text-white'}`}>{p.name}</span>
                                                    {/* ✨ 顯示莊家 */}
                                                    {summaryData.dealerIdx === i && (
                                                        <span className="bg-amber-600 text-white text-xs font-black px-2 py-0.5 rounded border border-amber-300 shadow-sm">莊家</span>
                                                    )}
                                                    {/* ✨ 顯示胡的那張牌 */}
                                                    {isWinner && summaryData.huTile && (
                                                        <span className="flex items-center gap-1 bg-red-900/60 text-red-200 border border-red-500 px-2 py-0.5 rounded text-sm font-bold shadow-[0_0_10px_red]">
                                                            胡 <span className={`text-xl bg-white px-0.5 rounded shadow-inner ${getTileColor(summaryData.huTile.type, summaryData.huTile.val)}`}>{summaryData.huTile.symbol}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                {p.prize > 0 ? (
                                                    <span className="text-emerald-400 font-black text-xl bg-black/40 px-2 py-1 rounded mt-1">+ {p.prize} 💎</span>
                                                ) : p.penalty > 0 ? (
                                                    <span className="text-red-400 font-black text-lg bg-black/40 px-2 py-1 rounded mt-1">- {p.penalty} 💎</span>
                                                ) : (
                                                    <span className="text-stone-400 font-bold bg-black/40 px-2 py-1 rounded mt-1">0 💎</span>
                                                )}
                                            </div>

                                            {/* 顯示吃碰區與手牌 (贏家有華麗倒牌飛入動畫) */}
                                            <div className={`flex flex-wrap items-center justify-center xl:justify-start gap-1 sm:gap-2 w-full xl:w-3/4 ${isWinner ? 'animate-in zoom-in slide-in-from-top-10 duration-700' : ''}`}>
                                                {/* 門前清 (吃碰) */}
                                                {p.melds && p.melds.length > 0 && (
                                                    <div className="flex gap-1 sm:gap-2 border-r-2 border-stone-500 pr-1 sm:pr-2 mr-1">
                                                        {p.melds.map((m, mIdx) => (
                                                            <div key={mIdx} className="flex gap-0.5 bg-black/30 p-1 rounded border border-stone-600">
                                                                {m.tiles.map((t, tIdx) => <TileBlock key={tIdx} tile={t} mini={true} isHidden={m.type === 'ankong' && (tIdx === 1 || tIdx === 2)} />)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {/* 剩餘手牌 */}
                                                <div className="flex gap-0.5 sm:gap-1 flex-wrap items-center">
                                                    {p.hand && p.hand.length > 0 ? (
                                                        p.hand.map((t, tIdx) => (
                                                            <TileBlock key={tIdx} tile={t} mini={true} /> // ✨ 強制使用縮小版麻將，避免畫面擁擠
                                                        ))
                                                    ) : (
                                                        <span className="text-stone-500 font-bold text-sm">無手牌</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ✨ 顯示目前累計戰況計分板 */}
                            <div className="bg-stone-800/80 p-4 border-2 border-stone-600 mb-6 flex flex-wrap justify-center gap-4">
                                <h3 className="text-white font-bold w-full text-center border-b border-stone-600 pb-2 mb-2">累計戰績 ({roomSettings.length})</h3>
                                {players.map((p, idx) => (
                                    <div key={idx} className="text-center bg-stone-900 px-4 py-2 border border-stone-700 min-w-[80px]">
                                        <div className="text-sm text-stone-300 font-bold">{p.name}</div>
                                        <div className={`text-xl font-black ${(gameContext?.scores?.[idx] || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {(gameContext?.scores?.[idx] || 0) >= 0 ? '+' : ''}{gameContext?.scores?.[idx] || 0}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col items-center w-full mt-4">
                                {/* ✨ 顯示大家的準備狀態 */}
                                {!checkIsGameOver() && (
                                    <div className="flex gap-2 sm:gap-4 mb-4 flex-wrap justify-center">
                                        {players.filter(p => !p.id.startsWith('ai_') && !p.isDisconnected).map(p => (
                                            <div key={p.id} className={`px-3 py-1 rounded-full border-2 text-sm font-bold flex items-center gap-1 ${p.isReady ? 'bg-emerald-900/80 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-stone-800 border-stone-500 text-stone-400'}`}>
                                                {p.isReady ? <span className="material-symbols-outlined text-[16px]">check_circle</span> : <span className="material-symbols-outlined text-[16px] animate-spin">hourglass_empty</span>}
                                                {p.name} {p.isReady ? '已準備' : '思考中...'}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-center space-x-4 w-full">
                                    {checkIsGameOver() ? (
                                        <button onClick={() => showToast("✅ 遊戲已結束，請點擊「退出結算」離開。")} className="px-6 py-3 bg-stone-600 text-stone-300 font-black border-2 border-black shadow-md cursor-not-allowed">
                                            結算完成 (遊戲結束)
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => {
                                                playCachedSound(clickSound);
                                                const myPlayer = players.find(p => p.id === user.uid);
                                                if (myPlayer && !myPlayer.isReady) {
                                                    setAutoReadyTimer(0); // 手動點擊就取消自動倒數
                                                    const newPlayers = players.map(p => p.id === user.uid ? { ...p, isReady: true, isMe: false } : { ...p, isMe: false });
                                                    if (roomCode) window.db.collection("mjRooms").doc(roomCode).update({ players: newPlayers });
                                                    else setPlayers(players.map(p => p.id === user.uid ? { ...p, isReady: true } : p));
                                                }
                                            }} 
                                            disabled={players.find(p => p.id === user.uid)?.isReady}
                                            className={`px-8 py-3 font-black border-2 border-black shadow-lg transition-all active:scale-95 flex items-center gap-2 ${players.find(p => p.id === user.uid)?.isReady ? 'bg-emerald-700 text-emerald-200 cursor-not-allowed opacity-80' : 'bg-amber-500 hover:bg-amber-400 text-stone-900 animate-pulse'}`}
                                        >
                                            {players.find(p => p.id === user.uid)?.isReady ? '等待其他玩家...' : `準備下一局 (${autoReadyTimer}s)`}
                                        </button>
                                    )}
                                    
                                    <button onClick={quitAndLeaveRoom} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black border-2 border-black shadow-lg transition-transform active:scale-95">退出結算</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ✨ 倒牌與放槍特效中心提示 */}
                        {winAnimation && (
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] flex flex-col items-center justify-center animate-in zoom-in slide-in-from-bottom-10 duration-500 pointer-events-none w-full px-4">
                                <div className={`bg-stone-900/95 border-4 rounded-full px-6 sm:px-10 py-4 shadow-[0_0_50px_rgba(251,191,36,0.8)] flex flex-col items-center gap-2 max-w-fit mx-auto ${winAnimation.isZimo ? 'border-amber-500' : 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.8)] animate-pulse'}`}>
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <span className="text-4xl sm:text-5xl animate-bounce drop-shadow-[0_0_10px_rgba(251,191,36,1)] shrink-0">🀄</span>
                                        <h1 className="text-2xl sm:text-4xl font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-center whitespace-nowrap">
                                            {winAnimation.isZimo ? (
                                                <span className="text-amber-400 tracking-wider">✨ {winAnimation.name} 霸氣自摸！</span>
                                            ) : (
                                                <>
                                                    <span className="text-red-400 animate-pulse">💥 {winAnimation.loserName} 放槍！</span>
                                                    <span className="text-emerald-400 tracking-widest">{winAnimation.name} 胡牌啦！</span>
                                                </>
                                            )}
                                        </h1>
                                    </div>
                                </div>
                            </div>
                        )}

                {/* ✨ 遊戲內自訂離開房間警告視窗 */}
                {showQuitModal && (
                    <div className="absolute inset-0 z-[600] bg-black/80 flex flex-col items-center justify-center pointer-events-auto px-4">
                        <div className="bg-stone-900 border-4 border-red-500 rounded-2xl w-full max-w-sm p-6 flex flex-col items-center shadow-[0_0_50px_rgba(239,68,68,0.5)] animate-in zoom-in-95 duration-200">
                            <span className="text-6xl mb-4 animate-bounce">⚠️</span>
                            <h2 className="text-2xl font-black text-white mb-2">確定要離開嗎？</h2>
                            {gameState === 'playing' && roomCode ? (
                                <p className="text-red-400 text-center font-bold mb-6">
                                    遊戲正在進行中！<br/>現在中途離開將被視為「逃跑」<br/>
                                    系統將直接扣除您 <span className="text-amber-400 text-2xl font-black block my-2">{(roomSettings.baseBet || 50) * 3 + (roomSettings.taiBet || 20) * 30} 💎</span>
                                    並發放給其他玩家！
                                </p>
                            ) : (
                                <p className="text-stone-300 text-center font-bold mb-6">
                                    返回主畫面將結束目前的連線狀態。
                                </p>
                            )}
                            <div className="flex w-full gap-4">
                                <button onClick={() => setShowQuitModal(false)} className="flex-1 bg-stone-600 hover:bg-stone-500 text-white font-black py-3 rounded-lg border-2 border-stone-400 transition-transform active:scale-95">
                                    取消
                                </button>
                                <button onClick={confirmQuit} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-lg border-2 border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.8)] transition-transform active:scale-95">
                                    殘忍離開
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {toast && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[300] bg-stone-800 text-white px-4 py-2 rounded shadow-xl border-2 border-stone-600 font-bold animate-in slide-in-from-top-4">
                        {toast}
                    </div>
                )}
            </div>
        </div>
    );
}

window.Mj = Mj;
