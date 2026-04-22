const { useState, useEffect, useRef } = React;

// 從全域 (window) 拿取 components.jsx 提供的小工具
const { 
    cleanQuizName, renderTestName, parseSmilesToHtml, LoadingSpinner, 
    ContentEditableEditor, AnswerGridInput, SpecificAnswerGridInput, HelpTooltip, 
    safeDecompress, processQuestionContent, extractSpecificContent, extractSpecificExplanation 
} = window;
function FastQASection({ user, showAlert, showConfirm, targetQaId, onClose, onRequireLogin }) {
    const { useState, useEffect } = React;
    const [qaList, setQaList] = useState([]);
    const [records, setRecords] = useState({});
    const [loading, setLoading] = useState(true);
    const [qaLimit, setQaLimit] = useState(30); // ✨ 修改：一次載入 30 題
    const [refreshTrigger, setRefreshTrigger] = useState(0); 
    const [isRefreshing, setIsRefreshing] = useState(false); 
    const [jumpingQaId, setJumpingQaId] = useState(null); 
    const [showAdminMode, setShowAdminMode] = useState(false);
    const [isEditExpanded, setIsEditExpanded] = useState(false);
    const [showParseHelp, setShowParseHelp] = useState(false); 
    const [isFastQAExpanded, setIsFastQAExpanded] = useState(true); // ✨ 新增：收合狀態 
    
    const isAdmin = user && user.email === 'jay03wn@gmail.com';
            const [myFriendsUids, setMyFriendsUids] = useState([]);

            useEffect(() => {
                if (user) {
                    const unsub = window.db.collection('users').doc(user.uid).onSnapshot(doc => {
                        if (doc.exists) setMyFriendsUids((doc.data().friends || []).map(f => f.uid));
                    });
                    return () => unsub();
                }
            }, [user]);
            
            const [qaType, setQaType] = useState('mcq');
    const [subjectMode, setSubjectMode] = useState('藥物分析');
    const [subject, setSubject] = useState('藥物分析');
    const [difficultyMode, setDifficultyMode] = useState('1');
    const [customDifficulty, setCustomDifficulty] = useState('1');
    const [rewardMode, setRewardMode] = useState('10');
    const [customReward, setCustomReward] = useState(10);
    const [timePreset, setTimePreset] = useState('permanent'); 
    const [endTimeStr, setEndTimeStr] = useState('');
    const [question, setQuestion] = useState('');

    useEffect(() => {
        if (timePreset === 'custom' || timePreset === 'permanent') {
            if (timePreset === 'permanent') setEndTimeStr('');
            return;
        }

        const now = new Date();
        let targetDate;

        if (timePreset === 'today') {
            targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        } else if (timePreset === '24h') {
            targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        } else if (timePreset === '48h') {
            targetDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        } else if (timePreset === '1w') {
            targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        if (targetDate) {
            const pad = (n) => n.toString().padStart(2, '0');
            const localStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth()+1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`;
            setEndTimeStr(localStr);
        }
    }, [timePreset]);
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAns, setCorrectAns] = useState(0);
    const [explanation, setExplanation] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    
    const [activeQA, setActiveQA] = useState(null);
    const [selectedAns, setSelectedAns] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [showShareModal, setShowShareModal] = useState(false);
    const [shareContent, setShareContent] = useState('');

    // ✨ 新增：討論區與回饋相關狀態
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');

   useEffect(() => {
        let unsubQA = () => {};
        let unsubRecords = () => {};

        const fetchQA = () => {
            if (!window.db) return; 
            try {
                if (targetQaId) {
                    unsubQA = window.db.collection('fastQA').doc(targetQaId).onSnapshot(docSnap => {
                        if (docSnap.exists) setActiveQA({ id: docSnap.id, ...docSnap.data() });
                        else showAlert('找不到此題目，可能已過期或被刪除！');
                        setLoading(false);
                    }, error => {
                        console.error("快問快答讀取失敗:", error);
                        setLoading(false);
                    });
                } else {
                    unsubQA = window.db.collection('fastQA').orderBy('createdAt', 'desc').limit(qaLimit).onSnapshot({ includeMetadataChanges: true }, snapshot => {
                        const qas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        const now = new Date().getTime();
                        const validQas = isAdmin ? qas : qas.filter(q => !q.endTime || q.endTime > now);
                        setQaList(validQas);
                        
                        setActiveQA(prev => {
                            if (prev) return validQas.find(q => q.id === prev.id) || prev;
                            return prev;
                        });
                        setLoading(false);
                    }, error => {
                        console.error("快問快答列表讀取失敗:", error);
                        setLoading(false);
                    });
                }

                if (user) {
                    unsubRecords = window.db.collection('users').doc(user.uid).collection('fastQARecords').onSnapshot(recSnap => {
                        const recs = {};
                        recSnap.docs.forEach(doc => { recs[doc.id] = doc.data(); });
                        setRecords(recs);
                        if (targetQaId && recs[targetQaId]) setShowResult(true);
                    }, error => console.error("作答紀錄讀取失敗:", error));
                } else {
                    setLoading(false);
                }
            } catch (e) {
                console.error("預期外的錯誤:", e);
                setLoading(false);
            }
        };
        fetchQA();
        return () => { unsubQA(); unsubRecords(); };
    }, [user, isAdmin, targetQaId, qaLimit, refreshTrigger]);

    // ✨ 新增：獨立監聽目前 activeQA 的討論區留言
    useEffect(() => {
        if (!activeQA) return;
        const unsubComments = window.db.collection('fastQA').doc(activeQA.id).collection('comments')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snap => {
                setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        return () => unsubComments();
    }, [activeQA?.id]);

    // ✨ 新增：處理發布留言
    const handlePostComment = async () => {
        if (!newComment.trim() || !user) return;
        try {
            const commentData = {
                text: newComment,
                creatorUid: user.uid,
                creatorName: user.displayName || user.email?.split('@')[0] || '匿名玩家',
                likes: [],
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            };

            if (replyTo) {
                commentData.replyToId = replyTo.id;
                commentData.replyToName = replyTo.name;
                commentData.replyToUid = replyTo.uid;
            }

            await window.db.collection('fastQA').doc(activeQA.id).collection('comments').add(commentData);
            
            // 🔔 發送通知給出題者 (如果不是自己，且不是回覆出題者本人)
            if (activeQA.creatorUid && activeQA.creatorUid !== user.uid && (!replyTo || replyTo.uid !== activeQA.creatorUid)) {
                window.db.collection('users').doc(activeQA.creatorUid).collection('mailbox').add({
                    title: '試題討論區新留言',
                    content: `玩家 ${user.displayName || '匿名'} 在您的快問快答留言：\n\n${newComment}`,
                    isRead: false,
                    rewardDiamonds: 0,
                    isClaimed: false,
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // 🔔 發送通知給被回覆者 (如果是回覆別人，且不是回覆自己)
            if (replyTo && replyTo.uid && replyTo.uid !== user.uid) {
                window.db.collection('users').doc(replyTo.uid).collection('mailbox').add({
                    title: '討論區回覆通知',
                    content: `玩家 ${user.displayName || '匿名'} 在快問快答回覆了您：\n\n${newComment}`,
                    isRead: false,
                    rewardDiamonds: 0,
                    isClaimed: false,
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            setNewComment('');
            setReplyTo(null);
        } catch (e) {
            showAlert("留言發布失敗：" + e.message);
        }
    };

    // ✨ 新增：處理留言按讚
    const handleLikeComment = async (commentId, currentLikes) => {
        if (!user) return showAlert("請先登入才能按讚！");
        const hasLiked = currentLikes.includes(user.uid);
        const newLikes = hasLiked ? currentLikes.filter(uid => uid !== user.uid) : [...currentLikes, user.uid];
        try {
            await window.db.collection('fastQA').doc(activeQA.id).collection('comments').doc(commentId).update({
                likes: newLikes
            });
        } catch (e) {
            console.error("按讚失敗", e);
        }
    };

    // ✨ 新增：送出回饋 (修復原本 window.showPrompt 找不到的 Bug)
    const handleSendFeedback = async () => {
        if (!feedbackText.trim() || !user || !activeQA.creatorUid) return;
        try {
            await window.db.collection('users').doc(activeQA.creatorUid).collection('mailbox').add({
                title: '試題回饋與揪錯通知',
                content: `玩家 ${user.displayName || '匿名'} 對您的快問快答「${activeQA.question.replace(/<[^>]+>/g, '').substring(0,15)}...」發送了回饋：\n\n${feedbackText}`,
                isRead: false,
                rewardDiamonds: 0,
                isClaimed: false,
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
            setShowFeedbackModal(false);
            setFeedbackText('');
            showAlert("回饋已成功發送給作者！");
        } catch (e) {
            showAlert("回饋發送失敗：" + e.message);
        }
    };

    const handleAddQA = async () => {
        if (!question || !explanation || (isAdmin && customReward < 1)) return showAlert('請填寫完整題目與詳解！');
        
        let finalOptions = options;
        if (qaType === 'tf') finalOptions = ['(是) True', '(否) False'];
        if (qaType === 'mcq' && finalOptions.some(o => !o.trim())) return showAlert('選擇題請填寫完整的4個選項！');

        setIsPublishing(true);
        try {
            let userDocRef = null;
            let mcData = {};
            let publishData = { date: '', count: 0 };
            const today = new Date().toISOString().split('T')[0];

            if (!isAdmin) {
                const myActiveQAs = qaList.filter(q => q.creatorUid === user.uid);
                if (myActiveQAs.length >= 10) {
                    setIsPublishing(false);
                    return showAlert('最多只能同時擁有 10 個有效的快問快答喔！\n請等舊題目過期，或手動刪除後再試。');
                }

                // ✨ 檢查一日發布 5 次的限制
                userDocRef = window.db.collection('users').doc(user.uid);
                const docSnap = await userDocRef.get();
                if (docSnap.exists) {
                    mcData = docSnap.data().mcData || {};
                    publishData = mcData.fastQAPublishData || { date: '', count: 0 };
                    if (publishData.date !== today) {
                        publishData = { date: today, count: 0 };
                    }
                }
                
                if (publishData.count >= 5) {
                    setIsPublishing(false);
                    return showAlert(`您今日的發布次數已達上限 (5次)，請明天再來！\n\n(目前有效題目：${myActiveQAs.length}/10 題)`);
                }
            }

            const now = new Date();
            const endTimestamp = isAdmin ? (endTimeStr ? new Date(endTimeStr).getTime() : null) : (now.getTime() + 72 * 60 * 60 * 1000);
            
            const newQaRef = await window.db.collection('fastQA').add({
                qaType,
                subject: subject || '綜合', 
                difficulty: isAdmin ? customDifficulty : '玩家',
                reward: isAdmin ? Number(customReward) : 20,
                endTime: endTimestamp,
                question,
                options: finalOptions,
                correctAns,
                explanation,
                totalAnswers: 0,
                answersCount: qaType === 'tf' ? { '0': 0, '1': 0 } : { '0': 0, '1': 0, '2': 0, '3': 0 },
                creatorUid: user.uid,
                creatorName: user?.displayName || user?.email?.split('@')[0] || '匿名玩家',
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            // ✨ 新增：自動寄發信箱通知 (管理員全服通知，一般玩家通知好友)
            if (isAdmin) {
                const usersSnap = await window.db.collection('users').get();
                const batches = [];
                let currentBatch = window.db.batch();
                let count = 0;
                usersSnap.docs.forEach(doc => {
                    if (count >= 490) { batches.push(currentBatch); currentBatch = window.db.batch(); count = 0; }
                    const ref = window.db.collection('users').doc(doc.id).collection('mailbox').doc();
                    currentBatch.set(ref, {
                        title: '⚡ 官方快問快答上線！',
                        content: `管理員發布了新的快問快答「${subject || '綜合'}」，快到任務牆挑戰並獲取 ${customReward || 20} 鑽石吧！`,
                        linkType: 'qa', linkId: newQaRef.id,
                        rewardDiamonds: 0, isClaimed: false, isRead: false,
                        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                    count++;
                });
                batches.push(currentBatch);
                await Promise.all(batches.map(b => b.commit()));
            } else {
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                const friends = userDoc.data()?.friends || [];
                if (friends.length > 0) {
                    const batch = window.db.batch();
                    friends.forEach(f => {
                        const ref = window.db.collection('users').doc(f.uid).collection('mailbox').doc();
                        batch.set(ref, {
                            title: '⚡ 好友快問快答挑戰！',
                            content: `您的好友 ${user?.displayName || '匿名'} 發布了新的快問快答「${subject || '綜合'}」，趕快去任務牆挑戰他吧！`,
                            linkType: 'qa', linkId: newQaRef.id,
                            rewardDiamonds: 0, isClaimed: false, isRead: false,
                            createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                    await batch.commit();
                }
            }
            
            // ✨ 成功發布後更新次數與提示
            if (!isAdmin && typeof userDocRef !== 'undefined' && userDocRef) {
                publishData.count += 1;
                await userDocRef.set({ mcData: { ...mcData, fastQAPublishData: publishData } }, { merge: true });
                showAlert(`快問快答發布成功！(期限為三天)\n今日已發布：${publishData.count} / 5`);
            } else {
                showAlert('快問快答發布成功！');
            }
            
            setIsEditExpanded(false);
            setQuestion(''); setOptions(['', '', '', '']); setExplanation('');
        } catch (e) {
            showAlert('新增失敗：' + e.message);
        }
        setIsPublishing(false);
    };

    const handleDeleteQA = (id) => {
        showConfirm('確定要刪除這題嗎？', async () => {
            await window.db.collection('fastQA').doc(id).delete();
            if(activeQA && activeQA.id === id) setActiveQA(null);
        });
    };

  const handleAutoParse = () => {
        const tempText = question
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\u00A0/g, ' ')
            .replace(/<[^>]+>/g, '');
        
        const optA = tempText.match(/(?:\[A\]|(?:A|Ａ)[.、\s]+)([\s\S]*?)(?=(?:\[B\]|(?:B|Ｂ)[.、\s]+)|$)/i);
        const optB = tempText.match(/(?:\[B\]|(?:B|Ｂ)[.、\s]+)([\s\S]*?)(?=(?:\[C\]|(?:C|Ｃ)[.、\s]+)|$)/i);
        const optC = tempText.match(/(?:\[C\]|(?:C|Ｃ)[.、\s]+)([\s\S]*?)(?=(?:\[D\]|(?:D|Ｄ)[.、\s]+)|$)/i);
        const optD = tempText.match(/(?:\[D\]|(?:D|Ｄ)[.、\s]+)([\s\S]*?)$/i);

        if (optA || optB || optC || optD) {
            const newOptions = [...options];
            if (optA) newOptions[0] = optA[1].replace(/\n/g, '<br>').trim();
            if (optB) newOptions[1] = optB[1].replace(/\n/g, '<br>').trim();
            if (optC) newOptions[2] = optC[1].replace(/\n/g, '<br>').trim();
            if (optD) newOptions[3] = optD[1].replace(/\n/g, '<br>').trim();
            setOptions(newOptions);

            let newQHtml = question;
            const firstMatch = question.match(/(?:<[^>]+>)*\s*(?:\[A\]|(?:A|Ａ)[.、\s]+)/i);
            if (firstMatch) {
                newQHtml = question.substring(0, firstMatch.index).replace(/(?:&nbsp;|\s|<br\s*\/?>)+$/gi, '').trim();
            }
            setQuestion(newQHtml);
            showAlert("自動解析成功！已將選項分發，並將選項從題目中移除。");
        } else {
            showAlert("找不到 A, B, C, D 或 [A] 選項開頭，請確認題目格式。");
        }
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/?qaId=${activeQA.id}`;
        const plainQ = activeQA.question.replace(/<img[^>]*>/gi, '(圖片)').replace(/<[^>]+>/g, '').trim();
        const shortQ = plainQ.length > 25 ? plainQ.substring(0, 25) + '...' : plainQ;
        const text = `快問快答挑戰！\n【${activeQA.subject}】${activeQA.difficulty}\n獎勵：${activeQA.reward} 鑽石\n\n${shortQ}\n\n點此連結立即挑戰：\n${shareUrl}`;
        setShareContent(text);
        setShowShareModal(true); 
    };

    const handleSubmitAns = async () => {
        if (selectedAns === null) return showAlert('請選擇一個答案！');
        if (!user) return setShowResult(true);
        
        if (records[activeQA.id]) return showAlert('您已經作答過此題！');

        setSubmitting(true);
        const isCorrect = selectedAns === activeQA.correctAns;
        const isOwnQA = activeQA.creatorUid === user.uid;
        
        try {
            setShowResult(true);

            const recRef = window.db.collection('users').doc(user.uid).collection('fastQARecords').doc(activeQA.id);
            const qaRef = window.db.collection('fastQA').doc(activeQA.id);

            const tasks = [
                recRef.set({ 
                    isCorrect, 
                    selectedAns, 
                    answeredAt: window.firebase.firestore.FieldValue.serverTimestamp() 
                }),
                qaRef.update({
                    totalAnswers: window.firebase.firestore.FieldValue.increment(1),
                    [`answersCount.${selectedAns}`]: window.firebase.firestore.FieldValue.increment(1)
                })
            ];

            let rewardToMe = 0;
            
            if (isCorrect) {
                if (isOwnQA) {
                    rewardToMe = 0; 
                } else {
                    rewardToMe = Number(activeQA.reward) || 20;
                }

                if (rewardToMe > 0) {
                    tasks.push(window.db.runTransaction(async (t) => {
                        const userRef = window.db.collection('users').doc(user.uid);
                        const userDoc = await t.get(userRef);
                        if (!userDoc.exists) return;
                        
                        const today = new Date().toISOString().split('T')[0];
                        const mcData = userDoc.data().mcData || {};
                        let qaRewardData = mcData.qaRewardData || { date: today, amount: 0 };
                        
                        if (qaRewardData.date !== today) qaRewardData = { date: today, amount: 0 };
                        
                        let actualReward = rewardToMe;
                        if (!isAdmin && qaRewardData.amount + rewardToMe > 100) {
                            actualReward = Math.max(0, 100 - qaRewardData.amount);
                        }
                        
                        if (actualReward > 0) {
                            qaRewardData.amount += actualReward;
                            t.set(userRef, { mcData: { ...mcData, diamonds: (mcData.diamonds || 0) + actualReward, qaRewardData } }, { merge: true });
                            rewardToMe = actualReward; 
                        } else {
                            rewardToMe = 0;
                        }
                    }));
                }

                if (!isOwnQA && activeQA.creatorUid) {
                    tasks.push(window.db.collection('users').doc(activeQA.creatorUid).set({
                        mcData: { diamonds: window.firebase.firestore.FieldValue.increment(5) }
                    }, { merge: true }));
                    
                    const mailboxRef = window.db.collection('users').doc(activeQA.creatorUid).collection('mailbox').doc();
                    tasks.push(mailboxRef.set({
                        title: '快問快答收益！',
                        content: `有玩家答對了您的快問快答，您獲得了 5 顆鑽石！`,
                        isRead: false,
                        rewardDiamonds: 0,
                        isClaimed: false,
                        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    }));
                }
            }

            await Promise.all(tasks).catch(e => console.error("背景存檔同步中...", e));

            if (isCorrect) {
                if (isOwnQA) {
                    showAlert(`答對了！但這是您自己出的題目，沒有額外獎勵喔！`);
                } else if (rewardToMe > 0) {
                    showAlert(`答對了！獲得 ${rewardToMe} 鑽石！`);
                } else {
                    showAlert(`答對了！(您今日的快問快答獎勵已達 100 鑽石上限)`);
                }
            } else {
                showAlert('答錯了，請看詳解！');
            }

        } catch (e) {
            console.error(e);
            showAlert('提交失敗：' + e.message);
        }
        setSubmitting(false);
    };

    return (
        <div className={`border border-rose-200 bg-[#FCFBF7] dark:bg-stone-900 p-6 shadow-xl relative rounded-3xl w-full transition-all duration-300 ${targetQaId ? 'm-0' : 'mb-8 shrink-0'}`}>
           <div className={`flex justify-between items-center ${isFastQAExpanded ? 'mb-5 border-b border-rose-100 dark:border-stone-800 pb-4' : ''}`}>
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-black text-rose-700 dark:text-rose-400 flex items-center gap-1"><span className="material-symbols-outlined text-2xl">bolt</span> 快問快答挑戰</h2>
                    {!targetQaId && isFastQAExpanded && (
                        <button 
                            onClick={() => { 
                                setIsRefreshing(true); 
                                window.db.collection('fastQA').orderBy('createdAt', 'desc').limit(qaLimit).get()
                                    .then(() => setRefreshTrigger(prev => prev + 1))
                                    .catch(e => console.error(e))
                                    .finally(() => setIsRefreshing(false));
                            }}
                            disabled={isRefreshing}
                            className="text-xs bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-900/30 dark:hover:bg-pink-900/50 dark:text-pink-300 dark:border-pink-800 px-3 py-1.5 font-bold transition-all shadow-sm flex items-center gap-1 rounded-xl disabled:opacity-50"
                            title="同步最新題目"
                        >
                            {isRefreshing ? <div className="w-3 h-3 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-[16px]">sync</span>} 重新整理
                        </button>
                    )}
                </div>
                
                {!targetQaId && (
                    <div className="flex items-center gap-2">
                        {user && isFastQAExpanded && (
                            <button onClick={() => setShowAdminMode(!showAdminMode)} className={`${isAdmin ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700' : 'bg-rose-500 text-white hover:bg-rose-600'} text-xs px-4 py-2 font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1`}>
                                {showAdminMode ? '關閉發布面板' : (isAdmin ? '管理/發布試題' : '發布我的快問快答')}
                            </button>
                        )}
                        <button onClick={() => setIsFastQAExpanded(!isFastQAExpanded)} className="text-gray-400 hover:text-stone-600 dark:hover:text-gray-200 transition-colors w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                            <span className="material-symbols-outlined text-[24px]">{isFastQAExpanded ? 'expand_less' : 'expand_more'}</span>
                        </button>
                    </div>
                )}
            </div>

            {isFastQAExpanded && (
                <>
           {user && showAdminMode && !targetQaId && (
                <div className="mb-6 border border-rose-200 rounded-2xl bg-[#FCFBF7] dark:bg-stone-800 overflow-hidden shadow-lg">
                    <button onClick={() => setIsEditExpanded(!isEditExpanded)} className="w-full flex justify-between p-5 bg-rose-50 dark:bg-stone-700 hover:bg-rose-100 dark:hover:bg-stone-600 font-bold text-rose-800 dark:text-rose-200 transition-colors">
                        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px]">edit_square</span> 新增快問快答系統面板</span>
                        <span>{isEditExpanded ? '▼' : '▲'}</span>
                    </button>
                    {isEditExpanded && (
                        <div className="p-4 border-t border-stone-200 dark:border-stone-700 dark:text-gray-200">
                            
                            {/* ✨ 新增：發布額度進度條 (非管理員專屬) */}
                            {!isAdmin && (
                                <div className="mb-5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                    <span className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                                        我的發布額度 <span className="text-xs opacity-70">(同時最多10題)</span>
                                    </span>
                                    <div className="flex items-center gap-3 w-full sm:w-1/2">
                                        <div className="flex-1 bg-rose-200 dark:bg-stone-700 h-2.5 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-700 ease-out ${qaList.filter(q => q.creatorUid === user?.uid).length >= 10 ? 'bg-red-500' : 'bg-rose-500'}`} 
                                                style={{ width: `${Math.min((qaList.filter(q => q.creatorUid === user?.uid).length / 10) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className={`text-xs font-black shrink-0 ${qaList.filter(q => q.creatorUid === user?.uid).length >= 10 ? 'text-red-500' : 'text-rose-700 dark:text-rose-400'}`}>
                                            {qaList.filter(q => q.creatorUid === user?.uid).length} / 10
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div className="md:col-span-2 flex gap-4 bg-stone-50 rounded-xl p-2 dark:bg-gray-700">
                                    <label className="font-bold flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={qaType==='mcq'} onChange={()=>setQaType('mcq')} className="w-4 h-4" /> 選擇題
                                    </label>
                                    <label className="font-bold flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={qaType==='tf'} onChange={()=>setQaType('tf')} className="w-4 h-4" /> 是非題
                                    </label>
                                </div>
                                {/* ✨ 開放所有玩家選擇科目 */}
                                <div>
                                    <label className="block text-sm font-bold mb-1">科目</label>
                                    <select value={subjectMode} onChange={e => { setSubjectMode(e.target.value); if(e.target.value !== 'custom') setSubject(e.target.value); else setSubject(''); }} className="w-full border p-2 mb-2 dark:bg-stone-800 outline-none rounded-lg focus:border-rose-400">
                                        {['藥物分析', '生藥', '中藥', '藥理', '藥化', '藥劑', '生物藥劑', '綜合'].map(s => <option key={s} value={s}>{s}</option>)}
                                        <option value="custom">[自訂]</option>
                                    </select>
                                    {subjectMode === 'custom' && <input type="text" value={subject} onChange={e=>setSubject(e.target.value)} className="w-full border p-2 dark:bg-stone-800 outline-none rounded-lg focus:border-rose-400" placeholder="請輸入自訂科目" />}
                                </div>
                                {isAdmin && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold mb-1">難度標籤</label>
                                            <select value={difficultyMode} onChange={e => { setDifficultyMode(e.target.value); if(e.target.value !== 'custom') setCustomDifficulty(e.target.value); else setCustomDifficulty(''); }} className="w-full border p-2 mb-2 dark:bg-stone-800 outline-none rounded-lg focus:border-rose-400">
                                                {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} 級</option>)}
                                                <option value="custom">[自訂]</option>
                                            </select>
                                            {difficultyMode === 'custom' && <input type="text" value={customDifficulty} onChange={e=>setCustomDifficulty(e.target.value)} className="w-full border p-2 dark:bg-stone-800 outline-none rounded-lg focus:border-rose-400" placeholder="請輸入自訂難度" />}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold mb-1">獎勵鑽石數量</label>
                                            <select value={rewardMode} onChange={e => { setRewardMode(e.target.value); if(e.target.value !== 'custom') setCustomReward(Number(e.target.value)); else setCustomReward(''); }} className="w-full border p-2 mb-2 dark:bg-stone-800 outline-none rounded-lg focus:border-rose-400">
                                                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(n => <option key={n} value={n}>{n} 鑽石</option>)}
                                                <option value="custom">[自訂]</option>
                                            </select>
                                            {rewardMode === 'custom' && <input type="number" min="1" value={customReward} onChange={e=>setCustomReward(e.target.value)} className="w-full border p-2 dark:bg-stone-800 outline-none rounded-lg focus:border-rose-400" placeholder="請輸入鑽石數量" />}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold mb-1">結束時間</label>
                                            <select value={timePreset} onChange={e => {
                                                setTimePreset(e.target.value);
                                                if (e.target.value === 'custom' && !endTimeStr) {
                                                    const now = new Date();
                                                    const pad = (n) => n.toString().padStart(2, '0');
                                                    setEndTimeStr(`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
                                                }
                                            }} className="w-full border p-2 mb-2 dark:bg-stone-800 outline-none rounded-lg focus:border-rose-400 font-bold">
                                                <option value="permanent">永久公開</option>
                                                <option value="today">到今天結束 (23:59)</option>
                                                <option value="24h">24 小時後</option>
                                                <option value="48h">48 小時後</option>
                                                <option value="1w">一週後 (168小時)</option>
                                                <option value="custom">自訂時間</option>
                                            </select>
                                            {timePreset === 'custom' && (
                                                <input type="datetime-local" value={endTimeStr} onChange={e=>setEndTimeStr(e.target.value)} className="w-full border p-2 dark:bg-stone-800 outline-none rounded-lg focus:border-rose-400" />
                                            )}
                                        </div>
                                    </>
                                )}
                                <div className="md:col-span-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-bold">題目內容 (支援貼上圖片)</label>
                                        {qaType === 'mcq' && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setShowParseHelp(!showParseHelp)} className="text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-white flex items-center gap-1 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">help</span> 格式說明
                                                </button>
                                                <button onClick={handleAutoParse} className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-2 py-1 font-bold rounded shadow-sm border border-amber-300 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[16px]">smart_toy</span> 自動解析貼上選項
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* ✨ 內嵌的格式說明與一鍵複製面板 */}
                                    {showParseHelp && qaType === 'mcq' && (
                                        <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200 animate-fade-in shadow-inner">
                                            <div className="font-black mb-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[16px]">info</span> 自動解析格式支援
                                            </div>
                                            <p className="mb-2 text-xs leading-relaxed">
                                                系統會自動偵測 <strong>A.</strong>、<strong>B.</strong>、<strong>C.</strong>、<strong>D.</strong> 或 <strong>[A]</strong> 作為選項開頭。<br/>
                                                選項前方的所有文字會自動被保留為「題目內容」。
                                            </p>
                                            <div className="bg-white dark:bg-stone-800 border border-blue-100 dark:border-stone-700 p-2 rounded flex justify-between items-start gap-2 relative">
                                                <pre className="text-xs text-stone-600 dark:text-stone-300 font-mono whitespace-pre-wrap flex-grow leading-relaxed">
{`請將以下格式完整複製並替換內容：

這是題目的敘述內容，可以換行。
A. 第一個選項
B. 第二個選項
C. 第三個選項
D. 第四個選項`}
                                                </pre>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText("請將以下格式完整複製並替換內容：\n\n這是題目的敘述內容，可以換行。\nA. 第一個選項\nB. 第二個選項\nC. 第三個選項\nD. 第四個選項");
                                                        if (window.showAlert) window.showAlert("已複製格式模板！");
                                                    }} 
                                                    className="text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 px-2 py-1 rounded text-[10px] font-bold shrink-0 flex items-center gap-1 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">content_copy</span> 複製模板
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <ContentEditableEditor value={question} onChange={setQuestion} placeholder="在此輸入或貼上包含 A, B, C, D 的完整題目，再點擊上方「自動解析」..." showAlert={showAlert} />
                                </div>
                                
                                {qaType === 'mcq' ? options.map((opt, idx) => (
                                    <div key={idx} className="md:col-span-2 flex items-center gap-2">
                                        <input type="radio" checked={correctAns===idx} onChange={()=>setCorrectAns(idx)} className="w-5 h-5 accent-stone-600600" />
                                        <span className="font-bold text-sm shrink-0">設為解答</span>
                                        <input type="text" placeholder={`選項 ${idx+1}`} value={opt} onChange={e=>{const newO=[...options]; newO[idx]=e.target.value; setOptions(newO);}} className="flex-1 border p-2 dark:bg-stone-800" />
                                    </div>
                                )) : (
                                    <div className="md:col-span-2 flex gap-6 mt-2">
                                        <label className="font-bold flex items-center gap-2 cursor-pointer"><input type="radio" checked={correctAns===0} onChange={()=>setCorrectAns(0)} className="w-5 h-5 accent-stone-600600" /> 正確答案是「(是) True」</label>
                                        <label className="font-bold flex items-center gap-2 cursor-pointer"><input type="radio" checked={correctAns===1} onChange={()=>setCorrectAns(1)} className="w-5 h-5 accent-stone-600600" /> 正確答案是「(否) False」</label>
                                    </div>
                                )}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold mb-1">詳解 (支援貼上圖片與富文本)</label>
                                    <ContentEditableEditor value={explanation} onChange={setExplanation} placeholder="請輸入或貼上詳解..." showAlert={showAlert} />
                                </div>
                            </div>
                            <button 
                                onClick={handleAddQA} 
                                disabled={isPublishing || (!isAdmin && qaList.filter(q => q.creatorUid === user?.uid).length >= 10)} 
                                className="bg-stone-800 text-white font-bold py-3.5 px-6 rounded-2xl w-full hover:bg-stone-700 transition-all disabled:bg-gray-300 dark:disabled:bg-stone-700 disabled:text-gray-500 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-sm active:scale-[0.98]"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {(!isAdmin && qaList.filter(q => q.creatorUid === user?.uid).length >= 10) ? 'block' : 'publish'}
                                </span> 
                                {(!isAdmin && qaList.filter(q => q.creatorUid === user?.uid).length >= 10) ? '發布額度已滿' : '發布快問快答'}
                            </button>
                        </div>
                    )}
                </div>
            )}

           {!activeQA ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loading && qaList.length === 0 ? (
                            <div className="col-span-full py-12 text-center bg-[#FCFBF7]/50 border border-stone-600200">
                                <div className="w-10 h-10 border-4 border-stone-600200 border-t-stone-600500 rounded-full animate-spin mx-auto mb-3"></div>
                                <div className="text-stone-600600 font-bold animate-pulse">試題讀取中...</div>
                            </div>
                        ) : qaList.length === 0 ? (
                            <div className="text-stone-600500 font-bold col-span-full text-center py-6">目前沒有開放的快問快答，請晚點再來！</div> 
                        ) : (
                            qaList.map(qa => {
                                const rec = records[qa.id];
                                const isCompleted = !!rec; // 判斷是否已作答

                                return (
                                    <div key={qa.id} className={`p-4 border flex flex-col rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden ${isCompleted ? 'bg-gray-100 dark:bg-stone-900 border-gray-300 dark:border-stone-700 opacity-80' : 'bg-[#FCFBF7] dark:bg-stone-800 border-rose-200 dark:border-rose-900/50 hover:-translate-y-1'}`}>
                                        
                                        {/* ✨ 已作答的水印標籤 */}
                                        {isCompleted && (
                                            <div className="absolute top-2 right-2 flex items-center justify-center pointer-events-none">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${rec.isCorrect ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-300'}`}>
                                                    {rec.isCorrect ? 'COMPLETED' : 'FAILED'}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2.5 py-1 font-bold rounded-full shadow-sm border ${isCompleted ? 'bg-gray-200 text-gray-500 border-gray-300 dark:bg-stone-800 dark:text-gray-400 dark:border-stone-600' : 'bg-stone-100 dark:bg-stone-700 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-600'}`}>
                                                    {qa.subject}
                                                </span>
                                                {qa.creatorUid && (
                                                    <span className={`flex items-center gap-1 border px-1.5 py-0.5 rounded-full shadow-sm ${isCompleted ? 'bg-gray-200 text-gray-500 border-gray-300 dark:bg-stone-800 dark:text-gray-400 dark:border-stone-600' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-600'}`} title={`出題者：${qa.creatorName}`}>
                                                        <span className="text-[10px] font-bold max-w-[60px] truncate">{qa.creatorName}</span>
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* 未作答才顯示鑽石 (或顯示暗色) */}
                                            <span className={`font-bold text-sm flex items-center gap-1 ${isCompleted ? 'text-gray-400 dark:text-gray-500' : 'text-amber-600 dark:text-amber-400'}`}>
                                                <span className="material-symbols-outlined text-[16px]">diamond</span> {qa.reward}
                                            </span>
                                        </div>
                                        
                                        <p className={`text-sm mb-4 flex-1 line-clamp-3 font-medium ${isCompleted ? 'text-gray-500 dark:text-gray-400' : 'text-stone-800 dark:text-white'}`}>
                                            {qa.question.replace(/<img[^>]*>/gi, '(圖片)').replace(/<[^>]+>/g, '').trim()}
                                        </p>
                                        
                                        <div className={`flex items-center justify-between pt-3 border-t ${isCompleted ? 'border-gray-300 dark:border-stone-700' : 'border-stone-200 dark:border-stone-600'}`}>
                                            <span className={`font-bold text-sm flex items-center gap-1 ${!user ? 'text-gray-400' : rec ? (rec.isCorrect ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500 dark:text-red-400') : 'text-rose-500 dark:text-rose-400'}`}>
                                                {!user ? '訪客未登入' : rec ? (rec.isCorrect ? <><span className="material-symbols-outlined text-[16px]">check_circle</span>已答對</> : <><span className="material-symbols-outlined text-[16px]">cancel</span>答錯了</>) : <><span className="material-symbols-outlined text-[16px] animate-pulse">flash_on</span>尚未作答</>}
                                            </span>
                                            <div className="flex gap-2">
                                                {isAdmin && showAdminMode && (
                                                    <>
                                                        <button onClick={() => { navigator.clipboard.writeText(qa.id); showAlert(`已複製題目ID：${qa.id}`); }} className="text-amber-500 text-xs border border-amber-500 px-1 rounded hover:bg-amber-50 transition-colors">複製ID</button>
                                                        <button onClick={() => handleDeleteQA(qa.id)} className="text-red-500 text-xs border border-red-500 px-1 rounded hover:bg-red-50 transition-colors">刪除</button>
                                                    </>
                                                )}
                                                <button 
                                                    disabled={jumpingQaId === qa.id}
                                                    onClick={async () => { 
                                                        setJumpingQaId(qa.id);
                                                        try {
                                                            const docSnap = await window.db.collection('fastQA').doc(qa.id).get();
                                                            if (docSnap.exists) {
                                                                setActiveQA({ id: docSnap.id, ...docSnap.data() });
                                                            } else {
                                                                setActiveQA(qa);
                                                            }
                                                        } catch (e) {
                                                            console.warn(e);
                                                            setActiveQA(qa);
                                                        }
                                                        setSelectedAns(null); 
                                                        setShowResult(!!rec); 
                                                        setJumpingQaId(null);
                                                    }} 
                                                    className={`px-4 py-1.5 text-sm font-bold rounded-full flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-70 ${(user && rec) ? 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600 border border-stone-200 dark:border-stone-600' : 'bg-rose-500 text-white hover:bg-rose-600'}`}
                                                >
                                                    {jumpingQaId === qa.id ? <div className={`w-3.5 h-3.5 border-2 rounded-full animate-spin ${(user && rec) ? 'border-stone-400 border-t-transparent' : 'border-white border-t-transparent'}`}></div> : <span className="material-symbols-outlined text-[16px]">{(user && rec) ? 'visibility' : 'sports_esports'}</span>}
                                                    {(user && rec) ? '查看紀錄' : '立即挑戰'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    {!targetQaId && qaList.length >= qaLimit && (
                        <div className="flex justify-center mt-6">
                            <button 
                                onClick={() => setQaLimit(prev => prev + 5)} 
                                className="bg-[#FCFBF7] border-2 border-stone-200 dark:border-stone-700 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-6 py-2 rounded-xl font-bold shadow-sm hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[20px]">arrow_downward</span> 載入更早的題目...
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 border-2 border-stone-200 dark:border-stone-700 rounded-3xl animate-fade-in shadow-sm">
                    <div className="flex justify-between mb-4">
                        {!targetQaId ? <button onClick={() => { setActiveQA(null); if(onClose) onClose(); }} className="text-gray-500 font-bold hover:text-stone-800 dark:hover:text-white flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">arrow_back</span>返回列表</button> : <div></div>}
                        <button onClick={handleShare} className="text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 px-3 py-1.5 text-sm font-bold rounded-2xl flex items-center gap-1 transition-colors"><span className="material-symbols-outlined text-[18px]">share</span> 分享此題</button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-6 border-b pb-4 dark:border-stone-700 items-center">
                        <span className="bg-stone-100 dark:bg-stone-700 text-stone-800 dark:text-stone-200 text-sm px-3 py-1 font-bold rounded-full">{activeQA.subject}</span>
                        <span className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-gray-800 dark:text-gray-300 text-sm px-3 py-1 font-bold rounded-full">{activeQA.difficulty}</span>
                        {activeQA.creatorUid && (
                            <span className="flex items-center gap-1.5 ml-2 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 px-2 py-1 rounded-full shadow-sm">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{activeQA.creatorName}</span>
                            </span>
                        )}
                        <span className="text-amber-600 dark:text-amber-400 font-black text-lg ml-auto flex items-center gap-1"><span className="material-symbols-outlined text-[24px]">diamond</span> {activeQA.reward} 鑽石</span>
                    </div>
                    
<div className="text-lg font-bold mb-6 bg-white dark:bg-stone-800 text-stone-800 dark:text-white p-5 border border-gray-200 dark:border-stone-700 rounded-xl shadow-sm preview-rich-text" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml(activeQA.question) }}></div>
                    
                    <div className="space-y-3 mb-6">
                        {activeQA.options.map((opt, idx) => {
                            const isSelected = (selectedAns ?? records[activeQA.id]?.selectedAns) === idx;
                            const isCorrectOpt = activeQA.correctAns === idx;
                            
                            const actualTotal = activeQA.answersCount ? Object.values(activeQA.answersCount).reduce((sum, val) => sum + (Number(val) || 0), 0) : 0;
                            const total = actualTotal > 0 ? actualTotal : (activeQA.totalAnswers || 0);
                            const count = (activeQA.answersCount && activeQA.answersCount[idx]) || 0;
                            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                            
                            let btnClass = "w-full text-left p-4 border-2 font-bold transition-all relative z-0 flex justify-between items-center rounded-xl overflow-hidden ";
                            let barColor = "bg-gray-200 dark:bg-stone-700";
                            
                            if (showResult && user) {
                                if (isCorrectOpt) { btnClass += "bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100 border-[3px] scale-[1.01] shadow-sm "; barColor = "bg-emerald-400 dark:bg-emerald-600"; }
                                else if (isSelected) { btnClass += "bg-rose-50 border-rose-500 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100 border-[3px] scale-[1.01] shadow-sm "; barColor = "bg-rose-400 dark:bg-rose-600"; }
                                else { btnClass += "bg-gray-50 border-stone-200 text-gray-500 opacity-60 dark:bg-stone-800 dark:border-stone-700 "; }
                            } else {
                                btnClass += isSelected ? "border-rose-500 bg-rose-50 text-rose-900 shadow-lg scale-[1.02] border-[3px] dark:bg-rose-900/50 dark:text-rose-100 " : "border-gray-200 bg-white hover:bg-gray-50 dark:bg-stone-800 dark:border-stone-600 dark:text-white hover:border-rose-300 dark:hover:border-rose-500 ";
                            }

                            return (
                                <button key={idx} disabled={showResult || submitting} onClick={() => setSelectedAns(idx)} className={btnClass}>
                                    {showResult && user && <div className={`absolute left-0 top-0 bottom-0 opacity-40 dark:opacity-50 z-[-1] transition-all duration-1000 ${barColor}`} style={{ width: `${percent}%` }}></div>}
                                    <span><span className="mr-3 font-black opacity-60">{activeQA.qaType === 'tf' ? '' : ['A','B','C','D'][idx]+'.'}</span> {opt}</span>
                                    <div className="flex gap-3 items-center">
                                        {showResult && user && <span className="text-sm font-bold opacity-80 bg-white/50 dark:bg-black/30 px-2 py-0.5 rounded-lg">{percent}% ({count}人)</span>}
                                        {showResult && user && isCorrectOpt && <span className="material-symbols-outlined text-[22px] text-emerald-600 dark:text-emerald-400">check_circle</span>}
                                        {showResult && user && isSelected && !isCorrectOpt && <span className="material-symbols-outlined text-[22px] text-rose-500 dark:text-rose-400">cancel</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {!showResult ? (
                        <button onClick={handleSubmitAns} disabled={submitting} className="w-full bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 font-black py-4 text-lg rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-2">
                            {submitting ? <><div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></div> 處理中...</> : <><span className="material-symbols-outlined text-[24px]">send</span> 確認送出</>}
                        </button>
                    ) : (
                        <div className="mt-6 animate-fade-in">
                            {user ? (
                                <>
                                    <div className="p-5 bg-[#FCFBF7] dark:bg-stone-800 border border-amber-200 dark:border-stone-700 shadow-sm rounded-2xl">
                                        <h4 className="font-black mb-3 flex justify-between items-center pb-3 border-b border-amber-100 dark:border-stone-700">
                                            <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1"><span className="material-symbols-outlined text-[20px]">lightbulb</span> 解答與詳解</span>
                                            {activeQA.reward > 0 && <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-sm bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full"><span className="material-symbols-outlined text-[16px]">celebration</span> 快問快答結算</span>}
                                        </h4>
                                        <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap preview-rich-text leading-relaxed" dangerouslySetInnerHTML={{ __html: parseSmilesToHtml(activeQA.explanation) }}></div>
                                    </div>
                                    {activeQA.creatorUid && activeQA.creatorUid !== user?.uid && (
                                        <button onClick={() => setShowFeedbackModal(true)} className="mt-4 w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-bold py-3 rounded-2xl text-sm flex justify-center items-center gap-2 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors shadow-sm">
                                            <span className="material-symbols-outlined text-[18px]">feedback</span> 傳送試題回饋給作者
                                        </button>
                                    )}

                                    {/* ✨ 新增：討論區區塊 */}
                                    <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200 dark:border-stone-700">
                                        <h4 className="font-black mb-4 text-lg text-stone-800 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined text-indigo-500">forum</span> 討論區 ({comments.length})
                                        </h4>
                                        
                                        {/* 留言列表 */}
                                        <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                            {comments.length === 0 ? (
                                                <p className="text-center text-gray-400 dark:text-gray-500 font-bold py-4">目前還沒有留言，來搶頭香吧！</p>
                                            ) : (
                                                comments.map(c => (
                                                    <div key={c.id} className="bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4 rounded-2xl shadow-sm">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-sm text-stone-800 dark:text-gray-200">{c.creatorName}</span>
                                                                {c.creatorUid === activeQA.creatorUid && <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-bold">作者</span>}
                                                            </div>
                                                            <span className="text-xs text-gray-400">{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString('zh-TW', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '剛剛'}</span>
                                                        </div>
                                                        {c.replyToName && (
                                                            <div className="text-xs bg-gray-50 dark:bg-stone-700/50 text-gray-500 dark:text-gray-400 p-1.5 rounded mb-2 inline-block border border-gray-100 dark:border-stone-600">
                                                                回覆 @{c.replyToName}
                                                            </div>
                                                        )}
                                                        <p className="text-sm text-stone-700 dark:text-gray-300 whitespace-pre-wrap">{c.text}</p>
                                                        <div className="flex justify-end gap-4 mt-2">
                                                            <button onClick={() => setReplyTo({ id: c.id, name: c.creatorName, uid: c.creatorUid })} className="text-xs text-gray-500 hover:text-indigo-500 font-bold flex items-center gap-1 transition-colors">
                                                                <span className="material-symbols-outlined text-[14px]">reply</span> 回覆
                                                            </button>
                                                            <button onClick={() => handleLikeComment(c.id, c.likes || [])} className={`text-xs font-bold flex items-center gap-1 transition-colors ${(c.likes || []).includes(user?.uid) ? 'text-rose-500' : 'text-gray-500 hover:text-rose-500'}`}>
                                                                <span className="material-symbols-outlined text-[14px]">{(c.likes || []).includes(user?.uid) ? 'favorite' : 'favorite_border'}</span> {(c.likes || []).length > 0 ? (c.likes || []).length : '讚'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* 發布留言輸入框 */}
                                        <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 p-3 rounded-2xl">
                                            {replyTo && (
                                                <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs px-3 py-1.5 rounded-lg mb-2 font-bold">
                                                    <span>正在回覆 @{replyTo.name}</span>
                                                    <button onClick={() => setReplyTo(null)} className="hover:text-indigo-900 dark:hover:text-white"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <textarea 
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    placeholder="分享你的解題思路或疑問..."
                                                    className="flex-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm outline-none resize-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors dark:text-white min-h-[44px]"
                                                    rows="1"
                                                />
                                                <button onClick={handlePostComment} disabled={!newComment.trim()} className="bg-indigo-500 text-white px-4 rounded-xl font-bold hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 bg-stone-50 dark:bg-stone-800 border-2 border-dashed border-gray-300 dark:border-stone-600 text-center rounded-2xl">
                                    <span className="material-symbols-outlined text-4xl text-stone-400 mb-2">lock</span>
                                    <h3 className="text-xl font-black mb-4 dark:text-white">答案已上鎖</h3>
                                    <button onClick={() => { if(onRequireLogin) onRequireLogin(); }} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 px-8 py-3 rounded-xl font-black text-lg w-full flex justify-center items-center gap-2 shadow-md hover:scale-[1.02] transition-transform">
                                        <span className="material-symbols-outlined text-[20px]">login</span> 登入解鎖完整解答與鑽石
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            </>
            )}

            {/* ✨ 新增：回饋作者專用的 Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 w-full max-w-md rounded-3xl shadow-2xl animate-fade-in border border-stone-200 dark:border-stone-700">
                        <h3 className="font-black text-stone-800 dark:text-white mb-4 flex justify-between items-center text-lg border-b border-stone-200 dark:border-stone-700 pb-3">
                            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[22px] text-amber-500">rate_review</span> 回饋作者或揪錯</span>
                            <button onClick={() => setShowFeedbackModal(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-white transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-bold">作者將會收到您的訊息與通知，如果有發現題目錯誤或有建議，請在這裡告訴作者！</p>
                        <textarea 
                            value={feedbackText} 
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="例如：題目敘述有誤，答案應該是..."
                            className="w-full h-32 p-4 text-sm border-2 border-stone-200 dark:border-stone-600 rounded-xl mb-4 outline-none resize-none bg-white dark:bg-stone-900 text-stone-700 dark:text-gray-300 focus:border-amber-400 transition-colors" 
                            autoFocus
                        />
                        <button onClick={handleSendFeedback} disabled={!feedbackText.trim()} className="w-full bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 font-black py-3 rounded-xl text-base transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            <span className="material-symbols-outlined text-[20px]">send</span> 確定送出
                        </button>
                    </div>
                </div>
            )}

            {showShareModal && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-6 w-full max-w-sm rounded-3xl shadow-2xl animate-fade-in border border-stone-200 dark:border-stone-700">
                        <h3 className="font-black text-stone-800 dark:text-white mb-4 flex justify-between items-center text-lg">
                            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[22px]">share</span> 分享此題</span>
                            <button onClick={() => setShowShareModal(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-white transition-colors bg-stone-100 dark:bg-stone-700 rounded-full w-8 h-8 flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">close</span></button>
                        </h3>
                        <textarea readOnly value={shareContent} className="w-full h-40 p-4 text-sm border border-stone-200 dark:border-stone-600 rounded-xl mb-4 outline-none resize-none bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-gray-300 font-mono leading-relaxed" onClick={e => e.target.select()} />
                        <button onClick={() => { navigator.clipboard.writeText(shareContent); showAlert('已複製！快去貼給朋友吧！'); setShowShareModal(false); }} className="w-full bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 font-black py-3 rounded-xl text-base transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">content_copy</span> 複製邀請文本
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function TaskWallDashboard({ user, showAlert, showConfirm, onContinueQuiz }) {
    const isAdmin = user && user.email === 'jay03wn@gmail.com'; // ✨ 新增：判斷管理員
    const [isJumping, setIsJumping] = useState(false); // ✨ 新增：跳轉載入狀態
  const [tasks, setTasks] = useState({});
  const [officialTasks, setOfficialTasks] = useState({});
  const [myTasks, setMyTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [taskLimit, setTaskLimit] = useState(5); // ✨ 新增：任務牆動態載入數量的狀態
 
  // ✨ 新增搜尋狀態
  const [searchQuery, setSearchQuery] = useState('');

    // ✨ 新增：管理員從任務牆直接建立試卷
    const handleAdminCreateTask = (type) => {
        onContinueQuiz({
            forceStep: 'setup',
            taskType: type,
            folder: '[公開試題管理]',
            testName: type === 'official' ? '新增國考題 [#op]' : '新增模擬試題 [#mnst]',
            numQuestions: 50,
            maxScore: 100,
            allowPeek: false, // 規定不能偷看答案
            publishAnswers: true,
        });
    };

    // ✨ 新增：管理員從任務牆直接編輯試卷
    const handleAdminEditTask = async (task) => {
        setIsJumping(true);
        try {
            const docSnap = await window.db.collection('users').doc(user.uid).collection('quizzes').doc(task.id).get();
            if (!docSnap.exists) {
                setIsJumping(false);
                return showAlert("找不到原始試卷，可能已刪除或您不是出題者！");
            }
            let finalRec = { id: docSnap.id, ...docSnap.data() };
            
            if (finalRec.hasSeparatedContent) {
                const contentSnap = await window.db.collection('users').doc(user.uid).collection('quizContents').doc(task.id).get();
                if (contentSnap.exists) {
                    const contentData = contentSnap.data();
                    finalRec.questionText = window.safeDecompress(contentData.questionText);
                    finalRec.questionHtml = window.safeDecompress(contentData.questionHtml);
                    finalRec.explanationHtml = window.safeDecompress(contentData.explanationHtml);
                }
            }
            
            setIsJumping(false);
            onContinueQuiz({ ...finalRec, forceStep: 'edit' });
        } catch (e) {
            setIsJumping(false);
            showAlert("讀取失敗：" + e.message);
        }
    };

  const normalCategories = [
        '1. 藥物分析學', '2. 生藥學', '3. 中藥學', 
        '4. 藥物化學與藥理學', '5. 藥劑學', '6. 生物藥劑學', '模擬試題 (其他)'
    ];
    
    const opCategories = [
        '1. 藥理學與藥物化學', '2. 藥物分析學與生藥學(含中藥學)', '3. 藥劑學與生物藥劑學', '國考題 (其他)'
    ];

    useEffect(() => {
        // 🚀 移除 800ms 提早結束的 Bug，讓系統乖乖等雲端資料下載完

        const unsubTasks = window.db.collection('publicTasks')
            .orderBy('createdAt', 'desc')
            .limit(taskLimit) // ✨ 改吃我們設定的動態變數
            .onSnapshot({ includeMetadataChanges: true }, snap => {
                // ✨ 新用戶防護：快取沒資料時繼續轉圈圈，等雲端
                if (snap.empty && snap.metadata.fromCache) return;
                
                const groupedNormal = normalCategories.reduce((acc, cat) => ({ ...acc, [cat]: [] }), {});
                const groupedOfficial = opCategories.reduce((acc, cat) => ({ ...acc, [cat]: [] }), {});
                
                snap.docs.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() };
                    
                    // ✨ 提速優化：列表頁根本不需要顯示幾萬字的題目內文，直接砍掉這裡的解壓縮，節省 90% CPU 運算時間！
                    
                    if (data.testName && /\[#op\]/i.test(data.testName)) {
                        let cat = data.category || '國考題 (其他)';
                        if (!opCategories.includes(cat)) {
                            if (data.testName.includes('藥理') || data.testName.includes('藥物化學')) cat = '1. 藥理學與藥物化學';
                            else if (data.testName.includes('藥物分析') || data.testName.includes('生藥') || data.testName.includes('中藥')) cat = '2. 藥物分析學與生藥學(含中藥學)';
                            else if (data.testName.includes('藥劑') || data.testName.includes('生物藥劑')) cat = '3. 藥劑學與生物藥劑學';
                            else cat = '國考題 (其他)';
                        }
                        if (groupedOfficial[cat] && groupedOfficial[cat].length < 10) groupedOfficial[cat].push(data);
                    } else if (data.testName && /\[#(m?nm?st)\]/i.test(data.testName)) {
                        const cat = data.category || '模擬試題 (其他)';
                        if (groupedNormal[cat] && groupedNormal[cat].length < 5) groupedNormal[cat].push(data);
                    } else {
                        const cat = data.category || '模擬試題 (其他)';
                        if (groupedNormal[cat] && groupedNormal[cat].length < 5) groupedNormal[cat].push(data);
                    }
                });
                
                setTasks(groupedNormal);
                setOfficialTasks(groupedOfficial);
                setLoading(false); // 雲端資料來了，才准關掉載入動畫！
            }, err => {
                console.error(err);
                setLoading(false);
            });

        // 🚀 將 limit(30) 降為 limit(15)，因為舊版試卷夾帶了幾 MB 的垃圾資料，新用戶一次抓 30 份會等太久！
        const unsubMyQuizzes = window.db.collection('users').doc(user.uid).collection('quizzes')
            .orderBy('createdAt', 'desc')
            .limit(15)
            .onSnapshot({ includeMetadataChanges: true }, snap => {
                if (snap.empty && snap.metadata.fromCache) return; // ✨ 擋掉空快取防閃爍
                const myTaskMap = {};
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.taskId) {
                        // 🚀 核心升級：免除不必要的解壓縮
                        if (typeof data.userAnswers === 'string') data.userAnswers = safeDecompress(data.userAnswers, 'array');
                        if (typeof data.results === 'string') data.results = safeDecompress(data.results, 'object');
                        myTaskMap[data.taskId] = { id: doc.id, ...data };
                    }
                });

                // 第二階段：出題者本人的原始考卷具有最高優先權，將覆蓋任何空白的任務副本
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (!data.isShared && !data.isTask) {
                        // 🚀 核心升級：免除不必要的解壓縮
                        if (typeof data.userAnswers === 'string') data.userAnswers = safeDecompress(data.userAnswers, 'array');
                        if (typeof data.results === 'string') data.results = safeDecompress(data.results, 'object');
                        // 若是出題者本人自己的考卷，任務ID 就是該考卷的 doc.id
                        // 在此注入 isTask 與 taskId 以便讓後續 UI 可以判斷為任務模式 (如開放討論區)
                        myTaskMap[doc.id] = { id: doc.id, ...data, isTask: true, taskId: doc.id };
                    }
                });
                setMyTasks(myTaskMap);
            });
            
        return () => {
            unsubTasks();
            unsubMyQuizzes();
        };
    }, [user.uid, taskLimit]); // ✨ 將 taskLimit 加入依賴項，當按鈕按下去時就會重新抓資料

    // 計算國考題能力分析
    const officialStats = { totalScore: 0, count: 0, categories: {} };
    opCategories.forEach(c => officialStats.categories[c] = { score: 0, count: 0 });

    Object.values(myTasks).forEach(localRec => {
        if (localRec.testName && localRec.testName.includes('[#op]') && localRec.results) {
            let cat = localRec.category;
            if (!cat || !opCategories.includes(cat)) {
                if (localRec.testName.includes('藥理') || localRec.testName.includes('藥物化學')) cat = '1. 藥理學與藥物化學';
                else if (localRec.testName.includes('藥物分析') || localRec.testName.includes('生藥') || localRec.testName.includes('中藥')) cat = '2. 藥物分析學與生藥學(含中藥學)';
                else if (localRec.testName.includes('藥劑') || localRec.testName.includes('生物藥劑')) cat = '3. 藥劑學與生物藥劑學';
                else cat = '國考題 (其他)';
            }
            if (officialStats.categories[cat]) {
                officialStats.totalScore += localRec.results.score;
                officialStats.count += 1;
                officialStats.categories[cat].score += localRec.results.score;
                officialStats.categories[cat].count += 1;
            }
        }
    });

    const overallAvg = officialStats.count > 0 ? Math.round(officialStats.totalScore / officialStats.count) : 0;

    const handlePlayTask = async (task, localRec) => {
        const executeEnter = async () => {
            if (localRec) {
                // ✨ 強制同步：比對雲端最新任務與本地快取，這次加入了最重要的 correctAnswersInput
                const isAnsChanged = task.correctAnswersInput && task.correctAnswersInput !== localRec.correctAnswersInput;
                
                const updatedRec = {
                    ...localRec,
                    testName: task.testName || localRec.testName,
                    questionHtml: task.questionHtml || localRec.questionHtml || '',
                    questionText: task.questionText || localRec.questionText || '',
                    explanationHtml: task.explanationHtml || localRec.explanationHtml || '',
                    correctAnswersInput: task.correctAnswersInput || localRec.correctAnswersInput || ''
                };
                
                const payload = {
                    testName: updatedRec.testName,
                    questionHtml: updatedRec.questionHtml,
                    questionText: updatedRec.questionText,
                    explanationHtml: updatedRec.explanationHtml,
                    correctAnswersInput: updatedRec.correctAnswersInput
                };

                // 如果答案有變，且玩家已經交過卷，就自動標記有答案更新
                if (isAnsChanged && localRec.results) {
                    payload.hasAnswerUpdate = true;
                    updatedRec.hasAnswerUpdate = true;
                }

                // 背景靜默更新回本地資料庫
                window.db.collection('users').doc(user.uid).collection('quizzes').doc(localRec.id).update(payload)
                    .catch(e => console.error("同步任務資料失敗", e));

                onContinueQuiz(updatedRec);
                return;
            }

            try {
                const emptyAnswers = Array(Number(task.numQuestions)).fill('');
                const emptyStarred = Array(Number(task.numQuestions)).fill(false);

                // ✨ 延遲載入大改造 3：任務牆參加任務時，也要把輕重資料切開
                const newDocRef = await window.db.collection('users').doc(user.uid).collection('quizzes').add({
                    testName: task.testName,
                    numQuestions: task.numQuestions,
                    questionFileUrl: task.questionFileUrl || '',
                    // 🚀 移除笨重內容，保持清單輕量！
                    correctAnswersInput: task.correctAnswersInput || '',
                    publishAnswers: task.publishAnswers !== false,
                    userAnswers: emptyAnswers,
                    starred: emptyStarred,
                    hasTimer: task.hasTimer || false,
                    timeLimit: task.timeLimit || null,
                    timeRemaining: task.hasTimer ? (task.timeLimit * 60) : null,
                    isTask: true,
                    taskId: task.id,
                    creatorUid: task.creatorUid || '', 
                    creatorQuizId: task.id,
                    folder: '任務牆',
                    hasSeparatedContent: true, // ✨ 標記為已分離
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });

                // ✨ 單獨存入笨重內容
                await window.db.collection('users').doc(user.uid).collection('quizContents').doc(newDocRef.id).set({
                    questionText: task.questionText || '',
                    questionHtml: task.questionHtml || '',
                    explanationHtml: task.explanationHtml || ''
                });

                const newRec = await newDocRef.get();
                // ✨ 把剛才切出去的內容手動塞回畫面，達到秒開效果
                onContinueQuiz({ id: newRec.id, ...newRec.data(), questionText: task.questionText, questionHtml: task.questionHtml, explanationHtml: task.explanationHtml });
                
            } catch (e) {
                showAlert('啟動任務失敗：' + e.message);
            }
        };

        if (task.hasTimer && (!localRec || !localRec.results)) {
            const isNew = !localRec || !localRec.userAnswers || localRec.userAnswers.filter(a => a !== '').length === 0;
            if (isNew) {
                showConfirm(`⏱ 此任務設有時間限制（${task.timeLimit} 分鐘）。\n\n點擊「確定」後將進入並開始倒數計時，準備好了嗎？`, () => {
                    executeEnter();
                });
            } else {
                executeEnter();
            }
        } else {
            executeEnter();
        }
    };

    // 判斷搜尋後是否有資料，用來隱藏空區塊
    const hasAnyOfficial = opCategories.some(cat => officialTasks[cat] && officialTasks[cat].some(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())));
    const hasAnyNormal = normalCategories.slice(0, 6).some(cat => tasks[cat] && tasks[cat].some(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())));
    const otherTasksFiltered = tasks['模擬試題 (其他)'] ? tasks['模擬試題 (其他)'].filter(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())) : [];

    return (
        <div className="max-w-[1600px] w-full mx-auto p-4 pt-0 h-full overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-6 border-b-2 border-black dark:border-white pb-2 shrink-0">
        <h1 className="text-2xl font-black dark:text-white flex items-center">
          🎯 公開任務牆
        </h1>
                <div className="flex items-center gap-3">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 hidden sm:block">完成考驗獲取獎勵鑽石！</p>
                    {isAdmin && (
                        <div className="flex gap-2">
                            <button onClick={() => handleAdminCreateTask('official')} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl font-bold text-sm flex items-center gap-1 shadow-sm transition-colors">
                                <span className="material-symbols-outlined text-[18px]">add</span> 新增國考題
                            </button>
                            <button onClick={() => handleAdminCreateTask('mock')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-bold text-sm flex items-center gap-1 shadow-sm transition-colors">
                                <span className="material-symbols-outlined text-[18px]">add</span> 新增模擬題
                            </button>
                        </div>
                    )}
                </div>
      </div>

      {/* ✨ 新增：快問快答區塊 (放在最頂端) */}
            <FastQASection user={user} showAlert={showAlert} showConfirm={showConfirm} />

            {/* ✨ 新增：搜尋任務列 */}
            <div className="mb-6 flex items-center bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-3 shadow-sm rounded-2xl shrink-0">
                <span className="text-gray-500 mr-3 text-lg">🔍</span>
                <input
                    type="text"
                    placeholder="搜尋任務或試題名稱..."
                    className="flex-grow outline-none bg-transparent text-stone-800 dark:text-white text-sm font-bold min-w-0"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-stone-800 dark:hover:text-white ml-2 font-bold px-2">✖</button>
                )}
            </div>

           {loading && Object.keys(tasks).length === 0 && Object.keys(officialTasks).length === 0 ? (
                <LoadingSpinner text="正在載入公開任務..." />
            ) : (
                <div className="space-y-8 pb-10">
                    
                    {/* ✨ 加入左右排版容器：lg:grid-cols-2 讓大螢幕分兩欄，手機版自動單欄 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 lg:gap-8 items-start">

                        {/* --- 金色專屬：歷屆國考題 --- */}
                        {hasAnyOfficial && (
                            <div className="bg-gradient-to-br from-amber-50 to-white dark:from-gray-800 dark:to-gray-900 border border-amber-400 dark:border-amber-600 shadow-md rounded-2xl p-5 md:p-6 w-full">
                                <h2 className="text-2xl font-black mb-4 dark:text-white border-b-2 border-amber-400 dark:border-amber-600 pb-2 text-amber-700 dark:text-amber-400 flex items-center">
                                🏆 歷屆國考題
                            </h2>
                            
                            {/* 國考能力分析圖表 (搜尋時隱藏以節省空間) */}
                            {!searchQuery && officialStats.count > 0 && (
                                <div className="mb-6 bg-[#FCFBF7] dark:bg-stone-800 p-4 border border-amber-200 dark:border-amber-700 shadow-sm">
                                    <h3 className="font-bold text-amber-600 dark:text-amber-400 mb-3">📊 國考能力分析 (平均分數)</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center text-sm font-bold">
                                            <span className="w-1/3 text-gray-600 dark:text-gray-300">總平均 ({officialStats.count}次)</span>
                                            <div className="w-2/3 bg-stone-100 dark:bg-gray-700 h-4 relative">
                                                <div className="bg-amber-400 h-4 transition-all duration-500" style={{ width: `${overallAvg}%` }}></div>
                                                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-stone-800 drop-shadow-md">{overallAvg} 分</span>
                                            </div>
                                        </div>
                                        {opCategories.map(cat => {
                                            const stat = officialStats.categories[cat];
                                            const avg = stat.count > 0 ? Math.round(stat.score / stat.count) : 0;
                                            if (stat.count === 0) return null;
                                            return (
                                                <div key={cat} className="flex items-center text-xs font-bold">
                                                    <span className="w-1/3 text-gray-500 dark:text-gray-400 truncate pr-2" title={cat}>{cat.replace(/^[0-9]\.\s*/, '')}</span>
                                                    <div className="w-2/3 bg-stone-100 dark:bg-gray-700 h-3 relative">
                                                        <div className="bg-amber-400 h-3 transition-all duration-500" style={{ width: `${avg}%` }}></div>
                                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-stone-800 drop-shadow-md">{avg} 分</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-8">
                                {opCategories.map(cat => {
                                    const filteredOpTasks = officialTasks[cat] ? officialTasks[cat].filter(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())) : [];
                                    if (filteredOpTasks.length === 0) return null;
                                    
                                    return (
                                        <div key={cat} className="pl-4 border-l-4 border-amber-400 dark:border-amber-600">
                                            <h3 className="text-lg font-bold mb-4 dark:text-gray-200 text-gray-700">{cat}</h3>
                                            <div className="flex flex-col gap-2">
                                                {filteredOpTasks.map(task => {
                                                    const localRec = myTasks[task.id];
                                                    const isCompleted = localRec && localRec.results;
                                                    const inProgress = localRec && !localRec.results && Array.isArray(localRec.userAnswers) && localRec.userAnswers.filter(a => a).length > 0;

                                                    return (
                                                        <div key={task.id} className="border border-amber-200 dark:border-amber-700 p-3 bg-[#FCFBF7] dark:bg-stone-800 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:shadow-md transition-shadow rounded-2xl">
                                                            <div className="flex flex-col gap-1 min-w-0 flex-grow">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-sm break-words whitespace-normal leading-relaxed dark:text-white" title={cleanQuizName(task.testName)}>
                                                              {renderTestName(task.testName, isCompleted)}
                                                            </h3>
                                                            {isAdmin && (
                                                                <button onClick={() => handleAdminEditTask(task)} className="text-xs bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600 px-2 py-0.5 rounded flex items-center transition-colors shadow-sm active:scale-95 shrink-0">
                                                                    <span className="material-symbols-outlined text-[14px] mr-1">edit</span> 編輯
                                                                </button>
                                                            )}
                                                        </div>
                                                                <div className="flex items-center gap-3 text-xs shrink-0 mt-1">
                                                                    <span className="text-gray-500 dark:text-gray-400">{task.numQuestions}題</span>
                                                                    {task.hasTimer && <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 border border-red-200 dark:border-red-700">⏱ {task.timeLimit}m</span>}
                                                                    {isCompleted ? (
                                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✅ {localRec.results.score} 分</span>
                                                                    ) : inProgress ? (
                                                                        <span className="text-amber-500 dark:text-amber-400 font-bold">📝 已填: {localRec.userAnswers.filter(a => a).length}</span>
                                                                    ) : (
                                                                        <span className="text-gray-400 font-bold">⏳ 未作答</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handlePlayTask(task, localRec)} 
                                                                className={`py-1.5 px-4 rounded-2xl font-bold text-xs transition-colors shrink-0 w-full sm:w-auto mt-2 sm:mt-0 ${isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' : 'bg-amber-500 text-stone-800 hover:bg-amber-600'}`}
                                                            >
                                                                {isCompleted ? '📊 查看成績與討論' : (inProgress ? '📝 繼續作答' : '⚔️ 開始')}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* --- 一般：模擬試題 --- */}
                    {hasAnyNormal && (
                        <div className="bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm rounded-2xl p-5 md:p-6 w-full">
                            <h2 className="text-2xl font-black mb-6 dark:text-white border-b-2 border-indigo-200 dark:border-indigo-900 pb-2 text-indigo-700 dark:text-indigo-400 flex items-center">
                                📚 模擬試題
                            </h2>
                            
                            <div className="space-y-8">
                                {normalCategories.slice(0, 6).map(cat => {
                                    const filteredTasks = tasks[cat] ? tasks[cat].filter(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())) : [];
                                    if (filteredTasks.length === 0) return null;

                                    return (
                                        <div key={cat} className="pl-4 border-l-4 border-indigo-300 dark:border-indigo-600">
                                            <h3 className="text-lg font-bold mb-4 dark:text-gray-200 text-gray-700">{cat}</h3>
                                            <div className="flex flex-col gap-2">
                                                {filteredTasks.map(task => {
                                                    const localRec = myTasks[task.id];
                                                    const isCompleted = localRec && localRec.results;
                                                    const inProgress = localRec && !localRec.results && Array.isArray(localRec.userAnswers) && localRec.userAnswers.filter(a => a).length > 0;

                                                    return (
                                                        <div key={task.id} className="border border-stone-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-stone-900 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:shadow-md transition-shadow rounded-2xl">
                                                            <div className="flex flex-col gap-1 min-w-0 flex-grow">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-sm break-words whitespace-normal leading-relaxed dark:text-white" title={cleanQuizName(task.testName)}>
                                                              {renderTestName(task.testName, isCompleted)}
                                                            </h3>
                                                            {isAdmin && (
                                                                <button onClick={() => handleAdminEditTask(task)} className="text-xs bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600 px-2 py-0.5 rounded flex items-center transition-colors shadow-sm active:scale-95 shrink-0">
                                                                    <span className="material-symbols-outlined text-[14px] mr-1">edit</span> 編輯
                                                                </button>
                                                            )}
                                                        </div>
                                                                <div className="flex items-center gap-3 text-xs shrink-0 mt-1">
                                                                    <span className="text-gray-500 dark:text-gray-400">{task.numQuestions}題</span>
                                                                    {task.hasTimer && <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 border border-red-200 dark:border-red-700">⏱ {task.timeLimit}m</span>}
                                                                    {isCompleted ? (
                                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✅ {localRec.results.score} 分</span>
                                                                    ) : inProgress ? (
                                                                        <span className="text-amber-500 dark:text-amber-400 font-bold">📝 已填: {localRec.userAnswers.filter(a => a).length}</span>
                                                                    ) : (
                                                                        <span className="text-gray-400 font-bold">⏳ 未作答</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handlePlayTask(task, localRec)} 
                                                                className={`py-1.5 px-4 rounded-2xl font-bold text-xs transition-colors shrink-0 w-full sm:w-auto mt-2 sm:mt-0 ${isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' : 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 hover:bg-stone-800'}`}
                                                            >
                                                                {isCompleted ? '📊 查看成績與討論' : (inProgress ? '📝 繼續作答' : '⚔️ 開始')}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                  </div> {/* ✨ 結束左右排版容器，接下來的區塊會回到單行全寬 */}

                    {otherTasksFiltered.length > 0 && (
                        <div className="bg-[#FCFBF7] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm rounded-2xl p-5 md:p-6">
                            <h2 className="text-xl font-black mb-4 dark:text-white border-b-2 border-stone-200 dark:border-stone-700 pb-2 text-gray-600 dark:text-gray-400">
                                🏷️ 其他任務
                            </h2>
                            <div className="flex flex-col gap-2">
                                {otherTasksFiltered.map(task => {
                                    const localRec = myTasks[task.id];
                                    const isCompleted = localRec && localRec.results;
                                    const inProgress = localRec && !localRec.results && Array.isArray(localRec.userAnswers) && localRec.userAnswers.filter(a => a).length > 0;

                                    return (
                                        <div key={task.id} className="border border-stone-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-stone-900 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:shadow-md transition-shadow rounded-2xl">
                                            <div className="flex flex-col gap-1 min-w-0 flex-grow">
                                                <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-sm break-words whitespace-normal leading-relaxed dark:text-white" title={cleanQuizName(task.testName)}>
                                                              {renderTestName(task.testName, isCompleted)}
                                                            </h3>
                                                            {isAdmin && (
                                                                <button onClick={() => handleAdminEditTask(task)} className="text-xs bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600 px-2 py-0.5 rounded flex items-center transition-colors shadow-sm active:scale-95 shrink-0">
                                                                    <span className="material-symbols-outlined text-[14px] mr-1">edit</span> 編輯
                                                                </button>
                                                            )}
                                                        </div>
                                                <div className="flex items-center gap-3 text-xs shrink-0 mt-1">
                                                    <span className="text-gray-500 dark:text-gray-400">{task.numQuestions}題</span>
                                                    {task.hasTimer && <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 border border-red-200 dark:border-red-700">⏱ {task.timeLimit}m</span>}
                                                    {isCompleted ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✅ {localRec.results.score} 分</span>
                                                    ) : inProgress ? (
                                                        <span className="text-amber-500 dark:text-amber-400 font-bold">📝 已填: {localRec.userAnswers.filter(a => a).length}</span>
                                                    ) : (
                                                        <span className="text-gray-400 font-bold">⏳ 未作答</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handlePlayTask(task, localRec)} 
                                                className={`py-1.5 px-4 rounded-2xl font-bold text-xs transition-colors shrink-0 w-full sm:w-auto mt-2 sm:mt-0 ${isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' : 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 hover:bg-stone-800'}`}
                                            >
                                                {isCompleted ? '📊 查看成績與討論' : (inProgress ? '📝 繼續作答' : '⚔️ 開始')}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {!hasAnyOfficial && !hasAnyNormal && otherTasksFiltered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#FCFBF7] dark:bg-stone-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-center shadow-sm w-full mt-4">
                            <span className="material-symbols-outlined text-6xl mb-4 text-stone-400">target</span>
                            <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">找不到相關任務</h3>
                            <p className="text-gray-500 dark:text-gray-400 font-bold max-w-md">
                                {searchQuery ? '試試看更換其他關鍵字吧！' : '目前還沒有人發布公開任務喔！'}
                            </p>
                        </div>
                    )}

                    {/* ✨ 新增：任務牆的「載入更多」按鈕 */}
                    <div className="flex justify-center mt-8 pt-4">
                        <button 
                            onClick={() => setTaskLimit(prev => prev + 5)} 
                            className="bg-[#FCFBF7] dark:bg-stone-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-3 font-bold shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 flex items-center justify-center gap-2 rounded-2xl"
                        >
                            <span className="material-symbols-outlined text-[20px]">arrow_downward</span> 載入更早的任務...
                        </button>
                    </div>

                </div>
            )}

            {/* ✨ 新增：跳轉試卷時的載入 Modal */}
            {isJumping && (
                <div className="fixed inset-0 bg-stone-800 bg-opacity-80 flex items-center justify-center z-[200] p-4">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 p-8 w-full max-w-sm rounded-2xl shadow-2xl text-center border-t-8 border-indigo-500 animate-fade-in">
                        <div className="w-16 h-16 border-4 border-stone-200 dark:border-stone-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black mb-2 dark:text-white">🚀 載入中...</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">正在讀取試卷資料</p>
                    </div>
                </div>
            )}

        </div>
    );
}
window.TaskWallDashboard = TaskWallDashboard;