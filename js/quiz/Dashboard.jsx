const { useState, useEffect, useRef } = React;

// 從全域 (window) 拿取 components.jsx 提供的小工具
const { 
    cleanQuizName, renderTestName, parseSmilesToHtml, LoadingSpinner, 
    ContentEditableEditor, AnswerGridInput, SpecificAnswerGridInput, HelpTooltip, 
    safeDecompress, processQuestionContent, extractSpecificContent, extractSpecificExplanation 
} = window;

function Dashboard(props) {
    const { user, userProfile, onStartNew, onContinueQuiz, showAlert, showConfirm, showPrompt, tutorialStep } = props;
    const [showHelp, setShowHelp] = useState(false); // ✨ 新增：教學模式開關
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isJumping, setIsJumping] = useState(false); // ✨ 新增：跳轉載入狀態
    const [isRefreshing, setIsRefreshing] = useState(false); // ✨ 新增：背景整理狀態
    
    // 🚀 終極提速：加入題庫顯示數量限制，大幅降低網路下載量
    const [visibleLimit, setVisibleLimit] = useState(10);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const [showShareModal, setShowShareModal] = useState(null);
    const [showMoveModal, setShowMoveModal] = useState(null);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    
    // ✨ 新增：獨立的新增資料夾 Modal 狀態 (避開 global prompt 的 Enter 問題)
    const [showAddFolderModal, setShowAddFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // ✨ 新增搜尋狀態
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingShareCode, setPendingShareCode] = useState(() => new URLSearchParams(window.location.search).get('shareCode'));

    // ✨ 新增：將 [公開試題管理] 設為固定分頁，方便你隨時點選
    const specialFolders = ['我建立的試題', '[公開試題管理]', '未分類', '任務牆'];
    const dynamicFolders = records.map(r => r.folder).filter(f => f && !specialFolders.includes(f));
    const rawUserFolders = [...(userProfile.folders || []), ...dynamicFolders].filter(f => !specialFolders.includes(f));
    const userFolders = [...specialFolders, ...Array.from(new Set(rawUserFolders))];
    
    const [currentFolder, setCurrentFolder] = useState('我建立的試題');
    const [filters, setFilters] = useState({ todo: true, doing: true, done: true });

    useEffect(() => {
        let isMounted = true;
        // 🚀 移除愚蠢的 800ms 強制關閉動畫，完全信任 Firebase 的連線狀態

        // 🚀 終極提速：利用 .limit() 讓 Firebase 每次只下載 15 份考卷，避開海量資料下載卡死
        const unsubscribe = window.db.collection('users').doc(user.uid).collection('quizzes')
            .orderBy('createdAt', 'desc')
            .limit(visibleLimit)
            .onSnapshot({ includeMetadataChanges: true }, snapshot => {
                if (isMounted) {
                    // ✨ 智慧判斷：如果是新用戶空快取，絕對不准提早關閉載入動畫！
                    if (snapshot.empty && snapshot.metadata.fromCache) return;
                }

                if (isMounted) {
                    // 如果正在背景更新，且目前畫面是空的，則不准關閉 Loading
                    if (snapshot.metadata.hasPendingWrites && records.length === 0) {
                        // 繼續等待雲端回應
                    } else {
                        setLoading(false);
                    }

                    if (snapshot.docs.length < visibleLimit) {
                        setHasMore(false);
                    } else {
                        setHasMore(true);
                    }
                    
                    // ✨ 優化：如果是本地端發出的變更，不需要重新 loading
                    const isLocal = snapshot.metadata.hasPendingWrites;
                    
                    
                    setTimeout(() => {
                        const newRecords = snapshot.docs.map(doc => {
                            const data = doc.data();
                            // 🚀 核心升級：只有舊版被壓縮過的資料才需要解壓縮，新版資料直接通過，速度提升 10 倍！
                            if (typeof data.results === 'string') data.results = safeDecompress(data.results, 'object');
                            if (typeof data.userAnswers === 'string') data.userAnswers = safeDecompress(data.userAnswers, 'array');
                            return { id: doc.id, ...data };
                        });
                        
                        // 💾 存入全域記憶體，確保下次切換回來瞬間顯示
                        window._cachedRecords = newRecords;
                        window._hasLoadedRecords = true;
                        
                        setRecords(newRecords);
                        setLoading(false);
                    }, 10);
                }
            }, err => {
                console.error(err);
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
            
            unsubscribe();
        };
    }, [user, visibleLimit, refreshTrigger]);

    const handleDelete = (id) => {
        const rec = records.find(r => r.id === id);
        showConfirm("確定要刪除這筆紀錄嗎？資料將無法恢復！", async () => {
            try {
                await window.db.collection('users').doc(user.uid).collection('quizzes').doc(id).delete();
                if (rec && !rec.isShared && !rec.isTask) {
                    await window.db.collection('publicTasks').doc(id).delete().catch(e => console.log("任務牆無此檔案", e));
                }
            } catch (error) {
                showAlert('刪除失敗：' + error.message);
            }
        });
    }

    const handleCreateFolder = () => {
        setNewFolderName('');
        setShowAddFolderModal(true);
    };

    const submitCreateFolder = () => {
        const cleanName = newFolderName.trim();
        if(cleanName && !userFolders.includes(cleanName)) {
            window.db.collection('users').doc(user.uid).set({
                folders: window.firebase.firestore.FieldValue.arrayUnion(cleanName)
            }, { merge: true }).then(() => {
                setCurrentFolder(cleanName);
                showAlert(`✅ 已建立資料夾「${cleanName}」`);
                setShowAddFolderModal(false);
            }).catch(e => showAlert('建立失敗：' + e.message));
        } else if (userFolders.includes(cleanName)) {
            showAlert('❌ 資料夾名稱已存在');
        } else {
            showAlert('❌ 名稱不可為空白');
        }
    };

    const moveQuizToFolder = (quiz, targetFolder) => {
        if (targetFolder === '我建立的試題') return showAlert('此為自動分類，無法手動移入喔！');
        window.db.collection('users').doc(user.uid).collection('quizzes').doc(quiz.id).update({ folder: targetFolder })
        .then(() => {
            showAlert(`✅ 已成功移動至 ${targetFolder}`);
            setShowMoveModal(null);
        })
        .catch(e => showAlert('移動失敗：' + e.message));
    };
    
    const handleDeleteFolder = (folderName) => {
        showConfirm(`確定要刪除「${folderName}」資料夾嗎？\n裡面的測驗將會被自動移至「未分類」。`, async () => {
            try {
                const snapshot = await window.db.collection('users').doc(user.uid).collection('quizzes').where('folder', '==', folderName).get();
                
                // 防呆：如果資料夾裡面有試卷，才執行 batch 更新，避免空 batch 報錯
                if (!snapshot.empty) {
                    const batch = window.db.batch();
                    snapshot.docs.forEach(doc => {
                        batch.update(doc.ref, { folder: '未分類' });
                    });
                    await batch.commit();
                }

                // 改用 set + merge: true，避免其他新帳號文件尚未完全初始化而導致 update 報錯
                await window.db.collection('users').doc(user.uid).set({
                    folders: window.firebase.firestore.FieldValue.arrayRemove(folderName)
                }, { merge: true });

                setCurrentFolder('未分類');
                showAlert(`✅ 已刪除「${folderName}」並將試卷移至未分類。`);
            } catch (error) {
                showAlert('刪除資料夾失敗：' + error.message);
            }
        });
    };
    


    useEffect(() => {
        if (!loading && pendingShareCode) {
            const codeToImport = pendingShareCode;
            setPendingShareCode(null);
            window.history.replaceState({}, document.title, window.location.pathname);
            
            executeImport(codeToImport);
        }
    }, [loading, pendingShareCode, records]);

  // ✨ 系統重寫 2：匯入代碼 (建立追蹤指標，不複製龐大內容)
    // ✨ 系統重寫 2：匯入代碼 (建立輕量追蹤指標，直接綁定雲端大廳，永遠保持毫秒級最新)
    const executeImport = async (code) => {
        const cleanCode = code?.trim().toUpperCase();
        if (!cleanCode) return;
        const codeRegex = /^[A-Z0-9]{6}$/;
        if (!codeRegex.test(cleanCode)) return showAlert("⚠️ 代碼格式錯誤！請輸入 6 碼英數字。", "輸入錯誤");

        window.showToast("正在匯入試題...", "loading"); // ✨ 新增：開始匯入時顯示右下角轉圈圈

        try {
            const isDuplicateCode = records.some(r => r.shortCode === cleanCode);
            if (isDuplicateCode) {
                window.showToast("匯入失敗：重複加入", "error"); // ✨ 新增錯誤提示
                return showAlert(`⚠️ 你已經擁有此試卷！`, "重複加入");
            }

            // 強制從伺服器抓取 (source: 'server')，避免因為快取機制誤判為離線
            const codeDoc = await window.db.collection('shareCodes').doc(cleanCode).get({ source: 'server' });
            if (!codeDoc.exists) {
                window.showToast("匯入失敗：查無資料", "error"); // ✨ 新增錯誤提示
                return showAlert("❌ 找不到該代碼，請確認代碼是否輸入正確，或代碼已失效。", "查無資料");
            }

            const sharedData = codeDoc.data();
            const actualData = sharedData.quizData ? { ...sharedData, ...sharedData.quizData } : sharedData;
            const safeOriginalQuizId = actualData.originalQuizId || actualData.quizId || 'MISSING_ID'; 
            const safeOwnerId = actualData.ownerId || 'MISSING_OWNER';

            if (safeOwnerId === user.uid) {
                window.showToast("匯入失敗：自己的試卷", "error"); // ✨ 新增錯誤提示
                return showAlert("⚠️ 這是你自己的試卷！", "重複擁有");
            }

            const duplicateCheck = await window.db.collection('users').doc(user.uid).collection('quizzes')
                .where('shortCode', '==', cleanCode).limit(1).get();
            if (!duplicateCheck.empty) {
                window.showToast("匯入失敗：重複加入", "error"); // ✨ 新增錯誤提示
                return showAlert(`⚠️ 你已經擁有此試卷！`, "重複加入");
            }

            const numQ = Number(actualData.numQuestions || 50);
            
            await window.db.collection('users').doc(user.uid).collection('quizzes').add({
                testName: cleanQuizName(actualData.testName || '未命名試卷') + ' (來自代碼)',
                numQuestions: numQ,
                userAnswers: Array(numQ).fill(''),
                starred: Array(numQ).fill(false),
                isShared: true, 
                creatorUid: safeOwnerId, 
                creatorQuizId: safeOriginalQuizId,
                folder: '未分類', 
                shortCode: cleanCode, 
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                // 🚀 核心：不儲存任何題目內文！進入試卷時直接拿 shortCode 鑰匙去大廳抓！
            });

            window.showToast("試卷匯入成功！", "success"); // ✨ 新增：成功時變成綠色打勾
            showAlert(`✅ 成功加入試卷！\n試卷已自動放入「未分類」資料夾。`, "匯入成功");
        } catch (e) {
            console.error("匯入錯誤詳細資訊:", e);
            window.showToast("匯入失敗", "error"); // ✨ 新增錯誤提示
            showAlert('❌ 發生非預期錯誤：' + e.message, "系統錯誤");
        }
    };

    const handleImportCode = () => {
        showPrompt("請輸入 6 碼測驗代碼：", "", executeImport);
    };

   // ✨ 系統重寫 1：生成代碼 (將完整內容打包至雲端公開大廳，確保好友端更新同步)
    const handleGenerateCode = async (quiz) => {
        if (quiz.shortCode) {
            navigator.clipboard.writeText(quiz.shortCode);
            showAlert(`✅ 已複製代碼：${quiz.shortCode}`);
            return;
        }
        setIsGeneratingCode(true);
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
            // 1. 抓取完整內容 (處理分離儲存的情況)
            let qText = quiz.questionText || '', qHtml = quiz.questionHtml || '', eHtml = quiz.explanationHtml || '';
            if (quiz.hasSeparatedContent) {
                const cDoc = await window.db.collection('users').doc(user.uid).collection('quizContents').doc(quiz.id).get();
                if (cDoc.exists) {
                    const d = cDoc.data();
                    qText = window.safeDecompress(d.questionText);
                    qHtml = window.safeDecompress(d.questionHtml);
                    eHtml = window.safeDecompress(d.explanationHtml);
                }
            }
            // 2. 打包至「雲端公開大廳」，這就是好友讀取的地方
            const pack = {
                ownerId: user.uid, testName: quiz.testName, numQuestions: quiz.numQuestions,
                correctAnswersInput: quiz.correctAnswersInput || '', 
                questionText: window.jzCompress(qText), questionHtml: window.jzCompress(qHtml), explanationHtml: window.jzCompress(eHtml),
                hasTimer: quiz.hasTimer || false, timeLimit: quiz.timeLimit || null,
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            };
            await window.db.collection('shareCodes').doc(newCode).set(pack);
            await window.db.collection('users').doc(user.uid).collection('quizzes').doc(quiz.id).update({ shortCode: newCode });
            setShowShareModal(prev => ({...prev, shortCode: newCode}));
            navigator.clipboard.writeText(newCode);
            showAlert(`✅ 代碼生成成功：${newCode}`);
        } catch(e) { showAlert('生成失敗：' + e.message); }
        setIsGeneratingCode(false);
    };

    // ✨ 系統重寫 3：好友私訊分享 (超級瘦身防爆版)
    // ✨ 系統重寫 3：好友私訊分享 (傳送萬能鑰匙 shortCode)
    const shareToFriend = async (friend) => {
        const cleanTestName = cleanQuizName(showShareModal.testName);
        const chatId = [user.uid, friend.uid].sort().join('_');
        
        let finalCode = showShareModal.shortCode;
        if (!finalCode) {
            finalCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            try {
                let qText = showShareModal.questionText || '';
                let qHtml = showShareModal.questionHtml || '';
                let eHtml = showShareModal.explanationHtml || '';

                if (showShareModal.hasSeparatedContent) {
                    const contentDoc = await window.db.collection('users').doc(user.uid).collection('quizContents').doc(showShareModal.id).get();
                    if (contentDoc.exists) {
                        const cData = contentDoc.data();
                        qText = window.safeDecompress(cData.questionText, 'string');
                        qHtml = window.safeDecompress(cData.questionHtml, 'string');
                        eHtml = window.safeDecompress(cData.explanationHtml, 'string');
                    }
                }

                const publicQuizPackage = {
                    ownerId: user.uid, originalQuizId: showShareModal.id, testName: showShareModal.testName || '未命名試卷',
                    numQuestions: showShareModal.numQuestions || 50, maxScore: showShareModal.maxScore || 100, roundScore: showShareModal.roundScore !== false,
                    correctAnswersInput: showShareModal.correctAnswersInput || '', questionFileUrl: showShareModal.questionFileUrl || '',
                    hasTimer: showShareModal.hasTimer || false, timeLimit: showShareModal.timeLimit || null, publishAnswers: showShareModal.publishAnswers !== false,
                    questionText: window.jzCompress ? window.jzCompress(qText) : qText,
                    questionHtml: window.jzCompress ? window.jzCompress(qHtml) : qHtml,
                    explanationHtml: window.jzCompress ? window.jzCompress(eHtml) : eHtml,
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                };
                await window.db.collection('shareCodes').doc(finalCode).set(publicQuizPackage);
                await window.db.collection('users').doc(user.uid).collection('quizzes').doc(showShareModal.id).update({ shortCode: finalCode });
                setShowShareModal(prev => ({...prev, shortCode: finalCode}));
            } catch(e) {
                return showAlert("準備分享檔案時發生錯誤：" + e.message);
            }
        }

        window.db.collection('chats').doc(chatId).collection('messages').add({
            senderId: user.uid, senderName: userProfile.displayName, timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
            type: 'quiz_share', read: false,
            quizData: {
                ownerId: user.uid, quizId: showShareModal.id, testName: cleanTestName, numQuestions: showShareModal.numQuestions || 50,
                shortCode: finalCode // ✨ 附上萬能鑰匙
            }
        }).then(() => {
            window.db.collection('users').doc(friend.uid).set({ unreadChats: { [user.uid]: true } }, { merge: true });
            showAlert('✅ 已成功分享給 ' + friend.name + '！');
            setShowShareModal(null);
        }).catch(e => showAlert('分享失敗：' + e.message));
    };

    const handleEditQuiz = async (rec) => {
        setIsJumping(true);
        try {
            let finalRec = { ...rec };
            
            // ✨ 修復：如果試卷內容被分離了，必須從 quizContents 抓回來，否則從首頁進入編輯會是一片空白！
            // ✨ 修復：改為快取優先，避免卡死
            if (finalRec.hasSeparatedContent) {
                try {
                    let contentSnap = await window.db.collection('users').doc(user.uid).collection('quizContents').doc(rec.id).get({ source: 'cache' }).catch(() => null);
                    if (!contentSnap || !contentSnap.exists) {
                        contentSnap = await window.db.collection('users').doc(user.uid).collection('quizContents').doc(rec.id).get();
                    }
                    if (contentSnap && contentSnap.exists) {
                        const contentData = contentSnap.data();
                        finalRec.questionText = window.safeDecompress(contentData.questionText);
                        finalRec.questionHtml = window.safeDecompress(contentData.questionHtml);
                        finalRec.explanationHtml = window.safeDecompress(contentData.explanationHtml);
                    }
                } catch (err) {
                    console.warn("載入內容發生錯誤:", err);
                }
            }

            if (finalRec.hasNewSuggestion) {
                window.db.collection('users').doc(user.uid).collection('quizzes').doc(rec.id).update({ hasNewSuggestion: false });
                finalRec.hasNewSuggestion = false;
            }
            onContinueQuiz({ ...finalRec, forceStep: 'edit' });
        } catch (error) {
            console.error(error);
            showAlert('載入試卷失敗：' + error.message);
        } finally {
            setIsJumping(false);
        }
    };

    const toggleFilter = (key) => setFilters(prev => ({ ...prev, [key]: !prev[key] }));

    const displayedRecords = records.filter(rec => {
        // 資料夾過濾
        if (currentFolder === '我建立的試題') {
            if (rec.isShared || rec.isTask) return false;
        } else {
            if ((rec.folder || '未分類') !== currentFolder) return false;
        }
        
        // ✨ 新增搜尋過濾
        if (searchQuery && !cleanQuizName(rec.testName).toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        
       const isCompleted = !!rec.results;
        // ✨ 效能優化配套：因為前面跳過了解壓縮，這裡改用類型判斷，只要有壓縮字串就當作「進行中」
        let answeredCount = 0;
        if (Array.isArray(rec.userAnswers)) {
            answeredCount = rec.userAnswers.filter(a => a !== '').length;
        } else if (typeof rec.userAnswers === 'string' && rec.userAnswers.length > 10) {
            answeredCount = 1; 
        }
        const hasStarted = answeredCount > 0;

        // 狀態過濾
        if (isCompleted && filters.done) return true;
        if (!isCompleted && hasStarted && filters.doing) return true;
        if (!isCompleted && !hasStarted && filters.todo) return true;

        return false;
    });

 // ✨ 系統重寫 5：進入試卷 (完美零死鎖、秒開、即時同步原作者更新)
  // ✨ 系統重寫 5：進入試卷 (直接從大廳抓取 Live 資料，達成毫秒級同步)
    const handleEnterQuiz = async (rec) => {
        setIsJumping(true); 
        let finalRec = { ...rec };
        try {
            // 🚀 核心：如果是分享的題目，強制去雲端大廳抓「最新」的題目內容
            if (finalRec.isShared && finalRec.shortCode) {
                const sharedDoc = await window.db.collection('shareCodes').doc(finalRec.shortCode).get();
                if (sharedDoc.exists) {
                    const liveData = sharedDoc.data();
                    // ✨ 抓蟲修正 2：相容兩種分享結構，並正確提取壓縮的題目內容
                    const contentSource = liveData.contentData || liveData;
                    const quizDataSource = liveData.quizData || liveData;

                    finalRec = { 
                        ...finalRec, 
                        ...quizDataSource, // 毫秒同步：直接用雲端大廳的內容覆蓋本地
                        questionText: window.safeDecompress(contentSource.questionText),
                        questionHtml: window.safeDecompress(contentSource.questionHtml),
                        explanationHtml: window.safeDecompress(contentSource.explanationHtml),
                        hasSeparatedContent: false // 🚀 強制設為 false，避免 QuizApp 去空的本地資料庫找而卡死
                    };
                    // 如果原作者改了答案，本地也要自動重新算分
                    if (finalRec.results && quizDataSource.correctAnswersInput !== rec.correctAnswersInput) {
                        finalRec.hasAnswerUpdate = true;
                        window.db.collection('users').doc(user.uid).collection('quizzes').doc(rec.id).update({ correctAnswersInput: quizDataSource.correctAnswersInput });
                    }
                } else {
                    setIsJumping(false);
                    return showAlert("⚠️ 原作者已停止分享此試卷。");
                }
            } else if (finalRec.hasSeparatedContent) {
                // ✨ 抓蟲修復：第二次載入卡死的原因是 .get() 等待網路回應。我們改為「快取優先」！
                try {
                    let cSnap = await window.db.collection('users').doc(user.uid).collection('quizContents').doc(rec.id).get({ source: 'cache' }).catch(() => null);
                    if (!cSnap || !cSnap.exists) {
                        cSnap = await window.db.collection('users').doc(user.uid).collection('quizContents').doc(rec.id).get();
                    }
                    if (cSnap && cSnap.exists) {
                        const d = cSnap.data();
                        finalRec.questionText = window.safeDecompress(d.questionText);
                        finalRec.questionHtml = window.safeDecompress(d.questionHtml);
                        finalRec.explanationHtml = window.safeDecompress(d.explanationHtml);
                    }
                } catch (err) {
                    console.warn("載入內容發生錯誤:", err);
                }
            }

            if (finalRec.hasAnswerUpdate) {
                window.db.collection('users').doc(user.uid).collection('quizzes').doc(finalRec.id).update({ hasAnswerUpdate: window.firebase.firestore.FieldValue.delete() }).catch(e=>console.error(e));
                finalRec.hasAnswerUpdate = false;
            }

            if (finalRec.hasTimer && !finalRec.results) {
                const isNew = !finalRec.userAnswers || finalRec.userAnswers.filter(a => a !== '').length === 0;
                if (isNew) {
                    setIsJumping(false);
                    showConfirm(`⏱ 此測驗設有時間限制（${finalRec.timeLimit} 分鐘）。\n\n準備好了嗎？`, () => onContinueQuiz(finalRec));
                    return;
                }
            }
            
            setIsJumping(false); // ✨ 確保解開 UI 鎖定
            onContinueQuiz(finalRec);
        } catch(e) {
            setIsJumping(false);
            showAlert("⚠️ 載入失敗：" + e.message);
        }
    };

    return (
        <div className="max-w-[1600px] w-full mx-auto p-4 pt-0 h-full overflow-y-auto overflow-x-hidden custom-scrollbar w-full min-w-0">
            {/* ✨ 修正：加入 flex-wrap 與 w-full，避免標題與按鈕在小螢幕擠壓超出邊界 */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4 border-b-2 border-black dark:border-white pb-2 shrink-0 w-full min-w-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black dark:text-white shrink-0 flex items-center gap-2"><span className="material-symbols-outlined text-[28px]">library_books</span>我的題庫</h1>
                    <button 
                        onClick={() => setShowHelp(!showHelp)} 
                        className={`text-sm px-3 py-1 font-bold shadow-sm flex items-center gap-1 rounded-2xl transition-colors ${showHelp ? 'bg-amber-600 text-white border-amber-700' : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">help</span> {showHelp ? '關閉教學' : '系統教學'}
                    </button>
                    <div className="relative hidden md:block">
                       <button 
                            onClick={() => { 
                                setIsRefreshing(true); 
                                // ✨ 終極完成：資料已經輕量化，我們大膽加回 { source: 'server' } 實現跨裝置秒更新！
                                window.db.collection('users').doc(user.uid).collection('quizzes')
                                    .orderBy('createdAt', 'desc')
                                    .limit(visibleLimit)
                                    .get()
                                    .then(() => setRefreshTrigger(prev => prev + 1))
                                    .catch(e => console.error(e))
                                    .finally(() => setIsRefreshing(false));
                            }}
                            disabled={isRefreshing}
                            className="text-sm bg-[#FCFBF7] hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-3 py-1 font-bold transition-colors shadow-sm flex items-center gap-1 rounded-2xl disabled:opacity-50"
                            title="手動同步雲端最新資料"
                        >
                            {isRefreshing ? <div className="w-4 h-4 border-2 border-gray-400 border-t-black dark:border-t-white rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-[18px]">refresh</span>} 重新整理
                        </button>
                        <HelpTooltip show={showHelp} text="若在手機或其他裝置有更新進度，點這裡手動抓取最新資料！" position="bottom" className="left-0 transform-none" />
                    </div>
                </div>
                <div className="relative">
                    <button 
                        onClick={() => onStartNew(currentFolder === '我建立的試題' ? '未分類' : currentFolder)} 
                        className={`px-6 py-2 rounded-2xl font-bold shadow-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${tutorialStep === 2 ? 'relative z-[160] bg-amber-500 text-white ring-4 ring-amber-300 animate-pulse' : 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 hover:bg-stone-800 dark:hover:bg-gray-300'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span> 新測驗
                    </button>
                    <HelpTooltip show={showHelp} text="點擊這裡開始「建立」你自己的專屬測驗題本！" position="bottom" className="right-0 transform-none left-auto" />
                </div>
            </div>

            {/* ✨ 修正：移除 overflow-hidden 避免教學框被切斷，並允許按鈕自然換行 */}
            <div className="flex flex-col md:flex-row gap-3 mb-2 shrink-0 w-full min-w-0">
                <div className="flex items-center gap-2 overflow-visible pb-1 flex-grow w-full min-w-0 relative flex-wrap">
                    {userFolders.map(f => (
                        <button key={f} onClick={() => setCurrentFolder(f)} className={`px-4 py-1.5 font-bold text-sm rounded-2xl whitespace-nowrap transition-colors shrink-0 flex items-center gap-1 ${currentFolder === f ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800' : 'bg-stone-50 dark:bg-stone-800 text-gray-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-700 border border-stone-200 dark:border-stone-700'}`}>
                            <span className="material-symbols-outlined text-[18px]">{f === '我建立的試題' ? 'star' : 'folder'}</span> {f}
                        </button>
                    ))}
                    <HelpTooltip show={showHelp} text="點擊上方頁籤，可以切換查看不同分類下的考卷喔" position="bottom" className="left-[100px]" />
                </div>
                <div className="flex items-center gap-2 overflow-visible pb-1 shrink-0 w-full md:w-auto min-w-0 flex-wrap">
                    <div className="relative">
                        <button onClick={handleCreateFolder} className="px-3 py-1.5 text-sm font-bold bg-[#FCFBF7] dark:bg-stone-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl whitespace-nowrap transition-colors shrink-0 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[18px]">create_new_folder</span> 新增資料夾
                        </button>
                        <HelpTooltip show={showHelp} text="建立新資料夾來歸納分類你的海量試題" position="bottom" />
                    </div>
                    <div className="relative">
                        <button onClick={handleImportCode} className="px-3 py-1.5 text-sm font-bold bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800 rounded-2xl whitespace-nowrap transition-colors shrink-0 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[18px]">move_to_inbox</span> 輸入代碼
                        </button>
                        <HelpTooltip show={showHelp} text="朋友有分享試題給你嗎？點這裡輸入 6 碼代碼直接下載！" position="bottom" className="right-0 transform-none left-auto" />
                    </div>
                    {!specialFolders.includes(currentFolder) && (
                        <button 
                            onClick={() => handleDeleteFolder(currentFolder)} 
                            className="px-3 py-1.5 text-sm font-bold bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800 rounded-2xl whitespace-nowrap transition-colors shrink-0 flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span> 刪除目前資料夾
                        </button>
                    )}
                </div>
            </div>

            {/* ✨ 新增：過濾器與搜尋列整合排版 */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 shrink-0 w-full">
                <div className="flex items-center space-x-4 bg-gray-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3 py-2 rounded-2xl shrink-0 w-full md:w-auto overflow-x-auto custom-scrollbar">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 border-r border-gray-300 dark:border-gray-600 pr-3 shrink-0">狀態篩選</span>
                    <label className="flex items-center space-x-1.5 text-sm cursor-pointer hover:text-stone-800 dark:hover:text-white dark:text-gray-300 shrink-0">
                        <input type="checkbox" checked={filters.todo} onChange={() => toggleFilter('todo')} className="w-4 h-4 accent-black dark:accent-white" />
                        <span className="font-bold">未作測驗</span>
                    </label>
                    <label className="flex items-center space-x-1.5 text-sm cursor-pointer hover:text-stone-800 dark:hover:text-white shrink-0">
                        <input type="checkbox" checked={filters.doing} onChange={() => toggleFilter('doing')} className="w-4 h-4 accent-black dark:accent-white" />
                        <span className="font-bold text-amber-600 dark:text-amber-400">進行中</span>
                    </label>
                    <label className="flex items-center space-x-1.5 text-sm cursor-pointer hover:text-stone-800 dark:hover:text-white shrink-0">
                        <input type="checkbox" checked={filters.done} onChange={() => toggleFilter('done')} className="w-4 h-4 accent-black dark:accent-white" />
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">已完成</span>
                    </label>
                </div>

                <div className="flex-grow flex items-center bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3 py-2 shadow-sm rounded-2xl w-full md:w-auto">
                    <span className="text-gray-500 mr-2 flex items-center"><span className="material-symbols-outlined text-[20px]">search</span></span>
                    <input
                        type="text"
                        placeholder="在此資料夾中搜尋試題..."
                        className="flex-grow outline-none bg-transparent text-stone-800 dark:text-white text-sm font-bold min-w-0"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-stone-800 dark:hover:text-white ml-2 font-bold px-1">✖</button>
                    )}
                </div>
            </div>

           {loading && records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 w-full">
                    <div className="w-16 h-16 border-4 border-stone-200 dark:border-stone-700 border-t-black dark:border-white rounded-full animate-spin mb-4"></div>
                    <div className="text-gray-500 dark:text-gray-400 font-bold animate-pulse text-lg">正在同步雲端題庫，這可能需要幾秒鐘...</div>
                    <div className="text-gray-400 dark:text-gray-500 text-sm mt-2">若是初次載入，時間會稍長，感謝您的耐心等候。</div>
                </div>
            ) : displayedRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#FCFBF7] dark:bg-stone-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-center shadow-sm">
                    <div className="mb-4 text-gray-300 dark:text-stone-600"><span className="material-symbols-outlined" style={{fontSize: '64px'}}>mark_email_unread</span></div>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">
                        {searchQuery ? '找不到符合關鍵字的試卷' : (currentFolder === '我建立的試題' ? '歡迎來到你的專屬題庫！' : '這個資料夾目前空空的喔！')}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 font-bold mb-6 max-w-md leading-relaxed whitespace-pre-wrap">
                        {searchQuery 
                            ? '換個關鍵字再搜尋看看吧！' 
                            : '你還沒有在這裡建立任何測驗。\n馬上點擊下方按鈕，建立你的第一份專屬試卷，或是輸入代碼下載好友分享的題目吧！'}
                    </p>
                    {!searchQuery && (
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
                            <button 
                                onClick={() => onStartNew(currentFolder === '我建立的試題' ? '未分類' : currentFolder)} 
                                className={`px-8 py-3 font-black shadow-xl hover:-tranamber-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all border-2 active:shadow-none active:tranamber-x-1 active:tranamber-y-1 rounded-2xl ${tutorialStep === 2 ? 'relative z-[160] bg-amber-500 text-white border-transparent ring-4 ring-amber-300 animate-pulse' : 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 border-black dark:border-transparent'}`}
                            >
                                ＋ 建立新測驗
                            </button>
                            <button 
                                onClick={handleImportCode} 
                                className="bg-amber-50 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-8 py-3 font-black shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)] hover:-tranamber-y-1 hover:shadow-[6px_6px_0px_0px_rgba(59,130,246,0.3)] transition-all border-2 border-amber-200 dark:border-amber-700 active:shadow-none active:tranamber-x-1 active:tranamber-y-1 rounded-2xl"
                            >
                                📥 輸入測驗代碼
                            </button>
                        </div>
                    )}
                </div>
           ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 pb-10 w-full min-w-0">
                    {displayedRecords.map(rec => (
                        <div key={rec.id} className="bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-5 rounded-2xl shadow-sm hover:shadow-xl hover:-tranamber-y-1 transition-all flex flex-col w-full min-w-0 relative group">
                            
                            {/* 上半部：標題與狀態資訊 */}
                            <div className="flex flex-col gap-2 min-w-0 w-full">
                                <div className="font-bold text-sm sm:text-base dark:text-white leading-relaxed min-w-0 w-full relative inline-block">
                                    {renderTestName(rec.testName, !!rec.results, rec.taskType)}
                                    {/* ✨ 新增：偵測到答案更新且重新算分時，顯示閃爍提醒 */}
                                    {rec.hasAnswerUpdate && (
                                        <span className="absolute -top-3 -right-2 sm:-right-4 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse shadow-md border border-white dark:border-gray-800 z-10 pointer-events-none">
                                            🚨 答案已更正
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                    {rec.isTask && <span className="text-[10px] bg-amber-700100 dark:bg-amber-700900 text-amber-700800 dark:text-amber-700200 px-1.5 py-0.5 whitespace-nowrap shrink-0">任務</span>}
                                    {rec.isShared && !rec.isTask && <span className="text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 whitespace-nowrap shrink-0">分享</span>}
                                    {rec.hasTimer && <span className="text-[10px] bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 border border-red-200 dark:border-red-700 px-1.5 py-0.5 font-bold whitespace-nowrap shrink-0">⏱ {rec.timeLimit}m</span>}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                                    <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">{rec.numQuestions}題</span>
                                    {rec.results ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap shrink-0 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span> {rec.results.score} 分</span>
                                    ) : (Array.isArray(rec.userAnswers) ? rec.userAnswers.filter(a=>a).length > 0 : typeof rec.userAnswers === 'string' && rec.userAnswers.length > 10) ? (
                                        <span className="text-amber-500 dark:text-amber-400 font-bold flex items-center gap-1 flex-wrap">
                                            <span className="material-symbols-outlined text-[16px]">edit_note</span> 進行中
                                            {rec.hasTimer && rec.timeRemaining !== undefined && (
                                                <span className="text-red-500 inline-block whitespace-nowrap shrink-0">(剩 {Math.max(1, Math.ceil(rec.timeRemaining / 60))}m)</span>
                                            )}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 font-bold whitespace-nowrap shrink-0 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">hourglass_empty</span> 未作答</span>
                                    )}
                                </div>
                            </div>

                            {/* 下半部：操作按鈕 (手機版分開兩排：上排四個小按鈕 Grid 均分，下排一個滿版進入大按鈕) */}
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-stone-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full min-w-0">
                                
                                {/* 輔助按鈕群組：手機版使用 CSS Grid 強制四等分，絕不超出邊界 */}
                                <div className="grid grid-cols-4 sm:flex sm:flex-wrap items-center gap-1 sm:gap-3 w-full sm:w-auto text-center shrink-0">
                                    <button onClick={() => handleDelete(rec.id)} className="text-xs text-gray-500 hover:text-red-600 transition-colors py-1.5 sm:py-0 whitespace-nowrap overflow-hidden text-ellipsis flex items-center justify-center gap-0.5"><span className="material-symbols-outlined text-[14px]">delete</span>刪除</button>
                                    <button onClick={() => setShowMoveModal(rec)} className="text-xs text-emerald-600 dark:text-emerald-400 font-bold transition-colors py-1.5 sm:py-0 whitespace-nowrap overflow-hidden text-ellipsis flex items-center justify-center gap-0.5"><span className="material-symbols-outlined text-[14px]">snippet_folder</span>移動</button>
                                   {!(rec.isTask || /\[#(op|m?nm?st)\]/i.test(rec.testName || '')) ? (
                                        <button onClick={() => setShowShareModal(rec)} className="text-xs text-amber-500 dark:text-amber-400 font-bold transition-colors py-1.5 sm:py-0 whitespace-nowrap overflow-hidden text-ellipsis flex items-center justify-center gap-0.5"><span className="material-symbols-outlined text-[14px]">share</span>分享</button>
                                    ) : <div />}
                                    {/* ✨ 放寬權限：如果是出題者本人，就算發布成任務也允許編輯 (修復 currentUser 導致的當機) */}
                                    {!rec.isShared && (!rec.isTask || !rec.creatorUid || rec.creatorUid === user.uid) ? (
                                        <button onClick={() => handleEditQuiz(rec)} className="text-xs text-amber-700600 dark:text-amber-700400 font-bold transition-colors py-1.5 sm:py-0 whitespace-nowrap overflow-hidden text-ellipsis relative flex items-center justify-center gap-0.5">
                                            <span className="material-symbols-outlined text-[14px]">edit_document</span>編輯
                                            {rec.hasNewSuggestion && <span className="absolute top-1 right-0 sm:-top-1 sm:-right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                                        </button>
                                    ) : <div />}
                                </div>
                                
                                {/* 進入/查看按鈕 */}
                                <button onClick={() => handleEnterQuiz(rec)} className="bg-stone-50 dark:bg-gray-700 px-4 py-2.5 sm:py-1.5 rounded-2xl font-bold border border-stone-200 dark:border-gray-600 hover:bg-stone-100 dark:text-white text-sm transition-colors w-full sm:w-auto text-center shrink-0 flex items-center justify-center gap-1">
                                    {rec.results ? <><span className="material-symbols-outlined text-sm">bar_chart</span> 查看</> : <><span className="material-symbols-outlined text-sm">login</span> 進入</>}
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            )}
            
            {/* 🚀 終極提速：題庫的載入更多按鈕 */}
            {!loading && hasMore && displayedRecords.length > 0 && (
                <div className="flex justify-center mt-6 mb-8">
                    <button 
                        onClick={() => setVisibleLimit(prev => prev + 15)} 
                        className="bg-[#FCFBF7] dark:bg-stone-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-8 py-3 font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        ⬇️ 載入更多歷史考卷...
                    </button>
                </div>
            )}

            {showShareModal && (
                <div className="fixed inset-0 bg-stone-800 bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 w-full max-w-sm rounded-2xl shadow-xl">
                        <h3 className="font-bold text-lg mb-4 flex justify-between items-center dark:text-white">
                            <span>📤 分享試卷</span>
                            <button onClick={() => setShowShareModal(null)} className="text-gray-400 hover:text-stone-800 dark:hover:text-white">✖</button>
                        </h3>

                        <div className="mb-6 p-4 bg-gray-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                            <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">公開測驗代碼</p>
                            {showShareModal.shortCode ? (
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between bg-[#FCFBF7] dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2">
                                        <span className="text-2xl font-mono font-black tracking-widest text-amber-600 dark:text-amber-400">{showShareModal.shortCode}</span>
                                        <button onClick={() => {
                                            navigator.clipboard.writeText(showShareModal.shortCode);
                                            showAlert(`✅ 已複製代碼：${showShareModal.shortCode}`);
                                        }} className="text-xs bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-3 py-1.5 rounded-2xl font-bold hover:bg-stone-800">複製代碼</button>
                                    </div>
                                    <button onClick={() => {
                                        const link = `${window.location.origin}/?shareCode=${showShareModal.shortCode}`;
                                        const text = `🔥 快來挑戰我的試卷！\n📝 試卷名稱：${showShareModal.testName.replace(/\[#(op|m?nm?st)\]/gi, '').trim()}\n\n👇 點擊下方連結，立即將試卷自動加入你的題庫：\n${link}`;
                                        navigator.clipboard.writeText(text);
                                        showAlert(`✅ 已複製邀請連結與文案！快去貼給朋友吧！`);
                                    }} className="text-sm bg-amber-50 dark:bg-amber-900 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-700 px-4 py-2 rounded-2xl font-bold hover:bg-amber-100 dark:hover:bg-amber-800 transition-colors">
                                        🔗 複製邀請連結與文案
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => handleGenerateCode(showShareModal)} disabled={isGeneratingCode} className="text-sm bg-amber-50 dark:bg-amber-900 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-700 px-4 py-2 rounded-2xl font-bold hover:bg-amber-100 dark:hover:bg-amber-800 w-full transition-colors">
                                    {isGeneratingCode ? '生成中...' : '🔑 生成 6 碼分享代碼'}
                                </button>
                            )}
                        </div>

                        <h4 className="font-bold text-sm mb-2 text-gray-600 dark:text-gray-400">傳送給好友</h4>
                        <div className="max-h-40 overflow-y-auto mb-4 border border-stone-200 dark:border-stone-700 custom-scrollbar bg-[#FCFBF7] dark:bg-gray-700">
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
                <div className="fixed inset-0 bg-stone-800 bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 w-full max-w-sm rounded-2xl shadow-xl">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">選擇目標資料夾</h3>
                        <div className="max-h-60 overflow-y-auto mb-4 border border-stone-200 dark:border-stone-700 custom-scrollbar">
                            {userFolders.filter(f => f !== '我建立的試題').map(f => (
                                <button key={f} onClick={() => moveQuizToFolder(showMoveModal, f)} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 font-bold text-sm transition-colors dark:text-white">
                                    📁 {f}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowMoveModal(null)} className="w-full bg-stone-50 dark:bg-gray-700 text-stone-800 dark:text-white p-2 font-bold rounded-2xl hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors">取消</button>
                    </div>
                </div>
            )}

            {/* ✨ 新增：跳轉試卷時的光速載入 Modal */}
            {isJumping && (
                <div className="fixed inset-0 bg-stone-800 bg-opacity-80 flex items-center justify-center z-[200] p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 w-full max-w-sm rounded-2xl shadow-2xl text-center border-t-8 border-indigo-500 animate-fade-in">
                        <div className="w-16 h-16 border-4 border-stone-200 dark:border-stone-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black mb-2 dark:text-white">正在進入試卷...</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">正在為您準備作答環境，請稍候</p>
                    </div>
                </div>
            )}

            {/* ✨ 新增：獨立的新增資料夾 Modal */}
            {showAddFolderModal && (
                <div className="fixed inset-0 bg-stone-800 bg-opacity-60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 w-full max-w-sm rounded-2xl shadow-xl">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">📁 新增資料夾</h3>
                        <input 
                            type="text" 
                            autoFocus
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl mb-6 outline-none focus:border-black dark:focus:border-white font-bold"
                            placeholder="請輸入新資料夾名稱..."
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                // ✨ 防呆設計：過濾中文輸入法 (IME) 選字時敲擊的 Enter
                                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                    submitCreateFolder();
                                }
                            }}
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowAddFolderModal(false)} className="px-5 py-2 bg-stone-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200 font-bold rounded-2xl hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors text-sm">取消</button>
                            <button onClick={submitCreateFolder} className="px-5 py-2 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 font-bold rounded-2xl hover:bg-stone-800 dark:hover:bg-gray-300 transition-colors text-sm shadow-sm">建立</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

window.Dashboard = Dashboard;