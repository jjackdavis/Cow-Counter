const countEl = document.getElementById('count');
const btnAdd = document.getElementById('btn-add');
const btnUndo = document.getElementById('btn-undo');
const btnReset = document.getElementById('btn-reset');
const btnSave = document.getElementById('btn-save');
const sessionNameEl = document.getElementById('session-name');
const sessionList = document.getElementById('session-list');

const STORAGE_KEY = 'cow-counter-sessions';

let count = 0;
let history = []; // stack of previous counts for undo

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
  // Force reflow so re-adding the class triggers animation
  void countEl.offsetWidth;
  countEl.classList.add('bump');
  countEl.addEventListener('transitionend', () => countEl.classList.remove('bump'), { once: true });
}

// Sessions

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function renderSessions() {
  const sessions = loadSessions();
  sessionList.innerHTML = '';

  if (sessions.length === 0) {
    sessionList.innerHTML = '<li class="empty-note">No saved sessions yet.</li>';
    return;
  }

  sessions.forEach((s, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="session-info">
        <span class="name">${escapeHtml(s.name)}</span>
        <span class="meta">${s.count} cow${s.count !== 1 ? 's' : ''} &middot; ${s.date}</span>
      </div>
      <div class="session-actions">
        <button class="btn-load" data-index="${i}">Load</button>
        <button class="btn-delete" data-index="${i}">Delete</button>
      </div>`;
    sessionList.appendChild(li);
  });
}

function saveSession() {
  const name = sessionNameEl.value.trim() || `Session ${new Date().toLocaleTimeString()}`;
  const sessions = loadSessions();
  sessions.unshift({
    name,
    count,
    date: new Date().toLocaleDateString(),
  });
  saveSessions(sessions);
  sessionNameEl.value = '';
  renderSessions();
}

function loadSession(index) {
  const sessions = loadSessions();
  const s = sessions[index];
  if (!s) return;
  history = [];
  setCount(s.count);
}

function deleteSession(index) {
  const sessions = loadSessions();
  sessions.splice(index, 1);
  saveSessions(sessions);
  renderSessions();
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Event listeners

btnAdd.addEventListener('click', addCow);
btnUndo.addEventListener('click', undo);
btnReset.addEventListener('click', reset);
btnSave.addEventListener('click', saveSession);

sessionList.addEventListener('click', (e) => {
  const idx = parseInt(e.target.dataset.index, 10);
  if (isNaN(idx)) return;
  if (e.target.classList.contains('btn-load')) loadSession(idx);
  if (e.target.classList.contains('btn-delete')) deleteSession(idx);
});

document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); addCow(); }
  if (e.code === 'Backspace') { e.preventDefault(); undo(); }
});

// Init
setCount(0);
renderSessions();
