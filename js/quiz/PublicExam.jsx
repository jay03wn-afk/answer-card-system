const { useState, useEffect } = React;

function PublicExam({ user, userProfile, showAlert, showConfirm, onContinueQuiz }) {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('mock'); // ✨ 預設進入模擬考
    const [myRecords, setMyRecords] = useState({});

    // 抓取公開試卷大廳資料
    useEffect(() => {
        const unsub = window.db.collection('publicExams')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                setExams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            }, err => {
                console.error(err);
                setLoading(false);
            });
        return () => unsub();
    }, []);

    // 抓取我的公開作答紀錄
    useEffect(() => {
        if (!user) return;
        const unsub = window.db.collection('users').doc(user.uid).collection('publicExamRecords')
            .onSnapshot(snap => {
                const recs = {};
                snap.docs.forEach(doc => { recs[doc.id] = doc.data(); });
                setMyRecords(recs);
            });
        return () => unsub();
    }, [user]);

    const handleDelete = (id) => {
        showConfirm("確定要刪除這份公開試卷嗎？(僅有上傳者或管理員可刪除)", async () => {
            try {
                await window.db.collection('publicExams').doc(id).delete();
                showAlert("✅ 刪除成功！");
            } catch(e) {
                showAlert("刪除失敗：" + e.message);
            }
        });
    };

    const handleStartExam = (exam) => {
        const myRec = myRecords[exam.id];
        
        const record = {
            id: exam.id, 
            testName: exam.testName,
            numQuestions: exam.numQuestions,
            maxScore: exam.maxScore,
            hasTimer: exam.hasTimer,
            timeLimit: exam.timeLimit,
            timeRemaining: myRec?.timeRemaining ?? (exam.hasTimer ? exam.timeLimit * 60 : null),
            allowPeek: exam.allowPeek,
            publishAnswers: exam.publishAnswers,
            correctAnswersInput: exam.correctAnswersInput,
            questionText: window.safeDecompress ? window.safeDecompress(exam.questionText) : exam.questionText,
            questionHtml: window.safeDecompress ? window.safeDecompress(exam.questionHtml) : exam.questionHtml,
            explanationHtml: window.safeDecompress ? window.safeDecompress(exam.explanationHtml) : exam.explanationHtml,
            userAnswers: myRec?.userAnswers || Array(exam.numQuestions).fill(''),
            starred: myRec?.starred || Array(exam.numQuestions).fill(false),
            notes: myRec?.notes || Array(exam.numQuestions).fill(''),
            peekedAnswers: myRec?.peekedAnswers || Array(exam.numQuestions).fill(false),
            results: myRec?.results || null,
            isPublicExam: true, 
            forceStep: myRec?.results ? 'results' : 'answering'
        };

        onContinueQuiz(record);
    };

    // ✨ 新增：觸發編輯模式
    const handleEditExam = (exam) => {
        const record = {
            id: exam.id,
            testName: exam.testName,
            numQuestions: exam.numQuestions,
            maxScore: exam.maxScore,
            hasTimer: exam.hasTimer,
            timeLimit: exam.timeLimit,
            allowPeek: exam.allowPeek,
            publishAnswers: exam.publishAnswers,
            correctAnswersInput: exam.correctAnswersInput,
            questionText: window.safeDecompress ? window.safeDecompress(exam.questionText) : exam.questionText,
            questionHtml: window.safeDecompress ? window.safeDecompress(exam.questionHtml) : exam.questionHtml,
            explanationHtml: window.safeDecompress ? window.safeDecompress(exam.explanationHtml) : exam.explanationHtml,
            isPublicExam: true,
            forceStep: 'edit',
            ownerId: exam.ownerId,
            examType: exam.examType,
            examSubject: exam.examSubject,
            examTags: exam.examTags
        };
        onContinueQuiz(record);
    };

    const displayedExams = exams.filter(e => e.examType === activeTab);

    return (
        <div className="max-w-[1600px] w-full mx-auto p-4 pt-0 h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6 border-b-2 border-black dark:border-white pb-2 shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black dark:text-white shrink-0 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[28px] text-purple-600">public</span>
                        公開試卷區
                    </h1>
                </div>
            </div>

            <div className="flex gap-4 mb-6">
                <button 
                    onClick={() => setActiveTab('mock')}
                    className={`px-6 py-2 rounded-2xl font-bold transition-all shadow-sm ${activeTab === 'mock' ? 'bg-amber-600 text-white' : 'bg-white dark:bg-stone-800 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    模擬考
                </button>
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-2 rounded-2xl font-bold transition-all shadow-sm ${activeTab === 'general' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-stone-800 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    一般試題
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div></div>
            ) : displayedExams.length === 0 ? (
                <div className="text-center py-20 bg-[#FCFBF7] dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <span className="material-symbols-outlined text-6xl text-gray-300 mb-4 block">inbox</span>
                    <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400">這個分類目前沒有公開試卷</h3>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {displayedExams.map(exam => {
                        const myRec = myRecords[exam.id];
                        const isCompleted = !!myRec?.results;
                        const isStarted = myRec && !isCompleted;
                        
                        return (
                            <div key={exam.id} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 items-start md:items-center justify-between relative group">
                                {/* ✨ 橫向排版：左側資訊區 */}
                                <div className="flex-1 w-full min-w-0">
                                    <h3 className="font-bold text-lg text-stone-800 dark:text-white line-clamp-2 mb-2">{exam.testName}</h3>
                                    
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-stone-700 dark:text-gray-300 px-2 py-1 rounded flex items-center gap-1 shrink-0">
                                            <span className="material-symbols-outlined text-[14px]">person</span> {exam.ownerName}
                                        </span>
                                        {activeTab === 'mock' && exam.examSubject && (
                                            <span className="text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded border border-amber-200 dark:border-stone-600 shrink-0">
                                                {exam.examSubject}
                                            </span>
                                        )}
                                        {activeTab === 'mock' && exam.examTags && (
                                            <div className="flex flex-wrap gap-1">
                                                {exam.examTags.split(',').map(tag => (
                                                    <span key={tag} className="text-[10px] font-bold bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 px-1.5 py-0.5 rounded">#{tag.trim()}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 font-bold">
                                        <span className="text-purple-600 dark:text-purple-400">{exam.stats?.totalPlayers || 0} 人已考</span>
                                        <span>•</span>
                                        <span>{exam.numQuestions} 題</span>
                                        <span>•</span>
                                        {exam.hasTimer ? <span className="text-red-500">限時 {exam.timeLimit}分</span> : <span>無時限</span>}
                                        <span>•</span>
                                        {exam.allowPeek ? <span className="text-amber-600">允許偷看</span> : <span>不許偷看</span>}
                                    </div>
                                </div>

                                {/* ✨ 橫向排版：右側按鈕區塊 */}
                                <div className="flex flex-row gap-2 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                                    {(user?.email === 'jay03wn@gmail.com' || user?.uid === exam.ownerId) && (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditExam(exam)} className="flex-1 md:flex-none py-2.5 px-4 rounded-xl font-bold bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600 transition-colors flex items-center justify-center gap-1">
                                                <span className="material-symbols-outlined text-[18px]">edit</span> <span className="hidden md:inline">編輯</span>
                                            </button>
                                            <button onClick={() => handleDelete(exam.id)} className="flex-1 md:flex-none py-2.5 px-4 rounded-xl font-bold bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-1">
                                                <span className="material-symbols-outlined text-[18px]">delete</span> <span className="hidden md:inline">刪除</span>
                                            </button>
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => handleStartExam(exam)}
                                        className={`flex-1 md:flex-none py-2.5 px-6 rounded-xl font-black shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] ${isCompleted ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300' : isStarted ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                                    >
                                        {isCompleted ? (
                                            <><span className="material-symbols-outlined text-[18px]">check_circle</span> 已完成</>
                                        ) : isStarted ? (
                                            <><span className="material-symbols-outlined text-[18px]">edit_note</span> 繼續作答</>
                                        ) : (
                                            <><span className="material-symbols-outlined text-[18px]">play_arrow</span> 開始測驗</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

window.PublicExam = PublicExam;