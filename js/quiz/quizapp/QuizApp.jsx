const { useState, useEffect, useRef } = React;

// 從全域 (window) 拿取 components.jsx 提供的小工具
const { 
    cleanQuizName, renderTestName, parseSmilesToHtml, LoadingSpinner, 
    ContentEditableEditor, AnswerGridInput, SpecificAnswerGridInput, HelpTooltip, 
    safeDecompress, processQuestionContent, extractSpecificContent, extractSpecificExplanation 
} = window;

// ✨ 新增：題庫系統專用留言板 (獨立題庫)
function QlibQuestionDiscussion({ questionId, currentUser, userProfile }) {
    const { useState, useEffect } = React;
    const [comments, setComments] = useState([]);
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!questionId) return;
        const unsub = window.db.collection('publicQlib_discussions').doc(questionId)
            .collection('comments').orderBy('timestamp', 'asc')
            .onSnapshot(snap => {
                setComments(snap.docs.map(d => ({id: d.id, ...d.data()})));
            });
        return () => unsub();
    }, [questionId]);

    const handleSubmit = async () => {
        if (!text.trim()) return;
        if (text.length > 300) return alert('留言字數不可超過 300 字！');
        setIsSubmitting(true);
        try {
            await window.db.collection('publicQlib_discussions').doc(questionId).collection('comments').add({
                userId: currentUser?.uid || 'anonymous',
                userName: userProfile?.displayName || '匿名玩家',
                text: text.trim(),
                timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
            });
            setText('');
        } catch(e) { alert("留言失敗：" + e.message); }
        setIsSubmitting(false);
    };

    return (
        <div className="mt-6 border-t border-stone-200 dark:border-stone-700 pt-4">
            <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">forum</span> 全域題庫討論區 ({comments.length})
            </h4>
            <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {comments.length === 0 && <p className="text-xs text-gray-400 font-bold">目前還沒有人留言，來分享您的解題思路吧！</p>}
                {comments.map(c => (
                    <div key={c.id} className="bg-stone-50 dark:bg-stone-900/50 p-3 rounded-xl border border-stone-100 dark:border-stone-700">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-xs text-stone-700 dark:text-stone-300">{c.userName}</span>
                            <span className="text-[10px] text-gray-400">{c.timestamp?.toDate().toLocaleString('zh-TW')}</span>
                        </div>
                        <p className="text-sm text-stone-800 dark:text-stone-200 whitespace-pre-wrap">{c.text}</p>
                    </div>
                ))}
            </div>
            <div className="bg-stone-50 dark:bg-stone-900/50 p-3 rounded-xl border border-stone-200 dark:border-stone-700 flex flex-col gap-2 shadow-inner">
                <textarea value={text} onChange={e => setText(e.target.value)} maxLength={300} placeholder="分享你的解題思路或疑問 (上限300字)..." className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-2 text-sm outline-none resize-none h-16 custom-scrollbar dark:text-white focus:border-indigo-400" />
                <div className="flex justify-end items-center">
                    <span className={`text-xs mr-3 font-bold ${text.length > 250 ? 'text-rose-500' : 'text-gray-400'}`}>{text.length}/300</span>
                    <button onClick={handleSubmit} disabled={isSubmitting || !text.trim()} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors shadow-sm">
                        {isSubmitting ? '傳送中...' : '送出留言'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ✨ 新增：公開試題專用留言板 (獨立元件)
function PublicQuestionDiscussion({ examId, questionNum, currentUser, userProfile }) {
    const { useState, useEffect } = React;
    const [comments, setComments] = useState([]);
    const [text, setText] = useState('');
    const [imgFile, setImgFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!examId) return;
        const unsub = window.db.collection('publicExams').doc(examId)
            .collection('discussions').where('questionNum', '==', questionNum)
            .orderBy('timestamp', 'asc')
            .onSnapshot(snap => {
                setComments(snap.docs.map(d => ({id: d.id, ...d.data()})));
            });
        return () => unsub();
    }, [examId, questionNum]);

    const handleSubmit = async () => {
        if (!text.trim() && !imgFile) return;
        if (text.length > 500) return alert('留言字數不可超過 500 字！');
        setIsSubmitting(true);
        try {
            let imgUrl = null;
            if (imgFile) {
                imgUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.crossOrigin = "Anonymous";
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let w = img.width, h = img.height;
                            const MAX = 800;
                            if (w > h && w > MAX) { h *= MAX/w; w = MAX; }
                            else if (h > MAX) { w *= MAX/h; h = MAX; }
                            canvas.width = w; canvas.height = h;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, w, h);
                            canvas.toBlob(async (blob) => {
                                if(!blob) return reject("Failed");
                                const path = `publicDiscussions/${examId}/${currentUser.uid}_${Date.now()}.jpg`;
                                const ref = window.storage.ref(path);
                                await ref.put(blob);
                                resolve(await ref.getDownloadURL());
                            }, 'image/jpeg', 0.6);
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(imgFile);
                });
            }

            await window.db.collection('publicExams').doc(examId).collection('discussions').add({
                userId: currentUser.uid,
                userName: userProfile.displayName || '匿名',
                questionNum,
                text: text.trim(),
                imageUrl: imgUrl,
                timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
            });
            setText(''); setImgFile(null);
        } catch(e) {
            console.error(e);
            alert("留言失敗：" + e.message);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="mt-6 border-t border-stone-200 dark:border-stone-700 pt-4">
            <h4 className="font-bold text-sm text-purple-600 dark:text-purple-400 mb-4 flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">forum</span> 大家來討論 ({comments.length})
            </h4>
            <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {comments.length === 0 && <p className="text-xs text-gray-400 font-bold">目前還沒有人留言，來搶頭香吧！</p>}
                {comments.map(c => (
                    <div key={c.id} className="bg-stone-50 dark:bg-stone-900/50 p-3 rounded-xl border border-stone-100 dark:border-stone-700">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-xs text-stone-700 dark:text-stone-300">{c.userName}</span>
                            <span className="text-[10px] text-gray-400">{c.timestamp?.toDate().toLocaleString('zh-TW')}</span>
                        </div>
                        {c.text && <p className="text-sm text-stone-800 dark:text-stone-200 whitespace-pre-wrap">{c.text}</p>}
                        {c.imageUrl && <img src={c.imageUrl} className="mt-2 max-w-[200px] rounded-lg border border-stone-200 dark:border-stone-700 cursor-zoom-in" onClick={() => window.open(c.imageUrl, '_blank')} />}
                    </div>
                ))}
            </div>
            <div className="bg-stone-50 dark:bg-stone-900/50 p-3 rounded-xl border border-stone-200 dark:border-stone-700 flex flex-col gap-2">
                <textarea value={text} onChange={e => setText(e.target.value)} maxLength={500} placeholder="分享你的解法或疑問 (上限500字)..." className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-2 text-sm outline-none resize-none h-16 custom-scrollbar dark:text-white" />
                <div className="flex justify-between items-center">
                    <input type="file" accept="image/*" id={`img-${questionNum}`} className="hidden" onChange={e => setImgFile(e.target.files[0])} />
                    <label htmlFor={`img-${questionNum}`} className="text-xs font-bold text-gray-500 hover:text-purple-600 cursor-pointer flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">image</span> {imgFile ? '已選取圖片' : '上傳圖片'}
                    </label>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors shadow-sm">
                        {isSubmitting ? '傳送中...' : '送出留言'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function QuizApp(props) {
    // 呼叫我們剛剛建立的大腦，把所有的狀態跟功能「借」過來用
    const { currentUser, userProfile, showAlert, showConfirm, showPrompt, tutorialStep, setTutorialStep } = props;

    // ✨ 新增：結果頁沉浸模式目前題號
    const [resultInteractiveIdx, setResultInteractiveIdx] = useState(0);

     
    
    // ✨ 新增：將平坦的資料夾陣列轉換為樹狀結構，並管理展開狀態
    const [expandedFolders, setExpandedFolders] = useState({});
    
    // 使用 useMemo 確保不會每次渲染都重新計算
    const folderTree = React.useMemo(() => {
        // 從 props 取出 userFolders，如果沒有就預設一個空陣列
        const foldersList = props.userFolders || (userProfile?.folders ? ['未分類', ...userProfile.folders] : ['未分類']);
        const uniqueFolders = Array.from(new Set(foldersList));
        
        const tree = {};
        uniqueFolders.forEach(f => {
            if (f === '未分類') return;
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
    }, [props.userFolders, userProfile?.folders]);

    // ✨ 新增：遞迴渲染樹狀結構的 UI 函式
    const renderFolderTree = (nodes, level = 0, currentSelected, onSelect) => {
        return Object.values(nodes).sort((a, b) => a.name.localeCompare(b.name)).map(node => {
            const hasChildren = Object.keys(node.children).length > 0;
            const isExpanded = expandedFolders[node.path];
            const isSelected = currentSelected === node.path;

            return (
                <div key={node.path} className="flex flex-col w-full">
                    <div 
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800' : 'hover:bg-stone-100 dark:hover:bg-gray-700 text-stone-700 dark:text-gray-300 font-medium'}`}
                        style={{ marginLeft: `${level * 1.2}rem` }}
                        onClick={(e) => {
                            e.preventDefault();
                            onSelect(node.path);
                        }}
                    >
                        {hasChildren ? (
                            <span 
                                className="material-symbols-outlined text-[20px] cursor-pointer text-gray-400 hover:text-amber-500"
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    e.preventDefault();
                                    setExpandedFolders(p => ({...p, [node.path]: !p[node.path]})); 
                                }}
                            >
                                {isExpanded ? 'arrow_drop_down' : 'arrow_right'}
                            </span>
                        ) : (
                            <span className="w-[20px]"></span> 
                        )}
                        <span className={`material-symbols-outlined text-[18px] ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-amber-500'}`}>{hasChildren && isExpanded ? 'folder_open' : 'folder'}</span>
                        <span className="text-sm truncate">{node.name}</span>
                    </div>
                    {hasChildren && isExpanded && (
                        <div className="flex flex-col w-full mt-0.5 gap-0.5 border-l-2 border-stone-200 dark:border-stone-700 ml-5 pl-1">
                            {renderFolderTree(node.children, 0, currentSelected, onSelect)}
                        </div>
                    )}
                </div>
            );
        });
    };

    const {
        lastExtractValRef,
        showHelp, setShowHelp, isAdmin, isQuizLoading, backgroundUpdateReady, latestContent,
        quizId, setQuizId, step, setStep, testName, setTestName, subtitle, setSubtitle, numQuestions, setNumQuestions,
        maxScore, setMaxScore, roundScore, setRoundScore, taskType, setTaskType, examYear, setExamYear,
        examSubject, setExamSubject, examTag, setExamTag, examRange, setExamRange, usedSubjects, usedTags,
        userAnswers, setUserAnswers, starred, setStarred, notes, setNotes, peekedAnswers, setPeekedAnswers,
        allowPeek, setAllowPeek, correctAnswersInput, setCorrectAnswersInput, shortAnswersInput, setShortAnswersInput,
        results, setResults, questionFileUrl, setQuestionFileUrl, questionText, setQuestionText,
        questionHtml, setQuestionHtml, explanationHtml, setExplanationHtml, folder, setFolder,
        independentQuestions, setIndependentQuestions, globalStats,
        shortCode, setShortCode, pdfZoom, setPdfZoom, publishAnswersToggle, setPublishAnswersToggle,
        showAiModal, setShowAiModal, aiSubject, setAiSubject, aiCustomSubject, setAiCustomSubject,
        aiPharmRatio, setAiPharmRatio, aiNum, setAiNum, aiScope, setAiScope, aiFileContent, setAiFileContent,
        aiFileName, setAiFileName, isAiGenerating, setIsAiGenerating, isAiFileDragging, setIsAiFileDragging,
        aiDifficultyMode, setAiDifficultyMode, aiSimpleRatio, setAiSimpleRatio, aiMediumRatio, setAiMediumRatio,
        aiHardRatio, setAiHardRatio, creatorSuggestions, setCreatorSuggestions,
        isAiGrading, setIsAiGrading, gradingProgress, setGradingProgress, aiFeedback, setAiFeedback,
        showDiscussion, setShowDiscussion, discussions, setDiscussions, commentInput, setCommentInput,
        commentQNum, setCommentQNum, commentFile, setCommentFile, isSubmittingComment, setIsSubmittingComment,
        inputType, setInputType, hasTimer, setHasTimer, timeLimit, setTimeLimit, displayTime, setDisplayTime,
        isTimeUp, setIsTimeUp, syncTrigger, setSyncTrigger, layoutMode, setLayoutMode, splitRatio, setSplitRatio,
        viewMode, setViewMode, collapsedSections, setCollapsedSections, currentInteractiveIndex, setCurrentInteractiveIndex,
        showQuestionGrid, setShowQuestionGrid, immersiveTextSize, setImmersiveTextSize, splitTextSize, setSplitTextSize,
        customFontFamily, setCustomFontFamily, lineHeight, setLineHeight, highlightColor, setHighlightColor, // ✨ 接收新增狀態
        previewLightboxImg, setPreviewLightboxImg, eliminatedOptions, setEliminatedOptions,
        showSettingsModal, setShowSettingsModal, quizSettings, setQuizSettings, peekConfirmIdx, setPeekConfirmIdx,
        isDragging, setIsDragging, previewOpen, setPreviewOpen, splitContainerRef,
        showOnlyWrong, setShowOnlyWrong, showOnlyStarred, setShowOnlyStarred, showOnlyNotes, setShowOnlyNotes,
        showShareScoreModal, setShowShareScoreModal, syncStatus, setSyncStatus, isCreating, setIsCreating,
        isRegrading, setIsRegrading, wrongRetestState, setWrongRetestState, wrongBookAddingItem, setWrongBookAddingItem, loadingWrongBookNum, setLoadingWrongBookNum,
        explanationModalItem, setExplanationModalItem, isEditLoading, setIsEditLoading, taskScores, setTaskScores,
        parsedQuestionTypes, parsedInteractiveQuestions, starredIndices, canSeeAnswers, isShared, isTask, userFolders, initialRecord,
        toggleSubject, toggleTag, handleDragStart, handleSaveProgress, onBackToDashboard,
        handleStartTest, handleRetake, handleStartWrongRetest, handleWrongRetestPeek, handleSaveEdit, handleBackFromEdit, handleAnswerSelect,
        executePeek, handlePeek, toggleStar, handleGrade, handleManualRegrade, handleSubmitClick,
        handleSendSuggestion, handleUploadComment, handleResetProgress, handleAddToWrongBook,
        shareScoreToFriend, scrollToQuestion, handleRichTextClick, toggleSection, handleProcessAiFile, handleGenerateAI, quizHistory
    } = window.useQuizState(props);

    // ✨ 新增：螢光筆標記功能 (支援自選顏色與取消標記)
    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount || selection.isCollapsed) return;
        
        // 確保只在題目內標記
        const node = selection.anchorNode;
        if (!node || !node.parentElement) return;
        if (!node.parentElement.closest('.preview-rich-text')) return;

        const range = selection.getRangeAt(0);
        const parentSpan = node.parentElement;
        
        // 如果已經有標記，則取消標記
        if (parentSpan.tagName === 'SPAN' && parentSpan.classList.contains('highlight-marker')) {
            const textNode = document.createTextNode(parentSpan.textContent);
            parentSpan.parentNode.replaceChild(textNode, parentSpan);
            selection.removeAllRanges();
            return;
        }

        try {
            const fragment = range.extractContents();
            const span = document.createElement('span');
            span.style.backgroundColor = highlightColor;
            span.style.color = '#1a1a1a'; // 確保字體在螢光色上清晰可見
            span.className = 'highlight-marker rounded px-1 transition-colors cursor-pointer shadow-sm';
            span.appendChild(fragment);
            range.insertNode(span);
            selection.removeAllRanges();
        } catch(e) {
            console.warn("跨節點選取無法直接標記，請避開段落交界處畫記", e);
        }
    };

    // 綁定滑鼠放開事件來觸發螢光筆
    useEffect(() => {
        if (step !== 'answering') return;
        const container = document.querySelector('.quiz-answering-container');
        if (container) {
            container.addEventListener('mouseup', handleTextSelection);
            container.addEventListener('touchend', handleTextSelection); // 支援手機長按選取
        }
        return () => {
            if (container) {
                container.removeEventListener('mouseup', handleTextSelection);
                container.removeEventListener('touchend', handleTextSelection);
            }
        }
    }, [step, highlightColor]);

    // ✨ 新增：自動捲動避開遮罩重疊，並加入「自由作答」放行機制
    useEffect(() => {
        // ✨ 新增：每次進入作答模式時，自動跳轉到「最新還沒作答」的題目
        if (step === 'answering' && parsedInteractiveQuestions && parsedInteractiveQuestions.length > 0) {
            const firstUnansweredIdx = parsedInteractiveQuestions.findIndex(q => !userAnswers[q.globalIndex] && !(peekedAnswers && peekedAnswers[q.globalIndex]));
            if (firstUnansweredIdx !== -1 && currentInteractiveIndex === 0 && !userAnswers[parsedInteractiveQuestions[0].globalIndex]) {
                setCurrentInteractiveIndex(firstUnansweredIdx);
            }
        }

        // 1. 處理畫面滾動：將發光的按鈕自動捲動到畫面正中央，避免被教學對話框擋住
        if (tutorialStep > 0 && tutorialStep !== 99) {
            const timer = setTimeout(() => {
                const el = document.querySelector('.tutorial-highlight');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
            return () => clearTimeout(timer);
        }
        
        // 2. 處理自由作答放行 (99 -> 9)：當所有題目都作答完畢或已偷看，才顯示交卷按鈕
        if (tutorialStep === 99 && parsedInteractiveQuestions && parsedInteractiveQuestions.length > 0) {
            const answeredCount = parsedInteractiveQuestions.filter(q => userAnswers[q.globalIndex] || (peekedAnswers && peekedAnswers[q.globalIndex])).length;
            if (answeredCount === parsedInteractiveQuestions.length) {
                setTutorialStep(9);
            }
        }
    }, [step, tutorialStep, userAnswers, peekedAnswers, parsedInteractiveQuestions, setTutorialStep]);

   // ✨ 新增：試卷尚未載入完成前，顯示載入動畫
    if (isQuizLoading) return (
        <div className="flex flex-col h-[100dvh] items-center justify-center bg-stone-50 dark:bg-stone-900 transition-colors">
            <div className="w-16 h-16 border-4 border-stone-200 dark:border-stone-700 border-t-amber-500 dark:border-t-amber-400 rounded-full animate-spin mb-6 shadow-sm"></div>
            <div className="text-2xl font-black text-stone-800 dark:text-stone-100 mb-2 tracking-wide flex items-center gap-2">
                <span className="material-symbols-outlined text-[32px]">rocket_launch</span> 試卷載入中...
            </div>
            <div className="text-sm font-bold text-stone-500 dark:text-stone-400 animate-pulse bg-[#FCFBF7] dark:bg-stone-800 px-5 py-2 rounded-full shadow-sm border border-stone-200 dark:border-stone-700">
                正在為您解壓縮題目與詳解，請稍候
            </div>
        </div>
    );

    // ✨ 新增：背景更新完成的浮動通知組件
    const UpdateNotification = backgroundUpdateReady && (
        <div className="fixed top-20 left-1/2 transform -tranamber-x-1/2 z-[999]">
            <button
                onClick={() => {
                    setQuestionText(latestContent.questionText);
                    setQuestionHtml(latestContent.questionHtml);
                    setExplanationHtml(latestContent.explanationHtml);
                    setBackgroundUpdateReady(false);
                    showAlert("已為您載入最新版本的試卷內容！");
                }}
                className="bg-amber-500 text-white px-6 py-2.5 rounded-full shadow-xl font-bold flex items-center gap-2 hover:bg-amber-600 transition-all border border-amber-400 animate-bounce"
            >
                <span className="material-symbols-outlined text-[20px]">sync</span>
                <span>試題已在背景更新，點擊立即套用</span>
            </button>
        </div>
    );
    
   if (step === 'edit') return (
        <div className="flex flex-col min-h-[100dvh] items-center p-4 relative py-10 overflow-y-auto bg-stone-50 dark:bg-stone-900 transition-colors custom-scrollbar">
            {UpdateNotification}
            <button onClick={handleBackFromEdit} className="absolute top-6 left-6 text-sm text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 font-bold z-10 transition-colors">← 返回</button>
<div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 shadow-2xl rounded-3xl w-full max-w-6xl 2xl:max-w-[1400px] border border-stone-200 dark:border-stone-700 mt-6 transition-colors">
                <div className="flex justify-between items-center mb-6 border-b border-stone-200 dark:border-stone-700 pb-4">
                    <h2 className="font-black text-2xl text-stone-800 dark:text-stone-100 flex items-center gap-2"><span className="material-symbols-outlined text-[28px]">settings</span> 編輯試題設定</h2>
                    <button onClick={handleResetProgress} className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-800 border border-red-200 dark:border-red-800 text-sm flex items-center transition-colors shadow-sm">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        刪除此試卷
                    </button>
                </div>
                
               {/* 新增：測驗名稱編輯區塊 */}
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">測驗名稱</label>
                <input 
                    type="text" 
                    placeholder="請輸入測驗名稱..." 
                    className="w-full mb-4 p-3 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-black dark:focus:border-white text-sm" 
                    value={testName} 
                    onChange={e => setTestName(e.target.value)} 
                />
                
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">副標題 (選填)</label>
                <input 
                    type="text" 
                    placeholder="例如：112學年度期中考、某某老師命題" 
                    className="w-full mb-6 p-3 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-black dark:focus:border-white text-sm" 
                    value={subtitle || ''} 
                    onChange={e => setSubtitle(e.target.value)} 
                />
                
                {/* ✨ 任務牆屬性與標籤設定 (編輯模式) */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">測驗發布屬性</label>
                    <div className="flex flex-wrap gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold dark:text-white">
                            <input type="radio" checked={taskType==='normal'} onChange={()=>setTaskType('normal')} className="accent-black dark:accent-white" /> 一般測驗 (不公開)
                        </label>
                        {/* 國考與模擬考功能已轉移至公開試卷區 */}
                    </div>

                    {false && (
                        <div className="mt-4 border-t border-stone-200 dark:border-stone-700 pt-4 animate-fade-in">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">國考年份期數 (由新到舊排序)</label>
                            <input type="text" list="official-years" placeholder="例如: 114-1" value={examYear} onChange={e=>setExamYear(e.target.value)} className="w-full p-2 border border-amber-300 bg-amber-50 dark:bg-stone-800 text-stone-800 dark:text-white rounded-2xl text-sm font-bold" />
                            <datalist id="official-years">
                                {Array.from({length: 15}, (_, i) => 115 - i).flatMap(y => [`${y}-2`, `${y}-1`]).map(y => <option key={y} value={y} />)}
                            </datalist>
                        </div>
                    )}

                   {false && (
                        <div className="mt-4 border-t border-stone-200 dark:border-stone-700 pt-4 space-y-4 animate-fade-in">
                            {/* 科目多選區 */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">科目名稱 (可複選)</label>
                                <div className="flex flex-wrap gap-2">
                                    {usedSubjects.map(s => (
                                        <button key={s} onClick={() => toggleSubject(s)} className={`px-3 py-1.5 text-xs font-bold rounded-2xl border transition-colors ${examSubject.split(',').includes(s) ? 'bg-amber-600 border-amber-600 text-white' : 'bg-[#FCFBF7] dark:bg-stone-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                                            {examSubject.split(',').includes(s) ? '✓ ' : ''}{s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 標籤多選區 */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">試題來源標籤 (可複選)</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {usedTags.map(t => (
                                        <button key={t} onClick={() => toggleTag(t)} className={`px-3 py-1.5 text-xs font-bold rounded-2xl border transition-colors ${examTag.split(',').includes(t) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-[#FCFBF7] dark:bg-stone-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                                            {examTag.split(',').includes(t) ? '✓ ' : ''}{t}
                                        </button>
                                    ))}
                                </div>
                                <input type="text" placeholder="手動輸入其他標籤 (多個標籤請用半形逗號 , 分隔)" value={examTag} onChange={e=>setExamTag(e.target.value)} className="w-full p-2 border border-indigo-300 bg-indigo-50 dark:bg-stone-800 text-stone-800 dark:text-white rounded-2xl text-sm font-bold" />
                            </div>

                            {/* 範圍自由輸入 */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">出題範圍 (自由填寫)</label>
                                <input type="text" placeholder="例如: 講義 P.1~P.50 或 全冊" value={examRange} onChange={e=>setExamRange(e.target.value)} className="w-full p-2 border border-amber-300 bg-amber-50 dark:bg-stone-800 text-stone-800 dark:text-white rounded-2xl text-sm font-bold" />
                            </div>
                        </div>
                    )}
                </div>
                
                {/* ✨ 新增：如果是題庫系統題目，顯示專屬保護介面，防止誤刪詳解與內容 */}
                {initialRecord.isIndependentQuestions ? (
                    <div className="mb-6 bg-cyan-50 dark:bg-stone-800 border-2 border-cyan-400 dark:border-cyan-700 rounded-2xl p-6 text-center shadow-sm">
                        <span className="material-symbols-outlined text-4xl text-cyan-500 mb-2">library_books</span>
                        <h3 className="text-lg font-black text-cyan-800 dark:text-cyan-300 mb-2">這是從題庫抽出的試卷</h3>
                        <p className="text-sm font-bold text-cyan-700 dark:text-gray-300">
                            為保證資料一致性，此試卷內容（題目、選項、詳解）由題庫系統統一管理。<br/>
                            若需修改內容，請前往「我的題庫」進行管理。<br/>
                            您仍可在此修改測驗名稱、計時與發布設定。
                        </p>
                    </div>
                ) : (() => {
                    const isHtml = inputType === 'richtext';
                    
                    // ✨ 智慧提取核心：全域自動歸位系統
                    const getParts = (text) => {
        let tempText = text || '';
        let sq = '', asq = '', exp = '', ans = '';
        const cleanBlock = (m) => m.trim();
        // 1. 提取標準答案 [ans]...[AnsEnd]

                        // 1. 提取標準答案 [ans]...[AnsEnd]
                        const ansRegex = /\[ans\]([\s\S]*?)\[AnsEnd\]/gi;
                        let match;
                        while ((match = ansRegex.exec(tempText)) !== null) {
                            ans += match[1] + ',';
                        }
                        if (ans) {
                            ans = ans.replace(/,+$/, '').trim();
                            tempText = tempText.replace(ansRegex, '');
                        }

                        // 2. 提取詳解 [A.xxx], [SA.xxx], [AS.xxx], [ASA.xxx]
                        const expRegex = /(?:<[^>]+>|\s)*\[(?:A|SA|AS|ASA)\.?0*\d+\][\s\S]*?(?=(?:<[^>]+>|\s)*\[(?:Q|SQ|ASQ|A|SA|AS|ASA)\.?0*\d+\]|\[ans\]|$)/gi;
                        let expMatches = tempText.match(expRegex);
                        if (expMatches) {
                            expMatches = Array.from(new Set(expMatches.map(cleanBlock)));
                            exp = expMatches.join(isHtml ? '<br><br>' : '\n\n');
                            tempText = tempText.replace(expRegex, '');
                        }

                        // 3. 提取簡答題 [SQ.xxx]
                        const sqRegex = /(?:<[^>]+>|\s)*\[SQ\.?0*\d+\][\s\S]*?(?=(?:<[^>]+>|\s)*\[(?:Q|SQ|ASQ|A|SA|AS|ASA)\.?0*\d+\]|$)/gi;
                        let sqMatches = tempText.match(sqRegex);
                        if (sqMatches) {
                            sqMatches = Array.from(new Set(sqMatches.map(cleanBlock))); // 去重複
                            sq = sqMatches.join(isHtml ? '<br><br>' : '\n\n');
                            tempText = tempText.replace(sqRegex, '');
                        }
                        
                        // 4. 提取問答題 [ASQ.xxx]
                        const asqRegex = /(?:<[^>]+>|\s)*\[ASQ\.?0*\d+\][\s\S]*?(?=(?:<[^>]+>|\s)*\[(?:Q|SQ|ASQ|A|SA|AS|ASA)\.?0*\d+\]|$)/gi;
                        let asqMatches = tempText.match(asqRegex);
                        if (asqMatches) {
                            asqMatches = Array.from(new Set(asqMatches.map(cleanBlock))); // 去重複
                            asq = asqMatches.join(isHtml ? '<br><br>' : '\n\n');
                            tempText = tempText.replace(asqRegex, '');
                        }
                        
                        // 清除多餘的殘留空行
                        if (isHtml) {
                            tempText = tempText.replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br><br>').replace(/^(?:<br\s*\/?>\s*)+|(?:<br\s*\/?>\s*)+$/gi, '').trim();
                        } else {
                            tempText = tempText.replace(/\n{3,}/g, '\n\n').trim();
                        }
                        
                        return { mcq: tempText, sq, asq, exp, ans };
                    };

                    const updateParts = (newMcq, newSq, newAsq) => {
                        const sep = isHtml ? '<br><br>' : '\n\n';
                        const res = [newMcq, newSq, newAsq].map(s=>s?.trim()).filter(Boolean).join(sep);
                        if (isHtml) setQuestionHtml(res); else setQuestionText(res);
                    };

                    const qParts = getParts(activeContent);
                    const eParts = getParts(explanationHtml);

                    const forceSyncUI = () => {
                        setTimeout(() => {
                            if (document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true') {
                                document.activeElement.blur();
                            }
                        }, 10);
                    };

                    const redistributeContent = (mcqVal, sqVal, asqVal) => {
                        const combined = [mcqVal, sqVal, asqVal].filter(Boolean).join(isHtml ? '<br><br>' : '\n\n');
                        const parsed = getParts(combined);
                        updateParts(parsed.mcq, parsed.sq, parsed.asq);
                        
                        // ✨ 將提取出的答案與詳解存入對應欄位
                        if (parsed.ans) {
                            setCorrectAnswersInput(prev => {
                                const newAns = prev ? prev + ',' + parsed.ans : parsed.ans;
                                return newAns.replace(/[^a-dA-DZz,]/g, '');
                            });
                        }
                        if (parsed.exp) {
                            setExplanationHtml(prev => prev ? prev + (isHtml ? '<br><br>' : '\n\n') + parsed.exp : parsed.exp);
                        }
                    };

                    const handleMainChange = (val) => {
                        if (val === lastExtractValRef.current.mcq) return; // ✨ 防重複觸發
                        lastExtractValRef.current.mcq = val;
                        
                        const pastedParsed = getParts(val);
                        redistributeContent(val, qParts.sq, qParts.asq);
                        if (pastedParsed.sq || pastedParsed.asq || pastedParsed.exp || pastedParsed.ans) forceSyncUI(); // 觸發即時消失
                    };
                    const handleSqChange = (val) => {
                        if (val === lastExtractValRef.current.sq) return;
                        lastExtractValRef.current.sq = val;
                        redistributeContent(qParts.mcq, val, qParts.asq);
                    };
                    const handleAsqChange = (val) => {
                        if (val === lastExtractValRef.current.asq) return;
                        lastExtractValRef.current.asq = val;
                        redistributeContent(qParts.mcq, qParts.sq, val);
                    };

                    const handleExpMainChange = (val) => {
                        if (val === lastExtractValRef.current.exp) return;
                        lastExtractValRef.current.exp = val;
                        let normalizedVal = val.replace(/\[SA\.?/gi, '[SQ.').replace(/\[ASA\.?/gi, '[ASQ.').replace(/\[AS\.?/gi, '[ASQ.');
                        let normalizedOldSq = (eParts.sq || '').replace(/\[SA\.?/gi, '[SQ.');
                        let normalizedOldAsq = (eParts.asq || '').replace(/\[ASA\.?/gi, '[ASQ.');
                        
                        const combined = [normalizedVal, normalizedOldSq, normalizedOldAsq].filter(Boolean).join(isHtml ? '<br><br>' : '\n\n');
                        const parsed = getParts(combined);
                        
                        const finalSq = parsed.sq.replace(/\[SQ/gi, '[SA');
                        const finalAsq = parsed.asq.replace(/\[ASQ/gi, '[ASA');
                        
                        const sep = isHtml ? '<br><br>' : '\n\n';
                        setExplanationHtml([parsed.mcq, finalSq, finalAsq].map(s=>s?.trim()).filter(Boolean).join(sep));
                        
                        const pasted = getParts(normalizedVal);
                        if (pasted.sq || pasted.asq) forceSyncUI(); // 觸發即時消失
                    };

                    return (
                        <>
                            <div className="relative flex items-center justify-between mb-2 mt-4">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">試題來源 (單選)</label>
                                {(inputType === 'text' || inputType === 'richtext') && (
                                    <div className="flex gap-2">
                                        <label className="flex items-center space-x-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 cursor-pointer bg-cyan-50 dark:bg-cyan-900/30 px-2 py-1 rounded border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 transition-colors">
                                            <input type="checkbox" checked={!!qParts.sq} onChange={(e) => {
                                                if (e.target.checked) updateParts(qParts.mcq, qParts.sq + (isHtml ? '\n<br>[SQ.001]<br>簡答題...\n<br>[End]' : '\n[SQ.001]\n簡答題...\n[End]'), qParts.asq);
                                                else updateParts(qParts.mcq, '', qParts.asq);
                                            }} className="w-3.5 h-3.5 accent-cyan-500" />
                                            <span>啟用簡答</span>
                                        </label>
                                        <label className="flex items-center space-x-1.5 text-xs font-bold text-amber-700600 dark:text-amber-700400 cursor-pointer bg-amber-70050 dark:bg-amber-700900/30 px-2 py-1 rounded border border-amber-700200 dark:border-amber-700800 hover:bg-amber-700100 transition-colors">
                                            <input type="checkbox" checked={!!qParts.asq} onChange={(e) => {
                                                if (e.target.checked) updateParts(qParts.mcq, qParts.sq, qParts.asq + (isHtml ? '\n<br>[ASQ.001]<br>問答題...\n<br>[End]' : '\n[ASQ.001]\n問答題...\n[End]'));
                                                else updateParts(qParts.mcq, qParts.sq, '');
                                            }} className="w-3.5 h-3.5 accent-amber-700500" />
                                            <span>啟用問答</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap space-x-4 mb-4 dark:text-white">
                                <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-stone-800 dark:hover:text-gray-300">
                                    <input type="radio" checked={inputType === 'url'} onChange={() => setInputType('url')} className="w-4 h-4 accent-black dark:accent-white" />
                                    <span>公開網址</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-stone-800 dark:hover:text-gray-300">
                                    <input type="radio" checked={inputType === 'text'} onChange={() => setInputType('text')} className="w-4 h-4 accent-black dark:accent-white" />
                                    <span>純文字</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-stone-800 dark:hover:text-gray-300 mt-2 sm:mt-0">
                                    <input type="radio" checked={inputType === 'richtext'} onChange={() => setInputType('richtext')} className="w-4 h-4 accent-black dark:accent-white" />
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">富文本 (支援自動轉移)</span>
                                </label>
                            </div>

                            {inputType === 'url' ? (
                                <input type="text" placeholder="請貼上試卷網址 (例如: Google Drive 連結)" className="w-full mb-6 p-3 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-black dark:focus:border-white text-sm" value={questionFileUrl} onChange={e => setQuestionFileUrl(e.target.value)} />
                            ) : inputType === 'text' ? (
                                <textarea placeholder="請貼上選擇題純文字... (貼上包含 [SQ] 的內容會自動轉移下方)" className="w-full h-32 mb-6 p-3 border border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-stone-800 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-amber-500 text-sm custom-scrollbar" value={qParts.mcq} onChange={e => handleMainChange(e.target.value)} />
                            ) : (
                               <div className={`border-2 border-amber-300 dark:border-amber-700 focus-within:border-amber-500 transition-all bg-[#FCFBF7] dark:bg-stone-800 mb-6 relative ${tutorialStep === 4 ? "tutorial-highlight ring-[6px] ring-amber-500 ring-offset-4 ring-offset-stone-900 rounded-xl z-[160] shadow-[0_0_50px_rgba(245,158,11,0.8)] animate-pulse" : ""}`}>
                                   {tutorialStep === 4 && (
                                       <div className="absolute -top-10 left-0 bg-amber-500 text-white text-xs font-black px-3 py-1 rounded-t-lg flex items-center gap-1 animate-bounce">
                                           <span className="material-symbols-outlined text-[14px]">visibility</span> 富文本試題區已自動填入
                                       </div>
                                   )}
                                   <ContentEditableEditor value={qParts.mcq} onChange={handleMainChange} placeholder="貼上選擇題... (若混雜 [SQ] / [ASQ] 內容，系統會自動轉移到專屬格子)" showAlert={showAlert} />
                               </div>
                            )}

                           {!!qParts.sq && (
                                <div className="mb-6 animate-fade-in">
                                    <label className="block text-cyan-700 dark:text-cyan-400 font-bold mb-2">🟢 簡答題文本 [SQ.xxx]</label>
                                    {inputType === 'richtext' ? (
                                        <div className="border-2 border-cyan-300 dark:border-cyan-700 focus-within:border-cyan-500 transition-colors bg-cyan-50/30 dark:bg-cyan-900/20">
                                            <ContentEditableEditor value={qParts.sq} onChange={handleSqChange} placeholder="請輸入 [SQ.xxx] 開頭的簡答題..." />
                                        </div>
                                    ) : (
                                        <textarea className="w-full p-4 border-2 border-cyan-300 dark:border-cyan-700 outline-none bg-cyan-50/50 dark:bg-stone-800 dark:text-white focus:border-cyan-500 transition-all resize-none shadow-inner custom-scrollbar h-32" value={qParts.sq} onChange={e => handleSqChange(e.target.value)}></textarea>
                                    )}
                                </div>
                            )}

                            {!!qParts.asq && (
                                <div className="mb-6 animate-fade-in">
                                    <label className="block text-amber-700700 dark:text-amber-700400 font-bold mb-2">🟣 問答題文本 [ASQ.xxx]</label>
                                    {inputType === 'richtext' ? (
                                        <div className="border-2 border-amber-700300 dark:border-amber-700700 focus-within:border-amber-700500 transition-colors bg-amber-70050/30 dark:bg-amber-700900/20">
                                            <ContentEditableEditor value={qParts.asq} onChange={handleAsqChange} placeholder="請輸入 [ASQ.xxx] 開頭的問答題..." />
                                        </div>
                                    ) : (
                                        <textarea className="w-full p-4 border-2 border-amber-700300 dark:border-amber-700700 outline-none bg-amber-70050/50 dark:bg-stone-800 dark:text-white focus:border-amber-700500 transition-all resize-none shadow-inner custom-scrollbar h-32" value={qParts.asq} onChange={e => handleAsqChange(e.target.value)}></textarea>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-4 mb-4 mt-4 border-t pt-4 dark:border-stone-700">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">測驗總滿分</label>
                                    <input type="number" min="1" className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-black dark:focus:border-white text-sm" value={maxScore} onChange={e => setMaxScore(e.target.value)} />
                                </div>
                                <div className="flex-1 flex items-end pb-3">
                                    <label className="flex items-center space-x-2 font-bold cursor-pointer text-sm dark:text-white">
                                        <input type="checkbox" checked={roundScore} onChange={e => setRoundScore(e.target.checked)} className="w-4 h-4 accent-black dark:accent-white" />
                                        <span>成績四捨五入至整數</span>
                                    </label>
                                </div>
                            </div>

                            <div className={tutorialStep === 5 ? "tutorial-highlight ring-4 ring-amber-400 p-4 rounded-3xl bg-amber-50 dark:bg-amber-900/20 relative z-[160] shadow-[0_0_25px_rgba(245,158,11,0.4)] animate-pulse" : ""}>
                                <h3 className="font-bold text-xs text-amber-600 dark:text-amber-400 mb-2 mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">radio_button_checked</span> 選擇題標準答案</h3>
                                <AnswerGridInput value={correctAnswersInput} onChange={setCorrectAnswersInput} parsedTypes={parsedQuestionTypes} maxQuestions={numQuestions} showConfirm={showConfirm} />
                            </div>
                            
                            {!!qParts.sq && (
                                <div className="mt-6 mb-2 animate-fade-in">
                                    <h3 className="font-bold text-xs text-cyan-600 dark:text-cyan-400 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">short_text</span> 簡答題標準答案 (支援一鍵貼上多格)</h3>
                                    <SpecificAnswerGridInput value={shortAnswersInput} onChange={setShortAnswersInput} parsedTypes={parsedQuestionTypes} targetType="SQ" title="簡答題" colorTheme="teal" showConfirm={showConfirm} />
                                </div>
                            )}

                            <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 mb-2 mt-4">測驗詳解區 (亦可作為問答題的 AI 評分標準區)</h3>
                            <div className="mb-6">
                                {inputType === 'richtext' ? (
                                    <div className="border-2 border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-stone-800">
                                        <ContentEditableEditor value={explanationHtml} onChange={setExplanationHtml} placeholder="請輸入所有題目的詳解或問答題評分標準 [AS.xxx][s:20]..." />
                                    </div>
                                ) : (
                                    <textarea 
                                        className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none text-sm custom-scrollbar"
                                        placeholder="請輸入所有題目的詳解..."
                                        value={explanationHtml}
                                        onChange={(e) => setExplanationHtml(e.target.value)}
                                    />
                                )}
                            </div>
                        </>
                    );
                })()}

              

                <div className="flex flex-col gap-3 mt-4 mb-8 bg-gray-50 dark:bg-stone-900 p-4 border border-stone-200 dark:border-stone-700">
                    <label className="flex items-center space-x-2 cursor-pointer dark:text-white font-bold text-sm">
                        <input type="checkbox" checked={publishAnswersToggle} onChange={e => setPublishAnswersToggle(e.target.checked)} className="w-4 h-4 accent-black" />
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">visibility</span> 允許玩家在交卷後查看「標準答案」與「錯題」</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer dark:text-white font-bold text-sm">
                        <input type="checkbox" checked={allowPeek} onChange={e => setAllowPeek(e.target.checked)} className="w-4 h-4 accent-black" />
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">key</span> 允許玩家在沉浸式作答時使用「偷看答案」(限一般試題，偷看後該題將鎖定)</span>
                    </label>
                </div>

               <button onClick={handleSaveEdit} className="w-full bg-amber-600 dark:bg-amber-700 text-white p-3 font-bold rounded-2xl hover:bg-amber-800 transition-colors shadow-md flex justify-center items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">save</span> 儲存並套用變更
                </button>

                <div className="mt-10 border-t border-stone-200 dark:border-stone-700 pt-6">
                    <h3 className="font-bold text-lg mb-4 text-amber-600 dark:text-amber-400 flex items-center gap-2"><span className="material-symbols-outlined text-[20px]">rate_review</span> 來自玩家的修正建議</h3>
                    {creatorSuggestions.length === 0 ? (
                        <p className="text-gray-500 text-sm font-bold">目前沒有收到建議。</p>
                    ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {creatorSuggestions.map(s => (
                                <div key={s.id} className="p-3 bg-amber-50 dark:bg-gray-700 border border-amber-200 dark:border-gray-600 rounded-2xl">
                                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        <span className="font-bold text-amber-700 dark:text-amber-300">{s.senderName}</span>
                                        {/* ✨ 修復：增加對 timestamp 的安全檢查，防止 toDate() 當機 */}
                                        <span>{s.timestamp && typeof s.timestamp.toDate === 'function' ? s.timestamp.toDate().toLocaleString('zh-TW') : ''}</span>
                                    </div>
                                    <p className="text-sm dark:text-white whitespace-pre-wrap font-bold">{s.text}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {/* ✨ 新增：編輯模式的載入遮罩，解決按鈕無法互動的錯覺 */}
            {isEditLoading && (
                <div className="fixed inset-0 bg-stone-800 bg-opacity-80 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 w-full max-w-sm rounded-2xl shadow-2xl text-center border-t-8 border-amber-700500">
                        <div className="w-16 h-16 border-4 border-stone-200 dark:border-stone-700 border-t-amber-700500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black mb-2 dark:text-white">⏳ 正在處理中...</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">正在與雲端同步資料，請稍候</p>
                    </div>
                </div>
            )}
        </div>
    );

 if (step === 'setup') return (
        <div className="flex flex-col items-center p-4 h-[100dvh] overflow-y-auto relative custom-scrollbar bg-[#F0EFEB] dark:bg-stone-950">
            {tutorialStep === 0 && <button onClick={onBackToDashboard} className="absolute top-6 left-6 text-sm text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 font-bold z-10 transition-colors">← 返回列表</button>}
<div className="bg-[#FCFBF7] dark:bg-stone-900 p-8 shadow-2xl rounded-3xl w-full max-w-6xl 2xl:max-w-[1400px] border border-stone-200 dark:border-stone-800 mt-10 mb-10 transition-colors">                <div className="flex justify-between items-center mb-6 border-b border-stone-100 dark:border-stone-800 pb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black tracking-tight text-stone-800 dark:text-stone-100">新增測驗</h1>
                        <button 
                            onClick={() => setShowHelp(!showHelp)} 
                            className={`text-xs px-3 py-1.5 font-bold shadow-sm rounded-lg transition-colors ${showHelp ? 'bg-amber-500 text-white border-amber-600' : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:border-stone-600'}`}
                        >
                            {showHelp ? '關閉教學' : '❓ 使用教學'}
                        </button>
                    </div>
                    <div className="relative">
                        <button 
                            onClick={() => setShowAiModal(true)} 
                            className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 font-bold rounded-2xl shadow-lg transition-all text-sm flex items-center gap-2 active:scale-95"
                        >
                            ✨ AI 自動出題 (50+💎)
                        </button>
                        <HelpTooltip show={showHelp} text="太懶得自己出題？點擊這裡讓 AI 閱讀講義後，直接幫你生出一份精準的考卷！" position="bottom" className="right-0 transform-none left-auto" />
                    </div>
                </div>                
                <div className={`space-y-4 p-4 rounded-3xl transition-all ${tutorialStep === 3 ? "tutorial-highlight ring-4 ring-amber-400 bg-amber-50 dark:bg-amber-900/20 relative z-[160] shadow-[0_0_25px_rgba(245,158,11,0.4)] animate-pulse" : ""}`}>
                    {tutorialStep === 3 && (
                        <div className="absolute -top-10 left-0 bg-amber-500 text-white text-xs font-black px-3 py-1 rounded-t-lg flex items-center gap-1 animate-bounce">
                            <span className="material-symbols-outlined text-[14px]">visibility</span> 系統已自動填入標題與分類
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">存放資料夾</label>
                        {/* ✨ 套用樹狀結構 UI */}
                        <div className="flex flex-col gap-1 w-full border border-stone-200 dark:border-stone-700 rounded-2xl p-2 bg-[#FCFBF7] dark:bg-stone-800 shadow-inner max-h-[200px] overflow-y-auto custom-scrollbar">
                            {/* 未分類永遠在最上方 */}
                            <div 
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${folder === '未分類' || !folder ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800' : 'hover:bg-stone-100 dark:hover:bg-gray-700 text-stone-700 dark:text-gray-300 font-medium'}`}
                                onClick={() => setFolder('未分類')}
                            >
                                <span className="w-[20px]"></span>
                                <span className="material-symbols-outlined text-[18px] text-gray-400">folder_off</span>
                                <span className="text-sm">未分類</span>
                            </div>
                            
                            {/* 遞迴渲染其他資料夾 */}
                            {renderFolderTree(folderTree, 0, folder, setFolder)}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">測驗名稱</label>
                        <input type="text" placeholder="例如: 藥理學期中考" className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-black dark:focus:border-white text-sm" value={testName} onChange={e => setTestName(e.target.value)} />
                    </div>
                </div>
                
                {/* ✨ 任務牆屬性與標籤設定 */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">測驗發布屬性</label>
                    <div className="flex flex-wrap gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold dark:text-white">
                            <input type="radio" checked={taskType==='normal'} onChange={()=>setTaskType('normal')} className="accent-black dark:accent-white" /> 一般測驗 (不公開)
                        </label>
                        {/* 國考與模擬考功能已轉移至公開試卷區 */}
                    </div>

                    {false && (
                        <div className="mt-4 border-t border-stone-200 dark:border-stone-700 pt-4 animate-fade-in">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">國考年份期數 (由新到舊排序)</label>
                            <input type="text" list="official-years" placeholder="例如: 114-1" value={examYear} onChange={e=>setExamYear(e.target.value)} className="w-full p-2 border border-amber-300 bg-amber-50 dark:bg-stone-800 text-stone-800 dark:text-white rounded-2xl text-sm font-bold" />
                            <datalist id="official-years">
                                {Array.from({length: 15}, (_, i) => 115 - i).flatMap(y => [`${y}-2`, `${y}-1`]).map(y => <option key={y} value={y} />)}
                            </datalist>
                        </div>
                    )}

                    {false && (
                        <div className="mt-4 border-t border-stone-200 dark:border-stone-700 pt-4 space-y-4 animate-fade-in">
                            {/* 科目多選區 */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">科目名稱 (可複選)</label>
                                <div className="flex flex-wrap gap-2">
                                    {usedSubjects.map(s => (
                                        <button key={s} onClick={() => toggleSubject(s)} className={`px-3 py-1.5 text-xs font-bold rounded-2xl border transition-colors ${examSubject.split(',').includes(s) ? 'bg-amber-600 border-amber-600 text-white' : 'bg-[#FCFBF7] dark:bg-stone-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                                            {examSubject.split(',').includes(s) ? '✓ ' : ''}{s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 標籤多選區 */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">試題來源標籤 (可複選)</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {usedTags.map(t => (
                                        <button key={t} onClick={() => toggleTag(t)} className={`px-3 py-1.5 text-xs font-bold rounded-2xl border transition-colors ${examTag.split(',').includes(t) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-[#FCFBF7] dark:bg-stone-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                                            {examTag.split(',').includes(t) ? '✓ ' : ''}{t}
                                        </button>
                                    ))}
                                </div>
                                <input type="text" placeholder="手動輸入其他標籤 (多個標籤請用半形逗號 , 分隔)" value={examTag} onChange={e=>setExamTag(e.target.value)} className="w-full p-2 border border-indigo-300 bg-indigo-50 dark:bg-stone-800 text-stone-800 dark:text-white rounded-2xl text-sm font-bold" />
                            </div>

                            {/* 範圍自由輸入 */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">出題範圍 (自由填寫)</label>
                                <input type="text" placeholder="例如: 講義 P.1~P.50 或 全冊" value={examRange} onChange={e=>setExamRange(e.target.value)} className="w-full p-2 border border-amber-300 bg-amber-50 dark:bg-stone-800 text-stone-800 dark:text-white rounded-2xl text-sm font-bold" />
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-4 relative">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">測驗題數 (上限200題)</label>
                        <input type="number" placeholder="50" className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-black dark:focus:border-white text-sm" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} onFocus={handleFocusScroll} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">測驗滿分</label>
                        <input type="number" placeholder="100" className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-black dark:focus:border-white text-sm" value={maxScore} onChange={e => setMaxScore(e.target.value)} onFocus={handleFocusScroll} />
                    </div>
                    <div className="flex-1 flex items-end pb-2">
                        <label className="flex items-center space-x-2 font-bold cursor-pointer text-sm dark:text-white">
                            <input type="checkbox" checked={roundScore} onChange={e => setRoundScore(e.target.checked)} className="w-4 h-4 accent-black dark:accent-white" />
                            <span>四捨五入至整數</span>
                        </label>
                    </div>
                    <HelpTooltip show={showHelp} text="設定考卷總題數（決定答案卡有幾格）以及滿分（交卷時會自動幫你依比例算分）" position="top" className="left-1/3" />
                </div>

                {initialRecord.isIndependentQuestions ? (
                    <div className="mb-6 bg-cyan-50 dark:bg-stone-800 border-2 border-cyan-400 dark:border-cyan-700 rounded-2xl p-6 text-center shadow-sm">
                        <span className="material-symbols-outlined text-4xl text-cyan-500 mb-2">library_books</span>
                        <h3 className="text-lg font-black text-cyan-800 dark:text-cyan-300 mb-2">獨立題庫試卷</h3>
                        <p className="text-sm font-bold text-cyan-700 dark:text-gray-300">
                            這是一份由「題庫系統」動態抽題產生的試卷。<br/><br/>
                            為保證題庫數據的一致性，若要修改題目內容（包含文字、選項與詳解），請前往左側選單的「題庫系統」，找到該題目進行獨立編輯。<br/><br/>
                            您仍可以在此頁面下方修改「測驗名稱」、「計時器」與「功能開關」等外觀設定。
                        </p>
                    </div>
                ) : (() => {
                    const isHtml = inputType === 'richtext';
                    const activeContent = isHtml ? questionHtml : questionText;
                    
                    // ✨ 智慧提取核心：全域自動歸位系統，精準將錯誤貼上的題型移動到專屬區塊
                    // ✨ 智慧提取核心：全域自動歸位系統，修正重複、多餘空行，並強制 UI 即時刷新
                    const getParts = (text) => {
                        let tempText = text || '';
                        let sq = '', asq = '', exp = '', ans = '';
                        
                        const cleanBlock = (m) => m.trim().replace(/^(?:<br\s*\/?>|\s)+|(?:<br\s*\/?>|\s)+$/gi, '');

                        // 1. 提取標準答案 [ans]...[AnsEnd]
                        const ansRegex = /\[ans\]([\s\S]*?)\[AnsEnd\]/gi;
                        let match;
                        while ((match = ansRegex.exec(tempText)) !== null) {
                            ans += match[1] + ',';
                        }
                        if (ans) {
                            ans = ans.replace(/,+$/, '').trim();
                            tempText = tempText.replace(ansRegex, '');
                        }

                        // 2. 提取詳解 [A.xxx], [SA.xxx], [AS.xxx], [ASA.xxx]
                        const expRegex = /(?:<[^>]+>|\s)*\[(?:A|SA|AS|ASA)\.?0*\d+\][\s\S]*?(?=(?:<[^>]+>|\s)*\[(?:Q|SQ|ASQ|A|SA|AS|ASA)\.?0*\d+\]|\[ans\]|$)/gi;
                        let expMatches = tempText.match(expRegex);
                        if (expMatches) {
                            expMatches = Array.from(new Set(expMatches.map(cleanBlock)));
                            exp = expMatches.join(isHtml ? '<br><br>' : '\n\n');
                            tempText = tempText.replace(expRegex, '');
                        }

                        // 3. 提取簡答題 [SQ.xxx]
                        const sqRegex = /(?:<[^>]+>|\s)*\[SQ\.?0*\d+\][\s\S]*?(?=(?:<[^>]+>|\s)*\[(?:Q|SQ|ASQ|A|SA|AS|ASA)\.?0*\d+\]|$)/gi;
                        let sqMatches = tempText.match(sqRegex);
                        if (sqMatches) {
                            sqMatches = Array.from(new Set(sqMatches.map(cleanBlock))); // 去重複
                            sq = sqMatches.join(isHtml ? '<br><br>' : '\n\n');
                            tempText = tempText.replace(sqRegex, '');
                        }
                        
                        // 4. 提取問答題 [ASQ.xxx]
                        const asqRegex = /(?:<[^>]+>|\s)*\[ASQ\.?0*\d+\][\s\S]*?(?=(?:<[^>]+>|\s)*\[(?:Q|SQ|ASQ|A|SA|AS|ASA)\.?0*\d+\]|$)/gi;
                        let asqMatches = tempText.match(asqRegex);
                        if (asqMatches) {
                            asqMatches = Array.from(new Set(asqMatches.map(cleanBlock))); // 去重複
                            asq = asqMatches.join(isHtml ? '<br><br>' : '\n\n');
                            tempText = tempText.replace(asqRegex, '');
                        }
                        
                        // 清除多餘的殘留空行
                        // 清除多餘的殘留空行
        if (isHtml) {
            tempText = tempText.trim();
        } else {
            tempText = tempText.trim();
        }
        return { mcq: tempText, sq, asq, exp, ans };
                    };

                    const updateParts = (newMcq, newSq, newAsq) => {
                        const sep = isHtml ? '<br><br>' : '\n\n';
                        const res = [newMcq, newSq, newAsq].map(s=>s?.trim()).filter(Boolean).join(sep);
                        if (isHtml) setQuestionHtml(res); else setQuestionText(res);
                    };

                    const qParts = getParts(activeContent);
                    const eParts = getParts(explanationHtml);

                    const forceSyncUI = () => {
                        setTimeout(() => {
                            if (document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true') {
                                document.activeElement.blur();
                            }
                        }, 10);
                    };

                    const redistributeContent = (mcqVal, sqVal, asqVal) => {
                        const combined = [mcqVal, sqVal, asqVal].filter(Boolean).join(isHtml ? '<br><br>' : '\n\n');
                        const parsed = getParts(combined);
                        updateParts(parsed.mcq, parsed.sq, parsed.asq);
                        
                        // ✨ 將提取出的答案與詳解存入對應欄位
                        if (parsed.ans) {
                            setCorrectAnswersInput(prev => {
                                const newAns = prev ? prev + ',' + parsed.ans : parsed.ans;
                                return newAns.replace(/[^a-dA-DZz,]/g, '');
                            });
                        }
                        if (parsed.exp) {
                            setExplanationHtml(prev => prev ? prev + (isHtml ? '<br><br>' : '\n\n') + parsed.exp : parsed.exp);
                        }
                    };

                   const handleMainChange = (val) => {
                        if (val === lastExtractValRef.current.mcq) return; // ✨ 防重複觸發
                        lastExtractValRef.current.mcq = val;
                        
                        const pastedParsed = getParts(val);
                        redistributeContent(val, qParts.sq, qParts.asq);
                        if (pastedParsed.sq || pastedParsed.asq || pastedParsed.exp || pastedParsed.ans) forceSyncUI(); // 觸發即時消失
                    };
                    const handleSqChange = (val) => {
                        if (val === lastExtractValRef.current.sq) return;
                        lastExtractValRef.current.sq = val;
                        redistributeContent(qParts.mcq, val, qParts.asq);
                    };
                    const handleAsqChange = (val) => {
                        if (val === lastExtractValRef.current.asq) return;
                        lastExtractValRef.current.asq = val;
                        redistributeContent(qParts.mcq, qParts.sq, val);
                    };

                    const handleExpMainChange = (val) => {
                        if (val === lastExtractValRef.current.exp) return;
                        lastExtractValRef.current.exp = val;
                        let normalizedVal = val.replace(/\[SA\.?/gi, '[SQ.').replace(/\[ASA\.?/gi, '[ASQ.').replace(/\[AS\.?/gi, '[ASQ.');
                        let normalizedOldSq = (eParts.sq || '').replace(/\[SA\.?/gi, '[SQ.');
                        let normalizedOldAsq = (eParts.asq || '').replace(/\[ASA\.?/gi, '[ASQ.');
                        
                        const combined = [normalizedVal, normalizedOldSq, normalizedOldAsq].filter(Boolean).join(isHtml ? '<br><br>' : '\n\n');
                        const parsed = getParts(combined);
                        
                        const finalSq = parsed.sq.replace(/\[SQ/gi, '[SA');
                        const finalAsq = parsed.asq.replace(/\[ASQ/gi, '[ASA');
                        
                        const sep = isHtml ? '<br><br>' : '\n\n';
                        setExplanationHtml([parsed.mcq, finalSq, finalAsq].map(s=>s?.trim()).filter(Boolean).join(sep));
                        
                        const pasted = getParts(normalizedVal);
                        if (pasted.sq || pasted.asq) forceSyncUI(); // 觸發即時消失
                    };

                    return (
                        <>
                            <div className="relative flex items-center justify-between mb-2 mt-4">
                                <div className="flex flex-col">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">試題來源 (單選)</label>
                                    <HelpTooltip show={showHelp} text="強烈推薦使用【富文本】，你可以直接把 Word 題庫複製貼上，排版、圖片跟表格都會完美保留！" position="bottom" className="left-1/4" />
                                </div>
                                {(inputType === 'text' || inputType === 'richtext') && (
                                    <div className="flex gap-2">
                                        <label className="flex items-center space-x-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 cursor-pointer bg-cyan-50 dark:bg-cyan-900/30 px-2 py-1 rounded border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 transition-colors">
                                            <input type="checkbox" checked={!!qParts.sq} onChange={(e) => {
                                                if (e.target.checked) updateParts(qParts.mcq, qParts.sq + (isHtml ? '\n<br>[SQ.001]<br>簡答題...\n<br>[End]' : '\n[SQ.001]\n簡答題...\n[End]'), qParts.asq);
                                                else updateParts(qParts.mcq, '', qParts.asq);
                                            }} className="w-3.5 h-3.5 accent-cyan-500" />
                                            <span>啟用簡答</span>
                                        </label>
                                        <label className="flex items-center space-x-1.5 text-xs font-bold text-amber-700600 dark:text-amber-700400 cursor-pointer bg-amber-70050 dark:bg-amber-700900/30 px-2 py-1 rounded border border-amber-700200 dark:border-amber-700800 hover:bg-amber-700100 transition-colors">
                                            <input type="checkbox" checked={!!qParts.asq} onChange={(e) => {
                                                if (e.target.checked) updateParts(qParts.mcq, qParts.sq, qParts.asq + (isHtml ? '\n<br>[ASQ.001]<br>問答題...\n<br>[End]' : '\n[ASQ.001]\n問答題...\n[End]'));
                                                else updateParts(qParts.mcq, qParts.sq, '');
                                            }} className="w-3.5 h-3.5 accent-amber-700500" />
                                            <span>啟用問答</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap space-x-4 mb-4 dark:text-white">
                                <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-stone-800 dark:hover:text-gray-300">
                                    <input type="radio" checked={inputType === 'url'} onChange={() => setInputType('url')} className="w-4 h-4 accent-black dark:accent-white" />
                                    <span>公開網址</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-stone-800 dark:hover:text-gray-300">
                                    <input type="radio" checked={inputType === 'text'} onChange={() => setInputType('text')} className="w-4 h-4 accent-black dark:accent-white" />
                                    <span>純文字</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-stone-800 dark:hover:text-gray-300 mt-2 sm:mt-0">
                                    <input type="radio" checked={inputType === 'richtext'} onChange={() => setInputType('richtext')} className="w-4 h-4 accent-black dark:accent-white" />
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">富文本 (支援自動轉移)</span>
                                </label>
                            </div>

                            {inputType === 'url' ? (
                                <input type="text" placeholder="請貼上試卷網址 (例如: Google Drive 連結)" className="w-full mb-6 p-3 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-black dark:focus:border-white text-sm" value={questionFileUrl} onChange={e => setQuestionFileUrl(e.target.value)} onFocus={handleFocusScroll} />
                            ) : inputType === 'text' ? (
                                <textarea placeholder="請貼上選擇題純文字... (貼上包含 [SQ] 的內容會自動轉移下方)" className="w-full h-32 mb-6 p-3 border border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-stone-800 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-amber-500 text-sm custom-scrollbar" value={qParts.mcq} onChange={e => handleMainChange(e.target.value)} onFocus={handleFocusScroll} />
                            ) : (
                               <div className={`border-2 border-amber-300 dark:border-amber-700 focus-within:border-amber-500 transition-all bg-[#FCFBF7] dark:bg-stone-800 mb-6 relative ${tutorialStep === 4 ? "tutorial-highlight ring-[6px] ring-amber-500 ring-offset-4 ring-offset-stone-900 rounded-xl z-[160] shadow-[0_0_50px_rgba(245,158,11,0.8)] animate-pulse" : ""}`}>
                                   <div className="absolute -top-10 left-0 bg-amber-500 text-white text-xs font-black px-3 py-1 rounded-t-lg flex items-center gap-1">
                                       <span className="material-symbols-outlined text-[14px]">visibility</span> 這是富文本試題區
                                   </div>
                                   <ContentEditableEditor value={qParts.mcq} onChange={handleMainChange} placeholder="貼上選擇題... (若混雜 [SQ] / [ASQ] 內容，系統會自動轉移到專屬格子)" showAlert={showAlert} />
                               </div>
                            )}

                            {!!qParts.sq && (
                                <div className="mb-6 animate-fade-in">
                                    <label className="block text-cyan-700 dark:text-cyan-400 font-bold mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">short_text</span> 簡答題文本 [SQ.xxx]</label>
                                    {inputType === 'richtext' ? (
                                        <div className="border-2 border-cyan-300 dark:border-cyan-700 focus-within:border-cyan-500 transition-colors bg-cyan-50/30 dark:bg-cyan-900/20">
                                            <ContentEditableEditor value={qParts.sq} onChange={handleSqChange} placeholder="請輸入 [SQ.xxx] 開頭的簡答題..." />
                                        </div>
                                    ) : (
                                        <textarea className="w-full p-4 border-2 border-cyan-300 dark:border-cyan-700 outline-none bg-cyan-50/50 dark:bg-stone-800 dark:text-white focus:border-cyan-500 transition-all resize-none shadow-inner custom-scrollbar h-32" value={qParts.sq} onChange={e => handleSqChange(e.target.value)} onFocus={handleFocusScroll}></textarea>
                                    )}
                                </div>
                            )}

                            {!!qParts.asq && (
                                <div className="mb-6 animate-fade-in">
                                   <label className="block text-amber-700700 dark:text-amber-700400 font-bold mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">subject</span> 問答題文本 [ASQ.xxx]</label>
                                    {inputType === 'richtext' ? (
                                        <div className="border-2 border-amber-700300 dark:border-amber-700700 focus-within:border-amber-700500 transition-colors bg-amber-70050/30 dark:bg-amber-700900/20">
                                            <ContentEditableEditor value={qParts.asq} onChange={handleAsqChange} placeholder="請輸入 [ASQ.xxx] 開頭的問答題..." />
                                        </div>
                                    ) : (
                                        <textarea className="w-full p-4 border-2 border-amber-700300 dark:border-amber-700700 outline-none bg-amber-70050/50 dark:bg-stone-800 dark:text-white focus:border-amber-700500 transition-all resize-none shadow-inner custom-scrollbar h-32" value={qParts.asq} onChange={e => handleAsqChange(e.target.value)} onFocus={handleFocusScroll}></textarea>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-4 mb-4 mt-4 border-t pt-4 dark:border-stone-700">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">測驗總滿分</label>
                                    <input type="number" min="1" className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none focus:border-black dark:focus:border-white text-sm" value={maxScore} onChange={e => setMaxScore(e.target.value)} onFocus={handleFocusScroll} />
                                </div>
                                <div className="flex-1 flex items-end pb-3">
                                    <label className="flex items-center space-x-2 font-bold cursor-pointer text-sm dark:text-white">
                                        <input type="checkbox" checked={roundScore} onChange={e => setRoundScore(e.target.checked)} className="w-4 h-4 accent-black dark:accent-white" />
                                        <span>成績四捨五入至整數</span>
                                    </label>
                                </div>
                            </div>

                            <h3 className="font-bold text-xs text-amber-600 dark:text-amber-400 mb-2 mt-4"><span className="material-symbols-outlined text-[18px] mr-1 align-bottom text-amber-500">radio_button_checked</span> 選擇題標準答案</h3>
                            <AnswerGridInput value={correctAnswersInput} onChange={setCorrectAnswersInput} parsedTypes={parsedQuestionTypes} maxQuestions={numQuestions} showConfirm={showConfirm} />
                            
                            {!!qParts.sq && (
                                <div className="mt-6 mb-2 animate-fade-in">
                                    <h3 className="font-bold text-xs text-cyan-600 dark:text-cyan-400 mb-2">🟢 簡答題標準答案 (支援一鍵貼上多格)</h3>
                                    <SpecificAnswerGridInput value={shortAnswersInput} onChange={setShortAnswersInput} parsedTypes={parsedQuestionTypes} targetType="SQ" title="簡答題" colorTheme="teal" showConfirm={showConfirm} />
                                </div>
                            )}

                            <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 mb-2 mt-4 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">lightbulb</span> 測驗詳解區 (亦可作為問答題的 AI 評分標準區)</h3>
                            <div className={`mb-6 relative ${tutorialStep === 4 ? "tutorial-highlight ring-[6px] ring-cyan-500 ring-offset-4 ring-offset-stone-900 rounded-xl z-[160] shadow-[0_0_50px_rgba(6,182,212,0.6)] animate-pulse" : ""}`}>
                                {tutorialStep === 4 && (
                                    <div className="absolute -top-10 right-0 bg-cyan-500 text-white text-xs font-black px-3 py-1 rounded-t-lg flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span> 詳解與非選擇題，也完全支援富文本！
                                    </div>
                                )}
                                {inputType === 'richtext' ? (
                                    <div className="border-2 border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-stone-800">
                                        <ContentEditableEditor value={explanationHtml} onChange={setExplanationHtml} placeholder="請輸入所有題目的詳解或問答題評分標準 [AS.xxx][s:20]..." />
                                    </div>
                                ) : (
                                    <textarea 
                                        className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white rounded-2xl outline-none text-sm custom-scrollbar"
                                        placeholder="請輸入所有題目的詳解..."
                                        value={explanationHtml}
                                        onChange={(e) => setExplanationHtml(e.target.value)}
                                        onFocus={handleFocusScroll}
                                    />
                                )}
                            </div>
                        </>
                    );
                })()}
                
            

                <div className="mb-6 border border-stone-200 dark:border-stone-700 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl flex flex-col gap-3">
                    <label className="flex items-center space-x-2 font-bold cursor-pointer text-sm dark:text-white">
                        <input type="checkbox" checked={allowPeek} onChange={e => { setAllowPeek(e.target.checked); if (!e.target.checked) setQuizSettings(prev => ({...prev, showTags: false})); }} className="w-4 h-4 accent-black dark:accent-white" />
                        <span>👀 允許作答時使用「偷看答案」(關閉時將同步隱藏題目標籤與難度)</span>
                    </label>
                    <label className="flex items-center space-x-2 font-bold cursor-pointer text-sm dark:text-white pt-3 border-t border-stone-200 dark:border-gray-600">
                        <input type="checkbox" checked={hasTimer} onChange={e => setHasTimer(e.target.checked)} className="w-4 h-4 accent-black dark:accent-white" />
                        <span>⏱ 開啟測驗倒數計時</span>
                    </label>
                    {hasTimer && (
                        <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-stone-200 dark:border-stone-700">
                            <span className="text-sm text-stone-600 dark:text-stone-300">測驗時間：</span>
                            <input type="number" min="1" max="999" className="w-16 p-1.5 border border-stone-300 dark:border-stone-600 bg-[#FCFBF7] dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-lg outline-none focus:border-amber-500 dark:focus:border-amber-400 text-center text-sm" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} onFocus={handleFocusScroll} />
                            <span className="text-sm text-stone-600 dark:text-stone-300">分鐘</span>
                        </div>
                    )}
                </div>

                <button 
                    onClick={() => {
                        if (tutorialStep === 5) setTutorialStep(6);
                        handleStartTest();
                    }} 
                    className={`w-full p-3.5 rounded-xl font-bold transition-all shadow-md active:scale-95 flex justify-center items-center gap-2 ${tutorialStep === 5 ? 'tutorial-highlight relative z-[160] bg-amber-500 text-white ring-4 ring-amber-300 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-600 dark:hover:bg-amber-500'}`}
                >
                    <span className="material-symbols-outlined text-[20px]">play_arrow</span> 開始作答
                </button>

           {showAiModal && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md flex items-center justify-center z-[150] p-4 animate-fade-in">
                    <div className="bg-[#FCFBF7] dark:bg-stone-900 p-6 md:p-10 w-full max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl rounded-[2.5rem] shadow-2xl border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto custom-scrollbar relative transition-all">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-2xl text-stone-800 dark:text-stone-100 flex items-center gap-2">
                                ✨ AI 智慧出題
                            </h3>
                            <button 
                                onClick={() => setShowHelp(!showHelp)} 
                                className={`text-xs px-3 py-1.5 font-bold shadow-sm rounded-lg transition-colors ${showHelp ? 'bg-amber-500 text-white border-amber-600' : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:border-stone-600'}`}
                            >
                                {showHelp ? '關閉教學' : '❓ 教學'}
                            </button>
                        </div>
                        <div className="flex justify-between items-center mb-4 bg-gray-50 dark:bg-gray-700/50 p-2 border border-stone-200 dark:border-gray-600">
                            <span className="text-xs text-amber-700700 dark:text-amber-700300 font-bold">
                                預估花費：{50 + Math.max(0, Number(aiNum) - 10) * 3} 💎 (10題50，每多一題+3)
                            </span>
                            <span className="text-sm font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                您擁有：{userProfile?.mcData?.diamonds || 0} 💎
                            </span>
                        </div>
                        
                       {/* 電腦版採用網格排版，增加空間利用率 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-4">
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-stone-600 dark:text-stone-300 mb-1.5">科目選擇</label>
                                <select 
                                    value={aiSubject} 
                                    onChange={e => setAiSubject(e.target.value)} 
                                    className="w-full p-3 border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-xl outline-none font-bold text-sm focus:border-amber-500 transition-colors"
                                >
                                    <option value="藥理與藥物化學">藥理與藥物化學</option>
                                    <option value="藥劑與生物藥劑學">藥劑與生物藥劑學</option>
                                    <option value="藥物分析">藥物分析</option>
                                    <option value="生藥學與中藥學">生藥學與中藥學</option>
                                    <option value="其他">其他 (自行填寫)</option>
                                </select>
                            </div>

                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-stone-600 dark:text-stone-300 mb-1.5">生成題數 (1-50)</label>
                                <input 
                                    type="number" 
                                    value={aiNum} 
                                    onChange={e => setAiNum(e.target.value)} 
                                    min="1" max="50" 
                                    className="w-full p-3 border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-xl outline-none font-bold text-sm focus:border-amber-500 transition-colors"
                                />
                            </div>

                            {aiSubject === '其他' && (
                                <div className="col-span-1 md:col-span-2 mt-2">
                                    <label className="block text-sm font-bold text-stone-600 dark:text-stone-300 mb-1.5">✍️ 自訂科目名稱</label>
                                    <input 
                                        type="text" 
                                        value={aiCustomSubject} 
                                        onChange={e => setAiCustomSubject(e.target.value)} 
                                        placeholder="例如：解剖學、臨床藥學..." 
                                        className="w-full p-3 border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-xl outline-none font-bold text-sm focus:border-amber-500 transition-colors"
                                    />
                                </div>
                            )}

                            {aiSubject === '藥理與藥物化學' && (
                                <div className="col-span-1 md:col-span-2 mt-2 bg-amber-50 dark:bg-stone-800/50 p-4 rounded-2xl border border-amber-100 dark:border-stone-700">
                                    <label className="block text-sm font-bold text-amber-900 dark:text-amber-400 mb-2 flex justify-between">
                                        <span>💊 調整出題比重</span>
                                        <span className="font-mono">藥理 {aiPharmRatio}% / 藥化 {100 - aiPharmRatio}%</span>
                                    </label>
                                    <input 
                                        type="range" 
                                        min="0" max="100" step="10"
                                        value={aiPharmRatio} 
                                        onChange={e => setAiPharmRatio(parseInt(e.target.value))} 
                                        className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* ✨ 新增：難度占比分配器 */}
                        <div className="mb-6 p-4 bg-amber-50 dark:bg-gray-700/50 border border-amber-100 dark:border-gray-600 relative">
                            <HelpTooltip show={showHelp} text="滑動這些控制條，決定考卷要有幾題送分題，幾題用來鑑別實力的魔王題！" position="top" />
                            <label className="block text-sm font-black text-amber-800 dark:text-amber-300 mb-3 flex justify-between items-center">
                                <span>⚖️ 難度分布調整</span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setAiDifficultyMode('default')}
                                        className={`px-2 py-0.5 text-[10px] rounded-2xl border ${aiDifficultyMode === 'default' ? 'bg-amber-600 text-white border-amber-600' : 'bg-[#FCFBF7] text-gray-500 border-gray-300'}`}
                                    >系統預設 (高難度)</button>
                                    <button 
                                        onClick={() => setAiDifficultyMode('custom')}
                                        className={`px-2 py-0.5 text-[10px] rounded-2xl border ${aiDifficultyMode === 'custom' ? 'bg-amber-600 text-white border-amber-600' : 'bg-[#FCFBF7] text-gray-500 border-gray-300'}`}
                                    >自訂比例</button>
                                </div>
                            </label>

                            {aiDifficultyMode === 'custom' ? (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                            <span>簡單 (觀念題)</span>
                                            <span>{aiSimpleRatio}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" step="5" value={aiSimpleRatio} onChange={e => {
                                            const val = parseInt(e.target.value);
                                            setAiSimpleRatio(val);
                                            // 自動平衡機制
                                            const remain = 100 - val;
                                            setAiMediumRatio(Math.round(remain * 0.6));
                                            setAiHardRatio(100 - val - Math.round(remain * 0.6));
                                        }} className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                            <span>中等 (思考題)</span>
                                            <span>{aiMediumRatio}%</span>
                                        </div>
                                        <input type="range" min="0" max={100 - aiSimpleRatio} step="5" value={aiMediumRatio} onChange={e => {
                                            const val = parseInt(e.target.value);
                                            setAiMediumRatio(val);
                                            setAiHardRatio(100 - aiSimpleRatio - val);
                                        }} className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-bold text-red-600 dark:text-red-400">
                                            <span>困難 (辨識與綜合題)</span>
                                            <span>{aiHardRatio}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-stone-100 rounded-lg overflow-hidden">
                                            <div className="bg-red-500 h-full" style={{ width: `${aiHardRatio}%` }}></div>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-gray-400 italic">💡 調整上方滑桿，系統會自動平衡總比例為 100%。</p>
                                </div>
                            ) : (
                                <p className="text-xs text-amber-600/70 dark:text-amber-300/70 font-bold leading-relaxed italic">
                                    「系統預設」模式將採用藥師國考高階命題邏輯，專注於細節辨識、機轉比較與結構個論，適合衝刺期考生。
                                </p>
                            )}
                        </div>

                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">出題範圍 / 重點 (手動輸入)</label>
                        <textarea 
                            value={aiScope} 
                            onChange={e => setAiScope(e.target.value)} 
                            placeholder="例如：第一章 常見抗生素的機轉與副作用..." 
                            className="w-full p-2 mb-4 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-stone-800 dark:text-white outline-none font-bold text-sm h-20 resize-none custom-scrollbar"
                        />

                        <div className="relative mt-4">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">上傳參考資料 (支援 PDF、TXT 等，僅供 AI 閱讀)</label>
                            <HelpTooltip show={showHelp} text="把你的上課講義或考古題拖曳進來，AI 就會【只考範圍內的內容】，非常適合期中考前衝刺！" position="top" />
                        </div>
                        <div 
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsAiFileDragging(true); }}
                            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsAiFileDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsAiFileDragging(false); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsAiFileDragging(false);
                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                    handleProcessAiFile(e.dataTransfer.files[0]);
                                }
                            }}
                            className={`w-full flex items-center justify-center p-8 mb-6 border-2 border-dashed transition-all cursor-pointer rounded-[1.5rem] ${isAiFileDragging ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-inner' : 'border-stone-300 bg-stone-50 dark:bg-stone-800 hover:border-amber-400 dark:hover:border-amber-500'}`}
                        >
                            <input 
                                type="file" 
                                accept=".txt,.csv,.md,.pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleProcessAiFile(e.target.files[0]);
                                    }
                                }}
                                className="hidden" 
                                id="aiFileUpload"
                            />
                            <label 
                                htmlFor="aiFileUpload" 
                                className="w-full h-full flex flex-col items-center justify-center cursor-pointer font-bold text-sm text-amber-700700 dark:text-amber-700300"
                            >
                                {aiFileName ? (
                                    <>
                                        <span className="text-2xl mb-2">📄</span>
                                        <span className="text-center break-all">{aiFileName}</span>
                                        <span className="text-xs text-amber-700500 dark:text-amber-700400 mt-2 opacity-80">(點擊或拖曳新檔案以替換)</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-3xl mb-2">📥</span>
                                        <span className="text-center">點此上傳，或將 PDF / 文字檔「拖曳」至此處</span>
                                    </>
                                )}
                            </label>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setShowAiModal(false)} 
                                disabled={isAiGenerating}
                                className="px-4 py-2 bg-stone-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-50"
                            >
                                取消
                            </button>
                            <button 
                                onClick={handleGenerateAI} 
                                disabled={isAiGenerating}
                                className="px-4 py-2 bg-amber-700600 text-white font-bold rounded-2xl hover:bg-amber-700700 transition-colors text-sm shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {isAiGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                                {isAiGenerating ? 'AI 努力生題中...' : '確認扣除並生成'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCreating && (
                    <div className="fixed inset-0 bg-stone-800 bg-opacity-80 flex items-center justify-center z-[200] p-4">
                        <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 w-full max-w-sm rounded-2xl shadow-2xl text-center border-t-8 border-black dark:border-white">
                            <div className="w-16 h-16 border-4 border-stone-200 border-t-black dark:border-stone-700 dark:border-t-white rounded-full animate-spin mx-auto mb-6"></div>
                            <h3 className="text-xl font-black mb-2 dark:text-white">正在建立試卷...</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">即將為您準備作答環境，請稍候</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (step === 'answering') return (
        <div 
            className="quiz-answering-container flex flex-col h-[100dvh] bg-stone-50 dark:bg-stone-900 p-2 sm:p-4 w-full overflow-hidden transition-colors relative" 
            onClick={handleRichTextClick}
            style={{ fontFamily: customFontFamily }} // ✨ 套用全域自訂字體
        >
            {UpdateNotification}
            {tutorialStep === 0 && <button onClick={onBackToDashboard} className="absolute top-4 left-6 text-sm text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 font-bold z-50 transition-colors">← 返回列表</button>}
            
            {/* ✨ 全域注入：確保所有作答區 (包含傳統雙視窗) 的圖片都有指標樣式與放大動畫，以及題庫標籤顯示控制 */}
            <style dangerouslySetInnerHTML={{__html: `
                .qlib-question-tags { display: ${quizSettings?.showTags ? 'inline-block' : 'none'} !important; }
                .preview-rich-text img, .preview-rich-text canvas {
                    cursor: zoom-in !important;
                    transition: opacity 0.2s, transform 0.2s !important;
                }
                .preview-rich-text img:hover, .preview-rich-text canvas:hover {
                    opacity: 0.85 !important;
                    transform: scale(1.02) !important;
                }
            `}} />

           {/* (已改為選取文字自動上色) */}
            
            {/* ✨ 質感升級：毛玻璃導覽列 (拔除死板線條，改用柔和陰影) */}
            <div className={`bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl p-3 sm:p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] ring-1 ring-black/5 dark:ring-white/10 flex flex-wrap justify-between items-center rounded-[2rem] gap-3 shrink-0 transition-colors w-full mb-2 mt-6 ${tutorialStep > 0 ? '' : 'z-10'}`}>
                <div className="flex items-center flex-grow mr-2 w-full lg:w-auto overflow-hidden">
                    <div className="overflow-hidden flex-grow flex flex-col justify-center min-w-0">
                        <div className="flex items-center space-x-2">
    <div className="flex flex-col">
                                    <h2 className="font-bold truncate text-base dark:text-white leading-tight">{renderTestName(testName, false)}</h2>
                                    {subtitle && <span className="text-xs text-stone-500 dark:text-stone-400 font-bold truncate">{subtitle}</span>}
                                </div>
    {hasTimer && (
                                <span className={`font-mono font-bold px-1.5 py-0.5 rounded-2xl border ${isTimeUp ? 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 border-red-200 dark:border-red-700 animate-pulse' : 'bg-stone-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'} text-xs shrink-0`}>
                                    {isTimeUp ? '時間到' : `⏱ ${formatTime(displayTime)}`}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="shrink-0">進度: <span className="font-bold text-stone-800 dark:text-white">{userAnswers.filter(a=>a).length}</span> / {numQuestions}</span>
                            {starredIndices.length > 0 && (
                                <span className="text-amber-500 dark:text-amber-400 font-bold flex items-center bg-amber-50 dark:bg-gray-700 px-1.5 py-0.5 rounded max-w-[150px] sm:max-w-xs overflow-x-auto custom-scrollbar whitespace-nowrap">
                                    <span className="mr-1 shrink-0">★</span> 
                                    <div className="flex items-center">
                                        {starredIndices.map((num, idx) => (
                                            <React.Fragment key={num}>
                                                <button 
                                                    onClick={() => {
                                                        if (viewMode === 'interactive') {
                                                            const targetQ = parsedInteractiveQuestions.find(q => q.number === num);
                                                            if (targetQ) setCurrentInteractiveIndex(parsedInteractiveQuestions.indexOf(targetQ));
                                                        } else {
                                                            scrollToQuestion(num);
                                                        }
                                                    }}
                                                    className="hover:text-amber-700 dark:hover:text-amber-300 hover:underline cursor-pointer focus:outline-none"
                                                    title={`跳轉至第 ${num} 題`}
                                                >
                                                    {num}
                                                </button>
                                                {idx < starredIndices.length - 1 && <span className="mx-1 text-amber-300 dark:text-gray-500">,</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-row overflow-x-auto custom-scrollbar items-center gap-2 w-full lg:w-auto justify-start lg:justify-end pb-2 lg:pb-0">
                    
                    <button onClick={() => setShowSettingsModal(true)} className="shrink-0 bg-stone-50 dark:bg-gray-700 text-stone-800 dark:text-white px-4 py-2 sm:py-2.5 rounded-full font-bold border border-stone-200 dark:border-gray-600 text-sm hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors flex items-center shadow-sm">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        設定與管理
                    </button>

                    <button 
                        onClick={() => {
                            if (tutorialStep === 9) setTutorialStep(10);
                            handleSubmitClick();
                        }} 
                        className={`shrink-0 px-6 py-2 sm:py-2.5 rounded-full font-bold text-sm shadow-md transition-all active:scale-95 flex items-center ${tutorialStep === 9 ? 'tutorial-highlight relative z-[160] bg-amber-500 text-white ring-4 ring-amber-300 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-600 dark:hover:bg-amber-500'} ${tutorialStep === 99 ? 'hidden' : ''}`}
                    >
                        <span className="material-symbols-outlined text-[18px] mr-1.5">publish</span>
                        {isShared || isTask || testName.includes('[#op]') ? '直接交卷' : '交卷對答案'}
                    </button>
                </div>
            </div>
            
          {viewMode === 'interactive' ? (
                /* ✨ 修改：沉浸式作答介面 - 將大背景改為深石色 (降低刺眼感)，襯托前方的象牙白卡片，並加入細微漸層提升質感 */
                <div className="flex-grow flex flex-col w-full bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-900 dark:to-stone-950 transition-colors mt-2 overflow-hidden relative rounded-2xl shadow-inner border border-stone-300 dark:border-stone-800">
                    {/* ✨ 重新視覺設計：沉浸式作答與富文本自適應 (質感透明化) */}
<style dangerouslySetInnerHTML={{__html: `
    .preview-rich-text {
        word-break: break-word;
        white-space: pre-wrap;
        font-size: ${immersiveTextSize}rem;
        line-height: ${lineHeight}; /* ✨ 套用自訂行高 */
        font-family: ${customFontFamily} !important; /* ✨ 強制套用字體 */
        background-color: transparent !important; /* 拔除死白背景，完美融入卡片 */
        color: inherit !important; /* 自動繼承外部文字顏色 */
        border: none !important;
        padding: 0 !important;
    }
    /* 強制所有子元素繼承顏色與透明背景 (避免 Word 貼上時的底色殘留) */
    .preview-rich-text * {
        color: inherit !important;
        background-color: transparent !important;
        font-family: inherit !important;
    }
    /* ✨ 圖片與畫布保留白底圓角，確保透明 PNG 在暗色模式下依然清晰且具現代感 */
    .preview-rich-text img, .preview-rich-text canvas {
        display: block !important;
        max-width: 100% !important;
        height: auto !important;
        margin: 12px 0 !important;
        background-color: #FCFBF7 !important;
        border-radius: 12px !important; /* 圖片也加入現代圓角 */
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important; /* 圖片微陰影 */
        opacity: 1 !important;
        visibility: visible !important;
        cursor: zoom-in;
        transition: opacity 0.2s, transform 0.2s;
    }
    .preview-rich-text img:hover, .preview-rich-text canvas:hover {
        opacity: 0.85 !important;
        transform: scale(1.02);
    }
`}} />
                    
                    {parsedInteractiveQuestions.length === 0 ? (
                        <div className="text-center p-10 mt-10 text-gray-500 font-bold border border-dashed border-gray-300 bg-white dark:bg-gray-800 mx-4">
                            無法解析題目，請確認試題是否包含 [Q.1] 以及選項 [A], [B], [C], [D] 的格式標記。
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col h-full max-w-5xl xl:max-w-[1400px] mx-auto w-full relative px-4">
                            {/* 頂部導覽列 */}
                            <div className="bg-[#FCFBF7] dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 p-2 sm:p-4 flex flex-nowrap justify-between items-center shadow-sm z-20 gap-2 overflow-hidden shrink-0">
                                <div className="flex items-center gap-2 shrink-0">
                                    <button 
                                        onClick={() => setShowQuestionGrid(!showQuestionGrid)}
                                        className="font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 px-2 sm:px-3 py-1.5 rounded transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap text-sm sm:text-base"
                                    >
                                        <span>第 {currentInteractiveIndex + 1}/{parsedInteractiveQuestions.length} 題</span>
                                        <span className="text-xs hidden sm:inline">{showQuestionGrid ? '▲' : '▼'}</span>
                                    </button>
                                    
                                    {/* ✨ 進階狀態顯示：偷看題數與正確率 (手機隱藏) */}
                                    {(() => {
                                        const peekedIndices = peekedAnswers ? peekedAnswers.map((p, i) => p ? i : -1).filter(i => i !== -1) : [];
                                        if (peekedIndices.length === 0) return null;
                                        
                                        let correctPeeked = 0;
                                        peekedIndices.forEach(idx => {
                                            const cleanKey = (correctAnswersInput || '').replace(/[^a-dA-DZz,]/g, '');
                                            const keyArray = cleanKey.includes(',') ? cleanKey.split(',') : (cleanKey.match(/[A-DZ]|[a-dz]+/g) || []);
                                            const correctAns = keyArray[idx] || '';
                                            const userAns = userAnswers[idx] || '';
                                            
                                            if (correctAns.toLowerCase() === 'z' || correctAns.toLowerCase() === 'abcd') correctPeeked++;
                                            else if (correctAns !== '-' && correctAns !== '' && userAns) {
                                                if (correctAns === correctAns.toUpperCase() ? (userAns === correctAns) : correctAns.toLowerCase().includes(userAns.toLowerCase())) correctPeeked++;
                                            }
                                        });
                                        const accuracy = Math.round((correctPeeked / peekedIndices.length) * 100);
                                        
                                        return (
                                            <div className="hidden lg:flex items-center gap-2 px-2 py-1 bg-stone-100 dark:bg-stone-700/50 rounded-lg border border-stone-200 dark:border-stone-600 text-xs font-bold shrink-0 shadow-inner">
                                                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><span className="material-symbols-outlined text-[14px]">lock_open</span>已看:{peekedIndices.length}</span>
                                                <span className="text-emerald-600 dark:text-emerald-400">對:{correctPeeked}</span>
                                                <span className="text-rose-500 dark:text-rose-400">錯:{peekedIndices.length - correctPeeked}</span>
                                                <span className="bg-stone-800 text-white dark:bg-stone-900 px-1 py-0.5 rounded shadow-sm">{accuracy}%</span>
                                            </div>
                                        );
                                    })()}

                                    {/* ✨ 新增：文字大小調整控制器 (手機隱藏) */}
                                    <div className="hidden sm:flex items-center bg-stone-50 dark:bg-gray-700 rounded border border-stone-200 dark:border-gray-600 shrink-0">
                                        <button onClick={() => setImmersiveTextSize(prev => Math.max(0.6, prev - 0.2))} className="px-2 py-1 text-gray-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-600 font-black transition-colors">A-</button>
                                        <span className="px-2 text-xs font-bold text-gray-500 dark:text-gray-400 border-x border-stone-200 dark:border-gray-600 whitespace-nowrap">{Math.round(immersiveTextSize * 100)}%</span>
                                        <button onClick={() => setImmersiveTextSize(prev => Math.min(3.0, prev + 0.2))} className="px-2 py-1 text-gray-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-600 font-black transition-colors">A+</button>
                                    </div>
                                </div>
                                <div className="flex gap-1 sm:gap-2 shrink-0">
                                    <button
                                        disabled={currentInteractiveIndex === 0}
                                        onClick={() => {
                                            setCurrentInteractiveIndex(prev => Math.max(0, prev - 1));
                                            setShowQuestionGrid(false);
                                        }}
                                        className="bg-stone-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 sm:px-6 py-2.5 sm:py-2 font-black disabled:opacity-30 transition-colors rounded-xl border border-stone-200 dark:border-stone-600 text-base sm:text-sm whitespace-nowrap shrink-0 shadow-sm"
                                    >
                                        上一題
                                    </button>
                                    <button 
                                        disabled={currentInteractiveIndex === parsedInteractiveQuestions.length - 1}
                                        onClick={() => {
                                            setCurrentInteractiveIndex(prev => Math.min(parsedInteractiveQuestions.length - 1, prev + 1));
                                            setShowQuestionGrid(false);
                                        }}
                                        className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-4 sm:px-6 py-2.5 sm:py-2 font-black disabled:opacity-30 transition-colors shadow-md rounded-xl text-base sm:text-sm whitespace-nowrap shrink-0"
                                    >
                                        下一題
                                    </button>
                                </div>
                            </div>

                           {/* 展開的題號網格面板 */}
                            {showQuestionGrid && (
                                <div className="absolute top-[60px] left-0 right-0 bg-[#FCFBF7] dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 shadow-lg p-4 z-30 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    {['Q', 'SQ', 'ASQ'].map(targetType => {
                                        const typeQuestions = parsedInteractiveQuestions.filter(q => q.type === targetType);
                                        if (typeQuestions.length === 0) return null;
                                        return (
                                            <div key={targetType} className="mb-4 last:mb-0">
                                                <h4 className="text-sm font-black text-gray-600 dark:text-gray-300 mb-2 border-b dark:border-gray-600 pb-1 flex items-center gap-1">
                                                    {targetType === 'Q' ? <><span className="material-symbols-outlined text-[18px] text-amber-500">radio_button_checked</span> 選擇題</> : targetType === 'SQ' ? '🟢 簡答題' : '🟣 問答題'}
                                                </h4>
                                                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                                                    {typeQuestions.map((q) => {
                                                        const actualIdx = q.globalIndex; // ✨ 改用全域索引
                                                        const isAnswered = !!userAnswers[actualIdx];
                                                        const isStarred = starred[actualIdx];
                                                        const hasNote = notes && !!notes[actualIdx];
                                                        const isCurrent = currentInteractiveIndex === actualIdx;
                                                        
                                                        const isPeeked = peekedAnswers && peekedAnswers[actualIdx];
                                                        
                                                        let btnClasses = 'border-stone-200 dark:border-gray-600 hover:border-amber-400 dark:hover:border-amber-400 text-gray-600 dark:text-gray-300';
                                                        
                                                        if (isCurrent) {
                                                            btnClasses = 'border-black dark:border-white bg-stone-50 dark:bg-gray-700 text-stone-800 dark:text-white shadow-md scale-105 z-10';
                                                        } else if (isPeeked) {
                                                            // 偷看答案後顯示對錯顏色
                                                            const cleanKey = (correctAnswersInput || '').replace(/[^a-dA-DZz,]/g, '');
                                                            const keyArray = cleanKey.includes(',') ? cleanKey.split(',') : (cleanKey.match(/[A-DZ]|[a-dz]+/g) || []);
                                                            const correctAns = keyArray[actualIdx] || '';
                                                            const userAns = userAnswers[actualIdx] || '';
                                                            let isCorrect = false;
                                                            if (correctAns.toLowerCase() === 'z' || correctAns.toLowerCase() === 'abcd') isCorrect = true;
                                                            else if (correctAns !== '-' && correctAns !== '' && userAns) {
                                                                isCorrect = correctAns === correctAns.toUpperCase() ? (userAns === correctAns) : correctAns.toLowerCase().includes(userAns.toLowerCase());
                                                            }
                                                            btnClasses = isCorrect 
                                                                ? 'bg-emerald-100 border-emerald-400 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-600 dark:text-emerald-300' 
                                                                : 'bg-rose-100 border-rose-400 text-rose-800 dark:bg-rose-900/40 dark:border-rose-600 dark:text-rose-300';
                                                        } else if (isAnswered) {
                                                            btnClasses = 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-400';
                                                        }

                                                        return (
                                                            <button
                                                                key={actualIdx}
                                                                onClick={() => {
                                                                    setCurrentInteractiveIndex(actualIdx); // 利用全域索引跳轉
                                                                    setShowQuestionGrid(false);
                                                                }}
                                                                className={`relative py-2 font-bold text-sm border-2 transition-all rounded-lg ${btnClasses}`}
                                                            >
                                                                {q.number}
                                                                {isStarred && <span className="absolute -top-2.5 -right-2.5 text-amber-500 drop-shadow-sm z-10 material-symbols-outlined text-[16px] bg-white dark:bg-stone-800 rounded-full">star</span>}
                                                                {hasNote && <span className="absolute -top-2.5 -left-2.5 text-cyan-500 drop-shadow-sm z-10 material-symbols-outlined text-[16px] bg-white dark:bg-stone-800 rounded-full">edit_note</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 題目主體內容區 (可滾動) */}
                            <div className={`flex-grow overflow-y-auto p-2 sm:p-6 custom-scrollbar relative ${tutorialStep > 0 ? '' : 'z-10'}`}>
                                {(() => {
                                    const q = parsedInteractiveQuestions[currentInteractiveIndex];
                                    if (!q) return null;
                                    const actualIdx = q.globalIndex; 
                                    const currentAns = userAnswers[actualIdx];
                                    const isStarred = starred[actualIdx];
                                    
                                    // 取得閱卷後的詳細數據 (如果有的話)
                                    const itemData = results?.data?.find(d => d.number === (actualIdx + 1));
                                    
                                    const isPeeked = peekedAnswers && peekedAnswers[actualIdx];
                                    const isNormalQuiz = !isTask && taskType === 'normal';
                                    const canPeek = allowPeek && (isNormalQuiz || isShared);
                                    
                                    const cleanKey = (correctAnswersInput || '').replace(/[^a-dA-DZz,]/g, '');
                                    const keyArray = cleanKey.includes(',') ? cleanKey.split(',') : (cleanKey.match(/[A-DZ]|[a-dz]+/g) || []);
                                    const currentCorrectAns = q.ans || keyArray[actualIdx] || '';
                                    const expTags = q.type === 'Q' ? ['A'] : q.type === 'SQ' ? ['SA', 'SQ'] : ['ASA'];
                                    const currentExp = q.explain || (typeof extractSpecificContent === 'function' ? extractSpecificContent(explanationHtml, q.number, expTags) : '');
                                    const qStats = q.id && globalStats ? globalStats[q.id] : null;

                                    return (
                                <div key={actualIdx} className={`bg-white dark:bg-stone-800/95 shadow-[0_4px_20px_rgb(0,0,0,0.04)] sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-2xl sm:rounded-[2rem] p-4 sm:p-10 mb-10 transition-all ${isPeeked ? 'ring-2 ring-amber-400 dark:ring-amber-500 shadow-amber-500/10' : 'sm:ring-1 sm:ring-black/5 dark:sm:ring-white/10'}`}>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 border-b border-stone-100 dark:border-stone-700 pb-5">
                                        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
                                            <span className={`text-3xl font-black tracking-tight ${q.type === 'Q' ? 'text-amber-500 dark:text-amber-500' : q.type === 'SQ' ? 'text-cyan-500 dark:text-cyan-400' : 'text-purple-500 dark:text-purple-400'}`}>
                                                第 {q.type === 'Q' ? q.number : `${q.type}.${q.number}`} 題
                                                {itemData && <span className="ml-2 text-sm font-bold opacity-70">({(itemData.earnedPoints || 0).toFixed(1).replace(/\.0$/, '')} / {(itemData.maxPoints || 0).toFixed(1).replace(/\.0$/, '')})</span>}
                                            </span>
                                            <div className="flex items-center">
                                                    <button onClick={() => toggleStar(actualIdx)} className={`text-2xl focus:outline-none transition-transform ${isStarred ? 'text-amber-500 scale-110' : 'text-gray-300 dark:text-gray-600'} hover:scale-125`} title="標記星號">★</button>
                                                    <button onClick={() => {
                                                        const tempDiv = document.createElement('div');
                                                        let fullText = q.mainText;
                                                        
                                                        // 如果是選擇題，就把選項依序拼接上去
                                                        if (q.type === 'Q' && q.options) {
                                                            fullText += '<br><br>';
                                                            ['A', 'B', 'C', 'D'].forEach(opt => {
                                                                if (q.options[opt]) {
                                                                    fullText += `${opt}. ${q.options[opt]}<br>`;
                                                                }
                                                            });
                                                        }
                                                        
                                                        tempDiv.innerHTML = fullText;
                                                        navigator.clipboard.writeText(tempDiv.innerText);
                                                        showAlert('✅ 題目與選項已複製！');
                                                    }} className="text-xl focus:outline-none transition-colors text-gray-300 dark:text-gray-600 hover:text-amber-500 hover:scale-110 ml-3" title="複製題目與選項">
                                                        <span className="material-symbols-outlined text-[20px]">content_copy</span>
                                                    </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            {itemData && <span className={`text-xs px-2 py-1 font-bold border ${itemData.isCorrect ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{itemData.isCorrect ? '✅ 答對' : '❌ 錯誤'}</span>}
                                            <span className="text-sm font-bold bg-stone-50 dark:bg-stone-900 px-4 py-2 text-gray-600 dark:text-gray-300 ring-1 ring-black/5 dark:ring-white/10 rounded-xl flex-grow sm:flex-grow-0 text-center shadow-inner">
                                                作答: <span className="text-amber-600 dark:text-amber-400 font-black">{currentAns || '未填'}</span>
                                            </span>
                                        </div>
                                    </div>
                                        
                                    {/* ✨ 修復：將發光白底移到外層容器，避免被富文本的強制透明吃掉 */}
                                    <div className={`transition-all ${tutorialStep === 6 && actualIdx === 0 ? 'tutorial-highlight relative z-[160] bg-white dark:bg-stone-800 p-5 -mx-4 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] ring-2 ring-amber-400 mb-4' : 'mb-8'}`}>
                                        <div className="text-gray-800 dark:text-gray-200 leading-relaxed preview-rich-text !border-none !p-0 !bg-transparent" dangerouslySetInnerHTML={{ __html: q.mainText }} />
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        {q.type === 'Q' ? ['A', 'B', 'C', 'D'].map(opt => {
                                            const hasCustomContent = !!q.options[opt];
                                            const isSelected = currentAns === opt;
                                            const elimKey = `${actualIdx}_${opt}`;
                                            const isEliminated = eliminatedOptions[elimKey];
                                            const isCorrectOpt = (isPeeked || !!results) && (currentCorrectAns.toLowerCase().includes(opt.toLowerCase()) || currentCorrectAns.toLowerCase() === 'abcd' || currentCorrectAns.toLowerCase() === 'z');
                                            
                                          let btnClasses = `text-left w-full py-3 sm:py-4 px-4 sm:px-6 transition-all flex items-start space-x-3 sm:space-x-4 rounded-xl sm:rounded-[1.5rem] flex-1 ring-1 sm:ring-1 `;
                                            if (isPeeked || !!results) {
                                                if (isCorrectOpt) btnClasses += 'bg-emerald-50 ring-emerald-400 dark:bg-emerald-900/20 dark:ring-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-md ';
                                                else if (isSelected) btnClasses += 'bg-rose-50 ring-rose-400 dark:bg-rose-900/20 dark:ring-rose-500 text-rose-900 dark:text-rose-100 shadow-sm ';
                                                else btnClasses += 'bg-stone-50/50 ring-black/5 dark:bg-stone-800/50 dark:ring-white/10 opacity-40 ';
                                                btnClasses += 'cursor-not-allowed ';
                                            } else {
                                                btnClasses += isSelected ? 'bg-amber-50 ring-amber-400 dark:bg-amber-900/30 dark:ring-amber-500 scale-[1.01] shadow-md ' : 'bg-white dark:bg-stone-800 ring-black/5 dark:ring-white/10 hover:ring-amber-300 dark:hover:ring-amber-500 shadow-sm hover:scale-[1.005] ';
                                                if (isTimeUp) btnClasses += 'locked-btn opacity-80 ';
                                                if (isEliminated) btnClasses += 'opacity-30 grayscale '; 
                                            }

                                                    return (
                                                        <div key={opt} className={`flex items-stretch gap-2 w-full transition-all ${tutorialStep === 6 && actualIdx === 0 ? 'tutorial-highlight relative z-[160] ring-4 ring-amber-400 bg-white dark:bg-stone-800 p-1.5 -m-1.5 rounded-3xl shadow-[0_10px_40px_rgba(245,158,11,0.3)]' : ''}`}>
                                                            {quizSettings.showEliminationBtn && !results && (
                                                                <button
                                                                    disabled={isTimeUp || isPeeked}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEliminatedOptions(prev => ({ ...prev, [elimKey]: !prev[elimKey] }));
                                                                        if (!isEliminated && isSelected) handleAnswerSelect(actualIdx, opt);
                                                                    }}
                                                                    className={`w-10 sm:w-12 flex items-center justify-center border-2 transition-all duration-200 rounded-[1.5rem] shrink-0 active:scale-95 ${isEliminated ? 'bg-stone-200/50 border-stone-300 text-stone-500 dark:bg-stone-700/50 dark:border-stone-600 dark:text-stone-400 shadow-inner' : 'bg-white border-stone-200 text-stone-300 hover:text-rose-500 hover:border-rose-300 hover:bg-rose-50 dark:bg-stone-800 dark:border-stone-700 dark:hover:bg-rose-900/20 dark:hover:border-rose-700 dark:hover:text-rose-400 shadow-sm hover:shadow-md'}`}
                                                                    title={isEliminated ? '取消刪去' : '刪去此選項'}
                                                                >
                                                                    <span className="material-symbols-outlined text-[20px]">
                                                                        {isEliminated ? 'undo' : 'close'}
                                                                    </span>
                                                                </button>
                                                            )}
                                                            <button 
                                                                disabled={isTimeUp || isPeeked || !!results}
                                                                onClick={() => {
                                                                    if (!isEliminated) {
                                                                        if (tutorialStep === 6 && actualIdx === 0) setTutorialStep(7);
                                                                        handleAnswerSelect(actualIdx, opt);
                                                                    }
                                                                }}
                                                                className={btnClasses}
                                                            >
                                                                <span className={`font-black mt-0.5 w-6 shrink-0 text-center ${isSelected ? 'text-amber-600' : 'text-gray-400'}`}>{opt}.</span>
                                                                {hasCustomContent ? (
                                                                    <div className={`preview-rich-text !p-0 !border-none !bg-transparent w-full flex-1 ${isSelected ? 'text-stone-800 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`} dangerouslySetInnerHTML={{ __html: q.options[opt] }} />
                                                                ) : (
                                                                    <span className="w-full flex-1 text-gray-400 italic">(選項無內容)</span>
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                }) : (
                                                    <textarea 
                                                        disabled={isTimeUp || isPeeked || !!results}
                                                        value={currentAns || ''}
                                                        onChange={e => {
                                                            const newAns = [...userAnswers];
                                                            newAns[actualIdx] = e.target.value;
                                                            setUserAnswers(newAns);
                                                        }}
                                                        className={`w-full p-4 h-40 text-base border-2 outline-none bg-[#FCFBF7] dark:bg-stone-800 dark:text-white shadow-inner transition-colors focus:ring-4 rounded-xl ${q.type === 'SQ' ? 'border-cyan-500 ring-cyan-200' : 'border-amber-700500 ring-amber-700200'} resize-none custom-scrollbar`}
                                                        placeholder={`請輸入${q.type === 'SQ' ? '簡答' : '問答'}答案...`}
                                                    />
                                                )}
                                            </div>
                                            
                                            {canPeek && !isPeeked && !results && (
                                                <div className="mt-6 flex justify-end">
                                                    <button 
                                                        onClick={() => {
                                                            if (tutorialStep === 7 && actualIdx === 0 && !quizSettings.askBeforePeek) setTutorialStep(8);
                                                            handlePeek(actualIdx);
                                                        }} 
                                                        className={`text-sm font-bold px-5 py-2.5 transition-colors border flex items-center gap-1.5 rounded-full shadow-sm ${tutorialStep === 7 && actualIdx === 0 ? 'tutorial-highlight relative z-[160] bg-amber-500 text-white border-amber-600 ring-4 ring-amber-300 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 hover:bg-amber-200 border-amber-200'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">key</span>
                                                        偷看答案
                                                    </button>
                                                </div>
                                            )}

                                            {(isPeeked || results) && (
                                                <div className="mt-6 p-4 sm:p-5 bg-amber-50 dark:bg-stone-900 border border-amber-200 dark:border-amber-800 text-sm rounded-2xl">
                                                    <div className="font-bold text-amber-700 dark:text-amber-400 mb-3 pb-3 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
<span className="flex items-center gap-1">{results ? <><span className="material-symbols-outlined text-[18px]">lightbulb</span> 試題詳解</> : <><span className="material-symbols-outlined text-[18px]">lock</span> 此題已看過答案並鎖定</>}</span>                                                        <span className="bg-[#FCFBF7] dark:bg-stone-800 px-3 py-1 rounded border border-amber-200 text-stone-800 dark:text-white">標準答案: {currentCorrectAns || '未設定'}</span>
                                                    </div>
                                                    {currentExp ? (
                                                        <div className="preview-rich-text !bg-transparent !p-0 !border-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml((currentExp || '').replace(/<br\s*\/?>/gi, '\n')) }} />
                                                    ) : (
                                                        <p className="text-gray-500 italic mb-2 font-bold">此題無提供詳解。</p>
                                                    )}

                                                   
                                                    
                                                    {/* ✨ 選答分析與全球數據 ✨ */}
                                                    {qStats && (
                                                        <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
                                                            <div className="flex items-center gap-1 font-black text-indigo-600 dark:text-indigo-400 mb-3 text-sm">
                                                                <span className="material-symbols-outlined text-[18px]">analytics</span>
                                                                全體玩家選答分析 (共 {qStats.total || 0} 次作答)
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 mb-3">
                                                                {['A', 'B', 'C', 'D'].map(opt => {
                                                                    const count = qStats[`opts_${opt}`] || 0;
                                                                    const pct = qStats.total ? Math.round((count / qStats.total) * 100) : 0;
                                                                    const isAns = opt === currentCorrectAns;
                                                                    return (
                                                                        <div key={opt} className={`flex-1 min-w-[60px] p-2 rounded-lg border ${isAns ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shadow-sm' : 'bg-stone-50 border-stone-200 dark:bg-stone-900/50 dark:border-stone-700 text-stone-600 dark:text-stone-400'}`}>
                                                                            <div className="font-black mb-1 text-sm">{opt}</div>
                                                                            <div className="text-xl font-black">{pct}%</div>
                                                                            <div className="text-[10px] font-bold opacity-70 mt-1">{count} 人選擇</div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs text-gray-500 font-bold border-t border-amber-100 dark:border-amber-800/50 pt-3">
                                                                <span>總體答對率: {qStats.total ? Math.round(((qStats.correct || 0) / qStats.total) * 100) : 0}%</span>
                                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">bookmark_added</span> 已被收錄至錯題本: {qStats.bookmarks || 0} 次</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="mt-4 pt-4 border-t border-amber-200 flex justify-end">
                                                        <button 
                                                            disabled={loadingWrongBookNum === q.number}
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                if (q.id) {
                                                                window.db.collection('publicQlib_stats').doc(q.id).set({
                                                                    bookmarks: window.firebase.firestore.FieldValue.increment(1)
                                                                }, { merge: true }).catch(e => console.error(e));
                                                            }
                                                            handleAddToWrongBook({
                                                                number: q.number,
                                                                userAns: currentAns || '未填寫',
                                                                correctAns: currentCorrectAns || '無'
                                                            });
                                                            }} 
                                                            className={`text-xs sm:text-sm bg-[#FCFBF7] dark:bg-stone-800 text-red-600 px-4 py-2 font-bold rounded-full border border-red-200 hover:bg-red-50 transition-colors shadow-sm ${loadingWrongBookNum === q.number ? 'opacity-50 cursor-wait' : ''}`}
                                                        >
{loadingWrongBookNum === q.number ? <><span className="material-symbols-outlined text-[16px] mr-1 animate-spin">autorenew</span>處理中...</> : <><span className="material-symbols-outlined text-[16px] mr-1">bookmark_add</span>收錄錯題</>}                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {(isPeeked || results) && (
                                                <>
                                                    {initialRecord.isPublicExam && !initialRecord.isIndependentQuestions && (
                                                        <PublicQuestionDiscussion examId={initialRecord.id} questionNum={q.number} currentUser={currentUser} userProfile={userProfile} />
                                                    )}
                                                    {initialRecord.isIndependentQuestions && q.id && (
                                                        <QlibQuestionDiscussion questionId={q.id} currentUser={currentUser} userProfile={userProfile} />
                                                    )}
                                                </>
                                            )}
                                            <div className="mt-6 border-t border-gray-100 dark:border-stone-700 pt-4">
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">📝 我的筆記 (自動儲存)</label>
                                                <textarea 
                                                    className="w-full p-4 border border-stone-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:text-gray-200 custom-scrollbar resize-none h-24 transition-all"
                                                    placeholder="在此輸入這題的重點筆記..."
                                                    value={(notes && notes[actualIdx]) || ''}
                                                    onChange={(e) => {
                                                        const newNotes = notes ? [...notes] : Array(Number(numQuestions)).fill('');
                                                        newNotes[actualIdx] = e.target.value;
                                                        setNotes(newNotes);
                                                    }}
                                                ></textarea>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
            <div 
                ref={splitContainerRef}
                className={`flex-grow flex ${layoutMode === 'horizontal' ? 'flex-row' : 'flex-col'} overflow-hidden relative w-full mt-2 sm:mt-4`}
            >
                {isDragging && (
                    <div className="absolute inset-0 z-50" style={{ cursor: layoutMode === 'horizontal' ? 'col-resize' : 'row-resize' }}></div>
                )}

                {(questionFileUrl || questionText || questionHtml) && previewOpen && (
                    <div 
                        className="bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm rounded-2xl flex flex-col shrink-0 transition-colors"
                        style={{ [layoutMode === 'horizontal' ? 'width' : 'height']: `${splitRatio}%` }}
                    >
                        <div className="bg-gray-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 px-3 py-2 flex justify-between items-center shrink-0 transition-colors">
                            <span className="font-bold text-xs text-gray-600 dark:text-gray-300 flex items-center"><span className="text-sm mr-1">📄</span> 試卷預覽區</span>
                            <div className="flex space-x-3 items-center">
                                {questionFileUrl && (
                                    <div className="flex space-x-1 items-center bg-[#FCFBF7] dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                                        <button onClick={() => setPdfZoom(z => Math.max(0.5, z - 0.2))} className="px-2 font-bold text-gray-600 dark:text-gray-200">-</button>
                                        <span className="text-[10px] w-8 text-center font-bold dark:text-gray-200">{Math.round(pdfZoom * 100)}%</span>
                                        <button onClick={() => setPdfZoom(z => Math.min(3, z + 0.2))} className="px-2 font-bold text-gray-600 dark:text-gray-200">+</button>
                                    </div>
                                )}
                                {questionFileUrl && (
                                    <a href={questionFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-bold underline">在新分頁開啟</a>
                                )}
                            </div>
                        </div>
                        <div className="flex-grow w-full relative bg-stone-100 dark:bg-stone-800 flex flex-col overflow-auto">
                            {questionFileUrl && (
                                <div style={{ transform: `scale(${pdfZoom})`, transformOrigin: 'top left', width: `${100/pdfZoom}%`, height: `${100/pdfZoom}%` }} className={`relative shrink-0`}>
                                    <iframe src={getEmbedUrl(questionFileUrl)} className="absolute inset-0 w-full h-full border-0 bg-[#FCFBF7]" allow="autoplay" allowFullScreen></iframe>
                                </div>
                            )}
                            {questionText && !questionHtml && (
                                <div className="w-full relative bg-[#FCFBF7] dark:bg-stone-800 flex flex-col flex-grow h-full">
                                    <textarea 
                                        className="absolute inset-0 w-full h-full p-4 resize-none outline-none custom-scrollbar text-sm leading-relaxed bg-gray-50 dark:bg-stone-900 text-gray-700 dark:text-gray-300"
                                        style={{ whiteSpace: 'pre-wrap' }}
                                        value={questionText}
                                        readOnly={true}
                                        placeholder="沒有提供試題文字"
                                    ></textarea>
                                </div>
                            )}
                            {questionHtml && (
                                <div className={`w-full relative bg-gray-50 dark:bg-stone-900 flex flex-col flex-grow h-full`}>
                                   <div className="absolute inset-0 w-full h-full p-4 custom-scrollbar text-stone-800 dark:text-stone-200 overflow-y-auto">
                                        <style dangerouslySetInnerHTML={{__html: `
                                            .preview-rich-text { word-break: break-word; white-space: pre-wrap; font-size: ${splitTextSize}rem; line-height: 1.625; }
                                            .preview-rich-text p { margin-bottom: 0.75em !important; }
                                            .preview-rich-text div { margin-bottom: 0.25em !important; }
                                            .preview-rich-text ul { list-style-type: disc !important; margin-left: 1.5em !important; margin-bottom: 0.5em !important; }
                                            .preview-rich-text ol { list-style-type: decimal !important; margin-left: 1.5em !important; margin-bottom: 0.5em !important; }
                                        `}} />
                                        <div 
                                            className="preview-rich-text"
                                            dangerouslySetInnerHTML={{ __html: processQuestionContent(questionHtml, true) }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(questionFileUrl || questionText || questionHtml) && previewOpen && (
                    <div 
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        className={`${layoutMode === 'horizontal' ? 'w-4 h-full cursor-col-resize flex-col' : 'h-4 w-full cursor-row-resize flex-row'} bg-stone-50 dark:bg-stone-900 hover:bg-amber-200 dark:hover:bg-amber-800 flex items-center justify-center shrink-0 z-40 transition-colors active:bg-amber-300`}
                    >
                        <div className={`${layoutMode === 'horizontal' ? 'w-1 h-8' : 'h-1 w-8'} bg-gray-400 dark:bg-gray-600 rounded-full`}></div>
                    </div>
                )}

                <div className={`flex-grow flex flex-col bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xl rounded-2xl overflow-hidden transition-colors`}>
                    <div className="bg-stone-50 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-700 px-5 py-3 shrink-0 flex justify-between items-center transition-colors">
                        <span className="font-bold text-sm text-stone-600 dark:text-stone-300"><span className="material-symbols-outlined text-[18px] mr-1 align-bottom">edit_square</span> 答案卡 {isTimeUp && <span className="text-red-500 ml-2">(已鎖定)</span>}</span>
                    </div>
                    <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 sm:p-6 custom-scrollbar bg-[#FCFBF7] dark:bg-stone-800 transition-colors">
                        
                        {/* <span className="material-symbols-outlined text-[18px] mr-1 align-bottom text-amber-500">radio_button_checked</span> 選擇題作答區塊 */}
                        {parsedQuestionTypes.some(t => t === 'Q') && (
                            <>
                                <h4 className="font-bold text-amber-600 dark:text-amber-400 mb-2 border-b-2 border-amber-200 dark:border-amber-800 pb-1"><span className="material-symbols-outlined text-[18px] mr-1 align-bottom text-amber-500">radio_button_checked</span> 選擇題作答區</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px 16px', marginBottom: '24px' }}>
                                    {userAnswers.map((ans, i) => {
                                        if (parsedQuestionTypes[i] !== 'Q') return null;
                                        const currentCleanKey = (correctAnswersInput || '').replace(/[^a-dA-DZz]/g, '');
                                        const key = currentCleanKey[i] || '-';
                                        const isBonus = (key === 'Z' || key === 'z');

                                        return (
                                            <div key={i} id={`answer-card-${i+1}`} className={`break-avoid flex items-center justify-between py-2.5 border-b border-amber-50 dark:border-amber-900/30 pr-2 transition-colors rounded ${isBonus ? 'bg-amber-50 dark:bg-amber-900/40' : 'bg-amber-50/30 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/40'}`}>
                                                <div className="flex items-center space-x-2 shrink-0 w-20 pl-1">
                                                    <button 
                                                        onClick={() => scrollToQuestion(i+1)}
                                                        className={`font-mono text-sm font-bold transition-colors cursor-pointer ${isBonus ? 'text-amber-600 dark:text-amber-400' : 'text-amber-800 dark:text-amber-300'}`}
                                                        title="點擊跳轉至此題"
                                                    >{i+1}.</button>
                                                    <button 
                                                        disabled={isTimeUp}
                                                        onClick={() => toggleStar(i)} 
                                                        className={`text-sm focus:outline-none ${starred[i] ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'} ${isTimeUp ? 'cursor-not-allowed opacity-50' : 'hover:text-gray-400'}`}
                                                    >★</button>
                                                    {isBonus && <span className="text-[10px] bg-amber-400 text-stone-800 px-1.5 py-0.5 rounded-sm font-bold animate-pulse shadow-sm"><span className="material-symbols-outlined text-[14px] mr-1">card_giftcard</span></span>}
                                                </div>
                                                <div className="flex space-x-1 shrink-0 items-center flex-1">
{peekedAnswers && peekedAnswers[i] && <span className="text-xs mr-2 text-amber-500 font-bold flex items-center" title="已偷看答案"><span className="material-symbols-outlined text-[16px]">lock</span></span>}                                                    {['A','B','C','D'].map(o => (
                                                        <button 
                                                            key={o} 
                                                            disabled={isTimeUp || (peekedAnswers && peekedAnswers[i])}
                                                            onClick={() => handleAnswerSelect(i, o)} 
                                                            className={`w-8 h-8 text-sm font-bold border-2 rounded-2xl transition-all 
                                                                ${ans === o ? 'bg-amber-600 border-amber-600 text-white scale-105 shadow-sm' : 'bg-[#FCFBF7] dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'}
                                                                ${isTimeUp || (peekedAnswers && peekedAnswers[i]) ? 'locked-btn opacity-60' : 'hover:border-amber-400'}
                                                                ${isBonus && ans !== o && !isTimeUp ? 'border-amber-300 dark:border-amber-700' : ''}`}
                                                        >{o}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* <span className="material-symbols-outlined text-[18px] mr-1 align-bottom text-cyan-500">short_text</span> 非選擇題作答區塊 */}
                        {parsedQuestionTypes.some(t => t !== 'Q') && (
                            <>
                                <h4 className="font-bold text-cyan-600 dark:text-cyan-400 mb-2 border-b-2 border-cyan-200 dark:border-cyan-800 pb-1 mt-4"><span className="material-symbols-outlined text-[18px] mr-1 align-bottom text-cyan-500">short_text</span> 非選擇題作答區</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {userAnswers.map((ans, i) => {
                                        const type = parsedQuestionTypes[i];
                                        if (type === 'Q') return null;

                                        return (
                                            <div key={i} id={`answer-card-${i+1}`} className="flex flex-col space-y-2 bg-cyan-50/30 dark:bg-cyan-900/10 p-3 border border-cyan-100 dark:border-cyan-900/50 rounded">
                                                <div className="flex justify-between items-center w-full">
                                                    <div className="flex items-center space-x-2">
                                                        <button 
                                                            onClick={() => scrollToQuestion(i+1)}
                                                            className="font-mono text-sm font-bold text-cyan-800 dark:text-cyan-300 hover:underline"
                                                        >{i+1}. {type === 'SQ' ? '簡答題' : '問答題'}</button>
                                                        <button 
                                                            disabled={isTimeUp}
                                                            onClick={() => toggleStar(i)} 
                                                            className={`text-sm focus:outline-none ${starred[i] ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`}
                                                        >★</button>
                                                    </div>
                                                    {peekedAnswers && peekedAnswers[i] && <span className="text-xs text-amber-500 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">lock</span> 已鎖定</span>}
                                                </div>
                                                
                                                {type === 'SQ' ? (
                                                    <input 
                                                        type="text"
                                                        disabled={isTimeUp || (peekedAnswers && peekedAnswers[i])}
                                                        value={ans || ''}
                                                        onChange={(e) => {
                                                            const newAns = [...userAnswers];
                                                            newAns[i] = e.target.value;
                                                            setUserAnswers(newAns);
                                                        }}
                                                        placeholder="請輸入簡答..."
                                                        className="w-full text-sm p-2 border-2 border-cyan-200 focus:border-cyan-400 dark:border-cyan-700 dark:bg-stone-800 text-stone-800 dark:text-white outline-none font-bold shadow-inner transition-colors"
                                                    />
                                                ) : (
                                                    <textarea 
                                                        disabled={isTimeUp || (peekedAnswers && peekedAnswers[i])}
                                                        value={ans || ''}
                                                        onChange={(e) => {
                                                            const newAns = [...userAnswers];
                                                            newAns[i] = e.target.value;
                                                            setUserAnswers(newAns);
                                                        }}
                                                        placeholder="請輸入問答詳解..."
                                                        className="w-full h-24 text-sm p-2 border-2 border-amber-700200 focus:border-amber-700400 dark:border-amber-700700 dark:bg-stone-800 text-stone-800 dark:text-white outline-none font-bold shadow-inner resize-none custom-scrollbar transition-colors"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>

            </div>
            )}

            {/* ✨ 修復：在作答頁面 (偷看答案時) 也能正常彈出錯題收錄 Modal */}
            {wrongBookAddingItem && (
                <WrongBookModal
                    title={`收錄第 ${wrongBookAddingItem.number} 題`}
                    initialData={{ 
                        qText: wrongBookAddingItem.extractedQText || '', 
                        qHtml: wrongBookAddingItem.extractedQHtml || '',
                        nText: wrongBookAddingItem.extractedExp || '', 
                        folder: localStorage.getItem('lastWrongBookFolder') || '未分類',
                        userFolders: Array.from(new Set(userProfile?.wrongBookFolders || ['未分類'])),
                        // ✨ 傳入樹狀結構所需的資料與渲染函式
                        folderTree: (() => {
                            const rawList = Array.from(new Set(userProfile?.wrongBookFolders || ['未分類']));
                            const tree = {};
                            rawList.forEach(f => {
                                if (f === '未分類') return;
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
                        })(),
                        renderFolderTree: renderFolderTree
                    }}
                    onClose={() => setWrongBookAddingItem(null)}
                    onSave={async (data) => {
                        try {
                            localStorage.setItem('lastWrongBookFolder', data.folder || '未分類');
                            await window.db.collection('users').doc(currentUser.uid).collection('wrongBook').add({
                                quizId: quizId,
                                folder: data.folder || '未分類',
                                quizName: cleanQuizName(testName),
                                questionNum: wrongBookAddingItem.number,
                                userAns: wrongBookAddingItem.userAns || '未填寫',
                                correctAns: wrongBookAddingItem.correctAns,
                                qText: data.qText || '',
                                qHtml: data.qHtml || '',
                                qImage: data.qImage,
                                nText: data.nText,
                                nImage: data.nImage,
                                // ✨ 紀錄獨立題庫關聯屬性
                                source: wrongBookAddingItem.source || 'quiz',
                                qlibQuestionId: wrongBookAddingItem.qlibQuestionId || null,
                                qlibSubjectId: wrongBookAddingItem.qlibSubjectId || null,
                                qlibChapterId: wrongBookAddingItem.qlibChapterId || null,
                                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                            });
                            if (data.folder && !userProfile.wrongBookFolders?.includes(data.folder)) {
                                await window.db.collection('users').doc(currentUser.uid).set({
                                    wrongBookFolders: window.firebase.firestore.FieldValue.arrayUnion(data.folder)
                                }, { merge: true });
                            }
                            showAlert(`第 ${wrongBookAddingItem.number} 題已成功收錄至「錯題整理」！`, "收錄成功");
                            setWrongBookAddingItem(null);
                        } catch(e) {
                            showAlert("收錄失敗：" + e.message);
                        }
                    }}
                    showAlert={showAlert}
                />
            )}

            {/* ✨ 全域彈窗：確保在結果頁面放大圖片不被擋住 */}
            {previewLightboxImg && (
                <div className="fixed inset-0 bg-stone-800/90 flex items-center justify-center z-[9999] p-4 cursor-zoom-out" onClick={() => setPreviewLightboxImg(null)}>
                    <img src={previewLightboxImg} className="max-w-full max-h-[90vh] object-contain shadow-2xl bg-[#FCFBF7] p-2" alt="放大預覽" />
                    <button className="absolute top-4 right-4 text-white text-3xl font-bold bg-stone-800/50 w-12 h-12 rounded-full flex items-center justify-center">✖</button>
                </div>
            )}

            {/* ✨ 確保在作答頁面按下交卷時也能看到進度條 */}
            {gradingProgress.show && (
                <div className="fixed inset-0 bg-stone-800 bg-opacity-80 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 w-full max-w-md rounded-2xl shadow-2xl text-center border-t-8 border-emerald-500">
                        <div className="text-4xl mb-4">{gradingProgress.percent >= 100 ? '🎉' : '⏳'}</div>
                        <h3 className="text-xl font-black mb-4 dark:text-white">{gradingProgress.percent >= 100 ? '批改完成！' : '正在批改試卷...'}</h3>
                        
                        <div className="w-full bg-stone-100 dark:bg-gray-700 h-4 rounded-2xl overflow-hidden mb-3 relative">
                            <div 
                                className={`h-full transition-all duration-300 ease-out ${gradingProgress.percent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${gradingProgress.percent}%` }}
                            ></div>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-300 font-bold text-sm">{gradingProgress.text}</p>
                        {gradingProgress.percent < 100 && gradingProgress.percent > 25 && (
                            <p className="text-xs text-gray-400 mt-2">若是包含問答題，AI 閱卷約需 10~20 秒，請耐心等候。</p>
                        )}
                    </div>
                </div>
            )}

            {isRegrading && (
                <div className="fixed inset-0 bg-stone-800 bg-opacity-80 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 w-full max-w-sm rounded-2xl shadow-2xl text-center border-t-8 border-amber-500">
                        <div className="w-16 h-16 border-4 border-stone-200 dark:border-stone-700 border-t-amber-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black mb-2 dark:text-white">🔄 正在處理中...</h3>
                    </div>
                </div>
            )}

            {/* ✨ 全域圖片放大預覽 Modal */}
            {previewLightboxImg && (
                <div className="fixed inset-0 bg-stone-800/90 flex items-center justify-center z-[9999] p-4 cursor-zoom-out" onClick={() => setPreviewLightboxImg(null)}>
                    <img src={previewLightboxImg} className="max-w-full max-h-[90vh] object-contain shadow-2xl bg-[#FCFBF7] p-2" alt="放大預覽" />
                    <button className="absolute top-4 right-4 text-white text-3xl font-bold bg-stone-800/50 w-12 h-12 rounded-full flex items-center justify-center">✖</button>
                </div>
            )}

            {/* ✨ 錯題收錄 Modal (含記憶上一次資料夾) */}
            {wrongBookAddingItem && (
                <WrongBookModal
                    title={`收錄第 ${wrongBookAddingItem.number} 題`}
                    initialData={{ 
                        qText: wrongBookAddingItem.extractedQText || '', 
                        qHtml: wrongBookAddingItem.extractedQHtml || '',
                        nText: wrongBookAddingItem.extractedExp || '', 
                        folder: localStorage.getItem('lastWrongBookFolder') || '未分類',
                        userFolders: Array.from(new Set(userProfile?.wrongBookFolders || ['未分類'])),
                        // ✨ 傳入樹狀結構所需的資料與渲染函式
                        folderTree: (() => {
                            const rawList = Array.from(new Set(userProfile?.wrongBookFolders || ['未分類']));
                            const tree = {};
                            rawList.forEach(f => {
                                if (f === '未分類') return;
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
                        })(),
                        renderFolderTree: renderFolderTree
                    }}
                    onClose={() => setWrongBookAddingItem(null)}
                    onSave={async (data) => {
                        try {
                            localStorage.setItem('lastWrongBookFolder', data.folder || '未分類');
                            await window.db.collection('users').doc(currentUser.uid).collection('wrongBook').add({
                                quizId: quizId,
                                folder: data.folder || '未分類',
                                quizName: cleanQuizName(testName),
                                questionNum: wrongBookAddingItem.number,
                                userAns: wrongBookAddingItem.userAns || '未填寫',
                                correctAns: wrongBookAddingItem.correctAns,
                                qText: data.qText || '',
                                qHtml: data.qHtml || '',
                                qImage: data.qImage,
                                nText: data.nText,
                                nImage: data.nImage,
                                // ✨ 紀錄獨立題庫關聯屬性
                                source: wrongBookAddingItem.source || 'quiz',
                                qlibQuestionId: wrongBookAddingItem.qlibQuestionId || null,
                                qlibSubjectId: wrongBookAddingItem.qlibSubjectId || null,
                                qlibChapterId: wrongBookAddingItem.qlibChapterId || null,
                                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                            });
                            if (data.folder && !userProfile.wrongBookFolders?.includes(data.folder)) {
                                await window.db.collection('users').doc(currentUser.uid).set({
                                    wrongBookFolders: window.firebase.firestore.FieldValue.arrayUnion(data.folder)
                                }, { merge: true });
                            }
                            showAlert(`第 ${wrongBookAddingItem.number} 題已成功收錄至「錯題整理」！`, "收錄成功");
                            setWrongBookAddingItem(null);
                        } catch(e) {
                            showAlert("收錄失敗：" + e.message);
                        }
                    }}
                    showAlert={showAlert}
                />
            )}

            {/* ✨ 偷看答案確認 Modal (含不再顯示選項) */}
            {peekConfirmIdx !== null && (
                <div className="fixed inset-0 bg-stone-800/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 w-full max-w-sm rounded-[2rem] shadow-2xl border border-stone-200 dark:border-stone-700">
                        <h3 className="font-black text-lg mb-3 dark:text-white flex items-center">
                            <svg className="w-6 h-6 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            確定要偷看答案嗎？
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 font-bold">
                            看過答案後，本題將被鎖定無法再更改選項！
                        </p>
                        <label className="flex items-center space-x-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-6 cursor-pointer bg-stone-50 dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 accent-amber-500" 
                                checked={!quizSettings.askBeforePeek}
                                onChange={(e) => setQuizSettings(prev => ({ ...prev, askBeforePeek: !e.target.checked }))}
                            />
                            <span>不再顯示此提示</span>
                        </label>
                        <div className="flex gap-3">
                            <button onClick={() => setPeekConfirmIdx(null)} className="flex-1 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 py-2.5 rounded-full font-bold hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors">取消</button>
                            <button 
                                onClick={() => {
                                    if (tutorialStep === 7 && peekConfirmIdx === 0) setTutorialStep(8);
                                    executePeek(peekConfirmIdx);
                                    setPeekConfirmIdx(null);
                                }} 
                                className="flex-1 bg-amber-500 text-white py-2.5 rounded-full font-bold hover:bg-amber-600 shadow-md transition-colors"
                            >確定偷看</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✨ 系統設定 Modal (單色質感圖示) */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-stone-800/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-fade-in">
                    <div className="bg-[#FCFBF7] dark:bg-stone-900 p-6 sm:p-8 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-stone-200 dark:border-stone-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-6 border-b border-stone-200 dark:border-stone-700 pb-4">
                            <h3 className="font-black text-xl text-stone-800 dark:text-white flex items-center">
                                <svg className="w-6 h-6 mr-2 text-stone-700 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                測驗設定
                            </h3>
                            <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-stone-800 dark:hover:text-white">✕</button>
                        </div>

                        <div className="space-y-6">
                            {/* ✨ 試卷管理操作區 (整合作業) */}
                            <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm flex flex-col gap-3">
                                <h4 className="font-bold text-sm text-stone-600 dark:text-stone-300 mb-1 flex items-center border-b border-stone-100 dark:border-stone-700 pb-2">
                                    <span className="material-symbols-outlined text-[18px] mr-1.5">edit_document</span> 試卷管理
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {!isShared && !isTask && tutorialStep === 0 && (
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSettingsModal(false); setStep('edit'); }} className="text-sm font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 py-2 rounded-xl border border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-800 transition-colors flex items-center justify-center shadow-sm col-span-2">
                                            <span className="material-symbols-outlined text-[16px] mr-1.5">edit</span> 編輯試題
                                        </button>
                                    )}
                                    {(isShared || isTask || testName.includes('[#op]')) && (
                                        <button onClick={() => { setShowSettingsModal(false); handleSendSuggestion(); }} className="text-sm font-bold bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 py-2 rounded-xl border border-stone-200 dark:border-stone-600 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors flex items-center justify-center shadow-sm col-span-2">
                                            <span className="material-symbols-outlined text-[16px] mr-1.5">feedback</span> 修正建議
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 顯示模式切換 */}
                            <div>
                                <h4 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    顯示模式
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setViewMode('interactive')}
                                        className={`py-3 px-2 rounded-2xl font-bold text-sm border-2 transition-all flex flex-col items-center justify-center gap-1 ${viewMode === 'interactive' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'border-stone-200 bg-white text-stone-600 dark:bg-stone-800 dark:border-stone-600 dark:text-gray-300'}`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                                        沉浸式作答
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('split')}
                                        className={`py-3 px-2 rounded-2xl font-bold text-sm border-2 transition-all flex flex-col items-center justify-center gap-1 ${viewMode === 'split' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'border-stone-200 bg-white text-stone-600 dark:bg-stone-800 dark:border-stone-600 dark:text-gray-300'}`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path></svg>
                                        雙視窗預覽
                                    </button>
                                </div>
                                {viewMode === 'split' && (
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        <button onClick={() => setLayoutMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')} className="bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-100 py-2 rounded-xl font-bold border border-stone-200 dark:border-stone-600 text-sm hover:bg-stone-200 transition-colors flex items-center justify-center">
                                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                                            切換版面
                                        </button>
                                        <button onClick={() => setPreviewOpen(!previewOpen)} className="bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-100 py-2 rounded-xl font-bold border border-stone-200 dark:border-stone-600 text-sm hover:bg-stone-200 transition-colors flex items-center justify-center">
                                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                            開關預覽
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* ✨ 新增：介面排版客製化 */}
                            <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-4 shadow-sm">
                                <h4 className="font-bold text-sm text-amber-600 dark:text-amber-400 mb-2 flex items-center border-b dark:border-stone-700 pb-2">
                                    <span className="material-symbols-outlined text-[18px] mr-1.5">text_format</span>
                                    介面與排版設定
                                </h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">字體選擇</label>
                                        <select value={customFontFamily} onChange={e => setCustomFontFamily(e.target.value)} className="w-full p-2 border rounded-lg bg-stone-50 dark:bg-stone-900 dark:border-stone-600 dark:text-white text-sm outline-none">
                                            <option value="inherit">系統預設</option>
                                            <option value="'Noto Sans TC', sans-serif">思源黑體 (無襯線)</option>
                                            <option value="'Noto Serif TC', serif">思源宋體 (有襯線)</option>
                                            <option value="ui-rounded, 'Hiragino Maru Gothic ProN', 'Quicksand', sans-serif">圓體 (柔和)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">文字行高</label>
                                        <select value={lineHeight} onChange={e => setLineHeight(e.target.value)} className="w-full p-2 border rounded-lg bg-stone-50 dark:bg-stone-900 dark:border-stone-600 dark:text-white text-sm outline-none">
                                            <option value="1.4">緊湊 (1.4)</option>
                                            <option value="1.6">標準 (1.6)</option>
                                            <option value="1.8">寬鬆 (1.8)</option>
                                            <option value="2.0">極寬 (2.0)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">螢光筆畫重點顏色 (選取文字即可標記)</label>
                                    <div className="flex gap-3">
                                        {['#fef08a', '#bbf7d0', '#a5f3fc', '#fbcfe8'].map(color => (
                                            <button 
                                                key={color} 
                                                onClick={() => setHighlightColor(color)}
                                                className={`w-8 h-8 rounded-full transition-transform ${highlightColor === color ? 'ring-2 ring-stone-800 dark:ring-white scale-110 shadow-md' : 'border border-gray-300'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 功能開關 */}
                            <div className="bg-stone-50 dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-4">
                                <h4 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                                    功能開關
                                </h4>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-stone-700 dark:text-gray-200">智慧自動下一題</span>
                                        <span className="text-[10px] text-gray-500">點擊選項後自動切換下一題 (按上一題時會自動關閉)</span>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5 accent-amber-500" checked={quizSettings.autoNext} onChange={(e) => setQuizSettings(prev => ({...prev, autoNext: e.target.checked}))} />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer border-t dark:border-stone-700 pt-3">
                                    <span className="text-sm font-bold text-stone-700 dark:text-gray-200">沉浸模式：啟用刪去法</span>
                                    <input type="checkbox" className="w-5 h-5 accent-amber-500" checked={quizSettings.showEliminationBtn} onChange={(e) => setQuizSettings(prev => ({...prev, showEliminationBtn: e.target.checked}))} />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer border-t dark:border-stone-700 pt-3">
                                    <span className="text-sm font-bold text-stone-700 dark:text-gray-200">偷看答案前再次確認</span>
                                    <input type="checkbox" className="w-5 h-5 accent-amber-500" checked={quizSettings.askBeforePeek} onChange={(e) => setQuizSettings(prev => ({...prev, askBeforePeek: e.target.checked}))} />
                                </label>
                            </div>

                            {/* 快捷鍵設定 */}
                            <div>
                                <h4 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                    快捷鍵自訂 (沉浸模式)
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {['a', 'b', 'c', 'd'].map(opt => (
                                        <div key={opt} className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-500 w-12">選項 {opt.toUpperCase()}</span>
                                            <input 
                                                type="text" maxLength={1} 
                                                className="w-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 p-2 rounded-xl text-center font-black uppercase outline-none focus:border-amber-500 dark:text-white"
                                                value={quizSettings.shortcuts[opt]}
                                                onChange={(e) => {
                                                    const val = e.target.value.toLowerCase();
                                                    if (/^[a-z0-9]$/.test(val)) setQuizSettings(prev => ({ ...prev, shortcuts: { ...prev.shortcuts, [opt]: val } }));
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-500 w-12">偷看</span>
                                        <input 
                                            type="text" maxLength={1} 
                                            className="w-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 p-2 rounded-xl text-center font-black uppercase outline-none focus:border-amber-500 dark:text-white"
                                            value={quizSettings.shortcuts.peek}
                                            onChange={(e) => {
                                                const val = e.target.value.toLowerCase();
                                                if (/^[a-z0-9]$/.test(val)) setQuizSettings(prev => ({ ...prev, shortcuts: { ...prev.shortcuts, peek: val } }));
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-500 w-12">星號</span>
                                        <input 
                                            type="text" maxLength={1} 
                                            className="w-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 p-2 rounded-xl text-center font-black uppercase outline-none focus:border-amber-500 dark:text-white"
                                            value={quizSettings.shortcuts.star}
                                            onChange={(e) => {
                                                const val = e.target.value.toLowerCase();
                                                if (/^[a-z0-9]$/.test(val)) setQuizSettings(prev => ({ ...prev, shortcuts: { ...prev.shortcuts, star: val } }));
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 新增：題庫標籤顯示開關 */}
                        <div className="mt-6 flex justify-between items-center bg-stone-50 dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm">
                            <div>
                                <div className="font-bold text-stone-800 dark:text-stone-200 text-sm">顯示題目來源與標籤</div>
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">作答時是否顯示此題的標籤與難度</div>
                            </div>
                            <button 
                                onClick={() => setQuizSettings(prev => ({...prev, showTags: !prev.showTags}))} 
                                className={`w-12 h-6 rounded-full transition-colors relative ${quizSettings?.showTags ? 'bg-amber-500' : 'bg-gray-300 dark:bg-stone-600'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${quizSettings?.showTags ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <button onClick={() => setShowSettingsModal(false)} className="w-full mt-6 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 py-3 rounded-full font-black text-sm hover:bg-stone-700 dark:hover:bg-white shadow-md transition-all active:scale-95">完成設定</button>
                    </div>
                </div>
            )}

            {/* ✨ 詳解 Modal */}
            {explanationModalItem && (
                <div className="fixed inset-0 bg-stone-800 bg-opacity-70 flex items-center justify-center z-[100] p-4" onClick={() => setExplanationModalItem(null)}>
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 w-full max-w-2xl rounded-2xl shadow-2xl transform transition-all max-h-[90dvh] overflow-y-auto custom-scrollbar border-t-4 border-emerald-500" onClick={e => e.stopPropagation()}>
                        <h3 className="font-black text-xl mb-4 flex justify-between items-center dark:text-white border-b border-stone-200 dark:border-stone-700 pb-2">
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 第 {explanationModalItem.number} 題 詳解與筆記</span>
                            <button onClick={() => setExplanationModalItem(null)} className="text-gray-400 hover:text-red-500 font-bold transition-colors">✖</button>
                        </h3>
                        {explanationModalItem.content && (
                            <div className="p-4 bg-gray-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm text-gray-800 dark:text-gray-200 mb-4" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                               <h4 className="font-bold text-emerald-600 dark:text-emerald-400 mb-2 border-b border-emerald-200 dark:border-stone-700 pb-1">官方詳解</h4>
                                <div className="whitespace-pre-wrap preview-rich-text !p-0 !bg-transparent !border-none" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml((explanationModalItem.content || '').replace(/<br\s*\/?>/gi, '\n')) }} />
                            </div>
                        )}
                        {explanationModalItem.note && (
                            <div className="p-4 bg-amber-50 dark:bg-stone-900 border border-amber-200 dark:border-stone-600 text-sm text-gray-800 dark:text-gray-200" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                <h4 className="font-bold text-amber-600 dark:text-amber-400 mb-2 border-b border-amber-200 dark:border-stone-700 pb-1 flex items-center"><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg> 我的筆記</h4>
                                {explanationModalItem.note}
                            </div>
                        )}
                        <div className="flex justify-end mt-6">
                            <button onClick={() => setExplanationModalItem(null)} className="bg-stone-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-6 py-2 rounded-full font-bold text-sm hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors shadow-sm">關閉</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
if (step === 'grading') return (
        <div className="flex flex-col min-h-[100dvh] items-center justify-center p-4 relative py-10 overflow-y-auto bg-stone-50 dark:bg-stone-900 transition-colors">
            <button onClick={() => setStep('answering')} className="absolute top-6 left-6 text-sm text-gray-500 dark:text-gray-400 hover:text-stone-800 dark:hover:text-white font-bold z-10 transition-colors">
                ← 返回作答
            </button>
            <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 shadow-md w-full max-w-lg rounded-2xl border border-stone-200 dark:border-stone-700 mt-10 transition-colors">
                <h3 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">請輸入正確答案以進行批改</h3>
                
                <AnswerGridInput value={correctAnswersInput} onChange={setCorrectAnswersInput} parsedTypes={parsedQuestionTypes} maxQuestions={numQuestions} showConfirm={showConfirm} />
                
                {parsedQuestionTypes.some(t => t === 'SQ') && (
                    <div className="mt-6 mb-2 animate-fade-in">
                        <h3 className="font-bold text-xs text-cyan-600 dark:text-cyan-400 mb-2">🟢 簡答題標準答案</h3>
                        <SpecificAnswerGridInput value={shortAnswersInput} onChange={setShortAnswersInput} parsedTypes={parsedQuestionTypes} targetType="SQ" title="簡答題" colorTheme="teal" showConfirm={showConfirm} />
                    </div>
                )}

                <button onClick={async () => {
                    setIsRegrading(true);
                    await new Promise(r => setTimeout(r, 600)); // ✨ 人工延遲讓玩家看到載入畫面
                    await handleGrade();
                    setIsRegrading(false);
                }} className="w-full bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 p-3 font-bold rounded-2xl hover:bg-stone-800 dark:hover:bg-gray-300 text-lg transition-colors mt-4">開始批改</button>
            </div>

            {/* ✨ 確保在手動填寫解答頁面也能看到重新算分的 Modal */}
            {isRegrading && (
                <div className="fixed inset-0 bg-stone-800 bg-opacity-80 flex items-center justify-center z-[200] p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 w-full max-w-sm rounded-2xl shadow-2xl text-center border-t-8 border-amber-500">
                        <div className="w-16 h-16 border-4 border-stone-200 dark:border-stone-700 border-t-amber-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black mb-2 dark:text-white">🔄 正在處理與批改...</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">系統正在為您結算成績與同步資料，請稍候</p>
                    </div>
                </div>
            )}
        </div>
    );

    if (step === 'wrong_retest') {
        const wrongQuestions = parsedInteractiveQuestions.filter(q => {
            // 優先使用 targetIndices，若無則回退到舊版抓全部錯題的邏輯 (兼容舊紀錄)
            if (wrongRetestState?.targetIndices) {
                return wrongRetestState.targetIndices.includes(q.globalIndex);
            }
            const resItem = results?.data?.find(d => d.number === q.globalIndex + 1);
            return resItem && !resItem.isCorrect;
        });

        const handleSubmitWrongRetest = () => {
            let correct = 0;
            const newIsCorrectMap = {};
            
            wrongQuestions.forEach(q => {
                const actualIdx = q.globalIndex;
                const resItem = results.data.find(d => d.number === actualIdx + 1);
                const userAns = wrongRetestState.answers[actualIdx] || '';
                const correctAns = resItem.correctAns;
                
                let isCorrect = false;
                if (q.type === 'Q') {
                    if (correctAns.toLowerCase() === 'z' || correctAns.toLowerCase() === 'abcd') isCorrect = true;
                    else if (correctAns !== '-' && correctAns !== '' && userAns) {
                        isCorrect = correctAns === correctAns.toUpperCase() ? (userAns === correctAns) : correctAns.toLowerCase().includes(userAns.toLowerCase());
                    }
                } else if (q.type === 'SQ') {
                    if (correctAns && userAns.trim().toLowerCase() === correctAns.toLowerCase()) isCorrect = true;
                }
                
                newIsCorrectMap[actualIdx] = isCorrect;
                if (isCorrect) correct++;
            });
            
            setWrongRetestState(prev => ({ 
                ...prev, 
                finished: true, 
                correctCount: correct, 
                isCorrectMap: newIsCorrectMap 
            }));

            // 同步更新主結果頁的資料，標記哪些題目已經重測成功
            if (results && results.data) {
                const updatedData = results.data.map(item => {
                    const idx = item.number - 1;
                    if (newIsCorrectMap[idx] === true) {
                        return { ...item, retestCorrect: true };
                    }
                    return item;
                });
                setResults({ ...results, data: updatedData });
            }
        };

        return (
            <div className="flex flex-col h-[100dvh] bg-stone-50 dark:bg-stone-900 p-2 sm:p-4 w-full overflow-hidden transition-colors" onClick={handleRichTextClick}>
                <style dangerouslySetInnerHTML={{__html: `.qlib-question-tags { display: ${quizSettings?.showTags ? 'inline-block' : 'none'} !important; }`}} />
                <div className="bg-[#FCFBF7] dark:bg-stone-800 p-3 sm:p-4 shadow-sm border border-stone-200 dark:border-stone-700 flex justify-between items-center rounded-2xl shrink-0 z-10 transition-colors w-full mb-4">
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setStep('results')} className="text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 font-bold mr-2">
                            <span className="material-symbols-outlined text-[20px] align-middle">arrow_back</span>
                        </button>
                        <h2 className="font-bold text-lg dark:text-white flex items-center">
                            <span className="material-symbols-outlined text-[20px] mr-2 text-cyan-600">replay</span>
                            錯題重測
                        </h2>
                        <span className="text-sm font-bold text-gray-500 bg-gray-100 dark:bg-stone-700 px-2 py-0.5 rounded-full ml-2">{wrongQuestions.length} 題</span>
                    </div>
                    {!wrongRetestState?.finished && (
                        <button onClick={handleSubmitWrongRetest} className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-full font-bold shadow-sm transition-colors flex items-center text-sm">
                            <span className="material-symbols-outlined text-[18px] mr-1">check_circle</span> 提交重測
                        </button>
                    )}
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar px-2 sm:px-4 pb-10">
                    {wrongRetestState?.finished && (
                        <div className="bg-cyan-50 dark:bg-cyan-900/20 border-2 border-cyan-400 rounded-2xl p-6 mb-6 text-center shadow-sm">
                            <h3 className="text-xl font-black text-cyan-800 dark:text-cyan-300 mb-2">重測完成</h3>
                            <p className="text-cyan-700 dark:text-cyan-400 font-bold text-lg">正確率：{Math.round((wrongRetestState.correctCount / wrongQuestions.length) * 100)}% ({wrongRetestState.correctCount} / {wrongQuestions.length})</p>
                            
                            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                                <button onClick={() => setStep('results')} className="bg-white dark:bg-stone-800 border border-cyan-200 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300 px-6 py-2 rounded-full font-bold hover:bg-cyan-50 dark:hover:bg-stone-700 transition-colors flex items-center shadow-sm">
                                    <span className="material-symbols-outlined text-[18px] mr-1">arrow_back</span> 返回結果頁
                                </button>
                                
                                {wrongRetestState.correctCount < wrongQuestions.length && (
                                    <button onClick={() => handleStartWrongRetest(true)} className="bg-cyan-600 text-white px-6 py-2 rounded-full font-bold hover:bg-cyan-700 transition-colors flex items-center shadow-sm">
                                        <span className="material-symbols-outlined text-[18px] mr-1">filter_alt</span> 僅重測錯題 (一錯再錯)
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto space-y-6">
                        {wrongQuestions.map((q) => {
                            const actualIdx = q.globalIndex;
                            const currentAns = wrongRetestState?.answers[actualIdx];
                            const isFinished = wrongRetestState?.finished;
                            const isPeeked = wrongRetestState?.peekedAnswers?.[actualIdx];
                            const resItem = results.data.find(d => d.number === actualIdx + 1);
                           const correctAns = q.ans || resItem.correctAns;
                                    const expTags = q.type === 'Q' ? ['A'] : q.type === 'SQ' ? ['SA', 'SQ'] : ['ASA'];
                                    const currentExp = q.explain || (typeof extractSpecificContent === 'function' ? extractSpecificContent(explanationHtml, q.number, expTags) : extractSpecificExplanation(explanationHtml, q.number));
                            let isCorrect = false;
                            if (isFinished) {
                                if (q.type === 'Q') {
                                    if (correctAns.toLowerCase() === 'z' || correctAns.toLowerCase() === 'abcd') isCorrect = true;
                                    else if (correctAns !== '-' && correctAns !== '' && currentAns) {
                                        isCorrect = correctAns === correctAns.toUpperCase() ? (currentAns === correctAns) : correctAns.toLowerCase().includes(currentAns.toLowerCase());
                                    }
                                } else if (q.type === 'SQ') {
                                    if (correctAns && (currentAns||'').trim().toLowerCase() === correctAns.toLowerCase()) isCorrect = true;
                                }
                            }

                            return (
                                <div key={actualIdx} className={`bg-[#FCFBF7] dark:bg-stone-800 border ${isFinished ? (isCorrect ? 'border-emerald-400' : 'border-rose-400') : 'border-stone-200 dark:border-stone-700'} shadow-md rounded-2xl p-5 sm:p-6 transition-colors`}>
                                    <div className="flex justify-between items-start mb-4 border-b border-stone-100 dark:border-stone-700 pb-3">
                                        <span className="text-lg font-black text-cyan-700 dark:text-cyan-400 flex items-center">
                                            第 {q.type === 'Q' ? q.number : `${q.type}.${q.number}`} 題
                                        </span>
                                        {isFinished && (
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center ${isCorrect ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                <span className="material-symbols-outlined text-[16px] mr-1">{isCorrect ? 'check' : 'close'}</span>
                                                {isCorrect ? '答對' : '錯誤'}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="text-gray-800 dark:text-gray-200 leading-relaxed preview-rich-text !border-none !p-0 !bg-transparent mb-4" dangerouslySetInnerHTML={{ __html: q.mainText }} />

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                        {q.type === 'Q' ? ['A', 'B', 'C', 'D'].map(opt => {
                                            const hasCustomContent = !!q.options[opt];
                                            const isSelected = currentAns === opt;
                                            const isCorrectOpt = isFinished && (correctAns.toLowerCase().includes(opt.toLowerCase()) || correctAns.toLowerCase() === 'abcd' || correctAns.toLowerCase() === 'z');
                                            
                                            let btnClasses = "text-left w-full py-3 px-4 border-2 transition-all flex items-start space-x-3 rounded-xl ";
                                            
                                            if (isFinished) {
                                                if (isCorrectOpt) btnClasses += 'bg-emerald-50 border-emerald-400 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 ';
                                                else if (isSelected) btnClasses += 'bg-rose-50 border-rose-400 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 ';
                                                else btnClasses += 'bg-stone-50/50 border-stone-100 dark:bg-stone-800/50 opacity-50 ';
                                                btnClasses += 'cursor-default ';
                                            } else {
                                                btnClasses += isSelected ? 'bg-cyan-50 border-cyan-400 dark:bg-cyan-900/30 shadow-sm ' : 'bg-white border-stone-200 dark:bg-stone-800 hover:border-cyan-300 ';
                                            }

                                            return (
                                                <button 
                                                    key={opt}
                                                    disabled={isFinished || isPeeked}
                                                    onClick={() => {
                                                        setWrongRetestState(prev => {
                                                            const newAns = { ...(prev?.answers || {}) };
                                                            newAns[actualIdx] = newAns[actualIdx] === opt ? '' : opt;
                                                            return { ...prev, answers: newAns };
                                                        });
                                                    }}
                                                    className={btnClasses}
                                                >
                                                    <span className={`font-black mt-0.5 w-6 shrink-0 text-center ${isSelected ? 'text-cyan-600' : 'text-gray-400'}`}>{opt}.</span>
                                                    {hasCustomContent ? (
                                                        <div className={`preview-rich-text !p-0 !border-none !bg-transparent w-full flex-1 ${isSelected ? 'text-stone-800 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`} dangerouslySetInnerHTML={{ __html: q.options[opt] }} />
                                                    ) : (
                                                        <span className="w-full flex-1 text-gray-400 italic">(選項無內容)</span>
                                                    )}
                                                </button>
                                            );
                                        }) : (
                                            <textarea 
                                                disabled={isFinished || isPeeked}
                                                value={currentAns || ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setWrongRetestState(prev => ({ ...prev, answers: { ...(prev?.answers || {}), [actualIdx]: val } }));
                                                }}
                                                className="w-full p-4 h-32 text-sm border-2 outline-none bg-white dark:bg-stone-800 dark:text-white shadow-inner transition-colors focus:border-cyan-400 border-stone-200 dark:border-stone-700 resize-none custom-scrollbar col-span-1 lg:col-span-2 rounded-xl"
                                                placeholder="請輸入答案..."
                                            />
                                        )}
                                    </div>

                                    {allowPeek && !isPeeked && !isFinished && (
                                        <div className="mt-4 flex justify-end">
                                            <button 
                                                onClick={() => handleWrongRetestPeek(actualIdx)} 
                                                className="text-xs font-bold px-4 py-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 hover:bg-amber-200 border border-amber-200 rounded-full shadow-sm flex items-center gap-1.5 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">key</span>
                                                偷看答案
                                            </button>
                                        </div>
                                    )}

                                    {(isPeeked || isFinished) && (
                                        <div className="mt-4 p-4 bg-amber-50 dark:bg-stone-900 border border-amber-200 dark:border-amber-800 text-sm rounded-xl">
                                            <div className="font-bold text-amber-700 dark:text-amber-400 mb-2 pb-2 border-b border-amber-200 flex items-center justify-between">
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[18px]">{isPeeked && !isFinished ? 'lock' : 'lightbulb'}</span> 
                                                    {isPeeked && !isFinished ? '此題已偷看並鎖定' : '試題詳解'}
                                                </span>
                                                <span className="bg-white dark:bg-stone-800 px-2 py-0.5 rounded border border-amber-200 text-stone-800 dark:text-white">
                                                    標準答案: {correctAns || '未設定'}
                                                </span>
                                            </div>
                                            {currentExp ? (
                                                <div className="preview-rich-text !bg-transparent !p-0 !border-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml((currentExp || '').replace(/<br\s*\/?>/gi, '\n')) }} />
                                            ) : (
                                                <p className="text-gray-500 italic font-bold">此題無提供詳解。</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'results') return (
        <div className="flex h-[100dvh] bg-stone-50 dark:bg-stone-900 p-2 sm:p-4 w-full overflow-hidden transition-colors relative gap-4" onClick={handleRichTextClick}>
            {UpdateNotification}
            <style dangerouslySetInnerHTML={{__html: `.qlib-question-tags { display: ${quizSettings?.showTags ? 'inline-block' : 'none'} !important; }`}} />
            {tutorialStep === 0 && <button onClick={onBackToDashboard} className="absolute top-2 left-6 text-sm text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 font-bold z-50 transition-colors">← 返回列表</button>}
            
            {/* ✨ 左側：主內容區 (將原本的內容包裝起來) */}
            <div className="flex flex-col flex-1 overflow-hidden relative">
            
            {/* ✨ 頂部導覽列：全面升級質感 SVG 圖示 */}
            <div className="bg-[#FCFBF7] dark:bg-stone-800 p-3 sm:p-4 shadow-sm border border-stone-200 dark:border-stone-700 flex flex-wrap justify-between items-center rounded-2xl gap-3 shrink-0 z-10 transition-colors w-full mt-8">
                <div className="flex items-center flex-grow mr-2 w-full lg:w-auto overflow-hidden">
                    <h2 className="font-bold truncate text-base pr-4 dark:text-white flex items-center gap-2 min-w-0">
                        {renderTestName(testName, true)} <span className="shrink-0 hidden sm:inline">- 測驗結果</span>
                        <span className={`ml-1 sm:ml-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-black border shadow-sm shrink-0 ${results.score >= 60 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {results.score} 分
                        </span>
                    </h2>
                </div>

                <div className="flex flex-nowrap overflow-x-auto custom-scrollbar items-center gap-2 w-full lg:w-auto justify-start lg:justify-end pb-2 lg:pb-0 px-2 sm:px-0">
                    <button onClick={() => setViewMode(prev => prev === 'interactive' ? 'split' : 'interactive')} className="shrink-0 bg-stone-50 dark:bg-gray-700 text-stone-800 dark:text-white px-5 py-2.5 rounded-full font-bold border border-stone-200 dark:border-gray-600 text-sm hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors flex items-center shadow-sm">
                        <span className="material-symbols-outlined text-[18px] mr-1">{viewMode === 'interactive' ? 'view_list' : 'view_carousel'}</span>
                        {viewMode === 'interactive' ? '切換列表模式' : '切換沉浸模式'}
                    </button>

                    <button onClick={() => setShowSettingsModal(true)} className="shrink-0 bg-stone-50 dark:bg-gray-700 text-stone-800 dark:text-white px-5 py-2.5 rounded-full font-bold border border-stone-200 dark:border-gray-600 text-sm hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors flex items-center shadow-sm">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        設定與管理
                    </button>

                    <button onClick={() => {
                        const showHistory = document.getElementById('history-modal');
                        if (showHistory) showHistory.classList.remove('hidden');
                        else showAlert('目前沒有作答紀錄喔！');
                    }} className="text-sm font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full border border-indigo-200 dark:border-indigo-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-800 whitespace-nowrap transition-colors flex items-center shadow-sm">
                        <span className="material-symbols-outlined text-[18px] mr-1">history</span> 作答紀錄
                    </button>

                    <button onClick={handleRetake} className="text-sm font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-full border border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-100 dark:hover:bg-emerald-800 whitespace-nowrap transition-colors flex items-center shadow-sm">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> 再做一次
                    </button>

                    <button onClick={handleStartWrongRetest} className="text-sm font-bold bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 px-4 py-2 rounded-full border border-cyan-200 dark:border-cyan-700/50 hover:bg-cyan-100 dark:hover:bg-cyan-800 whitespace-nowrap transition-colors flex items-center shadow-sm">
                        <span className="material-symbols-outlined text-[16px] mr-1.5">replay</span> 錯題重測
                    </button>

                    <button onClick={async () => {
                        let currentCode = shortCode;
                        if (!isShared && !isTask && !/\[#(op|m?nm?st)\]/i.test(testName) && !currentCode) {
                            currentCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                            try {
                                const cleanQuizData = { testName, numQuestions, questionFileUrl, correctAnswersInput, publishAnswers: publishAnswersToggle, hasTimer, timeLimit, hasSeparatedContent: true };
                                const contentData = { questionText: window.jzCompress(questionText), questionHtml, explanationHtml };
                                await window.db.collection('shareCodes').doc(currentCode).set({ ownerId: currentUser.uid, quizId: quizId, quizData: cleanQuizData, contentData: contentData, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() });
                                await window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).update({ shortCode: currentCode });
                                setShortCode(currentCode);
                            } catch (e) {
                                return showAlert('生成代碼失敗：' + e.message);
                            }
                        }
                        
                        const link = `${window.location.origin}/?shareCode=${currentCode || initialRecord.shortCode || ''}`;
                        const shareText = `🔥 快來挑戰我的試卷！\n📝 試卷名稱：${testName.replace(/\[#(op|m?nm?st)\]/gi, '').trim()}\n🔑 試卷代碼：${currentCode || initialRecord.shortCode || '公開任務無需代碼'}\n\n👇 點擊下方連結，立即將試卷自動加入你的題庫：\n${link}`;
                        navigator.clipboard.writeText(shareText);
                        
                        setShowShareScoreModal(true);
                    }} className="text-sm font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-full border border-rose-200 dark:border-rose-700/50 hover:bg-rose-100 dark:hover:bg-rose-800 whitespace-nowrap transition-colors flex items-center shadow-sm">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                        分享與複製連結
                    </button>
                </div>
            </div>

            {/* ✨ 依據 viewMode 切換完全不同的排版架構：大卡片沉浸模式 vs 雙視窗列表模式 */}
            {viewMode === 'interactive' && parsedInteractiveQuestions.length > 0 && canSeeAnswers ? (
                <div className="quiz-answering-container flex-grow flex flex-col w-full mt-2 sm:mt-4 overflow-hidden relative rounded-2xl shadow-inner border border-stone-300 dark:border-stone-800 bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-900 dark:to-stone-950 transition-colors animate-fade-in">
                    <div className="flex-grow overflow-y-auto overflow-x-hidden p-2 sm:p-6 sm:px-10 custom-scrollbar">
                        <div className="flex flex-col w-full max-w-5xl mx-auto">
                            {/* 上一題 / 下一題 控制列 */}
                            <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-md border border-stone-200 dark:border-stone-700 p-4 mb-6 flex justify-between items-center transition-all">
                                <button disabled={resultInteractiveIdx === 0} onClick={() => setResultInteractiveIdx(p => Math.max(0, p - 1))} className="bg-stone-100 hover:bg-amber-100 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-30 transition-all shadow-sm flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">arrow_back_ios</span>上一題
                                </button>
                                <div className="flex flex-col items-center">
                                    <span className="font-extrabold text-amber-600 dark:text-amber-400 text-base tracking-wide">第 {resultInteractiveIdx + 1} / {parsedInteractiveQuestions.length} 題</span>
                                    <span className="text-[11px] font-medium text-stone-400 mt-0.5">點擊右側面板號碼可快速跳題</span>
                                </div>
                                <button disabled={resultInteractiveIdx === parsedInteractiveQuestions.length - 1} onClick={() => setResultInteractiveIdx(p => Math.min(parsedInteractiveQuestions.length - 1, p + 1))} className="bg-stone-800 hover:bg-amber-500 text-white dark:bg-stone-100 dark:text-stone-800 px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-30 transition-all shadow-sm flex items-center gap-1">
                                    下一題<span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
                                </button>
                            </div>

                            {/* 核心題目大字卡 (帶有作答紀錄、選項與詳解) */}
                            <div className="bg-white dark:bg-stone-800/95 rounded-2xl sm:rounded-[2rem] p-4 sm:p-10 shadow-xl relative sm:border border-transparent sm:border-stone-200/60 dark:sm:border-stone-700/60 transition-colors">
                                {(() => {
                                    const q = parsedInteractiveQuestions[resultInteractiveIdx];
                                    const actualIdx = q.globalIndex;
                                    const itemData = results.data.find(d => d.number === actualIdx + 1) || { isCorrect: false, userAns: '', correctAns: '' };
                                    const expTags = q.type === 'Q' ? ['A'] : q.type === 'SQ' ? ['SA', 'SQ'] : ['ASA'];
                                    const currentExp = q.explain || (typeof extractSpecificContent === 'function' ? extractSpecificContent(explanationHtml, q.number, expTags) : '');
                                    
                                    return (
                                        <>
                                            <div className="flex justify-between items-center border-b border-stone-100 dark:border-stone-700 pb-4 mb-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-3xl font-black text-amber-500 tracking-tight">第 {q.number} 題</span>
                                                    <button 
    onClick={() => toggleStar(actualIdx)} 
    className="material-symbols-outlined text-2xl text-amber-400 hover:scale-110 transition-transform active:scale-95"
    style={{ fontVariationSettings: starred[actualIdx] ? '"FILL" 1' : '"FILL" 0' }}
>
    star
</button>
                                                </div>
                                                <span className={`px-4 py-1.5 text-sm font-black rounded-full border shadow-sm ${itemData.isCorrect ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400'}`}>
                                                    {itemData.isCorrect ? '✅ 答對' : '❌ 錯誤'}
                                                </span>
                                            </div>

                                            {/* 保留原本 preview-rich-text，確保螢光筆功能可以正常運作 */}
                                            <div className="preview-rich-text text-stone-800 dark:text-stone-200 text-lg leading-relaxed mb-8 select-text" dangerouslySetInnerHTML={{ __html: q.mainText }} />

                                            {q.type === 'Q' && (
                                                <div className="flex flex-col gap-4 mb-8">
                                                    {['A', 'B', 'C', 'D'].map(opt => {
                                                        const isSelected = itemData.userAns === opt;
                                                        const elimKey = `${actualIdx}_${opt}`;
                                                        const isEliminated = eliminatedOptions[elimKey];
                                                        const correctStr = itemData.correctAns || '';
                                                        const isCorrectOpt = correctStr.toLowerCase().includes(opt.toLowerCase()) || correctStr.toLowerCase() === 'abcd' || correctStr.toLowerCase() === 'z';
                                                        
                                                        let btnClasses = `text-left w-full py-4 px-6 flex items-start space-x-4 rounded-[1.5rem] ring-1 transition-all `;
                                                        if (isCorrectOpt) {
                                                            btnClasses += 'bg-emerald-50 ring-emerald-400 dark:bg-emerald-900/20 dark:ring-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-md ';
                                                        } else if (isSelected) {
                                                            btnClasses += 'bg-rose-50 ring-rose-400 dark:bg-rose-900/20 dark:ring-rose-500 text-rose-900 dark:text-rose-100 shadow-sm ';
                                                        } else {
                                                            btnClasses += 'bg-stone-50/50 ring-black/5 dark:bg-stone-800/50 dark:ring-white/10 opacity-40 ';
                                                        }
                                                        if (isEliminated) btnClasses += 'opacity-30 grayscale line-through ';

                                                        return (
                                                            <div key={opt} className={btnClasses}>
                                                                <span className={`font-black w-6 shrink-0 text-center ${isSelected ? (isCorrectOpt ? 'text-emerald-600' : 'text-rose-600') : 'text-gray-400'}`}>{opt}.</span>
                                                                {q.options && q.options[opt] ? (
                                                                    <div className="preview-rich-text !p-0 !border-none !bg-transparent w-full flex-1" dangerouslySetInnerHTML={{ __html: q.options[opt] }} />
                                                                ) : (
                                                                    <span className="w-full flex-1 text-gray-400 italic">(選項無內容)</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div className="p-6 bg-amber-50/40 dark:bg-stone-900/40 border border-amber-200/60 dark:border-amber-800/60 rounded-2xl shadow-inner">
                                                <div className="flex flex-wrap gap-4 justify-between items-center mb-4 pb-4 border-b border-amber-200/40 dark:border-amber-800/40">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-stone-600 dark:text-stone-400">你的選答：</span>
                                                        <span className={`px-3 py-1 rounded-lg text-sm font-extrabold shadow-sm ${itemData.isCorrect ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 line-through dark:bg-rose-900/40 dark:text-rose-400'}`}>{itemData.userAns || '未填寫'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-stone-600 dark:text-stone-400">標準答案：</span>
                                                        <span className="bg-emerald-500 text-white dark:bg-emerald-600 px-3 py-1 rounded-lg text-sm font-black shadow-sm">{itemData.correctAns}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <h4 className="text-sm font-black text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-base">lightbulb</span> 試題詳解：</h4>
                                                    <div className="preview-rich-text text-sm text-stone-700 dark:text-stone-300 leading-relaxed bg-white/60 dark:bg-stone-800/60 p-4 rounded-xl border border-stone-200/40 dark:border-stone-700/40" dangerouslySetInnerHTML={{ __html: currentExp ? window.parseSmilesToHtml(currentExp) : '此題無提供詳解。' }} />
                                                </div>

                                                {/* ✨ 沉浸式結果頁：選答分析與全球數據 ✨ */}
                                                    {/* ✨ 全域選答分析 (修正：僅保留一組且確保變數作用域正確) */}
                                            {q.id && globalStats && (
                                                <div className="mt-4 pt-4 border-t border-amber-200/40 dark:border-amber-800/40">
                                                    <div className="flex items-center gap-1 font-black text-indigo-600 dark:text-indigo-400 mb-3 text-sm">
                                                        <span className="material-symbols-outlined text-[18px]">analytics</span>
                                                        全體玩家選答分析 (共 {(globalStats[q.id] || {total: 0}).total || 0} 次作答)
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {['A', 'B', 'C', 'D'].map(opt => {
                                                            const statsObj = globalStats[q.id] || {total: 0};
                                                            const count = statsObj[`opts_${opt}`] || 0;
                                                            const pct = statsObj.total ? Math.round((count / statsObj.total) * 100) : 0;
                                                            // 確保這裡能正確識別該選項是否為正解
                                                            const isAns = q.ans ? q.ans.toLowerCase().includes(opt.toLowerCase()) : false;
                                                            return (
                                                                <div key={opt} className={`flex-1 min-w-[60px] p-2 rounded-lg border ${isAns ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shadow-sm' : 'bg-stone-50 border-stone-200 dark:bg-stone-900/50 dark:border-stone-700 text-stone-600 dark:text-stone-400'}`}>
                                                                    <div className="font-black mb-1 text-sm">{opt}</div>
                                                                    <div className="text-xl font-black">{pct}%</div>
                                                                    <div className="text-[10px] font-bold opacity-70 mt-1">{count} 人選擇</div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs text-gray-500 font-bold border-t border-amber-100/50 dark:border-amber-800/30 pt-3">
                                                        <span>總體答對率: {(globalStats[q.id] || {total:0}).total ? Math.round((((globalStats[q.id] || {}).correct || 0) / (globalStats[q.id] || {}).total) * 100) : 0}%</span>
                                                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">bookmark_added</span> 收錄: {(globalStats[q.id] || {}).bookmarks || 0}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* ✨ 補上結果頁(沉浸模式)專屬的收錄錯題按鈕 */}
                                        <div className="mt-6 border-t border-stone-100 dark:border-stone-700 pt-4 flex justify-end">
                                            <button 
                                                disabled={loadingWrongBookNum === q.number}
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if (q.id) {
                                                        window.db.collection('publicQlib_stats').doc(q.id).set({
                                                            bookmarks: window.firebase.firestore.FieldValue.increment(1)
                                                        }, { merge: true }).catch(e => console.error(e));
                                                    }
                                                    handleAddToWrongBook({
                                                        number: q.number,
                                                        userAns: itemData.userAns || '未填寫',
                                                        correctAns: itemData.correctAns || '無'
                                                    }); 
                                                }} 
                                                className={`text-sm bg-[#FCFBF7] dark:bg-stone-800 text-red-600 px-5 py-2.5 font-bold rounded-full border border-red-200 hover:bg-red-50 transition-colors shadow-sm flex items-center ${loadingWrongBookNum === q.number ? 'opacity-50 cursor-wait' : ''}`}
                                            >
                                                {loadingWrongBookNum === q.number ? (
                                                    <><span className="material-symbols-outlined text-[18px] mr-1.5 animate-spin">autorenew</span>處理中...</>
                                                ) : (
                                                    <><span className="material-symbols-outlined text-[18px] mr-1.5">bookmark_add</span>收錄錯題</>
                                                )}
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        </div>
                    </div>
                </div>
            ) : (
            <div 
                ref={splitContainerRef}
                className={`flex-grow flex ${layoutMode === 'horizontal' ? 'flex-row' : 'flex-col'} overflow-hidden relative w-full mt-2 sm:mt-4`}
            >
                {isDragging && (
                    <div className="absolute inset-0 z-50" style={{ cursor: layoutMode === 'horizontal' ? 'col-resize' : 'row-resize' }}></div>
                )}

                {(questionFileUrl || questionText || questionHtml) && previewOpen && (
                    <div 
                        className="bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm rounded-2xl flex flex-col shrink-0 transition-colors"
                        style={{ [layoutMode === 'horizontal' ? 'width' : 'height']: `${splitRatio}%` }}
                    >
                        <div className="bg-gray-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 px-3 py-2 flex justify-between items-center shrink-0 transition-colors">
                            <span className="font-bold text-xs text-gray-600 dark:text-gray-300 flex items-center">
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                試卷預覽區
                            </span>
                            <div className="flex space-x-3 items-center">
                                {questionFileUrl && (
                                    <div className="flex space-x-1 items-center bg-[#FCFBF7] dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                                        <button onClick={() => setPdfZoom(z => Math.max(0.5, z - 0.2))} className="px-2 font-bold text-gray-600 dark:text-gray-200">-</button>
                                        <span className="text-[10px] w-8 text-center font-bold dark:text-gray-200">{Math.round(pdfZoom * 100)}%</span>
                                        <button onClick={() => setPdfZoom(z => Math.min(3, z + 0.2))} className="px-2 font-bold text-gray-600 dark:text-gray-200">+</button>
                                    </div>
                                )}
                                {questionFileUrl && (
                                    <a href={questionFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-bold underline">在新分頁開啟</a>
                                )}
                            </div>
                        </div>
                        <div className="flex-grow w-full relative bg-stone-100 dark:bg-stone-800 flex flex-col overflow-auto">
                            {questionFileUrl && (
                                <div style={{ transform: `scale(${pdfZoom})`, transformOrigin: 'top left', width: `${100/pdfZoom}%`, height: `${100/pdfZoom}%` }} className={`relative shrink-0`}>
                                    <iframe src={getEmbedUrl(questionFileUrl)} className="absolute inset-0 w-full h-full border-0 bg-[#FCFBF7]" allow="autoplay" allowFullScreen></iframe>
                                </div>
                            )}
                            {questionText && !questionHtml && (
                                <div className="w-full relative bg-[#FCFBF7] dark:bg-stone-800 flex flex-col flex-grow h-full">
                                    <textarea 
                                        className="absolute inset-0 w-full h-full p-4 resize-none outline-none custom-scrollbar text-sm leading-relaxed bg-gray-50 dark:bg-stone-900 text-gray-700 dark:text-gray-300"
                                        style={{ whiteSpace: 'pre-wrap' }}
                                        value={questionText}
                                        readOnly={true}
                                        placeholder="沒有提供試題文字"
                                    ></textarea>
                                </div>
                            )}
                            {questionHtml && (
                                <div className={`w-full relative bg-[#FCFBF7] dark:bg-stone-800 flex flex-col flex-grow h-full`}>
                                    <div className="absolute inset-0 w-full h-full p-4 custom-scrollbar bg-gray-50 dark:bg-stone-900 text-stone-800 dark:text-white overflow-y-auto">
                                        <style dangerouslySetInnerHTML={{__html: `
                                            .preview-rich-text { word-break: break-word; white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; color: #1a1a1a !important; }
                                            .dark .preview-rich-text { color: #f3f4f6 !important; }
                                            .preview-rich-text * { color: inherit !important; background-color: transparent !important; }
                                            .preview-rich-text img { display: block !important; max-width: 100% !important; height: auto !important; margin: 10px 0 !important; background-color: #FCFBF7 !important; opacity: 1 !important; visibility: visible !important; }
                                        `}} />
                                        <div className="preview-rich-text" dangerouslySetInnerHTML={{ __html: processQuestionContent(questionHtml, true) }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(questionFileUrl || questionText || questionHtml) && previewOpen && (
                    <div 
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        className={`${layoutMode === 'horizontal' ? 'w-4 h-full cursor-col-resize flex-col' : 'h-4 w-full cursor-row-resize flex-row'} bg-stone-50 dark:bg-stone-900 hover:bg-amber-200 dark:hover:bg-amber-800 flex items-center justify-center shrink-0 z-40 transition-colors active:bg-amber-300`}
                    >
                        <div className={`${layoutMode === 'horizontal' ? 'w-1 h-8' : 'h-1 w-8'} bg-gray-400 dark:bg-gray-600 rounded-full`}></div>
                    </div>
                )}

                <div className={`flex-grow flex flex-col bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm rounded-2xl overflow-hidden transition-colors`}>
                    <div className="bg-gray-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-colors">
                        <div className="flex items-center space-x-3 flex-wrap">
                            <span className="font-bold text-xs text-gray-600 dark:text-gray-300 flex items-center whitespace-nowrap">
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                                批改結果：
                                <span className={`text-xl ml-2 font-black ${results.score >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{results.score} 分</span>
                                <span className="text-xs font-normal text-gray-500 ml-2 mt-1 mr-2">(答對 {results.correctCount}/{results.total} 題)</span>
                            </span>
                            <button onClick={() => handleManualRegrade(false)} className="bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 dark:border-stone-600 px-3 py-1.5 text-xs font-bold rounded-full shadow-sm transition-colors active:scale-95 flex items-center gap-1" disabled={isRegrading} >
                                {isRegrading ? <div className="w-3 h-3 border-2 border-stone-400 border-t-stone-800 dark:border-t-white rounded-full animate-spin"></div> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>} 重新算分
                            </button>
                            {results.hasPendingASQ && (
                                <button onClick={() => handleSubmitClick(false, true)} className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 px-3 py-1.5 text-xs font-bold rounded-full shadow-sm transition-colors active:scale-95 flex items-center gap-1" disabled={gradingProgress.show} >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> 批改非選擇題
                                </button>
                            )}
                        </div>
                        
                        {canSeeAnswers && (
                            <div className="flex items-center space-x-4 text-xs shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                                <label className="flex items-center space-x-1.5 cursor-pointer hover:text-stone-800 dark:hover:text-white dark:text-gray-300">
                                    <input type="checkbox" checked={showOnlyWrong} onChange={e => setShowOnlyWrong(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                                    <span className="font-bold">錯題</span>
                                </label>
                                <label className="flex items-center space-x-1.5 cursor-pointer hover:text-stone-800 dark:hover:text-white dark:text-gray-300">
                                    <input type="checkbox" checked={showOnlyStarred} onChange={e => setShowOnlyStarred(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                                    <span className="font-bold text-amber-600 dark:text-amber-400">星號</span>
                                </label>
                                <label className="flex items-center space-x-1.5 cursor-pointer hover:text-stone-800 dark:hover:text-white dark:text-gray-300">
                                    <input type="checkbox" checked={showOnlyNotes} onChange={e => setShowOnlyNotes(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                                    <span className="font-bold text-amber-600 dark:text-amber-400">筆記</span>
                                </label>
                                {isTask && initialRecord.taskId && (
                                    <label className="flex items-center space-x-1.5 cursor-pointer hover:text-stone-800 dark:hover:text-white dark:text-gray-300 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-gray-300 dark:border-gray-600">
                                        <input type="checkbox" checked={showDiscussion} onChange={e => setShowDiscussion(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                                        <span className="font-bold text-amber-600 dark:text-amber-400">開啟討論區</span>
                                    </label>
                                )}
                            </div>
                        )}
                    </div>

                    {isTask && taskScores && (
                        <div className="px-4 py-2 border-b border-stone-200 dark:border-stone-700 bg-amber-50 dark:bg-stone-900 shrink-0">
                            <h3 className="font-bold text-xs text-amber-700 dark:text-amber-400 mb-2 flex items-center"><svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> 其他挑戰者成績 (匿名)</h3>
                            <div className="flex flex-wrap gap-2">
                                {taskScores.length > 0 ? taskScores.map((s, i) => (
                                    <span key={i} className={`px-1.5 py-0.5 text-xs font-bold border rounded ${s >= 60 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'}`}>{s} 分</span>
                                )) : <span className="text-xs text-gray-500">尚無其他挑戰者成績</span>}
                            </div>
                        </div>
                    )}

                    {!canSeeAnswers ? (
                        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-stone-900 custom-scrollbar">
                            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            <h3 className="font-black text-xl text-gray-700 dark:text-gray-300 mb-2">答案未公開</h3>
                            <p className="text-gray-500 dark:text-gray-400 font-bold max-w-sm">出題者已將此試卷的標準答案隱藏。<br/>您的分數已記錄成功，您可以前往討論區與大家交流！</p>
                        </div>
                    ) : (
                        <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 sm:p-6 custom-scrollbar bg-stone-50 dark:bg-stone-900 transition-colors">
                            {/* ✨ 題型列表收合設計 (沉浸模式的大卡片已經移到外層獨立顯示了) */}
                            {['Q', 'SQ', 'ASQ'].map(targetType => {
                                const typeData = results.data.filter(item => {
                                    const actualIdx = item.number - 1;
                                    const qType = parsedQuestionTypes[actualIdx] || 'Q';
                                    if (qType !== targetType) return false;

                                    if (!showOnlyWrong && !showOnlyStarred && !showOnlyNotes) return true;
                                    let show = false;
                                    if (showOnlyWrong && !item.isCorrect) show = true;
                                    if (showOnlyStarred && starred[item.number - 1]) show = true;
                                    if (showOnlyNotes && notes && notes[item.number - 1]) show = true;
                                    return show;
                                });

                                if (typeData.length === 0) return null;

                                const typeLabel = targetType === 'Q' ? '選擇題' : targetType === 'SQ' ? '簡答題' : '問答題';
                                const themeColor = targetType === 'Q' ? 'text-amber-600 bg-amber-500' : targetType === 'SQ' ? 'text-cyan-600 bg-cyan-500' : 'text-purple-600 bg-purple-500';

                                return (
                                    <div key={targetType} className="mb-6 last:mb-0 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden p-4 sm:p-5">
                                        <button 
                                            onClick={() => toggleSection(targetType)} 
                                            className="w-full flex justify-between items-center font-black text-lg pb-3 mb-4 border-b-2 dark:text-white border-stone-100 dark:border-stone-700 hover:text-amber-600 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${targetType === 'Q' ? 'bg-amber-500' : targetType === 'SQ' ? 'bg-cyan-500' : 'bg-purple-500'}`}></div>
                                                {typeLabel}
                                                <span className="text-sm font-bold text-gray-500 bg-gray-100 dark:bg-stone-900 px-3 py-0.5 rounded-full ml-2 shadow-inner">{typeData.length} 題</span>
                                            </div>
                                            <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${collapsedSections[targetType] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                                        </button>
                                        
                                        {!collapsedSections[targetType] && (
                                            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px 16px' }}>
                                                {typeData.map((item, i) => {
                                                    const actualIdx = item.number - 1;
                                                    const qType = parsedQuestionTypes[actualIdx] || 'Q';
                                                    const qLocalNum = parsedQuestionTypes.slice(0, actualIdx + 1).filter(t => t === qType).length;
                                                    
                                                    return (
                                                       <div 
                                                            key={`${targetType}-${i}`} 
                                                            onClick={() => {
                                                                scrollToQuestion(item.number); 
                                                                if (isTask && initialRecord.taskId) {
                                                                    setCommentQNum(item.number.toString());
                                                                    setShowDiscussion(true);
                                                                    setTimeout(() => {
                                                                        discussionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                    }, 100);
                                                                }
                                                            }}
                                                            className={`break-avoid flex flex-col justify-between p-4 border border-gray-200 dark:border-stone-600 rounded-xl transition-colors ${item.isCorrect ? 'bg-[#FCFBF7] dark:bg-stone-800 hover:border-emerald-400' : (item.retestCorrect ? 'bg-cyan-50/20 dark:bg-cyan-900/10 hover:border-cyan-400' : 'bg-rose-50/50 dark:bg-rose-900/10 hover:border-rose-400')} cursor-pointer shadow-sm`}
                                                            title="點擊跳轉至此題題目與討論"
                                                        >
                                                            <div className="flex justify-between items-center w-full mb-3 border-b border-stone-100 dark:border-gray-700 pb-3">
                                                                <div className="flex items-center space-x-2 shrink-0">
                                                                    <div className="flex items-center justify-center space-x-1.5">
                                                                    <button onClick={(e) => { e.stopPropagation(); toggleStar(item.number - 1); }} className={`focus:outline-none transition-transform hover:scale-110 ${starred[item.number - 1] ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`} title="標記星號">
                                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                                                    </button>
                                                                    {notes && notes[item.number - 1] && <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>}
                                                                    <span className={`font-mono text-lg font-black hover:underline whitespace-nowrap ${item.isCorrect ? 'text-stone-800 dark:text-stone-200' : (item.retestCorrect ? 'text-cyan-700 dark:text-cyan-400' : 'text-rose-600 dark:text-rose-400')}`}>
                                                                        第 {qType === 'Q' ? qLocalNum : `${qType}.${qLocalNum}`} 題 
                                                                    </span>
                                                                    {item.retestCorrect && (
                                                                        <span className="text-[10px] px-1.5 py-0.5 ml-2 rounded-full font-bold border whitespace-nowrap bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700 flex items-center">
                                                                            <span className="material-symbols-outlined text-[12px] mr-0.5 font-black">done_all</span>已修正
                                                                        </span>
                                                                    )}
                                                                    {qType !== 'Q' && <span className={`text-[10px] px-1.5 py-0.5 ml-1 rounded font-bold border whitespace-nowrap ${qType === 'SQ' ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300' : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300'}`}>{qType === 'SQ' ? '簡答題' : '問答題'}</span>}
                                                                </div>
                                                                </div>
                                                                <div className="flex flex-col items-end space-y-1">
                                                                    <div className="flex items-center space-x-2 text-sm">
                                                                        <span className="text-gray-400 text-xs font-bold">你的答案</span>
                                                                        <span className={`font-black text-base min-w-[24px] text-right ${item.isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>{item.userAns}</span>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2 text-sm">
                                                                        <span className="text-gray-400 text-xs font-bold">正確答案</span>
                                                                        <span className="font-black text-base min-w-[24px] text-right text-stone-700 dark:text-stone-300">{qType === 'Q' ? (item.correctAns || '無') : '見解析'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* AI 批改回饋顯示區塊 */}
                                                            {qType === 'ASQ' && aiFeedback && aiFeedback[actualIdx] && (
                                                                <div className="mb-3 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden shadow-sm transition-all" onClick={e => e.stopPropagation()}>
                                                                    <button 
                                                                        onClick={() => setAiFeedback(prev => ({...prev, [`show_${actualIdx}`]: !prev[`show_${actualIdx}`]}))}
                                                                        className="w-full bg-white dark:bg-stone-800 px-3 py-2 flex justify-between items-center hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                                                                    >
                                                                        <span className="font-bold text-xs text-stone-600 dark:text-stone-300 flex items-center">
                                                                            <svg className="w-4 h-4 mr-1.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                                                                            查看 AI 評分理由
                                                                        </span>
                                                                        <svg className={`w-4 h-4 text-stone-400 transition-transform ${aiFeedback[`show_${actualIdx}`] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                                    </button>
                                                                    {aiFeedback[`show_${actualIdx}`] && (
                                                                        <div className="p-3 text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed border-t border-stone-200 dark:border-stone-700">
                                                                            <div className="mb-2 p-2 bg-white dark:bg-stone-800 rounded border border-stone-100 dark:border-stone-700 shadow-inner">
                                                                                <span className="font-bold text-gray-400">你的回答：</span><br/>
                                                                                {item.userAns}
                                                                            </div>
                                                                            <span className="font-bold text-purple-600 dark:text-purple-400">AI 評語：</span><br/>
                                                                            {aiFeedback[actualIdx]}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="flex justify-end w-full gap-2 mt-1">
                                                        {(() => {
                                                            const q = parsedInteractiveQuestions[actualIdx];
                                                            const expTags = q.type === 'Q' ? ['A'] : q.type === 'SQ' ? ['SA', 'SQ'] : ['ASA', 'AS', 'ASQ'];
                                                            const currentExp = (q && q.explain) || (typeof extractSpecificContent === 'function' ? extractSpecificContent(explanationHtml, q.number, expTags) : extractSpecificExplanation(explanationHtml, q.number));
                                                            
                                                            if (currentExp || (notes && notes[actualIdx])) {
                                                               return (
                                                            <button 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    if (tutorialStep === 8 && actualIdx === 0) setTutorialStep(99); // ✨ 進入自由作答模式
                                                                    setExplanationModalItem({ number: q.number, content: currentExp, note: notes ? notes[actualIdx] : '' }); 
                                                                }} 
                                                                className={`text-xs px-3 py-1.5 font-bold rounded-full border transition-colors shadow-sm flex items-center ${tutorialStep === 8 && actualIdx === 0 ? 'tutorial-highlight relative z-[160] bg-amber-500 text-white border-amber-600 ring-4 ring-amber-300 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-600'}`}
                                                            >
                                                                <span className="material-symbols-outlined text-[16px] mr-1">menu_book</span>
                                                                詳解筆記
                                                            </button>
                                                            );
                                                            }
                                                            return null;
                                                        })()}
                                                       <button 
                                                            disabled={loadingWrongBookNum === item.number}
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                if (tutorialStep === 8) setTutorialStep(9);
                                                                handleAddToWrongBook(item); 
                                                            }} 
                                                            className={`text-xs px-3 py-1.5 font-bold rounded-full border transition-colors shadow-sm flex items-center ${tutorialStep === 8 ? 'relative z-[160] bg-amber-500 text-white border-amber-600 ring-4 ring-amber-300 animate-pulse' : 'bg-white dark:bg-stone-700 text-rose-600 dark:text-rose-400 border-stone-200 dark:border-stone-600 hover:bg-rose-50 dark:hover:bg-stone-600'} ${loadingWrongBookNum === item.number ? 'opacity-50 cursor-wait' : ''}`}
                                                        >
                                                            {loadingWrongBookNum === item.number ? (
                                                            <><span className="material-symbols-outlined text-[16px] mr-1 animate-spin">autorenew</span>處理中...</>
                                                        ) : (
                                                            <><span className="material-symbols-outlined text-[16px] mr-1">bookmark_add</span>收錄錯題</>
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
                            })}
                        </div>
                    )}

                    {isTask && initialRecord.taskId && showDiscussion && (
                        <div ref={discussionRef} className="h-[350px] flex flex-col border-t-4 border-stone-200 dark:border-stone-700 bg-[#FCFBF7] dark:bg-stone-800 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-all">
                            <div className="bg-stone-50 dark:bg-stone-900 p-2 px-4 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center shrink-0">
                                <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                    任務討論區 (限傳圖 & 5MB)
                                </h3>
                                <button onClick={() => setShowDiscussion(false)} className="text-gray-500 hover:text-red-500 font-bold flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg> 關閉
                                </button>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50 dark:bg-stone-800">
                                {discussions.length === 0 ? (
                                    <p className="text-gray-400 text-center text-sm mt-4 font-bold">還沒有人留言，來搶頭香吧！</p>
                                ) : (
                                    discussions.map(msg => (
                                        <div key={msg.id} className="bg-[#FCFBF7] dark:bg-gray-700 border border-stone-200 dark:border-gray-600 p-3 rounded-2xl shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-bold text-sm text-amber-600 dark:text-amber-400">{msg.userName}</span>
                                                    <span className="text-[10px] font-bold bg-stone-50 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-2xl border border-stone-200 dark:border-gray-500">
                                                        {msg.questionNum === '0' ? '綜合討論' : `針對 第 ${msg.questionNum} 題`}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-bold">
                                                    {msg.timestamp ? msg.timestamp.toDate().toLocaleString('zh-TW') : ''}
                                                </span>
                                            </div>
                                            {msg.text && <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap font-bold">{msg.text}</p>}
                                            {msg.imageUrl && (
                                                <img src={msg.imageUrl} alt="留言附圖" className="mt-2 max-w-[200px] max-h-[200px] object-contain border border-stone-200 dark:border-gray-600" />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-3 bg-[#FCFBF7] dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700 shrink-0">
                                <div className="flex space-x-2 mb-2">
                                    <select 
                                        value={commentQNum} 
                                        onChange={e => {
                                            setCommentQNum(e.target.value);
                                            if (e.target.value !== "0") scrollToQuestion(e.target.value); 
                                        }}
                                        className="p-1.5 border border-gray-300 dark:border-gray-600 bg-[#FCFBF7] dark:bg-gray-700 text-sm rounded-2xl outline-none font-bold cursor-pointer hover:bg-stone-50 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <option value="0">綜合討論</option>
                                        {Array.from({ length: numQuestions }, (_, i) => (
                                            <option key={i+1} value={i+1}>針對第 {i+1} 題</option>
                                        ))}
                                    </select>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        id="commentFile"
                                        className="hidden"
                                        onChange={e => setCommentFile(e.target.files[0])}
                                    />
                                    <label 
                                        htmlFor="commentFile" 
                                        className="flex items-center justify-center px-3 bg-stone-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-stone-100 dark:hover:bg-gray-600 text-sm font-bold transition-colors rounded-2xl"
                                        title="支援上傳圖片 (大小不超過 5MB)"
                                    >
                                        {commentFile ? (
                                            <><svg className="w-4 h-4 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> 已選圖片</>
                                        ) : (
                                            <><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> 附加圖片</>
                                        )}
                                    </label>
                                </div>
                                <div className="flex space-x-2">
                                    <textarea 
                                        className="flex-grow p-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm rounded-2xl outline-none resize-none h-10 custom-scrollbar font-bold"
                                        placeholder="輸入留言內容..."
                                        value={commentInput}
                                        onChange={e => setCommentInput(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleUploadComment} 
                                        disabled={isSubmittingComment}
                                        className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-4 py-2 font-black rounded-2xl hover:bg-stone-700 dark:hover:bg-white transition-colors whitespace-nowrap shadow-sm"
                                    >
                                        {isSubmittingComment ? '傳送中' : '送出留言'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
            )} {/* ✨ 結束沉浸模式與列表模式的條件渲染切換 */}
            
            </div> {/* ✨ 結束左側主內容區 wrapper */}

            {/* ✨ 修改：全新設計的可收合省空間成績總覽面板 (支援沉浸模式連動與錯題雙重顯示) */}
            <div className={`hidden xl:flex flex-col shrink-0 h-full mt-8 bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-xl transition-all duration-300 z-10 ${previewOpen ? 'w-[280px]' : 'w-[60px]'}`}>
                <button 
                    onClick={() => setPreviewOpen(!previewOpen)} 
                    className="w-full bg-stone-100 dark:bg-stone-900 hover:bg-amber-100 dark:hover:bg-amber-950/40 py-2 flex justify-center items-center border-b border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 transition-colors shrink-0"
                >
                    <span className="material-symbols-outlined text-xl">{previewOpen ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}</span>
                </button>
                
                {previewOpen ? (
                    <>
                        <div className="bg-stone-50 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-700 px-4 py-3 shrink-0 flex flex-col gap-0.5 text-center">
                            <span className="font-bold text-sm tracking-wide text-stone-500 dark:text-stone-400">成績總覽</span>
                            <div className="flex justify-center items-end gap-1">
                                <span className={`text-3xl font-black ${results.score >= 60 ? 'text-emerald-500' : 'text-red-500'}`}>{results.score}</span>
                                <span className="text-xs text-stone-400 font-bold mb-1">分</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                            <div className="grid grid-cols-4 gap-1.5">
                                {results.data.map((item, idx) => {
                                    const isStarred = starred[item.number - 1];
                                    const isCorrect = item.isCorrect;
                                    const isCurrentInInteractive = viewMode === 'interactive' && resultInteractiveIdx === idx;
                                    
                                    return (
                                        <button 
                                            key={idx}
                                            onClick={() => {
                                                if (viewMode === 'interactive') setResultInteractiveIdx(idx);
                                                else scrollToQuestion(item.number);
                                            }}
                                            className={`relative p-1 min-h-[48px] flex flex-col items-center justify-center rounded-lg border transition-all hover:scale-105 active:scale-95 shadow-sm
                                                ${isCurrentInInteractive ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-stone-800 font-black' : ''}
                                                ${isCorrect ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/60 dark:text-emerald-400' : 'bg-rose-50/60 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/60 dark:text-rose-400'}
                                            `}
                                        >
                                            <span className="text-xs font-black leading-none mb-0.5">{item.number}</span>
                                            {isCorrect ? (
                                                <span className="text-[10px] font-bold opacity-80 bg-emerald-100/50 dark:bg-emerald-900/30 px-1 rounded leading-tight">{item.userAns || '-'}</span>
                                            ) : (
                                                <div className="flex flex-col items-center leading-none gap-0.5 w-full">
                                                    <span className="text-[9px] line-through opacity-50 text-rose-600 dark:text-rose-500">{item.userAns || '-'}</span>
                                                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40 px-0.5 rounded">{item.correctAns || '-'}</span>
                                                </div>
                                            )}
                                            {isStarred && <span className="absolute -top-1 -right-1 material-symbols-outlined text-[11px] text-amber-500 bg-white dark:bg-stone-800 rounded-full shadow-sm">star</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            
                            {/* ✨ 新增：沉浸式檢視模式右側面板的章節答對率視覺化分析 */}
                            {parsedInteractiveQuestions.length > 0 && canSeeAnswers && (
                                <div className="mt-6 border-t border-stone-200 dark:border-stone-700 pt-4 pb-2">
                                    <h4 className="font-black text-sm text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[18px] text-amber-500">pie_chart</span>
                                        章節答對率分析
                                    </h4>
                                    {(() => {
                                        const tagStats = {};
                                        results.data.forEach((item) => {
                                            const actualIdx = item.number - 1;
                                            const q = parsedInteractiveQuestions.find(q => q.globalIndex === actualIdx);
                                            if (q) {
                                                // ✨ 優先使用獨立題庫的標籤 q.tag，如果沒有才回退到正文的正則表達式提取
                                                let tags = [];
                                                if (q.tag) {
                                                    tags = [q.tag];
                                                } else if (q.mainText) {
                                                    const text = q.mainText.replace(/<[^>]+>/g, '');
                                                    const matchTags = text.match(/#([^\s\|\]\)\,\s]+)/g);
                                                    if (matchTags) {
                                                        tags = [...new Set(matchTags)].map(t => t.substring(1).trim());
                                                    }
                                                }
                                                
                                                tags.forEach(tag => {
                                                    if (!tagStats[tag]) tagStats[tag] = { total: 0, correct: 0 };
                                                    tagStats[tag].total += 1;
                                                    if (item.isCorrect) tagStats[tag].correct += 1;
                                                });
                                            }
                                        });

                                        const tagStatsArray = Object.keys(tagStats).map(tag => ({
                                            tag,
                                            total: tagStats[tag].total,
                                            correct: tagStats[tag].correct,
                                            rate: Math.round((tagStats[tag].correct / tagStats[tag].total) * 100)
                                        })).sort((a, b) => b.total - a.total);

                                        if (tagStatsArray.length === 0) {
                                            return <p className="text-[10px] text-stone-400 font-bold italic">未偵測到章節標籤 (#標籤)</p>;
                                        }

                                        return (
                                            <div className="space-y-4">
                                                {tagStatsArray.length >= 3 && (
                                                    <div className="flex justify-center mb-4 mt-2">
                                                        <svg width="160" height="160" viewBox="0 0 160 160" className="overflow-visible drop-shadow-sm">
                                                            {[0.2, 0.4, 0.6, 0.8, 1].map(level => {
                                                                const pts = tagStatsArray.map((_, i) => {
                                                                    const angle = i * ((Math.PI * 2) / tagStatsArray.length) - Math.PI / 2;
                                                                    return `${80 + 50 * level * Math.cos(angle)},${80 + 50 * level * Math.sin(angle)}`;
                                                                }).join(' ');
                                                                return <polygon key={level} points={pts} fill="none" stroke="currentColor" className="text-stone-300 dark:text-stone-600" strokeWidth="1" />;
                                                            })}
                                                            {tagStatsArray.map((_, i) => {
                                                                const angle = i * ((Math.PI * 2) / tagStatsArray.length) - Math.PI / 2;
                                                                return <line key={i} x1="80" y1="80" x2={80 + 50 * Math.cos(angle)} y2={80 + 50 * Math.sin(angle)} stroke="currentColor" className="text-stone-300 dark:text-stone-600" strokeWidth="1" />;
                                                            })}
                                                            <polygon points={tagStatsArray.map((d, i) => {
                                                                const angle = i * ((Math.PI * 2) / tagStatsArray.length) - Math.PI / 2;
                                                                return `${80 + 50 * (d.rate / 100) * Math.cos(angle)},${80 + 50 * (d.rate / 100) * Math.sin(angle)}`;
                                                            }).join(' ')} fill="rgba(245, 158, 11, 0.4)" stroke="rgb(245, 158, 11)" strokeWidth="2" className="transition-all duration-1000 ease-out" />
                                                            {tagStatsArray.map((d, i) => {
                                                                const angle = i * ((Math.PI * 2) / tagStatsArray.length) - Math.PI / 2;
                                                                return (
                                                                    <text key={i} x={80 + 70 * Math.cos(angle)} y={80 + 70 * Math.sin(angle)} textAnchor="middle" dominantBaseline="middle" className="text-[9px] font-black fill-stone-600 dark:fill-stone-300">
                                                                        {d.tag.length > 5 ? d.tag.substring(0, 5) + '...' : d.tag}
                                                                    </text>
                                                                );
                                                            })}
                                                        </svg>
                                                    </div>
                                                )}
                                                {tagStatsArray.map(stat => (
                                                    <div key={stat.tag} className="flex flex-col gap-1">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400 truncate max-w-[120px]" title={stat.tag}>#{stat.tag}</span>
                                                            <span className="text-[10px] font-black text-stone-700 dark:text-stone-300">{stat.rate}%</span>
                                                        </div>
                                                        <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2 overflow-hidden shadow-inner">
                                                            <div 
                                                                className={`h-full transition-all duration-1000 ease-out rounded-full ${stat.rate >= 80 ? 'bg-emerald-500' : stat.rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                                style={{ width: `${stat.rate}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center py-4 gap-3 overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col items-center">
                            <span className={`text-lg font-black ${results.score >= 60 ? 'text-emerald-500' : 'text-red-500'}`}>{results.score}</span>
                            <span className="text-[9px] text-stone-400 font-bold leading-none">分</span>
                        </div>
                        <div className="w-full border-t border-stone-200 dark:border-stone-700 my-1"></div>
                        {results.data.map((item, idx) => {
                            const isCurrentInInteractive = viewMode === 'interactive' && resultInteractiveIdx === idx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        if (viewMode === 'interactive') setResultInteractiveIdx(idx);
                                        else scrollToQuestion(item.number);
                                    }}
                                    className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all hover:scale-110
                                        ${isCurrentInInteractive ? 'ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-stone-800' : ''}
                                        ${item.isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}
                                    `}
                                >
                                    {item.number}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {showShareScoreModal && (
                <div className="fixed inset-0 bg-stone-800 bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 w-full max-w-sm rounded-[2rem] shadow-xl border border-stone-200 dark:border-stone-700">
                        <h3 className="font-black text-lg mb-4 dark:text-white flex items-center justify-between">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[20px] text-rose-500">share</span> 分享與炫耀</span>
                            <button onClick={() => setShowShareScoreModal(false)} className="text-gray-400 hover:text-stone-800 dark:hover:text-white">✕</button>
                        </h3>

                        <div className="mb-6 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 p-4 rounded-2xl shadow-inner">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">測驗代碼</p>
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 px-3 py-2 rounded-xl">
                                    <span className="font-mono text-xl font-black text-amber-600 dark:text-amber-400 tracking-widest">{shortCode || initialRecord.shortCode || '公開任務免代碼'}</span>
                                    {shortCode || initialRecord.shortCode ? (
                                        <button onClick={() => {
                                            navigator.clipboard.writeText(shortCode || initialRecord.shortCode);
                                            showAlert(`✅ 已複製代碼：${shortCode || initialRecord.shortCode}`);
                                        }} className="text-xs font-bold bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-800 px-3 py-1.5 rounded-lg hover:bg-stone-700 transition-colors">
                                            複製
                                        </button>
                                    ) : null}
                                </div>
                                <button onClick={() => {
                                    const link = `${window.location.origin}/?shareCode=${shortCode || initialRecord.shortCode || ''}`;
                                    const shareText = `🔥 快來挑戰我的試卷！\n📝 試卷名稱：${testName.replace(/\[#(op|m?nm?st)\]/gi, '').trim()}\n🔑 試卷代碼：${shortCode || initialRecord.shortCode || '公開任務無需代碼'}\n\n👇 點擊下方連結，立即將試卷自動加入你的題庫：\n${link}`;
                                    navigator.clipboard.writeText(shareText);
                                    showAlert(`✅ 已複製邀請連結與文案！快去貼給朋友吧！`);
                                }} className="w-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 py-2 rounded-xl border border-amber-200 dark:border-amber-800 hover:bg-amber-200 transition-colors flex items-center justify-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">link</span> 複製邀請連結與文案
                                </button>
                            </div>
                        </div>

                        <h4 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-2 px-1">直接傳送給好友</h4>
                        <div className="max-h-40 overflow-y-auto border border-stone-200 dark:border-stone-700 rounded-xl custom-scrollbar bg-white dark:bg-stone-900 shadow-inner">
                            {(userProfile.friends || []).length === 0 ? <p className="p-4 text-xs text-gray-400 text-center font-bold">目前還沒有好友喔</p> : null}
                            {(userProfile.friends || []).map(f => (
                                <button key={f.uid} onClick={() => shareScoreToFriend(f)} className="w-full text-left p-3 hover:bg-stone-50 dark:hover:bg-stone-800 border-b border-gray-100 dark:border-gray-800 font-bold text-sm transition-colors dark:text-white last:border-b-0 flex justify-between items-center group">
                                    <span>{f.name} <span className="text-gray-400 dark:text-gray-500 font-normal ml-2">{f.email}</span></span>
                                    <span className="material-symbols-outlined text-gray-300 group-hover:text-amber-500 transition-colors text-[18px]">send</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            {/* 新增：錯題收錄 Modal */}
            {wrongBookAddingItem && (
                <WrongBookModal
                    title={`收錄第 ${wrongBookAddingItem.number} 題`}
                    initialData={{ 
                        qText: wrongBookAddingItem.extractedQText || '', 
                        qHtml: wrongBookAddingItem.extractedQHtml || '',
                        nText: wrongBookAddingItem.extractedExp || '', 
                        folder: localStorage.getItem('lastWrongBookFolder') || '未分類',
                        userFolders: Array.from(new Set(userProfile?.wrongBookFolders || ['未分類'])),
                        // ✨ 傳入樹狀結構所需的資料與渲染函式
                        folderTree: (() => {
                            const rawList = Array.from(new Set(userProfile?.wrongBookFolders || ['未分類']));
                            const tree = {};
                            rawList.forEach(f => {
                                if (f === '未分類') return;
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
                        })(),
                        renderFolderTree: renderFolderTree
                    }}
                    onClose={() => setWrongBookAddingItem(null)}
                    onSave={async (data) => {
                        try {
                            localStorage.setItem('lastWrongBookFolder', data.folder || '未分類');
                            await window.db.collection('users').doc(currentUser.uid).collection('wrongBook').add({
                                quizId: quizId,
                                folder: data.folder || '未分類',
                                quizName: cleanQuizName(testName),
                                questionNum: wrongBookAddingItem.number,
                                userAns: wrongBookAddingItem.userAns || '未填寫',
                                correctAns: wrongBookAddingItem.correctAns,
                                qText: data.qText || '',
                                qHtml: data.qHtml || '',
                                qImage: data.qImage,
                                nText: data.nText,
                                nImage: data.nImage,
                                // ✨ 紀錄獨立題庫關聯屬性
                                source: wrongBookAddingItem.source || 'quiz',
                                qlibQuestionId: wrongBookAddingItem.qlibQuestionId || null,
                                qlibSubjectId: wrongBookAddingItem.qlibSubjectId || null,
                                qlibChapterId: wrongBookAddingItem.qlibChapterId || null,
                                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                            });
                            if (data.folder && !userProfile.wrongBookFolders?.includes(data.folder)) {
                                await window.db.collection('users').doc(currentUser.uid).set({
                                    wrongBookFolders: window.firebase.firestore.FieldValue.arrayUnion(data.folder)
                                }, { merge: true });
                            }
                            showAlert(`第 ${wrongBookAddingItem.number} 題已成功收錄至「錯題整理」！`, "收錄成功");
                            setWrongBookAddingItem(null);
                        } catch(e) {
                            showAlert("收錄失敗：" + e.message);
                        }
                    }}
                    showAlert={showAlert}
                />
            )}

            {/* ✨ 新增：偷看答案確認 Modal (含不再顯示選項) */}
            {peekConfirmIdx !== null && (
                <div className="fixed inset-0 bg-stone-800/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 w-full max-w-sm rounded-[2rem] shadow-2xl border border-stone-200 dark:border-stone-700">
                        <h3 className="font-black text-lg mb-3 dark:text-white flex items-center">
                            <svg className="w-6 h-6 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            確定要偷看答案嗎？
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 font-bold">
                            看過答案後，本題將被鎖定無法再更改選項！
                        </p>
                        <label className="flex items-center space-x-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-6 cursor-pointer bg-stone-50 dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 accent-amber-500" 
                                checked={!quizSettings.askBeforePeek}
                                onChange={(e) => setQuizSettings(prev => ({ ...prev, askBeforePeek: !e.target.checked }))}
                            />
                            <span>不再顯示此提示</span>
                        </label>
                        <div className="flex gap-3">
                            <button onClick={() => setPeekConfirmIdx(null)} className="flex-1 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 py-2.5 rounded-full font-bold hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors">取消</button>
                            <button 
                                onClick={() => {
                                    if (tutorialStep === 7 && peekConfirmIdx === 0) setTutorialStep(8);
                                    executePeek(peekConfirmIdx);
                                    setPeekConfirmIdx(null);
                                }} 
                                className="flex-1 bg-amber-500 text-white py-2.5 rounded-full font-bold hover:bg-amber-600 shadow-md transition-colors"
                            >確定偷看</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✨ 新增：系統設定 Modal (單色質感圖示) */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-stone-800/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-fade-in">
                    <div className="bg-[#FCFBF7] dark:bg-stone-900 p-6 sm:p-8 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-stone-200 dark:border-stone-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-6 border-b border-stone-200 dark:border-stone-700 pb-4">
                            <h3 className="font-black text-xl text-stone-800 dark:text-white flex items-center">
                                <svg className="w-6 h-6 mr-2 text-stone-700 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                測驗設定
                            </h3>
                            <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-stone-800 dark:hover:text-white">✕</button>
                        </div>

                        <div className="space-y-6">
                            {/* ✨ 試卷管理操作區 (整合作業) */}
                            <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm flex flex-col gap-3">
                                <h4 className="font-bold text-sm text-stone-600 dark:text-stone-300 mb-1 flex items-center border-b border-stone-100 dark:border-stone-700 pb-2">
                                    <span className="material-symbols-outlined text-[18px] mr-1.5">edit_document</span> 試卷管理
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {!isShared && !isTask && tutorialStep === 0 && (
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSettingsModal(false); setStep('edit'); }} className="text-sm font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 py-2 rounded-xl border border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-800 transition-colors flex items-center justify-center shadow-sm col-span-2">
                                            <span className="material-symbols-outlined text-[16px] mr-1.5">edit</span> 編輯試題
                                        </button>
                                    )}
                                    {(isShared || isTask || testName.includes('[#op]')) && (
                                        <button onClick={() => { setShowSettingsModal(false); handleSendSuggestion(); }} className="text-sm font-bold bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 py-2 rounded-xl border border-stone-200 dark:border-stone-600 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors flex items-center justify-center shadow-sm col-span-2">
                                            <span className="material-symbols-outlined text-[16px] mr-1.5">feedback</span> 修正建議
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 顯示模式切換 */}
                            <div>
                                <h4 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    顯示模式
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setViewMode('interactive')}
                                        className={`py-3 px-2 rounded-2xl font-bold text-sm border-2 transition-all flex flex-col items-center justify-center gap-1 ${viewMode === 'interactive' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'border-stone-200 bg-white text-stone-600 dark:bg-stone-800 dark:border-stone-600 dark:text-gray-300'}`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                                        沉浸式作答
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('split')}
                                        className={`py-3 px-2 rounded-2xl font-bold text-sm border-2 transition-all flex flex-col items-center justify-center gap-1 ${viewMode === 'split' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'border-stone-200 bg-white text-stone-600 dark:bg-stone-800 dark:border-stone-600 dark:text-gray-300'}`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path></svg>
                                        雙視窗預覽
                                    </button>
                                </div>
                                {viewMode === 'split' && (
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        <button onClick={() => setLayoutMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')} className="bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-100 py-2 rounded-xl font-bold border border-stone-200 dark:border-stone-600 text-sm hover:bg-stone-200 transition-colors flex items-center justify-center">
                                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                                            切換版面
                                        </button>
                                        <button onClick={() => setPreviewOpen(!previewOpen)} className="bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-100 py-2 rounded-xl font-bold border border-stone-200 dark:border-stone-600 text-sm hover:bg-stone-200 transition-colors flex items-center justify-center">
                                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                            開關預覽
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* ✨ 新增：介面排版客製化 */}
                            <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-4 shadow-sm">
                                <h4 className="font-bold text-sm text-amber-600 dark:text-amber-400 mb-2 flex items-center border-b dark:border-stone-700 pb-2">
                                    <span className="material-symbols-outlined text-[18px] mr-1.5">text_format</span>
                                    介面與排版設定
                                </h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">字體選擇</label>
                                        <select value={customFontFamily} onChange={e => setCustomFontFamily(e.target.value)} className="w-full p-2 border rounded-lg bg-stone-50 dark:bg-stone-900 dark:border-stone-600 dark:text-white text-sm outline-none">
                                            <option value="inherit">系統預設</option>
                                            <option value="'Noto Sans TC', sans-serif">思源黑體 (無襯線)</option>
                                            <option value="'Noto Serif TC', serif">思源宋體 (有襯線)</option>
                                            <option value="ui-rounded, 'Hiragino Maru Gothic ProN', 'Quicksand', sans-serif">圓體 (柔和)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">文字行高</label>
                                        <select value={lineHeight} onChange={e => setLineHeight(e.target.value)} className="w-full p-2 border rounded-lg bg-stone-50 dark:bg-stone-900 dark:border-stone-600 dark:text-white text-sm outline-none">
                                            <option value="1.4">緊湊 (1.4)</option>
                                            <option value="1.6">標準 (1.6)</option>
                                            <option value="1.8">寬鬆 (1.8)</option>
                                            <option value="2.0">極寬 (2.0)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">螢光筆畫重點顏色 (選取文字即可標記)</label>
                                    <div className="flex gap-3">
                                        {['#fef08a', '#bbf7d0', '#a5f3fc', '#fbcfe8'].map(color => (
                                            <button 
                                                key={color} 
                                                onClick={() => setHighlightColor(color)}
                                                className={`w-8 h-8 rounded-full transition-transform ${highlightColor === color ? 'ring-2 ring-stone-800 dark:ring-white scale-110 shadow-md' : 'border border-gray-300'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 功能開關 */}
                            <div className="bg-stone-50 dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-4">
                                <h4 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                                    功能開關
                                </h4>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-stone-700 dark:text-gray-200">智慧自動下一題</span>
                                        <span className="text-[10px] text-gray-500">點擊選項後自動切換下一題 (按上一題時會自動關閉)</span>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5 accent-amber-500" checked={quizSettings.autoNext} onChange={(e) => setQuizSettings(prev => ({...prev, autoNext: e.target.checked}))} />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer border-t dark:border-stone-700 pt-3">
                                    <span className="text-sm font-bold text-stone-700 dark:text-gray-200">沉浸模式：啟用刪去法</span>
                                    <input type="checkbox" className="w-5 h-5 accent-amber-500" checked={quizSettings.showEliminationBtn} onChange={(e) => setQuizSettings(prev => ({...prev, showEliminationBtn: e.target.checked}))} />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer border-t dark:border-stone-700 pt-3">
                                    <span className="text-sm font-bold text-stone-700 dark:text-gray-200">偷看答案前再次確認</span>
                                    <input type="checkbox" className="w-5 h-5 accent-amber-500" checked={quizSettings.askBeforePeek} onChange={(e) => setQuizSettings(prev => ({...prev, askBeforePeek: e.target.checked}))} />
                                </label>
                            </div>

                            {/* 快捷鍵設定 */}
                            <div>
                                <h4 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                    快捷鍵自訂 (沉浸模式)
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {['a', 'b', 'c', 'd'].map(opt => (
                                        <div key={opt} className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-500 w-12">選項 {opt.toUpperCase()}</span>
                                            <input 
                                                type="text" maxLength={1} 
                                                className="w-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 p-2 rounded-xl text-center font-black uppercase outline-none focus:border-amber-500 dark:text-white"
                                                value={quizSettings.shortcuts[opt]}
                                                onChange={(e) => {
                                                    const val = e.target.value.toLowerCase();
                                                    if (/^[a-z0-9]$/.test(val)) setQuizSettings(prev => ({ ...prev, shortcuts: { ...prev.shortcuts, [opt]: val } }));
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-500 w-12">偷看</span>
                                        <input 
                                            type="text" maxLength={1} 
                                            className="w-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 p-2 rounded-xl text-center font-black uppercase outline-none focus:border-amber-500 dark:text-white"
                                            value={quizSettings.shortcuts.peek}
                                            onChange={(e) => {
                                                const val = e.target.value.toLowerCase();
                                                if (/^[a-z0-9]$/.test(val)) setQuizSettings(prev => ({ ...prev, shortcuts: { ...prev.shortcuts, peek: val } }));
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-500 w-12">星號</span>
                                        <input 
                                            type="text" maxLength={1} 
                                            className="w-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 p-2 rounded-xl text-center font-black uppercase outline-none focus:border-amber-500 dark:text-white"
                                            value={quizSettings.shortcuts.star}
                                            onChange={(e) => {
                                                const val = e.target.value.toLowerCase();
                                                if (/^[a-z0-9]$/.test(val)) setQuizSettings(prev => ({ ...prev, shortcuts: { ...prev.shortcuts, star: val } }));
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 新增：題庫標籤顯示開關 */}
                        <div className="mt-6 flex justify-between items-center bg-stone-50 dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm">
                            <div>
                                <div className="font-bold text-stone-800 dark:text-stone-200 text-sm">顯示題目來源與標籤</div>
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">作答時是否顯示此題的標籤與難度</div>
                            </div>
                            <button 
                                onClick={() => setQuizSettings(prev => ({...prev, showTags: !prev.showTags}))} 
                                className={`w-12 h-6 rounded-full transition-colors relative ${quizSettings?.showTags ? 'bg-amber-500' : 'bg-gray-300 dark:bg-stone-600'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${quizSettings?.showTags ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <button onClick={() => setShowSettingsModal(false)} className="w-full mt-6 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 py-3 rounded-full font-black text-sm hover:bg-stone-700 dark:hover:bg-white shadow-md transition-all active:scale-95">完成設定</button>
                    </div>
                </div>
            )}

            {/* 新增：詳解 Modal */}
            {explanationModalItem && (
                <div className="fixed inset-0 bg-stone-800 bg-opacity-70 flex items-center justify-center z-[100] p-4" onClick={() => setExplanationModalItem(null)}>
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 w-full max-w-2xl rounded-2xl shadow-2xl transform transition-all max-h-[90dvh] overflow-y-auto custom-scrollbar border-t-4 border-emerald-500" onClick={e => e.stopPropagation()}>
                        <h3 className="font-black text-xl mb-4 flex justify-between items-center dark:text-white border-b border-stone-200 dark:border-stone-700 pb-2">
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 第 {explanationModalItem.number} 題 詳解與筆記</span>
                            <button onClick={() => setExplanationModalItem(null)} className="text-gray-400 hover:text-red-500 font-bold transition-colors">✖</button>
                        </h3>
                        {explanationModalItem.content && (
                            <div className="p-4 bg-gray-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm text-gray-800 dark:text-gray-200 mb-4" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                               <h4 className="font-bold text-emerald-600 dark:text-emerald-400 mb-2 border-b border-emerald-200 dark:border-stone-700 pb-1">官方詳解</h4>
                                <div className="whitespace-pre-wrap preview-rich-text !p-0 !bg-transparent !border-none" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml((explanationModalItem.content || '').replace(/<br\s*\/?>/gi, '\n')) }} />
                            </div>
                        )}
                        {explanationModalItem.note && (
                            <div className="p-4 bg-amber-50 dark:bg-stone-900 border border-amber-200 dark:border-stone-600 text-sm text-gray-800 dark:text-gray-200" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                <h4 className="font-bold text-amber-600 dark:text-amber-400 mb-2 border-b border-amber-200 dark:border-stone-700 pb-1 flex items-center"><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg> 我的筆記</h4>
                                {explanationModalItem.note}
                            </div>
                        )}
                        <div className="flex justify-end mt-6">
                            <button onClick={() => setExplanationModalItem(null)} className="bg-stone-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-6 py-2 rounded-full font-bold text-sm hover:bg-stone-100 dark:hover:bg-gray-600 transition-colors shadow-sm">關閉</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✨ 歷史紀錄 Modal */}
            <div id="history-modal" className="fixed inset-0 bg-stone-800/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 hidden" onClick={() => document.getElementById('history-modal').classList.add('hidden')}>
                <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 w-full max-w-sm rounded-3xl shadow-xl border border-stone-200 dark:border-stone-700 max-h-[80vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                    <h3 className="font-black text-lg mb-4 dark:text-white flex items-center justify-between">
                        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-indigo-500">history</span> 歷史作答紀錄</span>
                        <button onClick={() => document.getElementById('history-modal').classList.add('hidden')} className="text-gray-400 hover:text-stone-800 dark:hover:text-white transition-colors">✕</button>
                    </h3>
                    <div className="space-y-3">
                        {!(quizHistory && quizHistory.length > 0) ? (
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-bold text-center py-4">目前沒有歷史紀錄喔！<br/>按下「再做一次」並交卷後才會產生。</p>
                        ) : (
                            [...quizHistory].reverse().map((h, i) => (
                                <div key={i} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 p-4 rounded-2xl shadow-sm flex flex-col gap-2">
                                    <div className="flex justify-between items-center border-b border-stone-100 dark:border-stone-800 pb-2">
                                        <span className="text-xs font-bold text-gray-400">{new Date(h.date).toLocaleString('zh-TW')}</span>
                                        <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">第 {quizHistory.length - i} 次挑戰</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm font-bold text-stone-600 dark:text-stone-300">答對：{h.correctCount}/{h.total} 題</span>
                                        <span className={`text-xl font-black ${h.score >= 60 ? 'text-emerald-500' : 'text-red-500'}`}>{h.score} 分</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
window.QuizApp = QuizApp;
