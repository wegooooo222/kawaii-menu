/* ======================================================
   CUTIE MENU ✨ - Kawaii Google Sheets Sidebar Fetcher
   ====================================================== */

// ===== ✏️ CONFIG ===== //

const SHEET_ID  = '1U5KtFNN3SPcCygk4joTvCfpeA8SCgBaVE9mSjvR9rvM';
const SHEET_GID = 0;
const CSV_URL   = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const STAGGER_MS_PER_ITEM  = 40;   // delay between each sidebar item entrance
const COPY_COOLDOWN_MS     = 2000;  // copy button reset time
const TOAST_DURATION_MS    = 2000;  // toast auto-hide time
const SPARKLE_COUNT        = 30;    // floating sparkles

/* ---- DOM refs ---- */
const $ = (id) => document.getElementById(id);

const sidebar       = $('sidebar');
const sidebarNav    = $('sidebarNav');
const contentPanel  = $('contentPanel');
const contentWelcome = $('contentWelcome');
const contentDetail  = $('contentDetail');
const detailTitle    = $('detailTitle');
const detailBody     = $('detailBody');
const detailCopyBtn  = $('detailCopyBtn');
const loadingCont    = $('loadingContainer');
const errorCont      = $('errorContainer');
const errorMsg       = $('errorMessage');
const retryBtn       = $('retryBtn');
const emptyCont      = $('emptyContainer');
const toast          = $('toast');
const sidebarToggle  = $('sidebarToggle');
const sidebarOverlay = $('sidebarOverlay');

/* ---- State ---- */
let items       = [];
let activeIndex = -1;
let toastTimer  = null;

/* ======================================================
   FETCH & PARSE
   ====================================================== */

async function fetchSheetData() {
  showLoading();
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const rows  = parseCSV(await res.text());
    const data  = rows.slice(1); // skip header
    if (!data.length) return showEmpty();

    items = [];
    for (const row of data) {
      if (row.length < 2) continue;
      const title   = (row[0] || '').trim();
      const content = (row[1] || '').trim();
      if (title || content) items.push({ title, content });
    }
    if (!items.length) return showEmpty();

    renderSidebar(items);
  } catch (err) {
    console.error('Fetch error:', err);
    showError(err.message || 'Could not fetch data from the sheet.');
  }
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1] || '';
    if (inQ) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',')  { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); field = ''; if (row.some(f => f.trim())) rows.push(row); row = []; }
      else if (c !== '\r') { field += c; }
    }
  }
  if (field || inQ) row.push(field);
  if (row.some(f => f.trim())) rows.push(row);
  return rows;
}

/* ======================================================
   RENDER SIDEBAR
   ====================================================== */

function renderSidebar(items) {
  hideAllStates();
  sidebar.classList.remove('hidden');
  contentPanel.classList.remove('hidden');
  sidebarNav.innerHTML = '';

  items.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.className  = 'sidebar-item';
    btn.textContent = item.title;
    btn.tabIndex   = 0;
    btn.style.setProperty('--item-delay', `${i * STAGGER_MS_PER_ITEM}ms`);
    btn.addEventListener('click', () => selectItem(i));
    sidebarNav.appendChild(btn);
  });
}

/* ======================================================
   SELECTION
   ====================================================== */

function selectItem(index) {
  if (index < 0 || index >= items.length) return;
  activeIndex = index;
  const item   = items[index];

  // highlight active
  sidebarNav.querySelectorAll('.sidebar-item').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });

  // show detail
  contentWelcome.classList.add('hidden');
  contentDetail.classList.remove('hidden');
  detailTitle.textContent = item.title;
  detailBody.textContent  = item.content;

  // reset copy btn
  detailCopyBtn.classList.remove('copied');
  detailCopyBtn.disabled = false;
  detailCopyBtn.textContent = ' Copy';

  closeSidebar();
}

function navigateByKey(direction) {
  const btns = sidebarNav.querySelectorAll('.sidebar-item');
  if (!btns.length) return;
  const max = btns.length - 1;
  let next  = activeIndex + direction;
  if (next < 0) next = max;
  if (next > max) next = 0;
  btns[next].focus();
  selectItem(next);
}

/* ======================================================
   CLIPBOARD
   ====================================================== */

detailCopyBtn.addEventListener('click', () => {
  if (activeIndex < 0 || activeIndex >= items.length) return;
  const text = items[activeIndex].content;
  if (!text) return;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => onCopySuccess(detailCopyBtn)).catch(() => fallbackCopy(text, detailCopyBtn));
  } else {
    fallbackCopy(text, detailCopyBtn);
  }
});

function fallbackCopy(text, btn) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); onCopySuccess(btn); }
  catch { showToast('❌ Copy failed!'); }
  document.body.removeChild(ta);
}

function onCopySuccess(btn) {
  btn.classList.add('copied');
  btn.disabled = true;
  btn.textContent = ' Copied!';
  showToast('✅ Copied!');
  setTimeout(() => {
    btn.classList.remove('copied');
    btn.disabled = false;
    btn.textContent = ' Copy';
  }, COPY_COOLDOWN_MS);
}

/* ======================================================
   TOAST
   ====================================================== */

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  // force reflow so transition works on repeated calls
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hidden');
  }, TOAST_DURATION_MS);
}

/* ======================================================
   STATE TRANSITIONS
   ====================================================== */

function showLoading()  { hideAllStates(); loadingCont.classList.remove('hidden'); }
function showEmpty()    { hideAllStates(); emptyCont.classList.remove('hidden'); }

function showError(msg) {
  hideAllStates();
  errorCont.classList.remove('hidden');
  errorMsg.textContent = msg || 'Something went wrong while fetching data.';
}

function hideAllStates() {
  for (const el of [loadingCont, errorCont, emptyCont, sidebar, contentPanel]) {
    el.classList.add('hidden');
  }
}

/* ======================================================
   MOBILE SIDEBAR TOGGLE
   ====================================================== */

function openSidebar()  { sidebar.classList.add('open'); sidebarOverlay.classList.remove('hidden'); sidebarToggle.classList.add('active'); }
function closeSidebar() { sidebar.classList.remove('open'); sidebarOverlay.classList.add('hidden'); sidebarToggle.classList.remove('active'); }

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});
sidebarOverlay.addEventListener('click', closeSidebar);

/* ======================================================
   KEYBOARD SHORTCUTS
   ====================================================== */

document.addEventListener('keydown', (e) => {
  if (sidebar.classList.contains('open') && e.key === 'Escape') {
    return closeSidebar();
  }
  // Arrow keys navigate sidebar items
  if (e.key === 'ArrowDown') { e.preventDefault(); navigateByKey(1); }
  if (e.key === 'ArrowUp')   { e.preventDefault(); navigateByKey(-1); }
});

/* ======================================================
   INIT
   ====================================================== */

retryBtn.addEventListener('click', fetchSheetData);

document.addEventListener('DOMContentLoaded', () => {
  fetchSheetData();
  createSparkles();
});

/* ======================================================
   SPARKLES BACKGROUND
   ====================================================== */

function createSparkles() {
  const chars  = ['✦','✧','⋆','☆','·','｡','⁕','❀'];
  const colors = ['#FFB6C1','#FFD700','#FFB6E1','#FF9EBB','#DDA0DD','#87CEEB'];
  const parent = $('sparkles');
  let frag = document.createDocumentFragment();

  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const s = document.createElement('span');
    s.className = 'sparkle-dot';
    s.textContent = chars[Math.floor(Math.random() * chars.length)];
    s.style.left   = Math.random() * 100 + '%';
    s.style.top    = Math.random() * 100 + '%';
    s.style.fontSize        = (10 + Math.random() * 14) + 'px';
    s.style.color           = colors[Math.floor(Math.random() * colors.length)];
    s.style.animationDuration = (4 + Math.random() * 6) + 's';
    s.style.animationDelay    = (Math.random() * 5) + 's';
    frag.appendChild(s);
  }
  parent.appendChild(frag);
}
