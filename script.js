/* ====== Persistent numbers + log (D/Ä/G independent draws 1..26) ====== */
const TOTAL = 26;
const PLAYERS = ['D','Ä','G'];

const statusEl   = document.getElementById('status');
const logBody    = document.getElementById('logBody');
const darkToggle = document.getElementById('darkToggle');
const resetBtn   = document.getElementById('reset');

const btns = { 'D': document.getElementById('btn-d'),
               'Ä': document.getElementById('btn-ae'),
               'G': document.getElementById('btn-g') };

/* state persisted in localStorage */
let used = loadUsedSets();                 // { D:[...], Ä:[...], G:[...] } -> we convert to Sets
let logEntries = loadLogEntries();         // [{t:'HH:MM:SS', p:'D', n:7}, ...]

// convert arrays -> Sets for fast lookup
Object.keys(used).forEach(k => used[k] = new Set(used[k] || []));

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

// restore UI from persisted state
renderLogFromStorage();
updateStatus();
PLAYERS.forEach(p => { if (used[p].size === TOTAL) btns[p].disabled = true; });

function handlePress(label) {
  const u = used[label];
  const start = rand1toN(TOTAL);
  const n = nextAvailableFrom(start, u);
  const ts = new Date();

  if (n === null) {
    appendLog(ts, label, '—'); // exhausted
    btns[label].disabled = true;
    updateStatus();
    return;
  }
  u.add(n);
  persistUsedSets();
  appendLog(ts, label, n);
  updateStatus();
  if (u.size === TOTAL) btns[label].disabled = true;
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
  const left = L => TOTAL - used[L].size;
  statusEl.textContent = `Numbers left — D: ${left('D')}, Ä: ${left('Ä')}, G: ${left('G')}`;
}

function appendLog(date, label, number, {persist=true} = {}) {
  const entry = { t: fmt(date), p: label, n: number };
  // newest on top in DOM
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${entry.t}</td><td>${entry.p}</td><td>${entry.n}</td>`;
  if (logBody.firstChild) logBody.insertBefore(tr, logBody.firstChild);
  else logBody.appendChild(tr);

  if (persist) {
    logEntries.push(entry);        // store chronologically (oldest first)
    persistLogEntries();
  }
}

function renderLogFromStorage() {
  // render newest first
  for (let i = logEntries.length - 1; i >= 0; i--) {
    const e = logEntries[i];
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${e.t}</td><td>${e.p}</td><td>${e.n}</td>`;
    logBody.appendChild(tr);
  }
}

function fmt(d) { const p = x => String(x).padStart(2,'0'); return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }

function initDarkMode() {
  const saved = localStorage.getItem('dark') === '1';
  document.body.classList.toggle('dark', saved);
  darkToggle.checked = saved;
  darkToggle.addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('dark', e.target.checked ? '1' : '0');
    applyMapColors();
  });
}

function resetAll() {
  // numbers + log
  used = { 'D': new Set(), 'Ä': new Set(), 'G': new Set() };
  logEntries = [];
  persistUsedSets();
  persistLogEntries();
  Object.values(btns).forEach(b => (b.disabled = false));
  while (logBody.firstChild) logBody.removeChild(logBody.firstChild);
  updateStatus();

  // map
  Object.keys(mapState).forEach(id => delete mapState[id]);
  saveMapState(); applyMapColors(); updateCounts();
}

/* ---- persistence helpers (numbers + log) ---- */
function loadUsedSets() {
  try { return JSON.parse(localStorage.getItem('usedSets') || '{"D":[],"Ä":[],"G":[]}'); }
  catch { return {"D":[],"Ä":[],"G":[]}; }
}
function persistUsedSets() {
  const serial = { 'D': Array.from(used['D']), 'Ä': Array.from(used['Ä']), 'G': Array.from(used['G']) };
  localStorage.setItem('usedSets', JSON.stringify(serial));
}
function loadLogEntries() {
  try { return JSON.parse(localStorage.getItem('logEntries') || '[]'); }
  catch { return []; }
}
function persistLogEntries() {
  localStorage.setItem('logEntries', JSON.stringify(logEntries));
}

/* ================= Clickable canton map (auto-load SVG) ================= */
const COLORS = { 'D': '#4B5320', 'Ä': '#7EC8E3', 'G': '#004080' };
const CODES = ['ZH','BE','LU','UR','SZ','OW','NW','GL','ZG','FR','SO','BS','BL','SH','AR','AI','SG','GR','AG','TG','VD','VS','NE','GE','TI','JU'];
const CODESET = new Set(CODES);

let mapState = loadMapState();                 // { ZH: 'D', ... }
let activePlayer = localStorage.getItem('activePlayer') || 'D';

// chip UI
const chips = Array.from(document.querySelectorAll('.chip'));
chips.forEach(chip => chip.addEventListener('click', () => {
  activePlayer = chip.dataset.player;
  localStorage.setItem('activePlayer', activePlayer);
  updateChips();
}));
function updateChips() { chips.forEach(ch => ch.classList.toggle('active', ch.dataset.player === activePlayer)); }
updateChips();

// Robust canton ID normalizer (and whitelist)
const normId = (raw) => {
  if (!raw) return null;
  let s = raw.toUpperCase().trim();
  s = s.replace(/^CH[\-_.\s]?/, '');   // CHZH, CH-ZH, CH_ZH, CH.ZH -> ZH
  s = s.replace(/[^A-Z]/g, '');        // keep letters only
  if (s.length > 2) s = s.slice(-2);   // last two letters
  return CODESET.has(s) ? s : null;
};

(async function loadCantonSvg() {
  const hostSvg = document.getElementById('ch-map');
  const layer = document.getElementById('cantons-layer');

  const sources = [
    'https://upload.wikimedia.org/wikipedia/commons/f/f8/Suisse_cantons.svg',
    'https://simplemaps.com/static/svg/country/ch/admin1/ch.svg'
  ];

  for (const url of sources) {
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) continue;
      const svgText = await resp.text();
      const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      const srcSvg = doc.documentElement;

      const vb = srcSvg.getAttribute('viewBox');
      if (vb) hostSvg.setAttribute('viewBox', vb);

      layer.innerHTML = '';

      // Build one <g class="canton" id="XX"> per canton.
      const ensureGroup = (code) => {
        let g = layer.querySelector(`g#${code}`);
        if (!g) {
          g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.setAttribute('class', 'canton');
          g.setAttribute('id', code);
          layer.appendChild(g);
        }
        return g;
      };

      let added = new Set();

      // 1) Some sources have canton <g id="ZH"><path .../><path .../></g>
      Array.from(srcSvg.querySelectorAll('g[id]')).forEach(srcG => {
        const code = normId(srcG.getAttribute('id'));
        if (!code) return;
        const dest = ensureGroup(code);
        Array.from(srcG.querySelectorAll('path, polygon, rect')).forEach(sh => {
          const clone = sh.cloneNode(true);
          clone.removeAttribute('class'); clone.removeAttribute('style'); clone.removeAttribute('fill'); clone.removeAttribute('stroke'); clone.removeAttribute('opacity');
          dest.appendChild(clone);
        });
        added.add(code);
      });

      // 2) Others put ids directly on the paths
      Array.from(srcSvg.querySelectorAll('path[id], polygon[id], rect[id]')).forEach(sh => {
        const code = normId(sh.getAttribute('id'));
        if (!code) return;
        const dest = ensureGroup(code);
        const clone = sh.cloneNode(true);
        clone.removeAttribute('class'); clone.removeAttribute('style'); clone.removeAttribute('fill'); clone.removeAttribute('stroke'); clone.removeAttribute('opacity');
        dest.appendChild(clone);
        added.add(code);
      });

      if (added.size < 20) throw new Error('Not enough canton shapes; trying fallback…');

      wireCantons();
      applyMapColors();
      updateCounts();
      return; // success
    } catch (e) {
      // try next source
    }
  }

  document.getElementById('counts').textContent =
    'Map failed to load. (If this persists, I can inline a clean SVG.)';
})();

function wireCantons() {
  const hostSvg = document.getElementById('ch-map');
  const cantonGroups = Array.from(hostSvg.querySelectorAll('.canton'));
  cantonGroups.forEach(g => {
    const id = normId(g.id);
    if (!id) return;
    g.id = id; // normalize
    g.addEventListener('click', () => {
      const current = mapState[id];
      if (!current) mapState[id] = activePlayer;
      else if (current === activePlayer) delete mapState[id];
      else mapState[id] = activePlayer;
      saveMapState(); applyMapColors(); updateCounts();
    });
  });
}

function applyMapColors() {
  const dark = document.body.classList.contains('dark');
  const cantons = Array.from(document.querySelectorAll('#ch-map .canton'));
  cantons.forEach(g => {
    const id = g.id;
    const owner = mapState[id];
    const shapes = Array.from(g.querySelectorAll('path, rect, polygon'));
    shapes.forEach(path => {
      if (owner) {
        path.style.fill   = COLORS[owner];
        path.style.stroke = 'rgba(255,255,255,.85)';
      } else {
        path.style.fill   = dark ? '#1b1c21' : 'rgba(255,255,255,.9)';
        path.style.stroke = dark ? '#2a2a2a' : 'rgba(0,0,0,.25)';
      }
    });
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

// Persistence for map
function loadMapState() { try { return JSON.parse(localStorage.getItem('mapState') || '{}'); } catch { return {}; } }
function saveMapState() { localStorage.setItem('mapState', JSON.stringify(mapState)); }
