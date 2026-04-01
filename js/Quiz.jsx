// --- 新增：清理試卷名稱輔助函式 ---
const cleanQuizName = (name) => {
    if (!name) return '';
    return name.replace(/\[#(op|m?nm?st)\]/gi, '').trim();
};

// --- 新增：特殊試卷名稱渲染輔助函式 ---
const renderTestName = (rawName, isCompleted = false) => {
    if (!rawName) return '';
    const cleanName = cleanQuizName(rawName);
    const isOp = /\[#op\]/i.test(rawName);
    const isMnst = /\[#m?nm?st\]/i.test(rawName);

    if (isOp) {
        return (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 min-w-0 w-full">
                <span className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-400 px-1.5 py-0.5 text-xs font-black shadow-sm no-round whitespace-nowrap self-start sm:self-auto shrink-0 mt-0.5 sm:mt-0">🏆 國考題</span>
                <span className="text-yellow-700 dark:text-yellow-400 font-bold break-all sm:break-words min-w-0 flex-1">{cleanName}</span>
            </div>
        );
    }
    if (isMnst) {
        return (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 min-w-0 w-full">
                <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto shrink-0 mt-0.5 sm:mt-0">
                    <span className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-400 px-1.5 py-0.5 text-xs font-black shadow-sm no-round whitespace-nowrap">📘 模擬考</span>
                    {!isCompleted && <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-1 py-0.5 no-round whitespace-nowrap font-bold">💎 及格獎勵</span>}
                </div>
                <span className="text-blue-700 dark:text-blue-400 font-bold break-all sm:break-words min-w-0 flex-1">{cleanName}</span>
            </div>
        );
    }
    return <div className="break-all sm:break-words min-w-0 w-full">{cleanName}</div>;
};

// --- 新增：富文本題目解析輔助函式 ---

// --- 新增：富文本題目解析輔助函式 ---
// --- 新增：富文本題目與詳解解析輔助函式 ---
const processQuestionContent = (content, isHtml) => {
    if (!content) return content;
    if (isHtml) {
        return content.replace(/\[Q\.?0*(\d+)\]/gi, '<span id="q-marker-$1" class="q-marker inline-block font-black text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded shadow-sm transition-all border border-blue-200 dark:border-blue-700 mx-1">[Q.$1]</span>');
    }
    return content;
};

const processExplanationContent = (content, isHtml) => {
    if (!content) return content;
    if (isHtml) {
        return content.replace(/\[A\.?0*(\d+)\]/gi, '<span id="a-marker-$1" class="a-marker inline-block font-black text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900 px-1.5 py-0.5 rounded shadow-sm transition-all border border-green-200 dark:border-green-700 mx-1">[A.$1]</span>');
    }
    return content;
};

const stripQuestionMarkers = (html) => {
    if (!html) return html;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const markers = tempDiv.querySelectorAll('.q-marker, .a-marker');
    markers.forEach(marker => {
        marker.replaceWith(marker.textContent); 
    });
    return tempDiv.innerHTML;
};

const extractSpecificQuestion = (content, qNum, isHtml) => {
    if (!content) return '';
    const regexStr = `\\[Q\\.?0*${qNum}\\]([\\s\\S]*?)(?=\\[Q\\.?\\d+\\]|\\[End\\]|$)`;
    const regex = new RegExp(regexStr, 'i');
    const match = content.match(regex);
    if (match) {
        const raw = match[1];
        if (isHtml) {
            const tmp = document.createElement('DIV');
            tmp.innerHTML = raw;
            return (tmp.textContent || tmp.innerText || '').trim();
        }
        return raw.trim();
    }
    return '';
};

const extractSpecificExplanation = (content, qNum) => {
    if (!content) return '';
    const regexStr = `\\[A\\.?0*${qNum}\\]([\\s\\S]*?)(?=\\[A\\.?\\d+\\]|\\[End\\]|$)`;
    const regex = new RegExp(regexStr, 'i');
    const match = content.match(regex);
    if (match) {
        return match[1].trim(); // 保留 HTML 結構供顯示
    }
    return '';
};

// --- 新增：富文本/圖片輸入組件 ---
// --- 新增：共用載入動畫組件 ---
function LoadingSpinner({ text = "載入中..." }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-black dark:border-white rounded-full animate-spin"></div>
            <div className="text-gray-500 dark:text-gray-400 font-bold animate-pulse">{text}</div>
        </div>
    );
}
// --- 新增：富文本/圖片輸入組件 ---
function RichInput({ label, text, setText, image, setImage, maxLength = 300, showAlert }) {
    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                handleImageUpload(file);
                break;
            }
        }
    };

    const handleImageUpload = (file) => {
        if (file.size > 10 * 1024 * 1024) {
            return showAlert("❌ 圖片大小不能超過 10MB！");
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                const MAX_DIM = 800; // 壓縮圖片避免超過資料庫單筆1MB限制
                if (w > h && w > MAX_DIM) { h *= MAX_DIM / w; w = MAX_DIM; }
                else if (h > MAX_DIM) { w *= MAX_DIM / h; h = MAX_DIM; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                
                // ✨ 優化：將壓縮後的圖片上傳至 Storage
                canvas.toBlob(async (blob) => {
                    if (!blob) return showAlert("圖片處理失敗");
                    // 先用一個文字提示用戶正在上傳
                    showAlert("圖片上傳中，請稍候...");
                    
                    try {
                        // 使用當前使用者 ID 與時間戳作為檔名
                        const uid = window.auth.currentUser ? window.auth.currentUser.uid : 'guest';
                        const filePath = `uploads/${uid}/${Date.now()}.jpg`;
                        const storageRef = window.storage.ref(filePath);
                        
                        await storageRef.put(blob);
                        const downloadURL = await storageRef.getDownloadURL();
                        
                        // 將取得的輕量化 URL 設定為圖片狀態
                        setImage(downloadURL);
                        // 關閉提示 (如果你的 showAlert 有自動關閉機制，或者可以用一個成功提示覆蓋)
                        showAlert("✅ 圖片上傳成功！");
                    } catch (err) {
                        showAlert("圖片上傳失敗：" + err.message);
                    }
                }, 'image/jpeg', 0.6);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{label} (最多 {maxLength} 字)</label>
            <div className="border border-gray-300 dark:border-gray-600 bg-white relative no-round">
                <textarea
                    className="w-full p-3 outline-none bg-transparent text-black resize-none custom-scrollbar text-sm"
                    rows="3"
                    placeholder="輸入文字，或直接在這裡貼上圖片 (Ctrl+V)..."
                    value={text}
                    onChange={e => setText(e.target.value.slice(0, maxLength))}
                    onPaste={handlePaste}
                />
                <div className="absolute bottom-1 right-2 text-xs text-gray-400 font-bold bg-white px-1">
                    {text.length}/{maxLength}
                </div>
            </div>
            {image && (
                <div className="mt-2 relative inline-block border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-1">
                    <img src={image} className="max-h-40 object-contain" alt="附圖" />
                    <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-md transition-colors">✖</button>
                </div>
            )}
            <div className="mt-1 flex justify-end">
                <input type="file" accept="image/*" className="hidden" id={`file_${label}`} onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0])} />
                <label htmlFor={`file_${label}`} className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 no-round cursor-pointer font-bold transition-colors border border-gray-300 dark:border-gray-600">
                    📎 選擇圖片上傳
                </label>
            </div>
        </div>
    );
}

// --- 新增：富文本編輯器 (支援 Word 貼上) ---
// --- 新增：富文本編輯器 (支援 Word 貼上與自動圖片壓縮上傳至 Storage) ---
// --- 新增：富文本編輯器 (全面防禦 Base64 塞爆資料庫版) ---
function ContentEditableEditor({ value, onChange, placeholder, wrapperClassName = "relative w-full mb-6", 
editorClassName = "w-full h-64 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm custom-scrollbar overflow-y-auto", showAlert }) {
    const editorRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value && !isFocused) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value, isFocused]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    // 專門處理「單張圖片檔案」的上傳與壓縮
    const uploadSingleFile = async (file) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const path = `uploads/${window.auth.currentUser.uid}/${Date.now()}_${file.name}`;
            const storageRef = window.storage.ref(path);
            
            // 💡 改用監聽模式，避免 await 直接掛起
            const downloadURL = await new Promise((resolve, reject) => {
                const task = storageRef.put(file);
                task.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log('上傳進度: ' + Math.round(progress) + '%');
                    },
                    (error) => {
                        console.error("Firebase 上傳錯誤:", error);
                        reject(error);
                    },
                    async () => {
                        const url = await task.snapshot.ref.getDownloadURL();
                        resolve(url);
                    }
                );
            });

            // 這裡保留你原本要把 URL 塞進編輯器的邏輯
            document.execCommand('insertHTML', false, `<img src="${downloadURL}" style="max-width:100%; border-radius:8px;" />`);
            if (showAlert) showAlert("✅ 圖片上傳成功");
        } catch (error) {
            console.error(error);
            if (showAlert) showAlert("❌ 上傳失敗，請稍後再試");
        } finally {
            setIsUploading(false);
        }
    };

    // ✨ 終極攔截器：同時處理「單張截圖」與「Word 圖文混排 (含大量 Base64)」
    const handlePaste = async (e) => {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        // 情況 1：處理純粹的圖片複製 (例如 Line 截圖、直接按 PrintScreen)
        const items = clipboardData.items;
        let hasImageItem = false;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                hasImageItem = true;
                e.preventDefault(); 
                const file = items[i].getAsFile();
                if (!file) continue;

                setIsUploading(true);
                const tempId = 'img-' + Date.now();
                document.execCommand('insertHTML', false, `<span id="${tempId}" class="text-blue-500 font-bold">[🖼️ 圖片上傳中...]</span>`);
                handleInput();

                uploadSingleFile(file, (url, err) => {
                    if (editorRef.current) {
                        let currentHtml = editorRef.current.innerHTML;
                        const regex = new RegExp(`<span id="${tempId}"[^>]*>.*?<\\/span>`, 'g');
                        if (url) {
                            currentHtml = currentHtml.replace(regex, `<img src="${url}" style="max-width: 100%; height: auto; border: 1px solid #ccc; margin: 10px 0; border-radius: 4px;" alt="試題附圖" />`);
                        } else {
                            currentHtml = currentHtml.replace(regex, `<span class="text-red-500">[上傳失敗]</span>`);
                            if (showAlert && err) showAlert("圖片上傳失敗：" + err.message);
                        }
                        editorRef.current.innerHTML = currentHtml;
                        handleInput();
                    }
                    setIsUploading(false);
                });
                break; // 處理完單張圖片就跳出
            }
        }

        if (hasImageItem) return;

        // 情況 2：處理從 Word 或網頁複製的「圖文混排」(最容易塞爆資料庫的元凶)
        // ✨ 修正後的 handlePaste 邏輯 (只截取 htmlData 處理部分)
const htmlData = clipboardData.getData('text/html');
if (htmlData && htmlData.includes('data:image')) {
            e.preventDefault();
            setIsUploading(true);
            const tempId = 'paste-' + Date.now();
            document.execCommand('insertHTML', false, `<div id="${tempId}" style="color:blue; font-weight:bold;">🔄 圖片正在並行壓縮與上傳，請稍候...</div>`);

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlData, 'text/html');
            const images = Array.from(doc.querySelectorAll('img[src^="data:image"]'));

            try {
                // 💡 改成 Promise.all 同時處理，速度快 3 倍
                await Promise.all(images.map(async (img) => {
                    const src = img.getAttribute('src');
                    const imgObj = new Image();
                    imgObj.src = src;
                    await new Promise(r => imgObj.onload = r);

                    const canvas = document.createElement('canvas');
                    let w = imgObj.width, h = imgObj.height;
                    if (w > 800) { h *= 800 / w; w = 800; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(imgObj, 0, 0, w, h);

                    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.6));
                    const path = `uploads/${window.auth.currentUser.uid}/paste_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                    const ref = window.storage.ref(path);

                    // 💡 加入監控，確保一張卡住不會全部死掉
                    await new Promise((resolve, reject) => {
                        const task = ref.put(blob);
                        task.on('state_changed', 
                            (snap) => console.log(`上傳中: ${Math.round((snap.bytesTransferred/snap.totalBytes)*100)}%`),
                            reject,
                            async () => {
                                const url = await task.snapshot.ref.getDownloadURL();
                                img.setAttribute('src', url);
                                img.style.maxWidth = "100%";
                                resolve();
                            }
                        );
                    });
                }));

                const finalHtml = doc.body.innerHTML;
                const editor = document.querySelector('[contenteditable="true"]');
                if (editor) {
                    editor.innerHTML = editor.innerHTML.replace(new RegExp(`<div id="${tempId}".*?</div>`), finalHtml);
                }
            } catch (err) {
                console.error("上傳失敗", err);
                alert("圖片處理失敗，請檢查網路連接");
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className={wrapperClassName}>
            {!value && !isFocused && !isUploading && (
                <div className="absolute top-3 left-3 text-gray-400 pointer-events-none text-sm z-10">
                    {placeholder}
                </div>
            )}
            {isUploading && (
                 <div className="absolute top-2 right-2 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded shadow z-10 animate-pulse border border-blue-200">
                     上傳處理中...
                 </div>
            )}
            <div
                ref={editorRef}
                contentEditable
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                    setIsFocused(false);
                    handleInput();
                }}
                onInput={handleInput}
                onPaste={handlePaste} // ✨ 綁定全新的終極攔截器
                className={`${editorClassName} rich-text-container`}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            />
        </div>
    );
}

// --- 新增：錯題編輯 Modal ---
function WrongBookModal({ title, initialData, onClose, onSave, showAlert }) {
    const [folder, setFolder] = useState(initialData?.folder || '未分類');
    const [newFolder, setNewFolder] = useState('');
    const [qText, setQText] = useState(initialData?.qText || '');
    const [qImage, setQImage] = useState(initialData?.qImage || null);
    const [nText, setNText] = useState(initialData?.nText || '');
    const [nImage, setNImage] = useState(initialData?.nImage || null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        const finalFolder = (folder === '新增資料夾' ? newFolder.trim() : folder) || '未分類';
        setIsSaving(true);
        await onSave({ folder: finalFolder, qText: qText.trim(), qImage, nText: nText.trim(), nImage });
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-lg no-round shadow-2xl transform transition-all max-h-[90dvh] overflow-y-auto custom-scrollbar border-t-4 border-black dark:border-gray-500">
                <h3 className="font-black text-xl mb-4 flex justify-between items-center dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                    <span>{title}</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 font-bold transition-colors">✖</button>
                </h3>
                
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">📁 選擇資料夾</label>
                    <select value={folder} onChange={e => setFolder(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none text-sm mb-2">
                        {initialData?.userFolders && initialData.userFolders.map(f => <option key={f} value={f}>{f}</option>)}
                        {!initialData?.userFolders?.includes('未分類') && <option value="未分類">未分類</option>}
                        <option value="新增資料夾">+ 新增資料夾</option>
                    </select>
                    {folder === '新增資料夾' && (
                        <input type="text" placeholder="輸入新資料夾名稱..." value={newFolder} onChange={e => setNewFolder(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-black dark:text-white no-round outline-none text-sm" />
                    )}
                </div>

                <RichInput label="📝 題目內容" text={qText} setText={setQText} image={qImage} setImage={setQImage} maxLength={300} showAlert={showAlert} />
                <RichInput label="💡 我的筆記 / 詳解" text={nText} setText={setNText} image={nImage} setImage={setNImage} maxLength={300} showAlert={showAlert} />
                
                <div className="flex justify-end space-x-3 mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <button onClick={onClose} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-6 py-2 no-round font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-black dark:bg-gray-200 text-white dark:text-black px-8 py-2 no-round font-black text-sm hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors shadow-md">
                        {isSaving ? '儲存中...' : '💾 儲存'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- 錯題整理組件 ---
function WrongBookDashboard({ user, showAlert, showConfirm, showPrompt, onContinueQuiz }) {
    const [wrongItems, setWrongItems] = useState([]);
    const [customFolders, setCustomFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [currentFolder, setCurrentFolder] = useState('全部');
    const [previewImage, setPreviewImage] = useState(null);

    // ✨ 新增：跳轉試卷時的載入狀態
    const [isJumping, setIsJumping] = useState(false);

    // ✨ 新增：省流機制與極速同步狀態
    const [visibleLimit, setVisibleLimit] = useState(10);
    const [isSyncingWb, setIsSyncingWb] = useState(false);

    useEffect(() => {
        const unsubItems = window.db.collection('users').doc(user.uid).collection('wrongBook')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                setWrongItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
            
        const unsubUser = window.db.collection('users').doc(user.uid).onSnapshot(doc => {
            if (doc.exists && doc.data().wrongBookFolders) {
                setCustomFolders(doc.data().wrongBookFolders);
            }
        });

        return () => { unsubItems(); unsubUser(); };
    }, [user.uid]);

    const folders = ['全部', ...new Set([...customFolders, ...wrongItems.map(item => item.folder || '未分類')])];
    const filteredItems = currentFolder === '全部' ? wrongItems : wrongItems.filter(item => (item.folder || '未分類') === currentFolder);

    // ✨ 切換資料夾時重置顯示數量
    useEffect(() => {
        setVisibleLimit(10);
    }, [currentFolder]);

    const displayedItems = filteredItems.slice(0, visibleLimit);

    // ✨ 極速背景同步機制：只針對目前畫面上顯示的十題去檢查更新！極大減少讀取時間
    useEffect(() => {
        if (displayedItems.length === 0) return;
        
        const checkUpdates = async () => {
            setIsSyncingWb(true);
            const uniqueQuizIds = [...new Set(displayedItems.map(item => item.quizId).filter(Boolean))];
            let needsUpdate = false;
            const batch = window.db.batch();

            for (const qId of uniqueQuizIds) {
                try {
                    const quizDoc = await window.db.collection('users').doc(user.uid).collection('quizzes').doc(qId).get();
                    if (!quizDoc.exists) continue;
                    const quizData = quizDoc.data();
                    let latestKeyInput = quizData.correctAnswersInput || '';

                    if (quizData.isTask && quizData.taskId) {
                        const taskDoc = await window.db.collection('publicTasks').doc(quizData.taskId).get();
                        if (taskDoc.exists) {
                            latestKeyInput = taskDoc.data().correctAnswersInput || latestKeyInput;
                        }
                    }

                    const cleanKey = latestKeyInput.replace(/[^a-dA-DZz,]/g, '');
                    let keyArray = cleanKey.includes(',') ? cleanKey.split(',') : (cleanKey.match(/[A-DZ]|[a-dz]+/g) || []);

                    displayedItems.filter(item => item.quizId === qId).forEach(item => {
                        const qNum = item.questionNum;
                        const newKey = keyArray[qNum - 1] || '';
                        if (item.correctAns !== newKey && newKey !== '') {
                            const ref = window.db.collection('users').doc(user.uid).collection('wrongBook').doc(item.id);
                            batch.update(ref, { correctAns: newKey });
                            needsUpdate = true;
                        }
                    });
                } catch (e) { console.error("背景檢查錯題本更新失敗", e); }
            }
            
            if (needsUpdate) {
                await batch.commit();
            }
            setIsSyncingWb(false);
        };
        
        const timer = setTimeout(() => { checkUpdates(); }, 300);
        return () => clearTimeout(timer);
        
    }, [displayedItems.map(i => i.id).join(','), user.uid]);

    const handleDelete = (id) => {
        showConfirm("確定要刪除這筆錯題紀錄嗎？", () => {
            window.db.collection('users').doc(user.uid).collection('wrongBook').doc(id).delete();
        });
    };

   const handleGoToQuiz = async (quizId) => {
        setIsJumping(true); // ✨ 開啟跳轉載入畫面
        try {
            // ✨ 修正：移除 { source: 'server' }，讓 Firebase 彈性使用本地快取，徹底解決離線或網路不穩時的報錯
            const doc = await window.db.collection('users').doc(user.uid).collection('quizzes').doc(quizId).get();
            if(doc.exists) {
                const data = doc.data();
                // ✨ 為了讓使用者看到載入畫面，加上微小延遲讓 React 渲染
                setTimeout(() => {
                    onContinueQuiz({ id: doc.id, ...data, forceStep: 'results' });
                }, 50);
            } else {
                showAlert('❌ 找不到原始試卷，可能已被刪除！');
                setIsJumping(false);
            }
        } catch(e) {
            showAlert('❌ 載入失敗：' + e.message);
            setIsJumping(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 pt-0 h-full overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b-2 border-black dark:border-white pb-2 shrink-0">
                <h1 className="text-2xl font-black dark:text-white flex items-center">
                    📓 錯題整理
                </h1>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">專屬你的弱點突破筆記本</p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-4 shrink-0 w-full min-w-0">
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 flex-grow w-full min-w-0">
                    {folders.map(f => (
                        <button key={f} onClick={() => setCurrentFolder(f)} className={`px-4 py-1.5 font-bold text-sm no-round whitespace-nowrap transition-colors shrink-0 ${currentFolder === f ? 'bg-black dark:bg-gray-200 text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'}`}>
                            {f === '全部' ? '🔍 ' : '📁 '} {f}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 shrink-0 w-full md:w-auto min-w-0">
                    <button 
                        onClick={() => {
                            showPrompt("請輸入新的錯題資料夾名稱：", "", (folderName) => {
                                const cleanName = folderName?.trim();
                                if (cleanName && !folders.includes(cleanName)) {
                                    window.db.collection('users').doc(user.uid).set({
                                        wrongBookFolders: window.firebase.firestore.FieldValue.arrayUnion(cleanName)
                                    }, { merge: true }).then(() => {
                                        setCurrentFolder(cleanName);
                                        showAlert(`✅ 已成功建立錯題資料夾「${cleanName}」！`);
                                    });
                                } else if (folders.includes(cleanName)) {
                                    showAlert('❌ 資料夾已存在！');
                                }
                            });
                        }} 
                        className="px-3 py-1.5 text-sm font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 no-round whitespace-nowrap transition-colors shrink-0"
                    >
                        + 新增錯題資料夾
                    </button>
                </div>
            </div>
            
            {loading ? <LoadingSpinner text="載入錯題中..." /> : 
             filteredItems.length === 0 ? <div className="text-center text-gray-500 dark:text-gray-400 py-16 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">目前沒有收錄錯題。<br/>在測驗交卷後的檢視頁面，點擊「📓 收錄錯題」即可將題目加到這裡！</div> :
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                 {displayedItems.map(item => (
                     <div key={item.id} className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 shadow-sm relative no-round hover:shadow-md transition-shadow">
                         <button onClick={() => handleDelete(item.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold z-10">✖</button>
                         <div className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-2 pr-6 flex items-center justify-between">
                            <span className="truncate">出自: {cleanQuizName(item.quizName)} - 第 {item.questionNum} 題</span>
                            {item.quizId && (
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGoToQuiz(item.quizId); }} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline shrink-0 ml-2">
                                    🔗 檢視試題
                                </button>
                            )}
                         </div>
                         <div className="flex space-x-4 mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                            <span className="text-sm font-bold text-red-500">你的答案: {item.userAns || '未填'}</span>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">正確答案: {item.correctAns}</span>
                         </div>
                         
                         {(item.qText || item.qImage) && (
                             <div className="mb-3">
                                 <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">📝 題目</p>
                                 <div className="bg-white p-3 text-sm text-gray-900 whitespace-pre-wrap border-l-4 border-blue-500 font-bold shadow-sm">
                                     {item.qText && <p>{item.qText}</p>}
                                     {item.qImage && <img src={item.qImage} onClick={() => setPreviewImage(item.qImage)} className="mt-2 max-h-40 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity" alt="題目附圖" title="點擊放大" />}
                                 </div>
                             </div>
                         )}

                         {(item.nText || item.note || item.nImage) && (
                             <div className="mb-3">
                                 <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">💡 筆記</p>
                                 <div className="bg-yellow-50 dark:bg-gray-900 p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border-l-4 border-yellow-400 font-bold">
                                     {(item.nText || item.note) && <p>{item.nText || item.note}</p>}
                                     {item.nImage && <img src={item.nImage} onClick={() => setPreviewImage(item.nImage)} className="mt-2 max-h-40 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity" alt="筆記附圖" title="點擊放大" />}
                                 </div>
                             </div>
                         )}

                         <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                             <div className="flex items-center gap-1">
                                 <span className="text-[10px] text-gray-400 font-bold">📁</span>
                                 <select 
                                     value={item.folder || '未分類'} 
                                     onChange={(e) => {
                                         window.db.collection('users').doc(user.uid).collection('wrongBook').doc(item.id).update({
                                             folder: e.target.value
                                         }).then(() => showAlert('✅ 分類已更新！'));
                                     }}
                                     className="text-[10px] text-gray-600 dark:text-gray-300 font-bold px-1 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 outline-none cursor-pointer"
                                 >
                                     {folders.filter(f => f !== '全部').map(f => (
                                         <option key={f} value={f}>{f}</option>
                                     ))}
                                 </select>
                             </div>
                             <button onClick={() => setEditingItem(item)} className="text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors">✏️ 編輯內容</button>
                         </div>
                     </div>
                 ))}
             </div>
            }
            
            {/* ✨ 新增：錯題本的「載入更多」按鈕 */}
            {!loading && filteredItems.length > visibleLimit && (
                <div className="flex justify-center mt-2 mb-10">
                    <button 
                        onClick={() => setVisibleLimit(prev => prev + 10)} 
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-6 py-2 font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        {isSyncingWb ? <><div className="w-4 h-4 border-2 border-gray-400 border-t-black dark:border-t-white rounded-full animate-spin"></div>同步最新解答中...</> : '⬇️ 載入更多錯題...'}
                    </button>
                </div>
            )}

            {previewImage && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 cursor-zoom-out" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} className="max-w-full max-h-[90vh] object-contain shadow-2xl" alt="放大預覽" />
                    <button className="absolute top-4 right-4 text-white text-3xl font-bold bg-black/50 w-12 h-12 rounded-full flex items-center justify-center hover:bg-black/80">✖</button>
                </div>
            )}

            {/* ✨ 新增：跳轉試卷時的光速載入 Modal */}
            {isJumping && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[200] p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 w-full max-w-sm no-round shadow-2xl text-center border-t-8 border-indigo-500 animate-fade-in">
                        <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black mb-2 dark:text-white">🚀 正在載入試卷...</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">正在為您從雲端抓取資料並解壓縮，請稍候</p>
                    </div>
                </div>
            )}

           {editingItem && (
                <WrongBookModal
                    title={`編輯錯題 - 第 ${editingItem.questionNum} 題`}
                    initialData={{
                        folder: editingItem.folder || '未分類',
                        userFolders: folders.filter(f => f !== '全部'),
                        qText: editingItem.qText || '',
                        qImage: editingItem.qImage || null,
                        nText: editingItem.nText || editingItem.note || '',
                        nImage: editingItem.nImage || null
                    }}
                    onClose={() => setEditingItem(null)}
                    onSave={async (data) => {
                        await window.db.collection('users').doc(user.uid).collection('wrongBook').doc(editingItem.id).update({
                            folder: data.folder || '未分類',
                            qText: data.qText,
                            qImage: data.qImage,
                            nText: data.nText,
                            nImage: data.nImage,
                            note: window.firebase.firestore.FieldValue.delete()
                        });
                        if (data.folder && !folders.includes(data.folder)) {
                             window.db.collection('users').doc(user.uid).set({
                                 wrongBookFolders: window.firebase.firestore.FieldValue.arrayUnion(data.folder)
                             }, { merge: true });
                        }
                        showAlert('✅ 修改成功！');
                        setEditingItem(null);
                    }}
                    showAlert={showAlert}
                />
            )}
        </div>
    );
}

// --- 任務牆看板組件 (含國考題金色分類與分析) ---
function TaskWallDashboard({ user, showAlert, showConfirm, onContinueQuiz }) {
    const [tasks, setTasks] = useState({});
    const [officialTasks, setOfficialTasks] = useState({});
    const [myTasks, setMyTasks] = useState({}); 
    const [loading, setLoading] = useState(true);
    const [taskLimit, setTaskLimit] = useState(100); // ✨ 新增：任務牆動態載入數量的狀態
    
    // ✨ 新增搜尋狀態
    const [searchQuery, setSearchQuery] = useState('');

    const normalCategories = [
        '1. 藥物分析學', '2. 生藥學', '3. 中藥學', 
        '4. 藥物化學與藥理學', '5. 藥劑學', '6. 生物藥劑學', '模擬試題 (其他)'
    ];
    
    const opCategories = [
        '1. 藥理學與藥物化學', '2. 藥物分析學與生藥學(含中藥學)', '3. 藥劑學與生物藥劑學', '國考題 (其他)'
    ];

    useEffect(() => {
        const unsubTasks = window.db.collection('publicTasks')
            .orderBy('createdAt', 'desc')
            .limit(taskLimit) // ✨ 改吃我們設定的動態變數
            .onSnapshot(snap => {
                const groupedNormal = normalCategories.reduce((acc, cat) => ({ ...acc, [cat]: [] }), {});
                const groupedOfficial = opCategories.reduce((acc, cat) => ({ ...acc, [cat]: [] }), {});
                
                snap.docs.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() };
                    
                    // ✨ 修復：確保從任務牆抓取資料時，富文本內容有被正確賦值
                    if (data.questionText && typeof data.questionText === 'string' && data.questionText.startsWith("JZC|")) {
                         try { data.questionText = window.jzDecompress(data.questionText); } catch(e) {}
                    }
                    
                    if (data.testName && data.testName.includes('[#op]')) {
                        let cat = data.category || '國考題 (其他)';
                        if (!opCategories.includes(cat)) {
                            if (data.testName.includes('藥理') || data.testName.includes('藥物化學')) cat = '1. 藥理學與藥物化學';
                            else if (data.testName.includes('藥物分析') || data.testName.includes('生藥') || data.testName.includes('中藥')) cat = '2. 藥物分析學與生藥學(含中藥學)';
                            else if (data.testName.includes('藥劑') || data.testName.includes('生物藥劑')) cat = '3. 藥劑學與生物藥劑學';
                            else cat = '國考題 (其他)';
                        }
                        if (groupedOfficial[cat] && groupedOfficial[cat].length < 10) groupedOfficial[cat].push(data);
                    } else {
                        const cat = data.category || '模擬試題 (其他)';
                        if (groupedNormal[cat] && groupedNormal[cat].length < 5) groupedNormal[cat].push(data);
                    }
                });
                
                setTasks(groupedNormal);
                setOfficialTasks(groupedOfficial);
                setLoading(false);
            }, err => {
                console.error(err);
                setLoading(false);
            });

        // ✨ 修改：取得包含出題者自己原稿的 quizzes，加入 try-catch 防當機保護與效能優化
        const unsubMyQuizzes = window.db.collection('users').doc(user.uid).collection('quizzes')
            .onSnapshot(snap => {
                const myTaskMap = {};
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.taskId) {
                        try {
                            data.userAnswers = data.userAnswers ? window.jzDecompress(data.userAnswers) : [];
                            data.results = data.results ? window.jzDecompress(data.results) : null;
                        } catch (e) {
                            console.error("解壓縮失敗", e);
                        }
                        myTaskMap[data.taskId] = { id: doc.id, ...data };
                    }
                });

                // 第二階段：出題者本人的原始考卷具有最高優先權，將覆蓋任何空白的任務副本
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (!data.isShared && !data.isTask) {
                        // ✨ 修正：出題者本人的考卷也必須經過解壓縮，否則字串無法使用 filter
                        try {
                            data.userAnswers = Array.isArray(data.userAnswers) ? data.userAnswers : (data.userAnswers ? window.jzDecompress(data.userAnswers) : []);
                            data.results = data.results && typeof data.results === 'string' ? window.jzDecompress(data.results) : data.results;
                        } catch (e) {
                            console.error("解壓縮失敗", e);
                            data.userAnswers = Array.isArray(data.userAnswers) ? data.userAnswers : [];
                        }
                        // 若是出題者本人自己的考卷，任務ID 就是該考卷的 doc.id
                        // 在此注入 isTask 與 taskId 以便讓後續 UI 可以判斷為任務模式 (如開放討論區)
                        myTaskMap[doc.id] = { id: doc.id, ...data, isTask: true, taskId: doc.id };
                    }
                });
                setMyTasks(myTaskMap);
            });
            
        return () => {
            unsubTasks();
            unsubMyQuizzes();
        };
    }, [user.uid, taskLimit]); // ✨ 將 taskLimit 加入依賴項，當按鈕按下去時就會重新抓資料

    // 計算國考題能力分析
    const officialStats = { totalScore: 0, count: 0, categories: {} };
    opCategories.forEach(c => officialStats.categories[c] = { score: 0, count: 0 });

    Object.values(myTasks).forEach(localRec => {
        if (localRec.testName && localRec.testName.includes('[#op]') && localRec.results) {
            let cat = localRec.category;
            if (!cat || !opCategories.includes(cat)) {
                if (localRec.testName.includes('藥理') || localRec.testName.includes('藥物化學')) cat = '1. 藥理學與藥物化學';
                else if (localRec.testName.includes('藥物分析') || localRec.testName.includes('生藥') || localRec.testName.includes('中藥')) cat = '2. 藥物分析學與生藥學(含中藥學)';
                else if (localRec.testName.includes('藥劑') || localRec.testName.includes('生物藥劑')) cat = '3. 藥劑學與生物藥劑學';
                else cat = '國考題 (其他)';
            }
            if (officialStats.categories[cat]) {
                officialStats.totalScore += localRec.results.score;
                officialStats.count += 1;
                officialStats.categories[cat].score += localRec.results.score;
                officialStats.categories[cat].count += 1;
            }
        }
    });

    const overallAvg = officialStats.count > 0 ? Math.round(officialStats.totalScore / officialStats.count) : 0;

    const handlePlayTask = async (task, localRec) => {
        const executeEnter = async () => {
            if (localRec) {
                // ✨ 強制同步：比對雲端最新任務與本地快取，這次加入了最重要的 correctAnswersInput
                const isAnsChanged = task.correctAnswersInput && task.correctAnswersInput !== localRec.correctAnswersInput;
                
                const updatedRec = {
                    ...localRec,
                    testName: task.testName || localRec.testName,
                    questionHtml: task.questionHtml || localRec.questionHtml || '',
                    questionText: task.questionText || localRec.questionText || '',
                    explanationHtml: task.explanationHtml || localRec.explanationHtml || '',
                    correctAnswersInput: task.correctAnswersInput || localRec.correctAnswersInput || ''
                };
                
                const payload = {
                    testName: updatedRec.testName,
                    questionHtml: updatedRec.questionHtml,
                    questionText: updatedRec.questionText,
                    explanationHtml: updatedRec.explanationHtml,
                    correctAnswersInput: updatedRec.correctAnswersInput
                };

                // 如果答案有變，且玩家已經交過卷，就自動標記有答案更新
                if (isAnsChanged && localRec.results) {
                    payload.hasAnswerUpdate = true;
                    updatedRec.hasAnswerUpdate = true;
                }

                // 背景靜默更新回本地資料庫
                window.db.collection('users').doc(user.uid).collection('quizzes').doc(localRec.id).update(payload)
                    .catch(e => console.error("同步任務資料失敗", e));

                onContinueQuiz(updatedRec);
                return;
            }

            try {
                const emptyAnswers = Array(Number(task.numQuestions)).fill('');
                const emptyStarred = Array(Number(task.numQuestions)).fill(false);

                const newDocRef = await window.db.collection('users').doc(user.uid).collection('quizzes').add({
                    testName: task.testName,
                    numQuestions: task.numQuestions,
                    questionFileUrl: task.questionFileUrl || '',
                    questionText: task.questionText || '',
                    questionHtml: task.questionHtml || '',
                    explanationHtml: task.explanationHtml || '',
                    correctAnswersInput: task.correctAnswersInput || '',
                    publishAnswers: task.publishAnswers !== false,
                    userAnswers: emptyAnswers,
                    starred: emptyStarred,
                    hasTimer: task.hasTimer || false,
                    timeLimit: task.timeLimit || null,
                    timeRemaining: task.hasTimer ? (task.timeLimit * 60) : null,
                    isTask: true,
                    taskId: task.id,
                    creatorUid: task.creatorUid || '', 
                    creatorQuizId: task.id,
                    folder: '任務牆',
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });

                const newRec = await newDocRef.get();
                onContinueQuiz({ id: newRec.id, ...newRec.data() });
                
            } catch (e) {
                showAlert('啟動任務失敗：' + e.message);
            }
        };

        if (task.hasTimer && (!localRec || !localRec.results)) {
            const isNew = !localRec || !localRec.userAnswers || localRec.userAnswers.filter(a => a !== '').length === 0;
            if (isNew) {
                showConfirm(`⏱ 此任務設有時間限制（${task.timeLimit} 分鐘）。\n\n點擊「確定」後將進入並開始倒數計時，準備好了嗎？`, () => {
                    executeEnter();
                });
            } else {
                executeEnter();
            }
        } else {
            executeEnter();
        }
    };

    // 判斷搜尋後是否有資料，用來隱藏空區塊
    const hasAnyOfficial = opCategories.some(cat => officialTasks[cat] && officialTasks[cat].some(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())));
    const hasAnyNormal = normalCategories.slice(0, 6).some(cat => tasks[cat] && tasks[cat].some(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())));
    const otherTasksFiltered = tasks['模擬試題 (其他)'] ? tasks['模擬試題 (其他)'].filter(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())) : [];

    return (
        <div className="max-w-6xl mx-auto p-4 pt-0 h-full overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b-2 border-black dark:border-white pb-2 shrink-0">
                <h1 className="text-2xl font-black dark:text-white flex items-center">
                    🎯 公開任務牆
                </h1>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">完成考驗獲取獎勵鑽石！</p>
            </div>

            {/* ✨ 新增：快問快答區塊 (放在最頂端) */}
            <FastQASection user={user} showAlert={showAlert} showConfirm={showConfirm} />

            {/* ✨ 新增：搜尋任務列 */}
            <div className="mb-6 flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 shadow-sm no-round shrink-0">
                <span className="text-gray-500 mr-3 text-lg">🔍</span>
                <input
                    type="text"
                    placeholder="搜尋任務或試題名稱..."
                    className="flex-grow outline-none bg-transparent text-black dark:text-white text-sm font-bold min-w-0"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-black dark:hover:text-white ml-2 font-bold px-2">✖</button>
                )}
            </div>

           {loading ? (
                <LoadingSpinner text="正在載入公開任務..." />
            ) : (
                <div className="space-y-8 pb-10">
                    
                    {/* ✨ 加入左右排版容器：lg:grid-cols-2 讓大螢幕分兩欄，手機版自動單欄 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">

                        {/* --- 金色專屬：歷屆國考題 --- */}
                        {hasAnyOfficial && (
                            <div className="bg-gradient-to-br from-yellow-50 to-white dark:from-gray-800 dark:to-gray-900 border border-yellow-400 dark:border-yellow-600 shadow-md no-round p-5 md:p-6 w-full">
                                <h2 className="text-2xl font-black mb-4 dark:text-white border-b-2 border-yellow-400 dark:border-yellow-600 pb-2 text-yellow-700 dark:text-yellow-400 flex items-center">
                                🏆 歷屆國考題
                            </h2>
                            
                            {/* 國考能力分析圖表 (搜尋時隱藏以節省空間) */}
                            {!searchQuery && officialStats.count > 0 && (
                                <div className="mb-6 bg-white dark:bg-gray-800 p-4 border border-yellow-200 dark:border-yellow-700 shadow-sm">
                                    <h3 className="font-bold text-yellow-600 dark:text-yellow-400 mb-3">📊 國考能力分析 (平均分數)</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center text-sm font-bold">
                                            <span className="w-1/3 text-gray-600 dark:text-gray-300">總平均 ({officialStats.count}次)</span>
                                            <div className="w-2/3 bg-gray-200 dark:bg-gray-700 h-4 relative">
                                                <div className="bg-yellow-400 h-4 transition-all duration-500" style={{ width: `${overallAvg}%` }}></div>
                                                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-black drop-shadow-md">{overallAvg} 分</span>
                                            </div>
                                        </div>
                                        {opCategories.map(cat => {
                                            const stat = officialStats.categories[cat];
                                            const avg = stat.count > 0 ? Math.round(stat.score / stat.count) : 0;
                                            if (stat.count === 0) return null;
                                            return (
                                                <div key={cat} className="flex items-center text-xs font-bold">
                                                    <span className="w-1/3 text-gray-500 dark:text-gray-400 truncate pr-2" title={cat}>{cat.replace(/^[0-9]\.\s*/, '')}</span>
                                                    <div className="w-2/3 bg-gray-200 dark:bg-gray-700 h-3 relative">
                                                        <div className="bg-blue-400 h-3 transition-all duration-500" style={{ width: `${avg}%` }}></div>
                                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-black drop-shadow-md">{avg} 分</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-8">
                                {opCategories.map(cat => {
                                    const filteredOpTasks = officialTasks[cat] ? officialTasks[cat].filter(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())) : [];
                                    if (filteredOpTasks.length === 0) return null;
                                    
                                    return (
                                        <div key={cat} className="pl-4 border-l-4 border-yellow-400 dark:border-yellow-600">
                                            <h3 className="text-lg font-bold mb-4 dark:text-gray-200 text-gray-700">{cat}</h3>
                                            <div className="flex flex-col gap-2">
                                                {filteredOpTasks.map(task => {
                                                    const localRec = myTasks[task.id];
                                                    const isCompleted = localRec && localRec.results;
                                                    const inProgress = localRec && !localRec.results && Array.isArray(localRec.userAnswers) && localRec.userAnswers.filter(a => a).length > 0;

                                                    return (
                                                        <div key={task.id} className="border border-yellow-200 dark:border-yellow-700 p-3 bg-white dark:bg-gray-800 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:shadow-md transition-shadow no-round">
                                                            <div className="flex flex-col gap-1 min-w-0 flex-grow">
                                                                <h3 className="font-bold text-sm break-words whitespace-normal leading-relaxed dark:text-white" title={cleanQuizName(task.testName)}>
    {renderTestName(task.testName, isCompleted)}
</h3>
                                                                <div className="flex items-center gap-3 text-xs shrink-0 mt-1">
                                                                    <span className="text-gray-500 dark:text-gray-400">{task.numQuestions}題</span>
                                                                    {task.hasTimer && <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 border border-red-200 dark:border-red-700">⏱ {task.timeLimit}m</span>}
                                                                    {isCompleted ? (
                                                                        <span className="text-green-600 dark:text-green-400 font-bold">✅ {localRec.results.score} 分</span>
                                                                    ) : inProgress ? (
                                                                        <span className="text-orange-500 dark:text-orange-400 font-bold">📝 已填: {localRec.userAnswers.filter(a => a).length}</span>
                                                                    ) : (
                                                                        <span className="text-gray-400 font-bold">⏳ 未作答</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handlePlayTask(task, localRec)} 
                                                                className={`py-1.5 px-4 no-round font-bold text-xs transition-colors shrink-0 w-full sm:w-auto mt-2 sm:mt-0 ${isCompleted ? 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200' : 'bg-yellow-500 text-black hover:bg-yellow-600'}`}
                                                            >
                                                                {isCompleted ? '📊 查看成績與討論' : (inProgress ? '📝 繼續作答' : '⚔️ 開始')}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* --- 一般：模擬試題 --- */}
                    {hasAnyNormal && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round p-5 md:p-6 w-full">
                            <h2 className="text-2xl font-black mb-6 dark:text-white border-b-2 border-indigo-200 dark:border-indigo-900 pb-2 text-indigo-700 dark:text-indigo-400 flex items-center">
                                📚 模擬試題
                            </h2>
                            
                            <div className="space-y-8">
                                {normalCategories.slice(0, 6).map(cat => {
                                    const filteredTasks = tasks[cat] ? tasks[cat].filter(t => cleanQuizName(t.testName).toLowerCase().includes(searchQuery.toLowerCase())) : [];
                                    if (filteredTasks.length === 0) return null;

                                    return (
                                        <div key={cat} className="pl-4 border-l-4 border-indigo-300 dark:border-indigo-600">
                                            <h3 className="text-lg font-bold mb-4 dark:text-gray-200 text-gray-700">{cat}</h3>
                                            <div className="flex flex-col gap-2">
                                                {filteredTasks.map(task => {
                                                    const localRec = myTasks[task.id];
                                                    const isCompleted = localRec && localRec.results;
                                                    const inProgress = localRec && !localRec.results && Array.isArray(localRec.userAnswers) && localRec.userAnswers.filter(a => a).length > 0;

                                                    return (
                                                        <div key={task.id} className="border border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-900 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:shadow-md transition-shadow no-round">
                                                            <div className="flex flex-col gap-1 min-w-0 flex-grow">
                                                                <h3 className="font-bold text-sm break-words whitespace-normal leading-relaxed dark:text-white" title={cleanQuizName(task.testName)}>
    {renderTestName(task.testName, isCompleted)}
</h3>
                                                                <div className="flex items-center gap-3 text-xs shrink-0 mt-1">
                                                                    <span className="text-gray-500 dark:text-gray-400">{task.numQuestions}題</span>
                                                                    {task.hasTimer && <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 border border-red-200 dark:border-red-700">⏱ {task.timeLimit}m</span>}
                                                                    {isCompleted ? (
                                                                        <span className="text-green-600 dark:text-green-400 font-bold">✅ {localRec.results.score} 分</span>
                                                                    ) : inProgress ? (
                                                                        <span className="text-orange-500 dark:text-orange-400 font-bold">📝 已填: {localRec.userAnswers.filter(a => a).length}</span>
                                                                    ) : (
                                                                        <span className="text-gray-400 font-bold">⏳ 未作答</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handlePlayTask(task, localRec)} 
                                                                className={`py-1.5 px-4 no-round font-bold text-xs transition-colors shrink-0 w-full sm:w-auto mt-2 sm:mt-0 ${isCompleted ? 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200' : 'bg-black dark:bg-gray-200 text-white dark:text-black hover:bg-gray-800'}`}
                                                            >
                                                                {isCompleted ? '📊 查看成績與討論' : (inProgress ? '📝 繼續作答' : '⚔️ 開始')}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                  </div> {/* ✨ 結束左右排版容器，接下來的區塊會回到單行全寬 */}

                    {otherTasksFiltered.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round p-5 md:p-6">
                            <h2 className="text-xl font-black mb-4 dark:text-white border-b-2 border-gray-200 dark:border-gray-700 pb-2 text-gray-600 dark:text-gray-400">
                                🏷️ 其他任務
                            </h2>
                            <div className="flex flex-col gap-2">
                                {otherTasksFiltered.map(task => {
                                    const localRec = myTasks[task.id];
                                    const isCompleted = localRec && localRec.results;
                                    const inProgress = localRec && !localRec.results && Array.isArray(localRec.userAnswers) && localRec.userAnswers.filter(a => a).length > 0;

                                    return (
                                        <div key={task.id} className="border border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-900 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:shadow-md transition-shadow no-round">
                                            <div className="flex flex-col gap-1 min-w-0 flex-grow">
                                                <h3 className="font-bold text-sm break-words whitespace-normal leading-relaxed dark:text-white" title={cleanQuizName(task.testName)}>
    {renderTestName(task.testName, isCompleted)}
</h3>
                                                <div className="flex items-center gap-3 text-xs shrink-0 mt-1">
                                                    <span className="text-gray-500 dark:text-gray-400">{task.numQuestions}題</span>
                                                    {task.hasTimer && <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 border border-red-200 dark:border-red-700">⏱ {task.timeLimit}m</span>}
                                                    {isCompleted ? (
                                                        <span className="text-green-600 dark:text-green-400 font-bold">✅ {localRec.results.score} 分</span>
                                                    ) : inProgress ? (
                                                        <span className="text-orange-500 dark:text-orange-400 font-bold">📝 已填: {localRec.userAnswers.filter(a => a).length}</span>
                                                    ) : (
                                                        <span className="text-gray-400 font-bold">⏳ 未作答</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handlePlayTask(task, localRec)} 
                                                className={`py-1.5 px-4 no-round font-bold text-xs transition-colors shrink-0 w-full sm:w-auto mt-2 sm:mt-0 ${isCompleted ? 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200' : 'bg-black dark:bg-gray-200 text-white dark:text-black hover:bg-gray-800'}`}
                                            >
                                                {isCompleted ? '📊 查看成績與討論' : (inProgress ? '📝 繼續作答' : '⚔️ 開始')}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {/* ✨ 新增：任務牆的「載入更多」按鈕 */}
                    <div className="flex justify-center mt-8">
                        <button 
                            onClick={() => setTaskLimit(prev => prev + 100)} 
                            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-6 py-2 font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            ⬇️ 載入更早的任務...
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
// --- 我的題庫與測驗核心 ---
function Dashboard({ user, userProfile, onStartNew, onContinueQuiz, showAlert, showConfirm, showPrompt }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isJumping, setIsJumping] = useState(false); // ✨ 新增：跳轉載入狀態
    const [isRefreshing, setIsRefreshing] = useState(false); // ✨ 新增：背景整理狀態
    
    // 🚀 終極提速：加入題庫顯示數量限制，大幅降低網路下載量
    const [visibleLimit, setVisibleLimit] = useState(15);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const [showShareModal, setShowShareModal] = useState(null);
    const [showMoveModal, setShowMoveModal] = useState(null);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    
    // ✨ 新增：獨立的新增資料夾 Modal 狀態 (避開 global prompt 的 Enter 問題)
    const [showAddFolderModal, setShowAddFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // ✨ 新增搜尋狀態
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingShareCode, setPendingShareCode] = useState(() => new URLSearchParams(window.location.search).get('shareCode'));

    // --- 新增自動背景重新整理 (我的題庫)，每 3 秒同步一次 ---
    useEffect(() => {
        const timer = setInterval(() => {
            if (!isRefreshing) {
                window.db.collection('users').doc(user.uid).collection('quizzes')
                    .orderBy('createdAt', 'desc')
                    .limit(visibleLimit)
                    .get({ source: 'server' })
                    .then(() => setRefreshTrigger(prev => prev + 1))
                    .catch(e => console.log('背景同步略過', e));
            }
        }, 3000);
        return () => clearInterval(timer);
    }, [isRefreshing, user.uid, visibleLimit]);

    const specialFolders = ['我建立的試題', '未分類', '任務牆'];
    const rawUserFolders = (userProfile.folders || []).filter(f => !specialFolders.includes(f));
    const userFolders = [...specialFolders, ...rawUserFolders];
    
    const [currentFolder, setCurrentFolder] = useState('我建立的試題');
    const [filters, setFilters] = useState({ todo: true, doing: true, done: true });

    useEffect(() => {
        let isMounted = true;
        let fallbackTimer = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 3000);

        // 🚀 終極提速：利用 .limit() 讓 Firebase 每次只下載 15 份考卷，避開海量資料下載卡死
        const unsubscribe = window.db.collection('users').doc(user.uid).collection('quizzes')
            .orderBy('createdAt', 'desc')
            .limit(visibleLimit)
            .onSnapshot({ includeMetadataChanges: true }, snapshot => {
                if (isMounted) {
                    if (snapshot.docs.length < visibleLimit) {
                        setHasMore(false);
                    } else {
                        setHasMore(true);
                    }
                    
                    // ✨ 優化：如果是本地端發出的變更，不需要重新 loading
                    const isLocal = snapshot.metadata.hasPendingWrites;
                    
                    // ✨ 終極防卡死：將解壓縮推遲到背景執行，讓載入動畫能順暢轉動
                    setTimeout(() => {
                        setRecords(snapshot.docs.map(doc => {
                            const data = doc.data();
                            try {
                                data.results = data.results ? window.jzDecompress(data.results) : null;
                            } catch (e) {
                                console.error(e);
                            }
                            return { id: doc.id, ...data };
                        }));
                        setLoading(false);
                        clearTimeout(fallbackTimer);
                    }, 10);
                }
            }, err => {
                console.error(err);
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
            clearTimeout(fallbackTimer);
            unsubscribe();
        };
    }, [user, visibleLimit, refreshTrigger]);

    const handleDelete = (id) => {
        const rec = records.find(r => r.id === id);
        showConfirm("確定要刪除這筆紀錄嗎？資料將無法恢復！", async () => {
            try {
                await window.db.collection('users').doc(user.uid).collection('quizzes').doc(id).delete();
                if (rec && !rec.isShared && !rec.isTask) {
                    await window.db.collection('publicTasks').doc(id).delete().catch(e => console.log("任務牆無此檔案", e));
                }
            } catch (error) {
                showAlert('刪除失敗：' + error.message);
            }
        });
    }

    const handleCreateFolder = () => {
        setNewFolderName('');
        setShowAddFolderModal(true);
    };

    const submitCreateFolder = () => {
        const cleanName = newFolderName.trim();
        if(cleanName && !userFolders.includes(cleanName)) {
            window.db.collection('users').doc(user.uid).set({
                folders: window.firebase.firestore.FieldValue.arrayUnion(cleanName)
            }, { merge: true }).then(() => {
                setCurrentFolder(cleanName);
                showAlert(`✅ 已建立資料夾「${cleanName}」`);
                setShowAddFolderModal(false);
            }).catch(e => showAlert('建立失敗：' + e.message));
        } else if (userFolders.includes(cleanName)) {
            showAlert('❌ 資料夾名稱已存在');
        } else {
            showAlert('❌ 名稱不可為空白');
        }
    };

    const moveQuizToFolder = (quiz, targetFolder) => {
        if (targetFolder === '我建立的試題') return showAlert('此為自動分類，無法手動移入喔！');
        window.db.collection('users').doc(user.uid).collection('quizzes').doc(quiz.id).update({ folder: targetFolder })
        .then(() => {
            showAlert(`✅ 已成功移動至 ${targetFolder}`);
            setShowMoveModal(null);
        })
        .catch(e => showAlert('移動失敗：' + e.message));
    };
    
    const handleDeleteFolder = (folderName) => {
        showConfirm(`確定要刪除「${folderName}」資料夾嗎？\n裡面的測驗將會被自動移至「未分類」。`, async () => {
            try {
                const snapshot = await window.db.collection('users').doc(user.uid).collection('quizzes').where('folder', '==', folderName).get();
                
                // 防呆：如果資料夾裡面有試卷，才執行 batch 更新，避免空 batch 報錯
                if (!snapshot.empty) {
                    const batch = window.db.batch();
                    snapshot.docs.forEach(doc => {
                        batch.update(doc.ref, { folder: '未分類' });
                    });
                    await batch.commit();
                }

                // 改用 set + merge: true，避免其他新帳號文件尚未完全初始化而導致 update 報錯
                await window.db.collection('users').doc(user.uid).set({
                    folders: window.firebase.firestore.FieldValue.arrayRemove(folderName)
                }, { merge: true });

                setCurrentFolder('未分類');
                showAlert(`✅ 已刪除「${folderName}」並將試卷移至未分類。`);
            } catch (error) {
                showAlert('刪除資料夾失敗：' + error.message);
            }
        });
    };
    
    const handleGenerateCode = async (quiz) => {
        if (quiz.shortCode) {
            navigator.clipboard.writeText(quiz.shortCode);
            showAlert(`✅ 已複製代碼：${quiz.shortCode}`);
            return;
        }
        setIsGeneratingCode(true);
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
            await window.db.collection('shareCodes').doc(newCode).set({
                ownerId: user.uid,
                quizId: quiz.id
            });
            await window.db.collection('users').doc(user.uid).collection('quizzes').doc(quiz.id).update({
                shortCode: newCode
            });
            setShowShareModal(prev => ({...prev, shortCode: newCode}));
            navigator.clipboard.writeText(newCode);
            showAlert(`✅ 成功生成並複製代碼：${newCode}`);
        } catch(e) {
            showAlert('生成代碼失敗：' + e.message);
        }
        setIsGeneratingCode(false);
    };

    useEffect(() => {
        if (!loading && pendingShareCode) {
            const codeToImport = pendingShareCode;
            setPendingShareCode(null);
            window.history.replaceState({}, document.title, window.location.pathname);
            
            executeImport(codeToImport);
        }
    }, [loading, pendingShareCode, records]);

    const executeImport = async (code) => {
        const cleanCode = code?.trim().toUpperCase();
        if (!cleanCode) return;
        
        const codeRegex = /^[A-Z0-9]{6}$/;
        if (!codeRegex.test(cleanCode)) {
            return showAlert("⚠️ 代碼格式錯誤！\n請確認您輸入的是剛好「6 碼」的英數組合（不可包含符號或空白）。", "輸入錯誤");
        }

        try {
            const isDuplicateCode = records.some(r => r.shortCode === cleanCode);
            if (isDuplicateCode) {
                return showAlert(`⚠️ 你已經擁有此試卷！`, "重複加入");
            }

            const codeDoc = await window.db.collection('shareCodes').doc(cleanCode).get();
            if (!codeDoc.exists) {
                return showAlert("❌ 找不到該代碼：\n請確認代碼是否輸入正確，或該代碼已失效。", "查無資料");
            }

            const { ownerId, quizId: targetQuizId } = codeDoc.data();

            if (ownerId === user.uid) {
                return showAlert("⚠️ 你已經擁有此試卷！", "重複擁有");
            }

            const doc = await window.db.collection('users').doc(ownerId).collection('quizzes').doc(targetQuizId).get({ source: 'server' });
            if (!doc.exists) {
                return showAlert("❌ 試卷已不存在：\n原作者可能已將此試卷刪除。", "載入失敗");
            }
            
            const data = doc.data();

            const isContentDuplicate = records.some(r => {
                const localName = cleanQuizName(r.testName).split(' (來自')[0].trim();
                const incomingName = cleanQuizName(data.testName).split(' (來自')[0].trim();
                return localName === incomingName && Number(r.numQuestions) === Number(data.numQuestions);
            });

            if (isContentDuplicate) {
                return showAlert(`⚠️ 你已經擁有此試卷！`, "內容重複");
            }

            const emptyAnswers = Array(Number(data.numQuestions)).fill('');
            const emptyStarred = Array(Number(data.numQuestions)).fill(false);
            
            const newDocRef = await window.db.collection('users').doc(user.uid).collection('quizzes').add({
                testName: cleanQuizName(data.testName) + ' (來自代碼)',
                numQuestions: data.numQuestions,
                questionFileUrl: data.questionFileUrl || '',
                questionText: data.questionText || '',
                questionHtml: data.questionHtml || '',
                explanationHtml: data.explanationHtml || '', 
                correctAnswersInput: data.correctAnswersInput || '', 
                publishAnswers: data.publishAnswers !== false,
                userAnswers: emptyAnswers,
                starred: emptyStarred,
                hasTimer: data.hasTimer || false,
                timeLimit: data.timeLimit || null,
                timeRemaining: data.hasTimer ? (data.timeLimit * 60) : null,
                isShared: true, 
                creatorUid: ownerId, 
                creatorQuizId: targetQuizId,
                folder: '未分類', 
                shortCode: cleanCode, 
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            await window.db.collection('users').doc(ownerId).collection('quizzes').doc(targetQuizId).update({
                sharedTo: window.firebase.firestore.FieldValue.arrayUnion({ 
                    uid: user.uid, 
                    quizId: newDocRef.id 
                })
            }).catch(e => console.error("建立同步連結失敗", e));

            showAlert(`✅ 成功加入「${cleanQuizName(data.testName)}」！\n試卷已自動放入「未分類」資料夾。`, "匯入成功");

        } catch (e) {
            console.error(e);
            showAlert('❌ 發生非預期錯誤：' + e.message, "系統錯誤");
        }
    };

    const handleImportCode = () => {
        showPrompt("請輸入 6 碼測驗代碼：", "", executeImport);
    };

    const shareToFriend = (friend) => {
        const cleanTestName = cleanQuizName(showShareModal.testName);
        const chatId = [user.uid, friend.uid].sort().join('_');
        window.db.collection('chats').doc(chatId).collection('messages').add({
            senderId: user.uid,
            senderName: userProfile.displayName,
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
            type: 'quiz_share',
            read: false,
            quizData: {
                ownerId: user.uid,
                quizId: showShareModal.id,
                testName: cleanTestName,
                questionFileUrl: showShareModal.questionFileUrl || '',
                questionText: showShareModal.questionText || '',
                questionHtml: showShareModal.questionHtml || '',
                explanationHtml: showShareModal.explanationHtml || '',
                correctAnswersInput: showShareModal.correctAnswersInput || ''
            }
        }).then(() => {
            window.db.collection('users').doc(friend.uid).set({
                unreadChats: { [user.uid]: true }
            }, { merge: true });
            showAlert('✅ 已成功分享給 ' + friend.name + '！');
            setShowShareModal(null);
        }).catch(e => showAlert('分享失敗：' + e.message));
    };

    const handleEditQuiz = (rec) => {
        if (rec.hasNewSuggestion) {
            window.db.collection('users').doc(user.uid).collection('quizzes').doc(rec.id).update({ hasNewSuggestion: false });
        }
        onContinueQuiz({ ...rec, forceStep: 'edit' });
    };

    const toggleFilter = (key) => setFilters(prev => ({ ...prev, [key]: !prev[key] }));

    const displayedRecords = records.filter(rec => {
        // 資料夾過濾
        if (currentFolder === '我建立的試題') {
            if (rec.isShared || rec.isTask) return false;
        } else {
            if ((rec.folder || '未分類') !== currentFolder) return false;
        }
        
        // ✨ 新增搜尋過濾
        if (searchQuery && !cleanQuizName(rec.testName).toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        
       const isCompleted = !!rec.results;
        // ✨ 效能優化配套：因為前面跳過了解壓縮，這裡改用類型判斷，只要有壓縮字串就當作「進行中」
        let answeredCount = 0;
        if (Array.isArray(rec.userAnswers)) {
            answeredCount = rec.userAnswers.filter(a => a !== '').length;
        } else if (typeof rec.userAnswers === 'string' && rec.userAnswers.length > 10) {
            answeredCount = 1; 
        }
        const hasStarted = answeredCount > 0;

        // 狀態過濾
        if (isCompleted && filters.done) return true;
        if (!isCompleted && hasStarted && filters.doing) return true;
        if (!isCompleted && !hasStarted && filters.todo) return true;

        return false;
    });

  const handleEnterQuiz = async (rec) => {
                // 1. 先把現有的資料（快取）拿來用，一秒都不等直接衝進去
                let finalRec = { ...rec };
                onContinueQuiz(finalRec); 

                // 2. 在「背景」默默去抓伺服器最新版，如果有更新，系統會自動在作答頁面更新
                window.db.collection('users').doc(user.uid).collection('quizzes').doc(rec.id)
                    .get({ source: 'server' })
                    .then((docSnap) => {
                        if (docSnap.exists) {
                            // 如果真的有新版本，默默更新快取，不干擾使用者操作
                            const latestData = { id: docSnap.id, ...docSnap.data() };
                            // 這裡不用重轉圈圈，資料會靜默更新
                        }
                    })
                    .catch(e => console.warn("背景同步失敗，但不影響作答", e));

        // ✨ 終極同步機制：如果是從任務牆下載的題目，再額外核對公版答案
        if (finalRec.isTask && finalRec.taskId) {
            try {
                const taskDoc = await window.db.collection('publicTasks').doc(rec.taskId).get();
                if (taskDoc.exists) {
                    const taskData = taskDoc.data();
                    const isAnsChanged = taskData.correctAnswersInput && taskData.correctAnswersInput !== rec.correctAnswersInput;
                    
                    const payload = {};
                    if (taskData.testName && taskData.testName !== rec.testName) payload.testName = taskData.testName;
                    if (taskData.questionHtml !== undefined) payload.questionHtml = taskData.questionHtml;
                    if (taskData.questionText !== undefined) payload.questionText = taskData.questionText;
                    if (taskData.explanationHtml !== undefined) payload.explanationHtml = taskData.explanationHtml;
                    // 確保標準答案被更新
                    if (taskData.correctAnswersInput !== undefined) payload.correctAnswersInput = taskData.correctAnswersInput;

                    // 如果答案被改了且玩家已經有成績，自動觸發重新算分提示
                    if (isAnsChanged && rec.results) {
                        payload.hasAnswerUpdate = true;
                    }

                    if (Object.keys(payload).length > 0) {
                        await window.db.collection('users').doc(user.uid).collection('quizzes').doc(rec.id).update(payload);
                        finalRec = { ...finalRec, ...payload };
                    }
                }
            } catch(e) { 
                console.error("題庫同步最新任務失敗", e); 
            }
        }

        if (finalRec.hasAnswerUpdate) {
            window.db.collection('users').doc(user.uid).collection('quizzes').doc(finalRec.id).update({ 
                hasAnswerUpdate: window.firebase.firestore.FieldValue.delete() 
            }).catch(e=>console.error(e));
            finalRec.hasAnswerUpdate = false;
        }

        if (finalRec.hasTimer && !finalRec.results) {
            const isNew = !finalRec.userAnswers || finalRec.userAnswers.filter(a => a !== '').length === 0;
            if (isNew) {
                setIsJumping(false); // ✨ 彈出確認視窗前，先關閉載入畫面
                showConfirm(`⏱ 此測驗設有時間限制（${finalRec.timeLimit} 分鐘）。\n\n點擊「確定」後將進入並開始倒數計時，準備好了嗎？`, () => {
                    onContinueQuiz(finalRec);
                });
            } else {
                setTimeout(() => onContinueQuiz(finalRec), 50); // ✨ 讓載入畫面有時間渲染
            }
        } else {
            setTimeout(() => onContinueQuiz(finalRec), 50); // ✨ 讓載入畫面有時間渲染
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 pt-0 h-full overflow-y-auto overflow-x-hidden custom-scrollbar w-full min-w-0">
            {/* ✨ 修正：加入 flex-wrap 與 w-full，避免標題與按鈕在小螢幕擠壓超出邊界 */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4 border-b-2 border-black dark:border-white pb-2 shrink-0 w-full min-w-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black dark:text-white shrink-0">我的題庫</h1>
                    <button 
                        onClick={() => { 
                            setIsRefreshing(true); 
                            // ✨ 改為靜默背景同步，不干擾畫面，同步完自動更新列表
                            window.db.collection('users').doc(user.uid).collection('quizzes')
                                .orderBy('createdAt', 'desc')
                                .limit(visibleLimit)
                                .get({ source: 'server' })
                                .then(() => setRefreshTrigger(prev => prev + 1))
                                .catch(e => console.error(e))
                                .finally(() => setIsRefreshing(false));
                        }} 
                        disabled={isRefreshing}
                        className="text-sm bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-3 py-1 font-bold transition-colors shadow-sm flex items-center gap-1 no-round disabled:opacity-50"
                        title="手動同步雲端最新資料"
                    >
                        {isRefreshing ? <div className="w-4 h-4 border-2 border-gray-400 border-t-black dark:border-t-white rounded-full animate-spin"></div> : '🔄'} 重新整理
                    </button>
                </div>
                <button onClick={() => onStartNew(currentFolder === '我建立的試題' ? '未分類' : currentFolder)} className="bg-black dark:bg-gray-200 text-white dark:text-black px-6 py-2 no-round font-bold hover:bg-gray-800 dark:hover:bg-gray-300 shadow-sm transition-colors whitespace-nowrap shrink-0">+ 新測驗</button>
            </div>

            {/* ✨ 修正：加入 min-w-0，並將 space-x-2 改為 gap-2，確保滾動條正確作用於容器內部，不會撐破父元素 */}
            <div className="flex flex-col md:flex-row gap-3 mb-2 shrink-0 w-full min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 flex-grow w-full min-w-0">
                    {userFolders.map(f => (
                        <button key={f} onClick={() => setCurrentFolder(f)} className={`px-4 py-1.5 font-bold text-sm no-round whitespace-nowrap transition-colors shrink-0 ${currentFolder === f ? 'bg-black dark:bg-gray-200 text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'}`}>
                            {f === '我建立的試題' ? '⭐ ' : '📁 '} {f}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 shrink-0 w-full md:w-auto min-w-0">
                    <button onClick={handleCreateFolder} className="px-3 py-1.5 text-sm font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 no-round whitespace-nowrap transition-colors shrink-0">
                        + 新增資料夾
                    </button>
                    <button onClick={handleImportCode} className="px-3 py-1.5 text-sm font-bold bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 no-round whitespace-nowrap transition-colors shrink-0">
                        📥 輸入代碼
                    </button>
                    {!specialFolders.includes(currentFolder) && (
                        <button 
                            onClick={() => handleDeleteFolder(currentFolder)} 
                            className="px-3 py-1.5 text-sm font-bold bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800 no-round whitespace-nowrap transition-colors shrink-0"
                        >
                            🗑️ 刪除目前資料夾
                        </button>
                    )}
                </div>
            </div>

            {/* ✨ 新增：過濾器與搜尋列整合排版 */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 shrink-0 w-full">
                <div className="flex items-center space-x-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 no-round shrink-0 w-full md:w-auto overflow-x-auto custom-scrollbar">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 border-r border-gray-300 dark:border-gray-600 pr-3 shrink-0">狀態篩選</span>
                    <label className="flex items-center space-x-1.5 text-sm cursor-pointer hover:text-black dark:hover:text-white dark:text-gray-300 shrink-0">
                        <input type="checkbox" checked={filters.todo} onChange={() => toggleFilter('todo')} className="w-4 h-4 accent-black dark:accent-white" />
                        <span className="font-bold">未作測驗</span>
                    </label>
                    <label className="flex items-center space-x-1.5 text-sm cursor-pointer hover:text-black dark:hover:text-white shrink-0">
                        <input type="checkbox" checked={filters.doing} onChange={() => toggleFilter('doing')} className="w-4 h-4 accent-black dark:accent-white" />
                        <span className="font-bold text-orange-600 dark:text-orange-400">進行中</span>
                    </label>
                    <label className="flex items-center space-x-1.5 text-sm cursor-pointer hover:text-black dark:hover:text-white shrink-0">
                        <input type="checkbox" checked={filters.done} onChange={() => toggleFilter('done')} className="w-4 h-4 accent-black dark:accent-white" />
                        <span className="font-bold text-green-600 dark:text-green-400">已完成</span>
                    </label>
                </div>

                <div className="flex-grow flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 shadow-sm no-round w-full md:w-auto">
                    <span className="text-gray-500 mr-2">🔍</span>
                    <input
                        type="text"
                        placeholder="在此資料夾中搜尋試題..."
                        className="flex-grow outline-none bg-transparent text-black dark:text-white text-sm font-bold min-w-0"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-black dark:hover:text-white ml-2 font-bold px-1">✖</button>
                    )}
                </div>
            </div>

           {loading ? (
                <div className="flex flex-col items-center justify-center py-20 w-full">
                    <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-black dark:border-white rounded-full animate-spin mb-4"></div>
                    <div className="text-gray-500 dark:text-gray-400 font-bold animate-pulse text-lg">正在同步雲端題庫，這可能需要幾秒鐘...</div>
                    <div className="text-gray-400 dark:text-gray-500 text-sm mt-2">若是初次載入，時間會稍長，感謝您的耐心等候。</div>
                </div>
            ) : displayedRecords.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 text-center text-gray-500 dark:text-gray-400 py-16 border border-gray-200 dark:border-gray-700 no-round shadow-sm">
                    {searchQuery ? '找不到符合關鍵字的試卷。' : '此分類尚無符合篩選條件的測驗紀錄。'}
                </div>
            ) : (
                <div className="flex flex-col gap-3 pb-10 w-full min-w-0">
                    {displayedRecords.map(rec => (
                        <div key={rec.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 sm:p-4 no-round shadow-sm hover:shadow-md transition-shadow flex flex-col w-full min-w-0 relative">
                            
                            {/* 上半部：標題與狀態資訊 */}
                            <div className="flex flex-col gap-2 min-w-0 w-full">
                                <div className="font-bold text-sm sm:text-base dark:text-white leading-relaxed min-w-0 w-full relative inline-block">
                                    {renderTestName(rec.testName, !!rec.results)}
                                    {/* ✨ 新增：偵測到答案更新且重新算分時，顯示閃爍提醒 */}
                                    {rec.hasAnswerUpdate && (
                                        <span className="absolute -top-3 -right-2 sm:-right-4 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse shadow-md border border-white dark:border-gray-800 z-10 pointer-events-none">
                                            🚨 答案已更正
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                    {rec.isTask && <span className="text-[10px] bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-1.5 py-0.5 whitespace-nowrap shrink-0">任務</span>}
                                    {rec.isShared && !rec.isTask && <span className="text-[10px] bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-1.5 py-0.5 whitespace-nowrap shrink-0">分享</span>}
                                    {rec.hasTimer && <span className="text-[10px] bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 border border-red-200 dark:border-red-700 px-1.5 py-0.5 font-bold whitespace-nowrap shrink-0">⏱ {rec.timeLimit}m</span>}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                                    <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">{rec.numQuestions}題</span>
                                    {rec.results ? (
                                        <span className="text-green-600 dark:text-green-400 font-bold whitespace-nowrap shrink-0">✅ {rec.results.score} 分</span>
                                    ) : (Array.isArray(rec.userAnswers) ? rec.userAnswers.filter(a=>a).length > 0 : typeof rec.userAnswers === 'string' && rec.userAnswers.length > 10) ? (
                                        <span className="text-orange-500 dark:text-orange-400 font-bold flex items-center gap-1 flex-wrap">
                                            📝 進行中
                                            {rec.hasTimer && rec.timeRemaining !== undefined && (
                                                <span className="text-red-500 inline-block whitespace-nowrap shrink-0">(剩 {Math.max(1, Math.ceil(rec.timeRemaining / 60))}m)</span>
                                            )}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 font-bold whitespace-nowrap shrink-0">⏳ 未作答</span>
                                    )}
                                </div>
                            </div>

                            {/* 下半部：操作按鈕 (手機版分開兩排：上排四個小按鈕 Grid 均分，下排一個滿版進入大按鈕) */}
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full min-w-0">
                                
                                {/* 輔助按鈕群組：手機版使用 CSS Grid 強制四等分，絕不超出邊界 */}
                                <div className="grid grid-cols-4 sm:flex sm:flex-wrap items-center gap-1 sm:gap-3 w-full sm:w-auto text-center shrink-0">
                                    <button onClick={() => handleDelete(rec.id)} className="text-xs text-gray-500 hover:text-red-600 transition-colors py-1.5 sm:py-0 whitespace-nowrap overflow-hidden text-ellipsis">刪除</button>
                                    <button onClick={() => setShowMoveModal(rec)} className="text-xs text-green-600 dark:text-green-400 font-bold transition-colors py-1.5 sm:py-0 whitespace-nowrap overflow-hidden text-ellipsis">📁移動</button>
                                    {!(rec.isTask || /\[#(op|m?nm?st)\]/i.test(rec.testName)) ? (
                                        <button onClick={() => setShowShareModal(rec)} className="text-xs text-blue-500 dark:text-blue-400 font-bold transition-colors py-1.5 sm:py-0 whitespace-nowrap overflow-hidden text-ellipsis">📤分享</button>
                                    ) : <div />}
                                    {!rec.isShared && !rec.isTask ? (
                                        <button onClick={() => handleEditQuiz(rec)} className="text-xs text-purple-600 dark:text-purple-400 font-bold transition-colors py-1.5 sm:py-0 whitespace-nowrap overflow-hidden text-ellipsis relative">
                                            📝編輯
                                            {rec.hasNewSuggestion && <span className="absolute top-1 right-0 sm:-top-1 sm:-right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                                        </button>
                                    ) : <div />}
                                </div>
                                
                                {/* 進入/查看按鈕 */}
                                <button onClick={() => handleEnterQuiz(rec)} className="bg-gray-100 dark:bg-gray-700 px-4 py-2.5 sm:py-1.5 no-round font-bold border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:text-white text-sm transition-colors w-full sm:w-auto text-center shrink-0">
                                    {rec.results ? '📊 查看' : '⚔️ 進入'}
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            )}
            
            {/* 🚀 終極提速：題庫的載入更多按鈕 */}
            {!loading && hasMore && displayedRecords.length > 0 && (
                <div className="flex justify-center mt-6 mb-8">
                    <button 
                        onClick={() => setVisibleLimit(prev => prev + 15)} 
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-8 py-3 font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        ⬇️ 載入更多歷史考卷...
                    </button>
                </div>
            )}

            {showShareModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-sm no-round shadow-xl">
                        <h3 className="font-bold text-lg mb-4 flex justify-between items-center dark:text-white">
                            <span>📤 分享試卷</span>
                            <button onClick={() => setShowShareModal(null)} className="text-gray-400 hover:text-black dark:hover:text-white">✖</button>
                        </h3>

                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">公開測驗代碼</p>
                            {showShareModal.shortCode ? (
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2">
                                        <span className="text-2xl font-mono font-black tracking-widest text-blue-600 dark:text-blue-400">{showShareModal.shortCode}</span>
                                        <button onClick={() => {
                                            navigator.clipboard.writeText(showShareModal.shortCode);
                                            showAlert(`✅ 已複製代碼：${showShareModal.shortCode}`);
                                        }} className="text-xs bg-black dark:bg-gray-200 text-white dark:text-black px-3 py-1.5 no-round font-bold hover:bg-gray-800">複製代碼</button>
                                    </div>
                                    <button onClick={() => {
                                        const link = `${window.location.origin}/?shareCode=${showShareModal.shortCode}`;
                                        const text = `🔥 快來挑戰我的試卷！\n📝 試卷名稱：${showShareModal.testName.replace(/\[#(op|m?nm?st)\]/gi, '').trim()}\n\n👇 點擊下方連結，立即將試卷自動加入你的題庫：\n${link}`;
                                        navigator.clipboard.writeText(text);
                                        showAlert(`✅ 已複製邀請連結與文案！快去貼給朋友吧！`);
                                    }} className="text-sm bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700 px-4 py-2 no-round font-bold hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors">
                                        🔗 複製邀請連結與文案
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => handleGenerateCode(showShareModal)} disabled={isGeneratingCode} className="text-sm bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700 px-4 py-2 no-round font-bold hover:bg-blue-100 dark:hover:bg-blue-800 w-full transition-colors">
                                    {isGeneratingCode ? '生成中...' : '🔑 生成 6 碼分享代碼'}
                                </button>
                            )}
                        </div>

                        <h4 className="font-bold text-sm mb-2 text-gray-600 dark:text-gray-400">傳送給好友</h4>
                        <div className="max-h-40 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700 custom-scrollbar bg-white dark:bg-gray-700">
                            {(userProfile.friends || []).length === 0 ? <p className="p-4 text-sm text-gray-400">目前還沒有好友喔</p> : null}
                            {(userProfile.friends || []).map(f => (
                                <button key={f.uid} onClick={() => shareToFriend(f)} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 font-bold text-sm transition-colors dark:text-white">
                                    {f.name} <span className="text-gray-400 dark:text-gray-400 font-normal ml-2">{f.email}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showMoveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-sm no-round shadow-xl">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">選擇目標資料夾</h3>
                        <div className="max-h-60 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700 custom-scrollbar">
                            {userFolders.filter(f => f !== '我建立的試題').map(f => (
                                <button key={f} onClick={() => moveQuizToFolder(showMoveModal, f)} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 font-bold text-sm transition-colors dark:text-white">
                                    📁 {f}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowMoveModal(null)} className="w-full bg-gray-100 dark:bg-gray-700 text-black dark:text-white p-2 font-bold no-round hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
                    </div>
                </div>
            )}

            {/* ✨ 新增：跳轉試卷時的光速載入 Modal */}
            {isJumping && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[200] p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 w-full max-w-sm no-round shadow-2xl text-center border-t-8 border-indigo-500 animate-fade-in">
                        <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black mb-2 dark:text-white">🚀 正在進入試卷...</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">正在為您準備作答環境，請稍候</p>
                    </div>
                </div>
            )}

            {/* ✨ 新增：獨立的新增資料夾 Modal */}
            {showAddFolderModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-sm no-round shadow-xl">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">📁 新增資料夾</h3>
                        <input 
                            type="text" 
                            autoFocus
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round mb-6 outline-none focus:border-black dark:focus:border-white font-bold"
                            placeholder="請輸入新資料夾名稱..."
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                // ✨ 防呆設計：過濾中文輸入法 (IME) 選字時敲擊的 Enter
                                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                    submitCreateFolder();
                                }
                            }}
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowAddFolderModal(false)} className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 font-bold no-round hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">取消</button>
                            <button onClick={submitCreateFolder} className="px-5 py-2 bg-black dark:bg-gray-200 text-white dark:text-black font-bold no-round hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors text-sm shadow-sm">建立</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ✨ 修改：將 AnswerGridInput 移到外部，避免 React 重新渲染導致手機鍵盤收起，並加入一鍵清空功能
// ✨ 修改：將 AnswerGridInput 移到外部，避免 React 重新渲染導致手機鍵盤收起，並加入一鍵清空功能
const AnswerGridInput = ({ value, onChange, maxQuestions, showConfirm }) => {
    const handlePaste = (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        
        const pastedParts = pastedText.match(/[A-DZ]|[a-dz]+/g) || [];

        const valStr = value || '';
        let currentArr = valStr.includes(',') ? valStr.split(',') : (valStr.match(/[A-DZ]|[a-dz]+/g) || []);
        while(currentArr.length < maxQuestions) currentArr.push('');

        for(let i=0; i<pastedParts.length && i<maxQuestions; i++) {
            currentArr[i] = pastedParts[i];
        }
        onChange(currentArr.join(','));
    };

    const handleChange = (index, char) => {
        const cleanChar = char.replace(/[^a-dA-DZz]/g, '');
        const valStr = value || '';
        let currentArr = valStr.includes(',') ? valStr.split(',') : (valStr.match(/[A-DZ]|[a-dz]+/g) || []);
        while(currentArr.length < maxQuestions) currentArr.push('');
        
        currentArr[index] = cleanChar;
        onChange(currentArr.join(','));
    };

    const handleClearAll = () => {
        if (showConfirm) {
            showConfirm("確定要清空所有已填寫的答案嗎？", () => {
                onChange('');
            });
        } else {
            onChange('');
        }
    };

    const valStr = value || '';
    const currentArr = valStr.includes(',') ? valStr.split(',') : (valStr.match(/[A-DZ]|[a-dz]+/g) || []);
    const filledCount = currentArr.slice(0, maxQuestions).filter(ans => ans && ans.trim() !== '').length;

    return (
        <div className="w-full mb-4">
            <div 
                className="w-full mb-2 p-4 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 no-round max-h-64 overflow-y-auto custom-scrollbar"
                onPaste={handlePaste}
            >
                <div className="text-xs text-gray-500 mb-3 font-bold flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">💡 提示：點擊格子後 <b>Ctrl+V</b> 貼上答案 (Z表示送分 一格填入數個小寫表示複數答案)！</span>
                    <div className="flex items-center gap-3">
                        <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1">已填寫: {filledCount} / {maxQuestions}</span>
                        <button 
                            onClick={handleClearAll}
                            className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-1 font-bold hover:bg-red-100 dark:hover:bg-red-900 transition-colors shadow-sm"
                        >
                            🗑️ 一鍵清空
                        </button>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', gap: '10px' }}>
                    {Array.from({ length: maxQuestions }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-400 font-bold mb-1">{i + 1}.</span>
                            <input 
                                type="text"
                                className="w-12 h-10 text-center border border-gray-300 dark:border-gray-500 font-black text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white transition-all shadow-sm"
                                maxLength={4}
                                value={currentArr[i] || ''}
                                onChange={(e) => handleChange(i, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </div>
            
           <textarea 
                className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 no-round font-mono outline-none tracking-widest text-lg uppercase custom-scrollbar bg-white dark:bg-gray-700 text-black dark:text-white focus:border-black dark:focus:border-white" 
                placeholder="或者直接在這裡輸入/貼上連續的字母答案 (例如: ABCD...)" 
                value={value} 
                onChange={e => onChange(e.target.value.replace(/[^a-dA-DZz,]/g, ''))} 
            ></textarea>
        </div>
    );
};

function QuizApp({ currentUser, userProfile, activeQuizRecord, onBackToDashboard: originalBack, showAlert, showConfirm, showPrompt }) {
    // ✨ 安全退出機制：微延遲 50 毫秒，讓存檔與解壓縮動作錯開，避免畫面卡死
    const onBackToDashboard = () => setTimeout(originalBack, 50);

    const initialRecord = activeQuizRecord || {};
    const userFolders = Array.from(new Set(['未分類', ...(userProfile.folders || [])]));
    
    const [quizId, setQuizId] = useState(initialRecord.id || null);
    const [step, setStep] = useState(initialRecord.forceStep || (initialRecord.results ? 'results' : (initialRecord.id ? 'answering' : 'setup')));
    const [testName, setTestName] = useState(initialRecord.testName || '');
    const [numQuestions, setNumQuestions] = useState(initialRecord.numQuestions || 50);
    const [userAnswers, setUserAnswers] = useState(window.jzDecompress(initialRecord.userAnswers) || []);
    const [starred, setStarred] = useState(initialRecord.starred || []);
    const [correctAnswersInput, setCorrectAnswersInput] = useState(initialRecord.correctAnswersInput || '');
    const [results, setResults] = useState(window.jzDecompress(initialRecord.results) || null);
    const [questionFileUrl, setQuestionFileUrl] = useState(initialRecord.questionFileUrl || '');
    const [questionText, setQuestionText] = useState(window.jzDecompress(initialRecord.questionText) || '');
    const [questionHtml, setQuestionHtml] = useState(initialRecord.questionHtml || ''); // ✨ 新增富文本狀態
    const [explanationHtml, setExplanationHtml] = useState(initialRecord.explanationHtml || ''); // ✨ 新增詳解狀態
    const [folder, setFolder] = useState(initialRecord.folder || '未分類');
    const [shortCode, setShortCode] = useState(initialRecord.shortCode || null);
    const [pdfZoom, setPdfZoom] = useState(1);
    const [publishAnswersToggle, setPublishAnswersToggle] = useState(initialRecord.publishAnswers !== false);
    
    const [taskScores, setTaskScores] = useState(null);
    const [creatorSuggestions, setCreatorSuggestions] = useState([]); 

    const [showDiscussion, setShowDiscussion] = useState(false);
    const [discussions, setDiscussions] = useState([]);
    const [commentInput, setCommentInput] = useState('');
    const [commentQNum, setCommentQNum] = useState('0');
    const [commentFile, setCommentFile] = useState(null);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const lastCommentTime = useRef(0);
    const discussionRef = useRef(null);

    // ✨ 更新初始化邏輯：支援 richtext
    const [inputType, setInputType] = useState(
        initialRecord.questionHtml ? 'richtext' :
        (initialRecord.questionText && !initialRecord.questionFileUrl) ? 'text' : 'url'
    );
    const isShared = initialRecord.isShared === true;
    const isTask = initialRecord.isTask === true;
    
    const [hasTimer, setHasTimer] = useState(initialRecord.hasTimer || false);
    const [timeLimit, setTimeLimit] = useState(initialRecord.timeLimit || 60);
    const timeRemainingRef = useRef(initialRecord.timeRemaining ?? (initialRecord.timeLimit ? initialRecord.timeLimit * 60 : null));
    const [displayTime, setDisplayTime] = useState(timeRemainingRef.current);
    const [isTimeUp, setIsTimeUp] = useState(hasTimer && timeRemainingRef.current <= 0);
    const [syncTrigger, setSyncTrigger] = useState(0);

    // 根據螢幕寬度自動決定預設排版
   const [layoutMode, setLayoutMode] = useState(window.innerWidth < 768 ? 'vertical' : 'horizontal'); 
    const [splitRatio, setSplitRatio] = useState(50);
    const [viewMode, setViewMode] = useState('split'); // ✨ 新增：'split' (傳統) 或 'interactive' (沉浸式作答)
    const [currentInteractiveIndex, setCurrentInteractiveIndex] = useState(0); // ✨ 新增：當前顯示的沉浸式題目索引
    const [showQuestionGrid, setShowQuestionGrid] = useState(false); // ✨ 新增：是否展開題號導覽網格
    
    // ✨ 新增：自動解析沉浸式作答的題目與選項
    const parsedInteractiveQuestions = React.useMemo(() => {
        if (viewMode !== 'interactive') return [];
        const rawContent = questionHtml || questionText || '';
        if (!rawContent) return [];
        
        // ✨ 安全純淨版 V4：純字串正規化清理，升級洋蔥剝除法解決 D 選項換行問題
        const superClean = (html) => {
            if (!html) return '';
            
            // 1. 提早抹除 Word 容易夾帶的「隱形零寬字元」與 BOM
            let cleaned = html.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            
            // 2. ✨ 暗黑模式修復 1：提早抹除 Word 貼上時強制加上的「黑色」樣式，讓暗色模式的白字能正常顯示！
            cleaned = cleaned.replace(/color:\s*(black|#000000|#000|rgb\(0,\s*0,\s*0\)|windowtext);?/gi, '');

            // 3. 遞迴拔除尾部的空行、空段落、無意義標籤 (解決 D 選項多一行的問題)
            let prev;
            do {
                prev = cleaned;
                // 砍掉結尾的單純換行與各種網頁空白實體
                cleaned = cleaned.replace(/(<br\s*\/?>|&nbsp;|&ensp;|&emsp;|\s)+$/gi, '');
                // 砍掉結尾的空殼標籤，動態支援所有 HTML 標籤的「洋蔥式剝除法」(例如 <p><span><br></span></p> 會被層層剝除乾淨)
                cleaned = cleaned.replace(/<([a-z0-9]+)[^>]*>(\s|&nbsp;|&ensp;|&emsp;|<br\s*\/?>)*<\/\1>$/gi, '');
            } while (cleaned !== prev);
            
            return cleaned.trim();
        };

        const result = [];
        const qBlocks = rawContent.split(/\[Q\.?0*(\d+)\]/i); 
        
        for (let i = 1; i < qBlocks.length; i += 2) {
            const qNum = parseInt(qBlocks[i], 10);
            const qContent = qBlocks[i+1] || '';
            
            const optRegex = /\[([A-D])\]([\s\S]*?)(?=\[[A-D]\]|\[End\]|$)/gi; 
            let match;
            const options = {};
            let questionMainText = qContent;
            
            const firstOptIndex = qContent.search(/\[[A-D]\]/i);
            if (firstOptIndex !== -1) {
                questionMainText = qContent.substring(0, firstOptIndex).replace(/\[End\]/gi, '');
            } else {
                questionMainText = qContent.replace(/\[End\]/gi, '');
            }
            
            questionMainText = superClean(questionMainText);

            while ((match = optRegex.exec(qContent)) !== null) {
                const optLetter = match[1].toUpperCase();
                options[optLetter] = superClean(match[2]);
            }

            result.push({ number: qNum, mainText: questionMainText, options });
        }
        return result;
    }, [questionHtml, questionText, viewMode]);

    // 監聽螢幕旋轉或大小改變，自動調整
    useEffect(() => {
        const handleResize = () => {
            setLayoutMode(window.innerWidth < 768 ? 'vertical' : 'horizontal');
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [isDragging, setIsDragging] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(true);
    const splitContainerRef = useRef(null);

    const [showOnlyWrong, setShowOnlyWrong] = useState(false);
    const [showOnlyStarred, setShowOnlyStarred] = useState(false);
    const [showShareScoreModal, setShowShareScoreModal] = useState(false);

    // ✨ 新增：同步進度狀態與重新算分的載入狀態
    const [syncStatus, setSyncStatus] = useState({ isSyncing: false, current: 0, total: 0 });
    const [isCreating, setIsCreating] = useState(false); // ✨ 新增：建立試題時的載入狀態    
    const [isRegrading, setIsRegrading] = useState(false); // ✨ 新增：重新算分的載入畫面狀態
    const [wrongBookAddingItem, setWrongBookAddingItem] = useState(null);
    const [explanationModalItem, setExplanationModalItem] = useState(null); // ✨ 新增詳解彈窗狀態
    const [isEditLoading, setIsEditLoading] = useState(false); // ✨ 新增：編輯模式的載入狀態

    // ✨ 新增：點進試題時，自動檢查答案是否更新的監聽器
    useEffect(() => {
        if (step === 'results' && results && results.data) {
            const cleanKey = (correctAnswersInput || '').replace(/[^a-dA-DZz,]/g, '');
            let keyArray = cleanKey.includes(',') ? cleanKey.split(',') : (cleanKey.match(/[A-DZ]|[a-dz]+/g) || []);
            
            let hasChanges = false;
            results.data.forEach((item, idx) => {
                const oldKey = item.correctAns === '-' ? '' : item.correctAns;
                const newKey = keyArray[idx] || '';
                if (oldKey !== newKey) hasChanges = true;
            });

            if (hasChanges) {
                console.log("偵測到答案不同，自動執行重新批改...");
                handleManualRegrade(true);
            }
        }
    }, [step, results, correctAnswersInput]); // 只要這些改變，就觸發檢查

    const starredIndices = starred.map((s, i) => s ? i + 1 : null).filter(Boolean);
    const canSeeAnswers = initialRecord.publishAnswers !== false;

    useEffect(() => {
        let timerId;
        if (step === 'answering' && hasTimer && !isTimeUp) {
            timerId = setInterval(() => {
                if (timeRemainingRef.current > 0) {
                    timeRemainingRef.current -= 1;
                    setDisplayTime(timeRemainingRef.current);
                    
                    if (timeRemainingRef.current % 15 === 0) setSyncTrigger(s => s + 1);

                    if (timeRemainingRef.current <= 0) {
                        setIsTimeUp(true);
                        setSyncTrigger(s => s + 1);
                        showAlert("⏱ 時間到！\n\n您的作答時間已結束，答案卡已鎖定無法再做更改。\n請點擊上方「交卷」。");
                    }
                }
            }, 1000);
        }
        return () => { if(timerId) clearInterval(timerId); };
    }, [step, hasTimer, isTimeUp]);

    useEffect(() => {
        if (currentUser && quizId && (step === 'answering' || step === 'setup' || step === 'results')) {
            if (userAnswers.length === 0 && numQuestions > 0 && step === 'answering') return;
            
            // ✨ 效能大躍進：加入 1.5 秒「防抖 (Debounce)」，停止打字後才執行高強度壓縮與存檔
            const timer = setTimeout(() => {
                const stateToSave = { 
                    testName, numQuestions, userAnswers: window.jzCompress(userAnswers), starred, correctAnswersInput, results: window.jzCompress(results), 
                    questionFileUrl, questionText: window.jzCompress(questionText), 
                    questionHtml, explanationHtml, // ✨ 修復：將富文本與詳解加入自動存檔，避免切換時消失
                    hasTimer, timeLimit, folder,
                    updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                };
                if (hasTimer) stateToSave.timeRemaining = timeRemainingRef.current;

                window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).update(stateToSave)
                    .catch(e => console.error("自動儲存失敗", e));
            }, 1500); 
            
            return () => clearTimeout(timer); // 如果 1.5 秒內又有變動，就取消上一次的存檔，重新計時
        }
    }, [testName, numQuestions, userAnswers, starred, correctAnswersInput, results, questionFileUrl, questionText, questionHtml, explanationHtml, folder, currentUser, quizId, step, syncTrigger]);

    useEffect(() => {
        if (step === 'results' && isTask && initialRecord.taskId) {
            window.db.collection('publicTasks').doc(initialRecord.taskId).collection('scores')
                .orderBy('timestamp', 'desc').limit(20).get()
                .then(snap => {
                    setTaskScores(snap.docs.map(d => d.data().score));
                }).catch(e => console.error(e));

            const unsub = window.db.collection('publicTasks').doc(initialRecord.taskId).collection('discussions')
                .orderBy('timestamp', 'asc')
                .onSnapshot(snap => {
                    setDiscussions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                });
            return () => unsub();
        }

        if (step === 'edit' && quizId) {
            const unsub = window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).collection('suggestions')
                .orderBy('timestamp', 'desc').onSnapshot(snap => {
                    setCreatorSuggestions(snap.docs.map(d => ({id: d.id, ...d.data()})));
                });
            return () => unsub();
        }
    }, [step, isTask, initialRecord.taskId, quizId, currentUser.uid]);

    const handleDragStart = (e) => setIsDragging(true);

    useEffect(() => {
        const handleDragMove = (e) => {
            if (!isDragging || !splitContainerRef.current) return;
            const containerRect = splitContainerRef.current.getBoundingClientRect();
            let newRatio;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            if (layoutMode === 'horizontal') {
                const offsetX = clientX - containerRect.left;
                newRatio = (offsetX / containerRect.width) * 100;
            } else {
                const offsetY = clientY - containerRect.top;
                newRatio = (offsetY / containerRect.height) * 100;
            }
            
            newRatio = Math.max(20, Math.min(newRatio, 80));
            setSplitRatio(newRatio);
        };

        const handleDragEnd = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchend', handleDragEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragEnd);
        };
    }, [isDragging, layoutMode]);

    const handleStartTest = async () => {
        if (numQuestions < 1 || numQuestions > 100) return showAlert('題數限制為 1-100 題！');
        if (hasTimer && (timeLimit < 1 || timeLimit > 999)) return showAlert('計時時間請設定在 1 到 999 分鐘之間。');
        
        setIsCreating(true); // ✨ 開啟載入畫面
        
        const initialAnswers = Array(Number(numQuestions)).fill('');
        const initialStarred = Array(Number(numQuestions)).fill(false);
        setUserAnswers(initialAnswers);
        setStarred(initialStarred);

        const finalFileUrl = inputType === 'url' ? questionFileUrl.trim() : '';
        const finalQuestionText = inputType === 'text' ? questionText : '';
        const finalQuestionHtml = inputType === 'richtext' ? questionHtml : '';
        
        const cleanKey = (correctAnswersInput || '').replace(/[^a-dA-DZz,]/g, '');
        
        setQuestionFileUrl(finalFileUrl);
        setQuestionText(finalQuestionText);
        setQuestionHtml(finalQuestionHtml);

        try {
            const docRef = await window.db.collection('users').doc(currentUser.uid).collection('quizzes').add({
                testName, numQuestions, userAnswers: window.jzCompress(initialAnswers), starred: initialStarred,
                correctAnswersInput: cleanKey,
                publishAnswers: true, 
                questionFileUrl: finalFileUrl,
                questionText: window.jzCompress(finalQuestionText),
                questionHtml: finalQuestionHtml,
                explanationHtml: explanationHtml,
                hasTimer: hasTimer,
                timeLimit: hasTimer ? Number(timeLimit) : null,
                timeRemaining: hasTimer ? Number(timeLimit) * 60 : null,
                folder: folder,
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            setQuizId(docRef.id);

            const isOp = testName.includes('[#op]');
            const isMnst = testName.includes('[#mnst]') || testName.includes('[#nmst]');
            
            if (isOp || isMnst) {
                let category = '模擬試題 (其他)';
                if (isOp) {
                    if (testName.includes('藥理') || testName.includes('藥物化學')) category = '1. 藥理學與藥物化學';
                    else if (testName.includes('藥物分析') || testName.includes('生藥') || testName.includes('中藥')) category = '2. 藥物分析學與生藥學(含中藥學)';
                    else if (testName.includes('藥劑') || testName.includes('生物藥劑')) category = '3. 藥劑學與生物藥劑學';
                    else category = '國考題 (其他)';
                } else {
                    if (testName.includes('藥物分析')) category = '1. 藥物分析學';
                    else if (testName.includes('生藥')) category = '2. 生藥學';
                    else if (testName.includes('中藥')) category = '3. 中藥學';
                    else if (testName.includes('藥物化學') || testName.includes('藥理')) category = '4. 藥物化學與藥理學';
                    else if (testName.includes('生物藥劑')) category = '6. 生物藥劑學';
                    else if (testName.includes('藥劑')) category = '5. 藥劑學';
                }

                // ✨ 非同步背景執行任務牆建立，不卡住使用者
                window.db.collection('publicTasks').doc(docRef.id).set({
                    testName, numQuestions, questionFileUrl: finalFileUrl, questionText: finalQuestionText, 
                    questionHtml: finalQuestionHtml, explanationHtml: explanationHtml, correctAnswersInput: cleanKey,
                    hasTimer, timeLimit: hasTimer ? Number(timeLimit) : null, category, creatorUid: currentUser.uid,
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                }).catch(e => console.error("任務牆同步失敗", e));
            }

            if (hasTimer) {
                timeRemainingRef.current = Number(timeLimit) * 60;
                setDisplayTime(timeRemainingRef.current);
                setIsTimeUp(false);
            }
            setIsCreating(false); // ✨ 關閉載入畫面
            setStep('answering');
        } catch(e) {
            setIsCreating(false);
            showAlert('建立紀錄失敗：' + e.message);
        }
    };

    const handleRetake = () => {
        showConfirm("確定要再做一次嗎？\n先前的分數將保留在您的歷史紀錄中，系統將為您清空目前答案，不會產生新的試卷檔案。", () => {
            const initialAnswers = Array(Number(numQuestions)).fill('');
            const initialStarred = Array(Number(numQuestions)).fill(false);
            
            const historyEntry = { 
                score: results.score, 
                correctCount: results.correctCount, 
                total: results.total, 
                date: new Date().toISOString() 
            };
            
            window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).update({
                userAnswers: initialAnswers,
                starred: initialStarred,
                results: window.firebase.firestore.FieldValue.delete(),
                history: window.firebase.firestore.FieldValue.arrayUnion(historyEntry)
            }).then(() => {
                setUserAnswers(initialAnswers);
                setStarred(initialStarred);
                setResults(null);
                setStep('answering');
                
                if (hasTimer) {
                    timeRemainingRef.current = Number(timeLimit) * 60;
                    setDisplayTime(timeRemainingRef.current);
                    setIsTimeUp(false);
                }
                showAlert("✅ 已重新開始測驗！你的歷史成績已妥善保存。");
            }).catch(e => showAlert('重測設定失敗：' + e.message));
        });
    };

   const handleSaveEdit = async () => {
        setIsEditLoading(true); // ✨ 開啟載入，防止按鈕點擊後毫無反應
        // ✨ 取得原始資料進行比對 (省流量關鍵)
        const myDoc = await window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).get();
        const oldData = myDoc.data() || {};
        const latestSharedTo = oldData.sharedTo || [];
        const syncCount = latestSharedTo.length;

        const cleanKey = (correctAnswersInput || '').replace(/[^a-dA-DZz,]/g, '');
        
        // 1. 建立「變動清單」：只抓取有改過的地方
        const updates = {};
        if (testName.trim() !== (oldData.testName || '')) updates.testName = testName.trim() || '未命名測驗';
        if (questionFileUrl.trim() !== (oldData.questionFileUrl || '')) updates.questionFileUrl = questionFileUrl.trim();
        if (publishAnswersToggle !== (oldData.publishAnswers !== false)) updates.publishAnswers = publishAnswersToggle;
        
        // 檢查大型文字欄位是否變動 (最省流量的地方)
        const newTextJZ = window.jzCompress(questionText);
        if (newTextJZ !== oldData.questionText) updates.questionText = newTextJZ;
        if (questionHtml !== (oldData.questionHtml || '')) updates.questionHtml = questionHtml;
        if (explanationHtml !== (oldData.explanationHtml || '')) updates.explanationHtml = explanationHtml;
        if (cleanKey !== (oldData.correctAnswersInput || '')) updates.correctAnswersInput = cleanKey;

        setIsEditLoading(false); // ✨ 準備彈出視窗前先關閉載入

        // 如果完全沒改動，直接返回
        if (Object.keys(updates).length === 0) {
            return showAlert("ℹ️ 資料無變動，無需儲存。");
        }

        const confirmMsg = syncCount > 0
            ? `⚠️ 確定要儲存嗎？\n將為 ${syncCount} 位好友同步更新並重新計算他們的分數。` 
            : `確定要儲存目前的修改嗎？`;

        showConfirm(confirmMsg, async () => {
            try {
                setSyncStatus({ isSyncing: true, current: 0, total: syncCount + 1 });
                
                // 1. 儲存自己這份
                await window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).update({
                    ...updates,
                    updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });
                setSyncStatus(prev => ({ ...prev, current: 1 }));

                // 2. 處理任務牆 (如果是國考/模擬題)
                if (testName.includes('[#mnst]') || testName.includes('[#nmst]') || testName.includes('[#op]')) {
                    const taskUpdates = { ...updates, creatorUid: currentUser.uid, numQuestions, hasTimer, timeLimit };
                    await window.db.collection('publicTasks').doc(quizId).set(taskUpdates, { merge: true });
                }

                // 3. 同步給所有學生 (包含自動重算分數)
                if (syncCount > 0) {
                    const ansChanged = !!updates.correctAnswersInput; // 檢查標答是否變動

                    const chunkSize = 20;
                    for (let i = 0; i < syncCount; i += chunkSize) {
                        const chunk = latestSharedTo.slice(i, i + chunkSize);
                        const batch = window.db.batch();
                        
                        const readPromises = chunk.map(async (target) => {
                            const targetRef = window.db.collection('users').doc(target.uid).collection('quizzes').doc(target.quizId);
                            const targetUpdates = { ...updates, hasAnswerUpdate: true }; // 加入閃爍提醒標籤
                            
                            if (ansChanged) {
                                try {
                                    const doc = await targetRef.get();
                                    if (doc.exists) {
                                        const targetData = doc.data();
                                        // 只有已經交卷(有 results)的人才需要重算
                                        if (targetData.results) {
                                            let tCorrectCount = 0;
                                            let keyArray = cleanKey.includes(',') ? cleanKey.split(',') : (cleanKey.match(/[A-DZ]|[a-dz]+/g) || []);
                                            
                                            let targetAnswersArray = [];
                                            try {
                                                const rawAns = targetData.userAnswers;
                                                targetAnswersArray = Array.isArray(rawAns) ? rawAns : (typeof rawAns === 'string' ? window.jzDecompress(rawAns) : []);
                                            } catch(e) { targetAnswersArray = []; }

                                           const tData = targetAnswersArray.map((ans, idx) => {
                                                const key = keyArray[idx] || '-';
                                                let isCorrect = (key === 'Z' || key === 'z' || key.toLowerCase() === 'abcd') ? true : (key !== '-' && key !== '' && ans !== '' ? (key === key.toUpperCase() ? ans === key : key.toLowerCase().includes(ans.toLowerCase())) : false);
                                                if (isCorrect) tCorrectCount++;
                                                return { number: idx + 1, userAns: ans || '未填', correctAns: key, isCorrect, isStarred: targetData.starred ? targetData.starred[idx] : false };
                                            });
                                            targetUpdates.results = window.jzCompress({ score: Math.round((tCorrectCount/targetData.numQuestions)*100), correctCount: tCorrectCount, total: targetData.numQuestions, data: tData });
                                            
                                            // ✨ 新增：同步更新該學生的錯題本中的答案 (改為直接更新，避免超過 Batch 500 筆上限)
                                            try {
                                                const wbSnapshot = await window.db.collection('users').doc(target.uid).collection('wrongBook').where('quizId', '==', target.quizId).get();
                                                if (!wbSnapshot.empty) {
                                                    const wbPromises = [];
                                                    wbSnapshot.docs.forEach(wbDoc => {
                                                        const wbData = wbDoc.data();
                                                        const qNum = wbData.questionNum;
                                                        const newKey = keyArray[qNum - 1] || '';
                                                        if (wbData.correctAns !== newKey) {
                                                            wbPromises.push(wbDoc.ref.update({ correctAns: newKey }));
                                                        }
                                                    });
                                                    await Promise.all(wbPromises);
                                                }
                                            } catch(e) { console.error("同步學生錯題本失敗", e); }
                                        }
                                    }
                                } catch(e) { console.error("同步失敗", e); }
                            }
                            batch.update(targetRef, targetUpdates);
                        });

                        await Promise.all(readPromises);
                        await batch.commit();
                        setSyncStatus(prev => ({ ...prev, current: Math.min(prev.current + chunk.length, syncCount + 1) }));
                    }
                }

                setSyncStatus({ isSyncing: false, current: 0, total: 0 });
                showAlert("✅ 儲存成功！所有學生的分數已自動重新計算並更新。");
                initialRecord.forceStep === 'edit' ? onBackToDashboard() : setStep(results ? 'results' : 'answering');
            } catch(e) {
                setSyncStatus({ isSyncing: false, current: 0, total: 0 });
                showAlert("儲存失敗：" + e.message);
            }
        });
    };

    const handleAnswerSelect = (idx, opt) => {
        if(isTimeUp) return;
        const newAns = [...userAnswers];
        newAns[idx] = newAns[idx] === opt ? '' : opt;
        setUserAnswers(newAns);
    };

    const toggleStar = (idx) => {
        if(isTimeUp) return;
        const newStar = [...starred];
        newStar[idx] = !newStar[idx];
        setStarred(newStar);
    };

    const handleGrade = async (overrideKey = null) => {
        // ✨ 修改：交卷時保留大小寫，僅允許 A-D, a-d, Z。並支援強制帶入最新 Key
        const sourceKey = overrideKey !== null ? overrideKey : correctAnswersInput;
        const cleanKey = (sourceKey || '').replace(/[^a-dA-DZz,]/g, '');
        if (!cleanKey && !isTask && !isShared) return showAlert('請輸入標準答案後再批改！');
        
        // ✨ 加入智慧辨識：交卷時若沒有逗號，也能正確拆分大寫與連續小寫
        let keyArray = cleanKey.includes(',') ? cleanKey.split(',') : (cleanKey.match(/[A-DZ]|[a-dz]+/g) || []);
        let correctCount = 0;
        const data = userAnswers.map((ans, idx) => {
            const key = keyArray[idx] || '-';
            let isCorrect = false;

            // ✨ 新增：多選與送分的批改邏輯
            if (key === 'Z' || key === 'z' || key.toLowerCase() === 'abcd') {
                isCorrect = true; // Z 或 abcd 代表送分，有填沒填都給分
            } else if (key !== '-' && key !== '' && ans !== '') {
                if (key === key.toUpperCase()) {
                    // 單選大寫
                    isCorrect = (ans === key);
                } else {
                    // 複選小寫 (只要使用者的答案包含在小寫字串內就給分，例如填 A，答案是 ab，就給分)
                    isCorrect = key.toLowerCase().includes(ans.toLowerCase());
                }
            }

            if (isCorrect) correctCount++;
            return { number: idx + 1, userAns: ans || '未填', correctAns: key, isCorrect, isStarred: starred[idx] };
        });

        const scoreVal = Math.round((correctCount/numQuestions)*100);
        const newResults = { score: scoreVal, correctCount, total: numQuestions, data };
        setResults(newResults);
        setStep('results');

        try {
            await window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).update({
                correctAnswersInput: cleanKey,
                results: window.jzCompress(newResults)
            });

            const isOp = testName.includes('[#op]');
            const isMnst = testName.includes('[#mnst]') || testName.includes('[#nmst]');
            
            if (!isShared && !isTask && (isMnst || isOp)) {
                let category = '模擬試題 (其他)';
                
                if (isOp) {
                    if (testName.includes('藥理') || testName.includes('藥物化學')) category = '1. 藥理學與藥物化學';
                    else if (testName.includes('藥物分析') || testName.includes('生藥') || testName.includes('中藥')) category = '2. 藥物分析學與生藥學(含中藥學)';
                    else if (testName.includes('藥劑') || testName.includes('生物藥劑')) category = '3. 藥劑學與生物藥劑學';
                    else category = '國考題 (其他)';
                } else {
                    if (testName.includes('藥物分析')) category = '1. 藥物分析學';
                    else if (testName.includes('生藥')) category = '2. 生藥學';
                    else if (testName.includes('中藥')) category = '3. 中藥學';
                    else if (testName.includes('藥物化學') || testName.includes('藥理')) category = '4. 藥物化學與藥理學';
                    else if (testName.includes('生物藥劑')) category = '6. 生物藥劑學';
                    else if (testName.includes('藥劑')) category = '5. 藥劑學';
                }

                await window.db.collection('publicTasks').doc(quizId).set({
                    testName, numQuestions, questionFileUrl, questionText: window.jzCompress(questionText), 
                    correctAnswersInput: cleanKey, hasTimer, timeLimit, category, creatorUid: currentUser.uid,
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            if (isTask && !initialRecord.results) {
                const mcData = userProfile.mcData || { diamonds: 0, level: 1, exp: 0, hunger: 10, items: [], cats: 0 };
                const rewardDiamonds = scoreVal >= 60 ? 200 : 30;

                let newExp = (mcData.exp || 0) + (scoreVal >= 60 ? 30 : 10);
                let newLevel = mcData.level || 1;
                while (newExp >= newLevel * 20) {
                    newExp -= newLevel * 20;
                    newLevel += 1;
                }

                await window.db.collection('users').doc(currentUser.uid).update({
                    mcData: { ...mcData, diamonds: (mcData.diamonds || 0) + rewardDiamonds, exp: newExp, level: newLevel }
                });

                if (initialRecord.taskId) {
                    window.db.collection('publicTasks').doc(initialRecord.taskId).collection('scores').add({
                        score: scoreVal,
                        timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                if (scoreVal >= 60) {
                    showAlert(`🎉 恭喜任務挑戰成功 (及格)！\n獲得 ${rewardDiamonds} 💎 與經驗值！`);
                } else {
                    showAlert(`💪 任務完成！\n雖然不及格，但仍獲得安慰獎 ${rewardDiamonds} 💎，下次再接再厲！`);
                }
            } 
            else if (isShared && !initialRecord.results && !isTask) {
                const mcData = userProfile.mcData || { diamonds: 0, level: 1, exp: 0, hunger: 10, items: [], cats: 0 };
                const today = new Date().toISOString().split('T')[0];
                let rewardData = mcData.rewardData || { date: '', count: 0 };
                
                if (rewardData.date !== today) {
                    rewardData = { date: today, count: 0 };
                }

                if (rewardData.count < 2) {
                    rewardData.count += 1;
                    let newExp = (mcData.exp || 0) + 15;
                    let newLevel = mcData.level || 1;
                    if (newExp >= newLevel * 20) {
                        newExp -= newLevel * 20;
                        newLevel += 1;
                    }
                    await window.db.collection('users').doc(currentUser.uid).update({
                        mcData: { ...mcData, diamonds: (mcData.diamonds || 0) + 50, exp: newExp, level: newLevel, rewardData }
                    });
                    showAlert(`🎉 批改完成！這是一份好友分享的試卷，你獲得了 50 💎 與 15 EXP 做為獎勵！\n(今日領取次數: ${rewardData.count}/2)`);
                } else {
                    showAlert(`🎉 批改完成！這是一份好友分享的試卷。\n(⚠️ 今日測驗鑽石獎勵已達上限 2/2，因此不再發放獎勵)`);
                }
            }
        } catch(e) {
            console.error("同步更新失敗", e);
        }
    };

   // ✨ 新增：手動/自動重新批改邏輯，負責比對差異並跳出提示 (加入錯題本同步與載入畫面)
    const handleManualRegrade = async (isAuto = false) => {
        if (!results || !results.data) return;

        setIsRegrading(true); // ✨ 提早開啟全螢幕載入畫面，避免畫面卡死

        let latestKey = correctAnswersInput || '';
        try {
            // ✨ 強制從雲端抓取最新資料，解決按下重新算分卻沒抓到新資料的問題
            const doc = await window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).get({ source: 'server' });
            if (doc.exists) {
                const data = doc.data();
                latestKey = data.correctAnswersInput || '';
                if (data.isTask && data.taskId) {
                    const taskDoc = await window.db.collection('publicTasks').doc(data.taskId).get({ source: 'server' });
                    if (taskDoc.exists) {
                        latestKey = taskDoc.data().correctAnswersInput || latestKey;
                    }
                }
                setCorrectAnswersInput(latestKey);
            }
        } catch (e) {
            console.error("無法抓取最新解答", e);
        }

        const cleanKey = latestKey.replace(/[^a-dA-DZz,]/g, '');
        let keyArray = cleanKey.includes(',') ? cleanKey.split(',') : (cleanKey.match(/[A-DZ]|[a-dz]+/g) || []);
        
        let changedDetails = [];
        
        // 比對每一題的舊答案與新答案
        results.data.forEach((item, idx) => {
            const oldKey = item.correctAns === '-' ? '' : item.correctAns;
            const newKey = keyArray[idx] || '';
            
            if (oldKey !== newKey) {
                changedDetails.push(`第 ${item.number} 題： ${oldKey || '(空)'} ➔ ${newKey || '(空)'}`);
            }
        });

        // 情況 A：沒有任何更動
        if (changedDetails.length === 0) {
            setIsRegrading(false);
            if (isAuto !== true) showAlert("ℹ️ 目前雲端沒有偵測到標準答案有任何更動喔！");
            return;
        }

        // 情況 B：有更動，執行原本的批改邏輯更新分數
        try {
            await handleGrade(latestKey); // 將最新解答傳入批改系統

            // ✨ 同步更新錯題本中的答案
            const wbSnapshot = await window.db.collection('users').doc(currentUser.uid).collection('wrongBook').where('quizId', '==', quizId).get();
            if (!wbSnapshot.empty) {
                const batch = window.db.batch();
                wbSnapshot.docs.forEach(doc => {
                    const wbData = doc.data();
                    const qNum = wbData.questionNum;
                    const newKey = keyArray[qNum - 1] || '';
                    if (wbData.correctAns !== newKey) {
                        batch.update(doc.ref, { correctAns: newKey });
                    }
                });
                await batch.commit();
            }
        } catch(e) { console.error("同步錯題本失敗", e); }
        
        setIsRegrading(false); // ✨ 關閉載入畫面
        
        // 顯示變更報告 (如果改太多題，最多顯示 8 題以免視窗塞爆)
        const detailsText = changedDetails.length > 8 
            ? changedDetails.slice(0, 8).join('\n') + `\n...等共 ${changedDetails.length} 題` 
            : changedDetails.join('\n');
            
        if (isAuto === true) {
            showAlert(`🔄 系統自動偵測到標準答案有更新！\n\n已為您光速重新批改並同步錯題本。\n\n【答案更動紀錄】\n${detailsText}`);
        } else {
            showAlert(`✅ 重新批改完成！成績已更新，同時也已將最新解答同步至您的「錯題筆記本」。\n\n【答案更動紀錄】\n${detailsText}`);
        }
    };

    const handleSubmitClick = () => {
        const unansweredCount = userAnswers.filter(a => !a).length;
        let warnMsg = unansweredCount > 0 ? `⚠️ 注意：你有 ${unansweredCount} 題尚未填寫！\n\n` : "";
        
        if (isShared || isTask || testName.includes('[#op]')) {
            showConfirm(`${warnMsg}確定要交卷嗎？\n交卷後系統將直接批改並鎖定答案，你無法再返回修改作答內容！`, () => {
                handleGrade();
            });
        } else {
            if (unansweredCount > 0) {
                showConfirm(`${warnMsg}確定要交卷對答案嗎？`, () => {
                    setStep('grading');
                });
            } else {
                setStep('grading');
            }
        }
    };

    const handleSendSuggestion = () => {
        showPrompt("發現題目有錯或排版問題？\n請輸入建議，我們將傳送給試題建立者：", "", async (text) => {
            const msg = text?.trim();
            if (!msg) return;
            
            const targetUid = initialRecord.creatorUid;
            const targetQuizId = initialRecord.creatorQuizId;
            
            if (!targetUid || !targetQuizId) {
                return showAlert("❌ 找不到原始出題者資訊。");
            }

            try {
                await window.db.collection('users').doc(targetUid).collection('quizzes').doc(targetQuizId).collection('suggestions').add({
                    text: msg,
                    senderName: userProfile.displayName || '匿名玩家',
                    timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
                });
                
                await window.db.collection('users').doc(targetUid).collection('quizzes').doc(targetQuizId).update({
                    hasNewSuggestion: true
                });
                
                showAlert("✅ 建議已發送給出題者！感謝您的回饋。");
            } catch(e) {
                showAlert("發送失敗：" + e.message);
            }
        });
    };

    const handleUploadComment = async () => {
        if (!commentInput.trim() && !commentFile) return showAlert('請輸入留言內容或上傳圖片！');
        
        const now = Date.now();
        if (now - lastCommentTime.current < 15000) {
            return showAlert('💬 說話太快了！請等待 15 秒後再發言 (防洗頻限制)。');
        }

        if (commentFile && commentFile.size > 5 * 1024 * 1024) {
            return showAlert('❌ 檔案大小不可超過 5MB！');
        }

        setIsSubmittingComment(true);

        try {
            let base64File = null;
            if (commentFile) {
                if (!commentFile.type.startsWith('image/')) {
                    setIsSubmittingComment(false);
                    return showAlert('❌ 為了維持系統效能，討論區目前僅支援上傳「圖片」格式喔！');
                }
                // ✨ 優化：將討論區圖片上傳至 Storage
                const imageUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.crossOrigin = "Anonymous";
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let w = img.width; let h = img.height;
                            const MAX_DIM = 800; 
                            if (w > h && w > MAX_DIM) { h *= MAX_DIM / w; w = MAX_DIM; }
                            else if (h > MAX_DIM) { w *= MAX_DIM / h; h = MAX_DIM; }
                            canvas.width = w; canvas.height = h;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, w, h);
                            
                            canvas.toBlob(async (blob) => {
                                if (!blob) return reject(new Error("圖片處理失敗"));
                                try {
                                    const filePath = `discussions/${initialRecord.taskId}/${currentUser.uid}_${Date.now()}.jpg`;
                                    const storageRef = window.storage.ref(filePath);
                                    await storageRef.put(blob);
                                    const url = await storageRef.getDownloadURL();
                                    resolve(url);
                                } catch (uploadErr) {
                                    reject(uploadErr);
                                }
                            }, 'image/jpeg', 0.6);
                        };
                        img.onerror = reject;
                        img.src = e.target.result;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(commentFile);
                });
                base64File = imageUrl; // 為了不改動你後面的程式碼，把得到的 URL 賦值給這個變數
            }

            await window.db.collection('publicTasks').doc(initialRecord.taskId).collection('discussions').add({
                userId: currentUser.uid,
                userName: userProfile.displayName || '匿名玩家',
                questionNum: commentQNum,
                text: commentInput.trim(),
                imageUrl: base64File,
                timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            lastCommentTime.current = Date.now();
            setCommentInput('');
            setCommentFile(null);
        } catch (e) {
            showAlert('留言失敗：' + e.message);
        }
        setIsSubmittingComment(false);
    };

    const handleResetProgress = () => {
        showConfirm("確定要刪除這份試卷嗎？此動作無法復原！", () => {
            window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).delete()
            .then(() => onBackToDashboard())
            .catch(e => showAlert('刪除失敗：' + e.message));
        });
    };

    // ✨ 新增：平滑捲動至題目錨點與答案卡，並加入閃爍高亮效果
    const scrollToQuestion = (qNum) => {
        // 1. 跳轉至左側(或上方)題目預覽區
        const el = document.getElementById(`q-marker-${qNum}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-yellow-400', 'bg-yellow-300', 'scale-110');
            setTimeout(() => el.classList.remove('ring-4', 'ring-yellow-400', 'bg-yellow-300', 'scale-110'), 1200);
        }
        
        // 2. 同步跳轉至右側(或下方)作答答案卡
        const cardEl = document.getElementById(`answer-card-${qNum}`);
        if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            cardEl.classList.add('bg-yellow-100', 'dark:bg-gray-600', 'transition-colors');
            setTimeout(() => cardEl.classList.remove('bg-yellow-100', 'dark:bg-gray-600', 'transition-colors'), 1200);
        }
    };

    const handleAddToWrongBook = async (item) => {
        try {
            // ✨ 新增：先檢查資料庫是否已經有這份試卷的這一題
            const snapshot = await window.db.collection('users').doc(currentUser.uid).collection('wrongBook')
                .where('quizId', '==', quizId)
                .where('questionNum', '==', item.number)
                .get();
                
            if (!snapshot.empty) {
                // 如果找到了，就跳出警告並停止動作
                return showAlert(`⚠️ 第 ${item.number} 題已經收錄在錯題本中了！`);
            }
            
            // 如果沒找到，繼續原本的收錄動作
            // ✨ 修改：自動解析並擷取該題的題目內容
            const extractedText = extractSpecificQuestion(questionHtml || questionText, item.number, !!questionHtml);
            setWrongBookAddingItem({ ...item, extractedQText: extractedText });
        } catch (error) {
            showAlert("檢查錯題本失敗：" + error.message);
        }
    };

    const shareScoreToFriend = (friend) => {
        const cleanName = cleanQuizName(testName);
        const chatId = [currentUser.uid, friend.uid].sort().join('_');
        const isTaskQuiz = isTask || /\[#(op|m?nm?st)\]/i.test(testName);
        window.db.collection('chats').doc(chatId).collection('messages').add({
            senderId: currentUser.uid,
            senderName: userProfile.displayName,
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
            type: 'score_share', 
            read: false,
            scoreData: {
                testName: cleanName,
                score: results.score,
                correctCount: results.correctCount,
                total: results.total
            },
            quizData: isTaskQuiz ? {
                isTaskQuiz: true,
                testName: cleanName
            } : {
                ownerId: currentUser.uid,
                quizId: quizId,
                testName: cleanName,
                questionFileUrl: questionFileUrl || '',
                questionText: questionText || '',
                questionHtml: questionHtml || '',
                explanationHtml: explanationHtml || '',
                correctAnswersInput: correctAnswersInput || ''
            }
        }).then(() => {
            window.db.collection('users').doc(friend.uid).set({
                unreadChats: { [currentUser.uid]: true }
            }, { merge: true });
            showAlert('✅ 已成功向 ' + friend.name + ' 炫耀戰績，對方可以直接下載試卷！');
            setShowShareScoreModal(false);
        }).catch(e => showAlert('炫耀失敗：' + e.message));
    };

    const handleBackFromEdit = async () => {
        // 如果是從首頁題庫直接點「編輯」進來的，直接退回首頁就會銷毀組件，不會觸發自動存檔
        if (initialRecord.forceStep === 'edit') {
            return onBackToDashboard();
        }

        setIsEditLoading(true); // ✨ 開啟載入，防止按鈕卡死無反應
        // ✨ 修復：如果是從作答/結果頁面進入編輯的，退出時必須先將狀態「還原」回資料庫原本的樣子，
        // 否則退出編輯模式的瞬間，會觸發作答頁面的「自動存檔」把未保存的草稿覆蓋進去！
        try {
            const doc = await window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).get();
            if (doc.exists) {
                const data = doc.data();
                setTestName(data.testName || '');
                setCorrectAnswersInput(data.correctAnswersInput || '');
                setQuestionFileUrl(data.questionFileUrl || '');
                setQuestionText(data.questionText ? window.jzDecompress(data.questionText) : '');
                setQuestionHtml(data.questionHtml || '');
                setExplanationHtml(data.explanationHtml || '');
                setPublishAnswersToggle(data.publishAnswers !== false);
                setInputType(data.questionHtml ? 'richtext' : (data.questionText && !data.questionFileUrl) ? 'text' : 'url');
            }
        } catch (e) {
            console.error("還原編輯狀態失敗", e);
        }

        setIsEditLoading(false); // ✨ 關閉載入
        setStep(results ? 'results' : 'answering');
    };
    
    if (step === 'edit') return (
        <div className="flex flex-col min-h-[100dvh] items-center p-4 relative py-10 overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors custom-scrollbar">
            <button onClick={handleBackFromEdit} className="absolute top-6 left-6 text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-bold z-10 transition-colors">← 返回</button>
<div className="bg-white dark:bg-gray-800 p-8 shadow-md w-full max-w-4xl no-round border border-gray-200 dark:border-gray-700 mt-6 transition-colors">                <h2 className="font-bold mb-6 text-2xl dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">📝 編輯試題</h2>
                
                {/* 新增：測驗名稱編輯區塊 */}
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">測驗名稱</label>
                <input 
                    type="text" 
                    placeholder="請輸入測驗名稱..." 
                    className="w-full mb-6 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm" 
                    value={testName} 
                    onChange={e => setTestName(e.target.value)} 
                />
                
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">試題來源 (單選)</label>
                <div className="flex flex-wrap space-x-4 mb-4 dark:text-white">
                    <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-black dark:hover:text-gray-300">
                        <input type="radio" checked={inputType === 'url'} onChange={() => setInputType('url')} className="w-4 h-4 accent-black dark:accent-white" />
                        <span>公開網址</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-black dark:hover:text-gray-300">
                        <input type="radio" checked={inputType === 'text'} onChange={() => setInputType('text')} className="w-4 h-4 accent-black dark:accent-white" />
                        <span>純文字</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-black dark:hover:text-gray-300 mt-2 sm:mt-0">
                        <input type="radio" checked={inputType === 'richtext'} onChange={() => {
    const isAuth = currentUser && (currentUser.email === 'jay03wn@gmail.com' || userProfile?.isAuthorized);
    if (isAuth) {
        setInputType('richtext');
    } else {
        showAlert("🔒 此功能目前僅開放給 jay03wn@gmail.com 或經授權的老師使用。");
    }
}} className="w-4 h-4 accent-black dark:accent-white" />
                        <span className="text-blue-600 dark:text-blue-400 font-bold">富文本 (支援 Word 貼上)</span>
                    </label>
                </div>

                {inputType === 'url' ? (
                    <input type="text" placeholder="請貼上試卷網址 (例如: Google Drive 連結)" className="w-full mb-6 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm" value={questionFileUrl} onChange={e => setQuestionFileUrl(e.target.value)} />
                ) : inputType === 'text' ? (
                    <textarea placeholder="請貼上試題純文字..." className="w-full h-32 mb-6 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm custom-scrollbar" value={questionText} onChange={e => setQuestionText(e.target.value)}></textarea>
                ) : (
                    <ContentEditableEditor value={questionHtml} onChange={setQuestionHtml} placeholder="請直接在此貼上 Word 文件內容，將保留原本的排版格式..." showAlert={showAlert} />
                )}

              {/* ✨ 已將標準答案移至詳解上方 */}
                <h3 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-2 mt-4">標準答案</h3>
                <AnswerGridInput value={correctAnswersInput} onChange={setCorrectAnswersInput} maxQuestions={numQuestions} showConfirm={showConfirm} />

                <h3 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-2 mt-4">測驗詳解 (純文字)</h3>
                <textarea 
                    className="w-full h-48 mb-6 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm custom-scrollbar"
                    placeholder="在此貼上詳解純文字，並使用 [A.1], [A.02] 等標記對應題號..."
                    value={explanationHtml}
                    onChange={(e) => setExplanationHtml(e.target.value)}
                />

                <div className="flex items-center mt-4 mb-8 bg-gray-50 dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-700">
                    <label className="flex items-center space-x-2 cursor-pointer dark:text-white font-bold text-sm">
                        <input type="checkbox" checked={publishAnswersToggle} onChange={e => setPublishAnswersToggle(e.target.checked)} className="w-4 h-4 accent-black" />
                        <span>👁️ 允許玩家在交卷後查看「標準答案」與「錯題」</span>
                    </label>
                </div>

                <button onClick={handleSaveEdit} className="w-full bg-blue-600 dark:bg-blue-700 text-white p-3 font-bold no-round hover:bg-blue-800 transition-colors shadow-md">
                    💾 儲存並同步至所有玩家
                </button>

                <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="font-bold text-lg mb-4 text-orange-600 dark:text-orange-400">💡 來自玩家的修正建議</h3>
                    {creatorSuggestions.length === 0 ? (
                        <p className="text-gray-500 text-sm font-bold">目前沒有收到建議。</p>
                    ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {creatorSuggestions.map(s => (
                                <div key={s.id} className="p-3 bg-orange-50 dark:bg-gray-700 border border-orange-200 dark:border-gray-600 no-round">
                                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        <span className="font-bold text-orange-700 dark:text-orange-300">{s.senderName}</span>
                                        {/* ✨ 修復：增加對 timestamp 的安全檢查，防止 toDate() 當機 */}
                                        <span>{s.timestamp && typeof s.timestamp.toDate === 'function' ? s.timestamp.toDate().toLocaleString('zh-TW') : ''}</span>
                                    </div>
                                    <p className="text-sm dark:text-white whitespace-pre-wrap font-bold">{s.text}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {/* ✨ 新增：編輯模式的載入遮罩，解決按鈕無法互動的錯覺 */}
            {isEditLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 w-full max-w-sm no-round shadow-2xl text-center border-t-8 border-purple-500">
                        <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-purple-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black mb-2 dark:text-white">⏳ 正在處理中...</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">正在與雲端同步資料，請稍候</p>
                    </div>
                </div>
            )}
        </div>
    );

    if (step === 'setup') return (
        <div className="flex flex-col items-center p-4 h-[100dvh] overflow-y-auto relative custom-scrollbar bg-gray-100 dark:bg-gray-900">
            <button onClick={onBackToDashboard} className="absolute top-6 left-6 text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-bold z-10 transition-colors">← 返回列表</button>
<div className="bg-white dark:bg-gray-800 p-8 shadow-md w-full max-w-4xl no-round border border-gray-200 dark:border-gray-700 mt-10 mb-10 transition-colors">                <h1 className="text-xl font-bold mb-6 border-b border-gray-200 dark:border-gray-700 pb-2 tracking-tight dark:text-white">新增測驗</h1>
                
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">存放資料夾</label>
                <select value={folder} onChange={e => setFolder(e.target.value)} className="w-full mb-4 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm cursor-pointer">
                    {userFolders.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">測驗名稱</label>
                <input type="text" placeholder="例如: 藥理學期中考" className="w-full mb-4 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm" value={testName} onChange={e => setTestName(e.target.value)} onFocus={handleFocusScroll} />
                
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">題數 (1-100)</label>
                <input type="number" placeholder="50" className="w-full mb-4 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} onFocus={handleFocusScroll} />
                
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">試題來源 (單選)</label>
                <div className="flex flex-wrap space-x-4 mb-4 dark:text-white">
                    <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-black dark:hover:text-gray-300">
                        <input type="radio" checked={inputType === 'url'} onChange={() => setInputType('url')} className="w-4 h-4 accent-black dark:accent-white" />
                        <span>公開網址</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-black dark:hover:text-gray-300">
                        <input type="radio" checked={inputType === 'text'} onChange={() => setInputType('text')} className="w-4 h-4 accent-black dark:accent-white" />
                        <span>純文字</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm cursor-pointer hover:text-black dark:hover:text-gray-300 mt-2 sm:mt-0">
                        <input type="radio" checked={inputType === 'richtext'} onChange={() => {
    const isAuth = currentUser && (currentUser.email === 'jay03wn@gmail.com' || userProfile?.isAuthorized);
    if (isAuth) {
        setInputType('richtext');
    } else {
        showAlert("🔒 此功能目前僅開放給 jay03wn@gmail.com 或經授權的老師使用。");
    }
}} className="w-4 h-4 accent-black dark:accent-white" />
                        <span className="text-blue-600 dark:text-blue-400 font-bold">富文本 (支援 Word 貼上)</span>
                    </label>
                </div>

                {inputType === 'url' ? (
                    <input type="text" placeholder="請貼上 Google Drive 等連結" className="w-full mb-6 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm" value={questionFileUrl} onChange={e => setQuestionFileUrl(e.target.value)} onFocus={handleFocusScroll} />
                ) : inputType === 'text' ? (
                    <textarea placeholder="請貼上試題純文字..." className="w-full h-32 mb-6 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm custom-scrollbar" value={questionText} onChange={e => setQuestionText(e.target.value)} onFocus={handleFocusScroll} />
                ) : (
                   <ContentEditableEditor value={questionHtml} onChange={setQuestionHtml} placeholder="請直接在此貼上 Word 文件內容，將保留原本的排版格式..." showAlert={showAlert} />
                )}
                
              {/* ✨ 已將標準答案移至詳解上方 */}
                <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 mb-2 mt-4">標準答案 (選填，交卷時會自動批改)</h3>
                <AnswerGridInput value={correctAnswersInput} onChange={setCorrectAnswersInput} maxQuestions={numQuestions} showConfirm={showConfirm} />

                <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 mb-2">測驗詳解 (純文字，選填)</h3>

                
                <textarea 
                    className="w-full h-32 mb-6 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-sm custom-scrollbar"
                    placeholder="在此貼上詳解純文字，並使用 [A.1], [A.02] 等標記對應題號..."
                    value={explanationHtml}
                    onChange={(e) => setExplanationHtml(e.target.value)}
                    onFocus={handleFocusScroll}
                />

                <div className="mb-6 border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700 no-round">
                    <label className="flex items-center space-x-2 font-bold cursor-pointer text-sm dark:text-white">
                        <input type="checkbox" checked={hasTimer} onChange={e => setHasTimer(e.target.checked)} className="w-4 h-4 accent-black dark:accent-white" />
                        <span>⏱ 開啟測驗倒數計時</span>
                    </label>
                    {hasTimer && (
                        <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <span className="text-sm text-gray-600 dark:text-gray-300">測驗時間：</span>
                            <input type="number" min="1" max="999" className="w-16 p-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white no-round outline-none focus:border-black dark:focus:border-white text-center text-sm" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} onFocus={handleFocusScroll} />
                            <span className="text-sm text-gray-600 dark:text-gray-300">分鐘</span>
                        </div>
                    )}
                </div>

                <button onClick={handleStartTest} className="w-full bg-black dark:bg-gray-200 text-white dark:text-black p-3 font-bold no-round hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors">開始作答</button>
            {isCreating && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[200] p-4">
                        <div className="bg-white dark:bg-gray-800 p-8 w-full max-w-sm no-round shadow-2xl text-center border-t-8 border-black dark:border-white">
                            <div className="w-16 h-16 border-4 border-gray-200 border-t-black dark:border-gray-700 dark:border-t-white rounded-full animate-spin mx-auto mb-6"></div>
                            <h3 className="text-xl font-black mb-2 dark:text-white">🚀 正在建立試卷...</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">即將為您準備作答環境，請稍候</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (step === 'answering') return (
        <div className="flex flex-col h-[100dvh] bg-gray-100 dark:bg-gray-900 p-2 sm:p-4 w-full overflow-hidden transition-colors">
            {/* ✨ 修正：加入 flex-wrap 與 w-full，並調整為 lg 斷點，避免平板尺寸時按鈕被擠壓到畫面外 */}
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center no-round gap-3 shrink-0 z-10 transition-colors w-full">
                <div className="flex items-center flex-grow mr-2 w-full lg:w-auto overflow-hidden">
                    <button onClick={onBackToDashboard} className="mr-3 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-bold text-sm whitespace-nowrap px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors shrink-0">← 返回</button>
                    <div className="overflow-hidden flex-grow flex flex-col justify-center min-w-0">
                        <div className="flex items-center space-x-2">
    <h2 className="font-bold truncate text-base dark:text-white">{renderTestName(testName, false)}</h2>
    {hasTimer && (
                                <span className={`font-mono font-bold px-1.5 py-0.5 no-round border ${isTimeUp ? 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 border-red-200 dark:border-red-700 animate-pulse' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'} text-xs shrink-0`}>
                                    {isTimeUp ? '時間到' : `⏱ ${formatTime(displayTime)}`}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="shrink-0">進度: <span className="font-bold text-black dark:text-white">{userAnswers.filter(a=>a).length}</span> / {numQuestions}</span>
                            {starredIndices.length > 0 && (
                                <span className="text-orange-500 dark:text-orange-400 font-bold flex items-center bg-orange-50 dark:bg-gray-700 px-1.5 py-0.5 rounded max-w-[150px] sm:max-w-xs overflow-x-auto custom-scrollbar whitespace-nowrap">
                                    <span className="mr-1 shrink-0">★</span> 
                                    <div className="flex items-center">
                                        {starredIndices.map((num, idx) => (
                                            <React.Fragment key={num}>
                                                <button 
                                                    onClick={() => scrollToQuestion(num)}
                                                    className="hover:text-orange-700 dark:hover:text-orange-300 hover:underline cursor-pointer focus:outline-none"
                                                    title={`跳轉至第 ${num} 題`}
                                                >
                                                    {num}
                                                </button>
                                                {idx < starredIndices.length - 1 && <span className="mx-1 text-orange-300 dark:text-gray-500">,</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
                    {/* ✨ 新增：沉浸式作答切換按鈕 (偵測到有題目格式才顯示) */}
                    {(questionHtml || questionText)?.match(/\[Q\.?0*\d+\]/i) && (
                        <button onClick={() => setViewMode(prev => prev === 'split' ? 'interactive' : 'split')} className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1.5 no-round font-bold border border-blue-200 dark:border-blue-700 text-xs hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors">
                            {viewMode === 'split' ? '✨ 沉浸式作答' : '🔙 傳統雙視窗'}
                        </button>
                    )}

                    {viewMode === 'split' && (questionFileUrl || questionText || questionHtml) && previewOpen && (
                        <button onClick={() => setLayoutMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')} className="bg-gray-100 dark:bg-gray-700 text-black dark:text-white px-3 py-1.5 no-round font-bold border border-gray-200 dark:border-gray-600 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            {layoutMode === 'horizontal' ? '🔄 切換上下/左右' : '🔄 切換上下/左右'}
                        </button>
                    )}

                    {viewMode === 'split' && (questionFileUrl || questionText || questionHtml) && (
                        <button onClick={() => setPreviewOpen(!previewOpen)} className="bg-gray-100 dark:bg-gray-700 text-black dark:text-white px-3 py-1.5 no-round font-bold border border-gray-200 dark:border-gray-600 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            {previewOpen ? '👀 關閉預覽' : '👀 開啟預覽'}
                        </button>
                    )}
                    
                    <button onClick={handleResetProgress} className="bg-gray-50 dark:bg-gray-700 text-red-400 dark:text-red-400 px-4 py-1.5 no-round font-bold hover:bg-red-50 dark:hover:bg-gray-600 hover:text-red-600 dark:hover:text-red-300 border border-transparent hover:border-red-100 dark:hover:border-gray-500 text-xs hidden md:block transition-colors">刪除</button>
                    
                   {!isShared && !isTask && (
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("切換至編輯模式"); // 除錯用
                                setStep('edit');
                            }} 
                            className="text-xs font-bold bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-4 py-1.5 no-round border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-800 whitespace-nowrap transition-colors active:scale-95"
                        >
                            📝 編輯試題
                        </button>
                    )}

                    <button onClick={handleSubmitClick} className="bg-black dark:bg-gray-200 text-white dark:text-black px-6 py-1.5 no-round font-bold hover:bg-gray-800 dark:hover:bg-gray-300 text-sm shadow-sm transition-colors">
                        {isShared || isTask || testName.includes('[#op]') ? '直接交卷' : '交卷對答案'}
                    </button>
                </div>
            </div>
            
           {viewMode === 'interactive' ? (
                /* ✨ 修改：沉浸式作答介面 - 支援暗色模式的白底黑字/黑底白字自動切換 */
                <div className="flex-grow flex flex-col w-full bg-slate-50 dark:bg-slate-950 transition-colors mt-2 overflow-hidden relative">
                    {/* ✨ 重新視覺設計：沉浸式作答與富文本自適應 */}
<style dangerouslySetInnerHTML={{__html: `
    .preview-rich-text {
        word-break: break-word;
        white-space: pre-wrap;
        font-size: 1rem;
        line-height: 1.6;
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        padding: 20px;
        border: 1px solid #e2e8f0;
    }
    .dark .preview-rich-text {
        background-color: #1f2937 !important;
        color: #f8fafc !important;
        border-color: #374151 !important;
    }
    /* 選項按鈕內部的富文本也要強制繼承顏色 */
    .preview-rich-text * {
        color: inherit !important;
        background-color: transparent !important;
    }
    /* 🚀 修正：強制消除「選項按鈕」內部富文本的白底與巨大邊距 */
    button .preview-rich-text {
        padding: 0 !important;
        border: none !important;
        background-color: transparent !important;
    }
`}} />
                    
                    {parsedInteractiveQuestions.length === 0 ? (
                        <div className="text-center p-10 mt-10 text-gray-500 font-bold border border-dashed border-gray-300 bg-white dark:bg-gray-800 mx-4">
                            無法解析題目，請確認試題是否包含 [Q.1] 以及選項 [A], [B], [C], [D] 的格式標記。
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col h-full max-w-3xl mx-auto w-full relative">
                            {/* 頂部導覽列 */}
                            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex justify-between items-center shadow-sm z-20">
                                <button 
                                    onClick={() => setShowQuestionGrid(!showQuestionGrid)}
                                    className="font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded transition-colors flex items-center gap-2"
                                >
                                    <span>第 {currentInteractiveIndex + 1} / {parsedInteractiveQuestions.length} 題</span>
                                    <span className="text-xs">{showQuestionGrid ? '▲ 收起' : '▼ 展開列表'}</span>
                                </button>
                                <div className="flex gap-2">
                                    <button 
                                        disabled={currentInteractiveIndex === 0}
                                        onClick={() => {
                                            setCurrentInteractiveIndex(prev => Math.max(0, prev - 1));
                                            setShowQuestionGrid(false);
                                        }}
                                        className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-1.5 font-bold disabled:opacity-30 transition-colors"
                                    >
                                        上一題
                                    </button>
                                    <button 
                                        disabled={currentInteractiveIndex === parsedInteractiveQuestions.length - 1}
                                        onClick={() => {
                                            setCurrentInteractiveIndex(prev => Math.min(parsedInteractiveQuestions.length - 1, prev + 1));
                                            setShowQuestionGrid(false);
                                        }}
                                        className="bg-black dark:bg-gray-200 text-white dark:text-black px-4 py-1.5 font-bold disabled:opacity-30 transition-colors shadow-sm"
                                    >
                                        下一題
                                    </button>
                                </div>
                            </div>

                            {/* 展開的題號網格面板 */}
                            {showQuestionGrid && (
                                <div className="absolute top-[60px] left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg p-4 z-30 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                                        {parsedInteractiveQuestions.map((q, idx) => {
                                            const actualIdx = q.number - 1;
                                            const isAnswered = !!userAnswers[actualIdx];
                                            const isStarred = starred[actualIdx];
                                            const isCurrent = currentInteractiveIndex === idx;
                                            
                                            return (
                                                <button
                                                    key={q.number}
                                                    onClick={() => {
                                                        setCurrentInteractiveIndex(idx);
                                                        setShowQuestionGrid(false);
                                                    }}
                                                    className={`relative py-2 font-bold text-sm border-2 transition-colors
                                                        ${isCurrent ? 'border-black dark:border-white bg-gray-100 dark:bg-gray-700 text-black dark:text-white' : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-400 text-gray-600 dark:text-gray-300'}
                                                        ${isAnswered && !isCurrent ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''}
                                                    `}
                                                >
                                                    {q.number}
                                                    {isStarred && <span className="absolute -top-3 -right-3 text-orange-500 drop-shadow-sm text-lg z-10">★</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 題目主體內容區 (可滾動) */}
                            <div className="flex-grow overflow-y-auto p-4 sm:p-6 custom-scrollbar relative z-10">
                                {(() => {
                                    const q = parsedInteractiveQuestions[currentInteractiveIndex];
                                    if (!q) return null;
                                    const actualIdx = q.number - 1; 
                                    const currentAns = userAnswers[actualIdx];
                                    const isStarred = starred[actualIdx];

                                    return (
                                <div key={q.number} className="bg-white dark:bg-gray-800 border-2 border-slate-200 dark:border-slate-700 shadow-xl p-4 sm:p-6 mb-10 transition-all">
                                    <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-gray-700 pb-3">
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-xl font-black text-blue-600 dark:text-blue-400">第 {q.number} 題</span>
                                                    <button onClick={() => toggleStar(actualIdx)} className={`text-xl focus:outline-none transition-colors ${isStarred ? 'text-orange-500' : 'text-gray-300 dark:text-gray-600'} hover:scale-110`} title="標記星號">★</button>
                                                </div>
                                                <span className="text-sm font-bold bg-gray-100 dark:bg-gray-700 px-3 py-1 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                    選擇: {currentAns || '未答'}
                                                </span>
                                            </div>
                                            
                                            <div 
                                                className="preview-rich-text text-black dark:text-white mb-6 font-medium"
                                                dangerouslySetInnerHTML={{ __html: q.mainText }}
                                            />

                                            <div className="grid grid-cols-1 gap-2">
                                                {['A', 'B', 'C', 'D'].map(opt => {
                                                    const hasCustomContent = !!q.options[opt];
                                                    const isSelected = currentAns === opt;
                                                    return (
                                                        <button 
                                                            key={opt}
                                                            disabled={isTimeUp}
                                                            onClick={() => handleAnswerSelect(actualIdx, opt)}
                                                            className={`text-left w-full py-1.5 px-3 border-2 transition-all flex items-start space-x-2 sm:space-x-3 no-round
                                                                ${isSelected ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400 shadow-sm scale-[1.01]' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-750'}
                                                                ${isTimeUp ? 'locked-btn opacity-80' : ''}`}
                                                        >
                                                            <span className={`text-base font-black mt-0.5 w-6 shrink-0 text-center ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>{opt}.</span>
                                                            {hasCustomContent ? (
                                                                <div 
                                                                    className={`preview-rich-text w-full flex-1 ${isSelected ? 'text-black dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                                                                    dangerouslySetInnerHTML={{ __html: q.options[opt] }}
                                                                />
                                                            ) : (
                                                                <span className={`w-full flex-1 ${isSelected ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-600'} italic`}>(選項無內容，但可點擊作答)</span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
            <div 
                ref={splitContainerRef}
                className={`flex-grow flex ${layoutMode === 'horizontal' ? 'flex-row' : 'flex-col'} overflow-hidden relative w-full mt-2 sm:mt-4`}
            >
                {isDragging && (
                    <div className="absolute inset-0 z-50" style={{ cursor: layoutMode === 'horizontal' ? 'col-resize' : 'row-resize' }}></div>
                )}

                {(questionFileUrl || questionText || questionHtml) && previewOpen && (
                    <div 
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round flex flex-col shrink-0 transition-colors"
                        style={{ [layoutMode === 'horizontal' ? 'width' : 'height']: `${splitRatio}%` }}
                    >
                        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-2 flex justify-between items-center shrink-0 transition-colors">
                            <span className="font-bold text-xs text-gray-600 dark:text-gray-300 flex items-center"><span className="text-sm mr-1">📄</span> 試卷預覽區</span>
                            <div className="flex space-x-3 items-center">
                                {questionFileUrl && (
                                    <div className="flex space-x-1 items-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                                        <button onClick={() => setPdfZoom(z => Math.max(0.5, z - 0.2))} className="px-2 font-bold text-gray-600 dark:text-gray-200">-</button>
                                        <span className="text-[10px] w-8 text-center font-bold dark:text-gray-200">{Math.round(pdfZoom * 100)}%</span>
                                        <button onClick={() => setPdfZoom(z => Math.min(3, z + 0.2))} className="px-2 font-bold text-gray-600 dark:text-gray-200">+</button>
                                    </div>
                                )}
                                {questionFileUrl && (
                                    <a href={questionFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold underline">在新分頁開啟</a>
                                )}
                            </div>
                        </div>
                        <div className="flex-grow w-full relative bg-gray-200 dark:bg-gray-800 flex flex-col overflow-auto">
                            {questionFileUrl && (
                                <div style={{ transform: `scale(${pdfZoom})`, transformOrigin: 'top left', width: `${100/pdfZoom}%`, height: `${100/pdfZoom}%` }} className={`relative shrink-0`}>
                                    <iframe src={getEmbedUrl(questionFileUrl)} className="absolute inset-0 w-full h-full border-0 bg-white" allow="autoplay" allowFullScreen></iframe>
                                </div>
                            )}
                            {questionText && !questionHtml && (
                                <div className={`w-full relative bg-gray-50 dark:bg-gray-900 flex flex-col flex-grow h-full`}>
                                    <textarea 
                                        className={`absolute inset-0 w-full h-full p-4 resize-none outline-none custom-scrollbar text-sm leading-relaxed bg-transparent text-gray-700 dark:text-gray-300`}
                                        style={{ whiteSpace: 'pre-wrap' }}
                                        value={questionText}
                                        readOnly={true}
                                        placeholder={"沒有提供試題文字"}
                                    ></textarea>
                                </div>
                            )}
                            {questionHtml && (
                                <div className={`w-full relative bg-gray-50 dark:bg-gray-900 flex flex-col flex-grow h-full`}>
                                    <div className="absolute inset-0 w-full h-full p-4 custom-scrollbar text-gray-800 dark:text-gray-200 overflow-y-auto">
                                        <style dangerouslySetInnerHTML={{__html: `
                                            .preview-rich-text { word-break: break-word; white-space: pre-wrap; font-size: 0.875rem; line-height: 1.625; }
                                            .preview-rich-text p { margin-bottom: 0.75em !important; }
                                            .preview-rich-text div { margin-bottom: 0.25em !important; }
                                            .preview-rich-text ul { list-style-type: disc !important; margin-left: 1.5em !important; margin-bottom: 0.5em !important; }
                                            .preview-rich-text ol { list-style-type: decimal !important; margin-left: 1.5em !important; margin-bottom: 0.5em !important; }
                                        `}} />
                                        <div 
                                            className="preview-rich-text"
                                            dangerouslySetInnerHTML={{ __html: processQuestionContent(questionHtml, true) }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(questionFileUrl || questionText || questionHtml) && previewOpen && (
                    <div 
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        className={`${layoutMode === 'horizontal' ? 'w-4 h-full cursor-col-resize flex-col' : 'h-4 w-full cursor-row-resize flex-row'} bg-gray-100 dark:bg-gray-900 hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center shrink-0 z-40 transition-colors active:bg-blue-300`}
                    >
                        <div className={`${layoutMode === 'horizontal' ? 'w-1 h-8' : 'h-1 w-8'} bg-gray-400 dark:bg-gray-600 rounded-full`}></div>
                    </div>
                )}

                <div className={`flex-grow flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round overflow-hidden transition-colors`}>
                    <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 shrink-0 flex justify-between items-center transition-colors">
                        <span className="font-bold text-xs text-gray-600 dark:text-gray-300">✏️ 答案卡 {isTimeUp && <span className="text-red-500 ml-2">(已鎖定)</span>}</span>
                    </div>
                    <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 sm:p-6 custom-scrollbar bg-white dark:bg-gray-800 transition-colors">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px 16px' }}>
                            {userAnswers.map((ans, i) => {
                                // ✨ 新增：即時判斷此題是否為送分題 (Z 或 z)
                                const currentCleanKey = (correctAnswersInput || '').replace(/[^a-dA-DZz]/g, '');
                                const key = currentCleanKey[i] || '-';
                                const isBonus = (key === 'Z' || key === 'z');

                                return (
                                    <div key={i} id={`answer-card-${i+1}`} className={`break-avoid flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-gray-700 pr-2 transition-colors rounded ${isBonus ? 'bg-yellow-50 dark:bg-yellow-900/40 hover:bg-yellow-100 dark:hover:bg-yellow-900/60' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                        <div className="flex items-center space-x-2 shrink-0 w-20">
                                            {/* ✨ 修改：將 span 替換為可點擊跳轉的 button */}
                                            <button 
                                                onClick={() => scrollToQuestion(i+1)}
                                                className={`font-mono text-sm font-bold transition-colors cursor-pointer ${isBonus ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
                                                title="點擊跳轉至此題題目"
                                            >{i+1}.</button>
                                            <button 
                                                disabled={isTimeUp}
                                                onClick={() => toggleStar(i)} 
                                                className={`text-sm focus:outline-none ${starred[i] ? 'text-orange-500' : 'text-gray-200 dark:text-gray-600'} ${isTimeUp ? 'cursor-not-allowed opacity-50' : 'hover:text-gray-300 dark:hover:text-gray-500'}`}
                                            >★</button>
                                            {/* ✨ 新增：送分題 UI 閃爍標籤 */}
                                            {isBonus && <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded-sm font-bold animate-pulse shadow-sm">🎁 送分</span>}
                                        </div>
                                        <div className="flex space-x-1 shrink-0">
                                            {['A','B','C','D'].map(o => (
                                                <button 
                                                    key={o} 
                                                    disabled={isTimeUp}
                                                    onClick={() => handleAnswerSelect(i, o)} 
                                                    className={`w-8 h-8 text-sm font-bold border-2 no-round transition-all 
                                                        ${ans === o ? 'bg-black dark:bg-gray-200 border-black dark:border-gray-200 text-white dark:text-black scale-105 shadow-sm' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-400'}
                                                        ${isTimeUp ? 'locked-btn' : 'hover:border-gray-500 dark:hover:border-gray-400'}
                                                        ${isBonus && ans !== o && !isTimeUp ? 'border-yellow-300 dark:border-yellow-700' : ''}`}
                                                >{o}</button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

            </div>
            )}
        </div>
    );

    if (step === 'grading') return (
                <div className="flex flex-col min-h-[100dvh] items-center justify-center p-4 relative py-10 overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors">
                    <button onClick={() => setStep('answering')} className="absolute top-6 left-6 text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-bold z-10 transition-colors">
                        ← 返回作答
                    </button>
                    <div className="bg-white dark:bg-gray-800 p-8 shadow-md w-full max-w-lg no-round border border-gray-200 dark:border-gray-700 mt-10 transition-colors">
                        <h3 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">請輸入正確答案以進行批改</h3>
                        <AnswerGridInput value={correctAnswersInput} onChange={setCorrectAnswersInput} maxQuestions={numQuestions} showConfirm={showConfirm} />
                        
                        <button onClick={() => handleGrade()} className="w-full bg-black dark:bg-gray-200 text-white dark:text-black p-3 font-bold no-round hover:bg-gray-800 dark:hover:bg-gray-300 text-lg transition-colors mt-4">開始批改</button>
                    </div>
                </div>
            );

    if (step === 'results') return (
        <div className="flex flex-col h-[100dvh] bg-gray-100 dark:bg-gray-900 p-2 sm:p-4 w-full overflow-hidden transition-colors">
            {/* ✨ 修正：加入 flex-wrap 與 w-full，並調整為 lg 斷點，避免平板尺寸時按鈕被擠壓到畫面外 */}
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center no-round gap-3 shrink-0 z-10 transition-colors w-full">
                <div className="flex items-center flex-grow mr-2 w-full lg:w-auto overflow-hidden">
    <h2 className="font-bold truncate text-base pr-4 dark:text-white flex items-center gap-2 min-w-0">
        {renderTestName(testName, true)} <span className="shrink-0">- 測驗結果</span>
    </h2>
</div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
                    {!isShared && !isTask && !/\[#(op|m?nm?st)\]/i.test(testName) && (
                        <button onClick={async () => {
                            const generateShareText = (code) => {
                                const link = `${window.location.origin}/?shareCode=${code}`;
                                return `🔥 快來挑戰我的試卷！\n📝 試卷名稱：${testName.replace(/\[#(op|m?nm?st)\]/gi, '').trim()}\n\n👇 點擊下方連結，立即將試卷自動加入你的題庫：\n${link}`;
                            };
                            if (shortCode) {
                                const text = generateShareText(shortCode);
                                navigator.clipboard.writeText(text);
                                showAlert(`✅ 已複製邀請連結與文案！快去貼給朋友吧！`);
                            } else {
                                const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                                try {
                                    await window.db.collection('shareCodes').doc(newCode).set({ ownerId: currentUser.uid, quizId: quizId });
                                    await window.db.collection('users').doc(currentUser.uid).collection('quizzes').doc(quizId).update({ shortCode: newCode });
                                    setShortCode(newCode);
                                    const text = generateShareText(newCode);
                                    navigator.clipboard.writeText(text);
                                    showAlert(`✅ 測驗代碼已生成！\n已複製邀請連結與文案！快去貼給朋友吧！`);
                                } catch (e) {
                                    showAlert('生成代碼失敗：' + e.message);
                                }
                            }
                        }} className="text-sm font-bold bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-4 py-1.5 no-round border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800 whitespace-nowrap transition-colors">🔑 複製邀請連結</button>
                    )}

                    {!isShared && !isTask && (
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setStep('edit');
                            }} 
                            className="text-sm font-bold bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-4 py-1.5 no-round border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-800 whitespace-nowrap transition-colors active:scale-95"
                        >
                            📝 編輯試題
                        </button>
                    )}

                    {(isShared || isTask || testName.includes('[#op]')) && (
                        <button onClick={handleSendSuggestion} className="text-sm font-bold bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-4 py-1.5 no-round border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-800 whitespace-nowrap transition-colors">💡 修正建議</button>
                    )}
                    
                    <button onClick={handleRetake} className="text-sm font-bold bg-orange-50 dark:bg-orange-900 text-orange-600 dark:text-orange-400 px-4 py-1.5 no-round border border-orange-200 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-800 whitespace-nowrap transition-colors">再做一次</button>

                    {(questionFileUrl || questionText || questionHtml) && previewOpen && (
                        <button onClick={() => setLayoutMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')} className="bg-gray-100 dark:bg-gray-700 text-black dark:text-white px-3 py-1.5 no-round font-bold border border-gray-200 dark:border-gray-600 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            {layoutMode === 'horizontal' ? '🔄 切換上下/左右' : '🔄 切換上下/左右'}
                        </button>
                    )}

                    {(questionFileUrl || questionText || questionHtml) && (
                        <button onClick={() => setPreviewOpen(!previewOpen)} className="bg-gray-100 dark:bg-gray-700 text-black dark:text-white px-3 py-1.5 no-round font-bold border border-gray-200 dark:border-gray-600 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            {previewOpen ? '👀 暫時關閉預覽' : '👀 開啟預覽'}
                        </button>
                    )}
                    
                    <button onClick={() => setShowShareScoreModal(true)} className="text-sm font-bold bg-yellow-50 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 px-4 py-1.5 no-round border border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-800 whitespace-nowrap transition-colors">📢 炫耀並分享</button>
                    <button onClick={onBackToDashboard} className="text-sm font-bold bg-black dark:bg-gray-200 text-white dark:text-black px-4 py-1.5 no-round hover:bg-gray-800 dark:hover:bg-gray-300 whitespace-nowrap transition-colors">返回列表</button>
                </div>
            </div>
            
            <div 
                ref={splitContainerRef}
                className={`flex-grow flex ${layoutMode === 'horizontal' ? 'flex-row' : 'flex-col'} overflow-hidden relative w-full mt-2 sm:mt-4`}
            >
                {isDragging && (
                    <div className="absolute inset-0 z-50" style={{ cursor: layoutMode === 'horizontal' ? 'col-resize' : 'row-resize' }}></div>
                )}

                {(questionFileUrl || questionText || questionHtml) && previewOpen && (
                    <div 
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round flex flex-col shrink-0 transition-colors"
                        style={{ [layoutMode === 'horizontal' ? 'width' : 'height']: `${splitRatio}%` }}
                    >
                        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-2 flex justify-between items-center shrink-0 transition-colors">
                            <span className="font-bold text-xs text-gray-600 dark:text-gray-300 flex items-center"><span className="text-sm mr-1">📄</span> 試卷預覽區</span>
                            <div className="flex space-x-3 items-center">
                                {questionFileUrl && (
                                    <div className="flex space-x-1 items-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                                        <button onClick={() => setPdfZoom(z => Math.max(0.5, z - 0.2))} className="px-2 font-bold text-gray-600 dark:text-gray-200">-</button>
                                        <span className="text-[10px] w-8 text-center font-bold dark:text-gray-200">{Math.round(pdfZoom * 100)}%</span>
                                        <button onClick={() => setPdfZoom(z => Math.min(3, z + 0.2))} className="px-2 font-bold text-gray-600 dark:text-gray-200">+</button>
                                    </div>
                                )}
                                {questionFileUrl && (
                                    <a href={questionFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold underline">在新分頁開啟</a>
                                )}
                            </div>
                        </div>
                        <div className="flex-grow w-full relative bg-gray-200 dark:bg-gray-800 flex flex-col overflow-auto">
                            {questionFileUrl && (
                                <div style={{ transform: `scale(${pdfZoom})`, transformOrigin: 'top left', width: `${100/pdfZoom}%`, height: `${100/pdfZoom}%` }} className={`relative shrink-0`}>
                                    <iframe src={getEmbedUrl(questionFileUrl)} className="absolute inset-0 w-full h-full border-0 bg-white" allow="autoplay" allowFullScreen></iframe>
                                </div>
                            )}
                            {questionText && !questionHtml && (
                                <div className={`w-full relative bg-white dark:bg-gray-800 flex flex-col flex-grow h-full`}>
                                    <textarea 
                                        className={`absolute inset-0 w-full h-full p-4 resize-none outline-none custom-scrollbar text-sm leading-relaxed ${isShared || isTask ? 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300' : 'bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-inset focus:ring-black dark:focus:ring-white'}`}
                                        style={{ whiteSpace: 'pre-wrap' }}
                                        value={questionText}
                                        onChange={e => setQuestionText(e.target.value)}
                                        readOnly={isShared || isTask}
                                        placeholder={isShared || isTask ? "沒有提供試題文字" : "在此輸入或貼上試題純文字..."}
                                        onFocus={handleFocusScroll}
                                    ></textarea>
                                </div>
                            )}
                            {questionHtml && (
                                <div className={`w-full relative bg-white dark:bg-gray-800 flex flex-col flex-grow h-full`}>
                                    {!(isShared || isTask) ? (
                                        <ContentEditableEditor 
                                            value={processQuestionContent(questionHtml, true)} 
                                            onChange={(html) => setQuestionHtml(stripQuestionMarkers(html))} 
                                            placeholder="在此輸入或貼上富文本試題內容..."
                                            wrapperClassName="absolute inset-0 w-full h-full flex flex-col"
                                            editorClassName="w-full h-full p-4 outline-none focus:ring-2 focus:ring-inset focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 text-black dark:text-white text-sm custom-scrollbar overflow-y-auto leading-relaxed"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 w-full h-full p-4 custom-scrollbar bg-gray-50 dark:bg-gray-900 text-black dark:text-white overflow-y-auto">
                                            <style dangerouslySetInnerHTML={{__html: `
                                                .preview-rich-text { 
    word-break: break-word; 
    white-space: pre-wrap; 
    font-size: 0.95rem; 
    line-height: 1.6; 
    color: #1a1a1a !important;
}
.dark .preview-rich-text { 
    color: #f3f4f6 !important; 
}
.preview-rich-text * {
    color: inherit !important;
    background-color: transparent !important;
}
                                            `}} />
                                            <div 
                                                className="preview-rich-text"
                                                dangerouslySetInnerHTML={{ __html: processQuestionContent(questionHtml, true) }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(questionFileUrl || questionText || questionHtml) && previewOpen && (
                    <div 
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        className={`${layoutMode === 'horizontal' ? 'w-4 h-full cursor-col-resize flex-col' : 'h-4 w-full cursor-row-resize flex-row'} bg-gray-100 dark:bg-gray-900 hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center shrink-0 z-40 transition-colors active:bg-blue-300`}
                    >
                        <div className={`${layoutMode === 'horizontal' ? 'w-1 h-8' : 'h-1 w-8'} bg-gray-400 dark:bg-gray-600 rounded-full`}></div>
                    </div>
                )}

                <div className={`flex-grow flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm no-round overflow-hidden transition-colors`}>
                    <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-colors">
                        <div className="flex items-center space-x-3 flex-wrap">
                            <span className="font-bold text-xs text-gray-600 dark:text-gray-300 flex items-center whitespace-nowrap">
                                <span className="text-sm mr-1">📝</span> 批改結果：
                                <span className={`text-xl ml-2 font-black ${results.score >= 60 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{results.score} 分</span>
                                <span className="text-xs font-normal text-gray-500 ml-2 mt-1 mr-2">(答對 {results.correctCount}/{results.total} 題)</span>
                            </span>
                            {/* ✨ 修改：重新算分按鈕改為常駐顯示，點擊後觸發比對與提示 */}
                            <button 
                                onClick={() => handleManualRegrade(false)} 
                                className="bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 px-3 py-1 text-xs font-bold no-round shadow-sm transition-colors active:scale-95 flex items-center gap-1"
                                disabled={isRegrading}
                            >
                                {isRegrading ? <div className="w-3 h-3 border-2 border-blue-400 border-t-blue-800 rounded-full animate-spin"></div> : '🔄'}
                                重新算分
                            </button>
                        </div>
                        
                        {canSeeAnswers && (
                            <div className="flex items-center space-x-4 text-xs shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                                <label className="flex items-center space-x-1.5 cursor-pointer hover:text-black dark:hover:text-white dark:text-gray-300">
                                    <input type="checkbox" checked={showOnlyWrong} onChange={e => setShowOnlyWrong(e.target.checked)} className="w-3.5 h-3.5 accent-black dark:accent-white" />
                                    <span className="font-bold">只看錯題</span>
                                </label>
                                <label className="flex items-center space-x-1.5 cursor-pointer hover:text-black dark:hover:text-white dark:text-gray-300">
                                    <input type="checkbox" checked={showOnlyStarred} onChange={e => setShowOnlyStarred(e.target.checked)} className="w-3.5 h-3.5 accent-black dark:accent-white" />
                                    <span className="font-bold text-orange-600 dark:text-orange-400">只看星號</span>
                                </label>
                                {isTask && initialRecord.taskId && (
                                    <label className="flex items-center space-x-1.5 cursor-pointer hover:text-black dark:hover:text-white dark:text-gray-300 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-gray-300 dark:border-gray-600">
                                        <input type="checkbox" checked={showDiscussion} onChange={e => setShowDiscussion(e.target.checked)} className="w-3.5 h-3.5 accent-black dark:accent-white" />
                                        <span className="font-bold text-blue-600 dark:text-blue-400">開啟討論區</span>
                                    </label>
                                )}
                            </div>
                        )}
                    </div>

                    {isTask && taskScores && (
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-gray-900 shrink-0">
                            <h3 className="font-bold text-xs text-blue-600 dark:text-blue-400 mb-2">📊 其他挑戰者成績 (匿名)</h3>
                            <div className="flex flex-wrap gap-2">
                                {taskScores.length > 0 ? taskScores.map((s, i) => (
                                    <span key={i} className={`px-1.5 py-0.5 text-xs font-bold border rounded ${s >= 60 ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700' : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700'}`}>{s} 分</span>
                                )) : <span className="text-xs text-gray-500">尚無其他挑戰者成績</span>}
                            </div>
                        </div>
                    )}

                    {!canSeeAnswers ? (
                        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-900 custom-scrollbar">
                            <span className="text-5xl mb-4 block">🔒</span>
                            <h3 className="font-black text-xl text-gray-700 dark:text-gray-300 mb-2">答案未公開</h3>
                            <p className="text-gray-500 dark:text-gray-400 font-bold max-w-sm">出題者已將此試卷的標準答案隱藏。<br/>您的分數已記錄成功，您可以前往討論區與大家交流！</p>
                        </div>
                    ) : (
                        <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 sm:p-6 custom-scrollbar bg-white dark:bg-gray-800 transition-colors">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px 16px' }}>
                                {results.data.filter(item => {
                                    if (showOnlyWrong && item.isCorrect) return false;
                                    if (showOnlyStarred && !item.isStarred) return false;
                                    return true;
                                }).map((item, i) => (
                                   <div 
                                        key={i} 
                                        onClick={() => {
                                            scrollToQuestion(item.number); // ✨ 新增：點擊卡片時同時讓左側題目跳轉
                                            if (isTask && initialRecord.taskId) {
                                                setCommentQNum(item.number.toString());
                                                setShowDiscussion(true);
                                                setTimeout(() => {
                                                    discussionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }, 100);
                                            }
                                        }}
                                        className={`break-avoid flex flex-col justify-between p-3 border border-gray-100 dark:border-gray-700 no-round transition-colors ${item.isCorrect ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'} cursor-pointer hover:opacity-80 hover:ring-2 ring-blue-400`}
                                        title="點擊跳轉至此題題目與討論"
                                    >
                                        <div className="flex justify-between items-center w-full mb-2 border-b border-gray-200 dark:border-gray-600 pb-2">
                                            <div className="flex items-center space-x-3 shrink-0">
                                                <div className="flex items-center justify-center w-8">
                                                    {item.isStarred && <span className="text-orange-500 text-xs mr-1">★</span>}
                                                    <span className={`font-mono text-lg font-bold hover:underline ${item.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{item.number}.</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end space-y-1">
                                                <div className="flex items-center space-x-2 text-sm">
                                                    <span className="text-gray-500 dark:text-gray-400 text-xs font-bold">你的答案</span>
                                                    <span className={`font-black text-base w-6 text-center ${item.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{item.userAns}</span>
                                                </div>
                                                <div className="flex items-center space-x-2 text-sm">
                                                    <span className="text-gray-500 dark:text-gray-400 text-xs font-bold">正確答案</span>
                                                    <span className="font-black text-base w-6 text-center text-black dark:text-white">{item.correctAns}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end w-full gap-2">
                                            {explanationHtml && extractSpecificExplanation(explanationHtml, item.number) && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setExplanationModalItem({ number: item.number, content: extractSpecificExplanation(explanationHtml, item.number) }); }} 
                                                    className="text-[10px] sm:text-xs bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 px-3 py-1.5 font-bold no-round border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
                                                >
                                                    💡 查看詳解
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleAddToWrongBook(item); }} 
                                                className="text-[10px] sm:text-xs bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 px-3 py-1.5 font-bold no-round border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
                                            >
                                                📓 收錄錯題
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {isTask && initialRecord.taskId && showDiscussion && (
                        <div ref={discussionRef} className="h-[350px] flex flex-col border-t-4 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-all">
                            <div className="bg-gray-100 dark:bg-gray-900 p-2 px-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
                                <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">💬 任務討論區 (限傳圖 & 5MB)</h3>
                                <button onClick={() => setShowDiscussion(false)} className="text-gray-500 hover:text-red-500 font-bold">✖ 關閉</button>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50 dark:bg-gray-800">
                                {discussions.length === 0 ? (
                                    <p className="text-gray-400 text-center text-sm mt-4 font-bold">還沒有人留言，來搶頭香吧！</p>
                                ) : (
                                    discussions.map(msg => (
                                        <div key={msg.id} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-3 no-round shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-bold text-sm text-blue-600 dark:text-blue-400">{msg.userName}</span>
                                                    <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 no-round border border-gray-200 dark:border-gray-500">
                                                        {msg.questionNum === '0' ? '綜合討論' : `針對 第 ${msg.questionNum} 題`}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-bold">
                                                    {msg.timestamp ? msg.timestamp.toDate().toLocaleString('zh-TW') : ''}
                                                </span>
                                            </div>
                                            {msg.text && <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap font-bold">{msg.text}</p>}
                                            {msg.imageUrl && (
                                                <img src={msg.imageUrl} alt="留言附圖" className="mt-2 max-w-[200px] max-h-[200px] object-contain border border-gray-200 dark:border-gray-600" />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shrink-0">
                                <div className="flex space-x-2 mb-2">
                                    <select 
                                        value={commentQNum} 
                                        onChange={e => {
                                            setCommentQNum(e.target.value);
                                            if (e.target.value !== "0") scrollToQuestion(e.target.value); // ✨ 新增：選擇題號時同步跳轉左側題目
                                        }}
                                        className="p-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm no-round outline-none font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <option value="0">綜合討論</option>
                                        {Array.from({ length: numQuestions }, (_, i) => (
                                            <option key={i+1} value={i+1}>針對第 {i+1} 題</option>
                                        ))}
                                    </select>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        id="commentFile"
                                        className="hidden"
                                        onChange={e => setCommentFile(e.target.files[0])}
                                    />
                                    <label 
                                        htmlFor="commentFile" 
                                        className="flex items-center justify-center px-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-bold transition-colors"
                                        title="支援上傳圖片 (大小不超過 5MB)"
                                    >
                                        {commentFile ? '🖼️ 已選圖片' : '📎 附加圖片'}
                                    </label>
                                </div>
                                <div className="flex space-x-2">
                                    <textarea 
                                        className="flex-grow p-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm no-round outline-none resize-none h-10 custom-scrollbar font-bold"
                                        placeholder="輸入留言內容..."
                                        value={commentInput}
                                        onChange={e => setCommentInput(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleUploadComment} 
                                        disabled={isSubmittingComment}
                                        className="bg-black dark:bg-gray-200 text-white dark:text-black px-4 py-2 font-black no-round hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors whitespace-nowrap"
                                    >
                                        {isSubmittingComment ? '傳送中' : '送出留言'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {showShareScoreModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-sm no-round shadow-xl">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">🏆 選擇要炫耀並分享的好友</h3>
                        <div className="max-h-60 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700 custom-scrollbar">
                            {(userProfile.friends || []).length === 0 ? <p className="p-4 text-sm text-gray-400">目前還沒有好友喔</p> : null}
                            {(userProfile.friends || []).map(f => (
                                <button key={f.uid} onClick={() => shareScoreToFriend(f)} className="w-full text-left p-3 hover:bg-yellow-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 font-bold text-sm transition-colors dark:text-white">
                                    {f.name} <span className="text-gray-400 dark:text-gray-400 font-normal ml-2">{f.email}</span>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowShareScoreModal(false)} className="w-full bg-gray-100 dark:bg-gray-700 text-black dark:text-white p-2 font-bold no-round hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
                    </div>
                </div>
            )}
            
            {/* 新增：錯題收錄 Modal */}
            {/* 新增：詳解 Modal */}
            {explanationModalItem && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4" onClick={() => setExplanationModalItem(null)}>
                    <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-2xl no-round shadow-2xl transform transition-all max-h-[90dvh] overflow-y-auto custom-scrollbar border-t-4 border-green-500" onClick={e => e.stopPropagation()}>
                        <h3 className="font-black text-xl mb-4 flex justify-between items-center dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                            <span className="text-green-600 dark:text-green-400">💡 第 {explanationModalItem.number} 題 詳解</span>
                            <button onClick={() => setExplanationModalItem(null)} className="text-gray-400 hover:text-red-500 font-bold transition-colors">✖</button>
                        </h3>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {explanationModalItem.content}
                        </div>
                        <div className="flex justify-end mt-6">
                            <button onClick={() => setExplanationModalItem(null)} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-6 py-2 no-round font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm">關閉</button>
                        </div>
                    </div>
                </div>
            )}
            {/* ✨ 新增：重新算分時的光速載入 Modal */}
            {isRegrading && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[200] p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 w-full max-w-sm no-round shadow-2xl text-center border-t-8 border-blue-500">
                        <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black mb-2 dark:text-white">🔄 正在光速重新算分...</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">正在比對最新解答與同步錯題本，請稍候</p>
                    </div>
                </div>
            )}
            
            {/* ✨ 新增：同步進度條 Modal */}
            {syncStatus.isSyncing && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[200] p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 w-full max-w-sm no-round shadow-2xl text-center border-t-8 border-blue-600">
                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-xl font-black mb-2 dark:text-white">🚀 正在同步資料...</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 font-bold">正在為您的好友更新最新版本，請勿關閉視窗</p>
                        
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-4 no-round overflow-hidden mb-2">
                            <div 
                                className="bg-blue-600 h-full transition-all duration-300 ease-out"
                                style={{ width: `${(syncStatus.current / syncStatus.total) * 100}%` }}
                            ></div>
                        </div>
                        <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            完成進度：{syncStatus.current} / {syncStatus.total} ({Math.round((syncStatus.current / syncStatus.total) * 100)}%)
                        </div>
                    </div>
                </div>
            )}
            {/* 新增：錯題收錄 Modal */}
            {wrongBookAddingItem && (
                <WrongBookModal
                    title={`收錄第 ${wrongBookAddingItem.number} 題`}
                    // ✨ 修改：帶入剛剛自動擷取的該題純文字與使用者的資料夾列表
                    initialData={{ qText: wrongBookAddingItem.extractedQText || '', nText: '', userFolders: Array.from(new Set(userProfile.folders || ['未分類'])) }}
                    onClose={() => setWrongBookAddingItem(null)}
                    onSave={async (data) => {
                        try {
                            await window.db.collection('users').doc(currentUser.uid).collection('wrongBook').add({
                                quizId: quizId,
                                folder: data.folder || '未分類',
                                quizName: cleanQuizName(testName),
                                questionNum: wrongBookAddingItem.number,
                                userAns: wrongBookAddingItem.userAns || '未填寫',
                                correctAns: wrongBookAddingItem.correctAns,
                                qText: data.qText,
                                qImage: data.qImage,
                                nText: data.nText,
                                nImage: data.nImage,
                                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                            });
                            // 如果是新資料夾，加到使用者資料夾清單
                            if (data.folder && !userProfile.wrongBookFolders?.includes(data.folder)) {
                                await window.db.collection('users').doc(currentUser.uid).set({
                                    wrongBookFolders: window.firebase.firestore.FieldValue.arrayUnion(data.folder)
                                }, { merge: true });
                            }
                            showAlert(`✅ 第 ${wrongBookAddingItem.number} 題已成功收錄至「錯題整理」！`);
                            setWrongBookAddingItem(null);
                        } catch(e) {
                            showAlert("收錄失敗：" + e.message);
                        }
                    }}
                    showAlert={showAlert}
                />
            )}
        </div>
    );
}

function FastQASection({ user, showAlert, showConfirm, targetQaId, onClose, onRequireLogin }) {
    const { useState, useEffect } = React;
    const [qaList, setQaList] = useState([]);
    const [records, setRecords] = useState({});
    const [loading, setLoading] = useState(true);
    const [qaLimit, setQaLimit] = useState(30); // ✨ 新增：快問快答動態載入數量的狀態
    const [refreshTrigger, setRefreshTrigger] = useState(0); // ✨ 新增：重新整理觸發器
    const [isRefreshing, setIsRefreshing] = useState(false); // ✨ 新增：靜默重整狀態
   const [jumpingQaId, setJumpingQaId] = useState(null); // ✨ 新增：進入題目的載入狀態
    const [showAdminMode, setShowAdminMode] = useState(false);
    const [isEditExpanded, setIsEditExpanded] = useState(false);
    
    // --- 新增自動背景重新整理 (快問快答)，每 3 秒同步一次 ---
    useEffect(() => {
        if (targetQaId) return; // 單題模式不輪詢
        const timer = setInterval(() => {
            if (!isRefreshing) {
                window.db.collection('fastQA').orderBy('createdAt', 'desc').limit(qaLimit).get({ source: 'server' })
                    .then(() => setRefreshTrigger(prev => prev + 1))
                    .catch(e => console.log('背景同步略過', e));
            }
        }, 3000);
        return () => clearInterval(timer);
    }, [isRefreshing, targetQaId, qaLimit]);

    const isAdmin = user && user.email === 'jay03wn@gmail.com';
    
    // 管理員表單狀態 (升級自訂功能)
    const [qaType, setQaType] = useState('mcq'); // 'mcq' 或 'tf'
    const [subjectMode, setSubjectMode] = useState('藥物分析');
    const [subject, setSubject] = useState('藥物分析');
    const [difficultyMode, setDifficultyMode] = useState('1');
    const [customDifficulty, setCustomDifficulty] = useState('1');
    const [rewardMode, setRewardMode] = useState('10');
    const [customReward, setCustomReward] = useState(10);
    const [timePreset, setTimePreset] = useState('permanent'); // ✨ 新增：時間預設選單狀態
    const [endTimeStr, setEndTimeStr] = useState('');
    const [question, setQuestion] = useState('');

    // ✨ 新增：處理時間預設變化 (自動轉換為台灣/本地時間格式)
    useEffect(() => {
        if (timePreset === 'custom' || timePreset === 'permanent') {
            if (timePreset === 'permanent') setEndTimeStr('');
            return;
        }

        const now = new Date();
        let targetDate;

        if (timePreset === 'today') {
            targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        } else if (timePreset === '24h') {
            targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        } else if (timePreset === '48h') {
            targetDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        } else if (timePreset === '1w') {
            targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        if (targetDate) {
            // 自動補零，組合成本地時間字串 (YYYY-MM-DDThh:mm)
            const pad = (n) => n.toString().padStart(2, '0');
            const localStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth()+1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`;
            setEndTimeStr(localStr);
        }
    }, [timePreset]);
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAns, setCorrectAns] = useState(0);
    const [explanation, setExplanation] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    
    // 作答狀態
    const [activeQA, setActiveQA] = useState(null);
    const [selectedAns, setSelectedAns] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [showShareModal, setShowShareModal] = useState(false);
    const [shareContent, setShareContent] = useState('');

    useEffect(() => {
        let unsubQA = () => {};
        let unsubRecords = () => {};

        const fetchQA = () => {
            setLoading(true);
            try {
                if (targetQaId) {
                    unsubQA = window.db.collection('fastQA').doc(targetQaId).onSnapshot(docSnap => {
                        if (docSnap.exists) setActiveQA({ id: docSnap.id, ...docSnap.data() });
                        else showAlert('找不到此題目，可能已過期或被刪除！');
                        setLoading(false);
                    });
                } else {
                    unsubQA = window.db.collection('fastQA').orderBy('createdAt', 'desc').limit(qaLimit).onSnapshot(snapshot => {
                        const qas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        const now = new Date().getTime();
                        const validQas = isAdmin ? qas : qas.filter(q => !q.endTime || q.endTime > now);
                        setQaList(validQas);
                        
                        setActiveQA(prev => {
                            if (prev) return validQas.find(q => q.id === prev.id) || prev;
                            return prev;
                        });
                        setLoading(false);
                    });
                }

                if (user) {
                    unsubRecords = window.db.collection('users').doc(user.uid).collection('fastQARecords').onSnapshot(recSnap => {
                        const recs = {};
                        recSnap.docs.forEach(doc => { recs[doc.id] = doc.data(); });
                        setRecords(recs);
                        if (targetQaId && recs[targetQaId]) setShowResult(true);
                    });
                }
            } catch (e) {
                showAlert('讀取失敗：' + e.message);
                setLoading(false);
            }
        };
        fetchQA();
        return () => { unsubQA(); unsubRecords(); };
    }, [user, isAdmin, targetQaId, qaLimit, refreshTrigger]); // ✨ 依賴項補上 refreshTrigger

    const handleAddQA = async () => {
        if (!question || !explanation || customReward < 1) return showAlert('請填寫完整題目、詳解，並確保鑽石大於0！');
        
        let finalOptions = options;
        if (qaType === 'tf') finalOptions = ['⭕ 是 (True)', '❌ 否 (False)'];
        if (qaType === 'mcq' && finalOptions.some(o => !o.trim())) return showAlert('選擇題請填寫完整的4個選項！');

        setIsPublishing(true);
        try {
            const endTimestamp = endTimeStr ? new Date(endTimeStr).getTime() : null;
            await window.db.collection('fastQA').add({
                qaType,
                subject,
                difficulty: customDifficulty,
                reward: Number(customReward),
                endTime: endTimestamp,
                question,
                options: finalOptions,
                correctAns,
                explanation,
                totalAnswers: 0,
                answersCount: qaType === 'tf' ? { '0': 0, '1': 0 } : { '0': 0, '1': 0, '2': 0, '3': 0 },
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showAlert('✅ 快問快答新增成功！');
            setIsEditExpanded(false);
            setQuestion(''); setOptions(['', '', '', '']); setExplanation('');
        } catch (e) {
            showAlert('新增失敗：' + e.message);
        }
        setIsPublishing(false);
    };

    const handleDeleteQA = (id) => {
        showConfirm('確定要刪除這題嗎？', async () => {
            await window.db.collection('fastQA').doc(id).delete();
            if(activeQA && activeQA.id === id) setActiveQA(null);
        });
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/?qaId=${activeQA.id}`;
        const plainQ = activeQA.question.replace(/<img[^>]*>/gi, '(圖片)').replace(/<[^>]+>/g, '').trim();
        const shortQ = plainQ.length > 25 ? plainQ.substring(0, 25) + '...' : plainQ;
        const text = `⚡ 快問快答挑戰！\n【${activeQA.subject}】${activeQA.difficulty}\n🎁 獎勵：${activeQA.reward} 鑽石\n\n📝 ${shortQ}\n\n👇 點此連結立即挑戰 👇\n${shareUrl}`;
        setShareContent(text);
        setShowShareModal(true); 
    };

    const handleSubmitAns = async () => {
        if (selectedAns === null) return showAlert('請選擇一個答案！');
        if (!user) return setShowResult(true);
        
        // 快速檢查：如果本地紀錄已經有作答過，直接跳開不處理
        if (records[activeQA.id]) return showAlert('⚠️ 您已經作答過此題！');

        setSubmitting(true);
        const isCorrect = selectedAns === activeQA.correctAns;
        const rewardAmount = Number(activeQA.reward) || 10;
        
        try {
            // ✨ 提速優化 1：不要等資料庫！立刻切換到結果畫面，讓使用者感覺「秒開」
            setShowResult(true);

            const recRef = window.db.collection('users').doc(user.uid).collection('fastQARecords').doc(activeQA.id);
            const qaRef = window.db.collection('fastQA').doc(activeQA.id);

            // ✨ 提速優化 2：並行處理 (Promise.all) 與 原子運算 (increment)
            // 這樣就不需要「先讀取再寫入」，資料庫會直接在雲端幫你「+1」，速度提升 300%
            const tasks = [
                // 1. 寫入作答紀錄
                recRef.set({ 
                    isCorrect, 
                    selectedAns, 
                    answeredAt: window.firebase.firestore.FieldValue.serverTimestamp() 
                }),
                // 2. 直接在雲端更新統計數字 (不再執行 slow 的 get() 操作)
                qaRef.update({
                    totalAnswers: window.firebase.firestore.FieldValue.increment(1),
                    [`answersCount.${selectedAns}`]: window.firebase.firestore.FieldValue.increment(1)
                })
            ];

            // 3. 如果答對，同時發送獎勵
            if (isCorrect) {
                tasks.push(window.db.collection('users').doc(user.uid).set({
                    mcData: { diamonds: window.firebase.firestore.FieldValue.increment(rewardAmount) }
                }, { merge: true }));
            }

            // 讓這些任務在背景跑，不卡住 UI 執行
            Promise.all(tasks).catch(e => console.error("背景存檔同步中...", e));

            // ✨ 提速優化 3：立刻顯示結果彈窗
            if (isCorrect) {
                showAlert(`🎉 答對了！恭喜獲得 ${rewardAmount} 💎 鑽石！`);
            } else {
                showAlert('❌ 答錯了，請看詳解！');
            }

        } catch (e) {
            console.error(e);
            showAlert('提交失敗：' + e.message);
        }
        setSubmitting(false);
    };

    if (loading) return (
        <div className="mb-8 p-12 text-center border-2 border-pink-400 bg-pink-50 shadow-md">
            <div className="text-4xl mb-4 animate-spin inline-block">⏳</div>
            <div className="text-lg font-bold text-pink-600">快問快答讀取中...</div>
        </div>
    );

    return (
        <div className={`border-2 border-pink-400 bg-pink-50 dark:bg-pink-900/20 p-4 shadow-md relative no-round w-full ${targetQaId ? 'm-0' : 'mb-8 shrink-0'}`}>
            <div className="flex justify-between items-center mb-4 border-b border-pink-200 dark:border-pink-800 pb-2">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-pink-600 dark:text-pink-400 flex items-center">⚡ 快問快答挑戰</h2>
                    {!targetQaId && (
                        <button 
                            onClick={() => { 
                                setIsRefreshing(true); 
                                // ✨ 靜默背景同步，列表不消失，只轉小圈圈
                                window.db.collection('fastQA').orderBy('createdAt', 'desc').limit(qaLimit).get({ source: 'server' })
                                    .then(() => setRefreshTrigger(prev => prev + 1))
                                    .catch(e => console.error(e))
                                    .finally(() => setIsRefreshing(false));
                            }} 
                            disabled={isRefreshing}
                            className="text-xs bg-white hover:bg-pink-50 text-pink-600 border border-pink-200 px-2 py-1 font-bold transition-colors shadow-sm flex items-center gap-1 no-round disabled:opacity-50"
                            title="手動同步雲端最新題目"
                        >
                            {isRefreshing ? <div className="w-3 h-3 border-2 border-pink-400 border-t-pink-600 rounded-full animate-spin"></div> : '🔄'} 重新整理
                        </button>
                    )}
                </div>
                {isAdmin && !targetQaId && (
                    <button onClick={() => setShowAdminMode(!showAdminMode)} className="bg-pink-600 text-white text-xs px-3 py-1 font-bold no-round hover:bg-pink-700">
                        {showAdminMode ? '關閉管理' : '管理試題'}
                    </button>
                )}
            </div>

            {isAdmin && showAdminMode && !targetQaId && (
                <div className="mb-6 border-2 border-pink-300 no-round bg-white dark:bg-gray-800">
                    <button onClick={() => setIsEditExpanded(!isEditExpanded)} className="w-full flex justify-between p-4 bg-pink-100 hover:bg-pink-200 font-bold text-pink-700">
                        <span>✏️ 新增快問快答 (自訂升級版)</span><span>{isEditExpanded ? '▼' : '▲'}</span>
                    </button>
                    {isEditExpanded && (
                        <div className="p-4 border-t border-pink-200 dark:text-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div className="md:col-span-2 flex gap-4 bg-gray-100 p-2 dark:bg-gray-700">
                                    <label className="font-bold flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={qaType==='mcq'} onChange={()=>setQaType('mcq')} className="w-4 h-4" /> 選擇題
                                    </label>
                                    <label className="font-bold flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={qaType==='tf'} onChange={()=>setQaType('tf')} className="w-4 h-4" /> 是非題
                                    </label>
                                </div>
                               <div>
                                    <label className="block text-sm font-bold mb-1">科目</label>
                                    <select value={subjectMode} onChange={e => { setSubjectMode(e.target.value); if(e.target.value !== 'custom') setSubject(e.target.value); else setSubject(''); }} className="w-full border p-2 mb-2 dark:bg-gray-800">
                                        {['藥物分析', '生藥', '中藥', '藥理', '藥化', '藥劑', '生物藥劑'].map(s => <option key={s} value={s}>{s}</option>)}
                                        <option value="custom">[自訂]</option>
                                    </select>
                                    {subjectMode === 'custom' && <input type="text" value={subject} onChange={e=>setSubject(e.target.value)} className="w-full border p-2 dark:bg-gray-800" placeholder="請輸入自訂科目" />}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">難度標籤</label>
                                    <select value={difficultyMode} onChange={e => { setDifficultyMode(e.target.value); if(e.target.value !== 'custom') setCustomDifficulty(e.target.value); else setCustomDifficulty(''); }} className="w-full border p-2 mb-2 dark:bg-gray-800">
                                        {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}★</option>)}
                                        <option value="custom">[自訂]</option>
                                    </select>
                                    {difficultyMode === 'custom' && <input type="text" value={customDifficulty} onChange={e=>setCustomDifficulty(e.target.value)} className="w-full border p-2 dark:bg-gray-800" placeholder="請輸入自訂難度" />}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">獎勵鑽石數量</label>
                                    <select value={rewardMode} onChange={e => { setRewardMode(e.target.value); if(e.target.value !== 'custom') setCustomReward(Number(e.target.value)); else setCustomReward(''); }} className="w-full border p-2 mb-2 dark:bg-gray-800">
                                        {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(n => <option key={n} value={n}>{n} 鑽石</option>)}
                                        <option value="custom">[自訂]</option>
                                    </select>
                                    {rewardMode === 'custom' && <input type="number" min="1" value={customReward} onChange={e=>setCustomReward(e.target.value)} className="w-full border p-2 dark:bg-gray-800" placeholder="請輸入鑽石數量" />}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">結束時間</label>
                                    <select value={timePreset} onChange={e => {
                                        setTimePreset(e.target.value);
                                        // 切換到自訂時，若原本為空，自動填入當前時間，方便微調
                                        if (e.target.value === 'custom' && !endTimeStr) {
                                            const now = new Date();
                                            const pad = (n) => n.toString().padStart(2, '0');
                                            setEndTimeStr(`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
                                        }
                                    }} className="w-full border p-2 mb-2 dark:bg-gray-800 font-bold">
                                        <option value="permanent">♾️ 永久公開</option>
                                        <option value="today">📅 到今天結束 (23:59)</option>
                                        <option value="24h">⌛ 24 小時後</option>
                                        <option value="48h">⌛ 48 小時後</option>
                                        <option value="1w">🗓️ 一週後 (168小時)</option>
                                        <option value="custom">⚙️ 自訂時間</option>
                                    </select>
                                    {timePreset === 'custom' && (
                                        <input type="datetime-local" value={endTimeStr} onChange={e=>setEndTimeStr(e.target.value)} className="w-full border p-2 dark:bg-gray-800" />
                                    )}
                                </div>
                                <div className="md:col-span-2"><label className="block text-sm font-bold mb-1">題目內容 (支援貼上圖片)</label><ContentEditableEditor value={question} onChange={setQuestion} placeholder="在此輸入..." showAlert={showAlert} /></div>
                                
                                {qaType === 'mcq' ? options.map((opt, idx) => (
                                    <div key={idx} className="md:col-span-2 flex items-center gap-2">
                                        <input type="radio" checked={correctAns===idx} onChange={()=>setCorrectAns(idx)} className="w-5 h-5 accent-pink-600" />
                                        <span className="font-bold text-sm shrink-0">設為解答</span>
                                        <input type="text" placeholder={`選項 ${idx+1}`} value={opt} onChange={e=>{const newO=[...options]; newO[idx]=e.target.value; setOptions(newO);}} className="flex-1 border p-2 dark:bg-gray-800" />
                                    </div>
                                )) : (
                                    <div className="md:col-span-2 flex gap-6 mt-2">
                                        <label className="font-bold flex items-center gap-2 cursor-pointer"><input type="radio" checked={correctAns===0} onChange={()=>setCorrectAns(0)} className="w-5 h-5 accent-pink-600" /> 正確答案是「⭕ 是」</label>
                                        <label className="font-bold flex items-center gap-2 cursor-pointer"><input type="radio" checked={correctAns===1} onChange={()=>setCorrectAns(1)} className="w-5 h-5 accent-pink-600" /> 正確答案是「❌ 否」</label>
                                    </div>
                                )}
                                <div className="md:col-span-2"><label className="block text-sm font-bold mb-1">詳解</label><textarea value={explanation} onChange={e=>setExplanation(e.target.value)} className="w-full border p-2 h-24 dark:bg-gray-800" placeholder="請輸入詳解..."></textarea></div>
                            </div>
                            <button onClick={handleAddQA} disabled={isPublishing} className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 w-full disabled:bg-gray-400">🚀 發布快問快答</button>
                        </div>
                    )}
                </div>
            )}

           {!activeQA ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* ✨ 非同步載入狀態 */}
                        {loading ? (
                            <div className="col-span-full py-12 text-center bg-white/50 border border-pink-200">
                                <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-3"></div>
                                <div className="text-pink-600 font-bold animate-pulse">試題讀取中...</div>
                            </div>
                        ) : qaList.length === 0 ? (
                            <div className="text-pink-500 font-bold col-span-full text-center py-6">目前沒有開放的快問快答，請晚點再來！</div> 
                        ) : (
                            qaList.map(qa => {
                                const rec = records[qa.id];
                                return (
                                    <div key={qa.id} className="bg-white dark:bg-gray-800 p-4 border border-pink-200 flex flex-col no-round shadow-sm hover:shadow-md">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="bg-pink-100 text-pink-800 text-xs px-2 py-1 font-bold no-round">{qa.subject}</span>
                                            <span className="text-pink-600 font-bold text-sm">💎 {qa.reward} 鑽</span>
                                        </div>
                                        <p className="text-sm dark:text-white mb-4 flex-1 line-clamp-3 font-medium">{qa.question.replace(/<img[^>]*>/gi, '(圖片)').replace(/<[^>]+>/g, '').trim()}</p>
                                        <div className="flex items-center justify-between pt-3 border-t">
                                            <span className={`font-bold text-sm ${!user ? 'text-gray-400' : rec ? (rec.isCorrect ? 'text-green-600' : 'text-red-500') : 'text-gray-400'}`}>
                                                {!user ? '訪客未登入' : rec ? (rec.isCorrect ? '✅ 已答對' : '❌ 答錯了') : '尚未作答'}
                                            </span>
                                            <div className="flex gap-2">
                                                {isAdmin && showAdminMode && (
                                                    <>
                                                        <button onClick={() => { navigator.clipboard.writeText(qa.id); showAlert(`✅ 已複製題目ID：${qa.id}`); }} className="text-blue-500 text-xs border border-blue-500 px-1">複製ID</button>
                                                        <button onClick={() => handleDeleteQA(qa.id)} className="text-red-500 text-xs border border-red-500 px-1">刪除</button>
                                                    </>
                                                )}
                                                <button 
                                                    disabled={jumpingQaId === qa.id}
                                                   onClick={async () => { 
                                                        setJumpingQaId(qa.id);
                                                        try {
                                                            // ✨ 點擊挑戰時，強制向伺服器要這一題的最新資料 (確保絕不拿到舊題目)
                                                            const docSnap = await window.db.collection('fastQA').doc(qa.id).get({ source: 'server' });
                                                            if (docSnap.exists) {
                                                                setActiveQA({ id: docSnap.id, ...docSnap.data() });
                                                            } else {
                                                                setActiveQA(qa);
                                                            }
                                                        } catch (e) {
                                                            console.warn(e);
                                                            setActiveQA(qa);
                                                        }
                                                        setSelectedAns(null); 
                                                        setShowResult(!!rec); 
                                                        setJumpingQaId(null);
                                                    }} 
                                                    className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1.5 text-sm font-bold no-round flex items-center gap-1 disabled:opacity-70"
                                                >
                                                    {jumpingQaId === qa.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                                                    {(user && rec) ? '查看紀錄' : '立即挑戰'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    {/* ✨ 新增：快問快答的「載入更多」按鈕 (包含正確的 <> </> 包覆) */}
                    {!targetQaId && qaList.length >= qaLimit && (
                        <div className="flex justify-center mt-6">
                            <button 
                                onClick={() => setQaLimit(prev => prev + 30)} 
                                className="bg-white border-2 border-pink-300 text-pink-600 px-6 py-2 font-bold shadow-sm hover:bg-pink-50 transition-colors"
                            >
                                ⬇️ 載入更早的題目...
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-white dark:bg-gray-800 p-6 border-2 border-pink-300 no-round animate-fade-in">
                    <div className="flex justify-between mb-4">
                        {!targetQaId ? <button onClick={() => { setActiveQA(null); if(onClose) onClose(); }} className="text-gray-500 font-bold hover:text-black dark:hover:text-white">⬅ 返回列表</button> : <div></div>}
                        <button onClick={handleShare} className="text-pink-600 bg-pink-100 px-3 py-1.5 text-sm font-bold no-round">🔗 分享此題</button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-6 border-b pb-4 dark:border-gray-700">
                        <span className="bg-pink-100 text-pink-800 text-sm px-2 py-1 font-bold">{activeQA.subject}</span>
                        <span className="bg-gray-100 text-gray-800 text-sm px-2 py-1 font-bold">{activeQA.difficulty}</span>
                        <span className="text-pink-600 font-bold text-lg ml-auto">💎 {activeQA.reward} 鑽石獎勵</span>
                    </div>
                    
                    {/* 支援暗色模式：移除強制白底黑字 */}
<div className="text-lg font-bold mb-6 bg-white dark:bg-gray-800 text-black dark:text-white p-5 border border-gray-300 dark:border-gray-600 shadow-sm preview-rich-text" dangerouslySetInnerHTML={{ __html: activeQA.question }}></div>
                    
                    <div className="space-y-3 mb-6">
                        {activeQA.options.map((opt, idx) => {
                            const isSelected = (selectedAns ?? records[activeQA.id]?.selectedAns) === idx;
                            const isCorrectOpt = activeQA.correctAns === idx;
                            
                            // ✨ 統計修復：直接從各選項的真實票數加總來算分母，徹底解決 totalAnswers 舊資料壞掉的問題
                            const actualTotal = activeQA.answersCount ? Object.values(activeQA.answersCount).reduce((sum, val) => sum + (Number(val) || 0), 0) : 0;
                            const total = actualTotal > 0 ? actualTotal : (activeQA.totalAnswers || 0);
                            const count = (activeQA.answersCount && activeQA.answersCount[idx]) || 0;
                            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                            
                            let btnClass = "w-full text-left p-4 border-2 font-bold transition-all relative z-0 flex justify-between items-center ";
                            let barColor = "bg-gray-300";
                            
                            if (showResult && user) {
                                if (isCorrectOpt) { btnClass += "bg-green-100 border-green-500 text-green-800 "; barColor = "bg-green-300"; }
                                else if (isSelected) { btnClass += "bg-red-100 border-red-500 text-red-800 "; barColor = "bg-red-300"; }
                                else { btnClass += "bg-gray-50 border-gray-200 text-gray-500 opacity-80 "; }
                            } else {
                                btnClass += isSelected ? "border-pink-500 bg-pink-50 text-pink-700 " : "border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-white ";
                            }

                            return (
                                <button key={idx} disabled={showResult || submitting} onClick={() => setSelectedAns(idx)} className={btnClass}>
                                    {showResult && user && <div className={`absolute left-0 top-0 bottom-0 opacity-30 z-[-1] transition-all ${barColor}`} style={{ width: `${percent}%` }}></div>}
                                    <span><span className="mr-3 font-black">{activeQA.qaType === 'tf' ? '' : ['A','B','C','D'][idx]+'.'}</span> {opt}</span>
                                    <div className="flex gap-3">
                                        {showResult && user && <span className="text-sm font-bold opacity-80">{percent}% ({count}人)</span>}
                                        {showResult && user && isCorrectOpt && <span>✅</span>}
                                        {showResult && user && isSelected && !isCorrectOpt && <span>❌</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {!showResult ? (
                        <button onClick={handleSubmitAns} disabled={submitting} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 text-xl disabled:bg-gray-400">
                            {submitting ? '處理中，請稍候...' : '確認送出'}
                        </button>
                    ) : (
                        <div className="mt-6 animate-fade-in">
                            {user ? (
                                <>
                                    <div className="p-4 bg-white dark:bg-gray-800 border-2 border-blue-100 dark:border-blue-900 shadow-inner">
                                        <h4 className="font-black mb-2 flex justify-between items-center">
                                            <span className="text-blue-900 dark:text-blue-300">💡 解答與討論</span>
                                            {activeQA.reward > 0 && <span className="text-green-600 dark:text-green-400">🎉 獲得 {activeQA.reward} 鑽！</span>}
                                        </h4>
                                        <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap preview-rich-text">{activeQA.explanation}</div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-6 bg-gray-100 border-2 border-dashed border-gray-400 text-center"><h3 className="text-xl font-black mb-2">🔒 答案已上鎖</h3><button onClick={() => { if(onRequireLogin) onRequireLogin(); }} className="bg-black text-white px-8 py-3 font-black text-lg w-full">🚀 登入解鎖完整解答與鑽石</button></div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showShareModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"><div className="bg-white p-5 w-full max-w-xs border-2 border-pink-400"><h3 className="font-black text-pink-600 mb-3 flex justify-between"><span>🔗 分享此題</span><button onClick={() => setShowShareModal(false)}>✕</button></h3>
                <textarea readOnly value={shareContent} className="w-full h-36 p-3 text-sm border-2 border-gray-200 mb-4 outline-none resize-none bg-white text-black" onClick={e => e.target.select()} /><button onClick={() => { navigator.clipboard.writeText(shareContent); showAlert('✅ 已複製！'); setShowShareModal(false); }} className="w-full bg-pink-500 text-white font-bold py-2.5 text-sm mb-2">📋 複製文本</button></div></div>
            )}
        </div>
    );
}
