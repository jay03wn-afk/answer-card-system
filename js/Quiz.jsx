// --- 新增：任務牆看板組件 ---
// --- 新增：任務牆看板組件 ---
function TaskWallDashboard({ user, showAlert, onContinueQuiz }) {
    const [tasks, setTasks] = useState({});
    const [loading, setLoading] = useState(true);

    // 定義子分類與其他分類
    const subCategories = [
        '1. 藥物分析學', '2. 生藥學', '3. 中藥學', 
        '4. 藥物化學與藥理學', '5. 藥劑學', '6. 生物藥劑學'
    ];
    const allCategories = [...subCategories, '模擬試題 (其他)'];

    useEffect(() => {
        const unsub = window.db.collection('publicTasks')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                const grouped = allCategories.reduce((acc, cat) => ({ ...acc, [cat]: [] }), {});
                
                snap.docs.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() };
                    const cat = data.category || '模擬試題 (其他)';
                    // 每個分類最多只放 5 筆
                    if (grouped[cat] && grouped[cat].length < 5) {
                        grouped[cat].push(data);
                    }
                });
                
                setTasks(grouped);
                setLoading(false);
            }, err => {
                console.error(err);
                setLoading(false);
            });
            
        return () => unsub();
    }, []);

    const handleAcceptTask = async (task) => {
        try {
            // 檢查是否已經領取過
            const myQuizzesSnap = await window.db.collection('users').doc(user.uid).collection('quizzes')
                .where('taskId', '==', task.id).get();
            
            if (!myQuizzesSnap.empty) {
                return showAlert("⚠️ 你已經領取過此任務，請至「我的題庫」查看！");
            }

            const emptyAnswers = Array(Number(task.numQuestions)).fill('');
            const emptyStarred = Array(Number(task.numQuestions)).fill(false);

            const newDocRef = await window.db.collection('users').doc(user.uid).collection('quizzes').add({
                testName: task.testName,
                numQuestions: task.numQuestions,
                questionFileUrl: task.questionFileUrl || '',
                questionText: task.questionText || '',
                correctAnswersInput: task.correctAnswersInput || '',
                userAnswers: emptyAnswers,
                starred: emptyStarred,
                hasTimer: task.hasTimer || false,
                timeLimit: task.timeLimit || null,
                timeRemaining: task.hasTimer ? (task.timeLimit * 60) : null,
                isTask: true,
                taskId: task.id,
                folder: '任務牆',
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            showAlert("✅ 任務領取成功！已加入你的題庫「任務牆」資料夾中，為你開啟試卷。");
            
            // 自動跳轉至試卷
            const newRec = await newDocRef.get();
            onContinueQuiz({ id: newRec.id, ...newRec.data() });
            
        } catch (e) {
            showAlert('領取失敗：' + e.message);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 pt-0 h-[calc(100dvh-100px)] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b-2 border-black dark:border-white pb-2 shrink-0">
                <h1 className="text-2xl font-black dark:text-white flex items-center">
                    🎯 公開任務牆
                </h1>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">首次挑戰及格可獲 200💎！</p>
            </div>

            {loading ? (
                <div className="text-center text-gray-500 py-10 font-bold animate-pulse">正在載入公開任務...</div>
            ) : (
                <div className="space-y-8 pb-10">
                    
                    {/* --- 主分類：模擬試題 --- */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round p-5 md:p-6">
                        <h2 className="text-2xl font-black mb-6 dark:text-white border-b-2 border-indigo-200 dark:border-indigo-900 pb-2 text-indigo-700 dark:text-indigo-400 flex items-center">
                            📚 模擬試題
                        </h2>
                        
                        <div className="space-y-8">
                            {subCategories.map(cat => (
                                tasks[cat] && tasks[cat].length > 0 && (
                                    <div key={cat} className="pl-4 border-l-4 border-indigo-300 dark:border-indigo-600">
                                        <h3 className="text-lg font-bold mb-4 dark:text-gray-200 text-gray-700">{cat}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {tasks[cat].map(task => (
                                                <div key={task.id} className="border border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-900 flex flex-col justify-between hover:shadow-md transition-shadow">
                                                    <div>
                                                        <h3 className="font-bold text-md mb-2 dark:text-white truncate" title={task.testName}>
                                                            {task.testName.replace('[#mnst]', '')}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 mb-4 flex gap-2">
                                                            <span>題數: {task.numQuestions}</span>
                                                            {task.hasTimer && <span className="text-red-500 font-bold">限時: {task.timeLimit}m</span>}
                                                        </p>
                                                    </div>
                                                    <button onClick={() => handleAcceptTask(task)} className="bg-black dark:bg-gray-200 text-white dark:text-black py-2 no-round font-bold text-sm hover:bg-gray-800 transition-colors w-full">
                                                        ⚔️ 接受挑戰
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ))}
                            {/* 如果模擬試題底下全部沒任務 */}
                            {subCategories.every(cat => !tasks[cat] || tasks[cat].length === 0) && (
                                <p className="text-gray-500 text-sm pl-4">此分類尚無任務！</p>
                            )}
                        </div>
                    </div>

                    {/* --- 其他任務 --- */}
                    {tasks['模擬試題 (其他)'] && tasks['模擬試題 (其他)'].length > 0 && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round p-5 md:p-6">
                            <h2 className="text-xl font-black mb-4 dark:text-white border-b-2 border-gray-200 dark:border-gray-700 pb-2 text-gray-600 dark:text-gray-400">
                                🏷️ 其他任務
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tasks['模擬試題 (其他)'].map(task => (
                                    <div key={task.id} className="border border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-900 flex flex-col justify-between hover:shadow-md transition-shadow">
                                        <div>
                                            <h3 className="font-bold text-md mb-2 dark:text-white truncate" title={task.testName}>
                                                {task.testName.replace('[#mnst]', '')}
                                            </h3>
                                            <p className="text-xs text-gray-500 mb-4 flex gap-2">
                                                <span>題數: {task.numQuestions}</span>
                                                {task.hasTimer && <span className="text-red-500 font-bold">限時: {task.timeLimit}m</span>}
                                            </p>
                                        </div>
                                        <button onClick={() => handleAcceptTask(task)} className="bg-black dark:bg-gray-200 text-white dark:text-black py-2 no-round font-bold text-sm hover:bg-gray-800 transition-colors w-full">
                                            ⚔️ 接受挑戰
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {Object.values(tasks).every(arr => arr.length === 0) && (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-16 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                            目前沒有任何任務！
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// --- 我的題庫與測驗核心 ---
function Dashboard({ user, userProfile, onStartNew, onContinueQuiz, showAlert, showConfirm, showPrompt }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showShareModal, setShowShareModal] = useState(null);
    const [showMoveModal, setShowMoveModal] = useState(null);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);

    const userFolders = Array.from(new Set(['未分類', '任務牆', ...(userProfile.folders || [])]));
    const [currentFolder, setCurrentFolder] = useState('未分類');
    
    const [filters, setFilters] = useState({ todo: true, doing: true, done: true });

    useEffect(() => {
        let isMounted = true;
        let fallbackTimer = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 3000);

        const unsubscribe = window.db.collection('users').doc(user.uid).collection('quizzes')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                if (isMounted) {
                    setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoading(false);
                    clearTimeout(fallbackTimer);
                }
            }, err => {
                console.error(err);
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
            clearTimeout(fallbackTimer);
            unsubscribe();
        };
    }, [user]);

    const handleDelete = (id) => {
        showConfirm("確定要刪除這筆紀錄嗎？資料將無法恢復！", () => {
            window.db.collection('users').doc(user.uid).collection('quizzes').doc(id).delete()
            .catch(error => showAlert('刪除失敗：' + error.message));
        });
    }

    const handleCreateFolder = () => {
        showPrompt("請輸入新資料夾名稱：", "", (name) => {
            const cleanName = name?.trim();
            if(cleanName && !userFolders.includes(cleanName)) {
                window.db.collection('users').doc(user.uid).set({
                    folders: window.firebase.firestore.FieldValue.arrayUnion(cleanName)
                }, { merge: true }).then(() => {
                    setCurrentFolder(cleanName);
                    showAlert(`✅ 已建立資料夾「${cleanName}」`);
                }).catch(e => showAlert('建立失敗：' + e.message));
            } else if (userFolders.includes(cleanName)) {
                showAlert('❌ 資料夾名稱已存在');
            }
        });
    };

    const moveQuizToFolder = (quiz, targetFolder) => {
        window.db.collection('users').doc(user.uid).collection('quizzes').doc(quiz.id).update({ folder: targetFolder })
        .then(() => {
            showAlert(`✅ 已成功移動至 ${targetFolder}`);
            setShowMoveModal(null);
        })
        .catch(e => showAlert('移動失敗：' + e.message));
    };

    const handleGenerateCode = async (quiz) => {
        if (quiz.shortCode) {
            navigator.clipboard.writeText(quiz.shortCode);
            showAlert(`✅ 已複製代碼：${quiz.shortCode}`);
            return;
        }
        setIsGeneratingCode(true);
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
            await window.db.collection('shareCodes').doc(newCode).set({
                ownerId: user.uid,
                quizId: quiz.id
            });
            await window.db.collection('users').doc(user.uid).collection('quizzes').doc(quiz.id).update({
                shortCode: newCode
            });
            setShowShareModal(prev => ({...prev, shortCode: newCode}));
            navigator.clipboard.writeText(newCode);
            showAlert(`✅ 成功生成並複製代碼：${newCode}`);
        } catch(e) {
            showAlert('生成代碼失敗：' + e.message);
        }
        setIsGeneratingCode(false);
    };

    const handleImportCode = () => {
        showPrompt("請輸入 6 碼測驗代碼：", "", async (code) => {
            const cleanCode = code?.trim().toUpperCase();
            if (!cleanCode) return;
            
            const codeRegex = /^[A-Z0-9]{6}$/;
            if (!codeRegex.test(cleanCode)) {
                return showAlert("⚠️ 代碼格式錯誤！\n請確認您輸入的是剛好「6 碼」的英數組合（不可包含符號或空白）。", "輸入錯誤");
            }

            try {
                const isDuplicateCode = records.some(r => r.shortCode === cleanCode);
                if (isDuplicateCode) {
                    return showAlert(`⚠️ 你已經擁有此試卷！`, "重複加入");
                }

                const codeDoc = await window.db.collection('shareCodes').doc(cleanCode).get();
                if (!codeDoc.exists) {
                    return showAlert("❌ 找不到該代碼：\n請確認代碼是否輸入正確，或該代碼已失效。", "查無資料");
                }

                const { ownerId, quizId: targetQuizId } = codeDoc.data();

                if (ownerId === user.uid) {
                    return showAlert("⚠️ 你已經擁有此試卷！", "重複擁有");
                }

                const doc = await window.db.collection('users').doc(ownerId).collection('quizzes').doc(targetQuizId).get();
                if (!doc.exists) {
                    return showAlert("❌ 試卷已不存在：\n原作者可能已將此試卷刪除。", "載入失敗");
                }
                
                const data = doc.data();

                const isContentDuplicate = records.some(r => {
                    const localName = (r.testName || '').split(' (來自')[0].trim();
                    const incomingName = (data.testName || '').split(' (來自')[0].trim();
                    return localName === incomingName && Number(r.numQuestions) === Number(data.numQuestions);
                });

                if (isContentDuplicate) {
                    return showAlert(`⚠️ 你已經擁有此試卷！`, "內容重複");
                }

                const emptyAnswers = Array(Number(data.numQuestions)).fill('');
                const emptyStarred = Array(Number(data.numQuestions)).fill(false);
                
                await window.db.collection('users').doc(user.uid).collection('quizzes').add({
                    testName: data.testName + ' (來自代碼)',
                    numQuestions: data.numQuestions,
                    questionFileUrl: data.questionFileUrl || '',
                    questionText: data.questionText || '',
                    correctAnswersInput: data.correctAnswersInput || '', 
                    userAnswers: emptyAnswers,
                    starred: emptyStarred,
                    hasTimer: data.hasTimer || false,
                    timeLimit: data.timeLimit || null,
                    timeRemaining: data.hasTimer ? (data.timeLimit * 60) : null,
                    isShared: true, 
                    folder: '未分類', 
                    shortCode: cleanCode, 
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });

                showAlert(`✅ 成功匯入「${data.testName}」！\n試卷已加入「未分類」資料夾。`, "匯入成功");

            } catch (e) {
                console.error(e);
                showAlert('❌ 發生非預期錯誤：' + e.message, "系統錯誤");
            }
        });
    };

    const shareToFriend = (friend) => {
        const chatId = [user.uid, friend.uid].sort().join('_');
        window.db.collection('chats').doc(chatId).collection('messages').add({
            senderId: user.uid,
            senderName: userProfile.displayName,
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
            type: 'quiz_share',
            read: false,
            quizData: {
                ownerId: user.uid,
                quizId: showShareModal.id,
                testName: showShareModal.testName,
                questionFileUrl: showShareModal.questionFileUrl || '',
                questionText: showShareModal.questionText || '',
                correctAnswersInput: showShareModal.correctAnswersInput || ''
            }
        }).then(() => {
            window.db.collection('users').doc(friend.uid).set({
                unreadChats: { [user.uid]: true }
            }, { merge: true });
            showAlert('✅ 已成功分享給 ' + friend.name + '！');
            setShowShareModal(null);
        }).catch(e => showAlert('分享失敗：' + e.message));
    };

    const toggleFilter = (key) => setFilters(prev => ({ ...prev, [key]: !prev[key] }));

    const displayedRecords = records.filter(rec => {
        if ((rec.folder || '未分類') !== currentFolder) return false;
        
        const isCompleted = !!rec.results;
        const answeredCount = rec.userAnswers ? rec.userAnswers.filter(a => a !== '').length : 0;
        const hasStarted = answeredCount > 0;

        if (isCompleted && filters.done) return true;
        if (!isCompleted && hasStarted && filters.doing) return true;
        if (!isCompleted && !hasStarted && filters.todo) return true;

        return false;
    });

    const handleEnterQuiz = (rec) => {
        if (rec.hasTimer && !rec.results) {
            const isNew = !rec.userAnswers || rec.userAnswers.filter(a => a !== '').length === 0;
            const timeText = isNew ? `${rec.timeLimit} 分鐘` : `剩餘約 ${Math.max(1, Math.ceil(rec.timeRemaining / 60))} 分鐘`;
            showConfirm(`⏱ 此測驗設有時間限制（${timeText}）。\n\n點擊「確定」後將進入並開始倒數計時，準備好了嗎？`, () => {
                onContinueQuiz(rec);
            });
        } else {
            onContinueQuiz(rec);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 pt-0 h-[calc(100dvh-100px)] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4 border-b-2 border-black dark:border-white pb-2 shrink-0">
                <h1 className="text-2xl font-black dark:text-white">我的題庫</h1>
                <button onClick={() => onStartNew(currentFolder)} className="bg-black dark:bg-gray-200 text-white dark:text-black px-6 py-2 no-round font-bold hover:bg-gray-800 dark:hover:bg-gray-300 shadow-sm transition-colors">+ 新測驗</button>
            </div>

            <div className="flex items-center space-x-2 mb-2 overflow-x-auto custom-scrollbar pb-2 shrink-0">
                {userFolders.map(f => (
                    <button key={f} onClick={() => setCurrentFolder(f)} className={`px-4 py-1.5 font-bold text-sm no-round whitespace-nowrap transition-colors ${currentFolder === f ? 'bg-black dark:bg-gray-200 text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'}`}>
                        📁 {f}
                    </button>
                ))}
                <button onClick={handleCreateFolder} className="px-3 py-1.5 text-sm font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 no-round whitespace-nowrap transition-colors">
                    + 新增資料夾
                </button>
                <button onClick={handleImportCode} className="px-3 py-1.5 text-sm font-bold bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 no-round whitespace-nowrap transition-colors">
                    📥 輸入代碼
                </button>
            </div>

            <div className="flex items-center space-x-4 mb-6 shrink-0 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 no-round">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 border-r border-gray-300 dark:border-gray-600 pr-3">狀態篩選</span>
                <label className="flex items-center space-x-1.5 text-sm cursor-pointer hover:text-black dark:hover:text-white dark:text-gray-300">
                    <input type="checkbox" checked={filters.todo} onChange={() => toggleFilter('todo')} className="w-4 h-4 accent-black dark:accent-white" />
                    <span className="font-bold">未作測驗</span>
                </label>
                <label className="flex items-center space-x-1.5 text-sm cursor-pointer hover:text-black dark:hover:text-white">
                    <input type="checkbox" checked={filters.doing} onChange={() => toggleFilter('doing')} className="w-4 h-4 accent-black dark:accent-white" />
                    <span className="font-bold text-orange-600 dark:text-orange-400">進行中</span>
                </label>
                <label className="flex items-center space-x-1.5 text-sm cursor-pointer hover:text-black dark:hover:text-white">
                    <input type="checkbox" checked={filters.done} onChange={() => toggleFilter('done')} className="w-4 h-4 accent-black dark:accent-white" />
                    <span className="font-bold text-green-600 dark:text-green-400">已完成</span>
                </label>
            </div>

            {loading ? (
                <div className="text-center text-gray-500 py-10 font-bold animate-pulse">讀取本地快取與雲端資料中...</div>
            ) : displayedRecords.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 text-center text-gray-500 dark:text-gray-400 py-16 border border-gray-200 dark:border-gray-700 no-round shadow-sm">此資料夾尚無符合篩選條件的測驗紀錄。</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pb-10">
                    {displayedRecords.map(rec => (
                        <div key={rec.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 no-round shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h2 className="font-bold text-lg leading-tight pr-2 flex flex-wrap items-center gap-1 dark:text-white">
                                        <span className="truncate max-w-[150px]">{renderTestName(rec.testName)}</span>
                                        {rec.isTask && <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-1.5 py-0.5 no-round align-middle font-normal whitespace-nowrap">任務挑戰</span>}
                                        {rec.isShared && !rec.isTask && <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-1.5 py-0.5 no-round align-middle font-normal whitespace-nowrap">好友分享</span>}
                                        {rec.hasTimer && <span className="text-xs bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 border border-red-200 dark:border-red-700 px-1.5 py-0.5 no-round align-middle font-bold whitespace-nowrap">⏱ 限時 {rec.timeLimit}m</span>}
                                    </h2>
                                    {rec.results && (
                                        <span className={`text-2xl font-black px-2 py-1 ml-2 shrink-0 ${rec.results.score >= 60 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{rec.results.score}</span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{rec.createdAt ? rec.createdAt.toDate().toLocaleString('zh-TW') : ''}</p>
                                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-6">
                                    <p>題數：{rec.numQuestions || 0}</p>
                                    {rec.results ? (
                                        <p className="text-green-700 dark:text-green-400 font-bold">狀態：✅ 已完成 (答對 {rec.results.correctCount}/{rec.results.total})</p>
                                    ) : (
                                        rec.userAnswers && rec.userAnswers.filter(a=>a).length > 0 ? 
                                        <p className="text-orange-600 dark:text-orange-400 font-bold">狀態：📝 進行中 (已填 {rec.userAnswers.filter(a=>a).length})</p> :
                                        <p className="text-gray-500 dark:text-gray-400 font-bold">狀態：⏳ 尚未作答</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-4">
                                <div className="space-x-3">
                                    <button onClick={() => handleDelete(rec.id)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-colors">刪除</button>
                                    <button onClick={() => setShowMoveModal(rec)} className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-bold transition-colors">📁 移動</button>
                                    <button onClick={() => setShowShareModal(rec)} className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors">📤 分享</button>
                                </div>
                                <button onClick={() => handleEnterQuiz(rec)} className="bg-gray-100 dark:bg-gray-700 px-5 py-2 no-round font-bold border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-white text-sm shrink-0 transition-colors">{rec.results ? '查看詳情' : '進入測驗'}</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showShareModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-sm no-round shadow-xl">
                        <h3 className="font-bold text-lg mb-4 flex justify-between items-center dark:text-white">
                            <span>📤 分享試卷</span>
                            <button onClick={() => setShowShareModal(null)} className="text-gray-400 hover:text-black dark:hover:text-white">✖</button>
                        </h3>

                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">公開測驗代碼</p>
                            {showShareModal.shortCode ? (
                                <div className="flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2">
                                    <span className="text-2xl font-mono font-black tracking-widest text-blue-600 dark:text-blue-400">{showShareModal.shortCode}</span>
                                    <button onClick={() => {
                                        navigator.clipboard.writeText(showShareModal.shortCode);
                                        showAlert(`✅ 已複製代碼：${showShareModal.shortCode}`);
                                    }} className="text-xs bg-black dark:bg-gray-200 text-white dark:text-black px-3 py-1.5 no-round font-bold hover:bg-gray-800">複製</button>
                                </div>
                            ) : (
                                <button onClick={() => handleGenerateCode(showShareModal)} disabled={isGeneratingCode} className="text-sm bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700 px-4 py-2 no-round font-bold hover:bg-blue-100 dark:hover:bg-blue-800 w-full transition-colors">
                                    {isGeneratingCode ? '生成中...' : '🔑 生成 6 碼分享代碼'}
                                </button>
                            )}
                        </div>

                        <h4 className="font-bold text-sm mb-2 text-gray-600 dark:text-gray-400">傳送給好友</h4>
                        <div className="max-h-40 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700 custom-scrollbar bg-white dark:bg-gray-700">
                            {(userProfile.friends || []).length === 0 ? <p className="p-4 text-sm text-gray-400">目前還沒有好友喔</p> : null}
                            {(userProfile.friends || []).map(f => (
                                <button key={f.uid} onClick={() => shareToFriend(f)} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 font-bold text-sm transition-colors dark:text-white">
                                    {f.name} <span className="text-gray-400 dark:text-gray-400 font-normal ml-2">{f.email}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showMoveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-sm no-round shadow-xl">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">選擇目標資料夾</h3>
                        <div className="max-h-60 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700 custom-scrollbar">
                            {userFolders.map(f => (
                                <button key={f} onClick={() => moveQuizToFolder(showMoveModal, f)} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 font-bold text-sm transition-colors dark:text-white">
                                    📁 {f}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowMoveModal(null)} className="w-full bg-gray-100 dark:bg-gray-700 text-black dark:text-white p-2 font-bold no-round hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function QuizApp({ currentUser, userProfile, activeQuizRecord, onBackToDashboard, showAlert, showConfirm, showPrompt }) {
    const initialRecord = activeQuizRecord || {};
    const userFolders = Array.from(new Set(['未分類', ...(userProfile.folders || [])]));
    
    const [quizId, setQuizId] = useState(initialRecord.id || null);
    const [step, setStep] = useState(initialRecord.results ? 'results' : (initialRecord.id ? 'answering' : 'setup'));
    const [testName, setTestName] = useState(initialRecord.testName || '');
    const [numQuestions, setNumQuestions] = useState(initialRecord.numQuestions || 50);
    const [userAnswers, setUserAnswers] = useState(initialRecord.userAnswers || []);
    const [starred, setStarred] = useState(initialRecord.starred || []);
    const [correctAnswersInput, setCorrectAnswersInput] = useState(initialRecord.correctAnswersInput || '');
    const [results, setResults] = useState(initialRecord.results || null);
    const [questionFileUrl, setQuestionFileUrl] = useState(initialRecord.questionFileUrl || '');
    const [questionText, setQuestionText] = useState(initialRecord.questionText || ''); 
    const [folder, setFolder] = useState(initialRecord.folder || '未分類');
    const [shortCode, setShortCode] = useState(initialRecord.shortCode || null);
    const [pdfZoom, setPdfZoom] = useState(1); 
    
    // 用於顯示其他挑戰者的匿名分數
    const [taskScores, setTaskScores] = useState(null);

    const [inputType, setInputType] = useState((initialRecord.questionText && !initialRecord.questionFileUrl) ? 'text' : 'url');
    const isShared = initialRecord.isShared === true;
    const isTask = initialRecord.isTask === true;
    
    const [hasTimer, setHasTimer] = useState(initialRecord.hasTimer || false);
    const [timeLimit, setTimeLimit] = useState(initialRecord.timeLimit || 60);
    const timeRemainingRef = useRef(initialRecord.timeRemaining ?? (initialRecord.timeLimit ? initialRecord.timeLimit * 60 : null));
    const [displayTime, setDisplayTime] = useState(timeRemainingRef.current);
    const [isTimeUp, setIsTimeUp] = useState(hasTimer && timeRemainingRef.current <= 0);
    const [syncTrigger, setSyncTrigger] = useState(0);

    const [layoutMode, setLayoutMode] = useState('horizontal'); 
    const [splitRatio, setSplitRatio] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(true);
    const splitContainerRef = useRef(null);

    const [showOnlyWrong, setShowOnlyWrong] = useState(false);
    const [showOnlyStarred, setShowOnlyStarred] = useState(false);
    const [showShareScoreModal, setShowShareScoreModal] = useState(false);

    const starredIndices = starred.map((s, i) => s ? i + 1 : null).filter(Boolean);

    useEffect(() => {
        let timerId;
        if (step === 'answering' && hasTimer && !isTimeUp) {
            timerId = setInterval(() => {
                if (timeRemainingRef.current > 0) {
                    timeRemainingRef.current -= 1;
                    setDisplayTime(timeRemainingRef.current);
                    
                    if (timeRemainingRef.current % 15 === 0) setSyncTrigger(s => s + 1);

                    if (timeRemainingRef.current <= 0) {
                        setIsTimeUp(true);
                        setSyncTrigger(s => s + 1);
                        showAlert("⏱ 時間到！\n\n您的作答時間已結束，答案卡已鎖定無法再做更改。\n請點擊上方「交卷對答案」。");
                    }
                }
            }, 1000);
        }
        return () => { if(timerId) clearInterval(timerId); };
    }, [step, hasTimer, isTimeUp]);

    useEffect(() => {
        if (currentUser && quizId && (step === 'answering' || step === 'setup' || step === 'results')) {
            if (userAnswers.length === 0 && numQuestions > 0 && step === 'answering') return;
            
            const stateToSave = { 
                testName, numQuestions, userAnswers, starred, correctAnswersInput, results, 
                questionFileUrl, questionText, hasTimer, timeLimit, folder,
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            };
            if (hasTimer) stateToSave.timeRemaining = timeRemainingRef.current;

            window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).update(stateToSave)
                .catch(e => console.error("自動儲存失敗", e));
        }
    }, [testName, numQuestions, userAnswers, starred, correctAnswersInput, results, questionFileUrl, questionText, folder, currentUser, quizId, step, syncTrigger]);

    // 若是任務挑戰且在結果頁，抓取其他人的成績
    useEffect(() => {
        if (step === 'results' && isTask && initialRecord.taskId) {
            window.db.collection('publicTasks').doc(initialRecord.taskId).collection('scores')
                .orderBy('timestamp', 'desc').limit(20).get()
                .then(snap => {
                    setTaskScores(snap.docs.map(d => d.data().score));
                }).catch(e => console.error(e));
        }
    }, [step, isTask, initialRecord.taskId]);

    const handleDragStart = (e) => setIsDragging(true);

    useEffect(() => {
        const handleDragMove = (e) => {
            if (!isDragging || !splitContainerRef.current) return;
            const containerRect = splitContainerRef.current.getBoundingClientRect();
            let newRatio;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            if (layoutMode === 'horizontal') {
                const offsetX = clientX - containerRect.left;
                newRatio = (offsetX / containerRect.width) * 100;
            } else {
                const offsetY = clientY - containerRect.top;
                newRatio = (offsetY / containerRect.height) * 100;
            }
            
            newRatio = Math.max(20, Math.min(newRatio, 80));
            setSplitRatio(newRatio);
        };

        const handleDragEnd = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchend', handleDragEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, layoutMode]);

    const handleStartTest = () => {
        if (numQuestions < 1 || numQuestions > 100) return showAlert('題數限制為 1-100 題！');
        if (hasTimer && (timeLimit < 1 || timeLimit > 999)) return showAlert('計時時間請設定在 1 到 999 分鐘之間。');
        
        const initialAnswers = Array(Number(numQuestions)).fill('');
        const initialStarred = Array(Number(numQuestions)).fill(false);
        setUserAnswers(initialAnswers);
        setStarred(initialStarred);

        const finalFileUrl = inputType === 'url' ? questionFileUrl.trim() : '';
        const finalQuestionText = inputType === 'text' ? questionText : '';
        setQuestionFileUrl(finalFileUrl);
        setQuestionText(finalQuestionText);

        window.db.collection('users').doc(currentUser.uid).collection('quizzes').add({
            testName, numQuestions, userAnswers: initialAnswers, starred: initialStarred,
            correctAnswersInput: '',
            questionFileUrl: finalFileUrl,
            questionText: finalQuestionText,
            hasTimer: hasTimer,
            timeLimit: hasTimer ? Number(timeLimit) : null,
            timeRemaining: hasTimer ? Number(timeLimit) * 60 : null,
            folder: folder,
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
        }).then(docRef => {
            setQuizId(docRef.id);
            if (hasTimer) {
                timeRemainingRef.current = Number(timeLimit) * 60;
                setDisplayTime(timeRemainingRef.current);
                setIsTimeUp(false);
            }
            setStep('answering');
        }).catch(e => showAlert('建立紀錄失敗：' + e.message));
    };

    const handleRetake = () => {
        showConfirm("確定要再做一次嗎？\n先前的分數將保留在您的歷史紀錄中，系統將為您清空目前答案，不產生新試卷檔案。", () => {
            const initialAnswers = Array(Number(numQuestions)).fill('');
            const initialStarred = Array(Number(numQuestions)).fill(false);
            
            const historyEntry = { 
                score: results.score, 
                correctCount: results.correctCount, 
                total: results.total, 
                date: new Date().toISOString() 
            };
            
            window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).update({
                userAnswers: initialAnswers,
                starred: initialStarred,
                results: window.firebase.firestore.FieldValue.delete(),
                history: window.firebase.firestore.FieldValue.arrayUnion(historyEntry)
            }).then(() => {
                setUserAnswers(initialAnswers);
                setStarred(initialStarred);
                setResults(null);
                setStep('answering');
                
                if (hasTimer) {
                    timeRemainingRef.current = Number(timeLimit) * 60;
                    setDisplayTime(timeRemainingRef.current);
                    setIsTimeUp(false);
                }
                showAlert("✅ 已重新開始測驗！");
            }).catch(e => showAlert('重測設定失敗：' + e.message));
        });
    };

    const handleUpdateFileUrl = () => {
        showPrompt(
            "請貼上新的試卷網址 (留空則為移除網址)：\n注意：更新後將同步給所有已下載的好友！", 
            questionFileUrl || "", 
            async (url) => {
                const newUrl = url ? url.trim() : "";
                setQuestionFileUrl(newUrl);
                if (newUrl !== "") setPreviewOpen(true);

                if (!isShared && quizId) {
                    try {
                        const myDoc = await window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).get();
                        const latestSharedTo = myDoc.data()?.sharedTo || [];
                        
                        if (latestSharedTo.length > 0) {
                            const promises = latestSharedTo.map(target => {
                                return window.db.collection('users').doc(target.uid).collection('quizzes').doc(target.quizId).update({ questionFileUrl: newUrl });
                            });
                            await Promise.all(promises);
                            showAlert('✅ 試卷網址已更新，並同步給所有好友！');
                        }
                    } catch(e) {
                        console.error("同步網址失敗", e);
                    }
                }
            }
        );
    };

    const handleSyncQuestionText = async () => {
        if (isShared) return;
        try {
            const myDoc = await window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).get();
            const latestSharedTo = myDoc.data()?.sharedTo || [];
            
            if (latestSharedTo.length > 0) {
                const promises = latestSharedTo.map(target => {
                    return window.db.collection('users').doc(target.uid).collection('quizzes').doc(target.quizId).update({ questionText: questionText });
                });
                await Promise.all(promises);
                showAlert('✅ 試題文字已同步給所有已下載的好友！');
            } else {
                showAlert('ℹ️ 目前沒有好友下載這份試卷，不需要同步。');
            }
        } catch(e) {
            console.error("同步文字失敗", e);
            showAlert('同步文字失敗：' + e.message);
        }
    };

    const handleAnswerSelect = (idx, opt) => {
        if(isTimeUp) return;
        const newAns = [...userAnswers];
        newAns[idx] = newAns[idx] === opt ? '' : opt;
        setUserAnswers(newAns);
    };

    const toggleStar = (idx) => {
        if(isTimeUp) return;
        const newStar = [...starred];
        newStar[idx] = !newStar[idx];
        setStarred(newStar);
    };

    const handleGrade = async () => {
        const cleanKey = correctAnswersInput.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (!cleanKey && !isTask) return showAlert('請輸入標準答案後再批改！');
        
        let correctCount = 0;
        const data = userAnswers.map((ans, idx) => {
            const key = cleanKey[idx] || '-';
            const isCorrect = ans === key && ans !== '';
            if (isCorrect) correctCount++;
            return { number: idx + 1, userAns: ans || '未填', correctAns: key, isCorrect, isStarred: starred[idx] };
        });

        const scoreVal = Math.round((correctCount/numQuestions)*100);
        const newResults = { score: scoreVal, correctCount, total: numQuestions, data };
        setResults(newResults);
        setStep('results');

        try {
            await window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).update({
                correctAnswersInput: cleanKey,
                results: newResults
            });

            // --- 新增：如果尾綴帶有 [#mnst] 則發布到公用任務牆 ---
            if (testName.includes('[#mnst]')) {
                let category = '模擬試題 (其他)';
                if (testName.includes('藥物分析')) category = '1. 藥物分析學';
                else if (testName.includes('生藥')) category = '2. 生藥學';
                else if (testName.includes('中藥')) category = '3. 中藥學';
                else if (testName.includes('藥物化學') || testName.includes('藥理')) category = '4. 藥物化學與藥理學';
                else if (testName.includes('生物藥劑')) category = '6. 生物藥劑學';
                else if (testName.includes('藥劑')) category = '5. 藥劑學';

                await window.db.collection('publicTasks').doc(quizId).set({
                    testName, numQuestions, questionFileUrl, questionText, 
                    correctAnswersInput: cleanKey, hasTimer, timeLimit, category,
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // --- 新增：如果是領取的任務，判斷是否為首次完成並給予對應獎勵 ---
            if (isTask && !initialRecord.results) {
                const mcData = userProfile.mcData || { diamonds: 0, level: 1, exp: 0, hunger: 10, items: [], cats: 0 };
                const rewardDiamonds = scoreVal >= 60 ? 200 : 30;

                let newExp = (mcData.exp || 0) + (scoreVal >= 60 ? 30 : 10);
                let newLevel = mcData.level || 1;
                while (newExp >= newLevel * 20) {
                    newExp -= newLevel * 20;
                    newLevel += 1;
                }

                await window.db.collection('users').doc(currentUser.uid).update({
                    mcData: { ...mcData, diamonds: (mcData.diamonds || 0) + rewardDiamonds, exp: newExp, level: newLevel }
                });

                // 將成績寫入任務牆讓大家看
                if (initialRecord.taskId) {
                    window.db.collection('publicTasks').doc(initialRecord.taskId).collection('scores').add({
                        score: scoreVal,
                        timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                if (scoreVal >= 60) {
                    showAlert(`🎉 恭喜任務挑戰成功 (及格)！\n獲得 ${rewardDiamonds} 💎 與經驗值！`);
                } else {
                    showAlert(`💪 任務完成！\n雖然不及格，但仍獲得安慰獎 ${rewardDiamonds} 💎，下次再接再厲！`);
                }
            } 
            // 處理一般的好友分享獎勵
            else if (isShared && !initialRecord.results && !isTask) {
                const mcData = userProfile.mcData || { diamonds: 0, level: 1, exp: 0, hunger: 10, items: [], cats: 0 };
                const today = new Date().toISOString().split('T')[0];
                let rewardData = mcData.rewardData || { date: '', count: 0 };
                
                if (rewardData.date !== today) {
                    rewardData = { date: today, count: 0 };
                }

                if (rewardData.count < 2) {
                    rewardData.count += 1;
                    let newExp = (mcData.exp || 0) + 15;
                    let newLevel = mcData.level || 1;
                    if (newExp >= newLevel * 20) {
                        newExp -= newLevel * 20;
                        newLevel += 1;
                    }
                    await window.db.collection('users').doc(currentUser.uid).update({
                        mcData: { ...mcData, diamonds: (mcData.diamonds || 0) + 50, exp: newExp, level: newLevel, rewardData }
                    });
                    showAlert(`🎉 批改完成！這是一份好友分享的試卷，你獲得了 50 💎 與 15 EXP 做為獎勵！\n(今日領取次數: ${rewardData.count}/2)`);
                } else {
                    showAlert(`🎉 批改完成！這是一份好友分享的試卷。\n(⚠️ 今日測驗鑽石獎勵已達上限 2/2，因此不再發放獎勵)`);
                }
            }

            if (!isShared && !isTask) {
                const myDoc = await window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).get();
                const latestSharedTo = myDoc.data()?.sharedTo || [];
                
                if (latestSharedTo.length > 0) {
                    const promises = latestSharedTo.map(async (target) => {
                        const targetRef = window.db.collection('users').doc(target.uid).collection('quizzes').doc(target.quizId);
                        const doc = await targetRef.get();
                        if (doc.exists) {
                            const targetData = doc.data();
                            if (targetData.results && targetData.userAnswers) {
                                let tCorrectCount = 0;
                                const tData = targetData.userAnswers.map((ans, idx) => {
                                    const key = cleanKey[idx] || '-';
                                    const isCorrect = ans === key && ans !== '';
                                    if (isCorrect) tCorrectCount++;
                                    return { number: idx + 1, userAns: ans || '未填', correctAns: key, isCorrect, isStarred: targetData.starred ? targetData.starred[idx] : false };
                                });
                                const tResults = { score: Math.round((tCorrectCount/targetData.numQuestions)*100), correctCount: tCorrectCount, total: targetData.numQuestions, data: tData };
                                return targetRef.update({ correctAnswersInput: cleanKey, results: tResults });
                            } else {
                                return targetRef.update({ correctAnswersInput: cleanKey });
                            }
                        }
                    });
                    await Promise.all(promises);
                    showAlert('✅ 已完成批改！\n下載過這份試卷的好友，他們的標準答案與成績也已經自動同步更新囉！');
                }
            }
        } catch(e) {
            console.error("同步更新失敗", e);
        }
    };

    const handleResetProgress = () => {
            showConfirm("確定要刪除這份試卷嗎？此動作無法復原！", () => {
            window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).delete()
            .then(() => onBackToDashboard())
            .catch(e => showAlert('刪除失敗：' + e.message));
            });
    };

    const shareScoreToFriend = (friend) => {
        const chatId = [currentUser.uid, friend.uid].sort().join('_');
        window.db.collection('chats').doc(chatId).collection('messages').add({
            senderId: currentUser.uid,
            senderName: userProfile.displayName,
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
            type: 'score_share', 
            read: false,
            scoreData: {
                testName: testName,
                score: results.score,
                correctCount: results.correctCount,
                total: results.total
            },
            quizData: {
                ownerId: currentUser.uid,
                quizId: quizId,
                testName: testName,
                questionFileUrl: questionFileUrl || '',
                questionText: questionText || '',
                correctAnswersInput: correctAnswersInput || ''
            }
        }).then(() => {
            window.db.collection('users').doc(friend.uid).set({
                unreadChats: { [currentUser.uid]: true }
            }, { merge: true });
            showAlert('✅ 已成功向 ' + friend.name + ' 炫耀戰績，對方可以直接下載試卷！');
            setShowShareScoreModal(false);
        }).catch(e => showAlert('炫耀失敗：' + e.message));
    };

    if (step === 'setup') return (
        <div className="flex flex-col items-center p-4 h-[100dvh] overflow-y-auto relative custom-scrollbar bg-gray-100 dark:bg-gray-900">
            <button onClick={onBackToDashboard} className="absolute top-6 left-6 text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-bold z-10 transition-colors">← 返回列表</button>
            <div className="bg-white dark:bg-gray-800 p-8 shadow-md w-full max-w-sm no-round border border-gray-200 dark:border-gray-700 mt-10 mb-10 transition-colors">
                <h1 className="text-xl font-bold mb-6 border-b border-gray-200 dark:border-gray-700 pb-2 tracking-tight dark:text-white">新增測驗</h1>
                
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">存放資料夾</label>
                <select value={folder} onChange={e => setFolder(e.target.value)} className="w-full mb-4 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm cursor-pointer">
                    {userFolders.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">測驗名稱</label>
                <input type="text" placeholder="例如: 藥理學期中考" className="w-full mb-4 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm" value={testName} onChange={e => setTestName(e.target.value)} onFocus={handleFocusScroll} />
                
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">題數 (1-100)</label>
                <input type="number" placeholder="50" className="w-full mb-4 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} onFocus={handleFocusScroll} />
                
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">試題來源 (單選)</label>
                <div className="flex space-x-4 mb-4 dark:text-white">
                    <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-black dark:hover:text-gray-300">
                        <input type="radio" checked={inputType === 'url'} onChange={() => setInputType('url')} className="w-4 h-4 accent-black dark:accent-white" />
                        <span>公開網址</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-black dark:hover:text-gray-300">
                        <input type="radio" checked={inputType === 'text'} onChange={() => setInputType('text')} className="w-4 h-4 accent-black dark:accent-white" />
                        <span>純文字</span>
                    </label>
                </div>

                {inputType === 'url' ? (
                    <input type="text" placeholder="請貼上 Google Drive 等連結" className="w-full mb-6 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm" value={questionFileUrl} onChange={e => setQuestionFileUrl(e.target.value)} onFocus={handleFocusScroll} />
                ) : (
                    <textarea placeholder="請貼上試題純文字..." className="w-full h-32 mb-6 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm custom-scrollbar" value={questionText} onChange={e => setQuestionText(e.target.value)} onFocus={handleFocusScroll} />
                )}
                
                <div className="mb-6 border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700 no-round">
                    <label className="flex items-center space-x-2 font-bold cursor-pointer text-sm dark:text-white">
                        <input type="checkbox" checked={hasTimer} onChange={e => setHasTimer(e.target.checked)} className="w-4 h-4 accent-black dark:accent-white" />
                        <span>⏱ 開啟測驗倒數計時</span>
                    </label>
                    {hasTimer && (
                        <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <span className="text-sm text-gray-600 dark:text-gray-300">測驗時間：</span>
                            <input type="number" min="1" max="999" className="w-16 p-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-center text-sm" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} onFocus={handleFocusScroll} />
                            <span className="text-sm text-gray-600 dark:text-gray-300">分鐘</span>
                        </div>
                    )}
                </div>

                <button onClick={handleStartTest} className="w-full bg-black dark:bg-gray-200 text-white dark:text-black p-3 font-bold no-round hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors">開始作答</button>
            </div>
        </div>
    );

    if (step === 'answering') return (
        <div className="flex flex-col h-[100dvh] bg-gray-100 dark:bg-gray-900 p-2 sm:p-4 w-full overflow-hidden transition-colors">
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center no-round gap-3 shrink-0 z-10 transition-colors">
                <div className="flex items-center flex-grow mr-2 w-full md:w-auto overflow-hidden">
                    <button onClick={onBackToDashboard} className="mr-3 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-bold text-sm whitespace-nowrap px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">← 返回</button>
                    <div className="overflow-hidden flex-grow flex flex-col justify-center">
                        <div className="flex items-center space-x-2">
                            <h2 className="font-bold truncate text-base dark:text-white">{renderTestName(testName)}</h2>
                            {hasTimer && (
                                <span className={`font-mono font-bold px-1.5 py-0.5 no-round border ${isTimeUp ? 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 border-red-200 dark:border-red-700 animate-pulse' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'} text-xs shrink-0`}>
                                    {isTimeUp ? '時間到' : `⏱ ${formatTime(displayTime)}`}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-2">
                            <span>進度: <span className="font-bold text-black dark:text-white">{userAnswers.filter(a=>a).length}</span> / {numQuestions}</span>
                            {starredIndices.length > 0 && (
                                <span className="text-orange-500 dark:text-orange-400 font-bold flex items-center bg-orange-50 dark:bg-gray-700 px-1.5 py-0.5 rounded max-w-[150px] sm:max-w-xs overflow-hidden">
                                    <span className="mr-1 shrink-0">★</span> 
                                    <span className="truncate">{starredIndices.join(', ')}</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
                    {(questionFileUrl || questionText) && previewOpen && (
                        <button onClick={() => setLayoutMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')} className="bg-gray-100 dark:bg-gray-700 text-black dark:text-white px-3 py-1.5 no-round font-bold border border-gray-200 dark:border-gray-600 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            {layoutMode === 'horizontal' ? '🔄 切換上下/左右' : '🔄 切換上下/左右'}
                        </button>
                    )}

                    {!isShared && !isTask && !questionText && (
                        <button onClick={handleUpdateFileUrl} className={`${questionFileUrl ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800' : 'bg-orange-50 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-800'} px-3 py-1.5 border no-round font-bold text-xs transition-colors whitespace-nowrap`}>
                            {questionFileUrl ? '🔗 修改/移除網址' : '📎 貼上試卷網址'}
                        </button>
                    )}

                    {(questionFileUrl || questionText) && (
                        <button onClick={() => setPreviewOpen(!previewOpen)} className="bg-gray-100 dark:bg-gray-700 text-black dark:text-white px-3 py-1.5 no-round font-bold border border-gray-200 dark:border-gray-600 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            {previewOpen ? '👀 關閉預覽' : '👀 開啟預覽'}
                        </button>
                    )}
                    
                    <button onClick={handleResetProgress} className="bg-gray-50 dark:bg-gray-700 text-red-400 dark:text-red-400 px-4 py-1.5 no-round font-bold hover:bg-red-50 dark:hover:bg-gray-600 hover:text-red-600 dark:hover:text-red-300 border border-transparent hover:border-red-100 dark:hover:border-gray-500 text-xs hidden md:block transition-colors">刪除</button>
                    <button onClick={() => setStep('grading')} className="bg-black dark:bg-gray-200 text-white dark:text-black px-6 py-1.5 no-round font-bold hover:bg-gray-800 dark:hover:bg-gray-300 text-sm shadow-sm transition-colors">交卷對答案</button>
                </div>
            </div>
            
            <div 
                ref={splitContainerRef}
                className={`flex-grow flex ${layoutMode === 'horizontal' ? 'flex-row' : 'flex-col'} overflow-hidden relative w-full mt-2 sm:mt-4`}
            >
                {isDragging && (
                    <div className="absolute inset-0 z-50" style={{ cursor: layoutMode === 'horizontal' ? 'col-resize' : 'row-resize' }}></div>
                )}

                {(questionFileUrl || questionText) && previewOpen && (
                    <div 
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round flex flex-col shrink-0 transition-colors"
                        style={{ [layoutMode === 'horizontal' ? 'width' : 'height']: `${splitRatio}%` }}
                    >
                        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-2 flex justify-between items-center shrink-0 transition-colors">
                            <span className="font-bold text-xs text-gray-600 dark:text-gray-300 flex items-center"><span className="text-sm mr-1">📄</span> 試卷預覽區</span>
                            <div className="flex space-x-3 items-center">
                                {/* 新增功能: PDF 縮放 */}
                                {questionFileUrl && (
                                    <div className="flex space-x-1 items-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                                        <button onClick={() => setPdfZoom(z => Math.max(0.5, z - 0.2))} className="px-2 font-bold text-gray-600 dark:text-gray-200">-</button>
                                        <span className="text-[10px] w-8 text-center font-bold dark:text-gray-200">{Math.round(pdfZoom * 100)}%</span>
                                        <button onClick={() => setPdfZoom(z => Math.min(3, z + 0.2))} className="px-2 font-bold text-gray-600 dark:text-gray-200">+</button>
                                    </div>
                                )}
                                {!isShared && !isTask && questionText && (
                                    <button onClick={handleSyncQuestionText} className="text-xs bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-600 px-2 py-1 no-round font-bold hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors" title="將文字同步給已下載的好友">
                                        🔄 同步文字
                                    </button>
                                )}
                                {questionFileUrl && (
                                    <a href={questionFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold underline">在新分頁開啟</a>
                                )}
                            </div>
                        </div>
                        <div className="flex-grow w-full relative bg-gray-200 dark:bg-gray-800 flex flex-col overflow-auto">
                            {/* 新增功能: 套用 PDF 縮放 */}
                            {questionFileUrl && (
                                <div style={{ transform: `scale(${pdfZoom})`, transformOrigin: 'top left', width: `${100/pdfZoom}%`, height: `${100/pdfZoom}%` }} className={`relative shrink-0`}>
                                    <iframe src={getEmbedUrl(questionFileUrl)} className="absolute inset-0 w-full h-full border-0 bg-white" allow="autoplay" allowFullScreen></iframe>
                                </div>
                            )}
                            {questionText && (
                                <div className={`w-full relative bg-white dark:bg-gray-800 flex flex-col flex-grow h-full`}>
                                    <textarea 
                                        className={`absolute inset-0 w-full h-full p-4 resize-none outline-none custom-scrollbar text-sm leading-relaxed ${isShared || isTask ? 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300' : 'bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-inset focus:ring-black dark:focus:ring-white'}`}
                                        style={{ whiteSpace: 'pre-wrap' }}
                                        value={questionText}
                                        onChange={e => setQuestionText(e.target.value)}
                                        readOnly={isShared || isTask}
                                        placeholder={isShared || isTask ? "沒有提供試題文字" : "在此輸入或貼上試題純文字..."}
                                        onFocus={handleFocusScroll}
                                    ></textarea>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(questionFileUrl || questionText) && previewOpen && (
                    <div 
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        className={`${layoutMode === 'horizontal' ? 'w-4 h-full cursor-col-resize flex-col' : 'h-4 w-full cursor-row-resize flex-row'} bg-gray-100 dark:bg-gray-900 hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center shrink-0 z-40 transition-colors active:bg-blue-300`}
                    >
                        <div className={`${layoutMode === 'horizontal' ? 'w-1 h-8' : 'h-1 w-8'} bg-gray-400 dark:bg-gray-600 rounded-full`}></div>
                    </div>
                )}

                <div className={`flex-grow flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round overflow-hidden transition-colors`}>
                    <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 shrink-0 flex justify-between items-center transition-colors">
                        <span className="font-bold text-xs text-gray-600 dark:text-gray-300">✏️ 答案卡 {isTimeUp && <span className="text-red-500 ml-2">(已鎖定)</span>}</span>
                    </div>
                    <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 sm:p-6 custom-scrollbar bg-white dark:bg-gray-800 transition-colors">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px 16px' }}>
                            {userAnswers.map((ans, i) => (
                                <div key={i} className="break-avoid flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 pr-2 transition-colors">
                                    <div className="flex items-center space-x-2 shrink-0 w-14">
                                        <span className="font-mono text-sm font-bold text-gray-400 dark:text-gray-500">{i+1}.</span>
                                        <button 
                                            disabled={isTimeUp}
                                            onClick={() => toggleStar(i)} 
                                            className={`text-sm focus:outline-none ${starred[i] ? 'text-orange-500' : 'text-gray-200 dark:text-gray-600'} ${isTimeUp ? 'cursor-not-allowed opacity-50' : 'hover:text-gray-300 dark:hover:text-gray-500'}`}
                                        >★</button>
                                    </div>
                                    <div className="flex space-x-1 shrink-0">
                                        {['A','B','C','D'].map(o => (
                                            <button 
                                                key={o} 
                                                disabled={isTimeUp}
                                                onClick={() => handleAnswerSelect(i, o)} 
                                                className={`w-8 h-8 text-sm font-bold border-2 no-round transition-all 
                                                    ${ans === o ? 'bg-black dark:bg-gray-200 border-black dark:border-gray-200 text-white dark:text-black scale-105 shadow-sm' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-400'}
                                                    ${isTimeUp ? 'locked-btn' : 'hover:border-gray-500 dark:hover:border-gray-400'}`}
                                            >{o}</button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );

    if (step === 'grading') return (
        <div className="flex flex-col min-h-[100dvh] items-center justify-center p-4 relative py-10 overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors">
            <button onClick={() => setStep(results ? 'results' : 'answering')} className="absolute top-6 left-6 text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-bold z-10 transition-colors">
                ← 返回{results ? '結果' : '作答'}
            </button>
            <div className="bg-white dark:bg-gray-800 p-8 shadow-md w-full max-w-lg no-round border border-gray-200 dark:border-gray-700 mt-10 transition-colors">
                <h2 className="font-bold mb-4 text-lg dark:text-white">
                    {isShared || isTask ? '標準答案 (由出題者提供)' : '輸入標準答案'}
                </h2>
                <textarea 
                    className={`w-full h-40 p-3 border border-gray-300 dark:border-gray-600 no-round font-mono mb-4 outline-none tracking-widest text-lg uppercase custom-scrollbar ${isShared || isTask ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed' : 'bg-white dark:bg-gray-700 text-black dark:text-white focus:border-black dark:focus:border-white'}`} 
                    placeholder="例如: ABCD..." 
                    value={correctAnswersInput} 
                    onChange={e => !(isShared || isTask) && setCorrectAnswersInput(e.target.value)} 
                    onFocus={handleFocusScroll}
                    readOnly={isShared || isTask}
                ></textarea>
                {(isShared || isTask) && <p className="text-orange-500 dark:text-orange-400 text-xs font-bold mb-4 -mt-2">🔒 此為好友分享或任務試卷解答，為確保成績準確已鎖定編輯。</p>}
                
                <button onClick={handleGrade} className="w-full bg-black dark:bg-gray-200 text-white dark:text-black p-3 font-bold no-round hover:bg-gray-800 dark:hover:bg-gray-300 text-lg transition-colors">開始批改</button>
            </div>
        </div>
    );

    if (step === 'results') return (
        <div className="flex flex-col h-[100dvh] bg-gray-100 dark:bg-gray-900 p-2 sm:p-4 w-full overflow-hidden transition-colors">
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center no-round gap-3 shrink-0 z-10 transition-colors">
                <div className="flex items-center flex-grow mr-2 w-full md:w-auto overflow-hidden">
                    <h2 className="font-bold truncate text-base pr-4 dark:text-white">{renderTestName(testName)} - 測驗結果</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
                    {!isShared && !isTask && (
                        <button onClick={async () => {
                            if (shortCode) {
                                navigator.clipboard.writeText(shortCode);
                                showAlert(`✅ 測驗代碼已複製！\n\n您的代碼：\n${shortCode}\n\n將此代碼傳給朋友，他們可在題庫點擊「📥 輸入代碼」直接下載。`);
                            } else {
                                const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                                try {
                                    await window.db.collection('shareCodes').doc(newCode).set({ ownerId: currentUser.uid, quizId: quizId });
                                    await window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).update({ shortCode: newCode });
                                    setShortCode(newCode);
                                    navigator.clipboard.writeText(newCode);
                                    showAlert(`✅ 測驗代碼已生成並複製！\n\n您的代碼：\n${newCode}\n\n將此代碼傳給朋友，他們可在題庫點擊「📥 輸入代碼」直接下載。`);
                                } catch (e) {
                                    showAlert('生成代碼失敗：' + e.message);
                                }
                            }
                        }} className="text-sm font-bold bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-4 py-1.5 no-round border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800 whitespace-nowrap transition-colors">🔑 複製代碼</button>
                    )}

                    {!isShared && !isTask && (
                        <button onClick={() => setStep('grading')} className="text-sm font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-1.5 no-round border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap transition-colors">✏️ 修改解答</button>
                    )}

                    {!isShared && !isTask && !questionText && (
                        <button onClick={handleUpdateFileUrl} className={`${questionFileUrl ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800' : 'bg-orange-50 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-800'} px-3 py-1.5 border no-round font-bold text-xs transition-colors whitespace-nowrap`}>
                            {questionFileUrl ? '🔗 修改/移除網址' : '📎 貼上試卷網址'}
                        </button>
                    )}

                    {(questionFileUrl || questionText) && previewOpen && (
                        <button onClick={() => setLayoutMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')} className="bg-gray-100 dark:bg-gray-700 text-black dark:text-white px-3 py-1.5 no-round font-bold border border-gray-200 dark:border-gray-600 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            {layoutMode === 'horizontal' ? '🔄 切換上下/左右' : '🔄 切換上下/左右'}
                        </button>
                    )}

                    {(questionFileUrl || questionText) && (
                        <button onClick={() => setPreviewOpen(!previewOpen)} className="bg-gray-100 dark:bg-gray-700 text-black dark:text-white px-3 py-1.5 no-round font-bold border border-gray-200 dark:border-gray-600 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            {previewOpen ? '👀 暫時關閉預覽' : '👀 開啟預覽'}
                        </button>
                    )}
                    
                    <button onClick={() => setShowShareScoreModal(true)} className="text-sm font-bold bg-yellow-50 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 px-4 py-1.5 no-round border border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-800 whitespace-nowrap transition-colors">📢 炫耀並分享</button>
                    <button onClick={handleRetake} className="text-sm font-bold bg-orange-50 dark:bg-orange-900 text-orange-600 dark:text-orange-400 px-4 py-1.5 no-round border border-orange-200 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-800 whitespace-nowrap transition-colors">再做一次</button>
                    <button onClick={onBackToDashboard} className="text-sm font-bold bg-black dark:bg-gray-200 text-white dark:text-black px-4 py-1.5 no-round hover:bg-gray-800 dark:hover:bg-gray-300 whitespace-nowrap transition-colors">返回列表</button>
                </div>
            </div>
            
            <div 
                ref={splitContainerRef}
                className={`flex-grow flex ${layoutMode === 'horizontal' ? 'flex-row' : 'flex-col'} overflow-hidden relative w-full mt-2 sm:mt-4`}
            >
                {isDragging && (
                    <div className="absolute inset-0 z-50" style={{ cursor: layoutMode === 'horizontal' ? 'col-resize' : 'row-resize' }}></div>
                )}

                {(questionFileUrl || questionText) && previewOpen && (
                    <div 
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round flex flex-col shrink-0 transition-colors"
                        style={{ [layoutMode === 'horizontal' ? 'width' : 'height']: `${splitRatio}%` }}
                    >
                        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-2 flex justify-between items-center shrink-0 transition-colors">
                            <span className="font-bold text-xs text-gray-600 dark:text-gray-300 flex items-center"><span className="text-sm mr-1">📄</span> 試卷預覽區</span>
                            <div className="flex space-x-3 items-center">
                                {/* 新增功能: PDF 縮放 */}
                                {questionFileUrl && (
                                    <div className="flex space-x-1 items-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                                        <button onClick={() => setPdfZoom(z => Math.max(0.5, z - 0.2))} className="px-2 font-bold text-gray-600 dark:text-gray-200">-</button>
                                        <span className="text-[10px] w-8 text-center font-bold dark:text-gray-200">{Math.round(pdfZoom * 100)}%</span>
                                        <button onClick={() => setPdfZoom(z => Math.min(3, z + 0.2))} className="px-2 font-bold text-gray-600 dark:text-gray-200">+</button>
                                    </div>
                                )}
                                {!isShared && !isTask && questionText && (
                                    <button onClick={handleSyncQuestionText} className="text-xs bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-600 px-2 py-1 no-round font-bold hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors" title="將文字同步給已下載的好友">
                                        🔄 同步文字
                                    </button>
                                )}
                                {questionFileUrl && (
                                    <a href={questionFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold underline">在新分頁開啟</a>
                                )}
                            </div>
                        </div>
                        <div className="flex-grow w-full relative bg-gray-200 dark:bg-gray-800 flex flex-col overflow-auto">
                            {/* 新增功能: 套用 PDF 縮放 */}
                            {questionFileUrl && (
                                <div style={{ transform: `scale(${pdfZoom})`, transformOrigin: 'top left', width: `${100/pdfZoom}%`, height: `${100/pdfZoom}%` }} className={`relative shrink-0`}>
                                    <iframe src={getEmbedUrl(questionFileUrl)} className="absolute inset-0 w-full h-full border-0 bg-white" allow="autoplay" allowFullScreen></iframe>
                                </div>
                            )}
                            {questionText && (
                                <div className={`w-full relative bg-white dark:bg-gray-800 flex flex-col flex-grow h-full`}>
                                    <textarea 
                                        className={`absolute inset-0 w-full h-full p-4 resize-none outline-none custom-scrollbar text-sm leading-relaxed ${isShared || isTask ? 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300' : 'bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-inset focus:ring-black dark:focus:ring-white'}`}
                                        style={{ whiteSpace: 'pre-wrap' }}
                                        value={questionText}
                                        onChange={e => setQuestionText(e.target.value)}
                                        readOnly={isShared || isTask}
                                        placeholder={isShared || isTask ? "沒有提供試題文字" : "在此輸入或貼上試題純文字..."}
                                        onFocus={handleFocusScroll}
                                    ></textarea>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(questionFileUrl || questionText) && previewOpen && (
                    <div 
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        className={`${layoutMode === 'horizontal' ? 'w-4 h-full cursor-col-resize flex-col' : 'h-4 w-full cursor-row-resize flex-row'} bg-gray-100 dark:bg-gray-900 hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center shrink-0 z-40 transition-colors active:bg-blue-300`}
                    >
                        <div className={`${layoutMode === 'horizontal' ? 'w-1 h-8' : 'h-1 w-8'} bg-gray-400 dark:bg-gray-600 rounded-full`}></div>
                    </div>
                )}

                <div className={`flex-grow flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round overflow-hidden transition-colors`}>
                    <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-colors">
                        <div className="flex items-center space-x-3">
                            <span className="font-bold text-xs text-gray-600 dark:text-gray-300 flex items-center whitespace-nowrap">
                                <span className="text-sm mr-1">📝</span> 批改結果：
                                <span className={`text-xl ml-2 font-black ${results.score >= 60 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{results.score} 分</span>
                                <span className="text-xs font-normal text-gray-500 ml-2 mt-1">(答對 {results.correctCount}/{results.total} 題)</span>
                            </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs shrink-0 w-full sm:w-auto">
                            <label className="flex items-center space-x-1.5 cursor-pointer hover:text-black dark:hover:text-white dark:text-gray-300">
                                <input type="checkbox" checked={showOnlyWrong} onChange={e => setShowOnlyWrong(e.target.checked)} className="w-3.5 h-3.5 accent-black dark:accent-white" />
                                <span className="font-bold">只看錯題</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer hover:text-black dark:hover:text-white dark:text-gray-300">
                                <input type="checkbox" checked={showOnlyStarred} onChange={e => setShowOnlyStarred(e.target.checked)} className="w-3.5 h-3.5 accent-black dark:accent-white" />
                                <span className="font-bold text-orange-600 dark:text-orange-400">只看星號</span>
                            </label>
                        </div>
                    </div>

                    {isTask && taskScores && (
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-gray-900 shrink-0">
                            <h3 className="font-bold text-xs text-blue-600 dark:text-blue-400 mb-2">📊 其他挑戰者成績 (匿名)</h3>
                            <div className="flex flex-wrap gap-2">
                                {taskScores.length > 0 ? taskScores.map((s, i) => (
                                    <span key={i} className={`px-1.5 py-0.5 text-xs font-bold border rounded ${s >= 60 ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700' : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700'}`}>{s} 分</span>
                                )) : <span className="text-xs text-gray-500">尚無其他挑戰者成績</span>}
                            </div>
                        </div>
                    )}

                    <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 sm:p-6 custom-scrollbar bg-white dark:bg-gray-800 transition-colors">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px 16px' }}>
                            {results.data.filter(item => {
                                if (showOnlyWrong && item.isCorrect) return false;
                                if (showOnlyStarred && !item.isStarred) return false;
                                return true;
                            }).map((item, i) => (
                                <div key={i} className={`break-avoid flex items-center justify-between p-3 border border-gray-100 dark:border-gray-700 no-round transition-colors ${item.isCorrect ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}>
                                    <div className="flex items-center space-x-3 shrink-0">
                                        <div className="flex flex-col items-center justify-center w-6">
                                            {item.isStarred && <span className="text-orange-500 text-xs mb-0.5">★</span>}
                                            <span className={`font-mono text-sm font-bold ${item.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{item.number}.</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end space-y-1">
                                        <div className="flex items-center space-x-2 text-sm">
                                            <span className="text-gray-500 dark:text-gray-400 text-xs font-bold">你的答案</span>
                                            <span className={`font-black text-base w-6 text-center ${item.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{item.userAns}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-sm">
                                            <span className="text-gray-500 dark:text-gray-400 text-xs font-bold">正確答案</span>
                                            <span className="font-black text-base w-6 text-center text-black dark:text-white">{item.correctAns}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {showShareScoreModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-sm no-round shadow-xl">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">🏆 選擇要炫耀並分享的好友</h3>
                        <div className="max-h-60 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700 custom-scrollbar">
                            {(userProfile.friends || []).length === 0 ? <p className="p-4 text-sm text-gray-400">目前還沒有好友喔</p> : null}
                            {(userProfile.friends || []).map(f => (
                                <button key={f.uid} onClick={() => shareScoreToFriend(f)} className="w-full text-left p-3 hover:bg-yellow-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 font-bold text-sm transition-colors dark:text-white">
                                    {f.name} <span className="text-gray-400 dark:text-gray-400 font-normal ml-2">{f.email}</span>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowShareScoreModal(false)} className="w-full bg-gray-100 dark:bg-gray-700 text-black dark:text-white p-2 font-bold no-round hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
                    </div>
                </div>
            )}
        </div>
    );
}
