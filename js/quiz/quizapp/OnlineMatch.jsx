// OnlineMatch.jsx
const { useState, useEffect, useRef, useMemo } = React;

window.OnlineMatch = function OnlineMatch({ user, userProfile, targetQuiz, roomId, onClose, showAlert, showConfirm }) {
    const [room, setRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isHost, setIsHost] = useState(false);
    
    const messagesEndRef = useRef(null);
    const [quizData, setQuizData] = useState(null);

    const keyArray = useMemo(() => {
        if (!quizData) return [];
        if (quizData.questions && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
            return quizData.questions.map(q => {
                const ans = q.ans || q.answer || q.correctAnswer || q.correctAnswersInput || '';
                return typeof ans === 'string' ? ans.replace(/[^a-dA-DZz]/g, '') : '';
            });
        }
        const cleanKey = (quizData.correctAnswersInput || '').replace(/[^a-dA-DZz,]/g, '');
        return cleanKey.includes(',') ? cleanKey.split(',') : (cleanKey.match(/[A-DZ]|[a-dz]+/g) || []);
    }, [quizData]);

    useEffect(() => {
        let currentRoomId = roomId;

        const initRoom = async () => {
            if (!currentRoomId && targetQuiz) {
                currentRoomId = Math.floor(100000 + Math.random() * 900000).toString();
                const newRoomRef = window.db.collection('quizRooms').doc(currentRoomId);
                setIsHost(true);
                
                let fullQuiz = { ...targetQuiz };
                if (targetQuiz.hasSeparatedContent) {
                    const contentDoc = await window.db.collection('users').doc(user.uid).collection('quizContents').doc(targetQuiz.id).get();
                    if (contentDoc.exists) {
                        const cData = contentDoc.data();
                        fullQuiz.questionText = window.safeDecompress(cData.questionText, 'string');
                        fullQuiz.questionHtml = window.safeDecompress(cData.questionHtml, 'string');
                        fullQuiz.explanationHtml = window.safeDecompress(cData.explanationHtml, 'string');
                        
                        if (cData.questions) {
                            fullQuiz.questions = typeof cData.questions === 'string' ? (window.safeDecompress ? window.safeDecompress(cData.questions, 'object') : JSON.parse(cData.questions)) : cData.questions;
                        }
                    }
                }
                setQuizData(fullQuiz);

                await newRoomRef.set({
                    id: currentRoomId,
                    hostId: user.uid,
                    hostName: userProfile.displayName,
                    hostAvatar: userProfile.avatar || null,
                    guestId: null,
                    guestName: null,
                    guestAvatar: null,
                    quizId: targetQuiz.id,
                    quizName: targetQuiz.testName,
                    quizDataRaw: window.jzCompress ? window.jzCompress(JSON.stringify(fullQuiz)) : JSON.stringify(fullQuiz),
                    status: 'waiting', 
                    currentQ: 0, 
                    mode: 'versus',
                    players: [user.uid],
                    progress: {
                        [user.uid]: { score: 0, currentAnswer: '', answers: {}, crossedOut: [], readyToGrade: false }
                    },
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                    lastUpdatedAt: Date.now()
                });
            } else if (currentRoomId) {
                const roomDoc = await window.db.collection('quizRooms').doc(currentRoomId).get();
                if (roomDoc.exists) {
                    const rData = roomDoc.data();
                    setIsHost(rData.hostId === user.uid);
                    
                    try {
                        if (!rData.quizDataRaw) throw new Error("雲端缺乏試卷資料");

                        let parsedData = null;
                        const raw = rData.quizDataRaw;

                        if (typeof raw === 'object' && raw !== null) {
                            parsedData = raw; 
                        } else if (typeof raw === 'string') {
                            if (raw.startsWith('{') || raw.startsWith('[')) {
                                parsedData = JSON.parse(raw); 
                            } else {
                                const decompressed = window.safeDecompress ? window.safeDecompress(raw, 'string') : raw;
                                if (typeof decompressed === 'object' && decompressed !== null) {
                                    parsedData = decompressed; 
                                } else {
                                    parsedData = JSON.parse(decompressed); 
                                }
                            }
                        }

                        if (!parsedData || typeof parsedData !== 'object') throw new Error("試卷資料格式錯誤");

                        setQuizData(parsedData);
                        
                        if (rData.hostId !== user.uid && !rData.guestId) {
                            await window.db.collection('quizRooms').doc(currentRoomId).update({
                                guestId: user.uid,
                                guestName: userProfile.displayName,
                                guestAvatar: userProfile.avatar || null,
                                players: window.firebase.firestore.FieldValue.arrayUnion(user.uid),
                                [`progress.${user.uid}`]: { score: 0, currentAnswer: '', answers: {}, crossedOut: [], readyToGrade: false },
                                lastUpdatedAt: Date.now()
                            });
                        } else if (!rData.players.includes(user.uid)) {
                            // 重新加入(如果不小心被踢出)
                            await window.db.collection('quizRooms').doc(currentRoomId).update({
                                players: window.firebase.firestore.FieldValue.arrayUnion(user.uid)
                            });
                        }
                    } catch (err) {
                        console.error("解析房間資料失敗:", err);
                        showAlert("房間資料損毀，請房主重新建立房間！");
                        setTimeout(() => onClose(), 0); 
                    }
                } else {
                    showAlert("房間不存在或已過期");
                    setTimeout(() => onClose(), 0);
                }
            }
        };
        initRoom();

        if (currentRoomId) {
            const unsubRoom = window.db.collection('quizRooms').doc(currentRoomId).onSnapshot(doc => {
                if (doc.exists) setRoom({ id: doc.id, ...doc.data() });
                else { showAlert("房間已被關閉！"); setTimeout(() => onClose(), 0); }
            });

            const unsubChat = window.db.collection('quizRooms').doc(currentRoomId).collection('messages')
                .orderBy('timestamp', 'asc').onSnapshot(snap => {
                    setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
                });

            return () => { unsubRoom(); unsubChat(); };
        }
    }, [roomId, targetQuiz]);

    // 自動保存成績紀錄
    useEffect(() => {
        if (room?.status === 'finished' && quizData && !room.progress[user.uid]?.saved) {
            const saveMatchResult = async () => {
                try {
                    const myProg = room.progress[user.uid];
                    let correctCount = 0;
                    const answersObj = myProg.answers || {};
                    const userAnswersArr = Array(quizData.numQuestions).fill('').map((_, i) => answersObj[i] || '');
                    
                    userAnswersArr.forEach((ans, idx) => {
                        const cAns = keyArray[idx] || '';
                        if (cAns.toLowerCase() === 'z' || cAns.toLowerCase() === 'abcd') correctCount++;
                        else if (cAns && ans) {
                            if (cAns === cAns.toUpperCase() ? (ans === cAns) : cAns.toLowerCase().includes(ans.toLowerCase())) correctCount++;
                        }
                    });

                    await window.db.collection('users').doc(user.uid).collection('quizzes').add({
                        testName: quizData.testName + (room.mode === 'versus' ? ' [線上對戰]' : ' [線上合作]'),
                        folder: '未分類',
                        numQuestions: quizData.numQuestions,
                        userAnswers: userAnswersArr,
                        correctAnswersInput: quizData.correctAnswersInput || '',
                        results: {
                            score: Math.round(myProg.score || 0),
                            total: quizData.numQuestions,
                            correctCount: correctCount
                        },
                        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    });

                    await window.db.collection('quizRooms').doc(room.id).update({
                        [`progress.${user.uid}.saved`]: true
                    });
                } catch (e) {
                    console.error("保存成績失敗", e);
                }
            };
            saveMatchResult();
        }
    }, [room?.status, quizData]);

    const sendMsg = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !room) return;
        await window.db.collection('quizRooms').doc(room.id).collection('messages').add({
            userId: user.uid, userName: userProfile.displayName, text: chatInput.trim(),
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        setChatInput('');
    };

    const inviteFriends = async () => {
        navigator.clipboard.writeText(room.id);
        showAlert(`邀請代碼「${room.id}」已複製！\n您可以到大廳貼給朋友。`);
    };

    const startGame = async () => {
        await window.db.collection('quizRooms').doc(room.id).update({ status: 'playing', currentQ: 0, lastUpdatedAt: Date.now() });
    };

    // ✨ 核心修復 1：主動退出邏輯，徹底阻絕懸浮視窗重現
    const handleActiveExit = () => {
        if (room?.status === 'finished') {
            onClose();
            return;
        }
        showConfirm("確定要退出房間嗎？\n退出後對手會收到通知，且您將無法再回到此局！", () => {
            if (room) {
                // 不使用 await，讓背景直接去執行，確保前端可以瞬間關閉畫面不卡頓
                window.db.collection('quizRooms').doc(room.id).collection('messages').add({
                    userId: 'system',
                    userName: '系統廣播',
                    text: `⚠️ ${userProfile.displayName} 已主動退出房間。`,
                    timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // 移除玩家，如果房主在等待期間退出，將狀態設為 closed，這樣懸浮視窗就不會抓到它
                window.db.collection('quizRooms').doc(room.id).update({
                    players: window.firebase.firestore.FieldValue.arrayRemove(user.uid),
                    status: (isHost && room.status === 'waiting') ? 'closed' : room.status
                });
            }
            onClose(); 
        });
    };

    const opponentId = room?.hostId === user.uid ? room?.guestId : room?.hostId;
    const opponentName = room?.hostId === user.uid ? room?.guestName : room?.hostName;
    const isOpponentPresent = opponentId && room?.players?.includes(opponentId);

    const myProg = room?.progress?.[user?.uid] || {};
    const oppProg = room?.progress?.[opponentId] || {};
    const myCurrentQ = myProg.currentQ !== undefined ? myProg.currentQ : (room?.currentQ || 0);
    const myStatus = myProg.status || room?.status || 'waiting';
    const oppCurrentQ = oppProg.currentQ !== undefined ? oppProg.currentQ : (room?.currentQ || 0);

    const selectAnswer = async (opt) => {
        if (myProg.readyToGrade) return;
        let currentAns = myProg.currentAnswer === opt ? '' : opt;
        await window.db.collection('quizRooms').doc(room.id).update({
            [`progress.${user.uid}.currentAnswer`]: currentAns,
            [`progress.${user.uid}.answers.${myCurrentQ}`]: currentAns
        });
    };

    const toggleCrossOut = async (opt) => {
        if (myProg.readyToGrade) return;
        let myCrossed = [...(myProg.crossedOut || [])];
        if (myCrossed.includes(opt)) myCrossed = myCrossed.filter(o => o !== opt);
        else myCrossed.push(opt);
        await window.db.collection('quizRooms').doc(room.id).update({
            [`progress.${user.uid}.crossedOut`]: myCrossed
        });
    };

    const lockAnswer = async () => {
        if (!myProg.currentAnswer) return showAlert("請先選擇一個答案！");
        
        const isOppReady = oppProg?.readyToGrade && (oppCurrentQ === myCurrentQ);

        let updates = { [`progress.${user.uid}.readyToGrade`]: true };
        
        if (!isOpponentPresent || isOppReady) {
            updates[`progress.${user.uid}.status`] = 'grading';
            if (isOpponentPresent && oppCurrentQ === myCurrentQ) {
                updates[`progress.${opponentId}.status`] = 'grading';
            }

            const myAns = myProg.currentAnswer;
            const cAns = keyArray[myCurrentQ] || '';
            
            const checkCorrect = (ans, key) => {
                if (!ans || !key) return false;
                if (key.toLowerCase() === 'z' || key.toLowerCase() === 'abcd') return true;
                return key === key.toUpperCase() ? (ans === key) : key.toLowerCase().includes(ans.toLowerCase());
            };

            const myCorrect = checkCorrect(myAns, cAns);
            const qScore = 100 / (quizData.numQuestions || 1);
            let myEarned = 0, oppEarned = 0;

            if (isOpponentPresent) {
                const oppAns = oppProg.currentAnswer;
                const oppCorrect = checkCorrect(oppAns, cAns);
                if (room.mode === 'coop') {
                    if (myCorrect && oppCorrect) { myEarned = qScore; oppEarned = qScore; }
                    else if (myCorrect || oppCorrect) { myEarned = qScore / 2; oppEarned = qScore / 2; }
                } else {
                    if (myCorrect) myEarned = qScore;
                    if (oppCorrect) oppEarned = qScore;
                }
                updates[`progress.${opponentId}.score`] = (oppProg.score || 0) + oppEarned;
            } else {
                if (myCorrect) myEarned = qScore;
            }

            updates[`progress.${user.uid}.score`] = (myProg.score || 0) + myEarned;
        }

        await window.db.collection('quizRooms').doc(room.id).update(updates);
    };

    const nextQuestion = async () => {
        let updates = {};
        if (myCurrentQ + 1 >= quizData.numQuestions) {
            updates[`progress.${user.uid}.status`] = 'finished';
        } else {
            updates[`progress.${user.uid}.status`] = 'playing';
            updates[`progress.${user.uid}.currentQ`] = myCurrentQ + 1;
            updates[`progress.${user.uid}.readyToGrade`] = false;
            updates[`progress.${user.uid}.currentAnswer`] = '';
            updates[`progress.${user.uid}.crossedOut`] = [];
        }
        await window.db.collection('quizRooms').doc(room.id).update(updates);
    };

    if (!room || !quizData) return <div className="p-8 text-center text-white font-bold animate-pulse">連線載入中...</div>;

    const currentQHtml = (() => {
        if (quizData.questions && Array.isArray(quizData.questions) && quizData.questions[myCurrentQ]) {
            const q = quizData.questions[myCurrentQ];
            if (typeof q === 'string') return window.processQuestionContent ? window.processQuestionContent(q) : q;
            let raw = q.mainText || q.question || q.content || q.title || q.html || q.text || q.questionHtml || q.questionText || '題目內容讀取失敗 (空白)';
            return window.processQuestionContent ? window.processQuestionContent(raw) : raw;
        }
        return window.extractSpecificContent ? window.extractSpecificContent(quizData.questionHtml || quizData.questionText || '', myCurrentQ) : `無法解析題目，請確認試卷格式。`;
    })();

    const currentEHtml = (() => {
        if (quizData.questions && Array.isArray(quizData.questions) && quizData.questions[myCurrentQ]) {
            const q = quizData.questions[myCurrentQ];
            if (typeof q === 'string') return '<p>本題無詳解</p>';
            let raw = q.explain || q.explanation || q.detail || q.explanationHtml || '<p>本題無詳解</p>';
            return window.processQuestionContent ? window.processQuestionContent(raw) : raw;
        }
        return window.extractSpecificExplanation ? window.extractSpecificExplanation(quizData.explanationHtml || '', myCurrentQ) : '<p>本題無詳解</p>';
    })();

    const renderMainScreen = () => {
        if (myStatus === 'waiting') {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-2xl text-amber-400 font-bold mb-8 text-center bg-stone-800 px-8 py-4 rounded-2xl border border-stone-700 shadow-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-[32px]">description</span> 挑戰試卷：{room.quizName}
                    </div>

                    <div className="flex items-center gap-10 mb-8">
                        <div className="text-center">
                            <div className="w-24 h-24 bg-stone-700 rounded-full mb-2 flex items-center justify-center text-2xl border-4 border-amber-500 shadow-md">{userProfile.displayName[0]}</div>
                            <div className="text-white font-bold text-lg">{userProfile.displayName} (你)</div>
                        </div>
                        <span className="text-4xl text-stone-500 font-black">VS</span>
                        <div className="text-center">
                            <div className={`w-24 h-24 rounded-full mb-2 flex items-center justify-center text-2xl border-4 shadow-md ${room.guestId ? 'border-cyan-500 bg-stone-700 text-white' : 'border-dashed border-stone-600 bg-stone-800 text-stone-500'}`}>
                                {room.guestId ? room.guestName[0] : '?'}
                            </div>
                            <div className="text-white font-bold text-lg">{room.guestId ? room.guestName : '等待對手...'}</div>
                        </div>
                    </div>

                    <div className="bg-stone-800 p-6 rounded-3xl w-full max-w-md border border-stone-700 shadow-2xl flex flex-col items-center">
                        <div className="text-stone-400 font-bold text-sm mb-1 uppercase tracking-widest">邀請代碼</div>
                        <div className="text-5xl text-amber-500 font-black tracking-widest mb-6 drop-shadow-md">{room.id}</div>
                        
                        <div className="w-full mb-6 border-t border-stone-700 pt-6">
                            <div className="text-stone-400 font-bold text-sm mb-3 text-center">遊戲模式</div>
                            {isHost ? (
                                <div className="flex gap-4">
                                    <button onClick={() => window.db.collection('quizRooms').doc(room.id).update({ mode: 'versus' })} className={`flex-1 py-3 font-bold rounded-xl transition-all flex justify-center items-center gap-1 ${room.mode === 'versus' ? 'bg-amber-500 text-white shadow-inner scale-105' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>
                                        <span className="material-symbols-outlined text-[20px]">sports_esports</span> 對戰模式
                                    </button>
                                    <button onClick={() => window.db.collection('quizRooms').doc(room.id).update({ mode: 'coop' })} className={`flex-1 py-3 font-bold rounded-xl transition-all flex justify-center items-center gap-1 ${room.mode === 'coop' ? 'bg-cyan-500 text-white shadow-inner scale-105' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>
                                        <span className="material-symbols-outlined text-[20px]">handshake</span> 合作模式
                                    </button>
                                </div>
                            ) : (
                                <div className={`w-full py-4 rounded-xl font-black text-xl flex items-center justify-center gap-2 shadow-inner border ${room.mode === 'versus' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'}`}>
                                    <span className="material-symbols-outlined text-[28px]">{room.mode === 'versus' ? 'sports_esports' : 'handshake'}</span>
                                    {room.mode === 'versus' ? '對戰模式' : '合作模式'}
                                </div>
                            )}
                        </div>

                        {isHost ? (
                            <div className="flex gap-3 w-full mt-2">
                                <button onClick={inviteFriends} className="flex-1 flex justify-center items-center gap-1 bg-stone-700 hover:bg-stone-600 text-white py-3.5 rounded-xl font-bold transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">content_copy</span> 複製代碼
                                </button>
                                <button onClick={startGame} disabled={!room.guestId} className="flex-1 flex justify-center items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl font-black shadow-lg disabled:opacity-50 transition-colors active:scale-95">
                                    <span className="material-symbols-outlined text-[20px]">play_arrow</span> 開始遊戲
                                </button>
                            </div>
                        ) : (
                            <div className="text-amber-400 font-bold text-center animate-pulse mt-2 flex items-center justify-center gap-2 w-full bg-stone-700/50 py-3 rounded-xl border border-stone-600">
                                <span className="material-symbols-outlined text-[24px]">hourglass_empty</span> 等待房主開始遊戲...
                            </div>
                        )}
                    </div>
                </div>
            );
        } else if (myStatus === 'playing') {
            return (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-stone-50 dark:bg-stone-900 relative">
                    <style dangerouslySetInnerHTML={{__html: `
                        .online-match-container img, 
                        .online-match-container canvas, 
                        .preview-rich-text img, 
                        .preview-rich-text canvas {
                            max-width: 100% !important;
                            min-width: 60% !important;
                            height: auto !important;
                            margin: 1.5rem auto !important;
                            display: block !important;
                            border-radius: 12px !important;
                            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05) !important;
                            background-color: #ffffff !important;
                            padding: 1rem !important;
                        }
                        .online-match-option img {
                            min-width: 150px !important;
                            margin: 0.5rem 0 !important;
                            padding: 0.5rem !important;
                        }
                    `}} />

                    <div className="flex justify-between items-center mb-6 bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700">
                        <h2 className="text-xl font-black text-stone-800 dark:text-white">第 {myCurrentQ + 1} 題 <span className="text-sm font-bold text-gray-400 ml-2">/ 共 {quizData.numQuestions} 題</span></h2>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-500">對手狀態:</span>
                            {!isOpponentPresent ? (
                                <span className="text-gray-500 font-bold flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full"><span className="material-symbols-outlined text-[18px]">no_accounts</span> 已離開</span>
                            ) : (oppProg?.readyToGrade && oppCurrentQ === myCurrentQ) ? (
                                <span className="text-emerald-500 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full"><span className="material-symbols-outlined text-[18px]">check_circle</span> 已鎖定答案</span>
                            ) : (
                                <span className="text-amber-500 font-bold flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full"><span className="material-symbols-outlined text-[18px] animate-pulse">edit</span> 思考中...</span>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-stone-800 p-6 md:p-8 rounded-3xl shadow-md mb-6 text-lg font-medium text-stone-800 dark:text-gray-100 border border-stone-100 dark:border-stone-700 leading-loose online-match-container" dangerouslySetInnerHTML={{__html: currentQHtml}}></div>

                    <div className="flex flex-col gap-4 mb-8">
                        {['A', 'B', 'C', 'D'].map((opt, idx) => {
                            const isSelected = myProg?.currentAnswer === opt;
                            const isCrossed = myProg?.crossedOut?.includes(opt);
                            
                            const isOppOnSameQ = isOpponentPresent && (oppCurrentQ === myCurrentQ);
                            const oppSelected = isOppOnSameQ && oppProg?.currentAnswer === opt;
                            const oppCrossed = isOppOnSameQ && oppProg?.crossedOut?.includes(opt);

                            let btnClass = "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-amber-300";
                            if (isSelected) btnClass = "bg-amber-100 border-amber-500 text-amber-800 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-200 shadow-md";
                            if (isCrossed) btnClass += " opacity-40 line-through text-red-400";

                            const currentQuestionObj = (quizData.questions && Array.isArray(quizData.questions)) ? quizData.questions[myCurrentQ] : null;
                            const rawOptText = (currentQuestionObj && currentQuestionObj.options && currentQuestionObj.options[opt]) 
                                ? currentQuestionObj.options[opt] 
                                : `選項 ${opt}`;
                            
                            const displayOptHtml = window.processQuestionContent ? window.processQuestionContent(rawOptText) : rawOptText;

                            return (
                                <div key={opt} className="relative group flex">
                                    <button 
                                        onClick={() => { if (isCrossed) toggleCrossOut(opt); else selectAnswer(opt); }}
                                        className={`flex-1 p-5 border-2 rounded-2xl font-bold text-xl text-left pl-6 transition-all active:scale-[0.98] ${btnClass}`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="shrink-0 font-black">{opt}.</span>
                                            <span className="text-lg font-medium online-match-option !p-0 !bg-transparent !border-none" dangerouslySetInnerHTML={{ __html: displayOptHtml }}></span>
                                        </div>
                                        
                                        {/* 合作模式專屬：顯示對手操作痕跡 */}
                                        {room.mode === 'coop' && isOppOnSameQ && (
                                            <div className="absolute left-2 top-2 flex flex-col gap-1 z-10">
                                                {oppSelected && <span className="w-3.5 h-3.5 bg-cyan-500 border border-white rounded-full shadow-sm" title={`${opponentName} 選擇了此項`}></span>}
                                                {oppCrossed && <span className="material-symbols-outlined text-[16px] text-cyan-500 bg-white dark:bg-stone-800 rounded-full shadow-sm" title={`${opponentName} 刪除了此項`}>close</span>}
                                            </div>
                                        )}
                                    </button>
                                    
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleCrossOut(opt); }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors bg-white dark:bg-stone-800 shadow-sm border border-stone-200 dark:border-stone-700 z-10"
                                        title="刪去此選項"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">{isCrossed ? 'undo' : 'close'}</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="flex justify-end">
                        <button 
                            onClick={lockAnswer} 
                            disabled={!myProg?.currentAnswer} 
                            className={`px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-lg flex items-center gap-2 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 hover:bg-stone-700 dark:hover:bg-white active:scale-95 disabled:opacity-50 disabled:active:scale-100`}
                        >
                            <span className="material-symbols-outlined">lock</span> 鎖定答案並對答案
                        </button>
                    </div>

                    {/* ✨ 修改 2：等待對手作答的浮動小通知 (不蓋掉題目) */}
                    {myProg.readyToGrade && (
                        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold border-2 border-amber-500 animate-in fade-in slide-in-from-top-4">
                            <span className="material-symbols-outlined text-[24px] text-amber-500 animate-spin">sync</span>
                            <span>已鎖定！等待對手完成作答...</span>
                        </div>
                    )}
                </div>
            );
        } else if (myStatus === 'grading') {
            const myAns = myProg?.answers?.[myCurrentQ] || '';
            const oppAns = oppProg?.answers?.[myCurrentQ] || '';
            const correctAns = keyArray[myCurrentQ] || '';
            
            const checkCorrect = (ans, key) => {
                if (!ans || !key) return false;
                if (key.toLowerCase() === 'z' || key.toLowerCase() === 'abcd') return true;
                return key === key.toUpperCase() ? (ans === key) : key.toLowerCase().includes(ans.toLowerCase());
            };
            const isCorrect = checkCorrect(myAns, correctAns);

            return (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-stone-50 dark:bg-stone-900 online-match-container">
                    {/* ✨ 確保圖片放大魔法依然有效 */}
                    <style dangerouslySetInnerHTML={{__html: `
                        .online-match-container img, 
                        .online-match-container canvas, 
                        .preview-rich-text img, 
                        .preview-rich-text canvas {
                            max-width: 100% !important;
                            min-width: 60% !important;
                            height: auto !important;
                            margin: 1.5rem auto !important;
                            display: block !important;
                            border-radius: 12px !important;
                            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05) !important;
                            background-color: #ffffff !important;
                            padding: 1rem !important;
                        }
                    `}} />

                    {/* ✨ 修改 3：保留原題目的顯示 (在對答卡片之下) */}
                    <div className={`p-8 rounded-3xl mb-8 text-center shadow-md border-4 ${isCorrect ? 'bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-900/20' : 'bg-red-50 border-red-400 text-red-700 dark:bg-red-900/20'}`}>
                        <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-widest flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[64px]">{isCorrect ? 'check_circle' : 'cancel'}</span>
                            {isCorrect ? '正確！' : '錯誤！'}
                        </h1>
                        <div className="flex justify-center items-center gap-6 text-xl font-bold bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-inner inline-flex flex-wrap">
                            <div>正確答案：<span className="text-emerald-500 font-black">{correctAns}</span></div>
                            <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-stone-600"></div>
                            <div>你選擇：<span className={isCorrect ? "text-emerald-500 font-black" : "text-red-500 font-black"}>{myAns}</span></div>
                            {isOpponentPresent && oppAns && (
                                <>
                                    <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-stone-600"></div>
                                    <div>對方選擇：<span className="text-stone-500 font-black">{oppAns}</span></div>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* ✨ 保留題目本體，讓對答案時能重新檢視 */}
                    <div className="bg-white dark:bg-stone-800 p-6 md:p-8 rounded-3xl shadow-sm mb-6 text-lg font-medium text-stone-800 dark:text-gray-100 border border-stone-100 dark:border-stone-700 leading-loose opacity-80">
                        <div className="text-sm font-bold text-gray-500 mb-3 border-b border-stone-200 dark:border-stone-700 pb-2">回顧題目：</div>
                        <div dangerouslySetInnerHTML={{__html: currentQHtml}}></div>
                    </div>
                    
                    <div className="bg-white dark:bg-stone-800 p-6 md:p-8 rounded-3xl shadow-sm mb-8 border border-stone-200 dark:border-stone-700">
                        <div className="flex justify-between items-center mb-4 border-b border-stone-100 dark:border-stone-700 pb-2">
                            <h3 className="text-xl font-black text-amber-500 flex items-center gap-2">
                                <span className="material-symbols-outlined">menu_book</span> 題目詳解
                            </h3>
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const currentQuestionObj = (quizData.questions && Array.isArray(quizData.questions)) ? quizData.questions[myCurrentQ] : { number: myCurrentQ + 1 };
                                    window.dispatchEvent(new CustomEvent('addToWrongBook', { detail: {
                                        number: myCurrentQ + 1,
                                        userAns: myAns || '未填寫',
                                        correctAns: correctAns || '無',
                                        ...currentQuestionObj
                                    }}));
                                }} 
                                className="text-sm bg-[#FCFBF7] dark:bg-stone-800 text-red-500 px-4 py-1.5 font-bold rounded-full border border-red-200 hover:bg-red-50 transition-colors shadow-sm flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[16px]">bookmark_add</span>收錄錯題
                            </button>
                        </div>
                        <div className="text-lg text-stone-700 dark:text-gray-300 leading-relaxed font-medium preview-rich-text" dangerouslySetInnerHTML={{__html: currentEHtml}}></div>
                    </div>
                    
                    <div className="flex justify-end">
                        <button 
                            onClick={nextQuestion} 
                            className={`px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-lg flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white active:scale-95`}
                        >
                            <span className="material-symbols-outlined">arrow_forward</span> 進入下一題
                        </button>
                    </div>
                </div>
            );
        } else if (myStatus === 'finished') {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-stone-50 dark:bg-stone-900">
                    <h2 className="text-4xl font-black text-amber-500 mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[40px]">emoji_events</span> 遊戲結束！結算成績</h2>
                    <p className="text-stone-500 font-bold mb-10">共 {quizData.numQuestions} 題 (紀錄已自動保存)</p>
                    
                    <div className="flex flex-col md:flex-row gap-6 md:gap-10 w-full max-w-3xl justify-center mb-8">
                        <div className="flex-1 text-center bg-white dark:bg-stone-800 p-8 rounded-3xl shadow-xl border-4 border-amber-400 relative transform hover:-translate-y-2 transition-transform">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1 rounded-full font-black text-sm shadow-md flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">face</span> YOU</div>
                            <div className="w-20 h-20 bg-stone-100 dark:bg-stone-700 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-black text-stone-400 border-2 border-stone-200">{userProfile.displayName[0]}</div>
                            <div className="text-stone-800 dark:text-white font-bold text-2xl mb-4">{userProfile.displayName}</div>
                            <div className="text-6xl font-black text-emerald-500 drop-shadow-sm">{myProg.score.toFixed(1)} <span className="text-xl text-stone-400">分</span></div>
                        </div>
                        {isOpponentPresent && (
                            <div className="flex-1 text-center bg-white dark:bg-stone-800 p-8 rounded-3xl shadow-xl border-4 border-stone-300 dark:border-stone-600 relative transform hover:-translate-y-2 transition-transform">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-stone-400 text-white px-4 py-1 rounded-full font-black text-sm shadow-md flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">person</span> OPPONENT</div>
                                <div className="w-20 h-20 bg-stone-100 dark:bg-stone-700 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-black text-stone-400 border-2 border-stone-200">{opponentName[0]}</div>
                                <div className="text-stone-800 dark:text-white font-bold text-2xl mb-4">{opponentName}</div>
                                <div className="text-6xl font-black text-emerald-500 drop-shadow-sm">{(oppProg?.score || 0).toFixed(1)} <span className="text-xl text-stone-400">分</span></div>
                            </div>
                        )}
                    </div>
                    <button onClick={handleActiveExit} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-8 py-3 rounded-full font-black text-lg shadow-md hover:bg-stone-700 dark:hover:bg-white transition-colors">
                        退出房間
                    </button>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="fixed inset-0 z-[500] bg-stone-900 flex flex-col md:flex-row overflow-hidden animate-fade-in online-match-wrapper">
            {/* 左側：主遊戲畫面 */}
            <div className="flex-1 flex flex-col h-full border-r border-stone-700 bg-stone-900 relative min-w-0">
                <div className="p-3 md:p-4 bg-stone-800 border-b border-stone-700 flex justify-between items-center shrink-0 shadow-md z-10">
                    <div className="flex items-center truncate">
                        <span className="bg-amber-500 text-white px-2 py-1 rounded text-xs font-black mr-3 shrink-0 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">{room?.mode === 'versus' ? 'sports_esports' : 'handshake'}</span>
                            {room?.mode === 'versus' ? '對戰' : '合作'}
                        </span>
                        <span className="text-white font-bold truncate">{room?.quizName}</span>
                    </div>
                    <button onClick={handleActiveExit} className="text-red-400 hover:text-white hover:bg-red-500 border border-red-500 px-4 py-1.5 rounded-lg font-bold transition-colors shrink-0 ml-2">退出</button>
                </div>

                {renderMainScreen()}
            </div>

            {/* 右側：戰況面板與聊天室 */}
            <div className="w-full md:w-80 flex flex-col bg-stone-800 shrink-0">
                <div className="p-4 border-b border-stone-700 bg-stone-900 shrink-0 shadow-sm z-10">
                    <h3 className="text-amber-500 font-black mb-3 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">monitoring</span> 即時戰況</h3>
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center bg-stone-800 p-2 rounded-lg border border-stone-700">
                            <span className="text-white font-bold truncate pr-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">face</span> {userProfile.displayName}</span>
                            <span className="text-emerald-400 font-black shrink-0">{myProg?.score?.toFixed(1) || 0} 分</span>
                        </div>
                        {opponentId && (
                            <div className="flex justify-between items-center bg-stone-800 p-2 rounded-lg border border-stone-700">
                                <span className="text-gray-400 font-bold truncate pr-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">person</span> {opponentName}</span>
                                {isOpponentPresent ? (
                                    <span className="text-emerald-400 font-black shrink-0">{oppProg?.score?.toFixed(1) || 0} 分</span>
                                ) : (
                                    <span className="text-xs font-bold bg-stone-700 text-stone-400 px-2 py-0.5 rounded">已離開</span>
                                )}
                            </div>
                        )}
                    </div>
                    {room?.mode === 'coop' && (
                        <div className="mt-3 text-[10px] text-cyan-300 font-bold bg-cyan-900/30 p-2 rounded-lg leading-relaxed border border-cyan-800 flex items-start gap-1">
                            <span className="material-symbols-outlined text-[14px]">lightbulb</span> 合作模式：雙方皆答對得全部分數，僅一人答對得一半分數。
                        </div>
                    )}
                </div>

                <div className="p-3 border-b border-stone-700 font-bold text-white flex items-center gap-2 bg-stone-800 shrink-0 shadow-sm z-10">
                    <span className="material-symbols-outlined">chat</span> 房間聊天室
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-stone-800">
                    {messages.map(m => (
                        <div key={m.id} className={`flex flex-col max-w-[85%] ${m.userId === user.uid ? 'self-end items-end' : 'self-start items-start'}`}>
                            <span className="text-[10px] text-stone-400 mb-0.5 ml-1 mr-1">{m.userName}</span>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${m.userId === user.uid ? 'bg-amber-500 text-white rounded-br-none' : (m.userId === 'system' ? 'bg-stone-600 text-stone-300 rounded-xl w-full text-center text-xs' : 'bg-stone-700 text-white rounded-bl-none')}`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={sendMsg} className="p-3 border-t border-stone-700 flex gap-2 bg-stone-900 shrink-0">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="輸入聊天訊息..." className="flex-1 bg-stone-800 border border-stone-600 text-white px-4 py-2.5 rounded-full outline-none text-sm font-bold focus:border-amber-500 transition-colors" />
                    <button type="submit" className="bg-amber-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-amber-600 transition-transform active:scale-95 shadow-md"><span className="material-symbols-outlined text-[20px] ml-0.5">send</span></button>
                </form>
            </div>
        </div>
    );
};