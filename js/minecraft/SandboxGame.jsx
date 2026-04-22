const { useState, useEffect, useRef } = React;;


  function SandboxGame({ user, userProfile, mcData, updateMcData, showAlert, onQuit }) {
    const preloadFastSound = window.preloadFastSound;
    const playCachedSound = window.playCachedSound;
    const McImg = window.McImg;
    const ROWS = 12;
    const [cols, setCols] = useState(mcData.sandbox_cols || 20);
    const TOTAL_CELLS = cols * ROWS;

    const [mapScale, setMapScale] = useState(1); 
    const mapScaleRef = useRef(mapScale); 
    const initialPinchDist = useRef(0); 
    const mapContainerRef = useRef(null); 
    
    const CATEGORIES = ['全部', '基礎與礦石', '原木與建材', '羊毛與佈置', '地獄(需解鎖)', '末地(需解鎖)', '裝飾與植物'];
    const [activeCategory, setActiveCategory] = useState('全部');

    const WOOD_TYPES = [
        { id: 'oak', name: '橡木' }, { id: 'spruce', name: '杉木' }, { id: 'birch', name: '白樺木' },
        { id: 'jungle', name: '叢林木' }, { id: 'acacia', name: '金合歡木' }, { id: 'dark_oak', name: '深色橡木' }
    ];
    
    const WOOL_COLORS = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    const WOOL_NAMES = ['白', '橙', '紫紅', '淡藍', '黃', '黃綠', '粉紅', '灰', '淡灰', '青', '紫', '藍', '棕', '綠', '紅', '黑'];

    const BLOCK_TYPES = [
        // 工具
        { id: 'erase', name: '鐵鎬 (拆除)', cat: '工具', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/iron_pickaxe.png', price: 0, special: true },
        { id: 'sign', name: '告示牌 (留言)', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/oak_sign.png', price: 10, special: true, desc: '點擊空地留言(10💎/則)' },
        { id: 'poppy', name: '送小花 (拜訪專用)', cat: '工具', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/poppy.png', price: 0, special: true, desc: '參觀時送給好友' },
        { id: 'gift_box', name: '禮物盒 (送方塊)', cat: '工具', img: 'https://i.postimg.cc/bwPx54VC/Minecraft-Chest.jpg', price: 0, special: true, desc: '打包方塊送給好友' },
        { id: 'poop', name: '惡作劇大便', cat: '工具', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/cocoa_beans.png', price: 0, special: true, desc: '在好友家拉一坨大便' },
        { id: 'photo_map', name: '私人照片', cat: '工具', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/filled_map.png', price: 50, special: true, desc: '寄送照片給好友' },

        // 基礎與礦石
        { id: 'dirt', name: '泥土', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/dirt.png', price: 1 },
        { id: 'grass_block_side', name: '草方塊', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/grass_block_side.png', price: 5 },
        { id: 'stone', name: '石頭', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/stone.png', price: 5 },
        { id: 'cobblestone', name: '鵝卵石', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/cobblestone.png', price: 2 },
        { id: 'sand', name: '沙子', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/sand.png', price: 3 },
        { id: 'gravel', name: '礫石', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/gravel.png', price: 3 },
        { id: 'stone_slab', name: '石頭半磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/stone.png', price: 2, storeStyle: { clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)' } },
        { id: 'cobblestone_stairs', name: '石磚樓梯', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/cobblestone.png', price: 5, storeStyle: { clipPath: 'polygon(0 50%, 50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%)' } },
        { id: 'iron_door', name: '鐵門', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/iron_door.png', price: 30 },
        { id: 'coal_block', name: '煤炭磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/coal_block.png', price: 20 },
        { id: 'iron_block', name: '鐵磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/iron_block.png', price: 50 },
        { id: 'gold_block', name: '金磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/gold_block.png', price: 100 },
        { id: 'lapis_block', name: '青金石磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/lapis_block.png', price: 80 },
        { id: 'emerald_block', name: '綠寶石磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/emerald_block.png', price: 300 },
        { id: 'diamond_block', name: '鑽石磚', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/diamond_block.png', price: 500 },
        { id: 'obsidian', name: '黑曜石', cat: '基礎與礦石', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/obsidian.png', price: 150 },

        ...WOOD_TYPES.flatMap(wood => [
            { id: `${wood.id}_log`, name: `${wood.name}原木`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${wood.id}_log.png`, price: 10 },
            { id: `${wood.id}_planks`, name: `${wood.name}木板`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${wood.id}_planks.png`, price: 5 },
            { id: `${wood.id}_slab`, name: `${wood.name}半磚`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${wood.id}_planks.png`, price: 2, storeStyle: { clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)' } },
            { id: `${wood.id}_stairs`, name: `${wood.name}樓梯`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${wood.id}_planks.png`, price: 5, storeStyle: { clipPath: 'polygon(0 50%, 50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%)' } },
            { id: `${wood.id}_door`, name: `${wood.name}門`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/${wood.id}_door.png`, price: 10 },
            { id: `${wood.id}_trapdoor`, name: `${wood.name}地板門`, cat: '原木與建材', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${wood.id}_trapdoor.png`, price: 10, storeStyle: { clipPath: 'polygon(0 80%, 100% 80%, 100% 100%, 0 100%)'} }
        ]),
        { id: 'chest_block', name: '儲物箱', cat: '原木與建材', img: 'https://i.postimg.cc/bwPx54VC/Minecraft-Chest.jpg', price: 20 },
        { id: 'glass', name: '玻璃', cat: '原木與建材', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/glass.png', price: 15 },
        { id: 'bricks', name: '磚塊', cat: '原木與建材', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/bricks.png', price: 20 },
        { id: 'bookshelf', name: '書架', cat: '原木與建材', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/bookshelf.png', price: 30 },
        { id: 'quartz_block', name: '石英磚', cat: '原木與建材', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/quartz_block.png', price: 40 },

        ...WOOL_COLORS.map((color, idx) => ({
            id: `${color}_wool`, name: `${WOOL_NAMES[idx]}色羊毛`, cat: '羊毛與佈置', img: `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${color}_wool.png`, price: 5
        })),

        { id: 'netherrack', name: '地獄石', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/netherrack.png', price: 10 },
        { id: 'soul_sand', name: '靈魂沙', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/soul_sand.png', price: 20 },
        { id: 'glowstone', name: '螢光石', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/glowstone.png', price: 50 },
        { id: 'magma_block', name: '岩漿塊', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/magma.png', price: 40 },
        { id: 'nether_bricks', name: '地獄磚', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/nether_bricks.png', price: 30 },
        { id: 'crimson_nylium', name: '緋紅菌絲體', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/crimson_nylium_side.png', price: 40 },
        { id: 'warped_nylium', name: '扭曲菌絲體', cat: '地獄(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/warped_nylium_side.png', price: 40 },

        { id: 'end_stone', name: '末地石', cat: '末地(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/end_stone.png', price: 50 },
        { id: 'purpur_block', name: '紫珀塊', cat: '末地(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/purpur_block.png', price: 80 },
        { id: 'end_stone_bricks', name: '末地石磚', cat: '末地(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/end_stone_bricks.png', price: 60 },
        { id: 'chorus_flower', name: '紫頌花', cat: '末地(需解鎖)', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/chorus_flower.png', price: 100 },

        { id: 'crafting_table', name: '工作台', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/crafting_table_front.png', price: 15 },
        { id: 'furnace', name: '熔爐', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/furnace_front.png', price: 20 },
        { id: 'tnt', name: 'TNT', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/tnt_side.png', price: 100 },
        { id: 'oak_leaves', name: '橡木樹葉', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/oak_leaves.png', price: 5 },
        { id: 'cactus', name: '仙人幼', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/cactus_side.png', price: 15 },
        { id: 'pumpkin', name: '南瓜', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/pumpkin_side.png', price: 20 },
        { id: 'melon_side', name: '西瓜', cat: '裝飾與植物', img: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/melon_side.png', price: 20 }
    ];

    const DIMENSIONS = {
        overworld: { id: 'overworld', name: '主世界', bg: '#87CEEB', cost: 0, requireStr: '' },
        nether: { id: 'nether', name: '地獄', bg: '#2b0000', cost: 1000, requireStr: 'unlockedNether' },
        end: { id: 'end', name: '末地', bg: '#10002b', cost: 2000, requireStr: 'unlockedEnd' }
    };

    const [isBuildMode, setIsBuildMode] = useState(false);
    const [buildLayer, setBuildLayer] = useState('foreground'); 
    const lastActionRef = useRef({ index: -1, time: 0 });
    const [isChestOpen, setIsChestOpen] = useState(false);
    const [currentDimension, setCurrentDimension] = useState('overworld');
    const [localInventory, setLocalInventory] = useState(() => mcData.inventory || { dirt: 50 });
    const [confirmDialog, setConfirmDialog] = useState(null); 
    
    // ✨ 新增收件箱狀態
    const [showInbox, setShowInbox] = useState(false);

    const [dragActiveBlock, setDragActiveBlock] = useState(null); 
    const sandboxBgmRef = useRef(null);

    const [hotbar, setHotbar] = useState(() => mcData.sandbox_hotbar || ['erase', null, null, null, null, null, null, null, null]);
    const [activeHotbarIndex, setActiveHotbarIndex] = useState(0);
    const selectedBlock = hotbar[activeHotbarIndex];

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key >= '1' && e.key <= '9') {
                setActiveHotbarIndex(parseInt(e.key) - 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const mapNode = mapContainerRef.current;
        if (!mapNode) return;

        const getDistance = (touches) => {
            if (touches.length < 2) return 0;
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const handleTouchStart = (e) => {
            if (e.touches.length === 2) {
                initialPinchDist.current = getDistance(e.touches);
                if (e.cancelable) e.preventDefault();
            }
        };

        const handleTouchMove = (e) => {
            if (e.touches.length === 2 && initialPinchDist.current > 0) {
                if (e.cancelable) e.preventDefault();
                const currentDist = getDistance(e.touches);
                const newScaleFactor = currentDist / initialPinchDist.current;
                
                let newScale = mapScaleRef.current * newScaleFactor;
                // ✨ 限制範圍在 1 ~ 3 之間
                newScale = Math.min(Math.max(newScale, 1), 3); 
                
                const gridNode = mapNode.querySelector('.grid-origin');
                if (gridNode) {
                    gridNode.style.height = `${newScale * 100}%`;
                }
                
                initialPinchDist.current = currentDist;
                mapScaleRef.current = newScale;
            }
        };

        const handleTouchEnd = (e) => {
            if (e.touches.length < 2) {
                initialPinchDist.current = 0;
                setMapScale(mapScaleRef.current);
            }
        };

        mapNode.addEventListener('touchstart', handleTouchStart, { passive: false });
        mapNode.addEventListener('touchmove', handleTouchMove, { passive: false });
        mapNode.addEventListener('touchend', handleTouchEnd);

        return () => {
            mapNode.removeEventListener('touchstart', handleTouchStart);
            mapNode.removeEventListener('touchmove', handleTouchMove);
            mapNode.removeEventListener('touchend', handleTouchEnd);
        };
    }, []); 

    useEffect(() => {
        sandboxBgmRef.current = new Audio("https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/sandbgm.mp3");
        sandboxBgmRef.current.loop = true;
        sandboxBgmRef.current.volume = 0.3;
        sandboxBgmRef.current.play().catch(e => console.log("BGM 播放阻擋", e));
        return () => { if (sandboxBgmRef.current) { sandboxBgmRef.current.pause(); sandboxBgmRef.current.currentTime = 0; } };
    }, []);

    const playChestOpenSound = () => new Audio('https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/open.mp3').play().catch(e => {});
    const playChestCloseSound = () => new Audio('https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/close.mp3').play().catch(e => {});
    const playBlockSound = (blockId, action) => {
        if (!blockId || blockId === 'erase') return;
        let soundType = 'stone';
        if (['glass', 'glowstone'].includes(blockId)) soundType = 'glass';
        else if (['dirt'].includes(blockId)) soundType = 'dirt';
        else if (['grass_block_side', 'oak_leaves', 'cactus', 'pumpkin', 'melon_side', 'crimson_nylium', 'warped_nylium', 'chorus_flower', 'poppy', 'tnt'].includes(blockId)) soundType = 'grass';
        else if (['sand', 'gravel', 'soul_sand'].includes(blockId)) soundType = 'sand';
        else if (blockId.includes('log') || blockId.includes('planks') || blockId.includes('door') || blockId.includes('wool') || ['bookshelf', 'crafting_table', 'sign', 'chest_block'].includes(blockId)) soundType = 'wood';

        const soundUrls = {
            place: { glass: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/glass_place.mp3', stone: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/stone_place_destroy.mp3', wood: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/wood_place.mp3', dirt: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/dirt_place.mp3', grass: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/grass_place.mp3', sand: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/sand_place.mp3' },
            break: { glass: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/glass_destroy.mp3', stone: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/stone_place_destroy.mp3', wood: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/wood_destroy.mp3', dirt: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/dirt_destroy.mp3', grass: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/grass_destroy.mp3', sand: 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/block/sand_destroy.mp3' }
        };
        playCachedSound(soundUrls[action][soundType]);
    };

    const padGrid = (arr, c) => arr && arr.length ? [...arr] : Array(c * ROWS).fill(null);
    const [grids, setGrids] = useState({ overworld: padGrid(mcData.sandbox_overworld, cols), nether: padGrid(mcData.sandbox_nether, cols), end: padGrid(mcData.sandbox_end, cols) });
    const [bgGrids, setBgGrids] = useState({ overworld: padGrid(mcData.sandbox_bg_overworld, cols), nether: padGrid(mcData.sandbox_bg_nether, cols), end: padGrid(mcData.sandbox_bg_end, cols) });
    const [specials, setSpecials] = useState({ overworld: mcData.specials_overworld || {}, nether: mcData.specials_nether || {}, end: mcData.specials_end || {} });
    
    const [viewingFriend, setViewingFriend] = useState(null); 
    const [friendGrids, setFriendGrids] = useState({});
    const [friendBgGrids, setFriendBgGrids] = useState({});
    const [friendSpecials, setFriendSpecials] = useState({});
    const [friendCols, setFriendCols] = useState(20);
    
    const [buyModal, setBuyModal] = useState(null);
    const [signModal, setSignModal] = useState(null);
    const [chestUi, setChestUi] = useState(null);
    const [specialBlockModal, setSpecialBlockModal] = useState(null); 
    const [visitorLogOpen, setVisitorLogOpen] = useState(false);
    
    const photoInputRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    
    const isViewingSelf = viewingFriend === null;
    const activeCols = isViewingSelf ? cols : friendCols;
    const activeGrid = isViewingSelf ? grids[currentDimension] : (friendGrids[currentDimension] || Array(activeCols*ROWS).fill(null));
    const activeBgGrid = isViewingSelf ? bgGrids[currentDimension] : (friendBgGrids[currentDimension] || Array(activeCols*ROWS).fill(null));
    const activeSpecials = isViewingSelf ? specials[currentDimension] : (friendSpecials[currentDimension] || {});

    const requestExpand = (direction) => {
        setConfirmDialog({
            title: `🌐 擴張${direction === 'left' ? '左邊' : '右邊'}領地`,
            desc: "確定要花費 200 💎 增加一整排的建築空間嗎？\n(可無限擴張，並獲得順滑捲動軸)",
            cost: 200,
            action: () => doExpand(direction)
        });
    };

    const doExpand = (dir) => {
        if (mcData.diamonds < 200) return showAlert("💎 鑽石不足，無法擴張！");
        updateMcData({ diamonds: mcData.diamonds - 200 }, true);
        
        const newCols = cols + 1;
        const expandArray = (arr) => {
            const newArr = [];
            for(let r=0; r<ROWS; r++) {
                if (dir === 'left') newArr.push(null);
                newArr.push(...(arr || Array(cols*ROWS).fill(null)).slice(r * cols, (r+1) * cols));
                if (dir === 'right') newArr.push(null);
            }
            return newArr;
        };

        const expandSpecials = (oldSpec) => {
            const newSpec = {};
            for (let oldIdx in oldSpec) {
                let r = Math.floor(oldIdx / cols);
                let c = oldIdx % cols;
                let newC = dir === 'left' ? c + 1 : c;
                newSpec[r * newCols + newC] = oldSpec[oldIdx];
            }
            return newSpec;
        };

        setGrids({ overworld: expandArray(grids.overworld), nether: expandArray(grids.nether), end: expandArray(grids.end) });
        setBgGrids({ overworld: expandArray(bgGrids.overworld), nether: expandArray(bgGrids.nether), end: expandArray(bgGrids.end) });
        setSpecials({ overworld: expandSpecials(specials.overworld), nether: expandSpecials(specials.nether), end: expandSpecials(specials.end) });
        setCols(newCols); setHasUnsavedChanges(true);
        showAlert(`🎉 擴張成功！領地變得更寬廣了！`);
    };

    const handleViewChange = async (e) => {
        const targetUid = e.target.value;
        if (targetUid === 'self') {
            setViewingFriend(null); setIsBuildMode(false); setActiveHotbarIndex(0); return;
        }
        const friend = (userProfile.friends || []).find(f => f.uid === targetUid);
        if (friend) {
            setViewingFriend(friend); setCurrentDimension('overworld');
            try {
                const doc = await window.db.collection('users').doc(targetUid).get();
                if (doc.exists) {
                    const data = doc.data().mcData || {};
                    const fCols = data.sandbox_cols || 20;
                    setFriendCols(fCols);
                    setFriendGrids({ overworld: padGrid(data.sandbox_overworld, fCols), nether: padGrid(data.sandbox_nether, fCols), end: padGrid(data.sandbox_end, fCols) });
                    setFriendBgGrids({ overworld: padGrid(data.sandbox_bg_overworld, fCols), nether: padGrid(data.sandbox_bg_nether, fCols), end: padGrid(data.sandbox_bg_end, fCols) });
                    setFriendSpecials({ overworld: data.specials_overworld || {}, nether: data.specials_nether || {}, end: data.specials_end || {} });

                    const newLog = { uid: user.uid, name: userProfile.displayName, time: Date.now() };
                    let currentLog = data.visitorLog || [];
                    if (currentLog.length === 0 || currentLog[0].uid !== user.uid || (Date.now() - currentLog[0].time > 3600000)) {
                        window.db.collection('users').doc(targetUid).update({ 'mcData.visitorLog': [newLog, ...currentLog].slice(0, 20) });
                    }
                }
            } catch(err) { showAlert("無法讀取好友的房子！"); }
        }
    };

    const removeSpecialFromDB = async (uid, dim, index) => {
        try {
            const doc = await window.db.collection('users').doc(uid).get();
            const dbSpecials = doc.data()?.mcData[`specials_${dim}`] || {};
            delete dbSpecials[index];
            await window.db.collection('users').doc(uid).update({ [`mcData.specials_${dim}`]: dbSpecials });
        } catch(e) {}
    };

    // --- 收件箱處理邏輯 ---
    const handleInboxAction = (item, action) => {
        const newInbox = (mcData.inbox || []).filter(i => i.id !== item.id);
        
        if (action === 'delete') {
            updateMcData({ inbox: newInbox }, true);
        } else if (action === 'claim') {
            updateMcData({ inbox: newInbox, diamonds: mcData.diamonds + 3 }, true);
            showAlert(`🌺 你收下了 ${item.fromName} 的小花，獲得 3 💎！`);
        } else if (action === 'open') {
            // 原本由好友隨機給的包裹，若是沒有 blockId 就給隨機建材
            const blockId = item.blockId || 'oak_log'; 
            const amount = item.amount || Math.floor(Math.random() * 5) + 1;
            const bInfo = BLOCK_TYPES.find(b => b.id === blockId);
            const newInv = { ...localInventory }; 
            newInv[blockId] = (newInv[blockId] || 0) + amount; 
            setLocalInventory(newInv);
            updateMcData({ inbox: newInbox, inventory: newInv }, true);
            showAlert(`🎁 打開了 ${item.fromName} 的禮物！\n獲得 ${amount} 個 ${bInfo ? bInfo.name : '未知方塊'}！`);
        } else if (action === 'read') {
            const newLog = { uid: item.fromUid, name: item.fromName, time: Date.now(), msg: item.text };
            const currentLog = mcData.visitorLog || [];
            updateMcData({ inbox: newInbox, visitorLog: [newLog, ...currentLog].slice(0, 20) }, true);
            showAlert(`📜 ${item.fromName} 的留言：\n\n「${item.text}」\n\n(已收錄至您的到訪紀錄中)`);
        } else if (action === 'view') {
            // 更新該照片的過期時間為 10 分鐘後
            const newExpire = Date.now() + 10 * 60 * 1000;
            const updatedInbox = (mcData.inbox || []).map(i => 
                i.id === item.id ? { ...i, expiresAt: newExpire } : i
            );
            updateMcData({ inbox: updatedInbox }, true);
            
            setSpecialBlockModal({ 
                type: 'photo_view', 
                index: -1, 
                data: item.img,
                from: item.fromName,
                expiresAt: newExpire
            });
            setShowInbox(false); // 關閉收件箱避免擋住圖片
            showAlert('⚠️ 注意：為了保護隱私，此照片將在 10 分鐘後自動銷毀！');
        }
    };

    const handleCellClick = async (index) => {
        const now = Date.now();
        if (lastActionRef.current.index === index && now - lastActionRef.current.time < 200) return;
        lastActionRef.current = { index, time: now };

        const hasSpecial = activeSpecials[index];
        const currentFg = activeGrid[index];
        const currentBg = activeBgGrid[index];

        // --- 查看/互動模式邏輯 ---
        if (!isBuildMode) {
            // 訪客放置
            if (!isViewingSelf && ['poppy', 'sign', 'poop', 'photo_map'].includes(selectedBlock)) {
                // 允許放在方塊上，但避免覆蓋掉門、箱子或其他禮物
                if (hasSpecial) return showAlert('❌ 這裡已經有特殊機關或物品了，換個位子放吧！');
                
                if (selectedBlock === 'photo_map') {
    // 檢查是否為 jay03wn@gmail.com 或 獲授權人員
    const isAuth = user && (user.email === 'jay03wn@gmail.com' || userProfile?.isAuthorized);
    if (!isAuth) {
        return showAlert("📸 私人照片功能僅限管理員或經授權的用戶使用！");
    }

    if (mcData.diamonds < 50) return showAlert('💎 寄送私人照片需要 50 鑽石！');
                    
                    const today = new Date().toISOString().split('T')[0];
                    const currentPhotoLog = mcData.photoSentLog?.date === today ? mcData.photoSentLog : { date: today, count: 0 };
                    
                    if (currentPhotoLog.count >= 5) {
                        return showAlert('❌ 一天最多只能寄送 5 張照片喔！請明天再來。');
                    }

                    setConfirmDialog({
                        title: '📸 寄送私人照片',
                        desc: `確定要花費 50 💎 選擇並寄送照片嗎？\n(今日已發送：${currentPhotoLog.count}/5)\n(照片將在對方查看後存入收件箱)`,
                        cost: 50,
                        action: () => triggerPhotoUpload(index, viewingFriend.uid)
                    });
                    return;
                }
                
                if (selectedBlock === 'sign') {
                    if (mcData.diamonds < 10) return showAlert('💎 留言需要 10 鑽石！');
                    return setSignModal({ index, isSelf: false, targetUid: viewingFriend.uid });
                }
                
                if (selectedBlock === 'poppy') {
                    const today = new Date().toISOString().split('T')[0];
                    const poppySentLog = mcData.poppySent || {};
                    if (poppySentLog[viewingFriend.uid] === today) {
                        return showAlert('❌ 你今天已經送過小花給這位好友囉！明天再來吧！');
                    }
                    
                    const newHotbar = [...hotbar];
                    newHotbar[activeHotbarIndex] = null;
                    setHotbar(newHotbar);
                    updateMcData({ 
                        diamonds: mcData.diamonds + 1, 
                        poppySent: { ...poppySentLog, [viewingFriend.uid]: today } 
                    }, true);

                    const poppyData = { type: 'poppy', fromUid: user.uid, fromName: userProfile.displayName };
                    setFriendSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: poppyData } }));
                    
                    window.db.collection('users').doc(viewingFriend.uid).get().then(doc => {
                        const dbSpecials = doc.data()?.mcData[`specials_${currentDimension}`] || {};
                        dbSpecials[index] = poppyData;
                        window.db.collection('users').doc(viewingFriend.uid).update({ [`mcData.specials_${currentDimension}`]: dbSpecials });
                    });
                    
                    return showAlert('🌺 成功在好友家種下小花！\n你獲得了 1 💎 獎勵！');
                }

                if (selectedBlock === 'poop') {
                    const now = Date.now();
                    const oneHourAgo = now - 3600000;
                    const bonus = mcData.laxativeBonus || 0;
                    
                    let isWatery = false;
                    let newBonus = bonus;
                    let alertMsg = '';

                    // --- 優先檢查瀉藥邏輯 ---
                    if (bonus > 0) {
                        // 吃了瀉藥，立刻拉水便！
                        isWatery = true;
                        newBonus = bonus - 1;
                        alertMsg = '🌊 噗嚕嚕！史帝夫吃了瀉藥肚子劇痛，立刻拉出了一坨噁心的水便！🤢';
                    } else {
                        // 沒有藥效，檢查正常限制
                        const recentPoops = (mcData.poopTimestamps || []).filter(t => t > oneHourAgo);
                        if (recentPoops.length >= 5) {
                            return showAlert('❌ 肚子拉空了！一小時只能拉 5 次，除非去商城買瀉藥觸發水便。');
                        }
                        
                        isWatery = false;
                        newBonus = 0;
                        alertMsg = '💩 成功在好友家偷偷拉了一坨大便！';
                    }

                    // 無論是否為水便，都記錄時間戳 (水便也算在每小時次數內)
                    const finalRecentPoops = (mcData.poopTimestamps || []).filter(t => t > oneHourAgo);

                    const itemData = { 
                        type: 'poop', 
                        fromUid: user.uid, 
                        fromName: userProfile.displayName, 
                        isWatery: isWatery // 標記是否為水便
                    };
                    
                    // 更新本地狀態和 DB (增加噁心警示)
                    updateMcData({ 
                        poopTimestamps: [...finalRecentPoops, now],
                        laxativeBonus: newBonus
                    }, true);
                    
                    showAlert(alertMsg);

                    // --- 同步到 DB 的邏輯 (與原本相同，確保 itemData 包含 isWatery) ---
                    setFriendSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: itemData } }));
                    
                    window.db.collection('users').doc(viewingFriend.uid).get().then(doc => {
                        const dbSpecials = doc.data()?.mcData[`specials_${currentDimension}`] || {};
                        dbSpecials[index] = itemData;
                        window.db.collection('users').doc(viewingFriend.uid).update({ [`mcData.specials_${currentDimension}`]: dbSpecials });
                    });
                    
                    const newHotbar = [...hotbar];
                    newHotbar[activeHotbarIndex] = null;
                    setHotbar(newHotbar);
                    return;
                }
            }

            // 屋主互動
            if (hasSpecial) {
                // ✨ 將地圖上的禮物自動存入收件箱 (保存1天)
                if (['photo_map', 'poop', 'poppy', 'gift_box', 'sign'].includes(hasSpecial.type) && isViewingSelf) {
                    const newInbox = [...(mcData.inbox || [])];
                    const now = Date.now();
                    newInbox.push({
                        ...hasSpecial,
                        id: now + Math.random().toString(), // 賦予唯一ID
                        collectedAt: now,
                        expiresAt: now + 24 * 60 * 60 * 1000 // 一天後過期
                    });
                    
                    // 從地圖移除
                    const newSpecials = { ...specials };
                    newSpecials[currentDimension] = { ...specials[currentDimension] };
                    delete newSpecials[currentDimension][index];
                    setSpecials(newSpecials);
                    removeSpecialFromDB(user.uid, currentDimension, index);
                    
                    updateMcData({ inbox: newInbox }, true);
                    return showAlert(`📥 物品已自動存入「收件箱」(保存 1 天)！\n請點擊商店上方的收件箱按鈕查看或清理。`);
                }
            }

            // 開關門邏輯 (互動模式)
            if (currentFg && (currentFg.endsWith('_door') || currentFg.endsWith('_trapdoor'))) {
                const currentOpen = hasSpecial?.open || false;
                const isDoor = !currentFg.endsWith('_trapdoor');
                
                const updateDoorSpecials = (prev) => {
                    const newSpec = { ...prev };
                    newSpec[currentDimension] = { ...newSpec[currentDimension] }; // 深層拷貝
                    if (isDoor) {
                        const isTop = hasSpecial?.half === 'top';
                        const topIdx = isTop ? index : index - activeCols;
                        const botIdx = isTop ? index + activeCols : index;
                        if(botIdx >= 0 && botIdx < TOTAL_CELLS) newSpec[currentDimension][botIdx] = { ...newSpec[currentDimension][botIdx], open: !currentOpen };
                        if(topIdx >= 0 && topIdx < TOTAL_CELLS) newSpec[currentDimension][topIdx] = { ...newSpec[currentDimension][topIdx], open: !currentOpen };
                    } else {
                        newSpec[currentDimension][index] = { ...newSpec[currentDimension][index], open: !currentOpen };
                    }
                    return newSpec;
                };

                if (isViewingSelf) { setSpecials(updateDoorSpecials); setHasUnsavedChanges(true); } 
                else setFriendSpecials(updateDoorSpecials);
                
                const doorAudio = new Audio(!currentOpen ? 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/door_open.mp3' : 'https://raw.githubusercontent.com/jay03wn-afk/SOURCES/main/door_close.mp3');
                doorAudio.volume = 0.6;
                doorAudio.play().catch(e => {});
                return;
            }

            if (currentFg === 'chest_block') {
                if (isViewingSelf) { setChestUi({ index, inventory: hasSpecial?.items || {} }); playChestOpenSound(); } 
                else showAlert('🔒 這是私人的儲物箱，上了鎖你打不開！');
                return;
            }
            return;
        }

        // --- 建築模式邏輯 (僅自己家) ---
        if (!isViewingSelf) return;

        const newInv = { ...localInventory };
        
        const removeFromHotbarIfEmpty = (inv, block) => {
            if ((inv[block] || 0) <= 0) {
                const newHotbar = [...hotbar];
                for (let i = 0; i < newHotbar.length; i++) {
                    if (newHotbar[i] === block) newHotbar[i] = null;
                }
                setHotbar(newHotbar);
            }
        };

        // --- 處理背景牆模式 (Background) ---
        if (buildLayer === 'background') {
            if (!selectedBlock) return;
            if (currentBg === selectedBlock && selectedBlock !== 'erase') return;
            const newBgGrid = [...bgGrids[currentDimension]];

            if (selectedBlock !== 'erase') {
                if ((newInv[selectedBlock] || 0) <= 0) return showAlert(`❌ 庫存不足，請先購買！`);
                newInv[selectedBlock] -= 1;
                removeFromHotbarIfEmpty(newInv, selectedBlock);
                newBgGrid[index] = selectedBlock;
                playBlockSound(selectedBlock, 'place');
            } else {
                if (currentBg) playBlockSound(currentBg, 'break');
                newBgGrid[index] = null;
            }

            if (currentBg && currentBg !== 'erase') newInv[currentBg] = (newInv[currentBg] || 0) + 1;
            setBgGrids({ ...bgGrids, [currentDimension]: newBgGrid });
            setLocalInventory(newInv); setHasUnsavedChanges(true);
            return;
        }

        // --- 處理前景實體模式 (Foreground) ---
        // ✨ 修改：若 selectedBlock === 'erase' (鐵鎬)，會跳過互動翻轉，直接進入下方的拆除邏輯
        if (currentFg && selectedBlock !== 'erase') {
            if (currentFg.includes('_log')) {
                setSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: { type: 'rotation', rotation: (hasSpecial?.rotation || 0) === 0 ? 90 : 0 } } }));
                playBlockSound(currentFg, 'place'); setHasUnsavedChanges(true); return;
            }
            if (currentFg.includes('_slab')) {
                setSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: { type: 'rotation', position: (hasSpecial?.position || 'bottom') === 'bottom' ? 'top' : 'bottom' } } }));
                playBlockSound(currentFg, 'place'); setHasUnsavedChanges(true); return;
            }
            if (currentFg.includes('_stairs')) {
                const seq = ['bottom-right', 'bottom-left', 'top-left', 'top-right'];
                setSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: { type: 'rotation', rotation: seq[(seq.indexOf(hasSpecial?.rotation || 'bottom-right') + 1) % 4] } } }));
                playBlockSound(currentFg, 'place'); setHasUnsavedChanges(true); return;
            }
            // 門的方向切換 (向左開 / 向右開)
            if (currentFg.endsWith('_door') && !currentFg.endsWith('_trapdoor')) {
                const isTop = hasSpecial?.half === 'top';
                const topIdx = isTop ? index : index - cols;
                const botIdx = isTop ? index + cols : index;
                const newHinge = (hasSpecial?.hinge || 'left') === 'left' ? 'right' : 'left';
                
                setSpecials(prev => {
                    const newSpec = { ...prev };
                    newSpec[currentDimension] = { ...newSpec[currentDimension] };
                    if(botIdx >= 0 && botIdx < TOTAL_CELLS) newSpec[currentDimension][botIdx] = { ...newSpec[currentDimension][botIdx], hinge: newHinge };
                    if(topIdx >= 0 && topIdx < TOTAL_CELLS) newSpec[currentDimension][topIdx] = { ...newSpec[currentDimension][topIdx], hinge: newHinge };
                    return newSpec;
                });
                playBlockSound(currentFg, 'place'); 
                setHasUnsavedChanges(true); 
                return;
            }
            
            // 地板門：切換貼齊面 (底端、頂端、出紙面)
            if (currentFg.includes('_trapdoor')) {
                const facings = ['bottom', 'top', 'face']; 
                const currentFacing = hasSpecial?.facing || 'bottom';
                const nextFacing = facings[(facings.indexOf(currentFacing) + 1) % facings.length];
                
                setSpecials(prev => ({ 
                    ...prev, 
                    [currentDimension]: { 
                        ...prev[currentDimension], 
                        [index]: { ...hasSpecial, type: 'trapdoor', facing: nextFacing } 
                    } 
                }));
                playBlockSound(currentFg, 'place'); 
                setHasUnsavedChanges(true); 
                return;
            }
        }

        if (!selectedBlock) return;

        if (selectedBlock === 'erase' && currentFg === 'chest_block') {
            if (Object.values(hasSpecial?.items || {}).some(c => c > 0)) return showAlert('❌ 請先至「👀互動模式」將箱子裡的東西清空才能拆除！');
        }

        if (selectedBlock === 'sign') {
            if (hasSpecial) return showAlert('❌ 這裡已經有特殊機關或物品了，換個位子插吧！');
            if (Object.values(specials[currentDimension]).filter(s => s.type === 'sign').length >= 5) return showAlert('❌ 每個維度最多只能放 5 個告示牌！');
            if (mcData.diamonds < 10) return showAlert('💎 放置告示牌需要 10 鑽石！');
            return setSignModal({ index, isSelf: true, targetUid: user.uid });
        }

        if (currentFg === selectedBlock && selectedBlock !== 'erase') return; 

        // ✨ 確保 React State 能確實捕捉到所有變化，避免物件覆蓋 Bug
        const newFgGrid = [...grids[currentDimension]];
        const newSpecials = { ...specials, [currentDimension]: { ...specials[currentDimension] } }; 
        const isPlacingDoor = selectedBlock.endsWith('_door') && !selectedBlock.endsWith('_trapdoor');
        
        if (isPlacingDoor && selectedBlock !== 'erase') {
            if (index - cols < 0 || newFgGrid[index - cols] !== null) return showAlert('❌ 空間不足！木門需要上下兩格的空間！');
        }

        if (selectedBlock !== 'erase' && !['sign', 'poppy', 'gift_box'].includes(selectedBlock)) {
            if ((newInv[selectedBlock] || 0) <= 0) return showAlert(`❌ 庫存不足，請購買！`);
            newInv[selectedBlock] -= 1; 
            removeFromHotbarIfEmpty(newInv, selectedBlock);
        }

        // 拆除原方塊
        if (currentFg && currentFg !== 'erase') {
            const isRemovingDoor = currentFg.endsWith('_door') && !currentFg.endsWith('_trapdoor');
            newInv[currentFg] = (newInv[currentFg] || 0) + 1;
            
            if (isRemovingDoor) {
                // ✨ 修正門拆除邏輯：更嚴謹地透過 Grid 驗證確保兩半截都能順利被拆除
                let topIdx = index;
                let botIdx = index;
                if (hasSpecial?.half === 'top' || newFgGrid[index + cols] === currentFg) {
                    topIdx = index;
                    botIdx = index + cols;
                } else {
                    topIdx = index - cols;
                    botIdx = index;
                }
                
                if (topIdx >= 0 && newFgGrid[topIdx] === currentFg) { 
                    newFgGrid[topIdx] = null; 
                    delete newSpecials[currentDimension][topIdx]; 
                }
                if (botIdx < TOTAL_CELLS && newFgGrid[botIdx] === currentFg) { 
                    newFgGrid[botIdx] = null; 
                    delete newSpecials[currentDimension][botIdx]; 
                }
            } else {
                newFgGrid[index] = null; 
                delete newSpecials[currentDimension][index];
            }
        }

        if (selectedBlock !== 'erase') {
            newFgGrid[index] = selectedBlock;
            if (selectedBlock === 'chest_block') {
                newSpecials[currentDimension][index] = { type: 'chest', items: {} };
            } else if (isPlacingDoor) {
                newFgGrid[index] = selectedBlock; newFgGrid[index - cols] = selectedBlock;
                newSpecials[currentDimension][index] = { type: 'door', half: 'bottom', open: false, hinge: 'left' };
                newSpecials[currentDimension][index - cols] = { type: 'door', half: 'top', open: false, hinge: 'left' };
            } else if (selectedBlock.includes('_trapdoor')) {
                // 初始化地板門
                newSpecials[currentDimension][index] = { type: 'trapdoor', facing: 'bottom', open: false };
            } else {
                delete newSpecials[currentDimension][index];
            }
            playBlockSound(selectedBlock, 'place');
        } else {
            if (currentFg) playBlockSound(currentFg, 'break');
            if (hasSpecial?.type === 'sign') removeSpecialFromDB(user.uid, currentDimension, index);
        }

        setGrids({ ...grids, [currentDimension]: newFgGrid });
        setSpecials(newSpecials);
        setLocalInventory(newInv);
        setHasUnsavedChanges(true); 
    };

    const handleChestItemTransfer = (blockId, direction) => {
        const { index } = chestUi;
        const chestItems = { ...(specials[currentDimension][index]?.items || {}) };
        const currentLocal = { ...localInventory };

        if (direction === 'toChest') {
            if (!currentLocal[blockId] || currentLocal[blockId] <= 0) return;
            currentLocal[blockId] -= 1; chestItems[blockId] = (chestItems[blockId] || 0) + 1;
        } else {
            if (!chestItems[blockId] || chestItems[blockId] <= 0) return;
            chestItems[blockId] -= 1; currentLocal[blockId] = (currentLocal[blockId] || 0) + 1;
        }

        setLocalInventory(currentLocal);
        setSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: { ...prev[currentDimension][index], type: 'chest', items: chestItems } } }));
        setHasUnsavedChanges(true);
    };

    const handleDragStart = (e, type, idOrIdx) => {
        e.dataTransfer.setData('type', type);
        if (type === 'inventory') e.dataTransfer.setData('blockId', idOrIdx);
        else if (type === 'hotbar') e.dataTransfer.setData('sourceIdx', idOrIdx);
        
        const imgNode = e.target.querySelector('img');
        if (imgNode) e.dataTransfer.setDragImage(imgNode, 16, 16);
    };

    const handleInventoryDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const type = e.dataTransfer.getData('type');
        if (type === 'hotbar') {
            const srcIdx = parseInt(e.dataTransfer.getData('sourceIdx'));
            const newHotbar = [...hotbar];
            newHotbar[srcIdx] = null; 
            setHotbar(newHotbar);
        }
    };

    const handleHotbarDrop = (e, dropIdx) => {
        e.preventDefault();
        e.stopPropagation(); 
        const type = e.dataTransfer.getData('type');
        const blockId = e.dataTransfer.getData('blockId');
        
        const newHotbar = [...hotbar];
        if (type === 'inventory') {
            const existingIdx = newHotbar.indexOf(blockId);
            if (existingIdx !== -1) newHotbar[existingIdx] = null;
            newHotbar[dropIdx] = blockId;
        } else if (type === 'hotbar') {
            const srcIdx = parseInt(e.dataTransfer.getData('sourceIdx'));
            const temp = newHotbar[dropIdx];
            newHotbar[dropIdx] = newHotbar[srcIdx];
            newHotbar[srcIdx] = temp;
        }
        setHotbar(newHotbar);
        setActiveHotbarIndex(dropIdx);
    };

    const submitSign = async () => {
        const text = document.getElementById('signInput').value.trim();
        if (!text) return setSignModal(null);
        if (text.length > 30) return showAlert('❌ 留言太長了，最多 30 個字！');
        
        const { index, isSelf, targetUid } = signModal;
        updateMcData({ diamonds: mcData.diamonds - 10 }, true);
        const signData = { type: 'sign', text, fromUid: user.uid, fromName: userProfile.displayName };

        try {
            const doc = await window.db.collection('users').doc(targetUid).get();
            const dbSpecials = doc.data()?.mcData[`specials_${currentDimension}`] || {};
            dbSpecials[index] = signData;
            await window.db.collection('users').doc(targetUid).update({ [`mcData.specials_${currentDimension}`]: dbSpecials });
            
            if (isSelf) { 
                setSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: signData } })); 
                setHasUnsavedChanges(true); 
            } else {
                setFriendSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: signData } }));
                showAlert('✅ 成功在好友家留下告示牌！');
            }
        } catch(e) {
            console.error(e);
        }
        setSignModal(null);
    };

    const handleSave = () => {
        setIsSaving(true);
        window.db.collection('users').doc(user.uid).update({
            'mcData.sandbox_overworld': grids.overworld, 'mcData.sandbox_nether': grids.nether, 'mcData.sandbox_end': grids.end,
            'mcData.sandbox_bg_overworld': bgGrids.overworld, 'mcData.sandbox_bg_nether': bgGrids.nether, 'mcData.sandbox_bg_end': bgGrids.end,
            'mcData.specials_overworld': specials.overworld, 'mcData.specials_nether': specials.nether, 'mcData.specials_end': specials.end,
            'mcData.inventory': localInventory, 'mcData.sandbox_hotbar': hotbar, 'mcData.sandbox_cols': cols
        }).then(() => {
            showAlert("✅ 建築、背景、領地擴張與快捷欄皆已儲存！");
            updateMcData({ 
                sandbox_overworld: grids.overworld, sandbox_nether: grids.nether, sandbox_end: grids.end,
                sandbox_bg_overworld: bgGrids.overworld, sandbox_bg_nether: bgGrids.nether, sandbox_bg_end: bgGrids.end,
                specials_overworld: specials.overworld, specials_nether: specials.nether, specials_end: specials.end,
                inventory: localInventory, sandbox_hotbar: hotbar, sandbox_cols: cols
            }, true); 
            setHasUnsavedChanges(false);
        }).finally(() => setIsSaving(false));
    };

    const handleQuit = () => {
        if (hasUnsavedChanges) setShowQuitConfirm(true); 
        else onQuit();
    };

    const handlePhotoFilesSelected = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return showAlert('❌ 請選擇圖片檔案！');
        if (file.size > 5 * 1024 * 1024) return showAlert('❌ 圖片太大了，請選擇 5MB 以下的圖片！');
        if (!window.currentPhotoTarget) return;

        try {
            const { index, targetUid } = window.currentPhotoTarget;
            
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800; 
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                    
                    if (compressedBase64.length > 500000) {
                        return showAlert('❌ 圖片壓縮後依然過大，請選擇更小的圖片或降低解析度！');
                    }

                    const today = new Date().toISOString().split('T')[0];
                    const currentPhotoLog = mcData.photoSentLog?.date === today ? mcData.photoSentLog : { date: today, count: 0 };

                    updateMcData({ 
                        diamonds: mcData.diamonds - 50,
                        photoSentLog: { date: today, count: currentPhotoLog.count + 1 }
                    }, true);

                    const photoData = { 
                        type: 'photo_map',
                        img: compressedBase64,
                        fromUid: user.uid, 
                        fromName: userProfile.displayName,
                        sentAt: Date.now()
                    };
                    
                    setFriendSpecials(prev => ({ ...prev, [currentDimension]: { ...prev[currentDimension], [index]: photoData } }));
                    
                    const doc = await window.db.collection('users').doc(targetUid).get();
                    const dbSpecials = doc.data()?.mcData[`specials_${currentDimension}`] || {};
                    dbSpecials[index] = photoData;
                    await window.db.collection('users').doc(targetUid).update({ [`mcData.specials_${currentDimension}`]: dbSpecials });

                    showAlert('📸 照片已成功寄出！將以「地圖」形式出現在好友家。');
                    window.currentPhotoTarget = null; 
                    e.target.value = ''; 
                };
            };
        } catch (err) {
            console.error(err);
            showAlert('❌ 寄送照片時發生錯誤。');
        }
    };

    const triggerPhotoUpload = (index, targetUid) => {
        window.currentPhotoTarget = { index, targetUid };
        photoInputRef.current.click();
    };

    const handleConfirmBuy = () => {
        const amt = parseInt(buyModal.amount);
        if (isNaN(amt) || amt <= 0) return showAlert("數量無效！");
        const totalCost = buyModal.block.price * amt;
        if (mcData.diamonds < totalCost) return showAlert("💎 鑽石不足！");

        const newInv = { ...localInventory, [buyModal.block.id]: (localInventory[buyModal.block.id] || 0) + amt };
        setLocalInventory(newInv); updateMcData({ diamonds: mcData.diamonds - totalCost, inventory: newInv }, true);
        showAlert(`✅ 購買成功！已放入左側庫存中。`); setBuyModal(null);
    };

    const displayedBlocks = BLOCK_TYPES.filter(b => {
        if (b.special || b.id === 'erase') return false; 
        if (activeCategory === '全部') return true;
        if (activeCategory === '地獄(需解鎖)') return b.cat === '地獄(需解鎖)' && mcData.unlockedNether;
        if (activeCategory === '末地(需解鎖)') return b.cat === '末地(需解鎖)' && mcData.unlockedEnd;
        return b.cat === activeCategory;
    });

    return (
<div className="fixed inset-0 z-[80] bg-[#111111] bg-opacity-95 flex flex-col items-center p-2 sm:p-4 animate-in fade-in select-none overflow-y-auto overflow-x-hidden custom-scrollbar font-mono">
    <div className="p-2 border-4 border-[#555555] border-r-[#111111] border-b-[#111111] w-full max-w-7xl relative shadow-2xl flex flex-col md:flex-row my-auto h-auto min-h-[90dvh] md:h-[90dvh] shrink-0" style={{ backgroundColor: DIMENSIONS[currentDimension].bg }}>
                
                {showQuitConfirm && (
                    <div className="fixed inset-0 bg-stone-800 bg-opacity-75 flex items-center justify-center z-[100]">
                        <div className="bg-stone-800 border-4 border-red-600 p-6 rounded-lg shadow-2xl max-w-sm text-center transform scale-100 animate-pulse-once">
                            <div className="text-red-500 text-5xl mb-4">⚠️</div>
                            <h2 className="text-white font-black text-xl mb-2">尚未儲存！</h2>
                            <p className="text-gray-300 text-sm mb-6">你有未儲存的建築或擴張進度。<br />現在退出將會<span className="text-red-400 font-bold">永久遺失</span>剛剛的變更！</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setShowQuitConfirm(false)} className="px-4 py-2 bg-gray-600 text-white font-bold rounded hover:bg-gray-500 transition-colors">取消</button>
                                <button onClick={onQuit} className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-500 transition-colors shadow-lg">忍痛退出</button>
                            </div>
                        </div>
                    </div>
                )}

                {visitorLogOpen && (
                    <div className="fixed inset-0 z-[150] bg-stone-800 bg-opacity-70 flex flex-col items-center justify-center p-4">
                        <div className="bg-[#333] border-4 border-gray-600 p-4 w-full max-w-md shadow-2xl flex flex-col h-[60dvh]">
                            <div className="flex justify-between items-center mb-4 border-b-2 border-gray-600 pb-2">
                                <h3 className="text-white font-bold text-lg">👣 基地到訪與留言紀錄</h3>
                                <button onClick={() => setVisitorLogOpen(false)} className="text-red-400 hover:text-red-300 font-bold">✖ 關閉</button>
                            </div>
                            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2">
                                {(!mcData.visitorLog || mcData.visitorLog.length === 0) ? (
                                    <p className="text-gray-400 text-center text-sm mt-10">尚無訪客紀錄，多邀請好友來參觀吧！</p>
                                ) : (
                                    mcData.visitorLog.map((log, i) => (
                                        <div key={i} className="bg-stone-800 p-3 border-l-4 border-amber-500 flex flex-col justify-center">
                                            <div className="flex justify-between items-center">
                                                <span className="text-amber-300 font-bold text-sm">{log.name} <span className="text-gray-400 font-normal">{log.msg ? '留下了告示牌' : '來訪了'}</span></span>
                                                <span className="text-gray-500 text-xs">{new Date(log.time).toLocaleString('zh-TW', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            {log.msg && (
                                                <p className="text-gray-200 mt-2 text-sm bg-stone-800 bg-opacity-30 p-2 rounded border border-stone-700">
                                                    「{log.msg}」
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {showInbox && (
                    <div className="fixed inset-0 z-[150] bg-stone-800 bg-opacity-80 flex flex-col items-center justify-center p-4">
                        <div className="bg-[#333] border-4 border-gray-600 p-4 w-full max-w-lg shadow-2xl flex flex-col h-[70dvh]">
                            <div className="flex justify-between items-center mb-4 border-b-2 border-gray-600 pb-2">
                                <h3 className="text-white font-bold text-lg">📥 收件箱 (保存1天)</h3>
                                <button onClick={() => setShowInbox(false)} className="text-red-400 hover:text-red-300 font-bold">✖ 關閉</button>
                            </div>
                            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2">
                                {(!mcData.inbox || mcData.inbox.filter(i => i.expiresAt > Date.now()).length === 0) ? (
                                    <p className="text-gray-400 text-center text-sm mt-10">收件箱是空的喔！</p>
                                ) : (
                                    mcData.inbox.filter(i => i.expiresAt > Date.now()).map(item => (
                                        <div key={item.id} className="bg-stone-800 p-3 border-l-4 border-amber-500 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                {item.type === 'poop' && <span className="text-2xl">💩</span>}
                                                {item.type === 'poppy' && <span className="text-2xl">🌺</span>}
                                                {item.type === 'gift_box' && <span className="text-2xl">🎁</span>}
                                                {item.type === 'sign' && <span className="text-2xl">📜</span>}
                                                {item.type === 'photo_map' && <span className="text-2xl">📸</span>}
                                                <div>
                                                    <p className="text-white font-bold text-sm">來自: {item.fromName}</p>
                                                    <p className="text-gray-400 text-xs">剩下 {Math.ceil((item.expiresAt - Date.now())/3600000)} 小時過期</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {item.type === 'photo_map' && (
                                                    <button onClick={() => handleInboxAction(item, 'view')} className="bg-amber-600 text-white px-2 py-1 text-xs font-bold rounded">查看</button>
                                                )}
                                                {item.type === 'sign' && (
                                                    <button onClick={() => handleInboxAction(item, 'read')} className="bg-amber-600 text-white px-2 py-1 text-xs font-bold rounded">閱讀</button>
                                                )}
                                                {item.type === 'gift_box' && (
                                                    <button onClick={() => handleInboxAction(item, 'open')} className="bg-emerald-600 text-white px-2 py-1 text-xs font-bold rounded">打開</button>
                                                )}
                                                {item.type === 'poppy' && (
                                                    <button onClick={() => handleInboxAction(item, 'claim')} className="bg-stone-600 text-white px-2 py-1 text-xs font-bold rounded">領3💎</button>
                                                )}
                                                <button onClick={() => handleInboxAction(item, 'delete')} className="bg-red-600 text-white px-2 py-1 text-xs font-bold rounded">丟棄</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <input 
                    type="file" 
                    ref={photoInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                    onChange={handlePhotoFilesSelected}
                />

                {specialBlockModal?.type === 'photo_view' && (
                    <div className="fixed inset-0 z-[140] bg-stone-800 bg-opacity-90 flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in select-text">
                        <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] p-3 w-full max-w-4xl shadow-2xl relative flex flex-col h-[90vh]">
                            
                            <div className="flex justify-between items-center mb-2 px-1 border-b-2 border-gray-400 pb-1 shrink-0">
                                <div>
                                    <h3 className="text-[#373737] font-bold text-lg inline-block">📸 來自 {specialBlockModal.from} 的私人照片</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a 
                                        href={specialBlockModal.data} 
                                        download={`photo_from_${specialBlockModal.from}.jpg`}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded text-sm shadow border border-black"
                                    >
                                        📥 下載
                                    </a>
                                    <button onClick={() => setSpecialBlockModal(null)} className="text-red-600 font-black text-xl hover:scale-110">✖</button>
                                </div>
                            </div>

                            <div className="flex-grow bg-stone-800 p-1 border-2 border-[#373737] shadow-inner overflow-auto custom-scrollbar flex items-center justify-center">
                                <img 
                                    src={specialBlockModal.data} 
                                    alt="Sent private photo"
                                    className="pixelated max-w-none transition-transform duration-200 origin-center"
                                    style={{ transform: `scale(${window.tempPhotoScale || 1})` }}
                                    onWheel={(e) => {
                                        e.preventDefault();
                                        if (!window.tempPhotoScale) window.tempPhotoScale = 1;
                                        const newScale = e.deltaY > 0 ? window.tempPhotoScale * 0.9 : window.tempPhotoScale * 1.1;
                                        window.tempPhotoScale = Math.max(0.5, Math.min(3, newScale));
                                        e.target.style.transform = `scale(${window.tempPhotoScale})`;
                                    }}
                                />
                            </div>
                            
                            <p className="text-[#373737] font-bold text-center text-xs mt-2 shrink-0">提示：使用滑鼠滾輪可縮放圖片大小。</p>
                        </div>
                    </div>
                )}

                {confirmDialog && (
                    <div className="fixed inset-0 bg-stone-800 bg-opacity-80 flex items-center justify-center z-[120]">
                        <div className="bg-stone-800 border-4 border-gray-600 p-6 rounded-lg shadow-2xl max-w-sm text-center transform scale-100 animate-in zoom-in">
                            <h2 className="text-white font-black text-xl mb-2">{confirmDialog.title}</h2>
                            <p className="text-amber-400 font-bold text-sm mb-6 whitespace-pre-line">{confirmDialog.desc}</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 bg-gray-600 text-white font-bold hover:bg-gray-500 border border-black shadow-lg">考慮一下</button>
                                <button onClick={() => { confirmDialog.action(); setConfirmDialog(null); }} className="px-4 py-2 bg-emerald-600 text-white font-bold hover:bg-emerald-500 border border-black shadow-lg">確認花費 {confirmDialog.cost} 💎</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-none md:flex-1 flex flex-col items-center p-1 md:p-2 w-full md:w-3/4 relative h-[65vh] md:h-full shrink-0">
                    
                    <div className="w-full flex flex-col xl:flex-row justify-between items-start xl:items-center mb-2 bg-stone-800 bg-opacity-60 p-2 text-white font-bold gap-2 z-10 shrink-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span>{isViewingSelf ? `🏠 我的基地` : `👀 ${viewingFriend.name} 的家`}</span>
                            
                            <select onChange={(e) => setCurrentDimension(e.target.value)} value={currentDimension} className="bg-stone-800 text-white border border-gray-500 px-2 py-1 outline-none text-sm font-bold cursor-pointer">
                                <option value="overworld">🌍 主世界</option>
                                {(isViewingSelf ? mcData.unlockedNether : (viewingFriend?.mcData?.unlockedNether)) && <option value="nether">🔥 地獄</option>}
                                {(isViewingSelf ? mcData.unlockedEnd : (viewingFriend?.mcData?.unlockedEnd)) && <option value="end">🌌 末地</option>}
                            </select>

                            {isViewingSelf && !mcData.unlockedNether && (
                                <button 
                                    onClick={() => setConfirmDialog({ 
                                        title: '🔥 解鎖地獄', 
                                        desc: '確定要花費 1000 💎 解鎖充滿熔岩與危險的地獄維度嗎？', 
                                        cost: 1000, 
                                        action: () => { 
                                            if (mcData.diamonds < 1000) return showAlert('💎 鑽石不足，無法解鎖地獄！');
                                            updateMcData({ diamonds: mcData.diamonds - 1000, unlockedNether: true }, true); 
                                            showAlert('🎉 解鎖地獄！'); 
                                        } 
                                    })} 
                                    className="bg-red-800 hover:bg-red-700 text-white text-[10px] px-2 py-1 border border-red-400"
                                >
                                    🔓解鎖地獄(1000💎)
                                </button>
                            )}

                            {isViewingSelf && !mcData.unlockedEnd && (
                                <button 
                                    onClick={() => setConfirmDialog({ 
                                        title: '🌌 解鎖末地', 
                                        desc: '確定要花費 2000 💎 解鎖充滿紫頌花與神秘的末地維度嗎？', 
                                        cost: 2000, 
                                        action: () => { 
                                            if (mcData.diamonds < 2000) return showAlert('💎 鑽石不足，無法解鎖末地！');
                                            updateMcData({ diamonds: mcData.diamonds - 2000, unlockedEnd: true }, true); 
                                            showAlert('🎉 解鎖末地！'); 
                                        } 
                                    })} 
                                    className="bg-amber-700800 hover:bg-amber-700700 text-white text-[10px] px-2 py-1 border border-amber-700400"
                                >
                                    🔓解鎖末地(2000💎)
                                </button>
                            )}
                            {isViewingSelf && (
                                <div className="flex items-center space-x-2">
                                    <div className="flex bg-stone-800 border border-gray-600 rounded overflow-hidden">
                                        <button onClick={() => setIsBuildMode(false)} className={`px-2 py-1 text-xs ${!isBuildMode ? 'bg-amber-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>👀 查看互動</button>
                                        <button onClick={() => { setIsBuildMode(true); setBuildLayer('foreground'); }} className={`px-2 py-1 text-xs ${isBuildMode ? 'bg-amber-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>🔨 建築</button>
                                    </div>
                                    
                                    {isBuildMode && (
                                        <div className="flex bg-stone-800 border border-gray-600 rounded overflow-hidden ml-1">
                                            <button onClick={() => setBuildLayer('foreground')} className={`px-2 py-1 text-xs ${buildLayer === 'foreground' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>🧱 前景</button>
                                            <button onClick={() => setBuildLayer('background')} className={`px-2 py-1 text-xs ${buildLayer === 'background' ? 'bg-[#5c4033] text-white' : 'text-gray-400 hover:bg-gray-700'}`}>🖼️ 背景</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select onChange={handleViewChange} className="bg-amber-900 text-white border border-amber-500 px-2 py-1 outline-none text-sm font-bold cursor-pointer">
                                <option value="self">🏠 回到我的家</option>
                                {(userProfile.friends || []).map(f => <option key={f.uid} value={f.uid}>👀 去 {f.name} 家</option>)}
                            </select>
                            {isViewingSelf && <button onClick={() => setVisitorLogOpen(true)} className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 border border-white font-bold text-sm transition-colors shadow-md">👣 紀錄</button>}
                            <button onClick={handleQuit} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 border border-white font-black text-sm transition-colors shadow-lg">✖ 退出</button>
                        </div>
                    </div>

                    {/* ✨ 修改畫布的包裹容器，加入縮放按鈕並且移除 transform */}
                    <div className="w-full flex-grow relative border-2 border-black overflow-hidden flex flex-col bg-stone-800">
                        <div className="absolute top-2 right-2 z-40 flex flex-col gap-2">
                            <button 
                                onClick={() => { let n = Math.min(mapScale + 0.25, 3); setMapScale(n); mapScaleRef.current = n; }} 
                                className="bg-[#8b8b8b] text-white w-10 h-10 font-black border-2 border-[#FCFBF7] border-r-[#373737] border-b-[#373737] hover:bg-[#a0a0a0] shadow-lg flex items-center justify-center text-xl active:border-t-[#373737] active:border-l-[#373737] active:border-r-white active:border-b-white cursor-pointer"
                            >➕</button>
                            <button 
                                onClick={() => { let n = Math.max(mapScale - 0.25, 1); setMapScale(n); mapScaleRef.current = n; }} 
                                className="bg-[#8b8b8b] text-white w-10 h-10 font-black border-2 border-[#FCFBF7] border-r-[#373737] border-b-[#373737] hover:bg-[#a0a0a0] shadow-lg flex items-center justify-center text-xl active:border-t-[#373737] active:border-l-[#373737] active:border-r-white active:border-b-white cursor-pointer"
                            >➖</button>
                        </div>
                        
                        <div ref={mapContainerRef} className="w-full h-full overflow-auto custom-scrollbar p-1 relative flex">
                            {isViewingSelf && (
                                <button onClick={() => requestExpand('left')} className="sticky left-0 top-0 bottom-0 w-8 flex-shrink-0 bg-stone-800 bg-opacity-60 hover:bg-opacity-80 text-white font-black z-20 flex items-center justify-center border-r border-gray-600 transition-all">➕</button>
                            )}
                            
                            {/* ✨ 替換原先的 scale，使用 height 搭配 aspect-ratio 做原生擴縮，解決浮動問題 */}
                            <div className="grid grid-origin bg-opacity-90 shrink-0" 
                                style={{      
                                    backgroundColor: DIMENSIONS[currentDimension].bg,      
                                    gridTemplateColumns: `repeat(${activeCols}, 1fr)`,
                                    gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                                    height: `${mapScale * 100}%`,
                                    aspectRatio: `${activeCols} / ${ROWS}` 
                                }}>
                                {activeGrid.map((fgCellId, i) => {
                                    const bgCellId = activeBgGrid[i];
                                    const fgInfo = BLOCK_TYPES.find(b => b.id === fgCellId);
                                    const bgInfo = BLOCK_TYPES.find(b => b.id === bgCellId);
                                    const specialInfo = activeSpecials[i];
                                    
                                    let fgStyle = { width: '100%', height: '100%' };
                                    let fgImgSrc = fgInfo?.img;
                                    let bgImgSrc = bgInfo?.img;
                                    
                                    if (fgCellId) {
                                        if (fgCellId.includes('_log') && specialInfo?.rotation) fgStyle.transform = `rotate(${specialInfo.rotation}deg)`;
                                        else if (fgCellId.includes('_slab')) fgStyle.clipPath = (specialInfo?.position || 'bottom') === 'bottom' ? 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)' : 'polygon(0 0, 100% 0, 100% 50%, 0 50%)';
                                        else if (fgCellId.includes('_stairs')) {
                                            const rot = specialInfo?.rotation || 'bottom-right';
                                            if (rot === 'bottom-right') fgStyle.clipPath = 'polygon(0 50%, 50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%)';
                                            else if (rot === 'bottom-left') fgStyle.clipPath = 'polygon(0 0, 50% 0, 50% 50%, 100% 50%, 100% 100%, 0 100%)';
                                            else if (rot === 'top-right') fgStyle.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 50% 100%, 50% 50%, 0 50%)';
                                            else if (rot === 'top-left') fgStyle.clipPath = 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)';
                                        } else if (fgCellId.endsWith('_door') && !fgCellId.endsWith('_trapdoor')) {
                                            fgImgSrc = `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/${fgCellId.split('_door')[0]}_door_${specialInfo?.half || 'bottom'}.png`;
                                            const hinge = specialInfo?.hinge || 'left';
                                            
                                            if (hinge === 'left') {
                                                fgStyle.transformOrigin = 'left'; 
                                                fgStyle.transform = specialInfo?.open ? 'scaleX(0.2)' : 'none';
                                            } else {
                                                if (specialInfo?.open) {
                                                    fgStyle.transformOrigin = 'right';
                                                    fgStyle.transform = 'scaleX(0.2)'; 
                                                } else {
                                                    fgStyle.transformOrigin = 'center';
                                                    fgStyle.transform = 'scaleX(-1)'; 
                                                }
                                            }
                                        } else if (fgCellId.includes('_trapdoor')) {
                                            const facing = specialInfo?.facing || 'bottom'; 
                                            const isOpen = specialInfo?.open || false;

                                            if (facing === 'bottom') {
                                                fgStyle.clipPath = isOpen ? 'polygon(0 0, 20% 0, 20% 100%, 0 100%)' : 'polygon(0 80%, 100% 80%, 100% 100%, 0 100%)';
                                            } else if (facing === 'top') {
                                                fgStyle.clipPath = isOpen ? 'polygon(0 0, 20% 0, 20% 100%, 0 100%)' : 'polygon(0 0, 100% 0, 100% 20%, 0 20%)';
                                            } else if (facing === 'face') {
                                                fgStyle.clipPath = isOpen ? 'polygon(0 0, 100% 0, 100% 20%, 0 20%)' : 'none'; 
                                            }
                                        }
                                    }

                                    return (
                                        <div 
                                            key={i} onPointerDown={(e) => { handleCellClick(i); }} onPointerEnter={(e) => { if (e.buttons === 1) handleCellClick(i); }} 
                                            className={`w-full aspect-square relative cursor-crosshair ${(!fgCellId && !bgCellId) ? 'border-[0.5px] border-black border-opacity-20 hover:bg-[#FCFBF7] hover:bg-opacity-30' : ''}`}
                                            style={{ touchAction: 'pan-x pan-y' }}
                                        >
                                            {bgImgSrc && (
                                                <div className="absolute inset-0 pointer-events-none" style={{ filter: 'brightness(0.4) saturate(0.8)' }}>
                                                    <McImg src={bgInfo?.img} className="w-full h-full object-cover pixelated" />
                                                </div>
                                            )}
                                            {fgImgSrc && (
                                                <div className="absolute inset-0 transition-all duration-200 pointer-events-none" style={fgStyle}>
                                                    <McImg src={fgImgSrc} className="w-full h-full object-cover pixelated drop-shadow-sm" />
                                                </div>
                                            )}
                                            {specialInfo?.type === 'sign' && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/oak_sign.png" className="w-1/2 h-1/2 pixelated drop-shadow-md animate-bounce" /></div>}
                                            {specialInfo?.type === 'poppy' && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/poppy.png" className="w-1/2 h-1/2 pixelated drop-shadow-md animate-bounce" /></div>}
{specialInfo?.type === 'poop' && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    {specialInfo.isWatery ? (
                                                        // 水便的噁心視覺效果：較大、綠褐色調、半透明、滲出感
                                                        <McImg 
                                                            src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/mud.png" 
                                                            className="w-2/3 h-2/3 pixelated drop-shadow-xl opacity-90 sepia hue-rotate-[70deg] contrast-125 animate-pulse" // 加上 sepia 和 hue-rotate 讓它變黃綠色，animate-pulse 讓它有呼吸感
                                                            style={{ imageRendering: 'pixelated' }}
                                                        />
                                                    ) : (
                                                        // 普通大便
                                                        <McImg 
                                                            src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/cocoa_beans.png"
                                                            className="w-1/2 h-1/2 pixelated drop-shadow-md animate-bounce" 
                                                        />
                                                    )}
                                                </div>
                                            )}                                           {specialInfo?.type === 'photo_map' && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><McImg src="https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/filled_map.png" className="w-1/2 h-1/2 pixelated drop-shadow-md animate-bounce" /></div>}
                                            {specialInfo?.type === 'gift_box' && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><McImg src="https://i.postimg.cc/bwPx54VC/Minecraft-Chest.jpg" className="w-3/4 h-3/4 pixelated drop-shadow-md animate-pulse" /></div>}
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {isViewingSelf && (
                                <button onClick={() => requestExpand('right')} className="sticky right-0 top-0 bottom-0 w-8 flex-shrink-0 bg-stone-800 bg-opacity-60 hover:bg-opacity-80 text-white font-black z-20 flex items-center justify-center border-l border-gray-600 transition-all">➕</button>
                            )}
                        </div>
                    </div>

                    <div className="w-full flex flex-col sm:flex-row justify-between items-center mt-3 gap-2 shrink-0">
                        {isViewingSelf && (
                            <button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges} className={`font-black px-6 py-2 border-2 shadow-lg w-full sm:w-auto ${hasUnsavedChanges ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-black animate-pulse' : 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed'}`}>
                                {isSaving ? '儲存中...' : (hasUnsavedChanges ? '💾 儲存進度' : '進度已儲存')}
                            </button>
                        )}
                        
                        <div className="flex justify-center space-x-[2px] p-[2px] bg-[#3a3a3a] border-4 border-[#222] shadow-2xl mx-auto">
                            {hotbar.map((blockId, idx) => {
                                const isActive = activeHotbarIndex === idx;
                                const bInfo = blockId ? BLOCK_TYPES.find(b => b.id === blockId) : null;
                                const count = blockId && !bInfo?.special ? localInventory[blockId] || 0 : '';
                                
                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => setActiveHotbarIndex(idx)}
                                        className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center relative cursor-pointer bg-[#8b8b8b] transition-all
                                            ${isActive ? 'border-4 border-white z-10 scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-2 border-[#555] hover:bg-[#a0a0a0]'}`}
                                    >
                                        {bInfo && <McImg src={bInfo.img} className="w-[80%] h-[80%] pixelated drop-shadow-md pointer-events-none" style={bInfo.storeStyle} />}
                                        {count !== '' && count > 0 && <span className="absolute bottom-0 right-[2px] text-white text-[10px] sm:text-xs font-black drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{count}</span>}
                                        <span className={`absolute top-0 left-[2px] text-[8px] font-black ${isActive?'text-amber-300':'text-gray-300'} drop-shadow-[1px_1px_0_rgba(0,0,0,1)]`}>{idx + 1}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

<div className="w-full h-auto md:h-full md:w-1/4 bg-[#2d2d2d] p-2 md:p-3 flex flex-col border-t-4 md:border-t-0 md:border-l-4 border-[#111111] shrink-0 relative">
                    <h3 className="text-amber-400 font-bold border-b-2 border-gray-600 pb-2 mb-2 shrink-0 flex justify-between items-center">
                        <span>💰 方塊商店</span>
                        <span className="text-sm bg-stone-800 bg-opacity-50 px-2 py-1 rounded border border-gray-600 truncate">💎 {mcData.diamonds}</span>
                    </h3>

                    {isViewingSelf && (
                        <>
                            <button onClick={() => { playChestOpenSound(); setIsChestOpen(true); }} className="w-full bg-[#8b5a2b] hover:bg-[#a06830] border-2 border-[#3e2723] p-2 mb-2 rounded shadow-md flex items-center justify-center space-x-2 transition-colors shrink-0">
                                <McImg src="https://i.postimg.cc/bwPx54VC/Minecraft-Chest.jpg" className="w-6 h-6 pixelated drop-shadow-lg" fallback="📦" />
                                <span className="text-white font-bold text-sm">打開大背包 (裝備至快捷列)</span>
                            </button>
                            <button onClick={() => setShowInbox(true)} className="w-full bg-amber-600 hover:bg-amber-500 border-2 border-[#1e3a8a] p-2 mb-2 rounded shadow-md flex items-center justify-center space-x-2 transition-colors shrink-0">
                                <span className="text-white font-bold text-sm">📥 收件箱 ({(mcData.inbox || []).filter(i => i.expiresAt > Date.now()).length})</span>
                            </button>
                        </>
                    )}

                    {isViewingSelf ? (
                        <div className="flex flex-wrap gap-1 mb-2 shrink-0 border-b border-gray-600 pb-2">
                            {CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => setActiveCategory(cat)} className={`text-[10px] px-2 py-1 font-bold ${activeCategory === cat ? 'bg-amber-500 text-stone-800' : 'bg-gray-600 text-white hover:bg-gray-500'}`}>
                                    {cat.replace('(需解鎖)', '')}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-amber-900 bg-opacity-50 border border-amber-500 p-2 mb-2 shrink-0 flex flex-col gap-1">
                            <p className="text-xs text-amber-200 font-bold mb-1">參觀模式工具：</p>
                            
                            <button onClick={() => { 
                                const h = [...hotbar]; 
                                h[activeHotbarIndex] = null; 
                                setHotbar(h); 
                            }} className={`w-full py-1 text-xs font-bold border ${!selectedBlock ? 'bg-stone-100 border-white text-stone-800 shadow-inner' : 'bg-gray-700 text-gray-300 border-gray-500'}`}>🤚 空手</button>

                            <button onClick={() => { 
                                const h = [...hotbar]; 
                                const existingIdx = h.indexOf('poppy');
                                if (existingIdx !== -1) h[existingIdx] = null;
                                h[activeHotbarIndex] = 'poppy'; 
                                setHotbar(h); 
                            }} className={`w-full py-1 text-xs font-bold border ${selectedBlock === 'poppy' ? 'bg-rose-500 border-stone-600700 text-white' : 'bg-gray-700 text-gray-300 border-gray-500'}`}>🌺 送小花</button>
                            <button onClick={() => { 
                                const h = [...hotbar]; 
                                const existingIdx = h.indexOf('sign');
                                if (existingIdx !== -1) h[existingIdx] = null;
                                h[activeHotbarIndex] = 'sign'; 
                                setHotbar(h); 
                            }} className={`w-full py-1 text-xs font-bold border ${selectedBlock === 'sign' ? 'bg-amber-600 border-amber-800 text-white' : 'bg-gray-700 text-gray-300 border-gray-500'}`}>📜 留告示牌</button>
                            <button onClick={() => { 
                                const h = [...hotbar]; 
                                const existingIdx = h.indexOf('poop');
                                if (existingIdx !== -1) h[existingIdx] = null;
                                h[activeHotbarIndex] = 'poop'; 
                                setHotbar(h); 
                            }} className={`w-full py-1 text-xs font-bold border ${selectedBlock === 'poop' ? 'bg-amber-800 border-amber-950 text-white' : 'bg-gray-700 text-gray-300 border-gray-500'}`}>💩 放大便</button>
                            <button onClick={() => { 
                                const h = [...hotbar]; 
                                const existingIdx = h.indexOf('photo_map');
                                if (existingIdx !== -1) h[existingIdx] = null;
                                h[activeHotbarIndex] = 'photo_map'; 
                                setHotbar(h); 
                            }} className={`w-full py-1 text-xs font-bold border ${selectedBlock === 'photo_map' ? 'bg-emerald-600 border-emerald-800 text-white' : 'bg-gray-700 text-gray-300 border-gray-500'}`}>📸 寄照片 (50💎)</button>
                        </div>
                    )}

                    {isViewingSelf && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-1 md:overflow-y-auto custom-scrollbar pr-1 flex-grow content-start pb-4">
                            {(activeCategory === '全部' || activeCategory === '裝飾與植物') && BLOCK_TYPES.filter(b => b.special && isViewingSelf && b.id !== 'poppy' && b.id !== 'gift_box').map(block => (
                                <div key={block.id} className="flex flex-col items-center p-1 border border-gray-600 bg-stone-800 transition-all hover:bg-gray-700">
                                    {block.img && <McImg src={block.img} className="w-6 h-6 pixelated mb-1 drop-shadow-md" style={block.storeStyle} fallback="🔧"/>}
                                    <span className="text-[9px] text-white font-bold mb-1 text-center w-full truncate">{block.name}</span>
                                    <button onClick={() => { 
                                        const h = [...hotbar]; 
                                        const existingIdx = h.indexOf(block.id);
                                        if (existingIdx !== -1) h[existingIdx] = null;
                                        h[activeHotbarIndex] = block.id; 
                                        setHotbar(h); 
                                    }} className="text-[9px] w-full py-1 font-bold border bg-gray-600 text-white border-gray-500 hover:bg-gray-500">放快捷列</button>
                                </div>
                            ))}
                            {displayedBlocks.map(block => (
                                <div key={block.id} className="flex flex-col items-center p-1 border border-gray-600 bg-stone-800 transition-all hover:bg-gray-700">
                                    <div className="relative w-full flex justify-center cursor-pointer group" onClick={() => { 
                                        const h = [...hotbar]; 
                                        const existingIdx = h.indexOf(block.id);
                                        if (existingIdx !== -1) h[existingIdx] = null;
                                        h[activeHotbarIndex] = block.id; 
                                        setHotbar(h); 
                                    }}>
                                        <McImg src={block.img} className="w-6 h-6 pixelated mb-1 drop-shadow-md group-hover:scale-110 transition-transform" style={block.storeStyle} fallback="📦"/>
                                    </div>
                                    <span className="text-[9px] text-white font-bold mb-1 text-center w-full truncate" title={block.name}>{block.name}</span>
                                    <span className="text-[8px] text-amber-300 font-bold mb-1 bg-stone-800 bg-opacity-40 px-1 rounded-full w-full text-center">{block.price} 💎</span>
                                    <button onClick={() => setBuyModal({ block, amount: 1 })} className="mt-auto text-[9px] w-full py-1 font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-inner border border-amber-400">購買</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {chestUi && (
                <div className="absolute inset-0 z-[110] bg-stone-800 bg-opacity-70 flex flex-col items-center justify-center p-4">
                    <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] p-3 w-full max-w-2xl shadow-2xl relative">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <h3 className="text-[#373737] font-bold text-lg">📦 實體儲物箱</h3>
                            <button onClick={() => { playChestCloseSound(); setChestUi(null); }} className="text-red-600 font-black text-xl hover:scale-110">✖</button>
                        </div>
                        <p className="text-[#373737] font-bold mb-1">箱子內部 (點擊取出)</p>
                        <div className="bg-[#8b8b8b] p-2 grid grid-cols-6 sm:grid-cols-9 gap-1 border-2 border-[#373737] shadow-inner h-32 overflow-y-auto mb-4 content-start">
                            {Object.entries(specials[currentDimension][chestUi.index]?.items || {}).filter(([id, count]) => count > 0).map(([id, count]) => {
                                const bInfo = BLOCK_TYPES.find(b => b.id === id);
                                if (!bInfo) return null;
                                return (
                                    <div key={`chest-${id}`} onClick={() => handleChestItemTransfer(id, 'toLocal')} className="bg-[#8b8b8b] border-2 border-[#FCFBF7] border-r-[#373737] border-b-[#373737] aspect-square flex flex-col items-center justify-center relative hover:bg-[#a0a0a0] cursor-pointer">
                                        <McImg src={bInfo.img} className="w-8 h-8 pixelated drop-shadow-md" style={bInfo.storeStyle} />
                                        <span className="absolute bottom-0 right-1 text-white text-[10px] font-black drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[#373737] font-bold mb-1">我的庫存 (點擊放入)</p>
                        <div className="bg-[#8b8b8b] p-2 grid grid-cols-6 sm:grid-cols-9 gap-1 border-2 border-[#373737] shadow-inner h-32 overflow-y-auto content-start">
                            {Object.entries(localInventory).filter(([id, count]) => count > 0).map(([id, count]) => {
                                const bInfo = BLOCK_TYPES.find(b => b.id === id);
                                if (!bInfo) return null;
                                return (
                                    <div key={`inv-${id}`} onClick={() => handleChestItemTransfer(id, 'toChest')} className="bg-[#8b8b8b] border-2 border-[#FCFBF7] border-r-[#373737] border-b-[#373737] aspect-square flex flex-col items-center justify-center relative hover:bg-[#a0a0a0] cursor-pointer">
                                        <McImg src={bInfo.img} className="w-8 h-8 pixelated drop-shadow-md" style={bInfo.storeStyle} />
                                        <span className="absolute bottom-0 right-1 text-white text-[10px] font-black drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {isChestOpen && (
                <div 
                    className="absolute inset-0 z-[100] bg-stone-800 bg-opacity-70 flex items-center justify-center p-4"
                    onDragOver={e => e.preventDefault()} 
                    onDrop={handleInventoryDrop} 
                >
                    <div className="bg-[#c6c6c6] border-4 border-white border-r-[#555] border-b-[#555] p-3 w-full max-w-2xl shadow-2xl relative">
                        <div className="flex justify-between items-center mb-2 px-1 border-b-2 border-gray-400 pb-1">
                            <div>
                                <h3 className="text-[#373737] font-bold text-lg inline-block">🧰 我的庫存</h3>
                                <span className="text-xs text-amber-700 ml-2 font-bold block sm:inline-block">
                                    快捷列 (裝備捷徑，清空不消耗庫存)：拖放裝備，往上拖或雙擊即可清空。
                                </span>
                            </div>
                            <button onClick={() => { playChestCloseSound(); setIsChestOpen(false); setDragActiveBlock(null); }} className="text-red-600 font-black text-xl hover:scale-110">✖</button>
                        </div>
                        
                        <div className="bg-[#8b8b8b] p-2 grid grid-cols-6 sm:grid-cols-9 gap-1 border-2 border-[#373737] shadow-inner h-[30vh] overflow-y-auto content-start">
                            {Object.entries(localInventory).filter(([id, count]) => count > 0 || ['erase'].includes(id)).map(([id, count]) => {
                                const bInfo = BLOCK_TYPES.find(b => b.id === id);
                                if (!bInfo) return null;
                                return (
                                    <div 
                                        key={id} 
                                        draggable 
                                        onDragStart={(e) => handleDragStart(e, 'inventory', id)}
                                        onClick={() => setDragActiveBlock(id)} 
                                        className={`bg-[#8b8b8b] border-2 aspect-square flex flex-col items-center justify-center relative group hover:bg-[#a0a0a0] cursor-pointer transition-all ${dragActiveBlock === id ? 'border-amber-300 shadow-[0_0_10px_yellow]' : 'border-[#FCFBF7] border-r-[#373737] border-b-[#373737]'}`}
                                    >
                                        <McImg src={bInfo.img} className="w-8 h-8 pixelated drop-shadow-md pointer-events-none" style={bInfo.storeStyle} />
                                        {count > 0 && <span className="absolute bottom-0 right-1 text-white text-[10px] font-black drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{count}</span>}
                                        <div className="hidden group-hover:block absolute -top-6 left-1/2 transform -tranamber-x-1/2 bg-stone-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 border border-gray-400">{bInfo.name}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <h3 className="text-[#373737] font-bold text-sm mt-3 mb-1 px-1">📥 快捷列 (請在此拖放或點擊替換)</h3>
                        <div className="flex justify-center gap-1 sm:gap-2 p-2 bg-[#5c5c5c] border-2 border-[#373737] shadow-inner">
                            {hotbar.map((blockId, idx) => {
                                const bInfo = blockId ? BLOCK_TYPES.find(b => b.id === blockId) : null;
                                const count = blockId && !bInfo?.special ? localInventory[blockId] || 0 : '';
                                return (
                                    <div 
                                        key={`hotbar-edit-${idx}`}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => handleHotbarDrop(e, idx)}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, 'hotbar', idx)}
                                        onDoubleClick={() => {
                                            const newHotbar = [...hotbar];
                                            newHotbar[idx] = null;
                                            setHotbar(newHotbar);
                                        }}
                                        onClick={() => {
                                            if (dragActiveBlock) {
                                                const newHotbar = [...hotbar];
                                                const existingIdx = newHotbar.indexOf(dragActiveBlock);
                                                if (existingIdx !== -1) newHotbar[existingIdx] = null;
                                                newHotbar[idx] = dragActiveBlock;
                                                setHotbar(newHotbar);
                                                setDragActiveBlock(null);
                                            }
                                        }}
                                        className="w-10 h-10 sm:w-12 sm:h-12 bg-[#8b8b8b] border-2 border-[#FCFBF7] border-r-[#373737] border-b-[#373737] flex items-center justify-center relative cursor-pointer hover:bg-[#a0a0a0] transition-colors"
                                    >
                                        {bInfo && <McImg src={bInfo.img} className="w-[80%] h-[80%] pixelated drop-shadow-md pointer-events-none" style={bInfo.storeStyle} />}
                                        {count !== '' && count > 0 && <span className="absolute bottom-0 right-[2px] text-white text-[10px] font-black drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{count}</span>}
                                        <span className="absolute top-0 left-[2px] text-[8px] font-black text-gray-300 drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{idx + 1}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {buyModal && (
                <div className="absolute inset-0 z-[100] bg-stone-800 bg-opacity-70 flex flex-col items-center justify-center p-4">
                    <div className="bg-[#333] border-4 border-gray-600 p-6 w-full max-w-xs shadow-2xl flex flex-col items-center relative">
                        <h3 className="text-white font-bold mb-4 text-lg">購買 【{buyModal.block.name}】</h3>
                        <McImg src={buyModal.block.img} className="w-16 h-16 pixelated mb-4 drop-shadow-lg" style={buyModal.block.storeStyle} />
                        <div className="flex items-center space-x-4 mb-4">
                            <button onClick={() => setBuyModal({...buyModal, amount: Math.max(1, buyModal.amount - 1)})} className="bg-gray-700 text-white w-8 h-8 font-black border-2 border-gray-500 hover:bg-gray-600">-</button>
                            <input type="number" value={buyModal.amount} onChange={(e) => setBuyModal({...buyModal, amount: Math.max(1, parseInt(e.target.value) || 1)})} className="w-16 text-center font-bold p-1 border-2 border-gray-500 bg-stone-900 text-white outline-none"/>
                            <button onClick={() => setBuyModal({...buyModal, amount: buyModal.amount + 1})} className="bg-gray-700 text-white w-8 h-8 font-black border-2 border-gray-500 hover:bg-gray-600">+</button>
                        </div>
                        <p className="text-amber-400 font-bold mb-6">總價：{buyModal.block.price * buyModal.amount} 💎</p>
                        <div className="flex space-x-2 w-full">
                            <button onClick={() => setBuyModal(null)} className="flex-1 bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 border-2 border-black">取消</button>
                            <button onClick={handleConfirmBuy} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 border-2 border-black">確認購買</button>
                        </div>
                    </div>
                </div>
            )}

            {signModal !== null && (
                <div className="absolute inset-0 z-[100] bg-stone-800 bg-opacity-70 flex flex-col items-center justify-center p-4">
                    <div className="bg-[#d4a373] border-8 border-[#8b5a2b] p-6 w-full max-w-sm shadow-2xl flex flex-col items-center pixelated-border">
                        <h3 className="text-[#3e2723] font-black mb-4 text-lg">✏️ 留下告示牌訊息</h3>
                        <textarea id="signInput" placeholder="請輸入留言 (最多30字)..." maxLength="30" className="w-full h-24 p-2 bg-[#faedcd] border-2 border-[#8b5a2b] text-[#3e2723] font-bold outline-none resize-none mb-4 custom-scrollbar"></textarea>
                        <p className="text-[#3e2723] font-bold text-xs mb-4">放置消耗：10 💎</p>
                        <div className="flex space-x-2 w-full">
                            <button onClick={() => setSignModal(null)} className="flex-1 bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 border-2 border-black">取消</button>
                            <button onClick={submitSign} className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 border-2 border-black">插上</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}