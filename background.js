// ===== Background: open the side panel on action click =====
// Uses windowId (not tabId) so the panel opens even on edge://newtab,
// edge://settings and blank pages, where content scripts are forbidden.

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (e) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (_) {
      const win = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: win.id });
    }
  }
});