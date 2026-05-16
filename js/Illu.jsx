// 將單一藥物卡片獨立成 React.memo，顯示藥物名稱與機轉
const DrugCard = React.memo(({ drug, onSelect, onAddFolder, onRemoveFromFolder, onEdit, isAdmin, isMyFolder, isCompareMode, isSelectedForCompare, toggleCompare }) => {
    return (
        <div 
            onClick={() => isCompareMode ? toggleCompare(drug) : onSelect(drug)} 
            className={`bg-white dark:bg-stone-800 rounded-xl shadow-sm border transition-all cursor-pointer group relative flex flex-col p-2 min-h-[70px] justify-center items-center ${isSelectedForCompare ? 'border-amber-500 ring-2 ring-amber-200 dark:ring-amber-900 bg-amber-50 dark:bg-stone-800' : 'border-stone-200 dark:border-stone-700 hover:border-emerald-400 hover:shadow-md'}`}
        >
            {/* 比較模式專屬的核取方塊 */}
            {isCompareMode && (
                <div className={`absolute top-2 left-2 w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelectedForCompare ? 'bg-amber-500 border-amber-500' : 'bg-white border-stone-300 dark:bg-stone-700 dark:border-stone-500'}`}>
                    {isSelectedForCompare && <span className="material-symbols-outlined text-[12px] text-white font-black">check</span>}
                </div>
            )}

            {/* 非比較模式下才顯示操作按鈕 */}
            {!isCompareMode && isAdmin && (
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {isMyFolder ? (
                        <button onClick={(e) => { e.stopPropagation(); onRemoveFromFolder(drug.id); }} className="w-6 h-6 flex items-center justify-center bg-rose-50 dark:bg-rose-900/50 backdrop-blur rounded-full text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900 shadow-sm border border-rose-200 dark:border-rose-800 transition-colors" title="從資料夾移除">
                            <span className="material-symbols-outlined text-[14px]">bookmark_remove</span>
                        </button>
                    ) : (
                        <button onClick={(e) => { e.stopPropagation(); onAddFolder(drug); }} className="w-6 h-6 flex items-center justify-center bg-white/80 dark:bg-stone-800/80 backdrop-blur rounded-full text-stone-400 hover:text-amber-500 shadow-sm border border-stone-200 dark:border-stone-600 transition-colors" title="收錄至資料夾">
                            <span className="material-symbols-outlined text-[14px]">star</span>
                        </button>
                    )}
                    {isAdmin && (
                        <button onClick={(e) => { e.stopPropagation(); onEdit(drug); }} className="w-6 h-6 flex items-center justify-center bg-white/80 dark:bg-stone-800/80 backdrop-blur rounded-full text-stone-400 hover:text-cyan-500 shadow-sm border border-stone-200 dark:border-stone-600 transition-colors" title="編輯">
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                    )}
                </div>
            )}
            
            <div className={`w-full flex flex-col items-center ${isCompareMode ? 'px-2' : ''}`}>
                <h3 className="font-black text-[15px] text-stone-800 dark:text-white truncate w-full text-center leading-tight mb-1">{drug.D}</h3>
                {drug.C && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800 truncate max-w-full leading-none">
                        {drug.C}
                    </span>
                )}
            </div>
        </div>
    );
});

// ✨ 新增：獨立於主組件之外，防止重新渲染時狀態重置的心智圖遞迴元件 (支援左右雙向展開)
const MindMapNode = React.memo(({ node, level = 0, onNodeClick, dir = 'right' }) => {
    const { useState } = React;
    const [isOpen, setIsOpen] = useState(level === 0); // 💡 預設收合：只有最中央的「藥物心智圖」預設展開
    const isLeaf = !!node.drug;
    const isLeft = dir === 'left';

    // 💡 根節點 (level 0) 專屬渲染：將子節點對半切分至左右兩側
    if (level === 0) {
        const mid = Math.ceil(node.children.length / 2);
        const leftChildren = node.children.slice(0, mid);
        const rightChildren = node.children.slice(mid);

        const renderTree = (children, treeDir) => {
            if (!isOpen || children.length === 0) return null;
            const isTreeLeft = treeDir === 'left';
            return (
                <div className={`flex items-center ${isTreeLeft ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-[2px] bg-stone-300 dark:bg-stone-600 shrink-0 transition-opacity"></div>
                    <div className={`flex flex-col animate-fade-in-up ${isTreeLeft ? 'items-end' : ''}`} style={{ animationDuration: '0.2s' }}>
                        {children.map((child, idx) => {
                            const isFirst = idx === 0;
                            const isLast = idx === children.length - 1;
                            const isOnly = children.length === 1;
                            return (
                                <div key={idx} className={`relative flex items-center ${isTreeLeft ? 'flex-row-reverse' : ''}`}>
                                    {!isOnly && (
                                        <div className={`absolute ${isTreeLeft ? 'right-0' : 'left-0'} w-[2px] bg-stone-300 dark:bg-stone-600 ${
                                            isFirst ? 'top-1/2 bottom-0' :
                                            isLast ? 'top-0 bottom-1/2' :
                                            'top-0 bottom-0'
                                        }`}></div>
                                    )}
                                    <div className="w-8 h-[2px] bg-stone-300 dark:bg-stone-600 shrink-0"></div>
                                    <div className="py-2">
                                        <MindMapNode node={child} level={1} onNodeClick={onNodeClick} dir={treeDir} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        };

        return (
            <div className="flex items-center justify-center">
                {/* 左側分支 */}
                {renderTree(leftChildren, 'left')}
                
                {/* 中心節點 */}
                <div 
                    onClick={() => setIsOpen(!isOpen)}
                    className="px-6 py-3 rounded-2xl font-black border-4 whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 z-10 shadow-lg active:scale-95 bg-rose-500 border-rose-600 text-white text-xl mx-2"
                >
                    <span className="material-symbols-outlined text-[24px]">account_tree</span>
                    {node.name}
                    <span className="text-xs ml-1 opacity-80 bg-black/20 px-2 py-0.5 rounded-full">
                        {node.children.length}
                    </span>
                </div>

                {/* 右側分支 */}
                {renderTree(rightChildren, 'right')}
            </div>
        );
    }

    // 💡 標準節點 (level > 0) 渲染
    return (
        <div className={`flex items-center ${isLeft ? 'flex-row-reverse' : ''}`}>
            <div 
                onClick={() => {
                    if (isLeaf) onNodeClick(node.drug);
                    else setIsOpen(!isOpen);
                }}
                className={`px-4 py-2 rounded-xl font-bold border-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 z-10 shadow-sm active:scale-95 ${
                    isLeaf ? 'bg-white dark:bg-stone-800 border-emerald-400 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-stone-700' : 
                    level === 1 ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 text-amber-800 dark:text-amber-300' :
                    level === 2 ? 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-300 text-cyan-800 dark:text-cyan-300' :
                    'bg-stone-100 dark:bg-stone-700 border-stone-300 dark:border-stone-500 text-stone-700 dark:text-stone-300'
                }`}
            >
                {isLeaf && <span className="material-symbols-outlined text-[16px]">science</span>}
                {node.name}
                {!isLeaf && (
                    <span className="text-[11px] ml-1 opacity-80 bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
                        {node.children.length}
                    </span>
                )}
            </div>
            
            {/* 橫向連接線 */}
            {!isLeaf && isOpen && node.children.length > 0 && (
                <div className="w-8 h-[2px] bg-stone-300 dark:bg-stone-600 shrink-0 transition-opacity"></div>
            )}
            
            {/* 子節點區塊 */}
            {!isLeaf && isOpen && node.children.length > 0 && (
                <div className={`flex flex-col animate-fade-in-up ${isLeft ? 'items-end' : ''}`} style={{ animationDuration: '0.2s' }}>
                    {node.children.map((child, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === node.children.length - 1;
                        const isOnly = node.children.length === 1;
                        return (
                            <div key={idx} className={`relative flex items-center ${isLeft ? 'flex-row-reverse' : ''}`}>
                                {/* 垂直連線 */}
                                {!isOnly && (
                                    <div className={`absolute ${isLeft ? 'right-0' : 'left-0'} w-[2px] bg-stone-300 dark:bg-stone-600 ${
                                        isFirst ? 'top-1/2 bottom-0' :
                                        isLast ? 'top-0 bottom-1/2' :
                                        'top-0 bottom-0'
                                    }`}></div>
                                )}
                                {/* 進入子節點的水平線 */}
                                <div className="w-8 h-[2px] bg-stone-300 dark:bg-stone-600 shrink-0"></div>
                                <div className="py-2">
                                    <MindMapNode node={child} level={level + 1} onNodeClick={onNodeClick} dir={dir} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

// ✨ 新增：處理滑鼠滾輪縮放與按住拖拉平移的智慧畫布元件 (移到最外層防止重繪)
const MindMapViewer = React.memo(({ data, onNodeClick }) => {
    const { useState } = React;
    const [scale, setScale] = useState(0.9);
    const [position, setPosition] = useState({ x: 0, y: 0 }); // 透過內部 flex 讓畫布預設置中
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const handleWheel = (e) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        if (e.deltaY < 0) {
            setScale(s => Math.min(s * zoomFactor, 3));
        } else {
            setScale(s => Math.max(s / zoomFactor, 0.3));
        }
    };

    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('.cursor-pointer')) return;
        setIsDragging(true);
        setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    };

    return (
        <div 
            className="flex-1 relative overflow-hidden bg-stone-50 dark:bg-stone-900/40 select-none cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
        >
            {/* 右下角縮放控制按鈕列 */}
            <div className="absolute bottom-6 right-6 z-30 flex items-center gap-2 bg-white/90 dark:bg-stone-800/90 p-2 rounded-2xl border border-stone-200 dark:border-stone-700 backdrop-blur-sm shadow-lg">
                <button onClick={() => setScale(s => Math.min(s * 1.2, 3))} className="w-10 h-10 rounded-xl bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 flex items-center justify-center font-black text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors shadow-sm" title="放大">
                    <span className="material-symbols-outlined">zoom_in</span>
                </button>
                <button onClick={() => setScale(s => Math.max(s / 1.2, 0.3))} className="w-10 h-10 rounded-xl bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 flex items-center justify-center font-black text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors shadow-sm" title="縮小">
                    <span className="material-symbols-outlined">zoom_out</span>
                </button>
                <button onClick={() => { setScale(0.9); setPosition({ x: 0, y: 0 }); }} className="w-10 h-10 rounded-xl bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 flex items-center justify-center font-black text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors shadow-sm" title="重設視角">
                    <span className="material-symbols-outlined">restart_alt</span>
                </button>
            </div>

            {/* 背景點狀工程格線 */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#374151_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none"></div>

            {/* 💡 修正跳動與排版問題：透過外層的 flex items-center justify-center 提供穩定的初始對齊基準 */}
            <div 
                className="absolute transform-gpu transition-transform duration-75 ease-out origin-top-left"
                style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transformOrigin: '0 0' }}
            >
                <div className="flex items-center justify-center min-w-[80vw] min-h-[70vh] p-16">
                    <div className="inline-block p-6 bg-white/60 dark:bg-stone-800/60 rounded-3xl backdrop-blur-md border border-white/40 dark:border-stone-700/40 shadow-xl pointer-events-auto">
                        <MindMapNode node={data} level={0} onNodeClick={onNodeClick} />
                    </div>
                </div>
            </div>
        </div>
    );
});

window.IlluDashboard = function IlluDashboard({ user, userProfile, showAlert, showConfirm, showPrompt, onContinueQuiz }) {
    const { useState, useEffect, useMemo } = React;
    const { parseSmilesToHtml } = window;
    
    const isAdmin = user?.email === 'jay03wn@gmail.com' || userProfile?.isAuthorized;

    // --- 資料狀態 ---
    const [globalDrugs, setGlobalDrugs] = useState([]);
    const [userFolders, setUserFolders] = useState([]);
    const [unitGroups, setUnitGroups] = useState([]); // ✨ 新增：單元大資料夾(群組)資料

    // --- UI 狀態 ---
    const [activeMainTab, setActiveMainTab] = useState('library'); 
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [searchQ, setSearchQ] = useState('');
    const [newUnitGroupName, setNewUnitGroupName] = useState(''); // ✨ 新增：建立單元大資料夾的名稱
    const [expandedUnitGroups, setExpandedUnitGroups] = useState({}); // ✨ 新增：控制大資料夾展開狀態
    
    // --- 整合篩選狀態 ---
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [selectedUnits, setSelectedUnits] = useState([]);
    const [selectedMechs, setSelectedMechs] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [filterProdrug, setFilterProdrug] = useState('all');
    
    // --- 比較模式狀態 ---
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [compareList, setCompareList] = useState([]);
    const [showCompareModal, setShowCompareModal] = useState(false);

    // --- 心智圖模式狀態 --- ✨ 新增
    const [showMindMapModal, setShowMindMapModal] = useState(false);

    // --- 彈跳視窗與資料夾狀態 ---
    const [importText, setImportText] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingDrug, setEditingDrug] = useState(null);
    const [viewingDrug, setViewingDrug] = useState(null);
    
    // ✨ 新增：控制 JSME 繪圖彈跳視窗
    const [showDrawingModal, setShowDrawingModal] = useState(false);
    
    const [folderModalDrug, setFolderModalDrug] = useState(null); 
    const [newFolderName, setNewFolderName] = useState('');
    
    // 測驗設定狀態
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [quizCount, setQuizCount] = useState(10);
    const [quizSelectedUnits, setQuizSelectedUnits] = useState([]); 
    const [quizSelectedTypes, setQuizSelectedTypes] = useState([0, 1, 2, 3]); // ✨ 移除了代謝酵素(4)

    // 無限模式狀態 ✨ 新增
    const [isEndlessMode, setIsEndlessMode] = useState(false);
    const [endlessPhase, setEndlessPhase] = useState('playing'); // 紀錄是遊玩中 'playing' 還是看報告 'result'
    const [endlessStats, setEndlessStats] = useState({ correct: 0, total: 0, startTime: 0, mistakes: [], earnedDiamonds: 0, timeSpent: 0 });
    const [endlessQuestion, setEndlessQuestion] = useState(null);
    const [endlessSelectedOption, setEndlessSelectedOption] = useState(null);
    const [endlessPool, setEndlessPool] = useState([]);

    // 小遊戲狀態
    const [showGameModal, setShowGameModal] = useState(false);
    const [gameIntro, setGameIntro] = useState(true); // 新增：入場介面狀態
    const [gameQuests, setGameQuests] = useState([]); 
    const [gameOptions, setGameOptions] = useState([]); 
    const [gameSlots, setGameSlots] = useState(Array(5).fill(null)); 
    const [selectedGameOption, setSelectedGameOption] = useState(null); 
    const [gameSubmitted, setGameSubmitted] = useState(false); 
    const [revealingIndex, setRevealingIndex] = useState(-1);

    useEffect(() => {
        const unsub = window.db.collection('systemData').doc('illu').onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                setGlobalDrugs(data.drugs || []);
                setUserFolders(data.folders || []);
                setUnitGroups(data.unitGroups || []);
            } else {
                setGlobalDrugs([]);
                setUserFolders([]);
                setUnitGroups([]);
            }
        });
        return () => unsub();
    }, []);

    // ✨ 解析 MP 欄位的工具函數 (支援最新 & 與 <> 標籤格式)
    const parseMP = (str) => {
        if (!str) return [];
        return str.split('&').map(s => {
            const trimmed = s.trim();
            const match = /<([^>]+)>#(a|i|h|d)/.exec(trimmed);
            if (match) {
                return { content: match[1].trim(), type: match[2], raw: trimmed };
            } else if (trimmed && trimmed !== '無') {
                return { content: trimmed, type: 'normal', raw: trimmed };
            }
            return null;
        }).filter(Boolean);
    };

    // --- 動態計算選項 (全域使用 & 分隔) ---
    const allUnits = useMemo(() => {
        const units = new Set();
        globalDrugs.forEach(d => { if(d.U) d.U.split('&').forEach(u => units.add(u.trim())); });
        return [...units].filter(Boolean);
    }, [globalDrugs]);
    
    const availableMechs = useMemo(() => {
        let pool = selectedUnits.length > 0 ? globalDrugs.filter(d => d.U && selectedUnits.some(su => d.U.split('&').map(x=>x.trim()).includes(su))) : globalDrugs;
        return [...new Set(pool.map(d => d.C).filter(Boolean))];
    }, [globalDrugs, selectedUnits]);

    const availableGroups = useMemo(() => {
        let pool = selectedUnits.length > 0 ? globalDrugs.filter(d => d.U && selectedUnits.some(su => d.U.split('&').map(x=>x.trim()).includes(su))) : globalDrugs;
        const groups = new Set();
        pool.forEach(d => { if(d.S) d.S.split('&').forEach(g => groups.add(g.trim())); });
        return [...groups].filter(Boolean);
    }, [globalDrugs, selectedUnits]);

    const displayedDrugs = useMemo(() => {
        let pool = [];
        if (activeMainTab === 'library') {
            pool = selectedUnits.length > 0 ? globalDrugs.filter(d => d.U && selectedUnits.some(su => d.U.split('&').map(x=>x.trim()).includes(su))) : globalDrugs;
        } else {
            const folder = userFolders.find(f => f.id === selectedFolderId);
            if (folder) pool = globalDrugs.filter(d => folder.drugIds.includes(d.id));
        }

        if (searchQ.trim()) {
            const term = searchQ.toLowerCase();
            pool = pool.filter(d => (d.D || '').toLowerCase().includes(term) || (d.C || '').toLowerCase().includes(term) || (d.S || '').toLowerCase().includes(term) || (d.E || '').toLowerCase().includes(term) || (d.O || '').toLowerCase().includes(term));
        }
        
        if (activeMainTab === 'library') {
            if (selectedMechs.length > 0) pool = pool.filter(d => selectedMechs.includes(d.C));
            if (selectedGroups.length > 0) pool = pool.filter(d => selectedGroups.some(g => (d.S || '').includes(g)));
            if (filterProdrug === 'y') pool = pool.filter(d => d.P?.toLowerCase() === 'y');
            if (filterProdrug === 'n') pool = pool.filter(d => d.P?.toLowerCase() !== 'y');
        }

        // 強制依照 機轉 (C) -> 名稱 (D) 排序
        return pool.sort((a, b) => {
            const cCompare = (a.C || '').localeCompare(b.C || '');
            if (cCompare !== 0) return cCompare;
            return (a.D || '').localeCompare(b.D || '');
        });
    }, [activeMainTab, selectedUnits, selectedFolderId, globalDrugs, userFolders, searchQ, selectedMechs, selectedGroups, filterProdrug]);

    // --- 比較模式切換邏輯 ---
    const toggleCompare = (drug) => {
        if (compareList.some(d => d.id === drug.id)) {
            setCompareList(prev => prev.filter(d => d.id !== drug.id));
        } else {
            if (compareList.length >= 3) return showAlert("最多只能同時選擇 3 個藥物進行比較！");
            setCompareList(prev => [...prev, drug]);
        }
    };

    // --- CRUD 邏輯 ---
    const handleImport = () => {
        if (!importText.trim()) return showAlert("請輸入要匯入的資料！");
        const safeText = importText.replace(/｛/g, '{').replace(/｝/g, '}');
        const regex = /\[\{U\.([\s\S]*?)\}\{P\.([\s\S]*?)\}\{O\.([\s\S]*?)\}\{C\.([\s\S]*?)\}\{D\.([\s\S]*?)\}\{S\.([\s\S]*?)\}\{E\.([\s\S]*?)\}\{MP\.([\s\S]*?)\}\]/g;
        const results = [];
        let match;
        while ((match = regex.exec(safeText)) !== null) {
            results.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                U: match[1].trim(), P: match[2].trim(), O: match[3].trim(), C: match[4].trim(),
                D: match[5].trim(), S: match[6].trim(), E: match[7].trim(), MP: match[8].trim()
            });
        }
        if (results.length === 0) return showAlert("解析失敗，請確認是否符合最新的 8 欄位格式（包含 O 給藥途徑）。");
        window.db.collection('systemData').doc('illu').set({ drugs: [...globalDrugs, ...results] }, { merge: true })
            .then(() => { showAlert(`成功匯入 ${results.length} 筆資料！`); setImportText(''); setShowImportModal(false); });
    };

    const handleSaveEditingDrug = () => {
        if (!editingDrug.D.trim()) return showAlert("藥物名稱不能為空！");
        const isNew = !globalDrugs.some(d => d.id === editingDrug.id);
        const newDrugs = isNew ? [...globalDrugs, { ...editingDrug, id: Date.now().toString() + Math.random().toString(36).substr(2, 5) }] : globalDrugs.map(d => d.id === editingDrug.id ? editingDrug : d);
        window.db.collection('systemData').doc('illu').set({ drugs: newDrugs }, { merge: true })
            .then(() => { showAlert("儲存成功！"); setEditingDrug(null); });
    };

    const handleDeleteUnit = (unitName) => {
        showConfirm(`確定要從全服資料庫永久刪除包含「${unitName}」的所有藥物嗎？此操作無法復原。`, () => {
            const newDrugs = globalDrugs.filter(d => !(d.U && d.U.split('&').map(x=>x.trim()).includes(unitName)));
            window.db.collection('systemData').doc('illu').set({ drugs: newDrugs }, { merge: true })
                .then(() => {
                    showAlert(`已刪除相關單元藥物！`);
                    setSelectedUnits(prev => prev.filter(u => u !== unitName));
                });
        });
    };

    // --- ✨ 單元大資料夾 (群組) 與拖曳邏輯 ---
    const handleCreateUnitGroup = () => {
        if (!isAdmin) return;
        if (!newUnitGroupName.trim()) return showAlert("請輸入大資料夾名稱！");
        const newGroup = { id: Date.now().toString(), name: newUnitGroupName.trim(), units: [] };
        const newGroups = [...unitGroups, newGroup];
        window.db.collection('systemData').doc('illu').set({ unitGroups: newGroups }, { merge: true })
            .then(() => setNewUnitGroupName(''));
    };

    const handleDeleteUnitGroup = (groupId) => {
        if (!isAdmin) return;
        showConfirm("確定刪除此大資料夾嗎？\n(別擔心，裡面的單元不會被刪除，只會被移回「未分類」狀態)", () => {
            const newGroups = unitGroups.filter(g => g.id !== groupId);
            window.db.collection('systemData').doc('illu').set({ unitGroups: newGroups }, { merge: true });
        });
    };

    const handleDropUnitToGroup = (e, targetGroupId) => {
        if (!isAdmin) return;
        e.preventDefault();
        const unitName = e.dataTransfer.getData('unitName');
        if (!unitName) return;

        // 1. 先從所有現有的大資料夾中移除該單元
        let newGroups = unitGroups.map(g => ({ ...g, units: g.units.filter(u => u !== unitName) }));
        
        // 2. 如果目標不是 'ungrouped' (未分類)，則將其加入目標大資料夾
        if (targetGroupId !== 'ungrouped') {
            newGroups = newGroups.map(g => {
                if (g.id === targetGroupId) {
                    return { ...g, units: [...g.units, unitName] };
                }
                return g;
            });
        }

        window.db.collection('systemData').doc('illu').set({ unitGroups: newGroups }, { merge: true });
    };

    // 輔助渲染單一單元 (加入 draggable 屬性)
    const renderUnitItem = (unit) => (
        <div 
            key={unit} 
            draggable={isAdmin}
            onDragStart={(e) => { if(isAdmin) e.dataTransfer.setData('unitName', unit); }}
            className={`w-full flex items-center rounded-xl transition-all border group ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''} shadow-sm ${selectedUnits.includes(unit) ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'}`}
        >
            <button onClick={() => setSelectedUnits(prev => prev.includes(unit) ? prev.filter(x=>x!==unit) : [...prev, unit])} className={`flex-1 text-left px-3 py-2.5 font-bold text-sm truncate ${selectedUnits.includes(unit) ? 'text-emerald-800 dark:text-emerald-400' : 'text-stone-700 dark:text-stone-300'}`}>
                <span className="material-symbols-outlined text-[16px] align-middle mr-1 text-emerald-500">book</span> {unit}
            </button>
            {isAdmin && (
                <button onClick={() => handleDeleteUnit(unit)} className="p-2 mr-1 text-gray-300 hover:text-red-500 transition-colors" title="刪除整個單元">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
            )}
        </div>
    );

    // --- 資料夾管理邏輯 ---
    const handleCreateFolder = () => {
        if (!isAdmin) return;
        if (!newFolderName.trim()) return showAlert("請輸入資料夾名稱！");
        const newFolder = { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), name: newFolderName.trim(), drugIds: [] };
        const newFolders = [...userFolders, newFolder];
        window.db.collection('systemData').doc('illu').set({ folders: newFolders }, { merge: true })
            .then(() => { 
                setNewFolderName(''); 
                if(!folderModalDrug) showAlert("資料夾建立成功！");
            });
    };

    const handleDeleteFolder = (folderId) => {
        if (!isAdmin) return;
        showConfirm("確定要刪除整個資料夾嗎？裡面的收錄紀錄也會一併清除。", () => {
            const newFolders = userFolders.filter(f => f.id !== folderId);
            window.db.collection('systemData').doc('illu').set({ folders: newFolders }, { merge: true })
                .then(() => { showAlert("資料夾已刪除！"); if (selectedFolderId === folderId) setSelectedFolderId(null); });
        });
    };

    const handleRemoveFromFolder = (drugId) => {
        if (!isAdmin) return;
        if (!selectedFolderId) return;
        const newFolders = userFolders.map(f => f.id === selectedFolderId ? { ...f, drugIds: f.drugIds.filter(id => id !== drugId) } : f);
        window.db.collection('systemData').doc('illu').set({ folders: newFolders }, { merge: true })
            .then(() => showAlert("已從資料夾移除該藥物！"));
    };

    const executeSaveToFolder = (folderId) => {
        if (!isAdmin) return;
        if(!folderModalDrug) return;
        const newFolders = userFolders.map(f => {
            if (f.id === folderId) {
                if(f.drugIds.includes(folderModalDrug.id)) {
                    showAlert("此藥物已經在該資料夾中囉！");
                    return f;
                }
                return { ...f, drugIds: [...f.drugIds, folderModalDrug.id] };
            }
            return f;
        });
        
        window.db.collection('systemData').doc('illu').set({ folders: newFolders }, { merge: true })
            .then(() => { 
                showAlert(`已成功收錄至資料夾！`); 
                setFolderModalDrug(null); 
            });
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                const MAX_SIZE = 800;
                if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
                setEditingDrug({...editingDrug, customImg: canvas.toDataURL('image/jpeg', 0.85)});
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    };

   // ✨ 新增：業界最強 Ketcher 化學繪圖編輯器組件 (支援 API 隱藏擷取)
    const KetcherEditorModal = React.memo(({ initialSmiles, onSave, onClose }) => {
        const { useRef, useState } = React;
        const iframeRef = useRef(null);
        const [isSaving, setIsSaving] = useState(false);

        const handleIframeLoad = () => {
            try {
                // 💡 如果是編輯已有的結構，自動從 API 灌入畫布！
                const ketcher = iframeRef.current.contentWindow.ketcher;
                if (ketcher && initialSmiles) {
                    ketcher.setMolecule(initialSmiles);
                }
            } catch (e) {
                console.warn("無法載入初始結構", e);
            }
        };

        const handleAutoSave = async () => {
            setIsSaving(true);
            try {
                const ketcher = iframeRef.current.contentWindow.ketcher;
                if (ketcher) {
                    // 💡 透過 API 直接從畫板偷出 SMILES，使用者完全無感！
                    const smiles = await ketcher.getSmiles();
                    if (!smiles || smiles.trim() === '') {
                        alert("畫布是空的喔！請繪製結構後再儲存。");
                    } else {
                        onSave(smiles);
                    }
                } else {
                    alert("繪圖板尚未載入完成！");
                }
            } catch (error) {
                console.error("儲存失敗", error);
                alert("儲存失敗，請確保畫布內的結構正確無誤。");
            }
            setIsSaving(false);
        };

        return (
            <div className="fixed inset-0 z-[200] bg-stone-900/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
                <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-6xl h-[95vh] rounded-3xl flex flex-col shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
                    
                    <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center bg-white dark:bg-stone-900 shrink-0">
                        <h3 className="font-black text-xl text-stone-800 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-500">draw</span> 專業化學繪圖 (Ketcher)
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined">close</span></button>
                    </div>

                    <div className="flex-1 bg-white dark:bg-stone-800 overflow-hidden relative">
                        <iframe 
                            ref={iframeRef}
                            onLoad={handleIframeLoad}
                            src="/ketcher/index.html" 
                            className="w-full h-full border-0"
                            title="Ketcher Editor"
                        ></iframe>
                    </div>

                    <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shrink-0 flex justify-end items-center gap-3">
                        <div className="text-sm font-bold text-gray-400 mr-auto hidden sm:block">
                            💡 提示：畫完後不需操作畫布內的存檔，直接點擊右方綠色按鈕即可！
                        </div>
                        <button onClick={onClose} className="px-6 py-2.5 font-bold text-gray-500 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors">取消</button>
                        <button 
                            onClick={handleAutoSave} 
                            disabled={isSaving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-black shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-symbols-outlined text-[20px]">save</span>
                            )}
                            {isSaving ? '處理中...' : '一鍵儲存結構'}
                        </button>
                    </div>
                </div>
            </div>
        );
    });

    // ✨ 新增：獨立出產題邏輯，供一般測驗與無限模式共用，並實作選項不重複機制
    const createSingleQuestionData = (drug, globalPool, allowedTypes) => {
        // 確保題目符合藥物擁有的資料
        let validTypes = allowedTypes.filter(t => {
            if (t === 0) return drug.C && drug.C !== '無';
            if (t === 1 || t === 2) return true; // D always exists
            if (t === 3) return (drug.S && drug.S !== '無') || (drug.E && drug.E !== '無') || (drug.O && drug.O !== '無');
            if (t === 4) return drug.MP && drug.MP !== '無';
            return false;
        });
        if (validTypes.length === 0) validTypes = [1, 2]; 
        
        const qType = validTypes[Math.floor(Math.random() * validTypes.length)];
        
        const getMpStr = (d) => {
            if(!d.MP || d.MP === '無') return '無特殊代謝';
            return parseMP(d.MP).map(item => {
                const labels = {a:'[活性]', i:'[無]', h:'[抑制]', d:'[誘導]', normal:''};
                return `${labels[item.type] || ''}${item.content}`;
            }).join(', ');
        };

        let qTextCorrect = ""; 
        let correctVal = "";
        
        if (qType === 0) correctVal = drug.C;
        else if (qType === 1 || qType === 3) correctVal = drug.D; // 用 D 來作為結構圖的唯一識別
        else if (qType === 2) correctVal = drug.D;
        else if (qType === 4) correctVal = getMpStr(drug);

        // ✨ 優化：針對「看結構選藥物(2)」、「看名字選結構(1)」以及「看個論選結構(3)」，
        // 給予同機轉、同字根的藥物較高的被抽中機率，讓選項更具誘答性！
        const checkSimilar = (a, b) => {
            if (!a || !b) return false;
            let n1 = a.toLowerCase(); let n2 = b.toLowerCase();
            // 英文藥名常見字根判斷 (例如 -pril, -olol, -sartan)
            if (n1.length >= 5 && n2.length >= 5 && n1.slice(-4) === n2.slice(-4)) return true;
            if (n1.length >= 4 && n2.length >= 4 && n1.slice(-3) === n2.slice(-3)) return true;
            // 中文藥名常見字尾判斷 (例如 斯, 錠, 黴素)
            if (n1.match(/[\u4e00-\u9fa5]/) && n2.match(/[\u4e00-\u9fa5]/)) {
                if (n1.slice(-2) === n2.slice(-2)) return true;
                if (n1.slice(-1) === n2.slice(-1)) return true;
            }
            return false;
        };

        let distractors = [];
        let shuffledGlobal = [...globalPool].sort((a, b) => {
            let scoreA = Math.random();
            let scoreB = Math.random();
            if (qType === 1 || qType === 2 || qType === 3) {
                if (a.C && drug.C && a.C === drug.C) scoreA += 10;
                if (b.C && drug.C && b.C === drug.C) scoreB += 10;
                if (checkSimilar(a.D, drug.D)) scoreA += 5;
                if (checkSimilar(b.D, drug.D)) scoreB += 5;
            }
            return scoreB - scoreA;
        });
        
        for (let d of shuffledGlobal) {
            if (distractors.length >= 3) break;
            if (d.id === drug.id) continue;
            
            let dVal = "";
            if (qType === 0) { dVal = d.C; if (!dVal || dVal === '無' || dVal === correctVal || distractors.some(x=>x.val === dVal)) continue; }
            else if (qType === 1 || qType === 3) { dVal = d.D; if (dVal === correctVal || distractors.some(x=>x.val === dVal)) continue; }
            else if (qType === 2) { dVal = d.D; if (dVal === correctVal || distractors.some(x=>x.val === dVal)) continue; }
            else if (qType === 4) { dVal = getMpStr(d); if (dVal === '無特殊代謝' || dVal === correctVal || distractors.some(x=>x.val === dVal)) continue; }
            
            distractors.push({ drug: d, val: dVal });
        }
        
        // 若題庫不足，補足選項 (極端情況)
        while (distractors.length < 3) {
            const extra = shuffledGlobal.find(d => d.id !== drug.id && !distractors.some(x => x.drug.id === d.id));
            if(extra) distractors.push({ drug: extra, val: qType === 0 ? extra.C||'無' : extra.D });
            else break;
        }

        const options = [{drug, val: correctVal}, ...distractors].sort(() => 0.5 - Math.random());
        const correctIdx = options.findIndex(o => o.drug.id === drug.id);
        const answerLetter = ['A', 'B', 'C', 'D'][correctIdx];

        let optHtmls = [];
        if (qType === 0) {
            qTextCorrect = `藥物 **${drug.D}** 的主要機轉分類為何？`;
            optHtmls = options.map(o => o.val);
        } else if (qType === 1) {
            qTextCorrect = `下列何者為藥物 **${drug.D}** 的化學結構？`;
            optHtmls = options.map(o => o.drug.customImg ? `<img src="${o.drug.customImg}" style="max-height:120px; border-radius:8px;"/>` : window.parseSmilesToHtml(o.drug.customSmiles ? `<<:${o.drug.customSmiles}:>>` : `<<:${o.drug.D}:>>`));
        } else if (qType === 2) {
            const structDisplay = drug.customImg ? `<img src="${drug.customImg}" style="max-height:160px; display:inline-block; border-radius:8px;"/>` : window.parseSmilesToHtml(drug.customSmiles ? `<<:${drug.customSmiles}:>>` : `<<:${drug.D}:>>`);
            qTextCorrect = `請問下列化學結構屬於哪一個藥物？<br><br><div style="background:white; padding:10px; border-radius:12px; display:inline-block; border:1px solid #e5e7eb;">${structDisplay}</div>`;
            optHtmls = options.map(o => o.val);
        } else if (qType === 3) {
            let clues = [];
            if (drug.U) clues.push(`單元：${drug.U}`);
            if (drug.S && drug.S !== '無') clues.push(`特徵基團：${drug.S}`);
            if (drug.E && drug.E !== '無') clues.push(`特殊點：${drug.E}`);
            if (drug.O && drug.O !== '無') clues.push(`給藥：${drug.O}`);
            qTextCorrect = `請根據以下個論特徵，選出正確的化學結構：<br><div style="background:#f3f4f6; padding:10px; border-radius:8px; margin-top:8px; font-weight:bold; color:#374151;">${clues.join('<br>')}</div>`;
            optHtmls = options.map(o => o.drug.customImg ? `<img src="${o.drug.customImg}" style="max-height:120px; border-radius:8px;"/>` : window.parseSmilesToHtml(o.drug.customSmiles ? `<<:${o.drug.customSmiles}:>>` : `<<:${o.drug.D}:>>`));
        } else if (qType === 4) {
            qTextCorrect = `關於藥物 **${drug.D}** 的代謝酵素與特性，下列何者正確？`;
            optHtmls = options.map(o => o.val);
        }

        const expMpStr = parseMP(drug.MP).map(item => {
            const labels = {a:'[活性]', i:'[無活性]', h:'[抑制劑]', d:'[誘導劑]', normal:''};
            return `${labels[item.type] || ''}${item.content}`;
        }).join(', ') || '無';
        const expStruct = drug.customImg ? `<img src="${drug.customImg}" style="max-height:100px; float:right; margin-left:10px;"/>` : `<div style="float:right; margin-left:10px; width:150px;">${window.parseSmilesToHtml(drug.customSmiles ? `<<:${drug.customSmiles}:>>` : `<<:${drug.D}:>>`)}</div>`;
        const expHtml = `<div style="overflow:hidden;">${expStruct}【圖鑑解析】<br>藥名：<strong style="color:#10b981;">${drug.D}</strong><br>單元：${drug.U}<br>給藥：${drug.O || '無'}<br>機轉：${drug.C}<br>特徵基團：${drug.S || '無'}<br>特殊點：${drug.E || '無'}<br>代謝/酵素：${expMpStr}</div>`;

        return { qType, drug, options, correctIdx, answerLetter, qTextCorrect, optHtmls, expHtml };
    };

    const handleGenerateQuiz = async () => {
        const count = parseInt(quizCount) || 10;
        let pool = activeMainTab === 'myFolders' ? displayedDrugs : (quizSelectedUnits.length > 0 ? globalDrugs.filter(d => d.U && quizSelectedUnits.some(su => d.U.split('&').map(x=>x.trim()).includes(su))) : globalDrugs);

        // ✨ 修正：嚴格過濾題庫，只留下符合「已勾選題型」所需欄位的藥物，避免抽到沒資料的藥物導致系統妥協換題型
        pool = pool.filter(drug => {
            return quizSelectedTypes.some(t => {
                if (t === 0) return drug.C && drug.C !== '無';
                if (t === 1 || t === 2) return true;
                if (t === 3) return (drug.S && drug.S !== '無') || (drug.E && drug.E !== '無') || (drug.O && drug.O !== '無');
                if (t === 4) return drug.MP && drug.MP !== '無';
                return false;
            });
        });

        if (pool.length < 4) return showAlert("符合勾選題型與範圍的藥物數量不足 (至少需4筆)！請試著擴大範圍或增加勾選的題型。");
        if (quizSelectedTypes.length === 0) return showAlert("請至少選擇一種題型！");
        
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, count);
        
        let textContent = ''; let htmlContent = ''; let expHtmlOutput = ''; let answersArray = [];

        selected.forEach((drug, idx) => {
            const qNum = idx + 1;
            const qData = createSingleQuestionData(drug, globalDrugs, quizSelectedTypes);
            
            const pureTextQ = qData.qTextCorrect.replace(/<[^>]+>/g, '');
            textContent += `[Q.${qNum}]\n[#圖鑑測驗|@1]\n${pureTextQ}\n[A] 選項略\n[B] 選項略\n[C] 選項略\n[D] 選項略\n[End]\n\n`;
            
            htmlContent += `[Q.${qNum}]<br><div class="qlib-question-tags" style="color:#a8a29e; font-size:0.85em; font-weight:800; margin-bottom:6px; padding:2px 8px; background:rgba(0,0,0,0.04); display:inline-block; border-radius:6px;">[ #藥物圖鑑 | 難度:1 ]</div><br><div style="font-size:1.1em; margin-bottom:12px;">${qData.qTextCorrect}</div>`;
            ['A', 'B', 'C', 'D'].forEach((letter, i) => { htmlContent += `[${letter}] <div style="display:inline-block; vertical-align:middle;">${qData.optHtmls[i]}</div><br>`; });
            htmlContent += `[End]<br><br>`;
            
            answersArray.push(qData.answerLetter);
            expHtmlOutput += `[A.${qNum}]<br>${qData.expHtml}<br>[End]<br><br>`;
        });

        const quizId = Date.now().toString();
        let scopeName = activeMainTab === 'myFolders' ? (userFolders.find(f=>f.id===selectedFolderId)?.name || '我的收錄') : (quizSelectedUnits.length > 0 ? quizSelectedUnits.join(', ') : '全庫大亂鬥');
        const testName = `圖鑑特訓 - ${scopeName}`;
        
        const quizData = {
            id: quizId, testName, folder: '藥物圖鑑', numQuestions: selected.length, maxScore: 100, roundScore: true, correctAnswersInput: answersArray.join(','),
            publishAnswers: true, allowPeek: true, hasSeparatedContent: true, isCompleted: false, userAnswers: Array(selected.length).fill(''), starred: Array(selected.length).fill(false),
            notes: Array(selected.length).fill(''), peekedAnswers: Array(selected.length).fill(false), createdAt: window.firebase.firestore.FieldValue.serverTimestamp(), updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        };

        const compressedText = window.jzCompress ? window.jzCompress(textContent) : textContent;
        const compressedHtml = window.jzCompress ? window.jzCompress(htmlContent) : htmlContent;
        const compressedExp = window.jzCompress ? window.jzCompress(expHtmlOutput) : expHtmlOutput;
        const contentData = { questionText: compressedText, questionHtml: compressedHtml, explanationHtml: compressedExp };

        try {
            await window.db.collection('users').doc(user.uid).collection('quizzes').doc(quizId).set(quizData);
            await window.db.collection('users').doc(user.uid).collection('quizContents').doc(quizId).set(contentData);
            setShowQuizModal(false);
            if (onContinueQuiz) onContinueQuiz({ ...quizData, ...contentData });
        } catch (err) { showAlert("試卷產生失敗：" + err.message); }
    };

    // ✨ 新增：無限模式控制邏輯
    const startEndlessMode = () => {
        let pool = activeMainTab === 'myFolders' ? displayedDrugs : (quizSelectedUnits.length > 0 ? globalDrugs.filter(d => d.U && quizSelectedUnits.some(su => d.U.split('&').map(x=>x.trim()).includes(su))) : globalDrugs);
        
        // ✨ 修正：嚴格過濾題庫，確保無限模式也不會出到使用者沒勾選的題型
        pool = pool.filter(drug => {
            return quizSelectedTypes.some(t => {
                if (t === 0) return drug.C && drug.C !== '無';
                if (t === 1 || t === 2) return true;
                if (t === 3) return (drug.S && drug.S !== '無') || (drug.E && drug.E !== '無') || (drug.O && drug.O !== '無');
                if (t === 4) return drug.MP && drug.MP !== '無';
                return false;
            });
        });

        if (pool.length < 4) return showAlert("符合勾選題型與範圍的藥物數量不足 (至少需4筆)！請試著擴大範圍或增加勾選的題型。");
        if (quizSelectedTypes.length === 0) return showAlert("請至少選擇一種題型！");
        
        setShowQuizModal(false);
        setEndlessPool(pool);
        setEndlessStats({ correct: 0, total: 0, startTime: Date.now(), mistakes: [], earnedDiamonds: 0, timeSpent: 0 });
        setIsEndlessMode(true);
        setEndlessPhase('playing');
        nextEndlessQuestion(pool, 0);
    };

    const nextEndlessQuestion = (pool = endlessPool, currentTotal = endlessStats.total) => {
        setEndlessSelectedOption(null);
        const randomDrug = pool[Math.floor(Math.random() * pool.length)];
        const qData = createSingleQuestionData(randomDrug, globalDrugs, quizSelectedTypes);
        setEndlessQuestion(qData);
    };

    const handleEndlessOptionClick = (idx) => {
        if (endlessSelectedOption !== null) return;
        setEndlessSelectedOption(idx);
        
        const isCorrect = idx === endlessQuestion.correctIdx;
        const newTotal = endlessStats.total + 1;
        
        setEndlessStats(prev => {
            let newMistakes = prev.mistakes;
            if (!isCorrect) {
                // 如果答錯了，記錄這題原本正確的藥物 (並防止重複陣列)
                if (!newMistakes.some(d => d.id === endlessQuestion.drug.id)) {
                    newMistakes = [...newMistakes, endlessQuestion.drug];
                }
            }
            return {
                ...prev,
                total: newTotal,
                correct: isCorrect ? prev.correct + 1 : prev.correct,
                mistakes: newMistakes
            };
        });

        // 移除自動跳轉的 setTimeout，改由畫面上的「下一題」按鈕手動觸發
    };

    const quitEndlessMode = async () => {
        const timeSpent = Math.floor((Date.now() - endlessStats.startTime) / 1000);
        const earnedDiamonds = endlessStats.correct;
        
        setEndlessStats(prev => ({ ...prev, earnedDiamonds, timeSpent }));
        setEndlessPhase('result'); // 停止遊戲，切換為顯示結算報表
        
        if (earnedDiamonds > 0) {
            try {
                const userRef = window.db.collection('users').doc(user.uid);
                await userRef.set({
                    mcData: { diamonds: window.firebase.firestore.FieldValue.increment(earnedDiamonds) }
                }, { merge: true });
            } catch (e) {
                console.error("結算失敗：" + e.message);
            }
        }
    };

    // --- ✨ 村民小遊戲：出題限制優化與動態揭曉邏輯 ---
    const handleInitGame = () => {
        const validDrugs = globalDrugs.filter(d => d.C || d.S || d.E || d.MP || d.O);
        if (validDrugs.length < 10) return showAlert('全服題庫數量不足10題，無法開啟遊戲！');

        const villagerNames = ['老村長 傑克', '鐵匠 布魯斯', '牧師 瑪莉亞', '農夫 湯姆', '學者 艾莉絲', '獵人 羅賓', '商人 霍華德', '吟遊詩人 琴', '衛兵 隊長', '藥草學家 莉亞'].sort(() => 0.5 - Math.random());

        let validGame = false;
        let quests = [];
        let options = [];
        let attempts = 0;

        while (!validGame && attempts < 100) {
            attempts++;
            const shuffled = [...validDrugs].sort(() => 0.5 - Math.random());
            const potentialTargets = shuffled.slice(0, 5);
            const potentialDistractors = shuffled.slice(5, 10);
            const all10 = [...potentialTargets, ...potentialDistractors];

            quests = [];
            let allUnique = true;

            for (let i = 0; i < potentialTargets.length; i++) {
                const t = potentialTargets[i];
                const possibleHints = [];
                const vName = villagerNames[i];
                
                if (t.C && t.C !== '無' && all10.filter(d => d.C === t.C).length === 1) {
                    possibleHints.push({ hint: `哎呀，最近村裡需要機轉是「${t.C}」的草藥，你能幫幫忙嗎？` });
                }

                if (t.O) {
                    const oList = t.O.split('&').map(x=>x.trim()).filter(x => x && x !== '無');
                    oList.forEach(oItem => {
                        if (all10.filter(d => d.O && d.O.split('&').map(x=>x.trim()).includes(oItem)).length === 1) {
                            possibleHints.push({ hint: `聽說有種藥可以藉由「${oItem}」途徑來給藥，村裡剛好缺這個，快去幫我找找！` });
                        }
                    });
                }

                if (t.S) {
                    const sList = t.S.split('&').map(x=>x.trim()).filter(x => x && x !== '無' && x.length >= 3);
                    sList.forEach(sItem => {
                        if (all10.filter(d => d.S && d.S.split('&').map(x=>x.trim()).includes(sItem)).length === 1) {
                            possibleHints.push({ hint: `我祖傳的配方裡，一定要有「${sItem}」這個結構的藥，拜託你了！` });
                        }
                    });
                }

                if (t.E) {
                    const eList = t.E.split('&').map(x=>x.trim()).filter(x => x && x !== '無' && x.length >= 3);
                    eList.forEach(eItem => {
                        if (all10.filter(d => d.E && d.E.split('&').map(x=>x.trim()).includes(eItem)).length === 1) {
                            possibleHints.push({ hint: `冒險者！我急需一個特點是「${eItem}」的神奇藥物來救命！` });
                        }
                    });
                }

                if (t.MP) {
                    const mpList = parseMP(t.MP);
                    mpList.forEach(mpItem => {
                        const isUnique = all10.filter(d => d.MP && parseMP(d.MP).some(x => x.type === mpItem.type && x.content === mpItem.content)).length === 1;
                        if (isUnique) {
                            if (mpItem.type === 'a') possibleHints.push({ hint: `咳咳...我需要一個服下後，代謝會產生「活性產物 (${mpItem.content})」的藥方！` });
                            if (mpItem.type === 'i') possibleHints.push({ hint: `聽說有種藥代謝會走「${mpItem.content}」變成無活性，你能找來給我研究嗎？` });
                            if (mpItem.type === 'h') possibleHints.push({ hint: `村裡的怪物太強了，急需「${mpItem.content}」的抑制劑來削弱它們！` });
                            if (mpItem.type === 'd') possibleHints.push({ hint: `魔法實驗需要會「誘導 ${mpItem.content}」的藥物，快去幫我找找！` });
                        }
                    });
                }

                if (possibleHints.length === 0) {
                    allUnique = false;
                    break;
                }
                quests.push({ drug: t, hint: possibleHints[Math.floor(Math.random() * possibleHints.length)].hint, villagerName: vName });
            }

            if (allUnique) {
                validGame = true;
                options = all10;
            }
        }

        if (!validGame) return showAlert('目前題庫難以產生不重複提示的題目，請嘗試擴充圖鑑特徵！');

        setGameQuests(quests);
        setGameOptions(options.map(d=>d.D).sort(()=>0.5 - Math.random()));
        setGameSlots(Array(5).fill(null));
        setSelectedGameOption(null);
        setGameSubmitted(false);
        setRevealingIndex(-1);
        setGameIntro(true); // 開啟遊戲時先顯示入場介面
        setShowGameModal(true);
    };

    const handleGameSlotClick = (index) => {
        // 如果已經結算，點擊任何格子都可以開啟圖鑑（不論對錯）
        if (gameSubmitted) {
            // 優先顯示該格子目前放的藥物
            const drugName = gameSlots[index] || gameQuests[index].drug.D;
            const drug = globalDrugs.find(d => d.D === drugName);
            if (drug) setViewingDrug(drug);
            return;
        }

        if (selectedGameOption) {
            const newSlots = [...gameSlots];
            if(newSlots[index]) {
                setGameOptions(prev => [...prev, newSlots[index]]); 
            }
            newSlots[index] = selectedGameOption;
            setGameSlots(newSlots);
            setGameOptions(prev => prev.filter(o => o !== selectedGameOption));
            setSelectedGameOption(null);
        } else if (gameSlots[index]) {
            setGameOptions(prev => [...prev, gameSlots[index]]);
            const newSlots = [...gameSlots];
            newSlots[index] = null;
            setGameSlots(newSlots);
        }
    };

    const handleGameSubmit = () => {
        if(gameSlots.includes(null)) return showAlert("還有村民沒有拿到藥物喔！");
        setGameSubmitted(true);
        setRevealingIndex(0); // 觸發逐一揭曉動畫
    };

    // 動畫揭曉計時器與結算邏輯
    useEffect(() => {
        if (gameSubmitted && revealingIndex >= 0 && revealingIndex < 5) {
            const timer = setTimeout(() => {
                setRevealingIndex(prev => prev + 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (gameSubmitted && revealingIndex === 5) {
                        let correctCount = 0;
                        gameSlots.forEach((ans, i) => { if(ans === gameQuests[i].drug.D) correctCount++; });

                        if (correctCount >= 4) {
                            const rewardDiamonds = correctCount === 5 ? 100 : 50;
                            const today = new Date().toLocaleDateString('en-CA');
                            const userRef = window.db.collection('users').doc(user.uid);
                            userRef.get().then(doc => {
                                const stats = doc.data()?.illuGameStats || {};
                                let count = stats.date === today ? stats.count : 0;
                                if(count >= 5) {
                                    showAlert(`恭喜答對 ${correctCount} 題！但你今天已經領取過 5 次報酬，明天再來賺鑽石吧！`);
                                    setRevealingIndex(6); // 防止重複執行
                                    return;
                                }
                                userRef.set({
                                    mcData: { diamonds: window.firebase.firestore.FieldValue.increment(rewardDiamonds) },
                                    illuGameStats: { date: today, count: count + 1 }
                                }, { merge: true }).then(() => {
                                    showAlert(`委託達成！答對 ${correctCount} 題，獲得 ${rewardDiamonds} 顆鑽石！ (今日已領獎 ${count + 1}/5 次)\n\n(提示：點擊任何藥物可查看圖鑑解析)`);
                                    setRevealingIndex(6); 
                                });
                            }).catch(e => showAlert("結算失敗：" + e.message));
                        } else {
                            showAlert(`結算完成！只答對了 ${correctCount} 題，至少需要答對 4 題才能獲得報酬喔。\n\n(提示：點擊場上任何藥物可查看圖鑑解析)`);
                            setRevealingIndex(6); 
                        }
                    }
    }, [gameSubmitted, revealingIndex, gameSlots, gameQuests, user.uid]);

    const toggleArrayItem = (setter, item) => {
        setter(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };

    // ✨ 新增：心智圖資料動態產生邏輯 (移除結構分類，讓藥物直接接在機轉之下)
    const mindMapData = useMemo(() => {
        if (!showMindMapModal) return null;
        
        const root = { name: '藥物心智圖', children: [] };
        const unitMap = {};

        displayedDrugs.forEach(drug => {
            const units = drug.U ? drug.U.split('&').map(u => u.trim()) : ['未分類單元'];
            
            units.forEach(unit => {
                // 如果在全庫分頁且有勾選特定單元，則過濾掉沒選的單元節點
                if (activeMainTab === 'library' && selectedUnits.length > 0 && !selectedUnits.includes(unit)) return;

                if (!unitMap[unit]) unitMap[unit] = { name: unit, children: [], map: {} };
                
                const mech = drug.C || '未分類機轉';
                if (!unitMap[unit].map[mech]) {
                    const mechNode = { name: mech, children: [] };
                    unitMap[unit].children.push(mechNode);
                    unitMap[unit].map[mech] = mechNode;
                }

                // 直接將藥物節點加入機轉底下，不再細分特徵基團
                unitMap[unit].map[mech].children.push({ name: drug.D, drug: drug });
            });
        });

        root.children = Object.values(unitMap);
        return root;
    }, [displayedDrugs, showMindMapModal, activeMainTab, selectedUnits]);

   return (
        <div className="flex h-full w-full bg-[#FCFBF7] dark:bg-stone-900 transition-colors">
            {/* 左側邊欄 */}
            <div className="w-64 border-r border-stone-200 dark:border-stone-700 flex flex-col bg-stone-50 dark:bg-stone-900 shrink-0">
                <div className="flex bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                    <button onClick={() => { setActiveMainTab('library'); setSelectedFolderId(null); }} className={`flex-1 py-3 font-black text-sm flex items-center justify-center gap-1 transition-colors ${activeMainTab === 'library' ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border-b-2 border-emerald-500' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700'}`}>
                        <span className="material-symbols-outlined text-[18px]">library_books</span> 全部圖鑑
                    </button>
                    <button onClick={() => { setActiveMainTab('myFolders'); }} className={`flex-1 py-3 font-black text-sm flex items-center justify-center gap-1 transition-colors ${activeMainTab === 'myFolders' ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border-b-2 border-emerald-500' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700'}`}>
                        <span className="material-symbols-outlined text-[18px]">star</span> 主題收錄
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {activeMainTab === 'library' ? (() => {
                        // ✨ 動態計算哪些單元已經被放進資料夾，哪些是未分類
                        const groupedUnitNames = unitGroups.flatMap(g => g.units);
                        const ungroupedUnits = allUnits.filter(u => !groupedUnitNames.includes(u));

                        return (
                            <>
                                {isAdmin && (
                                    <div className="flex gap-1 mb-3">
                                        <input type="text" placeholder="建立單元大分類..." value={newUnitGroupName} onChange={e => setNewUnitGroupName(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-emerald-300 dark:border-stone-600 rounded-lg outline-none bg-white dark:bg-stone-800 dark:text-white focus:border-emerald-500 shadow-inner" />
                                        <button onClick={handleCreateUnitGroup} className="px-3 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition-colors shadow-sm">建立</button>
                                    </div>
                                )}
                                <button onClick={() => setSelectedUnits([])} className={`w-full text-left px-4 py-3 mb-2 rounded-xl font-bold text-sm transition-all ${selectedUnits.length === 0 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 shadow-sm' : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'}`}>
                                    <span className="material-symbols-outlined text-[16px] align-middle mr-1 text-emerald-500">apps</span> 取消單元篩選 (顯示全部)
                                </button>
                                
                                {/* 顯示大資料夾區塊 (可將單元拖曳至此) */}
                                {unitGroups.map(group => (
                                    <div 
                                        key={group.id} 
                                        onDragOver={e => e.preventDefault()} 
                                        onDrop={e => handleDropUnitToGroup(e, group.id)}
                                        className="border border-emerald-200 dark:border-stone-700 rounded-xl overflow-hidden bg-emerald-50/50 dark:bg-stone-800/50 mb-2 transition-colors hover:border-emerald-400 shadow-sm"
                                    >
                                        <div className="flex justify-between items-center bg-emerald-100/60 dark:bg-stone-800 px-3 py-2">
                                            <button onClick={() => setExpandedUnitGroups(prev => ({...prev, [group.id]: !prev[group.id]}))} className="flex-1 text-left font-bold text-emerald-800 dark:text-emerald-400 text-sm flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[18px]">{expandedUnitGroups[group.id] !== false ? 'folder_open' : 'folder'}</span> 
                                                <span className="truncate">{group.name}</span>
                                                <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded-full ml-auto">{group.units.filter(u => allUnits.includes(u)).length}</span>
                                            </button>
                                            {isAdmin && <button onClick={() => handleDeleteUnitGroup(group.id)} className="text-emerald-600/50 hover:text-red-500 ml-2 transition-colors"><span className="material-symbols-outlined text-[16px]">delete</span></button>}
                                        </div>
                                        {expandedUnitGroups[group.id] !== false && (
                                            <div className="p-2 space-y-1.5 min-h-[48px]">
                                                {group.units.map(u => allUnits.includes(u) ? renderUnitItem(u) : null)}
                                                {group.units.filter(u => allUnits.includes(u)).length === 0 && <div className="text-xs font-bold text-emerald-600/50 dark:text-gray-500 text-center py-2 border-2 border-dashed border-emerald-200 dark:border-stone-600 rounded-lg pointer-events-none">拖曳下方單元至此</div>}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* 未分類的單元區塊 (拖拉回這裡等於移出資料夾) */}
                                <div 
                                    onDragOver={e => { if(isAdmin) e.preventDefault(); }} 
                                    onDrop={e => handleDropUnitToGroup(e, 'ungrouped')}
                                    className="mt-4 pt-2 border-t border-stone-200 dark:border-stone-700 space-y-1.5 min-h-[100px]"
                                >
                                    <div className="text-xs font-black text-gray-400 mb-2 px-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">inbox</span> 未分類單元 {isAdmin && "(可長按拖曳)"}
                                    </div>
                                    {ungroupedUnits.map(unit => renderUnitItem(unit))}
                                    {ungroupedUnits.length === 0 && <div className="text-xs font-bold text-gray-400 text-center py-4 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-lg pointer-events-none">已全數分類完畢！</div>}
                                </div>
                            </>
                        );
                    })() : (
                        <>
                            {isAdmin && (
                                <div className="flex gap-1 mb-2">
                                    <input type="text" placeholder="建立新資料夾..." value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg outline-none bg-white dark:bg-stone-800 dark:text-white" />
                                    <button onClick={handleCreateFolder} className="px-3 py-2 bg-amber-500 text-white rounded-lg font-bold text-sm hover:bg-amber-600 transition-colors">新增</button>
                                </div>
                            )}

                            {userFolders.length === 0 && <div className="text-sm text-gray-400 text-center py-4">目前尚無主題資料夾</div>}
                            {userFolders.map(folder => (
                                <div key={folder.id} className={`w-full flex items-center rounded-xl transition-all border group ${selectedFolderId === folder.id ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 shadow-sm' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'}`}>
                                    <button onClick={() => setSelectedFolderId(folder.id)} className="flex-1 text-left px-3 py-3 font-bold text-sm flex justify-between items-center text-stone-700 dark:text-stone-300">
                                        <span className="truncate flex-1"><span className="material-symbols-outlined text-[16px] align-middle mr-1 text-amber-500">folder_open</span> {folder.name}</span>
                                        <span className="text-[10px] bg-stone-200 dark:bg-stone-700 px-2 py-0.5 rounded-full">{folder.drugIds?.length || 0}</span>
                                    </button>
                                    {isAdmin && (
                                        <button onClick={() => handleDeleteFolder(folder.id)} className="p-2 mr-1 text-gray-300 hover:text-red-500 transition-colors" title="刪除整個資料夾">
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* 右側內容區 */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#FCFBF7] dark:bg-stone-900 relative">
                <div className="p-4 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 flex flex-wrap gap-3 items-center justify-between z-10 shrink-0">
                    <div className="flex flex-1 gap-2 min-w-[300px]">
                        <div className="relative flex-1">
                            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
                            <input type="text" placeholder="搜尋藥物名稱、機轉、基團..." value={searchQ} onChange={e => setSearchQ(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 rounded-xl outline-none text-sm font-bold focus:border-emerald-500 transition-colors dark:text-white" />
                        </div>
                        {activeMainTab === 'library' && (
                            <button onClick={() => setShowFilterModal(true)} className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-1">
                                <span className="material-symbols-outlined text-[18px]">tune</span> 進階篩選
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {/* 比較模式切換按鈕 */}
                        <button 
                            onClick={() => { setIsCompareMode(!isCompareMode); setCompareList([]); }} 
                            className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95 flex items-center gap-1 border ${isCompareMode ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-200 border-stone-200 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-600'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">compare_arrows</span> 
                            {isCompareMode ? '退出比較模式' : '進入比較模式'}
                        </button>
                        
                        {!isCompareMode && (
                            <>
                                <button onClick={() => setShowMindMapModal(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[18px]">account_tree</span> 心智圖
                                </button>
                                <button onClick={handleInitGame} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[18px]">sports_esports</span> 村民任務
                                </button>
                                {displayedDrugs.length >= 4 && (
                                    <button onClick={() => {
                                        setQuizSelectedUnits([...selectedUnits]);
                                        setShowQuizModal(true);
                                    }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[18px]">quiz</span> 圖鑑測驗 ({displayedDrugs.length})
                                    </button>
                                )}
                                {isAdmin && (
                                    <button onClick={() => setShowImportModal(true)} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[18px]">download</span> 批次匯入
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {displayedDrugs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-stone-400">
                            <span className="material-symbols-outlined text-[64px] mb-4 opacity-50">science</span>
                            <p className="font-bold">目前範圍內沒有符合的藥物資料</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                            {displayedDrugs.map((drug, index) => {
                                const showDivider = index === 0 || drug.C !== displayedDrugs[index - 1].C;
                                return (
                                    <React.Fragment key={drug.id}>
                                        {showDivider && (
                                            <div className="col-span-full flex items-center gap-4 mt-2 mb-1">
                                                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                                    機轉分類：{drug.C || '無分類'}
                                                </div>
                                                <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700"></div>
                                            </div>
                                        )}
                                        <DrugCard 
                                            drug={drug} 
                                            onSelect={setViewingDrug} 
                                            onAddFolder={setFolderModalDrug} 
                                            onRemoveFromFolder={handleRemoveFromFolder} 
                                            onEdit={setEditingDrug} 
                                            isAdmin={isAdmin} 
                                            isMyFolder={activeMainTab === 'myFolders'}
                                            isCompareMode={isCompareMode}
                                            isSelectedForCompare={compareList.some(d => d.id === drug.id)}
                                            toggleCompare={toggleCompare}
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 比較模式的底部浮動列 */}
                {isCompareMode && (
                    <div className="absolute bottom-0 left-0 w-full bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 p-4 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
                        <div className="font-bold text-stone-700 dark:text-white">
                            已選擇 <span className="text-amber-500">{compareList.length} / 3</span> 個藥物
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setCompareList([])} className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-800 dark:hover:text-white transition-colors">清空重選</button>
                            <button 
                                onClick={() => setShowCompareModal(true)} 
                                disabled={compareList.length < 2}
                                className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                            >
                                開始比較
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- Modals --- */}

            {/* 無限模式 Modal */}
            {isEndlessMode && endlessQuestion && (
                <div className="fixed inset-0 z-[150] bg-stone-900/90 backdrop-blur-md flex flex-col items-center p-4 animate-fade-in overflow-y-auto custom-scrollbar">
                    {endlessPhase === 'playing' ? (
                        <>
                            <style>{`
                                /* ✨ 終極防裁切魔法：白底交給外層容器，內部繪圖強制縮小並允許溢出 */
                                .endless-content button > div {
                                    width: 100%;
                                    height: 100%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    background-color: #ffffff !important; /* 強制外層白底 */
                                    border-radius: 12px !important;
                                }
                                /* 1. API 抓圖 (img)：完全還原成最初的呈現方式，並把圖片放到最大！ */
                                .endless-content img {
                                    max-width: 95% !important; /* ✨ 加大到 95% */
                                    max-height: 95% !important; /* ✨ 加大到 95% */
                                    min-height: 120px !important;
                                    object-fit: contain !important;
                                    margin: auto;
                                    background: transparent !important; 
                                }
                                /* 2. Ketcher 繪圖 (svg, canvas)：給予獨立的超厚白色護城河與防裁切機制 */
                                .endless-content svg, .endless-content canvas {
                                    max-width: 55% !important; 
                                    max-height: 55% !important;
                                    min-height: 120px !important;
                                    object-fit: contain !important;
                                    overflow: visible !important; /* 絕對關鍵：允許被切掉的字體溢出原始畫布 */
                                    margin: auto;
                                    background-color: #ffffff !important; 
                                    padding: 20px !important; 
                                    border-radius: 12px !important;
                                    box-shadow: 0 0 0 20px #ffffff !important; 
                                }
                            `}</style>
                            <div className="w-full max-w-3xl flex justify-between items-center mb-4 text-white">
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black text-amber-400 flex items-center gap-2"><span className="material-symbols-outlined">all_inclusive</span> 無限模式</h2>
                                    <div className="text-sm font-bold text-stone-300 mt-1">
                                        已答對：<span className="text-emerald-400">{endlessStats.correct}</span> / {endlessStats.total} 
                                        <span className="ml-3 hidden sm:inline">正確率：{endlessStats.total > 0 ? Math.round((endlessStats.correct/endlessStats.total)*100) : 0}%</span>
                                        <span className="ml-3 hidden sm:inline">耗時：{Math.floor((Date.now() - endlessStats.startTime) / 1000)}s</span>
                                    </div>
                                </div>
                                <button onClick={quitEndlessMode} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-bold border-2 border-rose-500 shadow-lg transition-transform active:scale-95 flex items-center gap-1">
                                    <span className="material-symbols-outlined">logout</span> 結束結算
                                </button>
                            </div>

                            <div className="w-full max-w-3xl bg-white dark:bg-stone-800 rounded-3xl p-6 shadow-2xl flex flex-col relative border border-stone-200 dark:border-stone-700 endless-content">
                                <div className="text-lg md:text-xl font-bold text-stone-800 dark:text-white mb-6 text-center" dangerouslySetInnerHTML={{__html: endlessQuestion.qTextCorrect}}></div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {endlessQuestion.options.map((opt, idx) => {
                                        let btnClass = "bg-stone-50 dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-500 text-stone-700 dark:text-stone-300";
                                        if (endlessSelectedOption !== null) {
                                            if (idx === endlessQuestion.correctIdx) {
                                                btnClass = "bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900/50 dark:border-emerald-500 dark:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)] cursor-pointer hover:scale-[1.02]";
                                            } else if (idx === endlessSelectedOption) {
                                                btnClass = "bg-rose-100 border-rose-500 text-rose-800 dark:bg-rose-900/50 dark:border-rose-500 dark:text-rose-300 cursor-pointer hover:scale-[1.02]";
                                            } else {
                                                btnClass = "bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 opacity-60 cursor-pointer hover:opacity-100";
                                            }
                                        }

                                        return (
                                            <button 
                                                key={idx} 
                                                onClick={() => {
                                                    if (endlessSelectedOption === null) {
                                                        // 尚未作答時：正常點擊選項作答
                                                        handleEndlessOptionClick(idx);
                                                    } else {
                                                        // 已作答時：點擊選項會彈出圖鑑視窗
                                                        setViewingDrug(opt.drug);
                                                    }
                                                }}
                                                className={`w-full p-4 rounded-2xl font-bold flex flex-col items-center justify-center min-h-[140px] transition-all duration-300 transform ${endlessSelectedOption === null ? 'active:scale-95' : ''} ${btnClass}`}
                                            >
                                                <div dangerouslySetInnerHTML={{__html: endlessQuestion.optHtmls[idx]}} className="w-full flex-grow flex items-center justify-center"></div>
                                                {endlessSelectedOption !== null && (
                                                    <div className="mt-3 text-xs font-black opacity-80 flex items-center gap-1 bg-stone-900/10 dark:bg-white/10 px-3 py-1.5 rounded-full shrink-0">
                                                        <span className="material-symbols-outlined text-[14px]">search</span> 點擊查看圖鑑
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {endlessSelectedOption !== null && (
                                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 animate-fade-in">
                                        <div className={`text-center sm:text-left font-black text-lg ${endlessSelectedOption === endlessQuestion.correctIdx ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {endlessSelectedOption === endlessQuestion.correctIdx ? '🎉 答對了！太神啦！' : `❌ 答錯了！正確答案是選項 ${endlessQuestion.answerLetter}`}
                                        </div>
                                        <button 
                                            onClick={() => nextEndlessQuestion(endlessPool, endlessStats.total)}
                                            className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-xl font-black shadow-lg transition-transform active:scale-95 text-lg flex items-center gap-2 w-full sm:w-auto justify-center"
                                        >
                                            下一題 <span className="material-symbols-outlined">arrow_forward</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="bg-[#FCFBF7] dark:bg-stone-800 rounded-3xl p-6 md:p-10 shadow-2xl flex flex-col relative border border-stone-200 dark:border-stone-700 w-full max-w-4xl mt-4 md:mt-10 animate-fade-in-up">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-black text-stone-800 dark:text-white flex items-center justify-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-[36px] text-amber-500">emoji_events</span> 結算報告
                                </h2>
                                <p className="text-stone-500 dark:text-stone-400 font-bold">辛苦了！為你的堅持點讚！</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 flex flex-col items-center shadow-sm">
                                    <div className="text-xs text-stone-500 font-bold mb-1">作答題數</div>
                                    <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{endlessStats.total} 題</div>
                                </div>
                                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 flex flex-col items-center shadow-sm">
                                    <div className="text-xs text-stone-500 font-bold mb-1">答對題數</div>
                                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{endlessStats.correct} 題</div>
                                </div>
                                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 flex flex-col items-center shadow-sm">
                                    <div className="text-xs text-stone-500 font-bold mb-1">正確率</div>
                                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{endlessStats.total > 0 ? Math.round((endlessStats.correct/endlessStats.total)*100) : 0}%</div>
                                </div>
                                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 flex flex-col items-center shadow-sm">
                                    <div className="text-xs text-stone-500 font-bold mb-1">獲得鑽石</div>
                                    <div className="text-2xl font-black text-rose-500 flex items-center gap-1"><span className="material-symbols-outlined text-[20px]">diamond</span>{endlessStats.earnedDiamonds}</div>
                                </div>
                            </div>

                            <div className="w-full border-t border-stone-200 dark:border-stone-700 pt-6">
                                <h3 className="text-lg font-bold text-stone-700 dark:text-stone-300 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-rose-500">error</span> 需複習的藥物圖鑑 ({endlessStats.mistakes.length})
                                </h3>
                                
                                {endlessStats.mistakes.length === 0 ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 text-center text-emerald-600 dark:text-emerald-400 font-black flex flex-col items-center justify-center shadow-inner">
                                        <span className="material-symbols-outlined text-[48px] mb-2">sentiment_very_satisfied</span>
                                        太神啦！你一題都沒有錯！💯
                                    </div>
                                ) : (
                                    <div className="bg-stone-50 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-700">
                                        <div className="text-xs text-stone-500 mb-3 font-bold text-center">💡 點擊下方卡片可直接查看完整圖鑑與解析，亦可點擊愛心收入資料夾喔！</div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[35vh] overflow-y-auto custom-scrollbar p-1">
                                            {endlessStats.mistakes.map(drug => (
                                                <DrugCard 
                                                    key={drug.id}
                                                    drug={drug} 
                                                    onSelect={setViewingDrug} 
                                                    onAddFolder={setFolderModalDrug} 
                                                    onRemoveFromFolder={handleRemoveFromFolder} 
                                                    onEdit={setEditingDrug} 
                                                    isAdmin={isAdmin} 
                                                    isMyFolder={false}
                                                    isCompareMode={false}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex justify-center">
                                <button onClick={() => setIsEndlessMode(false)} className="bg-stone-800 hover:bg-stone-700 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-800 px-8 py-3 rounded-xl font-black shadow-lg transition-transform active:scale-95 text-lg flex items-center gap-2">
                                    完成結算 <span className="material-symbols-outlined">check_circle</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 比較表格 Modal */}
            {showCompareModal && (
                <div className="fixed inset-0 z-[200] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowCompareModal(false)}>
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-6xl rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center bg-white dark:bg-stone-900 shrink-0 rounded-t-3xl">
                            <h3 className="font-black text-xl text-stone-800 dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-amber-500">compare</span> 藥物橫向比較</h3>
                            <button onClick={() => setShowCompareModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-stone-100 dark:bg-stone-700 rounded-full w-8 h-8 flex justify-center items-center transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
                        </div>
                        <div className="p-6 overflow-x-auto custom-scrollbar flex gap-4">
                           {/* ✨ 終極防裁切魔法：白底交給外層容器，內部繪圖強制縮小並允許溢出 */}
                            <style>{`
                                .struct-img-wrapper {
                                    background-color: #ffffff !important; /* 強制外層白底 */
                                    overflow: visible !important; /* 移除外層的裁切限制 */
                                }
                                /* 1. API 抓圖 (img)：完全還原成最初的呈現方式，並把圖片放到最大！ */
                                .struct-img-wrapper img {
                                    max-width: 95% !important; /* ✨ 加大到 95% (若想全滿可改 100%) */
                                    max-height: 95% !important; /* ✨ 加大到 95% */
                                    width: auto !important;
                                    height: auto !important;
                                    object-fit: contain;
                                    margin: auto;
                                    background: transparent !important; 
                                }
                                /* 2. Ketcher 繪圖 (svg, canvas)：縮小本體至 55% 並外擴超大白色安全區，徹底防裁切 */
                                .struct-img-wrapper svg, .struct-img-wrapper canvas {
                                    max-width: 55% !important; 
                                    max-height: 55% !important;
                                    width: auto !important;
                                    height: auto !important;
                                    object-fit: contain;
                                    overflow: visible !important; /* 絕對關鍵：允許被切掉的字體溢出原始畫布 */
                                    margin: auto;
                                    background-color: #ffffff !important; 
                                    padding: 20px !important; /* 撐開內部白色空間 */
                                    border-radius: 12px !important;
                                    box-shadow: 0 0 0 20px #ffffff !important; /* 利用超厚陰影把白色邊界強行往外推 */
                                }
                            `}</style>
                            {compareList.map(drug => (
                                <div key={drug.id} className="flex-1 min-w-[280px] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                                    <div 
                                        className="struct-img-wrapper h-40 w-full flex items-center justify-center bg-stone-50 dark:bg-stone-800 rounded-xl overflow-hidden border border-stone-100 dark:border-stone-700 p-2"
                                        dangerouslySetInnerHTML={{__html: drug.customImg ? `<img src="${drug.customImg}" class="mix-blend-multiply dark:mix-blend-normal" />` : parseSmilesToHtml(drug.customSmiles ? `<<:${drug.customSmiles}:>>` : `<<:${drug.D}:>>`)}}>
                                    </div>
                                    <h4 className="text-xl font-black text-center text-stone-800 dark:text-white border-b border-stone-100 dark:border-stone-700 pb-2">{drug.D}</h4>
                                    
                                    <div>
                                        <div className="text-[10px] text-gray-400 font-bold mb-0.5">單元 (U)</div>
                                        <div className="text-sm font-bold text-stone-700 dark:text-stone-300 break-words">{drug.U ? drug.U.split('&').join(', ') : '無'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-violet-500 font-bold mb-0.5">給藥途徑 (O)</div>
                                        <div className="text-sm font-bold text-stone-700 dark:text-stone-300 break-words">{drug.O ? drug.O.split('&').join(', ') : '無'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-emerald-500 font-bold mb-0.5">機轉 (C)</div>
                                        <div className="text-sm font-bold text-stone-700 dark:text-stone-300">{drug.C || '無'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-amber-500 font-bold mb-0.5">特徵基團 (S)</div>
                                        <div className="text-sm font-bold text-stone-700 dark:text-stone-300 break-words">{drug.S ? drug.S.split('&').join(', ') : '無'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-cyan-500 font-bold mb-0.5">特殊點 (E)</div>
                                        <div className="text-sm font-bold text-stone-700 dark:text-stone-300 break-words">{drug.E ? drug.E.split('&').join(', ') : '無'}</div>
                                    </div>
                                    <div className="mt-auto pt-2">
                                        <div className="text-[10px] text-rose-500 font-bold mb-1">酵素/代謝 (MP)</div>
                                        <div className="flex flex-wrap gap-1">
                                            {(() => {
                                                const parsedMP = parseMP(drug.MP);
                                                if (parsedMP.length === 0) return <span className="text-stone-500 text-xs font-bold">無</span>;
                                                return parsedMP.map((item, idx) => {
                                                    if (item.type === 'normal') return <span key={idx} className="bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 px-1.5 py-0.5 rounded text-[10px] font-bold border border-stone-200 dark:border-stone-700">{item.content}</span>;
                                                    let style = {}; let label = '';
                                                    if (item.type === 'a') { style = 'bg-rose-100 border-rose-300 text-rose-800'; label = '活性'; }
                                                    if (item.type === 'i') { style = 'bg-gray-100 border-gray-300 text-gray-700'; label = '無活性'; }
                                                    if (item.type === 'h') { style = 'bg-amber-100 border-amber-300 text-amber-800'; label = '抑制'; }
                                                    if (item.type === 'd') { style = 'bg-indigo-100 border-indigo-300 text-indigo-800'; label = '誘導'; }
                                                    return (
                                                        <div key={idx} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${style}`}>
                                                            <span className="font-black bg-white/50 px-1 rounded-sm">{label}</span> {item.content}
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 村民遊戲 Modal */}
            {showGameModal && (
                <div className="fixed inset-0 z-[170] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in font-mono">
                    {gameIntro ? (
                        <div className="bg-[#f4e4bc] border-8 border-[#8b5a2b] rounded-2xl p-8 max-w-2xl w-full text-center shadow-2xl relative">
                            <button onClick={() => setShowGameModal(false)} className="absolute top-4 right-4 text-stone-800 hover:text-red-600 font-bold text-xl transition-colors"><span className="material-symbols-outlined">close</span></button>
                            <h2 className="text-4xl font-black text-[#5c3a21] mb-6 tracking-widest drop-shadow-sm">⚔️ 村民的委託 ⚔️</h2>
                            <div className="bg-[#8b5a2b]/10 p-6 rounded-xl border-2 border-[#8b5a2b]/30 mb-8">
                                <p className="text-lg text-stone-800 font-bold leading-relaxed mb-4">
                                    村莊爆發了不明疾病，村民們急需特定的藥物來治療！<br/>
                                    請根據他們的描述，從下方的選項中挑選出正確的藥物交給他們。
                                </p>
                                <ul className="text-left inline-block text-stone-700 font-bold space-y-2 bg-white/50 p-4 rounded-lg border border-[#8b5a2b]/20">
                                    <li>💎 答對 <span className="text-red-600 font-black">4</span> 題：獲得 <span className="text-amber-600 font-black">50</span> 顆鑽石</li>
                                    <li>💎 全對 <span className="text-red-600 font-black">5</span> 題：獲得 <span className="text-amber-600 font-black">100</span> 顆鑽石</li>
                                    <li className="text-sm text-stone-500 mt-2">※ 每日最多可領取 5 次報酬</li>
                                </ul>
                            </div>
                            <button onClick={() => setGameIntro(false)} className="bg-emerald-600 hover:bg-emerald-500 border-b-4 border-emerald-800 text-white text-2xl font-black px-12 py-4 rounded-xl shadow-xl transition-transform active:translate-y-1 active:border-b-0">
                                接受委託
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="w-full max-w-6xl flex justify-between items-center mb-4 text-white">
                                <h2 className="text-2xl font-black text-amber-400 flex items-center gap-2">村民的委託</h2>
                                <button onClick={() => setShowGameModal(false)} className="bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded-xl font-bold border-2 border-stone-600 transition-colors">離開村莊</button>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 w-full mb-6 max-w-6xl">
                                {gameQuests.map((q, i) => {
                                    let isRevealed = gameSubmitted && i <= revealingIndex;
                                    let slotClass = '';
                                    
                                    if (isRevealed) {
                                        if (gameSlots[i] === q.drug.D) {
                                            slotClass = 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'; 
                                        } else {
                                            slotClass = 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'; 
                                        }
                                    } else {
                                        slotClass = gameSlots[i] ? 'bg-stone-500 border-stone-400 text-white' : 'bg-black/30 border-black/50 text-white/50 hover:bg-black/40'; 
                                    }

                                    return (
                                        <div key={i} className="bg-[#8b5a2b] border-4 border-[#5c3a21] rounded-xl p-3 flex flex-col shadow-xl relative">
                                            {isRevealed && (
                                                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center z-10 font-black border-2 border-white animate-fade-in" style={{backgroundColor: gameSlots[i] === q.drug.D ? '#10b981' : '#ef4444'}}>
                                                    <span className="material-symbols-outlined text-[18px] text-white">{gameSlots[i] === q.drug.D ? 'check' : 'close'}</span>
                                                </div>
                                            )}
                                            
                                            {/* ✨ 村民頭像與名稱 */}
                                            <div className="flex flex-col items-center mb-2">
                                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#d4b48c] bg-[#e6d0a7] shadow-inner mb-1 flex items-center justify-center">
                                                    <img src="https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/download%20(1).png" alt="村民" className="w-10 h-10 object-contain drop-shadow-md" />
                                                </div>
                                                <span className="text-[10px] font-black text-amber-100 bg-black/50 px-2 py-0.5 rounded-full">{q.villagerName}</span>
                                            </div>

                                            <div className="flex flex-col items-center mb-3 text-center">
                                                <div className="bg-[#f4e4bc] text-stone-900 p-2 rounded-lg text-xs font-bold leading-relaxed border-2 border-[#d4b48c] relative w-full">
                                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#d4b48c]"></div>
                                                    {q.hint}
                                                </div>
                                            </div>
                                            
                                            {/* 揭曉時的動畫與作答狀態 */}
                                            <div 
                                                onClick={() => {
                                                    if (!gameSubmitted) handleGameSlotClick(i);
                                                    else {
                                                        const d = globalDrugs.find(x => x.D === (gameSlots[i] || q.drug.D));
                                                        if(d) setViewingDrug(d);
                                                    }
                                                }}
                                                onDragOver={e => { if(!gameSubmitted) e.preventDefault(); }}
                                                onDrop={e => {
                                                    if (gameSubmitted) return;
                                                    const drugName = e.dataTransfer.getData('text/plain');
                                                    if(drugName) {
                                                        const newSlots = [...gameSlots];
                                                        if(newSlots[i]) setGameOptions(prev => [...prev, newSlots[i]]);
                                                        newSlots[i] = drugName;
                                                        setGameSlots(newSlots);
                                                        setGameOptions(prev => prev.filter(o => o !== drugName));
                                                    }
                                                }}
                                                className={`mt-auto min-h-[64px] border-2 flex flex-col items-center justify-center text-sm font-black p-1 text-center transition-all cursor-pointer rounded-lg shadow-inner ${isRevealed ? 'animate-fade-in' : ''} ${slotClass} ${!gameSubmitted ? 'border-dashed' : ''}`}
                                            >
                                                {!isRevealed && gameSubmitted ? (
                                                    <span className="material-symbols-outlined animate-spin text-white/50">hourglass_empty</span>
                                                ) : (
                                                    <>
                                                        <span>{gameSlots[i] || '點擊/拖曳藥物'}</span>
                                                        {isRevealed && gameSlots[i] !== q.drug.D && (
                                                            <span className="text-[10px] text-red-100 mt-1 pt-1 border-t border-red-400/50 block w-full">正解: {q.drug.D}</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className={`w-full max-w-6xl bg-[#3d3d3d] border-4 border-[#2b2b2b] rounded-xl p-4 shadow-xl transition-opacity ${gameSubmitted ? 'opacity-80' : ''}`}>
                                <div className="text-gray-300 font-bold mb-3 text-sm flex items-center justify-between">
                                    <span>請選擇對應的藥物 (點選藥物後再點空格，或直接拖曳)：</span>
                                    <span className="text-amber-400 font-black flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">diamond</span> 獎勵 50 ~ 100</span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {gameOptions.map((opt, i) => (
                                        <div 
                                            key={i}
                                            draggable={!gameSubmitted}
                                            onDragStart={e => e.dataTransfer.setData('text/plain', opt)}
                                            onClick={() => {
                                                if(!gameSubmitted) setSelectedGameOption(selectedGameOption === opt ? null : opt);
                                                else {
                                                    const d = globalDrugs.find(x => x.D === opt);
                                                    if (d) setViewingDrug(d);
                                                }
                                            }}
                                            className={`px-4 py-2 rounded-lg font-black text-sm cursor-pointer border-b-4 transition-transform active:scale-95 shadow-md ${selectedGameOption === opt ? 'bg-amber-400 border-amber-600 text-amber-900 -translate-y-1' : 'bg-stone-200 border-stone-400 text-stone-800 hover:bg-white'}`}
                                        >
                                            {opt}
                                        </div>
                                    ))}
                                    {gameOptions.length === 0 && <div className="text-emerald-400 font-bold text-center w-full py-2">藥物已全部分配完畢，請點擊下方結算！</div>}
                                </div>
                            </div>
                            
                            {gameSubmitted && revealingIndex >= 6 ? (
                                <button onClick={() => setShowGameModal(false)} className="mt-6 bg-stone-600 hover:bg-stone-500 border-b-4 border-stone-800 text-white text-xl font-black px-12 py-3 rounded-xl shadow-xl transition-transform active:translate-y-1 active:border-b-0">
                                    離開村莊
                                </button>
                            ) : gameSubmitted ? (
                                <button disabled className="mt-6 bg-emerald-600/50 border-b-4 border-emerald-800/50 text-white/50 text-xl font-black px-12 py-3 rounded-xl shadow-xl cursor-not-allowed flex items-center gap-2">
                                    <span className="material-symbols-outlined animate-spin">refresh</span> 結算中...
                                </button>
                            ) : (
                                <button onClick={handleGameSubmit} className="mt-6 bg-emerald-600 hover:bg-emerald-500 border-b-4 border-emerald-800 text-white text-xl font-black px-12 py-3 rounded-xl shadow-xl transition-transform active:translate-y-1 active:border-b-0">
                                    交付任務
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* 資料夾收錄 Modal */}
            {folderModalDrug && (
                <div className="fixed inset-0 z-[160] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setFolderModalDrug(null)}>
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-sm rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center bg-white dark:bg-stone-900">
                            <h3 className="font-black text-lg text-stone-800 dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-amber-500">star</span> 收錄藥物</h3>
                            <button onClick={() => setFolderModalDrug(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><span className="material-symbols-outlined text-[20px]">close</span></button>
                        </div>
                        <div className="p-4 bg-amber-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 font-bold text-center text-stone-800 dark:text-stone-200">
                            欲將 <span className="text-emerald-600 dark:text-emerald-400">{folderModalDrug.D}</span> 加入：
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-3 space-y-2">
                            {userFolders.length === 0 ? (
                                <div className="text-center text-gray-400 text-sm py-4">目前沒有資料夾，請建立一個！</div>
                            ) : (
                                userFolders.map(folder => {
                                    const isIncluded = folder.drugIds.includes(folderModalDrug.id);
                                    return (
                                        <button key={folder.id} onClick={() => executeSaveToFolder(folder.id)} disabled={isIncluded} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all flex justify-between items-center ${isIncluded ? 'bg-gray-100 text-gray-400 dark:bg-stone-800 dark:text-stone-500 cursor-not-allowed' : 'bg-white border border-stone-200 hover:border-amber-300 hover:bg-amber-50 dark:bg-stone-700 dark:border-stone-600 dark:text-white'}`}>
                                            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">folder</span> {folder.name}</span>
                                            {isIncluded && <span className="material-symbols-outlined text-[16px] text-emerald-500">check</span>}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                        <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 flex gap-2">
                            <input type="text" placeholder="新資料夾名稱..." value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg outline-none bg-stone-50 dark:bg-stone-800 dark:text-white" />
                            <button onClick={handleCreateFolder} className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold text-sm hover:bg-amber-600 transition-colors whitespace-nowrap">建立</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 進階篩選 Modal */}
            {showFilterModal && (
                <div className="fixed inset-0 z-[160] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowFilterModal(false)}>
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center bg-white dark:bg-stone-900 shrink-0 rounded-t-3xl">
                            <h3 className="font-black text-xl text-stone-800 dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-stone-500">tune</span> 進階篩選設定</h3>
                            <button onClick={() => setShowFilterModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-stone-100 dark:bg-stone-700 rounded-full w-8 h-8 flex justify-center items-center transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                            
                            <div>
                                <h4 className="font-bold text-sm text-gray-500 mb-3 border-b border-stone-200 dark:border-stone-700 pb-1">前驅藥物</h4>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-700 dark:text-stone-300">
                                        <input type="radio" name="prodrug" checked={filterProdrug === 'all'} onChange={() => setFilterProdrug('all')} className="accent-emerald-500 w-4 h-4" /> 全部顯示
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-700 dark:text-stone-300">
                                        <input type="radio" name="prodrug" checked={filterProdrug === 'y'} onChange={() => setFilterProdrug('y')} className="accent-emerald-500 w-4 h-4" /> 僅顯示前驅藥
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-700 dark:text-stone-300">
                                        <input type="radio" name="prodrug" checked={filterProdrug === 'n'} onChange={() => setFilterProdrug('n')} className="accent-emerald-500 w-4 h-4" /> 排除前驅藥
                                    </label>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-sm text-gray-500 mb-3 border-b border-stone-200 dark:border-stone-700 pb-1">機轉分類 (根據選取的單元動態產生)</h4>
                                <div className="flex flex-wrap gap-2">
                                    {availableMechs.map(mech => (
                                        <label key={mech} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-bold cursor-pointer transition-colors ${selectedMechs.includes(mech) ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-400' : 'bg-white border-stone-200 text-stone-600 dark:bg-stone-800 dark:border-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'}`}>
                                            <input type="checkbox" checked={selectedMechs.includes(mech)} onChange={() => toggleArrayItem(setSelectedMechs, mech)} className="hidden" />
                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedMechs.includes(mech) ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300 dark:bg-stone-700 dark:border-stone-500'}`}>
                                                {selectedMechs.includes(mech) && <span className="material-symbols-outlined text-[10px] text-white font-black">check</span>}
                                            </div>
                                            {mech}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-sm text-gray-500 mb-3 border-b border-stone-200 dark:border-stone-700 pb-1">特殊基團 (根據選取的單元動態產生)</h4>
                                <div className="flex flex-wrap gap-2">
                                    {availableGroups.map(group => (
                                        <label key={group} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-bold cursor-pointer transition-colors ${selectedGroups.includes(group) ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-400' : 'bg-white border-stone-200 text-stone-600 dark:bg-stone-800 dark:border-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'}`}>
                                            <input type="checkbox" checked={selectedGroups.includes(group)} onChange={() => toggleArrayItem(setSelectedGroups, group)} className="hidden" />
                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedGroups.includes(group) ? 'bg-amber-500 border-amber-500' : 'bg-white border-gray-300 dark:bg-stone-700 dark:border-stone-500'}`}>
                                                {selectedGroups.includes(group) && <span className="material-symbols-outlined text-[10px] text-white font-black">check</span>}
                                            </div>
                                            {group}
                                        </label>
                                    ))}
                                </div>
                            </div>

                        </div>
                        <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 shrink-0 flex justify-between rounded-b-3xl">
                            <button onClick={() => { setSelectedMechs([]); setSelectedGroups([]); setFilterProdrug('all'); }} className="px-4 py-2 font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors">清除條件</button>
                            <button onClick={() => setShowFilterModal(false)} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 font-bold px-6 py-2 rounded-xl shadow-sm transition-colors">套用篩選</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. 檢視詳細內容 Modal (結構圖放大顯示更新) */}
            {viewingDrug && (
                <div className="fixed inset-0 z-[180] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingDrug(null)}>
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center bg-white dark:bg-stone-900 shrink-0">
                            <h3 className="font-black text-xl text-stone-800 dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500">science</span> 藥物詳細資訊</h3>
                            <button onClick={() => setViewingDrug(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-stone-100 dark:bg-stone-700 rounded-full w-8 h-8 flex justify-center items-center transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                            
                           {/* ✨ 終極防裁切魔法：白底交給外層容器，內部繪圖強制縮小並允許溢出 */}
                            <style>{`
                                .struct-img-wrapper {
                                    background-color: #ffffff !important; /* 強制外層白底 */
                                    overflow: visible !important; /* 移除外層的裁切限制 */
                                }
                                /* 1. API 抓圖 (img)：完全還原成最初的呈現方式，並把圖片放到最大！ */
                                .struct-img-wrapper img {
                                    max-width: 95% !important; /* ✨ 加大到 95% (若想全滿可改 100%) */
                                    max-height: 95% !important; /* ✨ 加大到 95% */
                                    width: auto !important;
                                    height: auto !important;
                                    object-fit: contain;
                                    margin: auto;
                                    background: transparent !important; 
                                }
                                /* 2. Ketcher 繪圖 (svg, canvas)：縮小本體至 55% 並外擴超大白色安全區，徹底防裁切 */
                                .struct-img-wrapper svg, .struct-img-wrapper canvas {
                                    max-width: 55% !important; 
                                    max-height: 55% !important;
                                    width: auto !important;
                                    height: auto !important;
                                    object-fit: contain;
                                    overflow: visible !important; /* 絕對關鍵：允許被切掉的字體溢出原始畫布 */
                                    margin: auto;
                                    background-color: #ffffff !important; 
                                    padding: 20px !important; /* 撐開內部白色空間 */
                                    border-radius: 12px !important;
                                    box-shadow: 0 0 0 20px #ffffff !important; /* 利用超厚陰影把白色邊界強行往外推 */
                                }
                            `}</style>

                            <div 
                                className="struct-img-wrapper w-full h-64 sm:h-72 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-center overflow-hidden mb-6 p-4" 
                                dangerouslySetInnerHTML={{__html: viewingDrug.customImg ? `<img src="${viewingDrug.customImg}" class="mix-blend-multiply dark:mix-blend-normal" />` : parseSmilesToHtml(viewingDrug.customSmiles ? `<<:${viewingDrug.customSmiles}:>>` : `<<:${viewingDrug.D}:>>`)}}>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1 bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm">
                                    <div className="text-[10px] font-black text-gray-400 mb-1">藥物名稱 (D)</div>
                                    <div className="font-bold text-stone-800 dark:text-white text-lg">{viewingDrug.D}</div>
                                </div>
                                <div className="col-span-2 sm:col-span-1 bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm">
                                    <div className="text-[10px] font-black text-emerald-500 mb-1">機轉分類 (C)</div>
                                    <div className="font-bold text-stone-800 dark:text-white flex items-center gap-2">
                                        {viewingDrug.C}
                                        {viewingDrug.P?.toLowerCase() === 'y' && <span className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-black">前驅藥</span>}
                                    </div>
                                </div>
                                <div className="col-span-2 sm:col-span-1 bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm">
                                    <div className="text-[10px] font-black text-gray-400 mb-1">所屬單元 (U)</div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {viewingDrug.U ? viewingDrug.U.split('&').map((u, i) => (
                                            <span key={i} className="bg-gray-100 text-gray-600 border border-gray-300 dark:bg-stone-800 dark:border-stone-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs font-bold">{u.trim()}</span>
                                        )) : <span className="text-gray-400 text-xs font-bold">無紀錄</span>}
                                    </div>
                                </div>
                                <div className="col-span-2 sm:col-span-1 bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm">
                                    <div className="text-[10px] font-black text-violet-500 mb-1">給藥途徑 (O)</div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {viewingDrug.O ? viewingDrug.O.split('&').map((o, i) => (
                                            <span key={i} className="bg-violet-100 text-violet-700 border border-violet-300 dark:bg-violet-900/40 dark:border-violet-700 dark:text-violet-300 px-2 py-0.5 rounded text-xs font-bold">{o.trim()}</span>
                                        )) : <span className="text-gray-400 text-xs font-bold">無紀錄</span>}
                                    </div>
                                </div>
                                
                                <div className="col-span-2 bg-amber-50 dark:bg-stone-900 p-4 rounded-xl border border-amber-200 dark:border-stone-700 shadow-sm">
                                    <div className="text-xs font-black text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">hub</span> 特殊基團特徵 (S)</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {viewingDrug.S ? viewingDrug.S.split('&').map((s, i) => (
                                            <span key={i} className="bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg text-sm font-bold shadow-sm">{s.trim()}</span>
                                        )) : <span className="text-stone-500 text-sm font-bold">無紀錄</span>}
                                    </div>
                                </div>
                                <div className="col-span-2 bg-cyan-50 dark:bg-stone-900 p-4 rounded-xl border border-cyan-200 dark:border-stone-700 shadow-sm">
                                    <div className="text-xs font-black text-cyan-600 dark:text-cyan-400 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">star</span> 特殊考點、首選、立體活性 (E)</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {viewingDrug.E ? viewingDrug.E.split('&').map((e, i) => (
                                            <span key={i} className="bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-900/40 dark:border-cyan-700 dark:text-cyan-300 px-2.5 py-1 rounded-lg text-sm font-bold shadow-sm">{e.trim()}</span>
                                        )) : <span className="text-stone-500 text-sm font-bold">無紀錄</span>}
                                    </div>
                                </div>
                                
                                <div className="col-span-2 bg-rose-50 dark:bg-stone-900 p-4 rounded-xl border border-rose-200 dark:border-stone-700 shadow-sm">
                                    <div className="text-xs font-black text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">science</span> 代謝酵素與交互作用 (MP)</div>
                                    <div className="flex flex-wrap gap-2">
                                        {(() => {
                                            const parsedMP = parseMP(viewingDrug.MP);
                                            if (parsedMP.length === 0) return <span className="text-stone-500 text-sm font-bold">無紀錄</span>;
                                            
                                            return parsedMP.map((item, idx) => {
                                                if (item.type === 'normal') {
                                                    return <span key={idx} className="bg-white text-stone-700 border border-stone-300 dark:bg-stone-800 dark:border-stone-600 dark:text-stone-300 px-2 py-1 rounded-md text-sm font-bold shadow-sm">{item.content}</span>;
                                                }
                                                
                                                let style = {}; let label = '';
                                                if (item.type === 'a') { style = { container: 'bg-rose-100 border-rose-300 text-rose-800', badge: 'bg-rose-500 text-white' }; label = '活性產物'; }
                                                if (item.type === 'i') { style = { container: 'bg-gray-100 border-gray-300 text-gray-700', badge: 'bg-gray-500 text-white' }; label = '無活性產物'; }
                                                if (item.type === 'h') { style = { container: 'bg-amber-100 border-amber-300 text-amber-800', badge: 'bg-amber-500 text-white' }; label = '抑制劑'; }
                                                if (item.type === 'd') { style = { container: 'bg-indigo-100 border-indigo-300 text-indigo-800', badge: 'bg-indigo-500 text-white' }; label = '誘導劑'; }
                                                
                                                return (
                                                    <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border shadow-sm text-sm font-bold ${style.container}`}>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] leading-none ${style.badge}`}>{label}</span>
                                                        {item.content}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shrink-0 flex justify-end gap-3">
                            {isAdmin && (
                                <>
                                    <button onClick={() => { setViewingDrug(null); setEditingDrug(viewingDrug); }} className="bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold px-5 py-2 rounded-xl transition-colors hover:bg-stone-200 dark:hover:bg-stone-600">編輯資料</button>
                                    <button onClick={() => { setViewingDrug(null); setFolderModalDrug(viewingDrug); }} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 py-2 rounded-xl shadow-sm transition-transform active:scale-95 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">star</span> 收入主題資料夾</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ✨ 新增：化學結構繪圖 Modal */}
            {showDrawingModal && (
                <KetcherEditorModal 
                    initialSmiles={editingDrug?.customSmiles || ''}
                    onSave={(smiles) => {
                        setEditingDrug(prev => ({ ...prev, customSmiles: smiles }));
                        setShowDrawingModal(false);
                    }}
                    onClose={() => setShowDrawingModal(false)}
                />
            )}

            {/* 3. 編輯單一藥物 Modal */}
            {editingDrug && isAdmin && (
                <div className="fixed inset-0 z-[160] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 p-6 flex flex-col max-h-[90vh]">
                        <h3 className="font-black text-xl mb-4 text-stone-800 dark:text-white flex justify-between">
                            <span>編輯藥物資料</span>
                        </h3>
                        <div className="overflow-y-auto custom-scrollbar pr-2 space-y-4 flex-1">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">藥物名稱 (D)</label>
                                    <input type="text" className="w-full p-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-amber-500 font-bold" value={editingDrug.D} onChange={e => setEditingDrug({...editingDrug, D: e.target.value})} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">單元分類 (U) <span className="font-normal text-gray-400">請用 & 隔開</span></label>
                                    <input type="text" className="w-full p-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-amber-500 font-bold" value={editingDrug.U} onChange={e => setEditingDrug({...editingDrug, U: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 p-3 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-emerald-600">上傳自訂圖片 / 手動繪製結構 (優先覆蓋預設)</label>
                                    <button onClick={() => setShowDrawingModal(true)} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors flex items-center gap-1 shadow-sm">
                                        <span className="material-symbols-outlined text-[14px]">draw</span> 開啟繪製工具
                                    </button>
                                </div>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:text-white mb-2" />
                                
                                {editingDrug.customSmiles && !editingDrug.customImg && (
                                    <div className="mt-2 p-3 bg-white dark:bg-stone-800 border border-emerald-200 dark:border-stone-600 rounded-lg text-sm shadow-sm flex flex-col gap-2">
                                        <div className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[16px]">check_circle</span> 已儲存繪製結構 (SMILES):
                                        </div>
                                        <div className="font-mono text-xs text-stone-600 dark:text-stone-400 break-all bg-stone-50 dark:bg-stone-900 p-2 rounded">{editingDrug.customSmiles}</div>
                                        <button onClick={() => setEditingDrug({...editingDrug, customSmiles: null})} className="self-end text-red-500 hover:text-red-700 font-bold text-xs">移除結構</button>
                                    </div>
                                )}

                                {editingDrug.customImg && (
                                    <div className="mt-3 relative inline-block bg-white dark:bg-stone-800 p-2 border border-stone-200 dark:border-stone-700 rounded-lg">
                                        <img src={editingDrug.customImg} alt="自訂圖片預覽" className="max-h-24 object-contain mix-blend-multiply dark:mix-blend-normal" />
                                        <button onClick={() => setEditingDrug({...editingDrug, customImg: null})} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">機轉分類 (C)</label>
                                    <input type="text" className="w-full p-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-amber-500 font-bold" value={editingDrug.C} onChange={e => setEditingDrug({...editingDrug, C: e.target.value})} />
                                </div>
                                <div className="w-32 shrink-0">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">前驅藥 (P)</label>
                                    <select className="w-full p-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 dark:text-white outline-none font-bold" value={editingDrug.P?.toLowerCase() || 'n'} onChange={e => setEditingDrug({...editingDrug, P: e.target.value})}>
                                        <option value="n">否 (n)</option>
                                        <option value="y">是 (y)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-violet-600 mb-1">給藥途徑 (O) <span className="font-normal text-violet-400">請用 & 隔開</span></label>
                                <input type="text" className="w-full p-2 border border-violet-300 dark:border-stone-600 rounded-lg bg-violet-50 dark:bg-stone-900 dark:text-white outline-none focus:border-violet-500 font-bold" value={editingDrug.O || ''} onChange={e => setEditingDrug({...editingDrug, O: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-amber-600 mb-1">特殊基團特徵 (S) <span className="font-normal text-amber-400">請用 & 隔開</span></label>
                                <textarea className="w-full p-2 h-16 border border-amber-300 dark:border-stone-600 rounded-lg bg-amber-50 dark:bg-stone-900 dark:text-white outline-none focus:border-amber-500 font-bold resize-none custom-scrollbar" value={editingDrug.S || ''} onChange={e => setEditingDrug({...editingDrug, S: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-cyan-600 mb-1">特殊點、首選 (E) <span className="font-normal text-cyan-400">請用 & 隔開</span></label>
                                <textarea className="w-full p-2 h-16 border border-cyan-300 dark:border-stone-600 rounded-lg bg-cyan-50 dark:bg-stone-900 dark:text-white outline-none focus:border-cyan-500 font-bold resize-none custom-scrollbar" value={editingDrug.E || ''} onChange={e => setEditingDrug({...editingDrug, E: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-rose-600 mb-1">代謝與交互作用 (MP) <span className="font-normal text-rose-400">請用 & 隔開，例如: &lt;CYP3A4&gt;#h&amp;&lt;代謝物&gt;#a</span></label>
                                <textarea className="w-full p-2 h-16 border border-rose-300 dark:border-stone-600 rounded-lg bg-rose-50 dark:bg-stone-900 dark:text-white outline-none focus:border-rose-500 font-bold resize-none custom-scrollbar" value={editingDrug.MP || ''} onChange={e => setEditingDrug({...editingDrug, MP: e.target.value})} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-stone-200 dark:border-stone-700 shrink-0">
                            <button onClick={() => setEditingDrug(null)} className="px-4 py-2 font-bold text-gray-500 hover:text-stone-800 transition-colors">取消</button>
                            <button onClick={handleSaveEditingDrug} className="bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-800 px-6 py-2 rounded-xl font-bold shadow-sm">儲存</button>
                        </div>
                    </div>
                </div>
            )}

            {showImportModal && isAdmin && (
                <div className="fixed inset-0 z-[160] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-3xl rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 p-6 flex flex-col">
                        <h3 className="font-black text-xl mb-4 text-stone-800 dark:text-white">批次匯入藥物圖鑑</h3>
                        <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="在此貼上陣列格式..." className="w-full flex-1 min-h-[200px] p-3 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl outline-none focus:border-emerald-500 bg-white dark:bg-stone-900 text-sm font-mono dark:text-white custom-scrollbar mb-4" />
                        <div className="flex justify-end gap-3 shrink-0">
                            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 font-bold text-gray-500 hover:text-stone-800 transition-colors">取消</button>
                            <button onClick={handleImport} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">save_alt</span> 執行解析與匯入</button>
                        </div>
                    </div>
                </div>
            )}

            {showQuizModal && (
                <div className="fixed inset-0 z-[160] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 p-6 flex flex-col max-h-[80vh]">
                        <h3 className="font-black text-xl mb-4 text-stone-800 dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500">quiz</span> 圖鑑智慧出題</h3>
                        
                        {activeMainTab === 'library' ? (
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">指定出題單元 (可複選)：</label>
                                <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-3 bg-white dark:bg-stone-900 max-h-40 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={quizSelectedUnits.length === 0} onChange={() => setQuizSelectedUnits([])} className="accent-emerald-500 w-4 h-4" />
                                        <span className="text-sm font-bold text-stone-700 dark:text-stone-300">全部單元大亂鬥</span>
                                    </label>
                                    <div className="border-t border-stone-100 dark:border-stone-800 my-1"></div>
                                    {allUnits.map(u => (
                                        <label key={u} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={quizSelectedUnits.includes(u)} onChange={() => {
                                                setQuizSelectedUnits(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);
                                            }} className="accent-emerald-500 w-4 h-4" />
                                            <span className="text-sm font-bold text-stone-700 dark:text-stone-300">{u}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="mb-4 text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                系統將從資料夾「{userFolders.find(f=>f.id===selectedFolderId)?.name || '主題收錄'}」的內容中為您出題。
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">選擇要出現的題型 (可複選)：</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {[
                                    { id: 0, label: '看藥物選機轉' },
                                    { id: 1, label: '看名字選結構' },
                                    { id: 2, label: '看結構選藥物' },
                                    { id: 3, label: '看個論選結構' }
                                ].map(type => (
                                    <label key={type.id} className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${quizSelectedTypes.includes(type.id) ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-400' : 'bg-white border-stone-200 text-stone-600 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-400'}`}>
                                        <input type="checkbox" checked={quizSelectedTypes.includes(type.id)} onChange={() => {
                                            setQuizSelectedTypes(prev => prev.includes(type.id) ? prev.filter(t => t !== type.id) : [...prev, type.id]);
                                        }} className="hidden" />
                                        <div className={`w-4 h-4 rounded border flex flex-shrink-0 items-center justify-center ${quizSelectedTypes.includes(type.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300 dark:bg-stone-700 dark:border-stone-500'}`}>
                                            {quizSelectedTypes.includes(type.id) && <span className="material-symbols-outlined text-[12px] text-white font-black">check</span>}
                                        </div>
                                        <span className="text-xs font-bold">{type.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">設定抽出的題數 (一般測驗用)：</label>
                            <input type="number" min="1" className="w-full p-3 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-emerald-500 font-black text-center text-xl shadow-inner" value={quizCount} onChange={e => setQuizCount(e.target.value)} />
                        </div>
                        <div className="flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                            <button onClick={() => setShowQuizModal(false)} className="px-4 py-2 font-bold text-gray-500 hover:text-stone-800 transition-colors bg-stone-100 dark:bg-stone-700 rounded-xl text-center">取消</button>
                            <button onClick={startEndlessMode} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-transform"><span className="material-symbols-outlined text-[18px]">all_inclusive</span> 無限模式</button>
                            <button onClick={handleGenerateQuiz} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-transform"><span className="material-symbols-outlined text-[18px]">play_arrow</span> 一般出題</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✨ 心智圖 Modal */}
            {showMindMapModal && mindMapData && (
                <div className="fixed inset-0 z-[175] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowMindMapModal(false)}>
                    <div className="bg-[#FCFBF7] dark:bg-stone-900 w-full h-full max-w-[95vw] rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center bg-white dark:bg-stone-800 shrink-0">
                            <h3 className="font-black text-xl text-stone-800 dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-indigo-500">account_tree</span> 藥物心智圖模式</h3>
                            <div className="flex items-center gap-4">
                                <div className="hidden sm:block text-sm font-bold text-stone-500 bg-stone-100 dark:bg-stone-700 px-3 py-1 rounded-lg">💡 提示：滑鼠滾輪可縮放，按住空白處拖曳可平移畫布</div>
                                <button onClick={() => setShowMindMapModal(false)} className="bg-stone-100 dark:bg-stone-700 text-gray-500 dark:text-gray-300 rounded-full w-8 h-8 flex justify-center items-center hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
                            </div>
                        </div>
                        {/* 載入具有縮放平移滑動機制的畫布檢視器 */}
                        <MindMapViewer data={mindMapData} onNodeClick={setViewingDrug} />
                    </div>
                </div>
            )}
        </div>
    );
};