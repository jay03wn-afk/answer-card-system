window.QlistDashboard = function QlistDashboard({ user, userProfile, sharedQid, sharedChap, setActiveTab, showAlert }) {
    const { useState, useEffect } = React;
    const [searchMode, setSearchMode] = useState('question'); // 'question' | 'exam'
    const [searchKeyword, setSearchKeyword] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeQuestion, setActiveQuestion] = useState(null);

    // 1. 攔截外部短網址：如果帶有 sharedQid，直接抓取該題並開啟單題作答模式
    useEffect(() => {
        if (sharedQid && sharedChap) {
            const fetchSharedQ = async () => {
                setIsSearching(true);
                try {
                    const doc = await window.db.collection('publicQlib_questions').doc(sharedChap).get();
                    if (doc.exists) {
                        let questions = [];
                        const data = doc.data();
                        if (data.questionsJZ && window.safeDecompress) {
                            questions = JSON.parse(window.safeDecompress(data.questionsJZ, 'string'));
                        } else {
                            questions = data.questions || [];
                        }
                        const targetQ = questions.find(x => x.id === sharedQid);
                        if (targetQ) {
                            setActiveQuestion({ ...targetQ, chapterId: sharedChap });
                        } else {
                            showAlert("找不到該題目！可能已被原作者刪除。");
                        }
                    }
                } catch(e) {
                    showAlert("讀取題目失敗：" + e.message);
                }
                setIsSearching(false);
            };
            fetchSharedQ();
        }
    }, [sharedQid, sharedChap]);

    // 2. 智慧搜尋引擎：採用「非阻塞 Chunk 異步運算」，保證萬題搜尋也不會卡死瀏覽器
    const executeSearch = async () => {
        if (!searchKeyword.trim()) return showAlert("請輸入關鍵字");
        setIsSearching(true);
        setResults([]);
        try {
            if (searchMode === 'question') {
                const snap = await window.db.collection('publicQlib_questions').get();
                const docs = snap.docs;
                let matches = [];
                const lowerK = searchKeyword.toLowerCase();
                
                // Chunk 非阻塞運算
                const processChunk = (startIndex) => {
                    const chunkSize = 5; // 每次處理 5 個章節
                    const end = Math.min(startIndex + chunkSize, docs.length);
                    
                    for (let i = startIndex; i < end; i++) {
                        const data = docs[i].data();
                        let qList = [];
                        if (data.questionsJZ && window.safeDecompress) {
                            try { qList = JSON.parse(window.safeDecompress(data.questionsJZ, 'string')); } catch(e){}
                        } else { qList = data.questions || []; }
                        
                        qList.forEach(q => {
                            if (q.text.toLowerCase().includes(lowerK) || (q.tag||'').toLowerCase().includes(lowerK) || (q.explain||'').toLowerCase().includes(lowerK)) {
                                matches.push({...q, chapterId: docs[i].id});
                            }
                        });
                    }
                    
                    // 為了效能，單次搜尋最多回傳 100 筆
                    if (end < docs.length && matches.length < 100) {
                        setTimeout(() => processChunk(end), 0);
                    } else {
                        setResults(matches);
                        setIsSearching(false);
                    }
                };
                processChunk(0);
            } else {
                const snap = await window.db.collection('publicExams').get();
                let matches = [];
                const lowerK = searchKeyword.toLowerCase();
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.testName.toLowerCase().includes(lowerK) || (data.subtitle||'').toLowerCase().includes(lowerK)) {
                        matches.push({ id: doc.id, ...data });
                    }
                });
                setResults(matches);
                setIsSearching(false);
            }
        } catch(e) {
            showAlert("搜尋失敗: " + e.message);
            setIsSearching(false);
        }
    };

    // 3. 單題作答與留言板元件
    const SingleQuestionPlayer = ({ q, onClose }) => {
        const [selectedOpt, setSelectedOpt] = useState(null);
        const [isSubmitted, setIsSubmitted] = useState(false);
        const [comments, setComments] = useState([]);
        const [commentText, setCommentText] = useState('');

        useEffect(() => {
            const unsub = window.db.collection('publicQlib_discussions').doc(q.id).collection('comments').orderBy('timestamp', 'asc').onSnapshot(snap => {
                setComments(snap.docs.map(d => ({id: d.id, ...d.data()})));
            });
            return () => unsub();
        }, [q.id]);

        const handleSubmit = async (opt) => {
            if (isSubmitted) return;
            setSelectedOpt(opt);
            setIsSubmitted(true);
            const isCorrect = opt === q.ans;
            
            try { // 更新全域單題統計
                const statRef = window.db.collection('publicQlib_stats').doc(q.id);
                if (isCorrect) await statRef.set({ correctCount: window.firebase.firestore.FieldValue.increment(1) }, { merge: true });
                else await statRef.set({ wrongCount: window.firebase.firestore.FieldValue.increment(1) }, { merge: true });
            } catch(e) {}
        };

        const postComment = async () => {
            if(!commentText.trim()) return;
            try {
                await window.db.collection('publicQlib_discussions').doc(q.id).collection('comments').add({
                    userId: user.uid, userName: userProfile.displayName, text: commentText.trim(), timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
                });
                setCommentText('');
            } catch(e) { showAlert("留言失敗"); }
        };

        return (
            <div className="fixed inset-0 z-[200] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#FCFBF7] dark:bg-stone-900 w-full max-w-3xl max-h-[95vh] overflow-y-auto custom-scrollbar rounded-3xl shadow-2xl flex flex-col relative border border-stone-200 dark:border-stone-700">
                    <button onClick={onClose} className="absolute top-4 right-4 bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-full w-8 h-8 flex items-center justify-center hover:bg-stone-300 transition-colors z-10"><span className="material-symbols-outlined text-[20px]">close</span></button>
                    
                    <div className="p-6 md:p-8">
                        <div className="mb-2 flex items-center gap-2">
                            <span className="text-xs font-black bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded">單題挑戰</span>
                            {q.tag && <span className="text-xs font-bold text-gray-500">#{q.tag}</span>}
                        </div>
                        <div className="text-lg md:text-xl font-bold text-stone-800 dark:text-stone-100 mb-6 whitespace-pre-wrap">{q.text}</div>
                        
                        <div className="space-y-3 mb-8">
                            {['A', 'B', 'C', 'D'].map(opt => {
                                if (!q.options[opt]) return null;
                                const isCorrectOpt = isSubmitted && opt === q.ans;
                                const isWrongSelect = isSubmitted && selectedOpt === opt && opt !== q.ans;
                                let btnStyle = "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700";
                                
                                if (isSubmitted) {
                                    if (isCorrectOpt) btnStyle = "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300";
                                    else if (isWrongSelect) btnStyle = "bg-rose-50 dark:bg-rose-900/30 border-rose-400 dark:border-rose-600 text-rose-800 dark:text-rose-300";
                                    else btnStyle = "bg-gray-50 dark:bg-stone-800 border-gray-200 dark:border-stone-700 text-gray-400 opacity-50";
                                } else if (selectedOpt === opt) {
                                    btnStyle = "bg-indigo-50 border-indigo-400 text-indigo-800";
                                }

                                return (
                                    <button key={opt} disabled={isSubmitted} onClick={() => handleSubmit(opt)} className={`w-full text-left p-4 rounded-2xl border-2 transition-all font-bold flex items-center gap-3 ${btnStyle}`}>
                                        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-sm shrink-0">{opt}</span>
                                        <span>{q.options[opt]}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {isSubmitted && (
                            <div className="animate-fade-in border-t border-stone-200 dark:border-stone-700 pt-6">
                                <div className={`p-4 rounded-xl mb-6 font-bold ${selectedOpt === q.ans ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                    {selectedOpt === q.ans ? '🎉 答對了！' : `❌ 答錯了，正確答案是 ${q.ans}`}
                                </div>
                                
                                {q.explain && (
                                    <div className="mb-8">
                                        <h4 className="font-black text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">lightbulb</span> 詳解</h4>
                                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl text-amber-900 dark:text-amber-100 text-sm font-bold whitespace-pre-wrap">{q.explain}</div>
                                    </div>
                                )}

                                {/* 單題留言板 */}
                                <div>
                                    <h4 className="font-black text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">forum</span> 全域討論區 ({comments.length})</h4>
                                    <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {comments.length===0 && <div className="text-xs text-gray-400 font-bold">還沒有人留言喔！</div>}
                                        {comments.map(c => (
                                            <div key={c.id} className="bg-stone-50 dark:bg-stone-800 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                                                <div className="flex justify-between items-center mb-1 text-xs"><span className="font-black dark:text-stone-300">{c.userName}</span><span className="text-gray-400">{c.timestamp?.toDate().toLocaleString('zh-TW')}</span></div>
                                                <div className="text-sm dark:text-white">{c.text}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="分享你的思路..." className="flex-1 p-2 border border-stone-300 dark:border-stone-600 rounded-lg text-sm bg-white dark:bg-stone-900 dark:text-white outline-none" />
                                        <button onClick={postComment} className="bg-indigo-600 text-white px-4 rounded-lg font-bold text-sm shrink-0">發送</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto w-full p-4 md:p-6 space-y-6 pb-20">
            {activeQuestion && <SingleQuestionPlayer q={activeQuestion} onClose={() => { setActiveQuestion(null); window.history.replaceState({}, '', window.location.pathname); }} />}
            
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
                <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] text-white/10 rotate-12">travel_explore</span>
                <h2 className="text-2xl md:text-3xl font-black mb-2 relative z-10">智慧搜尋引擎</h2>
                <p className="text-indigo-100 font-bold mb-6 relative z-10 text-sm md:text-base">一鍵搜索全站公開資源，支援單題即時作答與試卷匯入。</p>
                
                <div className="flex bg-white/20 p-1 rounded-xl w-fit mb-4 relative z-10">
                    <button onClick={() => setSearchMode('question')} className={`px-4 py-1.5 rounded-lg text-sm font-black transition-colors ${searchMode === 'question' ? 'bg-white text-indigo-700 shadow-sm' : 'text-white hover:bg-white/10'}`}>搜單題</button>
                    <button onClick={() => setSearchMode('exam')} className={`px-4 py-1.5 rounded-lg text-sm font-black transition-colors ${searchMode === 'exam' ? 'bg-white text-indigo-700 shadow-sm' : 'text-white hover:bg-white/10'}`}>搜完整試卷</button>
                </div>
                
                <div className="flex gap-2 relative z-10">
                    <input 
                        type="text" 
                        value={searchKeyword} 
                        onChange={e => setSearchKeyword(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && executeSearch()}
                        placeholder={searchMode === 'question' ? "輸入題目關鍵字、標籤..." : "輸入試卷名稱、老師、年份..."}
                        className="flex-1 p-3 rounded-xl text-stone-800 outline-none font-bold placeholder-gray-400"
                    />
                    <button onClick={executeSearch} disabled={isSearching} className="bg-amber-400 hover:bg-amber-500 text-amber-900 px-6 rounded-xl font-black transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center">
                        {isSearching ? <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span> : '搜尋'}
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {results.length > 0 && <h3 className="font-black text-gray-500 ml-1">為您找到 {results.length} 筆結果：</h3>}
                {results.map((item, idx) => (
                    searchMode === 'question' ? (
                        <div key={idx} onClick={() => setActiveQuestion(item)} className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm hover:border-indigo-400 cursor-pointer group transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-[16px] text-indigo-500">quiz</span>
                                {item.tag && <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">#{item.tag}</span>}
                            </div>
                            <div className="font-bold text-sm text-stone-700 dark:text-stone-300 line-clamp-2 group-hover:text-indigo-600 transition-colors">{item.text}</div>
                        </div>
                    ) : (
                        <div key={idx} onClick={() => { showAlert(`正在將試卷匯入...`); window.location.href = `/?shareCode=${item.id}`; }} className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm hover:border-purple-400 cursor-pointer group transition-all flex items-center justify-between">
                            <div>
                                <h4 className="font-black text-purple-700 dark:text-purple-400 mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">description</span> {item.testName}</h4>
                                <div className="text-xs font-bold text-gray-500">{item.numQuestions} 題 • 來自公開試卷區</div>
                            </div>
                            <button className="bg-purple-100 text-purple-700 px-4 py-1.5 rounded-lg text-xs font-black group-hover:bg-purple-600 group-hover:text-white transition-colors">前往挑戰</button>
                        </div>
                    )
                ))}
                {!isSearching && searchKeyword && results.length === 0 && (
                    <div className="text-center py-10 text-gray-400 font-bold border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl">找不到相符的結果</div>
                )}
            </div>
        </div>
    );
};