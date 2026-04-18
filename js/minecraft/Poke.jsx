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
    const [timeLeft, setTimeLeft] = useState(10); // 10秒計時
    const [passedPlayers, setPassedPlayers] = useState([]); // 紀錄這一輪 Pass 的玩家

    // 新增：小提示視窗狀態與多人房間設定
    const [toast, setToast] = useState(null);
    const [roomJoinCode, setRoomJoinCode] = useState('');
    const [roomSettings, setRoomSettings] = useState({ players: 4, fillAi: true });

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

    // 新增：自訂 Toast 提示函數取代 showAlert
    const showToast = (msg, isError = false) => {
        setToast(msg);
        if (isError) handlePlayError();
        setTimeout(() => setToast(null), 3000); // 3秒後消失
    };

    // 花色與點數權重 (嚴格定義，用於完美比較)
    const SUITS = [
        { symbol: '♣', color: 'text-[#373737]', sIdx: 0 }, 
        { symbol: '♦', color: 'text-red-600', sIdx: 1 }, 
        { symbol: '♥', color: 'text-red-600', sIdx: 2 }, 
        { symbol: '♠', color: 'text-[#373737]', sIdx: 3 }
    ];
    const VALUES = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

    // 牌型分析引擎
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

            // 鐵支 (4+1)
            if (vals[0] === 4) {
                return { type: 'four', weight: parseInt(keysByCount[0]) * 4, cards: sorted };
            }
            // 葫蘆 (3+2)
            if (vals[0] === 3 && vals[1] === 2) {
                return { type: 'fullhouse', weight: parseInt(keysByCount[0]) * 4, cards: sorted };
            }
            // 順子 (5張連續) - 簡化版：只判斷 34567 ~ 10JQKA
            let isStraight = true;
            for (let i = 1; i < 5; i++) {
                if (sorted[i].vIdx !== sorted[i-1].vIdx + 1) isStraight = false;
            }
            if (isStraight) return { type: 'straight', weight: sorted[4].weight, cards: sorted };
            
            return null;
        }
        return null;
    };

    // 出牌合法性驗證
    const checkPlayValid = (playCombo, currentTable, isFirst) => {
        if (!playCombo) return { valid: false, msg: "無效的牌型！只支援單張、對子、順子、葫蘆或鐵支。" };
        
        // 第一手限制
        if (isFirst && !playCombo.cards.some(c => c.weight === 0)) {
            return { valid: false, msg: "第一局的第一手必須包含梅花 3！" };
        }

        // 自由出牌
        if (!currentTable) return { valid: true };

        // 牌型相同比大小
        if (playCombo.type === currentTable.type) {
            if (playCombo.weight > currentTable.weight) return { valid: true };
            return { valid: false, msg: "你的牌必須比桌上的大！" };
        }

        // 鐵支壓制
        if (currentTable.type === 'straight' || currentTable.type === 'fullhouse') {
            if (playCombo.type === 'four') return { valid: true };
        }

        return { valid: false, msg: `你必須出與桌面相同的牌型 (${currentTable.type})！` };
    };
// 定義 AI 頭像
    const AI_AVATARS = {
        'ai_1': 'https://mc-heads.net/avatar/villager',
        'ai_2': 'https://mc-heads.net/avatar/enderman',
        'ai_3': 'https://mc-heads.net/avatar/creeper'
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

    const startSinglePlayer = () => {
        handlePlaySound();
        let deck = [];
        VALUES.forEach((val, vIndex) => {
            SUITS.forEach((suit) => {
                deck.push({ ...suit, value: val, vIdx: vIndex, weight: vIndex * 4 + suit.sIdx });
            });
        });
        
        deck.sort(() => Math.random() - 0.5);
        const sortHand = (hand) => hand.sort((a, b) => a.weight - b.weight);
        
        const hands = [
            sortHand(deck.slice(0, 13)),
            sortHand(deck.slice(13, 26)),
            sortHand(deck.slice(26, 39)),
            sortHand(deck.slice(39, 52))
        ];

        let starterIndex = 0;
        hands.forEach((hand, idx) => {
            if (hand.some(c => c.weight === 0)) starterIndex = idx;
        });

        setMyHand(hands[0]);
        setPlayers([
            { id: user.uid, name: userProfile?.displayName || '史蒂夫', cardsLeft: 13, isMe: true, hand: hands[0] },
            { id: 'ai_1', name: '村民 (AI)', cardsLeft: 13, isMe: false, hand: hands[1] },
            { id: 'ai_2', name: '終界使者 (AI)', cardsLeft: 13, isMe: false, hand: hands[2] },
            { id: 'ai_3', name: '苦力怕 (AI)', cardsLeft: 13, isMe: false, hand: hands[3] },
        ]);
        
        setTableCombo(null);
        setPassCount(0);
        setIsFirstTurn(true);
        setGameState('playing');
        setCurrentTurn(starterIndex);
    };

    // 玩家出牌
    const playSelectedCards = () => {
        if (selectedCards.length === 0) return;
        const playedCards = selectedCards.map(idx => myHand[idx]);
        const playCombo = analyzeCards(playedCards);
        
        const validation = checkPlayValid(playCombo, tableCombo, isFirstTurn);
        if (!validation.valid) {
            return showToast(`⚠️ ${validation.msg}`, true);
        }

        handlePlayCardDrop();
        executePlay(0, playCombo);
    };

    const passTurn = () => {
        if (!tableCombo) return showToast("⚠️ 桌面是空的，此回合你必須出牌！", true);
        if (isFirstTurn) return showToast("⚠️ 第一局不能 Pass，必須出梅花 3！", true);
        
        handlePlayPass();
        
        // 紀錄 Pass 的人
        const currentPId = players[currentTurn].id;
        if (!passedPlayers.includes(currentPId)) {
            setPassedPlayers(prev => [...prev, currentPId]);
        }

        setSelectedCards([]);
        setPassCount(prev => prev + 1);
        setCurrentTurn((currentTurn + 1) % 4);
    };

    // 執行出牌邏輯 (共用)
    const executePlay = (playerIndex, playCombo) => {
        setTableCombo(playCombo);
        setPassCount(0);
        setIsFirstTurn(false);

        const currentHand = players[playerIndex].hand;
        const playedWeights = playCombo.cards.map(c => c.weight);
        const newHand = currentHand.filter(c => !playedWeights.includes(c.weight));
        
        const newPlayers = [...players];
        newPlayers[playerIndex].hand = newHand;
        newPlayers[playerIndex].cardsLeft = newHand.length;
        setPlayers(newPlayers);

        if (playerIndex === 0) {
            setMyHand(newHand);
            setSelectedCards([]);
        }

        if (newHand.length === 0) {
            if (playerIndex === 0) handlePlayWin();
            showToast(playerIndex === 0 ? "🎉 恭喜！你贏了！" : `💀 ${players[playerIndex].name} 贏了，你輸了！`);
            setGameState('menu');
            return;
        }

        setCurrentTurn((currentTurn + 1) % 4);
    };

    // 偵測 Pass 歸零權與計時器邏輯
    useEffect(() => {
        if (passCount >= 3) {
            setTableCombo(null);
            setPassCount(0);
            setPassedPlayers([]); // 桌面清空，重設所有人的 Pass 狀態
        }
    }, [passCount]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        // 如果輪到的人已經在這一輪 Pass 過了，直接跳下一個
        if (passedPlayers.includes(players[currentTurn]?.id)) {
            const skipTimer = setTimeout(() => {
                setPassCount(prev => prev + 1);
                setCurrentTurn((currentTurn + 1) % 4);
            }, 600);
            return () => clearTimeout(skipTimer);
        }

        // 正常的計時邏輯
        setTimeLeft(10);
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // 時間到自動 Pass。如果是桌面清空的狀態不能 Pass，強制隨便出一張 (這邊簡化為自動 Pass)
                    if (tableCombo) passTurn();
                    else {
                        // 桌面空的時候不能 Pass，此處略過計時
                    }
                    return 0;
                }
                if (prev <= 4) handlePlayTick(); // 最後三秒滴答提醒
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [currentTurn, gameState, tableCombo, passedPlayers]);

    // AI 產牌邏輯 (暴力找牌型)
    const generateAllCombos = (hand) => {
        let combos = [];
        // 單張
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

        // 葫蘆
        trips.forEach(t => {
            pairs.forEach(p => {
                if (t[0].vIdx !== p[0].vIdx) combos.push([...t, ...p]);
            });
        });

        // 順子
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

    // AI 出牌決策
    useEffect(() => {
        if (gameState !== 'playing' || currentTurn === 0) return;

        const timer = setTimeout(() => {
            const aiPlayer = players[currentTurn];
            const allCombos = generateAllCombos(aiPlayer.hand);
            const analyzedCombos = allCombos.map(analyzeCards).filter(Boolean);
            
            // 過濾出合法的牌型
            let validPlays = analyzedCombos.filter(combo => checkPlayValid(combo, tableCombo, isFirstTurn).valid);
            
            if (validPlays.length > 0) {
                // 優先打出權重最小的牌 (保留實力)
                validPlays.sort((a, b) => a.weight - b.weight);
                
                // 如果是自由出牌，盡量出多張的 (順子/葫蘆 > 對子 > 單張)，加速脫手
                if (!tableCombo && !isFirstTurn) {
                    const lengths = { 'straight': 5, 'fullhouse': 5, 'four': 5, 'pair': 2, 'single': 1 };
                    validPlays.sort((a, b) => {
                        if (lengths[b.type] !== lengths[a.type]) return lengths[b.type] - lengths[a.type];
                        return a.weight - b.weight;
                    });
                }

                executePlay(currentTurn, validPlays[0]);
                handlePlayCardDrop();
            } else {
                // 打不過只好 Pass
                setPassCount(prev => prev + 1);
                setCurrentTurn((currentTurn + 1) % 4);
                handlePlaySound();
            }

        }, 1200);

        return () => clearTimeout(timer);
    }, [gameState, currentTurn, tableCombo, players, passCount, isFirstTurn]);


    return (
        <div className="fixed inset-0 z-[200] bg-stone-900 bg-opacity-90 flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in">
            <div className="w-full max-w-5xl flex justify-between items-center mb-4">
                <h1 className="text-2xl font-black text-white tracking-wide drop-shadow-md flex items-center">
                    <span className="material-symbols-outlined mr-2 text-amber-400">style</span> 
                    史蒂夫大老二
                </h1>
                <button 
                    onClick={() => { handlePlaySound(); onQuit(); }} 
                    className="bg-[#c6c6c6] hover:bg-red-500 hover:text-white text-[#373737] border-2 border-white border-r-[#555] border-b-[#555] px-3 py-1 font-bold transition-colors flex items-center"
                >
                    <span className="material-symbols-outlined mr-1 text-sm">close</span> 關閉
                </button>
            </div>

            <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] p-4 sm:p-6 w-full max-w-5xl shadow-2xl flex flex-col flex-grow relative overflow-hidden">
                
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
                        {/* 創建房間區塊 */}
                        <div className="bg-[#8b8b8b] p-6 border-4 border-white border-r-[#555] border-b-[#555] w-full max-w-md shadow-lg">
                            <h2 className="text-xl font-black text-[#373737] mb-4 flex items-center border-b-2 border-[#555] pb-2">
                                <span className="material-symbols-outlined mr-2">add_circle</span> 創建房間
                            </h2>
                            <div className="space-y-4 mb-4">
                                <label className="flex items-center text-[#373737] font-bold">
                                    <span className="w-24">玩家人數:</span>
                                    <select className="flex-grow p-1 bg-stone-200 border-2 border-[#555] font-bold" value={roomSettings.players} onChange={(e) => { handlePlaySound(); setRoomSettings({...roomSettings, players: parseInt(e.target.value)}); }}>
                                        <option value={2}>2 人</option><option value={3}>3 人</option><option value={4}>4 人</option>
                                    </select>
                                </label>
                                <label className="flex items-center text-[#373737] font-bold cursor-pointer">
                                    <span className="w-24">填入 AI:</span>
                                    <input type="checkbox" className="w-5 h-5" checked={roomSettings.fillAi} onChange={(e) => { handlePlaySound(); setRoomSettings({...roomSettings, fillAi: e.target.checked}); }} />
                                </label>
                            </div>
                            <button onClick={() => { 
                                handlePlaySound(); 
                                const code = Math.floor(100000 + Math.random() * 900000).toString();
                                setRoomCode(code);
                                showToast(`房間創建成功！代碼: ${code}`);
                                setTimeout(() => startSinglePlayer(), 800); 
                            }} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black border-2 border-emerald-400 border-r-[#373737] border-b-[#373737] transition-transform active:scale-95 shadow-md">
                                創建並進入遊戲
                            </button>
                        </div>

                        {/* 加入房間區塊 */}
                        <div className="bg-[#8b8b8b] p-6 border-4 border-white border-r-[#555] border-b-[#555] w-full max-w-md shadow-lg">
                            <h2 className="text-xl font-black text-[#373737] mb-4 flex items-center border-b-2 border-[#555] pb-2">
                                <span className="material-symbols-outlined mr-2">login</span> 加入房間
                            </h2>
                            <div className="flex space-x-2 mb-4">
                                <input type="text" maxLength={6} placeholder="輸入代碼" className="flex-grow p-2 text-center text-xl tracking-widest font-bold bg-stone-200 border-2 border-[#555] focus:outline-none" value={roomJoinCode} onChange={(e) => setRoomJoinCode(e.target.value.replace(/\D/g, ''))} />
                            </div>
                            <button onClick={() => { 
                                handlePlaySound();
                                if(roomJoinCode.length === 6) {
                                    showToast(`正在連接房間 ${roomJoinCode}...`);
                                    setTimeout(() => startSinglePlayer(), 1000);
                                } else {
                                    showToast("請輸入完整的 6 位數字代碼！", true);
                                }
                            }} className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-[#373737] font-black border-2 border-white border-r-[#555] border-b-[#555] transition-transform active:scale-95 shadow-md">
                                加入連線遊戲
                            </button>
                        </div>
                        <button onClick={() => { handlePlaySound(); setGameState('menu'); }} className="mt-4 text-[#373737] font-bold hover:underline flex items-center">
                             <span className="material-symbols-outlined text-sm mr-1">arrow_back</span> 返回主選單
                        </button>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className="flex flex-col flex-grow justify-between relative">
                        
                        {/* 對手狀態 (Minecraft 怪物化) */}
                        <div className="flex justify-around items-start bg-[#8b8b8b] p-2 border-2 border-[#555] border-r-white border-b-white">
                            {players.filter(p => !p.isMe).map((p) => (
                                <div key={p.id} className={`flex flex-col items-center p-2 border-2 ${players[currentTurn]?.id === p.id ? 'bg-stone-300 border-white shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]' : 'bg-[#c6c6c6] border-transparent'}`}>
                                    <div className="w-12 h-12 border-2 border-[#373737] bg-stone-400 overflow-hidden shadow-md">
                                        <img src={AI_AVATARS[p.id]} alt={p.name} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-[10px] font-black text-[#373737] mt-1 uppercase tracking-tighter">{p.name}</span>
                                    <div className="flex items-center mt-1 text-emerald-800 font-black bg-white/50 px-1 rounded">
                                        <span className="material-symbols-outlined text-xs mr-1">style</span> {p.cardsLeft}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 桌面 (含麥塊計時條與道具化卡片) */}
                        <div className="flex-grow flex flex-col items-center justify-center p-4">
                            {/* 麥塊風格計時進度條 */}
                            <div className="w-64 h-3 bg-stone-800 border-2 border-white mb-6 relative overflow-hidden shadow-inner">
                                <div 
                                    className="h-full bg-red-600 transition-all duration-1000 ease-linear"
                                    style={{ width: `${(timeLeft / 10) * 100}%` }}
                                ></div>
                            </div>

                            {tableCombo ? (
                                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                                    <span className="bg-stone-900 text-amber-400 text-[10px] px-2 py-0.5 mb-3 font-bold border border-stone-600 shadow-lg tracking-widest">
                                        {tableCombo.type.toUpperCase()}
                                    </span>
                                    <div className="flex space-x-2">
                                        {tableCombo.cards.map((card, idx) => (
                                            <div key={idx} className="w-16 h-24 bg-[#dbdbdb] border-4 border-[#373737] flex flex-col items-center justify-center shadow-[4px_4px_0_rgba(0,0,0,0.4)] transform -translate-y-2 relative">
                                                <span className={`text-2xl ${card.color}`}>{card.symbol}</span>
                                                <span className={`text-xl font-black ${card.color}`}>{card.value}</span>
                                                <div className="absolute inset-0 border-t-2 border-l-2 border-white/20 pointer-events-none"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-white bg-stone-800/60 px-6 py-3 border-4 border-dashed border-stone-500 font-black tracking-widest text-lg shadow-2xl">
                                    WAITING FOR PLAYERS...
                                </div>
                            )}
                        </div>

                       {/* 玩家控制區 (修正重複並補全音效) */}
                        <div className="flex flex-col bg-[#8b8b8b] p-3 border-2 border-white border-r-[#555] border-b-[#555]">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center text-[#373737] font-black text-lg">
                                    <span className="material-symbols-outlined mr-2">person</span> {userProfile?.displayName || '你'} 
                                    {currentTurn === 0 && <span className="ml-3 text-amber-400 animate-pulse">(你的回合！)</span>}
                                </div>
                                <div className="flex flex-wrap gap-2 justify-end">
                                    {/* 排序按鈕 */}
                                    <div className="flex bg-stone-700 p-1 rounded border border-[#555]">
                                        <button onClick={() => handleSortHand('weight')} className="px-2 py-1 text-[10px] bg-stone-600 hover:bg-stone-500 text-white font-bold border border-white/20 mr-1 shadow-[1px_1px_0px_#000]">點數排序</button>
                                        <button onClick={() => handleSortHand('suit')} className="px-2 py-1 text-[10px] bg-stone-600 hover:bg-stone-500 text-white font-bold border border-white/20 shadow-[1px_1px_0px_#000]">花色排序</button>
                                    </div>
                                    {/* 移動按鈕 */}
                                    <div className="flex bg-stone-700 p-1 rounded border border-[#555]">
                                        <button onClick={() => handleMoveCard('left')} disabled={selectedCards.length !== 1} className="px-2 py-1 bg-stone-600 hover:bg-stone-500 disabled:opacity-30 text-white border border-white/20 mr-1 shadow-[1px_1px_0px_#000]"><span className="material-symbols-outlined text-xs">arrow_back</span></button>
                                        <button onClick={() => handleMoveCard('right')} disabled={selectedCards.length !== 1} className="px-2 py-1 bg-stone-600 hover:bg-stone-500 disabled:opacity-30 text-white border border-white/20 shadow-[1px_1px_0px_#000]"><span className="material-symbols-outlined text-xs">arrow_forward</span></button>
                                    </div>
                                    {/* Pass 按鈕 */}
                                    <button onClick={passTurn} disabled={currentTurn !== 0} className="px-4 py-2 bg-stone-500 hover:bg-stone-400 disabled:opacity-50 text-white font-bold border-2 border-stone-300 border-r-stone-700 border-b-stone-700 flex items-center shadow-md active:translate-y-[1px]">
                                        <span className="material-symbols-outlined text-sm mr-1">skip_next</span> Pass
                                    </button>
                                    {/* 出牌按鈕 */}
                                    <button onClick={playSelectedCards} disabled={currentTurn !== 0 || selectedCards.length === 0} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold border-2 border-emerald-400 border-r-emerald-800 border-b-emerald-800 flex items-center shadow-md active:translate-y-[1px]">
                                        <span className="material-symbols-outlined text-sm mr-1">publish</span> 出牌
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
                                {myHand.map((card, index) => {
                                    const isSelected = selectedCards.includes(index);
                                    return (
                                        <button 
                                            key={index}
                                            onClick={() => {
                                                handlePlaySound();
                                                setSelectedCards(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
                                            }}
                                            className={`w-12 h-20 sm:w-16 sm:h-24 flex flex-col items-center justify-center transition-all relative
                                                ${isSelected 
                                                    ? 'bg-amber-50 -translate-y-6 shadow-[6px_6px_0px_#78350f] border-4 border-amber-600' 
                                                    : 'bg-[#dbdbdb] border-4 border-[#373737] hover:-translate-y-2 shadow-[4px_4px_0px_#222]'}`}
                                        >
                                            <span className={`text-2xl ${card.color}`}>{card.symbol}</span>
                                            <span className={`text-xl font-black leading-none ${card.color}`}>{card.value}</span>
                                            {/* 物品欄高光 */}
                                            <div className="absolute inset-0 border-t-2 border-l-2 border-white/30 pointer-events-none"></div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                )}
                
                {/* 新增：小提示視窗 (Toast) */}
                {toast && (
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-[300] bg-stone-800 text-white px-6 py-3 rounded-md shadow-2xl border-2 border-stone-600 animate-in slide-in-from-top-4 fade-in flex items-center">
                        <span className="material-symbols-outlined mr-2 text-amber-400">info</span>
                        <span className="font-bold tracking-wide">{toast}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Poke;