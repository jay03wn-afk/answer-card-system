const { useState } = React;

// 1. 強制將圖片組件綁定在 window 上
window.McImg = function McImg({ src, fallback, className, ...props }) {
    const [error, setError] = useState(false);
    
    if (error) {
        return (
            <span className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {fallback}
            </span>
        );
    }
    
    return (
        <img 
            src={src} 
            className={className} 
            onError={() => setError(true)} 
            alt={fallback || "img"} 
            {...props} 
        />
    );
};

// 2. 音效引擎設定
window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
window.audioBufferCache = {};

// 3. 強制將載入音效函式綁定在 window 上
window.preloadFastSound = async function(url) {
    if (window.audioBufferCache[url]) return; 
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await window.audioCtx.decodeAudioData(arrayBuffer);
        window.audioBufferCache[url] = audioBuffer;
    } catch (e) {
        console.warn("Web Audio API 載入失敗，退回傳統模式:", url, e);
    }
};

// 4. 強制將播放音效函式綁定在 window 上
window.playCachedSound = function(url) {
    if (window.audioCtx.state === 'suspended') {
        window.audioCtx.resume();
    }

    if (!window.audioBufferCache[url]) {
        const fallbackAudio = new Audio(url);
        fallbackAudio.volume = 0.6;
        fallbackAudio.play().catch(() => {});
        return;
    }

    const source = window.audioCtx.createBufferSource();
    source.buffer = window.audioBufferCache[url];
    const gainNode = window.audioCtx.createGain();
    gainNode.gain.value = 0.6;
    
    source.connect(gainNode);
    gainNode.connect(window.audioCtx.destination);
    source.start(0);
};