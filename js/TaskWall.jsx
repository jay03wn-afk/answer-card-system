// --- 任務牆看板組件 (含國考題金色分類與分析) ---
// --- 任務牆看板組件 (含國考題金色分類與分析) ---
// 🚀 從全域引入共用組件，防止 React 找不到變數而引發白屏崩潰！
const { safeDecompress, LoadingSpinner, parseSmilesToHtml, ContentEditableEditor } = window;
const cleanQuizNameLocal = window.cleanQuizName;
const renderTestNameLocal = window.renderTestName;

// --- 任務牆看板組件 (全新左右排版架構) ---
function TaskWallDashboard({ user, showAlert, showConfirm, onContinueQuiz }) {
    const { useState, useEffect } = React;
    const [opTasks, setOpTasks] = useState({});
    const [mnTasks, setMnTasks] = useState({});
    const [myTasks, setMyTasks] = useState({}); 
    const [loading, setLoading] = useState(true);
    const [taskLimit, setTaskLimit] = useState(5); 
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);

    useEffect(() => {


        const unsubTasks = window.db.collection('publicTasks')
            .orderBy('createdAt', 'desc')
            .limit(taskLimit)
            .onSnapshot({ includeMetadataChanges: true }, snap => {
                const ops = {};
                const mns = {};
                
                snap.docs.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() };
                    
                    // 國考題分類
                    if (data.taskType === 'official' || /\[#op\]/i.test(data.testName)) {
                        let year = data.examYear || '';
                        if (!year) {
                            const match = data.testName.match(/\b(1\d{2}-[12])\b/);
                            year = match ? match[1] : '其他/未標示年份';
                        }
                        if (!ops[year]) ops[year] = [];
                        ops[year].push(data);
                    } 
                    // 模擬試題分類
                    else if (data.taskType === 'mock' || /\[#(m?nm?st)\]/i.test(data.testName) || true) { 
                        let subject = data.examSubject || data.category || '綜合/未分類科目';
                        subject = subject.replace(/^[0-9]\.\s*/, ''); 
                        let tag = data.examTag || '一般試題';
                        
                        if (!mns[subject]) mns[subject] = {};
                        if (!mns[subject][tag]) mns[subject][tag] = [];
                        mns[subject][tag].push(data);
                    }
                });
                
                setOpTasks(ops);
                setMnTasks(mns);
                setLoading(false);
          }, err => {
                console.error(err);
                setLoading(false);
            });

        let unsubMyQuizzes = () => {};
        
        // ✨ 新增：如果有登入 (user 存在)，才去抓取使用者的作答進度，否則跳過
        if (user && user.uid) {
            unsubMyQuizzes = window.db.collection('users').doc(user.uid).collection('quizzes')
                .orderBy('createdAt', 'desc')
                .limit(30)
                .onSnapshot({ includeMetadataChanges: true }, snap => {
                    if (snap.empty && snap.metadata.fromCache) return; 
                    const myTaskMap = {};
                    snap.docs.forEach(doc => {
                        const data = doc.data();
                        if (data.taskId) {
                            if (typeof data.userAnswers === 'string') data.userAnswers = safeDecompress(data.userAnswers, 'array');
                            if (typeof data.results === 'string') data.results = safeDecompress(data.results, 'object');
                            myTaskMap[data.taskId] = { id: doc.id, ...data };
                        }
                    });

                    snap.docs.forEach(doc => {
                        const data = doc.data();
                        if (!data.isShared && !data.isTask) {
                            if (typeof data.userAnswers === 'string') data.userAnswers = safeDecompress(data.userAnswers, 'array');
                            if (typeof data.results === 'string') data.results = safeDecompress(data.results, 'object');
                            myTaskMap[doc.id] = { id: doc.id, ...data, isTask: true, taskId: doc.id };
                        }
                    });
                    setMyTasks(myTaskMap);
                });
        }
            
        return () => {
            unsubTasks();
            unsubMyQuizzes();
            setLoading(false);
        };
    
    // ✨ 修改：加上問號 user?.uid 防止沒登入時造成依賴陣列報錯
    }, [user?.uid, taskLimit]);

    const handlePlayTask = async (task, localRec) => {
        const executeEnter = async () => {
            if (localRec) {
                const isAnsChanged = task.correctAnswersInput && task.correctAnswersInput !== localRec.correctAnswersInput;
                const updatedRec = {
                    ...localRec,
                    testName: task.testName || localRec.testName,
                    questionHtml: task.questionHtml || localRec.questionHtml || '',
                    questionText: task.questionText || localRec.questionText || '',
                    explanationHtml: task.explanationHtml || localRec.explanationHtml || '',
                    correctAnswersInput: task.correctAnswersInput || localRec.correctAnswersInput || ''
                };
                
                const payload = {
                    testName: updatedRec.testName,
                    questionHtml: updatedRec.questionHtml,
                    questionText: updatedRec.questionText,
                    explanationHtml: updatedRec.explanationHtml,
                    correctAnswersInput: updatedRec.correctAnswersInput
                };

                if (isAnsChanged && localRec.results) {
                    payload.hasAnswerUpdate = true;
                    updatedRec.hasAnswerUpdate = true;
                }

                window.db.collection('users').doc(user.uid).collection('quizzes').doc(localRec.id).update(payload)
                    .catch(e => console.error("同步任務資料失敗", e));

                onContinueQuiz(updatedRec);
                return;
            }

            try {
                const emptyAnswers = Array(Number(task.numQuestions)).fill('');
                const emptyStarred = Array(Number(task.numQuestions)).fill(false);

                const newDocRef = await window.db.collection('users').doc(user.uid).collection('quizzes').add({
                    testName: task.testName,
                    numQuestions: task.numQuestions,
                    questionFileUrl: task.questionFileUrl || '',
                    questionText: task.questionText || '',
                    questionHtml: task.questionHtml || '',
                    explanationHtml: task.explanationHtml || '',
                    correctAnswersInput: task.correctAnswersInput || '',
                    publishAnswers: task.publishAnswers !== false,
                    userAnswers: emptyAnswers,
                    starred: emptyStarred,
                    hasTimer: task.hasTimer || false,
                    timeLimit: task.timeLimit || null,
                    timeRemaining: task.hasTimer ? (task.timeLimit * 60) : null,
                    isTask: true,
                    taskId: task.id,
                    creatorUid: task.creatorUid || '', 
                    creatorQuizId: task.id,
                    folder: '任務牆',
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });

                const newRec = await newDocRef.get();
                onContinueQuiz({ id: newRec.id, ...newRec.data() });
            } catch (e) {
                showAlert('啟動任務失敗：' + e.message);
            }
        };

        if (task.hasTimer && (!localRec || !localRec.results)) {
            const isNew = !localRec || !localRec.userAnswers || localRec.userAnswers.filter(a => a !== '').length === 0;
            if (isNew) {
                showConfirm(`⏱ 此任務設有時間限制（${task.timeLimit} 分鐘）。\n\n點擊「確定」後將進入並開始倒數計時，準備好了嗎？`, () => { executeEnter(); });
            } else {
                executeEnter();
            }
        } else {
            executeEnter();
        }
    };

    // 渲染任務卡片的共用元件
    const renderTaskCard = (task, isOp = false) => {
        const localRec = myTasks[task.id];
        const isCompleted = localRec && localRec.results;
        const inProgress = localRec && !localRec.results && Array.isArray(localRec.userAnswers) && localRec.userAnswers.filter(a => a).length > 0;
        
        const borderClass = isOp ? 'border-amber-300 dark:border-amber-700' : 'border-indigo-200 dark:border-indigo-800';

       return (
                                       <div key={task.id} className="border border-stone-100 dark:border-stone-700 p-5 bg-[#FCFBF7] dark:bg-stone-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:shadow-xl hover:-tranamber-y-1 transition-all rounded-2xl">
                                            <div className="flex flex-col gap-1 min-w-0 flex-grow">
                    <h3 className="font-bold text-sm sm:text-base break-words whitespace-normal leading-relaxed dark:text-white" title={cleanQuizNameLocal(task.testName)}>
                        {renderTestNameLocal(task.testName, isCompleted)}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs shrink-0 mt-2">
                        <span className="text-gray-500 dark:text-gray-400 bg-stone-50 dark:bg-gray-700 px-2 py-1 rounded">{task.numQuestions} 題</span>
                        {task.hasTimer && <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded border border-red-200 dark:border-red-700">⏱ {task.timeLimit} min</span>}
                        {isCompleted ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-auto text-sm">✅ {localRec.results.score} 分</span>
                        ) : inProgress ? (
                            <span className="text-amber-500 dark:text-amber-400 font-bold ml-auto">📝 已填 {localRec.userAnswers.filter(a => a).length}</span>
                        ) : (
                            <span className="text-gray-400 font-bold ml-auto">⏳ 未作答</span>
                        )}
                    </div>
                </div>
                <button 
                    onClick={() => handlePlayTask(task, localRec)} 
                    className={`py-2.5 px-4 rounded-xl font-bold text-sm transition-all mt-2 w-full text-center shadow-sm active:scale-95 ${isCompleted ? 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                >
                    {isCompleted ? '📊 查看成績與討論' : (inProgress ? '📝 繼續作答' : '⚔️ 開始挑戰')}
                </button>
            </div>
        );
    };

    const isSearching = searchQuery.trim().length > 0;
    const sortedYears = Object.keys(opTasks).sort((a, b) => b.localeCompare(a));
    const sortedSubjects = Object.keys(mnTasks).sort();

    return (
        <div className="max-w-[1600px] w-full mx-auto p-4 pt-0 h-full overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b-2 border-black dark:border-white pb-2 shrink-0">
                <h1 className="text-2xl font-black dark:text-white flex items-center">
                    🎯 公開任務牆
                </h1>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 hidden sm:block">完成考驗獲取獎勵鑽石！</p>
            </div>

            <FastQASection user={user} showAlert={showAlert} showConfirm={showConfirm} />

            <div className="mb-6 flex items-center bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-3 shadow-sm rounded-2xl shrink-0">
                <span className="text-gray-500 mr-3 text-lg">🔍</span>
                <input
                    type="text"
                    placeholder="搜尋任務名稱、年份、科目或標籤..."
                    className="flex-grow outline-none bg-transparent text-stone-800 dark:text-white text-sm font-bold min-w-0"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-stone-800 dark:hover:text-white ml-2 font-bold px-2">✖</button>
                )}
            </div>

           {loading && Object.keys(opTasks).length === 0 && Object.keys(mnTasks).length === 0 ? (
                <LoadingSpinner text="正在載入最新任務..." />
            ) : (
                <div className="space-y-8 pb-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
                        
                        {/* 左側：國考題區塊 */}
                        <div className="bg-gradient-to-br from-amber-50 to-white dark:from-gray-800 dark:to-gray-900 border border-amber-400 dark:border-amber-600 shadow-md rounded-2xl p-4 sm:p-6 w-full relative min-h-[300px]">
                            <h2 className="text-2xl font-black mb-6 dark:text-white border-b-2 border-amber-400 dark:border-amber-600 pb-2 text-amber-700 dark:text-amber-400 flex items-center">
                                🏆 歷屆國考題
                            </h2>
                            
                            {isSearching ? (
                                <div className="space-y-4">
                                    {Object.values(opTasks).flat().filter(t => cleanQuizNameLocal(t.testName).toLowerCase().includes(searchQuery.toLowerCase())).map(task => renderTaskCard(task, true))}
                                </div>
                            ) : !selectedYear ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 animate-fade-in">
                                    {sortedYears.map(year => (
                                        <button 
                                            key={year} 
                                            onClick={() => setSelectedYear(year)} 
                                            className="bg-[#FCFBF7] dark:bg-gray-700 border-2 border-amber-300 dark:border-amber-600 py-3 sm:py-4 px-1 text-center font-bold text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-gray-600 transition-colors shadow-sm active:scale-95"
                                        >
                                            {year}
                                        </button>
                                    ))}
                                    {sortedYears.length === 0 && <p className="col-span-full text-gray-500 text-sm">尚無國考題</p>}
                                </div>
                            ) : (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-4 bg-amber-100 dark:bg-amber-900/30 p-2 border-l-4 border-amber-500">
                                        <h3 className="text-lg font-black text-amber-800 dark:text-amber-300">{selectedYear}</h3>
                                        <button onClick={() => setSelectedYear(null)} className="text-sm bg-[#FCFBF7] dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-3 py-1 font-bold shadow-sm hover:bg-stone-50 transition-colors">
                                            🔙 返回年份
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {opTasks[selectedYear].map(task => renderTaskCard(task, true))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 右側：模擬試題區塊 */}
                        <div className="bg-[#FCFBF7] dark:bg-stone-800 border border-indigo-300 dark:border-indigo-800 shadow-md rounded-2xl p-4 sm:p-6 w-full relative min-h-[300px]">
                            <h2 className="text-2xl font-black mb-6 dark:text-white border-b-2 border-indigo-300 dark:border-indigo-800 pb-2 text-indigo-700 dark:text-indigo-400 flex items-center">
                                📘 模擬與分類試題
                            </h2>
                            
                            {isSearching ? (
                                <div className="space-y-4">
                                    {Object.values(mnTasks).flatMap(subj => Object.values(subj)).flat()
                                        .filter(t => cleanQuizNameLocal(t.testName).toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                     (t.examSubject || '').includes(searchQuery) || 
                                                     (t.examTag || '').includes(searchQuery)
                                        ).map(task => renderTaskCard(task, false))}
                                </div>
                            ) : !selectedSubject ? (
                                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                                    {sortedSubjects.map(subj => (
                                        <button 
                                            key={subj} 
                                            onClick={() => setSelectedSubject(subj)} 
                                            className="bg-indigo-50 dark:bg-gray-700 border-2 border-indigo-200 dark:border-indigo-900 p-3 sm:p-4 text-left font-bold text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors shadow-sm active:scale-95 flex justify-between items-center"
                                        >
                                            <span className="truncate pr-2">{subj}</span>
                                            <span className="text-xs bg-[#FCFBF7] dark:bg-stone-800 px-1.5 rounded-full">{Object.values(mnTasks[subj]).flat().length}</span>
                                        </button>
                                    ))}
                                    {sortedSubjects.length === 0 && <p className="col-span-full text-gray-500 text-sm">尚無模擬試題</p>}
                                </div>
                            ) : (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-6 bg-indigo-50 dark:bg-indigo-900/30 p-2 border-l-4 border-indigo-500">
                                        <h3 className="text-lg font-black text-indigo-800 dark:text-indigo-300 truncate">{selectedSubject}</h3>
                                        <button onClick={() => setSelectedSubject(null)} className="text-sm bg-[#FCFBF7] dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-3 py-1 font-bold shadow-sm hover:bg-stone-50 transition-colors shrink-0">
                                            🔙 返回科目
                                        </button>
                                    </div>
                                    <div className="space-y-8">
                                        {Object.keys(mnTasks[selectedSubject]).map(tag => (
                                            <div key={tag} className="pl-3 border-l-2 border-indigo-200 dark:border-indigo-700">
                                                <h4 className="text-md font-bold mb-3 text-gray-600 dark:text-gray-300 inline-block bg-stone-50 dark:bg-gray-700 px-3 py-1">
                                                    🏷️ {tag}
                                                </h4>
                                                <div className="space-y-4 pl-1">
                                                    {mnTasks[selectedSubject][tag].map(task => renderTaskCard(task, false))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex justify-center mt-8 pt-4">
                        <button 
                            onClick={() => setTaskLimit(prev => prev + 5)} 
                            className="bg-[#FCFBF7] dark:bg-stone-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-3 font-bold shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                        >
                            ⬇️ 載入更早的任務...
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}


function FastQASection({ user, showAlert, showConfirm, targetQaId, onClose, onRequireLogin }) {
    const { useState, useEffect } = React;
    const [qaList, setQaList] = useState([]);
    const [records, setRecords] = useState({});
    const [loading, setLoading] = useState(true);
    const [qaLimit, setQaLimit] = useState(5); // 🚀 提速優化：將快問快答初始下載量降到 5，確保畫面秒出
    const [refreshTrigger, setRefreshTrigger] = useState(0); // ✨ 新增：重新整理觸發器
    const [isRefreshing, setIsRefreshing] = useState(false); // ✨ 新增：靜默重整狀態
   const [jumpingQaId, setJumpingQaId] = useState(null); // ✨ 新增：進入題目的載入狀態
    const [showAdminMode, setShowAdminMode] = useState(false);
    const [isEditExpanded, setIsEditExpanded] = useState(false);
    
    const isAdmin = user && user.email === 'jay03wn@gmail.com';
    
    // 管理員表單狀態 (升級自訂功能)
    const [qaType, setQaType] = useState('mcq'); // 'mcq' 或 'tf'
    const [subjectMode, setSubjectMode] = useState('藥物分析');
    const [subject, setSubject] = useState('藥物分析');
    const [difficultyMode, setDifficultyMode] = useState('1');
    const [customDifficulty, setCustomDifficulty] = useState('1');
    const [rewardMode, setRewardMode] = useState('10');
    const [customReward, setCustomReward] = useState(10);
    const [timePreset, setTimePreset] = useState('permanent'); // ✨ 新增：時間預設選單狀態
    const [endTimeStr, setEndTimeStr] = useState('');
    const [question, setQuestion] = useState('');

    // ✨ 新增：處理時間預設變化 (自動轉換為台灣/本地時間格式)
    useEffect(() => {
        if (timePreset === 'custom' || timePreset === 'permanent') {
            if (timePreset === 'permanent') setEndTimeStr('');
            return;
        }

        const now = new Date();
        let targetDate;

        if (timePreset === 'today') {
            targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        } else if (timePreset === '24h') {
            targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        } else if (timePreset === '48h') {
            targetDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        } else if (timePreset === '1w') {
            targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        if (targetDate) {
            // 自動補零，組合成本地時間字串 (YYYY-MM-DDThh:mm)
            const pad = (n) => n.toString().padStart(2, '0');
            const localStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth()+1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`;
            setEndTimeStr(localStr);
        }
    }, [timePreset]);
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAns, setCorrectAns] = useState(0);
    const [explanation, setExplanation] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    
    // 作答狀態
    const [activeQA, setActiveQA] = useState(null);
    const [selectedAns, setSelectedAns] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [showShareModal, setShowShareModal] = useState(false);
    const [shareContent, setShareContent] = useState('');

   useEffect(() => {
        let unsubQA = () => {};
        let unsubRecords = () => {};

       const fetchQA = () => {
            if (!window.db) return; // ✨ 防呆機制：確保資料庫已載入，防止沒登入的人白畫面
            // ✨ 終極修復：移除手動 setLoading(true) 造成的死鎖，完全信任 Firebase 的背景同步機制
            try {
                if (targetQaId) {
                    unsubQA = window.db.collection('fastQA').doc(targetQaId).onSnapshot(docSnap => {
                        if (docSnap.exists) setActiveQA({ id: docSnap.id, ...docSnap.data() });
                        else showAlert('找不到此題目，可能已過期或被刪除！');
                        setLoading(false);
                    }, error => {
                        console.error("快問快答讀取失敗:", error);
                        setLoading(false);
                    });
                } else {
                    unsubQA = window.db.collection('fastQA').orderBy('createdAt', 'desc').limit(qaLimit).onSnapshot({ includeMetadataChanges: true }, snapshot => {
                        const qas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        const now = new Date().getTime();
                        const validQas = isAdmin ? qas : qas.filter(q => !q.endTime || q.endTime > now);
                        setQaList(validQas);
                        
                        setActiveQA(prev => {
                            if (prev) return validQas.find(q => q.id === prev.id) || prev;
                            return prev;
                        });
                        setLoading(false);
                    }, error => {
                        console.error("快問快答列表讀取失敗:", error);
                        setLoading(false);
                    });
                }

                if (user) {
                    unsubRecords = window.db.collection('users').doc(user.uid).collection('fastQARecords').onSnapshot(recSnap => {
                        const recs = {};
                        recSnap.docs.forEach(doc => { recs[doc.id] = doc.data(); });
                        setRecords(recs);
                        if (targetQaId && recs[targetQaId]) setShowResult(true);
                    }, error => console.error("作答紀錄讀取失敗:", error));
                } else {
                    setLoading(false);
                }
            } catch (e) {
                console.error("預期外的錯誤:", e);
                setLoading(false);
            }
        };
        fetchQA();
        return () => { unsubQA(); unsubRecords(); };
    }, [user, isAdmin, targetQaId, qaLimit, refreshTrigger]); // ✨ 依賴項補上 refreshTrigger

    const handleAddQA = async () => {
        if (!question || !explanation || customReward < 1) return showAlert('請填寫完整題目、詳解，並確保鑽石大於0！');
        
        let finalOptions = options;
        if (qaType === 'tf') finalOptions = ['⭕ 是 (True)', '❌ 否 (False)'];
        if (qaType === 'mcq' && finalOptions.some(o => !o.trim())) return showAlert('選擇題請填寫完整的4個選項！');

        setIsPublishing(true);
        try {
            const endTimestamp = endTimeStr ? new Date(endTimeStr).getTime() : null;
            await window.db.collection('fastQA').add({
                qaType,
                subject,
                difficulty: customDifficulty,
                reward: Number(customReward),
                endTime: endTimestamp,
                question,
                options: finalOptions,
                correctAns,
                explanation,
                totalAnswers: 0,
                answersCount: qaType === 'tf' ? { '0': 0, '1': 0 } : { '0': 0, '1': 0, '2': 0, '3': 0 },
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showAlert('✅ 快問快答新增成功！');
            setIsEditExpanded(false);
            setQuestion(''); setOptions(['', '', '', '']); setExplanation('');
        } catch (e) {
            showAlert('新增失敗：' + e.message);
        }
        setIsPublishing(false);
    };

    const handleDeleteQA = (id) => {
        showConfirm('確定要刪除這題嗎？', async () => {
            await window.db.collection('fastQA').doc(id).delete();
            if(activeQA && activeQA.id === id) setActiveQA(null);
        });
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/?qaId=${activeQA.id}`;
        const plainQ = activeQA.question.replace(/<img[^>]*>/gi, '(圖片)').replace(/<[^>]+>/g, '').trim();
        const shortQ = plainQ.length > 25 ? plainQ.substring(0, 25) + '...' : plainQ;
        const text = `⚡ 快問快答挑戰！\n【${activeQA.subject}】${activeQA.difficulty}\n🎁 獎勵：${activeQA.reward} 鑽石\n\n📝 ${shortQ}\n\n👇 點此連結立即挑戰 👇\n${shareUrl}`;
        setShareContent(text);
        setShowShareModal(true); 
    };

    const handleSubmitAns = async () => {
        if (selectedAns === null) return showAlert('請選擇一個答案！');
        if (!user) return setShowResult(true);
        
        // 快速檢查：如果本地紀錄已經有作答過，直接跳開不處理
        if (records[activeQA.id]) return showAlert('⚠️ 您已經作答過此題！');

        setSubmitting(true);
        const isCorrect = selectedAns === activeQA.correctAns;
        const rewardAmount = Number(activeQA.reward) || 10;
        
        try {
            // ✨ 提速優化 1：不要等資料庫！立刻切換到結果畫面，讓使用者感覺「秒開」
            setShowResult(true);

            const recRef = window.db.collection('users').doc(user.uid).collection('fastQARecords').doc(activeQA.id);
            const qaRef = window.db.collection('fastQA').doc(activeQA.id);

            // ✨ 提速優化 2：並行處理 (Promise.all) 與 原子運算 (increment)
            // 這樣就不需要「先讀取再寫入」，資料庫會直接在雲端幫你「+1」，速度提升 300%
            const tasks = [
                // 1. 寫入作答紀錄
                recRef.set({ 
                    isCorrect, 
                    selectedAns, 
                    answeredAt: window.firebase.firestore.FieldValue.serverTimestamp() 
                }),
                // 2. 直接在雲端更新統計數字 (不再執行 slow 的 get() 操作)
                qaRef.update({
                    totalAnswers: window.firebase.firestore.FieldValue.increment(1),
                    [`answersCount.${selectedAns}`]: window.firebase.firestore.FieldValue.increment(1)
                })
            ];

            // 3. 如果答對，同時發送獎勵
            if (isCorrect) {
                tasks.push(window.db.collection('users').doc(user.uid).set({
                    mcData: { diamonds: window.firebase.firestore.FieldValue.increment(rewardAmount) }
                }, { merge: true }));
            }

            // 讓這些任務在背景跑，不卡住 UI 執行
            Promise.all(tasks).catch(e => console.error("背景存檔同步中...", e));

            // ✨ 提速優化 3：立刻顯示結果彈窗
            if (isCorrect) {
                showAlert(`🎉 答對了！恭喜獲得 ${rewardAmount} 💎 鑽石！`);
            } else {
                showAlert('❌ 答錯了，請看詳解！');
            }

        } catch (e) {
            console.error(e);
            showAlert('提交失敗：' + e.message);
        }
        setSubmitting(false);
    };

    return (
        <div className={`border border-rose-200 bg-[#FCFBF7] dark:bg-stone-900 p-6 shadow-xl relative rounded-3xl w-full ${targetQaId ? 'm-0' : 'mb-8 shrink-0'}`}>
           <div className="flex justify-between items-center mb-5 border-b border-rose-100 dark:border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-rose-700 dark:text-rose-400 flex items-center">⚡ 快問快答挑戰</h2>
                    {!targetQaId && (
                        <button 
                            onClick={() => { 
                                setIsRefreshing(true); 
                                window.db.collection('fastQA').orderBy('createdAt', 'desc').limit(qaLimit).get()
                                    .then(() => setRefreshTrigger(prev => prev + 1))
                                    .catch(e => console.error(e))
                                    .finally(() => setIsRefreshing(false));
                            }}
                            disabled={isRefreshing}
                            className="text-xs bg-[#FCFBF7] dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 px-3 py-1.5 font-bold transition-all shadow-sm flex items-center gap-1 rounded-xl disabled:opacity-50"
                            title="同步最新題目"
                        >
                            {isRefreshing ? <div className="w-3 h-3 border-2 border-stone-400 border-t-stone-600 rounded-full animate-spin"></div> : '🔄'} 重新整理
                        </button>
                    )}
                </div>
                {isAdmin && !targetQaId && (
                    <button onClick={() => setShowAdminMode(!showAdminMode)} className="bg-stone-800 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs px-4 py-2 font-bold rounded-xl hover:bg-stone-700 dark:hover:bg-stone-200 transition-all shadow-sm active:scale-95">
                        {showAdminMode ? '關閉管理' : '管理試題'}
                    </button>
                )}
            </div>

           {isAdmin && showAdminMode && !targetQaId && (
                <div className="mb-6 border border-rose-200 rounded-2xl bg-[#FCFBF7] dark:bg-stone-800 overflow-hidden shadow-lg">
                    <button onClick={() => setIsEditExpanded(!isEditExpanded)} className="w-full flex justify-between p-5 bg-rose-50 dark:bg-stone-700 hover:bg-rose-100 dark:hover:bg-stone-600 font-bold text-rose-800 dark:text-rose-200 transition-colors">
                        <span className="flex items-center gap-2">✏️ 新增快問快答系統面板</span>
                        <span>{isEditExpanded ? '▼' : '▲'}</span>
                    </button>
                    {isEditExpanded && (
                        <div className="p-4 border-t border-stone-600200 dark:text-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div className="md:col-span-2 flex gap-4 bg-stone-50 p-2 dark:bg-gray-700">
                                    <label className="font-bold flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={qaType==='mcq'} onChange={()=>setQaType('mcq')} className="w-4 h-4" /> 選擇題
                                    </label>
                                    <label className="font-bold flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={qaType==='tf'} onChange={()=>setQaType('tf')} className="w-4 h-4" /> 是非題
                                    </label>
                                </div>
                               <div>
                                    <label className="block text-sm font-bold mb-1">科目</label>
                                    <select value={subjectMode} onChange={e => { setSubjectMode(e.target.value); if(e.target.value !== 'custom') setSubject(e.target.value); else setSubject(''); }} className="w-full border p-2 mb-2 dark:bg-stone-800">
                                        {['藥物分析', '生藥', '中藥', '藥理', '藥化', '藥劑', '生物藥劑'].map(s => <option key={s} value={s}>{s}</option>)}
                                        <option value="custom">[自訂]</option>
                                    </select>
                                    {subjectMode === 'custom' && <input type="text" value={subject} onChange={e=>setSubject(e.target.value)} className="w-full border p-2 dark:bg-stone-800" placeholder="請輸入自訂科目" />}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">難度標籤</label>
                                    <select value={difficultyMode} onChange={e => { setDifficultyMode(e.target.value); if(e.target.value !== 'custom') setCustomDifficulty(e.target.value); else setCustomDifficulty(''); }} className="w-full border p-2 mb-2 dark:bg-stone-800">
                                        {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}★</option>)}
                                        <option value="custom">[自訂]</option>
                                    </select>
                                    {difficultyMode === 'custom' && <input type="text" value={customDifficulty} onChange={e=>setCustomDifficulty(e.target.value)} className="w-full border p-2 dark:bg-stone-800" placeholder="請輸入自訂難度" />}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">獎勵鑽石數量</label>
                                    <select value={rewardMode} onChange={e => { setRewardMode(e.target.value); if(e.target.value !== 'custom') setCustomReward(Number(e.target.value)); else setCustomReward(''); }} className="w-full border p-2 mb-2 dark:bg-stone-800">
                                        {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(n => <option key={n} value={n}>{n} 鑽石</option>)}
                                        <option value="custom">[自訂]</option>
                                    </select>
                                    {rewardMode === 'custom' && <input type="number" min="1" value={customReward} onChange={e=>setCustomReward(e.target.value)} className="w-full border p-2 dark:bg-stone-800" placeholder="請輸入鑽石數量" />}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">結束時間</label>
                                    <select value={timePreset} onChange={e => {
                                        setTimePreset(e.target.value);
                                        // 切換到自訂時，若原本為空，自動填入當前時間，方便微調
                                        if (e.target.value === 'custom' && !endTimeStr) {
                                            const now = new Date();
                                            const pad = (n) => n.toString().padStart(2, '0');
                                            setEndTimeStr(`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
                                        }
                                    }} className="w-full border p-2 mb-2 dark:bg-stone-800 font-bold">
                                        <option value="permanent">♾️ 永久公開</option>
                                        <option value="today">📅 到今天結束 (23:59)</option>
                                        <option value="24h">⌛ 24 小時後</option>
                                        <option value="48h">⌛ 48 小時後</option>
                                        <option value="1w">🗓️ 一週後 (168小時)</option>
                                        <option value="custom">⚙️ 自訂時間</option>
                                    </select>
                                    {timePreset === 'custom' && (
                                        <input type="datetime-local" value={endTimeStr} onChange={e=>setEndTimeStr(e.target.value)} className="w-full border p-2 dark:bg-stone-800" />
                                    )}
                                </div>
                                <div className="md:col-span-2"><label className="block text-sm font-bold mb-1">題目內容 (支援貼上圖片)</label><ContentEditableEditor value={question} onChange={setQuestion} placeholder="在此輸入..." showAlert={showAlert} /></div>
                                
                                {qaType === 'mcq' ? options.map((opt, idx) => (
                                    <div key={idx} className="md:col-span-2 flex items-center gap-2">
                                        <input type="radio" checked={correctAns===idx} onChange={()=>setCorrectAns(idx)} className="w-5 h-5 accent-stone-600600" />
                                        <span className="font-bold text-sm shrink-0">設為解答</span>
                                        <input type="text" placeholder={`選項 ${idx+1}`} value={opt} onChange={e=>{const newO=[...options]; newO[idx]=e.target.value; setOptions(newO);}} className="flex-1 border p-2 dark:bg-stone-800" />
                                    </div>
                                )) : (
                                    <div className="md:col-span-2 flex gap-6 mt-2">
                                        <label className="font-bold flex items-center gap-2 cursor-pointer"><input type="radio" checked={correctAns===0} onChange={()=>setCorrectAns(0)} className="w-5 h-5 accent-stone-600600" /> 正確答案是「⭕ 是」</label>
                                        <label className="font-bold flex items-center gap-2 cursor-pointer"><input type="radio" checked={correctAns===1} onChange={()=>setCorrectAns(1)} className="w-5 h-5 accent-stone-600600" /> 正確答案是「❌ 否」</label>
                                    </div>
                                )}
                                <div className="md:col-span-2"><label className="block text-sm font-bold mb-1">詳解</label><textarea value={explanation} onChange={e=>setExplanation(e.target.value)} className="w-full border p-2 h-24 dark:bg-stone-800" placeholder="請輸入詳解..."></textarea></div>
                            </div>
                            <button onClick={handleAddQA} disabled={isPublishing} className="bg-stone-600600 hover:bg-stone-600700 text-white font-bold py-2 px-6 w-full disabled:bg-gray-400">🚀 發布快問快答</button>
                        </div>
                    )}
                </div>
            )}

           {!activeQA ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* ✨ 非同步載入狀態 (加入長度判斷，背景載入時不消失) */}
                        {loading && qaList.length === 0 ? (
                            <div className="col-span-full py-12 text-center bg-[#FCFBF7]/50 border border-stone-600200">
                                <div className="w-10 h-10 border-4 border-stone-600200 border-t-stone-600500 rounded-full animate-spin mx-auto mb-3"></div>
                                <div className="text-stone-600600 font-bold animate-pulse">試題讀取中...</div>
                            </div>
                        ) : qaList.length === 0 ? (
                            <div className="text-stone-600500 font-bold col-span-full text-center py-6">目前沒有開放的快問快答，請晚點再來！</div> 
                        ) : (
                            qaList.map(qa => {
                                const rec = records[qa.id];
                                return (
                                    <div key={qa.id} className="bg-[#FCFBF7] dark:bg-stone-800 p-4 border border-stone-600200 flex flex-col rounded-2xl shadow-sm hover:shadow-md">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="bg-stone-600100 text-stone-600800 text-xs px-2 py-1 font-bold rounded-2xl">{qa.subject}</span>
                                            <span className="text-stone-600600 font-bold text-sm">💎 {qa.reward} 鑽</span>
                                        </div>
                                        <p className="text-sm dark:text-white mb-4 flex-1 line-clamp-3 font-medium">{qa.question.replace(/<img[^>]*>/gi, '(圖片)').replace(/<[^>]+>/g, '').trim()}</p>
                                        <div className="flex items-center justify-between pt-3 border-t">
                                            <span className={`font-bold text-sm ${!user ? 'text-gray-400' : rec ? (rec.isCorrect ? 'text-emerald-600' : 'text-red-500') : 'text-gray-400'}`}>
                                                {!user ? '訪客未登入' : rec ? (rec.isCorrect ? '✅ 已答對' : '❌ 答錯了') : '尚未作答'}
                                            </span>
                                            <div className="flex gap-2">
                                                {isAdmin && showAdminMode && (
                                                    <>
                                                        <button onClick={() => { navigator.clipboard.writeText(qa.id); showAlert(`✅ 已複製題目ID：${qa.id}`); }} className="text-amber-500 text-xs border border-amber-500 px-1">複製ID</button>
                                                        <button onClick={() => handleDeleteQA(qa.id)} className="text-red-500 text-xs border border-red-500 px-1">刪除</button>
                                                    </>
                                                )}
                                                <button 
                                                    disabled={jumpingQaId === qa.id}
                                                    onClick={async () => { 
                                                        setJumpingQaId(qa.id);
                                                        try {
                                                            // ✨ 點擊挑戰時，強制向伺服器要這一題的最新資料 (確保絕不拿到舊題目)
                                                            const docSnap = await window.db.collection('fastQA').doc(qa.id).get();
                                                            if (docSnap.exists) {
                                                                setActiveQA({ id: docSnap.id, ...docSnap.data() });
                                                            } else {
                                                                setActiveQA(qa);
                                                            }
                                                        } catch (e) {
                                                            console.warn(e);
                                                            setActiveQA(qa);
                                                        }
                                                        setSelectedAns(null); 
                                                        setShowResult(!!rec); 
                                                        setJumpingQaId(null);
                                                    }} 
                                                    className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 text-sm font-bold rounded-xl flex items-center gap-1 transition-all shadow-md active:scale-95 disabled:opacity-70"
                                                >
                                                    {jumpingQaId === qa.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                                                    {(user && rec) ? '查看紀錄' : '立即挑戰'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    {/* ✨ 新增：快問快答的「載入更多」按鈕 (包含正確的 <> </> 包覆) */}
                    {!targetQaId && qaList.length >= qaLimit && (
                        <div className="flex justify-center mt-6">
                            <button 
                                onClick={() => setQaLimit(prev => prev + 5)} 
                                className="bg-[#FCFBF7] border-2 border-stone-600300 text-stone-600600 px-6 py-2 font-bold shadow-sm hover:bg-stone-60050 transition-colors"
                            >
                                ⬇️ 載入更早的題目...
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 border-2 border-stone-600300 rounded-2xl animate-fade-in">
                    <div className="flex justify-between mb-4">
                        {!targetQaId ? <button onClick={() => { setActiveQA(null); if(onClose) onClose(); }} className="text-gray-500 font-bold hover:text-stone-800 dark:hover:text-white">⬅ 返回列表</button> : <div></div>}
                        <button onClick={handleShare} className="text-stone-600600 bg-stone-600100 px-3 py-1.5 text-sm font-bold rounded-2xl">🔗 分享此題</button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-6 border-b pb-4 dark:border-stone-700">
                        <span className="bg-stone-600100 text-stone-600800 text-sm px-2 py-1 font-bold">{activeQA.subject}</span>
                        <span className="bg-stone-50 text-gray-800 text-sm px-2 py-1 font-bold">{activeQA.difficulty}</span>
                        <span className="text-stone-600600 font-bold text-lg ml-auto">💎 {activeQA.reward} 鑽石獎勵</span>
                    </div>
                    
                    {/* 支援暗色模式：移除強制白底黑字 */}
                    {/* ✨ 修改：讓快問快答題目支援 SMILES 渲染 */}
<div className="text-lg font-bold mb-6 bg-[#FCFBF7] dark:bg-stone-800 text-stone-800 dark:text-white p-5 border border-gray-300 dark:border-gray-600 shadow-sm preview-rich-text" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml(activeQA.question) }}></div>
                    
                    <div className="space-y-3 mb-6">
                        {activeQA.options.map((opt, idx) => {
                            const isSelected = (selectedAns ?? records[activeQA.id]?.selectedAns) === idx;
                            const isCorrectOpt = activeQA.correctAns === idx;
                            
                            // ✨ 統計修復：直接從各選項的真實票數加總來算分母，徹底解決 totalAnswers 舊資料壞掉的問題
                            const actualTotal = activeQA.answersCount ? Object.values(activeQA.answersCount).reduce((sum, val) => sum + (Number(val) || 0), 0) : 0;
                            const total = actualTotal > 0 ? actualTotal : (activeQA.totalAnswers || 0);
                            const count = (activeQA.answersCount && activeQA.answersCount[idx]) || 0;
                            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                            
                            let btnClass = "w-full text-left p-4 border-2 font-bold transition-all relative z-0 flex justify-between items-center ";
                            let barColor = "bg-gray-300";
                            
                            if (showResult && user) {
                                if (isCorrectOpt) { btnClass += "bg-emerald-100 border-emerald-500 text-emerald-800 "; barColor = "bg-emerald-300"; }
                                else if (isSelected) { btnClass += "bg-red-100 border-red-500 text-red-800 "; barColor = "bg-red-300"; }
                                else { btnClass += "bg-gray-50 border-stone-200 text-gray-500 opacity-80 "; }
                            } else {
                                btnClass += isSelected ? "border-stone-600500 bg-stone-60050 text-stone-600700 " : "border-gray-300 bg-[#FCFBF7] hover:bg-gray-50 dark:bg-stone-800 dark:text-white ";
                            }

                            return (
                                <button key={idx} disabled={showResult || submitting} onClick={() => setSelectedAns(idx)} className={btnClass}>
                                    {showResult && user && <div className={`absolute left-0 top-0 bottom-0 opacity-30 z-[-1] transition-all ${barColor}`} style={{ width: `${percent}%` }}></div>}
                                    <span><span className="mr-3 font-black">{activeQA.qaType === 'tf' ? '' : ['A','B','C','D'][idx]+'.'}</span> {opt}</span>
                                    <div className="flex gap-3">
                                        {showResult && user && <span className="text-sm font-bold opacity-80">{percent}% ({count}人)</span>}
                                        {showResult && user && isCorrectOpt && <span>✅</span>}
                                        {showResult && user && isSelected && !isCorrectOpt && <span>❌</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {!showResult ? (
                        <button onClick={handleSubmitAns} disabled={submitting} className="w-full bg-stone-600600 hover:bg-stone-600700 text-white font-bold py-4 text-xl disabled:bg-gray-400">
                            {submitting ? '處理中，請稍候...' : '確認送出'}
                        </button>
                    ) : (
                        <div className="mt-6 animate-fade-in">
                            {user ? (
                                <>
                                    <div className="p-4 bg-[#FCFBF7] dark:bg-stone-800 border-2 border-amber-100 dark:border-amber-900 shadow-inner">
                                        <h4 className="font-black mb-2 flex justify-between items-center">
                                            <span className="text-amber-900 dark:text-amber-300">💡 解答與討論</span>
                                            {activeQA.reward > 0 && <span className="text-emerald-600 dark:text-emerald-400">🎉 獲得 {activeQA.reward} 鑽！</span>}
                                        </h4>
                                        {/* ✨ 修改：讓快問快答詳解支援 SMILES 渲染 */}
                                        <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap preview-rich-text" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml(activeQA.explanation) }}></div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-6 bg-stone-50 border-2 border-dashed border-gray-400 text-center"><h3 className="text-xl font-black mb-2">🔒 答案已上鎖</h3><button onClick={() => { if(onRequireLogin) onRequireLogin(); }} className="bg-stone-800 text-white px-8 py-3 font-black text-lg w-full">🚀 登入解鎖完整解答與鑽石</button></div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showShareModal && (
                <div className="fixed inset-0 bg-stone-800/60 flex items-center justify-center z-[100] p-4">
                    <div className="bg-[#FCFBF7] p-5 w-full max-w-xs border-2 border-rose-500">
                        <h3 className="font-black text-stone-600600 mb-3 flex justify-between">
                            <span>🔗 分享此題</span><button onClick={() => setShowShareModal(false)}>✕</button></h3>
                <textarea readOnly value={shareContent} className="w-full h-36 p-3 text-sm border-2 border-stone-200 mb-4 outline-none resize-none bg-[#FCFBF7] text-stone-800" onClick={e => e.target.select()} /><button onClick={() => { navigator.clipboard.writeText(shareContent); showAlert('✅ 已複製！'); setShowShareModal(false); }} className="w-full bg-rose-500 text-white font-bold py-2.5 text-sm mb-2">📋 複製文本</button></div></div>
            )}
        </div>
    );
}
