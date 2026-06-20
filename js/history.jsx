// js/history.jsx
const { useState, useEffect, useMemo } = React;

window.HistoryDashboard = function HistoryDashboard({ user, showAlert, showConfirm }) {
    const [year, setYear] = useState('112');
    const [semester, setSemester] = useState('1');
    const [sub1, setSub1] = useState('');
    const [sub2, setSub2] = useState('');
    const [sub3, setSub3] = useState('');
    
    const [historyData, setHistoryData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // 抓取使用者的歷史成績
    useEffect(() => {
        if (!user) return;
        const unsub = window.db.collection('users').doc(user.uid).collection('historyExams')
            .onSnapshot(snap => {
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // 依照年份與次數排序 (舊到新)
                data.sort((a, b) => {
                    if (a.year !== b.year) return parseInt(a.year) - parseInt(b.year);
                    return parseInt(a.semester) - parseInt(b.semester);
                });
                setHistoryData(data);
                setIsLoading(false);
            });
        return () => unsub();
    }, [user]);

    // 處理新增成績
    const handleSubmit = async (e) => {
        e.preventDefault();
        const s1 = parseFloat(sub1);
        const s2 = parseFloat(sub2);
        const s3 = parseFloat(sub3);

        if (isNaN(s1) || isNaN(s2) || isNaN(s3)) {
            if (showAlert) showAlert("請輸入正確的數字分數！");
            return;
        }

        const average = ((s1 + s2 + s3) / 3).toFixed(2);
        const docId = `${year}-${semester}`; // 用年份與次數當ID，避免重複

        try {
            await window.db.collection('users').doc(user.uid).collection('historyExams').doc(docId).set({
                year,
                semester,
                sub1: s1,
                sub2: s2,
                sub3: s3,
                average: parseFloat(average),
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
            
            if (showAlert) showAlert(`成功新增 ${year}年第${semester}次 成績！\n平均: ${average}分`);
            
            // 清空輸入框
            setSub1(''); setSub2(''); setSub3('');
        } catch (error) {
            console.error(error);
            if (showAlert) showAlert("儲存失敗，請稍後再試。");
        }
    };

    // 刪除成績
    const handleDelete = (id, label) => {
        if (showConfirm) {
            showConfirm(`確定要刪除 ${label} 的成績紀錄嗎？`, async () => {
                await window.db.collection('users').doc(user.uid).collection('historyExams').doc(id).delete();
            });
        }
    };

    // 落點分析運算與歷史平均計算
    const analysis = useMemo(() => {
        if (historyData.length === 0) return null;
        const latest = historyData[historyData.length - 1];
        
        // 1. 計算各科與總分的「歷史平均」
        const sum = historyData.reduce((acc, curr) => {
            acc.sub1 += curr.sub1;
            acc.sub2 += curr.sub2;
            acc.sub3 += curr.sub3;
            acc.total += curr.average;
            return acc;
        }, { sub1: 0, sub2: 0, sub3: 0, total: 0 });
        const len = historyData.length;
        const avgSub1 = +(sum.sub1 / len).toFixed(2);
        const avgSub2 = +(sum.sub2 / len).toFixed(2);
        const avgSub3 = +(sum.sub3 / len).toFixed(2);
        const overallAvg = +(sum.total / len).toFixed(2);

        // 2. 綜合落點判斷 (看整體平均與近期趨勢交叉分析)
        let status = '';
        let color = '';
        let message = '';

        const isLatestPass = latest.average >= 60;
        const isOverallPass = overallAvg >= 60;

        if (isOverallPass && isLatestPass) {
            status = '穩健通關';
            color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
            message = `太棒了！你的歷史總平均 (${overallAvg}分) 與近期表現 (${latest.average}分) 都穩定在及格線上。請繼續維持手感，並確保各科均衡發展。`;
        } else if (isLatestPass && !isOverallPass) {
            status = '漸入佳境';
            color = 'text-cyan-600 bg-cyan-50 border-cyan-200';
            message = `表現持續進步！雖然歷史平均偏弱，但近期成績已達及格標準 (${latest.average}分)。代表你已經抓到考試訣竅，請繼續保持這個節奏！`;
        } else if (!isLatestPass && isOverallPass) {
            status = '出現警訊';
            color = 'text-amber-600 bg-amber-50 border-amber-200';
            message = `請注意！你的歷史基礎不錯，但近期成績 (${latest.average}分) 出現下滑並低於及格線。建議盡快檢視最近的錯題，找回原本的步調。`;
        } else if (latest.average >= 55 || overallAvg >= 55) {
            status = '危險邊緣';
            color = 'text-amber-600 bg-amber-50 border-amber-200';
            message = `差一點點！你已經進入及格邊緣的衝刺區。建議鎖定「歷史平均較弱」的科目，優先針對錯題本進行概念釐清與加強！`;
        } else {
            status = '仍需努力';
            color = 'text-rose-600 bg-rose-50 border-rose-200';
            message = `基礎尚未穩固。目前的綜合數據距離及格線還有一段距離。建議先暫停盲目刷題，回頭將常考章節的基礎觀念重新複習一次，穩紮穩打！`;
        }

        // 3. 找出歷史最強與最弱科目 (依據歷史平均而非單次)
        const subs = [
            { name: '藥理與藥化', score: avgSub1 },
            { name: '藥分與生藥', score: avgSub2 },
            { name: '藥劑與生物藥劑', score: avgSub3 }
        ];
        subs.sort((a, b) => b.score - a.score);

        return { 
            latest, overallAvg, avgSub1, avgSub2, avgSub3, 
            status, color, message, best: subs[0], worst: subs[2] 
        };
    }, [historyData]);

    // 圖表 Y 軸動態範圍智慧計算
    const chartBounds = useMemo(() => {
        if (historyData.length === 0) return { min: 0, max: 100, range: 100 };
        const avgs = historyData.map(d => d.average);
        avgs.push(60); // 確保及格紅線一定在畫面內
        
        let minAvg = Math.min(...avgs);
        let maxAvg = Math.max(...avgs);
        
        // 上下預留約 5 分的緩衝空間
        let minVal = Math.max(0, Math.floor(minAvg / 5) * 5 - 5);
        let maxVal = Math.min(100, Math.ceil(maxAvg / 5) * 5 + 5);
        
        // 避免範圍過小導致圖表過度放大失真
        if (maxVal - minVal < 15) {
            minVal = Math.max(0, minVal - 5);
            maxVal = Math.min(100, maxVal + 5);
        }
        return { min: minVal, max: maxVal, range: maxVal - minVal };
    }, [historyData]);

    // 生成年份選項
    const yearOptions = [];
    for (let i = 103; i <= 115; i++) yearOptions.push(i.toString());

    return (
        <div className="max-w-5xl mx-auto w-full p-4 md:p-6 space-y-6 pb-20">
            {/* 標題與各科總平均 */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-cyan-600">monitoring</span>
                    <h2 className="text-2xl md:text-3xl font-black text-stone-800 dark:text-white">阿摩歷屆成績分析</h2>
                </div>
                
                {analysis && (
                    <div className="bg-cyan-50 dark:bg-stone-800 border border-cyan-200 dark:border-stone-700 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4 sm:gap-6 shadow-sm h-fit">
                        <div className="flex flex-col items-center sm:items-start shrink-0">
                            <div className="text-xs font-bold text-stone-500 dark:text-gray-400">歷屆總平均</div>
                            <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400">
                                {analysis.overallAvg}
                                <span className="text-sm ml-1 text-cyan-700 dark:text-cyan-500">分</span>
                            </div>
                        </div>
                        <div className="hidden sm:block w-px h-12 bg-cyan-200 dark:bg-stone-700"></div>
                        <div className="flex gap-4 sm:gap-6 w-full sm:w-auto justify-around sm:justify-start border-t sm:border-t-0 border-cyan-200 dark:border-stone-700 pt-3 sm:pt-0">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-stone-500 dark:text-gray-400 font-bold mb-1">藥理與藥化</span>
                                <span className="text-sm font-black text-stone-700 dark:text-stone-300">{analysis.avgSub1}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-stone-500 dark:text-gray-400 font-bold mb-1">藥分與生藥</span>
                                <span className="text-sm font-black text-stone-700 dark:text-stone-300">{analysis.avgSub2}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-stone-500 dark:text-gray-400 font-bold mb-1">藥劑與生藥劑</span>
                                <span className="text-sm font-black text-stone-700 dark:text-stone-300">{analysis.avgSub3}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 左側：新增成績表單 */}
                <div className="lg:col-span-1 bg-[#FCFBF7] dark:bg-stone-800 rounded-2xl p-5 shadow-sm border border-cyan-100 dark:border-stone-700 h-fit">
                    <h3 className="text-lg font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-2 mb-4 border-b border-cyan-100 dark:border-stone-700 pb-2">
                        <span className="material-symbols-outlined text-[20px]">add_circle</span> 新增測驗成績
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-stone-500 dark:text-gray-400">年度</label>
                                <select value={year} onChange={e => setYear(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 dark:border-stone-600 rounded-xl bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-cyan-500 font-bold">
                                    {yearOptions.map(y => <option key={y} value={y}>{y} 年</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-stone-500 dark:text-gray-400">次數</label>
                                <select value={semester} onChange={e => setSemester(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 dark:border-stone-600 rounded-xl bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-cyan-500 font-bold">
                                    <option value="1">第一次</option>
                                    <option value="2">第二次</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-stone-500 dark:text-gray-400">藥理學與藥物化學 (0-100)</label>
                            <input type="number" step="0.1" min="0" max="100" required value={sub1} onChange={e => setSub1(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 dark:border-stone-600 rounded-xl bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-cyan-500 font-bold" placeholder="請輸入分數..." />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-500 dark:text-gray-400">藥物分析與生藥學 (0-100)</label>
                            <input type="number" step="0.1" min="0" max="100" required value={sub2} onChange={e => setSub2(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 dark:border-stone-600 rounded-xl bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-cyan-500 font-bold" placeholder="請輸入分數..." />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-500 dark:text-gray-400">藥劑學與生物藥劑學 (0-100)</label>
                            <input type="number" step="0.1" min="0" max="100" required value={sub3} onChange={e => setSub3(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 dark:border-stone-600 rounded-xl bg-white dark:bg-stone-900 dark:text-white outline-none focus:border-cyan-500 font-bold" placeholder="請輸入分數..." />
                        </div>

                        <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-black py-2.5 rounded-xl shadow-sm transition-transform active:scale-95 flex justify-center items-center gap-1">
                            <span className="material-symbols-outlined text-[18px]">save</span> 儲存成績
                        </button>
                    </form>
                </div>

                {/* 右側：分析圖表與落點預測 */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* 落點預測區塊 */}
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 rounded-2xl p-5 shadow-sm border border-amber-200 dark:border-stone-700">
                        <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2 mb-4 border-b border-amber-100 dark:border-stone-700 pb-2">
                            <span className="material-symbols-outlined text-[20px]">assistant</span> 國考落點分析預測
                        </h3>
                        
                        {!analysis ? (
                            <div className="text-center py-6 text-stone-400 font-bold">請先於左側新增至少一筆成績紀錄以產生分析。</div>
                        ) : (
                            <div className="space-y-4">
                                <div className={`p-4 rounded-xl border-2 flex items-start gap-3 ${analysis.color}`}>
                                    <span className="material-symbols-outlined text-3xl mt-1">
                                        {analysis.status === '安全通關' ? 'task_alt' : analysis.status === '危險邊緣' ? 'warning' : 'error'}
                                    </span>
                                    <div>
                                        <div className="font-black text-lg mb-1">{analysis.status} (最新平均: {analysis.latest.average}分)</div>
                                        <div className="text-sm font-bold opacity-80 leading-relaxed">{analysis.message}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                                        <div className="text-xs text-stone-500 dark:text-stone-400 font-bold mb-1">👑 你的最強優勢科目</div>
                                        <div className="font-black text-cyan-600 dark:text-cyan-400">{analysis.best.name} <span className="text-sm">({analysis.best.score}分)</span></div>
                                    </div>
                                    <div className="bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                                        <div className="text-xs text-stone-500 dark:text-stone-400 font-bold mb-1">🚨 最需加強補救科目</div>
                                        <div className="font-black text-rose-500 dark:text-rose-400">{analysis.worst.name} <span className="text-sm">({analysis.worst.score}分)</span></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 成長趨勢圖表 (純手工無套件 SVG 響應式折線圖 - 全新精緻版) */}
                    {/* 成長趨勢圖表 (依資料動態智慧縮放 Y 軸區間) */}
                    <div className="bg-[#FCFBF7] dark:bg-stone-800 rounded-2xl p-5 shadow-sm border border-stone-200 dark:border-stone-700">
                        <h3 className="text-lg font-bold text-stone-800 dark:text-white flex items-center gap-2 mb-4 border-b border-stone-200 dark:border-stone-700 pb-2">
                            <span className="material-symbols-outlined text-[20px]">show_chart</span> 歷屆平均分數成長趨勢
                        </h3>
                        
                        {historyData.length < 2 ? (
                            <div className="text-center py-10 text-stone-400 font-bold">請輸入至少兩筆資料，以顯示成長趨勢曲線。</div>
                        ) : (
                            <div className="w-full overflow-x-auto custom-scrollbar mt-4 pb-4">
                                <div className="min-w-[500px]">
                                    <svg className="w-full h-64 drop-shadow-sm" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
                                        <defs>
                                            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4"/>
                                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0"/>
                                            </linearGradient>
                                        </defs>
                                        
                                        {(() => {
                                            const { min, max, range } = chartBounds;
                                            
                                            // 產生動態 Y 軸刻度線 (切成5格)
                                            const gridLines = [];
                                            for (let i = 0; i <= 5; i++) gridLines.push(min + (range * i) / 5);
                                            
                                            // 座標轉換公式：250是底部，50是頂部 (保留上下空間)
                                            const getY = (score) => 250 - ((score - min) / range) * 200;

                                            return (
                                                <React.Fragment>
                                                    {/* 畫背景動態水平格線 */}
                                                    {gridLines.map(score => {
                                                        const y = getY(score);
                                                        return (
                                                            <g key={`grid-${score}`}>
                                                                <line x1="40" y1={y} x2="760" y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" className="dark:stroke-stone-600" />
                                                                <text x="35" y={y + 4} fill="#9ca3af" fontSize="12" textAnchor="end" fontWeight="bold">{Math.round(score)}</text>
                                                            </g>
                                                        );
                                                    })}

                                                    {/* 畫 60分 及格紅線 (動態對齊) */}
                                                    <line x1="40" y1={getY(60)} x2="760" y2={getY(60)} stroke="#f43f5e" strokeWidth="2" strokeDasharray="6,4" opacity="0.8" />
                                                    <text x="765" y={getY(60) + 4} fill="#f43f5e" fontSize="12" fontWeight="bold">及格線</text>

                                                    {/* 計算折線點位 */}
                                                    {(() => {
                                                        const points = historyData.map((d, i) => {
                                                            const x = 60 + (i / (historyData.length - 1)) * 660; // 左右各留一些邊緣距
                                                            return { x, y: getY(d.average), avg: d.average, label: `${d.year}-${d.semester}` };
                                                        });

                                                        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                                                        const areaD = `${pathD} L ${points[points.length - 1].x} 250 L ${points[0].x} 250 Z`;

                                                        return (
                                                            <React.Fragment>
                                                                {/* 畫漸層面積與折線主體 */}
                                                                <path d={areaD} fill="url(#lineGradient)" />
                                                                <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                                                
                                                                {/* 畫資料點與標籤 */}
                                                                {points.map((p, i) => (
                                                                    <g key={`point-${i}`}>
                                                                        <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#06b6d4" strokeWidth="3" />
                                                                        <rect x={p.x - 22} y={p.y - 32} width="44" height="20" rx="4" fill="#334155" />
                                                                        <text x={p.x} y={p.y - 18} fill="#fff" fontSize="11" textAnchor="middle" fontWeight="bold">{p.avg}</text>
                                                                        <text x={p.x} y="275" fill="#6b7280" fontSize="12" textAnchor="middle" fontWeight="bold">{p.label}</text>
                                                                    </g>
                                                                ))}
                                                            </React.Fragment>
                                                        );
                                                    })()}
                                                </React.Fragment>
                                            );
                                        })()}
                                    </svg>
                                </div>
                            </div>
                        )}
                        <div className="mt-4 flex justify-end gap-4 text-sm font-bold text-stone-500">
                            <div className="flex items-center gap-1.5"><span className="w-4 h-1 bg-[#06b6d4] rounded-full inline-block"></span> 歷次平均</div>
                            <div className="flex items-center gap-1.5"><span className="w-4 h-1 border-t-2 border-[#f43f5e] border-dashed inline-block"></span> 60分及格線</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 下方：清單紀錄 */}
            <div className="bg-[#FCFBF7] dark:bg-stone-800 rounded-2xl p-5 shadow-sm border border-stone-200 dark:border-stone-700">
                 <h3 className="text-lg font-bold text-stone-800 dark:text-white flex items-center gap-2 mb-4 border-b border-stone-200 dark:border-stone-700 pb-2">
                    <span className="material-symbols-outlined text-[20px]">list_alt</span> 成績紀錄清單
                </h3>
                
                {isLoading ? (
                    <div className="text-center py-6 text-stone-400 font-bold">載入中...</div>
                ) : historyData.length === 0 ? (
                    <div className="text-center py-6 text-stone-400 font-bold">目前尚無任何成績紀錄。</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {historyData.map(data => (
                            <div key={data.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-4 relative group shadow-sm hover:shadow-md transition-all">
                                <button onClick={() => handleDelete(data.id, `${data.year}-${data.semester}`)} className="absolute top-3 right-3 text-stone-300 hover:text-red-500 transition-colors bg-stone-50 dark:bg-stone-800 rounded-full p-1 opacity-0 group-hover:opacity-100">
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                                
                                <div className="font-black text-lg text-cyan-700 dark:text-cyan-400 mb-3 border-b border-stone-100 dark:border-stone-800 pb-2">
                                    {data.year} 年 第 {data.semester} 次
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${data.average >= 60 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>平均: {data.average}</span>
                                </div>
                                
                                <div className="space-y-2 text-sm font-bold text-stone-600 dark:text-stone-300">
                                    <div className="flex justify-between">
                                        <span>藥理與藥化</span>
                                        <span className={data.sub1 < 60 ? 'text-rose-500' : ''}>{data.sub1}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>藥分與生藥</span>
                                        <span className={data.sub2 < 60 ? 'text-rose-500' : ''}>{data.sub2}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>藥劑與生物藥劑</span>
                                        <span className={data.sub3 < 60 ? 'text-rose-500' : ''}>{data.sub3}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}