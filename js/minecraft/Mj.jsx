const { useState, useEffect, useRef } = React;

// ✨ 終極真實麻將 SVG 向量繪圖引擎 (加大筒索、苦力怕雕刻版，修復 Scope 報錯)
const SvgMahjongFace = ({ type, val, symbol }) => {
    const C_RED = '#b91c1c';
    const C_GRN = '#15803d';
    const C_BLU = '#0369a1';
    const C_BLK = '#2d2d2d';

    // 繪製筒子 (加大版)
    const Dot = ({x, y, c, r=12}) => (
        <g transform={`translate(${x}, ${y})`}>
            <circle cx="0" cy="0" r={r} fill={c} />
            <circle cx="0" cy="0" r={r*0.6} fill="rgba(255,255,255,0.3)" />
            <circle cx="0" cy="0" r={r*0.3} fill={c} />
        </g>
    );

    // 繪製索子 (加粗拉長版)
    const Stick = ({x, y, c, rot=0}) => (
        <g transform={`translate(${x}, ${y}) rotate(${rot})`}>
            <rect x="-8" y="-22" width="16" height="44" rx="5" fill={c} />
            <line x1="-5" y1="-11" x2="5" y2="-11" stroke="#fff" strokeWidth="2.5" opacity="0.5"/>
            <line x1="-5" y1="0" x2="5" y2="0" stroke="#fff" strokeWidth="2.5" opacity="0.5"/>
            <line x1="-5" y1="11" x2="5" y2="11" stroke="#fff" strokeWidth="2.5" opacity="0.5"/>
        </g>
    );

    const renderT = () => {
        const content = (() => {
            switch(val) {
                case 1: return <Dot x="50" y="70" c={C_RED} r={38}/>;
                case 2: return <><Dot x="50" y="35" c={C_GRN} r={24}/><Dot x="50" y="105" c={C_BLU} r={24}/></>;
                case 3: return <><Dot x="25" y="30" c={C_BLU} r={20}/><Dot x="50" y="70" c={C_RED} r={20}/><Dot x="75" y="110" c={C_GRN} r={20}/></>;
                case 4: return <><Dot x="30" y="35" c={C_BLU} r={20}/><Dot x="70" y="35" c={C_GRN} r={20}/><Dot x="30" y="105" c={C_GRN} r={20}/><Dot x="70" y="105" c={C_BLU} r={20}/></>;
                case 5: return <><Dot x="25" y="25" c={C_BLU} r={18}/><Dot x="75" y="25" c={C_GRN} r={18}/><Dot x="50" y="70" c={C_RED} r={18}/><Dot x="25" y="115" c={C_GRN} r={18}/><Dot x="75" y="115" c={C_BLU} r={18}/></>;
                case 6: return <><Dot x="30" y="25" c={C_GRN} r={18}/><Dot x="70" y="25" c={C_GRN} r={18}/><Dot x="30" y="70" c={C_RED} r={18}/><Dot x="70" y="70" c={C_RED} r={18}/><Dot x="30" y="115" c={C_RED} r={18}/><Dot x="70" y="115" c={C_RED} r={18}/></>;
                case 7: return <><Dot x="20" y="20" c={C_GRN} r={14}/><Dot x="50" y="35" c={C_GRN} r={14}/><Dot x="80" y="50" c={C_GRN} r={14}/><Dot x="30" y="85" c={C_RED} r={17}/><Dot x="70" y="85" c={C_RED} r={17}/><Dot x="30" y="120" c={C_RED} r={17}/><Dot x="70" y="120" c={C_RED} r={17}/></>;
                case 8: return <><Dot x="30" y="20" c={C_BLU} r={15}/><Dot x="70" y="20" c={C_BLU} r={15}/><Dot x="30" y="53" c={C_BLU} r={15}/><Dot x="70" y="53" c={C_BLU} r={15}/><Dot x="30" y="86" c={C_BLU} r={15}/><Dot x="70" y="86" c={C_BLU} r={15}/><Dot x="30" y="120" c={C_BLU} r={15}/><Dot x="70" y="120" c={C_BLU} r={15}/></>;
                case 9: return <><Dot x="20" y="25" c={C_BLU} r={14}/><Dot x="50" y="25" c={C_BLU} r={14}/><Dot x="80" y="25" c={C_BLU} r={14}/><Dot x="20" y="70" c={C_RED} r={14}/><Dot x="50" y="70" c={C_RED} r={14}/><Dot x="80" y="70" c={C_RED} r={14}/><Dot x="20" y="115" c={C_GRN} r={14}/><Dot x="50" y="115" c={C_GRN} r={14}/><Dot x="80" y="115" c={C_GRN} r={14}/></>;
            }
        })();
        return <g transform="translate(50,70) scale(1.2) translate(-50,-70)">{content}</g>;
    };

    const renderS = () => {
        const content = (() => {
            switch(val) {
                case 1: return (
                    <g transform="translate(50, 75) scale(1.4) translate(-50, -75)">
                        {/* 去背雕刻版苦力怕 (僅留眼、口與雕刻光影) */}
                        <g fill={C_GRN}>
                            <rect x="32" y="63" width="12" height="12" /> 
                            <rect x="56" y="63" width="12" height="12" /> 
                            <rect x="44" y="75" width="12" height="18" /> 
                            <rect x="38" y="81" width="6" height="18" />  
                            <rect x="56" y="81" width="6" height="18" />  
                        </g>
                        <g fill="rgba(255,255,255,0.4)">
                            <rect x="32" y="74" width="12" height="1.5" />
                            <rect x="56" y="74" width="12" height="1.5" />
                            <rect x="44" y="92" width="12" height="1.5" />
                            <rect x="38" y="98" width="6" height="1.5" />
                            <rect x="56" y="98" width="6" height="1.5" />
                        </g>
                    </g>
                );
                case 2: return <><Stick x="50" y="35" c={C_GRN} /><Stick x="50" y="105" c={C_GRN} /></>;
                case 3: return <><Stick x="50" y="30" c={C_RED} /><Stick x="30" y="100" c={C_GRN} /><Stick x="70" y="100" c={C_GRN} /></>;
                case 4: return <><Stick x="30" y="35" c={C_GRN} /><Stick x="70" y="35" c={C_GRN} /><Stick x="30" y="105" c={C_BLU} /><Stick x="70" y="105" c={C_BLU} /></>;
                case 5: return <><Stick x="25" y="30" c={C_GRN} /><Stick x="75" y="30" c={C_GRN} /><Stick x="50" y="70" c={C_RED} /><Stick x="25" y="110" c={C_BLU} /><Stick x="75" y="110" c={C_BLU} /></>;
                case 6: return <><Stick x="25" y="35" c={C_GRN} /><Stick x="50" y="35" c={C_GRN} /><Stick x="75" y="35" c={C_GRN} /><Stick x="25" y="105" c={C_BLU} /><Stick x="50" y="105" c={C_BLU} /><Stick x="75" y="105" c={C_BLU} /></>;
                case 7: return <><Stick x="50" y="25" c={C_RED} /><Stick x="25" y="70" c={C_GRN} /><Stick x="50" y="70" c={C_GRN} /><Stick x="75" y="70" c={C_GRN} /><Stick x="25" y="115" c={C_GRN} /><Stick x="50" y="115" c={C_GRN} /><Stick x="75" y="115" c={C_GRN} /></>;
                case 8: return (
                    <g>
                        <Stick x="25" y="35" c={C_GRN} rot={25}/><Stick x="42" y="35" c={C_GRN} rot={-25}/>
                        <Stick x="58" y="35" c={C_GRN} rot={25}/><Stick x="75" y="35" c={C_GRN} rot={-25}/>
                        <Stick x="25" y="105" c={C_GRN} rot={-25}/><Stick x="42" y="105" c={C_GRN} rot={25}/>
                        <Stick x="58" y="105" c={C_GRN} rot={-25}/><Stick x="75" y="105" c={C_GRN} rot={25}/>
                    </g>
                );
                case 9: return <><Stick x="25" y="30" c={C_RED} /><Stick x="50" y="30" c={C_RED} /><Stick x="75" y="30" c={C_RED} /><Stick x="25" y="70" c={C_BLU} /><Stick x="50" y="70" c={C_BLU} /><Stick x="75" y="70" c={C_BLU} /><Stick x="25" y="110" c={C_GRN} /><Stick x="50" y="110" c={C_GRN} /><Stick x="75" y="110" c={C_GRN} /></>;
            }
        })();
        return <g transform="translate(50,70) scale(1.2) translate(-50,-70)">{content}</g>;
    };

    const fontStyle = { fontFamily: "'DotGothic16', 'Microsoft JhengHei', sans-serif" };

    return (
        <svg viewBox="0 0 100 140" className="w-full h-full pointer-events-none drop-shadow-sm">
            {type === 'W' && (
                <>
                    <text x="50" y="65" fontSize="60" textAnchor="middle" fill={C_BLK} fontWeight="900" style={fontStyle}>{symbol}</text>
                    <text x="50" y="125" fontSize="60" textAnchor="middle" fill={C_RED} fontWeight="900" style={fontStyle}>萬</text>
                </>
            )}
            {type === 'Z' && val !== 7 && (
                <text x="50" y="95" fontSize="80" textAnchor="middle" fill={val===5?C_RED:val===6?C_GRN:C_BLK} fontWeight="900" style={fontStyle}>{symbol}</text>
            )}
            {type === 'T' && renderT()}
            {type === 'S' && renderS()}
        </svg>
    );
};

// ✨ 專屬演算法：計算手牌牌型價值 (組數 * 10 + 對子 * 2 + 搭子 * 1)
const getHandScore = (hand) => {
    let counts = {};
    hand.forEach(t => counts[t.type+t.val] = (counts[t.type+t.val] || 0) + 1);
    let sets = 0, pairs = 0, dazi = 0;
    
    // 1. 抓出所有刻子 (3張一樣)
    for (let k in counts) { if (counts[k] >= 3) { sets++; counts[k] -= 3; } }
    
    // 2. 抓出所有順子 (連號3張)
    for (let k in counts) {
        if (k[0] !== 'Z' && counts[k] > 0) {
            let type = k[0]; let val = parseInt(k[1]);
            while (counts[k] > 0 && counts[type+(val+1)] > 0 && counts[type+(val+2)] > 0) {
                sets++; counts[k]--; counts[type+(val+1)]--; counts[type+(val+2)]--;
            }
        }
    }
    
    // 3. 抓出對子 (眼睛)
    for (let k in counts) { if (counts[k] >= 2) { pairs++; counts[k] -= 2; } }
    
    // 4. 抓出搭子 (聽牌潛力，例如 45 聽 36，或 46 聽 5)
    for (let k in counts) {
        if (k[0] !== 'Z' && counts[k] > 0) {
            let type = k[0]; let val = parseInt(k[1]);
            if (counts[type+(val+1)] > 0) { dazi++; counts[k]--; counts[type+(val+1)]--; }
            else if (counts[type+(val+2)] > 0) { dazi++; counts[k]--; counts[type+(val+2)]--; }
        }
    }
    return sets * 10 + pairs * 2 + dazi;
};

function Mj({ user, userProfile, showAlert, onQuit }) {
    const [gameState, setGameState] = useState('menu');
    const [roomCode, setRoomCode] = useState('');

    // 🔥 1. 終極字體強制載入術：直接將 Google 點陣字體打入瀏覽器 head，確保字體絕對生效，無視 App.jsx 的干擾
    useEffect(() => {
        const linkId = 'mj-pixel-font-forced';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=DotGothic16&display=swap';
            document.head.appendChild(link);
        }
    }, []);

    // 🛠️ 2. 修復缺失的功能定義：確保「關閉」與「退出」按鈕不會報錯
    const [showQuitModal, setShowQuitModal] = useState(false);
    const quitAndLeaveRoom = () => {
        if (gameState === 'playing' || gameState === 'lobby') setShowQuitModal(true);
        else confirmQuit();
    };

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
                        
                        const fb = typeof firebase !== 'undefined' ? firebase : window.firebase;
                        const increment = fb.firestore.FieldValue.increment;
                        
                        const myRef = window.db.collection('users').doc(user.uid);
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
    
    // 麻將核心狀態
    const [players, setPlayers] = useState([]);
    const [currentTurn, setCurrentTurn] = useState(0); 
    const [wall, setWall] = useState([]); 
    const [lastDiscard, setLastDiscard] = useState(null); 
    const [pendingAction, setPendingAction] = useState(null); 
    
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
    const [timeLeft, setTimeLeft] = useState(15);
    const [autoReadyTimer, setAutoReadyTimer] = useState(60);

    const checkIsGameOver = () => {
        if (!gameContext || !roomSettings) return false;
        if (roomSettings.length === '1局' && gameContext.totalHands >= 1 && gameContext.consecutive === 0) return true;
        if (roomSettings.length === '1圈' && gameContext.wind > 0) return true;
        if (roomSettings.length === '1將' && gameContext.wind === 0 && gameContext.totalHands > 1) return true;
        return false;
    };

    const [draggedIdx, setDraggedIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    const [toast, setToast] = useState(null);
    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
    const [roomJoinCode, setRoomJoinCode] = useState('');
    
    const [roomSettings, setRoomSettings] = useState({ turnTime: 20, baseBet: 50, taiBet: 20, length: '1局' }); 
    const [gameContext, setGameContext] = useState({ wind: 0, round: 0, dealer: 0, consecutive: 0, scores: [0,0,0,0], totalHands: 0 }); 
    const [isHost, setIsHost] = useState(false);
    const [lobbyPlayers, setLobbyPlayers] = useState([]);
    const [summaryData, setSummaryData] = useState(null);
    const [isSpectator, setIsSpectator] = useState(false);
    const [spectators, setSpectators] = useState([]);

    const [chatText, setChatText] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [showChatModal, setShowChatModal] = useState(false);
    const [floatingChats, setFloatingChats] = useState({});

    const [tingOptions, setTingOptions] = useState(null);
    const [winAnimation, setWinAnimation] = useState(null);
    const [isShuffling, setIsShuffling] = useState(false);
    const [actionBubbles, setActionBubbles] = useState({});

    // 音效載入
    const playCachedSound = (url) => { 
        if (window.playCachedSound) window.playCachedSound(url); 
        const fallbackAudio = new Audio(url);
        fallbackAudio.volume = 0.8;
        fallbackAudio.play().catch(e => {});
    };
    const preloadFastSound = (url) => { if (window.preloadFastSound) window.preloadFastSound(url); };

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

    const playQuietSound = (url) => {
        const a = new Audio(url);
        a.volume = 0.2;
        a.play().catch(()=>{});
    };

    const playActorVoice = (idx) => {
        const p = players[idx];
        if (!p) return;
        if (p.id.startsWith('ai_1')) playCachedSound(aiVillagerSound);
        else if (p.id.startsWith('ai_2')) playCachedSound(aiEndermanSound);
        else if (p.id.startsWith('ai_3')) playCachedSound(aiCreeperSound);
        else playCachedSound(steveEatSound); 
    };

    const triggerActionBubble = (pIdx, text) => {
        setActionBubbles(prev => ({ ...prev, [pIdx]: text }));
        setTimeout(() => setActionBubbles(prev => ({ ...prev, [pIdx]: null })), 2000);
    };

    const bgmRef = useRef(null);

    useEffect(() => {
        const sounds = [clickSound, tileSound, winSound, alertSound, eatSound, anvilSound, totemSound, passSound, dropSound, tingSound, sortSound];
        sounds.forEach(src => preloadFastSound(src));
        
        bgmRef.current = new Audio("https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.5/assets/minecraft/sounds/music/game/creative/creative1.ogg");
        bgmRef.current.loop = true;
        bgmRef.current.volume = 0.2; 

        return () => {
            if (bgmRef.current) {
                bgmRef.current.pause();
                bgmRef.current.src = "";
            }
        };
    }, []); 

    useEffect(() => {
        if (gameState === 'playing') {
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

    // 麻將定義
    const TILE_DEFS = {
        'W': ['一','二','三','四','五','六','七','八','九'], 
        'T': ['1T','2T','3T','4T','5T','6T','7T','8T','9T'], 
        'S': ['1S','2S','3S','4S','5S','6S','7S','8S','9S'], 
        'Z': ['東','南','西','北','中','發','白']
    };

    const getTileColor = (type, val) => {
        if (type === 'W') return 'text-red-700';
        if (type === 'T') return 'text-[#2d2d2d]';
        if (type === 'S') return 'text-emerald-800';
        if (type === 'Z') {
            if (val <= 4) return 'text-[#2d2d2d]'; 
            if (val === 5) return 'text-red-700'; 
            if (val === 6) return 'text-emerald-800'; 
            if (val === 7) return 'text-[#2d2d2d]'; 
        }
        return 'text-[#2d2d2d]';
    };

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

            if (cardsMap[k] >= 3) {
                cardsMap[k] -= 3;
                if (tryHu(cardsMap, remaining - 3)) return true;
                cardsMap[k] += 3;
            }

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

        const uniqueKeys = Object.keys(counts).filter(k => counts[k] >= 2);
        for (let eye of uniqueKeys) {
            const tempMap = { ...counts };
            tempMap[eye] -= 2;
            if (tryHu(tempMap, handCards.length - 2)) return true;
        }
        return false;
    };

    useEffect(() => {
        if (gameState === 'playing' && roomCode) {
            const handleBeforeUnload = (e) => {
                e.preventDefault();
                e.returnValue = ''; 
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [gameState, roomCode]);

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

        let roster;
        if (gameContext && gameContext.totalHands > 0) {
            roster = finalLobbyPlayers.map(p => ({ ...p, isMe: p.id === user.uid }));
        } else {
            roster = finalLobbyPlayers.map(p => ({ ...p, isMe: p.id === user.uid }));
            const aiNames = ['村民 (AI)', '終界使者 (AI)', '苦力怕 (AI)'];
            while (roster.length < 4) {
                const aiIdx = roster.length;
                roster.push({ id: `ai_${aiIdx}`, name: aiNames[aiIdx - 1], isMe: false });
            }
            roster.sort(() => Math.random() - 0.5); 
        }

        const nextDealerIdx = gameContext ? gameContext.dealer : 0;
        const finalPlayers = roster.map((p, idx) => {
            const count = idx === nextDealerIdx ? 17 : 16;
            const hand = deck.splice(0, count);
            return { ...p, hand: sortHand(hand), melds: [], discards: [], isTing: false };
        });

        const initialGameState = {
            status: 'playing',
            players: finalPlayers,
            wall: deck,
            currentTurn: nextDealerIdx, 
            lastDiscard: null,
            pendingAction: null
        };

        if (roomCode && isHost) {
            const dbPlayers = finalPlayers.map(p => ({...p, isMe: false}));
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

        setIsShuffling(true);
        const shuffleInterval = setInterval(() => playQuietSound(shuffleSound), 250);
        setTimeout(() => {
            clearInterval(shuffleInterval);
            setIsShuffling(false);
        }, 1500);
    };

    const discardTile = async (tileId, declareTing = false, dropPos = null) => {
        if (pendingAction) return; 
        
        const myIndex = players.findIndex(p => p.id === user.uid);
        if (currentTurn !== myIndex) return; 

        const tileToDiscard = myHand.find(t => t.id === tileId);
        const newHand = myHand.filter(t => t.id !== tileId);
        
        playCachedSound(tileSound);
        setMyHand(newHand);
        setSelectedTile(null);

        const newPlayers = [...players];
        if (declareTing) {
            playCachedSound(tingSound);
            newPlayers[myIndex] = { ...newPlayers[myIndex], isTing: true }; 
        }

        executeDiscard(myIndex, tileToDiscard, newHand, newPlayers, dropPos);
    };

    const executeDiscard = async (pIndex, tileToDiscard, newHand, customPlayers = null, dropPos = null) => {
        playCachedSound(dropSound); 
        const newPlayers = customPlayers ? [...customPlayers] : [...players];
        newPlayers[pIndex].hand = newHand;
        
        let finalDropX = dropPos?.x ?? (Math.random() * 80 + 10);
        let finalDropY = dropPos?.y ?? (Math.random() * 80 + 10);

        const tileWithTime = { 
            ...tileToDiscard, 
            dropTime: Date.now(),
            dropX: finalDropX,
            dropY: finalDropY,
            dropRot: dropPos?.rot ?? (Math.random() * 60 - 30) 
        };
        newPlayers[pIndex].discards.push(tileWithTime);

        const allDiscards = newPlayers.flatMap(p => p.discards);
        for (let step = 0; step < 3; step++) {
            for (let i = 0; i < allDiscards.length; i++) {
                for (let j = i + 1; j < allDiscards.length; j++) {
                    let d1 = allDiscards[i];
                    let d2 = allDiscards[j];
                    if (d1.dropX == null || d2.dropX == null) continue;
                    
                    let dx = d1.dropX - d2.dropX;
                    let dy = d1.dropY - d2.dropY;
                    
                    if (dx === 0 && dy === 0) { dx = Math.random()*0.1 - 0.05; dy = Math.random()*0.1 - 0.05; }

                    let minX = 7.5; 
                    let minY = 16.5; 
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
        
        allDiscards.forEach(d => {
            if (d.dropX != null) {
                d.dropX = Math.max(5, Math.min(95, d.dropX));
                d.dropY = Math.max(10, Math.min(90, d.dropY));
            }
        });

        const nextTurn = (pIndex + 1) % 4;
        let canIntercept = false;
        let interceptors = [];
        
        newPlayers.forEach((p, idx) => {
            if (idx === pIndex) return;
            const t = tileToDiscard;
            const matchCount = p.hand.filter(ht => ht.type === t.type && ht.val === t.val).length;
            const isHu = checkHu([...p.hand, t]);
            
            let canChow = false;
            if (idx === (pIndex + 1) % 4 && t.type !== 'Z' && !p.isTing) {
                const typeHand = p.hand.filter(ht => ht.type === t.type);
                const hasV = (v) => typeHand.some(ht => ht.val === v);
                if ((hasV(t.val - 2) && hasV(t.val - 1)) || 
                    (hasV(t.val - 1) && hasV(t.val + 1)) || 
                    (hasV(t.val + 1) && hasV(t.val + 2))) {
                    canChow = true;
                }
            }

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
                expires: Date.now() + 20000, 
                interceptors: interceptors 
            };
        } else {
            const newWall = [...wall];
            if (newWall.length === 0) {
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
                updateMyHandSmartly(updateData.players[nextTurn].hand); 
            }
        }
    };

    const handleIntercept = async (actionType, specificTiles = null, forceActorIdx = null) => {
        const actorIdx = forceActorIdx !== null ? forceActorIdx : players.findIndex(p => p.id === user.uid);
        const currentHand = players[actorIdx].hand;
        const tile = pendingAction?.tile;
        
        if (tile && actionType !== 'pass' && actionType !== 'hu') {
            const someoneCanHu = players.some((p, idx) => idx !== actorIdx && idx !== pendingAction.from && checkHu([...p.hand, tile]));
            if (someoneCanHu) {
                if (forceActorIdx === null) showToast("⚠️ 有其他玩家可胡牌 (優先級最高)！請等待對方決定。");
                return; 
            }

            if (actionType === 'chow') {
                const someoneCanPong = players.some((p, idx) => idx !== actorIdx && idx !== pendingAction.from && p.hand.filter(ht => ht.type === tile.type && ht.val === tile.val).length >= 2);
                if (someoneCanPong) {
                    if (forceActorIdx === null) showToast("⚠️ 有其他玩家可碰牌/槓牌 (優先級較高)！請等待對方決定。");
                    return; 
                }
            }
        }

        if (actionType === 'pass') {
            if (forceActorIdx === null) playCachedSound(passSound); 
            proceedNextTurnAfterPass();
            return;
        }

        const newPlayers = [...players];
        
        if (actionType === 'hu') {
            playActorVoice(actorIdx);
            setTimeout(() => playCachedSound(totemSound), 300); 
            triggerActionBubble(actorIdx, "胡！");
            if (!checkHu([...currentHand, tile])) return showToast("牌型不符 (需 5搭1眼)！");
            handleWin(actorIdx, pendingAction.from);
            return;
        }

        if (actionType === 'pong') {
            playActorVoice(actorIdx);
            setTimeout(() => playCachedSound(tileSound), 150); 
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
                updateMyHandSmartly(remainingHand); 
            }
        }

        if (actionType === 'kong') {
            playActorVoice(actorIdx);
            setTimeout(() => playCachedSound(tileSound), 150); 
            triggerActionBubble(actorIdx, "槓！");
            const sameTiles = currentHand.filter(t => t.type === tile.type && t.val === tile.val);
            if (sameTiles.length < 3) return showToast("條件不符！");
            
            const used = [sameTiles[0], sameTiles[1], sameTiles[2]];
            const remainingHand = currentHand.filter(t => !used.map(u=>u.id).includes(t.id));
            
            const newWall = [...wall];
            if (newWall.length === 0) return handleDrawGame();
            const drawnTile = newWall.shift(); 
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
            setTimeout(() => playCachedSound(tileSound), 150); 
            triggerActionBubble(actorIdx, "吃！");
            const used = specificTiles; 
            if (!used || used.length !== 2) return showToast("系統錯誤：未選擇吃的牌");
            
            const remainingHand = currentHand.filter(t => t.id !== used[0].id && t.id !== used[1].id);
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
            if(actorIdx === players.findIndex(p=>p.id===user.uid)) updateMyHandSmartly(remainingHand); 
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
        const drawnTile = newWall.shift(); 

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
        if (newPlayers[nextTurn].id === user.uid) updateMyHandSmartly(newPlayers[nextTurn].hand); 
    };

    const handleWin = async (winnerIdx, loserIdx = null) => {
        playCachedSound(winSound);
        const isZimo = loserIdx === null;
        
        let finalHand = players[winnerIdx].hand;
        if (!isZimo && pendingAction && pendingAction.tile) {
            finalHand = [...finalHand, pendingAction.tile];
        }

        let baseTai = 0;
        let details = [];
        const melds = players[winnerIdx].melds;
        const allTiles = [...finalHand, ...melds.flatMap(m => m.tiles)];
        
        const counts = {};
        allTiles.forEach(t => counts[t.type + t.val] = (counts[t.type + t.val] || 0) + 1);

        const isMenQing = melds.every(m => m.type === 'ankong');
        if (isMenQing && isZimo) { baseTai += 3; details.push("門清一摸三 (3台)"); } 
        else {
            if (isMenQing) { baseTai += 1; details.push("門清 (1台)"); }
            if (isZimo) { baseTai += 1; details.push("自摸 (1台)"); }
        }
        if (finalHand.length === 2 && !isZimo) { baseTai += 2; details.push("全求人 (2台)"); }

        let pairCount = 0;
        let isPongPong = true;
        for (let k in counts) {
            if (counts[k] === 2) pairCount++;
            else if (counts[k] >= 3) {  }
            else { isPongPong = false; break; }
        }
        if (isPongPong && pairCount === 1 && !melds.some(m => m.type === 'chow')) {
            baseTai += 4; details.push("碰碰胡 (4台)");
        }

        let dragons = 0, dragonPairs = 0;
        ['Z5', 'Z6', 'Z7'].forEach(k => { if (counts[k] >= 3) dragons++; else if (counts[k] === 2) dragonPairs++; });
        if (dragons === 3) { baseTai += 8; details.push("大三元 (8台)"); }
        else if (dragons === 2 && dragonPairs === 1) { baseTai += 4; details.push("小三元 (4台)"); }
        else if (dragons > 0) { baseTai += dragons; details.push(`三元牌 (${dragons}台)`); }

        let winds = 0, windPairs = 0;
        ['Z1', 'Z2', 'Z3', 'Z4'].forEach(k => { if (counts[k] >= 3) winds++; else if (counts[k] === 2) windPairs++; });
        if (winds === 4) { baseTai += 16; details.push("大四喜 (16台)"); }
        else if (winds === 3 && windPairs === 1) { baseTai += 8; details.push("小四喜 (8台)"); }

        const suitCount = [allTiles.some(t=>t.type==='W'), allTiles.some(t=>t.type==='T'), allTiles.some(t=>t.type==='S')].filter(Boolean).length;
        const hasZ = allTiles.some(t=>t.type==='Z');
        if (suitCount === 0 && hasZ) { baseTai += 16; details.push("字一色 (16台)"); } 
        else if (suitCount === 1 && hasZ) { baseTai += 4; details.push("混一色 (4台)"); } 
        else if (suitCount === 1 && !hasZ) { baseTai += 8; details.push("清一色 (8台)"); }

        const base = roomSettings.baseBet || 50;
        const taiBet = roomSettings.taiBet || 20;
        let totalPrize = 0;
        
        const results = players.map((p, idx) => {
            if (idx === winnerIdx) return { ...p, penalty: 0 };
            let penalty = 0;
            
            if (isZimo || idx === loserIdx) {
                let pTai = baseTai;
                if (winnerIdx === gameContext.dealer || idx === gameContext.dealer) pTai += 1; 
                
                penalty = base + (pTai * taiBet); 
                totalPrize += penalty;
            }
            return { ...p, penalty };
        });

        results[winnerIdx].prize = totalPrize;

        let newContext = { ...gameContext };
        let isDealerWin = (winnerIdx === newContext.dealer);
        
        if (isDealerWin) {
            newContext.consecutive += 1; 
        } else {
            newContext.dealer = (newContext.dealer + 1) % 4; 
            newContext.consecutive = 0;
            newContext.round += 1;
            if (newContext.round > 3) {
                newContext.round = 0;
                newContext.wind = (newContext.wind + 1) % 4;
            }
        }
        newContext.totalHands += 1;

        newContext.scores = newContext.scores.map((score, i) => {
            if (i === winnerIdx) return score + totalPrize;
            return score - results[i].penalty;
        });

        if (winnerIdx === gameContext.dealer || loserIdx === gameContext.dealer) {
            const dTai = 1 + gameContext.consecutive * 2;
            details.push(`莊家連${gameContext.consecutive} (${dTai}台)`);
        }

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

        setAutoReadyTimer(60); 

        const winAnimData = { 
            winnerIdx, 
            name: players[winnerIdx].name, 
            hand: finalHand,
            isZimo,
            loserName: !isZimo && loserIdx !== null ? players[loserIdx].name : null 
        };

        const batch = window.db.batch();
        const fb = typeof firebase !== 'undefined' ? firebase : window.firebase;
        const increment = fb.firestore.FieldValue.increment;
        let hasMoneyChange = false;

        results.forEach((r, i) => {
            const uid = players[i].id;
            if (!uid.startsWith('ai_')) {
                const ref = window.db.collection('users').doc(uid);
                const amount = i === winnerIdx ? r.prize : -r.penalty;
                if (amount !== 0) {
                    batch.set(ref, { 
                        coins: increment(amount), 
                        mcData: { diamonds: increment(amount) } 
                    }, { merge: true });
                    hasMoneyChange = true;
                }
            }
        });

        if (roomCode) {
            const roomRef = window.db.collection("mjRooms").doc(roomCode);
            batch.update(roomRef, { 
                winAnimation: winAnimData,
                pendingAction: null 
            });
            
            await batch.commit().catch(e => console.error("連線結算失敗", e));

            setTimeout(() => {
                window.db.collection("mjRooms").doc(roomCode).update({ ...updateData, winAnimation: null });
            }, 4000);
        } else {
            if (hasMoneyChange) {
                await batch.commit().catch(e => console.error("單機結算失敗", e));
            }
            
            setPendingAction(null);
            setWinAnimation(winAnimData);
            setTimeout(() => {
                setWinAnimation(null);
                setPlayers(resetPlayersForSummary);
                setSummaryData(updateData);
                setGameContext(newContext); 
                setGameState('summary');
            }, 4000);
        }
    };

    const handleDrawGame = () => {
        let newContext = { ...gameContext };
        newContext.consecutive += 1; 
        newContext.totalHands += 1;

        const resetPlayersForSummary = players.map(p => ({ ...p, isReady: false, isMe: false }));
        setAutoReadyTimer(60); 

        const updateData = {
            status: 'summary',
            winner: '流局',
            results: players.map(p => ({ ...p, penalty: 0, prize: 0 })),
            gameContext: newContext,
            dealerIdx: gameContext.dealer,
            players: resetPlayersForSummary
        };
        if (roomCode) {
            window.db.collection("mjRooms").doc(roomCode).update(updateData);
        } else {
            setPlayers(resetPlayersForSummary);
            setGameContext(newContext); 
        }
        
        setSummaryData(updateData);
        setGameState('summary');
    };

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
                        if ((gameState === 'lobby' || gameState === 'summary') && data.status === 'playing') setGameState('playing');
                        
                        const syncedPlayers = (data.players || []).map(p => ({ ...p, isMe: p.id === user.uid }));
                        setPlayers(syncedPlayers);
                        setIsSpectator(!syncedPlayers.some(p => p.isMe));
                        
                        const myPlayer = syncedPlayers.find(p => p.isMe);
                        if (myPlayer && data.status !== 'summary') {
                            updateMyHandSmartly(myPlayer.hand); 
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

    useEffect(() => {
        const myPlayer = players.find(p => p.id === user?.uid);
        if (gameState === 'playing' && myPlayer && myPlayer.id === players[currentTurn]?.id && !pendingAction && !myPlayer.isTing) {
            setTingOptions(checkTingOptions(myHand));
        } else {
            setTingOptions(null);
        }
    }, [myHand, currentTurn, gameState, pendingAction, players, user?.uid]);

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

    useEffect(() => {
        if (gameState === 'summary') {
            const isGameOver = checkIsGameOver();
            
            if (!isGameOver && autoReadyTimer > 0) {
                const timer = setTimeout(() => setAutoReadyTimer(prev => prev - 1), 1000);
                return () => clearTimeout(timer);
            } else if (!isGameOver && autoReadyTimer === 0) {
                const myPlayer = players.find(p => p.id === user.uid);
                if (myPlayer && !myPlayer.isReady) {
                    const newPlayers = players.map(p => p.id === user.uid ? { ...p, isReady: true, isMe: false } : { ...p, isMe: false });
                    if (roomCode) window.db.collection("mjRooms").doc(roomCode).update({ players: newPlayers });
                    else setPlayers(players.map(p => p.id === user.uid ? { ...p, isReady: true } : p));
                }
            }

            if ((!roomCode || isHost) && !isGameOver && players.length > 0) {
                const allReady = players.every(p => p.isReady || p.id.startsWith('ai_') || p.isDisconnected);
                if (allReady) {
                    startGameFromLobby(players);
                }
            }
        }
    }, [gameState, autoReadyTimer, players, roomCode, isHost]);

    useEffect(() => {
        if (gameState !== 'playing' || pendingAction || winAnimation) return; 
        
        setTimeLeft(roomSettings.turnTime || 20); 
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
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

    useEffect(() => {
        if (gameState !== 'playing' || winAnimation) return; 

        if (pendingAction) {
            let aiHandled = false;
            let timeoutId;
            let autoHuTimeout; 
            
            const myIdx = players.findIndex(p => p.id === user?.uid);
            const myPlayer = players[myIdx];
            if (myPlayer?.isTing && pendingAction.interceptors?.includes(myIdx)) {
                if (checkHu([...myPlayer.hand, pendingAction.tile])) {
                    autoHuTimeout = setTimeout(() => handleIntercept('hu', null, myIdx), 800);
                }
            }

            if (!roomCode || isHost) {
                const aiPlayers = players.filter(p => p.id.startsWith('ai_') && players.findIndex(x=>x.id===p.id) !== pendingAction.from);
                const t = pendingAction.tile;
                
                for (let ai of aiPlayers) {
                    if (aiHandled) break;
                    const aiIdx = players.findIndex(p => p.id === ai.id);
                    if (checkHu([...ai.hand, t])) {
                        aiHandled = true; timeoutId = setTimeout(() => handleIntercept('hu', null, aiIdx), 1000); break;
                    }
                }

                if (!aiHandled) {
                    for (let ai of aiPlayers) {
                        if (aiHandled) break;
                        const aiIdx = players.findIndex(p => p.id === ai.id);
                        const matching = ai.hand.filter(ht => ht.type === t.type && ht.val === t.val);
                        if (matching.length >= 2) {
                            const humanCanHu = players.some((p, i) => !p.id.startsWith('ai_') && i !== pendingAction.from && checkHu([...p.hand, t]));
                            if (!humanCanHu) {
                                const baseScore = getHandScore(ai.hand);
                                const handAfterPong = ai.hand.filter(ht => ht.id !== matching[0].id && ht.id !== matching[1].id);
                                const newScore = getHandScore(handAfterPong) + 10;
                                // 🌟 核心防護：只有當碰牌能讓牌型總分增加時，才去碰！絕不破壞既有牌型！
                                if (newScore >= baseScore) {
                                    aiHandled = true; timeoutId = setTimeout(() => handleIntercept('pong', null, aiIdx), 800); break;
                                }
                            }
                        }
                    }
                }

                if (!aiHandled) {
                    for (let ai of aiPlayers) {
                        if (aiHandled) break;
                        const aiIdx = players.findIndex(p => p.id === ai.id);
                        if (pendingAction.from === (aiIdx + 3) % 4 && t.type !== 'Z') {
                            const humanCanHuOrPong = players.some((p, i) => !p.id.startsWith('ai_') && i !== pendingAction.from && (
                                checkHu([...p.hand, t]) || p.hand.filter(ht => ht.type === t.type && ht.val === t.val).length >= 2
                            ));
                            if (!humanCanHuOrPong) {
                                const typeHand = ai.hand.filter(ht => ht.type === t.type);
                                const getT = v => typeHand.find(ht => ht.val === v);
                                let chowOptions = [];
                                const tM2 = getT(t.val-2), tM1 = getT(t.val-1), tP1 = getT(t.val+1), tP2 = getT(t.val+2);
                                if (tM2 && tM1) chowOptions.push([tM2, tM1]);
                                if (tM1 && tP1) chowOptions.push([tM1, tP1]);
                                if (tP1 && tP2) chowOptions.push([tP1, tP2]);

                                let bestChow = null;
                                let bestScore = -1;
                                const baseScore = getHandScore(ai.hand);

                                for (let opt of chowOptions) {
                                    const handAfterChow = ai.hand.filter(ht => ht.id !== opt[0].id && ht.id !== opt[1].id);
                                    const newScore = getHandScore(handAfterChow) + 10; // 成功吃牌後，外部搭子直接算一組完成的刻順 (加10分)
                                    // 🌟 核心防護：吃牌的總價值必須大於原手牌 (也就是不准拆掉已經完整的順子去吃牌)
                                    if (newScore > baseScore && newScore > bestScore) {
                                        bestScore = newScore;
                                        bestChow = opt;
                                    }
                                }

                                if (bestChow) {
                                    aiHandled = true; timeoutId = setTimeout(() => handleIntercept('chow', bestChow, aiIdx), 1200); break;
                                }
                            }
                        }
                    }}}
                

            const interval = setInterval(() => {
                const left = Math.max(0, pendingAction.expires - Date.now());
                setActionTimer(Math.floor(left / 1000));
                
                if (!aiHandled && (!roomCode || isHost)) {
                    const humanCanAct = pendingAction.interceptors?.some(idx => !players[idx].id.startsWith('ai_') && !players[idx].isDisconnected);
                    if (!humanCanAct && left < 19000) { 
                        clearInterval(interval);
                        proceedNextTurnAfterPass();
                        return;
                    }
                }

                if (left === 0) {
                    clearInterval(interval);
                    if (!aiHandled && (!roomCode || isHost)) proceedNextTurnAfterPass();
                }
            }, 1000);

            return () => { clearInterval(interval); clearTimeout(timeoutId); clearTimeout(autoHuTimeout); };
        }

        const cp = players[currentTurn];
        if (!cp || (!cp.id.startsWith('ai_') && !cp.isDisconnected)) return;
        if (roomCode && !isHost) return; 

        const timer = setTimeout(() => {
            if (checkHu(cp.hand)) {
                handleWin(currentTurn, null);
                return;
            }
            
            // ✨ 阿爾法狗 (AlphaGo) 級 AI 算牌邏輯：全域牌型價值最大化
            let bestDiscard = cp.hand[cp.hand.length - 1];
            let maxScore = -1;
            let candidates = [];

            // 模擬丟出每一張牌，計算剩下牌的價值
            cp.hand.forEach(t => {
                const remaining = cp.hand.filter(ht => ht.id !== t.id);
                const score = getHandScore(remaining);
                if (score > maxScore) {
                    maxScore = score;
                    candidates = [t];
                } else if (score === maxScore) {
                    // 若分數相同，加入候選名單
                    if (!candidates.find(c => c.type === t.type && c.val === t.val)) {
                        candidates.push(t);
                    }
                }
            });

            if (candidates.length > 0) {
                // 🌟 Tie-breaker 決策樹：價值相同時，優先丟出「最沒用的孤張」
                // 順序：1.字牌 2. 一九牌 3. 二八牌 4. 其他中洞
                candidates.sort((a, b) => {
                    const getDangerLevel = (tile) => {
                        if (tile.type === 'Z') return 0;
                        if (tile.val === 1 || tile.val === 9) return 1;
                        if (tile.val === 2 || tile.val === 8) return 2;
                        return 3;
                    };
                    return getDangerLevel(a) - getDangerLevel(b);
                });
                bestDiscard = candidates[0];
            }

            const newHand = cp.hand.filter(t => t.id !== bestDiscard.id);
            executeDiscard(currentTurn, bestDiscard, newHand);
            playCachedSound(tileSound);
        }, 800); // 思考時間短，且招招致命

        return () => clearTimeout(timer);
    }, [gameState, currentTurn, pendingAction, players, roomCode, isHost]);

    const myIdx = players.findIndex(p => p.id === user?.uid);
    let canHu = false;
    let canPong = false;
    let canKong = false;
    let chowOptions = [];
    let highlightIds = [];
    let selfKongOptions = [];

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
        if (matchingTiles.length >= 2 && !players[myIdx]?.isTing) {
            canPong = true;
            highlightIds.push(matchingTiles[0].id, matchingTiles[1].id);
        }
        if (matchingTiles.length >= 3 && !players[myIdx]?.isTing) {
            canKong = true;
            highlightIds.push(matchingTiles[2].id);
        }

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

    // ✨ SVG 最終渲染器：尺寸適中，並將所有圖案交給 SVG 負責，保證「絕對不溢出」
    const TileBlock = ({ tile, mini = false, isHighlighted = false, selected = false, onClick = undefined }) => {
        if (!tile) return null;

        const faceColor = 'bg-[#f4ebd0]'; 
        const backColor = 'bg-[#2d2d2d]'; 
        const borderColor = 'border-[#111111]';

        const baseClasses = `relative select-none transition-all duration-300 rounded-sm ${isHighlighted ? 'ring-4 ring-amber-400 scale-105 shadow-2xl z-20' : ''} ${selected ? 'scale-110 -translate-y-3 shadow-2xl z-30 ring-2 ring-emerald-400' : ''} ${onClick ? 'cursor-pointer' : ''}`;

        return (
            <div className={`${baseClasses} ${mini ? 'w-6 h-9 sm:w-8 sm:h-[46px]' : 'w-8 h-12 sm:w-11 sm:h-[60px]'} group relative`} onClick={onClick}>
                <div className={`absolute top-[3px] left-[3px] sm:top-[4px] sm:left-[4px] w-full h-full ${tile.isBack ? backColor : 'bg-[#d4c3a3]'} rounded-sm border-2 ${borderColor} shadow-md z-0`}></div>
                <div className={`absolute top-0 left-0 w-full h-full ${tile.isBack ? backColor : faceColor} rounded-sm border-2 ${borderColor} shadow-[inset_1px_1px_2px_rgba(255,255,255,0.7),_inset_-1px_-1px_3px_rgba(0,0,0,0.2)] z-10 flex items-center justify-center overflow-hidden p-0.5 sm:p-1`}>
                    {!tile.isBack && <SvgMahjongFace type={tile.type} val={tile.val} symbol={tile.symbol} />}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#111111] bg-opacity-95 flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in font-mono">
            <div className="w-full max-w-6xl flex justify-between items-center mb-2">
                <h1 className="text-2xl font-black text-[#ffaa00] tracking-wide drop-shadow-md flex items-center">
                    <span className="material-symbols-outlined mr-2 text-[#55ff55]">grid_view</span> 
                    史蒂夫麻將 (16張)
                </h1>
                <button onClick={quitAndLeaveRoom} className="bg-[#555555] hover:bg-[#ff5555] text-[#e0e0e0] hover:text-white border-4 border-[#777777] border-r-[#222222] border-b-[#222222] active:border-t-[#222222] active:border-l-[#222222] active:border-r-[#777777] active:border-b-[#777777] px-3 py-1 font-bold flex items-center">
                    <span className="material-symbols-outlined mr-1 text-sm">close</span> 關閉
                </button>
            </div>

            <div className="bg-[#3c3c3c] border-4 border-[#555555] border-r-[#111111] border-b-[#111111] w-full max-w-6xl shadow-2xl flex flex-col flex-grow relative overflow-hidden">
                
                {gameState === 'menu' && (
                    <div className="flex flex-col items-center justify-center flex-grow space-y-4 bg-[#1e1e1e] shadow-inner">
                        <span className="text-8xl drop-shadow-md mb-4 leading-none">🀄</span>
                        <button onClick={() => { playCachedSound(clickSound); startSinglePlayer(); }} className="w-64 py-3 flex justify-center items-center bg-[#555555] hover:bg-[#666666] text-[#e0e0e0] border-4 border-[#777777] border-r-[#222222] border-b-[#222222] active:border-t-[#222222] active:border-l-[#222222] active:border-r-[#777777] active:border-b-[#777777] text-xl font-black shadow-lg">
                            <span className="material-symbols-outlined mr-2">computer</span> 單人訓練 (打 AI)
                        </button>
                        <button onClick={() => { playCachedSound(clickSound); setGameState('multiplayer_setup'); }} className="w-64 py-3 flex justify-center items-center bg-[#2d2d2d] hover:bg-[#4a4a4a] text-[#55ff55] border-4 border-[#555555] border-r-[#111111] border-b-[#111111] active:border-t-[#111111] active:border-l-[#111111] active:border-r-[#555555] active:border-b-[#555555] text-xl font-black shadow-lg">
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
                            <input type="text" maxLength={6} placeholder="輸入 6 位代碼" className="w-full text-center text-3xl font-black py-4 bg-[#1e1e1e] text-[#e0e0e0] placeholder-[#777777] border-4 border-[#555555] focus:border-[#55ff55] tracking-widest outline-none shadow-inner mb-4 transition-colors" value={roomJoinCode} onChange={(e) => setRoomJoinCode(e.target.value.replace(/\D/g, ''))} />
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
                    <div className="flex flex-col flex-grow relative bg-[#1e1e1e] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#2d2d2d] to-[#111111] overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.9)]">
                        {/* ✨ 增加一點暗色網格紋理，提升質感 */}
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdHRlcm4gaWQ9InNtYWxsR3JpZCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMTAgMEwwIDBMMCAxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSJ1cmwoI3NtYWxsR3JpZCkiLz48cGF0aCBkPSJNNDAgMEwwIDBMMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50 pointer-events-none z-0"></div>
                        
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
                                    
                                    return (
                                        <div className={`flex ${pos === 'top' ? 'flex-col' : pos === 'left' ? 'flex-row' : 'flex-row-reverse'} items-center gap-2 pointer-events-auto`}>
                                            <div className={`flex flex-col items-center bg-stone-800/95 p-2 border-2 ${isTurn ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.8)] scale-110 animate-pulse' : 'border-stone-600'} rounded-lg transition-all duration-300`}>
                                                <div className="w-8 h-8 sm:w-12 sm:h-12 mb-1 border-2 border-stone-500 bg-stone-700 relative overflow-hidden">
                                                    {isTurn && <div className="absolute inset-0 bg-amber-400/30 animate-pulse z-10"></div>}
                                                    <img src={avatarImg} alt={p.name} className="w-full h-full object-cover pixelated" />
                                                    {p.isTing && <div className="absolute bottom-0 w-full bg-red-600 text-white text-[8px] sm:text-[10px] font-black text-center shadow-[0_0_10px_red]">聽牌</div>}
                                                </div>
                                                <span className="text-white text-[10px] sm:text-xs font-bold max-w-[80px] truncate">{p.name}</span>
                                                <div className="text-emerald-400 text-[10px] font-bold bg-black/50 px-2 rounded mt-1">剩 {p.hand.length} 張</div>
                                            </div>
                                            
                                            <div className={`flex ${pos === 'top' ? 'flex-row' : 'flex-col'} gap-0 items-center justify-center`}>
                                                {winAnimation?.winnerIdx === pIdx ? (
                                                    <div className={`flex ${pos === 'top' ? 'flex-row' : 'flex-col'} gap-0 animate-in zoom-in duration-500 shadow-[0_0_30px_rgba(251,191,36,0.8)] p-1.5 sm:p-2 rounded-lg bg-amber-500/20`}>
                                                        {winAnimation.hand.map((t, i) => (
                                                            <div key={i} className={`${pos !== 'top' ? '-my-1 sm:-my-1.5' : ''}`} style={{ transform: pos === 'left' ? 'rotate(90deg)' : pos === 'right' ? 'rotate(-90deg)' : 'none' }}>
                                                                <TileBlock tile={t} mini={true} isHighlighted={true} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    p.hand.map((_, i) => (
                                                        <div key={i} className={`bg-emerald-700 border border-stone-900 rounded-[2px] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.3)] ${pos === 'top' ? 'w-3 h-5 sm:w-4 sm:h-6 mx-[1px]' : 'w-5 h-3 sm:w-6 sm:h-4 my-[1px]'}`}></div>
                                                    ))
                                                )}
                                            </div>

                                            {p.melds && p.melds.length > 0 && (
                                                <div className={`flex ${pos === 'top' ? 'flex-row' : 'flex-col'} gap-1 bg-[#1e1e1e]/90 p-1 sm:p-1.5 rounded-lg border border-stone-600 shadow-2xl z-30`}>
                                                    {p.melds.map((m, i) => (
                                                        <div key={i} className={`flex ${pos === 'top' ? 'flex-row' : 'flex-col'} gap-0 bg-black/50 p-0.5 rounded border border-stone-700`}>
                                                            {m.tiles.map((t, j) => (
                                                                /* ✨ 完美計算旋轉後的實際佔位寬高 (手機 36x24px, 平板 46x32px)，保證無縫隙且絕對不重疊 */
                                                                <div key={j} className={`flex items-center justify-center ${pos !== 'top' ? 'w-9 h-6 sm:w-[46px] sm:h-8' : ''}`}>
                                                                    <div style={{ transform: pos === 'left' ? 'rotate(90deg)' : pos === 'right' ? 'rotate(-90deg)' : 'none' }}>
                                                                        <TileBlock tile={t} mini={true} isHidden={m.type === 'ankong' && (j === 1 || j === 2)} />
                                                                    </div>
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
                                        <div className="absolute left-1 sm:left-4 top-[40%] sm:top-[45%] -translate-y-1/2 z-10">{renderOpponent(leftIdx, 'left')}</div>
                                        <div className="absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 z-10">{renderOpponent(topIdx, 'top')}</div>
                                        <div className="absolute right-1 sm:right-4 top-[40%] sm:top-[45%] -translate-y-1/2 z-10">{renderOpponent(rightIdx, 'right')}</div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* ✨ 海底視覺化系統 (下移並縮減高度，完美避開對手門前牌) */}
                        <div className="absolute top-[46%] sm:top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] sm:w-[45%] max-w-lg h-[20vh] sm:h-[24vh] flex justify-center pointer-events-none z-10">
                            <div 
                                className="w-full h-full bg-[#1a1a1a]/95 border-4 border-[#333333] shadow-[inset_0_0_40px_rgba(0,0,0,1),_0_0_20px_rgba(0,0,0,0.5)] rounded-xl p-1.5 sm:p-3 overflow-y-auto custom-scrollbar flex flex-wrap content-start justify-center gap-0.5 sm:gap-1 pointer-events-auto"
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedIdx !== null && currentTurn === players.findIndex(p=>p.id===user.uid) && !pendingAction) {
                                        const tileToDiscard = myHand[draggedIdx];
                                        if (tileToDiscard) discardTile(tileToDiscard.id, false);
                                    }
                                    setDraggedIdx(null); setDragOverIdx(null);
                                }}
                            >
                                {(() => {
                                    const allDiscards = players.flatMap(p => p.discards).sort((a, b) => (a.dropTime || 0) - (b.dropTime || 0));
                                    return allDiscards.map((t, i) => {
                                        const isLatest = i === allDiscards.length - 1; 
                                        return (
                                            <div key={t.id + i} className={`relative ${isLatest ? 'animate-in zoom-in duration-200 shadow-[0_0_15px_rgba(251,191,36,0.8)] z-50' : 'z-10'}`}>
                                                {/* 海底的牌整體進一步縮小，塞下更多且不干擾視線 */}
                                                <div className="scale-75 sm:scale-[0.85] origin-top">
                                                    <TileBlock tile={t} mini={true} isHighlighted={isLatest && pendingAction} />
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        {/* 攔截動作浮動面板 (碰/胡/過) */}

                        {/* 攔截動作浮動面板 (碰/胡/過) */}
                        {pendingAction && myIdx !== -1 && pendingAction.from !== myIdx && !isSpectator && (
                            (canHu || canPong || canKong || chowOptions.length > 0) ? (
                               
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[250] flex gap-2 sm:gap-4 bg-[#1e1e1e]/95 p-4 sm:p-6 border-4 border-amber-500 shadow-[0_0_80px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200 flex-wrap justify-center items-center rounded-2xl w-[90%] sm:w-auto max-w-2xl backdrop-blur-sm">
                                    <div className="absolute -top-14 sm:-top-16 left-1/2 -translate-x-1/2 text-[#e0e0e0] font-bold bg-[#2d2d2d] border-2 border-amber-400 px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-lg flex items-center gap-2 whitespace-nowrap shadow-xl rounded-full">
                                        <img src={players[pendingAction.from].id.startsWith('ai_') ? AI_AVATARS[players[pendingAction.from].id] : (players[pendingAction.from].avatar || 'https://minotar.net/helm/Steve/64.png')} className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-stone-400 pixelated rounded-full" />
                                        <span className="text-amber-300 text-base sm:text-xl">{players[pendingAction.from].name}</span> 打出了
                                        <span className="scale-75 origin-center inline-block -mx-1 -my-4 pointer-events-none"><TileBlock tile={pendingAction.tile} /></span>
                                        <span className="text-red-400 ml-2 animate-pulse">({actionTimer}s)</span>
                                    </div>
                                    {canHu && <button onClick={() => handleIntercept('hu')} className="bg-gradient-to-b from-red-500 to-red-700 text-white px-6 py-3 sm:px-10 sm:py-5 font-black text-2xl sm:text-4xl rounded-2xl shadow-[0_8px_20px_rgba(220,38,38,0.6)] hover:scale-105 active:scale-95 transition-all border-y-4 border-red-300">胡</button>}
                                    {canKong && <button onClick={() => handleIntercept('kong')} className="bg-gradient-to-b from-purple-500 to-purple-700 text-white px-4 py-2 sm:px-8 sm:py-4 font-black text-xl sm:text-3xl rounded-2xl shadow-[0_8px_20px_rgba(147,51,234,0.6)] hover:scale-105 active:scale-95 transition-all border-y-4 border-purple-300">槓</button>}
                                    {canPong && <button onClick={() => handleIntercept('pong')} className="bg-gradient-to-b from-amber-500 to-amber-700 text-white px-4 py-2 sm:px-8 sm:py-4 font-black text-xl sm:text-3xl rounded-2xl shadow-[0_8px_20px_rgba(217,119,6,0.6)] hover:scale-105 active:scale-95 transition-all border-y-4 border-amber-300">碰</button>}
                                    {chowOptions.map((opt, i) => (
                                        <button key={i} onClick={() => handleIntercept('chow', opt.tiles)} className="bg-gradient-to-b from-emerald-500 to-emerald-700 text-white px-3 py-2 sm:px-6 sm:py-4 font-black text-xl sm:text-3xl rounded-2xl shadow-[0_8px_20px_rgba(5,150,105,0.6)] hover:scale-105 active:scale-95 transition-all border-y-4 border-emerald-300 flex items-center">
                                            吃
                                            <span className="flex gap-1 ml-2 sm:ml-3 pointer-events-none scale-75 origin-left">
                                                <TileBlock tile={opt.tiles[0]} mini={true} />
                                                <TileBlock tile={opt.tiles[1]} mini={true} />
                                            </span>
                                        </button>
                                    ))}
                                    <button onClick={() => handleIntercept('pass')} className="bg-gradient-to-b from-stone-500 to-stone-700 text-white px-6 py-3 sm:px-8 sm:py-4 font-black text-xl sm:text-3xl rounded-2xl shadow-[0_8px_20px_rgba(120,113,108,0.6)] hover:scale-105 active:scale-95 transition-all border-y-4 border-stone-300">過</button>
                                </div>
                            ) : (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] bg-[#1e1e1e]/90 text-amber-400 px-6 py-3 font-black border-2 border-amber-500/50 rounded-full shadow-2xl animate-pulse backdrop-blur-sm whitespace-nowrap">
                                    等待其他玩家反應... ({actionTimer}s)
                                </div>
                            )
                        )}

                        {/* 自己手牌區 (底部) - 確保高 Z-index 且文字符合深色主題 */}
                        <div className={`absolute bottom-0 w-full bg-[#1e1e1e] border-t-4 transition-all duration-300 p-1 sm:p-2 z-[100] ${players[currentTurn]?.id === user?.uid && !pendingAction ? 'border-t-amber-500 shadow-[0_-15px_40px_rgba(245,158,11,0.3)]' : 'border-t-[#3c3c3c]'}`}>
                            <div className="flex justify-between items-end mb-2 px-2">
                                <div className="text-[#e0e0e0] font-black flex items-center">
                                    <span className="material-symbols-outlined mr-1">person</span> {userProfile?.displayName}
                                    {players[currentTurn]?.id === user?.uid && !pendingAction && (
                                        <span className="ml-4 bg-amber-500 text-white px-2 py-1 text-xs animate-pulse shadow-md border border-stone-800">請打出一張牌</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    
                                    <button 
                                        onClick={() => { 
                                            playCachedSound(sortSound); 
                                            setMyHand(sortHand([...myHand])); 
                                        }} 
                                        className="bg-stone-600 hover:bg-stone-500 text-white font-black px-4 py-1 border-2 border-stone-400 shadow-md transition-transform active:scale-95"
                                    >
                                        整理
                                    </button>

                                    {selfKongOptions.map((opt, i) => (
                                        <button key={`kong-${i}`} onClick={() => handleSelfKong(opt)} className="bg-purple-600 hover:bg-purple-500 text-white font-black px-4 py-1 border-2 border-purple-300 shadow-md animate-pulse">
                                            {opt.type === 'ankong' ? '暗槓' : '加槓'}
                                        </button>
                                    ))}

                                    {players[currentTurn]?.id === user?.uid && checkHu(myHand) && (
                                        <button onClick={() => handleWin(currentTurn, null)} className="bg-red-600 hover:bg-red-500 text-white font-black px-4 py-1 border-2 border-red-300 shadow-md animate-bounce">自摸！</button>
                                    )}
                                    
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
                            
                            {tingOptions && !players[myIdx]?.isTing && (
                                <div className="absolute -top-24 left-1/2 -translate-x-1/2 bg-stone-900/95 border-4 border-amber-400 px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.6)] flex flex-col items-center gap-2 z-50 animate-in slide-in-from-bottom-4 pointer-events-none whitespace-nowrap w-max">
                                    <span className="text-amber-400 font-black text-lg tracking-widest animate-pulse">✨ 你有牌可以聽了！ ✨</span>
                                    {selectedTile && tingOptions[selectedTile] ? (
                                        <div className="flex gap-2 items-center">
                                            <span className="text-white font-bold">打出此牌聽：</span>
                                            {tingOptions[selectedTile].map((t, i) => (
                                                <div key={i} className="pointer-events-none">
                                                    <TileBlock tile={t} mini={true} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-stone-300 font-bold text-sm">請點擊發光的牌查看能聽什麼</span>
                                    )}
                                </div>
                            )}
                            
                            {players[myIdx]?.isTing && (
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-red-600 border-2 border-white px-6 py-2 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.8)] text-white font-black animate-pulse z-50 flex items-center gap-2 whitespace-nowrap pointer-events-none">
                                    <span className="material-symbols-outlined">bolt</span> 聽牌狀態 (自動摸打)
                                </div>
                            )}

                            {players.find(p=>p.id===user.uid)?.melds.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-1 sm:mb-2 px-2">
                                    {players.find(p=>p.id===user.uid).melds.map((m, i) => (
                                        <div key={i} className="flex gap-0.5 bg-stone-500/50 p-1 rounded border border-stone-600 shadow-inner">
                                            {/* ✨ 強制使用 mini 版，讓門前的牌精緻且不佔空間 */}
                                            {m.tiles.map((t, j) => <TileBlock key={j} tile={t} mini={true} isHidden={m.type === 'ankong' && (j === 1 || j === 2)} />)}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 手牌區加入了 overflow-x-auto 與 shrink-0 確保在狹窄的手機螢幕上也能正常顯示 */}
                            <div className={`flex justify-start sm:justify-center gap-0.5 sm:gap-1 px-2 h-20 sm:h-24 items-end w-full overflow-x-auto custom-scrollbar pb-1 ${winAnimation?.winnerIdx === myIdx ? 'animate-in zoom-in duration-500 shadow-[0_-20px_50px_rgba(251,191,36,0.5)] bg-amber-500/20 rounded-t-3xl pt-4' : ''}`}>
                                {myHand.map((tile, index) => {
                                    const isDrawnTile = currentTurn === players.findIndex(p=>p.id===user.uid) && index === myHand.length - 1;
                                    const isDragging = draggedIdx === index;
                                    const isDragOverLeft = dragOverIdx === index && draggedIdx > index;
                                    const isDragOverRight = dragOverIdx === index && draggedIdx < index;

                                    return (
                                        <div 
                                            key={tile.id} 
                                            draggable={!players[myIdx]?.isTing} 
                                            className={`shrink-0 transition-all duration-200 cursor-pointer hover:-translate-y-2 ${isDrawnTile ? 'ml-2 sm:ml-4' : ''} ${isDragging ? 'opacity-30 scale-75 -translate-y-4' : ''} ${isDragOverLeft ? 'border-l-[8px] border-l-amber-500 rounded-l-lg pl-1' : ''} ${isDragOverRight ? 'border-r-[8px] border-r-amber-500 rounded-r-lg pr-1' : ''}`}
                                            onDragStart={(e) => { if(players[myIdx]?.isTing) { e.preventDefault(); return; } setDraggedIdx(index); e.dataTransfer.effectAllowed = 'move'; }}
                                            onDragOver={(e) => { 
                                                e.preventDefault(); 
                                                if (draggedIdx !== null && draggedIdx !== index) {
                                                    if (dragOverIdx !== index) {
                                                        playQuietSound(clickSound); 
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
                                                
                                                newHand.splice(index, 0, draggedTile);
                                                
                                                setMyHand(newHand);
                                                setDraggedIdx(null);
                                                setDragOverIdx(null);
                                            }}                                            
                                            onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); }}
                                            onPointerUp={(e) => {
                                                if (draggedIdx !== null) return; 
                                                playCachedSound(clickSound);
                                                if (selectedTile === tile.id && players[currentTurn]?.id === user?.uid && !pendingAction) {
                                                    discardTile(tile.id);
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
                                                    isHighlighted={highlightIds.includes(tile.id) || (tingOptions && tingOptions[tile.id] && !players[myIdx]?.isTing)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
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
                                        if(!chatText.trim()) return; 
                                        if (roomCode) {
                                            const roomRef = window.db.collection("mjRooms").doc(roomCode);
                                            roomRef.get().then(snap => {
                                                const d = snap.data();
                                                roomRef.update({ chats: [...(d.chats || []), { senderId: user?.uid, senderName: userProfile?.displayName, text: chatText.trim(), time: Date.now() }] });
                                            });
                                        }
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
                                {summaryData.results.map((p, i) => {
                                    const isWinner = p.name === summaryData.winner;
                                    return (
                                        <div key={i} className={`p-3 sm:p-4 border-2 flex flex-col xl:flex-row justify-between items-center gap-4 ${isWinner ? 'bg-amber-900/40 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]' : 'bg-stone-800/80 border-stone-600'}`}>
                                            <div className="flex flex-col items-center xl:items-start w-full xl:w-1/4 shrink-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`font-black text-lg sm:text-xl ${isWinner ? 'text-amber-400 animate-pulse' : 'text-white'}`}>{p.name}</span>
                                                    {summaryData.dealerIdx === i && (
                                                        <span className="bg-amber-600 text-white text-xs font-black px-2 py-0.5 rounded border border-amber-300 shadow-sm">莊家</span>
                                                    )}
                                                    {isWinner && summaryData.huTile && (
                                                        <span className="flex items-center gap-1 bg-red-900/60 text-red-200 border border-red-500 px-2 py-0.5 rounded text-sm font-bold shadow-[0_0_10px_red]">
                                                            胡 <span className="pointer-events-none scale-75 origin-left"><TileBlock tile={summaryData.huTile} mini={true} /></span>
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

                                            <div className={`flex flex-wrap items-center justify-center xl:justify-start gap-1 sm:gap-2 w-full xl:w-3/4 ${isWinner ? 'animate-in zoom-in slide-in-from-top-10 duration-700' : ''}`}>
                                                {p.melds && p.melds.length > 0 && (
                                                    <div className="flex gap-1 sm:gap-2 border-r-2 border-stone-500 pr-1 sm:pr-2 mr-1">
                                                        {p.melds.map((m, mIdx) => (
                                                            <div key={mIdx} className="flex gap-0.5 bg-black/30 p-1 rounded border border-stone-600">
                                                                {m.tiles.map((t, tIdx) => <TileBlock key={tIdx} tile={t} mini={true} isHidden={m.type === 'ankong' && (tIdx === 1 || tIdx === 2)} />)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                <div className="flex gap-0.5 sm:gap-1 flex-wrap items-center">
                                                    {p.hand && p.hand.length > 0 ? (
                                                        p.hand.map((t, tIdx) => (
                                                            <TileBlock key={tIdx} tile={t} mini={true} /> 
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
                                                    setAutoReadyTimer(0); 
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