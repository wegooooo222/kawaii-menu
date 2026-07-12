# Cutie Menu ✨ — Kawaii Google Sheets Card Viewer

A pretty pink pastel single-page website that fetches data from a public Google Sheet and displays each row as a cute card. Every card has a **Copy** button to grab Column B content.

## Features

- 🎀 Fetches Google Sheet data via public CSV export
- 💳 Renders each row (Column A = title, Column B = content) as individual cards
- 📋 One-click copy of card content to clipboard
- ✅ "Copied!" toast notification
- 💗 Fully responsive (mobile to desktop)
- ✨ Animated kawaii girl SVG illustration in header
- 🌸 Floating sparkles background
- 🚦 Loading / Error / Empty states all handled

## How to Run

Just open `index.html` in any web browser — no build tools needed.

```bash
# From the project directory
open index.html
# or just double-click the file
```

## How to Change the Google Sheet

Open `script.js` and find these two lines near the top:

```js
const SHEET_ID = '1U5KtFNN3SPcCygk4joTvCfpeA8SCgBaVE9mSjvR9rvM';
const SHEET_GID = 0;
```

1. **Replace `SHEET_ID`** — the long string from your sheet URL:  
   `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
2. **Change `SHEET_GID`** — tab ID (0 = first sheet, check the URL `#gid=...` for others)
3. **Make sure the sheet is public**:  
   *File → Share → "Anyone with the link" → "Viewer"*

## Column Format

| Column A | Column B |
|----------|----------|
| Card title / menu name | Card content / answer text |

Row 1 is treated as **header** and skipped. Data starts from row 2.

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | HTML structure & kawaii SVG illustration |
| `style.css` | All styles: pink pastel theme, animations, responsive layout |
| `script.js` | Data fetching, CSV parsing, card rendering, clipboard copy, sparkles |

## Customization Tips

- **Change colors**: Edit the `background` and color values in `style.css` (look for `#FF`, `#ff`, pink shades)
- **Change title**: Edit the `<h1>` text in `index.html`
- **Change subtitle**: Edit the `<p class="site-subtitle">` in `index.html`
- **Replace the girl illustration**: Swap the `<svg>` content in `index.html` inside `.cute-girl-illustration`

## Quality & States

- ✅ Desktop & Mobile responsive
- ✅ Loading state (bouncing hearts animation)
- ✅ Error state (with retry button)
- ✅ Empty state (when sheet has no data)
- ✅ Copy success state (button + toast)
- ✅ Copy disabled state (during cooldown)
- ✅ Card hover effects
- ✅ Card entrance animations (staggered)
- ✅ Button focus-visible for keyboard accessibility
