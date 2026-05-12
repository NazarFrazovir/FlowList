/* ══════════════════════════════════════════
   Flowlist — app.js
   API: http://localhost:8000
══════════════════════════════════════════ */

const API = 'http://localhost:8000';

let token       = localStorage.getItem('fl_token') || null;
let currentUser = localStorage.getItem('fl_user')  || null;
let tasks       = [];
let filter      = 'all';
let editingId   = null;
let dragSrcId   = null;

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  applyProfileSettings();

  if (token && currentUser) {
    showApp();
    loadTasks();
  }

  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  document.getElementById('reg-password').addEventListener('keydown',  e => { if (e.key === 'Enter') register(); });
  document.getElementById('new-title').addEventListener('keydown',     e => { if (e.key === 'Enter') addTask(); });

  document.getElementById('edit-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('edit-overlay')) closeEdit();
  });
  document.getElementById('analytics-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('analytics-overlay')) closeAnalytics();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeEdit(); closeAnalytics(); }
    if (e.key === 'n' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      document.getElementById('new-title').focus();
    }
  });
});

// ══════════════════════════════════════════
// PROFILE SETTINGS
// ══════════════════════════════════════════
function applyProfileSettings() {
  const saved = localStorage.getItem('fl_profile');
  let p = { theme: 'sand', color: '#2d5a27', photoData: null };
  if (saved) { try { Object.assign(p, JSON.parse(saved)); } catch {} }
  document.documentElement.setAttribute('data-theme', p.theme);
  const av = document.getElementById('user-avatar');
  if (!av) return;
  if (p.photoData) {
    av.innerHTML = `<img src="${p.photoData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
    av.style.background = 'transparent';
  } else {
    const name = localStorage.getItem('fl_user') || '?';
    av.style.background = p.color;
    av.innerHTML = name[0]?.toUpperCase() || '?';
  }
}

// ══════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════
function switchTab(tab) {
  const indicator = document.getElementById('tab-indicator');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  clearAuthError();
  if (tab === 'login') {
    indicator.classList.remove('right');
    document.getElementById('login-form').style.display    = 'block';
    document.getElementById('register-form').style.display = 'none';
  } else {
    indicator.classList.add('right');
    document.getElementById('login-form').style.display    = 'none';
    document.getElementById('register-form').style.display = 'block';
  }
}

async function register() {
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!username || !email || !password) { showAuthError('Заповни всі поля'); return; }
  try {
    const res  = await fetch(`${API}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,email,password}) });
    const data = await res.json();
    if (!res.ok) { showAuthError(data.detail || 'Помилка реєстрації'); return; }
    showToast('Акаунт створено! 🎉', 'ok');
    switchTab('login');
    document.getElementById('login-username').value = username;
  } catch { showAuthError('Немає зʼєднання з сервером'); }
}

async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  if (!username || !password) { showAuthError('Введи логін і пароль'); return; }
  try {
    const res  = await fetch(`${API}/auth/login`, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: new URLSearchParams({username,password}) });
    const data = await res.json();
    if (!res.ok) { showAuthError(data.detail || 'Невірний логін або пароль'); return; }
    token = data.access_token; currentUser = username;
    localStorage.setItem('fl_token', token);
    localStorage.setItem('fl_user', username);
    try { const p = JSON.parse(localStorage.getItem('fl_profile')||'{}'); if(!p.name){p.name=username;localStorage.setItem('fl_profile',JSON.stringify(p));} } catch {}
    showApp(); loadTasks();
  } catch { showAuthError('Немає зʼєднання з сервером'); }
}

function logout() {
  token=null; currentUser=null; tasks=[];
  localStorage.removeItem('fl_token'); localStorage.removeItem('fl_user');
  document.getElementById('app-screen').style.display  = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  clearAuthError(); switchTab('login');
}

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = 'block';
  document.getElementById('user-name').textContent     = currentUser;
  applyProfileSettings();
}

// ══════════════════════════════════════════
// TASKS — LOAD
// ══════════════════════════════════════════
async function loadTasks() {
  renderLoader();
  try {
    const res = await fetch(`${API}/tasks/`, { headers:{ Authorization:`Bearer ${token}` } });
    if (res.status === 401) { logout(); return; }
    const data = await res.json();
    tasks = data.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
    renderTasks();
  } catch { showToast('Не вдалось завантажити задачі','error'); renderTasks(); }
}

// ══════════════════════════════════════════
// TASKS — ADD
// ══════════════════════════════════════════
async function addTask() {
  const title    = document.getElementById('new-title').value.trim();
  const desc     = document.getElementById('new-desc').value.trim();
  const priority = document.getElementById('new-priority').value;
  const deadline = document.getElementById('new-deadline').value;
  if (!title) { document.getElementById('new-title').focus(); return; }
  try {
    const body = { title, description: desc || null, priority, order: 0 };
    if (deadline) body.deadline = new Date(deadline).toISOString();
    const res = await fetch(`${API}/tasks/`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify(body)
    });
    if (!res.ok) { showToast('Помилка при додаванні','error'); return; }
    const newTask = await res.json();
    tasks.unshift(newTask);
    document.getElementById('new-title').value    = '';
    document.getElementById('new-desc').value     = '';
    document.getElementById('new-deadline').value = '';
    document.getElementById('new-priority').value = 'medium';
    renderTasks();
    showToast('Задачу додано ✦','ok');
  } catch { showToast('Немає зʼєднання з сервером','error'); }
}

// ══════════════════════════════════════════
// TASKS — TOGGLE
// ══════════════════════════════════════════
async function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const wasCompleted = task.completed;
  try {
    const res = await fetch(`${API}/tasks/${id}`, {
      method:'PUT',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ completed: !task.completed })
    });
    if (!res.ok) { showToast('Помилка оновлення','error'); return; }
    tasks[tasks.findIndex(t => t.id === id)] = await res.json();
    renderTasks();
    if (!wasCompleted) launchConfetti();
  } catch { showToast('Немає зʼєднання з сервером','error'); }
}

// ══════════════════════════════════════════
// TASKS — DELETE
// ══════════════════════════════════════════
async function deleteTask(id) {
  try {
    const res = await fetch(`${API}/tasks/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
    if (!res.ok) { showToast('Помилка видалення','error'); return; }
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
    showToast('Задачу видалено','');
  } catch { showToast('Немає зʼєднання з сервером','error'); }
}

// ══════════════════════════════════════════
// TASKS — EDIT
// ══════════════════════════════════════════
function openEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingId = id;
  document.getElementById('edit-title').value    = task.title;
  document.getElementById('edit-desc').value     = task.description || '';
  document.getElementById('edit-priority').value = task.priority || 'medium';
  document.getElementById('edit-deadline').value = task.deadline
    ? new Date(task.deadline).toISOString().slice(0,16) : '';
  document.getElementById('edit-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('edit-title').focus(), 100);
}

function closeEdit() {
  document.getElementById('edit-overlay').classList.remove('open');
  document.body.style.overflow = '';
  editingId = null;
}

async function saveEdit() {
  if (!editingId) return;
  const title    = document.getElementById('edit-title').value.trim();
  const desc     = document.getElementById('edit-desc').value.trim();
  const priority = document.getElementById('edit-priority').value;
  const deadline = document.getElementById('edit-deadline').value;
  if (!title) { document.getElementById('edit-title').focus(); return; }
  try {
    const body = { title, description: desc || null, priority };
    body.deadline = deadline ? new Date(deadline).toISOString() : null;
    const res = await fetch(`${API}/tasks/${editingId}`, {
      method:'PUT',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify(body)
    });
    if (!res.ok) { showToast('Помилка збереження','error'); return; }
    tasks[tasks.findIndex(t => t.id === editingId)] = await res.json();
    closeEdit(); renderTasks();
    showToast('Задачу оновлено ✦','ok');
  } catch { showToast('Немає зʼєднання з сервером','error'); }
}

// ══════════════════════════════════════════
// SUBTASKS
// ══════════════════════════════════════════
async function addSubtask(taskId) {
  const input = document.getElementById(`subtask-input-${taskId}`);
  const title = input?.value.trim();
  if (!title) return;
  try {
    const res = await fetch(`${API}/tasks/${taskId}/subtasks/`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ title })
    });
    if (!res.ok) return;
    const sub = await res.json();
    const task = tasks.find(t => t.id === taskId);
    if (task) { task.subtasks = task.subtasks || []; task.subtasks.push(sub); }
    input.value = '';
    renderTasks();
  } catch { showToast('Помилка','error'); }
}

async function toggleSubtask(taskId, subId) {
  try {
    const res = await fetch(`${API}/tasks/${taskId}/subtasks/${subId}`, {
      method:'PUT', headers:{ Authorization:`Bearer ${token}` }
    });
    if (!res.ok) return;
    const updated = await res.json();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const idx = task.subtasks.findIndex(s => s.id === subId);
      if (idx !== -1) task.subtasks[idx] = updated;
    }
    renderTasks();
  } catch {}
}

async function deleteSubtask(taskId, subId) {
  try {
    await fetch(`${API}/tasks/${taskId}/subtasks/${subId}`, {
      method:'DELETE', headers:{ Authorization:`Bearer ${token}` }
    });
    const task = tasks.find(t => t.id === taskId);
    if (task) task.subtasks = task.subtasks.filter(s => s.id !== subId);
    renderTasks();
  } catch {}
}

function toggleSubtaskList(taskId) {
  const el = document.getElementById(`subtask-section-${taskId}`);
  if (el) el.classList.toggle('open');
}

// ══════════════════════════════════════════
// FILTER + SEARCH + SORT
// ══════════════════════════════════════════
function setFilter(f, btn) {
  filter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

function getFiltered() {
  const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  const sort  = document.getElementById('sort-select')?.value || 'manual';
  let result  = [...tasks];

  if (filter === 'active') result = result.filter(t => !t.completed);
  if (filter === 'done')   result = result.filter(t => t.completed);
  if (query) result = result.filter(t =>
    t.title.toLowerCase().includes(query) || (t.description||'').toLowerCase().includes(query)
  );

  const PRIO = { high: 0, medium: 1, low: 2 };
  if (sort === 'priority') result.sort((a,b) => (PRIO[a.priority]??1) - (PRIO[b.priority]??1));
  if (sort === 'deadline') result.sort((a,b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });
  if (sort === 'created') result.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  if (sort === 'alpha')   result.sort((a,b) => a.title.localeCompare(b.title, 'uk'));

  return result;
}

// ══════════════════════════════════════════
// DRAG & DROP
// ══════════════════════════════════════════
function onDragStart(e, id) {
  dragSrcId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dragging');
}
function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
}
function onDragOver(e, id) {
  e.preventDefault();
  if (id === dragSrcId) return;
  document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
  e.currentTarget.classList.add('drag-over');
}
function onDrop(e, targetId) {
  e.preventDefault();
  if (!dragSrcId || dragSrcId === targetId) return;
  const srcIdx = tasks.findIndex(t => t.id === dragSrcId);
  const tgtIdx = tasks.findIndex(t => t.id === targetId);
  if (srcIdx === -1 || tgtIdx === -1) return;
  const [moved] = tasks.splice(srcIdx, 1);
  tasks.splice(tgtIdx, 0, moved);
  renderTasks(); saveOrder();
}
async function saveOrder() {
  try {
    await fetch(`${API}/tasks/reorder`, {
      method:'PUT',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ ids: tasks.map(t => t.id) })
    });
  } catch {}
}

// ══════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════
function openAnalytics() {
  document.getElementById('analytics-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderAnalytics();
}

function closeAnalytics() {
  document.getElementById('analytics-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function renderAnalytics() {
  const total = tasks.length;
  const done  = tasks.filter(t => t.completed).length;
  const high  = tasks.filter(t => t.priority === 'high' && !t.completed).length;
  const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && !t.completed).length;
  const pct   = total ? Math.round((done/total)*100) : 0;

  document.getElementById('an-total').textContent   = total;
  document.getElementById('an-done').textContent    = done;
  document.getElementById('an-high').textContent    = high;
  document.getElementById('an-overdue').textContent = overdue;
  document.getElementById('an-pct').textContent     = pct + '%';

  // streak
  const streak = calcStreak();
  document.getElementById('an-streak').textContent = streak + (streak === 1 ? ' день' : streak < 5 ? ' дні' : ' днів');

  // chart
  renderChart();
}

function calcStreak() {
  const completedDates = tasks
    .filter(t => t.completed && t.created_at)
    .map(t => new Date(t.created_at).toDateString());
  const unique = [...new Set(completedDates)];
  if (!unique.length) return 0;

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (unique.includes(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function renderChart() {
  const canvas = document.getElementById('chart-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth * 2;
  const H = canvas.height = 160 * 2;
  ctx.scale(2, 2);
  const w = W / 2, h = H / 2;

  // last 7 days
  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const counts = days.map(d =>
    tasks.filter(t => t.completed && t.created_at &&
      new Date(t.created_at).toDateString() === d.toDateString()
    ).length
  );

  const maxVal = Math.max(...counts, 1);
  const padL = 28, padB = 28, padT = 12, padR = 12;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const barW   = chartW / 7 * 0.55;
  const gap    = chartW / 7;

  // get accent color from CSS var
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2d5a27';
  const ink    = getComputedStyle(document.documentElement).getPropertyValue('--ink-faint').trim() || '#c0bab2';
  const border = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#e4dfd5';

  ctx.clearRect(0, 0, w, h);

  // grid lines
  ctx.strokeStyle = border;
  ctx.lineWidth   = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + chartH - (i / 4) * chartH;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
  }

  // bars
  days.forEach((d, i) => {
    const val  = counts[i];
    const barH = (val / maxVal) * chartH;
    const x    = padL + gap * i + (gap - barW) / 2;
    const y    = padT + chartH - barH;

    // bar with rounded top
    ctx.fillStyle = val > 0 ? accent : border;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // count label
    if (val > 0) {
      ctx.fillStyle = accent;
      ctx.font = `bold 10px Jost, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(val, x + barW/2, y - 4);
    }

    // day label
    const label = d.toLocaleDateString('uk-UA', { weekday: 'short' });
    ctx.fillStyle = ink;
    ctx.font = `10px Jost, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + barW/2, h - 6);
  });
}

// ══════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════
function exportCSV() {
  const rows = [['ID','Назва','Опис','Пріоритет','Виконано','Дедлайн','Створено']];
  tasks.forEach(t => rows.push([
    t.id,
    `"${(t.title||'').replace(/"/g,'""')}"`,
    `"${(t.description||'').replace(/"/g,'""')}"`,
    t.priority || 'medium',
    t.completed ? 'Так' : 'Ні',
    t.deadline ? new Date(t.deadline).toLocaleDateString('uk-UA') : '',
    t.created_at ? new Date(t.created_at).toLocaleDateString('uk-UA') : '',
  ]));
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `flowlist-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast('CSV експортовано 📥', 'ok');
}

function exportJSON() {
  const json = JSON.stringify(tasks, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `flowlist-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast('JSON експортовано 📥', 'ok');
}

// ══════════════════════════════════════════
// RENDER — TASKS
// ══════════════════════════════════════════
const PRIORITY_CONFIG = {
  high:   { label:'Важливо',  color:'#e05450', dot:'🔴' },
  medium: { label:'Середнє', color:'#c4933f', dot:'🟡' },
  low:    { label:'Низьке',  color:'#2d5a27', dot:'🟢' },
};

function renderTasks() {
  const list     = document.getElementById('task-list');
  const filtered = getFiltered();
  const query    = (document.getElementById('search-input')?.value || '').trim();

  const total = tasks.length;
  const done  = tasks.filter(t => t.completed).length;
  const left  = total - done;
  const pct   = total ? Math.round((done/total)*100) : 0;

  document.getElementById('stat-total').textContent     = total;
  document.getElementById('stat-done').textContent      = done;
  document.getElementById('stat-left').textContent      = left;
  document.getElementById('progress-fill').style.width  = `${pct}%`;
  document.getElementById('progress-label').textContent = `${pct}%`;

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">${query ? '🔍' : '✦'}</span>
        <div class="empty-title">${query ? 'Нічого не знайдено' : filter === 'done' ? 'Ще нічого' : filter === 'active' ? 'Все виконано!' : 'Список порожній'}</div>
        <div class="empty-sub">${query ? `За запитом «${escHtml(query)}» задач не знайдено` : 'Додай першу задачу вище'}</div>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(task => {
    const date = task.created_at
      ? new Date(task.created_at).toLocaleDateString('uk-UA',{day:'numeric',month:'short'}) : '';
    const pr = PRIORITY_CONFIG[task.priority || 'medium'];

    let deadlineHtml = '';
    if (task.deadline) {
      const dl   = new Date(task.deadline);
      const diff = Math.ceil((dl - new Date()) / 86400000);
      const dlStr = dl.toLocaleDateString('uk-UA',{day:'numeric',month:'short'});
      const isOverdue = diff < 0 && !task.completed;
      const isSoon    = diff <= 1 && diff >= 0 && !task.completed;
      deadlineHtml = `<span class="task-deadline ${isOverdue?'overdue':isSoon?'soon':''}">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="2" width="8" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M3 1v2M7 1v2M1 5h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        ${isOverdue ? 'Прострочено' : diff===0 ? 'Сьогодні' : diff===1 ? 'Завтра' : dlStr}
      </span>`;
    }

    let titleHtml = escHtml(task.title);
    if (query) {
      const re = new RegExp(`(${escRegex(query)})`, 'gi');
      titleHtml = titleHtml.replace(re, '<mark class="search-mark">$1</mark>');
    }

    // subtasks
    const subs = task.subtasks || [];
    const subDone = subs.filter(s => s.completed).length;
    const subTotal = subs.length;
    const subPct = subTotal ? Math.round((subDone/subTotal)*100) : 0;

    const subtasksHtml = `
      <div class="subtask-section" id="subtask-section-${task.id}">
        <div class="subtask-list">
          ${subs.map(s => `
            <div class="subtask-item${s.completed?' done':''}">
              <div class="subtask-check${s.completed?' checked':''}" onclick="toggleSubtask(${task.id},${s.id})"></div>
              <span class="subtask-title">${escHtml(s.title)}</span>
              <button class="subtask-delete" onclick="deleteSubtask(${task.id},${s.id})">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
        <div class="subtask-add">
          <input type="text" id="subtask-input-${task.id}" class="subtask-input" placeholder="Додати підзадачу..."
            onkeydown="if(event.key==='Enter') addSubtask(${task.id})"/>
          <button class="subtask-add-btn" onclick="addSubtask(${task.id})">+</button>
        </div>
      </div>`;

    return `
      <div class="task-item${task.completed?' completed':''}" data-id="${task.id}"
           draggable="true"
           ondragstart="onDragStart(event,${task.id})"
           ondragend="onDragEnd(event)"
           ondragover="onDragOver(event,${task.id})"
           ondrop="onDrop(event,${task.id})">
        <div class="task-priority-bar" style="background:${pr.color}"></div>
        <div class="drag-handle">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="4" cy="3" r="1" fill="currentColor"/><circle cx="8" cy="3" r="1" fill="currentColor"/>
            <circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="8" cy="6" r="1" fill="currentColor"/>
            <circle cx="4" cy="9" r="1" fill="currentColor"/><circle cx="8" cy="9" r="1" fill="currentColor"/>
          </svg>
        </div>
        <div class="task-checkbox${task.completed?' checked':''}" onclick="toggleTask(${task.id})"></div>
        <div class="task-body">
          <div class="task-title">${titleHtml}</div>
          ${task.description ? `<div class="task-desc">${escHtml(task.description)}</div>` : ''}
          <div class="task-meta">
            <span class="task-priority-badge" style="color:${pr.color}">${pr.dot} ${pr.label}</span>
            ${deadlineHtml}
            ${date ? `<span class="task-date">${date}</span>` : ''}
            ${subTotal > 0 ? `<span class="subtask-badge" onclick="toggleSubtaskList(${task.id})">
              ☑ ${subDone}/${subTotal}
            </span>` : ''}
          </div>
          ${subtasksHtml}
        </div>
        <div class="task-actions">
          <button class="btn-subtask" onclick="toggleSubtaskList(${task.id})" title="Підзадачі">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 4h9M5 7h6M5 10h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          </button>
          <button class="btn-edit" onclick="openEdit(${task.id})" title="Редагувати">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8.5 1.5l3 3L4 12H1V9L8.5 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
          </button>
          <button class="btn-delete" onclick="deleteTask(${task.id})" title="Видалити">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M5 6v3.5M8 6v3.5M2.5 3.5l.7 7h6.6l.7-7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════
// CONFETTI
// ══════════════════════════════════════════
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  const pieces = Array.from({length:80}, () => ({
    x: Math.random()*canvas.width, y: Math.random()*canvas.height - canvas.height,
    r: Math.random()*6+3, d: Math.random()*2+1,
    color: ['#2d5a27','#4a9e42','#c4933f','#f7f4ee','#6b2d7a'][Math.floor(Math.random()*5)],
    tilt:0, tiltSpeed: Math.random()*0.1+0.05, angle:0,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      p.angle+=p.tiltSpeed; p.y+=p.d+1; p.x+=Math.sin(p.angle)*2; p.tilt=Math.sin(p.angle)*12;
      ctx.beginPath(); ctx.lineWidth=p.r/2; ctx.strokeStyle=p.color;
      ctx.moveTo(p.x+p.tilt+p.r/4,p.y); ctx.lineTo(p.x+p.tilt,p.y+p.tilt+p.r/4); ctx.stroke();
    });
    frame++;
    if (frame<120) requestAnimationFrame(draw);
    else { ctx.clearRect(0,0,canvas.width,canvas.height); canvas.style.display='none'; }
  }
  draw();
}

function renderLoader() {
  document.getElementById('task-list').innerHTML = `<div class="loader"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div>`;
}

function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

let toastTimer = null;
function showToast(msg, type='') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = `toast show${type?' '+type:''}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.classList.remove('show'), 2800);
}
function showAuthError(msg) { document.getElementById('auth-error').textContent = msg; }
function clearAuthError()   { document.getElementById('auth-error').textContent = ''; }