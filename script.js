// 全局变量 - 更新于 2026-02-12 - 修复背景更换功能
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let quickLinks = JSON.parse(localStorage.getItem('quickLinks')) || [];
let moodHistory = JSON.parse(localStorage.getItem('moodHistory')) || [];
let pomodoroFocusHistory = JSON.parse(localStorage.getItem('pomodoroFocusHistory')) || [];
let pomodoroInterval = null;
let pomodoroTime = 25 * 60; // 25分钟
let isPomodoroRunning = false;
let pomodoroStartTime = null;

// DOM元素
const elements = {
    clock: document.getElementById('clock'),
    greeting: document.getElementById('greeting'),
    greetingMain: document.getElementById('greeting-main'),
    greetingSub: document.getElementById('greeting-sub'),
    themeToggle: document.getElementById('theme-toggle'),
    weatherLocation: document.getElementById('weather-location'),
    weatherTemp: document.getElementById('weather-temp'),
    weatherHumidity: document.getElementById('weather-humidity'),
    todoInput: document.getElementById('todo-input'),
    todoPriority: document.getElementById('todo-priority'),
    addTodoBtn: document.getElementById('add-todo-btn'),
    todoItems: document.getElementById('todo-items'),
    quickLinks: document.getElementById('quick-links'),
    addLinkBtn: document.getElementById('add-link-btn'),
    linkModal: document.getElementById('link-modal'),
    linkName: document.getElementById('link-name'),
    linkUrl: document.getElementById('link-url'),
    saveLinkBtn: document.getElementById('save-link-btn'),
    cancelLinkBtn: document.getElementById('cancel-link-btn'),
    pomodoroTimer: document.getElementById('pomodoro-timer'),
    startPomodoro: document.getElementById('start-pomodoro'),
    pausePomodoro: document.getElementById('pause-pomodoro'),
    resetPomodoro: document.getElementById('reset-pomodoro'),
    quickSearchInput: document.getElementById('quick-search-input'),
    todoModal: document.getElementById('todo-modal'),
    todoEditInput: document.getElementById('todo-edit-input'),
    todoEditPriority: document.getElementById('todo-edit-priority'),
    saveTodoBtn: document.getElementById('save-todo-btn'),
    cancelTodoBtn: document.getElementById('cancel-todo-btn')
}; 

// 天气获取函数
async function initWeather() {
    try {
        // 1. 使用浏览器定位获取经纬度
        const position = await new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject
                );
            } else {
                reject(new Error('浏览器不支持地理定位'));
            }
        });
        
        const { latitude, longitude } = position.coords;
        
        // 2. 通过 fetch 请求和风天气接口
        const apiKey = '请填入apikey';
        const url = `https://devapi.qweather.com/v7/weather/now?location=${longitude},${latitude}&key=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('天气接口请求失败');
        }
        
        const data = await response.json();
        
        if (data.code === '200') {
            // 3. 将结果更新到 DOM 元素中
            elements.weatherLocation.textContent = data.location.name;
            elements.weatherTemp.textContent = `${Math.round(parseFloat(data.now.temp))}°C`;
            elements.weatherHumidity.textContent = `湿度: ${data.now.humidity}%`;
            
            // 更新天气图标
            const weatherIcon = document.getElementById('weather-icon');
            if (weatherIcon) {
                const weatherText = data.now.text;
                const iconMap = {
                    '晴': '☀️', '多云': '⛅', '阴': '☁️', 
                    '雨': '🌧️', '雪': '❄️', '雾': '🌫️'
                };
                weatherIcon.textContent = iconMap[weatherText] || '🌤️';
            }
        } else {
            throw new Error('天气数据获取失败');
        }
        
    } catch (error) {
        console.error('获取天气失败:', error);
        
        // 4. 处理定位被拒绝时的错误提示
        if (error.code === 1) {
            // 用户拒绝定位
            elements.weatherLocation.textContent = '定位被拒绝';
        } else {
            // 其他错误，显示默认北京天气
            elements.weatherLocation.textContent = '北京';
        }
        
        // 设置默认天气数据
        elements.weatherTemp.textContent = '15°C';
        elements.weatherHumidity.textContent = '湿度: 50%';
        
        // 更新默认天气图标
        const weatherIcon = document.getElementById('weather-icon');
        if (weatherIcon) {
            weatherIcon.textContent = '☀️';
        }
    }
}

// 初始化
function init() {
    updateClock();
    updateGreeting();
    loadTheme();
    loadQuickLinks();
    renderTodos();
    initWeather();
    updateMoodStats();
    initEventListeners();
    initScrollMaskListeners();
}

// 便携搜索
function performQuickSearch() {
    const query = elements.quickSearchInput.value.trim();
    if (!query) return;
    
    let url;
    
    // 根据前缀选择搜索引擎
    if (query.startsWith('g:')) {
        // 谷歌搜索
        url = `https://www.google.com/search?q=${encodeURIComponent(query.substring(2))}`;
    } else if (query.startsWith('b:')) {
        // 百度搜索
        url = `https://www.baidu.com/s?wd=${encodeURIComponent(query.substring(2))}`;
    } else {
        // 默认使用谷歌
        url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
    
    window.open(url, '_blank');
    elements.quickSearchInput.value = '';
}

// 心情记录
function addMoodRecord(mood) {
    const moodEmojis = {
        happy: '😊',
        excited: '🤩',
        calm: '😌',
        tired: '😴',
        sad: '😢',
        angry: '😠',
        anxious: '😰',
        confused: '😕'
    };
    
    const moodNames = {
        happy: '开心',
        excited: '兴奋',
        calm: '平静',
        tired: '疲惫',
        sad: '难过',
        angry: '生气',
        anxious: '焦虑',
        confused: '困惑'
    };
    
    const record = {
        mood,
        emoji: moodEmojis[mood],
        name: moodNames[mood],
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString()
    };
    
    moodHistory.push(record);
    
    // 只保留最近1天的记录
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    moodHistory = moodHistory.filter(record => new Date(record.timestamp) >= oneDayAgo);
    
    localStorage.setItem('moodHistory', JSON.stringify(moodHistory));
    updateMoodStats();
}

// 更新心情统计
function updateMoodStats() {
    // 计算心情值
    const moodValues = {
        happy: 5,
        excited: 5,
        calm: 4,
        tired: 3,
        confused: 3,
        sad: 2,
        anxious: 2,
        angry: 1
    };
    
    if (moodHistory.length === 0) {
        // 没有记录时的默认值
        updateMoodIndicator(0, 'calm');
        return;
    }
    
    // 计算平均心情值
    const totalValue = moodHistory.reduce((sum, record) => {
        return sum + (moodValues[record.mood] || 3);
    }, 0);
    
    const averageValue = totalValue / moodHistory.length;
    
    // 确定当前最多选择的心情
    let dominantMood = 'calm';
    const moodCounts = {
        happy: 0,
        excited: 0,
        calm: 0,
        tired: 0,
        confused: 0,
        sad: 0,
        anxious: 0,
        angry: 0
    };
    
    moodHistory.forEach(record => {
        if (moodCounts.hasOwnProperty(record.mood)) {
            moodCounts[record.mood]++;
        }
    });
    
    let maxCount = 0;
    Object.keys(moodCounts).forEach(mood => {
        if (moodCounts[mood] > maxCount) {
            maxCount = moodCounts[mood];
            dominantMood = mood;
        }
    });
    
    // 更新心情指示器
    updateMoodIndicator(averageValue, dominantMood);
}

// 更新心情指示器
function updateMoodIndicator(value, mood) {
    const moodIndicator = document.getElementById('mood-indicator');
    const moodScore = document.getElementById('mood-score');
    
    if (moodIndicator) {
        // 移除所有心情颜色类
        moodIndicator.className = 'mood-indicator';
        // 添加当前心情颜色类
        moodIndicator.classList.add(mood);
    }
    
    if (moodScore) {
        moodScore.textContent = value.toFixed(1);
    }
}



function updateScrollMask(container) {
    if (!container) return;
    
    const hasOverflow = container.scrollHeight > container.clientHeight;
    const isAtTop = container.scrollTop <= 5;
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 5;
    
    container.classList.toggle('scroll-mask-top', hasOverflow && !isAtTop);
    container.classList.toggle('scroll-mask-bottom', hasOverflow && !isAtBottom);
}

function initScrollMaskListeners() {
    const containers = [elements.quickLinks, elements.todoItems];
    
    containers.forEach(container => {
        if (container) {
            container.addEventListener('scroll', () => updateScrollMask(container));
        }
    });
}

// 更新时钟
function updateClock() {
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    elements.clock.textContent = timeString;
    setTimeout(updateClock, 1000);
}

// 更新问候语
function updateGreeting() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 是周日
    
    // 触发动画效果的函数
    function triggerAnimation(element) {
        element.style.animation = 'none';
        void element.offsetWidth; // 强制重排
        element.style.animation = 'fadeIn 0.8s ease-in-out';
    }
    
    // 1. 首先检查心情状态（2小时内）
    if (moodHistory.length > 0) {
        const lastMoodRecord = moodHistory[moodHistory.length - 1];
        const lastMood = lastMoodRecord.mood;
        const lastMoodTime = new Date(lastMoodRecord.timestamp);
        const timeDiff = now - lastMoodTime;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        // 如果最近2小时内心情是难过或疲惫，显示关怀问候
        if (hoursDiff <= 2 && (lastMood === 'sad' || lastMood === 'tired')) {
            const careGreetings = [
                '我知道你最近有点累，记得照顾好自己，一切都会好起来的。❤️',
                '累了就休息一下，慢慢来，我们不赶时间。🌟',
                '难过的时候记得深呼吸，我在这里陪着你。🌙',
                '疲惫是身体给你的信号，好好休息，充好电再出发。💤',
                '不管发生什么，你都不是一个人在面对，一切都会过去的。🌈'
            ];
            const randomCareGreeting = careGreetings[Math.floor(Math.random() * careGreetings.length)];
            
            // 根据时间设置主标题
            let mainTitle;
            if (hour >= 5 && hour < 12) {
                mainTitle = '早安';
            } else if (hour < 18) {
                mainTitle = '午安';
            } else {
                mainTitle = '晚安';
            }
            
            // 更新内容并触发动画
            elements.greetingMain.textContent = mainTitle;
            elements.greetingSub.textContent = randomCareGreeting;
            triggerAnimation(elements.greetingMain);
            triggerAnimation(elements.greetingSub);
            return;
        }
    }
    
    // 2. 定义更细致的时段和问候语库
    const greetings = {
        // 主标题
        mainTitles: {
            earlyMorning: '早安',
            morning: '上午好',
            noon: '中午好',
            afternoon: '下午好',
            evening: '晚上好',
            night: '晚安'
        },
        // 副标题（寄语）
        subtitles: {
            // 清晨 (5-9点)
            earlyMorning: [
                '清晨的阳光最珍贵，开启元气满满的一天吧！☀️',
                '世界正在苏醒，你也一样充满活力。🌱',
                '记得喝杯温水，为身体注入能量。💧',
                '早起的鸟儿有虫吃，开始新的冒险！🐦',
                '晨光正好，心情也跟着明朗起来了。🌅'
            ],
            // 上午 (9-11点)
            morning: [
                '现在是效率最高的时间段，专注当下。💪',
                '让我们一起专注于重要的事情。🎯',
                '工作再忙也要记得适当休息哦。☕',
                '每一个小目标的完成都是进步。📈',
                '专注是一种力量，现在正是发挥的时候。⚡'
            ],
            // 中午 (11-14点)
            noon: [
                '别忘了午休，适当的放松能让下午事半功倍。☕',
                '午餐时间到，好好犒劳一下自己的胃。🍽️',
                '短暂的休息是为了更好地出发。😴',
                '记得吃饭哦，身体是革命的本钱。🥗',
                '让大脑和身体都得到放松。🌿'
            ],
            // 下午 (14-18点)
            afternoon: [
                '午后的时光，继续为你的目标努力。🚀',
                '保持专注，距离目标又近了一步。🌟',
                '让我们充满动力地前进。💨',
                '每一份努力都不会被辜负。💎',
                '午后的阳光，和你的努力一样耀眼。☀️'
            ],
            // 傍晚 (18-22点)
            evening: [
                '辛苦了一天，享受属于自己的时刻。🌙',
                '放下工作，好好放松一下吧。🎮',
                '今天的你也很棒，值得奖励自己。🎉',
                '适合做一些让自己开心的事。🎨',
                '辛苦了，今晚只有温柔和轻松。✨'
            ],
            // 深夜 (22-5点)
            night: [
                '星光伴你入梦，早点休息吧。💤',
                '放下手机，好好睡一觉。🌌',
                '明天又是新的开始，好梦。😴',
                '让身体和心灵都得到充分的休息。🌙',
                '愿你在梦中找到属于自己的宁静。🌟'
            ],
            // 周末专属
            weekend: [
                '放慢步调去生活，享受美好时光。🌸',
                '今天适合去见想见的人，做想做的事。🎉',
                '休息也是一种进步，好好放松自己。🌿',
                '给自己充充电，下周再战！⚡',
                '忘记工作的烦恼，尽情享受。🎈'
            ]
        }
    };
    
    // 随机获取问候语的函数
    const getRandomGreeting = (greetingArray) => {
        return greetingArray[Math.floor(Math.random() * greetingArray.length)];
    };
    
    let mainTitle, subtitle;
    
    // 3. 检查是否是周末
    if (day === 0 || day === 6) {
        // 周末使用周末专属副标题
        mainTitle = '周末愉快';
        subtitle = getRandomGreeting(greetings.subtitles.weekend);
    } else {
        // 工作日根据时间选择问候语
        let timeSlot;
        if (hour >= 5 && hour < 9) {
            timeSlot = 'earlyMorning';
        } else if (hour >= 9 && hour < 11) {
            timeSlot = 'morning';
        } else if (hour >= 11 && hour < 14) {
            timeSlot = 'noon';
        } else if (hour >= 14 && hour < 18) {
            timeSlot = 'afternoon';
        } else if (hour >= 18 && hour < 22) {
            timeSlot = 'evening';
        } else {
            timeSlot = 'night';
        }
        
        mainTitle = greetings.mainTitles[timeSlot];
        subtitle = getRandomGreeting(greetings.subtitles[timeSlot]);
    }
    
    // 4. 更新内容并触发动画
    elements.greetingMain.textContent = mainTitle;
    elements.greetingSub.textContent = subtitle;
    triggerAnimation(elements.greetingMain);
    triggerAnimation(elements.greetingSub);
}

// 主题切换
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    elements.themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    elements.themeToggle.textContent = newTheme === 'light' ? '🌙' : '☀️';
}

// 待办清单
function renderTodos() {
    elements.todoItems.innerHTML = '';
    
    todos.forEach((todo, index) => {
        const todoItem = document.createElement('div');
        todoItem.className = `todo-item ${todo.priority === 'urgent' ? 'urgent' : ''}`;
        todoItem.draggable = true;
        todoItem.dataset.index = index;
        
        todoItem.innerHTML = `
            <input type="checkbox" ${todo.completed ? 'checked' : ''} class="todo-checkbox">
            <span class="todo-text ${todo.completed ? 'completed' : ''}">${todo.text}</span>
            <div class="todo-actions">
                <button class="edit-todo">编辑</button>
                <button class="delete-todo">删除</button>
            </div>
        `;
        
        elements.todoItems.appendChild(todoItem);
    });
    
    addTodoEventListeners();
    initDragAndDrop();
    updateScrollMask(elements.todoItems);
}

function addTodoEventListeners() {
    const checkboxes = document.querySelectorAll('.todo-checkbox');
    const editButtons = document.querySelectorAll('.edit-todo');
    const deleteButtons = document.querySelectorAll('.delete-todo');
    
    checkboxes.forEach((checkbox, index) => {
        checkbox.addEventListener('change', () => {
            todos[index].completed = checkbox.checked;
            localStorage.setItem('todos', JSON.stringify(todos));
            renderTodos();
        });
    });
    
    editButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            // 打开编辑模态框
            elements.todoEditInput.value = todos[index].text;
            elements.todoEditPriority.value = todos[index].priority;
            elements.saveTodoBtn.dataset.index = index;
            elements.todoModal.classList.add('show');
        });
    });
    
    deleteButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            todos.splice(index, 1);
            localStorage.setItem('todos', JSON.stringify(todos));
            renderTodos();
        });
    });
}

function addTodo() {
    const text = elements.todoInput.value.trim();
    const priority = elements.todoPriority.value;
    
    if (text) {
        todos.push({ text, priority, completed: false });
        localStorage.setItem('todos', JSON.stringify(todos));
        elements.todoInput.value = '';
        renderTodos();
    }
}

// 拖拽排序
function initDragAndDrop() {
    const todoItems = document.querySelectorAll('.todo-item');
    let draggedItem = null;
    
    todoItems.forEach(item => {
        item.addEventListener('dragstart', function() {
            draggedItem = this;
            setTimeout(() => this.classList.add('dragging'), 0);
        });
        
        item.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            draggedItem = null;
        });
        
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        item.addEventListener('dragenter', function(e) {
            e.preventDefault();
            if (this !== draggedItem) {
                this.style.opacity = '0.5';
            }
        });
        
        item.addEventListener('dragleave', function() {
            this.style.opacity = '1';
        });
        
        item.addEventListener('drop', function() {
            this.style.opacity = '1';
            if (this !== draggedItem) {
                const draggedIndex = parseInt(draggedItem.dataset.index);
                const dropIndex = parseInt(this.dataset.index);
                
                // 重新排序
                const [movedTodo] = todos.splice(draggedIndex, 1);
                todos.splice(dropIndex, 0, movedTodo);
                
                localStorage.setItem('todos', JSON.stringify(todos));
                renderTodos();
            }
        });
    });
}

// 快速链接拖拽排序
function initLinkDragAndDrop() {
    const linkItems = document.querySelectorAll('.quick-link-item');
    let draggedItem = null;
    
    linkItems.forEach(item => {
        item.addEventListener('dragstart', function() {
            draggedItem = this;
            setTimeout(() => this.classList.add('dragging'), 0);
        });
        
        item.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            draggedItem = null;
        });
        
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        item.addEventListener('dragenter', function(e) {
            e.preventDefault();
            if (this !== draggedItem) {
                this.style.opacity = '0.5';
            }
        });
        
        item.addEventListener('dragleave', function() {
            this.style.opacity = '1';
        });
        
        item.addEventListener('drop', function() {
            this.style.opacity = '1';
            if (this !== draggedItem) {
                const draggedIndex = parseInt(draggedItem.dataset.index);
                const dropIndex = parseInt(this.dataset.index);
                
                // 重新排序
                const [movedLink] = quickLinks.splice(draggedIndex, 1);
                quickLinks.splice(dropIndex, 0, movedLink);
                
                localStorage.setItem('quickLinks', JSON.stringify(quickLinks));
                loadQuickLinks();
            }
        });
    });
}

// 快速链接
function loadQuickLinks() {
    elements.quickLinks.innerHTML = '';
    
    quickLinks.forEach((link, index) => {
        const linkItem = document.createElement('div');
        linkItem.className = 'quick-link-item';
        linkItem.draggable = true;
        linkItem.dataset.index = index;
        
        linkItem.innerHTML = `
            <a href="${link.url}" target="_blank">${link.name}</a>
            <div class="link-actions">
                <button class="edit-link" data-index="${index}">编辑</button>
                <button class="delete-link" data-index="${index}">删除</button>
            </div>
        `;
        
        elements.quickLinks.appendChild(linkItem);
    });
    
    addLinkEventListeners();
    updateScrollMask(elements.quickLinks);
    initLinkDragAndDrop();
}

function addLinkEventListeners() {
    const editButtons = document.querySelectorAll('.edit-link');
    const deleteButtons = document.querySelectorAll('.delete-link');
    
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            const link = quickLinks[index];
            elements.linkName.value = link.name;
            elements.linkUrl.value = link.url;
            elements.saveLinkBtn.dataset.index = index;
            elements.linkModal.classList.add('show');
        });
    });
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            quickLinks.splice(index, 1);
            localStorage.setItem('quickLinks', JSON.stringify(quickLinks));
            loadQuickLinks();
        });
    });
}

function saveLink() {
    const name = elements.linkName.value.trim();
    const url = elements.linkUrl.value.trim();
    const index = elements.saveLinkBtn.dataset.index;
    
    if (name && url) {
        if (index !== undefined) {
            // 编辑现有链接
            quickLinks[index] = { name, url };
        } else {
            // 添加新链接
            quickLinks.push({ name, url });
        }
        
        localStorage.setItem('quickLinks', JSON.stringify(quickLinks));
        loadQuickLinks();
        closeLinkModal();
    }
}

function closeLinkModal() {
    elements.linkModal.classList.remove('show');
    elements.linkName.value = '';
    elements.linkUrl.value = '';
    delete elements.saveLinkBtn.dataset.index;
}

function saveTodoEdit() {
    const text = elements.todoEditInput.value.trim();
    const priority = elements.todoEditPriority.value;
    const index = elements.saveTodoBtn.dataset.index;
    
    if (text) {
        todos[index] = {
            ...todos[index],
            text: text,
            priority: priority
        };
        localStorage.setItem('todos', JSON.stringify(todos));
        renderTodos();
        closeTodoModal();
    }
}

function closeTodoModal() {
    elements.todoModal.classList.remove('show');
    elements.todoEditInput.value = '';
    delete elements.saveTodoBtn.dataset.index;
}

// 专注模式（番茄钟）
function updatePomodoroTimer() {
    const minutes = Math.floor(pomodoroTime / 60);
    const seconds = pomodoroTime % 60;
    elements.pomodoroTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startPomodoro() {
    if (!isPomodoroRunning) {
        isPomodoroRunning = true;
        pomodoroStartTime = new Date();
        pomodoroInterval = setInterval(() => {
            pomodoroTime--;
            updatePomodoroTimer();
            
            if (pomodoroTime <= 0) {
                clearInterval(pomodoroInterval);
                isPomodoroRunning = false;
                // 记录专注时长
                const endTime = new Date();
                const focusDuration = (endTime - pomodoroStartTime) / 1000 / 60; // 转换为分钟
                saveFocusSession(focusDuration);
                alert('时间到！休息一下吧');
                // 可以添加声音提示
            }
        }, 1000);
    }
}

function pausePomodoro() {
    if (isPomodoroRunning) {
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
    }
}

function saveFocusSession(duration) {
    const session = {
        date: new Date().toISOString().split('T')[0],
        duration: duration,
        timestamp: new Date().toISOString()
    };
    
    pomodoroFocusHistory.push(session);
    
    // 只保留最近30天的记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    pomodoroFocusHistory = pomodoroFocusHistory.filter(session => new Date(session.timestamp) >= thirtyDaysAgo);
    
    localStorage.setItem('pomodoroFocusHistory', JSON.stringify(pomodoroFocusHistory));
    
    // 更新统计
    updateFocusStats();
}

function resetPomodoro() {
    clearInterval(pomodoroInterval);
    isPomodoroRunning = false;
    pomodoroTime = 25 * 60;
    updatePomodoroTimer();
}



// 事件监听器
function initEventListeners() {
    // 主题切换
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // 待办清单
    elements.addTodoBtn.addEventListener('click', addTodo);
    elements.todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });
    
    // 快速链接
    elements.addLinkBtn.addEventListener('click', () => {
        closeLinkModal();
        elements.linkModal.classList.add('show');
    });
    
    elements.saveLinkBtn.addEventListener('click', saveLink);
    elements.cancelLinkBtn.addEventListener('click', closeLinkModal);
    
    // 待办事项编辑模态框
    elements.saveTodoBtn.addEventListener('click', saveTodoEdit);
    elements.cancelTodoBtn.addEventListener('click', closeTodoModal);
    
    // 专注模式
    elements.startPomodoro.addEventListener('click', startPomodoro);
    elements.pausePomodoro.addEventListener('click', pausePomodoro);
    elements.resetPomodoro.addEventListener('click', resetPomodoro);
    
    // 便携搜索
    elements.quickSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performQuickSearch();
    });
    
    // 心情记录
    const moodBtns = document.querySelectorAll('.mood-btn');
    moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mood = btn.dataset.mood;
            addMoodRecord(mood);
        });
    });
    
    // 专注模式分段控件
    const segmentBtns = document.querySelectorAll('.segment-btn');
    segmentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有按钮的active类
            segmentBtns.forEach(b => b.classList.remove('active'));
            // 添加当前按钮的active类
            btn.classList.add('active');
            // 更新统计
            updateFocusStats(btn.dataset.period);
        });
    });
    
    // 点击外部关闭模态框
    window.addEventListener('click', (e) => {
        if (e.target === elements.linkModal) {
            closeLinkModal();
        }
        if (e.target === elements.todoModal) {
            closeTodoModal();
        }
    });
}

// 更新专注统计
function updateFocusStats(period = 'week') {
    const today = new Date();
    let startDate, labels, dataPoints;
    
    if (period === 'week') {
        // 生成过去7天的标签（Mon-Sun）
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6);
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        dataPoints = 7;
    } else {
        // 生成过去4周的标签
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 27);
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        dataPoints = 4;
    }
    
    // 计算每天/每周的专注时长
    const focusData = [];
    let totalFocus = 0;
    
    for (let i = 0; i < dataPoints; i++) {
        const currentDate = new Date(startDate);
        if (period === 'week') {
            currentDate.setDate(startDate.getDate() + i);
        } else {
            currentDate.setDate(startDate.getDate() + i * 7);
        }
        
        const dateStr = currentDate.toISOString().split('T')[0];
        let dayFocus = 0;
        
        if (period === 'week') {
            // 计算当天的专注时长
            dayFocus = pomodoroFocusHistory
                .filter(session => session.date === dateStr)
                .reduce((sum, session) => sum + session.duration, 0);
        } else {
            // 计算当周的专注时长
            const weekEndDate = new Date(currentDate);
            weekEndDate.setDate(currentDate.getDate() + 6);
            const weekEndStr = weekEndDate.toISOString().split('T')[0];
            
            dayFocus = pomodoroFocusHistory
                .filter(session => {
                    return session.date >= dateStr && session.date <= weekEndStr;
                })
                .reduce((sum, session) => sum + session.duration, 0);
        }
        
        focusData.push(dayFocus);
        totalFocus += dayFocus;
    }
    
    // 更新总计显示
    const totalHours = (totalFocus / 60).toFixed(1);
    const summaryElement = document.getElementById('focus-summary');
    if (summaryElement) {
        summaryElement.textContent = period === 'week' ? 
            `本周累计专注：${totalHours} 小时` : 
            `本月累计专注：${totalHours} 小时`;
    }
    
    // 检查成就
    checkAchievement(period, totalHours);
    
    // 生成柱状图
    renderChart(focusData, labels);
}

// 检查成就
function checkAchievement(period, currentTotal) {
    const achievementElement = document.getElementById('achievement-icon');
    if (!achievementElement) return;
    
    // 简单的成就逻辑：当周/月专注时长超过10小时
    if (parseFloat(currentTotal) > 10) {
        achievementElement.style.display = 'block';
    } else {
        achievementElement.style.display = 'none';
    }
}

// 生成柱状图
function renderChart(data, labels) {
    const barsContainer = document.getElementById('chart-bars');
    const labelsContainer = document.getElementById('chart-labels');
    
    if (!barsContainer || !labelsContainer) return;
    
    // 清空容器
    barsContainer.innerHTML = '';
    labelsContainer.innerHTML = '';
    
    // 计算最大值，用于缩放柱状图
    const maxValue = Math.max(...data, 1); // 确保至少有1的值
    
    // 生成柱状图
    data.forEach((value, index) => {
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        // 计算高度百分比
        const height = (value / maxValue) * 100;
        bar.style.height = `${height}%`;
        // 延迟动画，使柱状图依次出现
        bar.style.animationDelay = `${index * 0.1}s`;
        barsContainer.appendChild(bar);
        
        const label = document.createElement('div');
        label.className = 'chart-label';
        label.textContent = labels[index];
        labelsContainer.appendChild(label);
    });
}

// 当DOM完全加载后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    init();
    
    // 初始化专注统计
    updateFocusStats();
});