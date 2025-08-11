/* ===== Numbers game (D/Ä/G independent draws 1..26) ===== */
const TOTAL = 26;
const used = { 'D': new Set(), 'Ä': new Set(), 'G': new Set() };

const statusEl   = document.getElementById('status');
const logBody    = document.getElementById('logBody');
const darkToggle = document.getElementById('darkToggle');
const resetBtn   = document.getElementById('reset');

const btns = { 'D': document.getElementById('btn-d'),
               'Ä': document.getElementById('btn-ae'),
               'G': document.getElementById('btn-g') };

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
  let c = start;
  for (let i = 0; i < TOTAL; i++) {
    if (!set.has(c)) return c;
    c = (c % TOTAL) + 1;
  }
  return null;
}
function rand1toN(n) { return Math.floor(Math.random() * n) + 1; }
function updateStatus() {
  const left = (L) => TOTAL - used[L].size;
  statusEl.textContent = `Numbers left — D: ${left('D')}, Ä: ${left('Ä')}, G: ${left('G')}`;
}
function setButtonDisabled(label, disabled) { btns[label].disabled = disabled; }
function appendLog(date, label, number) {
  const tr = document.createElement('tr');
  const t = document.createElement('td'); t.textContent = fmt(date);
  const b = document.createElement('td'); b.textContent = label;
  const n = document.createElement('td'); n.textContent = number;
  tr.append(t,b,n);
  logBody.firstChild ? logBody.insertBefore(tr, logBody.firstChild) : logBody.appendChild(tr);
}
function fmt(d) { const p = x => String(x).padStart(2,'0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }
function initDarkMode() {
  const saved = localStorage.getItem('dark') === '1';
  document.body.classList.toggle('dark', saved);
  darkToggle.checked = saved;
  darkToggle.addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('dark', e.target.checked ? '1' : '0');
    applyMapColors(); // keep fills readable on theme change
  });
}
function resetAll() {
  used['D'].clear(); used['Ä'].clear(); used['G'].clear();
  Object.values(btns).forEach(b => (b.disabled = false));
  while (logBody.firstChild) logBody.removeChild(logBody.firstChild);
  Object.keys(mapState).forEach(id => delete mapState[id]); // clear map
  saveMapState(); applyMapColors(); updateCounts(); updateStatus();
}

/* ===== Clickable canton map (auto-load SVG) ===== */
const COLORS = { 'D': '#4B5320', 'Ä': '#7EC8E3', 'G': '#004080' };

let mapState = loadMapState();                 // { ZH: 'D', ... }
let activePlayer = localStorage.getItem('activePlayer') || 'D';
const chips = Array.from(document.querySelectorAll('.chip'));
chips.forEach(chip => chip.addEventListener('click', () => {
  activePlayer = chip.dataset.player;
  localStorage.setItem('activePlayer', activePlayer);
  updateChips();
}));
function updateChips() { chips.forEach(ch =>
  ch.classList.toggle('active', ch.dataset.player === activePlayer)); }
updateChips();

// Load canton SVG from Simplemaps; fallback to Wikimedia if needed.
(async function loadCantonSvg() {
  const hostSvg = document.getElementById('ch-map');
  const layer = document.getElementById('cantons-layer');

  const sources = [
    // Simplemaps admin1 SVG (ids like CHZH, CHBE, ...)
    'https://simplemaps.com/static/svg/country/ch/admin1/ch.svg',
    // Fallback: Wikimedia (ids usually ZH, BE, ...)
    'https://upload.wikimedia.org/wikipedia/commons/f/f8/Suisse_cantons.svg'
  ];

  for (const url of sources) {
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) continue;
      const svgText = await resp.text();

      const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      const srcSvg = doc.documentElement;

      // Use source viewBox for correct scaling
      const vb = srcSvg.getAttribute('viewBox');
      if (vb) hostSvg.setAttribute('viewBox', vb);

      // Clear previous
      layer.innerHTML = '';

      // Collect paths with IDs we can normalize to 2-letter codes
      const paths = Array.from(srcSvg.querySelectorAll('path[id]'));
      paths.forEach(p => {
        const raw = (p.getAttribute('id') || '').toUpperCase();
        let code = raw.replace(/^CH-?/, '');      // CHZH or CH-ZH -> ZH
        if (code.length > 2) code = code.slice(0, 2);
        if (!/^[A-Z]{2}$/.test(code)) return;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'canton');
        g.setAttribute('id', code);
        g.appendChild(p.cloneNode(true));

        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = code;
        g.appendChild(title);

        layer.appendChild(g);
      });

      // Wire clicks
      wireCantons();
      applyMapColors();
      updateCounts();
      return; // success
    } catch (e) {
      // try next source
    }
  }

  // If both sources fail:
  document.getElementById('counts').textContent =
    'Map failed to load. Check Content-Security-Policy or network.';
})();

function wireCantons() {
  const hostSvg = document.getElementById('ch-map');
  const cantonGroups = Array.from(hostSvg.querySelectorAll('.canton'));
  cantonGroups.forEach(g => {
    const id = g.id;
    g.addEventListener('click', () => {
      const current = mapState[id];
      if (!current) mapState[id] = activePlayer;
      else if (current === activePlayer) delete mapState[id];
      else mapState[id] = activePlayer;
      saveMapState(); applyMapColors(); updateCounts();
    });
  });
}

// Color fills from state
function applyMapColors() {
  const hostSvg = document.getElementById('ch-map');
  const dark = document.body.classList.contains('dark');
  const cantons = Array.from(hostSvg.querySelectorAll('.canton'));
  cantons.forEach(g => {
    const id = g.id;
    const owner = mapState[id];
    const path = g.querySelector('path, rect');
    if (!path) return;

    if (owner) {
      path.setAttribute('fill', COLORS[owner]);
      path.setAttribute('stroke', 'rgba(255,255,255,.85)');
    } else {
      path.setAttribute('fill', dark ? '#1b1c21' : 'rgba(255,255,255,.9)');
      path.setAttribute('stroke', dark ? '#2a2a2a' : 'rgba(0,0,0,.25)');
    }
  });
}

darkToggle.addEventListener('change', applyMapColors);

// Counts
function updateCounts() {
  const counts = { 'D': 0, 'Ä': 0, 'G': 0 };
  Object.values(mapState).forEach(v => { if (counts[v] !== undefined) counts[v]++; });
  document.getElementById('counts').textContent =
    `Cantons — D: ${counts['D']} · Ä: ${counts['Ä']} · G: ${counts['G']}`;
}

// Persistence
function loadMapState() { try { return JSON.parse(localStorage.getItem('mapState') || '{}'); } catch { return {}; } }
function saveMapState() { localStorage.setItem('mapState', JSON.stringify(mapState)); }
