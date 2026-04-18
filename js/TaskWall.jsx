
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
                    
                    if (data.taskType === 'official' || /\[#op\]/i.test(data.testName)) {
                        let year = data.examYear || '';
                        if (!year) {
                            const match = data.testName.match(/\b(1\d{2}-[12])\b/);
                            year = match ? match[1] : '其他/未標示年份';
                        }
                        if (!ops[year]) ops[year] = [];
                        ops[year].push(data);
                    } 
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
                showAlert('[錯誤] 啟動任務失敗：' + e.message);
            }
        };

        if (task.hasTimer && (!localRec || !localRec.results)) {
            const isNew = !localRec || !localRec.userAnswers || localRec.userAnswers.filter(a => a !== '').length === 0;
            if (isNew) {
                showConfirm(`此任務設有時間限制（${task.timeLimit} 分鐘）。\n\n點擊「確定」後將進入並開始倒數計時，準備好了嗎？`, () => { executeEnter(); });
            } else {
                executeEnter();
            }
        } else {
            executeEnter();
        }
    };

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
                        <span className="text-gray-500 dark:text-gray-400 bg-stone-50 dark:bg-gray-700 px-2 py-1 rounded flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">list_alt</span> {task.numQuestions} 題</span>
                        {task.hasTimer && <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded border border-red-200 dark:border-red-700 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">timer</span> {task.timeLimit} min</span>}
                        {isCompleted ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-auto text-sm flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span> {localRec.results.score} 分</span>
                        ) : inProgress ? (
                            <span className="text-amber-500 dark:text-amber-400 font-bold ml-auto flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">edit_note</span> 已填 {localRec.userAnswers.filter(a => a).length}</span>
                        ) : (
                            <span className="text-gray-400 font-bold ml-auto flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">hourglass_empty</span> 未作答</span>
                        )}
                    </div>
                </div>
                <button 
                    onClick={() => handlePlayTask(task, localRec)} 
                    className={`py-2.5 px-4 rounded-xl font-bold text-sm transition-all mt-2 w-full flex items-center justify-center gap-1 shadow-sm active:scale-95 ${isCompleted ? 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                >
                    {isCompleted ? <><span className="material-symbols-outlined text-base">bar_chart</span> 查看成績與討論</> : (inProgress ? <><span className="material-symbols-outlined text-base">edit_document</span> 繼續作答</> : <><span className="material-symbols-outlined text-base">sports_esports</span> 開始挑戰</>)}
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
                <h1 className="text-2xl font-black dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-3xl">target</span> 公開任務牆
                </h1>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 hidden sm:block">完成考驗獲取獎勵鑽石！</p>
            </div>

            <FastQASection user={user} showAlert={showAlert} showConfirm={showConfirm} />

            <div className="mb-6 flex items-center bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-3 shadow-sm rounded-2xl shrink-0">
                <span className="text-gray-500 mr-3 flex items-center"><span className="material-symbols-outlined">search</span></span>
                <input
                    type="text"
                    placeholder="搜尋任務名稱、年份、科目或標籤..."
                    className="flex-grow outline-none bg-transparent text-stone-800 dark:text-white text-sm font-bold min-w-0"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-stone-800 dark:hover:text-white ml-2 font-bold px-2 flex items-center"><span className="material-symbols-outlined text-[18px]">close</span></button>
                )}
            </div>

           {loading && Object.keys(opTasks).length === 0 && Object.keys(mnTasks).length === 0 ? (
                <LoadingSpinner text="正在載入最新任務..." />
            ) : (
                <div className="space-y-8 pb-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
                        
                        <div className="bg-gradient-to-br from-amber-50 to-white dark:from-gray-800 dark:to-gray-900 border border-amber-400 dark:border-amber-600 shadow-md rounded-2xl p-4 sm:p-6 w-full relative min-h-[300px]">
                            <h2 className="text-2xl font-black mb-6 dark:text-white border-b-2 border-amber-400 dark:border-amber-600 pb-2 text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[28px]">workspace_premium</span> 歷屆國考題
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
                                        <button onClick={() => setSelectedYear(null)} className="text-sm bg-[#FCFBF7] dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-3 py-1 font-bold shadow-sm hover:bg-stone-50 transition-colors flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[16px]">arrow_back</span> 返回年份
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {opTasks[selectedYear].map(task => renderTaskCard(task, true))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-[#FCFBF7] dark:bg-stone-800 border border-indigo-300 dark:border-indigo-800 shadow-md rounded-2xl p-4 sm:p-6 w-full relative min-h-[300px]">
                            <h2 className="text-2xl font-black mb-6 dark:text-white border-b-2 border-indigo-300 dark:border-indigo-800 pb-2 text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[28px]">menu_book</span> 模擬與分類試題
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
                                        <button onClick={() => setSelectedSubject(null)} className="text-sm bg-[#FCFBF7] dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-3 py-1 font-bold shadow-sm hover:bg-stone-50 transition-colors shrink-0 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[16px]">arrow_back</span> 返回科目
                                        </button>
                                    </div>
                                    <div className="space-y-8">
                                        {Object.keys(mnTasks[selectedSubject]).map(tag => (
                                            <div key={tag} className="pl-3 border-l-2 border-indigo-200 dark:border-indigo-700">
                                                <h4 className="text-md font-bold mb-3 text-gray-600 dark:text-gray-300 inline-flex items-center gap-1 bg-stone-50 dark:bg-gray-700 px-3 py-1">
                                                    <span className="material-symbols-outlined text-[18px]">local_offer</span> {tag}
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
                            className="bg-[#FCFBF7] dark:bg-stone-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-3 font-bold shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">arrow_downward</span> 載入更早的任務...
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
    const [qaLimit, setQaLimit] = useState(5); 
    const [refreshTrigger, setRefreshTrigger] = useState(0); 
    const [isRefreshing, setIsRefreshing] = useState(false); 
   const [jumpingQaId, setJumpingQaId] = useState(null); 
    const [showAdminMode, setShowAdminMode] = useState(false);
    const [isEditExpanded, setIsEditExpanded] = useState(false);
    
    const isAdmin = user && user.email === 'jay03wn@gmail.com';
    const [myFriendsUids, setMyFriendsUids] = useState([]);

    useEffect(() => {
        if (user) {
            const unsub = window.db.collection('users').doc(user.uid).onSnapshot(doc => {
                if (doc.exists) setMyFriendsUids((doc.data().friends || []).map(f => f.uid));
            });
            return () => unsub();
        }
    }, [user]);
    
    const [qaType, setQaType] = useState('mcq'); 
    const [subjectMode, setSubjectMode] = useState('藥物分析');
    const [subject, setSubject] = useState('藥物分析');
    const [difficultyMode, setDifficultyMode] = useState('1');
    const [customDifficulty, setCustomDifficulty] = useState('1');
    const [rewardMode, setRewardMode] = useState('10');
    const [customReward, setCustomReward] = useState(10);
    const [timePreset, setTimePreset] = useState('permanent'); 
    const [endTimeStr, setEndTimeStr] = useState('');
    const [question, setQuestion] = useState('');

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
            const pad = (n) => n.toString().padStart(2, '0');
            const localStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth()+1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`;
            setEndTimeStr(localStr);
        }
    }, [timePreset]);
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAns, setCorrectAns] = useState(0);
    const [explanation, setExplanation] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    
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
            if (!window.db) return; 
            try {
                if (targetQaId) {
                    unsubQA = window.db.collection('fastQA').doc(targetQaId).onSnapshot(docSnap => {
                        if (docSnap.exists) setActiveQA({ id: docSnap.id, ...docSnap.data() });
                        else showAlert('[錯誤] 找不到此題目，可能已過期或被刪除！');
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
    }, [user, isAdmin, targetQaId, qaLimit, refreshTrigger]);

    const handleAddQA = async () => {
        if (!question || !explanation || (isAdmin && customReward < 1)) return showAlert('[提示] 請填寫完整題目與詳解！');
        
        let finalOptions = options;
        if (qaType === 'tf') finalOptions = ['(是) True', '(否) False'];
        if (qaType === 'mcq' && finalOptions.some(o => !o.trim())) return showAlert('[提示] 選擇題請填寫完整的4個選項！');

        setIsPublishing(true);
        try {
            if (!isAdmin) {
                const myActiveQAs = qaList.filter(q => q.creatorUid === user.uid);
                if (myActiveQAs.length >= 10) {
                    setIsPublishing(false);
                    return showAlert('[提示] 非管理員最多只能同時擁有 10 個有效的快問快答喔！');
                }
            }

            const now = new Date();
            const endTimestamp = isAdmin ? (endTimeStr ? new Date(endTimeStr).getTime() : null) : (now.getTime() + 72 * 60 * 60 * 1000);
            
            const newQaRef = await window.db.collection('fastQA').add({
                qaType,
                subject: isAdmin ? subject : '玩家出題',
                difficulty: isAdmin ? customDifficulty : '玩家',
                reward: isAdmin ? Number(customReward) : 20,
                endTime: endTimestamp,
                question,
                options: finalOptions,
                correctAns,
                explanation,
                totalAnswers: 0,
                answersCount: qaType === 'tf' ? { '0': 0, '1': 0 } : { '0': 0, '1': 0, '2': 0, '3': 0 },
                creatorUid: user.uid,
                creatorName: user?.displayName || user?.email?.split('@')[0] || '匿名玩家',
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            // ✨ 新增：自動寄發信箱通知 (管理員全服通知，一般玩家通知好友)
            if (isAdmin) {
                const usersSnap = await window.db.collection('users').get();
                const batches = [];
                let currentBatch = window.db.batch();
                let count = 0;
                usersSnap.docs.forEach(doc => {
                    if (count >= 490) { batches.push(currentBatch); currentBatch = window.db.batch(); count = 0; }
                    const ref = window.db.collection('users').doc(doc.id).collection('mailbox').doc();
                    currentBatch.set(ref, {
                        title: '⚡ 官方快問快答上線！',
                        content: `管理員發布了新的快問快答「${subject || '綜合'}」，快到任務牆挑戰並獲取 ${customReward || 20} 鑽石吧！`,
                        linkType: 'qa', linkId: newQaRef.id,
                        rewardDiamonds: 0, isClaimed: false, isRead: false,
                        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                    count++;
                });
                if (count > 0) batches.push(currentBatch);
                await Promise.all(batches.map(b => b.commit()));
            } else {
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                const friends = userDoc.data()?.friends || [];
                if (friends.length > 0) {
                    const batch = window.db.batch();
                    friends.forEach(f => {
                        const ref = window.db.collection('users').doc(f.uid).collection('mailbox').doc();
                        batch.set(ref, {
                            title: '⚡ 好友快問快答挑戰！',
                            content: `您的好友 ${user?.displayName || '匿名'} 發布了新的快問快答，趕快去任務牆挑戰他吧！`,
                            linkType: 'qa', linkId: newQaRef.id,
                            rewardDiamonds: 0, isClaimed: false, isRead: false,
                            createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                    await batch.commit();
                }
            }
            
            showAlert('[成功] 快問快答發布成功！(期限為三天)');
            setIsEditExpanded(false);
            setQuestion(''); setOptions(['', '', '', '']); setExplanation('');
        } catch (e) {
            showAlert('[錯誤] 新增失敗：' + e.message);
        }
        setIsPublishing(false);
    };

    const handleDeleteQA = (id) => {
        showConfirm('確定要刪除這題嗎？', async () => {
            await window.db.collection('fastQA').doc(id).delete();
            if(activeQA && activeQA.id === id) setActiveQA(null);
        });
    };

    const handleAutoParse = () => {
        const tempText = question
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n</p>')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\u00A0/g, ' ')
            .replace(/<[^>]+>/g, '');
        
        const optA = tempText.match(/(?:\[A\]|(?:A|Ａ)[.、\s]+)([\s\S]*?)(?=(?:\[B\]|(?:B|Ｂ)[.、\s]+)|$)/i);
        const optB = tempText.match(/(?:\[B\]|(?:B|Ｂ)[.、\s]+)([\s\S]*?)(?=(?:\[C\]|(?:C|Ｃ)[.、\s]+)|$)/i);
        const optC = tempText.match(/(?:\[C\]|(?:C|Ｃ)[.、\s]+)([\s\S]*?)(?=(?:\[D\]|(?:D|Ｄ)[.、\s]+)|$)/i);
        const optD = tempText.match(/(?:\[D\]|(?:D|Ｄ)[.、\s]+)([\s\S]*?)$/i);

        if (optA || optB || optC || optD) {
            const newOptions = [...options];
            if (optA) newOptions[0] = optA[1].replace(/\n/g, '<br>').trim();
            if (optB) newOptions[1] = optB[1].replace(/\n/g, '<br>').trim();
            if (optC) newOptions[2] = optC[1].replace(/\n/g, '<br>').trim();
            if (optD) newOptions[3] = optD[1].replace(/\n/g, '<br>').trim();
            setOptions(newOptions);

            let newQHtml = question;
            const firstMatch = question.match(/(?:<[^>]+>)*\s*(?:\[A\]|(?:A|Ａ)[.、\s]+)/i);
            if (firstMatch) {
                newQHtml = question.substring(0, firstMatch.index).replace(/(?:&nbsp;|\s|<br\s*\/?>)+$/gi, '').trim();
            }
            setQuestion(newQHtml);
            showAlert("[成功] 自動解析成功！已將選項分發，並將選項從題目中移除。");
        } else {
            showAlert("[警告] 找不到 A, B, C, D 或 [A] 選項開頭，請確認題目格式。");
        }
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/?qaId=${activeQA.id}`;
        const plainQ = activeQA.question.replace(/<img[^>]*>/gi, '(圖片)').replace(/<[^>]+>/g, '').trim();
        const shortQ = plainQ.length > 25 ? plainQ.substring(0, 25) + '...' : plainQ;
        const text = `[挑戰] 快問快答！\n【${activeQA.subject}】${activeQA.difficulty}\n[獎勵]：${activeQA.reward} 鑽石\n\n[題目] ${shortQ}\n\n點此連結立即挑戰：\n${shareUrl}`;
        setShareContent(text);
        setShowShareModal(true); 
    };

    const handleSubmitAns = async () => {
        if (selectedAns === null) return showAlert('請選擇一個答案！');
        if (!user) return setShowResult(true);
        
        if (records[activeQA.id]) return showAlert('[警告] 您已經作答過此題！');

        setSubmitting(true);
        const isCorrect = selectedAns === activeQA.correctAns;
        const isOwnQA = activeQA.creatorUid === user.uid;
        
        try {
            setShowResult(true);

            const recRef = window.db.collection('users').doc(user.uid).collection('fastQARecords').doc(activeQA.id);
            const qaRef = window.db.collection('fastQA').doc(activeQA.id);

            const tasks = [
                recRef.set({ 
                    isCorrect, 
                    selectedAns, 
                    answeredAt: window.firebase.firestore.FieldValue.serverTimestamp() 
                }),
                qaRef.update({
                    totalAnswers: window.firebase.firestore.FieldValue.increment(1),
                    [`answersCount.${selectedAns}`]: window.firebase.firestore.FieldValue.increment(1)
                })
            ];

            let rewardToMe = 0;
            
            if (isCorrect) {
                if (isOwnQA) {
                    rewardToMe = 0; 
                } else {
                    rewardToMe = Number(activeQA.reward) || 20;
                }

                if (rewardToMe > 0) {
                    tasks.push(window.db.runTransaction(async (t) => {
                        const userRef = window.db.collection('users').doc(user.uid);
                        const userDoc = await t.get(userRef);
                        if (!userDoc.exists) return;
                        
                        const today = new Date().toISOString().split('T')[0];
                        const mcData = userDoc.data().mcData || {};
                        let qaRewardData = mcData.qaRewardData || { date: today, amount: 0 };
                        
                        if (qaRewardData.date !== today) qaRewardData = { date: today, amount: 0 };
                        
                        let actualReward = rewardToMe;
                        if (!isAdmin && qaRewardData.amount + rewardToMe > 100) {
                            actualReward = Math.max(0, 100 - qaRewardData.amount);
                        }
                        
                        if (actualReward > 0) {
                            qaRewardData.amount += actualReward;
                            t.set(userRef, { mcData: { ...mcData, diamonds: (mcData.diamonds || 0) + actualReward, qaRewardData } }, { merge: true });
                            rewardToMe = actualReward; 
                        } else {
                            rewardToMe = 0;
                        }
                    }));
                }

                if (!isOwnQA && activeQA.creatorUid) {
                    tasks.push(window.db.collection('users').doc(activeQA.creatorUid).set({
                        mcData: { diamonds: window.firebase.firestore.FieldValue.increment(5) }
                    }, { merge: true }));
                    
                    const mailboxRef = window.db.collection('users').doc(activeQA.creatorUid).collection('mailbox').doc();
                    tasks.push(mailboxRef.set({
                        title: '💰 快問快答收益！',
                        content: `有玩家答對了您的快問快答，您獲得了 5 顆鑽石！`,
                        isRead: false,
                        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    }));
                }
            }

            await Promise.all(tasks).catch(e => console.error("背景存檔同步中...", e));

            if (isCorrect) {
                if (isOwnQA) {
                    showAlert(`[提示] 答對了！但這是您自己出的題目，沒有額外獎勵喔！`);
                } else if (rewardToMe > 0) {
                    showAlert(`[恭喜] 答對了！獲得 ${rewardToMe} 鑽石！`);
                } else {
                    showAlert(`[恭喜] 答對了！(您今日的快問快答獎勵已達 100 鑽石上限)`);
                }
            } else {
                showAlert('[提示] 答錯了，請看詳解！');
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
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-black text-rose-700 dark:text-rose-400 flex items-center gap-1"><span className="material-symbols-outlined text-2xl">bolt</span> 快問快答挑戰</h2>
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
                            className="text-xs bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800 px-3 py-1.5 font-bold transition-all shadow-sm flex items-center gap-1 rounded-xl disabled:opacity-50"
                            title="同步最新題目"
                        >
                            {isRefreshing ? <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-[16px]">sync</span>} 重新整理
                        </button>
                    )}
                </div>
                {user && !targetQaId && (
                    <button onClick={() => setShowAdminMode(!showAdminMode)} className={`${isAdmin ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700' : 'bg-rose-500 text-white hover:bg-rose-600'} text-xs px-4 py-2 font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1`}>
                        {showAdminMode ? '關閉發布面板' : (isAdmin ? '⚙️ 管理/發布試題' : '➕ 發布我的快問快答')}
                    </button>
                )}
            </div>

           {user && showAdminMode && !targetQaId && (
                <div className="mb-6 border border-rose-200 rounded-2xl bg-[#FCFBF7] dark:bg-stone-800 overflow-hidden shadow-lg">
                    <button onClick={() => setIsEditExpanded(!isEditExpanded)} className="w-full flex justify-between p-5 bg-rose-50 dark:bg-stone-700 hover:bg-rose-100 dark:hover:bg-stone-600 font-bold text-rose-800 dark:text-rose-200 transition-colors">
                        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px]">edit_square</span> 新增快問快答系統面板</span>
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
                               {isAdmin && (
                                    <>
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
                                                if (e.target.value === 'custom' && !endTimeStr) {
                                                    const now = new Date();
                                                    const pad = (n) => n.toString().padStart(2, '0');
                                                    setEndTimeStr(`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
                                                }
                                            }} className="w-full border p-2 mb-2 dark:bg-stone-800 font-bold">
                                                <option value="permanent">永久公開</option>
                                                <option value="today">到今天結束 (23:59)</option>
                                                <option value="24h">24 小時後</option>
                                                <option value="48h">48 小時後</option>
                                                <option value="1w">一週後 (168小時)</option>
                                                <option value="custom">自訂時間</option>
                                            </select>
                                            {timePreset === 'custom' && (
                                                <input type="datetime-local" value={endTimeStr} onChange={e=>setEndTimeStr(e.target.value)} className="w-full border p-2 dark:bg-stone-800" />
                                            )}
                                        </div>
                                    </>
                                )}
                               <div className="md:col-span-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-bold">題目內容 (支援貼上圖片)</label>
                                        {qaType === 'mcq' && (
                                            <button onClick={handleAutoParse} className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-2 py-1 font-bold rounded shadow-sm border border-amber-300 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[16px]">smart_toy</span> 自動解析貼上選項
                                            </button>
                                        )}
                                    </div>
                                    <ContentEditableEditor value={question} onChange={setQuestion} placeholder="在此輸入或貼上包含 A, B, C, D 的完整題目，再點擊上方「自動解析」..." showAlert={showAlert} />
                                </div>
                                
                                {qaType === 'mcq' ? options.map((opt, idx) => (
                                    <div key={idx} className="md:col-span-2 flex items-center gap-2">
                                        <input type="radio" checked={correctAns===idx} onChange={()=>setCorrectAns(idx)} className="w-5 h-5 accent-stone-600600" />
                                        <span className="font-bold text-sm shrink-0">設為解答</span>
                                        <input type="text" placeholder={`選項 ${idx+1}`} value={opt} onChange={e=>{const newO=[...options]; newO[idx]=e.target.value; setOptions(newO);}} className="flex-1 border p-2 dark:bg-stone-800" />
                                    </div>
                                )) : (
                                    <div className="md:col-span-2 flex gap-6 mt-2">
                                        <label className="font-bold flex items-center gap-2 cursor-pointer"><input type="radio" checked={correctAns===0} onChange={()=>setCorrectAns(0)} className="w-5 h-5 accent-stone-600600" /> 正確答案是「(是) True」</label>
                                        <label className="font-bold flex items-center gap-2 cursor-pointer"><input type="radio" checked={correctAns===1} onChange={()=>setCorrectAns(1)} className="w-5 h-5 accent-stone-600600" /> 正確答案是「(否) False」</label>
                                    </div>
                                )}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold mb-1">詳解 (支援貼上圖片與富文本)</label>
                                    <ContentEditableEditor value={explanation} onChange={setExplanation} placeholder="請輸入或貼上詳解..." showAlert={showAlert} />
                                </div>
                            </div>
                            <button onClick={handleAddQA} disabled={isPublishing} className="bg-stone-600 bg-stone-700 text-white font-bold py-2 px-6 w-full disabled:bg-gray-400 flex justify-center items-center gap-1"><span className="material-symbols-outlined text-[20px]">publish</span> 發布快問快答</button>
                        </div>
                    )}
                </div>
            )}

           {!activeQA ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loading && qaList.length === 0 ? (
                            <div className="col-span-full py-12 text-center bg-[#FCFBF7]/50 border border-stone-600200">
                                <div className="w-10 h-10 border-4 border-stone-600200 border-t-stone-600500 rounded-full animate-spin mx-auto mb-3"></div>
                                <div className="text-stone-600600 font-bold animate-pulse">試題讀取中...</div>
                            </div>
                        ) : qaList.filter(q => isAdmin || q.difficulty !== '玩家' || q.creatorUid === user?.uid || (myFriendsUids && myFriendsUids.includes(q.creatorUid))).length === 0 ? (
                            <div className="text-stone-600500 font-bold col-span-full text-center py-6">目前沒有開放的快問快答，請晚點再來！</div> 
                        ) : (
                            qaList.filter(q => isAdmin || q.difficulty !== '玩家' || q.creatorUid === user?.uid || (myFriendsUids && myFriendsUids.includes(q.creatorUid))).map(qa => {
                                const rec = records[qa.id];
                                return (
                                    <div key={qa.id} className="bg-[#FCFBF7] dark:bg-stone-800 p-3 border border-stone-200 dark:border-stone-700 flex flex-col rounded-xl shadow-sm hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="bg-stone-100 dark:bg-stone-700 text-stone-800 dark:text-stone-200 text-[11px] px-2 py-0.5 font-bold rounded-full">{qa.subject}</span>
                                                {qa.creatorUid && (
                                                    <span className="flex items-center gap-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 px-1.5 py-0.5 rounded-full shadow-sm" title={`出題者：${qa.creatorName}`}>
                                                        <UserAvatar uid={qa.creatorUid} name={qa.creatorName} className="w-3.5 h-3.5 rounded-full object-cover" />
                                                        <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300 max-w-[50px] truncate">{qa.creatorName}</span>
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">diamond</span> {qa.reward}</span>
                                        </div>
                                        <p className="text-xs dark:text-white mb-3 flex-1 line-clamp-2 font-medium">{qa.question.replace(/<img[^>]*>/gi, '(圖片)').replace(/<[^>]+>/g, '').trim()}</p>
                                        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-700">
                                            <span className={`font-bold text-xs flex items-center gap-1 ${!user ? 'text-gray-400' : rec ? (rec.isCorrect ? 'text-emerald-600' : 'text-red-500') : 'text-gray-400'}`}>
                                                {!user ? '訪客' : rec ? (rec.isCorrect ? <><span className="material-symbols-outlined text-[14px]">check_circle</span>答對</> : <><span className="material-symbols-outlined text-[14px]">cancel</span>答錯</>) : '未作答'}
                                            </span>
                                            <div className="flex gap-1.5">
                                                {isAdmin && showAdminMode && (
                                                    <>
                                                        <button onClick={() => { navigator.clipboard.writeText(qa.id); showAlert(`[成功] 已複製題目ID：${qa.id}`); }} className="text-amber-500 text-[10px] border border-amber-500 px-1 rounded">複製ID</button>
                                                        <button onClick={() => handleDeleteQA(qa.id)} className="text-red-500 text-[10px] border border-red-500 px-1 rounded">刪除</button>
                                                    </>
                                                )}
                                                <button 
                                                    disabled={jumpingQaId === qa.id}
                                                    onClick={async () => { 
                                                        setJumpingQaId(qa.id);
                                                        try {
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
                                                    className={`px-3 py-1 text-xs font-bold rounded-xl flex items-center gap-1 transition-all shadow-sm active:scale-95 disabled:opacity-70 ${(user && rec) ? 'bg-stone-100 text-stone-600 border border-stone-200 dark:bg-stone-700 dark:border-stone-600 dark:text-stone-300' : 'bg-rose-500 hover:bg-rose-600 text-white'}`}
                                                >
                                                    {jumpingQaId === qa.id ? <div className={`w-3 h-3 border-2 rounded-full animate-spin ${(user && rec) ? 'border-stone-400 border-t-transparent' : 'border-white border-t-transparent'}`}></div> : null}
                                                    {(user && rec) ? '查看' : '挑戰'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    {!targetQaId && qaList.length >= qaLimit && (
                        <div className="flex justify-center mt-6">
                            <button 
                                onClick={() => setQaLimit(prev => prev + 5)} 
                                className="bg-[#FCFBF7] border-2 border-stone-600300 text-stone-600600 px-6 py-2 font-bold shadow-sm hover:bg-stone-60050 transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[20px]">arrow_downward</span> 載入更早的題目...
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 border-2 border-stone-600300 rounded-2xl animate-fade-in">
                    <div className="flex justify-between mb-4">
                        {!targetQaId ? <button onClick={() => { setActiveQA(null); if(onClose) onClose(); }} className="text-gray-500 font-bold hover:text-stone-800 dark:hover:text-white">⬅ 返回列表</button> : <div></div>}
                        <button onClick={handleShare} className="text-stone-600600 bg-stone-600100 px-3 py-1.5 text-sm font-bold rounded-2xl flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">share</span> 分享此題</button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-6 border-b pb-4 dark:border-stone-700 items-center">
                        <span className="bg-stone-100 dark:bg-stone-700 text-stone-800 dark:text-stone-200 text-sm px-3 py-1 font-bold rounded-full">{activeQA.subject}</span>
                        <span className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-gray-800 dark:text-gray-300 text-sm px-3 py-1 font-bold rounded-full">{activeQA.difficulty}</span>
                        {activeQA.creatorUid && (
                            <span className="flex items-center gap-1.5 ml-2 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 px-2 py-1 rounded-full shadow-sm">
                                <UserAvatar uid={activeQA.creatorUid} name={activeQA.creatorName} className="w-5 h-5 rounded-full object-cover" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{activeQA.creatorName}</span>
                            </span>
                        )}
                        <span className="text-amber-600 dark:text-amber-400 font-black text-lg ml-auto flex items-center gap-1"><span className="material-symbols-outlined text-[24px]">diamond</span> {activeQA.reward} 鑽石</span>
                    </div>
                    
<div className="text-lg font-bold mb-6 bg-[#FCFBF7] dark:bg-stone-800 text-stone-800 dark:text-white p-5 border border-gray-300 dark:border-gray-600 shadow-sm preview-rich-text" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml(activeQA.question) }}></div>
                    
                    <div className="space-y-3 mb-6">
                        {activeQA.options.map((opt, idx) => {
                            const isSelected = (selectedAns ?? records[activeQA.id]?.selectedAns) === idx;
                            const isCorrectOpt = activeQA.correctAns === idx;
                            
                            const actualTotal = activeQA.answersCount ? Object.values(activeQA.answersCount).reduce((sum, val) => sum + (Number(val) || 0), 0) : 0;
                            const total = actualTotal > 0 ? actualTotal : (activeQA.totalAnswers || 0);
                            const count = (activeQA.answersCount && activeQA.answersCount[idx]) || 0;
                            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                            
                            let btnClass = "w-full text-left p-4 border-2 font-bold transition-all relative z-0 flex justify-between items-center ";
                            let barColor = "bg-gray-300";
                            
                            if (showResult && user) {
                                if (isCorrectOpt) { btnClass += "bg-emerald-100 border-emerald-500 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100 border-[3px] scale-[1.01] shadow-sm "; barColor = "bg-emerald-400"; }
                                else if (isSelected) { btnClass += "bg-red-100 border-red-500 text-red-900 dark:bg-red-900/40 dark:text-red-100 border-[3px] scale-[1.01] shadow-sm "; barColor = "bg-red-400"; }
                                else { btnClass += "bg-gray-50 border-stone-200 text-gray-500 opacity-60 dark:bg-stone-800 dark:border-stone-700 "; }
                            } else {
                                // ✨ 超級明顯化：未作答時選中的選項要有超粗邊框與質感的桃紅色底色
                                btnClass += isSelected ? "border-pink-500 bg-pink-50 text-pink-900 shadow-md scale-[1.02] border-[3px] dark:bg-pink-900/40 dark:text-pink-100 dark:border-pink-400 " : "border-gray-300 bg-white hover:bg-gray-50 dark:bg-stone-800 dark:border-stone-600 dark:text-white hover:border-gray-400 dark:hover:border-gray-400 ";
                            }

                            return (
                                <button key={idx} disabled={showResult || submitting} onClick={() => setSelectedAns(idx)} className={btnClass}>
                                    {showResult && user && <div className={`absolute left-0 top-0 bottom-0 opacity-30 z-[-1] transition-all ${barColor}`} style={{ width: `${percent}%` }}></div>}
                                    <span><span className="mr-3 font-black">{activeQA.qaType === 'tf' ? '' : ['A','B','C','D'][idx]+'.'}</span> {opt}</span>
                                    <div className="flex gap-3">
                                        {showResult && user && <span className="text-sm font-bold opacity-80">{percent}% ({count}人)</span>}
                                        {showResult && user && isCorrectOpt && <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>}
                                        {showResult && user && isSelected && !isCorrectOpt && <span className="material-symbols-outlined text-[18px] text-red-500">cancel</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {!showResult ? (
                        <button onClick={handleSubmitAns} disabled={submitting} className="w-full bg-stone-600 bg-stone-700 text-white font-bold py-4 text-xl disabled:bg-gray-400">
                            {submitting ? '處理中，請稍候...' : '確認送出'}
                        </button>
                    ) : (
                        <div className="mt-6 animate-fade-in">
                            {user ? (
                                <>
                                    <div className="p-4 bg-[#FCFBF7] dark:bg-stone-800 border-2 border-amber-100 dark:border-amber-900 shadow-inner rounded-2xl">
                                        <h4 className="font-black mb-2 flex justify-between items-center">
                                            <span className="text-amber-900 dark:text-amber-300 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">lightbulb</span> 解答與詳解</span>
                                            {activeQA.reward > 0 && <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">celebration</span> 快問快答結算</span>}
                                        </h4>
                                        <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap preview-rich-text" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml(activeQA.explanation) }}></div>
                                    </div>
                                    {/* ✨ 新增：試題反饋給出題者 */}
                                    {activeQA.creatorUid && activeQA.creatorUid !== user?.uid && (
                                        <button onClick={() => {
                                            window.showPrompt("請輸入要給作者的回饋或揪錯：", "", (msg) => {
                                                if(!msg) return;
                                                window.db.collection('users').doc(activeQA.creatorUid).collection('mailbox').add({
                                                    title: '📬 試題回饋通知',
                                                    content: `玩家 ${user?.displayName || '匿名'} 對您的快問快答「${activeQA.question.replace(/<[^>]+>/g, '').substring(0,10)}...」發送了回饋：\n\n${msg}`,
                                                    isRead: false,
                                                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                                                });
                                                showAlert("[成功] 回饋已發送給作者！");
                                            });
                                        }} className="mt-4 w-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 font-bold py-3 rounded-xl text-sm flex justify-center items-center gap-2 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors shadow-sm">
                                            <span className="material-symbols-outlined text-[18px]">feedback</span> 傳送試題回饋給作者
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="p-6 bg-stone-50 border-2 border-dashed border-gray-400 text-center">
                                    <h3 className="text-xl font-black mb-2 flex items-center justify-center gap-1"><span className="material-symbols-outlined text-[24px]">lock</span> 答案已上鎖</h3>
                                    <button onClick={() => { if(onRequireLogin) onRequireLogin(); }} className="bg-stone-800 text-white px-8 py-3 font-black text-lg w-full flex justify-center items-center gap-1">
                                        <span className="material-symbols-outlined text-[20px]">login</span> 登入解鎖完整解答與鑽石
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showShareModal && (
                <div className="fixed inset-0 bg-stone-800/60 flex items-center justify-center z-[100] p-4">
                    <div className="bg-[#FCFBF7] p-5 w-full max-w-xs border-2 border-rose-500">
                        <h3 className="font-black text-stone-600600 mb-3 flex justify-between items-center">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">share</span> 分享此題</span>
                            <button onClick={() => setShowShareModal(false)} className="flex items-center"><span className="material-symbols-outlined">close</span></button>
                        </h3>
                        <textarea readOnly value={shareContent} className="w-full h-36 p-3 text-sm border-2 border-stone-200 mb-4 outline-none resize-none bg-[#FCFBF7] text-stone-800" onClick={e => e.target.select()} />
                        <button onClick={() => { navigator.clipboard.writeText(shareContent); showAlert('[成功] 已複製！'); setShowShareModal(false); }} className="w-full bg-rose-500 text-white font-bold py-2.5 text-sm mb-2 flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-[18px]">content_copy</span> 複製文本
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
