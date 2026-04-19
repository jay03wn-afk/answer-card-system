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
    
    // ✨ 核心修復：統一所有更新手牌的入口，保證絕對不打亂瀏覽器端的拖曳排序 (單人/多人皆適用)
    const updateMyHandSmartly = (engineHand) => {
        setMyHand(prev => {
            if (!prev || prev.length === 0) return engineHand;
            const newHandIds = engineHand.map(t => t.id);
            const prevIds = prev.map(t => t.id);
            const isSame = newHandIds.length === prevIds.length && newHandIds.every(id => prevIds.includes(id));
            if (isSame) return prev;
            let updatedHand = prev.filter(t => newHandIds.includes(t.id));
            const addedTiles = engineHand.filter(t => !prevIds.includes(t.id));
            return [...updatedHand, ...addedTiles];
        });
    };

    const [selectedTile, setSelectedTile] = useState(null);
    const [actionTimer, setActionTimer] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15); // ✨ 新增：常規回合倒數狀態

    // ✨ 新增：拖曳排序狀態
    const [draggedIdx, setDraggedIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    const [toast, setToast] = useState(null);
    const [roomJoinCode, setRoomJoinCode] = useState('');
    const [roomSettings, setRoomSettings] = useState({ turnTime: 8, baseBet: 50, taiBet: 20 }); // ✨ 新增底/台設定
    const [isHost, setIsHost] = useState(false);
    const [lobbyPlayers, setLobbyPlayers] = useState([]);
    const [summaryData, setSummaryData] = useState(null);
    const [isSpectator, setIsSpectator] = useState(false);
    const [spectators, setSpectators] = useState([]);

    const [chatText, setChatText] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [showChatModal, setShowChatModal] = useState(false);
    const [floatingChats, setFloatingChats] = useState({});

    // ✨ 完全照抄 VolleyballGame 的單純對接模式 (修復音效綁定過早的問題)
    const playCachedSound = (url) => { if (window.playCachedSound) window.playCachedSound(url); };
    const preloadFastSound = (url) => { if (window.preloadFastSound) window.preloadFastSound(url); };

    const clickSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/ui/button/click.ogg';
    const tileSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/block/wood/place1.ogg'; 
    const winSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/ui/toast/challenge_complete.ogg';
    const alertSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/block/note_block/chime.ogg';
    const eatSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/entity/player/burp.ogg';
    const anvilSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/block/anvil/use.ogg';
    const totemSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/item/totem/use.ogg';
    const passSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/entity/villager/no1.ogg';
    const dropSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/entity/item/pickup.ogg'; 

    useEffect(() => {
        const sounds = [clickSound, tileSound, winSound, alertSound, eatSound, anvilSound, totemSound, passSound, dropSound];
        sounds.forEach(src => preloadFastSound(src));
    }, []); 

    // ✨ 統一還原為 Emoji，解決中字突兀的問題
    const TILE_DEFS = {
        'W': ['🀇','🀈','🀉','🀊','🀋','🀌','🀍','🀎','🀏'],
        'T': ['🀙','🀚','🀛','🀜','🀝','🀞','🀟','🀠','🀡'],
        'S': ['🀐','🀑','🀒','🀓','🀔','🀕','🀖','🀗','🀘'],
        'Z': ['🀀','🀁','🀂','🀃','🀄︎','🀅','🀆']
    };

    const getTileColor = (type, val) => {
        if (type === 'W') return 'text-red-600';
        if (type === 'T') return 'text-blue-600';
        if (type === 'S') return 'text-emerald-600';
        if (type === 'Z') {
            if (val <= 4) return 'text-stone-800'; // 東南西北
            if (val === 5) return 'text-red-600'; // 中
            if (val === 6) return 'text-emerald-600'; // 發
            if (val === 7) return 'text-blue-600'; // 白
        }
        return 'text-stone-800';
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

    // 離開房間邏輯
    const quitAndLeaveRoom = async () => {
        playCachedSound(clickSound);
        if (roomCode && window.db) {
            try {
                const snap = await window.db.collection("mjRooms").doc(roomCode).get();
                if (snap.exists) {
                    const d = snap.data();
                    if (gameState === 'playing' || gameState === 'summary') {
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
        let roster = finalLobbyPlayers.map(p => ({ ...p, isMe: p.id === user.uid }));
        const aiNames = ['村民 (AI)', '終界使者 (AI)', '苦力怕 (AI)'];
        while (roster.length < 4) {
            const aiIdx = roster.length;
            roster.push({ id: `ai_${aiIdx}`, name: aiNames[aiIdx - 1], isMe: false });
        }
        roster.sort(() => Math.random() - 0.5); // 隨機座位 (莊家為 index 0)

        // 3. 發牌 (莊家 17 張，閒家 16 張)
        const finalPlayers = roster.map((p, idx) => {
            const count = idx === 0 ? 17 : 16;
            const hand = deck.splice(0, count);
            return { ...p, hand: sortHand(hand), melds: [], discards: [] };
        });

        const initialGameState = {
            status: 'playing',
            players: finalPlayers,
            wall: deck,
            currentTurn: 0,
            lastDiscard: null,
            pendingAction: null
        };

        if (roomCode && isHost) {
            const dbPlayers = finalPlayers.map(p => ({...p, isMe: false}));
            await window.db.collection("mjRooms").doc(roomCode).update({ ...initialGameState, players: dbPlayers });
        } else if (!roomCode) {
            setPlayers(finalPlayers);
            setWall(deck);
            setCurrentTurn(0);
            setLastDiscard(null);
            setPendingAction(null);
            setGameState('playing');
            setMyHand(finalPlayers.find(p => p.isMe).hand);
        }
    };

    // 打牌邏輯
    const discardTile = async (tileId) => {
        if (pendingAction) return; // 攔截狀態不可打牌
        
        const myIndex = players.findIndex(p => p.id === user.uid);
        if (currentTurn !== myIndex) return; // 不是我的局

        const tileToDiscard = myHand.find(t => t.id === tileId);
        const newHand = myHand.filter(t => t.id !== tileId);
        
        playCachedSound(tileSound);
        setMyHand(newHand); // ✨ 移除 sortHand，保留玩家拖拉的順序
        setSelectedTile(null);

        executeDiscard(myIndex, tileToDiscard, newHand);
    };

    const executeDiscard = async (pIndex, tileToDiscard, newHand) => {
        playCachedSound(dropSound); // 播放丟入海底的聲音
        const newPlayers = [...players];
        newPlayers[pIndex].hand = newHand;
        
        // ✨ 加入 dropTime 來記錄絕對的出牌順序
        const tileWithTime = { ...tileToDiscard, dropTime: Date.now() };
        newPlayers[pIndex].discards.push(tileWithTime);

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
            if (idx === (pIndex + 1) % 4 && t.type !== 'Z') {
                const typeHand = p.hand.filter(ht => ht.type === t.type);
                const hasV = (v) => typeHand.some(ht => ht.val === v);
                if ((hasV(t.val - 2) && hasV(t.val - 1)) || 
                    (hasV(t.val - 1) && hasV(t.val + 1)) || 
                    (hasV(t.val + 1) && hasV(t.val + 2))) {
                    canChow = true;
                }
            }

            if (matchCount >= 2 || isHu || canChow) {
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
                expires: Date.now() + 8000 // ✨ 延長至 8 秒反應時間
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
            await window.db.collection("mjRooms").doc(roomCode).update(updateData);
        } else {
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
        }
    };

    // ✨ 處理攔截 (碰、吃、胡、過) - 支援 AI 強制代打與參數傳遞
    const handleIntercept = async (actionType, specificTiles = null, forceActorIdx = null) => {
        const actorIdx = forceActorIdx !== null ? forceActorIdx : players.findIndex(p => p.id === user.uid);
        const currentHand = players[actorIdx].hand;
        
        if (actionType === 'pass') {
            if (forceActorIdx === null) playCachedSound(passSound); // 只有真實玩家按才發出村民的拒絕聲
            proceedNextTurnAfterPass();
            return;
        }

        const newPlayers = [...players];
        const tile = pendingAction.tile;
        
        if (actionType === 'hu') {
            playCachedSound(totemSound); // 不死圖騰音效
            if (!checkHu([...currentHand, tile])) return showToast("牌型不符 (需 5搭1眼)！");
            handleWin(actorIdx, pendingAction.from);
            return;
        }

        if (actionType === 'pong') {
            playCachedSound(anvilSound); // 鐵砧音效
            const sameTiles = currentHand.filter(t => t.type === tile.type && t.val === tile.val);
            if (sameTiles.length < 2) return showToast("條件不符！");
            
            const used = [sameTiles[0], sameTiles[1]];
            const remainingHand = currentHand.filter(t => t.id !== used[0].id && t.id !== used[1].id);
            
            newPlayers[actorIdx].hand = remainingHand;
            newPlayers[actorIdx].melds.push({ type: 'pong', tiles: [...used, tile] });
            newPlayers[pendingAction.from].discards.pop();

            const updateData = { players: newPlayers.map(p => ({...p, isMe: false})), currentTurn: actorIdx, pendingAction: null, lastDiscard: null };
            if (roomCode) await window.db.collection("mjRooms").doc(roomCode).update(updateData);
            else { 
                setPlayers(newPlayers); 
                setCurrentTurn(actorIdx); 
                setPendingAction(null); 
                if(actorIdx === players.findIndex(p=>p.id===user.uid)) {
                    updateMyHandSmartly(remainingHand); // ✨ 改用智慧排序
                }
            }
        }

        if (actionType === 'kong') {
            playCachedSound(anvilSound); // 鐵砧音效 (槓牌)
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
            if (roomCode) await window.db.collection("mjRooms").doc(roomCode).update(updateData);
            else { 
                setPlayers(newPlayers); 
                setCurrentTurn(actorIdx);
                setWall(newWall); 
                setPendingAction(null); 
                if(actorIdx === players.findIndex(p=>p.id===user.uid)) {
                    updateMyHandSmartly(remainingHand);
                }
            }
        }

        if (actionType === 'chow') {
            playCachedSound(eatSound); // 吃東西音效
            const used = specificTiles; 
            if (!used || used.length !== 2) return showToast("系統錯誤：未選擇吃的牌");
            
            const remainingHand = currentHand.filter(t => t.id !== used[0].id && t.id !== used[1].id);
            const meldTiles = [...used, tile].sort((a,b)=>a.val-b.val);
            
            newPlayers[actorIdx].hand = remainingHand;
            newPlayers[actorIdx].melds.push({ type: 'chow', tiles: meldTiles });
            newPlayers[pendingAction.from].discards.pop();

            const updateData = { players: newPlayers.map(p => ({...p, isMe: false})), currentTurn: actorIdx, pendingAction: null, lastDiscard: null };
            if (roomCode) await window.db.collection("mjRooms").doc(roomCode).update(updateData);
            else { 
                setPlayers(newPlayers); 
                setCurrentTurn(actorIdx); 
                setPendingAction(null); 
                if(actorIdx === players.findIndex(p=>p.id===user.uid)) updateMyHandSmartly(remainingHand); // ✨ 改用智慧排序
            }
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
        if (roomCode) await window.db.collection("mjRooms").doc(roomCode).update(updateData);
        else {
            setPlayers(newPlayers);
            setWall(newWall);
            if(p.id === user.uid) updateMyHandSmartly(remainingHand);
        }
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
            await window.db.collection("mjRooms").doc(roomCode).update(updateData);
        } else {
            setWall(newWall);
            setCurrentTurn(nextTurn);
            setPendingAction(null);
            setPlayers(newPlayers);
            if (newPlayers[nextTurn].id === user.uid) updateMyHandSmartly(newPlayers[nextTurn].hand); // ✨ 改用智慧排序
        }
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
                // 如果贏家是莊家，或輸家是莊家，這筆帳要多算 1 台 (莊家台)
                if (winnerIdx === 0 || idx === 0) pTai += 1; 
                
                penalty = base + (pTai * taiBet); // 底 + 台
                totalPrize += penalty;
            }
            return { ...p, penalty };
        });

        results[winnerIdx].prize = totalPrize;

        // 如果贏家有拿莊家台，加進明細給他看
        if (winnerIdx === 0 || (loserIdx !== null && loserIdx === 0)) {
            details.push("莊家 (1台)");
        }

        const updateData = {
            status: 'summary',
            winner: players[winnerIdx].name,
            results,
            isZimo,
            taiDetails: details
        };

        if (roomCode && isHost) {
            await window.db.collection("mjRooms").doc(roomCode).update(updateData);
        } else if (!roomCode) {
            setSummaryData(updateData);
            setGameState('summary');
        }
    };

    const handleDrawGame = () => {
        const updateData = {
            status: 'summary',
            winner: '流局',
            results: players.map(p => ({ ...p, penalty: 0, prize: 0 }))
        };
        if (roomCode && isHost) window.db.collection("mjRooms").doc(roomCode).update(updateData);
        else if (!roomCode) {
            setSummaryData(updateData);
            setGameState('summary');
        }
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
                        if (gameState === 'lobby' && data.status === 'playing') setGameState('playing');
                        
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

    // ✨ 新增：常規回合的倒數計時器
    useEffect(() => {
        if (gameState !== 'playing' || pendingAction) return;
        
        setTimeLeft(roomSettings.turnTime || 8); // ✨ 配合預設 8 秒
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
        if (gameState !== 'playing') return;

        // ✨ 處理 pendingAction (攔截倒數與 AI 自動吃碰胡)
        if (pendingAction) {
            let aiHandled = false;
            let timeoutId;
            
            // AI 攔截判斷 (單機或房主代管)
            if (!roomCode || isHost) {
                const aiPlayers = players.filter(p => p.id.startsWith('ai_') && players.findIndex(x=>x.id===p.id) !== pendingAction.from);
                for (let ai of aiPlayers) {
                    if (aiHandled) break;
                    const aiIdx = players.findIndex(p => p.id === ai.id);
                    const t = pendingAction.tile;
                    
                    // ✨ AI 必胡 (加快反應時間)
                    if (checkHu([...ai.hand, t])) {
                        aiHandled = true; timeoutId = setTimeout(() => handleIntercept('hu', null, aiIdx), 1000); break;
                    }
                    // ✨ AI 變積極：90% 機率碰牌
                    if (ai.hand.filter(ht => ht.type === t.type && ht.val === t.val).length >= 2 && Math.random() > 0.1) {
                        aiHandled = true; timeoutId = setTimeout(() => handleIntercept('pong', null, aiIdx), 1000); break;
                    }
                    // ✨ AI 變積極：85% 機率吃牌
                    if (pendingAction.from === (aiIdx + 3) % 4 && t.type !== 'Z' && Math.random() > 0.15) {
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

            const interval = setInterval(() => {
                const left = Math.max(0, pendingAction.expires - Date.now());
                setActionTimer(Math.floor(left / 1000));
                // 如果時間到且沒有 AI 攔截，自動過
                if (left === 0) {
                    clearInterval(interval);
                    if (!aiHandled && (!roomCode || isHost)) proceedNextTurnAfterPass();
                }
            }, 1000);

            return () => { clearInterval(interval); clearTimeout(timeoutId); };
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
        if (matchingTiles.length >= 2) {
            canPong = true;
            highlightIds.push(matchingTiles[0].id, matchingTiles[1].id);
        }
        if (matchingTiles.length >= 3) {
            canKong = true;
            highlightIds.push(matchingTiles[2].id);
        }

        // 吃牌只看上家
        if (pendingAction.from === (myIdx + 3) % 4 && t.type !== 'Z') {
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
    const TileBlock = ({ tile, isHidden = false, onClick, selected = false, isHighlighted = false, mini = false }) => {
        const baseClass = mini 
            ? "w-6 h-9 sm:w-8 sm:h-12 border border-b-2 shadow-sm" 
            : "w-11 h-16 sm:w-14 sm:h-20 border-2 sm:border-4 border-b-4 sm:border-b-[6px] shadow-[2px_2px_0px_#222]";

        if (isHidden) {
            return (
                <div className={`${baseClass} bg-emerald-600 border-emerald-400 border-r-emerald-900 border-b-emerald-900 shrink-0 flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-20 bg-[url('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/bamboo_stalk.png')] bg-cover"></div>
                </div>
            );
        }

        return (
            <div 
                onClick={onClick}
                className={`${baseClass} bg-[#f4ebd0] shrink-0 flex items-center justify-center cursor-pointer transition-all relative
                ${selected ? '-translate-y-4 border-amber-500 shadow-[2px_6px_0px_#222] z-20' : 
                  isHighlighted ? '-translate-y-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.9)] z-10' : 
                  'border-[#d4c3a3] hover:-translate-y-1 hover:z-10'}`}
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-white opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-stone-400 opacity-50 pointer-events-none"></div>
                
                {/* ✨ 統一使用 Emoji，無特殊框，尺寸與顏色均一致 */}
                <span className={`absolute flex items-center justify-center w-full h-full pb-1 ${mini ? 'text-3xl sm:text-4xl' : 'text-[60px] sm:text-[80px]'} font-black ${getTileColor(tile.type, tile.val)} drop-shadow-sm leading-none pointer-events-none`}>
                    {tile.symbol}
                </span>
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
                    <div className="flex flex-col items-center justify-center flex-grow space-y-6">
                        <div className="bg-[#8b8b8b] p-6 border-4 border-white border-r-[#555] border-b-[#555] w-full max-w-md shadow-lg">
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
                            <button onClick={async () => {
                                playCachedSound(clickSound);
                                const code = Math.floor(100000 + Math.random() * 900000).toString();
                                await window.db.collection("mjRooms").doc(code).set({
                                    hostId: user.uid, roomCode: code, status: 'lobby',
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
                        <div className="absolute top-0 w-full flex justify-between p-2 pointer-events-none z-10">
                            <div className="bg-stone-900/80 text-white px-3 py-1 font-mono font-bold text-sm border-2 border-stone-600">
                                牌山剩餘: <span className="text-amber-400">{wall.length}</span> 張
                            </div>
                            
                            {/* ✨ 視覺化倒數進度條 (更新攔截時間為 8 秒) */}
                            <div className="w-32 sm:w-64 h-2 sm:h-3 bg-stone-900 border-2 border-stone-600 rounded-full overflow-hidden shadow-inner mt-1">
                                <div 
                                    className={`h-full transition-all duration-1000 ease-linear ${pendingAction ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                    style={{ width: pendingAction ? `${(actionTimer / 8) * 100}%` : `${(timeLeft / (roomSettings.turnTime || 8)) * 100}%` }}
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
                                        <div className={`flex ${pos === 'top' ? 'flex-row' : 'flex-col'} items-center gap-2 pointer-events-auto`}>
                                            <div className={`flex flex-col items-center bg-stone-800/95 p-2 border-2 ${isTurn ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.8)] scale-110' : 'border-stone-600'} rounded-lg transition-transform`}>
                                                <div className="w-8 h-8 sm:w-12 sm:h-12 mb-1 border-2 border-stone-500 bg-stone-700 relative overflow-hidden">
                                                    {isTurn && <div className="absolute inset-0 bg-amber-400/30 animate-pulse z-10"></div>}
                                                    <img src={avatarImg} alt={p.name} className="w-full h-full object-cover pixelated" />
                                                </div>
                                                <span className="text-white text-[10px] sm:text-xs font-bold max-w-[80px] truncate">{p.name}</span>
                                                <div className="text-emerald-400 text-[10px] font-bold bg-black/50 px-2 rounded mt-1">剩 {p.hand.length} 張</div>
                                            </div>

                                            {p.melds && p.melds.length > 0 && (
                                                <div className={`flex ${pos === 'top' ? 'flex-row' : 'flex-col'} gap-1 bg-black/40 p-1 rounded-lg border border-stone-600/50`}>
                                                    {p.melds.map((m, i) => (
                                                        <div key={i} className="flex gap-0.5 bg-black/30 p-0.5 rounded border border-stone-700">
                                                            {m.tiles.map((t, j) => <TileBlock key={j} tile={t} mini={true} isHidden={m.type === 'ankong' && (j === 1 || j === 2)} />)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                };

                                return (
                                    <>
                                        <div className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2">{renderOpponent(leftIdx, 'left')}</div>
                                        <div className="absolute top-12 left-1/2 -translate-x-1/2">{renderOpponent(topIdx, 'top')}</div>
                                        <div className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2">{renderOpponent(rightIdx, 'right')}</div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* ✨ 海底 (棄牌區大擴建與絕對排序) - 支援拖曳丟牌 */}
                        <div 
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 sm:w-3/4 max-w-3xl h-64 sm:h-80 bg-emerald-800/40 border-4 border-dashed border-emerald-900/60 flex flex-wrap content-start p-2 gap-1 sm:gap-2 overflow-y-auto custom-scrollbar shadow-inner z-10"
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (draggedIdx !== null && currentTurn === players.findIndex(p=>p.id===user.uid) && !pendingAction) {
                                    const tileToDiscard = myHand[draggedIdx];
                                    if (tileToDiscard) discardTile(tileToDiscard.id);
                                }
                                setDraggedIdx(null);
                                setDragOverIdx(null);
                            }}
                        >
                            {players.flatMap(p => p.discards)
                                .sort((a, b) => (a.dropTime || 0) - (b.dropTime || 0)) // ✨ 依照時間絕對排序
                                .map((t, i, arr) => {
                                    const isLatest = i === arr.length - 1; // 找出最新打出的一張
                                    return (
                                        <div key={t.id + i} className={`scale-[0.55] sm:scale-75 origin-top-left -mr-5 -mb-6 sm:-mr-2 sm:-mb-4 drop-shadow-md ${isLatest ? 'animate-in zoom-in slide-in-from-top-4 duration-300 z-10 opacity-100' : 'opacity-90'}`}>
                                            {/* 最新的一張會發光 */}
                                            <TileBlock tile={t} isHighlighted={isLatest && pendingAction} />
                                        </div>
                                    );
                                })
                            }
                        </div>

                        {/* 攔截動作浮動面板 (碰/胡/過) */}
                        {pendingAction && myIdx !== -1 && pendingAction.from !== myIdx && !isSpectator && (
                            (canHu || canPong || canKong || chowOptions.length > 0) ? (
                               
                                <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex gap-2 sm:gap-4 bg-stone-900/95 p-4 sm:p-5 border-4 border-amber-500 shadow-[0_0_30px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200 flex-wrap justify-center items-center mt-8">
                                    {/* ✨ 超清晰提示：誰打出了哪張牌 */}
                                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-white font-bold bg-stone-900 border-2 border-amber-400 px-4 py-2 text-sm sm:text-lg flex items-center gap-2 whitespace-nowrap shadow-lg">
                                        <img src={players[pendingAction.from].id.startsWith('ai_') ? AI_AVATARS[players[pendingAction.from].id] : (players[pendingAction.from].avatar || 'https://minotar.net/helm/Steve/64.png')} className="w-8 h-8 border border-stone-400 pixelated" />
                                        【<span className="text-amber-300">{players[pendingAction.from].name}</span>】 打出了
                                        <span className="scale-75 origin-center inline-block -mx-2 -my-4 pointer-events-none"><TileBlock tile={pendingAction.tile} /></span>
                                        <span className="text-red-400 ml-1">({actionTimer}s)</span>
                                    </div>
                                    {canHu && <button onClick={() => handleIntercept('hu')} className="bg-red-600 text-white px-4 py-2 sm:px-6 sm:py-3 font-black text-xl sm:text-2xl border-2 border-red-300 shadow-lg hover:bg-red-500 active:scale-95">胡</button>}
                                    {canKong && <button onClick={() => handleIntercept('kong')} className="bg-purple-600 text-white px-4 py-2 sm:px-6 sm:py-3 font-black text-xl sm:text-2xl border-2 border-purple-300 shadow-lg hover:bg-purple-500 active:scale-95">槓</button>}
                                    {canPong && <button onClick={() => handleIntercept('pong')} className="bg-amber-600 text-white px-4 py-2 sm:px-6 sm:py-3 font-black text-xl sm:text-2xl border-2 border-amber-300 shadow-lg hover:bg-amber-500 active:scale-95">碰</button>}
                                    {chowOptions.map((opt, i) => (
                                        <button key={i} onClick={() => handleIntercept('chow', opt.tiles)} className="bg-emerald-600 text-white px-3 py-2 sm:px-4 sm:py-3 font-black text-lg sm:text-xl border-2 border-emerald-300 shadow-lg hover:bg-emerald-500 active:scale-95 flex items-center">
                                            吃
                                            <span className="flex gap-1 ml-2 pointer-events-none">
                                                <span className={`bg-[#f4ebd0] px-1.5 sm:px-2 rounded shadow-inner text-xl sm:text-3xl border border-[#d4c3a3] ${getTileColor(opt.tiles[0].type, opt.tiles[0].val)}`}>{opt.tiles[0].symbol}</span>
                                                <span className={`bg-[#f4ebd0] px-1.5 sm:px-2 rounded shadow-inner text-xl sm:text-3xl border border-[#d4c3a3] ${getTileColor(opt.tiles[1].type, opt.tiles[1].val)}`}>{opt.tiles[1].symbol}</span>
                                            </span>
                                        </button>
                                    ))}
                                    <button onClick={() => handleIntercept('pass')} className="bg-stone-500 text-white px-4 py-2 sm:px-6 sm:py-3 font-black text-xl sm:text-2xl border-2 border-stone-300 shadow-lg hover:bg-stone-400 active:scale-95">過</button>
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
                                        onClick={() => { playCachedSound(tileSound); setMyHand(sortHand([...myHand])); }} 
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
                                    <button 
                                        onClick={() => discardTile(selectedTile)} 
                                        disabled={!selectedTile || players[currentTurn]?.id !== user?.uid || !!pendingAction}
                                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black px-6 py-1 border-2 border-emerald-300 shadow-md transition-transform active:scale-95"
                                    >
                                        打出
                                    </button>
                                </div>
                            </div>
                            
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

                            {/* ✨ 手牌排列 (真實插入邏輯與視覺間隙) */}
                            <div className="flex justify-center gap-0.5 sm:gap-1 px-1 h-20 sm:h-24 items-end">
                                {myHand.map((tile, index) => {
                                    const isDrawnTile = currentTurn === players.findIndex(p=>p.id===user.uid) && index === myHand.length - 1;
                                    const isDragging = draggedIdx === index;
                                    
                                    // ✨ 判斷拖曳方向來決定「插入空隙」要開在左邊還是右邊
                                    const isDragOverLeft = dragOverIdx === index && draggedIdx > index;
                                    const isDragOverRight = dragOverIdx === index && draggedIdx < index;

                                    return (
                                        <div 
                                            key={tile.id} 
                                            draggable
                                            onDragStart={(e) => { setDraggedIdx(index); e.dataTransfer.effectAllowed = 'move'; }}
                                            onDragOver={(e) => { e.preventDefault(); if (draggedIdx !== null && draggedIdx !== index) setDragOverIdx(index); }}
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
                                            className={`transition-all duration-200 cursor-grab active:cursor-grabbing ${isDrawnTile ? 'ml-2 sm:ml-4' : ''} ${isDragging ? 'opacity-30 scale-75 -translate-y-4' : ''} ${isDragOverLeft ? 'border-l-[8px] border-l-amber-500 rounded-l-lg pl-1' : ''} ${isDragOverRight ? 'border-r-[8px] border-r-amber-500 rounded-r-lg pr-1' : ''}`}
                                        >
                                            <TileBlock 
                                                tile={tile} 
                                                selected={selectedTile === tile.id}
                                                isHighlighted={highlightIds.includes(tile.id)}
                                                onClick={() => {
                                                    playCachedSound(clickSound);
                                                    setSelectedTile(tile.id === selectedTile ? null : tile.id);
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {/* 聊天室 */}
                        {showChatModal && (
                            <div className="absolute inset-0 z-50 bg-black/50 flex justify-end">
                                <div className="w-80 bg-stone-100 h-full flex flex-col shadow-2xl">
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
                                        if(!chatText.trim() || !roomCode) return;
                                        const roomRef = window.db.collection("mjRooms").doc(roomCode);
                                        roomRef.get().then(snap => {
                                            const d = snap.data();
                                            roomRef.update({ chats: [...(d.chats || []), { senderId: user?.uid, senderName: userProfile?.displayName, text: chatText.trim(), time: Date.now() }] });
                                            setChatText('');
                                        });
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
                    <div className="flex flex-col flex-grow items-center justify-center p-4">
                        <div className="bg-stone-900 border-4 border-amber-500 p-6 w-full max-w-2xl shadow-2xl text-center">
                            <h2 className="text-4xl font-black text-amber-400 mb-2 drop-shadow-md">
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
                                                <span className={`font-black text-lg sm:text-xl ${isWinner ? 'text-amber-400 animate-pulse' : 'text-white'}`}>{p.name}</span>
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
                                                            <TileBlock key={tIdx} tile={t} mini={window.innerWidth < 640} />
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

                            <div className="flex justify-center space-x-4">
                                {(!roomCode || isHost) ? (
                                    <button onClick={async () => {
                                        playCachedSound(clickSound);
                                        if (roomCode) {
                                            const snap = await window.db.collection("mjRooms").doc(roomCode).get();
                                            await window.db.collection("mjRooms").doc(roomCode).update({ status: 'lobby' });
                                        } else setGameState('menu');
                                    }} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black border-2 border-black">再來一局</button>
                                ) : (
                                    <div className="px-6 py-3 bg-stone-600 text-stone-300 font-black border-2 border-black">等待房主...</div>
                                )}
                                <button onClick={quitAndLeaveRoom} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black border-2 border-black">退出</button>
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