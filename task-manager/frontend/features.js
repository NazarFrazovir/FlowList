/* ══════════════════════════════════════════
   Flowlist — features.js v3
══════════════════════════════════════════ */

// ── ЦИТАТА ДНЯ ───────────────────────────
const QUOTES = [
  { text: "Починай там де ти є. Використовуй те що маєш. Роби що можеш.", author: "Артур Еш" },
  { text: "Єдиний спосіб робити велику роботу — любити те що робиш.", author: "Стів Джобс" },
  { text: "Не чекай. Час ніколи не буде ідеальним.", author: "Наполеон Хілл" },
  { text: "Маленькі кроки щодня — великі результати за рік.", author: "Flowlist" },
  { text: "Зосередженість — це мистецтво говорити ні тисячі речей.", author: "Стів Джобс" },
  { text: "Дисципліна — це свобода яку ти даєш сам собі.", author: "Jocko Willink" },
  { text: "Успіх — це сума маленьких зусиль, що повторюються день за днем.", author: "Роберт Колліер" },
  { text: "Найкращий час посадити дерево був 20 років тому. Другий найкращий — зараз.", author: "Китайське прислів'я" },
  { text: "Зроблене краще ніж ідеальне.", author: "Шерил Сендберг" },
  { text: "Продуктивність — це не про те щоб робити більше. Це про важливе.", author: "Flowlist" },
];

function initQuote() {
  const el = document.getElementById('quote-text');
  if (!el) return;
  const today = new Date().toDateString();
  const saved = localStorage.getItem('fl_quote_date');
  let idx = parseInt(localStorage.getItem('fl_quote_idx') || '0');
  if (saved !== today) {
    idx = Math.floor(Math.random() * QUOTES.length);
    localStorage.setItem('fl_quote_date', today);
    localStorage.setItem('fl_quote_idx', String(idx));
  }
  const q = QUOTES[idx % QUOTES.length];
  el.innerHTML = `"${q.text}" — ${q.author}`;
}

// ── MOOD TRACKER ─────────────────────────
const MOODS = [
  { emoji: '🔥', label: 'В ударі',   value: 5 },
  { emoji: '😊', label: 'Добре',     value: 4 },
  { emoji: '😐', label: 'Нормально', value: 3 },
  { emoji: '😴', label: 'Втомлений', value: 2 },
  { emoji: '😤', label: 'Важко',     value: 1 },
];

function initMood() {
  const today = new Date().toDateString();
  const saved = JSON.parse(localStorage.getItem('fl_mood') || 'null');
  if (saved && saved.date === today) showMoodResult(saved);
  else showMoodPicker();
}

function showMoodPicker() {
  const el = document.getElementById('mood-bar');
  if (!el) return;
  el.innerHTML = `
    <span class="mood-question">Як ти?</span>
    <div class="mood-options">
      ${MOODS.map(m => `<button class="mood-btn" onclick="selectMood(${m.value})" title="${m.label}">${m.emoji}</button>`).join('')}
    </div>`;
}

function selectMood(value) {
  const mood = MOODS.find(m => m.value === value);
  if (!mood) return;
  const data = { ...mood, date: new Date().toDateString() };
  localStorage.setItem('fl_mood', JSON.stringify(data));
  showMoodResult(data);
  const msgs = { 5:'Чудово! Сьогодні ти зможеш гори звернути 💪', 4:'Добрий настрій — добрий день! 🌿', 3:'Все норм. Головне починати 👌', 2:'Беріся за найлегші задачі спочатку 🍃', 1:'Важкий день? Одна маленька задача — вже перемога ✦' };
  if (typeof showToast === 'function') showToast(msgs[value] || '', 'ok');
}

function showMoodResult(mood) {
  const el = document.getElementById('mood-bar');
  if (!el) return;
  el.innerHTML = `<span class="mood-result-emoji">${mood.emoji}</span><span class="mood-result-label">${mood.label}</span><button class="mood-change" onclick="showMoodPicker()" title="Змінити">↺</button>`;
}

// ── FOCUS / POMODORO ──────────────────────
let pomInterval  = null;
let pomSeconds   = 25 * 60;
let pomRunning   = false;
let pomMode      = 'work';
let pomWorkMins  = 25;
let pomBreakMins = 5;
const POM_R      = 85;
const POM_CIRC   = 2 * Math.PI * POM_R; // ≈534

function openFocus() {
  pomSeconds  = pomWorkMins * 60;
  pomMode     = 'work';
  pomRunning  = false;
  clearInterval(pomInterval);
  document.getElementById('focus-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  _renderPom();
}

function closeFocus() {
  clearInterval(pomInterval);
  pomRunning = false;
  document.getElementById('focus-overlay').classList.remove('open');
  document.body.style.overflow = '';
  document.title = 'Flowlist — Твій простір задач';
}

function toggleFocus() {
  if (pomRunning) {
    clearInterval(pomInterval);
    pomRunning = false;
  } else {
    pomRunning = true;
    pomInterval = setInterval(() => {
      pomSeconds--;
      _renderPom();
      if (pomSeconds <= 0) { clearInterval(pomInterval); pomRunning = false; _pomEnd(); }
    }, 1000);
  }
  _renderPom();
}

function resetFocus() {
  clearInterval(pomInterval);
  pomRunning = false;
  pomSeconds = pomMode === 'work' ? pomWorkMins * 60 : pomBreakMins * 60;
  _renderPom();
}

function setFocusMode(work, brk) {
  if (pomRunning) return;
  pomWorkMins = work; pomBreakMins = brk;
  pomMode = 'work'; pomSeconds = work * 60;
  document.querySelectorAll('.focus-modes button').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === `${work}/${brk}`);
  });
  _renderPom();
}

function _pomEnd() {
  if (pomMode === 'work') {
    pomMode = 'break'; pomSeconds = pomBreakMins * 60;
    if (typeof showToast === 'function') showToast(`Час відпочити! ${pomBreakMins} хв перерви ☕`, 'ok');
  } else {
    pomMode = 'work'; pomSeconds = pomWorkMins * 60;
    if (typeof showToast === 'function') showToast('Відпочив? Повертаємось до роботи! 🎯', 'ok');
  }
  _renderPom();
}

function _renderPom() {
  const m = Math.floor(pomSeconds / 60).toString().padStart(2,'0');
  const s = (pomSeconds % 60).toString().padStart(2,'0');

  const timerEl = document.getElementById('focus-timer');
  if (timerEl) timerEl.textContent = `${m}:${s}`;

  const labelEl = document.getElementById('focus-label');
  if (labelEl) labelEl.textContent = pomMode === 'work' ? '🎯 Фокус' : '☕ Перерва';

  const btn = document.getElementById('focus-btn');
  if (btn) btn.textContent = pomRunning ? '⏸ Пауза' : '▶ Старт';

  const total  = (pomMode === 'work' ? pomWorkMins : pomBreakMins) * 60;
  const offset = POM_CIRC * (pomSeconds / total);
  const ring   = document.getElementById('pom-ring-fill');
  if (ring) { ring.style.strokeDashoffset = offset; ring.classList.toggle('break', pomMode === 'break'); }

  if (document.getElementById('focus-overlay')?.classList.contains('open'))
    document.title = `${m}:${s} | Flowlist`;
}

// ── AI ASSISTANT ──────────────────────────
let aiMessages    = [];
let aiInitialized = false;

function openAI() {
  document.getElementById('ai-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  if (!aiInitialized) {
    aiInitialized = true;
    appendAIMessage('assistant', 'Привіт! Я твій AI-помічник у Flowlist ✦\n\nМожу допомогти:\n• Розбити задачу на підзадачі\n• Оцінити пріоритети\n• Дати пораду по продуктивності\n\nЗапитай мене про будь-яку задачу!');
  }
  setTimeout(() => document.getElementById('ai-input')?.focus(), 100);
}

function closeAI() {
  document.getElementById('ai-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

async function sendAI() {
  const input = document.getElementById('ai-input');
  const msg   = input?.value.trim();
  if (!msg) return;
  input.value = '';
  appendAIMessage('user', msg);
  setAILoading(true);

  const taskCtx = (typeof tasks !== 'undefined' && tasks.length)
    ? `Поточні задачі:\n${tasks.slice(0,10).map(t=>`- "${t.title}" [${t.priority}${t.completed?' ✓':''}]`).join('\n')}`
    : 'Задач поки немає.';

  const sys = `Ти — AI-помічник вбудований у Flowlist, продуктивний todo-додаток.\nВідповідай українською мовою. Будь лаконічним і корисним.\nКоли розбиваєш задачу — нумерований список.\n${taskCtx}`;

  try {
    const apiKey = localStorage.getItem('fl_ai_key');
    if (!apiKey) { setAILoading(false); showAIKeyPrompt(); return; }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000, system:sys, messages:[...aiMessages.slice(-10),{role:'user',content:msg}] })
    });

    const data = await res.json();
    setAILoading(false);

    if (!res.ok) {
      if (res.status === 401) { localStorage.removeItem('fl_ai_key'); showAIKeyPrompt(); return; }
      appendAIMessage('assistant', `Помилка API (${res.status}). Спробуй ще раз.`); return;
    }

    const reply = data.content?.[0]?.text || 'Не вдалось отримати відповідь.';
    aiMessages.push({role:'user',content:msg}, {role:'assistant',content:reply});
    appendAIMessage('assistant', reply);
  } catch(e) {
    setAILoading(false);
    appendAIMessage('assistant', 'Помилка зʼєднання. Перевір інтернет.');
  }
}

function appendAIMessage(role, text) {
  const list = document.getElementById('ai-body');
  if (!list) return;
  const div = document.createElement('div');
  div.className = `ai-msg ai-msg-${role}`;
  const fmt = _esc(text).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br/>');
  div.innerHTML = `<div class="ai-bubble">${fmt}</div>`;
  list.appendChild(div);
  list.scrollTop = list.scrollHeight;
}

function setAILoading(on) {
  const list = document.getElementById('ai-body');
  if (on && list) {
    const el = document.createElement('div');
    el.className='ai-msg ai-msg-assistant'; el.id='ai-loader';
    el.innerHTML=`<div class="ai-bubble ai-loading"><span></span><span></span><span></span></div>`;
    list.appendChild(el); list.scrollTop=list.scrollHeight;
  } else document.getElementById('ai-loader')?.remove();
}

function showAIKeyPrompt() {
  const list = document.getElementById('ai-body');
  if (!list) return;
  const div = document.createElement('div');
  div.className = 'ai-msg ai-msg-assistant';
  div.innerHTML = `<div class="ai-bubble">Для роботи AI потрібен API ключ Anthropic.<br/><br/><a href="https://console.anthropic.com" target="_blank" style="color:var(--accent);font-weight:600">Отримати ключ →</a><br/><br/><div style="display:flex;gap:6px;margin-top:4px"><input type="password" id="ai-key-input" style="flex:1;padding:7px 10px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg);color:var(--ink);font-size:12px;outline:none" placeholder="sk-ant-..."/><button onclick="saveAIKey()" style="padding:7px 12px;border-radius:10px;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:12px">Зберегти</button></div></div>`;
  list.appendChild(div); list.scrollTop=list.scrollHeight;
}

function saveAIKey() {
  const key = (document.getElementById('ai-key-input')?.value || document.getElementById('ai-key')?.value || '').trim();
  if (!key.startsWith('sk-')) { if(typeof showToast==='function') showToast('Ключ має починатись з sk-','error'); return; }
  localStorage.setItem('fl_ai_key', key);
  document.getElementById('ai-key-input')?.closest('.ai-msg')?.remove();
  appendAIMessage('assistant','Ключ збережено! ✦ Тепер можеш задавати питання.');
  if(typeof showToast==='function') showToast('API ключ збережено','ok');
}

function _esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── INIT ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initQuote();
  initMood();
  document.getElementById('ai-overlay')?.addEventListener('click', e => { if(e.target===document.getElementById('ai-overlay')) closeAI(); });
  document.getElementById('focus-overlay')?.addEventListener('click', e => { if(e.target===document.getElementById('focus-overlay')) closeFocus(); });
  document.getElementById('ai-input')?.addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAI();} });
});