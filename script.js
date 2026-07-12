/* ======================================================
   CUTIE MENU ✨ — Sidebar + Content + Search + Cache
   ====================================================== */

const SHEET_ID  = '1U5KtFNN3SPcCygk4joTvCfpeA8SCgBaVE9mSjvR9rvM';
const SHEET_GID = 0;
const CSV_URL   = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const CACHE_KEY = 'cutiemenu_sidebar_v4';
const CACHE_TTL = 5 * 60 * 1000;
const SKELETONS = 7;

const $ = id => document.getElementById(id);

// DOM
const sidebar     = $('sidebar');
const sidebarNav  = $('sidebarNav');
const searchInput = $('searchInput');
const searchClear = $('searchClear');
const errorBox    = $('errorBox');
const errorMsg    = $('errorMsg');
const retryBtn    = $('retryBtn');
const detailEmpty = $('detailEmpty');
const detailCard  = $('detailCard');
const detailTitle = $('detailTitle');
const detailBody  = $('detailBody');
const copyBtn     = $('copyBtn');
const toast       = $('toast');
const menuToggle  = $('menuToggle');
const mOverlay    = $('mOverlay');

let items        = [];
let filteredIdxs = [];
let activeIndex  = -1;
let toastTimer   = null;
let searchTimer  = null;

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  createSparkles();
  renderSkeletons();

  const c = readCache();
  if (c) { items = c; renderNav(); return; }
  fetchData();
});

// ===================== CACHE =====================
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data;
  } catch {}
  return null;
}
function writeCache(d) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: d })); } catch {}
}

// ===================== SKELETONS =====================
function renderSkeletons() {
  let h = '';
  for (let i = 0; i < SKELETONS; i++) {
    h += `<div class="skel-nav"><span class="skel-bar skel-bullet"></span><span class="skel-bar skel-text" style="width:${48 + (i * 7) % 45}%"></span></div>`;
  }
  sidebarNav.innerHTML = h;
}

// ===================== FETCH =====================
async function fetchData() {
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = parseCSV(await res.text());
    const data = rows.slice(1);
    if (!data.length) return showError('No data found.');

    items = [];
    for (const row of data) {
      if (row.length < 2) continue;
      const t = (row[0] || '').trim();
      const c = (row[1] || '').trim();
      if (t || c) items.push({ title: t, content: c });
    }
    if (!items.length) return showError('No items found.');

    writeCache(items);
    renderNav();
  } catch (e) {
    console.error(e);
    showError(e.message || 'Could not fetch data.');
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

// ===================== RENDER NAV =====================
function renderNav(filter) {
  const query = (filter || '').toLowerCase().trim();
  filteredIdxs = [];

  let h = '';
  items.forEach((item, i) => {
    if (query && !item.title.toLowerCase().includes(query) && !item.content.toLowerCase().includes(query)) {
      return;
    }
    filteredIdxs.push(i);
    h += `<button class="nav-item" data-idx="${i}">${escHtml(item.title)}</button>`;
  });

  if (!h) {
    h = '<div style="padding:24px 18px;text-align:center;color:var(--tx-fade);font-size:.85rem;font-weight:600">No results found ~</div>';
  }

  sidebarNav.innerHTML = h;

  sidebarNav.onclick = e => {
    const btn = e.target.closest('.nav-item');
    if (!btn) return;
    selectItem(+btn.dataset.idx);
  };
}

// ===================== SELECT =====================
function selectItem(index) {
  if (index < 0 || index >= items.length) return;
  activeIndex = index;

  sidebarNav.querySelectorAll('.nav-item').forEach((b, i) => b.classList.toggle('active', i === index));

  detailEmpty.classList.add('hidden');
  detailCard.classList.remove('hidden');
  errorBox.classList.add('hidden');

  detailTitle.textContent = items[index].title;
  detailBody.textContent  = items[index].content;

  copyBtn.classList.remove('copied');
  copyBtn.disabled = false;
  copyBtn.innerHTML = '📋 Copy';

  if (window.innerWidth <= 800) closeMobileSidebar();
}

// ===================== SEARCH =====================
searchInput.addEventListener('input', () => {
  const val = searchInput.value;
  searchClear.classList.toggle('visible', val.length > 0);

  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { renderNav(val); }, 150);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  renderNav('');
  searchInput.focus();
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
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); copied(); } catch { toastMsg('❌ Copy failed'); }
  ta.remove();
}

function copied() {
  copyBtn.classList.add('copied');
  copyBtn.disabled = true;
  copyBtn.innerHTML = '✅ Copied!';
  toastMsg('✅ Copied!');
  setTimeout(() => { copyBtn.classList.remove('copied'); copyBtn.disabled = false; copyBtn.innerHTML = '📋 Copy'; }, 1800);
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
  sidebarNav.innerHTML = '';
  errorBox.classList.remove('hidden');
  errorMsg.textContent = msg || 'Could not fetch data.';
}

retryBtn.addEventListener('click', () => {
  errorBox.classList.add('hidden');
  renderSkeletons();
  fetchData();
});

// ===================== MOBILE TOGGLE =====================
function openMobileSidebar()  {
  sidebar.classList.add('open'); mOverlay.classList.remove('hidden'); menuToggle.classList.add('open');
  setTimeout(() => searchInput.focus(), 350);
}
function closeMobileSidebar() { sidebar.classList.remove('open'); mOverlay.classList.add('hidden'); menuToggle.classList.remove('open'); }

menuToggle.addEventListener('click', () => sidebar.classList.contains('open') ? closeMobileSidebar() : openMobileSidebar());
mOverlay.addEventListener('click', closeMobileSidebar);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sidebar.classList.contains('open')) closeMobileSidebar();
  // don't let Escape close when typing in search
  if (e.key === 'Escape' && document.activeElement === searchInput) return;
});

// ===================== KEYBOARD ARROW NAV =====================
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); navBy(1); }
  if (e.key === 'ArrowUp')   { e.preventDefault(); navBy(-1); }
});

function navBy(dir) {
  if (!filteredIdxs.length) return;
  const btns = sidebarNav.querySelectorAll('.nav-item');
  if (!btns.length) return;

  let pos = filteredIdxs.indexOf(activeIndex);
  if (pos === -1) pos = 0;
  else {
    pos += dir;
    if (pos < 0) pos = filteredIdxs.length - 1;
    if (pos >= filteredIdxs.length) pos = 0;
  }
  const nextIdx = filteredIdxs[pos];
  btns[pos].focus();
  selectItem(nextIdx);
}

// ===================== SPARKLES =====================
function createSparkles() {
  const chars  = ['✦','✧','⋆','☆','｡','❀'];
  const colors = ['#FFB6C1','#FFD700','#FFB6E1','#FF9EBB','#DDA0DD','#87CEEB'];
  const p = $('sparkles'), f = new DocumentFragment();
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('span');
    Object.assign(s, { className: 's-dot', textContent: chars[i % chars.length] });
    s.style.cssText = `left:${(i*19+5)%100}%;top:${(i*27+3)%100}%;color:${colors[i%colors.length]};font-size:${10+(i%8)}px;animation-duration:${5+(i%3)}s;animation-delay:${i*0.7}s`;
    f.appendChild(s);
  }
  p.appendChild(f);
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
