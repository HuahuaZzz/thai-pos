import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, LayoutDashboard, Settings, Receipt, 
  Plus, Minus, Trash2, Edit2, X, Store, TrendingUp, 
  CalendarDays, DollarSign, ChevronDown, Check, Sparkles
} from 'lucide-react';

// --- Gemini API 呼叫函數 ---
const callGemini = async (prompt, isJson = false, jsonSchema = null) => {
  const apiKey = "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };
  
  if (isJson) {
    payload.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: jsonSchema
    };
  }

  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return isJson ? JSON.parse(text) : text;
    } catch (err) {
      if (i === 4) throw err;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
  return null;
};

// --- 初始菜單資料 (來自 menu.json) ---
const INITIAL_MENU = [
  {
    category: "單點",
    items: [
      { name: "青木瓜沙拉", price: 100 }, { name: "打拋豬肉", price: 150 },
      { name: "東北青木瓜沙拉", price: 100 }, { name: "綠咖哩雞肉", price: 160 },
      { name: "鹹蛋青木瓜沙拉", price: 110 }, { name: "酸辣海鮮湯", price: 190 },
      { name: "東北涼拌豬肉", price: 150 }, { name: "椰漿雞湯", price: 190 },
      { name: "涼拌酸辣海鮮", price: 180 }, { name: "香茅野菇湯", price: 150 }
    ]
  },
  {
    category: "個人餐",
    note: "飯類均附青菜X1.半熟荷包蛋X1",
    items: [
      { name: "東北涼拌豬肉飯", price: 120 }, { name: "綠咖哩雞肉飯", price: 130 },
      { name: "打拋豬肉飯", price: 120 }, { name: "泰式鮮蝦河粉", price: 120 },
      { name: "涼拌酸辣海鮮(附餐)", price: 160, options: ["冬粉", "媽媽麵"] },
      { name: "酸辣海鮮湯(附餐)", price: 160, options: ["媽媽麵", "河粉"] },
      { name: "椰漿雞湯(附餐)", price: 160, options: ["媽媽麵", "河粉"] },
      { name: "香茅野菇湯(附餐)", price: 120, options: ["媽媽麵", "河粉"] }
    ]
  },
  {
    category: "甜點/飲料",
    note: "甜度冰塊固定",
    items: [
      { name: "摩摩喳喳", price: 80 }, { name: "泰式奶茶", price: 60 },
      { name: "泰式奶綠", price: 60 }, { name: "泰式檸檬紅茶", price: 60 },
      { name: "泰式香茅蜜茶", price: 60 }
    ]
  }
];

// --- 產生模擬訂單資料供圖表顯示 ---
const generateMockOrders = () => {
  const orders = [];
  const today = new Date();
  // 生成 180 天的模擬資料 (半年) 以供周/月圖表顯示
  for (let i = 0; i < 180; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const numOrders = Math.floor(Math.random() * 8) + 2; 
    for (let j = 0; j < numOrders; j++) {
      orders.push({
        id: `ORD-${date.getTime()}-${j}`,
        timestamp: new Date(date.setHours(Math.random() * 10 + 10, Math.random() * 60)).getTime(),
        total: Math.floor(Math.random() * 600) + 120,
        items: [{ name: "模擬餐點", price: 120, quantity: 1 }]
      });
    }
  }
  return orders.sort((a, b) => b.timestamp - a.timestamp);
};

export default function App() {
  const [currentView, setCurrentView] = useState('pos'); // pos, dashboard, orders, menu
  const [menu, setMenu] = useState(INITIAL_MENU);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState(generateMockOrders());
  
  const [chartTimeRange, setChartTimeRange] = useState('daily'); // daily, weekly, monthly
  
  // POS 狀態
  const [activeCategory, setActiveCategory] = useState(menu[0].category);
  const [isCartOpen, setIsCartOpen] = useState(false); // 手機版購物車抽屜
  const [optionModalItem, setOptionModalItem] = useState(null); // 選項選擇彈窗

  // --- 格式化工具 ---
  const formatMoney = (amount) => `$${amount.toLocaleString()}`;
  const formatDate = (timestamp) => {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // --- POS 邏輯 ---
  const handleItemClick = (item) => {
    if (item.options && item.options.length > 0) {
      setOptionModalItem(item);
    } else {
      addToCart(item);
    }
  };

  const addToCart = (item, selectedOption = null) => {
    setCart(prev => {
      const existingItemIndex = prev.findIndex(
        cartItem => cartItem.name === item.name && cartItem.option === selectedOption
      );
      if (existingItemIndex >= 0) {
        const newCart = [...prev];
        newCart[existingItemIndex].quantity += 1;
        return newCart;
      }
      return [...prev, { ...item, option: selectedOption, quantity: 1, cartId: Date.now() + Math.random() }];
    });
    setOptionModalItem(null);
  };

  const updateCartQuantity = (index, delta) => {
    setCart(prev => {
      const newCart = [...prev];
      newCart[index].quantity += delta;
      if (newCart[index].quantity <= 0) {
        newCart.splice(index, 1);
      }
      return newCart;
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const checkout = () => {
    if (cart.length === 0) return;
    const newOrder = {
      id: `ORD-${Date.now()}`,
      timestamp: Date.now(),
      total: cartTotal,
      items: [...cart]
    };
    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    setIsCartOpen(false);
    alert('結帳成功！');
  };

  // --- 儀表板數據運算 ---
  const dashboardStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const oneWeekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    const itemSalesMap = {}; 
    const chartDataMap = [];

    // 初始化折線圖的 X 軸區間
    if (chartTimeRange === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        chartDataMap.push({ label: d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }), total: 0, sortKey: d.getTime() });
      }
    } else if (chartTimeRange === 'weekly') {
      for (let i = 3; i >= 0; i--) {
        chartDataMap.push({ label: `前 ${i===0?'本':i} 週`, total: 0, weekIdx: i });
      }
    } else if (chartTimeRange === 'monthly') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        chartDataMap.push({ label: `${d.getMonth()+1}月`, total: 0, month: d.getMonth(), year: d.getFullYear() });
      }
    }

    orders.forEach(order => {
      const orderDate = new Date(order.timestamp);
      
      // 總結卡片資料
      if (orderDate.toDateString() === todayStr) todayTotal += order.total;
      if (order.timestamp >= oneWeekAgo) weekTotal += order.total;
      if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) monthTotal += order.total;

      // 圖表數據映射
      if (chartTimeRange === 'daily') {
        const dateKey = orderDate.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
        const bucket = chartDataMap.find(b => b.label === dateKey);
        if (bucket) bucket.total += order.total;
      } else if (chartTimeRange === 'weekly') {
        const daysAgo = Math.floor((now.getTime() - order.timestamp) / (1000 * 60 * 60 * 24));
        const wIdx = Math.floor(daysAgo / 7);
        if (wIdx >= 0 && wIdx <= 3) {
          const bucket = chartDataMap.find(b => b.weekIdx === wIdx);
          if (bucket) bucket.total += order.total;
        }
      } else if (chartTimeRange === 'monthly') {
        const bucket = chartDataMap.find(b => b.month === orderDate.getMonth() && b.year === orderDate.getFullYear());
        if (bucket) bucket.total += order.total;
      }

      // 統計個別品項銷售量
      order.items.forEach(item => {
        const itemName = item.option ? `${item.name}(${item.option})` : item.name;
        if (!itemSalesMap[itemName]) {
          itemSalesMap[itemName] = { name: itemName, quantity: 0, revenue: 0 };
        }
        itemSalesMap[itemName].quantity += item.quantity;
        itemSalesMap[itemName].revenue += (item.price * item.quantity);
      });
    });

    const maxChartValue = Math.max(...chartDataMap.map(d => d.total), 100); // 確保圖表最大值不為 0
    const topItems = Object.values(itemSalesMap).sort((a, b) => b.quantity - a.quantity);

    return { todayTotal, weekTotal, monthTotal, chartData: chartDataMap, maxChartValue, topItems };
  }, [orders, chartTimeRange]);


  // --- 視圖元件：導覽列 ---
  const Sidebar = () => (
    <div className="w-full md:w-24 lg:w-64 bg-slate-900 text-white flex md:flex-col items-center lg:items-start justify-around md:justify-start p-4 shadow-xl z-20">
      <div className="hidden md:flex items-center gap-3 mb-10 w-full lg:px-4">
        <Store className="text-orange-500 w-8 h-8" />
        <h1 className="text-xl font-bold hidden lg:block text-orange-50">市場泰泰 POS</h1>
      </div>
      
      {[
        { id: 'pos', icon: ShoppingCart, label: '點餐收銀' },
        { id: 'dashboard', icon: LayoutDashboard, label: '營收數據' },
        { id: 'orders', icon: Receipt, label: '訂單管理' },
        { id: 'menu', icon: Settings, label: '菜單設定' },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => setCurrentView(item.id)}
          className={`flex items-center justify-center lg:justify-start gap-3 w-full p-3 lg:px-4 mb-2 rounded-xl transition-colors ${
            currentView === item.id ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <item.icon className="w-6 h-6" />
          <span className="hidden lg:block font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );

  // --- 視圖元件：POS 收銀 ---
  const POSView = () => {
    const currentCategoryData = menu.find(c => c.category === activeCategory);

    return (
      <div className="flex flex-col md:flex-row w-full h-full bg-slate-50 relative overflow-hidden">
        {/* 左側：分類與餐點 */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* 分類標籤 */}
          <div className="flex overflow-x-auto p-4 gap-2 bg-white shadow-sm shrink-0 no-scrollbar">
            {menu.map(cat => (
              <button
                key={cat.category}
                onClick={() => setActiveCategory(cat.category)}
                className={`px-6 py-3 rounded-full whitespace-nowrap font-bold transition-all ${
                  activeCategory === cat.category 
                    ? 'bg-orange-500 text-white shadow-md transform scale-105' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.category}
              </button>
            ))}
          </div>

          {/* 餐點列表 */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {currentCategoryData?.note && (
              <div className="mb-4 text-sm text-amber-700 bg-amber-50 inline-block px-3 py-1 rounded-md border border-amber-200">
                註：{currentCategoryData.note}
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentCategoryData?.items.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleItemClick(item)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-orange-200 transition-all active:scale-95 flex flex-col justify-between h-32"
                >
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">{item.name}</h3>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-orange-600 font-bold text-xl">{formatMoney(item.price)}</span>
                    {item.options && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">多選項</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右側：購物車 (電腦版顯示，手機版隱藏改為懸浮按鈕) */}
        <div className={`
          fixed inset-0 z-40 bg-white transform transition-transform duration-300 md:relative md:transform-none md:w-80 lg:w-96 md:border-l border-slate-200 flex flex-col shadow-2xl md:shadow-none
          ${isCartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
        `}>
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center md:bg-white md:text-slate-800 md:border-b">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 md:text-orange-500" />
              目前訂單
            </h2>
            <button className="md:hidden p-2" onClick={() => setIsCartOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {cart.length === 0 ? (
              <div className="text-center text-slate-400 mt-10 flex flex-col items-center">
                <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
                <p>購物車是空的</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={item.cartId} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">{item.name}</div>
                    {item.option && <div className="text-xs text-slate-500">[{item.option}]</div>}
                    <div className="text-orange-600 font-medium">{formatMoney(item.price)}</div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1">
                    <button onClick={() => updateCartQuantity(index, -1)} className="p-1 hover:bg-white rounded text-slate-600">
                      {item.quantity === 1 ? <Trash2 className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4" />}
                    </button>
                    <span className="font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateCartQuantity(index, 1)} className="p-1 hover:bg-white rounded text-slate-600">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500">總計金額</span>
              <span className="text-3xl font-bold text-slate-800">{formatMoney(cartTotal)}</span>
            </div>
            <button 
              onClick={checkout}
              disabled={cart.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-colors flex justify-center items-center gap-2
                ${cart.length > 0 ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <Receipt className="w-5 h-5" />
              確認結帳
            </button>
          </div>
        </div>

        {/* 手機版懸浮購物車按鈕 */}
        {!isCartOpen && cart.length > 0 && (
          <button 
            onClick={() => setIsCartOpen(true)}
            className="md:hidden fixed bottom-20 right-4 bg-orange-500 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 z-30"
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <span className="font-bold">{formatMoney(cartTotal)}</span>
          </button>
        )}

        {/* 選項選擇彈窗 */}
        {optionModalItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">選擇附餐 - {optionModalItem.name}</h3>
                <button onClick={() => setOptionModalItem(null)}><X className="w-6 h-6 text-slate-500" /></button>
              </div>
              <div className="p-4 space-y-3">
                {optionModalItem.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => addToCart(optionModalItem, opt)}
                    className="w-full p-4 border-2 border-slate-100 rounded-xl font-bold text-slate-700 hover:border-orange-500 hover:bg-orange-50 transition-colors flex justify-between items-center"
                  >
                    <span>{opt}</span>
                    <Check className="w-5 h-5 text-orange-500 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- 視圖元件：營收數據儀表板 ---
  const DashboardView = () => {
    const [aiInsight, setAiInsight] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const getInsight = async () => {
      setIsAiLoading(true);
      try {
         const top5 = dashboardStats.topItems.slice(0, 5).map(item => `${item.name}:${item.quantity}份`).join(', ');
         const prompt = `這是我泰式餐廳過去7天的每日營收資料：${JSON.stringify(dashboardStats.chartData)}。目前最熱賣的前五名品項是：${top5}。請以專業餐飲顧問的角度，針對營收趨勢與客戶品項喜好度，給予我簡短的經營策略調整建議（大約50字內）。`;
         const result = await callGemini(prompt, false);
         setAiInsight(result || '無法取得建議');
      } catch(e) {
         setAiInsight('無法取得 AI 建議，請稍後再試。');
      } finally {
         setIsAiLoading(false);
      }
    };

    return (
      <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50 h-full">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-orange-500" />
          營收數據可視化
        </h2>
        
        {/* AI 營收分析卡片 */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 rounded-2xl shadow-sm text-white mb-8 relative overflow-hidden">
          <h3 className="font-bold flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-200" />
            AI 餐飲顧問分析
          </h3>
          {isAiLoading ? (
            <p className="text-purple-100 animate-pulse">AI 正在分析您的營收數據...</p>
          ) : aiInsight ? (
            <p className="text-white font-medium leading-relaxed">{aiInsight}</p>
          ) : (
            <div>
              <p className="text-purple-100 mb-4 text-sm">一鍵分析近期營收趨勢，獲取專屬經營建議。</p>
              <button onClick={getInsight} className="bg-white text-purple-600 px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-purple-50 transition-colors">
                立即生成分析報告
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">今日營收</p>
              <p className="text-2xl font-bold text-slate-800">{formatMoney(dashboardStats.todayTotal)}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">近七天營收</p>
              <p className="text-2xl font-bold text-slate-800">{formatMoney(dashboardStats.weekTotal)}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <CalendarDays className="w-8 h-8" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">本月累積營收</p>
              <p className="text-2xl font-bold text-slate-800">{formatMoney(dashboardStats.monthTotal)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8 pb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              營收趨勢線圖
            </h3>
            {/* 時間切換按鈕 */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {[
                { id: 'daily', label: '每日' },
                { id: 'weekly', label: '每周' },
                { id: 'monthly', label: '每月' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setChartTimeRange(tab.id)}
                  className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${chartTimeRange === tab.id ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* SVG 折線圖區域 */}
          <div className="relative w-full h-56 mt-4 md:px-4">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon 
                fill="url(#area-gradient)" 
                points={`0,100 ${dashboardStats.chartData.map((d, i) => `${(i / Math.max(dashboardStats.chartData.length - 1, 1)) * 100},${100 - (d.total / dashboardStats.maxChartValue) * 80}`).join(' ')} 100,100`} 
              />
              <polyline 
                fill="none" 
                stroke="#f97316" 
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
                points={dashboardStats.chartData.map((d, i) => `${(i / Math.max(dashboardStats.chartData.length - 1, 1)) * 100},${100 - (d.total / dashboardStats.maxChartValue) * 80}`).join(' ')} 
              />
            </svg>
            
            {/* 數據節點與浮動提示 (Tooltip) */}
            {dashboardStats.chartData.map((d, i) => {
              const leftPos = `${(i / Math.max(dashboardStats.chartData.length - 1, 1)) * 100}%`;
              const bottomPos = `${(d.total / dashboardStats.maxChartValue) * 80}%`;
              return (
                <div key={i} className="absolute flex flex-col items-center justify-end group h-full top-0" style={{ left: leftPos, transform: 'translateX(-50%)', width: '40px' }}>
                  <div 
                    className="absolute w-3 h-3 bg-white border-2 border-orange-500 rounded-full group-hover:scale-150 transition-transform z-10 cursor-pointer" 
                    style={{ bottom: `calc(${bottomPos} - 6px)` }}
                  />
                  <div 
                    className="absolute opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-xs py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-20 shadow-lg"
                    style={{ bottom: `calc(${bottomPos} + 16px)` }}
                  >
                    {formatMoney(d.total)}
                  </div>
                  <span className="absolute -bottom-8 text-xs text-slate-500 font-medium whitespace-nowrap">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 新增：品項熱銷排行 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-8">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-500" />
            熱門品項排行 (客戶喜好度)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100 text-sm">
                  <th className="pb-3 font-medium">排名</th>
                  <th className="pb-3 font-medium">品項名稱</th>
                  <th className="pb-3 font-medium text-right">銷售數量</th>
                  <th className="pb-3 font-medium text-right">創造營收</th>
                </tr>
              </thead>
              <tbody>
                {dashboardStats.topItems.map((item, idx) => (
                  <tr key={item.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="py-3 text-slate-400 font-medium">#{idx + 1}</td>
                    <td className="py-3 font-bold text-slate-800">{item.name}</td>
                    <td className="py-3 text-right font-bold text-orange-500">{item.quantity} 份</td>
                    <td className="py-3 text-right text-slate-600">{formatMoney(item.revenue)}</td>
                  </tr>
                ))}
                {dashboardStats.topItems.length === 0 && (
                  <tr><td colSpan="4" className="py-4 text-center text-slate-400">尚無銷售紀錄</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // --- 視圖元件：訂單管理 ---
  const OrdersView = () => {
    const [editingOrder, setEditingOrder] = useState(null);
    const [editItems, setEditItems] = useState([]);

    const openEditOrder = (order) => {
      setEditingOrder(order);
      // 複製訂單中的品項以供修改
      setEditItems(JSON.parse(JSON.stringify(order.items)));
    };

    const updateEditItemQuantity = (index, delta) => {
      setEditItems(prev => {
        const newItems = [...prev];
        newItems[index].quantity += delta;
        if (newItems[index].quantity <= 0) {
          newItems.splice(index, 1);
        }
        return newItems;
      });
    };

    const saveOrderEdit = () => {
      if (editItems.length === 0) {
        if (window.confirm("該訂單已無任何品項，是否直接刪除此訂單？")) {
          setOrders(prev => prev.filter(o => o.id !== editingOrder.id));
          setEditingOrder(null);
        }
        return;
      }
      
      const newTotal = editItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      setOrders(prev => prev.map(o => 
        o.id === editingOrder.id ? { ...o, items: editItems, total: newTotal } : o
      ));
      setEditingOrder(null);
    };

    const deleteOrder = (id) => {
      if(window.confirm('確定要刪除這筆訂單嗎？這將影響營收數據。')) {
        setOrders(prev => prev.filter(o => o.id !== id));
      }
    };

    return (
      <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50 h-full relative">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">訂單管理</h2>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                  <th className="p-4 font-medium">訂單編號</th>
                  <th className="p-4 font-medium">時間</th>
                  <th className="p-4 font-medium">品項摘要</th>
                  <th className="p-4 font-medium">總金額</th>
                  <th className="p-4 font-medium text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 text-sm text-slate-600">{order.id}</td>
                    <td className="p-4 text-sm">{formatDate(order.timestamp)}</td>
                    <td className="p-4 text-sm text-slate-500 truncate max-w-[150px]">
                      {order.items.map(i => i.name).join(', ')}
                    </td>
                    <td className="p-4 font-bold text-orange-600">{formatMoney(order.total)}</td>
                    <td className="p-4 flex justify-center gap-2">
                      <button onClick={() => openEditOrder(order)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteOrder(order.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 編輯訂單 Modal */}
        {editingOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] flex flex-col">
              <h3 className="font-bold text-xl mb-2 text-slate-800">修改訂單內容</h3>
              <p className="text-sm text-slate-500 mb-4 border-b pb-4">訂單編號: {editingOrder.id}</p>
              
              <div className="overflow-y-auto flex-1 mb-4 space-y-3 pr-2 min-h-[200px]">
                {editItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                      {item.option && <div className="text-xs text-slate-500">[{item.option}]</div>}
                      <div className="text-orange-600 font-medium text-sm">{formatMoney(item.price)}</div>
                    </div>
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-1">
                      <button onClick={() => updateEditItemQuantity(index, -1)} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                        {item.quantity === 1 ? <Trash2 className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4" />}
                      </button>
                      <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                      <button onClick={() => updateEditItemQuantity(index, 1)} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {editItems.length === 0 && (
                  <div className="text-center text-slate-400 py-10">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>所有品項已移除</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mb-6 flex justify-between items-center">
                <span className="font-bold text-slate-700">重新計算總計:</span>
                <span className="text-2xl font-bold text-orange-600">
                  {formatMoney(editItems.reduce((sum, item) => sum + item.price * item.quantity, 0))}
                </span>
              </div>

              <div className="flex gap-3 mt-auto">
                <button onClick={() => setEditingOrder(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors">取消</button>
                <button onClick={saveOrderEdit} className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors">儲存修改</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- 視圖元件：菜單管理 ---
  const MenuManagerView = () => {
    const [editingItem, setEditingItem] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', price: '', category: '', options: '' });
    const [isAiGenerating, setIsAiGenerating] = useState(false);

    const openEditMenu = (item, categoryName) => {
      setEditingItem(item);
      setEditForm({ 
        name: item.name, 
        price: item.price.toString(), 
        category: categoryName,
        options: item.options ? item.options.join(',') : ''
      });
    };

    const openAddItem = (categoryName) => {
      setEditingItem({ isNew: true });
      setEditForm({ name: '', price: '', category: categoryName, options: '' });
    };

    const handleAIGenerateDish = async (categoryName) => {
      setIsAiGenerating(true);
      try {
        const prompt = `請為台灣的泰式餐廳發想一道極具吸引力、屬於「${categoryName}」分類的新菜色。`;
        const schema = {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            price: { type: "INTEGER" },
            options: { type: "STRING" }
          }
        };
        const result = await callGemini(prompt, true, schema);
        
        if (result) {
          setEditingItem({ isNew: true });
          setEditForm({
            name: result.name || '',
            price: result.price?.toString() || '',
            category: categoryName,
            options: result.options || ''
          });
        }
      } catch (e) {
        alert("AI 發想失敗，請稍後再試！");
      } finally {
        setIsAiGenerating(false);
      }
    };

    const saveMenuItem = () => {
      if (!editForm.name || !editForm.price) return alert("請填寫完整資訊");
      const price = parseInt(editForm.price, 10);
      const optionsArray = editForm.options.split(',').map(s => s.trim()).filter(s => s !== '');
      
      setMenu(prevMenu => {
        return prevMenu.map(cat => {
          if (cat.category !== editForm.category) return cat;

          const newItemData = { name: editForm.name, price };
          if (optionsArray.length > 0) newItemData.options = optionsArray;

          if (editingItem.isNew) {
            return { ...cat, items: [...cat.items, newItemData] };
          } else {
            return {
              ...cat,
              items: cat.items.map(i => i.name === editingItem.name ? newItemData : i)
            };
          }
        });
      });
      setEditingItem(null);
    };

    const deleteMenuItem = (itemName, categoryName) => {
      if(!window.confirm(`確定要刪除「${itemName}」嗎？`)) return;
      setMenu(prevMenu => prevMenu.map(cat => {
        if (cat.category !== categoryName) return cat;
        return { ...cat, items: cat.items.filter(i => i.name !== itemName) };
      }));
    };

    return (
      <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50 h-full relative">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6 text-orange-500" />
          菜單管理設定
        </h2>

        <div className="space-y-6">
          {menu.map(category => (
            <div key={category.category} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-slate-100 p-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-slate-800">{category.category}</h3>
              {category.note && <p className="text-xs text-slate-500">{category.note}</p>}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleAIGenerateDish(category.category)}
                disabled={isAiGenerating}
                className="hidden md:flex items-center gap-1 text-sm bg-purple-50 text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg font-medium hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" /> 
                {isAiGenerating ? '發想中...' : 'AI 推薦'}
              </button>
              <button 
                onClick={() => openAddItem(category.category)}
                className="flex items-center gap-1 text-sm bg-white border border-slate-300 px-3 py-1.5 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4" /> 新增餐點
              </button>
            </div>
          </div>
          <div className="p-0">
                {category.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <div>
                      <p className="font-bold text-slate-800">{item.name}</p>
                      {item.options && <p className="text-xs text-slate-400">選項: {item.options.join(', ')}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-orange-600 w-16 text-right">{formatMoney(item.price)}</span>
                      <button onClick={() => openEditMenu(item, category.category)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteMenuItem(item.name, category.category)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 編輯/新增菜單 Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <h3 className="font-bold text-xl mb-4 text-slate-800">
            {editingItem.isNew ? '新增餐點' : '編輯餐點'} - {editForm.category}
          </h3>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">餐點名稱</label>
              <input 
                type="text" 
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="例如：月亮蝦餅"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">價格 ($)</label>
              <input 
                type="number" 
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="例如：250"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">附餐選項 (選填)</label>
              <input 
                type="text" 
                value={editForm.options}
                onChange={(e) => setEditForm({ ...editForm, options: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="請用逗號分隔，例如：冬粉,媽媽麵"
              />
            </div>
          </div>
          <div className="flex gap-3">
                <button onClick={() => setEditingItem(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200">取消</button>
                <button onClick={saveMenuItem} className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600">儲存</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full font-sans overflow-hidden bg-slate-900">
      <Sidebar />
      <div className="flex-1 h-full overflow-hidden pb-16 md:pb-0">
        {currentView === 'pos' && <POSView />}
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'orders' && <OrdersView />}
        {currentView === 'menu' && <MenuManagerView />}
      </div>
      
      {/* 手機版底部導覽列 (僅在非 POS 畫面或沒有購物車時確保導覽可用，這裡簡化為始終顯示底部導覽列供切換) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 pb-safe z-20 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.1)]">
        {[
          { id: 'pos', icon: ShoppingCart, label: '點餐' },
          { id: 'dashboard', icon: LayoutDashboard, label: '營收' },
          { id: 'orders', icon: Receipt, label: '訂單' },
          { id: 'menu', icon: Settings, label: '設定' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`flex flex-col items-center p-2 min-w-[64px] rounded-xl transition-colors ${
              currentView === item.id ? 'text-orange-600 font-bold' : 'text-slate-400'
            }`}
          >
            <item.icon className="w-6 h-6 mb-1" />
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
