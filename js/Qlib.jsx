// 覆蓋後：請將 Qlib.jsx 全檔內容替換為以下程式碼
window.QlibDashboard = function QlibDashboard({ user, userProfile, showAlert, showConfirm, showPrompt, onContinueQuiz }) {
    const { useState, useEffect } = React;
    
    // --- 頁籤系統 ---
    // activeMainTab: 'my' | 'public' | 'search' | 'prompt'
    const [activeMainTab, setActiveMainTab] = useState('my'); 
    
    // --- Prompt 系統狀態 ---
    const promptCategories = ['藥析', '生藥', '中藥', '藥理藥化', '藥劑', '生物藥劑'];
    const [activePromptCategory, setActivePromptCategory] = useState(promptCategories[0]);
    const [promptTemplates, setPromptTemplates] = useState([]);
    const [promptRules, setPromptRules] = useState([{ chapter: '', count: 1 }]); 
    const [editingPrompt, setEditingPrompt] = useState(null); 
    const [savedPromptConfigs, setSavedPromptConfigs] = useState({}); 
    // ----------------------
    
    // --- 我的題庫狀態 ---
    const [subjects, setSubjects] = useState([]);
    const [activeSubjectId, setActiveSubjectId] = useState(null);
    const [activeChapterId, setActiveChapterId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // ✨ 手機版側邊欄控制
    const [importText, setImportText] = useState('');
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [isPublishing, setIsPublishing] = useState(null); 
    
    // ✨ 效能與體驗優化狀態
    const [isInitializing, setIsInitializing] = useState(true); 
    const isFirstLoad = React.useRef(true); 
    const cachedQuestionsRef = React.useRef({}); 

    // --- 公開題庫 (商城) 狀態 ---
    const [publicSubjects, setPublicSubjects] = useState([]);
    const [isLoadingPublicData, setIsLoadingPublicData] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    // activeStoreSubjectId 若為 null 顯示首頁商品列表，若有值顯示該商品詳情
    const [activeStoreSubjectId, setActiveStoreSubjectId] = useState(null);
    const [activeStoreChapterId, setActiveStoreChapterId] = useState(null);
    const [publicSubjectData, setPublicSubjectData] = useState({}); // 快取已載入的章節題目
    const [publicQuizPresets, setPublicQuizPresets] = useState([]); // ✨ 官方公開的配題組合

    // --- 搜尋系統狀態 ---
    const [searchScope, setSearchScope] = useState('my'); // 'my', 'public', 'all'
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [globalSearchResults, setGlobalSearchResults] = useState([]);
    const [cachedAllPublicQuestions, setCachedAllPublicQuestions] = useState(null);

    // --- 出題系統狀態 ---
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [quizNameInput, setQuizNameInput] = useState(''); 
    const [selectedQuizSubjectId, setSelectedQuizSubjectId] = useState(null); 
    
    // ✨ 新版整合配題狀態
    const [quizDistributeMode, setQuizDistributeMode] = useState('chapter'); // 'chapter' | 'tag'
    const [quizSelectedItems, setQuizSelectedItems] = useState([]);
    const [quizAllocations, setQuizAllocations] = useState({});
    const [quickTotal, setQuickTotal] = useState(50);
    const [skipUsed, setSkipUsed] = useState(false);

    // 檢索用 (單一章節內)
    const [chapterSearchQ, setChapterSearchQ] = useState('');
    const [filterTag, setFilterTag] = useState('');
    const [filterDiff, setFilterDiff] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;

    // 初始化與切換重置
    useEffect(() => {
        setChapterSearchQ('');
        setFilterTag('');
        setFilterDiff('');
        setCurrentPage(1);
    }, [activeChapterId, activeStoreChapterId]);

    // 若搜尋條件改變，重置頁碼
    useEffect(() => {
        setCurrentPage(1);
    }, [chapterSearchQ, filterTag, filterDiff]);

    useEffect(() => {
        if (!user) return;
        setIsInitializing(true);

        const unsubscribe = window.db.collection('users').doc(user.uid).collection('qlib').doc('main')
            .onSnapshot(async docSnap => {
                if (!docSnap.exists) {
                    setSubjects([]);
                    if (isFirstLoad.current) { setIsInitializing(false); isFirstLoad.current = false; }
                    return;
                }
                const loadedConfigs = docSnap.data().promptConfigs || {};
                setSavedPromptConfigs(loadedConfigs);

                let loadedSubjects = docSnap.data().subjects || [];
                try {
                    // ✨ 速度優化：導入題目快取機制，避免在每次存檔或狀態更新時，重複執行耗時的解壓縮運算
                    const qSnap = await window.db.collection('users').doc(user.uid).collection('qlib_questions').get();
                    const qDict = {};
                    
                    qSnap.forEach(d => { 
                        const data = d.data();
                        if (data.questionsJZ && window.safeDecompress) {
                            try { 
                                // 利用字串長度與前幾碼做變更比對 (極速 Hash 概念)
                                const cacheKey = data.questionsJZ.length + '_' + data.questionsJZ.substring(0, 20);
                                if (cachedQuestionsRef.current[d.id]?.key === cacheKey) {
                                    qDict[d.id] = cachedQuestionsRef.current[d.id].data;
                                } else {
                                    const parsed = JSON.parse(window.safeDecompress(data.questionsJZ, 'string'));
                                    qDict[d.id] = parsed;
                                    cachedQuestionsRef.current[d.id] = { key: cacheKey, data: parsed };
                                }
                            } catch(e) { qDict[d.id] = []; }
                        } else {
                            qDict[d.id] = data.questions || []; 
                            cachedQuestionsRef.current[d.id] = { key: 'raw', data: data.questions || [] };
                        }
                    });
                    
                    loadedSubjects = loadedSubjects.map(s => ({
                        ...s,
                        chapters: (s.chapters || []).map(c => ({
                            ...c,
                            questions: qDict[c.id] || c.questions || []
                        }))
                    }));
                } catch(e) { console.error(e); }
                
                setSubjects(loadedSubjects);
                
                if (isFirstLoad.current) {
                    setIsInitializing(false);
                    isFirstLoad.current = false;
                }
            }, err => {
                // ✨ 核心修正：捕獲 Firebase 權限或網路中斷錯誤，確保新用戶或例外狀況下不會卡死在載入動畫
                console.error("Firebase 題庫監聽失敗:", err);
                setSubjects([]);
                setIsInitializing(false);
                isFirstLoad.current = false;
            });
        return () => unsubscribe();
    }, [user]);

    // ✨ 聰明載入：公開題庫一開始只載入「目錄與封面」，不載入海量題目
    useEffect(() => {
        if (activeMainTab === 'public') {
            setIsLoadingPublicData(true);
            const unsub = window.db.collection('publicQlib').doc('main').onSnapshot(docSnap => {
                if (!docSnap.exists) { setPublicSubjects([]); setPublicQuizPresets([]); setIsLoadingPublicData(false); return; }
                setPublicSubjects(docSnap.data().subjects || []);
                setPublicQuizPresets(docSnap.data().quizPresets || []);
                setIsLoadingPublicData(false);
            });
            return () => unsub();
        } else if (activeMainTab === 'prompt') {
            const unsub = window.db.collection('artifacts').where('type', '==', 'qlibPrompt').onSnapshot(snap => {
                setPromptTemplates(snap.docs.map(d => ({id: d.id, ...d.data()})));
            });
            return () => unsub();
        }
    }, [activeMainTab]);

    const saveToDb = async (newSubjects, isPublic = false) => {
        const oldSubjects = isPublic ? publicSubjects : subjects;
        if (isPublic) setPublicSubjects(newSubjects);
        else setSubjects(newSubjects);

        try {
            const batch = window.db.batch();
            const mainRef = isPublic 
                ? window.db.collection('publicQlib').doc('main') 
                : window.db.collection('users').doc(user.uid).collection('qlib').doc('main');
            
            // 公開題庫會保留 coverUrl
            const metadataSubjects = newSubjects.map(s => ({
                id: s.id, name: s.name, coverUrl: s.coverUrl || null, chapters: (s.chapters || []).map(c => ({ id: c.id, name: c.name }))
            }));
            batch.set(mainRef, { subjects: metadataSubjects, lastUpdatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
            
            const oldChapDict = {};
            oldSubjects.forEach(s => (s.chapters || []).forEach(c => { oldChapDict[c.id] = c.questions; }));

            newSubjects.forEach(s => {
                (s.chapters || []).forEach(c => {
                    if (oldChapDict[c.id] === c.questions) return; // 沒變動就跳過不寫入
                    
                    const qRef = isPublic 
                        ? window.db.collection('publicQlib_questions').doc(c.id) 
                        : window.db.collection('users').doc(user.uid).collection('qlib_questions').doc(c.id);
                    
                    const qList = c.questions || [];
                    const qStr = JSON.stringify(qList);
                    if (qStr.length > 500000 && window.jzCompress) {
                        batch.set(qRef, { questionsJZ: window.jzCompress(qStr), questions: window.firebase.firestore.FieldValue.delete() }, { merge: true });
                    } else {
                        batch.set(qRef, { questions: qList, questionsJZ: window.firebase.firestore.FieldValue.delete() }, { merge: true });
                    }
                });
            });
            await batch.commit();
        } catch (err) {
            console.error(err);
            showAlert("儲存失敗，請檢查網路連線或檔案是否過大。");
        }
    };

    // ✨ 專為管理員設計：上傳商品封面
    const handleCoverUpload = async (e, subjId) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return showAlert('請上傳圖片檔案！');
        
        setIsUploadingCover(true);
        try {
            const ext = file.name.split('.').pop();
            const storageRef = window.firebase.storage().ref(`qlib_covers/${Date.now()}_${subjId}.${ext}`);
            await storageRef.put(file);
            const url = await storageRef.getDownloadURL();
            
            const newSubjects = publicSubjects.map(s => s.id === subjId ? { ...s, coverUrl: url } : s);
            await window.db.collection('publicQlib').doc('main').set({ subjects: newSubjects }, { merge: true });
            setPublicSubjects(newSubjects);
            showAlert('商品封面更新成功！');
        } catch (err) {
            console.error(err);
            showAlert('上傳失敗，請確認 Firebase Storage 設定與權限。');
        } finally {
            setIsUploadingCover(false);
            e.target.value = ''; // Reset input
        }
    };

    const triggerCoverUpload = (subjId) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => handleCoverUpload(e, subjId);
        input.click();
    };

    // ✨ 聰明載入：進入特定商品詳情時，才去抓取該商品的題目與統計資料
    const loadStoreSubjectDetails = async (subj) => {
        setActiveStoreSubjectId(subj.id);
        setActiveStoreChapterId(null);
        
        if (!publicSubjectData[subj.id]) {
            setIsLoadingPublicData(true);
            try {
                // 平行載入該科目所有章節的題目 與 全域統計
                const promises = subj.chapters.map(c => window.db.collection('publicQlib_questions').doc(c.id).get());
                const statPromise = window.db.collection('publicQlib_stats').get();
                
                const [snaps, statSnap] = await Promise.all([Promise.all(promises), statPromise]);
                
                const statsDict = {};
                if (statSnap && statSnap.docs) {
                    statSnap.forEach(d => { statsDict[d.id] = d.data(); });
                }

                let loadedChaps = [];
                snaps.forEach((snap, idx) => {
                    const data = snap.exists ? snap.data() : {};
                    let rawQs = [];
                    if (data.questionsJZ && window.safeDecompress) {
                        try { rawQs = JSON.parse(window.safeDecompress(data.questionsJZ, 'string')); } catch(e) { rawQs = []; }
                    } else if (data.questions) {
                        rawQs = data.questions;
                    }
                    let enrichedQs = rawQs.map(q => ({ ...q, stats: statsDict[q.id] || null }));
                    loadedChaps.push({ ...subj.chapters[idx], questions: enrichedQs });
                });
                
                setPublicSubjectData(prev => ({ ...prev, [subj.id]: loadedChaps }));
            } catch(e) { 
                console.error(e);
                showAlert("載入題庫內容失敗"); 
            }
            setIsLoadingPublicData(false);
        }
    };

    // ✨ 跨庫搜尋引擎
    const executeGlobalSearch = async () => {
        if (!searchQuery.trim()) return showAlert('請輸入搜尋關鍵字！');
        setIsSearching(true);
        setGlobalSearchResults([]);
        let results = [];
        const lowerSearch = searchQuery.toLowerCase();

        try {
            // 搜尋私有題庫
            if (searchScope === 'my' || searchScope === 'all') {
                subjects.forEach(s => {
                    (s.chapters || []).forEach(c => {
                        (c.questions || []).forEach(q => {
                            if (q.text.toLowerCase().includes(lowerSearch) || (q.explain || '').toLowerCase().includes(lowerSearch) || (q.tag || '').toLowerCase().includes(lowerSearch)) {
                                results.push({ ...q, _subjName: s.name, _chapName: c.name, _source: '我的題庫', _sourceStyle: 'bg-indigo-100 text-indigo-800' });
                            }
                        });
                    });
                });
            }

            // 搜尋公開題庫 (動態全快取機制)
            if (searchScope === 'public' || searchScope === 'all') {
                let pool = cachedAllPublicQuestions;
                if (!pool) {
                    const snap = await window.db.collection('publicQlib_questions').get();
                    pool = {};
                    snap.forEach(d => { 
                        const data = d.data();
                        if (data.questionsJZ && window.safeDecompress) {
                            try { pool[d.id] = JSON.parse(window.safeDecompress(data.questionsJZ, 'string')); } catch(e) { pool[d.id] = []; }
                        } else {
                            pool[d.id] = data.questions || []; 
                        }
                    });
                    setCachedAllPublicQuestions(pool);
                }

                publicSubjects.forEach(s => {
                    (s.chapters || []).forEach(c => {
                        const qList = pool[c.id] || [];
                        qList.forEach(q => {
                            if (q.text.toLowerCase().includes(lowerSearch) || (q.explain || '').toLowerCase().includes(lowerSearch) || (q.tag || '').toLowerCase().includes(lowerSearch)) {
                                results.push({ ...q, _subjName: s.name, _chapName: c.name, _source: '公開商城', _sourceStyle: 'bg-amber-100 text-amber-800' });
                            }
                        });
                    });
                });
            }
            setGlobalSearchResults(results);
        } catch (e) {
            showAlert('搜尋執行失敗，請檢查網路。');
        }
        setIsSearching(false);
    };

    // --- 基本 CRUD 操作 ---
    const handleAddSubject = () => {
        const isPublic = activeMainTab === 'public';
        showPrompt("請輸入新科目名稱：", "", (name) => {
            if (!name || name.trim() === '') return;
            const newSubj = { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), name: name.trim(), chapters: [] };
            saveToDb([...(isPublic ? publicSubjects : subjects || []), newSubj], isPublic);
        });
    };

    const handleAddChapter = (subjId) => {
        const isPublic = activeMainTab === 'public';
        showPrompt("請輸入新章節名稱：", "", (name) => {
            if (!name || name.trim() === '') return;
            const targetList = isPublic ? publicSubjects : subjects;
            const newSubjects = (targetList || []).map(s => {
                if (s.id === subjId) {
                    return { ...s, chapters: [...(s.chapters || []), { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), name: name.trim(), questions: [] }] };
                }
                return s;
            });
            saveToDb(newSubjects, isPublic);
        });
    };

    const handleDeleteSubject = (subjId) => {
        const isPublic = activeMainTab === 'public';
        showConfirm("確定要刪除此科目及其所有內容嗎？此操作無法還原。", () => {
            const targetList = isPublic ? publicSubjects : subjects;
            saveToDb((targetList || []).filter(s => s.id !== subjId), isPublic);
            if (activeSubjectId === subjId) { setActiveSubjectId(null); setActiveChapterId(null); }
        });
    };

    const handleDeleteChapter = (subjId, chapId) => {
        const isPublic = activeMainTab === 'public';
        showConfirm("確定要刪除此章節及其所有題目嗎？此操作無法還原。", () => {
            const targetList = isPublic ? publicSubjects : subjects;
            const newSubjects = (targetList || []).map(s => {
                if (s.id === subjId) return { ...s, chapters: (s.chapters || []).filter(c => c.id !== chapId) };
                return s;
            });
            saveToDb(newSubjects, isPublic);
            if (activeChapterId === chapId) setActiveChapterId(null);
        });
    };

    const handleMoveChapter = (subjId, chapIdx, direction) => {
        const isPublic = activeMainTab === 'public';
        const targetList = isPublic ? publicSubjects : subjects;
        const newSubjects = [...(targetList || [])];
        const subjIdx = newSubjects.findIndex(s => s.id === subjId);
        if (subjIdx === -1) return;
        
        const targetSubj = { ...newSubjects[subjIdx] };
        const newChapters = [...(targetSubj.chapters || [])];
        
        if (direction === 'up' && chapIdx > 0) {
            [newChapters[chapIdx - 1], newChapters[chapIdx]] = [newChapters[chapIdx], newChapters[chapIdx - 1]];
        } else if (direction === 'down' && chapIdx < newChapters.length - 1) {
            [newChapters[chapIdx + 1], newChapters[chapIdx]] = [newChapters[chapIdx], newChapters[chapIdx + 1]];
        } else { return; }
        
        targetSubj.chapters = newChapters;
        newSubjects[subjIdx] = targetSubj;
        saveToDb(newSubjects, isPublic);
    };

    // ✨ 標籤批次刪除
    const handleBatchDeleteTag = () => {
        if (!filterTag) return showAlert("請先在上方選擇一個要刪除的標籤！");
        showConfirm(`確定要刪除「${activeChapter?.name}」中，標籤為「${filterTag}」的所有題目嗎？此操作無法還原。`, () => {
            const isPublic = activeMainTab === 'public';
            const targetList = isPublic ? publicSubjects : subjects;
            const targetSubjId = isPublic ? activeStoreSubjectId : activeSubjectId;
            const targetChapId = isPublic ? activeStoreChapterId : activeChapterId;

            const newSubjects = (targetList || []).map(s => {
                if (s.id === targetSubjId) {
                    return { ...s, chapters: (s.chapters || []).map(c => c.id === targetChapId ? { ...c, questions: (c.questions || []).filter(q => q.tag !== filterTag) } : c) };
                }
                return s;
            });
            saveToDb(newSubjects, isPublic);
            if (isPublic) {
                const chaps = newSubjects.find(s=>s.id===targetSubjId)?.chapters || [];
                setPublicSubjectData(prev => ({...prev, [targetSubjId]: chaps}));
            }
            setFilterTag('');
            showAlert(`已成功刪除標籤為「${filterTag}」的所有題目！`);
        });
    };

    // ✨ 標籤批次改名
    const handleBatchRenameTag = () => {
        if (!filterTag) return showAlert("請先在上方選擇一個要修改的標籤！");
        showPrompt(`請輸入要把標籤「${filterTag}」改為什麼名稱？`, "", (newTag) => {
            if (!newTag || !newTag.trim() || newTag.trim() === filterTag) return;
            const finalTag = newTag.trim();
            const isPublic = activeMainTab === 'public';
            const targetList = isPublic ? publicSubjects : subjects;
            const targetSubjId = isPublic ? activeStoreSubjectId : activeSubjectId;
            const targetChapId = isPublic ? activeStoreChapterId : activeChapterId;

            const newSubjects = (targetList || []).map(s => {
                if (s.id === targetSubjId) {
                    return { ...s, chapters: (s.chapters || []).map(c => c.id === targetChapId ? { ...c, questions: (c.questions || []).map(q => q.tag === filterTag ? { ...q, tag: finalTag } : q) } : c) };
                }
                return s;
            });
            saveToDb(newSubjects, isPublic);
            if (isPublic) {
                const chaps = newSubjects.find(s=>s.id===targetSubjId)?.chapters || [];
                setPublicSubjectData(prev => ({...prev, [targetSubjId]: chaps}));
            }
            setFilterTag(finalTag);
            showAlert(`已成功將標籤更新為「${finalTag}」！`);
        });
    };

    // ✨ 章節改名
    const handleRenameChapter = (subjId, chapId, oldName) => {
        const isPublic = activeMainTab === 'public';
        showPrompt(`重新命名章節「${oldName}」：`, oldName, (newName) => {
            if (!newName || !newName.trim() || newName.trim() === oldName) return;
            const targetList = isPublic ? publicSubjects : subjects;
            const newSubjects = (targetList || []).map(s => {
                if (s.id === subjId) {
                    return { ...s, chapters: (s.chapters || []).map(c => c.id === chapId ? { ...c, name: newName.trim() } : c) };
                }
                return s;
            });
            saveToDb(newSubjects, isPublic);
            if (isPublic && publicSubjectData[subjId]) {
                const chaps = newSubjects.find(s=>s.id===subjId)?.chapters || [];
                setPublicSubjectData(prev => ({...prev, [subjId]: chaps}));
            }
        });
    };

    // ✨ 管理員儲存配題組合
    const handleSaveAdminPreset = () => {
        if (!quizSelectedItems.length) return showAlert("請至少勾選一個配題項目！");
        showPrompt("請為此公開配題組合命名：", "", async (name) => {
            if (!name || !name.trim()) return;
            const newPreset = {
                id: Date.now().toString(), name: name.trim(), modeBy: quizDistributeMode,
                allocations: quizAllocations, selectedItems: quizSelectedItems
            };
            const updatedPresets = [...publicQuizPresets, newPreset];
            try {
                await window.db.collection('publicQlib').doc('main').set({ quizPresets: updatedPresets }, { merge: true });
                setPublicQuizPresets(updatedPresets);
                showAlert("公開配題組合已儲存並發布給所有玩家！");
            } catch (e) { showAlert("儲存失敗"); }
        });
    };

    const handleDeleteAdminPreset = async (presetId) => {
        showConfirm("確定要刪除此公開配題組合嗎？", async () => {
            const updatedPresets = publicQuizPresets.filter(p => p.id !== presetId);
            try {
                await window.db.collection('publicQlib').doc('main').set({ quizPresets: updatedPresets }, { merge: true });
                setPublicQuizPresets(updatedPresets);
            } catch(e) {}
        });
    };

    const handleImport = () => {
        if (!importText.trim()) return showAlert("請輸入題目內容！");
        const blocks = importText.split(/\[Q\.\d+\]/i).filter(b => b.trim());
        const parsedQuestions = blocks.map(block => {
            const headerMatch = block.match(/\[#\s*(.*?)\s*\|\s*@\s*(.*?)\s*\|\s*Ans\s*:\s*(.*?)\s*\]/i);
            const tag = headerMatch ? headerMatch[1].trim() : '';
            const difficulty = headerMatch ? headerMatch[2].trim() : '';
            const ans = headerMatch ? headerMatch[3].trim().toUpperCase() : '';

            let text = block.split(/\[A\]/i)[0].replace(/\[#.*?\|@.*?\|Ans\s*:.*?\]/i, '').trim();
            const optA = block.match(/\[A\]([\s\S]*?)(?=\[B\]|\[C\]|\[D\]|\[Explain:|$)/i)?.[1].trim() || '';
            const optB = block.match(/\[B\]([\s\S]*?)(?=\[C\]|\[D\]|\[Explain:|$)/i)?.[1].trim() || '';
            const optC = block.match(/\[C\]([\s\S]*?)(?=\[D\]|\[Explain:|$)/i)?.[1].trim() || '';
            const optD = block.match(/\[D\]([\s\S]*?)(?=\[Explain:|$)/i)?.[1].trim() || '';
            let explain = block.match(/\[Explain:([\s\S]*?)\]/i)?.[1].trim() || block.match(/\[Explain:([\s\S]*)$/i)?.[1].trim() || '';

            return {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                text, tag, difficulty, ans, options: { A: optA, B: optB, C: optC, D: optD }, explain
            };
        }).filter(q => q.text || q.options.A);

        if (parsedQuestions.length === 0) return showAlert("解析失敗，請檢查格式。");

        // ✨ 自動分塊機制：一個章節最多 800 題，不同章節使用不同文檔儲存
        const CHUNK_SIZE = 800;

        const isPublic = activeMainTab === 'public';
        const targetList = isPublic ? publicSubjects : subjects;
        const targetSubjId = isPublic ? activeStoreSubjectId : activeSubjectId;
        const targetChapId = isPublic ? activeStoreChapterId : activeChapterId;

        let newSubjects = [...(targetList || [])];
        const subjIndex = newSubjects.findIndex(s => s.id === targetSubjId);

        if (subjIndex !== -1) {
            let targetSubj = { ...newSubjects[subjIndex] };
            let newChapters = [...(targetSubj.chapters || [])];
            let chapIndex = newChapters.findIndex(c => c.id === targetChapId);

            if (chapIndex !== -1) {
                let targetChap = { ...newChapters[chapIndex] };
                let existingQuestions = targetChap.questions || [];
                let allCombinedQuestions = [...existingQuestions, ...parsedQuestions];

                if (allCombinedQuestions.length <= CHUNK_SIZE) {
                    targetChap.questions = allCombinedQuestions;
                    newChapters[chapIndex] = targetChap;
                } else {
                    // 第一包覆蓋原本的章節
                    targetChap.questions = allCombinedQuestions.slice(0, CHUNK_SIZE);
                    newChapters[chapIndex] = targetChap;

                    // 超過的部分，自動建立新章節 (Part 2, Part 3...)
                    let partCounter = 2;
                    for (let i = CHUNK_SIZE; i < allCombinedQuestions.length; i += CHUNK_SIZE) {
                        const chunk = allCombinedQuestions.slice(i, i + CHUNK_SIZE);
                        const newChapId = Date.now().toString() + Math.random().toString(36).substr(2, 5) + i;
                        newChapters.splice(chapIndex + partCounter - 1, 0, {
                            id: newChapId,
                            name: `${targetChap.name} (Part ${partCounter})`,
                            questions: chunk
                        });
                        partCounter++;
                    }
                }
            }
            targetSubj.chapters = newChapters;
            newSubjects[subjIndex] = targetSubj;
        }

        saveToDb(newSubjects, isPublic);
        // 如果是公開題庫剛匯入，即時更新一下本地快取預覽
        if (isPublic) {
            const chaps = newSubjects.find(s=>s.id===targetSubjId)?.chapters || [];
            setPublicSubjectData(prev => ({...prev, [targetSubjId]: chaps}));
        }
        setImportText('');
        showAlert(`成功匯入 ${parsedQuestions.length} 題！(若超過 800 題已自動為您拆分章節)`);
    };

    const handleClearQuestions = () => {
        const isPublic = activeMainTab === 'public';
        const targetList = isPublic ? publicSubjects : subjects;
        const targetSubjId = isPublic ? activeStoreSubjectId : activeSubjectId;
        const targetChapId = isPublic ? activeStoreChapterId : activeChapterId;

        showConfirm("確定要清空此章節嗎？無法還原。", () => {
            const newSubjects = (targetList || []).map(s => {
                if (s.id === targetSubjId) {
                    return { ...s, chapters: (s.chapters || []).map(c => c.id === targetChapId ? { ...c, questions: [] } : c) };
                }
                return s;
            });
            saveToDb(newSubjects, isPublic);
            if (isPublic) {
                const chaps = newSubjects.find(s=>s.id===targetSubjId)?.chapters || [];
                setPublicSubjectData(prev => ({...prev, [targetSubjId]: chaps}));
            }
        });
    };

    const handleDeleteQuestion = (qId) => {
        const isPublic = activeMainTab === 'public';
        const targetList = isPublic ? publicSubjects : subjects;
        const targetSubjId = isPublic ? activeStoreSubjectId : activeSubjectId;
        const targetChapId = isPublic ? activeStoreChapterId : activeChapterId;

        showConfirm("確定要刪除這題嗎？", () => {
            const newSubjects = (targetList || []).map(s => {
                if (s.id === targetSubjId) {
                    return { ...s, chapters: (s.chapters || []).map(c => c.id === targetChapId ? { ...c, questions: (c.questions || []).filter(q => q.id !== qId) } : c) };
                }
                return s;
            });
            saveToDb(newSubjects, isPublic);
            if (isPublic) {
                const chaps = newSubjects.find(s=>s.id===targetSubjId)?.chapters || [];
                setPublicSubjectData(prev => ({...prev, [targetSubjId]: chaps}));
            }
        });
    };

    const handleSaveEdit = () => {
        const isPublic = activeMainTab === 'public';
        const targetList = isPublic ? publicSubjects : subjects;
        const targetSubjId = isPublic ? activeStoreSubjectId : activeSubjectId;
        const targetChapId = isPublic ? activeStoreChapterId : activeChapterId;

        const newSubjects = (targetList || []).map(s => {
            if (s.id === targetSubjId) {
                return { ...s, chapters: (s.chapters || []).map(c => c.id === targetChapId ? { ...c, questions: (c.questions || []).map(q => q.id === editingQuestion.id ? editingQuestion : q) } : c) };
            }
            return s;
        });
        saveToDb(newSubjects, isPublic);
        if (isPublic) {
            const chaps = newSubjects.find(s=>s.id===targetSubjId)?.chapters || [];
            setPublicSubjectData(prev => ({...prev, [targetSubjId]: chaps}));
        }
        setEditingQuestion(null);
    };

    const handlePublishToPublic = async () => {
        if (!isPublishing || !isPublishing.subjId || !isPublishing.chap) return;
        const subj = subjects.find(s => s.id === isPublishing.subjId);
        if (!subj) return;

        showConfirm(`確定要把「${subj.name} - ${isPublishing.chap.name}」推送到公開題庫嗎？\n推送後所有人都可免費使用。`, async () => {
            try {
                const batch = window.db.batch();
                const mainRef = window.db.collection('publicQlib').doc('main');
                const docSnap = await mainRef.get();
                let currentPublicSubjects = docSnap.exists ? (docSnap.data().subjects || []) : [];
                
                let targetSubjIdx = currentPublicSubjects.findIndex(s => s.name === subj.name);
                let targetSubjId;
                
                if (targetSubjIdx !== -1) {
                    targetSubjId = currentPublicSubjects[targetSubjIdx].id;
                    currentPublicSubjects[targetSubjIdx].chapters.push({ id: isPublishing.chap.id, name: isPublishing.chap.name });
                } else {
                    targetSubjId = Date.now().toString();
                    currentPublicSubjects.push({ id: targetSubjId, name: subj.name, chapters: [{ id: isPublishing.chap.id, name: isPublishing.chap.name }] });
                }

                batch.set(mainRef, { subjects: currentPublicSubjects }, { merge: true });
                
                const qRef = window.db.collection('publicQlib_questions').doc(isPublishing.chap.id);
                const cleanQuestions = isPublishing.chap.questions.map(q => ({
                    ...q, id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
                }));
                
                const qStr = JSON.stringify(cleanQuestions);
                if (qStr.length > 500000 && window.jzCompress) {
                    batch.set(qRef, { questionsJZ: window.jzCompress(qStr), questions: window.firebase.firestore.FieldValue.delete() }, { merge: true });
                } else {
                    batch.set(qRef, { questions: cleanQuestions, questionsJZ: window.firebase.firestore.FieldValue.delete() }, { merge: true });
                }
                
                await batch.commit();
                showAlert("✅ 成功推送到公開商城！");
                setIsPublishing(null);
            } catch (err) {
                showAlert("推送失敗：" + err.message);
            }
        });
    };

    // --- Prompt 庫特定功能 ---
    const handleCopyPrompt = (templateContent) => {
        const validRules = promptRules.filter(r => r.chapter.trim() !== '' && r.count > 0);
        let prefix = '';
        if (validRules.length > 0) {
            const chapters = validRules.map(r => r.chapter.trim());
            const totalCount = validRules.reduce((sum, r) => sum + parseInt(r.count), 0);
            const details = validRules.map(r => `${r.chapter.trim()}-${r.count}題`);
            prefix = `指定標籤(僅限這些): ${chapters.join('、')}，共${totalCount}題 其中${details.join('、')}\n\n`;
        }
        navigator.clipboard.writeText(prefix + templateContent).then(() => showAlert("Prompt 已複製到剪貼簿！"));
    };

    const handleSavePrompt = async () => {
        if (!editingPrompt.title || !editingPrompt.content) return;
        try {
            if (editingPrompt.id) {
                await window.db.collection('artifacts').doc(editingPrompt.id).update({
                    title: editingPrompt.title, content: editingPrompt.content, category: editingPrompt.category, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                await window.db.collection('artifacts').add({
                    type: 'qlibPrompt', title: editingPrompt.title, content: editingPrompt.content, category: editingPrompt.category, authorEmail: user.email, createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            setEditingPrompt(null);
        } catch (e) {}
    };

    const handleDeletePrompt = (id) => {
        showConfirm("刪除此 Prompt？", () => window.db.collection('artifacts').doc(id).delete());
    };

    const handleSavePromptConfig = () => {
        const validRules = promptRules.filter(r => r.chapter.trim() !== '' && r.count > 0);
        if (validRules.length === 0) return showAlert("請先輸入至少一個有效的章節與題數！");
        showPrompt("命名出題組合：", "", async (name) => {
            if (!name || !name.trim()) return;
            const currentCat = activePromptCategory;
            const catConfigs = savedPromptConfigs[currentCat] || [];
            if (catConfigs.length >= 50) return showAlert(`最多只能儲存 50 個組合！`);
            const newConfigs = { ...savedPromptConfigs, [currentCat]: [...catConfigs, { id: Date.now().toString(), name: name.trim(), rules: validRules }] };
            try {
                setSavedPromptConfigs(newConfigs);
                await window.db.collection('users').doc(user.uid).collection('qlib').doc('main').set({ promptConfigs: newConfigs }, { merge: true });
                showAlert("組合保存成功！");
            } catch(e) {}
        });
    };

    const handleDeletePromptConfig = (id) => {
        showConfirm("確定要刪除這個出題組合嗎？", async () => {
            const currentCat = activePromptCategory;
            const newConfigs = { ...savedPromptConfigs, [currentCat]: (savedPromptConfigs[currentCat] || []).filter(c => c.id !== id) };
            setSavedPromptConfigs(newConfigs);
            await window.db.collection('users').doc(user.uid).collection('qlib').doc('main').set({ promptConfigs: newConfigs }, { merge: true });
        });
    };

    // 取得當下畫面要渲染的問題清單 (私有庫 or 商城內部章節)
    let activeChapter = null;
    let activeSubject = null;
    let sourceQuestions = [];

    if (activeMainTab === 'my') {
        activeSubject = subjects.find(s => s.id === activeSubjectId);
        activeChapter = (activeSubject?.chapters || []).find(c => c.id === activeChapterId);
        sourceQuestions = (activeChapter?.questions || []).map((q, idx) => ({ ...q, _localNum: idx + 1 }));
    } else if (activeMainTab === 'public' && activeStoreSubjectId) {
        activeSubject = publicSubjects.find(s => s.id === activeStoreSubjectId);
        const cachedChaps = publicSubjectData[activeStoreSubjectId] || [];
        activeChapter = cachedChaps.find(c => c.id === activeStoreChapterId);
        sourceQuestions = (activeChapter?.questions || []).map((q, idx) => ({ ...q, _localNum: idx + 1 }));
    }

    const chapterTags = [...new Set(sourceQuestions.map(q => q.tag).filter(Boolean))];
    const chapterDiffs = [...new Set(sourceQuestions.map(q => q.difficulty).filter(Boolean))];
    const displayedQuestions = sourceQuestions.filter(q => {
        const lowerSearch = chapterSearchQ.toLowerCase();
        const matchSearch = !chapterSearchQ || q.text.toLowerCase().includes(lowerSearch) || (q.explain || '').toLowerCase().includes(lowerSearch) || (q.tag || '').toLowerCase().includes(lowerSearch);
        const matchTag = !filterTag || q.tag === filterTag;
        const matchDiff = !filterDiff || q.difficulty === filterDiff;
        return matchSearch && matchTag && matchDiff;
    });

    const totalPages = Math.ceil(displayedQuestions.length / PAGE_SIZE);
    const paginatedQuestions = displayedQuestions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // 產生測驗使用的變數設定
    let quizTargetSubject = null;
    let availableQuestionsForQuiz = [];
    
    if (activeMainTab === 'my') {
        quizTargetSubject = subjects.find(s => s.id === selectedQuizSubjectId) || subjects[0];
        const targetChapters = quizTargetSubject ? (quizTargetSubject.chapters || []) : [];
        availableQuestionsForQuiz = targetChapters.flatMap(c => (c.questions || []).map(q => ({...q, chapterId: c.id, chapterName: c.name})));
    } else if (activeMainTab === 'public') {
        quizTargetSubject = publicSubjects.find(s => s.id === selectedQuizSubjectId) || publicSubjects[0];
        const cachedChaps = publicSubjectData[selectedQuizSubjectId] || [];
        availableQuestionsForQuiz = cachedChaps.flatMap(c => (c.questions || []).map(q => ({...q, chapterId: c.id, chapterName: c.name})));
    }

    // 動態計算庫存題數
    let basePoolForQuiz = availableQuestionsForQuiz;
    if (skipUsed) basePoolForQuiz = basePoolForQuiz.filter(q => !q.usedCount || q.usedCount === 0);

    const poolByChapter = {};
    const poolByTag = {};
    basePoolForQuiz.forEach(q => {
        if (!poolByChapter[q.chapterId]) poolByChapter[q.chapterId] = [];
        poolByChapter[q.chapterId].push(q);
        
        if (q.tag) {
            if (!poolByTag[q.tag]) poolByTag[q.tag] = [];
            poolByTag[q.tag].push(q);
        }
    });

    const quizListItems = quizDistributeMode === 'chapter' 
        ? (quizTargetSubject?.chapters || []).map(c => ({ key: c.id, label: c.name, count: poolByChapter[c.id]?.length || 0 }))
        : Object.keys(poolByTag).map(t => ({ key: t, label: t, count: poolByTag[t].length })).sort((a,b)=>b.count - a.count);

    const handleAutoDistribute = () => {
        if (quizSelectedItems.length === 0) return showAlert("請先勾選要出題的項目！");
        const total = parseInt(quickTotal) || 0;
        if (total <= 0) return showAlert("請輸入有效總題數！");
        
        let remaining = total;
        const newAllocations = { ...quizAllocations };
        quizSelectedItems.forEach(k => newAllocations[k] = 0);
        
        let activeItems = [...quizSelectedItems];
        while (remaining > 0 && activeItems.length > 0) {
            const avg = Math.max(1, Math.floor(remaining / activeItems.length));
            let distributedSomething = false;
            
            for (let i = activeItems.length - 1; i >= 0; i--) {
                const key = activeItems[i];
                const available = quizListItems.find(x => x.key === key)?.count || 0;
                const current = newAllocations[key] || 0;
                
                if (current < available) {
                    const toAdd = Math.min(avg, available - current, remaining);
                    newAllocations[key] = current + toAdd;
                    remaining -= toAdd;
                    distributedSomething = true;
                } else {
                    activeItems.splice(i, 1);
                }
                if (remaining <= 0) break;
            }
            if (!distributedSomething) break;
        }
        
        setQuizAllocations(newAllocations);
        if (remaining > 0) showAlert(`庫存不足，已最大化分配 ${total - remaining} 題。`);
    };

    const handleGenerateQuiz = async () => {
        const totalAllocated = quizSelectedItems.reduce((sum, key) => sum + (parseInt(quizAllocations[key]) || 0), 0);
        if (totalAllocated <= 0) return showAlert("總出題數必須大於 0！請確認已分配題數。");

        setIsGeneratingQuiz(true);
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            let pool = [];
            let finalSelection = [];

            quizSelectedItems.forEach(key => {
                let needed = parseInt(quizAllocations[key]) || 0;
                if (needed <= 0) return;

                let groupPool = basePoolForQuiz.filter(q => quizDistributeMode === 'tag' ? q.tag === key : q.chapterId === key).sort(() => 0.5 - Math.random());
                let selected = groupPool.slice(0, needed);
                finalSelection.push(...selected);
            });

            pool = finalSelection.sort(() => 0.5 - Math.random());

            if (pool.length === 0) {
                showAlert("找不到符合條件的題目！");
                setIsGeneratingQuiz(false);
                return;
            }

            const poolIds = new Set(pool.map(q => q.id));
            const affectedChapters = new Set(pool.map(q => q.chapterId));
            
            // 出題次數更新 (限私有題庫)
            if (activeMainTab === 'my') {
                const newSubjects = subjects.map(s => {
                    if (s.id !== selectedQuizSubjectId) return s;
                    return {
                        ...s,
                        chapters: (s.chapters || []).map(c => {
                            if (!affectedChapters.has(c.id)) return c;
                            return {
                                ...c,
                                questions: (c.questions || []).map(q => poolIds.has(q.id) ? { ...q, usedCount: (q.usedCount || 0) + 1 } : q)
                            };
                        })
                    };
                });
                setSubjects(newSubjects);
                const batch = window.db.batch();
                const targetSubj = newSubjects.find(s => s.id === selectedQuizSubjectId);
                if (targetSubj) {
                    targetSubj.chapters.forEach(c => {
                        if (affectedChapters.has(c.id)) {
                            const qRef = window.db.collection('users').doc(user.uid).collection('qlib_questions').doc(c.id);
                            batch.set(qRef, { questions: c.questions }, { merge: true });
                        }
                    });
                    batch.commit().catch(e => console.warn("更新出題次數失敗", e));
                }
            } 

            const structuredQuestions = pool.map((q, idx) => ({
                number: idx + 1, globalIndex: idx, type: 'Q', id: q.id, chapterId: q.chapterId, mainText: q.text,
                options: q.options, ans: q.ans, explain: q.explain, tag: q.tag, difficulty: q.difficulty
            }));

            const correctAnswersStr = pool.map(q => q.ans || 'A').join(',');
            const quizId = Date.now().toString();
            const finalTestName = quizNameInput.trim() !== '' ? quizNameInput.trim() : `題庫測驗 (${pool.length}題)`;

            const quizData = {
                id: quizId, testName: finalTestName, folder: '我的題庫', numQuestions: pool.length,
                maxScore: 100, roundScore: true, correctAnswersInput: correctAnswersStr,
                publishAnswers: true, allowPeek: true, hasSeparatedContent: true, isCompleted: false,
                isIndependentQuestions: true, userAnswers: Array(pool.length).fill(''), starred: Array(pool.length).fill(false),
                notes: Array(pool.length).fill(''), peekedAnswers: Array(pool.length).fill(false),
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            };

            const contentData = { questions: structuredQuestions };

            window.db.collection('users').doc(user.uid).collection('quizzes').doc(quizId).set(quizData).catch(e => console.error(e));
            window.db.collection('users').doc(user.uid).collection('quizContents').doc(quizId).set(contentData).catch(e => console.error(e));
            
            setShowQuizModal(false);
            if (onContinueQuiz) onContinueQuiz({ ...quizData, ...contentData });

        } catch (err) {
            showAlert("試卷產生失敗。");
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    return (
        <div className="flex h-full w-full bg-[#FCFBF7] dark:bg-stone-900 transition-colors relative">
            {/* ✨ 手機版：展開側邊欄按鈕 */}
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden absolute bottom-6 right-6 z-40 bg-amber-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:bg-amber-600 transition-colors">
                <span className="material-symbols-outlined text-[24px]">menu_book</span>
            </button>

            {/* ✨ 手機版：點擊外部關閉側邊欄的遮罩 */}
            {isSidebarOpen && (
                <div onClick={() => setIsSidebarOpen(false)} className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"></div>
            )}

            {/* 左側選單 (手機版變為浮動側拉面板) */}
            <div className={`fixed inset-y-0 left-0 z-50 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out w-72 md:w-64 border-r border-stone-200 dark:border-stone-700 flex flex-col bg-stone-50 dark:bg-stone-900 shrink-0 shadow-2xl md:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* 手機版：關閉按鈕 */}
                <div className="md:hidden flex justify-end p-2 bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                    <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-stone-800 dark:text-gray-400 dark:hover:text-white p-2 flex items-center font-bold text-sm">
                        <span className="material-symbols-outlined mr-1">close</span> 關閉目錄
                    </button>
                </div>
                <div className="flex bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                    <button onClick={() => setActiveMainTab('my')} className={`flex-1 py-2 font-black text-[12px] flex flex-col items-center justify-center gap-1 transition-colors ${activeMainTab === 'my' ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border-b-2 border-amber-500' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700'}`}><span className="material-symbols-outlined text-[18px]">library_books</span> 我的</button>
                    <button onClick={() => setActiveMainTab('public')} className={`flex-1 py-2 font-black text-[12px] flex flex-col items-center justify-center gap-1 transition-colors ${activeMainTab === 'public' ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border-b-2 border-amber-500' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700'}`}><span className="material-symbols-outlined text-[18px]">storefront</span> 商城</button>
                    <button onClick={() => setActiveMainTab('search')} className={`flex-1 py-2 font-black text-[12px] flex flex-col items-center justify-center gap-1 transition-colors ${activeMainTab === 'search' ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border-b-2 border-amber-500' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700'}`}><span className="material-symbols-outlined text-[18px]">travel_explore</span> 搜尋</button>
                    <button onClick={() => setActiveMainTab('prompt')} className={`flex-1 py-2 font-black text-[12px] flex flex-col items-center justify-center gap-1 transition-colors ${activeMainTab === 'prompt' ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border-b-2 border-amber-500' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700'}`}><span className="material-symbols-outlined text-[18px]">smart_toy</span> 提示</button>
                </div>

                {/* 根據頁籤顯示不同側邊欄內容 */}
                {activeMainTab === 'my' && (
                    <>
                        <div className="p-3 flex justify-between items-center bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                            <span className="font-bold text-sm text-stone-600 dark:text-stone-300">私人科目列表</span>
                            <button onClick={(e) => { e.stopPropagation(); handleAddSubject(); }} className="text-amber-600 hover:text-amber-800 dark:text-amber-400" title="新增科目"><span className="material-symbols-outlined text-[20px]">add_box</span></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {subjects.length === 0 && <div className="text-sm text-gray-400 text-center py-4">目前尚無科目</div>}
                            {subjects.map(subj => (
                                <div key={subj.id} className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-stone-800">
                                    <div className="flex justify-between items-center px-3 py-2 bg-stone-100 dark:bg-stone-700">
                                        <button onClick={() => setActiveSubjectId(activeSubjectId === subj.id ? null : subj.id)} className="flex-1 text-left font-bold text-sm text-stone-700 dark:text-stone-200 truncate focus:outline-none">{subj.name}</button>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={(e) => { e.stopPropagation(); handleAddChapter(subj.id); }} className="text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400" title="新增章節"><span className="material-symbols-outlined text-[18px]">add_circle</span></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subj.id); }} className="text-gray-400 hover:text-red-500" title="刪除科目"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                        </div>
                                    </div>
                                    {activeSubjectId === subj.id && (
                                        <div className="p-2 space-y-1 bg-stone-50 dark:bg-stone-800/30 border-t border-stone-200 dark:border-stone-700">
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedQuizSubjectId(subj.id); setQuizDistributeMode('chapter'); setQuizSelectedItems(subj.chapters.map(c => c.id)); setQuizAllocations({}); setQuizNameInput(''); setShowQuizModal(true); }} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 rounded-lg shadow-sm flex justify-center items-center gap-1 transition-transform active:scale-95 mb-2 text-xs">
                                                <span className="material-symbols-outlined text-[16px]">quiz</span> 從此科目出題
                                            </button>
                                            {(subj.chapters || []).length === 0 && <div className="text-xs text-gray-400 px-2 py-1">無章節</div>}
                                            {(subj.chapters || []).map((chap, chapIdx) => (
                                                <div key={chap.id} className={`group flex justify-between items-center px-2 py-1.5 rounded-lg transition-colors ${activeChapterId === chap.id ? 'bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700' : 'hover:bg-stone-100 dark:hover:bg-stone-700 border border-transparent'}`}>
                                                    <button onClick={() => { setActiveChapterId(chap.id); setIsSidebarOpen(false); }} className={`flex-1 text-left text-xs font-bold truncate focus:outline-none ${activeChapterId === chap.id ? 'text-amber-800 dark:text-amber-400' : 'text-stone-600 dark:text-stone-300'}`}>
                                                        <span className="material-symbols-outlined text-[14px] align-middle mr-1">folder_open</span> {chap.name} ({(chap.questions || []).length})
                                                    </button>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ opacity: activeChapterId === chap.id ? 1 : undefined }}>
                                                       <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(subj.id, chapIdx, 'up'); }} className="text-gray-400 hover:text-cyan-600" title="上移章節"><span className="material-symbols-outlined text-[14px]">arrow_upward</span></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(subj.id, chapIdx, 'down'); }} className="text-gray-400 hover:text-cyan-600" title="下移章節"><span className="material-symbols-outlined text-[14px]">arrow_downward</span></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleRenameChapter(subj.id, chap.id, chap.name); }} className="text-gray-400 hover:text-amber-500" title="重新命名"><span className="material-symbols-outlined text-[14px]">edit</span></button>
                                                        {user?.email === 'jay03wn@gmail.com' && (
                                                            <button onClick={(e) => { e.stopPropagation(); setIsPublishing({ subjId: subj.id, chap: chap }); }} className="text-gray-400 hover:text-emerald-500" title="發布至公開題庫"><span className="material-symbols-outlined text-[14px]">public</span></button>
                                                        )}
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
                )}

                {activeMainTab === 'public' && (
                    <div className="flex-1 flex flex-col">
                        <div className="p-3 bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                            <span className="font-bold text-sm text-stone-600 dark:text-stone-300">公開商城導覽</span>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                            {!activeStoreSubjectId ? (
                                <div className="text-center text-stone-500 dark:text-stone-400 mt-10">
                                    <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">shopping_bag</span>
                                    <p className="font-bold text-sm">歡迎來到公開題庫商城</p>
                                    <p className="text-xs mt-1">請在右側挑選優質題庫</p>
                                </div>
                            ) : (
                                <div>
                                    <button onClick={() => {setActiveStoreSubjectId(null); setActiveStoreChapterId(null);}} className="w-full mb-4 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 font-bold py-2 rounded-lg shadow-sm flex justify-center items-center gap-1 transition-colors text-sm">
                                        <span className="material-symbols-outlined text-[16px]">arrow_back</span> 返回商品列表
                                    </button>
                                    <h4 className="font-black text-stone-800 dark:text-stone-100 mb-2 border-b border-stone-200 dark:border-stone-700 pb-2">{publicSubjects.find(s=>s.id===activeStoreSubjectId)?.name}</h4>
                                    
                                    {user?.email === 'jay03wn@gmail.com' && (
                                        <div className="flex gap-2 mb-3">
                                            <button onClick={(e) => { e.stopPropagation(); handleAddChapter(activeStoreSubjectId); }} className="flex-1 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 font-bold py-1.5 rounded text-xs flex items-center justify-center gap-1 hover:bg-cyan-100 transition-colors"><span className="material-symbols-outlined text-[14px]">add</span> 新增章節</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSubject(activeStoreSubjectId); }} className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-1.5 rounded text-xs flex items-center justify-center gap-1 hover:bg-red-100 transition-colors"><span className="material-symbols-outlined text-[14px]">delete</span> 刪除商品</button>
                                        </div>
                                    )}

                                    <button onClick={(e) => { e.stopPropagation(); setSelectedQuizSubjectId(activeStoreSubjectId); setQuizDistributeMode('chapter'); setQuizSelectedItems((publicSubjectData[activeStoreSubjectId] || []).map(c=>c.id)); setQuizAllocations({}); setQuizNameInput(''); setShowQuizModal(true); }} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg shadow-sm flex justify-center items-center gap-1 transition-transform active:scale-95 mb-4 text-xs">
                                        <span className="material-symbols-outlined text-[16px]">quiz</span> 從此商品出題
                                    </button>
                                    <div className="space-y-1">
                                        {(publicSubjectData[activeStoreSubjectId] || []).length === 0 && <div className="text-xs text-gray-400">無章節或正在載入...</div>}
                                        {(publicSubjectData[activeStoreSubjectId] || []).map((chap, chapIdx) => (
                                            <div key={chap.id} className={`group flex justify-between items-center px-2 py-2 rounded-lg transition-colors ${activeStoreChapterId === chap.id ? 'bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700' : 'hover:bg-stone-100 dark:hover:bg-stone-700 border border-transparent'}`}>
                                                <button onClick={() => { setActiveStoreChapterId(chap.id); setIsSidebarOpen(false); }} className={`flex-1 text-left text-xs font-bold truncate focus:outline-none ${activeStoreChapterId === chap.id ? 'text-amber-800 dark:text-amber-400' : 'text-stone-600 dark:text-stone-300'}`}>
                                                    <span className="material-symbols-outlined text-[14px] align-middle mr-1">folder_open</span> {chap.name} ({(chap.questions || []).length})
                                                </button>
                                                {user?.email === 'jay03wn@gmail.com' && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                        <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(activeStoreSubjectId, chapIdx, 'up'); }} className="text-gray-400 hover:text-cyan-600" title="上移章節"><span className="material-symbols-outlined text-[14px]">arrow_upward</span></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(activeStoreSubjectId, chapIdx, 'down'); }} className="text-gray-400 hover:text-cyan-600" title="下移章節"><span className="material-symbols-outlined text-[14px]">arrow_downward</span></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleRenameChapter(activeStoreSubjectId, chap.id, chap.name); }} className="text-gray-400 hover:text-amber-500" title="重新命名"><span className="material-symbols-outlined text-[14px]">edit</span></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteChapter(activeStoreSubjectId, chap.id); }} className="text-gray-400 hover:text-red-500" title="刪除章節"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeMainTab === 'search' && (
                    <div className="flex-1 flex flex-col">
                        <div className="p-3 bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                            <span className="font-bold text-sm text-stone-600 dark:text-stone-300">搜尋選項</span>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">搜尋範圍</label>
                                <select value={searchScope} onChange={e => setSearchScope(e.target.value)} className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold text-sm dark:text-white cursor-pointer">
                                    <option value="my">我的題庫</option>
                                    <option value="public">公開題庫 (商城)</option>
                                    <option value="all">跨庫搜尋 (全部)</option>
                                </select>
                            </div>
                            <div className="bg-stone-100 dark:bg-stone-800 p-3 rounded-lg border border-stone-200 dark:border-stone-700">
                                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                                    <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">💡 搜尋小技巧</span>
                                    系統會同時比對「題目內容」、「標籤」以及「詳解」。若搜尋公開題庫，初次載入會需要幾秒鐘為您建置快取。
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeMainTab === 'prompt' && (
                    <div className="flex-1 flex flex-col">
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
                                <button key={cat} onClick={() => setActivePromptCategory(cat)} className={`w-full text-left px-3 py-2 font-bold text-sm rounded-lg transition-colors ${activePromptCategory === cat ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-700' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 border border-transparent'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 右側主畫面 */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#FCFBF7] dark:bg-stone-900 relative">
                
                {/* ✨ 阻擋器：全域載入與初始化動畫 */}
                {(isInitializing || isLoadingPublicData || isUploadingCover) && (
                    <div className="absolute inset-0 z-[100] bg-[#FCFBF7]/80 dark:bg-stone-900/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300">
                        <div className="bg-white dark:bg-stone-800 p-8 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 flex flex-col items-center max-w-sm w-[90%] text-center transform transition-all">
                            <div className="relative mb-6 mt-2">
                                <div className="w-20 h-20 border-4 border-amber-200 dark:border-amber-900/50 rounded-full animate-ping absolute inset-0 opacity-50"></div>
                                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center relative z-10 shadow-inner">
                                    <span className="material-symbols-outlined text-[40px] text-amber-500 animate-bounce">auto_stories</span>
                                </div>
                            </div>
                            <h2 className="text-xl font-black text-stone-800 dark:text-stone-100 mb-2">
                                {isInitializing ? '正在準備您的專屬題庫...' : (isUploadingCover ? '圖片上傳中...' : '資料載入中...')}
                            </h2>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {isInitializing ? '初次載入可能需要幾秒鐘，請稍候' : '即將完成，請稍候'}
                            </p>
                            <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full mt-6 overflow-hidden relative">
                                <div className="h-full bg-amber-500 rounded-full w-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- 畫面1: 我的題庫 / 公開題庫的章節檢視 --- */}
                {(activeMainTab === 'my' || (activeMainTab === 'public' && activeStoreChapterId)) && (
                    <>
                        {!activeChapter ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
                                <span className="material-symbols-outlined text-[64px] mb-4 opacity-50">library_books</span>
                                <p className="font-bold">請從左側選擇或建立一個章節來開始</p>
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
                                            <button onClick={() => { setSelectedQuizSubjectId(activeSubject?.id); setQuizDistributeMode('chapter'); setQuizSelectedItems([activeChapter.id]); setQuizAllocations({}); setQuizNameInput(''); setShowQuizModal(true); }} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm px-4 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-transform active:scale-95">
                                                <span className="material-symbols-outlined text-[16px]">quiz</span> 從此章節出題
                                            </button>
                                        )}
                                        {(activeMainTab === 'my' || user?.email === 'jay03wn@gmail.com') && (activeChapter.questions || []).length > 0 && (
                                            <button onClick={handleClearQuestions} className="text-red-500 font-bold text-sm bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center gap-1 transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">delete_sweep</span> 清空
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap sm:flex-nowrap gap-2 mb-6 bg-white dark:bg-stone-800 p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm shrink-0">
                                    <div className="flex-1 relative">
                                        <span className="material-symbols-outlined absolute left-2.5 top-2 text-gray-400 text-[18px]">search</span>
                                        <input type="text" placeholder="單一章節內搜尋..." value={chapterSearchQ} onChange={e => setChapterSearchQ(e.target.value)} className="w-full pl-9 pr-3 py-1.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white" />
                                    </div>
                                    <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="w-32 px-2 py-1.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white font-bold cursor-pointer">
                                        <option value="">所有標籤</option>
                                        {chapterTags.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    {(activeMainTab === 'my' || user?.email === 'jay03wn@gmail.com') && filterTag && (
                                        <div className="flex gap-1 items-center">
                                            <button onClick={handleBatchRenameTag} className="px-2 py-1.5 bg-cyan-100 text-cyan-700 hover:bg-cyan-200 rounded-lg text-xs font-bold border border-cyan-200 transition-colors shadow-sm" title="批次改名此標籤">改名</button>
                                            <button onClick={handleBatchDeleteTag} className="px-2 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-bold border border-red-200 transition-colors shadow-sm" title="刪除此標籤所有題目">刪除</button>
                                        </div>
                                    )}
                                    <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)} className="w-32 px-2 py-1.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white font-bold cursor-pointer">
                                        <option value="">所有難度</option>
                                        {chapterDiffs.map(d => <option key={d} value={d}>難度: {d}</option>)}
                                    </select>
                                </div>

                                {(activeMainTab === 'my' || user?.email === 'jay03wn@gmail.com') && (
                                    <div className="mb-6 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 shadow-sm shrink-0">
                                        <h3 className="font-bold text-stone-800 dark:text-stone-200 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-cyan-600 text-[18px]">upload_file</span> 批次匯入題目</h3>
                                        <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="請貼上符合格式的題目...&#10;範例：&#10;[Q.001]&#10;[#標籤|@難度|Ans:A]&#10;題目文字...&#10;[A]選項A&#10;[B]選項B&#10;[C]選項C&#10;[D]選項D&#10;[Explain:詳解]" className="w-full h-20 p-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none focus:border-amber-500 font-mono text-sm resize-none custom-scrollbar dark:text-stone-200" />
                                        <div className="flex justify-end mt-2">
                                            <button onClick={handleImport} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-colors text-sm">
                                                <span className="material-symbols-outlined text-[16px]">save_alt</span> 執行匯入
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                   {paginatedQuestions.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400 font-bold border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-xl">找不到符合條件的題目</div>
                                    ) : paginatedQuestions.map((q, idx) => (
                                        <div key={q.id} className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 shadow-sm relative group">
                                            <div className="font-black text-stone-400 text-xs mb-2">題號: {(currentPage - 1) * PAGE_SIZE + idx + 1}</div>
                                            {(activeMainTab === 'my' || user?.email === 'jay03wn@gmail.com') && (
                                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <button onClick={() => setEditingQuestion(q)} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-stone-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-amber-100 hover:text-amber-600 transition-colors" title="編輯"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                                    <button onClick={() => handleDeleteQuestion(q.id)} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-stone-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors" title="刪除"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-2 mb-3 pr-20">
                                                <span className="text-xs font-black bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-800 px-2 py-0.5 rounded">第 {q._localNum} 題</span>
                                                {q.tag && <span className="text-xs font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">sell</span>{q.tag}</span>}
                                                {q.difficulty && <span className="text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">bar_chart</span>難度: {q.difficulty}</span>}
                                                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">check_circle</span>答案: {q.ans}</span>
                                                {q.usedCount > 0 && <span className="text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">history</span>已出過 ({q.usedCount}次)</span>}
                                                {q.stats && (
                                                    <span className="text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-200 dark:border-purple-800">
                                                        <span className="material-symbols-outlined text-[12px]">analytics</span>
                                                        答對率: {q.stats.total ? Math.round((q.stats.correct || 0) / q.stats.total * 100) : 0}% | 收錄: {q.stats.bookmarks||0}
                                                    </span>
                                                )}
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
                                {totalPages > 1 && (
                                    <div className="flex justify-center items-center gap-2 mt-6">
                                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-sm font-bold text-stone-600 dark:text-stone-300 disabled:opacity-50">上一頁</button>
                                        <span className="text-sm font-bold text-stone-600 dark:text-stone-300">第 {currentPage} / {totalPages} 頁</span>
                                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-sm font-bold text-stone-600 dark:text-stone-300 disabled:opacity-50">下一頁</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* --- 畫面2: 公開題庫 (商城風格首頁與詳情) --- */}
                {activeMainTab === 'public' && !activeStoreChapterId && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#FCFBF7] dark:bg-stone-900">
                        {/* 商城首頁 (沒有選擇特定商品時) */}
                        {!activeStoreSubjectId ? (
                            <>
                                <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-8 text-white">
                                    <h1 className="text-4xl font-black mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[40px]">local_mall</span> 雲端題庫商城</h1>
                                    <p className="font-bold opacity-90">所有玩家共享的精選題庫，無限免費使用。</p>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-black text-stone-800 dark:text-stone-100">精選商品 ({publicSubjects.length})</h2>
                                        {user?.email === 'jay03wn@gmail.com' && (
                                            <button onClick={handleAddSubject} className="bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-800 px-4 py-2 rounded-lg font-bold shadow flex items-center gap-1 hover:opacity-90"><span className="material-symbols-outlined text-[18px]">add</span> 新增上架</button>
                                        )}
                                    </div>
                                    {publicSubjects.length === 0 ? (
                                        <div className="text-center py-20 text-stone-400 font-bold">目前架上尚無題庫商品。</div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {publicSubjects.map(subj => (
                                                <div key={subj.id} onClick={() => loadStoreSubjectDetails(subj)} className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm hover:shadow-xl transition-all cursor-pointer border border-stone-200 dark:border-stone-700 overflow-hidden flex flex-col group transform hover:-translate-y-1">
                                                    <div className="h-40 bg-stone-200 dark:bg-stone-700 relative overflow-hidden flex-shrink-0">
                                                        {subj.coverUrl ? (
                                                            <img src={subj.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 dark:text-stone-500">
                                                                <span className="material-symbols-outlined text-[40px]">image</span>
                                                                <span className="text-xs font-bold mt-1">無封面圖片</span>
                                                            </div>
                                                        )}
                                                        {user?.email === 'jay03wn@gmail.com' && (
                                                            <button onClick={(e) => { e.stopPropagation(); triggerCoverUpload(subj.id); }} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-colors" title="上傳封面">
                                                                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="p-4 flex flex-col flex-1">
                                                        <h3 className="font-black text-lg text-stone-800 dark:text-stone-100 mb-1 line-clamp-2">{subj.name}</h3>
                                                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">folder_copy</span> {subj.chapters?.length || 0} 個章節</p>
                                                        <div className="mt-auto flex justify-between items-center">
                                                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 text-xs font-black px-2 py-1 rounded">免費取得</span>
                                                            <span className="text-amber-500 font-bold text-sm flex items-center gap-1">查看詳情 <span className="material-symbols-outlined text-[16px]">arrow_forward</span></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* 商品詳情頁 */
                            <div className="p-8">
                                <div className="bg-white dark:bg-stone-800 rounded-3xl p-8 shadow-sm border border-stone-200 dark:border-stone-700 flex flex-col md:flex-row gap-8 items-start relative">
                                    <div className="w-full md:w-64 h-64 bg-stone-100 dark:bg-stone-700 rounded-2xl overflow-hidden shrink-0 shadow-inner relative group border border-stone-200 dark:border-stone-600">
                                        {publicSubjects.find(s=>s.id===activeStoreSubjectId)?.coverUrl ? (
                                            <img src={publicSubjects.find(s=>s.id===activeStoreSubjectId)?.coverUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                                                <span className="material-symbols-outlined text-[64px] mb-2">image</span>
                                                <span className="font-bold">暫無商品圖片</span>
                                            </div>
                                        )}
                                        {user?.email === 'jay03wn@gmail.com' && (
                                            <button onClick={() => triggerCoverUpload(activeStoreSubjectId)} className="absolute inset-0 bg-black/50 text-white flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex font-bold backdrop-blur-sm">
                                                <span className="material-symbols-outlined text-[32px] mb-1">upload</span>
                                                更換封面圖片
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400 font-black text-xs rounded-full mb-3 border border-amber-200 dark:border-amber-700">官方嚴選題庫</div>
                                        <h1 className="text-4xl font-black text-stone-800 dark:text-stone-100 mb-2">{publicSubjects.find(s=>s.id===activeStoreSubjectId)?.name}</h1>
                                        <p className="text-gray-500 dark:text-gray-400 font-bold mb-6 flex items-center gap-2">
                                            <span className="material-symbols-outlined">menu_book</span> 
                                            共包含 {(publicSubjectData[activeStoreSubjectId] || []).length} 個學習章節
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-3">
                                            <button onClick={() => { setSelectedQuizSubjectId(activeStoreSubjectId); setQuizDistributeMode('chapter'); setQuizSelectedItems((publicSubjectData[activeStoreSubjectId] || []).map(c=>c.id)); setQuizAllocations({}); setQuizNameInput(''); setShowQuizModal(true); }} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-8 py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2 text-lg">
                                                <span className="material-symbols-outlined">rocket_launch</span> 立即開始測驗
                                            </button>
                                            <button onClick={() => setActiveStoreSubjectId(null)} className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 font-bold px-6 py-3 rounded-xl transition-colors border border-stone-200 dark:border-stone-600">
                                                繼續逛逛
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-8">
                                    <h3 className="text-xl font-black text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-amber-500">format_list_bulleted</span> 章節目錄 (點擊可預覽題目)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(publicSubjectData[activeStoreSubjectId] || []).map(chap => (
                                            <button key={chap.id} onClick={() => setActiveStoreChapterId(chap.id)} className="bg-white dark:bg-stone-800 p-4 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md transition-all text-left flex justify-between items-center group">
                                                <span className="font-bold text-stone-700 dark:text-stone-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{chap.name}</span>
                                                <span className="text-xs font-black bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 px-3 py-1 rounded-full">{chap.questions?.length || 0} 題</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- 畫面3: 跨庫獨立搜尋引擎 --- */}
                {activeMainTab === 'search' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#FCFBF7] dark:bg-stone-900 flex flex-col">
                        <div className={`transition-all duration-500 ease-in-out ${globalSearchResults.length === 0 && !isSearching ? 'mt-32' : 'mt-0 mb-6'}`}>
                            <h1 className="text-3xl font-black text-stone-800 dark:text-stone-100 text-center mb-6 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[36px] text-amber-500">travel_explore</span> 跨題庫智慧檢索
                            </h1>
                            <div className="max-w-2xl mx-auto flex gap-2 relative">
                                <span className="material-symbols-outlined absolute left-4 top-3.5 text-gray-400 text-[24px]">search</span>
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && executeGlobalSearch()} placeholder="輸入題目、標籤或詳解關鍵字..." className="w-full pl-12 pr-4 py-3 bg-white dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 rounded-xl outline-none font-bold text-lg dark:text-white focus:border-amber-500 shadow-sm transition-colors" />
                                <button onClick={executeGlobalSearch} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 rounded-xl shadow-sm transition-transform active:scale-95 whitespace-nowrap">
                                    搜尋
                                </button>
                            </div>
                        </div>

                        {isSearching ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-amber-500">
                                <span className="material-symbols-outlined text-[64px] animate-spin mb-4">autorenew</span>
                                <p className="font-bold text-stone-700 dark:text-stone-300">正在全領域檢索中，請稍候...</p>
                            </div>
                        ) : (
                            <div className="max-w-4xl mx-auto w-full space-y-4">
                                {globalSearchResults.length > 0 && (
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 border-b border-stone-200 dark:border-stone-700 pb-2">
                                        共找到 {globalSearchResults.length} 筆符合「{searchQuery}」的結果：
                                    </div>
                                )}
                                {globalSearchResults.map((q, idx) => (
                                    <div key={`${q.id}-${idx}`} className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <span className={`text-xs font-black px-2 py-0.5 rounded-full border border-current shadow-sm flex items-center gap-1 ${q._sourceStyle}`}><span className="material-symbols-outlined text-[12px]">{q._source === '我的題庫' ? 'person' : 'public'}</span>{q._source}</span>
                                            <span className="text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">folder_open</span>{q._subjName} - {q._chapName}</span>
                                            {q.tag && <span className="text-xs font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">sell</span>{q.tag}</span>}
                                            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">check_circle</span>答案: {q.ans}</span>
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
                        )}
                    </div>
                )}

                {/* --- 畫面4: Prompt --- */}
                {activeMainTab === 'prompt' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#FCFBF7] dark:bg-stone-900">
                        <div className="p-6 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                            <h1 className="text-3xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[36px] text-amber-500">smart_toy</span> 出題 Prompt 庫
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 font-bold">複製官方設計的 Prompt，貼給 AI 幫您產出高品質的考題！</p>
                            
                            <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
                                <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                                    <h3 className="text-sm font-black text-stone-700 dark:text-stone-300 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[18px]">tune</span> 複製前設定：指定出題範圍與題數
                                    </h3>
                                    <button onClick={handleSavePromptConfig} className="text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors flex items-center gap-1 active:scale-95 shadow-sm">
                                        <span className="material-symbols-outlined text-[14px]">save</span> 儲存組合
                                    </button>
                                </div>
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
                                            <input type="text" placeholder="章節名稱 (例如: 總論)" value={rule.chapter} onChange={(e) => { const newRules = [...promptRules]; newRules[idx].chapter = e.target.value; setPromptRules(newRules); }} className="flex-1 p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white focus:border-amber-500" />
                                            <input type="number" min="1" placeholder="題數" value={rule.count} onChange={(e) => { const newRules = [...promptRules]; newRules[idx].count = parseInt(e.target.value) || 0; setPromptRules(newRules); }} className="w-20 p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white focus:border-amber-500 text-center" />
                                            <button onClick={() => setPromptRules(promptRules.filter((_, i) => i !== idx))} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[18px]">close</span></button>
                                        </div>
                                    ))}
                                    <button onClick={() => setPromptRules([...promptRules, { chapter: '', count: 1 }])} className="text-sm font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 flex items-center gap-1 mt-2">
                                        <span className="material-symbols-outlined text-[16px]">add</span> 新增範圍
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
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
                                                            <button onClick={() => setEditingPrompt(template)} className="p-2 text-gray-400 hover:text-amber-500 transition-colors" title="編輯"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                                            <button onClick={() => handleDeletePrompt(template.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="刪除"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                        </>
                                                    )}
                                                    <button onClick={() => handleCopyPrompt(template.content)} className="px-4 py-1.5 font-bold text-sm bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-800 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1 active:scale-95">
                                                        <span className="material-symbols-outlined text-[18px]">content_copy</span> 複製 Prompt
                                                    </button>
                                                </div>
                                            </div>
                                            <pre className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono bg-stone-50 dark:bg-stone-900 p-4 rounded-xl border border-stone-100 dark:border-stone-700 max-h-64 overflow-y-auto custom-scrollbar">{template.content}</pre>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* --- Modals 彈窗區 --- */}
            {isPublishing && (
                <div className="fixed inset-0 z-[150] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-stone-200 dark:border-stone-700 pb-3">
                            <h3 className="text-xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2"><span className="material-symbols-outlined">publish</span> 推送至公開題庫</h3>
                            <button onClick={() => setIsPublishing(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-6">
                            您即將把「<span className="text-amber-600">{isPublishing.chap.name}</span>」推送到公開商城。<br/><br/>
                            推送後，所有玩家都能免費使用這些題目。<br/>
                            確定要執行嗎？
                        </p>
                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
                            <button onClick={() => setIsPublishing(null)} className="px-4 py-2 font-bold text-gray-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors">取消</button>
                            <button onClick={handlePublishToPublic} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 py-2 rounded-lg shadow-sm transition-transform active:scale-95 flex items-center gap-1">確認推送</button>
                        </div>
                    </div>
                </div>
            )}

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
                                {['A','B','C','D'].map(opt => (
                                    <div key={opt}><label className="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">選項 {opt}</label><input type="text" className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm dark:text-white focus:border-amber-500" value={editingQuestion.options[opt]} onChange={e => setEditingQuestion({...editingQuestion, options: {...editingQuestion.options, [opt]: e.target.value}})} /></div>
                                ))}
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

            {showQuizModal && (
                <div className="fixed inset-0 z-[150] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 relative overflow-hidden">
                        
                        <div className="p-6 pb-4 border-b border-stone-200 dark:border-stone-700 shrink-0">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2"><span className="material-symbols-outlined">quiz</span> 產生測驗</h3>
                                <button onClick={() => setShowQuizModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><span className="material-symbols-outlined">close</span></button>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1.5">測驗名稱 (選填)</label>
                                <input type="text" value={quizNameInput} onChange={e => setQuizNameInput(e.target.value)} placeholder="留空將自動為您命名" className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold dark:text-white focus:border-cyan-500 transition-colors" />
                            </div>
                            
                            <div className="flex gap-2">
                                <button onClick={() => { setQuizDistributeMode('chapter'); setQuizSelectedItems([]); setQuizAllocations({}); }} className={`flex-1 py-2 font-bold rounded-lg border transition-colors flex items-center justify-center gap-2 ${quizDistributeMode === 'chapter' ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300 border-transparent hover:bg-stone-200 dark:hover:bg-stone-600'}`}>
                                    <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span> 依章節配題
                                </button>
                                <button onClick={() => { setQuizDistributeMode('tag'); setQuizSelectedItems([]); setQuizAllocations({}); }} className={`flex-1 py-2 font-bold rounded-lg border transition-colors flex items-center justify-center gap-2 ${quizDistributeMode === 'tag' ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300 border-transparent hover:bg-stone-200 dark:hover:bg-stone-600'}`}>
                                    <span className="material-symbols-outlined text-[18px]">sell</span> 依標籤配題
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-stone-50 dark:bg-stone-900/50 flex flex-col custom-scrollbar">
                            
                            {publicQuizPresets.length > 0 && (
                                <div className="mb-4 bg-white dark:bg-stone-800 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm">
                                    <label className="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">💡 官方推薦組合 (一鍵套用)</label>
                                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                        {publicQuizPresets.map(preset => (
                                            <div key={preset.id} className="flex items-center gap-1 shrink-0 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-full pl-3 pr-1 py-1 shadow-sm">
                                                <button onClick={() => {
                                                    setQuizDistributeMode(preset.modeBy || 'chapter');
                                                    setQuizSelectedItems(preset.selectedItems || Object.keys(preset.allocations));
                                                    setQuizAllocations(preset.allocations);
                                                }} className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:text-amber-600 transition-colors">{preset.name}</button>
                                                {user?.email === 'jay03wn@gmail.com' && (
                                                    <button onClick={() => handleDeleteAdminPreset(preset.id)} className="text-amber-400 hover:text-red-500 rounded-full p-0.5 transition-colors flex items-center justify-center"><span className="material-symbols-outlined text-[14px]">cancel</span></button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-4 bg-white dark:bg-stone-800 p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-700 dark:text-stone-300 shrink-0">
                                    <input type="checkbox" checked={skipUsed} onChange={e => setSkipUsed(e.target.checked)} className="w-5 h-5 accent-amber-500" /> 優先出未作答過的題目
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400">批次分配:</span>
                                    <input type="text" inputMode="numeric" pattern="\d*" value={quickTotal} onChange={e => setQuickTotal(e.target.value.replace(/\D/g, ''))} className="w-16 p-1.5 bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded outline-none text-sm font-black text-center dark:text-white focus:border-amber-500" />
                                    <button onClick={handleAutoDistribute} className="text-xs font-bold bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 px-3 py-1.5 rounded-lg transition-colors shadow-sm whitespace-nowrap">快速均分</button>
                                </div>
                            </div>

                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-black text-stone-700 dark:text-stone-300">勾選並填寫所需題數</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setQuizSelectedItems(quizListItems.map(x=>x.key))} className="text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded transition-colors">全選</button>
                                    <button onClick={() => setQuizSelectedItems([])} className="text-xs font-bold bg-stone-200 text-stone-700 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-300 px-2 py-1 rounded transition-colors">全不選</button>
                                    {user?.email === 'jay03wn@gmail.com' && (
                                        <button onClick={handleSaveAdminPreset} className="text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-400 px-2 py-1 rounded transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">save</span> 儲存組合</button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {quizListItems.length === 0 && <div className="text-center text-sm font-bold text-gray-400 py-6 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-xl">此分類下尚無可用題目</div>}
                                {quizListItems.map(item => {
                                    const isSelected = quizSelectedItems.includes(item.key);
                                    return (
                                        <div key={item.key} className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors shadow-sm ${isSelected ? 'bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700' : 'bg-white border-stone-200 dark:bg-stone-800 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700'}`}>
                                            <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                                <input type="checkbox" checked={isSelected} onChange={() => {
                                                    setQuizSelectedItems(prev => isSelected ? prev.filter(x => x !== item.key) : [...prev, item.key]);
                                                    if (!isSelected && !quizAllocations[item.key]) {
                                                        // 勾選時自動填入最大可用或預設10題
                                                        setQuizAllocations(prev => ({...prev, [item.key]: Math.min(item.count, 10)}));
                                                    }
                                                }} className="w-5 h-5 accent-amber-500 shrink-0" />
                                                <div className="flex flex-col min-w-0">
                                                    <span className={`text-sm font-bold truncate ${isSelected ? 'text-amber-900 dark:text-amber-100' : 'text-stone-700 dark:text-stone-300'}`} title={item.label}>{item.label}</span>
                                                    <span className="text-[10px] font-black text-gray-500 mt-0.5 bg-stone-100 dark:bg-stone-700 px-1.5 py-0.5 rounded w-max">可用: {item.count} 題</span>
                                                </div>
                                            </label>
                                            
                                            <div className="flex items-center gap-1 shrink-0" style={{ opacity: isSelected ? 1 : 0.4, pointerEvents: isSelected ? 'auto' : 'none' }}>
                                                <input type="text" inputMode="numeric" pattern="\d*" value={quizAllocations[item.key] || ''} onChange={e => setQuizAllocations({...quizAllocations, [item.key]: e.target.value.replace(/\D/g, '')})} className="w-16 p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm font-black text-center dark:text-white focus:border-amber-500 transition-colors shadow-inner" placeholder="0" />
                                                <span className="text-xs font-bold text-gray-500 w-4">題</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-4 border-t border-stone-200 dark:border-stone-700 shrink-0 bg-white dark:bg-stone-800 flex justify-between items-center">
                            <span className="font-black text-lg text-stone-800 dark:text-stone-100 bg-amber-100 dark:bg-amber-900/50 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                                總計: {quizSelectedItems.reduce((sum, key) => sum + (parseInt(quizAllocations[key]) || 0), 0)} 題
                            </span>
                            <div className="flex gap-3">
                                <button disabled={isGeneratingQuiz} onClick={() => setShowQuizModal(false)} className="px-4 py-2 font-bold text-gray-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors disabled:opacity-50">取消</button>
                                <button disabled={isGeneratingQuiz} onClick={handleGenerateQuiz} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 font-black px-6 py-2 rounded-lg shadow-sm transition-transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100">
                                    {isGeneratingQuiz ? (
                                        <><span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span> 產生中...</>
                                    ) : (
                                        <><span className="material-symbols-outlined text-[18px]">play_arrow</span> 產生測驗</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {isGeneratingQuiz && (
                            <div className="absolute inset-0 z-10 bg-[#FCFBF7]/70 dark:bg-stone-800/70 backdrop-blur-sm flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-[48px] text-amber-500 animate-spin mb-3">autorenew</span>
                                <span className="font-black text-stone-800 dark:text-stone-100 text-lg tracking-widest shadow-sm">正在為您調配題目...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {editingPrompt && (
                <div className="fixed inset-0 z-[160] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 p-6">
                        <div className="flex justify-between items-center mb-4 border-b border-stone-200 dark:border-stone-700 pb-3 shrink-0">
                            <h3 className="text-xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2"><span className="material-symbols-outlined">edit_note</span> 編輯 Prompt</h3>
                            <button onClick={() => setEditingPrompt(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <div><label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">所屬分類</label><select value={editingPrompt.category} onChange={e => setEditingPrompt({...editingPrompt, category: e.target.value})} className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold dark:text-white">{promptCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                            <div><label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">標題</label><input type="text" value={editingPrompt.title} onChange={e => setEditingPrompt({...editingPrompt, title: e.target.value})} className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none font-bold dark:text-white" /></div>
                            <div><label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Prompt 內容</label><textarea value={editingPrompt.content} onChange={e => setEditingPrompt({...editingPrompt, content: e.target.value})} className="w-full h-64 p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none text-sm font-mono resize-none custom-scrollbar dark:text-white" /></div>
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
