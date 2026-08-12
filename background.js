// ===== Background: owns all chrome.bookmarks access =====
// Content scripts cannot use chrome.bookmarks directly, so they message us.

let cache = null;

function flatten(nodes, result = []) {
  for (const node of nodes) {
    if (node.url) result.push(node);
    if (node.children) flatten(node.children, result);
  }
  return result;
}

async function buildCache() {
  const tree = await chrome.bookmarks.getTree();
  cache = flatten(tree).reverse(); // latest first
  return cache;
}

async function getBookmarks() {
  if (!cache) await buildCache();
  return cache;
}

async function refreshAndBroadcast() {
  await buildCache();
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type: 'bookmarksChanged', bookmarks: cache })
      .catch(() => {});
  }
}

// Toolbar icon click toggles the rail in the active tab.
// If the content script isn't there yet (e.g. tab opened before the
// extension loaded), inject it on the fly so the click still works.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'toggle' });
  } catch (e) {
    try {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      // Freshly injected rail is visible by default — nothing else to do.
    } catch (_) {}
  }
});

async function handle(msg) {
  switch (msg.type) {
    case 'getBookmarks':
      return await getBookmarks();

    case 'addCurrent':
    case 'addManual':
      await chrome.bookmarks.create({ title: msg.title, url: msg.url });
      await refreshAndBroadcast();
      return { ok: true };

    case 'update':
      await chrome.bookmarks.update(msg.id, { title: msg.title, url: msg.url });
      await refreshAndBroadcast();
      return { ok: true };

    case 'remove':
      await chrome.bookmarks.remove(msg.id);
      await refreshAndBroadcast();
      return { ok: true };

    case 'move':
      try {
        await chrome.bookmarks.move(msg.id, { parentId: '2', index: msg.index });
      } catch (e) {
        try {
          await chrome.bookmarks.move(msg.id, { index: msg.index });
        } catch (_) {}
      }
      await refreshAndBroadcast();
      return { ok: true };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg).then(sendResponse).catch((e) => sendResponse({ error: String(e) }));
  return true; // keep channel open for async response
});

// A content script opens a port to keep this service worker alive while the
// page (and its rail) is open.
chrome.runtime.onConnect.addListener(() => {});

chrome.bookmarks.onCreated.addListener(refreshAndBroadcast);
chrome.bookmarks.onRemoved.addListener(refreshAndBroadcast);
chrome.bookmarks.onChanged.addListener(refreshAndBroadcast);
chrome.bookmarks.onMoved.addListener(refreshAndBroadcast);
