const { useState, useEffect, useRef } = React;

// 從全域 (window) 拿取 components.jsx 提供的小工具
const { 
    cleanQuizName, renderTestName, parseSmilesToHtml, LoadingSpinner, 
    ContentEditableEditor, AnswerGridInput, SpecificAnswerGridInput, HelpTooltip, 
    safeDecompress, processQuestionContent, extractSpecificContent, extractSpecificExplanation 
} = window;

function WrongBookModal({ title, initialData, onClose, onSave, showAlert }) {
    const [folder, setFolder] = useState(initialData?.folder || '未分類');
    const [newFolder, setNewFolder] = useState('');
    const [qText, setQText] = useState(initialData?.qText || '');
    const [qHtml] = useState(initialData?.qHtml || ''); 
    const [qImage, setQImage] = useState(initialData?.qImage || null);
    const [nText, setNText] = useState(initialData?.nText || '');
    const [nImage, setNImage] = useState(initialData?.nImage || null);
    const [isSaving, setIsSaving] = useState(false);
    
    // ✨ 新增：用來顯示建立新資料夾的視窗
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);

    const handleSave = async () => {
        const finalFolder = (showNewFolderInput && newFolder.trim() ? newFolder.trim() : folder) || '未分類';
        setIsSaving(true);
        await onSave({ folder: finalFolder, qText: qText.trim(), qHtml, qImage, nText: nText.trim(), nImage });
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-stone-800 bg-opacity-70 flex items-center justify-center z-[200] p-4">
            <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 w-full max-w-lg rounded-2xl shadow-2xl transform transition-all max-h-[90dvh] overflow-y-auto custom-scrollbar border-t-4 border-amber-500 dark:border-amber-600">
                <h3 className="font-black text-xl mb-4 flex justify-between items-center dark:text-white border-b border-stone-200 dark:border-stone-700 pb-2">
                    <span>{title}</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 font-bold transition-colors flex items-center"><span className="material-symbols-outlined">close</span></button>
                </h3>
                
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">folder</span> 選擇收錄資料夾</label>
                        <button 
                            onClick={() => {
                                setShowNewFolderInput(!showNewFolderInput);
                                if (!showNewFolderInput) setNewFolder(folder === '未分類' ? '' : folder + '/');
                            }} 
                            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[14px]">create_new_folder</span> 
                            {showNewFolderInput ? '取消新增' : '建立新資料夾'}
                        </button>
                    </div>

                    {showNewFolderInput ? (
                        <div className="animate-fade-in bg-amber-50 dark:bg-stone-900 p-3 rounded-2xl border border-amber-200 dark:border-stone-700">
                            <label className="block text-xs font-bold text-amber-800 dark:text-amber-400 mb-1">輸入新資料夾路徑 (可用 / 分隔層級)</label>
                            <input 
                                type="text" 
                                placeholder="例如: 藥理學/抗生素" 
                                value={newFolder} 
                                onChange={e => setNewFolder(e.target.value)} 
                                autoFocus
                                className="w-full p-2 border-2 border-amber-300 dark:border-stone-600 focus:border-amber-500 bg-white dark:bg-stone-700 text-stone-800 dark:text-white rounded-xl outline-none text-sm font-bold shadow-inner" 
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1 w-full border border-stone-200 dark:border-stone-700 rounded-2xl p-2 bg-[#FCFBF7] dark:bg-stone-900 shadow-inner max-h-[160px] overflow-y-auto custom-scrollbar">
                            <div 
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${folder === '未分類' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800' : 'hover:bg-stone-100 dark:hover:bg-gray-700 text-stone-700 dark:text-gray-300 font-medium'}`}
                                onClick={() => setFolder('未分類')}
                            >
                                <span className="w-[20px]"></span>
                                <span className="material-symbols-outlined text-[18px] text-gray-400">folder_off</span>
                                <span className="text-sm">未分類</span>
                            </div>
                            
                            {/* ✨ 判斷是否有傳入外部的 renderFolderTree，有的話就使用樹狀結構 */}
                            {initialData?.renderFolderTree && initialData?.folderTree ? (
                                initialData.renderFolderTree(initialData.folderTree, 0, folder, setFolder)
                            ) : (
                                /* 💡 保底機制：如果沒有傳入樹狀函數 (例如舊版相容)，則顯示一般選單 */
                                initialData?.userFolders && initialData.userFolders.filter(f => f !== '未分類').map(f => (
                                    <div 
                                        key={f}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${folder === f ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800' : 'hover:bg-stone-100 dark:hover:bg-gray-700 text-stone-700 dark:text-gray-300 font-medium'}`}
                                        onClick={() => setFolder(f)}
                                    >
                                        <span className="w-[20px]"></span>
                                        <span className={`material-symbols-outlined text-[18px] ${folder === f ? 'text-amber-600 dark:text-amber-400' : 'text-amber-500'}`}>folder</span>
                                        <span className="text-sm truncate">{f}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {qHtml ? (
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">description</span> 題目內容 (系統自動擷取，原稿保護中不可編輯)</label>
                        <div className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-stone-900 p-3 max-h-48 overflow-y-auto custom-scrollbar rounded-2xl shadow-inner">
                            <style dangerouslySetInnerHTML={{__html: `
                                .modal-rich-text { word-break: break-word; white-space: pre-wrap; font-size: 0.875rem; line-height: 1.6; }
                                .modal-rich-text * { color: inherit !important; background-color: transparent !important; }
                                .modal-rich-text img {
                                    display: block !important;
                                    max-width: 100% !important;
                                    height: auto !important;
                                    margin: 10px 0 !important;
                                    background-color: #FCFBF7 !important;
                                    opacity: 1 !important;
                                    visibility: visible !important;
                                    border-radius: 4px;
                                }
                                .modal-rich-text canvas {
                                    background-color: #FCFBF7 !important;
                                }
                            `}} />
                            <div className="modal-rich-text text-stone-800 dark:text-white font-medium" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml(qHtml) }} />
                        </div>
                    </div>
                ) : (
                    <RichInput label={<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">description</span> 題目內容</span>} text={qText} setText={setQText} image={qImage} setImage={setQImage} maxLength={300} showAlert={showAlert} />
                )}
                
                <RichInput label={<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">lightbulb</span> 我的筆記 / 詳解</span>} text={nText} setText={setNText} image={nImage} setImage={setNImage} maxLength={300} showAlert={showAlert} />
                
                <div className="flex justify-end space-x-3 mt-6 border-t border-gray-100 dark:border-stone-700 pt-4">
                    <button onClick={onClose} className="bg-stone-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-6 py-2 rounded-2xl font-bold text-sm hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors">取消</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-8 py-2 rounded-2xl font-black text-sm hover:bg-stone-800 dark:hover:bg-gray-300 transition-colors shadow-md flex items-center gap-1">
                        {isSaving ? '儲存中...' : <><span className="material-symbols-outlined text-[18px]">save</span> 儲存</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

function WrongBookDashboard({ user, showAlert, showConfirm, showPrompt, onContinueQuiz }) {
    const [wrongItems, setWrongItems] = useState([]);
    const [customFolders, setCustomFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [currentFolder,setCurrentFolder] = useState('全部');
    const [previewImage, setPreviewImage] = useState(null);
    const [localToast, setLocalToast] = useState(null); // ✨ 新增：小文字提示狀態
    const [searchQuery, setSearchQuery] = useState(''); // ✨ 新增：搜尋關鍵字狀態

   const [isJumping, setIsJumping] = useState(false);
    const [visibleLimit, setVisibleLimit] = useState(50); 
    const [isSyncingWb, setIsSyncingWb] = useState(false);

    // ✨ 新增：直覺化介面狀態
    const [showFolderModal, setShowFolderModal] = useState(false); // 新增資料夾視窗
    const [parentFolder, setParentFolder] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    
    const [moveItemTarget, setMoveItemTarget] = useState(null); // 移動錯題視窗 (存陣列)
    const [batchMode, setBatchMode] = useState(false); // 批次選取模式
    const [selectedItems, setSelectedItems] = useState([]); // 被打勾的錯題
    
    // ✨ 新增：控制資料夾目錄與題目展開的狀態
    const [isFolderTreeOpen, setIsFolderTreeOpen] = useState(true); // 資料夾目錄是否展開
    const [expandedQuestions, setExpandedQuestions] = useState({}); // 個別題目是否展開

    useEffect(() => {
        let isMounted = true;
        let fallbackTimer = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 1500);

        const unsubItems = window.db.collection('users').doc(user.uid).collection('wrongBook')
            .orderBy('createdAt', 'desc')
            .limit(visibleLimit) 
            .onSnapshot({ includeMetadataChanges: true }, snap => {
                if (!isMounted) return;
                if (snap.empty && snap.metadata.fromCache && !snap.metadata.hasPendingWrites) return; 
                
                setWrongItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
               
            });
            
        const unsubUser = window.db.collection('users').doc(user.uid).onSnapshot(doc => {
            if (doc.exists && doc.data().wrongBookFolders && isMounted) {
                setCustomFolders(doc.data().wrongBookFolders);
            }
        });

        return () => { isMounted = false; clearTimeout(fallbackTimer); unsubItems(); unsubUser(); };
    }, [user.uid, visibleLimit]);

    const folders = ['全部', ...new Set([...customFolders, ...wrongItems.map(item => item.folder || '未分類')])];
    
    // ✨ 修改：支援前綴匹配，點擊父資料夾(如:數學)能看到所有子資料夾(如:數學/代數)裡的題目
    const filteredItems = wrongItems.filter(item => {
        if (currentFolder === '全部') return true;
        const itemFolder = item.folder || '未分類';
        return itemFolder === currentFolder || itemFolder.startsWith(currentFolder + '/');
    });

    // ✨ 新增：樹狀結構展開狀態與轉換邏輯
    const [expandedFolders, setExpandedFolders] = useState({});
    const folderTree = (() => {
        const tree = {};
        folders.forEach(f => {
            if (f === '全部' || f === '未分類') return;
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
    })();

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
                            {renderTree(node.children, 0)}
                        </div>
                    )}
                </div>
            );
        });
    };

    // ✨ 新增：根據搜尋關鍵字過濾
    const searchedItems = filteredItems.filter(item => {
        if (!searchQuery.trim()) return true;
        const keyword = searchQuery.toLowerCase();
        const qTextMatch = (item.qText || '').toLowerCase().includes(keyword);
        const qHtmlMatch = (item.qHtml || '').toLowerCase().includes(keyword);
        const nTextMatch = (item.nText || item.note || '').toLowerCase().includes(keyword);
        const quizNameMatch = (item.quizName || '').toLowerCase().includes(keyword);
        return qTextMatch || qHtmlMatch || nTextMatch || quizNameMatch;
    });

    useEffect(() => {
        setVisibleLimit(50); 
    }, [currentFolder, searchQuery]); // ✨ 修改：搜尋時也重置顯示數量

    const displayedItems = searchedItems.slice(0, visibleLimit);

    // 極速背景同步機制
    useEffect(() => {
        if (displayedItems.length === 0) return;
        
        const checkUpdates = async () => {
            setIsSyncingWb(true);
            const uniqueQuizIds = [...new Set(displayedItems.map(item => item.quizId).filter(Boolean))];
            let needsUpdate = false;
            const batch = window.db.batch();

            for (const qId of uniqueQuizIds) {
                try {
                    const quizDoc = await window.db.collection('users').doc(user.uid).collection('quizzes').doc(qId).get();
                    if (!quizDoc.exists) continue;
                    const quizData = quizDoc.data();
                    let latestKeyInput = quizData.correctAnswersInput || '';

                    if (quizData.isTask && quizData.taskId) {
                        const taskDoc = await window.db.collection('publicTasks').doc(quizData.taskId).get();
                        if (taskDoc.exists) {
                            latestKeyInput = taskDoc.data().correctAnswersInput || latestKeyInput;
                        }
                    }

                    const cleanKey = latestKeyInput.replace(/[^a-dA-DZz,]/g, '');
                    let keyArray = cleanKey.includes(',') ? cleanKey.split(',') : (cleanKey.match(/[A-DZ]|[a-dz]+/g) || []);

                    displayedItems.filter(item => item.quizId === qId).forEach(item => {
                        const qNum = item.questionNum;
                        const newKey = keyArray[qNum - 1] || '';
                        if (item.correctAns !== newKey && newKey !== '') {
                            const ref = window.db.collection('users').doc(user.uid).collection('wrongBook').doc(item.id);
                            batch.update(ref, { correctAns: newKey });
                            needsUpdate = true;
                        }
                    });
                } catch (e) { console.error("背景檢查錯題本更新失敗", e); }
            }
            
            if (needsUpdate) {
                await batch.commit();
            }
            setIsSyncingWb(false);
        };
        
        const timer = setTimeout(() => { checkUpdates(); }, 2000);
        return () => clearTimeout(timer);
        
    }, [displayedItems.length, currentFolder, user.uid]);

    const handleDelete = (id) => {
        showConfirm("確定要刪除這筆錯題紀錄嗎？", () => {
            window.db.collection('users').doc(user.uid).collection('wrongBook').doc(id).delete();
        });
    };

    // ✨ 新增：刪除錯題資料夾功能
    const handleDeleteWrongBookFolder = () => {
        if (currentFolder === '全部' || currentFolder === '未分類') return;
        showConfirm(`確定要刪除「${currentFolder}」資料夾嗎？\n裡面的錯題將會自動移至「未分類」。`, async () => {
            try {
                const snapshot = await window.db.collection('users').doc(user.uid).collection('wrongBook').where('folder', '==', currentFolder).get();
                
                if (!snapshot.empty) {
                    const batches = [];
                    let currentBatch = window.db.batch();
                    let count = 0;

                    snapshot.docs.forEach(doc => {
                        currentBatch.update(doc.ref, { folder: '未分類' });
                        count++;
                        if (count === 490) { // Firebase batch 上限 500
                            batches.push(currentBatch.commit());
                            currentBatch = window.db.batch();
                            count = 0;
                        }
                    });
                    if (count > 0) batches.push(currentBatch.commit());
                    await Promise.all(batches);
                }
                
                await window.db.collection('users').doc(user.uid).set({
                    wrongBookFolders: window.firebase.firestore.FieldValue.arrayRemove(currentFolder)
                }, { merge: true });
                
                setCurrentFolder('全部');
                showAlert(`[成功] 已刪除「${currentFolder}」資料夾！`);
            } catch (err) {
                showAlert('[錯誤] 刪除失敗：' + err.message);
            }
        });
    };

    // ✨ 新增：一鍵清空錯題功能
    const handleClearWrongBookFolder = () => {
        showConfirm(`確定要清空「${currentFolder}」內的所有錯題嗎？\n此動作無法復原！`, async () => {
            try {
                let query = window.db.collection('users').doc(user.uid).collection('wrongBook');
                if (currentFolder !== '全部') {
                    query = query.where('folder', '==', currentFolder);
                }
                
                const snapshot = await query.get();
                if (snapshot.empty) return showAlert(`[提示] 「${currentFolder}」內已經沒有錯題了！`);

                const batches = [];
                let currentBatch = window.db.batch();
                let count = 0;

                snapshot.docs.forEach(doc => {
                    currentBatch.delete(doc.ref);
                    count++;
                    if (count === 490) {
                        batches.push(currentBatch.commit());
                        currentBatch = window.db.batch();
                        count = 0;
                    }
                });
                if (count > 0) batches.push(currentBatch.commit());
                await Promise.all(batches);
                
                showAlert(`[成功] 已成功清空「${currentFolder}」的所有錯題！`);
            } catch (err) {
                showAlert('[錯誤] 清空失敗：' + err.message);
            }
        });
    };

    const handleGoToQuiz = async (quizId) => {
        setIsJumping(true); 
        try {
            let doc = await window.db.collection('users').doc(user.uid).collection('quizzes').doc(quizId).get().catch(() => null);
            if (!doc || !doc.exists) {
                doc = await window.db.collection('users').doc(user.uid).collection('quizzes').doc(quizId).get({ source: 'cache' });
            }
            if(doc && doc.exists) {
                const data = doc.data();
                setTimeout(() => {
                    onContinueQuiz({ id: doc.id, ...data, forceStep: 'results' });
                }, 50);
            } else {
                showAlert('[錯誤] 找不到原始試卷，可能已被刪除！');
                setIsJumping(false);
            }
        } catch(e) {
            showAlert('[錯誤] 載入失敗：' + e.message);
            setIsJumping(false);
        }
    };

    const handleRetakeWrong = async () => {
        setIsJumping(true); 
        try {
            let query = window.db.collection('users').doc(user.uid).collection('wrongBook');
            if (currentFolder !== '全部') {
                query = query.where('folder', '==', currentFolder);
            }
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                setIsJumping(false);
                return showAlert("[提示] 此分類目前沒有錯題可供測驗喔！");
            }

            let allWrongItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allWrongItems.sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return timeB - timeA; 
            });

            setIsJumping(false); 

            showConfirm(`確定要針對「${currentFolder}」的 ${allWrongItems.length} 題（包含未顯示的題目）進行錯題重測嗎？\n\n系統將自動為您生成一份試卷，交卷後的詳解為錯題筆記。`, async () => {
                setIsJumping(true);
                try {
                    let qHtml = '';
                    let eHtml = '';
                    let ansArray = [];

                    allWrongItems.forEach((item, index) => {
                        const qNum = index + 1;
                        let qContent = item.qHtml ? item.qHtml : (item.qText || '無題目文字');
                        if (item.qImage) {
                            qContent += `<br/><br/><img src="${item.qImage}" style="max-width:100%; border-radius:8px;" />`;
                        }
                        qHtml += `[Q.${qNum}] ${qContent} [End]<br/><br/>`;

                        let expContent = item.nText || item.note || '無筆記';
                        if (item.nImage) {
                            expContent += `<br/><br/><img src="${item.nImage}" style="max-width:100%; border-radius:8px;" />`;
                        }
                        eHtml += `[A.${qNum}] ${expContent} [End]<br/><br/>`;

                        ansArray.push(item.correctAns || '');
                    });

                    const cleanKey = ansArray.join(',');
                    const emptyAnswers = Array(allWrongItems.length).fill('');
                    const emptyStarred = Array(allWrongItems.length).fill(false);

                    // ✨ 延遲載入大改造 4：錯題重測生成時，也要把輕重資料切開
                    const docRef = await window.db.collection('users').doc(user.uid).collection('quizzes').add({
                        testName: `[錯題重測] ${currentFolder}`,
                        numQuestions: allWrongItems.length,
                        // 🚀 移除笨重內容
                        correctAnswersInput: cleanKey,
                        publishAnswers: true,
                        userAnswers: emptyAnswers,
                        starred: emptyStarred,
                        folder: '錯題重測', 
                        viewMode: 'interactive', 
                        hasSeparatedContent: true, // ✨ 標記為已分離
                        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // ✨ 單獨存入笨重內容 (套用壓縮機制)
                    await window.db.collection('users').doc(user.uid).collection('quizContents').doc(docRef.id).set({
                        questionText: '',
                        questionHtml: window.jzCompress ? window.jzCompress(qHtml) : qHtml,
                        explanationHtml: window.jzCompress ? window.jzCompress(eHtml) : eHtml
                    });

                    if (!customFolders.includes('錯題重測')) {
                        await window.db.collection('users').doc(user.uid).set({
                            wrongBookFolders: window.firebase.firestore.FieldValue.arrayUnion('錯題重測')
                        }, { merge: true });
                    }

                    const docSnap = await docRef.get();
                    onContinueQuiz({ id: docSnap.id, ...docSnap.data(), questionHtml: qHtml, explanationHtml: eHtml, forceStep: 'answering' });

                } catch (e) {
                    showAlert('[錯誤] 生成錯題重測失敗：' + e.message);
                    setIsJumping(false);
                }
            });
        } catch (e) {
            showAlert('[錯誤] 讀取題庫失敗：' + e.message);
            setIsJumping(false);
        }
    };

    return (
        <div className="max-w-[1600px] w-full mx-auto p-4 pt-0 h-full overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b-2 border-black dark:border-white pb-2 shrink-0">
                <h1 className="text-2xl font-black dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-3xl">menu_book</span>
                    錯題整理
                </h1>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">專屬你的弱點突破筆記本</p>
            </div>

            <div className="flex flex-col mb-6 gap-3 shrink-0 w-full">
                <div className="flex flex-col w-full max-w-md border border-stone-200 dark:border-stone-700 rounded-2xl bg-[#FCFBF7] dark:bg-stone-900 shadow-sm overflow-hidden transition-all">
                    {/* ✨ 新增：點擊收合/展開的標題列 */}
                    <button 
                        onClick={() => setIsFolderTreeOpen(!isFolderTreeOpen)} 
                        className="flex items-center justify-between w-full px-4 py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors border-b border-stone-200 dark:border-stone-700 font-bold text-stone-800 dark:text-white"
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500">folder_open</span>
                            <span>錯題分類目錄</span>
                            <span className="text-xs bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-800 px-2 py-0.5 rounded-full ml-1">{folders.length - 1}</span>
                        </div>
                        <span className="material-symbols-outlined text-gray-500 transition-transform duration-300" style={{ transform: isFolderTreeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            expand_more
                        </span>
                    </button>
                    
                    {/* ✨ 內容區域 (依照狀態顯示/隱藏) */}
                    {isFolderTreeOpen && (
                        <div className="flex flex-col gap-1 p-3 max-h-[250px] overflow-y-auto custom-scrollbar shadow-inner">
                            <div 
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${currentFolder === '全部' ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 shadow-md font-bold' : 'hover:bg-stone-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium'}`}
                                onClick={() => setCurrentFolder('全部')}
                            >
                                <span className="material-symbols-outlined text-[18px]">search</span>
                                <span className="text-sm">全部錯題</span>
                            </div>
                            {renderTree(folderTree)}
                            {folders.includes('未分類') && (
                                <div 
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors mt-1 border-t border-stone-200 dark:border-stone-700 pt-2 ${currentFolder === '未分類' ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 shadow-md font-bold' : 'hover:bg-stone-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium'}`}
                                    onClick={() => setCurrentFolder('未分類')}
                                >
                                    <span className="material-symbols-outlined text-[18px]">folder_off</span>
                                    <span className="text-sm">未分類</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ✨ 新增：搜尋列 UI */}
                <div className="flex items-center w-full max-w-md bg-[#FCFBF7] dark:bg-stone-800 border border-gray-300 dark:border-gray-600 rounded-2xl px-3 py-1.5 shadow-sm">
                    <span className="material-symbols-outlined text-gray-400 mr-2 text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder="搜尋題目、筆記或試卷名稱..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent outline-none text-sm font-bold text-stone-800 dark:text-white placeholder-gray-400"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-red-500 flex items-center ml-2 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">cancel</span>
                        </button>
                    )}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 pb-1 border-t border-stone-200 dark:border-stone-700 pt-3 mt-1">
                    <button 
                        onClick={handleRetakeWrong}
                        className="px-3 py-1.5 text-sm font-bold bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/50 rounded-2xl transition-colors flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[18px]">quiz</span> 錯題重測
                    </button>
                    <button 
                        onClick={() => {
                            setParentFolder(currentFolder === '全部' || currentFolder === '未分類' ? '' : currentFolder);
                            setNewFolderName('');
                            setShowFolderModal(true);
                        }} 
                        className="px-3 py-1.5 text-sm font-bold bg-[#FCFBF7] dark:bg-stone-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-colors flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[18px]">create_new_folder</span> 新增資料夾
                    </button>

                    {/* ✨ 新增：批次管理按鈕 */}
                    <button 
                        onClick={() => {
                            setBatchMode(!batchMode);
                            setSelectedItems([]);
                        }} 
                        className={`px-3 py-1.5 text-sm font-bold rounded-2xl transition-colors flex items-center gap-1 border ${batchMode ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-inner' : 'bg-[#FCFBF7] dark:bg-stone-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">{batchMode ? 'close' : 'checklist'}</span> 
                        {batchMode ? '取消批次整理' : '批次整理'}
                    </button>

                    {currentFolder !== '全部' && (
                        <button 
                            onClick={handleClearWrongBookFolder} 
                            className="px-3 py-1.5 text-sm font-bold bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-2xl transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[18px]">mop</span> 清空分類
                        </button>
                    )}
                    
                    {currentFolder !== '全部' && currentFolder !== '未分類' && (
                        <button 
                            onClick={handleDeleteWrongBookFolder} 
                            className="px-3 py-1.5 text-sm font-bold bg-stone-50 dark:bg-stone-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-700 rounded-2xl transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span> 刪除資料夾
                        </button>
                    )}
                </div>
            </div>
            
           {loading && wrongItems.length === 0 ? <LoadingSpinner text="載入錯題中..." /> : 
             searchedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#FCFBF7] dark:bg-stone-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-center shadow-sm">
                    <div className="text-gray-400 mb-4"><span className="material-symbols-outlined" style={{ fontSize: '64px' }}>menu_book</span></div>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">目前沒有錯題紀錄</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-bold max-w-md leading-relaxed mt-2">
                        這是一件好事，代表你目前百發百中！<br/><br/>
                        下次如果在測驗中遇到錯題，只要在「交卷後的解答檢視頁面」，點擊題目右下角的 <span className="bg-stone-50 dark:bg-gray-700 text-red-500 px-2 py-1 border border-stone-200 dark:border-gray-600 rounded-sm inline-flex items-center gap-1 align-middle"><span className="material-symbols-outlined text-[14px]">bookmark_add</span> 收錄錯題</span>，就可以把題目收藏到這裡隨時複習喔！
                    </p>
                </div>
             ) :
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
                 {displayedItems.map(item => (
                     <div key={item.id} className="bg-[#FCFBF7] dark:bg-stone-800 p-5 border border-stone-200 dark:border-stone-700 shadow-sm relative rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all">
                         <button onClick={() => handleDelete(item.id)} className="absolute top-4 right-4 text-stone-400 hover:text-red-500 font-bold z-10 transition-colors flex items-center"><span className="material-symbols-outlined">close</span></button>
                         <div className="text-xs text-amber-600 dark:text-amber-400 font-bold mb-2 pr-6 flex items-center justify-between">
                            <span className="truncate">出自: {cleanQuizName(item.quizName)} - 第 {item.questionNum} 題</span>
                            {item.quizId && (
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGoToQuiz(item.quizId); }} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline shrink-0 ml-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">link</span> 檢視試題
                                </button>
                            )}
                         </div>
                         <div className="flex space-x-4 mb-3 border-b border-gray-100 dark:border-stone-700 pb-2">
                            <span className="text-sm font-bold text-red-500">你的答案: {item.userAns || '未填'}</span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">正確答案: {item.correctAns}</span>
                         </div>
                         
                         {/* ✨ 新增：內容過長時隱藏並加上漸層效果 */}
                         <div className={`relative transition-all duration-300 ${expandedQuestions[item.id] ? '' : 'max-h-[160px] overflow-hidden'}`}>
                             {(item.qHtml || item.qText || item.qImage) && (
                                 <div className="mb-3">
                                     <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">description</span> 題目</p>
                                     <div className="bg-[#FCFBF7] dark:bg-stone-900 p-3 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap border-l-4 border-amber-500 font-bold shadow-sm">
                                         {item.qHtml ? (
                                             <>
                                                 <style dangerouslySetInnerHTML={{__html: `
                                                     .wb-rich-text { word-break: break-word; white-space: pre-wrap; }
                                                     .wb-rich-text * { color: inherit !important; background-color: transparent !important; }
                                                     .wb-rich-text img {
                                                         display: block !important;
                                                         max-width: 100% !important;
                                                         height: auto !important;
                                                         margin: 10px 0 !important;
                                                         background-color: #FCFBF7 !important;
                                                         opacity: 1 !important;
                                                         visibility: visible !important;
                                                         border-radius: 4px;
                                                     }
                                                     .wb-rich-text canvas {
                                                         background-color: #FCFBF7 !important;
                                                     }
                                                 `}} />
                                                 <div className="wb-rich-text" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml(item.qHtml) }} />
                                             </>
                                         ) : (
                                             item.qText && <p>{item.qText}</p>
                                         )}
                                         {item.qImage && <img src={item.qImage} onClick={() => setPreviewImage(item.qImage)} className="mt-2 max-h-[300px] w-full object-contain border border-stone-200 dark:border-stone-700 cursor-pointer hover:opacity-80 transition-opacity bg-[#FCFBF7]" alt="題目附圖" title="點擊放大" />}
                                     </div>
                                 </div>
                             )}

                             {(item.nText || item.note || item.nImage) && (
                                 <div className="mb-3">
                                     <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">lightbulb</span> 筆記</p>
                                     <div className="bg-amber-50 dark:bg-stone-900 p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border-l-4 border-amber-400 font-bold">
                                         {(item.nText || item.note) && <p>{item.nText || item.note}</p>}
                                        {item.nImage && <img src={item.nImage} onClick={() => setPreviewImage(item.nImage)} className="mt-2 max-h-[300px] w-full object-contain border border-stone-200 dark:border-stone-700 cursor-pointer hover:opacity-80 transition-opacity bg-[#FCFBF7]" alt="筆記附圖" title="點擊放大" />}
                                     </div>
                                 </div>
                             )}
                             
                             {/* 漸層遮罩 */}
                             {!expandedQuestions[item.id] && (
                                 <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#FCFBF7] dark:from-stone-800 to-transparent pointer-events-none z-10"></div>
                             )}
                         </div>

                         {/* ✨ 新增：展開/收起按鈕 */}
                         <button 
                             onClick={() => setExpandedQuestions(prev => ({...prev, [item.id]: !prev[item.id]}))} 
                             className="w-full text-center text-xs text-indigo-500 dark:text-indigo-400 font-bold mt-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                         >
                            {expandedQuestions[item.id] ? <><span className="material-symbols-outlined text-[16px]">expand_less</span> 收起完整內容</> : <><span className="material-symbols-outlined text-[16px]">expand_more</span> 展開完整內容</>}
                         </button>

                         <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100 dark:border-stone-700 relative z-10">
                             <div className="flex items-center gap-2">
                                 {/* ✨ 改進：圖形化移動按鈕 */}
                                 <button 
                                     onClick={() => setMoveItemTarget([item.id])} 
                                     className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-stone-800"
                                 >
                                     <span className="material-symbols-outlined text-[14px]">drive_file_move</span> 移動至...
                                 </button>
                                 <span className="text-[11px] font-bold text-gray-400 px-1 truncate max-w-[100px]" title={item.folder || '未分類'}>{item.folder || '未分類'}</span>
                             </div>
                             <button onClick={() => setEditingItem(item)} className="text-xs font-bold text-gray-500 hover:text-stone-800 dark:hover:text-white transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">edit</span> 編輯內容</button>
                         </div>

                         {/* ✨ 新增：批次模式的選取框 (覆蓋在卡片上層) */}
                         {batchMode && (
                             <div 
                                 className="absolute inset-0 bg-stone-800/5 dark:bg-black/20 rounded-2xl cursor-pointer border-2 transition-all z-20 flex items-start justify-end p-4"
                                 style={{ borderColor: selectedItems.includes(item.id) ? '#4f46e5' : 'transparent' }}
                                 onClick={() => {
                                     setSelectedItems(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                                 }}
                             >
                                 <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-sm transition-colors ${selectedItems.includes(item.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 dark:border-gray-500'}`}>
                                     {selectedItems.includes(item.id) && <span className="material-symbols-outlined text-[18px]">check</span>}
                                 </div>
                             </div>
                         )}
                     </div>
                 ))}
             </div>
            }
            
            {!loading && searchedItems.length >= visibleLimit && (
                <div className="flex justify-center mt-2 mb-10">
                    <button 
                        onClick={() => setVisibleLimit(prev => prev + 50)} 
                        className="bg-[#FCFBF7] dark:bg-stone-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-6 py-2 font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        {isSyncingWb ? <><div className="w-4 h-4 border-2 border-gray-400 border-t-black dark:border-t-white rounded-full animate-spin"></div>同步最新解答中...</> : <><span className="material-symbols-outlined text-[18px]">arrow_downward</span> 載入更多錯題...</>}
                    </button>
                </div>
            )}

            {previewImage && (
                <div className="fixed inset-0 bg-stone-800/80 flex items-center justify-center z-[110] p-4 cursor-zoom-out" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} className="max-w-full max-h-[90vh] object-contain shadow-2xl" alt="放大預覽" />
                    <button className="absolute top-4 right-4 text-white text-3xl font-bold bg-stone-800/50 w-12 h-12 rounded-full flex items-center justify-center hover:bg-stone-800/80 flex items-center"><span className="material-symbols-outlined">close</span></button>
                </div>
            )}

            {isJumping && (
                <div className="fixed inset-0 bg-stone-800 bg-opacity-80 flex items-center justify-center z-[200] p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 w-full max-w-sm rounded-2xl shadow-2xl text-center border-t-8 border-indigo-500 animate-fade-in">
                        <div className="w-16 h-16 border-4 border-stone-200 dark:border-stone-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black mb-2 dark:text-white flex justify-center items-center gap-2"><span className="material-symbols-outlined text-[28px]">rocket_launch</span> 正在載入試卷...</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">正在為您從雲端抓取資料並解壓縮，請稍候</p>
                    </div>
                </div>
            )}

           {editingItem && (
                <WrongBookModal
                    title={`編輯錯題 - 第 ${editingItem.questionNum} 題`}
                    initialData={{
                        folder: editingItem.folder || '未分類',
                        userFolders: folders.filter(f => f !== '全部'),
                        qText: editingItem.qText || '',
                        qHtml: editingItem.qHtml || '', 
                        qImage: editingItem.qImage || null,
                        nText: editingItem.nText || editingItem.note || '',
                        nImage: editingItem.nImage || null
                    }}
                    onClose={() => setEditingItem(null)}
                    onSave={async (data) => {
                        await window.db.collection('users').doc(user.uid).collection('wrongBook').doc(editingItem.id).update({
                            folder: data.folder || '未分類',
                            qText: data.qText,
                            qHtml: data.qHtml || '', 
                            qImage: data.qImage,
                            nText: data.nText,
                            nImage: data.nImage,
                            note: window.firebase.firestore.FieldValue.delete()
                        });
                        if (data.folder && !folders.includes(data.folder)) {
                             window.db.collection('users').doc(user.uid).set({
                                 wrongBookFolders: window.firebase.firestore.FieldValue.arrayUnion(data.folder)
                             }, { merge: true });
                        }
                        showAlert('[成功] 修改成功！');
                        setEditingItem(null);
                    }}
                    showAlert={showAlert}
                />
            )}

            {localToast && (
                <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-stone-800/80 text-white px-4 py-2 rounded-full text-sm font-bold z-[300] shadow-lg pointer-events-none animate-fade-in flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span> {localToast.replace('[成功] ', '')}
                </div>
            )}

            {/* ✨ 新增 1：批次管理底部浮動工具列 */}
            {batchMode && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#FCFBF7] dark:bg-stone-800 border-2 border-indigo-200 dark:border-indigo-800 shadow-2xl px-6 py-4 rounded-2xl z-[150] flex items-center gap-4 animate-fade-in w-[90%] max-w-md justify-between">
                    <div className="text-sm font-bold dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500">checklist</span>
                        已選取 <span className="text-indigo-600 dark:text-indigo-400 text-lg px-1">{selectedItems.length}</span> 題
                    </div>
                    <div className="flex gap-2">
                        <button 
                            disabled={selectedItems.length === 0}
                            onClick={() => {
                                showConfirm(`確定要刪除這 ${selectedItems.length} 題嗎？`, async () => {
                                    const batch = window.db.batch();
                                    selectedItems.forEach(id => {
                                        const ref = window.db.collection('users').doc(user.uid).collection('wrongBook').doc(id);
                                        batch.delete(ref);
                                    });
                                    await batch.commit();
                                    setSelectedItems([]);
                                    showAlert(`[成功] 已刪除 ${selectedItems.length} 題！`);
                                });
                            }}
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 border border-red-200"
                        >
                            <span className="material-symbols-outlined text-[16px]">delete</span> 刪除
                        </button>
                        <button 
                            disabled={selectedItems.length === 0}
                            onClick={() => setMoveItemTarget(selectedItems)}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[16px]">drive_file_move</span> 移動
                        </button>
                    </div>
                </div>
            )}

            {/* ✨ 新增 2：直覺化新增資料夾視窗 */}
            {showFolderModal && (
                <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-[250] p-4 backdrop-blur-sm">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl transform transition-all border border-stone-200 dark:border-stone-700">
                        <h3 className="text-xl font-black mb-4 dark:text-white flex justify-between items-center">
                            建立新資料夾
                            <button onClick={() => setShowFolderModal(false)} className="text-gray-400 hover:text-red-500"><span className="material-symbols-outlined">close</span></button>
                        </h3>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">account_tree</span> 建立於哪裡？ (可選)</label>
                            <select 
                                value={parentFolder} 
                                onChange={(e) => setParentFolder(e.target.value)}
                                className="w-full p-3 border-2 border-gray-200 dark:border-stone-600 bg-white dark:bg-stone-700 rounded-xl outline-none font-bold text-stone-800 dark:text-white focus:border-indigo-400 transition-colors cursor-pointer"
                            >
                                <option value="">📁 (無) 建立為主資料夾</option>
                                {folders.filter(f => f !== '全部' && f !== '未分類').map(f => (
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
                            />
                        </div>

                        <button 
                            onClick={() => {
                                const cleanName = newFolderName.trim().replace(/\//g, ''); // 防呆：移除手動打的斜線
                                if (!cleanName) return showAlert('名稱不能為空喔！');
                                const finalPath = parentFolder ? `${parentFolder}/${cleanName}` : cleanName;
                                
                                if (folders.includes(finalPath)) return showAlert('這個資料夾已經存在囉！');

                                window.db.collection('users').doc(user.uid).set({
                                    wrongBookFolders: window.firebase.firestore.FieldValue.arrayUnion(finalPath)
                                }, { merge: true }).then(() => {
                                    setCurrentFolder(finalPath);
                                    setShowFolderModal(false);
                                    showAlert(`[成功] 已建立「${finalPath}」！`);
                                });
                            }}
                            className="w-full bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 font-black py-3 rounded-xl hover:bg-stone-700 transition-colors shadow-md flex justify-center items-center gap-2"
                        >
                            <span className="material-symbols-outlined">add_circle</span> 確認建立
                        </button>
                    </div>
                </div>
            )}

            {/* ✨ 新增 3：圖形化移動錯題大視窗 */}
            {moveItemTarget && (
                <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-[250] p-4 backdrop-blur-sm">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl transform transition-all border border-stone-200 dark:border-stone-700 flex flex-col max-h-[80vh]">
                        <h3 className="text-xl font-black mb-1 dark:text-white flex justify-between items-center">
                            移動錯題至...
                            <button onClick={() => setMoveItemTarget(null)} className="text-gray-400 hover:text-red-500 bg-gray-100 dark:bg-stone-700 rounded-full p-1"><span className="material-symbols-outlined block">close</span></button>
                        </h3>
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-4 bg-indigo-50 dark:bg-indigo-900/30 inline-block px-3 py-1 rounded-full self-start">
                            即將移動 {moveItemTarget.length} 題
                        </p>

                        <div className="flex-1 overflow-y-auto custom-scrollbar border-2 border-stone-100 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-900 p-2 space-y-1">
                            {folders.filter(f => f !== '全部').map(f => (
                                <button 
                                    key={f}
                                    onClick={async () => {
                                        const targetFolder = f;
                                        const batch = window.db.batch();
                                        moveItemTarget.forEach(id => {
                                            const ref = window.db.collection('users').doc(user.uid).collection('wrongBook').doc(id);
                                            batch.update(ref, { folder: targetFolder });
                                        });
                                        await batch.commit();
                                        setMoveItemTarget(null);
                                        if (batchMode) setSelectedItems([]); // 批次移動完後自動清空打勾
                                        setLocalToast(`[成功] 已將 ${moveItemTarget.length} 題移動至 ${targetFolder}`);
                                        setTimeout(() => setLocalToast(null), 2000);
                                    }}
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

        </div>
    );
}

window.WrongBookDashboard = WrongBookDashboard;