const TOTAL = 26;

// independent used-sets per button (order D, Ä, G)
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

// Wire buttons
Object.entries(btns).forEach(([label, el]) => {
  el.addEventListener('click', () => handlePress(label));
});

// Reset with confirmation
resetBtn.addEventListener('click', () => {
  const sure = window.confirm('Reset all numbers for D, Ä, and G and clear the log?');
  if (!sure) return;
  resetAll();
});

updateStatus();

function handlePress(label) {
  const u = used[label];
  const start = rand1toN(TOTAL);
  const n = nextAvailableFrom(start, u); // per-button availability
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
    candidate = (candidate % TOTAL) + 1; // wrap 26 -> 1
  }
  return null;
}

function rand1toN(n) { return Math.floor(Math.random() * n) + 1; }

function updateStatus() {
  // Show in D, Ä, G order
  const left = (label) => TOTAL - used[label].size;
  statusEl.textContent = `Numbers left — D: ${left('D')}, Ä: ${left('Ä')}, G: ${left('G')}`;
}

function setButtonDisabled(label, disabled) {
  btns[label].disabled = disabled;
}

function appendLog(date, label, number) {
  const tr = document.createElement('tr');

  const t = document.createElement('td');
  t.textContent = formatTime(date); // HH:MM:SS

  const b = document.createElement('td');
  b.textContent = label;

  const n = document.createElement('td');
  n.textContent = number;

  tr.append(t, b, n);

  // newest on top
  if (logBody.firstChild) {
    logBody.insertBefore(tr, logBody.firstChild);
  } else {
    logBody.appendChild(tr);
  }
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
  used['D'].clear();
  used['Ä'].clear();
  used['G'].clear();
  Object.values(btns).forEach(b => (b.disabled = false));
  while (logBody.firstChild) logBody.removeChild(logBody.firstChild);
  updateStatus();
}
