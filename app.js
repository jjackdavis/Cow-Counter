const countEl = document.getElementById('count');
const btnAdd = document.getElementById('btn-add');
const btnUndo = document.getElementById('btn-undo');
const btnReset = document.getElementById('btn-reset');
const btnSave = document.getElementById('btn-save');
const sessionNameEl = document.getElementById('session-name');
const sessionList = document.getElementById('session-list');

let count = 0;
let history = [];

// ── IndexedDB setup ──────────────────────────────────────────────────────────

const DB_NAME = 'CowCounterDB';
const DB_VERSION = 1;
const STORE = 'sessions';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function dbGetAll() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('createdAt').getAll();
    req.onsuccess = (e) => resolve(e.target.result.reverse()); // newest first
    req.onerror = (e) => reject(e.target.error);
  });
}

function dbAdd(session) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).add(session);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function dbDelete(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

// ── Counter logic ────────────────────────────────────────────────────────────

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

// ── Sessions ─────────────────────────────────────────────────────────────────

async function renderSessions() {
  const sessions = await dbGetAll();
  sessionList.innerHTML = '';

  if (sessions.length === 0) {
    sessionList.innerHTML = '<li class="empty-note">No saved sessions yet.</li>';
    return;
  }

  sessions.forEach((s) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="session-info">
        <span class="name">${escapeHtml(s.name)}</span>
        <span class="meta">${s.count} cow${s.count !== 1 ? 's' : ''} &middot; ${s.date}</span>
      </div>
      <div class="session-actions">
        <button class="btn-load" data-id="${s.id}">Load</button>
        <button class="btn-delete" data-id="${s.id}" data-count="${s.count}" data-name="${escapeHtml(s.name)}">Delete</button>
      </div>`;
    sessionList.appendChild(li);
  });
}

async function saveSession() {
  const name = sessionNameEl.value.trim() || `Session ${new Date().toLocaleTimeString()}`;
  await dbAdd({
    name,
    count,
    date: new Date().toLocaleDateString(),
    createdAt: Date.now(),
  });
  sessionNameEl.value = '';
  await renderSessions();
}

async function loadSession(id) {
  const sessions = await dbGetAll();
  const s = sessions.find((x) => x.id === id);
  if (!s) return;
  history = [];
  setCount(s.count);
}

async function deleteSession(id) {
  await dbDelete(id);
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
  const id = parseInt(e.target.dataset.id, 10);
  if (isNaN(id)) return;
  if (e.target.classList.contains('btn-load')) loadSession(id);
  if (e.target.classList.contains('btn-delete')) deleteSession(id);
});

document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); addCow(); }
  if (e.code === 'Backspace') { e.preventDefault(); undo(); }
});

// ── Init ──────────────────────────────────────────────────────────────────────

openDB()
  .then((database) => {
    db = database;
    setCount(0);
    renderSessions();
  })
  .catch((err) => {
    console.error('IndexedDB failed to open:', err);
    // Fallback message in session list
    sessionList.innerHTML = '<li class="empty-note">Database unavailable.</li>';
    setCount(0);
  });
