function Main() {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activeQuizRecord, setActiveQuizRecord] = useState(null);
    
    const [dialog, setDialog] = useState(null);
    const showAlert = (message) => setDialog({ type: 'alert', message });
    const showConfirm = (message, onConfirm) => setDialog({ type: 'confirm', message, onConfirm });
    const showPrompt = (message, defaultValue, onConfirm) => setDialog({ type: 'prompt', message, defaultValue, onConfirm });
    const closeDialog = () => setDialog(null);

    useEffect(() => {
        let unsubProfile = null;
        const unsubscribeAuth = auth.onAuthStateChanged(usr => {
            setUser(usr);
            if (usr) {
                unsubProfile = db.collection('users').doc(usr.uid).onSnapshot(doc => {
                    if (doc.exists) setUserProfile(doc.data());
                    setLoadingUser(false);
                });
            } else {
                setUserProfile(null); setLoadingUser(false);
            }
        });
        return () => { unsubscribeAuth(); if (unsubProfile) unsubProfile(); };
    }, []);

    if (loadingUser) return <div className="flex h-screen items-center justify-center font-bold">系統載入中...</div>;
    if (!user) return <><DialogOverlay dialog={dialog} onClose={closeDialog} /><AuthScreen showAlert={showAlert} /></>;
    if (!userProfile || !userProfile.displayName) return <><DialogOverlay dialog={dialog} onClose={closeDialog} /><ProfileSetup user={user} onComplete={(name) => setUserProfile({...userProfile, displayName: name})} showAlert={showAlert} /></>;

    const TopNav = () => (
        <div className="bg-black text-white px-4 flex justify-between items-center h-14">
            <div className="flex space-x-6 items-center h-full">
                <span className="font-black text-lg mr-4">JJay</span>
                <button onClick={() => setActiveTab('dashboard')} className={`font-bold ${activeTab === 'dashboard' ? 'border-b-4 border-white' : 'text-gray-400'}`}>我的題庫</button>
                <button onClick={() => setActiveTab('social')} className={`font-bold ${activeTab === 'social' ? 'border-b-4 border-white' : 'text-gray-400'}`}>社群交流</button>
                <button onClick={() => setActiveTab('minecraft')} className={`font-bold ${activeTab === 'minecraft' ? 'border-b-4 border-white' : 'text-gray-400'}`}>⛏️ 史蒂夫養成</button>
                <button onClick={() => setActiveTab('profile')} className={`font-bold ${activeTab === 'profile' ? 'border-b-4 border-white' : 'text-gray-400'}`}>👤 個人檔案</button>
            </div>
            <div className="flex items-center space-x-4">
                {userProfile.avatar && <img src={userProfile.avatar} className="w-8 h-8 rounded-full border-2 border-white object-cover" />}
                <span className="text-sm font-bold">{userProfile.displayName}</span>
                <button onClick={() => auth.signOut()} className="text-xs bg-white text-black px-3 py-1 font-bold">登出</button>
            </div>
        </div>
    );

    return (
        <div className="h-[100dvh] flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
            <DialogOverlay dialog={dialog} onClose={closeDialog} />
            {activeTab !== 'activeQuiz' && <TopNav />}
            
            {activeTab !== 'activeQuiz' ? (
                <div className="flex-grow pt-6 overflow-hidden bg-gray-50 dark:bg-gray-900">
                    {activeTab === 'dashboard' && <Dashboard user={user} userProfile={userProfile} onStartNew={(f) => { setActiveQuizRecord({ folder: f }); setActiveTab('activeQuiz'); }} onContinueQuiz={(rec) => { setActiveQuizRecord(rec); setActiveTab('activeQuiz'); }} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} />}
                    {activeTab === 'social' && <SocialDashboard user={user} userProfile={userProfile} showAlert={showAlert} />}
                    {activeTab === 'minecraft' && <MinecraftDashboard user={user} userProfile={userProfile} showAlert={showAlert} />}
                    {activeTab === 'profile' && <ProfilePage user={user} userProfile={userProfile} showAlert={showAlert} />}
                </div>
            ) : (
                <QuizApp currentUser={user} userProfile={userProfile} activeQuizRecord={activeQuizRecord} onBackToDashboard={() => setActiveTab('dashboard')} showAlert={showAlert} showConfirm={showConfirm} showPrompt={showPrompt} />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Main />);