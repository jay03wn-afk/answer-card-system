// --- 新增：錯題編輯 Modal ---
function WrongBookModal({ title, initialData, onClose, onSave, showAlert }) {
    const [folder, setFolder] = useState(initialData?.folder || '未分類');
    const [newFolder, setNewFolder] = useState('');
    const [qText, setQText] = useState(initialData?.qText || '');
    const [qHtml] = useState(initialData?.qHtml || ''); // ✨ 新增：富文本唯讀狀態
    const [qImage, setQImage] = useState(initialData?.qImage || null);
    const [nText, setNText] = useState(initialData?.nText || '');
    const [nImage, setNImage] = useState(initialData?.nImage || null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        const finalFolder = (folder === '新增資料夾' ? newFolder.trim() : folder) || '未分類';
        setIsSaving(true);
        // ✨ 修改：儲存時一併帶上 qHtml
        await onSave({ folder: finalFolder, qText: qText.trim(), qHtml, qImage, nText: nText.trim(), nImage });
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-lg no-round shadow-2xl transform transition-all max-h-[90dvh] overflow-y-auto custom-scrollbar border-t-4 border-black dark:border-gray-500">
                <h3 className="font-black text-xl mb-4 flex justify-between items-center dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                    <span>{title}</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 font-bold transition-colors">✖</button>
                </h3>
                
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">📁 選擇資料夾</label>
                    <select value={folder} onChange={e => setFolder(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none text-sm mb-2">
                        {initialData?.userFolders && initialData.userFolders.map(f => <option key={f} value={f}>{f}</option>)}
                        {!initialData?.userFolders?.includes('未分類') && <option value="未分類">未分類</option>}
                        <option value="新增資料夾">+ 新增資料夾</option>
                    </select>
                    {folder === '新增資料夾' && (
                        <input type="text" placeholder="輸入新資料夾名稱..." value={newFolder} onChange={e => setNewFolder(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-black dark:text-white no-round outline-none text-sm" />
                    )}
                </div>

               {/* ✨ 智慧判斷：如果有富文本，就顯示唯讀排版；如果沒有，就維持舊版的純文字編輯器 */}
                {qHtml ? (
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">📝 題目內容 (系統自動擷取，原稿保護中不可編輯)</label>
                        <div className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-3 max-h-48 overflow-y-auto custom-scrollbar no-round shadow-inner">
                            <style dangerouslySetInnerHTML={{__html: `
                                .modal-rich-text { word-break: break-word; white-space: pre-wrap; font-size: 0.875rem; line-height: 1.6; }
                                .modal-rich-text * { color: inherit !important; background-color: transparent !important; }
                                /* ✨ 修復：強制富文本內的圖片與畫布保持正常比例與白底，避免縮小 */
                                .modal-rich-text img {
                                    display: block !important;
                                    max-width: 100% !important;
                                    height: auto !important;
                                    margin: 10px 0 !important;
                                    background-color: #ffffff !important;
                                    opacity: 1 !important;
                                    visibility: visible !important;
                                    border-radius: 4px;
                                }
                                .modal-rich-text canvas {
                                    background-color: #ffffff !important;
                                }
                            `}} />
                            <div className="modal-rich-text text-black dark:text-white font-medium" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml(qHtml) }} />
                        </div>
                    </div>
                ) : (
                    <RichInput label="📝 題目內容" text={qText} setText={setQText} image={qImage} setImage={setQImage} maxLength={300} showAlert={showAlert} />
                )}
                
                <RichInput label="💡 我的筆記 / 詳解" text={nText} setText={setNText} image={nImage} setImage={setNImage} maxLength={300} showAlert={showAlert} />
                
                <div className="flex justify-end space-x-3 mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <button onClick={onClose} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-6 py-2 no-round font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-black dark:bg-gray-200 text-white dark:text-black px-8 py-2 no-round font-black text-sm hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors shadow-md">
                        {isSaving ? '儲存中...' : '💾 儲存'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- 錯題整理組件 ---
function WrongBookDashboard({ user, showAlert, showConfirm, showPrompt, onContinueQuiz }) {
    const [wrongItems, setWrongItems] = useState([]);
    const [customFolders, setCustomFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [currentFolder, setCurrentFolder] = useState('全部');
    const [previewImage, setPreviewImage] = useState(null);

    const [isJumping, setIsJumping] = useState(false);
    const [visibleLimit, setVisibleLimit] = useState(20); 
    const [isSyncingWb, setIsSyncingWb] = useState(false);

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
                clearTimeout(fallbackTimer);
            });
            
        const unsubUser = window.db.collection('users').doc(user.uid).onSnapshot(doc => {
            if (doc.exists && doc.data().wrongBookFolders && isMounted) {
                setCustomFolders(doc.data().wrongBookFolders);
            }
        });

        return () => { isMounted = false; clearTimeout(fallbackTimer); unsubItems(); unsubUser(); };
    }, [user.uid, visibleLimit]);

    const folders = ['全部', ...new Set([...customFolders, ...wrongItems.map(item => item.folder || '未分類')])];
    const filteredItems = currentFolder === '全部' ? wrongItems : wrongItems.filter(item => (item.folder || '未分類') === currentFolder);

    useEffect(() => {
        setVisibleLimit(20); 
    }, [currentFolder]);

    const displayedItems = filteredItems.slice(0, visibleLimit);

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
                showAlert(`✅ 已刪除「${currentFolder}」資料夾！`);
            } catch (err) {
                showAlert('刪除失敗：' + err.message);
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
                if (snapshot.empty) return showAlert(`「${currentFolder}」內已經沒有錯題了！`);

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
                
                showAlert(`✅ 已成功清空「${currentFolder}」的所有錯題！`);
            } catch (err) {
                showAlert('清空失敗：' + err.message);
            }
        });
    };

    const handleGoToQuiz = async (quizId) => {
        setIsJumping(true); 
        try {
            let doc = await window.db.collection('users').doc(user.uid).collection('quizzes').doc(quizId).get({ source: 'server' }).catch(() => null);
            if (!doc || !doc.exists) {
                doc = await window.db.collection('users').doc(user.uid).collection('quizzes').doc(quizId).get({ source: 'cache' });
            }
            if(doc && doc.exists) {
                const data = doc.data();
                setTimeout(() => {
                    onContinueQuiz({ id: doc.id, ...data, forceStep: 'results' });
                }, 50);
            } else {
                showAlert('❌ 找不到原始試卷，可能已被刪除！');
                setIsJumping(false);
            }
        } catch(e) {
            showAlert('❌ 載入失敗：' + e.message);
            setIsJumping(false);
        }
    };

    const handleRetakeWrong = async () => {
        setIsJumping(true); 
        try {
            // 直接從資料庫抓取該分類的所有題目，不受畫面載入限制
            let query = window.db.collection('users').doc(user.uid).collection('wrongBook');
            if (currentFolder !== '全部') {
                query = query.where('folder', '==', currentFolder);
            }
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                setIsJumping(false);
                return showAlert("此分類目前沒有錯題可供測驗喔！");
            }

            // 將抓回來的資料轉為陣列，並在前端依時間排序 (避免 Firestore 缺少索引報錯)
            let allWrongItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allWrongItems.sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return timeB - timeA; 
            });

            setIsJumping(false); 

            showConfirm(`確定要針對「${currentFolder}」的 ${allWrongItems.length} 題（包含未顯示的題目）進行錯題重測嗎？\n\n系統將自動為您生成一份專屬試卷，並開啟沉浸式作答模式，交卷後的詳解將會顯示您當初填寫的錯題筆記！`, async () => {
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

                    const docRef = await window.db.collection('users').doc(user.uid).collection('quizzes').add({
                        testName: `[錯題重測] ${currentFolder}`,
                        numQuestions: allWrongItems.length,
                        questionHtml: qHtml,
                        explanationHtml: eHtml,
                        correctAnswersInput: cleanKey,
                        publishAnswers: true,
                        userAnswers: emptyAnswers,
                        starred: emptyStarred,
                        folder: '錯題重測', 
                        viewMode: 'interactive', 
                        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    });

                    if (!customFolders.includes('錯題重測')) {
                        await window.db.collection('users').doc(user.uid).set({
                            wrongBookFolders: window.firebase.firestore.FieldValue.arrayUnion('錯題重測')
                        }, { merge: true });
                    }

                    const docSnap = await docRef.get();
                    onContinueQuiz({ id: docSnap.id, ...docSnap.data(), forceStep: 'answering' });

                } catch (e) {
                    showAlert('生成錯題重測失敗：' + e.message);
                    setIsJumping(false);
                }
            });
        } catch (e) {
            showAlert('讀取題庫失敗：' + e.message);
            setIsJumping(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 pt-0 h-full overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b-2 border-black dark:border-white pb-2 shrink-0">
                <h1 className="text-2xl font-black dark:text-white flex items-center">
                    📓 錯題整理
                </h1>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">專屬你的弱點突破筆記本</p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-4 shrink-0 w-full min-w-0">
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 flex-grow w-full min-w-0">
                    {folders.map(f => (
                        <button key={f} onClick={() => setCurrentFolder(f)} className={`px-4 py-1.5 font-bold text-sm no-round whitespace-nowrap transition-colors shrink-0 ${currentFolder === f ? 'bg-black dark:bg-gray-200 text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'}`}>
                            {f === '全部' ? '🔍 ' : '📁 '} {f}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 shrink-0 w-full md:w-auto min-w-0">
                   <button 
                        onClick={handleRetakeWrong}
                        className="px-3 py-1.5 text-sm font-bold bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 no-round whitespace-nowrap transition-colors shrink-0"
                    >
                        📝 錯題重測 (全部)
                    </button><button 
                       onClick={handleRetakeWrong}
                        className="px-3 py-1.5 text-sm font-bold bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 no-round whitespace-nowrap transition-colors shrink-0"
                    >
                        📝 錯題重測 ({filteredItems.length}題)
                    </button>
                    <button 
                        onClick={() => {
                            showPrompt("請輸入新的錯題資料夾名稱：", "", (folderName) => {
                                const cleanName = folderName?.trim();
                                if (cleanName && !folders.includes(cleanName)) {
                                    window.db.collection('users').doc(user.uid).set({
                                        wrongBookFolders: window.firebase.firestore.FieldValue.arrayUnion(cleanName)
                                    }, { merge: true }).then(() => {
                                        setCurrentFolder(cleanName);
                                        showAlert(`✅ 已成功建立錯題資料夾「${cleanName}」！`);
                                    });
                                } else if (folders.includes(cleanName)) {
                                    showAlert('❌ 資料夾已存在！');
                                }
                            });
                        }} 
                        className="px-3 py-1.5 text-sm font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 no-round whitespace-nowrap transition-colors shrink-0"
                    >
                        + 新增錯題資料夾
                    </button>

                    {/* ✨ 新增：一鍵清空錯題功能 */}
                    {currentFolder !== '全部' && (
                        <button 
                            onClick={handleClearWrongBookFolder} 
                            className="px-3 py-1.5 text-sm font-bold bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800 no-round whitespace-nowrap transition-colors shrink-0"
                        >
                            🧹 清空分類
                        </button>
                    )}
                    
                    {/* ✨ 新增：刪除錯題資料夾功能 */}
                    {currentFolder !== '全部' && currentFolder !== '未分類' && (
                        <button 
                            onClick={handleDeleteWrongBookFolder} 
                            className="px-3 py-1.5 text-sm font-bold bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 no-round whitespace-nowrap transition-colors shrink-0"
                        >
                            🗑️ 刪除資料夾
                        </button>
                    )}
                </div>
            </div>
            
           {loading && wrongItems.length === 0 ? <LoadingSpinner text="載入錯題中..." /> : 
             filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 no-round text-center shadow-sm">
                    <div className="text-6xl mb-4">📓</div>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">目前沒有錯題紀錄</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-bold max-w-md leading-relaxed mt-2">
                        這是一件好事，代表你目前百發百中！<br/><br/>
                        下次如果在測驗中遇到錯題，只要在「交卷後的解答檢視頁面」，點擊題目右下角的 <span className="bg-gray-100 dark:bg-gray-700 text-red-500 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-sm">📓 收錄錯題</span>，就可以把題目收藏到這裡隨時複習喔！
                    </p>
                </div>
             ) :
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                 {displayedItems.map(item => (
                     <div key={item.id} className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 shadow-sm relative no-round hover:shadow-md transition-shadow">
                         <button onClick={() => handleDelete(item.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold z-10">✖</button>
                         <div className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-2 pr-6 flex items-center justify-between">
                            <span className="truncate">出自: {cleanQuizName(item.quizName)} - 第 {item.questionNum} 題</span>
                            {item.quizId && (
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGoToQuiz(item.quizId); }} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline shrink-0 ml-2">
                                    🔗 檢視試題
                                </button>
                            )}
                         </div>
                         <div className="flex space-x-4 mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                            <span className="text-sm font-bold text-red-500">你的答案: {item.userAns || '未填'}</span>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">正確答案: {item.correctAns}</span>
                         </div>
                         
                         {(item.qHtml || item.qText || item.qImage) && (
                             <div className="mb-3">
                                 <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">📝 題目</p>
                                 <div className="bg-white dark:bg-gray-900 p-3 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap border-l-4 border-blue-500 font-bold shadow-sm">
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
                                                     background-color: #ffffff !important;
                                                     opacity: 1 !important;
                                                     visibility: visible !important;
                                                     border-radius: 4px;
                                                 }
                                                 .wb-rich-text canvas {
                                                     background-color: #ffffff !important;
                                                 }
                                             `}} />
                                             <div className="wb-rich-text" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml(item.qHtml) }} />
                                         </>
                                     ) : (
                                         item.qText && <p>{item.qText}</p>
                                     )}
                                     {item.qImage && <img src={item.qImage} onClick={() => setPreviewImage(item.qImage)} className="mt-2 max-h-[300px] w-full object-contain border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity bg-white" alt="題目附圖" title="點擊放大" />}
                                 </div>
                             </div>
                         )}

                         {(item.nText || item.note || item.nImage) && (
                             <div className="mb-3">
                                 <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">💡 筆記</p>
                                 <div className="bg-yellow-50 dark:bg-gray-900 p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border-l-4 border-yellow-400 font-bold">
                                     {(item.nText || item.note) && <p>{item.nText || item.note}</p>}
                                    {item.nImage && <img src={item.nImage} onClick={() => setPreviewImage(item.nImage)} className="mt-2 max-h-[300px] w-full object-contain border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity bg-white" alt="筆記附圖" title="點擊放大" />}
                                 </div>
                             </div>
                         )}

                         <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                             <div className="flex items-center gap-1">
                                 <span className="text-[10px] text-gray-400 font-bold">📁</span>
                                 <select 
                                     value={item.folder || '未分類'} 
                                     onChange={(e) => {
                                         window.db.collection('users').doc(user.uid).collection('wrongBook').doc(item.id).update({
                                             folder: e.target.value
                                         }).then(() => showAlert('✅ 分類已更新！'));
                                     }}
                                     className="text-[10px] text-gray-600 dark:text-gray-300 font-bold px-1 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 outline-none cursor-pointer"
                                 >
                                     {folders.filter(f => f !== '全部').map(f => (
                                         <option key={f} value={f}>{f}</option>
                                     ))}
                                 </select>
                             </div>
                             <button onClick={() => setEditingItem(item)} className="text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors">✏️ 編輯內容</button>
                         </div>
                     </div>
                 ))}
             </div>
            }
            
            {!loading && wrongItems.length >= visibleLimit && (
                <div className="flex justify-center mt-2 mb-10">
                    <button 
                        onClick={() => setVisibleLimit(prev => prev + 20)} 
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-6 py-2 font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        {isSyncingWb ? <><div className="w-4 h-4 border-2 border-gray-400 border-t-black dark:border-t-white rounded-full animate-spin"></div>同步最新解答中...</> : '⬇️ 載入更多錯題...'}
                    </button>
                </div>
            )}

            {previewImage && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 cursor-zoom-out" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} className="max-w-full max-h-[90vh] object-contain shadow-2xl" alt="放大預覽" />
                    <button className="absolute top-4 right-4 text-white text-3xl font-bold bg-black/50 w-12 h-12 rounded-full flex items-center justify-center hover:bg-black/80">✖</button>
                </div>
            )}

            {isJumping && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[200] p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 w-full max-w-sm no-round shadow-2xl text-center border-t-8 border-indigo-500 animate-fade-in">
                        <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black mb-2 dark:text-white">🚀 正在載入試卷...</h3>
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
                        showAlert('✅ 修改成功！');
                        setEditingItem(null);
                    }}
                    showAlert={showAlert}
                />
            )}
        </div>
    );
}
