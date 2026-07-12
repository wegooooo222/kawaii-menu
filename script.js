/* ======================================================
   CUTIE MENU ✨ - Kawaii Google Sheets Fetcher
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
const cardsGrid = document.getElementById('cardsGrid');
const loadingContainer = document.getElementById('loadingContainer');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const emptyContainer = document.getElementById('emptyContainer');
const toast = document.getElementById('toast');

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

    const items = [];
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

    renderCards(items);
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
        i++; // skip escaped quote
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
        // skip carriage return
      } else {
        currentField += char;
      }
    }
  }

  // Last field/row
  if (currentField || inQuotes) {
    currentRow.push(currentField);
  }
  if (currentRow.length > 0 && currentRow.some(f => f.trim() !== '')) {
    rows.push(currentRow);
  }

  return rows;
}

/* ---- Render cards ---- */
function renderCards(items) {
  hideAllStates();
  cardsGrid.classList.remove('hidden');
  cardsGrid.innerHTML = '';

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const card = document.createElement('div');
    card.className = 'card';
    card.style.setProperty('--card-index', i);

    const titleEl = document.createElement('h3');
    titleEl.className = 'card-title';
    titleEl.textContent = item.title;

    const contentEl = document.createElement('div');
    contentEl.className = 'card-content';
    contentEl.textContent = item.content;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = ' Copy';
    copyBtn.setAttribute('aria-label', `Copy content from "${item.title}"`);
    copyBtn.dataset.content = item.content;

    copyBtn.addEventListener('click', function() {
      copyToClipboard(this);
    });

    card.appendChild(titleEl);
    card.appendChild(contentEl);
    card.appendChild(copyBtn);
    cardsGrid.appendChild(card);
  }
}

/* ---- Copy to clipboard ---- */
function copyToClipboard(btn) {
  const text = btn.dataset.content;

  if (!text) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      onCopySuccess(btn);
    }).catch(() => {
      fallbackCopy(text, btn);
    });
  } else {
    fallbackCopy(text, btn);
  }
}

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

  // Reset button after 2s
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

  // Auto-hide after 2s
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
  cardsGrid.classList.add('hidden');
}

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
