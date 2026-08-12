# Simple Bookmarks Sidebar

A minimal bookmarks sidebar extension for Microsoft Edge (Manifest V3).

## Features

- **Collapsed mode** — a narrow strip with bookmark icons (latest 25).
- **Expanded mode** — a list of bookmarks with titles, supports drag & drop reordering.
- **Add current tab** — one-click `+` button at the top of the panel.
- **Manual add** — `+` button at the bottom of the list with a form for title and URL.
- **Context menu (right-click)** — edit or delete a bookmark.
- **Automatic icons** — recognition of popular sites (social networks, GitHub, Google, etc.) via Font Awesome; for everything else, the site favicon from Google S2.
- **Live sync** — the panel automatically updates when bookmarks change in the browser.

## Project structure

```
├── manifest.json      # Extension manifest (Manifest V3)
├── background.js      # Service worker: open the panel on icon click
├── sidepanel.html     # Sidebar markup and styles
├── sidepanel.js       # Panel logic (render, add, edit, drag & drop)
└── icons/             # Extension icons (16, 32, 48, 128)
```

## Installation

1. Open `edge://extensions` in Microsoft Edge.
2. Enable **Developer mode** in the bottom-left corner.
3. Click **Load unpacked** and select the project folder.
4. Pin the extension to the toolbar and click its icon to open the bookmarks panel.

> The panel is also available via Edge menu → **More tools** → **Show side panel** (while the extension is active).

## Usage

- **Open a bookmark** — click it.
- **Collapse / expand** — the arrow button at the bottom of the panel.
- **Add current page** — the `+` button at the top.
- **Add manually** — the `+` button at the bottom of the list.
- **Edit / delete** — right-click a bookmark.
- **Reorder** — drag and drop bookmarks in the expanded list.

## Dependencies

Loaded via CDN in `sidepanel.html`:

- [Tailwind CSS](https://tailwindcss.com) — utility styles.
- [Font Awesome 6.5.1](https://fontawesome.com) — brand and service icons.

## Extension permissions

| Permission  | Purpose                                            |
|-------------|----------------------------------------------------|
| `sidePanel` | Display the sidebar                                |
| `bookmarks` | Read, create, update, delete bookmarks             |
| `tabs`      | Get the active tab and open links                  |
| `storage`   | Store state (reserved)                             |

## Notes

- Bookmarks are read from the whole tree and flattened into a single list (latest first).
- Drag & drop sorting moves bookmarks into the "Other bookmarks" section (`parentId: 2`) so folder structure is not broken.
- Dependencies (Tailwind, Font Awesome) are loaded from CDN, so an internet connection is required for the panel to work.
