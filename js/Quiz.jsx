function Dashboard({ user, userProfile, onStartNew, onContinueQuiz, showAlert, showConfirm, showPrompt }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const userFolders = Array.from(new Set(['未分類', ...(userProfile.folders || [])]));
    const [currentFolder, setCurrentFolder] = useState('未分類');

    useEffect(() => {
        const unsubscribe = db.collection('users').doc(user.uid).collection('quizzes').orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => { setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setLoading(false); });
        return () => unsubscribe();
    }, [user]);

    // 匯入相同代碼不重複建立副本
    const handleImportCode = () => {
        showPrompt("請輸入 6 碼測驗代碼：", "", async (code) => {
            const cleanCode = code?.trim().toUpperCase(); if(!cleanCode) return;
            try {
                const existing = records.find(r => r.shortCode === cleanCode);
                if (existing) return showAlert("你已經匯入過這份試卷囉！已存在於題庫中。");

                const codeDoc = await db.collection('shareCodes').doc(cleanCode).get();
                if(!codeDoc.exists) throw new Error("無效代碼");
                const doc = await db.collection('users').doc(codeDoc.data().ownerId).collection('quizzes').doc(codeDoc.data().quizId).get();
                if(!doc.exists) throw new Error('找不到該試卷');
                
                const data = doc.data();
                await db.collection('users').doc(user.uid).collection('quizzes').add({
                    testName: data.testName, numQuestions: data.numQuestions, questionFileUrl: data.questionFileUrl || '',
                    correctAnswersInput: data.correctAnswersInput || '', userAnswers: Array(Number(data.numQuestions)).fill(''),
                    isShared: true, folder: '未分類', shortCode: cleanCode, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                showAlert('✅ 已成功匯入！');
            } catch(e) { showAlert('❌ 匯入失敗：' + e.message); }
        });
    };

    const displayedRecords = records.filter(rec => (rec.folder || '未分類') === currentFolder);

    return (
        <div className="max-w-6xl mx-auto p-4 pt-0 h-[calc(100dvh-100px)] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-black dark:border-white">
                <h1 className="text-2xl font-black dark:text-white">我的題庫</h1>
                <button onClick={() => onStartNew(currentFolder)} className="bg-black text-white px-6 py-2 font-bold">+ 新測驗</button>
            </div>
            <div className="flex space-x-2 mb-4">
                {userFolders.map(f => <button key={f} onClick={() => setCurrentFolder(f)} className={`px-4 py-1.5 border font-bold ${currentFolder === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>{f}</button>)}
                <button onClick={handleImportCode} className="px-3 py-1.5 border bg-blue-50 text-blue-700 font-bold">📥 輸入代碼</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {displayedRecords.map(rec => (
                    <div key={rec.id} className="bg-white dark:bg-gray-800 border p-6 flex flex-col justify-between">
                        <div>
                            {/* 渲染官方試卷標記 */}
                            <h2 className="font-bold text-lg mb-2 dark:text-white">{renderTestName(rec.testName || '未命名')} {rec.isShared && <span className="text-xs bg-orange-100 text-orange-800 px-1 ml-1">分享</span>}</h2>
                            <p className="text-sm text-gray-600 mb-4">題數：{rec.numQuestions}</p>
                        </div>
                        <button onClick={() => onContinueQuiz(rec)} className="bg-gray-100 px-5 py-2 font-bold border w-full">進入測驗</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function QuizApp({ currentUser, userProfile, activeQuizRecord, onBackToDashboard, showAlert, showConfirm }) {
    const [step, setStep] = useState(activeQuizRecord.results ? 'results' : (activeQuizRecord.id ? 'answering' : 'setup'));
    const [userAnswers, setUserAnswers] = useState(activeQuizRecord.userAnswers || []);
    const [pdfZoom, setPdfZoom] = useState(1); // PDF 縮放狀態
    
    // 再做一次：不新增檔案，保留成績紀錄
    const handleRetake = () => {
        showConfirm("確定要再做一次嗎？\n先前的分數將保留在您的歷史紀錄中，系統將為您清空目前答案，不產生新檔案。", () => {
            const initialAnswers = Array(Number(activeQuizRecord.numQuestions)).fill('');
            const historyEntry = { score: activeQuizRecord.results.score, date: new Date().toISOString() };
            
            db.collection('users').doc(currentUser.uid).collection('quizzes').doc(activeQuizRecord.id).update({
                userAnswers: initialAnswers,
                results: firebase.firestore.FieldValue.delete(),
                history: firebase.firestore.FieldValue.arrayUnion(historyEntry)
            }).then(() => {
                setUserAnswers(initialAnswers);
                setStep('answering');
            });
        });
    };

    if (step === 'answering' || step === 'results') return (
        <div className="flex flex-col h-[100dvh] bg-gray-100 dark:bg-gray-900 p-4">
            <div className="bg-white p-4 flex justify-between items-center mb-4 shrink-0">
                <h2 className="font-bold">{renderTestName(activeQuizRecord.testName)}</h2>
                <div className="flex space-x-2">
                    {step === 'results' && <button onClick={handleRetake} className="bg-orange-50 text-orange-600 px-4 py-1.5 font-bold border">再做一次</button>}
                    <button onClick={onBackToDashboard} className="bg-black text-white px-4 py-1.5 font-bold">返回</button>
                </div>
            </div>
            
            <div className="flex flex-row flex-grow overflow-hidden relative">
                {activeQuizRecord.questionFileUrl && (
                    <div className="w-1/2 flex flex-col border bg-white dark:bg-gray-800 mr-2">
                        {/* PDF 縮放控制列 */}
                        <div className="bg-gray-200 p-2 flex space-x-2 items-center shrink-0">
                            <span className="text-xs font-bold">縮放預覽：</span>
                            <button onClick={() => setPdfZoom(z => Math.max(0.5, z - 0.2))} className="bg-white px-2 border font-bold">-</button>
                            <span className="text-sm font-bold w-10 text-center">{Math.round(pdfZoom * 100)}%</span>
                            <button onClick={() => setPdfZoom(z => Math.min(3, z + 0.2))} className="bg-white px-2 border font-bold">+</button>
                        </div>
                        <div className="flex-grow w-full relative overflow-auto bg-gray-50">
                            <div style={{ transform: `scale(${pdfZoom})`, transformOrigin: 'top left', width: `${100/pdfZoom}%`, height: `${100/pdfZoom}%` }}>
                                <iframe src={getEmbedUrl(activeQuizRecord.questionFileUrl)} className="absolute inset-0 w-full h-full border-0"></iframe>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="flex-grow border bg-white dark:bg-gray-800 p-4 overflow-y-auto">
                    {step === 'results' ? (
                        <div className="text-center p-10"><h2 className="text-6xl font-black text-green-600">{activeQuizRecord.results?.score}</h2><p>測驗完畢</p></div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                            {userAnswers.map((ans, i) => (
                                <div key={i} className="flex justify-between p-2 border-b">
                                    <span className="font-bold">{i+1}.</span>
                                    <div className="flex space-x-1">
                                        {['A','B','C','D'].map(o => <button key={o} onClick={() => {let a=[...userAnswers]; a[i]=a[i]===o?'':o; setUserAnswers(a);}} className={`w-8 h-8 font-bold border ${ans===o ? 'bg-black text-white' : 'bg-white'}`}>{o}</button>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
    
    return <div className="p-10 font-bold">載入中 / 設定區...</div>;
}