/* ======================================================
   CUTIE MENU ✨ — Card Grid + Detail Panel + cache
   ====================================================== */

const SHEET_ID  = '1U5KtFNN3SPcCygk4joTvCfpeA8SCgBaVE9mSjvR9rvM';
const SHEET_GID = 0;
const CSV_URL   = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const CACHE_KEY = 'cutiemenu_grid_v2';
const CACHE_TTL = 5 * 60 * 1000; // 5 min
const SKELETON_COUNT = 8;

const $ = (id) => document.getElementById(id);

// DOM
const grid         = $('grid');
const errorBox     = $('errorBox');
const errorMsg     = $('errorMsg');
const retryBtn     = $('retryBtn');
const overlayBg    = $('overlayBg');
const detailPanel  = $('detailPanel');
const detailClose  = $('detailClose');
const detailTitle  = $('detailTitle');
const detailBody   = $('detailBody');
const copyBtn      = $('copyBtn');
const toast        = $('toast');
const menuToggle   = $('menuToggle');
const mOverlay     = $('mOverlay');
const mSidebar     = $('mSidebar');
const mSidebarNav  = $('mSidebarNav');

let items       = [];
let activeIndex = -1;
let toastTimer  = null;

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  createSparkles();
  renderSkeletons();

  const cached = readCache();
  if (cached) {
    items = cached;
    renderGrid();
    renderMobileSidebar();
    return;
  }
  fetchData();
});

// ===================== CACHE =====================
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data;
  } catch { /* ignore */ }
  return null;
}
function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); }
  catch { /* ignore */ }
}

// ===================== SKELETONS =====================
function renderSkeletons() {
  let h = '';
  for (let i = 0; i < SKELETON_COUNT; i++) {
    h += `<div class="skel-card"><div class="skel-line w1"></div><div class="skel-line w2"></div><div class="skel-line w3"></div></div>`;
  }
  grid.innerHTML = h;
}

// ===================== FETCH =====================
async function fetchData() {
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = parseCSV(await res.text());
    const data = rows.slice(1);
    if (!data.length) return showError('No data found in the sheet.');

    items = [];
    for (const row of data) {
      if (row.length < 2) continue;
      const title   = (row[0] || '').trim();
      const content = (row[1] || '').trim();
      if (title || content) items.push({ title, content });
    }
    if (!items.length) return showError('No data found in the sheet.');

    writeCache(items);
    renderGrid();
    renderMobileSidebar();
  } catch (err) {
    console.error(err);
    showError(err.message || 'Could not fetch data.');
  }
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1] || '';
    if (inQ) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',')  { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); field = ''; if (row.some(f => f.trim())) rows.push(row); row = []; }
      else if (c !== '\r') field += c;
    }
  }
  if (field || inQ) row.push(field);
  if (row.some(f => f.trim())) rows.push(row);
  return rows;
}

// ===================== RENDER GRID =====================
function renderGrid() {
  let h = '';
  items.forEach((item, i) => {
    const preview = (item.content || '').slice(0, 150).replace(/\s+/g, ' ').trim();
    h += `
      <div class="card" data-idx="${i}" tabindex="0" role="button" aria-label="${escHtml(item.title)}">
        <div class="card-title">${escHtml(item.title)}</div>
        <div class="card-preview">${escHtml(preview) || 'No preview'}</div>
        <div class="card-footer">♡ View details</div>
      </div>`;
  });
  grid.innerHTML = h;

  // delegated click + keyboard
  grid.onclick = (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    openDetail(+card.dataset.idx);
  };
  grid.onkeydown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.card');
    if (!card) return;
    e.preventDefault();
    openDetail(+card.dataset.idx);
  };
}

// ===================== MOBILE SIDEBAR =====================
function renderMobileSidebar() {
  let h = '';
  items.forEach((item, i) => {
    h += `<button class="mnav-item" data-idx="${i}">${escHtml(item.title)}</button>`;
  });
  mSidebarNav.innerHTML = h;

  mSidebarNav.onclick = (e) => {
    const btn = e.target.closest('.mnav-item');
    if (!btn) return;
    openDetail(+btn.dataset.idx);
    closeMobileSidebar();
  };
}

// ===================== DETAIL PANEL =====================
function openDetail(index) {
  if (index < 0 || index >= items.length) return;
  activeIndex = index;

  detailTitle.textContent = items[index].title;
  detailBody.textContent  = items[index].content;

  copyBtn.classList.remove('copied');
  copyBtn.disabled = false;
  copyBtn.innerHTML = '📋 Copy';

  overlayBg.classList.remove('hidden');
  detailPanel.classList.remove('hidden');
  // trigger reflow then open
  void detailPanel.offsetWidth;
  detailPanel.classList.add('open');

  // focus trap
  detailClose.focus();
}

function closeDetail() {
  detailPanel.classList.remove('open');
  const onTransitionEnd = () => {
    detailPanel.classList.add('hidden');
    overlayBg.classList.add('hidden');
    detailPanel.removeEventListener('transitionend', onTransitionEnd);
    activeIndex = -1;
  };
  detailPanel.addEventListener('transitionend', onTransitionEnd, { once: true });
  // fallback if transitionend doesn't fire
  setTimeout(() => { detailPanel.classList.add('hidden'); overlayBg.classList.add('hidden'); activeIndex = -1; }, 400);
}

detailClose.addEventListener('click', closeDetail);
overlayBg.addEventListener('click', closeDetail);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && detailPanel.classList.contains('open')) {
    closeDetail();
  }
});

// ===================== COPY =====================
copyBtn.addEventListener('click', () => {
  if (activeIndex < 0) return;
  const text = items[activeIndex].content;
  if (!text) return;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(copied, () => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
});

function fallbackCopy(text) {
  const ta = Object.assign(document.createElement('textarea'), { value: text, style: 'position:fixed;left:-9999px' });
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); copied(); } catch { toastMsg('❌ Copy failed'); }
  ta.remove();
}

function copied() {
  copyBtn.classList.add('copied');
  copyBtn.disabled = true;
  copyBtn.innerHTML = '✅ Copied!';
  toastMsg('✅ Copied!');
  setTimeout(() => {
    copyBtn.classList.remove('copied');
    copyBtn.disabled = false;
    copyBtn.innerHTML = '📋 Copy';
  }, 1800);
}

// ===================== TOAST =====================
function toastMsg(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  void toast.offsetWidth;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.remove('visible'); toast.classList.add('hidden'); }, 2000);
}

// ===================== ERROR =====================
function showError(msg) {
  grid.classList.add('hidden');
  errorBox.classList.remove('hidden');
  errorMsg.textContent = msg || 'Could not fetch data.';
}
retryBtn.addEventListener('click', () => {
  errorBox.classList.add('hidden');
  grid.classList.remove('hidden');
  renderSkeletons();
  fetchData();
});

// ===================== MOBILE SIDEBAR TOGGLE =====================
function openMobileSidebar()  { mSidebar.classList.add('open'); mOverlay.classList.remove('hidden'); menuToggle.classList.add('open'); }
function closeMobileSidebar() { mSidebar.classList.remove('open'); mOverlay.classList.add('hidden'); menuToggle.classList.remove('open'); }

menuToggle.addEventListener('click', () => mSidebar.classList.contains('open') ? closeMobileSidebar() : openMobileSidebar());
mOverlay.addEventListener('click', closeMobileSidebar);

// ===================== SPARKLES =====================
function createSparkles() {
  const chars  = ['✦','✧','⋆','☆','｡','❀'];
  const colors = ['#FFB6C1','#FFD700','#FFB6E1','#FF9EBB','#DDA0DD','#87CEEB'];
  const parent = $('sparkles');
  const frag   = new DocumentFragment();
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('span');
    s.className = 's-dot';
    s.textContent = chars[i % chars.length];
    s.style.left   = ((i * 19 + 5) % 100) + '%';
    s.style.top    = ((i * 27 + 3) % 100) + '%';
    s.style.color  = colors[i % colors.length];
    s.style.fontSize        = (10 + (i % 8)) + 'px';
    s.style.animationDuration = (5 + (i % 3)) + 's';
    s.style.animationDelay    = (i * 0.7) + 's';
    frag.appendChild(s);
  }
  parent.appendChild(frag);
}

// ===================== UTIL =====================
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
