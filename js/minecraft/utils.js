const { useState } = React;

// --- 共用圖片組件 (支援 Fallback 替代文字) ---
const McImg = ({ src, fallback, className, ...props }) => {
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

// --- 升級版：Web Audio API 核心系統 (無延遲引擎) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const audioBufferCache = {};

// 預先載入並將音檔解碼為記憶體緩衝區
const preloadFastSound = async (url) => {
    if (audioBufferCache[url]) return; 
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioBufferCache[url] = audioBuffer;
    } catch (e) {
        console.warn("Web Audio API 載入失敗，退回傳統模式:", url, e);
    }
};

// 播放緩存音效
const playCachedSound = (url) => {
    // 解決瀏覽器自動播放限制
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (!audioBufferCache[url]) {
        // 如果還沒載入完，退回使用傳統 Audio
        const fallbackAudio = new Audio(url);
        fallbackAudio.volume = 0.6;
        fallbackAudio.play().catch(() => {});
        return;
    }

    // 建立無延遲音源節點
    const source = audioCtx.createBufferSource();
    source.buffer = audioBufferCache[url];
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.6; // 統一音量 0.6
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0); // 🚀 零延遲立即播放
};
window.McImg = McImg;
window.preloadFastSound = preloadFastSound;
window.playCachedSound = playCachedSound;