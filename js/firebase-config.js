const firebaseConfig = {
    apiKey: "AIzaSyBAGM92NBQnUlI1gnLRK-mufM6YtDq5sHk",
    authDomain: "anser-card.firebaseapp.com",
    projectId: "anser-card",
    messagingSenderId: "224666683961",
    appId: "1:224666683961:web:351991d6cbc8543b181be8"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

try {
    db.enablePersistence({ synchronizeTabs: true });
} catch (err) {
    console.warn("無法啟動離線快取：", err);
}

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
