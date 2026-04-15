
// ✨ 系統架構升級：將所有核心工具提早掛載到全域，確保其他檔案讀取時不會因 undefined 導致白屏
window.safeDecompress = (val, fallbackType = 'string') => {
    if (!val) return fallbackType === 'array' ? [] : (fallbackType === 'object' ? null : '');
    if (typeof val === 'object') return val;
    
    // ✨ 終極修復：如果字串明顯是未壓縮的明文 (包含 HTML 標籤或題目標記)，直接回傳，避免誤判產生空字串！
    if (typeof val === 'string' && (val.includes('<p') || val.includes('<div') || val.includes('<span') || val.includes('<br') || val.includes('[Q.') || val.includes('[A.'))) {
        return val;
    }

    try {
        const res = window.jzDecompress(val);
        // 防呆：如果解壓縮出來是空字串，但原本不是空的，代表解壓失敗，退回原字串
        if (!res && val.length > 0) return val;
        return res || (fallbackType === 'array' ? [] : (fallbackType === 'object' ? null : ''));
    } catch (e) { return val; }
};
// --- 新增：清理試卷名稱輔助函式 ---


// --- 新增：特殊試卷名稱渲染輔助函式 ---


// --- 新增：載入並初始化 MathJax (LaTeX 數學公式渲染引擎) ---
if (typeof window !== 'undefined' && !window.mathjaxObserverInit) {
    window.mathjaxObserverInit = true;
    window.MathJax = {
        tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']],
            processEscapes: true
        },
        startup: {
            typeset: false // 手動控制渲染時機
        }
    };
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    script.async = true;
    script.onload = () => {
        let mathTimer = null;
        const observer = new MutationObserver(() => {
            if (mathTimer) return;
            mathTimer = setTimeout(() => {
                if (window.MathJax && window.MathJax.typesetPromise) {
                    window.MathJax.typesetClear();
                    window.MathJax.typesetPromise().catch(err => console.error("MathJax error:", err));
                }
                mathTimer = null;
            }, 500); // 防抖批次渲染，維持高效能
        });
        const targetNode = document.getElementById('root') || document.body;
        observer.observe(targetNode, { childList: true, subtree: true });
    };
    document.head.appendChild(script);
}

// --- 新增：載入並初始化 SmilesDrawer (自動繪製高畫質化學式引擎) ---
if (typeof window !== 'undefined' && !window.smilesDrawerObserverInit) {
    window.smilesDrawerObserverInit = true;
    const script = document.createElement('script');
    script.src = "https://unpkg.com/smiles-drawer@1.0.10/dist/smiles-drawer.min.js";
    script.onload = () => {
        const drawAllSmiles = () => {
            if (!window.SmilesDrawer) return;
            // 找出所有還沒畫過的 canvas 畫布
            // ✨ 修正：利用 :not([data-drawn]) 確保不會重複抓取處理中或已完成的畫布
            const canvases = document.querySelectorAll('canvas.smiles-canvas:not([data-drawn])');
            if (canvases.length === 0) return;
            
            // ✨ 秘密武器：設定高畫質畫布，並強制覆蓋主題為「純黑白」，徹底擺脫舊 API 的彩色廉價感！
            const drawer = new window.SmilesDrawer.Drawer({ 
                width: 300, 
                height: 150, 
                padding: 2, 
                compactDrawing: false,
                themes: {
                    light: { C: '#000', O: '#000', N: '#000', F: '#000', Cl: '#000', Br: '#000', I: '#000', P: '#000', S: '#000', B: '#000', Si: '#000', H: '#000', BACKGROUND: '#FCFBF7' }
                }
            });
            
            canvases.forEach(canvas => {
                const smiles = canvas.getAttribute('data-smiles');
                const rawText = canvas.getAttribute('data-raw-text') || smiles;
                canvas.setAttribute('data-drawn', 'processing'); 
                
                window.SmilesDrawer.parse(smiles, (tree) => {
                    drawer.draw(tree, canvas, 'light', false); 
                    canvas.setAttribute('data-drawn', 'true');
                }, (err) => {
                    // ✨ 優化：如果不具備化學式結構(例如只是中文名稱)，安靜地優雅還原成純文字，不顯示報錯圖片
                    const span = document.createElement('span');
                    span.className = "text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-700 mx-1 inline-block shadow-sm";
                    span.textContent = rawText;
                    // 在 dangerouslySetInnerHTML 內安全替換節點
                    canvas.parentNode.replaceChild(span, canvas);
                });
            });
        };

       drawAllSmiles();
        // 🚀 降溫優化：限制繪圖引擎的掃描頻率與範圍，避免在背景載入數據時拖慢整體效能
        let drawTimer = null;
        const observer = new MutationObserver(() => {
            if (drawTimer) return;
            drawTimer = setTimeout(() => {
                drawAllSmiles();
                drawTimer = null;
            }, 300); // 頻率從 50ms 降至 300ms，大幅節省 CPU
        });
        const targetNode = document.getElementById('root') || document.body;
        observer.observe(targetNode, { childList: true, subtree: true });
    };
    document.head.appendChild(script);
}