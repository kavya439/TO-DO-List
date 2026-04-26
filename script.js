const SK = 'capy3_tasks';
const STK = 'capy3_streak';

function ld() {
    try { return JSON.parse(localStorage.getItem(SK)) || { tasks: [], lastDate: '' }; }
    catch(e) { return { tasks: [], lastDate: '' }; }
}
function sv(s) { try { localStorage.setItem(SK, JSON.stringify(s)); } catch(e){} }
function ldSt() {
    try { return JSON.parse(localStorage.getItem(STK)) || { count: 0, last: '' }; }
    catch(e) { return { count: 0, last: '' }; }
}
function svSt(s) { try { localStorage.setItem(STK, JSON.stringify(s)); } catch(e){} }

function today() { return new Date().toISOString().slice(0, 10); }

function getState() {
    let s = ld();
    if (s.lastDate !== today()) {
        s.tasks = s.tasks.map(t => t.isDaily ? { ...t, done: false } : t);
        s.tasks = s.tasks.filter(t => t.isDaily || t.created === today());
        s.lastDate = today();
        sv(s);
    }
    return s;
}
function getTasks() { return getState().tasks; }
function saveTasks(tasks) { const s = getState(); s.tasks = tasks; sv(s); }

let currentTab = 'all';
let notifTimers = [];
let rewardShown = false;

// ── Notifications ──────────────────────────────────────────────
function scheduleNotifs(tasks) {
    notifTimers.forEach(clearTimeout);
    notifTimers = [];
    tasks.forEach(t => {
        if (!t.time || t.done) return;
        const [h, m] = t.time.split(':').map(Number);
        const now = new Date(), tgt = new Date();
        tgt.setHours(h, m, 0, 0);
        let diff = tgt - now;
        if (diff < 0) diff += 86400000;
        const tid = setTimeout(() => {
            const current = getTasks().find(x => x.id === t.id);
            if (current && !current.done) {
                showBanner('🔔 Reminder: "' + t.text + '"', 'info');
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Capy Tasks', { body: 'Time for: ' + t.text });
                }
            }
        }, diff);
        notifTimers.push(tid);
    });
}

function requestNotifPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ── Banner ──────────────────────────────────────────────────────
function showBanner(msg, type) {
    const b = document.getElementById('banner');
    if (!b) return;
    b.className = 'banner ' + type;
    b.textContent = msg;
    b.style.display = 'flex';
    setTimeout(() => { b.style.display = 'none'; }, 5000);
}

// ── Progress ────────────────────────────────────────────────────
function getPct() {
    const t = getTasks();
    if (!t.length) return 0;
    return Math.round(t.filter(x => x.done).length / t.length * 100);
}

function updateStats() {
    const tasks = getTasks();
    const done = tasks.filter(t => t.done).length;
    const pct = getPct();
    const st = ldSt();

    const el = id => document.getElementById(id);
    if (el('statDone')) el('statDone').textContent = done;
    if (el('statTotal')) el('statTotal').textContent = tasks.length;
    if (el('statStreak')) el('statStreak').textContent = st.count + '🔥';
    if (el('progFill')) el('progFill').style.width = pct + '%';
    if (el('progPct')) el('progPct').textContent = pct + '%';
}

// ── Reward ──────────────────────────────────────────────────────
function checkAllDone() {
    const tasks = getTasks();
    if (!tasks.length || rewardShown) return;
    if (tasks.every(t => t.done)) {
        rewardShown = true;
        const st = ldSt(), td = today();
        if (st.last !== td) {
            const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            st.count = (st.last === yest) ? st.count + 1 : 1;
            st.last = td;
            svSt(st);
        }
        updateStats();
        showReward(st.count);
    }
}

function showReward(n) {
    const sec = document.getElementById('rewardSec');
    if (!sec) return;
    const titles = ['All done! Capy is proud!', 'Two days running!', 'Three days! On fire!', 'Incredible streak!', 'You\'re a legend!'];
    const subs   = ['You crushed it today.', 'Capy did a little wiggle.', 'Capy is absolutely glowing.', 'Capy is dancing in the mud!', 'Capy bows to you.'];
    const title = titles[Math.min(n - 1, titles.length - 1)];
    const sub   = subs[Math.min(n - 1, subs.length - 1)];
    const cols = ['#f7bc95','#97C459','#85B7EB','#ED93B1','#FAC775','#5DCAA5'];

    let confetti = '';
    for (let i = 0; i < 18; i++) {
        const x = Math.random() * 100;
        const delay = (Math.random() * 1.2).toFixed(2);
        const dur   = (1.3 + Math.random() * 0.9).toFixed(2);
        const color = cols[Math.floor(Math.random() * cols.length)];
        confetti += `<div class="confetti-piece" style="left:${x.toFixed(1)}%;top:0;background:${color};animation:confettiFall ${dur}s ${delay}s ease-in forwards"></div>`;
    }

    sec.innerHTML = `
        <div class="reward-wrap">
            ${confetti}
            <div class="reward-emoji">🦫</div>
            <div class="reward-title">${title}</div>
            <div class="reward-sub">${sub}</div>
            <div class="reward-streak">${n}-day streak 🔥</div>
            <button class="reward-close" id="rewardClose">Keep going →</button>
        </div>`;

    document.getElementById('rewardClose').addEventListener('click', () => {
        sec.innerHTML = '';
        rewardShown = false;
    });
    sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Render tasks ────────────────────────────────────────────────
function getFiltered() {
    const t = getTasks();
    if (currentTab === 'daily') return t.filter(x => x.isDaily);
    if (currentTab === 'today') return t.filter(x => !x.isDaily);
    return t;
}

function renderTasks() {
    const list = document.getElementById('taskList');
    if (!list) return;
    list.innerHTML = '';
    const filtered = getFiltered();

    if (!filtered.length) {
        list.innerHTML = `<div class="empty-state">${
            currentTab === 'daily' ? 'No daily tasks yet.' :
            currentTab === 'today' ? 'No one-time tasks today.' :
            'No tasks yet. Add one above!'
        }</div>`;
        return;
    }

    filtered.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item' + (task.done ? ' done' : '') + (task.isDaily ? ' daily-task' : '');
        div.dataset.id = task.id;

        div.innerHTML = `
            <div class="circle ${task.done ? 'checked' : ''}" data-id="${task.id}">
                ${task.done ? `<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
            </div>
            <div class="task-body">
                <div class="task-text">${escHtml(task.text)}</div>
                <div class="task-meta">
                    ${task.time ? `<span class="task-time">🔔 ${task.time}</span>` : ''}
                    ${task.isDaily ? `<span class="daily-badge">daily</span>` : ''}
                </div>
            </div>
            <button class="delete-btn" data-del="${task.id}">×</button>
        `;

        div.querySelector('.circle').addEventListener('click', () => toggleTask(task.id));
        div.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id, div));
        list.appendChild(div);
    });

    updateStats();
    checkAllDone();
}

function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Actions ─────────────────────────────────────────────────────
function toggleTask(id) {
    const tasks = getTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    tasks[idx].done = !tasks[idx].done;
    saveTasks(tasks);
    if (tasks[idx].done) showBanner('✓ "' + tasks[idx].text + '" done!', 'success');
    renderTasks();
}

function deleteTask(id, div) {
    div.classList.add('removing');
    setTimeout(() => {
        const tasks = getTasks().filter(t => t.id !== id);
        saveTasks(tasks);
        rewardShown = false;
        renderTasks();
    }, 260);
}

function addTask(text, time, isDaily) {
    if (!text.trim()) return;
    const tasks = getTasks();
    const task = {
        id: Date.now().toString(),
        text: text.trim(),
        time,
        isDaily,
        done: false,
        created: today()
    };
    tasks.push(task);
    saveTasks(tasks);
    scheduleNotifs(getTasks());
    if (time) showBanner('🔔 Reminder set for ' + time, 'info');
    requestNotifPermission();
    rewardShown = false;
    renderTasks();
}

// ── Tab switching ────────────────────────────────────────────────
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
    });
    renderTasks();
}

// ── Build the page ───────────────────────────────────────────────
function buildPage() {
    const app = document.getElementById('app');
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    app.innerHTML = `
        <div class="header">
            <svg class="capy-svg" width="72" height="72" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="50" cy="62" rx="32" ry="22" fill="#b5925a"/>
                <rect x="22" y="72" width="10" height="14" rx="5" fill="#9a7a48"/>
                <rect x="68" y="72" width="10" height="14" rx="5" fill="#9a7a48"/>
                <ellipse cx="50" cy="52" rx="24" ry="20" fill="#c9a66b"/>
                <ellipse cx="50" cy="46" rx="18" ry="14" fill="#dab87a"/>
                <ellipse cx="43" cy="43" rx="4" ry="4.5" fill="white"/>
                <ellipse cx="57" cy="43" rx="4" ry="4.5" fill="white"/>
                <circle cx="43" cy="44" r="2.5" fill="#2c1a0e"/>
                <circle cx="57" cy="44" r="2.5" fill="#2c1a0e"/>
                <circle cx="44" cy="43" r="1" fill="white"/>
                <circle cx="58" cy="43" r="1" fill="white"/>
                <ellipse cx="50" cy="52" rx="5" ry="3" fill="#b8945a"/>
                <rect x="44" y="30" width="12" height="8" rx="5" fill="#c9a66b"/>
                <ellipse cx="35" cy="36" rx="5" ry="6" fill="#c9a66b"/>
                <ellipse cx="65" cy="36" rx="5" ry="6" fill="#c9a66b"/>
            </svg>
            <h1 class="app-title">Capy Tasks</h1>
            <p class="date-str">${dateStr}</p>
        </div>

        <div class="stats-row">
            <div class="stat-box"><div class="stat-num" id="statDone">0</div><div class="stat-lbl">Done today</div></div>
            <div class="stat-box"><div class="stat-num" id="statTotal">0</div><div class="stat-lbl">Total tasks</div></div>
            <div class="stat-box"><div class="stat-num streak" id="statStreak">0🔥</div><div class="stat-lbl">Day streak</div></div>
        </div>

        <div class="progress-section">
            <div class="prog-labels">
                <span>Today's progress</span>
                <span class="prog-pct" id="progPct">0%</span>
            </div>
            <div class="prog-track"><div class="prog-fill" id="progFill"></div></div>
        </div>

        <div id="banner" class="banner"></div>

        <div class="tabs">
            <button class="tab-btn active" data-tab="all" onclick="switchTab('all')">All tasks</button>
            <button class="tab-btn" data-tab="daily" onclick="switchTab('daily')">Daily</button>
            <button class="tab-btn" data-tab="today" onclick="switchTab('today')">Today only</button>
        </div>

        <div class="main-card">
            <p class="section-title">Add task</p>
            <div class="input-row">
                <input class="task-input" id="taskInput" placeholder="What needs doing?" />
                <input class="time-input" type="time" id="timeInput" title="Set reminder time" />
            </div>
            <div class="options-row">
                <label class="daily-check-label">
                    <input type="checkbox" id="isDailyCheck"> Repeat daily
                </label>
                <button class="add-btn" id="addBtn">+</button>
            </div>
            <div class="task-list" id="taskList"></div>
        </div>

        <div id="rewardSec" style="width:100%"></div>
    `;

    document.getElementById('addBtn').addEventListener('click', handleAdd);
    document.getElementById('taskInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') handleAdd();
    });
}

function handleAdd() {
    const text    = document.getElementById('taskInput').value;
    const time    = document.getElementById('timeInput').value;
    const isDaily = document.getElementById('isDailyCheck').checked;
    addTask(text, time, isDaily);
    document.getElementById('taskInput').value = '';
    document.getElementById('timeInput').value = '';
    document.getElementById('isDailyCheck').checked = false;
}

// ── Init ─────────────────────────────────────────────────────────
const defaultTasks = [
    { id: 'd1', text: '🍉 Eat a watermelon',      time: '08:00', isDaily: true, done: false, created: today() },
    { id: 'd2', text: '🛁 Take a warm bath',       time: '19:00', isDaily: true, done: false, created: today() },
    { id: 'd3', text: '☀️ Sit in a sunny spot',    time: '10:00', isDaily: true, done: false, created: today() },
];

if (!ld().tasks || ld().tasks.length === 0) {
    saveTasks(defaultTasks);
}

buildPage();
scheduleNotifs(getTasks());
renderTasks();
