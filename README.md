# Simple Bookmarks Sidebar

A minimal bookmarks rail for Microsoft Edge / Chrome (Manifest V3) that lives **directly on the page** — not in the browser's side panel. This gives full control over the width (a thin ~46px icon strip by default) and removes the native side-panel header.

## How it works

- A **content script** (`content.js` + `content.css`) injects a fixed rail on the right edge of every page.
- All `chrome.bookmarks` access happens in the **background service worker** (`background.js`). The content script talks to it via `chrome.runtime` messaging and cannot call `chrome.bookmarks` directly.
- Clicking the toolbar icon toggles the rail's visibility. The rail is shown by default on every page it's injected into.

## Features

- **Collapsed mode** — a narrow strip with bookmark icons (latest 25).
- **Expanded mode** — a list of bookmarks with titles, supports drag & drop reordering (toggle via the arrow button).
- **Add current tab** — one-click `+` button at the top of the rail.
- **Manual add** — `+` button at the bottom of the list with a form for title and URL.
- **Context menu (right-click)** — edit or delete a bookmark.
- **Automatic icons** — popular sites use Font Awesome brand icons; everything else uses the site favicon from Google S2.
- **Live sync** — the rail updates across all open tabs when bookmarks change.

## Project structure

```
├── manifest.json      # Extension manifest (MV3) with content_scripts
├── background.js      # Service worker: owns chrome.bookmarks, messaging, broadcast
├── content.js         # Rail logic (render, add, edit, drag & drop) on the page
├── content.css        # Rail styles (scoped under #ebm-rail)
└── icons/             # Extension icons (16, 32, 48, 128)
```

## Installation

1. Open `edge://extensions` (or `chrome://extensions`) in the browser.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Pin the extension and click its icon to toggle the bookmarks rail.

## Notes

- Bookmarks are read from the whole tree and flattened into a single list (latest first).
- Drag & drop sorting moves bookmarks into the "Other bookmarks" section (`parentId: 2`) so folder structure is not broken.
- Font Awesome and favicons are loaded from CDN, so an internet connection is required for icons.
- The rail is injected via `<all_urls>`, so it does not appear on browser internal pages (e.g. `edge://newtab`, `chrome://`).
