// Global draw state: 1..26 without repeating across all three buttons
const TOTAL = 26;
const used = new Set();

const statusEl = document.getElementById('status');
const logBody  = document.getElementById('logBody');
const btns = {
  'Ä': document.getElementById('btn-ae'),
  'D': document.getElementById('btn-d'),
  'G': document.getElementById('btn-g'),
};

Object.entries(btns).forEach(([label, el]) => {
  el.addEventListener('click', () => handlePress(label));
});

updateStatus();

function handlePress(label) {
  // Pick a random start in [1..26]
  const start = rand1toN(TOTAL);
  const n = nextAvailableFrom(start); // respects "next following number if repeat"

  const ts = new Date();
  if (n === null) {
    appendLog(ts, label, '—');
    statusEl.textContent = 'All numbers drawn. (0 left)';
    setButtonsDisabled(true);
    return;
  }

  used.add(n);
  appendLog(ts, label, n);
  updateStatus();

  if (used.size === TOTAL) setButtonsDisabled(true);
}

function nextAvailableFrom(start) {
  if (used.size >= TOTAL) return null;
  let candidate = start;
  for (let i = 0; i < TOTAL; i++) {
    if (!used.has(candidate)) return candidate;
    candidate = candidate % TOTAL + 1; // wrap 26 -> 1
  }
  return null; // should not happen
}

function rand1toN(n) {
  return Math.floor(Math.random() * n) + 1;
}

function updateStatus() {
  const left = TOTAL - used.size;
  statusEl.textContent = `Numbers left: ${left}`;
}

function setButtonsDisabled(disabled) {
  Object.values(btns).forEach(b => (b.disabled = disabled));
}

function appendLog(date, label, number) {
  const tr = document.createElement('tr');

  const t = document.createElement('td');
  t.textContent = formatTime(date);

  const b = document.createElement('td');
  b.textContent = label;

  const n = document.createElement('td');
  n.textContent = number;

  tr.appendChild(t);
  tr.appendChild(b);
  tr.appendChild(n);
  logBody.appendChild(tr);

  // Auto-scroll to newest row
  tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function formatTime(d) {
  // Local time, HH:MM:SS.mmm
  const pad = (x, n=2) => String(x).padStart(n, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(),3)}`;
}
