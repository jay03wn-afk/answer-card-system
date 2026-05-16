// JayChemDraw.jsx - 專業網頁化學繪圖引擎
const JayChemDrawModal = React.memo(({ onSave, onClose }) => {
    const { useState, useRef, useEffect } = React;
    const svgRef = useRef(null);

    const [atoms, setAtoms] = useState([]);
    const [bonds, setBonds] = useState([]);
    const [history, setHistory] = useState([]); 
    
    // 工具狀態: draw, erase, atom, ring*, benzene, select, template, charge_plus, charge_minus
    const [tool, setTool] = useState('draw'); 
    const [activeBond, setActiveBond] = useState('single'); 
    const [activeElement, setActiveElement] = useState('C');
    const [customElement, setCustomElement] = useState('');
    
    const [showTerminalC, setShowTerminalC] = useState(false); 
    const [monochromeAtoms, setMonochromeAtoms] = useState(false);
    
    const [draggingNode, setDraggingNode] = useState(null);
    const [dragLine, setDragLine] = useState(null);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [hoveredBond, setHoveredBond] = useState(null); 
    
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const [draggingRing, setDraggingRing] = useState(null);
    const [previewRing, setPreviewRing] = useState(null);

    const [alertConfig, setAlertConfig] = useState(null); 
    const [confirmConfig, setConfirmConfig] = useState(null); 
    const [promptConfig, setPromptConfig] = useState(null); // ✨ 新增：命名輸入視窗

    const [selectedAtoms, setSelectedAtoms] = useState([]);
    const [selectionBox, setSelectionBox] = useState(null);
    const [isDraggingSelection, setIsDraggingSelection] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    // --- ✨ 模板系統 (結合 localStorage 持久化) ---
    const PREDEFINED_TEMPLATES = [
        { name: '六碳醣', atoms: [{id:'1',x:0,y:-35,element:'O'},{id:'2',x:35,y:-15,element:'C'},{id:'3',x:35,y:25,element:'C'},{id:'4',x:0,y:45,element:'C'},{id:'5',x:-35,y:25,element:'C'},{id:'6',x:-35,y:-15,element:'C'}], bonds: [{id:'b1',a1:'1',a2:'2',type:'single',order:1},{id:'b2',a1:'2',a2:'3',type:'single',order:1},{id:'b3',a1:'3',a2:'4',type:'thick',order:1},{id:'b4',a1:'4',a2:'5',type:'thick',order:1},{id:'b5',a1:'5',a2:'6',type:'single',order:1},{id:'b6',a1:'6',a2:'1',type:'single',order:1}] }
    ];
    
    const [customTemplates, setCustomTemplates] = useState(() => {
        try {
            const saved = localStorage.getItem('JayChemDraw_CustomTemplates');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });
    
    const [activeTemplate, setActiveTemplate] = useState(null);

    useEffect(() => {
        localStorage.setItem('JayChemDraw_CustomTemplates', JSON.stringify(customTemplates));
    }, [customTemplates]);

    const BOND_LENGTH = 40; 
    const snap = (val) => Math.round(val / BOND_LENGTH) * BOND_LENGTH;

    const pushHistory = () => {
        setHistory(prev => [...prev, { atoms: JSON.parse(JSON.stringify(atoms)), bonds: JSON.parse(JSON.stringify(bonds)) }]);
    };
    
    const handleUndo = () => {
        if (history.length > 0) {
            const last = history[history.length - 1];
            setAtoms(last.atoms); setBonds(last.bonds);
            setSelectedAtoms([]); 
            setHistory(prev => prev.slice(0, -1));
        }
    };

    const handleDeleteSelection = () => {
        if (selectedAtoms.length === 0) return;
        pushHistory();
        setBonds(prev => prev.filter(b => !selectedAtoms.includes(b.a1) && !selectedAtoms.includes(b.a2)));
        setAtoms(prev => prev.filter(a => !selectedAtoms.includes(a.id)));
        setSelectedAtoms([]);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); handleUndo(); }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAtoms.length > 0) {
                e.preventDefault(); handleDeleteSelection();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, selectedAtoms, atoms, bonds]);

    const getMouseCoords = (e) => {
        const rect = svgRef.current.getBoundingClientRect();
        return { x: (e.clientX - rect.left - pan.x) / scale, y: (e.clientY - rect.top - pan.y) / scale };
    };

    // ✨ 電荷與容量計算系統
    const getCapacity = (el, charge = 0) => {
        const base = { C: 4, N: 3, O: 2, S: 2, P: 3, F: 1, Cl: 1, Br: 1, I: 1 }[el] || 0;
        if (el === 'C') return Math.max(0, base - Math.abs(charge)); // C+ 與 C- 均為 3 鍵
        if (el === 'N') return Math.max(0, base + charge); // N+ -> 4 鍵, N- -> 2 鍵
        if (el === 'O') return Math.max(0, base + charge); // O+ -> 3 鍵, O- -> 1 鍵
        if (['F','Cl','Br','I'].includes(el)) return Math.max(0, base + charge);
        return base;
    };
    
    const getAtomColor = (el) => monochromeAtoms ? '#1f2937' : (el === 'O' ? '#ef4444' : el === 'N' ? '#3b82f6' : el === 'S' ? '#eab308' : el === 'P' ? '#f97316' : '#1f2937');
    
    const atomsWithH = atoms.map(atom => {
        const connectedBonds = bonds.filter(b => b.a1 === atom.id || b.a2 === atom.id);
        const bondCount = connectedBonds.reduce((acc, b) => acc + (b.order || 1), 0);
        const c = atom.charge || 0;
        const hCount = Math.max(0, getCapacity(atom.element, c) - bondCount);
        
        const isCarbon = atom.element === 'C';
        // 帶電碳原子強制顯示
        const shouldShow = !isCarbon || bondCount === 0 || (bondCount === 1 && showTerminalC) || c !== 0;
        
        let isLeftNode = false;
        if (connectedBonds.length > 0) {
            const connectedAtoms = connectedBonds.map(b => atoms.find(a => a.id === (b.a1 === atom.id ? b.a2 : b.a1)));
            const avgX = connectedAtoms.reduce((sum, a) => sum + a.x, 0) / connectedAtoms.length;
            if (atom.x < avgX - 5) isLeftNode = true; 
        }
        return { ...atom, hCount, bondCount, shouldShow, isLeftNode, charge: c };
    });

    const handleWheel = (e) => {
        e.preventDefault();
        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.min(Math.max(scale * zoomFactor, 0.3), 3);
        setPan({ x: mouseX - (mouseX - pan.x) * (newScale / scale), y: mouseY - (mouseY - pan.y) * (newScale / scale) });
        setScale(newScale);
    };

    const getHoveredElements = (x, y) => {
        // ✨ Hitbox 縮小：原子 18px -> 10px，鍵結 12px -> 8px
        const atom = atoms.find(a => Math.abs(a.x - x) < 10 && Math.abs(a.y - y) < 10);
        const bond = !atom && bonds.find(b => {
            const a1 = atoms.find(a => a.id === b.a1); const a2 = atoms.find(a => a.id === b.a2);
            if (!a1 || !a2) return false;
            const l2 = Math.pow(a1.x - a2.x, 2) + Math.pow(a1.y - a2.y, 2);
            if (l2 === 0) return false;
            let t = Math.max(0, Math.min(1, ((x - a1.x) * (a2.x - a1.x) + (y - a1.y) * (a2.y - a1.y)) / l2));
            const pX = a1.x + t * (a2.x - a1.x); const pY = a1.y + t * (a2.y - a1.y);
            return Math.sqrt(Math.pow(x - pX, 2) + Math.pow(y - pY, 2)) < 8; 
        });
        return { atom, bond };
    };

    const handleSvgMouseDown = (e) => {
        if (e.button === 1 || e.button === 2 || e.altKey) {
            e.preventDefault(); setIsPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            return;
        }
        if (e.button !== 0) return;

        const { x, y } = getMouseCoords(e);
        const { atom: clickedAtom, bond: clickedBond } = getHoveredElements(x, y);

        if (tool === 'select') {
            if (clickedAtom && selectedAtoms.includes(clickedAtom.id)) {
                pushHistory(); 
                setIsDraggingSelection(true);
                setLastMousePos({ x, y });
                
                // 拖動時立刻斷開跨界鍵結
                setBonds(prevBonds => prevBonds.filter(b => {
                    const isA1Selected = selectedAtoms.includes(b.a1);
                    const isA2Selected = selectedAtoms.includes(b.a2);
                    return isA1Selected === isA2Selected;
                }));
                
            } else {
                setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
                setSelectedAtoms([]); 
            }
        } else if (tool === 'template' && activeTemplate) {
            pushHistory();
            let newAtoms = [...atoms];
            let newBonds = [...bonds];
            let idMap = {};
            
            // ✨ 模板防扭曲邏輯：僅對齊基準點，原子相對座標一比一貼上
            const baseX = snap(x);
            const baseY = snap(y);

            activeTemplate.atoms.forEach((ta, idx) => {
                const newId = Date.now() + idx;
                idMap[ta.id] = newId;
                newAtoms.push({ id: newId, x: baseX + ta.x, y: baseY + ta.y, element: ta.element, charge: ta.charge || 0 });
            });
            activeTemplate.bonds.forEach((tb, idx) => {
                newBonds.push({ id: Date.now() + 100 + idx, a1: idMap[tb.a1], a2: idMap[tb.a2], type: tb.type, order: tb.order });
            });
            setAtoms(newAtoms);
            setBonds(newBonds);
            setTool('draw');
        } else if (tool === 'charge_plus') {
            if (clickedAtom) {
                pushHistory();
                setAtoms(atoms.map(a => a.id === clickedAtom.id ? { ...a, charge: (a.charge || 0) + 1 } : a));
            }
        } else if (tool === 'charge_minus') {
            if (clickedAtom) {
                pushHistory();
                setAtoms(atoms.map(a => a.id === clickedAtom.id ? { ...a, charge: (a.charge || 0) - 1 } : a));
            }
        } else if (tool === 'draw') {
            setSelectedAtoms([]); 
            if (clickedAtom) {
                setDraggingNode(clickedAtom.id);
                setDragLine({ x1: clickedAtom.x, y1: clickedAtom.y, x2: x, y2: y, type: activeBond });
            } else if (clickedBond) {
                pushHistory();
                setBonds(bonds.map(b => {
                    if (b.id === clickedBond.id) {
                        // 如果目前選取的是「單鍵」，執行雙/三鍵循環
                        if (activeBond === 'single') {
                            if (b.type === 'single' || b.order === 1) return { ...b, type: 'double', order: 2 };
                            if (b.type === 'double') return { ...b, type: 'double_sym', order: 2 };
                            if (b.type === 'double_sym' || b.order === 2) return { ...b, type: 'triple', order: 3 };
                            return { ...b, type: 'single', order: 1 };
                        } else {
                            // 如果拿著其他特殊鍵(入紙面/出紙面)去點擊，直接取代原本的鍵
                            // 如果已經是該鍵了，則反轉方向 (a1 與 a2 對調)
                            if (b.type === activeBond) {
                                return { ...b, a1: b.a2, a2: b.a1 };
                            }
                            const order = activeBond.startsWith('double') ? 2 : (activeBond === 'triple' ? 3 : 1);
                            return { ...b, type: activeBond, order };
                        }
                    }
                    return b;
                }));
            } else {
                pushHistory();
                const newId = Date.now();
                const sX = snap(x); const sY = snap(y);
                setAtoms([...atoms, { id: newId, x: sX, y: sY, element: activeElement, charge: 0 }]);
                setDraggingNode(newId);
                setDragLine({ x1: sX, y1: sY, x2: x, y2: y, type: activeBond });
            }
        } else if (tool === 'erase') {
            if (clickedAtom || clickedBond) pushHistory();
            if (clickedAtom) {
                setAtoms(atoms.filter(a => a.id !== clickedAtom.id));
                setBonds(bonds.filter(b => b.a1 !== clickedAtom.id && b.a2 !== clickedAtom.id));
                setHoveredNode(null);
            } else if (clickedBond) {
                setBonds(bonds.filter(b => b.id !== clickedBond.id));
                setHoveredBond(null);
            }
        } else if (tool.startsWith('ring') || tool === 'benzene') {
            const sides = tool === 'benzene' ? 6 : parseInt(tool.replace('ring', ''));
            if (clickedAtom) {
                setDraggingRing({ type: 'atom', anchorId: clickedAtom.id, sides, isBenzene: tool === 'benzene', x: clickedAtom.x, y: clickedAtom.y });
            } else if (clickedBond) {
                setDraggingRing({ type: 'bond', anchorBond: clickedBond, sides, isBenzene: tool === 'benzene' });
            } else {
                const sX = snap(x); const sY = snap(y);
                setDraggingRing({ type: 'free', sides, isBenzene: tool === 'benzene', x: sX, y: sY });
            }
        }
    };

    const handleSvgMouseMove = (e) => {
        if (isPanning) { setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); return; }
        const { x, y } = getMouseCoords(e);
        const { atom: hoveredAtom, bond: hBond } = getHoveredElements(x, y);
        
        setHoveredNode(hoveredAtom ? hoveredAtom.id : null);
        setHoveredBond(!hoveredAtom && hBond ? hBond.id : null);

        if (selectionBox) {
            setSelectionBox({ ...selectionBox, endX: x, endY: y });
            return;
        }

        if (isDraggingSelection) {
            const dx = x - lastMousePos.x;
            const dy = y - lastMousePos.y;
            setAtoms(atoms.map(a => selectedAtoms.includes(a.id) ? { ...a, x: a.x + dx, y: a.y + dy } : a));
            setLastMousePos({ x, y });
            return;
        }

        if (draggingRing) {
            const generatePreviewRing = (mouseX, mouseY, angle, sides, isBenzene, anchorBond) => {
                let pAtoms = []; let pBonds = [];
                if (anchorBond) {
                    const a1 = atoms.find(a => a.id === anchorBond.a1); const a2 = atoms.find(a => a.id === anchorBond.a2);
                    if(!a1 || !a2) return null;
                    const midX = (a1.x + a2.x) / 2; const midY = (a1.y + a2.y) / 2;
                    const dx = a2.x - a1.x; const dy = a2.y - a1.y;
                    let nx = -dy; let ny = dx;
                    const len = Math.sqrt(nx*nx + ny*ny); nx /= len; ny /= len;
                    if (nx * (mouseX - midX) + ny * (mouseY - midY) < 0) { nx = -nx; ny = -ny; }
                    const apothema = (BOND_LENGTH / 2) / Math.tan(Math.PI / sides);
                    const cx = midX + nx * apothema; const cy = midY + ny * apothema;
                    const r = BOND_LENGTH / (2 * Math.sin(Math.PI / sides));
                    const startAngle = Math.atan2(a1.y - cy, a1.x - cx);
                    for(let i=0; i<sides; i++) {
                        const vAngle = startAngle + i * (2 * Math.PI / sides);
                        pAtoms.push({ id: `p_a_${i}`, x: cx + r * Math.cos(vAngle), y: cy + r * Math.sin(vAngle), element: 'C' });
                    }
                } else {
                    const r = BOND_LENGTH / (2 * Math.sin(Math.PI / sides));
                    const cx = mouseX + r * Math.cos(angle); const cy = mouseY + r * Math.sin(angle);
                    for(let i=0; i<sides; i++) {
                        const vAngle = angle + Math.PI + i * (2 * Math.PI / sides);
                        pAtoms.push({ id: `p_a_${i}`, x: cx + r * Math.cos(vAngle), y: cy + r * Math.sin(vAngle), element: 'C' });
                    }
                }
                for(let i=0; i<sides; i++) {
                    const isDouble = isBenzene && i % 2 === 0;
                    pBonds.push({ id: `p_b_${i}`, a1: pAtoms[i].id, a2: pAtoms[(i+1)%sides].id, type: isDouble ? 'double' : 'single', order: isDouble ? 2 : 1 });
                }
                return { atoms: pAtoms, bonds: pBonds };
            };

            if (draggingRing.type === 'bond') {
                setPreviewRing(generatePreviewRing(x, y, 0, draggingRing.sides, draggingRing.isBenzene, draggingRing.anchorBond));
            } else {
                let dx = x - draggingRing.x; let dy = y - draggingRing.y;
                let angle = Math.atan2(dy, dx);
                angle = Math.round(angle / (Math.PI / 6)) * (Math.PI / 6); 
                setPreviewRing(generatePreviewRing(draggingRing.x, draggingRing.y, angle, draggingRing.sides, draggingRing.isBenzene, null));
            }
            return;
        }

        if (!draggingNode) return;

        if (hoveredAtom) {
            setDragLine({ ...dragLine, x2: hoveredAtom.x, y2: hoveredAtom.y });
        } else {
            const startAtom = atoms.find(a => a.id === draggingNode);
            if (startAtom) {
                let angle = Math.atan2(y - startAtom.y, x - startAtom.x);
                angle = Math.round(angle / (Math.PI / 6)) * (Math.PI / 6);
                setDragLine({ ...dragLine, x2: startAtom.x + Math.cos(angle) * BOND_LENGTH, y2: startAtom.y + Math.sin(angle) * BOND_LENGTH });
            }
        }
    };

    const handleSvgMouseUp = () => {
        if (isPanning) { setIsPanning(false); return; }

        if (selectionBox) {
            const minX = Math.min(selectionBox.startX, selectionBox.endX);
            const maxX = Math.max(selectionBox.startX, selectionBox.endX);
            const minY = Math.min(selectionBox.startY, selectionBox.endY);
            const maxY = Math.max(selectionBox.startY, selectionBox.endY);
            
            const selected = atoms.filter(a => a.x >= minX && a.x <= maxX && a.y >= minY && a.y <= maxY).map(a => a.id);
            setSelectedAtoms(selected);
            setSelectionBox(null);
            return;
        }

        if (isDraggingSelection) {
            setIsDraggingSelection(false);
            setAtoms(atoms.map(a => selectedAtoms.includes(a.id) ? { ...a, x: snap(a.x), y: snap(a.y) } : a));
            return;
        }

        if (draggingRing) {
            pushHistory();
            const ringData = previewRing; 
            if (ringData) {
                let newAtoms = [...atoms]; let newBonds = [...bonds]; let idMap = {};
                ringData.atoms.forEach((pa, idx) => {
                    let existing = newAtoms.find(a => Math.abs(a.x - pa.x) < 15 && Math.abs(a.y - pa.y) < 15);
                    if (existing) idMap[pa.id] = existing.id;
                    else {
                        const newId = Date.now() + idx; idMap[pa.id] = newId;
                        newAtoms.push({ id: newId, x: pa.x, y: pa.y, element: 'C', charge: 0 });
                    }
                });
                ringData.bonds.forEach((pb, idx) => {
                    const fA1 = idMap[pb.a1]; const fA2 = idMap[pb.a2];
                    const exists = newBonds.find(b => (b.a1 === fA1 && b.a2 === fA2) || (b.a1 === fA2 && b.a2 === fA1));
                    if (!exists) newBonds.push({ id: Date.now() + 100 + idx, a1: fA1, a2: fA2, type: pb.type, order: pb.order });
                });
                setAtoms(newAtoms); setBonds(newBonds);
            }
            setDraggingRing(null); setPreviewRing(null);
        }

        if (draggingNode && dragLine) {
            const dX = dragLine.x2; const dY = dragLine.y2;
            const dist = Math.hypot(dX - dragLine.x1, dY - dragLine.y1);
            
            if (dist < 10) {
                pushHistory();
                setAtoms(atoms.map(a => a.id === draggingNode ? { ...a, element: activeElement, charge: 0 } : a));
            } else {
                pushHistory();
                let targetAtom = atoms.find(a => a.id !== draggingNode && Math.abs(a.x - dX) < 15 && Math.abs(a.y - dY) < 15);
                let currentAtoms = [...atoms];
                if (!targetAtom) {
                    targetAtom = { id: Date.now(), x: dX, y: dY, element: activeElement, charge: 0 };
                    currentAtoms.push(targetAtom);
                    setAtoms(currentAtoms);
                }
                const exists = bonds.find(b => (b.a1 === draggingNode && b.a2 === targetAtom.id) || (b.a1 === targetAtom.id && b.a2 === draggingNode));
                const order = activeBond.startsWith('double') ? 2 : (activeBond === 'triple' ? 3 : 1);
                if (!exists) setBonds([...bonds, { id: Date.now() + 1, a1: draggingNode, a2: targetAtom.id, type: activeBond, order }]);
            }
        }
        setDraggingNode(null); setDragLine(null);
    };

    // ✨ 儲存並命名模板
    const saveAsTemplate = () => {
        if (selectedAtoms.length === 0) return setAlertConfig({message: "請先使用選取工具框選結構！"});
        
        setPromptConfig({
            message: '請為這個自訂模板命名：',
            defaultValue: `自訂結構 ${customTemplates.length + 1}`,
            onConfirm: (name) => {
                if(!name || name.trim() === '') return;
                
                const tAtoms = atoms.filter(a => selectedAtoms.includes(a.id));
                const tBonds = bonds.filter(b => selectedAtoms.includes(b.a1) && selectedAtoms.includes(b.a2));
                
                let minX = 9999, minY = 9999, maxX = -9999, maxY = -9999;
                tAtoms.forEach(a => {
                    if (a.x < minX) minX = a.x; if (a.y < minY) minY = a.y;
                    if (a.x > maxX) maxX = a.x; if (a.y > maxY) maxY = a.y;
                });
                const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
                
                const newTemplate = {
                    name: name.trim(),
                    atoms: tAtoms.map(a => ({ id: a.id, x: a.x - cx, y: a.y - cy, element: a.element, charge: a.charge || 0 })),
                    bonds: tBonds.map(b => ({ id: b.id, a1: b.a1, a2: b.a2, type: b.type, order: b.order }))
                };
                
                setCustomTemplates(prev => [...prev, newTemplate]);
                setAlertConfig({message: `已成功儲存為「${name}」！日後隨時可用。`});
                setSelectedAtoms([]); 
            }
        });
    };

    const handleClear = () => {
        setConfirmConfig({
            message: '確定要清空畫布嗎？',
            onConfirm: () => { pushHistory(); setAtoms([]); setBonds([]); setHoveredNode(null); setHoveredBond(null); setSelectedAtoms([]); }
        });
    };

    const renderBondShape = (x1, y1, x2, y2, type, id, stroke = "#374151") => {
        const dx = x2 - x1; const dy = y2 - y1;
        const len = Math.sqrt(dx*dx + dy*dy);
        if (len === 0) return null;
        const nx = -dy/len; const ny = dx/len;

        if (type === 'double') {
            const main = <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="3" strokeLinecap="round" />;
            const shrink = 0.15;
            const ox1 = x1 + dx * shrink + nx * 5.5; const oy1 = y1 + dy * shrink + ny * 5.5;
            const ox2 = x2 - dx * shrink + nx * 5.5; const oy2 = y2 - dy * shrink + ny * 5.5;
            const offset = <line x1={ox1} y1={oy1} x2={ox2} y2={oy2} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />;
            return <g key={id}>{main}{offset}</g>;
        } else if (type === 'double_sym') {
            const shift = 3; 
            return (
                <g key={id}>
                    <line x1={x1+nx*shift} y1={y1+ny*shift} x2={x2+nx*shift} y2={y2+ny*shift} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
                    <line x1={x1-nx*shift} y1={y1-ny*shift} x2={x2-nx*shift} y2={y2-ny*shift} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
                </g>
            );
        } else if (type === 'triple') {
            const shrink = 0.12;
            const mX1 = x1 + dx*shrink; const mY1 = y1 + dy*shrink;
            const mX2 = x2 - dx*shrink; const mY2 = y2 - dy*shrink;
            return (
                <g key={id}>
                    <line x1={mX1+nx*5} y1={mY1+ny*5} x2={mX2+nx*5} y2={mY2+ny*5} stroke={stroke} strokeWidth="2" strokeLinecap="round" />
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
                    <line x1={mX1-nx*5} y1={mY1-ny*5} x2={mX2-nx*5} y2={mY2-ny*5} stroke={stroke} strokeWidth="2" strokeLinecap="round" />
                </g>
            );
        } else if (type === 'wedge') {
            return <polygon key={id} points={`${x1},${y1} ${x2+nx*5},${y2+ny*5} ${x2-nx*5},${y2-ny*5}`} fill={stroke} />;
        } else if (type === 'dash') {
            const dashes = [];
            for(let i=1; i<=8; i++) {
                let t = i / 9; let w = t * 5;
                dashes.push(<line key={`${id}-${i}`} x1={(x1+dx*t)+nx*w} y1={(y1+dy*t)+ny*w} x2={(x1+dx*t)-nx*w} y2={(y1+dy*t)-ny*w} stroke={stroke} strokeWidth="2" strokeLinecap="round" />);
            }
            return <g key={id}>{dashes}</g>;
        } else if (type === 'wavy') {
            let pts = `${x1},${y1} `;
            const zigs = Math.max(3, Math.floor(len / 6));
            for(let i=1; i<zigs; i++) {
                let dir = (i % 2 === 0) ? 1 : -1;
                pts += `${x1+dx*(i/zigs)+nx*4*dir},${y1+dy*(i/zigs)+ny*4*dir} `;
            }
            pts += `${x2},${y2}`;
            return <polyline key={id} points={pts} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />;
        } else if (type === 'thick') {
            return <line key={id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="8" strokeLinecap="round" />;
        }
        return <line key={id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="3" strokeLinecap="round" />;
    };

    const handleExportAndSave = () => {
        if (atoms.length === 0) return setAlertConfig({ message: '畫布是空的喔！請繪製結構後再儲存。' });
        setSelectedAtoms([]); 
        
        setTimeout(() => {
            let minX = 9999, minY = 9999, maxX = -9999, maxY = -9999;
            atoms.forEach(a => {
                if (a.x < minX) minX = a.x; if (a.y < minY) minY = a.y;
                if (a.x > maxX) maxX = a.x; if (a.y > maxY) maxY = a.y;
            });
            const pd = 50;
            const w = Math.max(100, maxX - minX + pd * 2);
            const h = Math.max(100, maxY - minY + pd * 2);

            const clone = svgRef.current.cloneNode(true);
            const innerG = clone.querySelector('#draw-layer');
            if (innerG) innerG.removeAttribute('transform');
            clone.style.backgroundImage = 'none';
            clone.style.backgroundColor = '#ffffff';
            clone.setAttribute('viewBox', `${minX - pd} ${minY - pd} ${w} ${h}`);
            clone.setAttribute('width', w); clone.setAttribute('height', h);
            clone.querySelectorAll('.helper').forEach(el => el.remove());

            const svgString = new XMLSerializer().serializeToString(clone);
            const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0);
                onSave(canvas.toDataURL("image/jpeg", 0.95));
                URL.revokeObjectURL(url);
            };
            img.src = url;
        }, 100);
    };

    const toolBtn = (t, icon, title, isBond = false) => {
        const isActive = isBond ? (tool === 'draw' && activeBond === t) : (tool === t);
        return (
            <button 
                onClick={() => isBond ? (setTool('draw'), setActiveBond(t)) : setTool(t)} 
                className={`p-2 rounded-xl border-2 flex items-center justify-center font-black transition-all shadow-sm ${isActive ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-stone-200 text-stone-500 hover:border-emerald-300'}`} 
                title={title}
            >
                {icon}
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] bg-stone-900/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
            {/* 各式 Alert 與 Prompt 彈窗 */}
            {alertConfig && (
                <div className="absolute inset-0 z-[300] bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 max-w-xs w-full shadow-2xl animate-fade-in-up border border-stone-200 dark:border-stone-700">
                        <div className="text-stone-800 dark:text-white font-bold mb-6 text-center">{alertConfig.message}</div>
                        <button onClick={() => setAlertConfig(null)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl font-bold transition-colors">確定</button>
                    </div>
                </div>
            )}
            {confirmConfig && (
                <div className="absolute inset-0 z-[300] bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 max-w-xs w-full shadow-2xl animate-fade-in-up border border-stone-200 dark:border-stone-700">
                        <div className="text-stone-800 dark:text-white font-bold mb-6 text-center">{confirmConfig.message}</div>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmConfig(null)} className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 py-2 rounded-xl font-bold transition-colors">取消</button>
                            <button onClick={() => { confirmConfig.onConfirm(); setConfirmConfig(null); }} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-xl font-bold transition-colors">確定</button>
                        </div>
                    </div>
                </div>
            )}
            {promptConfig && (
                <div className="absolute inset-0 z-[300] bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 max-w-xs w-full shadow-2xl animate-fade-in-up border border-stone-200 dark:border-stone-700">
                        <div className="text-stone-800 dark:text-white font-bold mb-4 text-center">{promptConfig.message}</div>
                        <input 
                            type="text" 
                            autoFocus
                            defaultValue={promptConfig.defaultValue}
                            className="w-full p-2 mb-6 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-50 dark:bg-stone-900 dark:text-white outline-none focus:border-amber-500 font-bold text-center"
                            onKeyDown={e => { if (e.key === 'Enter') { promptConfig.onConfirm(e.target.value); setPromptConfig(null); } }}
                            id="promptInput"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setPromptConfig(null)} className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 py-2 rounded-xl font-bold transition-colors">取消</button>
                            <button onClick={() => { promptConfig.onConfirm(document.getElementById('promptInput').value); setPromptConfig(null); }} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl font-bold transition-colors">儲存</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-[#FCFBF7] dark:bg-stone-800 w-full max-w-6xl h-[95vh] rounded-3xl flex flex-col shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
                <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center bg-white dark:bg-stone-900 shrink-0">
                    <h3 className="font-black text-xl text-stone-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500">draw</span> JayChemDraw 旗艦外掛版
                    </h3>
                    <div className="flex gap-2">
                        {selectedAtoms.length > 0 && (
                            <>
                                <button onClick={handleDeleteSelection} className="px-3 py-1 bg-rose-100 border border-rose-300 text-rose-700 rounded-lg text-sm font-bold hover:bg-rose-200 flex items-center gap-1 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">delete</span> 刪除選取
                                </button>
                                <button onClick={saveAsTemplate} className="px-3 py-1 bg-amber-100 border border-amber-300 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-200 flex items-center gap-1 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">bookmark_add</span> 存為模板
                                </button>
                            </>
                        )}
                        <button onClick={handleUndo} disabled={history.length === 0} className="px-3 py-1 bg-stone-100 dark:bg-stone-700 rounded-lg text-sm font-bold text-gray-600 hover:text-emerald-600 disabled:opacity-30 transition-colors flex items-center gap-1" title="上一步 (Ctrl+Z)"><span className="material-symbols-outlined text-[16px]">undo</span></button>
                        <button onClick={() => {setScale(1); setPan({x:0, y:0});}} className="px-3 py-1 bg-stone-100 dark:bg-stone-700 rounded-lg text-sm font-bold text-gray-500 hover:text-emerald-600 transition-colors">重置視角</button>
                        <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors ml-2"><span className="material-symbols-outlined">close</span></button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* 左側工具列 */}
                    <div className="w-40 bg-stone-50 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-700 p-2 flex flex-col gap-2 shrink-0 overflow-y-auto custom-scrollbar">
                        
                        <div className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest mt-1">基礎工具</div>
                        <div className="grid grid-cols-3 gap-1">
                            {toolBtn('select', <span className="material-symbols-outlined">highlight_alt</span>, '選取與拖拉')}
                            {toolBtn('draw', <span className="material-symbols-outlined">edit</span>, '畫筆')}
                            {toolBtn('erase', <span className="material-symbols-outlined">ink_eraser</span>, '橡皮擦')}
                        </div>

                        <div className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest mt-2">基本鍵結</div>
                        <div className="grid grid-cols-2 gap-1">
                            {toolBtn('single', <svg viewBox="0 0 24 24" className="w-5 h-5"><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2"/></svg>, '單鍵', true)}
                            {toolBtn('double', <svg viewBox="0 0 24 24" className="w-5 h-5"><line x1="4" y1="9" x2="20" y2="9" stroke="currentColor" strokeWidth="2"/><line x1="6" y1="15" x2="18" y2="15" stroke="currentColor" strokeWidth="2"/></svg>, '長短雙鍵', true)}
                            {toolBtn('double_sym', <svg viewBox="0 0 24 24" className="w-5 h-5"><line x1="4" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="2"/><line x1="4" y1="14" x2="20" y2="14" stroke="currentColor" strokeWidth="2"/></svg>, '對稱雙鍵', true)}
                            {toolBtn('triple', <svg viewBox="0 0 24 24" className="w-5 h-5"><line x1="6" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="2"/><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2"/><line x1="6" y1="17" x2="18" y2="17" stroke="currentColor" strokeWidth="2"/></svg>, '三鍵', true)}
                        </div>

                        <div className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest mt-2">立體與特殊鍵</div>
                        <div className="grid grid-cols-2 gap-1">
                            {toolBtn('thick', <svg viewBox="0 0 24 24" className="w-5 h-5"><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/></svg>, '粗鍵', true)}
                            {toolBtn('wavy', <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M3,12 Q6,6 10.5,12 T18,12" fill="none" stroke="currentColor" strokeWidth="2"/></svg>, '未知立體', true)}
                            {toolBtn('wedge', <svg viewBox="0 0 24 24" className="w-5 h-5"><polygon points="4,12 20,6 20,18" fill="currentColor"/></svg>, '出紙面 (點擊單鍵取代/反向)', true)}
                            {toolBtn('dash', <svg viewBox="0 0 24 24" className="w-5 h-5"><line x1="6" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="5" strokeDasharray="2,3"/></svg>, '入紙面 (點擊單鍵取代/反向)', true)}
                        </div>

                        {/* ✨ 新增電荷區塊 */}
                        <div className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest mt-2">電荷判斷</div>
                        <div className="grid grid-cols-2 gap-1 mb-1">
                            {toolBtn('charge_plus', <span className="font-serif font-black text-[16px]">+</span>, '添加正電荷')}
                            {toolBtn('charge_minus', <span className="font-serif font-black text-[16px]">-</span>, '添加負電荷')}
                        </div>

                        <div className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest mt-2">內建環狀</div>
                        <div className="grid grid-cols-2 gap-1 mb-2">
                            {toolBtn('benzene', <svg viewBox="0 0 24 24" className="w-5 h-5"><polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>, '苯環')}
                            {[3, 4, 5, 6, 7, 8].map(sides => (
                                toolBtn(`ring${sides}`, <svg viewBox="-50 -50 100 100" className="w-5 h-5"><polygon points={Array.from({length: sides}).map((_, i) => `${40 * Math.cos(-Math.PI/2 + (i * 2 * Math.PI / sides))},${40 * Math.sin(-Math.PI/2 + (i * 2 * Math.PI / sides))}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="8" strokeLinejoin="round"/></svg>, `${sides}元環`)
                            ))}
                        </div>
                        
                        {/* 模板庫 (包含自訂模板與刪除按鈕) */}
                        <div className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest mt-1 border-t border-stone-200 dark:border-stone-700 pt-2">自訂與預設模板</div>
                        <div className="flex flex-col gap-1 pb-2">
                            {PREDEFINED_TEMPLATES.map((tpl, i) => (
                                <button key={`pre-${i}`} onClick={() => { setTool('template'); setActiveTemplate(tpl); }} className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors ${tool === 'template' && activeTemplate?.name === tpl.name ? 'bg-indigo-100 border-indigo-400 text-indigo-700' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'}`}>
                                    {tpl.name}
                                </button>
                            ))}
                            {customTemplates.map((tpl, i) => (
                                <div key={`cust-${i}`} className="flex items-stretch gap-1">
                                    <button onClick={() => { setTool('template'); setActiveTemplate(tpl); }} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors truncate text-left ${tool === 'template' && activeTemplate?.name === tpl.name ? 'bg-indigo-100 border-indigo-400 text-indigo-700' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'}`} title={tpl.name}>
                                        {tpl.name}
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newTpl = [...customTemplates];
                                            newTpl.splice(i, 1);
                                            setCustomTemplates(newTpl);
                                            if(activeTemplate?.name === tpl.name) { setTool('draw'); setActiveTemplate(null); }
                                        }} 
                                        className="px-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-500 rounded-lg transition-colors flex items-center justify-center shadow-sm"
                                        title="刪除此模板"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                </div>
                            ))}
                            {customTemplates.length === 0 && <div className="text-center text-stone-400 text-[10px] py-1 border border-dashed border-stone-300 dark:border-stone-700 rounded-lg">尚無自訂模板</div>}
                        </div>

                        <div className="mt-auto pt-2 flex flex-col gap-2">
                            <button onClick={() => setMonochromeAtoms(!monochromeAtoms)} className={`w-full p-2 rounded-xl border-2 text-[11px] font-black transition-all flex flex-col items-center justify-center ${monochromeAtoms ? 'bg-stone-200 border-stone-400 text-stone-800' : 'bg-white border-stone-200 text-stone-500'}`}>
                                <span className="material-symbols-outlined text-[18px]">palette</span> {monochromeAtoms ? '黑白顯示' : '彩色顯示'}
                            </button>
                            <button onClick={handleClear} className="w-full p-2 rounded-xl border-2 bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100 transition-all font-black flex items-center justify-center"><span className="material-symbols-outlined">delete</span></button>
                        </div>
                    </div>

                    {/* 繪圖畫布 */}
                    <div className="flex-1 relative bg-white overflow-hidden cursor-crosshair">
                        <svg 
                            ref={svgRef}
                            className="w-full h-full"
                            onMouseDown={handleSvgMouseDown}
                            onMouseMove={handleSvgMouseMove}
                            onMouseUp={handleSvgMouseUp}
                            onMouseLeave={handleSvgMouseUp}
                            onContextMenu={e => e.preventDefault()}
                            onWheel={handleWheel}
                            style={{ backgroundImage: 'radial-gradient(#e5e7eb 1.5px, transparent 1.5px)', backgroundSize: `${40*scale}px ${40*scale}px`, backgroundPosition: `${pan.x*scale}px ${pan.y*scale}px` }}
                        >
                            <g id="draw-layer" transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                                
                                {/* 框選提示框 */}
                                {selectionBox && (
                                    <rect 
                                        x={Math.min(selectionBox.startX, selectionBox.endX)} 
                                        y={Math.min(selectionBox.startY, selectionBox.endY)} 
                                        width={Math.abs(selectionBox.endX - selectionBox.startX)} 
                                        height={Math.abs(selectionBox.endY - selectionBox.startY)} 
                                        fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeDasharray="4" className="pointer-events-none helper" 
                                    />
                                )}

                                {/* 選取的原子標記 (拖拉用) */}
                                {selectedAtoms.map(id => {
                                    const a = atoms.find(atom => atom.id === id);
                                    if(!a) return null;
                                    return <circle key={`sel-${id}`} cx={a.x} cy={a.y} r="20" fill="rgba(59, 130, 246, 0.2)" className="pointer-events-none helper" />;
                                })}

                                {hoveredBond && tool !== 'select' && bonds.map(b => b.id === hoveredBond && (
                                    <line key={`h-bond-${b.id}`} x1={atoms.find(a=>a.id===b.a1).x} y1={atoms.find(a=>a.id===b.a1).y} x2={atoms.find(a=>a.id===b.a2).x} y2={atoms.find(a=>a.id===b.a2).y} stroke="rgba(16,185,129,0.3)" strokeWidth="18" strokeLinecap="round" className="helper pointer-events-none animate-pulse" />
                                ))}

                                {hoveredNode && tool !== 'select' && atoms.map(a => a.id === hoveredNode && (
                                    <circle key={`hover-${a.id}`} cx={a.x} cy={a.y} r="22" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="2" className="helper animate-pulse pointer-events-none" />
                                ))}

                                {bonds.map(b => {
                                    const a1 = atoms.find(a => a.id === b.a1); const a2 = atoms.find(a => a.id === b.a2);
                                    if (!a1 || !a2) return null;
                                    return renderBondShape(a1.x, a1.y, a2.x, a2.y, b.type, b.id);
                                })}

                                {previewRing && (
                                    <g className="helper opacity-50">
                                        {previewRing.bonds.map(b => {
                                            const a1 = previewRing.atoms.find(a => a.id === b.a1); const a2 = previewRing.atoms.find(a => a.id === b.a2);
                                            return renderBondShape(a1.x, a1.y, a2.x, a2.y, b.type, b.id, "#10b981");
                                        })}
                                    </g>
                                )}

                                {dragLine && renderBondShape(dragLine.x1, dragLine.y1, dragLine.x2, dragLine.y2, dragLine.type, 'dragLine', "#10b981")}
                                
                                {/* 原子與電荷渲染區塊 */}
                                {[...atomsWithH, ...(previewRing ? previewRing.atoms.map(a=>({...a, shouldShow:false})) : [])].map(a => (
                                    <g key={a.id} transform={`translate(${a.x}, ${a.y})`}>
                                        <circle r="16" fill={a.shouldShow ? "#ffffff" : "transparent"} className="pointer-events-none" />
                                        {a.shouldShow && (
                                            <text x="0" y="6" textAnchor="middle" fontSize="18" fontWeight="900" fill={getAtomColor(a.element)} className="pointer-events-none font-sans" style={{userSelect: 'none'}}>
                                                {a.isLeftNode && a.hCount > 0 ? (
                                                    <>{a.hCount > 1 ? <tspan>H<tspan dy="6" fontSize="13">{a.hCount}</tspan><tspan dy="-6">{a.element}</tspan></tspan> : `HO`}</>
                                                ) : (
                                                    <>{a.element}{a.hCount > 0 && 'H'}{a.hCount > 1 && <tspan dy="6" fontSize="13">{a.hCount}</tspan>}</>
                                                )}
                                            </text>
                                        )}
                                        {/* ✨ 獨立繪製電荷符號，防止干擾原子排版 */}
                                        {a.shouldShow && a.charge !== 0 && (
                                            <text x={a.isLeftNode ? -14 : 14} y="-6" textAnchor="middle" fontSize="14" fontWeight="900" fill={getAtomColor(a.element)} className="pointer-events-none font-sans bg-white">
                                                {a.charge > 0 ? '+' : '-'}{Math.abs(a.charge) > 1 ? Math.abs(a.charge) : ''}
                                            </text>
                                        )}
                                    </g>
                                ))}
                            </g>
                        </svg>
                    </div>
                    
                    {/* 右側元素面板 */}
                    <div className="w-24 bg-stone-50 dark:bg-stone-900 border-l border-stone-200 dark:border-stone-700 p-2 flex flex-col gap-2 shrink-0">
                        <div className="text-xs font-black text-gray-400 text-center mb-1">常用元素</div>
                        {['C', 'N', 'O', 'S', 'F', 'Cl', 'Br', 'I', 'P'].map(el => (
                            <button key={el} onClick={() => { setActiveElement(el); setTool('draw'); }} className={`py-1.5 rounded-lg border-2 font-black transition-colors ${activeElement === el ? 'bg-indigo-100 border-indigo-500 text-indigo-800' : 'bg-white border-stone-200 text-stone-700 hover:border-indigo-300'}`}>
                                {el}
                            </button>
                        ))}
                        <div className="h-px bg-stone-300 dark:bg-stone-600 my-1"></div>
                        <input type="text" value={customElement} onChange={(e) => setCustomElement(e.target.value)} placeholder="自訂" className="w-full text-center py-1 border-2 border-stone-300 rounded-lg text-sm font-black outline-none focus:border-indigo-500" />
                        <button onClick={() => { if(customElement){ setActiveElement(customElement); setTool('draw'); } }} className="py-1 bg-stone-200 hover:bg-stone-300 rounded-lg text-xs font-bold transition-colors">套用</button>
                    </div>
                </div>

                <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shrink-0 flex justify-between items-center gap-3">
                    <div className="text-[11px] font-bold text-gray-500 flex flex-col leading-tight">
                        <span>💡 <strong className="text-emerald-600">進階操作</strong>：已加入「電荷」系統，點擊原子即可加入正負電！框選工具也支援刪除 (<strong className="text-rose-600">Delete</strong>) 與存為模板了。</span>
                        <span className="text-stone-400">現在存取的模板資料將永久保存在本機中，即使關閉網頁也不會消失！</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={onClose} className="px-6 py-2.5 font-bold text-gray-500 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors">取消</button>
                        <button onClick={handleExportAndSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-black shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">image</span> 儲存高清結構
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

// 匯出到全域，供 Illu.jsx 取用
window.JayChemDrawModal = JayChemDrawModal;