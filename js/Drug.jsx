// Drug.jsx
const { useState, useEffect, useMemo } = React;

function DrugLibrary({ user, userProfile, showAlert, showConfirm, showPrompt }) {
    const [drugs, setDrugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSubject, setActiveSubject] = useState('藥理藥化'); // 藥理藥化, 中藥, 生藥學
    const [searchTerm, setSearchTerm] = useState('');
    
    // 選單層級狀態
    const [selectedChapter, setSelectedChapter] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    
    // 匯入與編輯狀態
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');
    
    // 個別藥物詳細資料與測驗狀態
    const [selectedDrug, setSelectedDrug] = useState(null);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [quizSettings, setQuizSettings] = useState({
        mode: 'drugToMech', // drugToMech(看藥選機轉), mechToDrug(看機轉選藥), structToDrug(看圖選藥)
        num: 10
    });

    // 模擬資料庫載入 (實際應從 Firebase 讀取)
    useEffect(() => {
        const fetchDrugs = async () => {
            setLoading(true);
            try {
                // 這裡替換為實際的 Firebase 查詢
                const snapshot = await window.db.collection('drugs').get();
                const drugList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setDrugs(drugList);
            } catch (error) {
                console.error("載入藥物資料失敗:", error);
                // 提供一些假資料以便預覽
                setDrugs([
                    { id: '1', name: 'Cetirizine', subject: '藥理藥化', chapter: '自律神經系統', unit: '抗組織胺藥物', mechanism: '二代抗組織胺', structClass: 'Piperazine', receptor: 'H1', indication: '過敏,搔癢', note: 'levocetirizine是R異構,是hydroxyzine的活性代謝物' },
                    { id: '2', name: 'Diphenhydramine', subject: '藥理藥化', chapter: '自律神經系統', unit: '抗組織胺藥物', mechanism: '一代抗組織胺', structClass: 'Ethanolamine', receptor: 'H1', indication: '過敏,失眠', note: '具有顯著中樞鎮靜副作用' },
                    { id: '3', name: '麻黃', subject: '中藥', chapter: '解表藥', unit: '辛溫解表', mechanism: '發汗解表，宣肺平喘', structClass: '', receptor: '', indication: '風寒感冒，胸悶喘咳', note: '主要成分為Ephedrine' }
                ]);
            }
            setLoading(false);
        };
        fetchDrugs();
    }, []);

    // 處理批次匯入
    const handleBatchImport = async () => {
        if (!importText.trim()) return;
        
        if (!selectedChapter || !selectedUnit) {
            showAlert('請先選擇或輸入章節與單元！');
            return;
        }

        const newDrugs = [];
        // 正則表達式解析 [藥物名稱;M:機轉;O:結構;R:受體;S:適應症;N:補充]
        const regex = /\[([^;]+)(?:;M:([^;]+))?(?:;O:([^;]+))?(?:;R:([^;]+))?(?:;S:([^;]+))?(?:;N:([^\]]+))?\]/g;
        
        let match;
        while ((match = regex.exec(importText)) !== null) {
            newDrugs.push({
                name: match[1] ? match[1].trim() : '',
                mechanism: match[2] ? match[2].trim() : '',
                structClass: match[3] ? match[3].trim() : '',
                receptor: match[4] ? match[4].trim() : '',
                indication: match[5] ? match[5].trim() : '',
                note: match[6] ? match[6].trim() : '',
                subject: activeSubject,
                chapter: selectedChapter,
                unit: selectedUnit,
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        if (newDrugs.length === 0) {
            showAlert('無法解析內容，請確認格式是否正確。');
            return;
        }

        showConfirm(`成功解析 ${newDrugs.length} 筆藥物資料，確定要匯入到「${selectedChapter} - ${selectedUnit}」嗎？`, async () => {
            try {
                const batch = window.db.batch();
                newDrugs.forEach(drug => {
                    const docRef = window.db.collection('drugs').doc();
                    batch.set(docRef, drug);
                });
                await batch.commit();
                
                // 更新本地狀態
                const snapshot = await window.db.collection('drugs').get();
                setDrugs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                
                setImportText('');
                setShowImportModal(false);
                showAlert(`已成功匯入 ${newDrugs.length} 筆資料！`, '匯入成功');
            } catch (error) {
                showAlert('匯入失敗：' + error.message);
            }
        });
    };

    // 自動獲取現有章節與單元選項
    const { chapters, units } = useMemo(() => {
        const filtered = drugs.filter(d => d.subject === activeSubject);
        const uniqueChapters = [...new Set(filtered.map(d => d.chapter).filter(Boolean))];
        const uniqueUnits = [...new Set(filtered.filter(d => d.chapter === selectedChapter).map(d => d.unit).filter(Boolean))];
        return { chapters: uniqueChapters, units: uniqueUnits };
    }, [drugs, activeSubject, selectedChapter]);

    // 過濾顯示的藥物
    const displayedDrugs = useMemo(() => {
        return drugs.filter(d => {
            if (d.subject !== activeSubject) return false;
            if (selectedChapter && d.chapter !== selectedChapter) return false;
            if (selectedUnit && d.unit !== selectedUnit) return false;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (
                    (d.name && d.name.toLowerCase().includes(term)) ||
                    (d.mechanism && d.mechanism.toLowerCase().includes(term)) ||
                    (d.structClass && d.structClass.toLowerCase().includes(term))
                );
            }
            return true;
        });
    }, [drugs, activeSubject, selectedChapter, selectedUnit, searchTerm]);

    // 啟動測驗邏輯
    const startQuiz = () => {
        if (displayedDrugs.length < 4) {
            showAlert('目前範圍內的藥物數量不足 4 個，無法建立測驗，請擴大範圍或新增更多藥物。');
            return;
        }
        
        let questions = [];
        const numToGenerate = Math.min(quizSettings.num, displayedDrugs.length);
        
        // 隨機打亂藥物陣列
        const shuffledDrugs = [...displayedDrugs].sort(() => 0.5 - Math.random());
        const selectedForQuiz = shuffledDrugs.slice(0, numToGenerate);

        selectedForQuiz.forEach((drug, index) => {
            let questionText = '';
            let correctAnswer = '';
            let options = [];
            
            // 根據模式建立題目與答案
            if (quizSettings.mode === 'drugToMech') {
                questionText = `請問 **${drug.name}** 的機轉分類為何？`;
                correctAnswer = drug.mechanism || '無資料';
                // 找其他 3 個不同的機轉作為錯誤選項
                const otherMechs = [...new Set(drugs.filter(d => d.mechanism && d.mechanism !== correctAnswer).map(d => d.mechanism))].sort(() => 0.5 - Math.random()).slice(0, 3);
                options = [correctAnswer, ...otherMechs].sort(() => 0.5 - Math.random());
            } else if (quizSettings.mode === 'mechToDrug') {
                questionText = `下列何者屬於 **${drug.mechanism || '無資料'}** 類的藥物？`;
                correctAnswer = drug.name;
                // 找其他 3 個不同機轉的藥物作為錯誤選項
                const otherDrugs = drugs.filter(d => d.mechanism !== drug.mechanism && d.name !== correctAnswer).sort(() => 0.5 - Math.random()).slice(0, 3).map(d => d.name);
                options = [correctAnswer, ...otherDrugs].sort(() => 0.5 - Math.random());
            } else if (quizSettings.mode === 'structToDrug') {
                // 此處需結合 QuizApp 的 parseSmilesToHtml，暫時以文字代替
                questionText = `請看下方結構，判斷這是哪個藥物？<br/><div class="mt-2 text-center text-gray-500">[結構圖：${drug.name} 的結構]</div>`;
                correctAnswer = drug.name;
                const otherDrugs = drugs.filter(d => d.name !== correctAnswer).sort(() => 0.5 - Math.random()).slice(0, 3).map(d => d.name);
                options = [correctAnswer, ...otherDrugs].sort(() => 0.5 - Math.random());
            }

            // 將正確答案轉為選項字母 (A, B, C, D)
            const correctOptionLetter = String.fromCharCode(65 + options.indexOf(correctAnswer));

            questions.push({
                globalIndex: index,
                number: index + 1,
                type: 'Q',
                mainText: questionText,
                options: { A: options[0], B: options[1], C: options[2], D: options[3] },
                ans: correctOptionLetter,
                explain: `**${drug.name}**\n機轉：${drug.mechanism}\n結構：${drug.structClass}\n適應症：${drug.indication}\n補充：${drug.note}`
            });
        });

        // 打包成 QuizApp 可接受的格式並導航 (這裡需要與您的路由或狀態切換整合)
        console.log("生成的測驗：", questions);
        showAlert(`成功生成 ${questions.length} 題測驗！(目前僅在 Console 印出，需進一步與您的 QuizApp 整合)`);
        setShowQuizModal(false);
    };

    if (loading) return <div className="flex justify-center items-center h-full"><div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="max-w-6xl mx-auto w-full p-4 md:p-6 space-y-6 h-full flex flex-col">
            {/* 標題與模式切換 */}
            <div className="bg-[#FCFBF7] dark:bg-stone-800 rounded-2xl p-4 shadow-sm border border-cyan-100 dark:border-stone-700 flex flex-wrap justify-between items-center gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-3xl text-cyan-600">medication</span>
                    <h1 className="text-2xl font-black text-stone-800 dark:text-white">藥物機轉與結構庫</h1>
                </div>
                <div className="flex gap-2 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200 dark:border-stone-700">
                    {['藥理藥化', '中藥', '生藥學'].map(subj => (
                        <button 
                            key={subj}
                            onClick={() => { setActiveSubject(subj); setSelectedChapter(''); setSelectedUnit(''); }}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeSubject === subj ? 'bg-white dark:bg-stone-700 text-cyan-700 dark:text-cyan-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            {subj}
                        </button>
                    ))}
                </div>
                <button onClick={() => setShowQuizModal(true)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1 transition-transform active:scale-95">
                    <span className="material-symbols-outlined text-[18px]">school</span>
                    開始測驗
                </button>
            </div>

            {/* 篩選與操作列 */}
            <div className="bg-white dark:bg-stone-800 rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-stone-700 flex flex-wrap gap-4 items-end shrink-0">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">章節 (可選現有或直接輸入新增)</label>
                    <input 
                        type="text" list="chapters-list" placeholder="選擇或輸入章節..." 
                        value={selectedChapter} 
                        onChange={e => { setSelectedChapter(e.target.value); setSelectedUnit(''); }}
                        className="w-full p-2 border border-stone-300 dark:border-stone-600 rounded-lg text-sm bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-cyan-500"
                    />
                    <datalist id="chapters-list">{chapters.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">單元 (可選現有或直接輸入新增)</label>
                    <input 
                        type="text" list="units-list" placeholder="選擇或輸入單元..." 
                        value={selectedUnit} 
                        onChange={e => setSelectedUnit(e.target.value)}
                        disabled={!selectedChapter}
                        className="w-full p-2 border border-stone-300 dark:border-stone-600 rounded-lg text-sm bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-cyan-500 disabled:opacity-50"
                    />
                    <datalist id="units-list">{units.map(u => <option key={u} value={u} />)}</datalist>
                </div>
                <div className="flex-[2] min-w-[200px] relative">
                    <input 
                        type="text" 
                        placeholder="搜尋藥物名稱、機轉或結構..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg text-sm bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-cyan-500"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-2 text-gray-400">search</span>
                </div>
                <button 
                    onClick={() => {
                        if (!selectedChapter || !selectedUnit) {
                            showAlert('請先在左側填寫或選擇「章節」與「單元」，才能進行匯入！');
                            return;
                        }
                        setShowImportModal(true);
                    }}
                    className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-cyan-100 transition-colors flex items-center gap-1"
                >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    在此單元匯入
                </button>
            </div>

            {/* 藥物列表區塊 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#FCFBF7] dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-4">
                {displayedDrugs.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 font-bold flex flex-col items-center">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">medical_information</span>
                        找不到符合條件的藥物，請調整篩選或嘗試匯入新資料。
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayedDrugs.map(drug => (
                            <div 
                                key={drug.id} 
                                onClick={() => setSelectedDrug(drug)}
                                className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-cyan-400 cursor-pointer transition-all group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-black text-lg text-stone-800 dark:text-white group-hover:text-cyan-600 transition-colors">{drug.name}</h3>
                                    <span className="text-[10px] bg-gray-100 dark:bg-stone-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded font-bold border border-gray-200 dark:border-stone-600">{drug.chapter}</span>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-start gap-1">
                                        <span className="font-bold text-gray-500 dark:text-gray-400 w-12 shrink-0">機轉:</span>
                                        <span className="font-bold text-stone-700 dark:text-gray-200">{drug.mechanism || '-'}</span>
                                    </div>
                                    <div className="flex items-start gap-1">
                                        <span className="font-bold text-gray-500 dark:text-gray-400 w-12 shrink-0">結構:</span>
                                        <span className="font-bold text-stone-700 dark:text-gray-200">{drug.structClass || '-'}</span>
                                    </div>
                                    {drug.receptor && (
                                        <div className="flex items-start gap-1">
                                            <span className="font-bold text-gray-500 dark:text-gray-400 w-12 shrink-0">受體:</span>
                                            <span className="font-bold text-stone-700 dark:text-gray-200">{drug.receptor}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: 個別藥物詳細資料 */}
            {selectedDrug && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedDrug(null)}>
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 p-6 flex justify-between items-center shrink-0">
                            <h2 className="text-2xl font-black text-stone-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-cyan-600">prescriptions</span>
                                {selectedDrug.name}
                            </h2>
                            <button onClick={() => setSelectedDrug(null)} className="text-gray-400 hover:text-stone-800 dark:hover:text-white bg-gray-100 dark:bg-stone-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            {/* 分類標籤 */}
                            <div className="flex gap-2 font-bold text-xs">
                                <span className="bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 px-3 py-1 rounded-full border border-cyan-200 dark:border-cyan-800">{selectedDrug.subject}</span>
                                <span className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">{selectedDrug.chapter}</span>
                                <span className="bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300 px-3 py-1 rounded-full border border-stone-200 dark:border-stone-600">{selectedDrug.unit}</span>
                            </div>

                            {/* 結構圖區塊 (此處假設有實作 SMILES 轉圖片邏輯，暫用文字框示意) */}
                            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-4 flex flex-col items-center justify-center min-h-[150px] shadow-inner">
                                <span className="text-gray-400 font-bold mb-2">結構圖預覽區</span>
                                <div className="text-xs text-gray-300 italic">(需整合 ChemDraw 或 Smiles 渲染組件)</div>
                            </div>

                            {/* 詳細資訊表格 */}
                            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden text-sm">
                                {[
                                    { label: '機轉分類', value: selectedDrug.mechanism, icon: 'settings_backup_restore' },
                                    { label: '結構分類', value: selectedDrug.structClass, icon: 'account_tree' },
                                    { label: '作用受體', value: selectedDrug.receptor, icon: 'radar' },
                                    { label: '適應症', value: selectedDrug.indication, icon: 'healing' }
                                ].map((item, idx) => item.value && (
                                    <div key={item.label} className={`flex border-b border-stone-100 dark:border-stone-700 last:border-b-0 ${idx % 2 === 0 ? 'bg-stone-50 dark:bg-stone-800/50' : ''}`}>
                                        <div className="w-1/3 p-3 font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1.5 border-r border-stone-100 dark:border-stone-700">
                                            <span className="material-symbols-outlined text-[16px]">{item.icon}</span> {item.label}
                                        </div>
                                        <div className="w-2/3 p-3 font-bold text-stone-800 dark:text-stone-200">{item.value}</div>
                                    </div>
                                ))}
                            </div>

                            {selectedDrug.note && (
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
                                    <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[18px]">lightbulb</span> 補充筆記
                                    </h4>
                                    <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-medium">{selectedDrug.note}</p>
                                </div>
                            )}

                            {/* 留言討論區 (沿用 QlibQuestionDiscussion 的邏輯概念) */}
                            <div className="border-t border-stone-200 dark:border-stone-700 pt-6">
                                <h4 className="font-bold text-stone-700 dark:text-stone-300 mb-4 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[18px]">forum</span> 藥物補充與考題討論
                                </h4>
                                <div className="bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-xl p-4 flex flex-col items-center justify-center min-h-[100px] text-gray-400 font-bold text-sm shadow-inner">
                                    (此處嵌入討論區組件)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: 批次匯入 */}
            {showImportModal && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowImportModal(false)}>
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 border border-cyan-200 dark:border-stone-700 flex flex-col" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-stone-800 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-cyan-600">playlist_add</span>
                            批次匯入藥物
                        </h3>
                        
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl mb-4 font-bold text-amber-800 dark:text-amber-400 text-sm">
                            <div className="flex items-center gap-1 mb-1"><span className="material-symbols-outlined text-[18px]">folder_open</span> 匯入目標位置：</div>
                            <div className="ml-5 text-amber-700 dark:text-amber-300">{activeSubject} &gt; {selectedChapter} &gt; {selectedUnit}</div>
                        </div>

                        <div className="bg-cyan-50 dark:bg-stone-900 p-3 rounded-lg border border-cyan-100 dark:border-stone-700 mb-4 text-xs text-stone-600 dark:text-gray-300 font-bold">
                            格式說明：<br/>
                            <code className="text-cyan-700 dark:text-cyan-400 select-all">[藥物名稱;M:機轉分類;O:結構分類;R:作用受體;S:適應症;N:補充]</code><br/>
                            範例：<br/>
                            <span className="text-gray-500">[Cetirizine;M:二代抗組織胺;O:Piperazine;R:H1;S:過敏,搔癢;N:是hydroxyzine代謝物]</span>
                        </div>

                        <textarea 
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                            placeholder="請在此貼上藥物資料..."
                            className="w-full h-40 p-3 border border-stone-300 dark:border-stone-600 rounded-lg text-sm bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-cyan-500 resize-none custom-scrollbar mb-4"
                        />

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-stone-500 font-bold hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors">取消</button>
                            <button onClick={handleBatchImport} className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-1">
                                <span className="material-symbols-outlined text-[18px]">done</span> 開始解析並匯入
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: 測驗設定 */}
            {showQuizModal && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowQuizModal(false)}>
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-sm rounded-[2rem] shadow-2xl p-6 border border-amber-200 dark:border-stone-700" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-stone-800 dark:text-white mb-4 flex items-center gap-2 border-b border-stone-200 dark:border-stone-700 pb-3">
                            <span className="material-symbols-outlined text-amber-500">school</span>
                            測驗設定
                        </h3>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">出題範圍</label>
                                <div className="text-xs text-stone-500 bg-stone-100 dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-700 font-bold">
                                    {activeSubject} {selectedChapter ? `> ${selectedChapter}` : '(全部章節)'} {selectedUnit ? `> ${selectedUnit}` : ''}<br/>
                                    <span className="text-amber-600 dark:text-amber-400 mt-1 inline-block">共 {displayedDrugs.length} 個藥物</span>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">測驗模式</label>
                                <select 
                                    value={quizSettings.mode}
                                    onChange={e => setQuizSettings({...quizSettings, mode: e.target.value})}
                                    className="w-full p-2 border border-amber-300 dark:border-stone-600 rounded-lg text-sm bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-amber-500"
                                >
                                    <option value="drugToMech">給藥物 ➔ 選機轉</option>
                                    <option value="mechToDrug">給機轉 ➔ 選藥物</option>
                                    <option value="structToDrug">看結構圖 ➔ 選藥物</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">測驗題數</label>
                                <input 
                                    type="number" min="5" max={Math.min(50, displayedDrugs.length)}
                                    value={quizSettings.num}
                                    onChange={e => setQuizSettings({...quizSettings, num: parseInt(e.target.value) || 10})}
                                    className="w-full p-2 border border-amber-300 dark:border-stone-600 rounded-lg text-sm bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-amber-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowQuizModal(false)} className="px-4 py-2 text-stone-500 font-bold hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors">取消</button>
                            <button onClick={startQuiz} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-xl font-bold shadow-sm transition-transform active:scale-95 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[18px]">play_arrow</span> 開始挑戰
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

window.DrugLibrary = DrugLibrary;