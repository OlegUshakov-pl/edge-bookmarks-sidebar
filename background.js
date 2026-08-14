// ===== Background: bookmarks cache + message hub + panel/rail toggle =====
// Content scripts use chrome.bookmarks via messages; side panel uses it directly.

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
  cache = flatten(tree).reverse();
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

function isInternalPage(url) {
  return !url || /^(chrome|edge|about|brave):/i.test(url);
}

// Toolbar icon click:
// - on regular pages  → toggle the in-page rail (content script)
// - on edge:// / newtab → open the side panel (works everywhere)
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  if (isInternalPage(tab.url)) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (_) {
      try {
        await chrome.sidePanel.open({ tabId: tab.id });
      } catch (_) {}
    }
    return;
  }
  // Regular page: toggle the rail
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'toggle' });
  } catch (_) {
    try {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    } catch (_) {}
  }
});

// Message handler for content scripts
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
  return true;
});

// Keep service worker alive while a content script port is open
chrome.runtime.onConnect.addListener(() => {});

// Live sync across all tabs when bookmarks change
chrome.bookmarks.onCreated.addListener(refreshAndBroadcast);
chrome.bookmarks.onRemoved.addListener(refreshAndBroadcast);
chrome.bookmarks.onChanged.addListener(refreshAndBroadcast);
chrome.bookmarks.onMoved.addListener(refreshAndBroadcast);