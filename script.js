/* ===== Numbers game (D/Ä/G independent draws 1..26) ===== */
const TOTAL = 26;
const used = { 'D': new Set(), 'Ä': new Set(), 'G': new Set() };

const statusEl   = document.getElementById('status');
const logBody    = document.getElementById('logBody');
const darkToggle = document.getElementById('darkToggle');
const resetBtn   = document.getElementById('reset');

const btns = {
  'D': document.getElementById('btn-d'),
  'Ä': document.getElementById('btn-ae'),
  'G': document.getElementById('btn-g'),
};

// Night mode (persisted)
initDarkMode();

// Wire number buttons
Object.entries(btns).forEach(([label, el]) => el.addEventListener('click', () => handlePress(label)));

// Reset with confirmation
resetBtn.addEventListener('click', () => {
  const sure = window.confirm('Reset numbers for D/Ä/G, clear the log, and clear the map?');
  if (!sure) return;
  resetAll();
});

updateStatus();

function handlePress(label) {
  const u = used[label];
  const start = rand1toN(TOTAL);
  const n = nextAvailableFrom(start, u);
  const ts = new Date();

  if (n === null) {
    appendLog(ts, label, '—');
    setButtonDisabled(label, true);
    updateStatus();
    return;
  }
  u.add(n);
  appendLog(ts, label, n);
  updateStatus();
  if (u.size === TOTAL) setButtonDisabled(label, true);
}

function nextAvailableFrom(start, set) {
  if (set.size >= TOTAL) return null;
  let candidate = start;
  for (let i = 0; i < TOTAL; i++) {
    if (!set.has(candidate)) return candidate;
    candidate = (candidate % TOTAL) + 1;
  }
  return null;
}

function rand1toN(n) { return Math.floor(Math.random() * n) + 1; }

function updateStatus() {
  const left = (label) => TOTAL - used[label].size;
  statusEl.textContent = `Numbers left — D: ${left('D')}, Ä: ${left('Ä')}, G: ${left('G')}`;
}

function setButtonDisabled(label, disabled) { btns[label].disabled = disabled; }

function appendLog(date, label, number) {
  const tr = document.createElement('tr');
  const t = document.createElement('td'); t.textContent = formatTime(date);
  const b = document.createElement('td'); b.textContent = label;
  const n = document.createElement('td'); n.textContent = number;
  tr.append(t,b,n);
  logBody.firstChild ? logBody.insertBefore(tr, logBody.firstChild) : logBody.appendChild(tr);
}

function formatTime(d) {
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function initDarkMode() {
  const saved = localStorage.getItem('dark') === '1';
  document.body.classList.toggle('dark', saved);
  darkToggle.checked = saved;
  darkToggle.addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('dark', e.target.checked ? '1' : '0');
  });
}

function resetAll() {
  used['D'].clear(); used['Ä'].clear(); used['G'].clear();
  Object.values(btns).forEach(b => (b.disabled = false));
  while (logBody.firstChild) logBody.removeChild(logBody.firstChild);
  // Map reset
  Object.keys(mapState).forEach(id => delete mapState[id]);
  saveMapState();
  applyMapColors();
  updateCounts();
  updateStatus();
}

/* ===== Clickable canton map ===== */

// Player colors
const COLORS = {
  'D': '#4B5320',  // Military Green
  'Ä': '#7EC8E3',  // Light Blue
  'G': '#004080',  // Dark Blue
};

// Persisted map state: { ZH: 'D', BE: 'Ä', ... }
let mapState = loadMapState();

// Active assignee (defaults to D)
let activePlayer = localStorage.getItem('activePlayer') || 'D';

// Activate chip UI
const chips = Array.from(document.querySelectorAll('.chip'));
chips.forEach(chip => {
  chip.addEventListener('click', () => {
    activePlayer = chip.dataset.player;
    localStorage.setItem('activePlayer', activePlayer);
    updateChips();
  });
});
function updateChips() {
  chips.forEach(ch => ch.classList.toggle('active', ch.dataset.player === activePlayer));
}
updateChips();

// Hook up canton clicks
const svg = document.getElementById('ch-map');
const cantonGroups = Array.from(svg.querySelectorAll('.canton'));
cantonGroups.forEach(g => {
  g.addEventListener('click', () => {
    const id = g.id;
    if (!id) return;
    // Toggle assignment cycle: unassigned -> activePlayer; if clicking same owner again, clear
    const current = mapState[id];
    if (!current) {
      mapState[id] = activePlayer;
    } else if (current === activePlayer) {
      delete mapState[id]; // clear
    } else {
      mapState[id] = activePlayer; // reassign to selected player
    }
    saveMapState();
    applyMapColors();
    updateCounts();
  });
});

// Apply initial colors
applyMapColors();
updateCounts();

function applyMapColors() {
  cantonGroups.forEach(g => {
    const id = g.id;
    const owner = mapState[id];
    const shape = g.querySelector('path, rect');
    const label = g.querySelector('text');
    if (!shape) return;
    if (owner) {
      shape.setAttribute('fill', COLORS[owner]);
      // keep a border with decent contrast
      shape.setAttribute('stroke', 'rgba(255,255,255,.85)');
      label && label.setAttribute('fill', '#ffffff');
    } else {
      const dark = document.body.classList.contains('dark');
      shape.setAttribute('fill', dark ? '#1b1c21' : 'rgba(255,255,255,.9)');
      shape.setAttribute('stroke', dark ? '#2a2a2a' : 'rgba(0,0,0,.25)');
      label && label.setAttribute('fill', dark ? '#e7e7ea' : '#111');
    }
  });
}

// Re-apply colors when theme changes
darkToggle.addEventListener('change', applyMapColors);

// Counts display
function updateCounts() {
  const counts = { 'D': 0, 'Ä': 0, 'G': 0 };
  Object.values(mapState).forEach(v => { if (counts[v] !== undefined) counts[v]++; });
  const el = document.getElementById('counts');
  el.textContent = `Cantons — D: ${counts['D']} · Ä: ${counts['Ä']} · G: ${counts['G']}`;
}

// Persistence helpers
function loadMapState() {
  try { return JSON.parse(localStorage.getItem('mapState') || '{}'); }
  catch { return {}; }
}
function saveMapState() {
  localStorage.setItem('mapState', JSON.stringify(mapState));
}
