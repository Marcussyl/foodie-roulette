
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FoodItem, GameState, MealType, DailyHistory, HistoryMap } from './types';
import { WHEEL_COLORS, INITIAL_FOODS } from './constants';
import Wheel from './components/Wheel';
import { getFoodSuggestions } from './services/geminiService';

const App: React.FC = () => {
  // --- State ---
  const [items, setItems] = useState<FoodItem[]>(() => 
    INITIAL_FOODS.map((name, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      name,
      color: WHEEL_COLORS[i % WHEEL_COLORS.length]
    }))
  );
  
  const [newItemName, setNewItemName] = useState('');
  const [rotation, setRotation] = useState(0);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [winner, setWinner] = useState<FoodItem | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('晚餐');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // History persistence (Map of date -> DailyHistory)
  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const [allHistory, setAllHistory] = useState<HistoryMap>(() => {
    const saved = localStorage.getItem('foodie_history_v2');
    if (saved) {
      try {
        return JSON.parse(saved) as HistoryMap;
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    const oldSaved = localStorage.getItem('foodie_history');
    if (oldSaved) {
      const oldParsed = JSON.parse(oldSaved) as DailyHistory;
      return { [oldParsed.date]: oldParsed };
    }
    return {};
  });

  const history = useMemo(() => {
    return allHistory[todayKey] || { date: todayKey };
  }, [allHistory, todayKey]);

  useEffect(() => {
    localStorage.setItem('foodie_history_v2', JSON.stringify(allHistory));
  }, [allHistory]);

  // --- Handlers ---
  const handleAddItem = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newItemName.trim()) return;
    const newItem: FoodItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName.trim(),
      color: WHEEL_COLORS[items.length % WHEEL_COLORS.length]
    };
    setItems([...items, newItem]);
    setNewItemName('');
  };

  const handleDeleteItem = (id: string) => {
    if (items.length <= 2) {
      alert("清單至少需要 2 個項目才能旋轉唷！");
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  const handleSpin = () => {
    if (gameState === GameState.SPINNING || items.length === 0) return;

    setGameState(GameState.SPINNING);
    setWinner(null);

    const extraDegrees = Math.floor(Math.random() * 360);
    const totalRotation = rotation + (360 * 10) + extraDegrees;
    setRotation(totalRotation);

    setTimeout(() => {
      const normalizedRotation = (totalRotation % 360);
      const winningAngle = (360 - normalizedRotation) % 360;
      const sliceSize = 360 / items.length;
      const winnerIndex = Math.floor(winningAngle / sliceSize);
      
      const wonItem = items[winnerIndex];
      setWinner(wonItem);
      setGameState(GameState.FINISHED);

      setAllHistory(prev => {
        const currentDay = prev[todayKey] || { date: todayKey };
        const update: Partial<DailyHistory> = {};
        if (selectedMeal === '早餐') update.breakfast = wonItem.name;
        if (selectedMeal === '午餐') update.lunch = wonItem.name;
        if (selectedMeal === '晚餐') update.dinner = wonItem.name;
        
        return { ...prev, [todayKey]: { ...currentDay, ...update } };
      });
    }, 4000);
  };

  const handleAISuggest = async () => {
    setLoadingAI(true);
    const suggestions = await getFoodSuggestions();
    const newItems = suggestions.map((name, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      name,
      color: WHEEL_COLORS[i % WHEEL_COLORS.length]
    }));
    setItems(newItems);
    setLoadingAI(false);
  };

  const deleteHistoryEntry = (date: string) => {
    if (confirm(`確定要刪除 ${date} 的紀錄嗎？`)) {
      setAllHistory(prev => {
        const next = { ...prev };
        delete next[date];
        return next;
      });
    }
  };

  const exportHistory = () => {
    const dataStr = JSON.stringify(allHistory, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `foodie-history-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (confirm("這將會合併或覆蓋目前的紀錄，確定要匯入嗎？")) {
          setAllHistory(prev => ({ ...prev, ...imported }));
          alert("匯入成功！");
        }
      } catch (err) {
        alert("無效的檔案格式。");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const todayDisplay = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  }).format(new Date());

  const sortedHistoryDates = Object.keys(allHistory).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center max-w-5xl mx-auto relative overflow-x-hidden">
      
      {/* History Panel (Sidebar) */}
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${isHistoryOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)}></div>
        <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 transform ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-orange-50/50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <i className="fas fa-history mr-3 text-orange-500"></i>
              往期紀錄
            </h2>
            <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600 p-2">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {sortedHistoryDates.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <i className="fas fa-calendar-times text-5xl mb-4 block"></i>
                <p>還沒有任何紀錄唷！</p>
              </div>
            ) : (
              sortedHistoryDates.map(date => {
                const entry = allHistory[date];
                const isToday = date === todayKey;
                return (
                  <div key={date} className={`relative border rounded-2xl p-4 shadow-sm group ${isToday ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'}`}>
                    <button 
                      onClick={() => deleteHistoryEntry(date)}
                      className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-gray-700">{date}</span>
                      {isToday && <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Today</span>}
                    </div>
                    <div className="grid grid-cols-1 gap-2 pr-6">
                      {[
                        { label: '早餐', val: entry.breakfast, icon: 'fa-coffee', color: 'text-yellow-500' },
                        { label: '午餐', val: entry.lunch, icon: 'fa-sun', color: 'text-orange-400' },
                        { label: '晚餐', val: entry.dinner, icon: 'fa-moon', color: 'text-indigo-400' }
                      ].map(meal => (
                        <div key={meal.label} className="flex items-center text-sm">
                          <i className={`fas ${meal.icon} w-5 text-center mr-2 ${meal.color}`}></i>
                          <span className="text-gray-400 mr-2">{meal.label}:</span>
                          <span className={meal.val ? 'text-gray-700 font-medium' : 'text-gray-300 italic'}>
                            {meal.val || '無紀錄'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-2">
            <button 
              onClick={exportHistory}
              className="flex-1 flex items-center justify-center space-x-2 py-2 border border-orange-200 text-orange-600 rounded-xl hover:bg-orange-100 transition-all text-sm font-bold"
            >
              <i className="fas fa-file-export"></i>
              <span>匯出紀錄</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center space-x-2 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 transition-all text-sm font-bold"
            >
              <i className="fas fa-file-import"></i>
              <span>匯入紀錄</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={importHistory} 
              className="hidden" 
              accept=".json"
            />
          </div>
        </div>
      </div>

      <header className="text-center mb-8 w-full max-w-2xl">
        <div className="flex flex-col items-center justify-center sm:flex-row sm:space-x-4 mb-4">
          <div className="inline-block bg-white px-4 py-1 rounded-full shadow-sm text-orange-500 font-medium text-sm border border-orange-100">
            <i className="far fa-calendar-alt mr-2"></i>
            {todayDisplay}
          </div>
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="mt-2 sm:mt-0 text-orange-600 hover:text-orange-700 font-bold text-sm bg-orange-50 hover:bg-orange-100 px-4 py-1 rounded-full transition-all border border-orange-200"
          >
            <i className="fas fa-clock-rotate-left mr-2"></i>
            歷史紀錄
          </button>
        </div>
        <h1 className="text-4xl font-bold text-orange-600 mb-2">
          <i className="fas fa-utensils mr-3"></i>
          今晚吃什麼？
        </h1>
        <p className="text-gray-600">猶豫不決嗎？讓命運來決定吧！</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-xl p-6 md:p-10 flex flex-col items-center justify-center space-y-8">
          <div className="flex bg-gray-100 p-1 rounded-xl w-full max-sm:max-w-xs">
            {(['早餐', '午餐', '晚餐'] as MealType[]).map((meal) => (
              <button
                key={meal}
                onClick={() => setSelectedMeal(meal)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
                  selectedMeal === meal ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className={meal === '早餐' ? 'fas fa-coffee' : meal === '午餐' ? 'fas fa-sun' : 'fas fa-moon'}></i>
                <span>{meal}</span>
              </button>
            ))}
          </div>
          <Wheel items={items} rotation={rotation} isSpinning={gameState === GameState.SPINNING} />
          <div className="text-center w-full">
            {gameState === GameState.FINISHED && winner && (
              <div className="animate-bounce mb-4">
                <p className="text-sm text-gray-500 font-medium">✨ {selectedMeal}吃這個！</p>
                <h2 className="text-3xl font-extrabold text-orange-500 bg-orange-50 inline-block px-6 py-2 rounded-full border-2 border-orange-200 shadow-inner">
                   {winner.name} 
                </h2>
              </div>
            )}
            <button
              onClick={handleSpin}
              disabled={gameState === GameState.SPINNING}
              className={`w-full max-w-xs py-4 px-8 rounded-full text-xl font-bold text-white shadow-lg transform transition-all active:scale-95 ${
                gameState === GameState.SPINNING ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
              }`}
            >
              {gameState === GameState.SPINNING ? <span><i className="fas fa-spinner fa-spin mr-2"></i> 尋找美味中...</span> : <span><i className="fas fa-play mr-2"></i> 決定我的{selectedMeal}</span>}
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-8">
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex justify-between items-center">
              <span><i className="fas fa-list-ul mr-2 text-orange-500"></i> 食物清單</span>
              <span className="text-sm font-normal text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{items.length} 項</span>
            </h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text" value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder="想要吃什麼？"
                className="flex-1 px-4 py-2 border border-gray-100 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <button onClick={() => handleAddItem()} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600">新增</button>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group hover:bg-orange-50 transition-colors">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: item.color }}></div>
                    <span className="text-gray-700 font-medium">{item.name}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={handleAISuggest}
              disabled={loadingAI}
              className="mt-6 w-full py-3 px-4 border-2 border-dashed border-orange-200 text-orange-500 rounded-xl font-bold hover:bg-orange-50 hover:border-orange-300 transition-all flex items-center justify-center space-x-2"
            >
              {loadingAI ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-magic"></i>
              )}
              <span>{loadingAI ? '正在生成推薦...' : 'AI 幫我推薦清單'}</span>
            </button>
          </div>

          <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl shadow-xl p-6 text-white overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2 flex items-center">
                <i className="fas fa-lightbulb mr-2 text-yellow-300"></i>
                小提示
              </h3>
              <p className="text-sm opacity-90 leading-relaxed">
                您可以點擊「AI 幫我推薦清單」來獲取由 Gemini AI 產生的熱門美食推薦！
                轉到滿意的結果後，系統會自動記錄在您的歷史清單中。
              </p>
            </div>
            <i className="fas fa-hamburger absolute -bottom-4 -right-4 text-8xl opacity-10 rotate-12"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add default export to fix the error in index.tsx
export default App;
