const { useState, useEffect, useRef } = React;

function Poke({ user, userProfile, showAlert, onQuit }) {
    const [gameState, setGameState] = useState('menu');
    const [roomCode, setRoomCode] = useState('');
    
    const [myHand, setMyHand] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [tableCombo, setTableCombo] = useState(null); 
    const [players, setPlayers] = useState([]); 
    const [currentTurn, setCurrentTurn] = useState(0);
    const [passCount, setPassCount] = useState(0);
    const [isFirstTurn, setIsFirstTurn] = useState(true); 
    const [timeLeft, setTimeLeft] = useState(30);
    const [passedPlayers, setPassedPlayers] = useState([]); 
    const [draggedIdx, setDraggedIdx] = useState(null); // 新增拖曳狀態

    const [toast, setToast] = useState(null);
    const [roomJoinCode, setRoomJoinCode] = useState('');
    const [roomSettings, setRoomSettings] = useState({ players: 4, fillAi: true, turnTime: 30, baseBet: 10, randomSeat: true }); 
    const [isHost, setIsHost] = useState(false); 
    const [lobbyPlayers, setLobbyPlayers] = useState([]);
    const [summaryData, setSummaryData] = useState(null);
    const [hasProcessedPayout, setHasProcessedPayout] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // 載入動畫狀態
    const [dragOverIdx, setDragOverIdx] = useState(null); // 拖曳排開動畫狀態
    const [lastPlayedTurn, setLastPlayedTurn] = useState(null); // 記錄誰出牌，用來決定動畫方向
    const [isSpectator, setIsSpectator] = useState(false); // 是否在觀戰席
    const [spectators, setSpectators] = useState([]); // 觀戰名單
    
    // ✨ 新增：聊天與動畫系統狀態
    const [chatText, setChatText] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [showChatModal, setShowChatModal] = useState(false);
    const [floatingChats, setFloatingChats] = useState({}); // 儲存頭像旁的浮動文字

    // ✨ 新增：保證 100% 觸發的自訂飛行動畫 (解決 Tailwind CDN 沒抓到的問題)
    useEffect(() => {
        if (!document.getElementById('poker-animations')) {
            const style = document.createElement('style');
            style.id = 'poker-animations';
            style.innerHTML = `
                @keyframes flyUp { 0% { transform: translateY(150px) scale(0.5); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
                @keyframes flyDown { 0% { transform: translateY(-150px) scale(0.5); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
                @keyframes flyLeft { 0% { transform: translate(-150px, -100px) scale(0.5); opacity: 0; } 100% { transform: translate(0, 0) scale(1); opacity: 1; } }
                @keyframes flyRight { 0% { transform: translate(150px, -100px) scale(0.5); opacity: 0; } 100% { transform: translate(0, 0) scale(1); opacity: 1; } }
                .anim-fly-up { animation: flyUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .anim-fly-down { animation: flyDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .anim-fly-left { animation: flyLeft 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .anim-fly-right { animation: flyRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            `;
            document.head.appendChild(style);
        }
    }, []);

    // 120秒閒置自動退出機制
    useEffect(() => {
        let timeoutId;
        if ((gameState === 'lobby' || gameState === 'summary') && roomCode) {
            timeoutId = setTimeout(() => {
                showToast("房間閒置過久 (120秒)，已自動解散/退出！", true);
                if (isHost) window.db.collection("pokerRooms").doc(roomCode).delete().catch(()=>{});
                quitAndLeaveRoom();
            }, 120000);
        }
        return () => clearTimeout(timeoutId);
    }, [gameState, roomCode, isHost, onQuit]);
    
    const playCachedSound = window.playCachedSound || (() => {});
    const clickSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/ui/button/click.ogg';
    const errorSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/block/note_block/bass.ogg';
    const playCardSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/item/bundle/drop_contents1.ogg';
    const winSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/ui/toast/challenge_complete.ogg';
    const passSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/entity/villager/no1.ogg';
    const sortSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/item/bundle/insert1.ogg';
    const tickSound = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/sounds/block/note_block/bit.ogg';
    
    const handlePlaySound = () => playCachedSound(clickSound);
    const handlePlayError = () => playCachedSound(errorSound);
    const handlePlayCardDrop = () => playCachedSound(playCardSound);
    const handlePlayWin = () => playCachedSound(winSound);
    const handlePlayPass = () => playCachedSound(passSound);
    const handlePlaySort = () => playCachedSound(sortSound);
    const handlePlayTick = () => playCachedSound(tickSound);

    const showToast = (msg, isError = false) => {
        setToast(msg);
        if (isError) handlePlayError();
        setTimeout(() => setToast(null), 3000);
    };

    const SUITS = [
        { symbol: '♣', color: 'text-[#373737]', sIdx: 0 }, 
        { symbol: '♦', color: 'text-red-600', sIdx: 1 }, 
        { symbol: '♥', color: 'text-red-600', sIdx: 2 }, 
        { symbol: '♠', color: 'text-[#373737]', sIdx: 3 }
    ];
    const VALUES = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

    const analyzeCards = (cards) => {
        if (!cards || cards.length === 0) return null;
        const sorted = [...cards].sort((a, b) => a.weight - b.weight);
        const len = sorted.length;

        if (len === 1) return { type: 'single', weight: sorted[0].weight, cards: sorted };
        if (len === 2) {
            if (sorted[0].vIdx === sorted[1].vIdx) return { type: 'pair', weight: sorted[1].weight, cards: sorted };
            return null;
        }
        if (len === 5) {
            const counts = {};
            sorted.forEach(c => counts[c.vIdx] = (counts[c.vIdx] || 0) + 1);
            const vals = Object.values(counts).sort((a, b) => b - a);
            const keysByCount = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

            const vIdxs = sorted.map(c => c.vIdx).sort((a,b)=>a-b);
            const vIdxStr = vIdxs.join(',');
            // ✨ 完美支援大老二常見順子，包含 10JQKA 與 A2345 等
            const validStraights = [
                '0,1,2,11,12', '0,1,2,3,12', '0,1,2,3,4', '1,2,3,4,5', '2,3,4,5,6', 
                '3,4,5,6,7', '4,5,6,7,8', '5,6,7,8,9', '6,7,8,9,10', '7,8,9,10,11'
            ];
            let isStraight = validStraights.includes(vIdxStr);
            let isFlush = sorted.every(c => c.sIdx === sorted[0].sIdx);

            if (isStraight && isFlush) {
                return { type: 'straight_flush', weight: sorted[4].weight, cards: sorted };
            }
            if (vals[0] === 4) {
                return { type: 'four', weight: parseInt(keysByCount[0]) * 4, cards: sorted };
            }
            if (vals[0] === 3 && vals[1] === 2) {
                return { type: 'fullhouse', weight: parseInt(keysByCount[0]) * 4, cards: sorted };
            }
            if (isStraight) {
                return { type: 'straight', weight: sorted[4].weight, cards: sorted };
            }
            
            return null;
        }
        return null;
    };

    const checkPlayValid = (playCombo, currentTable, isFirst) => {
        if (!playCombo) return { valid: false, msg: "無效的牌型！只支援單張、對子、順子、葫蘆、鐵支或同花順。" };
        if (isFirst && !playCombo.cards.some(c => c.weight === 0)) {
            return { valid: false, msg: "第一局的第一手必須包含梅花 3！" };
        }
        if (!currentTable) return { valid: true };
        
        // ✨ 同花順可以無視規則直接壓制除了更大同花順以外的所有牌
        if (playCombo.type === 'straight_flush') {
            if (currentTable.type === 'straight_flush' && playCombo.weight <= currentTable.weight) {
                return { valid: false, msg: "你的同花順必須比桌上的大！" };
            }
            return { valid: true };
        }

        // ✨ 鐵支可以無視規則直接壓制除了同花順或更大鐵支以外的所有牌
        if (playCombo.type === 'four') {
            if (currentTable.type === 'straight_flush') return { valid: false, msg: "鐵支無法打敗同花順！" };
            if (currentTable.type === 'four' && playCombo.weight <= currentTable.weight) {
                return { valid: false, msg: "你的鐵支必須比桌上的大！" };
            }
            return { valid: true };
        }

        if (playCombo.type === currentTable.type) {
            if (playCombo.weight > currentTable.weight) return { valid: true };
            return { valid: false, msg: "你的牌必須比桌上的大！" };
        }

        return { valid: false, msg: `你必須出與桌面相同的牌型 (${currentTable.type})！` };
    };

    // ✨ 安全離開房間邏輯 (遊戲中改為標記斷線)
    const quitAndLeaveRoom = async () => {
        handlePlaySound();
        if (roomCode && window.db) {
            try {
                const snap = await window.db.collection("pokerRooms").doc(roomCode).get();
                if (snap.exists) {
                    const d = snap.data();
                    if (gameState === 'playing' || gameState === 'summary') {
                        // 遊戲中退出：標記為斷線，讓 AI 接管，輸了照樣扣錢
                        const p = (d.players || []).map(pl => pl.id === user.uid ? { ...pl, isDisconnected: true } : pl);
                        await window.db.collection("pokerRooms").doc(roomCode).update({ players: p });
                    } else {
                        // 大廳中退出：直接移除
                        if (isHost) {
                            await window.db.collection("pokerRooms").doc(roomCode).delete();
                        } else {
                            const p = (d.players || []).filter(pl => pl.id !== user.uid);
                            const s = (d.spectators || []).filter(pl => pl.id !== user.uid);
                            await window.db.collection("pokerRooms").doc(roomCode).update({ players: p, spectators: s });
                        }
                    }
                }
            } catch(e) {}
        }
        onQuit(); 
    };

    // ✨ 修正 MC 頭像抓取網址 (MHF_ 標籤)
    const AI_AVATARS = {
        'ai_1': 'https://mc-heads.net/avatar/MHF_Villager',
        'ai_2': 'https://mc-heads.net/avatar/MHF_Enderman',
        'ai_3': 'https://mc-heads.net/avatar/MHF_Creeper',
        'ai_4': 'https://mc-heads.net/avatar/MHF_Slime'
    };

    const startSinglePlayer = () => {
        setRoomCode('');
        setIsHost(true);
        setRoomSettings(prev => ({ ...prev, baseBet: 0 })); // ✨ 強制將單人模式的底注歸零，不扣鑽石
        const singlePlayer = [{ id: user.uid, name: userProfile?.displayName || '史蒂夫', avatar: userProfile?.avatar || '' }];
        setLobbyPlayers(singlePlayer);
        startGameFromLobby(singlePlayer);
    };

    const handleSortHand = (mode) => {
        handlePlaySort();
        let sorted = [...myHand];
        if (mode === 'weight') {
            sorted.sort((a, b) => a.weight - b.weight);
        } else {
            sorted.sort((a, b) => (a.sIdx - b.sIdx) || (a.vIdx - b.vIdx));
        }
        setMyHand(sorted);
        setSelectedCards([]);
    };

    const handleMoveCard = (direction) => {
        if (selectedCards.length !== 1) return;
        const idx = selectedCards[0];
        const newIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= myHand.length) return;
        handlePlaySort();
        const newHand = [...myHand];
        [newHand[idx], newHand[newIdx]] = [newHand[newIdx], newHand[idx]];
        setMyHand(newHand);
        setSelectedCards([newIdx]);
    };

    const startGameFromLobby = async (finalLobbyPlayers = lobbyPlayers) => {
        handlePlaySound();
        setHasProcessedPayout(false);
        setSummaryData(null);

        let deck = [];
        VALUES.forEach((val, vIndex) => {
            SUITS.forEach((suit) => {
                deck.push({ ...suit, value: val, vIdx: vIndex, weight: vIndex * 4 + suit.sIdx });
            });
        });
        deck.sort(() => Math.random() - 0.5);
        const sortHand = (hand) => hand.sort((a, b) => a.weight - b.weight);
        const hands = [sortHand(deck.slice(0, 13)), sortHand(deck.slice(13, 26)), sortHand(deck.slice(26, 39)), sortHand(deck.slice(39, 52))];

        // 1. 先建立 4 人名單 (包含真實玩家與 AI)
        let roster = finalLobbyPlayers.map(p => ({ ...p, isMe: p.id === user.uid }));
        const aiNames = ['村民 (AI)', '終界使者 (AI)', '苦力怕 (AI)', '史萊姆 (AI)'];
        while (roster.length < 4) {
            const aiIdx = roster.length;
            roster.push({ id: `ai_${aiIdx}`, name: aiNames[aiIdx - 1], isMe: false });
        }

        // 2. 如果設定隨機座位，徹底打亂名單
        if (roomSettings.randomSeat) {
            roster.sort(() => Math.random() - 0.5);
        }

        // 3. 依序配發手牌
        const finalPlayers = roster.map((p, idx) => ({ ...p, cardsLeft: 13, hand: hands[idx] }));

        let starterIndex = 0;
        finalPlayers.forEach((p, idx) => { if (p.hand.some(c => c.weight === 0)) starterIndex = idx; });

        if (roomCode && isHost) {
            const dbPlayers = finalPlayers.map(p => ({...p, isMe: false}));
            await window.db.collection("pokerRooms").doc(roomCode).update({
                status: 'playing',
                players: dbPlayers,
                currentTurn: starterIndex,
                tableCombo: null,
                passCount: 0,
                isFirstTurn: true,
                passedPlayers: []
            });
        } else if (!roomCode) {
            setPlayers(finalPlayers);
            setMyHand(finalPlayers.find(p => p.isMe).hand);
            setTableCombo(null);
            setPassCount(0);
            setIsFirstTurn(true);
            setPassedPlayers([]);
            setGameState('playing');
            setCurrentTurn(starterIndex);
        }
    };

    const playSelectedCards = () => {
        if (selectedCards.length === 0) return;
        const playedCards = selectedCards.map(idx => myHand[idx]);
        const playCombo = analyzeCards(playedCards);
        
        const validation = checkPlayValid(playCombo, tableCombo, isFirstTurn);
        if (!validation.valid) {
            return showToast(validation.msg, true);
        }

        handlePlayCardDrop();
        const myIndex = players.findIndex(p => p.id === user.uid);
        executePlay(myIndex !== -1 ? myIndex : 0, playCombo);
    };

    const passTurn = async () => {
        if (!tableCombo) return showToast("桌面是空的，此回合你必須出牌！", true);
        if (isFirstTurn) return showToast("第一局不能 Pass，必須出梅花 3！", true);
        
        handlePlayPass();
        
        const currentPId = players[currentTurn].id;
        const newPassedPlayers = passedPlayers.includes(currentPId) ? passedPlayers : [...passedPlayers, currentPId];
        const newPassCount = passCount + 1;
        const newTurn = (currentTurn + 1) % 4;

        if (roomCode) {
            await window.db.collection("pokerRooms").doc(roomCode).update({
                passedPlayers: newPassedPlayers,
                passCount: newPassCount,
                currentTurn: newTurn
            });
        } else {
            setPassedPlayers(newPassedPlayers);
            setPassCount(newPassCount);
            setCurrentTurn(newTurn);
        }
        setSelectedCards([]);
    };

    const executePlay = async (playerIndex, playCombo) => {
        const currentHand = players[playerIndex].hand;
        const playedWeights = playCombo.cards.map(c => c.weight);
        const newHand = currentHand.filter(c => !playedWeights.includes(c.weight));
        
        const newPlayers = [...players];
        newPlayers[playerIndex].hand = newHand;
        newPlayers[playerIndex].cardsLeft = newHand.length;
        const newTurn = (currentTurn + 1) % 4;
        const isWinner = newHand.length === 0;
        
        setLastPlayedTurn(playerIndex); // 記錄剛剛是誰出牌

        if (roomCode) {
            const dbPlayers = newPlayers.map(p => ({...p, isMe: false}));
            await window.db.collection("pokerRooms").doc(roomCode).update({
                tableCombo: playCombo,
                passCount: 0,
                isFirstTurn: false,
                players: dbPlayers,
                currentTurn: newTurn,
                lastPlayedTurn: playerIndex, // ✨ 同步最後出牌者，讓所有人都能看到正確的動畫方向
                winner: isWinner ? players[playerIndex].name : null,
                status: isWinner ? 'summary' : 'playing'
            });
            if (players[playerIndex].id === user.uid) setSelectedCards([]);
        } else {
            setTableCombo(playCombo);
            setPassCount(0);
            setIsFirstTurn(false);
            setPlayers(newPlayers);
            setCurrentTurn(newTurn);

            if (players[playerIndex].id === user.uid) {
                setMyHand(newHand);
                setSelectedCards([]);
            }

            if (isWinner) {
                if (players[playerIndex].id === user.uid) handlePlayWin();
                else handlePlayError();

                const base = roomSettings?.baseBet || 0;
                let totalPrize = 0;
                
                const results = newPlayers.map(p => {
                    let penalty = 0;
                    let hasTwo = p.hand.some(c => c.value === '2');
                    let cardsLeft = p.hand.length;
                    
                    if (cardsLeft > 0) {
                        let mult = hasTwo ? 2 : 1;
                        penalty = cardsLeft * base * mult;
                        totalPrize += penalty;
                    }
                    return { ...p, penalty, hasTwo, cardsLeft };
                });

                const finalResults = results.map(p => {
                    if (p.cardsLeft === 0) p.prize = totalPrize;
                    return p;
                });

                setSummaryData({ winnerName: players[playerIndex].name, results: finalResults, baseBet: base, totalPrize });
                setGameState('summary');
            }
        }
    };

    useEffect(() => {
        if (passCount >= 3) {
            if (roomCode && isHost) {
                window.db.collection("pokerRooms").doc(roomCode).update({ tableCombo: null, passCount: 0, passedPlayers: [] });
            } else if (!roomCode) {
                setTableCombo(null);
                setPassCount(0);
                setPassedPlayers([]); 
            }
        }
    }, [passCount, roomCode, isHost]);

    useEffect(() => {
        if ((gameState === 'lobby' || gameState === 'playing' || gameState === 'summary') && roomCode) {
            const unsub = window.db.collection("pokerRooms").doc(roomCode).onSnapshot((snapshot) => {
                const data = snapshot.data();
                if (data) {
                    // ✨ 進出房間提示與被踢出偵測
                    const allCurrentIds = [...(data.players || []), ...(data.spectators || [])].map(p => p.id);
                    if (window._prevRoomIds && data.status !== 'waiting') {
                        const joined = [...(data.players||[]), ...(data.spectators||[])].filter(p => !window._prevRoomIds.includes(p.id) && !p.id.startsWith('ai_'));
                        const leftIds = window._prevRoomIds.filter(id => !allCurrentIds.includes(id) && !id.startsWith('ai_'));
                        
                        joined.forEach(p => { if (p.id !== user.uid) showToast(`👋 ${p.name} 加入了房間！`); });
                        leftIds.forEach(id => {
                            const leftP = window._prevRoomPlayers?.find(p => p.id === id);
                            if (leftP && leftP.id !== user.uid) showToast(`🚪 ${leftP.name} 離開了房間！`);
                        });
                    }
                    window._prevRoomIds = allCurrentIds;
                    window._prevRoomPlayers = [...(data.players||[]), ...(data.spectators||[])];
                    
                    // 如果自己不在名單上且不是主機，代表被踢或房間關閉
                    if (!allCurrentIds.includes(user.uid) && !isHost && roomCode) {
                        showToast("🚪 你已離開或被房主踢出房間！", true);
                        setRoomCode('');
                        setGameState('menu');
                        return;
                    }

                    setLobbyPlayers(data.players || []);
                    setRoomSettings(data.settings || roomSettings);
                    
                    if (data.status === 'lobby' && gameState !== 'lobby') {
                        setGameState('lobby');
                    }

                    if (data.status === 'playing' || data.status === 'summary') {
                        if (gameState === 'lobby' && data.status === 'playing') setGameState('playing');
                        
                        const syncedPlayers = (data.players || []).map(p => ({ ...p, isMe: p.id === user.uid }));
                        setPlayers(syncedPlayers);
                        
                        const myPlayer = syncedPlayers.find(p => p.id === user.uid);
                        const iAmSpectator = !myPlayer && data.spectators?.some(s => s.id === user.uid);
                        setIsSpectator(iAmSpectator);
                        setSpectators(data.spectators || []);

                        if (myPlayer && data.status !== 'summary') setMyHand(myPlayer.hand); 

                        if (data.tableCombo !== undefined) setTableCombo(data.tableCombo);
                        if (data.currentTurn !== undefined) setCurrentTurn(data.currentTurn);
                        if (data.passCount !== undefined) setPassCount(data.passCount);
                        if (data.isFirstTurn !== undefined) setIsFirstTurn(data.isFirstTurn);
                        if (data.passedPlayers !== undefined) setPassedPlayers(data.passedPlayers);
                        if (data.lastPlayedTurn !== undefined) setLastPlayedTurn(data.lastPlayedTurn);

                        // ✨ 接收聊天訊息並觸發浮動氣泡
                        if (data.chats) {
                            setChatMessages(data.chats);
                            const lastChat = data.chats[data.chats.length - 1];
                            if (lastChat && Date.now() - lastChat.time < 3000) {
                                setFloatingChats(prev => ({ ...prev, [lastChat.senderId]: lastChat.text }));
                                setTimeout(() => {
                                    setFloatingChats(prev => ({ ...prev, [lastChat.senderId]: null }));
                                }, 3000);
                            }
                        }

                        if (data.status === 'summary' && !hasProcessedPayout) {
                            setGameState('summary');
                            setHasProcessedPayout(true);
                            
                            if (data.winner === (userProfile?.displayName || '挑戰者' || '史蒂夫(房主)')) handlePlayWin();
                            else handlePlayError();

                            const base = data.settings?.baseBet || 0;
                            let totalPrize = 0;
                            let myChange = 0;
                            
                            const results = syncedPlayers.map(p => {
                                let penalty = 0;
                                let hasTwo = p.hand.some(c => c.value === '2');
                                let cardsLeft = p.hand.length;
                                
                                if (cardsLeft > 0) {
                                    let mult = hasTwo ? 2 : 1;
                                    penalty = cardsLeft * base * mult;
                                    totalPrize += penalty;
                                    if (p.isMe) myChange = -penalty;
                                }
                                return { ...p, penalty, hasTwo, cardsLeft };
                            });

                            const finalResults = results.map(p => {
                                if (p.cardsLeft === 0) {
                                    p.prize = totalPrize;
                                    if (p.isMe) myChange = totalPrize;
                                }
                                return p;
                            });

                            setSummaryData({ winnerName: data.winner, results: finalResults, baseBet: base, totalPrize });

                            if (myChange !== 0 && window.db && userProfile) {
                                const currentDiamonds = userProfile?.mcData?.diamonds || 0;
                                const newDiamonds = Math.max(0, currentDiamonds + myChange);
                                window.db.collection('users').doc(user.uid).update({
                                    "mcData.diamonds": newDiamonds
                                }).catch(console.error);
                            }
                        }
                    }
                }
            });
            return () => unsub();
        }
    }, [gameState, roomCode, isHost, user.uid, hasProcessedPayout, userProfile]);

    useEffect(() => {
        if (gameState !== 'playing') return;
        const cpId = players[currentTurn]?.id;
        if (passedPlayers.includes(cpId)) {
            if (!roomCode || isHost) {
                const skipTimer = setTimeout(() => {
                    const newTurn = (currentTurn + 1) % 4;
                    if (roomCode) {
                        window.db.collection("pokerRooms").doc(roomCode).update({ passCount: passCount + 1, currentTurn: newTurn });
                    } else {
                        setPassCount(prev => prev + 1); setCurrentTurn(newTurn);
                    }
                }, 600);
                return () => clearTimeout(skipTimer);
            }
            return;
        }

        setTimeLeft(roomSettings.turnTime);
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (cpId === user.uid && tableCombo) passTurn();
                    return 0;
                }
                if (prev <= 5 && cpId === user.uid) handlePlayTick(); 
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [currentTurn, gameState, tableCombo, passedPlayers, roomSettings.turnTime, roomCode, isHost]);

    const generateAllCombos = (hand) => {
        let combos = [];
        hand.forEach(c => combos.push([c]));

        const byVal = {};
        hand.forEach(c => {
            if (!byVal[c.vIdx]) byVal[c.vIdx] = [];
            byVal[c.vIdx].push(c);
        });

        let pairs = [], trips = [];
        Object.values(byVal).forEach(cards => {
            if (cards.length >= 2) pairs.push([cards[0], cards[1]]);
            if (cards.length >= 3) trips.push([cards[0], cards[1], cards[2]]);
            if (cards.length === 4) {
                 const kicker = hand.find(c => c.vIdx !== cards[0].vIdx);
                 if (kicker) combos.push([...cards, kicker]);
            }
        });
        pairs.forEach(p => combos.push(p));

        trips.forEach(t => {
            pairs.forEach(p => {
                if (t[0].vIdx !== p[0].vIdx) combos.push([...t, ...p]);
            });
        });

        const uniqueVals = [...new Set(hand.map(c => c.vIdx))].sort((a,b)=>a-b);
        for (let i = 0; i <= uniqueVals.length - 5; i++) {
            if (uniqueVals[i+4] === uniqueVals[i] + 4) {
                combos.push([
                    byVal[uniqueVals[i]][0], byVal[uniqueVals[i+1]][0], 
                    byVal[uniqueVals[i+2]][0], byVal[uniqueVals[i+3]][0], 
                    byVal[uniqueVals[i+4]][0]
                ]);
            }
        }
        return combos;
    };

    useEffect(() => {
        if (gameState !== 'playing' || players.length === 0) return;

        const aiPlayer = players[currentTurn];
        // ✨ 如果是 AI，或是「已斷線的真實玩家」，都由房主的電腦進行自動出牌接管
        if (!aiPlayer || (!aiPlayer.id.startsWith('ai_') && !aiPlayer.isDisconnected)) return;
        if (roomCode && !isHost) return;

        const timer = setTimeout(() => {
            const allCombos = generateAllCombos(aiPlayer.hand);
            const analyzedCombos = allCombos.map(analyzeCards).filter(Boolean);
            let validPlays = analyzedCombos.filter(combo => checkPlayValid(combo, tableCombo, isFirstTurn).valid);
            
            if (validPlays.length > 0) {
                let chosenPlay = null;
                const opponents = players.filter(p => p.id !== aiPlayer.id);
                const danger = opponents.some(p => p.cardsLeft <= 2); // 偵測是否有人快贏了！

                if (aiPlayer.id === 'ai_1') {
                    // 🟢 村民 AI (保守穩健型)：總是出最小的牌，自己出牌時優先出最長的組合。
                    validPlays.sort((a, b) => a.weight - b.weight);
                    if (!tableCombo && !isFirstTurn) {
                        const lengths = { 'straight': 5, 'fullhouse': 5, 'four': 5, 'pair': 2, 'single': 1 };
                        validPlays.sort((a, b) => lengths[b.type] - lengths[a.type] || a.weight - b.weight);
                    }
                    chosenPlay = validPlays[0];
                } 
                else if (aiPlayer.id === 'ai_2') {
                    // 🟣 終界使者 AI (侵略防守型)：如果有人快贏了，必定砸出手中最大的單張/對子來卡死對方！
                    if (danger && tableCombo && (tableCombo.type === 'single' || tableCombo.type === 'pair')) {
                        validPlays.sort((a, b) => b.weight - a.weight); 
                        chosenPlay = validPlays[0];
                    } else {
                        // 自己出牌時喜歡先出大牌壓制
                        validPlays.sort((a, b) => a.weight - b.weight);
                        if (!tableCombo && !isFirstTurn) {
                            const lengths = { 'single': 1, 'pair': 2, 'straight': 5, 'fullhouse': 5, 'four': 5 };
                            validPlays.sort((a, b) => lengths[b.type] - lengths[a.type] || b.weight - a.weight);
                        }
                        chosenPlay = validPlays[0];
                    }
                } 
                else {
                    // 💥 苦力怕 AI (炸彈狂魔型)：喜歡出對子跟炸彈，有人快贏時有炸彈必定引爆！
                    validPlays.sort((a, b) => a.weight - b.weight);
                    if (!tableCombo && !isFirstTurn) {
                        const lengths = { 'pair': 2, 'four': 5, 'fullhouse': 5, 'single': 1, 'straight': 5 };
                        validPlays.sort((a, b) => lengths[b.type] - lengths[a.type] || a.weight - b.weight);
                    }
                    const bomb = validPlays.find(p => p.type === 'four');
                    if (danger && bomb) chosenPlay = bomb;
                    else chosenPlay = validPlays[0];
                }

                executePlay(currentTurn, chosenPlay);
                handlePlayCardDrop();
            } else {
                if (roomCode) {
                    window.db.collection("pokerRooms").doc(roomCode).update({
                        passCount: passCount + 1, currentTurn: (currentTurn + 1) % 4,
                        passedPlayers: passedPlayers.includes(aiPlayer.id) ? passedPlayers : [...passedPlayers, aiPlayer.id]
                    });
                } else {
                    setPassCount(prev => prev + 1); setCurrentTurn((currentTurn + 1) % 4);
                    setPassedPlayers(prev => prev.includes(aiPlayer.id) ? prev : [...prev, aiPlayer.id]);
                }
                handlePlaySound();
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [gameState, currentTurn, tableCombo, players, passCount, isFirstTurn, roomCode, isHost]);

    // ✨ 新增拖曳排序邏輯 (包含排開動畫)
    const handleDragStart = (e, index) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
    };

    const handleDragEnter = (e, index) => {
        e.preventDefault();
        if (draggedIdx !== null && draggedIdx !== index) setDragOverIdx(index);
    };

    const handleDragOver = (e) => { e.preventDefault(); };

    const handleDragLeave = (e, index) => {
        e.preventDefault();
        if (dragOverIdx === index) setDragOverIdx(null);
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        setDragOverIdx(null);
        if (draggedIdx === null || draggedIdx === dropIndex) return;
        
        handlePlaySort();
        const newHand = [...myHand];
        const [draggedCard] = newHand.splice(draggedIdx, 1);
        newHand.splice(dropIndex, 0, draggedCard);
        
        setMyHand(newHand);
        setSelectedCards(prev => {
            let newSelected = [];
            for (let i = 0; i < prev.length; i++) {
                let s = prev[i];
                if (s === draggedIdx) newSelected.push(dropIndex);
                else if (draggedIdx < s && dropIndex >= s) newSelected.push(s - 1);
                else if (draggedIdx > s && dropIndex <= s) newSelected.push(s + 1);
                else newSelected.push(s);
            }
            return newSelected;
        });
        setDraggedIdx(null);
    };
    
    const handleDragEnd = () => {
        setDraggedIdx(null);
        setDragOverIdx(null);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-stone-900 bg-opacity-90 flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in">
            <div className="w-full max-w-5xl flex justify-between items-center mb-4">
                <h1 className="text-2xl font-black text-white tracking-wide drop-shadow-md flex items-center">
                    <span className="material-symbols-outlined mr-2 text-amber-400">style</span> 
                    史蒂夫大老二
                </h1>
                <button 
                    onClick={quitAndLeaveRoom}
                    className="bg-[#c6c6c6] hover:bg-red-500 hover:text-white text-[#373737] border-2 border-white border-r-[#555] border-b-[#555] px-3 py-1 font-bold transition-colors flex items-center"
                >
                    <span className="material-symbols-outlined mr-1 text-sm">close</span> 關閉
                </button>
            </div>

            <div className="bg-[#c6c6c6] border-2 sm:border-4 border-white border-r-[#555] border-b-[#555] p-1 sm:p-6 w-full max-w-5xl shadow-2xl flex flex-col flex-grow relative overflow-hidden max-h-[100dvh]">
                
                {gameState === 'menu' && (
                    <div className="flex flex-col items-center justify-center flex-grow space-y-4">
                        <span className="material-symbols-outlined text-8xl text-[#555] drop-shadow-md mb-4">videogame_asset</span>
                        <button onClick={() => { handlePlaySound(); startSinglePlayer(); }} className="w-64 py-3 flex justify-center items-center bg-[#8b8b8b] hover:bg-[#a0a0a0] text-[#373737] border-4 border-white border-r-[#555] border-b-[#555] text-xl font-black transition-transform active:scale-95 shadow-lg">
                            <span className="material-symbols-outlined mr-2">computer</span> 單人訓練 (打 AI)
                        </button>
                        <button onClick={() => { handlePlaySound(); setGameState('multiplayer_setup'); }} className="w-64 py-3 flex justify-center items-center bg-amber-500 hover:bg-amber-400 text-[#373737] border-4 border-white border-r-[#555] border-b-[#555] text-xl font-black transition-transform active:scale-95 shadow-lg">
                            <span className="material-symbols-outlined mr-2">wifi</span> 多人連線對戰
                        </button>
                    </div>
                )}

                {gameState === 'multiplayer_setup' && (
                    <div className="flex flex-col items-center justify-center flex-grow space-y-6 animate-in fade-in zoom-in duration-200">
                        <div className="bg-[#8b8b8b] p-6 border-4 border-white border-r-[#555] border-b-[#555] w-full max-w-md shadow-lg">
                            <h2 className="text-xl font-black text-[#373737] mb-4 flex items-center border-b-2 border-[#555] pb-2">
                                <span className="material-symbols-outlined mr-2">add_circle</span> 創建新遊戲
                            </h2>
                            <div className="space-y-4 mb-4">
                                <label className="flex items-center text-[#373737] font-bold">
                                    <span className="w-28 text-sm">出牌時限(秒):</span>
                                    <select className="flex-grow p-1 bg-stone-200 border-2 border-[#555] font-bold" value={roomSettings.turnTime} onChange={(e) => { handlePlaySound(); setRoomSettings({...roomSettings, turnTime: parseInt(e.target.value)}); }}>
                                        <option value={10}>10 秒 (快節奏)</option>
                                        <option value={30}>30 秒 (標準)</option>
                                        <option value={60}>60 秒 (放空模式)</option>
                                    </select>
                                </label>
                                <label className="flex items-center text-[#373737] font-bold mt-2">
                                    <span className="w-28 text-sm text-emerald-800">遊戲底注(鑽石):</span>
                                    <select className="flex-grow p-1 bg-emerald-100 border-2 border-emerald-600 font-bold text-emerald-900" value={roomSettings.baseBet} onChange={(e) => { handlePlaySound(); setRoomSettings({...roomSettings, baseBet: parseInt(e.target.value)}); }}>
                                        <option value={0}>0 鑽石 (純娛樂)</option>
                                        <option value={10}>10 鑽石 (小賭怡情)</option>
                                        <option value={50}>50 鑽石 (真劍對決)</option>
                                        <option value={100}>100 鑽石 (傾家蕩產)</option>
                                    </select>
                                </label>
                                <label className="flex items-center text-[#373737] font-bold mt-2">
                                    <span className="w-28 text-sm text-indigo-800">座位分配:</span>
                                    <select className="flex-grow p-1 bg-indigo-100 border-2 border-indigo-600 font-bold text-indigo-900" value={roomSettings.randomSeat ? 'true' : 'false'} onChange={(e) => { handlePlaySound(); setRoomSettings({...roomSettings, randomSeat: e.target.value === 'true'}); }}>
                                        <option value="true">隨機打亂 (公平)</option>
                                        <option value="false">依加入順序</option>
                                    </select>
                                </label>
                            </div>
                            <button onClick={async () => { 
                                handlePlaySound(); 
                                if (!user) return showToast("請先登入！", true);
                                
                                const myDiamonds = userProfile?.mcData?.diamonds || 0;
                                if (roomSettings.baseBet > 0 && myDiamonds < roomSettings.baseBet * 10) {
                                    return showToast(`你的鑽石太少啦！建議至少準備 ${roomSettings.baseBet * 10} 鑽石再開這局。`, true);
                                }

                                setIsLoading(true);
                                const code = Math.floor(100000 + Math.random() * 900000).toString();
                                try {
                                    await window.db.collection("pokerRooms").doc(code).set({
                                        hostId: user.uid,
                                        roomCode: code,
                                        players: [{ id: user.uid, name: userProfile?.displayName || '史蒂夫(房主)', avatar: userProfile?.avatar || '' }],
                                        settings: roomSettings,
                                        status: 'waiting',
                                        createdAt: Date.now()
                                    });
                                    setRoomCode(code);
                                    setIsHost(true);
                                    setGameState('lobby'); 
                                    showToast(`房間 ${code} 建立成功！`);
                                } catch (e) { 
                                    console.error("【詳細錯誤】", e);
                                    showToast("建立失敗：" + e.message, true); 
                                } finally {
                                    setIsLoading(false);
                                }
                            }} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black border-2 border-emerald-400 border-r-[#373737] border-b-[#373737] transition-transform active:scale-95 shadow-md">
                                建立大廳
                            </button>
                        </div>

                        <div className="bg-[#8b8b8b] p-6 border-4 border-white border-r-[#555] border-b-[#555] w-full max-w-md shadow-lg">
                            <h2 className="text-xl font-black text-[#373737] mb-4 flex items-center border-b-2 border-[#555] pb-2">
                                <span className="material-symbols-outlined mr-2">login</span> 進入房間
                            </h2>
                            <div className="flex space-x-2 mb-4">
                                <input type="text" maxLength={6} placeholder="輸入 6 位代碼" className="text-stone-900 flex-grow p-2 text-center text-xl tracking-widest font-bold bg-stone-200 border-2 border-[#555] focus:outline-none placeholder:text-stone-400" value={roomJoinCode} onChange={(e) => setRoomJoinCode(e.target.value.replace(/\D/g, ''))} />
                            </div>
                            <button onClick={async () => { 
                                handlePlaySound();
                                if(roomJoinCode.length === 6) {
                                    setIsLoading(true);
                                    try {
                                        const roomRef = window.db.collection("pokerRooms").doc(roomJoinCode);
                                        const snap = await roomRef.get();
                                        if (!snap.exists) return showToast("房間不存在！", true);
                                        
                                        const roomData = snap.data();
                                        const myDiamonds = userProfile?.mcData?.diamonds || 0;
                                        if (roomData.settings?.baseBet > 0 && myDiamonds < roomData.settings.baseBet * 10) {
                                            return showToast(`你的鑽石不夠付底注！這間房底注是 ${roomData.settings.baseBet} 鑽石。`, true);
                                        }

                                        const currentPlayers = roomData.players || [];
                                        const isGameActive = roomData.status === 'playing' || roomData.status === 'summary';
                                        
                                        const playerObj = { id: user.uid, name: userProfile?.displayName || '挑戰者', avatar: userProfile?.avatar || '' };
                                        if (isGameActive) {
                                            const currentSpecs = roomData.spectators || [];
                                            await roomRef.update({ spectators: [...currentSpecs, playerObj] });
                                            showToast("遊戲進行中，已加入觀戰席！");
                                        } else {
                                            await roomRef.update({ players: [...currentPlayers, playerObj] });
                                        }
                                        
                                        setRoomCode(roomJoinCode);
                                        setIsHost(false);
                                        setGameState('lobby');
                                    } catch (e) { showToast("加入失敗", true); } finally { setIsLoading(false); }
                                } else { showToast("請輸入 6 位代碼！", true); }
                            }} className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-[#373737] font-black border-2 border-white border-r-[#555] border-b-[#555] transition-transform active:scale-95 shadow-md">
                                加入連線
                            </button>
                        </div>
                        <button onClick={() => { handlePlaySound(); setGameState('menu'); }} className="mt-4 text-[#373737] font-bold hover:underline flex items-center">
                             <span className="material-symbols-outlined text-sm mr-1">arrow_back</span> 返回主選單
                        </button>
                    </div>
                )}
                {gameState === 'lobby' && (
                    <div className="flex flex-col items-center justify-center flex-grow space-y-6 animate-in fade-in zoom-in duration-200">
                        <div className="bg-[#8b8b8b] p-6 border-4 border-white border-r-[#555] border-b-[#555] w-full max-w-md shadow-2xl">
                            <div className="flex justify-between items-center border-b-2 border-[#555] pb-2 mb-4">
                                <h2 className="text-xl font-black text-[#373737] flex items-center">
                                    <span className="material-symbols-outlined mr-2">meeting_room</span> 遊戲大廳
                                </h2>
                                <span className="bg-stone-800 text-amber-400 px-2 py-1 font-mono font-bold border border-stone-600">
                                    #{roomCode}
                                </span>
                            </div>
                            
                            <div className="space-y-2 mb-6">
                                <p className="text-[10px] font-bold text-[#555] uppercase">玩家名單 (等待中...)</p>
                                {lobbyPlayers.map((p, idx) => (
                                    <div key={p.id} className="flex items-center bg-stone-200 p-2 border-2 border-[#555]">
                                        {p.avatar ? (
                                            <img src={p.avatar} className="w-6 h-6 rounded-full border border-stone-400 mr-2 object-cover bg-white" />
                                        ) : (
                                            <span className="material-symbols-outlined text-stone-600 mr-2">
                                                {idx === 0 ? 'shield_person' : 'person'}
                                            </span>
                                        )}
                                        <span className="font-bold text-[#373737] flex-grow">{p.name}</span>
                                        {idx === 0 && <span className="text-[8px] bg-amber-500 text-white px-1 font-black rounded mr-2">HOST</span>}
                                        
                                        {/* 踢人按鈕 */}
                                        {isHost && idx !== 0 && !p.id.startsWith('ai_') && (
                                            <button onClick={async () => {
                                                handlePlaySound();
                                                const newP = lobbyPlayers.filter(lp => lp.id !== p.id);
                                                await window.db.collection("pokerRooms").doc(roomCode).update({ players: newP });
                                            }} className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded shadow-sm flex items-center transition-transform active:scale-90" title="踢出此玩家">
                                                <span className="material-symbols-outlined text-[14px]">person_remove</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {[...Array(4 - lobbyPlayers.length)].map((_, i) => (
                                    <div key={i} className="flex items-center bg-stone-300/50 p-2 border-2 border-dashed border-[#555] opacity-50">
                                        <span className="material-symbols-outlined text-stone-500 mr-2">hourglass_top</span>
                                        <span className="font-bold text-[#555]">等待加入... (開始後補AI)</span>
                                    </div>
                                ))}
                            </div>

                            {spectators && spectators.length > 0 && (
                                <div className="space-y-2 mb-6">
                                    <p className="text-[10px] font-bold text-amber-600 uppercase">👀 觀戰席 (下一局加入)</p>
                                    {spectators.map((s) => (
                                        <div key={s.id} className="flex items-center bg-stone-200 p-2 border-2 border-amber-600/50 opacity-80">
                                            <span className="material-symbols-outlined text-stone-600 mr-2">visibility</span>
                                            <span className="font-bold text-stone-700">{s.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="bg-stone-700 p-2 border-2 border-black/20 mb-6 text-center flex justify-around">
                                <p className="text-white text-xs font-bold">出牌時限: <span className="text-amber-400">{roomSettings.turnTime}s</span></p>
                                <p className="text-white text-xs font-bold">座位: <span className="text-amber-400">{roomSettings.randomSeat ? '隨機打亂' : '依序入座'}</span></p>
                            </div>

                            {isHost ? (
                                <button onClick={() => startGameFromLobby(lobbyPlayers)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black border-2 border-emerald-400 border-r-[#373737] border-b-[#373737] transition-transform active:scale-95 shadow-md flex justify-center items-center">
                                    <span className="material-symbols-outlined mr-2">play_arrow</span> 開始遊戲 (補足AI)
                                </button>
                            ) : (
                                <div className="w-full py-3 bg-stone-500 text-stone-200 font-black border-2 border-stone-400 text-center animate-pulse cursor-wait">
                                    等待房主開始...
                                </div>
                            )}
                        </div>
                        <button onClick={() => { handlePlaySound(); setGameState('menu'); }} className="text-[#373737] font-bold hover:underline">離開房間</button>
                    </div>
                )}
                {gameState === 'playing' && (
                    <div className="flex flex-col flex-grow justify-between relative min-h-0">
                        
                        {/* ✨ 其他玩家區 (相對座位分配 - 手機版高度與頭像壓縮) */}
                        <div className="flex justify-around items-start bg-[#8b8b8b] p-1 sm:p-3 border-2 border-[#555] border-r-white border-b-white h-16 sm:h-32 shrink-0">
                            {(() => {
                                const myIndex = players.findIndex(p => p.id === user?.uid);
                                const opps = myIndex !== -1 
                                    ? [players[(myIndex + 1) % 4], players[(myIndex + 2) % 4], players[(myIndex + 3) % 4]].filter(Boolean)
                                    : players.filter(p => p.id !== user?.uid);

                                return opps.map((p, displayIndex) => {
                                    if (!p) return null;
                                    const isTheirTurn = players[currentTurn]?.id === p.id;
                                    return (
                                        <div key={p.id} className={`flex flex-col items-center p-1 sm:p-2 border-2 transition-all duration-300 relative ${isTheirTurn ? 'bg-amber-100 border-amber-500 shadow-[0_0_15px_rgba(251,191,36,1)] scale-105 sm:scale-110 z-10' : 'bg-[#c6c6c6] border-transparent scale-100'}`}>
                                            
                                            {/* ✨ 浮動聊天氣泡 */}
                                            {floatingChats[p.id] && (
                                                <div className="absolute -top-6 sm:-top-8 bg-white border-2 border-stone-800 text-stone-800 text-[9px] sm:text-xs font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded shadow-lg z-50 whitespace-nowrap animate-bounce">
                                                    {floatingChats[p.id]}
                                                </div>
                                            )}

                                            {isTheirTurn && !p.isDisconnected && (
                                                <div className="absolute -top-2 sm:-top-3 bg-amber-500 text-white text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full animate-bounce shadow-md">
                                                    思考中...
                                                </div>
                                            )}

                                            <div className={`w-8 h-8 sm:w-12 sm:h-12 border-2 relative overflow-hidden shadow-md ${isTheirTurn ? 'border-amber-500' : 'border-[#373737] bg-stone-400'}`}>
                                                {p.isDisconnected && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                                        <span className="text-white text-[6px] sm:text-[8px] font-black transform -rotate-12">已斷線</span>
                                                    </div>
                                                )}
                                                {p.id.startsWith('ai_') ? (
                                                    <img src={AI_AVATARS[p.id]} alt={p.name} className="w-full h-full object-cover" />
                                                ) : p.avatar ? (
                                                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover bg-white" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-2xl sm:text-4xl text-white mt-0.5 sm:mt-1">person</span>
                                                )}
                                            </div>
                                            <span className={`text-[8px] sm:text-[10px] font-black mt-0.5 sm:mt-1 uppercase tracking-tighter truncate w-12 sm:w-20 text-center ${isTheirTurn ? 'text-amber-700' : 'text-[#373737]'}`}>
                                                {p.name}
                                            </span>
                                            <div className="flex items-center mt-0.5 sm:mt-1 text-emerald-800 font-black bg-white/80 px-1 py-0.5 rounded shadow-sm border border-emerald-200">
                                                <span className="material-symbols-outlined text-[8px] sm:text-xs mr-0.5 sm:mr-1">style</span> 
                                                <span className="text-[8px] sm:text-xs leading-none">{p.cardsLeft}</span>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* ✨ 桌面中央區 (出牌與動畫) */}
                        <div className="flex-grow flex flex-col items-center justify-center p-1 sm:p-4 min-h-[100px] sm:min-h-[160px] relative overflow-hidden">
                            {/* 聊天與工具按鈕 */}
                            <div className="absolute top-1 left-1 sm:top-2 sm:left-2 flex gap-1 sm:gap-2 z-20">
                                <button onClick={() => setShowChatModal(true)} className="bg-stone-800/80 hover:bg-stone-900 text-white p-1.5 sm:p-2 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-90">
                                    <span className="material-symbols-outlined text-[14px] sm:text-[18px]">chat</span>
                                </button>
                            </div>

                            <div className="w-32 sm:w-64 h-1.5 sm:h-3 bg-stone-800 border border-white sm:border-2 mb-2 sm:mb-4 relative overflow-hidden shadow-inner">
                                <div className="h-full bg-red-600 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / roomSettings.turnTime) * 100}%` }}></div>
                            </div>

                            {tableCombo ? (
                                (() => {
                                    // ✨ 保證觸發的自訂 CSS 動畫
                                    let flyAnim = '';
                                    if (lastPlayedTurn !== null && players[lastPlayedTurn]) {
                                        if (players[lastPlayedTurn].isMe) {
                                            flyAnim = 'anim-fly-up';
                                        } else {
                                            const myIndex = players.findIndex(p => p.isMe);
                                            const opps = myIndex !== -1 ? [players[(myIndex + 1) % 4], players[(myIndex + 2) % 4], players[(myIndex + 3) % 4]] : players.filter(p => p.id !== user?.uid);
                                            const oppPos = opps.findIndex(p => p && p.id === players[lastPlayedTurn].id);
                                            
                                            if (oppPos === 0) flyAnim = 'anim-fly-left';       // 下家(右) -> 往左飛
                                            else if (oppPos === 1) flyAnim = 'anim-fly-down';  // 對家(上) -> 往下飛
                                            else if (oppPos === 2) flyAnim = 'anim-fly-right'; // 上家(左) -> 往右飛
                                        }
                                    }
                                    
                                    const animKey = tableCombo.cards.map(c=>c.weight).join(',') + '-' + currentTurn + '-' + passCount;
                                    
                                    return (
                                        <div key={animKey} className={`flex flex-col items-center ${flyAnim}`}>
                                            <span className="bg-stone-900 text-amber-400 text-[8px] sm:text-[10px] px-1.5 py-0.5 mb-1 sm:mb-2 font-bold border border-stone-600 shadow-lg tracking-widest">
                                                {tableCombo.type.toUpperCase()}
                                            </span>
                                            <div className="flex space-x-1 sm:space-x-2">
                                                {tableCombo.cards.map((card, idx) => (
                                                    <div key={idx} className="w-8 h-12 sm:w-16 sm:h-24 bg-[#dbdbdb] border-2 sm:border-4 border-[#373737] flex flex-col items-center justify-center shadow-[2px_2px_0_rgba(0,0,0,0.4)] sm:shadow-[4px_4px_0_rgba(0,0,0,0.4)] transform -translate-y-1 sm:-translate-y-2 relative">
                                                        <span className={`text-[12px] sm:text-2xl leading-none ${card.color}`}>{card.symbol}</span>
                                                        <span className={`text-[12px] sm:text-xl font-black leading-none ${card.color}`}>{card.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="text-white bg-stone-800/60 px-3 sm:px-6 py-1.5 sm:py-3 border-2 sm:border-4 border-dashed border-stone-500 font-black tracking-widest text-[10px] sm:text-lg shadow-2xl">
                                    WAITING FOR PLAYERS...
                                </div>
                            )}
                        </div>

                        {/* ✨ 自己手牌區 */}
                        <div className={`flex flex-col bg-[#8b8b8b] p-1 sm:p-3 border-2 sm:border-4 transition-all duration-300 relative shrink-0 ${(!isSpectator && players[currentTurn]?.id === user?.uid) ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,1)] bg-stone-500' : 'border-white border-r-[#555] border-b-[#555]'}`}>
                            {(!isSpectator && players[currentTurn]?.id === user?.uid) && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 sm:opacity-20 overflow-hidden">
                                    <span className="text-4xl sm:text-8xl font-black text-amber-300 drop-shadow-2xl uppercase tracking-widest whitespace-nowrap animate-pulse">YOUR TURN</span>
                                </div>
                            )}

                            {isSpectator ? (
                                <div className="flex flex-col items-center justify-center py-2 sm:py-6 z-10 relative">
                                    <span className="material-symbols-outlined text-2xl sm:text-4xl text-[#555] mb-1 sm:mb-2 animate-bounce">visibility</span>
                                    <h3 className="text-sm sm:text-xl font-black text-[#373737]">觀戰模式</h3>
                                    <p className="text-[10px] sm:text-base text-stone-700 font-bold">遊戲正在進行中，請等待這局結束後自動加入！</p>
                                </div>
                            ) : (
                                <div className="relative z-10 flex flex-col">
                                    {/* 緊湊的按鈕控制列 */}
                                    <div className="flex justify-between items-center mb-1 sm:mb-3">
                                        <div className="flex items-center text-[#373737] font-black text-[10px] sm:text-lg relative">
                                            <span className="material-symbols-outlined mr-0.5 sm:mr-2 text-[14px] sm:text-[24px]">person</span> 
                                            <span className="truncate max-w-[50px] sm:max-w-none">{userProfile?.displayName || '你'}</span>
                                            {players[currentTurn]?.id === user?.uid && (
                                                <span className="ml-1 sm:ml-3 bg-amber-500 text-white px-1 sm:px-2 py-0.5 sm:py-1 rounded shadow-md animate-bounce border border-black flex items-center whitespace-nowrap">
                                                    <span className="material-symbols-outlined text-[10px] sm:text-sm mr-0.5 sm:mr-1">priority_high</span> 換你！
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-0.5 sm:gap-2 justify-end">
                                            <div className="flex bg-stone-700 p-0.5 sm:p-1 rounded border border-[#555]">
                                                <button onClick={() => handleSortHand('weight')} className="px-1 sm:px-2 py-0.5 sm:py-1 text-[8px] sm:text-[10px] bg-stone-600 hover:bg-stone-500 text-white font-bold border border-white/20 mr-0.5 sm:mr-1 shadow-[1px_1px_0px_#000]">123</button>
                                                <button onClick={() => handleSortHand('suit')} className="px-1 sm:px-2 py-0.5 sm:py-1 text-[8px] sm:text-[10px] bg-stone-600 hover:bg-stone-500 text-white font-bold border border-white/20 shadow-[1px_1px_0px_#000]">花色</button>
                                            </div>
                                            <div className="flex bg-stone-700 p-0.5 sm:p-1 rounded border border-[#555]">
                                                <button onClick={() => handleMoveCard('left')} disabled={selectedCards.length !== 1} className="px-1 sm:px-2 py-0.5 sm:py-1 bg-stone-600 hover:bg-stone-500 disabled:opacity-30 text-white border border-white/20 mr-0.5 sm:mr-1 shadow-[1px_1px_0px_#000]"><span className="material-symbols-outlined text-[10px] sm:text-xs">arrow_back</span></button>
                                                <button onClick={() => handleMoveCard('right')} disabled={selectedCards.length !== 1} className="px-1 sm:px-2 py-0.5 sm:py-1 bg-stone-600 hover:bg-stone-500 disabled:opacity-30 text-white border border-white/20 shadow-[1px_1px_0px_#000]"><span className="material-symbols-outlined text-[10px] sm:text-xs">arrow_forward</span></button>
                                            </div>
                                            <button onClick={passTurn} disabled={players[currentTurn]?.id !== user?.uid} className="px-2 sm:px-4 py-1 sm:py-2 bg-stone-500 hover:bg-stone-400 disabled:opacity-50 text-white font-bold text-[10px] sm:text-sm border sm:border-2 border-stone-300 border-r-stone-700 border-b-stone-700 flex items-center shadow-md active:translate-y-[1px]">
                                                <span className="material-symbols-outlined text-[10px] sm:text-sm mr-0.5 sm:mr-1">skip_next</span> Pass
                                            </button>
                                            <button onClick={playSelectedCards} disabled={players[currentTurn]?.id !== user?.uid || selectedCards.length === 0} className="px-2 sm:px-4 py-1 sm:py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-[10px] sm:text-sm border sm:border-2 border-emerald-400 border-r-emerald-800 border-b-emerald-800 flex items-center shadow-md active:translate-y-[1px]">
                                                <span className="material-symbols-outlined text-[10px] sm:text-sm mr-0.5 sm:mr-1">publish</span> 出牌
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* ✨ 電腦版展開排版 (sm:flex-wrap)，手機版重疊 (-ml-5) */}
                                    <div className="flex justify-center items-end w-full h-16 sm:h-auto sm:min-h-[7rem] mt-1 sm:mt-2 sm:flex-wrap sm:gap-2 px-1 sm:px-0">
                                        {myHand.map((card, index) => {
                                            const isSelected = selectedCards.includes(index);
                                            const isDragging = draggedIdx === index;
                                            const isDragOverLeft = dragOverIdx === index && draggedIdx > index;
                                            const isDragOverRight = dragOverIdx === index && draggedIdx < index;
                                            
                                            let marginStyle = {};
                                            if (window.innerWidth < 640) {
                                                if (isDragOverLeft) marginStyle.marginLeft = '1.5rem';
                                                if (isDragOverRight) marginStyle.marginRight = '1.5rem';
                                            } else {
                                                if (isDragOverLeft) marginStyle.marginLeft = '3rem';
                                                if (isDragOverRight) marginStyle.marginRight = '3rem';
                                            }

                                            return (
                                                <button 
                                                    key={index}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, index)}
                                                    onDragEnter={(e) => handleDragEnter(e, index)}
                                                    onDragOver={handleDragOver}
                                                    onDragLeave={(e) => handleDragLeave(e, index)}
                                                    onDrop={(e) => handleDrop(e, index)}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={() => {
                                                        handlePlaySound();
                                                        setSelectedCards(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
                                                    }}
                                                    style={marginStyle}
                                                    className={`w-10 h-14 sm:w-16 sm:h-24 flex flex-col items-center justify-center transition-transform duration-200 relative cursor-grab active:cursor-grabbing shrink-0
                                                        ${index !== 0 ? '-ml-5 sm:ml-0' : ''} 
                                                        ${isDragging ? 'opacity-30 scale-95' : 'opacity-100'}
                                                        ${isSelected 
                                                            ? 'bg-amber-50 -translate-y-4 sm:-translate-y-6 shadow-[2px_2px_0px_#78350f] sm:shadow-[6px_6px_0px_#78350f] border border-amber-600 sm:border-4 z-20' 
                                                            : 'bg-[#dbdbdb] border border-[#373737] sm:border-4 hover:-translate-y-2 shadow-[2px_2px_0px_#222] sm:shadow-[4px_4px_0px_#222] hover:z-10'}`}
                                                >
                                                    <span className={`text-[12px] sm:text-2xl leading-none ${card.color}`}>{card.symbol}</span>
                                                    <span className={`text-[12px] sm:text-xl font-black leading-none ${card.color}`}>{card.value}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            {/* ✨ 浮動自己頭像的對話氣泡 (加入 user 防呆) */}
                            {user && floatingChats[user.uid] && (
                                <div className="absolute top-0 right-2 -translate-y-full bg-white border-2 border-stone-800 text-stone-800 text-[9px] sm:text-xs font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded shadow-lg z-50 whitespace-nowrap animate-bounce">
                                    {floatingChats[user.uid]}
                                </div>
                            )}
                        </div>

                        {/* ✨ 聊天室面板 Modal */}
                        {showChatModal && (
                            <div className="absolute inset-0 z-50 bg-black/50 flex justify-end animate-fade-in">
                                <div className="w-64 sm:w-80 bg-stone-100 h-full flex flex-col shadow-2xl animate-in slide-in-from-right-8">
                                    <div className="bg-stone-800 text-white p-3 flex justify-between items-center shrink-0">
                                        <span className="font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">forum</span> 對戰聊天室</span>
                                        <button onClick={() => setShowChatModal(false)} className="hover:text-red-400"><span className="material-symbols-outlined">close</span></button>
                                    </div>
                                    <div className="flex-grow p-3 overflow-y-auto flex flex-col gap-2 custom-scrollbar">
                                        {chatMessages.length === 0 ? <span className="text-gray-400 text-xs text-center mt-4">還沒有人講話...</span> : 
                                            chatMessages.map((c, i) => (
                                                <div key={i} className={`flex flex-col ${c.senderId === user?.uid ? 'items-end' : 'items-start'}`}>
                                                    <span className="text-[10px] text-gray-500 font-bold mb-0.5">{c.senderName}</span>
                                                    <div className={`px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm ${c.senderId === user?.uid ? 'bg-amber-400 text-stone-900 rounded-tr-none' : 'bg-white border border-gray-300 text-stone-800 rounded-tl-none'}`}>
                                                        {c.text}
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        if(!chatText.trim() || !roomCode) return;
                                        try {
                                            const newChat = { senderId: user?.uid || 'guest', senderName: userProfile?.displayName || '我', text: chatText.trim(), time: Date.now() };
                                            const roomRef = window.db.collection("pokerRooms").doc(roomCode);
                                            const snap = await roomRef.get();
                                            const d = snap.data();
                                            await roomRef.update({ chats: [...(d.chats || []), newChat] });
                                            setChatText('');
                                        } catch (err) { console.error(err); }
                                    }} className="p-2 border-t border-gray-300 flex gap-2 shrink-0 bg-white">
                                        <input type="text" value={chatText} onChange={e=>setChatText(e.target.value)} placeholder="輸入訊息..." className="flex-grow px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-sm outline-none focus:border-amber-500" />
                                        <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white px-3 rounded font-bold text-sm shadow-sm">傳送</button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {gameState === 'summary' && summaryData && (
                    <div className="flex flex-col flex-grow items-center justify-center p-4 animate-in zoom-in duration-300 relative z-[150]">
                        <div className="bg-[#10002b] border-4 border-amber-600 p-6 w-full max-w-4xl shadow-2xl">
                            <h2 className="text-3xl font-black text-amber-400 text-center mb-2 drop-shadow-md flex items-center justify-center">
                                <span className="material-symbols-outlined mr-2 text-3xl">emoji_events</span> 遊戲結算
                            </h2>
                            <p className="text-white text-center mb-6 font-bold">
                                贏家: <span className="text-emerald-400 text-xl mx-2">{summaryData.winnerName}</span> 
                                (底注: {summaryData.baseBet} 鑽石)
                            </p>

                            <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                                {summaryData.results.map((p, idx) => (
                                    <div key={idx} className={`p-3 border-2 ${p.isMe ? 'bg-stone-700 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-stone-800 border-stone-600'} flex flex-col md:flex-row justify-between items-center`}>
                                        <div className="flex items-center w-full md:w-1/4 mb-2 md:mb-0">
                                            <span className="text-white font-bold text-lg">{p.name} {p.isMe && '(你)'}</span>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-1 w-full md:w-1/2 justify-center mb-2 md:mb-0 min-h-[3rem]">
                                            {p.hand.length === 0 ? (
                                                <span className="text-emerald-400 font-black text-xl animate-pulse">大獲全勝！</span>
                                            ) : (
                                                p.hand.map((card, cIdx) => (
                                                    <div key={cIdx} className="w-8 h-12 bg-white border border-gray-800 flex flex-col items-center justify-center rounded-sm">
                                                        <span className={`text-xs ${card.color}`}>{card.symbol}</span>
                                                        <span className={`text-sm font-bold ${card.color} leading-none`}>{card.value}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end w-full md:w-1/4">
                                            {p.cardsLeft === 0 ? (
                                                <span className="text-emerald-400 font-black text-2xl">+ {p.prize} 鑽石</span>
                                            ) : (
                                                <div className="text-right">
                                                    <span className="text-red-400 font-bold text-xs block">
                                                        剩 {p.cardsLeft} 張 {p.hasTwo ? '×2 (老二)' : ''}
                                                    </span>
                                                    <span className="text-red-500 font-black text-xl">- {p.penalty} 鑽石</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-center space-x-4">
                                {(!roomCode || isHost) ? (
                                    <button onClick={async () => {
                                        handlePlaySound();
                                        if (roomCode) {
                                            const snap = await window.db.collection("pokerRooms").doc(roomCode).get();
                                            const d = snap.data();
                                            const realPlayers = (d.players || []).filter(p => !p.id.startsWith('ai_'));
                                            const specs = d.spectators || [];
                                            
                                            // 合併真實玩家與觀戰者，限制最多 4 人，剩下的繼續觀戰
                                            let nextLobby = [...realPlayers, ...specs];
                                            let nextSpecs = [];
                                            if (nextLobby.length > 4) {
                                                nextSpecs = nextLobby.slice(4);
                                                nextLobby = nextLobby.slice(0, 4);
                                            }
                                            
                                            await window.db.collection("pokerRooms").doc(roomCode).update({ 
                                                status: 'lobby', 
                                                players: nextLobby,
                                                spectators: nextSpecs
                                            });
                                            setGameState('lobby');
                                        } else {
                                            setGameState('menu');
                                        }
                                    }} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black border-2 border-black shadow-lg transition-transform active:scale-95">
                                        {roomCode ? '再來一局 (回到大廳)' : '回到主選單'}
                                    </button>
                                ) : (
                                    <div className="px-6 py-3 bg-stone-600 text-stone-300 font-black border-2 border-black shadow-lg">
                                        等待房主決定...
                                    </div>
                                )}
                                <button onClick={quitAndLeaveRoom} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black border-2 border-black shadow-lg transition-transform active:scale-95">
                                    退出房間
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {toast && (
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-[300] bg-stone-800 text-white px-6 py-3 rounded-md shadow-2xl border-2 border-stone-600 animate-in slide-in-from-top-4 fade-in flex items-center">
                        <span className="material-symbols-outlined mr-2 text-amber-400">info</span>
                        <span className="font-bold tracking-wide">{toast}</span>
                    </div>
                )}

                {isLoading && (
                    <div className="absolute inset-0 z-[400] bg-black/60 flex flex-col items-center justify-center animate-in fade-in">
                        <div className="w-16 h-16 border-8 border-stone-600 border-t-amber-400 rounded-full animate-spin mb-4"></div>
                        <span className="text-white font-black tracking-widest animate-pulse">連線中...</span>
                    </div>
                )}
            </div>
        </div>
    );
}

window.Poke = Poke;