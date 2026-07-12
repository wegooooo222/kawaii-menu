/* ======================================================
   CUTIE MENU ✨ — Performant, Cached, Skeleton-Loaded
   ====================================================== */

// ------- CONFIG -------
const SHEET_ID   = '1U5KtFNN3SPcCygk4joTvCfpeA8SCgBaVE9mSjvR9rvM';
const SHEET_GID  = 0;
const CSV_URL    = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const CACHE_KEY  = 'cutiemenu_cache_v2';
const CACHE_TTL  = 5 * 60 * 1000; // 5 min
const SKELETON_N = 6;             // skeleton items shown while loading

// ------- DOM REFS -------
const $   = (id) => document.getElementById(id);
const sidebar    = $('sidebar');
const sidebarNav = $('sidebarNav');
const contentEl  = $('content');
const welcome    = $('welcome');
const detail     = $('detail');
const detailTitle= $('detailTitle');
const detailBody = $('detailBody');
const copyBtn    = $('copyBtn');
const errorBox   = $('errorBox');
const errorMsg   = $('errorMsg');
const retryBtn   = $('retryBtn');
const toast      = $('toast');
const menuToggle = $('menuToggle');
const overlay    = $('overlay');

// ------- STATE -------
let items       = [];
let activeIndex = -1;
let toastTimer  = null;

// ==================================================
//  INIT — try cache first, then fetch
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
  renderSkeletons();
  createSparkles();

  const cached = readCache();
  if (cached) {
    items = cached;
    renderSidebar();
    return; // instant — no fetch needed
  }

  fetchSheetData();
});

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
  catch { /* storage full or private mode */ }
}

// ==================================================
//  SKELETON LOADING (instant, no spinner)
// ==================================================
function renderSkeletons() {
  let html = '';
  for (let i = 0; i < SKELETON_N; i++) {
    html += `<div class="skeleton-item"><span class="skel-bar skel-bullet"></span><span class="skel-bar skel-text" style="width:${55 + Math.random() * 30}%"></span></div>`;
  }
  sidebarNav.innerHTML = html;
}

function clearSkeletons() {
  sidebarNav.innerHTML = '';
}

// ==================================================
//  FETCH
// ==================================================
async function fetchSheetData() {
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = parseCSV(await res.text());
    const data = rows.slice(1);
    if (!data.length) return showError('No data found in the sheet.');

    items = [];
    for (const row of data) {
      if (row.length < 2) continue;
      const title = (row[0] || '').trim();
      const content = (row[1] || '').trim();
      if (title || content) items.push({ title, content });
    }
    if (!items.length) return showError('No data found in the sheet.');

    writeCache(items);
    renderSidebar();
  } catch (err) {
    console.error(err);
    showError(err.message || 'Could not fetch data.');
  }
}

// ==================================================
//  CSV PARSER
// ==================================================
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

// ==================================================
//  RENDER SIDEBAR
// ==================================================
function renderSidebar() {
  clearSkeletons();
  let html = '';
  items.forEach((item, i) => {
    html += `<button class="nav-item" style="animation-delay:${i * 30}ms" data-idx="${i}">${escHtml(item.title)}</button>`;
  });
  sidebarNav.innerHTML = html;

  // Delegated click
  sidebarNav.onclick = (e) => {
    const btn = e.target.closest('.nav-item');
    if (!btn) return;
    selectItem(+btn.dataset.idx);
  };

  // Show sidebar
  sidebar.classList.remove('hidden');
}

// ==================================================
//  SELECT ITEM
// ==================================================
function selectItem(index) {
  if (index < 0 || index >= items.length) return;
  activeIndex = index;

  sidebarNav.querySelectorAll('.nav-item').forEach((b, i) => b.classList.toggle('active', i === index));

  welcome.classList.add('hidden');
  detail.classList.remove('hidden');
  errorBox.classList.add('hidden');

  detailTitle.textContent = items[index].title;
  detailBody.textContent  = items[index].content;

  copyBtn.classList.remove('copied');
  copyBtn.disabled = false;
  copyBtn.innerHTML = '📋 Copy';

  closeSidebar();
}

// ==================================================
//  COPY
// ==================================================
copyBtn.addEventListener('click', () => {
  if (activeIndex < 0) return;
  const text = items[activeIndex].content;
  if (!text) return;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => copied(), () => fallbackCopy(text));
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

// ==================================================
//  TOAST
// ==================================================
function toastMsg(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.remove('show'); toast.classList.add('hidden'); }, 2000);
}

// ==================================================
//  ERROR STATE
// ==================================================
function showError(msg) {
  clearSkeletons();
  sidebar.classList.add('hidden');
  welcome.classList.add('hidden');
  detail.classList.add('hidden');
  errorBox.classList.remove('hidden');
  errorMsg.textContent = msg || 'Could not fetch data.';
}

retryBtn.addEventListener('click', () => {
  errorBox.classList.add('hidden');
  renderSkeletons();
  sidebar.classList.remove('hidden');
  fetchSheetData();
});

// ==================================================
//  MOBILE SIDEBAR
// ==================================================
function openSidebar()  { sidebar.classList.add('open'); overlay.classList.remove('hidden'); menuToggle.classList.add('open'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.add('hidden'); menuToggle.classList.remove('open'); }

menuToggle.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
overlay.addEventListener('click', closeSidebar);

// ==================================================
//  KEYBOARD NAVIGATION
// ==================================================
document.addEventListener('keydown', (e) => {
  if (sidebar.classList.contains('open') && e.key === 'Escape') return closeSidebar();
  if (e.key === 'ArrowDown') { e.preventDefault(); navBy(1); }
  if (e.key === 'ArrowUp')   { e.preventDefault(); navBy(-1); }
});

function navBy(dir) {
  const btns = sidebarNav.querySelectorAll('.nav-item');
  if (!btns.length) return;
  let next = activeIndex + dir;
  if (next < 0) next = btns.length - 1;
  if (next >= btns.length) next = 0;
  btns[next].focus();
  selectItem(next);
}

// ==================================================
//  SPARKLES (lightweight)
// ==================================================
function createSparkles() {
  const chars  = ['✦','✧','⋆','☆','｡','❀'];
  const colors = ['#FFB6C1','#FFD700','#FFB6E1','#FF9EBB','#DDA0DD','#87CEEB'];
  const parent = $('sparkles');
  const frag   = new DocumentFragment();
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('span');
    s.className = 's-dot';
    s.textContent = chars[i % chars.length];
    s.style.left   = ((i * 17 + 3) % 100) + '%';
    s.style.top    = ((i * 23 + 7) % 100) + '%';
    s.style.color  = colors[i % colors.length];
    s.style.fontSize        = (10 + (i % 10)) + 'px';
    s.style.animationDuration = (5 + (i % 4)) + 's';
    s.style.animationDelay    = (i * 0.6) + 's';
    frag.appendChild(s);
  }
  parent.appendChild(frag);
}

// ==================================================
//  UTIL
// ==================================================
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
