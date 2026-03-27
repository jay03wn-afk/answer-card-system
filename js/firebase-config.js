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

// 處理試卷官方標籤的函式 ([#op] 金色標籤)
const renderTestName = (name) => {
    if (name && name.endsWith('[#op]')) {
        return (
            <span className="font-bold text-yellow-600 drop-shadow-md">
                {name.replace('[#op]', '')} 
                <span className="text-[10px] bg-yellow-500 text-black px-1 py-0.5 rounded ml-1 tracking-widest align-middle">官方</span>
            </span>
        );
    }
    return name;
};
