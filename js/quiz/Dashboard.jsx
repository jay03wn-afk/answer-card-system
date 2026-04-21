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
    
    // 🚀 題庫分頁與重新整理狀態
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState('1'); // 新增：支援手動輸入分頁
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // 確保點擊上下頁時，輸入框的數字也能跟著同步
    useEffect(() => { setPageInput(currentPage.toString()); }, [currentPage]);

    const [showShareModal, setShowShareModal] = useState(null);
    const [showMoveModal, setShowMoveModal] = useState(null);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);

    // 新增：批次選取模式狀態
    const [batchMode, setBatchMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    
 // 新增：獨立的新增資料夾 Modal 狀態
    const [showAddFolderModal, setShowAddFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [parentFolder, setParentFolder] = useState('');

    // 新增搜尋狀態
    const [searchQuery, setSearchQuery] = useState('');

    // 新增：控制資料夾目錄展開與樹狀結構
    const [isFolderTreeOpen, setIsFolderTreeOpen] = useState(true);
    const [expandedFolders, setExpandedFolders] = useState({});
    const [pendingShareCode, setPendingShareCode] = useState(() => new URLSearchParams(window.location.search).get('shareCode'));

    // ✨ 新增：將 [公開試題管理] 設為固定分頁，方便你隨時點選
    const specialFolders = ['全部', '我建立的試題', '來自匯入', '[公開試題管理]', '未分類', '任務牆'];
    const dynamicFolders = records.map(r => r.folder).filter(f => f && !specialFolders.includes(f));
    const rawUserFolders = [...(userProfile.folders || []), ...dynamicFolders].filter(f => !specialFolders.includes(f));
    const userFolders = [...specialFolders, ...Array.from(new Set(rawUserFolders))];
    
    const [currentFolder, setCurrentFolder] = useState('全部');
    const itemsPerPage = 10;
    const [filters, setFilters] = useState({ todo: true, doing: true, done: true });

    // 新增：樹狀結構轉換邏輯
    const folderTree = React.useMemo(() => {
        const tree = {};
        userFolders.forEach(f => {
            if (specialFolders.includes(f)) return; // 特殊資料夾不放進樹狀結構
            const parts = f.split('/');
            let curr = tree;
            let currentPath = '';
            parts.forEach((p, i) => {
                currentPath = currentPath ? currentPath + '/' + p : p;
                if (!curr[p]) curr[p] = { name: p, path: currentPath, children: {} };
                curr = curr[p].children;
            });
        });
        return tree;
    }, [userFolders]);

    // 新增：遞迴渲染樹狀結構元件
    const renderTree = (nodes, level = 0) => {
        return Object.values(nodes).sort((a, b) => a.name.localeCompare(b.name)).map(node => {
            const hasChildren = Object.keys(node.children).length > 0;
            const isExpanded = expandedFolders[node.path];
            const isSelected = currentFolder === node.path;

            return (
                <div key={node.path} className="flex flex-col w-full">
                    <div 
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 shadow-md font-bold' : 'hover:bg-stone-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium'}`}
                        style={{ marginLeft: `${level * 1.2}rem` }}
                        onClick={() => setCurrentFolder(node.path)}
                    >
                        {hasChildren ? (
                            <span 
                                className="material-symbols-outlined text-[20px] cursor-pointer text-gray-400 hover:text-amber-500"
                                onClick={(e) => { e.stopPropagation(); setExpandedFolders(p => ({...p, [node.path]: !p[node.path]})); }}
                            >
                                {isExpanded ? 'arrow_drop_down' : 'arrow_right'}
                            </span>
                        ) : (
                            <span className="w-[20px]"></span> 
                        )}
                        <span className="material-symbols-outlined text-[16px] text-amber-500">{hasChildren && isExpanded ? 'folder_open' : 'folder'}</span>
                        <span className="text-sm truncate">{node.name}</span>
                    </div>
                    {hasChildren && isExpanded && (
                        <div className="flex flex-col w-full mt-0.5 gap-0.5 border-l-2 border-stone-200 dark:border-stone-700 ml-4 pl-1">
                            {renderTree(node.children, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    // 新增：移動試卷視窗專用的樹狀渲染 (包含展開/收合與點擊移動)
    const renderFolderSelectTree = (nodes, level = 0) => {
        return Object.values(nodes).sort((a, b) => a.name.localeCompare(b.name)).map(node => {
            const hasChildren = Object.keys(node.children).length > 0;
            const isExpanded = expandedFolders[`move_${node.path}`] !== false; // 預設全部展開

            return (
                <div key={node.path} className="flex flex-col w-full">
                    <div className="flex items-center gap-1 w-full" style={{ marginLeft: `${level * 1.2}rem` }}>
                        {hasChildren ? (
                            <span 
                                className="material-symbols-outlined text-[20px] cursor-pointer text-gray-400 hover:text-indigo-500"
                                onClick={(e) => { e.stopPropagation(); setExpandedFolders(p => ({...p, [`move_${node.path}`]: !isExpanded})); }}
                            >
                                {isExpanded ? 'arrow_drop_down' : 'arrow_right'}
                            </span>
                        ) : (
                            <span className="w-[20px]"></span>
                        )}
                        <button 
                            onClick={() => moveQuizToFolder(showMoveModal, node.path)}
                            className="flex-1 text-left px-3 py-2 rounded-xl font-bold text-sm text-stone-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all flex items-center gap-2 group active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-gray-400 group-hover:text-indigo-500 transition-colors text-[18px]">
                                {hasChildren && isExpanded ? 'folder_open' : 'folder'}
                            </span>
                            {node.name}
                        </button>
                    </div>
                    {hasChildren && isExpanded && (
                        <div className="flex flex-col w-full mt-0.5 gap-0.5 border-l-2 border-stone-200 dark:border-stone-700 ml-4 pl-1">
                            {renderFolderSelectTree(node.children, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    

    useEffect(() => {
        let isMounted = true;

        // 🚀 全域搜尋支援：取消 limit，一次載入所有清單元資料以供搜尋與分頁
        const unsubscribe = window.db.collection('users').doc(user.uid).collection('quizzes')
            .orderBy('createdAt', 'desc')
            .onSnapshot({ includeMetadataChanges: true }, snapshot => {
                if (isMounted) {
                    if (snapshot.empty && snapshot.metadata.fromCache) return;
                }

                if (isMounted) {
                    if (snapshot.metadata.hasPendingWrites && records.length === 0) {
                        // 繼續等待雲端回應
                    } else {
                        setLoading(false);
                    }
                    
                    setTimeout(() => {
                        const newRecords = snapshot.docs.map(doc => {
                            const data = doc.data();
                            if (typeof data.results === 'string') data.results = safeDecompress(data.results, 'object');
                            if (typeof data.userAnswers === 'string') data.userAnswers = safeDecompress(data.userAnswers, 'array');
                            return { id: doc.id, ...data };
                        });
                        
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
    }, [user, refreshTrigger]);

    const handleDelete = (targetQuizzes) => {
        const items = Array.isArray(targetQuizzes) ? targetQuizzes : [targetQuizzes];
        if (items.length === 0) return;

        showConfirm(`確定要刪除 ${items.length} 筆測驗嗎？資料將無法恢復！`, async () => {
            try {
                const batch = window.db.batch();
                items.forEach(rec => {
                    const ref = window.db.collection('users').doc(user.uid).collection('quizzes').doc(rec.id);
                    batch.delete(ref);
                });
                await batch.commit();

                items.forEach(rec => {
                    if (!rec.isShared && !rec.isTask) {
                        window.db.collection('publicTasks').doc(rec.id).delete().catch(e => console.log("任務牆無此檔案", e));
                    }
                });

                setSelectedItems([]);
                if (batchMode) setBatchMode(false);
                showAlert(`[成功] 已刪除 ${items.length} 筆測驗`);
            } catch (error) {
                showAlert('[錯誤] 刪除失敗：' + error.message);
            }
        });
    };

    const handleCreateFolder = () => {
        setParentFolder(currentFolder && !specialFolders.includes(currentFolder) ? currentFolder : '');
        setNewFolderName('');
        setShowAddFolderModal(true);
    };

    const submitCreateFolder = () => {
        const cleanName = newFolderName.trim().replace(/\//g, ''); // 防呆：移除手動打的斜線
        if (!cleanName) return showAlert('[錯誤] 名稱不可為空白');
        const finalPath = parentFolder ? `${parentFolder}/${cleanName}` : cleanName;

        if (!userFolders.includes(finalPath)) {
            window.db.collection('users').doc(user.uid).set({
                folders: window.firebase.firestore.FieldValue.arrayUnion(finalPath)
            }, { merge: true }).then(() => {
                setCurrentFolder(finalPath);
                showAlert(`[成功] 已建立資料夾「${finalPath}」`);
                setShowAddFolderModal(false);
            }).catch(e => showAlert('建立失敗：' + e.message));
        } else {
            showAlert('[錯誤] 資料夾名稱已存在');
        }
    };

    const moveQuizToFolder = async (targetQuizzes, targetFolder) => {
        if (targetFolder === '我建立的試題') return showAlert('[警告] 此為自動分類，無法手動移入喔！');
        const items = Array.isArray(targetQuizzes) ? targetQuizzes : [targetQuizzes];
        if (items.length === 0) return;

        try {
            const batch = window.db.batch();
            items.forEach(quiz => {
                const ref = window.db.collection('users').doc(user.uid).collection('quizzes').doc(quiz.id);
                batch.update(ref, { folder: targetFolder });
            });
            await batch.commit();

            showAlert(`[成功] 已成功將 ${items.length} 份試卷移動至 ${targetFolder}`);
            setShowMoveModal(null);
            setSelectedItems([]);
            if (batchMode) setBatchMode(false);
        } catch (e) {
            showAlert('[錯誤] 移動失敗：' + e.message);
        }
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
        if (currentFolder === '全部') {
            if (rec.isTask) return false;
        } else if (currentFolder === '我建立的試題') {
            if (rec.isShared || rec.isTask) return false;
        } else if (currentFolder === '來自匯入') {
            if (!rec.isShared) return false;
        } else {
            // ✨ 修改：支援前綴匹配，點選父資料夾能看到子資料夾內的試卷
            const itemFolder = rec.folder || '未分類';
            if (itemFolder !== currentFolder && !itemFolder.startsWith(currentFolder + '/')) return false;
        }
        
        // ✨ 新增搜尋過濾 (全域)
        if (searchQuery && !cleanQuizName(rec.testName).toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        
       const isCompleted = !!rec.results;
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

    // 進行分頁切割
    const totalPages = Math.ceil(displayedRecords.length / itemsPerPage) || 1;
    const paginatedRecords = displayedRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // ✨ 獨立出分頁 UI，讓上下方都可以共用
    const renderPagination = () => {
        if (loading || displayedRecords.length === 0) return null;
        return (
            <div className="flex justify-center items-center gap-2 sm:gap-4 bg-[#FCFBF7] dark:bg-stone-800 p-2 sm:p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm w-fit mx-auto">
                <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 sm:px-4 py-2 font-bold rounded-xl bg-white dark:bg-stone-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-stone-800 dark:text-white"
                >
                    上一頁
                </button>
                
                <div className="font-bold text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1.5 sm:gap-2">
                    第 
                    <div className="relative">
                        <input 
                            type="number" 
                            min="1" 
                            max={totalPages}
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            onBlur={(e) => {
                                let val = parseInt(e.target.value, 10);
                                if (isNaN(val) || val < 1) val = 1;
                                if (val > totalPages) val = totalPages;
                                setCurrentPage(val);
                                setPageInput(val.toString());
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') e.target.blur();
                            }}
                            className="w-12 sm:w-16 text-center py-1 px-0.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 text-base sm:text-lg outline-none focus:border-amber-400 transition-colors hide-spin-button"
                            style={{ MozAppearance: 'textfield' }} 
                        />
                        <style>{`.hide-spin-button::-webkit-inner-spin-button, .hide-spin-button::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }`}</style>
                    </div>
                    / {totalPages} 頁
                </div>

                <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 sm:px-4 py-2 font-bold rounded-xl bg-white dark:bg-stone-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-stone-800 dark:text-white"
                >
                    下一頁
                </button>
            </div>
        );
    };

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
                        onClick={() => onStartNew(currentFolder === '全部' || currentFolder === '我建立的試題' || currentFolder === '來自匯入' ? '未分類' : currentFolder)} 
                        className={`px-6 py-2 rounded-2xl font-bold shadow-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${tutorialStep === 2 ? 'relative z-[160] bg-amber-500 text-white ring-4 ring-amber-300 animate-pulse' : 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 hover:bg-stone-800 dark:hover:bg-gray-300'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span> 新測驗
                    </button>
                    <HelpTooltip show={showHelp} text="點擊這裡開始「建立」你自己的專屬測驗題本！" position="bottom" className="right-0 transform-none left-auto" />
                </div>
            </div>

            {/* ✨ 修正：套用 Wrongbook 的階層式資料夾與清單設計 */}
            <div className="flex flex-col mb-4 gap-3 shrink-0 w-full">
                <div className="flex flex-col w-full border border-stone-200 dark:border-stone-700 rounded-2xl bg-[#FCFBF7] dark:bg-stone-900 shadow-sm overflow-hidden transition-all">
                    {/* 點擊收合/展開的標題列 */}
                    <button 
                        onClick={() => setIsFolderTreeOpen(!isFolderTreeOpen)} 
                        className="flex items-center justify-between w-full px-4 py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors border-b border-stone-200 dark:border-stone-700 font-bold text-stone-800 dark:text-white"
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500">folder_open</span>
                            <span>試題分類目錄</span>
                            <span className="text-xs bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-800 px-2 py-0.5 rounded-full ml-1">{userFolders.length}</span>
                        </div>
                        <span className="material-symbols-outlined text-gray-500 transition-transform duration-300" style={{ transform: isFolderTreeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            expand_more
                        </span>
                    </button>
                    
                    {/* 內容區域 */}
                    {isFolderTreeOpen && (
                        <div className="flex flex-col gap-1 p-3 max-h-[250px] overflow-y-auto custom-scrollbar shadow-inner">
                            {specialFolders.map(sf => {
                                // 不顯示未建立或沒有內容的特殊資料夾 (例如還沒抽到的任務牆)
                                if (sf === '任務牆' && !userFolders.includes('任務牆')) return null;
                                return (
                                    <div 
                                        key={sf}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${currentFolder === sf ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 shadow-md font-bold' : 'hover:bg-stone-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium'}`}
                                        onClick={() => { setCurrentFolder(sf); setCurrentPage(1); }}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {sf === '全部' ? 'apps' : sf === '我建立的試題' ? 'star' : sf === '來自匯入' ? 'move_to_inbox' : sf === '[公開試題管理]' ? 'public' : sf === '任務牆' ? 'sports_esports' : 'folder_off'}
                                        </span>
                                        <span className="text-sm">{sf}</span>
                                    </div>
                                );
                            })}
                            
                            {/* 自訂資料夾的樹狀結構 */}
                            {userFolders.filter(f => !specialFolders.includes(f)).length > 0 && (
                                <div className="mt-1 border-t border-stone-200 dark:border-stone-700 pt-2">
                                    {renderTree(folderTree)}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 輔助操作按鈕列 */}
                <div className="flex items-center gap-2 overflow-visible pb-1 shrink-0 w-full flex-wrap">
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
                            <span className="material-symbols-outlined text-[18px]">delete</span> 刪除資料夾
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
                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-stone-800 dark:hover:text-white ml-2 font-bold px-1"><span className="material-symbols-outlined text-[18px]">close</span></button>
                    )}
                </div>
                
                {/* 批次選取開關 */}
                <button 
                    onClick={() => {
                        setBatchMode(!batchMode);
                        setSelectedItems([]);
                    }}
                    className={`flex items-center justify-center gap-1 px-4 py-2 rounded-2xl font-bold text-sm transition-colors shrink-0 w-full md:w-auto ${batchMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-gray-300 hover:bg-stone-300 dark:hover:bg-stone-600'}`}
                >
                    <span className="material-symbols-outlined text-[18px]">{batchMode ? 'close' : 'checklist'}</span> 
                    {batchMode ? '取消選取' : '批次選取'}
                </button>
            </div>

            {/* 批次操作工具列 (只有在批次模式下，且有選取項目時顯示) */}
            {batchMode && selectedItems.length > 0 && (
                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 p-3 rounded-2xl mb-6 shadow-sm sticky top-4 z-50 animate-fade-in w-full min-w-0">
                    <div className="font-bold text-indigo-800 dark:text-indigo-300 text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined">check_box</span>
                        已選取 {selectedItems.length} 項
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowMoveModal(selectedItems)}
                            className="flex items-center gap-1 bg-white dark:bg-stone-800 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-600 px-3 py-1.5 rounded-xl text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">snippet_folder</span> 移動
                        </button>
                        <button 
                            onClick={() => handleDelete(selectedItems)}
                            className="flex items-center gap-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-xl text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">delete</span> 刪除
                        </button>
                    </div>
                </div>
            )}

           {/* 顯示在列表上方的分頁控制 */}
            <div className="mb-4">
                {renderPagination()}
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
                                onClick={() => onStartNew(currentFolder === '全部' || currentFolder === '我建立的試題' || currentFolder === '來自匯入' ? '未分類' : currentFolder)} 
                                className={`flex items-center justify-center gap-1 px-8 py-3 font-black shadow-xl hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all border-2 active:shadow-none active:translate-x-1 active:translate-y-1 rounded-2xl ${tutorialStep === 2 ? 'relative z-[160] bg-amber-500 text-white border-transparent ring-4 ring-amber-300 animate-pulse' : 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 border-black dark:border-transparent'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">add_circle</span> 建立新測驗
                            </button>
                            <button 
                                onClick={handleImportCode} 
                                className="flex items-center justify-center gap-1 bg-amber-50 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-8 py-3 font-black shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(59,130,246,0.3)] transition-all border-2 border-amber-200 dark:border-amber-700 active:shadow-none active:translate-x-1 active:translate-y-1 rounded-2xl"
                            >
                                <span className="material-symbols-outlined text-[20px]">move_to_inbox</span> 輸入測驗代碼
                            </button>
                        </div>
                    )}
                </div>
           ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 pb-4 w-full min-w-0">
                    {paginatedRecords.map(rec => {
                        const isSelected = selectedItems.some(item => item.id === rec.id);
                        return (
                            <div 
                                key={rec.id} 
                                onClick={() => {
                                    if (batchMode) {
                                        if (isSelected) setSelectedItems(prev => prev.filter(i => i.id !== rec.id));
                                        else setSelectedItems(prev => [...prev, rec]);
                                    }
                                }}
                                className={`bg-[#FCFBF7] dark:bg-stone-800 border-2 ${isSelected ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : 'border-stone-200 dark:border-stone-700'} p-5 rounded-2xl shadow-sm ${!batchMode ? 'hover:shadow-xl hover:-translate-y-1' : 'cursor-pointer hover:border-indigo-300'} transition-all flex flex-col w-full min-w-0 relative group`}
                            >
                                
                                {/* 批次核取方塊 */}
                                {batchMode && (
                                    <div className="absolute top-4 right-4 z-20">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-stone-800'}`}>
                                            {isSelected && <span className="material-symbols-outlined text-white text-[16px] font-black">check</span>}
                                        </div>
                                    </div>
                                )}

                                {/* 上半部：標題與狀態資訊 */}
                                <div className={`flex flex-col gap-2 min-w-0 w-full ${batchMode ? 'pr-8' : ''}`}>
                                    <div className="font-bold text-sm sm:text-base dark:text-white leading-relaxed min-w-0 w-full relative inline-block">
                                        {renderTestName(rec.testName, !!rec.results, rec.taskType)}
                                        {/* ✨ 新增：偵測到答案更新且重新算分時，顯示閃爍提醒 */}
                                        {rec.hasAnswerUpdate && (
                                            <span className="absolute -top-3 -right-2 sm:-right-4 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse shadow-md border border-white dark:border-gray-800 z-10 pointer-events-none flex items-center gap-0.5">
                                                <span className="material-symbols-outlined text-[12px]">error</span> 答案已更正
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="text-xs text-gray-400 dark:text-gray-500 font-bold mb-1 mt-0.5">
                                        建立於：{rec.createdAt?.toDate ? rec.createdAt.toDate().toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '未知時間'}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                        {rec.isTask && <span className="text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 whitespace-nowrap shrink-0">任務</span>}
                                        {rec.isShared && !rec.isTask && <span className="text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 whitespace-nowrap shrink-0">分享</span>}
                                        {rec.hasTimer && <span className="text-[10px] bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 border border-red-200 dark:border-red-700 px-1.5 py-0.5 font-bold whitespace-nowrap shrink-0 flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">timer</span> {rec.timeLimit}m</span>}
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                                        <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">{rec.numQuestions}题</span>
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
                                        <button disabled={batchMode} onClick={(e) => { e.stopPropagation(); handleDelete(rec); }} className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors py-1.5 sm:py-0 whitespace-nowrap overflow-hidden text-ellipsis flex items-center justify-center gap-0.5"><span className="material-symbols-outlined text-[14px]">delete</span>刪除</button>
                                        <button disabled={batchMode} onClick={(e) => { e.stopPropagation(); setShowMoveModal(rec); }} className="text-xs text-emerald-600 dark:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-colors py-1.5 sm:py-0 whitespace-nowrap overflow-hidden text-ellipsis flex items-center justify-center gap-0.5"><span className="material-symbols-outlined text-[14px]">snippet_folder</span>移動</button>
                                       {!(rec.isTask || /\[#(op|m?nm?st)\]/i.test(rec.testName || '')) ? (
                                            <button disabled={batchMode} onClick={(e) => { e.stopPropagation(); setShowShareModal(rec); }} className="text-xs text-amber-500 dark:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-colors py-1.5 sm:py-0 whitespace-nowrap overflow-hidden text-ellipsis flex items-center justify-center gap-0.5"><span className="material-symbols-outlined text-[14px]">share</span>分享</button>
                                        ) : <div />}
                                        {/* ✨ 放寬權限：如果是出題者本人，就算發布成任務也允許編輯 (修復 currentUser 導致的當機) */}
                                        {!rec.isShared && (!rec.isTask || !rec.creatorUid || rec.creatorUid === user.uid) ? (
                                            <button disabled={batchMode} onClick={(e) => { e.stopPropagation(); handleEditQuiz(rec); }} className="text-xs text-amber-600 dark:text-amber-400 font-bold transition-colors py-1.5 sm:py-0 whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden text-ellipsis relative flex items-center justify-center gap-0.5">
                                                <span className="material-symbols-outlined text-[14px]">edit_document</span>編輯
                                                {rec.hasNewSuggestion && <span className="absolute top-1 right-0 sm:-top-1 sm:-right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                                            </button>
                                        ) : <div />}
                                    </div>
                                    
                                    {/* 進入/查看按鈕 */}
                                    <button disabled={batchMode} onClick={(e) => { e.stopPropagation(); handleEnterQuiz(rec); }} className="bg-stone-50 dark:bg-gray-700 px-4 py-2.5 sm:py-1.5 rounded-2xl font-bold border border-stone-200 dark:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-100 hover:text-stone-800 dark:text-white text-sm transition-colors w-full sm:w-auto text-center shrink-0 flex items-center justify-center gap-1">
                                        {rec.results ? <><span className="material-symbols-outlined text-sm">bar_chart</span> 查看</> : <><span className="material-symbols-outlined text-sm">login</span> 進入</>}
                                    </button>
                                </div>

                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* 顯示在列表下方的分頁控制 */}
            <div className="mt-2 mb-8">
                {renderPagination()}
            </div>

            {showShareModal && (
                <div className="fixed inset-0 bg-stone-800 bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 w-full max-w-sm rounded-2xl shadow-xl">
                        <h3 className="font-bold text-lg mb-4 flex justify-between items-center dark:text-white">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined">ios_share</span> 分享試卷</span>
                            <button onClick={() => setShowShareModal(null)} className="text-gray-400 hover:text-stone-800 dark:hover:text-white"><span className="material-symbols-outlined">close</span></button>
                        </h3>

                        <div className="mb-6 p-4 bg-gray-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                            <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">公開測驗代碼</p>
                            {showShareModal.shortCode ? (
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between bg-[#FCFBF7] dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2">
                                        <span className="text-2xl font-mono font-black tracking-widest text-amber-600 dark:text-amber-400">{showShareModal.shortCode}</span>
                                        <button onClick={() => {
                                            navigator.clipboard.writeText(showShareModal.shortCode);
                                            showAlert(`[成功] 已複製代碼：${showShareModal.shortCode}`);
                                        }} className="text-xs bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-3 py-1.5 rounded-2xl font-bold hover:bg-stone-800">複製代碼</button>
                                    </div>
                                    <button onClick={() => {
                                        const link = `${window.location.origin}/?shareCode=${showShareModal.shortCode}`;
                                        const text = `[挑戰邀請] 快來挑戰我的試卷！\n試卷名稱：${showShareModal.testName.replace(/\[#(op|m?nm?st)\]/gi, '').trim()}\n\n點擊下方連結，立即將試卷自動加入你的題庫：\n${link}`;
                                        navigator.clipboard.writeText(text);
                                        showAlert(`[成功] 已複製邀請連結與文案！快去貼給朋友吧！`);
                                    }} className="flex items-center justify-center gap-1 text-sm bg-amber-50 dark:bg-amber-900 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-700 px-4 py-2 rounded-2xl font-bold hover:bg-amber-100 dark:hover:bg-amber-800 transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">link</span> 複製邀請連結與文案
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => handleGenerateCode(showShareModal)} disabled={isGeneratingCode} className="flex items-center justify-center gap-1 text-sm bg-amber-50 dark:bg-amber-900 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-700 px-4 py-2 rounded-2xl font-bold hover:bg-amber-100 dark:hover:bg-amber-800 w-full transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">key</span> {isGeneratingCode ? '生成中...' : '生成 6 碼分享代碼'}
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
                <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-[250] p-4 backdrop-blur-sm">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl transform transition-all border border-stone-200 dark:border-stone-700 flex flex-col max-h-[80vh]">
                        <h3 className="text-xl font-black mb-4 dark:text-white flex justify-between items-center">
                            移動試卷至...
                            <button onClick={() => setShowMoveModal(null)} className="text-gray-400 hover:text-red-500 bg-gray-100 dark:bg-stone-700 rounded-full p-1"><span className="material-symbols-outlined block">close</span></button>
                        </h3>

                        <div className="flex-1 overflow-y-auto custom-scrollbar border-2 border-stone-100 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-900 p-2 space-y-1">
                            {userFolders.filter(f => f !== '我建立的試題' && f !== '[公開試題管理]' && f !== '任務牆').map(f => (
                                <button 
                                    key={f}
                                    onClick={() => moveQuizToFolder(showMoveModal, f)}
                                    className="w-full text-left px-4 py-3 rounded-xl font-bold text-sm text-stone-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all flex items-center gap-3 group active:scale-[0.98]"
                                >
                                    <span className="material-symbols-outlined text-gray-400 group-hover:text-indigo-500 transition-colors">folder</span>
                                    {f}
                                </button>
                            ))}
                        </div>
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

            {/* ✨ 新增：直覺化新增資料夾視窗 (支援選擇父目錄) */}
            {showAddFolderModal && (
                <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-[250] p-4 backdrop-blur-sm">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl transform transition-all border border-stone-200 dark:border-stone-700">
                        <h3 className="text-xl font-black mb-4 dark:text-white flex justify-between items-center">
                            建立新資料夾
                            <button onClick={() => setShowAddFolderModal(false)} className="text-gray-400 hover:text-red-500"><span className="material-symbols-outlined">close</span></button>
                        </h3>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">account_tree</span> 建立於哪裡？ (可選)</label>
                            <select 
                                value={parentFolder} 
                                onChange={(e) => setParentFolder(e.target.value)}
                                className="w-full p-3 border-2 border-gray-200 dark:border-stone-600 bg-white dark:bg-stone-700 rounded-xl outline-none font-bold text-stone-800 dark:text-white focus:border-indigo-400 transition-colors cursor-pointer"
                            >
                                <option value="">📁 (無) 建立為主資料夾</option>
                                {userFolders.filter(f => !specialFolders.includes(f)).map(f => (
                                    <option key={f} value={f}>↳ {f}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">edit_document</span> 新資料夾名稱</label>
                            <input 
                                type="text" 
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="例如：代數、第一章"
                                className="w-full p-3 border-2 border-gray-200 dark:border-stone-600 bg-white dark:bg-stone-700 rounded-xl outline-none font-bold text-stone-800 dark:text-white focus:border-indigo-400 transition-colors"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                        submitCreateFolder();
                                    }
                                }}
                            />
                        </div>

                        <button 
                            onClick={submitCreateFolder}
                            className="w-full bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 font-black py-3 rounded-xl hover:bg-stone-700 transition-colors shadow-md flex justify-center items-center gap-2"
                        >
                            <span className="material-symbols-outlined">add_circle</span> 確認建立
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

window.Dashboard = Dashboard;
