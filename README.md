# Simple Bookmarks Sidebar

A minimal bookmarks **side panel** for Microsoft Edge / Chrome (Manifest V3) that opens when you click the extension icon.

## How it works

- Clicking the toolbar icon opens a native side panel (`sidepanel.html`) via `chrome.sidePanel.open({ windowId })`.
- Because the panel is bound to the **window** (not a tab's content), it works on **every** tab type — including `edge://newtab`, `edge://settings`, `chrome://`, and blank pages, where content scripts are forbidden.
- The panel is an extension page, so it uses the `chrome.bookmarks` and `chrome.tabs` APIs directly.

## Features

- **Latest bookmarks list** — all bookmarks flattened into one list, newest first.
- **Add current page** — `+` button at the top of the panel.
- **Manual add** — `Add bookmark` button at the bottom with a title/URL form.
- **Context menu (right-click)** — edit or delete a bookmark.
- **Drag & drop reordering** — reorder bookmarks within their own folder.
- **Automatic icons** — popular sites use Font Awesome brand icons; everything else uses the site favicon from Google S2.
- **Live sync** — the panel updates automatically when bookmarks change.

## Project structure

```
├── manifest.json     # Extension manifest (MV3): sidePanel permission + side_panel path
├── background.js     # Service worker: opens the side panel on action click
├── sidepanel.html    # Side panel markup
├── sidepanel.js      # Side panel logic (list, add, edit, drag & drop)
├── sidepanel.css     # Side panel styles
└── icons/            # Extension icons (16, 32, 48, 128)
```

## Installation

1. Open `edge://extensions` (or `chrome://extensions`) in the browser.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Pin the extension and click its icon — the side panel opens on any page.

## Notes

- The old in-page rail (`content.js` / `content.css`) was replaced by the native side panel so the extension also works on `edge://` and blank tabs.
- Font Awesome and favicons are loaded from CDN, so an internet connection is required for icons.
- Reordering is constrained to a bookmark's own folder so folder structure is preserved.