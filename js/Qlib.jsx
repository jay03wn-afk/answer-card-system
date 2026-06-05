window.QlibDashboard = function QlibDashboard({ user, userProfile, showAlert, showConfirm, showPrompt, onContinueQuiz }) {
    const { useState, useEffect } = React;
    
    const [activeMainTab, setActiveMainTab] = useState('my'); // 切換 'my' (我的題庫)、'store' (題庫商店) 或 'prompt' (出題Prompt)
    const [shopItems, setShopItems] = useState([]);
    
    // --- 新增：出題Prompt系統狀態 ---
    const promptCategories = ['藥析', '生藥', '中藥', '藥理藥化', '藥劑', '生物藥劑'];
    const [activePromptCategory, setActivePromptCategory] = useState(promptCategories[0]);
    const [promptTemplates, setPromptTemplates] = useState([]);
    const [promptRules, setPromptRules] = useState([{ chapter: '', count: 1 }]); // 使用者自訂規則
    const [editingPrompt, setEditingPrompt] = useState(null); // 管理員編輯用
    const [savedPromptConfigs, setSavedPromptConfigs] = useState({}); // 出題組合保存
    // --------------------------------
    
    const [subjects, setSubjects] = useState([]);
    const [activeSubjectId, setActiveSubjectId] = useState(null);
    const [activeChapterId, setActiveChapterId] = useState(null);
    const [importText, setImportText] = useState('');
    const [editingQuestion, setEditingQuestion] = useState(null);
    
    // 上架表單狀態
    const [isPublishing, setIsPublishing] = useState(null);
    const [publishForm, setPublishForm] = useState({ title: '', price: 0, description: '' });

    // 出題系統狀態
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false); // 新增：出題載入中狀態
    const [quizNameInput, setQuizNameInput] = useState(''); 
    const [selectedQuizSubjectId, setSelectedQuizSubjectId] = useState(null); 
    const [selectedQuizChapterIds, setSelectedQuizChapterIds] = useState([]); 
    
    const [quizMode, setQuizMode] = useState('brush'); 
    const [selectedTags, setSelectedTags] = useState([]);
    const [brushCount, setBrushCount] = useState(10);
    const [advTotalCount, setAdvTotalCount] = useState(50);
    // 新增進階出題系統狀態
    const [advModeBy, setAdvModeBy] = useState('tag'); // 'tag' 或 'chapter'
    const [advInputMode, setAdvInputMode] = useState('count'); // 'count' 或 'percent'
    const [advAllocations, setAdvAllocations] = useState({}); 
    const [skipUsed, setSkipUsed] = useState(false);
    const [fallbackStrategy, setFallbackStrategy] = useState('random'); // 'random' (隨機補充) 或 'skip' (不抓)

    // 題目檢索系統狀態
    const [searchQ, setSearchQ] = useState('');
    const [filterTag, setFilterTag] = useState('');
    const [filterDiff, setFilterDiff] = useState('');

    // 載入個人題庫 (自動相容並載入拆分後的題目資料)
    useEffect(() => {
        if (!user) return;
        const unsubscribe = window.db.collection('users').doc(user.uid).collection('qlib').doc('main')
            .onSnapshot(async docSnap => {
                if (!docSnap.exists) return;
                
                // 載入：出題組合
                const loadedConfigs = docSnap.data().promptConfigs || {};
                setSavedPromptConfigs(loadedConfigs);

                let loadedSubjects = docSnap.data().subjects || [];
                try {
                    const qSnap = await window.db.collection('users').doc(user.uid).collection('qlib_questions').get();
                    const qDict = {};
                    qSnap.forEach(d => { qDict[d.id] = d.data().questions || []; });
                    
                    loadedSubjects = loadedSubjects.map(s => ({
                        ...s,
                        chapters: (s.chapters || []).map(c => ({
                            ...c,
                            questions: qDict[c.id] || c.questions || [] // 優先使用獨立資料，無則用舊版
                        }))
                    }));
                } catch(e) { console.error("讀取題庫內容失敗", e); }
                setSubjects(loadedSubjects);
            });
        return () => unsubscribe();
    }, [user]);

    // 載入商店與 Prompt 資料
    useEffect(() => {
        if (activeMainTab === 'store') {
            const unsub = window.db.collection('artifacts').where('type', '==', 'qlibShop').onSnapshot(snap => {
                setShopItems(snap.docs.map(d => ({id: d.id, ...d.data()})));
            });
            return () => unsub();
        } else if (activeMainTab === 'prompt') {
            const unsub = window.db.collection('artifacts').where('type', '==', 'qlibPrompt').onSnapshot(snap => {
                setPromptTemplates(snap.docs.map(d => ({id: d.id, ...d.data()})));
            });
            return () => unsub();
        }
    }, [activeMainTab]);

    // 切換章節時清空搜尋與過濾
    useEffect(() => {
        setSearchQ('');
        setFilterTag('');
        setFilterDiff('');
    }, [activeChapterId]);

    // 分流儲存機制 (突破 1MB 限制)
    const saveToDb = async (newSubjects) => {
        setSubjects(newSubjects); // 樂觀更新 UI
        try {
            const batch = window.db.batch();
            const mainRef = window.db.collection('users').doc(user.uid).collection('qlib').doc('main');
            
            // metadata 不包含 questions 以保持輕量
            const metadataSubjects = newSubjects.map(s => ({
                ...s, chapters: (s.chapters || []).map(c => ({ id: c.id, name: c.name }))
            }));
            batch.set(mainRef, { subjects: metadataSubjects }, { merge: true });
            
            // 將題目拆分到獨立 Document
            newSubjects.forEach(s => {
                (s.chapters || []).forEach(c => {
                    const qRef = window.db.collection('users').doc(user.uid).collection('qlib_questions').doc(c.id);
                    batch.set(qRef, { questions: c.questions || [] }, { merge: true });
                });
            });
            await batch.commit();
        } catch (err) {
            console.error("儲存失敗", err);
            showAlert("儲存失敗，請檢查網路連線。");
        }
    };

    const handleAddSubject = () => {
        showPrompt("請輸入新科目名稱：", "", (name) => {
            if (!name || name.trim() === '') return;
            const newSubj = { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), name: name.trim(), chapters: [] };
            saveToDb([...(subjects || []), newSubj]);
        });
    };

    const handleAddChapter = (subjId) => {
        showPrompt("請輸入新章節名稱：", "", (name) => {
            if (!name || name.trim() === '') return;
            const newSubjects = (subjects || []).map(s => {
                if (s.id === subjId) {
                    return { ...s, chapters: [...(s.chapters || []), { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), name: name.trim(), questions: [] }] };
                }
                return s;
            });
            saveToDb(newSubjects);
        });
    };

    const handleDeleteSubject = (subjId) => {
        showConfirm("確定要刪除此科目及其所有內容嗎？此操作無法還原。", () => {
            saveToDb((subjects || []).filter(s => s.id !== subjId));
            if (activeSubjectId === subjId) {
                setActiveSubjectId(null);
                setActiveChapterId(null);
            }
        });
    };

    const handleDeleteChapter = (subjId, chapId) => {
        showConfirm("確定要刪除此章節及其所有題目嗎？此操作無法還原。", () => {
            const newSubjects = (subjects || []).map(s => {
                if (s.id === subjId) return { ...s, chapters: (s.chapters || []).filter(c => c.id !== chapId) };
                return s;
            });
            saveToDb(newSubjects);
            if (activeChapterId === chapId) setActiveChapterId(null);
        });
    };

    // 搬移章節順序
    const handleMoveChapter = (subjId, chapIdx, direction) => {
        const newSubjects = [...(subjects || [])];
        const subjIdx = newSubjects.findIndex(s => s.id === subjId);
        if (subjIdx === -1) return;
        
        const targetSubj = { ...newSubjects[subjIdx] };
        const newChapters = [...(targetSubj.chapters || [])];
        
        if (direction === 'up' && chapIdx > 0) {
            [newChapters[chapIdx - 1], newChapters[chapIdx]] = [newChapters[chapIdx], newChapters[chapIdx - 1]];
        } else if (direction === 'down' && chapIdx < newChapters.length - 1) {
            [newChapters[chapIdx + 1], newChapters[chapIdx]] = [newChapters[chapIdx], newChapters[chapIdx + 1]];
        } else {
            return; // 已在頂部或底部，無須搬移
        }
        
        targetSubj.chapters = newChapters;
        newSubjects[subjIdx] = targetSubj;
        saveToDb(newSubjects);
    };

    const handleImport = () => {
        if (!importText.trim()) {
            showAlert("請輸入題目內容！");
            return;
        }

        const blocks = importText.split(/\[Q\.\d+\]/i).filter(b => b.trim());
        const parsedQuestions = blocks.map(block => {
            const headerMatch = block.match(/\[#\s*(.*?)\s*\|\s*@\s*(.*?)\s*\|\s*Ans\s*:\s*(.*?)\s*\]/i);
            const tag = headerMatch ? headerMatch[1].trim() : '';
            const difficulty = headerMatch ? headerMatch[2].trim() : '';
            const ans = headerMatch ? headerMatch[3].trim().toUpperCase() : '';

            let text = block.split(/\[A\]/i)[0];
            text = text.replace(/\[#.*?\|@.*?\|Ans\s*:.*?\]/i, '').trim();

            const optA = block.match(/\[A\]([\s\S]*?)(?=\[B\]|\[C\]|\[D\]|\[Explain:|$)/i)?.[1].trim() || '';
            const optB = block.match(/\[B\]([\s\S]*?)(?=\[C\]|\[D\]|\[Explain:|$)/i)?.[1].trim() || '';
            const optC = block.match(/\[C\]([\s\S]*?)(?=\[D\]|\[Explain:|$)/i)?.[1].trim() || '';
            const optD = block.match(/\[D\]([\s\S]*?)(?=\[Explain:|$)/i)?.[1].trim() || '';
            
            let explain = '';
            const explainMatch = block.match(/\[Explain:([\s\S]*?)\]/i);
            if (explainMatch) {
                explain = explainMatch[1].trim();
            } else {
                const explainMatchFallback = block.match(/\[Explain:([\s\S]*)$/i);
                if (explainMatchFallback) explain = explainMatchFallback[1].trim();
            }

            return {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                text, tag, difficulty, ans, options: { A: optA, B: optB, C: optC, D: optD }, explain
            };
        }).filter(q => q.text || q.options.A);

        if (parsedQuestions.length === 0) {
            showAlert("解析失敗，請檢查格式是否符合規範。");
            return;
        }

        const newSubjects = (subjects || []).map(s => {
            if (s.id === activeSubjectId) {
                return {
                    ...s,
                    chapters: (s.chapters || []).map(c => {
                        if (c.id === activeChapterId) return { ...c, questions: [...(c.questions || []), ...parsedQuestions] };
                        return c;
                    })
                };
            }
            return s;
        });

        saveToDb(newSubjects);
        setImportText('');
        showAlert(`成功匯入 ${parsedQuestions.length} 題！`);
    };

    const handleClearQuestions = () => {
        showConfirm("確定要清空此章節的所有題目嗎？此操作無法還原。", () => {
            const newSubjects = (subjects || []).map(s => {
                if (s.id === activeSubjectId) {
                    return {
                        ...s,
                        chapters: (s.chapters || []).map(c => {
                            if (c.id === activeChapterId) return { ...c, questions: [] };
                            return c;
                        })
                    };
                }
                return s;
            });
            saveToDb(newSubjects);
        });
    };

    const handleDeleteQuestion = (qId) => {
        showConfirm("確定要刪除這題嗎？", () => {
            const newSubjects = (subjects || []).map(s => {
                if (s.id === activeSubjectId) {
                    return {
                        ...s,
                        chapters: (s.chapters || []).map(c => {
                            if (c.id === activeChapterId) return { ...c, questions: (c.questions || []).filter(q => q.id !== qId) };
                            return c;
                        })
                    };
                }
                return s;
            });
            saveToDb(newSubjects);
        });
    };

    const handleSaveEdit = () => {
        const newSubjects = (subjects || []).map(s => {
            if (s.id === activeSubjectId) {
                return {
                    ...s,
                    chapters: (s.chapters || []).map(c => {
                        if (c.id === activeChapterId) {
                            return { ...c, questions: (c.questions || []).map(q => q.id === editingQuestion.id ? editingQuestion : q) };
                        }
                        return c;
                    })
                };
            }
            return s;
        });
        saveToDb(newSubjects);
        setEditingQuestion(null);
    };

    const submitPublish = async () => {
        if (!publishForm.title.trim()) {
            showAlert("請輸入上架標題！");
            return;
        }
        if (publishForm.price < 0 || publishForm.price > 2000) {
            showAlert("價格必須設定在 0 到 2000 鑽石之間！");
            return;
        }

        try {
            await window.db.collection('artifacts').add({
                type: 'qlibShop',
                authorId: user.uid,
                authorName: userProfile?.displayName || '匿名分享者',
                authorEmail: user.email,
                title: publishForm.title.trim(),
                description: publishForm.description.trim(),
                price: parseInt(publishForm.price) || 0,
                // 將單一章節包裝成科目結構，這樣購買者拿到時就能直接無縫存入資料庫
                subjectData: {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name: publishForm.title.trim(),
                    chapters: [{ ...isPublishing, id: Date.now().toString() + Math.random().toString(36).substr(2, 5) }]
                },
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                downloads: 0
            });
            showAlert("成功上架至題庫商店！");
            setIsPublishing(null);
            setPublishForm({ title: '', price: 0, description: '' });
        } catch (e) {
            showAlert("上架失敗：" + e.message);
        }
    };

    const handleBuyQlib = async (item) => {
        if (item.authorId === user.uid) return showAlert("不能購買自己上架的題庫喔！");
        if (subjects.some(s => s.originalShopId === item.id)) return showAlert("您已經擁有此題庫，請至目錄中查看。");
        
        const currentDiamonds = userProfile?.mcData?.diamonds || 0;
        if (currentDiamonds < item.price) return showAlert(`鑽石不足！需要 ${item.price} 顆，您目前擁有 ${currentDiamonds} 顆。`);

        showConfirm(`確定要花費 ${item.price} 鑽石購買「${item.title}」嗎？\n(購買後將自動加入您的題庫目錄)`, async () => {
            try {
                const sellerEarn = Math.floor(item.price * 0.8);
                
                await window.db.collection('users').doc(user.uid).set({
                    mcData: { diamonds: currentDiamonds - item.price }
                }, { merge: true });

                if (item.price > 0 && item.authorId) {
                    const sellerRef = window.db.collection('users').doc(item.authorId);
                    await window.db.runTransaction(async (t) => {
                        const sDoc = await t.get(sellerRef);
                        if (sDoc.exists) {
                            const sDia = sDoc.data().mcData?.diamonds || 0;
                            t.set(sellerRef, { mcData: { diamonds: sDia + sellerEarn } }, { merge: true });
                        }
                    });
                }

                const newSubj = {
                    ...item.subjectData,
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name: `${item.title} (商店取得)`,
                    originalShopId: item.id
                };
                saveToDb([...subjects, newSubj]);

                window.db.collection('artifacts').doc(item.id).update({
                    downloads: window.firebase.firestore.FieldValue.increment(1)
                });

                showAlert("購買成功！已存入您的題庫。");
                setActiveMainTab('my');
            } catch (err) {
                showAlert("購買失敗：" + err.message);
            }
        });
    };

    const handleDeleteShopItem = (item) => {
        showConfirm("確定要將此題庫下架嗎？已購買的使用者將不受影響。", () => {
            window.db.collection('artifacts').doc(item.id).delete().then(() => {
                showAlert("已成功下架。");
            }).catch(e => showAlert("下架失敗：" + e.message));
        });
    };

    // --- 新增：Prompt 系統功能 ---
    const handleCopyPrompt = (templateContent) => {
        const validRules = promptRules.filter(r => r.chapter.trim() !== '' && r.count > 0);
        let prefix = '';
        
        if (validRules.length > 0) {
            const chapters = validRules.map(r => r.chapter.trim());
            const totalCount = validRules.reduce((sum, r) => sum + parseInt(r.count), 0);
            const details = validRules.map(r => `${r.chapter.trim()}-${r.count}題`);
            
            prefix = `指定標籤(僅限這些): ${chapters.join('、')}，共${totalCount}題 其中${details.join('、')}\n\n`;
        }
        
        const finalPrompt = prefix + templateContent;
        navigator.clipboard.writeText(finalPrompt)
            .then(() => showAlert("Prompt 已複製到剪貼簿！"))
            .catch(err => showAlert("複製失敗：" + err));
    };

    const handleSavePrompt = async () => {
        if (!editingPrompt.title || !editingPrompt.content) {
            showAlert("標題與內容不能為空");
            return;
        }
        try {
            if (editingPrompt.id) {
                await window.db.collection('artifacts').doc(editingPrompt.id).update({
                    title: editingPrompt.title,
                    content: editingPrompt.content,
                    category: editingPrompt.category,
                    updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                await window.db.collection('artifacts').add({
                    type: 'qlibPrompt',
                    title: editingPrompt.title,
                    content: editingPrompt.content,
                    category: editingPrompt.category,
                    authorEmail: user.email,
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            setEditingPrompt(null);
            showAlert("儲存成功！");
        } catch (e) {
            showAlert("儲存失敗: " + e.message);
        }
    };

    const handleDeletePrompt = (id) => {
        showConfirm("確定要刪除此 Prompt 嗎？", () => {
            window.db.collection('artifacts').doc(id).delete()
                .then(() => showAlert("刪除成功！"))
                .catch(e => showAlert("刪除失敗：" + e.message));
        });
    };

    // --- 新增：保存出題組合功能 ---
    const handleSavePromptConfig = () => {
        const validRules = promptRules.filter(r => r.chapter.trim() !== '' && r.count > 0);
        if (validRules.length === 0) return showAlert("請先輸入至少一個有效的章節與題數！");

        showPrompt("請為此出題組合命名 (例如：考前衝刺五十題)：", "", async (name) => {
            if (!name || !name.trim()) return;
            const currentCat = activePromptCategory;
            const catConfigs = savedPromptConfigs[currentCat] || [];
            
            if (catConfigs.length >= 50) return showAlert(`「${currentCat}」最多只能儲存 50 個組合！`);

            const newConfig = {
                id: Date.now().toString(),
                name: name.trim(),
                rules: validRules
            };

            const newConfigs = { ...savedPromptConfigs, [currentCat]: [...catConfigs, newConfig] };
            
            try {
                setSavedPromptConfigs(newConfigs);
                await window.db.collection('users').doc(user.uid).collection('qlib').doc('main').set({
                    promptConfigs: newConfigs
                }, { merge: true });
                showAlert("組合保存成功！");
            } catch(e) {
                showAlert("保存失敗：" + e.message);
            }
        });
    };

    const handleDeletePromptConfig = (id) => {
        showConfirm("確定要刪除這個出題組合嗎？", async () => {
            const currentCat = activePromptCategory;
            const catConfigs = savedPromptConfigs[currentCat] || [];
            const newConfigs = { ...savedPromptConfigs, [currentCat]: catConfigs.filter(c => c.id !== id) };
            
            try {
                setSavedPromptConfigs(newConfigs);
                await window.db.collection('users').doc(user.uid).collection('qlib').doc('main').set({
                    promptConfigs: newConfigs
                }, { merge: true });
            } catch(e) {
                showAlert("刪除失敗：" + e.message);
            }
        });
    };
    // ------------------------------

    const activeSubject = (subjects || []).find(s => s.id === activeSubjectId);
    const activeChapter = (activeSubject?.chapters || []).find(c => c.id === activeChapterId);

    // 檢索過濾系統
    const chapterTags = [...new Set((activeChapter?.questions || []).map(q => q.tag).filter(Boolean))];
    const chapterDiffs = [...new Set((activeChapter?.questions || []).map(q => q.difficulty).filter(Boolean))];
    const displayedQuestions = (activeChapter?.questions || []).filter(q => {
        const lowerSearch = searchQ.toLowerCase();
        const matchSearch = !searchQ || q.text.toLowerCase().includes(lowerSearch) || (q.explain || '').toLowerCase().includes(lowerSearch);
        const matchTag = !filterTag || q.tag === filterTag;
        const matchDiff = !filterDiff || q.difficulty === filterDiff;
        return matchSearch && matchTag && matchDiff;
    });

    const quizTargetSubject = (subjects || []).find(s => s.id === selectedQuizSubjectId) || (subjects || [])[0];
    const quizTargetChapters = quizTargetSubject ? (quizTargetSubject.chapters || []).filter(c => selectedQuizChapterIds.length === 0 || selectedQuizChapterIds.includes(c.id)) : [];
    
    // 將章節資訊塞入題目，方便後續按照章節分配
    const availableQuestionsForQuiz = quizTargetChapters.flatMap(c => 
        (c.questions || []).map(q => ({...q, chapterId: c.id, chapterName: c.name}))
    );

    const availableTags = [...new Set(availableQuestionsForQuiz.map(q => q.tag).filter(Boolean))];
    const availableChapters = quizTargetChapters.map(c => ({ id: c.id, name: c.name }));

    // 切換模式或開啟 Modal 時初始化配額
    useEffect(() => {
        if (showQuizModal) {
            setAdvAllocations({});
            setSelectedTags(prev => prev.filter(t => availableTags.includes(t)));
        }
    }, [selectedQuizSubjectId, selectedQuizChapterIds, showQuizModal, advModeBy]);

    const handleGenerateQuiz = async () => {
        const finalBrushCount = parseInt(brushCount) || 0;
        const finalAdvCount = parseInt(advTotalCount) || 0;

        if (quizMode === 'brush' && finalBrushCount <= 0) return showAlert("抽題數量必須大於 0！");
        if (quizMode === 'advanced' && advInputMode === 'count' && finalAdvCount <= 0) return showAlert("試卷總題數必須大於 0！");

        setIsGeneratingQuiz(true); // 開啟載入畫面

        // 稍微延遲讓 React 有時間先渲染 Loading UI
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            let basePool = availableQuestionsForQuiz;
            if (skipUsed) basePool = basePool.filter(q => !q.usedCount || q.usedCount === 0);

            if (basePool.length === 0) {
                showAlert("所選範圍內沒有足夠的題目（或已全被略過）！");
                return;
            }

            let pool = [];
            if (quizMode === 'brush') {
                let filteredPool = basePool.filter(q => selectedTags.length === 0 || selectedTags.includes(q.tag));
                pool = filteredPool.sort(() => 0.5 - Math.random()).slice(0, finalBrushCount);
                
                if (pool.length < finalBrushCount && fallbackStrategy === 'random') {
                    const diff = finalBrushCount - pool.length;
                    const usedIds = new Set(pool.map(q => q.id));
                    const extraPool = basePool.filter(q => !usedIds.has(q.id)).sort(() => 0.5 - Math.random()).slice(0, diff);
                    pool = [...pool, ...extraPool];
                }
            } else {
                let finalSelection = [];
                const allocKeys = Object.keys(advAllocations).filter(k => Number(advAllocations[k]) > 0);
                const targetCounts = {};
                
                if (advInputMode === 'percent') {
                    const totalPct = allocKeys.reduce((sum, k) => sum + Number(advAllocations[k]), 0);
                    if (totalPct === 0) {
                        showAlert("請設定至少一個比例大於 0");
                        return;
                    }
                    allocKeys.forEach(k => {
                        targetCounts[k] = Math.round((finalAdvCount * Number(advAllocations[k])) / totalPct);
                    });
                } else {
                    allocKeys.forEach(k => { targetCounts[k] = Number(advAllocations[k]); });
                }

                allocKeys.forEach(k => {
                    let needed = targetCounts[k];
                    if (needed <= 0) return;
                    
                    let groupPool = basePool.filter(q => advModeBy === 'tag' ? q.tag === k : q.chapterId === k);
                    groupPool = groupPool.sort(() => 0.5 - Math.random());
                    
                    let selected = groupPool.slice(0, needed);
                    finalSelection.push(...selected);
                    
                    if (selected.length < needed && fallbackStrategy === 'random') {
                        const diff = needed - selected.length;
                        const usedIds = new Set(finalSelection.map(q=>q.id));
                        const extras = basePool.filter(q => !usedIds.has(q.id)).sort(() => 0.5 - Math.random()).slice(0, diff);
                        finalSelection.push(...extras);
                    }
                });
                pool = finalSelection.sort(() => 0.5 - Math.random());
            }

            if (pool.length === 0) {
                showAlert("找不到符合條件的題目，請重新調整篩選條件！");
                return;
            }

            const poolIds = new Set(pool.map(q => q.id));
            const newSubjects = subjects.map(s => {
                if (s.id !== selectedQuizSubjectId) return s;
                return {
                    ...s,
                    chapters: (s.chapters || []).map(c => ({
                        ...c,
                        questions: (c.questions || []).map(q => poolIds.has(q.id) ? { ...q, usedCount: (q.usedCount || 0) + 1 } : q)
                    }))
                };
            });
            await saveToDb(newSubjects); // 等待題庫紀錄更新完成

            let textContent = '';
            let htmlContent = '';
            let expHtml = '';
            let answersArray = [];

            pool.forEach((q, idx) => {
                const qNum = idx + 1;
                textContent += `[Q.${qNum}]\n[#${q.tag || '未分類'}|@${q.difficulty || '1'}]\n${q.text || ''}\n[A] ${q.options?.A || ''}\n[B] ${q.options?.B || ''}\n[C] ${q.options?.C || ''}\n[D] ${q.options?.D || ''}\n[End]\n\n`;
                htmlContent += `[Q.${qNum}]<br><div class="qlib-question-tags" style="color:#a8a29e; font-size:0.85em; font-weight:800; margin-bottom:6px; padding:2px 8px; background:rgba(0,0,0,0.04); display:inline-block; border-radius:6px;">[ #${q.tag || '未分類'} | 難度:${q.difficulty || '1'} ]</div><br>${(q.text || '').replace(/\n/g, '<br>')}<br>[A] ${(q.options?.A || '').replace(/\n/g, '<br>')}<br>[B] ${(q.options?.B || '').replace(/\n/g, '<br>')}<br>[C] ${(q.options?.C || '').replace(/\n/g, '<br>')}<br>[D] ${(q.options?.D || '').replace(/\n/g, '<br>')}<br>[End]<br><br>`;
                answersArray.push(q.ans || 'A');
                if (q.explain) expHtml += `[A.${qNum}]<br>${q.explain.replace(/\n/g, '<br>')}<br>[End]<br><br>`;
            });

            const correctAnswersStr = answersArray.join(',');
            const quizId = Date.now().toString();
            const fallbackName = quizMode === 'brush' ? `題庫刷題 (${pool.length}題)` : `進階配題 (${pool.length}題)`;
            const finalTestName = quizNameInput.trim() !== '' ? quizNameInput.trim() : fallbackName;

            const quizData = {
                id: quizId, testName: finalTestName, folder: '我的題庫', numQuestions: pool.length,
                maxScore: 100, roundScore: true, correctAnswersInput: correctAnswersStr,
                publishAnswers: true, allowPeek: true, hasSeparatedContent: true, isCompleted: false,
                userAnswers: Array(pool.length).fill(''), starred: Array(pool.length).fill(false),
                notes: Array(pool.length).fill(''), peekedAnswers: Array(pool.length).fill(false),
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            };

            const compressedText = window.jzCompress ? window.jzCompress(textContent) : textContent;
            const compressedHtml = window.jzCompress ? window.jzCompress(htmlContent) : htmlContent;
            const compressedExp = window.jzCompress ? window.jzCompress(expHtml) : expHtml;
            const contentData = { questionText: compressedText, questionHtml: compressedHtml, explanationHtml: compressedExp };

            await window.db.collection('users').doc(user.uid).collection('quizzes').doc(quizId).set(quizData);
            await window.db.collection('users').doc(user.uid).collection('quizContents').doc(quizId).set(contentData);
            
            setShowQuizModal(false);
            if (onContinueQuiz) onContinueQuiz({ ...quizData, ...contentData });
            else showAlert("出題成功，但尚未綁定跳轉功能。");

        } catch (err) {
            console.error(err);
            showAlert("試卷產生失敗，請檢查網路狀態。");
        } finally {
            setIsGeneratingQuiz(false); // 無論成功失敗，都關閉載入畫面
        }
    };

    return (
        <div className="flex h-full w-full bg-[#FCFBF7] dark:bg-stone-900 transition-colors">
            {/* 左側邊欄：雙分頁與科目目錄 */}
            <div className="w-64 border-r border-stone-200 dark:border-stone-700 flex flex-col bg-stone-50 dark:bg-stone-900 shrink-0">
                <div className="flex bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                    <button 
                        onClick={() => setActiveMainTab('my')} 
                        className={`flex-1 py-2 font-black text-[13px] flex flex-col items-center justify-center gap-1 transition-colors ${activeMainTab === 'my' ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border-b-2 border-amber-500' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">library_books</span> 我的題庫
                    </button>
                    <button 
                        onClick={() => setActiveMainTab('store')} 
                        className={`flex-1 py-2 font-black text-[13px] flex flex-col items-center justify-center gap-1 transition-colors ${activeMainTab === 'store' ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border-b-2 border-amber-500' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">storefront</span> 題庫商店
                    </button>
                    <button 
                        onClick={() => setActiveMainTab('prompt')} 
                        className={`flex-1 py-2 font-black text-[13px] flex flex-col items-center justify-center gap-1 transition-colors ${activeMainTab === 'prompt' ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border-b-2 border-amber-500' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">smart_toy</span> 出題Prompt
                    </button>
                </div>

                {activeMainTab === 'my' ? (
                    <>
                        <div className="p-3 flex justify-between items-center bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                            <span className="font-bold text-sm text-stone-600 dark:text-stone-300">科目列表</span>
                            <button onClick={(e) => { e.stopPropagation(); handleAddSubject(); }} className="text-amber-600 hover:text-amber-800 dark:text-amber-400" title="新增科目">
                                <span className="material-symbols-outlined text-[20px]">add_box</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {(subjects || []).length === 0 && <div className="text-sm text-gray-400 text-center py-4">目前尚無科目</div>}
                            {(subjects || []).map(subj => (
                                <div key={subj.id} className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-stone-800">
                                    <div className="flex justify-between items-center px-3 py-2 bg-stone-100 dark:bg-stone-700">
                                        <button onClick={() => setActiveSubjectId(activeSubjectId === subj.id ? null : subj.id)} className="flex-1 text-left font-bold text-sm text-stone-700 dark:text-stone-200 truncate focus:outline-none">
                                            {subj.name}
                                        </button>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={(e) => { e.stopPropagation(); handleAddChapter(subj.id); }} className="text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400" title="新增章節"><span className="material-symbols-outlined text-[18px]">add_circle</span></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subj.id); }} className="text-gray-400 hover:text-red-500" title="刪除科目"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                        </div>
                                    </div>
                                    {activeSubjectId === subj.id && (
                                        <div className="p-2 space-y-1 bg-stone-50 dark:bg-stone-800/30 border-t border-stone-200 dark:border-stone-700">
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setSelectedQuizSubjectId(subj.id);
                                                    setSelectedQuizChapterIds(subj.chapters.map(c => c.id));
                                                    setQuizNameInput('');
                                                    setShowQuizModal(true); 
                                                }} 
                                                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 rounded-lg shadow-sm flex justify-center items-center gap-1 transition-transform active:scale-95 mb-2 text-xs"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">quiz</span>
                                                從此科目出題
                                            </button>
                                            {(subj.chapters || []).length === 0 && <div className="text-xs text-gray-400 px-2 py-1">無章節</div>}
                                            {(subj.chapters || []).map((chap, chapIdx) => (
                                                <div key={chap.id} className={`group flex justify-between items-center px-2 py-1.5 rounded-lg transition-colors ${activeChapterId === chap.id ? 'bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700' : 'hover:bg-stone-100 dark:hover:bg-stone-700 border border-transparent'}`}>
                                                    <button onClick={() => setActiveChapterId(chap.id)} className={`flex-1 text-left text-xs font-bold truncate focus:outline-none ${activeChapterId === chap.id ? 'text-amber-800 dark:text-amber-400' : 'text-stone-600 dark:text-stone-300'}`}>
                                                        <span className="material-symbols-outlined text-[14px] align-middle mr-1">folder_open</span> {chap.name} ({(chap.questions || []).length})
                                                    </button>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ opacity: activeChapterId === chap.id ? 1 : undefined }}>
                                                        <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(subj.id, chapIdx, 'up'); }} className="text-gray-400 hover:text-cyan-600" title="上移章節"><span className="material-symbols-outlined text-[14px]">arrow_upward</span></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(subj.id, chapIdx, 'down'); }} className="text-gray-400 hover:text-cyan-600" title="下移章節"><span className="material-symbols-outlined text-[14px]">arrow_downward</span></button>
                                                        <button onClick={(e) => { e.stopPropagation(); setPublishForm({ title: chap.name, price: 0, description: '' }); setIsPublishing(chap); }} className="text-gray-400 hover:text-amber-500" title="上架至商店"><span className="material-symbols-outlined text-[14px]">publish</span></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteChapter(subj.id, chap.id); }} className="text-gray-400 hover:text-red-500" title="刪除章節"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                ) : activeMainTab === 'store' ? (
                    <div className="p-6 flex flex-col items-center justify-center text-center text-gray-400 flex-1">
                        <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">shopping_bag</span>
                        <span className="font-bold text-sm">請於右側瀏覽選購</span>
                    </div>
                ) : (
                    <>
                        <div className="p-3 flex justify-between items-center bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                            <span className="font-bold text-sm text-stone-600 dark:text-stone-300">Prompt 分類</span>
                            {user?.email === 'jay03wn@gmail.com' && (
                                <button onClick={(e) => { e.stopPropagation(); setEditingPrompt({ title: '', content: '', category: activePromptCategory }); }} className="text-amber-600 hover:text-amber-800 dark:text-amber-400" title="新增Prompt">
                                    <span className="material-symbols-outlined text-[20px]">add_box</span>
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {promptCategories.map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => setActivePromptCategory(cat)}
                                    className={`w-full text-left px-3 py-2 font-bold text-sm rounded-lg transition-colors ${activePromptCategory === cat ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-700' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 border border-transparent'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* 右側內容區 */}
            {activeMainTab === 'my' ? (
                <div className="flex-1 flex flex-col overflow-hidden bg-[#FCFBF7] dark:bg-stone-900">
                    {!activeChapter ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
                            <span className="material-symbols-outlined text-[64px] mb-4 opacity-50">library_books</span>
                            <p className="font-bold">請從左側選擇或建立一個章節來開始管理題庫</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col">
                            <div className="flex justify-between items-end mb-4 border-b border-stone-200 dark:border-stone-700 pb-4 shrink-0">
                                <div>
                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{activeSubject?.name}</div>
                                    <h1 className="text-2xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2">
                                        {activeChapter.name} <span className="text-sm font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">共 {(activeChapter.questions || []).length} 題</span>
                                    </h1>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(activeChapter.questions || []).length > 0 && (
                                        <button 
                                            onClick={() => {
                                                setSelectedQuizSubjectId(activeSubjectId);
                                                setSelectedQuizChapterIds([activeChapterId]);
                                                setQuizNameInput('');
                                                setShowQuizModal(true);
                                            }} 
                                            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm px-4 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-transform active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">quiz</span> 從此章節出題
                                        </button>
                                    )}
                                    {(activeChapter.questions || []).length > 0 && (
                                        <button onClick={handleClearQuestions} className="text-red-500 font-bold text-sm bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center gap-1 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">delete_sweep</span> 一鍵清空
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 檢索與過濾 */}
                            <div className="flex gap-2 mb-6 bg-white dark:bg-stone-800 p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm shrink-0">
                                <div className="flex-1 relative">
                                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-gray-400 text-[18px]">search</span>
                                    <input 
                                        type="text" 
                                        placeholder="搜尋題目或詳解..." 
                                        value={searchQ} 
                                        onChange={e => setSearchQ(e.target.value)} 
                                        className="w-full pl-9 pr-3 py-1.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white" 
                                    />
                                </div>
                                <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="w-32 px-2 py-1.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white font-bold cursor-pointer">
                                    <option value="">所有標籤</option>
                                    {chapterTags.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)} className="w-32 px-2 py-1.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white font-bold cursor-pointer">
                                    <option value="">所有難度</option>
                                    {chapterDiffs.map(d => <option key={d} value={d}>難度: {d}</option>)}
                                </select>
                            </div>

                            <div className="mb-6 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 shadow-sm shrink-0">
                                <h3 className="font-bold text-stone-800 dark:text-stone-200 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-cyan-600 text-[18px]">upload_file</span> 批次匯入題目</h3>
                                <textarea
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    placeholder="請貼上符合格式的題目...&#10;範例：&#10;[Q.001]&#10;[#標籤|@難度|Ans:A]&#10;題目文字...&#10;[A]選項A&#10;[B]選項B&#10;[C]選項C&#10;[D]選項D&#10;[Explain:詳解]"
                                    className="w-full h-24 p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none focus:border-amber-500 font-mono text-sm resize-none custom-scrollbar dark:text-stone-200"
                                />
                                <div className="flex justify-end mt-2">
                                    <button onClick={handleImport} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-colors text-sm">
                                        <span className="material-symbols-outlined text-[16px]">save_alt</span> 執行匯入
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {displayedQuestions.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 font-bold border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-xl">找不到符合條件的題目</div>
                                ) : displayedQuestions.map((q, idx) => (
                                    <div key={q.id} className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 shadow-sm relative group">
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingQuestion(q)} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-stone-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-amber-100 hover:text-amber-600 transition-colors" title="編輯"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                            <button onClick={() => handleDeleteQuestion(q.id)} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-stone-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors" title="刪除"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-3 pr-20">
                                            <span className="text-xs font-black bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-800 px-2 py-0.5 rounded">Q</span>
                                            {q.tag && <span className="text-xs font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">sell</span>{q.tag}</span>}
                                            {q.difficulty && <span className="text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">bar_chart</span>難度: {q.difficulty}</span>}
                                            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">check_circle</span>答案: {q.ans}</span>
                                            {q.usedCount > 0 && <span className="text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">history</span>已出過 ({q.usedCount}次)</span>}
                                        </div>
                                        <div className="font-bold text-stone-800 dark:text-stone-100 mb-3 whitespace-pre-wrap">{q.text}</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-stone-600 dark:text-stone-300 mb-3">
                                            <div className="p-2 bg-stone-50 dark:bg-stone-900 rounded border border-stone-100 dark:border-stone-700"><span className="font-black text-amber-600 dark:text-amber-400 mr-2">A</span>{q.options.A}</div>
                                            <div className="p-2 bg-stone-50 dark:bg-stone-900 rounded border border-stone-100 dark:border-stone-700"><span className="font-black text-amber-600 dark:text-amber-400 mr-2">B</span>{q.options.B}</div>
                                            <div className="p-2 bg-stone-50 dark:bg-stone-900 rounded border border-stone-100 dark:border-stone-700"><span className="font-black text-amber-600 dark:text-amber-400 mr-2">C</span>{q.options.C}</div>
                                            <div className="p-2 bg-stone-50 dark:bg-stone-900 rounded border border-stone-100 dark:border-stone-700"><span className="font-black text-amber-600 dark:text-amber-400 mr-2">D</span>{q.options.D}</div>
                                        </div>
                                        {q.explain && (
                                            <div className="text-sm bg-amber-50 dark:bg-stone-900/50 border border-amber-200 dark:border-stone-700 p-3 rounded-lg text-amber-900 dark:text-amber-100">
                                                <div className="font-black mb-1 flex items-center gap-1 text-amber-700 dark:text-amber-500"><span className="material-symbols-outlined text-[16px]">lightbulb</span>詳解</div>
                                                <div className="whitespace-pre-wrap">{q.explain}</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : activeMainTab === 'store' ? (
                <div className="flex-1 flex flex-col bg-[#FCFBF7] dark:bg-stone-900 overflow-hidden">
                    <div className="p-6 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shrink-0">
                        <h1 className="text-3xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[36px] text-amber-500">storefront</span> 題庫共享商店
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 font-bold">在這裡探索其他玩家分享的優質題庫。購買後即可無限制用來隨機產生測驗！</p>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        {shopItems.length === 0 ? (
                            <div className="text-center text-gray-400 font-bold py-10">目前商店中沒有商品上架。</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {shopItems.map(item => {
                                    const isOwned = subjects.some(s => s.originalShopId === item.id);
                                    const isMine = item.authorId === user.uid;
                                    const isAdmin = user.email === 'jay03wn@gmail.com';
                                    const isOfficial = item.authorEmail === 'jay03wn@gmail.com';

                                    return (
                                        <div key={item.id} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden">
                                            {isOfficial && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">stars</span> 官方精選</div>}
                                            <h3 className={`text-xl font-bold text-stone-800 dark:text-white leading-tight mb-2 ${isOfficial ? 'pr-20' : ''}`}>{item.title}</h3>
                                            
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1 font-bold">
                                                <span className="material-symbols-outlined text-[14px]">person</span> {item.authorName}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow whitespace-pre-wrap">{item.description || '無詳細描述'}</p>
                                            
                                            <div className="flex justify-between items-center pt-4 border-t border-stone-100 dark:border-stone-700 mt-auto">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 text-lg">
                                                        <span className="material-symbols-outlined text-[20px]">diamond</span> {item.price}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-bold">{item.downloads || 0} 次下載</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {(isMine || isAdmin) && (
                                                        <button onClick={() => handleDeleteShopItem(item)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 border border-red-100 transition-colors" title="下架刪除">
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    )}
                                                    <button 
                                                        disabled={isOwned || isMine}
                                                        onClick={() => handleBuyQlib(item)} 
                                                        className={`px-4 py-2 font-bold text-sm rounded-xl shadow-sm flex items-center gap-1 ${isOwned || isMine ? 'bg-gray-100 text-gray-400 dark:bg-stone-700' : 'bg-amber-500 text-white hover:bg-amber-600 transition-transform active:scale-95'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">{isOwned ? 'check_circle' : 'shopping_cart'}</span> 
                                                        {isOwned ? '已擁有' : isMine ? '我的上架' : '購買'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-[#FCFBF7] dark:bg-stone-900 overflow-hidden">
                    <div className="p-6 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shrink-0">
                        <h1 className="text-3xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[36px] text-amber-500">smart_toy</span> 出題 Prompt 庫
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 font-bold">複製官方設計的 Prompt，貼給 AI 幫您產出高品質的國考考題！</p>
                        
                        <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
                            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                                <h3 className="text-sm font-black text-stone-700 dark:text-stone-300 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[18px]">tune</span> 複製前設定：指定出題範圍與題數
                                </h3>
                                <button onClick={handleSavePromptConfig} className="text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors flex items-center gap-1 active:scale-95 shadow-sm">
                                    <span className="material-symbols-outlined text-[14px]">save</span> 儲存當前組合
                                </button>
                            </div>

                            {/* 已儲存的組合標籤列 */}
                            {(savedPromptConfigs[activePromptCategory] || []).length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-3 mb-2 custom-scrollbar items-center">
                                    <span className="text-xs font-bold text-gray-500 shrink-0">已儲存：</span>
                                    {(savedPromptConfigs[activePromptCategory] || []).map(c => (
                                        <div key={c.id} className="flex items-center gap-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-full pl-3 pr-1 py-1 shrink-0 shadow-sm">
                                            <button onClick={() => setPromptRules(c.rules)} className="text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-amber-600 transition-colors">{c.name}</button>
                                            <button onClick={() => handleDeletePromptConfig(c.id)} className="text-gray-400 hover:text-red-500 rounded-full p-0.5 transition-colors flex items-center justify-center" title="刪除此組合"><span className="material-symbols-outlined text-[14px]">cancel</span></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                {promptRules.map((rule, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input 
                                            type="text" 
                                            placeholder="章節名稱 (例如: 總論)" 
                                            value={rule.chapter}
                                            onChange={(e) => {
                                                const newRules = [...promptRules];
                                                newRules[idx].chapter = e.target.value;
                                                setPromptRules(newRules);
                                            }}
                                            className="flex-1 p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white focus:border-amber-500"
                                        />
                                        <input 
                                            type="number" 
                                            min="1"
                                            placeholder="題數" 
                                            value={rule.count}
                                            onChange={(e) => {
                                                const newRules = [...promptRules];
                                                newRules[idx].count = parseInt(e.target.value) || 0;
                                                setPromptRules(newRules);
                                            }}
                                            className="w-20 p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white focus:border-amber-500 text-center"
                                        />
                                        <button 
                                            onClick={() => {
                                                const newRules = promptRules.filter((_, i) => i !== idx);
                                                setPromptRules(newRules);
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => setPromptRules([...promptRules, { chapter: '', count: 1 }])}
                                    className="text-sm font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 flex items-center gap-1 mt-2"
                                >
                                    <span className="material-symbols-outlined text-[16px]">add</span> 新增範圍
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        {promptTemplates.filter(p => p.category === activePromptCategory).length === 0 ? (
                            <div className="text-center text-gray-400 font-bold py-10">此分類尚無 Prompt。</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {promptTemplates.filter(p => p.category === activePromptCategory).map(template => (
                                    <div key={template.id} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm flex flex-col relative">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-lg font-black text-stone-800 dark:text-white">{template.title}</h3>
                                            <div className="flex gap-2">
                                                {user?.email === 'jay03wn@gmail.com' && (
                                                    <>
                                                        <button onClick={() => setEditingPrompt(template)} className="p-2 text-gray-400 hover:text-amber-500 transition-colors" title="編輯">
                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        </button>
                                                        <button onClick={() => handleDeletePrompt(template.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="刪除">
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    </>
                                                )}
                                                <button 
                                                    onClick={() => handleCopyPrompt(template.content)}
                                                    className="px-4 py-1.5 font-bold text-sm bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-800 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1 active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">content_copy</span> 複製 Prompt
                                                </button>
                                            </div>
                                        </div>
                                        <pre className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono bg-stone-50 dark:bg-stone-900 p-4 rounded-xl border border-stone-100 dark:border-stone-700 max-h-64 overflow-y-auto custom-scrollbar">
                                            {template.content}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 上架 Modal */}
            {isPublishing && (
                <div className="fixed inset-0 z-[150] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-stone-200 dark:border-stone-700 pb-3">
                            <h3 className="text-xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2"><span className="material-symbols-outlined">publish</span> 上架至商店</h3>
                            <button onClick={() => setIsPublishing(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">上架名稱</label>
                                <input type="text" value={publishForm.title} onChange={e => setPublishForm({...publishForm, title: e.target.value})} placeholder="給你的題庫取個吸引人的名字" className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold dark:text-white focus:border-amber-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1 flex justify-between items-end">
                                    <span>設定價格 (鑽石)</span>
                                    <span className="text-[10px] text-gray-500">上限 2000 顆</span>
                                </label>
                                <input type="number" min="0" max="2000" value={publishForm.price} onChange={e => setPublishForm({...publishForm, price: Math.min(2000, Math.max(0, parseInt(e.target.value) || 0))})} className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-black text-amber-600 dark:text-amber-400 focus:border-amber-500 text-lg" />
                                <div className="text-xs font-bold text-gray-500 mt-2 bg-stone-100 dark:bg-stone-700 p-2 rounded flex justify-between items-center">
                                    <span>平台手續費 (20%)</span>
                                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">預估收益: {Math.floor(publishForm.price * 0.8)} <span className="material-symbols-outlined text-[14px]">diamond</span></span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">商品描述</label>
                                <textarea value={publishForm.description} onChange={e => setPublishForm({...publishForm, description: e.target.value})} placeholder="介紹一下這個題庫的特色、適用對象..." className="w-full h-24 p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm resize-none custom-scrollbar dark:text-stone-200 focus:border-amber-500" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsPublishing(null)} className="px-4 py-2 font-bold text-gray-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors">取消</button>
                            <button onClick={submitPublish} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 py-2 rounded-lg shadow-sm transition-transform active:scale-95 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">publish</span> 確認上架</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 編輯題目 Modal */}
            {editingQuestion && (
                <div className="fixed inset-0 z-[150] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-stone-200 dark:border-stone-700 pb-3">
                            <h3 className="text-xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2"><span className="material-symbols-outlined">edit_square</span> 編輯題目</h3>
                            <button onClick={() => setEditingQuestion(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="flex-1"><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">標籤</label><input type="text" className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold dark:text-white focus:border-amber-500" value={editingQuestion.tag} onChange={e => setEditingQuestion({...editingQuestion, tag: e.target.value})} /></div>
                                <div className="w-24"><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">難度</label><input type="text" className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold dark:text-white focus:border-amber-500" value={editingQuestion.difficulty} onChange={e => setEditingQuestion({...editingQuestion, difficulty: e.target.value})} /></div>
                                <div className="w-24"><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">正確答案</label><select className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold dark:text-white focus:border-amber-500" value={editingQuestion.ans} onChange={e => setEditingQuestion({...editingQuestion, ans: e.target.value})}><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">題目文字</label><textarea className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none min-h-[80px] resize-none dark:text-white font-medium focus:border-amber-500 custom-scrollbar" value={editingQuestion.text} onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})} /></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">選項 A</label><input type="text" className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white focus:border-amber-500" value={editingQuestion.options.A} onChange={e => setEditingQuestion({...editingQuestion, options: {...editingQuestion.options, A: e.target.value}})} /></div>
                                <div><label className="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">選項 B</label><input type="text" className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white focus:border-amber-500" value={editingQuestion.options.B} onChange={e => setEditingQuestion({...editingQuestion, options: {...editingQuestion.options, B: e.target.value}})} /></div>
                                <div><label className="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">選項 C</label><input type="text" className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white focus:border-amber-500" value={editingQuestion.options.C} onChange={e => setEditingQuestion({...editingQuestion, options: {...editingQuestion.options, C: e.target.value}})} /></div>
                                <div><label className="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">選項 D</label><input type="text" className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white focus:border-amber-500" value={editingQuestion.options.D} onChange={e => setEditingQuestion({...editingQuestion, options: {...editingQuestion.options, D: e.target.value}})} /></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">詳解</label><textarea className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none min-h-[80px] resize-none dark:text-white font-medium focus:border-amber-500 custom-scrollbar" value={editingQuestion.explain} onChange={e => setEditingQuestion({...editingQuestion, explain: e.target.value})} /></div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-stone-200 dark:border-stone-700">
                            <button onClick={() => setEditingQuestion(null)} className="px-4 py-2 font-bold text-gray-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors">取消</button>
                            <button onClick={handleSaveEdit} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 py-2 rounded-lg shadow-sm transition-transform active:scale-95 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">check</span> 儲存修改</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 產生測驗 Modal */}
            {showQuizModal && (
                <div className="fixed inset-0 z-[150] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-stone-200 dark:border-stone-700 pb-3">
                            <h3 className="text-xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2"><span className="material-symbols-outlined">quiz</span> 產生測驗</h3>
                            <button onClick={() => setShowQuizModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1.5">測驗名稱 (選填)</label>
                            <input 
                                type="text" 
                                value={quizNameInput} 
                                onChange={e => setQuizNameInput(e.target.value)} 
                                placeholder="留空將自動為您命名" 
                                className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold dark:text-white focus:border-cyan-500 transition-colors" 
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1.5">1. 選擇出題科目 (單選)</label>
                            <select 
                                value={selectedQuizSubjectId || ''} 
                                onChange={(e) => {
                                    const newSubjId = e.target.value;
                                    setSelectedQuizSubjectId(newSubjId);
                                    const subj = subjects.find(s => s.id === newSubjId);
                                    setSelectedQuizChapterIds(subj ? subj.chapters.map(c => c.id) : []);
                                }} 
                                className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold dark:text-white cursor-pointer focus:border-cyan-500"
                            >
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        {quizTargetSubject && (
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1.5">2. 選擇出題章節 (可多選，全不選視為全範圍)</label>
                                <div className="flex flex-wrap gap-2">
                                    {quizTargetSubject.chapters.length === 0 && <span className="text-sm text-gray-500">此科目尚無章節</span>}
                                    {quizTargetSubject.chapters.map(c => {
                                        const isActive = selectedQuizChapterIds.includes(c.id);
                                        return (
                                            <button 
                                                key={c.id} 
                                                onClick={() => setSelectedQuizChapterIds(prev => isActive ? prev.filter(x => x !== c.id) : [...prev, c.id])} 
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${isActive ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800 shadow-sm' : 'bg-white text-stone-500 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-700'}`}
                                            >
                                                {c.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {/* 進階選項控制列 */}
                        <div className="flex gap-4 mb-4 border-t border-stone-200 dark:border-stone-700 pt-4 px-1">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-700 dark:text-stone-300">
                                <input type="checkbox" checked={skipUsed} onChange={e => setSkipUsed(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                                略過已出過的題目
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-700 dark:text-stone-300">
                                <select value={fallbackStrategy} onChange={e => setFallbackStrategy(e.target.value)} className="p-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded outline-none text-xs">
                                    <option value="random">題數不足：隨機補足</option>
                                    <option value="skip">題數不足：忽略不抓</option>
                                </select>
                            </label>
                        </div>

                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setQuizMode('brush')} className={`flex-1 py-2 font-bold rounded-lg border transition-colors ${quizMode === 'brush' ? 'bg-cyan-500 text-white border-cyan-600 shadow-sm' : 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300 border-transparent hover:bg-stone-200 dark:hover:bg-stone-600'}`}>快速刷題</button>
                            <button onClick={() => setQuizMode('advanced')} className={`flex-1 py-2 font-bold rounded-lg border transition-colors ${quizMode === 'advanced' ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300 border-transparent hover:bg-stone-200 dark:hover:bg-stone-600'}`}>進階配題</button>
                        </div>

                        {quizMode === 'brush' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">3. 選擇標籤 (可多選，不選視為全範圍隨機)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableTags.length === 0 && <span className="text-sm text-gray-500 font-bold bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded">所選範圍內無標籤題庫</span>}
                                        {availableTags.map(t => (
                                            <button key={t} onClick={() => setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${selectedTags.includes(t) ? 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800' : 'bg-white text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-600'}`}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">4. 抽題數量 (符合條件的題庫上限 {skipUsed ? availableQuestionsForQuiz.filter(q=>!q.usedCount).length : availableQuestionsForQuiz.length} 題)</label>
                                    <input type="number" min="0" value={brushCount} onChange={e => setBrushCount(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold dark:text-white" />
                                </div>
                            </div>
                        )}

                        {quizMode === 'advanced' && (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <select value={advModeBy} onChange={e => { setAdvModeBy(e.target.value); setAdvAllocations({}); }} className="p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold text-sm flex-1 dark:text-white focus:border-amber-500">
                                        <option value="tag">按「標籤」分配</option>
                                        <option value="chapter">按「章節」分配</option>
                                    </select>
                                    <select value={advInputMode} onChange={e => { setAdvInputMode(e.target.value); setAdvAllocations({}); }} className="p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold text-sm flex-1 dark:text-white focus:border-amber-500">
                                        <option value="count">輸入「指定題數」</option>
                                        <option value="percent">輸入「佔比%」</option>
                                    </select>
                                </div>

                                {advInputMode === 'percent' && (
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">試卷總題數</label>
                                        <input type="number" min="0" value={advTotalCount} onChange={e => setAdvTotalCount(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold dark:text-white" />
                                    </div>
                                )}
                                
                                <div className="border-t border-stone-200 dark:border-stone-700 pt-3">
                                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">各項目分配設定</label>
                                    {(() => {
                                        const list = advModeBy === 'tag' ? availableTags : availableChapters.map(c => c.id);
                                        if (list.length === 0) return <span className="text-sm text-gray-500">無可用項目</span>;
                                        
                                        return list.map(item => {
                                            const key = advModeBy === 'tag' ? item : item;
                                            const label = advModeBy === 'tag' ? item : availableChapters.find(c => c.id === item)?.name;
                                            const poolLen = availableQuestionsForQuiz.filter(q => {
                                                const match = advModeBy === 'tag' ? q.tag === key : q.chapterId === key;
                                                return match && (!skipUsed || !q.usedCount);
                                            }).length;

                                            return (
                                                <div key={key} className="flex items-center justify-between gap-3 mb-2 bg-stone-50 dark:bg-stone-900 p-2 rounded-lg border border-stone-100 dark:border-stone-700">
                                                    <div className="flex flex-col w-1/2">
                                                        <span className="text-sm font-bold truncate dark:text-stone-300">{label}</span>
                                                        <span className="text-[10px] text-gray-500 font-bold">可用: {poolLen} 題</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 w-1/2">
                                                        <input type="number" min="0" placeholder="0" value={advAllocations[key] || ''} onChange={e => setAdvAllocations({...advAllocations, [key]: parseInt(e.target.value) || 0})} className="w-full p-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded outline-none text-sm font-bold text-center dark:text-white" />
                                                        <span className="text-xs text-gray-500 font-bold">{advInputMode === 'count' ? '題' : '%'}</span>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-stone-200 dark:border-stone-700">
                            <button disabled={isGeneratingQuiz} onClick={() => setShowQuizModal(false)} className="px-4 py-2 font-bold text-gray-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors disabled:opacity-50">取消</button>
                            <button disabled={isGeneratingQuiz} onClick={handleGenerateQuiz} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 font-black px-6 py-2 rounded-lg shadow-sm transition-transform active:scale-95 flex items-center gap-1 disabled:opacity-50 disabled:active:scale-100">
                                {isGeneratingQuiz ? (
                                    <><span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span> 產生中...</>
                                ) : (
                                    <><span className="material-symbols-outlined text-[18px]">play_arrow</span> 立即產生測驗</>
                                )}
                            </button>
                        </div>

                        {/* 載入中半透明遮罩 */}
                        {isGeneratingQuiz && (
                            <div className="absolute inset-0 z-10 bg-[#FCFBF7]/70 dark:bg-stone-800/70 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-[48px] text-amber-500 animate-spin mb-3">autorenew</span>
                                <span className="font-black text-stone-800 dark:text-stone-100 text-lg tracking-widest shadow-sm">正在為您調配題目...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Prompt 編輯 Modal (僅管理員可見) */}
            {editingPrompt && (
                <div className="fixed inset-0 z-[160] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 p-6">
                        <div className="flex justify-between items-center mb-4 border-b border-stone-200 dark:border-stone-700 pb-3 shrink-0">
                            <h3 className="text-xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2"><span className="material-symbols-outlined">edit_note</span> 編輯 Prompt</h3>
                            <button onClick={() => setEditingPrompt(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <div>
                                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">所屬分類</label>
                                <select value={editingPrompt.category} onChange={e => setEditingPrompt({...editingPrompt, category: e.target.value})} className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold dark:text-white">
                                    {promptCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">標題</label>
                                <input type="text" value={editingPrompt.title} onChange={e => setEditingPrompt({...editingPrompt, title: e.target.value})} className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Prompt 內容</label>
                                <textarea value={editingPrompt.content} onChange={e => setEditingPrompt({...editingPrompt, content: e.target.value})} className="w-full h-64 p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm font-mono resize-none custom-scrollbar dark:text-white" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-stone-200 dark:border-stone-700 shrink-0">
                            <button onClick={() => setEditingPrompt(null)} className="px-4 py-2 font-bold text-gray-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors">取消</button>
                            <button onClick={handleSavePrompt} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 py-2 rounded-lg shadow-sm transition-transform active:scale-95 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">save</span> 儲存</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};