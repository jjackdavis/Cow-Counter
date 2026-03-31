const SUPABASE_URL = 'https://swhdbnzxwvktpybutupg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HPkvMwpqsPfvKB_9tbePYA_Rv1_W_Pe';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── DOM refs ──────────────────────────────────────────────────────────────────

const countEl       = document.getElementById('count');
const btnAdd        = document.getElementById('btn-add');
const btnUndo       = document.getElementById('btn-undo');
const btnReset      = document.getElementById('btn-reset');
const btnSave       = document.getElementById('btn-save');
const sessionNameEl = document.getElementById('session-name');
const sessionList   = document.getElementById('session-list');

// ── Counter logic ─────────────────────────────────────────────────────────────

let count = 0;
let history = [];

function setCount(n) {
  count = n;
  countEl.textContent = count;
  btnUndo.disabled = history.length === 0;
}

function addCow() {
  history.push(count);
  setCount(count + 1);
  bumpAnimation();
}

function undo() {
  if (history.length === 0) return;
  setCount(history.pop());
}

function reset() {
  if (count === 0 && history.length === 0) return;
  history = [];
  setCount(0);
}

function bumpAnimation() {
  countEl.classList.remove('bump');
  void countEl.offsetWidth;
  countEl.classList.add('bump');
  countEl.addEventListener('transitionend', () => countEl.classList.remove('bump'), { once: true });
}

// ── Sessions ──────────────────────────────────────────────────────────────────

async function renderSessions() {
  sessionList.innerHTML = '<li class="empty-note">Loading…</li>';

  const { data, error } = await sb
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false });

  sessionList.innerHTML = '';

  if (error) {
    sessionList.innerHTML = '<li class="empty-note">Could not load sessions.</li>';
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    sessionList.innerHTML = '<li class="empty-note">No saved sessions yet.</li>';
    return;
  }

  data.forEach((s) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="session-info">
        <span class="name">${escapeHtml(s.name)}</span>
        <span class="meta">${s.count} cow${s.count !== 1 ? 's' : ''} &middot; ${s.date}</span>
      </div>
      <div class="session-actions">
        <button class="btn-load" data-count="${s.count}">Load</button>
        <button class="btn-delete" data-id="${s.id}">Delete</button>
      </div>`;
    sessionList.appendChild(li);
  });
}

async function saveSession() {
  const name = sessionNameEl.value.trim() || `Session ${new Date().toLocaleTimeString()}`;

  const { error } = await sb.from('sessions').insert({ name, count, date: new Date().toLocaleDateString() });

  if (error) { console.error(error); return; }

  sessionNameEl.value = '';
  await renderSessions();
}

async function deleteSession(id) {
  const { error } = await sb.from('sessions').delete().eq('id', id);
  if (error) { console.error(error); return; }
  await renderSessions();
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Event listeners ───────────────────────────────────────────────────────────

btnAdd.addEventListener('click', addCow);
btnUndo.addEventListener('click', undo);
btnReset.addEventListener('click', reset);
btnSave.addEventListener('click', saveSession);

sessionList.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-load')) {
    history = [];
    setCount(parseInt(e.target.dataset.count, 10));
  }
  if (e.target.classList.contains('btn-delete')) {
    deleteSession(parseInt(e.target.dataset.id, 10));
  }
});

document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (e.code === 'Space')     { e.preventDefault(); addCow(); }
  if (e.code === 'Backspace') { e.preventDefault(); undo(); }
});

// ── Init ──────────────────────────────────────────────────────────────────────

setCount(0);
renderSessions();
