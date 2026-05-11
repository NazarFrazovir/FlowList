/* ══════════════════════════════════════════
   Flowlist — features.js (fixed)
   Цитата дня, Mood tracker, Focus+Pomodoro, AI
══════════════════════════════════════════ */

// ══════════════════════════════════════════
// ЦИТАТА ДНЯ
// ══════════════════════════════════════════
const QUOTES = [
  { text: "Починай там де ти є. Використовуй те що маєш. Роби що можеш.", author: "Артур Еш" },
  { text: "Єдиний спосіб робити велику роботу — любити те що робиш.", author: "Стів Джобс" },
  { text: "Не чекай. Час ніколи не буде ідеальним.", author: "Наполеон Хілл" },
  { text: "Маленькі кроки щодня — великі результати за рік.", author: "Flowlist" },
  { text: "Зосередженість — це мистецтво говорити ні тисячі речей.", author: "Стів Джобс" },
  { text: "Дисципліна — це свобода яку ти даєш сам собі.", author: "Jocko Willink" },
  { text: "Успіх — це сума маленьких зусиль, що повторюються день за днем.", author: "Роберт Колліер" },
  { text: "Найкращий час посадити дерево був 20 років тому. Другий найкращий — зараз.", author: "Китайське прислів'я" },
  { text: "Не обмежуй свої виклики — кидай виклик своїм обмеженням.", author: "Flowlist" },
  { text: "Продуктивність — це не про те щоб робити більше. Це про те щоб робити важливе.", author: "Flowlist" },
  { text: "Кожен день — це новий шанс стати кращою версією себе.", author: "Flowlist" },
  { text: "Зроблене краще ніж ідеальне.", author: "Шерил Сендберг" },
];

function initQuote() {
  const el = document.getElementById('quote-text'); // ← виправлено
  if (!el) return;
  const today = new Date().toDateString();
  const saved = localStorage.getItem('fl_quote_date');
  let idx = parseInt(localStorage.getItem('fl_quote_idx') || '0');

  if (saved !== today) {
    idx = Math.floor(Math.random() * QUOTES.length);
    localStorage.setItem('fl_quote_date', today);
    localStorage.setItem('fl_quote_idx', String(idx));
  }

  const q = QUOTES[idx];
  el.innerHTML = `"${q.text}" — ${q.author}`;
}

// ══════════════════════════════════════════
// MOOD TRACKER
// ══════════════════════════════════════════
const MOODS = [
  { emoji: '🔥', label: 'В ударі',   color: '#e05450', value: 5 },
  { emoji: '😊', label: 'Добре',     color: '#4a9e42', value: 4 },
  { emoji: '😐', label: 'Нормально', color: '#c4933f', value: 3 },
  { emoji: '😴', label: 'Втомлений', color: '#7a7570', value: 2 },
  { emoji: '😤', label: 'Важко',     color: '#6b2d7a', value: 1 },
];

let currentMood = null;

function initMood() {
  const today = new Date().toDateString();
  const saved = JSON.parse(localStorage.getItem('fl_mood') || 'null');
  if (saved && saved.date === today) {
    currentMood = saved;
    showMoodResult(saved);
  } else {
    showMoodPicker();
  }
}

function showMoodPicker() {
  const el = document.getElementById('mood-bar'); // ← виправлено
  if (!el) return;
  el.innerHTML = `
    <span class="mood-question">Як ти сьогодні?</span>
    <div class="mood-options">
      ${MOODS.map(m => `
        <button class="mood-btn" onclick="selectMood(${m.value})" title="${m.label}">
          <span class="mood-emoji">${m.emoji}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function selectMood(value) {
  const mood = MOODS.find(m => m.value === value);
  if (!mood) return;
  currentMood = { ...mood, date: new Date().toDateString() };
  localStorage.setItem('fl_mood', JSON.stringify(currentMood));
  showMoodResult(currentMood);

  const greetings = {
    5: 'Чудово! Сьогодні ти зможеш гори звернути 💪',
    4: 'Добрий настрій — добрий день! Вперед до задач 🌿',
    3: 'Все норм. Головне — починати, а там розійдешся 👌',
    2: 'Відпочинь трохи і беріся за найлегші задачі спочатку 🍃',
    1: 'Важкий день? Зроби хоча б одну маленьку задачу — це вже перемога ✦',
  };
  if (typeof showToast === 'function') showToast(greetings[value] || '', 'ok');
}

function showMoodResult(mood) {
  const el = document.getElementById('mood-bar'); // ← виправлено
  if (!el) return;
  el.innerHTML = `
    <span class="mood-result-emoji">${mood.emoji}</span>
    <span class="mood-result-label">${mood.label}</span>
    <button class="mood-change" onclick="showMoodPicker()">↺</button>
  `;
}

// ══════════════════════════════════════════
// FOCUS MODE + POMODORO
// ══════════════════════════════════════════
let pomodoroInterval = null;
let pomodoroSeconds  = 25 * 60;
let pomodoroRunning  = false;
let pomodoroMode     = 'work';
let pomodoroWorkMins = 25;
let pomodoroBreakMins = 5;

function openFocus(taskTitle) {
  pomodoroSeconds  = pomodoroWorkMins * 60;
  pomodoroMode     = 'work';
  pomodoroRunning  = false;
  clearInterval(pomodoroInterval);

  document.getElementById('focus-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  updatePomodoroDisplay();
  updateFocusBtn();
}

function closeFocus() {
  clearInterval(pomodoroInterval);
  pomodoroRunning = false;
  document.getElementById('focus-overlay').classList.remove('open');
  document.body.style.overflow = '';
  document.title = 'Flowlist — Твій простір задач';
}

// toggleFocus — викликається з HTML onclick="toggleFocus()"
function toggleFocus() {
  if (pomodoroRunning) {
    clearInterval(pomodoroInterval);
    pomodoroRunning = false;
  } else {
    pomodoroRunning = true;
    pomodoroInterval = setInterval(() => {
      pomodoroSeconds--;
      updatePomodoroDisplay();
      if (pomodoroSeconds <= 0) {
        clearInterval(pomodoroInterval);
        pomodoroRunning = false;
        handlePomodoroEnd();
      }
    }, 1000);
  }
  updateFocusBtn();
}

function resetFocus() {
  clearInterval(pomodoroInterval);
  pomodoroRunning = false;
  pomodoroSeconds = pomodoroMode === 'work'
    ? pomodoroWorkMins * 60
    : pomodoroBreakMins * 60;
  updatePomodoroDisplay();
  updateFocusBtn();
}

// setFocusMode — викликається з HTML onclick="setFocusMode(25,5)"
function setFocusMode(work, brk) {
  if (pomodoroRunning) return;
  pomodoroWorkMins  = work;
  pomodoroBreakMins = brk;
  pomodoroMode      = 'work';
  pomodoroSeconds   = work * 60;
  updatePomodoroDisplay();
  updateFocusBtn();
}

function handlePomodoroEnd() {
  if (pomodoroMode === 'work') {
    pomodoroMode    = 'break';
    pomodoroSeconds = pomodoroBreakMins * 60;
    updateFocusLabel('☕ Перерва');
    showToastSafe('Час відпочити! ☕');
  } else {
    pomodoroMode    = 'work';
    pomodoroSeconds = pomodoroWorkMins * 60;
    updateFocusLabel('🎯 Фокус');
    showToastSafe('Повертаємось до роботи! 🎯');
  }
  updatePomodoroDisplay();
  updateFocusBtn();
}

function updatePomodoroDisplay() {
  const m = Math.floor(pomodoroSeconds / 60).toString().padStart(2, '0');
  const s = (pomodoroSeconds % 60).toString().padStart(2, '0');

  // підтримуємо обидва можливі id
  const timerEl = document.getElementById('focus-timer') || document.getElementById('pomodoro-time');
  if (timerEl) timerEl.textContent = `${m}:${s}`;

  const overlay = document.getElementById('focus-overlay');
  if (overlay?.classList.contains('open')) {
    document.title = `${m}:${s} | Flowlist`;
  }
}

function updateFocusBtn() {
  const btn = document.getElementById('focus-btn') || document.getElementById('focus-play-btn');
  if (!btn) return;
  btn.textContent = pomodoroRunning ? '⏸ Пауза' : '▶ Старт';
}

function updateFocusLabel(text) {
  const el = document.getElementById('focus-label') || document.getElementById('focus-mode-label');
  if (el) el.textContent = text;
}

function showToastSafe(msg) {
  if (typeof showToast === 'function') showToast(msg, 'ok');
}

// ══════════════════════════════════════════
// AI ASSISTANT
// ══════════════════════════════════════════
let aiMessages = [];

function openAI() {
  document.getElementById('ai-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  if (aiMessages.length === 0) {
    appendAIMessage('assistant',
      'Привіт! Я твій AI-помічник у Flowlist ✦\n\nМожу допомогти:\n• Розбити задачу на підзадачі\n• Оцінити пріоритети\n• Дати пораду по продуктивності\n\nЗапитай мене про будь-яку задачу!');
  }
  setTimeout(() => document.getElementById('ai-input')?.focus(), 100);
}

function closeAI() {
  document.getElementById('ai-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// sendAI — викликається з HTML onclick="sendAI()"
async function sendAI() {
  const input = document.getElementById('ai-input');
  const msg   = input?.value.trim();
  if (!msg) return;

  input.value = '';
  appendAIMessage('user', msg);
  setAILoading(true);

  const taskContext = (typeof tasks !== 'undefined' && tasks.length)
    ? `Поточні задачі:\n${tasks.slice(0, 10).map(t =>
        `- "${t.title}" [${t.priority}${t.completed ? ' ✓' : ''}]`
      ).join('\n')}`
    : 'Задач поки немає.';

  const systemPrompt = `Ти — AI-помічник вбудований у Flowlist, продуктивний todo-додаток. 
Відповідай українською мовою. Будь лаконічним, корисним і підтримуючим.
Допомагай з плануванням задач, пріоритизацією, продуктивністю.
Коли розбиваєш задачу на підзадачі — використовуй нумерований список.
${taskContext}`;

  try {
    const apiKey = localStorage.getItem('fl_ai_key');
    if (!apiKey) {
      setAILoading(false);
      showAIKeyPrompt();
      return;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          ...aiMessages.slice(-10),
          { role: 'user', content: msg }
        ]
      })
    });

    const data = await response.json();
    setAILoading(false);

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('fl_ai_key');
        showAIKeyPrompt();
        return;
      }
      appendAIMessage('assistant', `Помилка API (${response.status}). Спробуй ще раз.`);
      return;
    }

    const reply = data.content?.[0]?.text || 'Не вдалось отримати відповідь.';
    aiMessages.push({ role: 'user', content: msg });
    aiMessages.push({ role: 'assistant', content: reply });
    appendAIMessage('assistant', reply);

  } catch (err) {
    setAILoading(false);
    appendAIMessage('assistant', 'Помилка зʼєднання. Перевір інтернет.');
    console.error('AI error:', err);
  }
}

function appendAIMessage(role, text) {
  // підтримуємо обидва можливі id контейнера
  const list = document.getElementById('ai-body') || document.getElementById('ai-messages');
  if (!list) return;

  const div = document.createElement('div');
  div.className = `ai-msg ai-msg-${role}`;

  const formatted = escHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');

  div.innerHTML = `<div class="ai-bubble">${formatted}</div>`;
  list.appendChild(div);
  list.scrollTop = list.scrollHeight;
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setAILoading(loading) {
  const list = document.getElementById('ai-body') || document.getElementById('ai-messages');
  const btn  = document.getElementById('ai-send-btn');
  if (loading) {
    if (!list) return;
    const loader = document.createElement('div');
    loader.className = 'ai-msg ai-msg-assistant';
    loader.id = 'ai-loader';
    loader.innerHTML = `<div class="ai-bubble ai-loading"><span></span><span></span><span></span></div>`;
    list.appendChild(loader);
    list.scrollTop = list.scrollHeight;
    if (btn) btn.disabled = true;
  } else {
    document.getElementById('ai-loader')?.remove();
    if (btn) btn.disabled = false;
  }
}

function showAIKeyPrompt() {
  const list = document.getElementById('ai-body') || document.getElementById('ai-messages');
  if (!list) return;
  const div = document.createElement('div');
  div.className = 'ai-msg ai-msg-assistant';
  div.innerHTML = `
    <div class="ai-bubble">
      Для роботи AI потрібен API ключ Anthropic.<br/><br/>
      <a href="https://console.anthropic.com" target="_blank" style="color:var(--accent)">Отримати ключ →</a><br/><br/>
      <div style="display:flex;gap:6px;margin-top:6px">
        <input type="password" id="ai-key-input" style="flex:1;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--ink);font-size:13px" placeholder="sk-ant-..."/>
        <button onclick="saveAIKey()" style="padding:6px 12px;border-radius:8px;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:13px">Зберегти</button>
      </div>
    </div>
  `;
  list.appendChild(div);
  list.scrollTop = list.scrollHeight;
}

function saveAIKey() {
  const key = document.getElementById('ai-key-input')?.value.trim()
           || document.getElementById('ai-key')?.value.trim();
  if (!key || !key.startsWith('sk-')) {
    if (typeof showToast === 'function') showToast('Невалідний ключ — має починатись з sk-', 'error');
    return;
  }
  localStorage.setItem('fl_ai_key', key);
  document.getElementById('ai-key-input')?.closest('.ai-msg')?.remove();
  appendAIMessage('assistant', 'Ключ збережено! ✦ Тепер можеш задавати питання.');
  if (typeof showToast === 'function') showToast('API ключ збережено', 'ok');
}

// ══════════════════════════════════════════
// INIT ALL
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initQuote();
  initMood();

  document.getElementById('ai-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('ai-overlay')) closeAI();
  });

  document.getElementById('focus-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('focus-overlay')) closeFocus();
  });

  // Enter в AI полі (також є onkeydown в HTML, це запасний варіант)
  document.getElementById('ai-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAI(); }
  });
});