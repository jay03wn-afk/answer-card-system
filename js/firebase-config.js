const firebaseConfig = {
    apiKey: "AIzaSyBAGM92NBQnUlI1gnLRK-mufM6YtDq5sHk",
    authDomain: "anser-card.firebaseapp.com",
    projectId: "anser-card",
    storageBucket: "anser-card.firebasestorage.app", // ✨ 新增這行！告訴系統要把圖片傳到哪
    messagingSenderId: "224666683961",
    appId: "1:224666683961:web:351991d6cbc8543b181be8"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 1. 解決 404 Listen/channel 網路連線錯誤 (強制使用長輪詢繞過防火牆/防毒軟體阻擋)
db.settings({ experimentalForceLongPolling: true, merge: true });

// 2. 解決每次跳回來都要重新加載的問題 (開啟本地快取，達到秒開且背景同步新資料)
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    console.warn("本地快取啟動失敗: ", err);
});

const storage = firebase.storage(); // ✨ 新增這行

window.auth = auth; // 確保全域可用
window.db = db;     // 確保全域可用
window.storage = storage; // ✨ 確保全域可用

const { useState, useEffect, useRef } = React;

const handleFocusScroll = (e) => {
    const target = e.target;
    setTimeout(() => { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
};

const getEmbedUrl = (url) => {
    if (!url) return '';
    try {
        const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
        const match = url.match(driveRegex);
        if (match && match[1]) return `https://drive.google.com/file/d/${match[1]}/preview`;
        return url;
    } catch(e) { return url; }
};

const formatTime = (seconds) => {
    if (seconds == null || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

// 新增功能：官方與任務標籤渲染 (自動隱藏標籤並加上特效)
// 新增功能：官方與任務標籤渲染 (自動隱藏標籤並加上特效、動態切換完成狀態)
const renderTestName = (name, isCompleted = false) => {
    if (!name) return '未命名測驗';
    let displayName = name;
    let isOfficial = false;
    let isTask = false;

    if (displayName.includes('[#op]')) {
        isOfficial = true;
        displayName = displayName.replace(/\[#op\]/g, '').trim();
    }
    // 兼容 #mnst 與 #nmst 兩種打法
    if (displayName.includes('[#mnst]') || displayName.includes('[#nmst]')) {
        isTask = true;
        displayName = displayName.replace(/\[#m?nm?st\]/g, '').trim();
    }

    if (isOfficial || isTask) {
        // 未完成時淺藍色閃爍，已完成時紫色不閃爍
        const taskColorClass = isCompleted 
            ? 'text-purple-600 dark:text-purple-400' 
            : 'text-cyan-500 dark:text-cyan-400 animate-pulse';
        
        const taskBadgeClass = isCompleted
            ? 'bg-purple-500 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]'
            : 'bg-cyan-500 text-white shadow-[0_0_8px_rgba(6,182,212,0.8)]';

        return (
            <span className={`font-bold drop-shadow-md ${isTask ? taskColorClass : 'text-yellow-500'}`}>
                {displayName} 
                {isOfficial && <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-sm ml-1 tracking-widest align-middle">官方</span>}
                {isTask && <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ml-1 tracking-widest align-middle ${taskBadgeClass}`}>特殊任務</span>}
            </span>
        );
    }
    return name;
};
// --- JZ 壓縮引擎 (省空間與加速載入) ---
window.jzCompress = function(data) {
    if (!data) return data;
    let str = typeof data === 'string' ? data : JSON.stringify(data);
    if (str.length < 50) return data; // 太短不壓縮
    let dict = new Map();
    let nextCode = 1000000;
    let phrase = str[0];
    let out = [];
    for (let i = 1; i < str.length; i++) {
        let char = str[i];
        if (dict.has(phrase + char)) phrase += char;
        else {
            out.push(phrase.length > 1 ? dict.get(phrase) : phrase.charCodeAt(0));
            dict.set(phrase + char, nextCode++);
            phrase = char;
        }
    }
    out.push(phrase.length > 1 ? dict.get(phrase) : phrase.charCodeAt(0));
    return "JZC|" + out.map(n => n.toString(36)).join('.');
};

window.jzDecompress = function(data) {
    if (typeof data !== 'string' || !data.startsWith("JZC|")) return data;
    try {
        let outArr = data.substring(4).split('.').map(s => parseInt(s, 36));
        let dict = new Map();
        let nextCode = 1000000;
        let phrase = String.fromCharCode(outArr[0]);
        let oldPhrase = phrase;
        let res = [phrase];
        for (let i = 1; i < outArr.length; i++) {
            let currCode = outArr[i];
            if (currCode < 1000000) phrase = String.fromCharCode(currCode);
            else phrase = dict.has(currCode) ? dict.get(currCode) : (oldPhrase + oldPhrase[0]);
            res.push(phrase);
            dict.set(nextCode++, oldPhrase + phrase[0]);
            oldPhrase = phrase;
        }
        let finalStr = res.join("");
        try { return JSON.parse(finalStr); } catch(e) { return finalStr; }
    } catch (e) { return data; } 
};

// --- 新增功能：Web Worker 非同步解壓縮引擎 (含進度回報) ---
const decompressWorkerCode = `
    self.onmessage = function(e) {
        const { data, id } = e.data;
        if (typeof data !== 'string' || !data.startsWith("JZC|")) {
            self.postMessage({ id, result: data, progress: 100 });
            return;
        }
        try {
            let outArr = data.substring(4).split('.').map(s => parseInt(s, 36));
            let dict = new Map();
            let nextCode = 1000000;
            let phrase = String.fromCharCode(outArr[0]);
            let oldPhrase = phrase;
            let res = [phrase];
            
            let i = 1;
            const total = outArr.length;
            const chunkSize = 2000; // 每次處理兩千筆，避免卡死主線程

            function processChunk() {
                const end = Math.min(i + chunkSize, total);
                for (; i < end; i++) {
                    let currCode = outArr[i];
                    if (currCode < 1000000) phrase = String.fromCharCode(currCode);
                    else phrase = dict.has(currCode) ? dict.get(currCode) : (oldPhrase + oldPhrase[0]);
                    res.push(phrase);
                    dict.set(nextCode++, oldPhrase + phrase[0]);
                    oldPhrase = phrase;
                }
                
                const progress = Math.floor((i / total) * 100);
                self.postMessage({ id, progress, status: 'decompressing' });

                if (i < total) {
                    setTimeout(processChunk, 0); // 讓出執行緒給畫面更新
                } else {
                    let finalStr = res.join("");
                    let finalObj = finalStr;
                    try { finalObj = JSON.parse(finalStr); } catch(e) {}
                    self.postMessage({ id, result: finalObj, progress: 100, status: 'done' });
                }
            }
            processChunk();
        } catch (e) {
            self.postMessage({ id, result: data, progress: 100, status: 'error' });
        }
    };
`;
const blob = new Blob([decompressWorkerCode], { type: 'application/javascript' });
window.jzWorker = new Worker(URL.createObjectURL(blob));

window.jzDecompressAsync = function(data, onProgress) {
    return new Promise((resolve) => {
        const id = Date.now() + Math.random();
        const handler = (e) => {
            if (e.data.id === id) {
                if (e.data.status === 'decompressing' && onProgress) {
                    onProgress(e.data.progress);
                } else if (e.data.progress === 100) {
                    window.jzWorker.removeEventListener('message', handler);
                    resolve(e.data.result);
                }
            }
        };
        window.jzWorker.addEventListener('message', handler);
        window.jzWorker.postMessage({ data, id });
    });
};
