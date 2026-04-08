// ==========================================
// 1. 靜態資料區：國考科目與章節權重設定
// ==========================================
const EXAM_DATA = [
  {
    id: "s1",
    title: "藥理學與藥物化學",
    categories: [
      {
        id: "s1_c1",
        title: "全範圍",
        parts: ["藥理", "藥化"],
        chapterWeights: [
          8.8, 3.2, 3.9, 0.4, 2.2, 3.0, 0.6, 1.1, 2.8, 2.4, 1.9, 0.9, 3.6, 3.2, 0.2, 1.7, 1.3, 1.5, 1.5, 0.2,
          3.0, 3.9, 2.8, 3.6, 1.5, 0.7, 1.9, 2.4, 0.6, 1.7, 1.3, 2.8, 5.0, 1.5, 1.9, 7.3, 2.8, 0.4
        ],
        chapters: [
          "藥效學/藥動學", "擬交感神經藥", "擬副交感神經藥", "鴉片類/中樞神經藥", "局部/全身麻醉藥", 
          "鎮靜安眠藥", "抗焦慮藥", "神經肌肉疾病", "抗癲癇藥", "抗憂鬱/抗躁鬱", "抗精神藥", 
          "抗帕金森藥", "麻醉性鎮痛藥", "非類固醇消炎藥", "痛風", "類固醇藥物", "血清素", 
          "抗組織胺", "抗潰瘍", "止吐、止瀉、瀉劑", "高血壓藥", "利尿劑", "糖尿病藥", 
          "高血脂藥", "心衰竭", "心絞痛", "心律不整", "抗凝血藥", "貧血藥", "下視丘/腦下垂體", 
          "甲狀腺素", "固醇類", "抗生素", "肺結核", "抗黴菌", "抗癌藥", "抗病毒", "抗瘧疾/原蟲"
        ]
      }
    ]
  },
  {
    id: "s2",
    title: "藥物分析學與生藥學",
    categories: [
      {
        id: "s2_c1",
        title: "藥物分析學",
        parts: ["藥分"],
        chapterWeights: [
          3.66, 1.93, 1.16, 1.35, 0.58, 3.47, 0.87, 0.29, 1.35, 2.50, 0.77, 1.83, 1.73, 0.58, 0.96, 1.83, 2.50,
          5.59, 2.22, 10.12, 5.30, 0.67, 3.28, 3.56, 5.59, 8.00, 2.89, 8.86, 4.34, 2.60, 0.87, 2.70, 1.83, 8.75, 0.10
        ],
        chapters: [
          "基礎概念", "水溶液概論", "滴定分析概論", "酸滴定", "鹼滴定", "非水滴定", "沉澱滴定", 
          "錯合滴定", "氧化還原滴定", "水分測定法", "灰分測定法", "脂肪測定法", "揮發油測定法", 
          "生物鹼及胺類測定法", "重金屬檢測", "藥典試驗補充(含中藥)", "其他分析法", "層析概論", 
          "薄層層析法(TLC)", "高效能液相層析法(HPLC)", "氣相層析法(GC)", "超臨界流體層析法(SFC)", 
          "萃取法", "毛細管電泳(CE)", "質譜儀分析法(MS)", "光譜概論", "紫外光與可見光譜(UV/VIS)", 
          "紅外光譜(IR)", "螢光光譜(FLUOR)", "拉曼光譜", "原子光譜(AES/AAS)", "旋光度測定法", 
          "折光率測定法", "核磁共振光譜測定(NMR)", "生物製劑品管分析"
        ]
      },
      {
        id: "s2_c2",
        title: "生藥學",
        parts: ["生藥"],
        chapterWeights: [28.8, 17.3, 9.6, 7.7, 7.7, 5.8, 5.8, 5.8, 5.8, 3.8, 1.9, 0.1],
        chapters: [
          "生物鹼", "配醣體", "揮發油", "苯丙烷", "萜類", "強心苷", 
          "碳水化合物", "單寧", "樹脂", "脂質", "類固醇", "緒論"
        ]
      },
      {
        id: "s2_c3",
        title: "中藥學",
        parts: ["中藥"],
        chapterWeights: [21.6, 15.4, 9.9, 7.4, 6.2, 6.2, 4.9, 4.9, 4.3, 3.7, 3.1, 3.1, 2.5, 1.9, 1.9, 1.2, 0.6, 0.6, 0.6],
        chapters: [
          "補虛藥", "清熱藥", "解表藥", "化痰止咳平喘", "利水滲濕藥", "活血祛瘀藥", 
          "祛風濕藥", "理氣藥", "止血藥", "安神藥", "收澀藥", "平肝息風藥", "攻下藥", 
          "溫裹藥", "芳香化濕藥", "消食藥", "清虛熱藥", "外用藥", "驅蟲藥"
        ]
      }
    ]
  },
  {
    id: "s3",
    title: "藥劑學與生物藥劑學",
    categories: [
      {
        id: "s3_c1",
        title: "藥劑學",
        parts: ["藥劑"],
        chapterWeights: [
          4.17, 0.83, 3.33, 1.67, 1.67, 2.50, 5.83, 2.50, 3.33, 5.00, 5.00, 2.50, 7.50, 1.67, 2.50, 1.67, 3.33, 7.50, 4.17, 1.67
        ],
        chapters: [
          "大雜燴(總論)", "芳香水劑", "溶液劑", "糖漿劑", "醋劑/酊劑", "流浸膏劑/浸膏劑/浸劑", 
          "膠體/界面活性劑", "流變", "浮劑/洗劑(懸浮劑)", "乳劑", "軟膏劑", "凝膠/乳糜/乳霜/糊劑", 
          "注射劑", "眼用製劑", "栓劑", "微粒學", "散劑/丸劑", "錠劑", "膠囊", "氣化噴霧劑"
        ]
      },
      {
        id: "s3_c2",
        title: "生物藥劑學",
        parts: ["生藥劑"],
        chapterWeights: [1.67, 0.83, 4.17, 1.67, 1.67, 1.67, 5.00, 5.00, 3.33, 2.50, 4.17],
        chapters: [
          "緒論", "藥物動力學模型", "I.V. (一室、二室)", "E.V. (一室、二室)", 
          "I.V. infusion/多劑量給藥", "非線性藥物動力學", "藥物吸收", 
          "生體可用率/生體相等性", "藥物分布", "藥物代謝的遺傳多形性", "藥物排除/腎病調整"
        ]
      }
    ]
  }
];

// 權重改為：速讀 15%, 細讀 25%, 熟讀 30%, 刷題 30%
const TASK_WEIGHTS = { skim: 0.15, deep: 0.25, master: 0.3, practice: 0.3 };

const calculateTotalGlobalPoints = () => {
  let total = 0;
  EXAM_DATA.forEach(subj => {
    subj.categories.forEach(cat => {
      const catWeightSum = cat.chapterWeights ? cat.chapterWeights.reduce((a, b) => a + b, 0) : cat.chapters.length;
      total += catWeightSum * cat.parts.length;
    });
  });
  return total;
};

const GLOBAL_TOTAL_POINTS = calculateTotalGlobalPoints();

// ==========================================
// 2. Custom Hook 主程式
// ==========================================
function useExamFeatures(db, user, appId = 'exam-tracker-v2') {
  const { useState, useEffect, useCallback, useMemo } = React;

  const [myTasks, setMyTasks] = useState([]);
  const [allUsersData, setAllUsersData] = useState([]);
  const [studyLogs, setStudyLogs] = useState([]);

  useEffect(() => {
    if (!user || !db) return;

    const progressRef = db.collection('artifacts').doc(appId).collection('userProgress');
    const unsubscribeProgress = progressRef.onSnapshot((snapshot) => {
      const users = [];
      let foundMyData = false;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (docSnap.id === user.uid) {
          setMyTasks(data.tasks || []);
          foundMyData = true;
        }
        users.push({ nickname: data.nickname || "匿名戰友", totalPoints: data.totalPoints || 0 });
      });

      if (!foundMyData && user.email) {
        progressRef.doc(user.uid).set({
          nickname: user.displayName || user.email.split('@')[0],
          tasks: [],
          totalPoints: 0,
          updatedAt: Date.now()
        }, { merge: true });
      }

      users.sort((a, b) => b.totalPoints - a.totalPoints);
      setAllUsersData(users);
    });

    const logsRef = db.collection('users').doc(user.uid).collection('studyLogs');
    const unsubscribeLogs = logsRef.orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudyLogs(logsData);
    });

    return () => {
      unsubscribeProgress();
      unsubscribeLogs();
    };
  }, [user, db, appId]);

  const calculatePoints = useCallback((tasks, targetSubjId = null) => {
    let points = 0;
    EXAM_DATA.forEach(subj => {
      if (targetSubjId && subj.id !== targetSubjId) return;
      subj.categories.forEach(cat => {
        cat.chapters.forEach((_, chapIdx) => {
          cat.parts.forEach((_, partIdx) => {
            const weight = cat.chapterWeights ? cat.chapterWeights[chapIdx] : 1;
            const baseKey = `${subj.id}_${cat.id}_${chapIdx}_${partIdx}`;
            if (tasks.includes(`${baseKey}_skim`)) points += weight * TASK_WEIGHTS.skim;
            if (tasks.includes(`${baseKey}_deep`)) points += weight * TASK_WEIGHTS.deep;
            if (tasks.includes(`${baseKey}_master`)) points += weight * TASK_WEIGHTS.master;
            if (tasks.includes(`${baseKey}_practice`)) points += weight * TASK_WEIGHTS.practice;
          });
        });
      });
    });
    return points;
  }, []);

  const myTotalPoints = useMemo(() => calculatePoints(myTasks), [myTasks, calculatePoints]);
  const overallProgress = useMemo(() => ((myTotalPoints / GLOBAL_TOTAL_POINTS) * 100).toFixed(1), [myTotalPoints]);

  const toggleTask = useCallback((taskId) => {
    if (!user || !db) return;
    const newTasks = myTasks.includes(taskId) ? myTasks.filter(t => t !== taskId) : [...myTasks, taskId];
    setMyTasks(newTasks);
    const points = calculatePoints(newTasks);

    db.collection('artifacts').doc(appId).collection('userProgress').doc(user.uid).set({
      tasks: newTasks,
      totalPoints: points,
      updatedAt: Date.now()
    }, { merge: true }).catch(err => console.error("更新進度失敗:", err));
  }, [user, db, appId, myTasks, calculatePoints]);

  const addStudyLog = useCallback((subjectData, message, type = 'note', customDate = null) => {
    if (!user || !db) return;
    const now = new Date();
    const displayDate = customDate || now.toLocaleDateString('zh-TW');
    const displayTime = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

    // 支援多選：將傳入的科目資料統一轉為陣列格式儲存
    const subjectsToSave = Array.isArray(subjectData) ? subjectData : [subjectData];

    db.collection('users').doc(user.uid).collection('studyLogs').add({
      subjects: subjectsToSave, 
      message, type,
      date: displayDate, time: displayTime,
      timestamp: now.getTime()
    }).catch(err => console.error("寫入軌跡失敗:", err));
  }, [user, db]);

  const deleteStudyLog = useCallback((logId) => {
    if (!user || !db || !logId) return;
    db.collection('users').doc(user.uid).collection('studyLogs').doc(logId).delete()
      .catch(err => console.error("刪除軌跡失敗:", err));
  }, [user, db]);

// === 新增：呼叫後端 Vercel API 想口訣的功能 ===
    const generateAIMnemonic = async (topic) => {
        try {
            // 注意：這裡是呼叫你剛剛建的 /api/gemini，而不是直接呼叫 Google
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: `請幫我用幽默、好記的方式，為國考單元「${topic}」想一個背誦口訣。字數盡量簡短，50字以內。` })
            });
            const data = await response.json();
            if (data.result) {
                return data.result;
            } else {
                return "AI 暫時想不出口訣，請稍後再試！";
            }
        } catch (error) {
            console.error("AI API Error:", error);
            return "連線失敗，請檢查網路或 Vercel API 設定。";
        }
    };

  return {
    EXAM_DATA, GLOBAL_TOTAL_POINTS,generateAIMnemonic,
    myTasks, allUsersData, studyLogs, myTotalPoints, overallProgress,
    calculatePoints, toggleTask, addStudyLog, deleteStudyLog, generateAIMnemonic
  
  };
}

// ✨ 最重要的一步：把這個 function 綁定到 window 上，讓其他檔案可以找到它！
window.useExamFeatures = useExamFeatures;