window.HomeDashboard = function HomeDashboard({ setActiveTab, userProfile, setShowInbox }) {
    const userName = userProfile?.displayName || '冒險者';
    
    return (
        <div className="p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col gap-8 animate-fade-in">
            {/* 歡迎與重點導引區塊 */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
                <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[150px] text-white/10 rotate-12 select-none">explore</span>
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-3xl md:text-5xl font-black mb-4">歡迎回來，{userName}</h1>
                    <p className="text-indigo-100 text-lg mb-8 leading-relaxed font-bold">
                        準備好迎接今天的挑戰了嗎？我們為您準備了最新的題庫與任務，快速選擇下方功能開始您的學習旅程。
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <button onClick={() => setActiveTab('dashboard')} className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-black shadow-md hover:bg-indigo-50 transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined">edit_document</span> 我的試卷
                        </button>
                        <button onClick={() => setShowInbox && setShowInbox(true)} className="bg-indigo-500/30 hover:bg-indigo-500/50 text-white border border-indigo-300/50 px-6 py-3 rounded-xl font-black transition-colors flex items-center gap-2 backdrop-blur-sm">
                            <span className="material-symbols-outlined">mail</span> 查看信箱
                        </button>
                    </div>
                </div>
            </div>

            {/* 快速導覽網格 */}
            <div>
                <h2 className="text-2xl font-black text-stone-800 dark:text-stone-100 mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">grid_view</span> 快速導覽
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    <div onClick={() => setActiveTab('qlib')} className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-all group">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-2xl">library_books</span>
                        </div>
                        <h3 className="text-lg font-black text-stone-800 dark:text-white mb-2">1. 題庫系統</h3>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed">管理您的所有私有題庫，並可自由組合、隨機出題。</p>
                    </div>

                    <div onClick={() => setActiveTab('taskwall')} className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer transition-all group">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-2xl">assignment</span>
                        </div>
                        <h3 className="text-lg font-black text-stone-800 dark:text-white mb-2">2. 任務牆</h3>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed">解鎖每日任務與挑戰，賺取鑽石與獎勵，提升等級。</p>
                    </div>

                    <div onClick={() => setActiveTab('wrongbook')} className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 hover:shadow-md hover:border-rose-400 dark:hover:border-rose-500 cursor-pointer transition-all group">
                        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-2xl">menu_book</span>
                        </div>
                        <h3 className="text-lg font-black text-stone-800 dark:text-white mb-2">3. 錯題本</h3>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed">複習您曾經答錯的重點題目，針對弱點加強訓練。</p>
                    </div>

                    <div onClick={() => setActiveTab('publicexam')} className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer transition-all group">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-2xl">language</span>
                        </div>
                        <h3 className="text-lg font-black text-stone-800 dark:text-white mb-2">4. 公開試卷</h3>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed">挑戰官方精選與社群分享的高品質試卷，檢驗學習成效。</p>
                    </div>
                    
                    <div onClick={() => setActiveTab('druglib')} className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 hover:shadow-md hover:border-cyan-400 dark:hover:border-cyan-500 cursor-pointer transition-all group">
                        <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-2xl">medication</span>
                        </div>
                        <h3 className="text-lg font-black text-stone-800 dark:text-white mb-2">5. 機轉庫</h3>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed">最完整的藥物機轉與重點整理，幫助您高效掌握核心知識。</p>
                    </div>

                    <div onClick={() => setActiveTab('shop')} className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 hover:shadow-md hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer transition-all group">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-2xl">more_horiz</span>
                        </div>
                        <h3 className="text-lg font-black text-stone-800 dark:text-white mb-2">6. 其他</h3>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed">前往點數商城、交流大廳與個人設定等更多探索功能。</p>
                    </div>
                    
                </div>
            </div>
        </div>
    );
};