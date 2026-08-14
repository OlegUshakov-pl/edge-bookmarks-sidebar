# Simple Bookmarks Sidebar

A minimal bookmarks sidebar for Microsoft Edge / Chrome (Manifest V3) that works **everywhere** — including `edge://newtab` and empty pages.

## How it works

The extension uses a **hybrid approach**:

| Page type | What opens | How |
|---|---|---|
| Regular pages (`https://...`) | **In-page rail** (46px strip) | Content script (`content.js`) injected on every page |
| `edge://newtab`, `edge://settings`, `about:blank` | **Side panel** | `chrome.sidePanel.open({ windowId })` via toolbar icon |

Clicking the toolbar icon:
- **On a regular page** → toggles the 46px rail on the right edge of the page.
- **On an internal page** → opens the native side panel (browser-controlled width).

When a new tab is opened, `chrome_url_overrides.newtab` replaces Edge's default new tab with the extension's own `newtab.html`, where the content script automatically injects the rail.

## Features

- **Collapsed mode** — a narrow 46px strip with bookmark icons (latest 25).
- **Expanded mode** — a list of bookmarks with titles, supports drag & drop reordering.
- **Add current tab** — one-click `+` button at the top of the rail.
- **Manual add** — `+` button at the bottom of the list with a form for title and URL.
- **Context menu (right-click)** — edit or delete a bookmark.
- **Automatic icons** — popular sites use Font Awesome brand icons; everything else uses the site favicon from Google S2.
- **Live sync** — the rail updates across all open tabs when bookmarks change.
- **Side panel** — opens on internal pages where content scripts can't run.

## Project structure

```
├── manifest.json      # Extension manifest (MV3): permissions, content_scripts, side_panel, newtab override
├── background.js      # Service worker: message hub, bookmarks cache, rail toggle / panel open
├── content.js         # In-page rail logic (render, add, edit, drag & drop)
├── content.css        # In-page rail styles (scoped under #ebm-rail)
├── sidepanel.html     # Side panel markup (for edge:// pages)
├── sidepanel.js       # Side panel logic (uses chrome.bookmarks directly)
├── sidepanel.css      # Side panel styles
├── newtab.html        # Custom new tab page (content script injects rail here)
└── icons/             # Extension icons (16, 32, 48, 128)
```

## Installation

1. Open `edge://extensions` (or `chrome://extensions`) in the browser.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Pin the extension and click its icon to toggle the bookmarks sidebar.

## Notes

- On regular pages the rail is 46px wide and lives on the page; on internal pages the side panel opens (browser-controlled width).
- Font Awesome and favicons are loaded from CDN, so an internet connection is required for icons.
- The rail is injected via `<all_urls>`, so it also appears on the extension's own `newtab.html`.