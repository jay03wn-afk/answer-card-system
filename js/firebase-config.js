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

// 1. 解決 404 Listen/channel 網路連線錯誤 (改用「自動偵測長輪詢」完美避開衝突)
db.settings({ experimentalAutoDetectLongPolling: true });
// 2. 解決每次跳回來都要重新加載的問題 (開啟本地快取，達到秒開且背景同步新資料)
// ✨ 加回 synchronizeTabs: true 來支援多分頁同步與快取，避免切換頁面重新載入
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code === 'failed-precondition') {
        // 多個分頁開啟時的正常現象，攔截錯誤避免系統崩潰
        console.warn("多個分頁開啟中，只有主分頁能啟用完整本地快取。");
    } else if (err.code === 'unimplemented') {
        console.warn("當前瀏覽器環境不支援本地快取功能。");
    } else {
        console.warn("本地快取啟動失敗: ", err);
    }
});

const storage = firebase.storage(); // ✨ 新增這行

// --- 修正連線橋樑，確保 Poke.jsx 能抓到正確工具 ---
window.auth = auth;
window.db = db; 
window.firestoreDb = db; // 讓 Poke.jsx 抓得到 db

// 手動將新版函數對應到舊版 SDK 方法
window.firebaseFirestore = {
    doc: (db, coll, id) => db.collection(coll).doc(id),
    setDoc: (ref, data) => ref.set(data),
    updateDoc: (ref, data) => ref.update(data),
    getDoc: (ref) => ref.get(),
    deleteDoc: (ref) => ref.delete(),
    onSnapshot: (ref, callback) => ref.onSnapshot(callback),
    arrayUnion: firebase.firestore.FieldValue.arrayUnion // 處理加入房間的關鍵
};

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
            ? 'text-amber-700600 dark:text-amber-700400' 
            : 'text-cyan-500 dark:text-cyan-400 animate-pulse';
        
        const taskBadgeClass = isCompleted
            ? 'bg-amber-700500 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]'
            : 'bg-cyan-500 text-white shadow-[0_0_8px_rgba(6,182,212,0.8)]';

        return (
            <span className={`font-bold drop-shadow-md ${isTask ? taskColorClass : 'text-amber-500'}`}>
                {displayName} 
                {isOfficial && <span className="text-[10px] bg-amber-500 text-stone-800 px-1.5 py-0.5 rounded-sm ml-1 tracking-widest align-middle">官方</span>}
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
// ✨ 輕量級右下角全域 Toast 提示系統 (不依賴 React 結構，全域可用)
window.showToast = (message, type = 'loading') => {
    let toastEl = document.getElementById('global-toast');
    
    // 如果畫面上還沒有這個提示框，就動態建立一個
    if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'global-toast';
        document.body.appendChild(toastEl);
    }
    
    // 根據不同狀態設定顏色與圖示 (使用你現有的 Tailwind CSS)
    if (type === 'loading') {
        toastEl.className = 'fixed bottom-6 right-6 z-[9999] bg-stone-800 px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 transition-all duration-300 transform tranamber-y-0 opacity-100 text-white font-bold text-sm md:text-base';
        toastEl.innerHTML = `<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>${message}</span>`;
    } else if (type === 'success') {
        toastEl.className = 'fixed bottom-6 right-6 z-[9999] bg-emerald-600 px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 transition-all duration-300 transform tranamber-y-0 opacity-100 text-white font-bold text-sm md:text-base';
        toastEl.innerHTML = `<span class="text-xl">✅</span><span>${message}</span>`;
        
        // 成功後 3 秒自動往下隱藏消失
        setTimeout(() => {
            toastEl.classList.remove('tranamber-y-0', 'opacity-100');
            toastEl.classList.add('tranamber-y-10', 'opacity-0');
        }, 3000);
    } else if (type === 'error') {
        toastEl.className = 'fixed bottom-6 right-6 z-[9999] bg-red-600 px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 transition-all duration-300 transform tranamber-y-0 opacity-100 text-white font-bold text-sm md:text-base';
        toastEl.innerHTML = `<span class="text-xl">❌</span><span>${message}</span>`;
        
        // 錯誤後 3 秒自動往下隱藏消失
        setTimeout(() => {
            toastEl.classList.remove('tranamber-y-0', 'opacity-100');
            toastEl.classList.add('tranamber-y-10', 'opacity-0');
        }, 3000);
    }
};
