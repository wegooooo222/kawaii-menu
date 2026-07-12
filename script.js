/* ======================================================
   CUTIE MENU ✨ - Kawaii Google Sheets Sidebar Fetcher
   ======================================================
   INSTRUCTIONS TO CHANGE THE GOOGLE SHEET:
   -------------------------------------------------------
   1. Set your Google Sheet to "Anyone with the link can view"
   2. Replace SHEET_ID below with your sheet's ID
      (found in the URL: /d/{SHEET_ID}/edit)
   3. Change SHEET_GID if you want a different tab (default = 0)
   4. That's it! The CSV export URL works for public sheets.
   ====================================================== */

// ===== ✏️ EDIT THIS SECTION ===== //

/** Your Google Sheet ID (from the URL) */
const SHEET_ID = '1U5KtFNN3SPcCygk4joTvCfpeA8SCgBaVE9mSjvR9rvM';

/** Sheet tab GID (0 = first sheet, 123456789 = other tabs) */
const SHEET_GID = 0;

// ================================= //

/** CSV export URL */
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

/* ---- DOM references ---- */
const sidebar = document.getElementById('sidebar');
const sidebarNav = document.getElementById('sidebarNav');
const contentPanel = document.getElementById('contentPanel');
const contentWelcome = document.getElementById('contentWelcome');
const contentDetail = document.getElementById('contentDetail');
const detailTitle = document.getElementById('detailTitle');
const detailBody = document.getElementById('detailBody');
const detailCopyBtn = document.getElementById('detailCopyBtn');
const loadingContainer = document.getElementById('loadingContainer');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const emptyContainer = document.getElementById('emptyContainer');
const toast = document.getElementById('toast');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');

let items = [];
let activeIndex = -1;
let toastTimer = null;

/* ---- Fetch & render ---- */
async function fetchSheetData() {
  showLoading();

  try {
    const response = await fetch(CSV_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);
    const dataRows = rows.slice(1); // skip header row

    if (dataRows.length === 0) {
      showEmpty();
      return;
    }

    items = [];
    for (const row of dataRows) {
      if (row.length >= 2) {
        const title = (row[0] || '').trim();
        const content = (row[1] || '').trim();
        if (title || content) {
          items.push({ title, content });
        }
      }
    }

    if (items.length === 0) {
      showEmpty();
      return;
    }

    renderSidebar(items);
  } catch (err) {
    console.error('Fetch error:', err);
    showError(err.message || 'Could not fetch data from the sheet.');
  }
}

/* ---- CSV Parser (handles quoted fields with commas & newlines) ---- */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1] || '';

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 0 && currentRow.some(f => f.trim() !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (char === '\r') {
        // skip
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || inQuotes) {
    currentRow.push(currentField);
  }
  if (currentRow.length > 0 && currentRow.some(f => f.trim() !== '')) {
    rows.push(currentRow);
  }

  return rows;
}

/* ---- Render sidebar items ---- */
function renderSidebar(items) {
  hideAllStates();
  sidebar.classList.remove('hidden');
  contentPanel.classList.remove('hidden');
  sidebarNav.innerHTML = '';

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const btn = document.createElement('button');
    btn.className = 'sidebar-item';
    btn.textContent = item.title;
    btn.addEventListener('click', () => selectItem(i));
    sidebarNav.appendChild(btn);
  }
}

/* ---- Select sidebar item ---- */
function selectItem(index) {
  activeIndex = index;
  const item = items[index];

  // Update sidebar active state
  const allBtns = sidebarNav.querySelectorAll('.sidebar-item');
  allBtns.forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });

  // Show content detail
  contentWelcome.classList.add('hidden');
  contentDetail.classList.remove('hidden');
  detailTitle.textContent = item.title;
  detailBody.textContent = item.content;

  // Reset copy button
  detailCopyBtn.classList.remove('copied');
  detailCopyBtn.disabled = false;
  detailCopyBtn.textContent = ' Copy';

  // Close mobile sidebar after selection
  closeSidebar();
}

/* ---- Copy to clipboard ---- */
detailCopyBtn.addEventListener('click', () => {
  if (activeIndex < 0 || activeIndex >= items.length) return;

  const text = items[activeIndex].content;
  if (!text) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      onCopySuccess(detailCopyBtn);
    }).catch(() => {
      fallbackCopy(text, detailCopyBtn);
    });
  } else {
    fallbackCopy(text, detailCopyBtn);
  }
});

/* ---- Fallback copy using textarea ---- */
function fallbackCopy(text, btn) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    onCopySuccess(btn);
  } catch (err) {
    console.error('Fallback copy failed:', err);
    showToast('❌ Copy failed!');
  }
  document.body.removeChild(textarea);
}

/* ---- Copy success handler ---- */
function onCopySuccess(btn) {
  btn.classList.add('copied');
  btn.disabled = true;
  btn.textContent = ' Copied!';
  showToast('✅ Copied!');

  setTimeout(() => {
    btn.classList.remove('copied');
    btn.disabled = false;
    btn.textContent = ' Copy';
  }, 2000);
}

/* ---- Toast notification ---- */
function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden', 'fade-out');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hidden');
  }, 2000);
}

/* ---- State helpers ---- */
function showLoading() {
  hideAllStates();
  loadingContainer.classList.remove('hidden');
}

function showError(msg) {
  hideAllStates();
  errorContainer.classList.remove('hidden');
  errorMessage.textContent = msg || 'Something went wrong while fetching data.';
}

function showEmpty() {
  hideAllStates();
  emptyContainer.classList.remove('hidden');
}

function hideAllStates() {
  loadingContainer.classList.add('hidden');
  errorContainer.classList.add('hidden');
  emptyContainer.classList.add('hidden');
  sidebar.classList.add('hidden');
  contentPanel.classList.add('hidden');
}

/* ---- Sidebar mobile toggle ---- */
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.remove('hidden');
  sidebarToggle.classList.add('active');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.add('hidden');
  sidebarToggle.classList.remove('active');
}

sidebarToggle.addEventListener('click', () => {
  if (sidebar.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarOverlay.addEventListener('click', closeSidebar);

// Close sidebar on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sidebar.classList.contains('open')) {
    closeSidebar();
  }
});

/* ---- Retry button ---- */
retryBtn.addEventListener('click', () => {
  fetchSheetData();
});

/* ---- Init: fetch on page load ---- */
document.addEventListener('DOMContentLoaded', () => {
  fetchSheetData();
  createSparkles();
});

/* ---- Sparkles background ---- */
function createSparkles() {
  const container = document.getElementById('sparkles');
  const sparkleChars = ['✦', '✧', '⋆', '☆', '·', '｡', '⁕', '❀'];
  const colors = ['#FFB6C1', '#FFD700', '#FFB6E1', '#FF9EBB', '#DDA0DD', '#87CEEB'];

  for (let i = 0; i < 30; i++) {
    const sparkle = document.createElement('span');
    sparkle.className = 'sparkle-dot';
    sparkle.textContent = sparkleChars[Math.floor(Math.random() * sparkleChars.length)];
    sparkle.style.left = Math.random() * 100 + '%';
    sparkle.style.top = Math.random() * 100 + '%';
    sparkle.style.fontSize = (10 + Math.random() * 14) + 'px';
    sparkle.style.color = colors[Math.floor(Math.random() * colors.length)];
    sparkle.style.animationDuration = (4 + Math.random() * 6) + 's';
    sparkle.style.animationDelay = (Math.random() * 5) + 's';
    container.appendChild(sparkle);
  }
}
