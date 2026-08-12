const panel = document.getElementById('panel');
const toggleBtn = document.getElementById('toggle-btn');
const toggleIcon = document.getElementById('toggle-icon');
const collapsedIcons = document.getElementById('collapsed-icons');
const listEl = document.getElementById('bookmarks-list');
const addManualBtn = document.getElementById('add-manual-btn');
const addForm = document.getElementById('add-form');
const addTitle = document.getElementById('add-title');
const addUrl = document.getElementById('add-url');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const contextMenu = document.getElementById('context-menu');
const ctxEdit = document.getElementById('ctx-edit');
const ctxDelete = document.getElementById('ctx-delete');
const editModal = document.getElementById('edit-modal');
const editTitle = document.getElementById('edit-title');
const editUrl = document.getElementById('edit-url');
const editSave = document.getElementById('edit-save');
const editCancel = document.getElementById('edit-cancel');

let isExpanded = false;
let bookmarksCache = [];
let contextBookmarkId = null;
let editBookmarkId = null;
let dragSrcEl = null;

// ===== Social media icons (Font Awesome) =====
const SOCIAL_ICONS = [
  { match: /twitter\.com|x\.com/i, icon: 'fa-brands fa-x-twitter', color: '#000' },
  { match: /facebook\.com|fb\.com/i, icon: 'fa-brands fa-facebook', color: '#1877f2' },
  { match: /instagram\.com/i, icon: 'fa-brands fa-instagram', color: '#e4405f' },
  { match: /youtube\.com|youtu\.be/i, icon: 'fa-brands fa-youtube', color: '#ff0000' },
  { match: /github\.com/i, icon: 'fa-brands fa-github', color: '#333' },
  { match: /linkedin\.com/i, icon: 'fa-brands fa-linkedin', color: '#0a66c2' },
  { match: /telegram\.org|t\.me/i, icon: 'fa-brands fa-telegram', color: '#26a5e4' },
  { match: /vk\.com|vkontakte/i, icon: 'fa-brands fa-vk', color: '#0077ff' },
  { match: /reddit\.com/i, icon: 'fa-brands fa-reddit', color: '#ff4500' },
  { match: /discord\.com|discord\.gg/i, icon: 'fa-brands fa-discord', color: '#5865f2' },
  { match: /tiktok\.com/i, icon: 'fa-brands fa-tiktok', color: '#000' },
  { match: /pinterest\.com/i, icon: 'fa-brands fa-pinterest', color: '#e60023' },
  { match: /twitch\.tv/i, icon: 'fa-brands fa-twitch', color: '#9146ff' },
  { match: /whatsapp\.com|wa\.me/i, icon: 'fa-brands fa-whatsapp', color: '#25d366' },
  { match: /spotify\.com/i, icon: 'fa-brands fa-spotify', color: '#1db954' },
  { match: /medium\.com/i, icon: 'fa-brands fa-medium', color: '#000' },
  { match: /stackoverflow\.com/i, icon: 'fa-brands fa-stack-overflow', color: '#f48024' },
  { match: /google\.com/i, icon: 'fa-brands fa-google', color: '#4285f4' },
  { match: /gmail\.com|mail\.google/i, icon: 'fa-solid fa-envelope', color: '#ea4335' },
  { match: /notion\.so/i, icon: 'fa-solid fa-n', color: '#000' },
  { match: /figma\.com/i, icon: 'fa-brands fa-figma', color: '#f24e1e' },
  { match: /dribbble\.com/i, icon: 'fa-brands fa-dribbble', color: '#ea4c89' },
  { match: /behance\.net/i, icon: 'fa-brands fa-behance', color: '#1769ff' },
];

function getIconForUrl(url) {
  for (const s of SOCIAL_ICONS) {
    if (s.match.test(url)) {
      return { type: 'fa', class: s.icon, color: s.color };
    }
  }
  try {
    const domain = new URL(url).hostname;
    return { type: 'img', src: `https://www.google.com/s2/favicons?domain=${domain}&sz=32` };
  } catch {
    return { type: 'fa', class: 'fa-solid fa-globe', color: '#9ca3af' };
  }
}

function createIconElement(url) {
  const info = getIconForUrl(url);
  if (info.type === 'fa') {
    const i = document.createElement('i');
    i.className = info.class;
    i.style.color = info.color;
    return i;
  } else {
    const img = document.createElement('img');
    img.src = info.src;
    img.alt = '';
    img.onerror = () => {
      const fallback = document.createElement('i');
      fallback.className = 'fa-solid fa-globe';
      fallback.style.color = '#9ca3af';
      img.replaceWith(fallback);
    };
    return img;
  }
}

// ===== Expand / Collapse =====
function togglePanel() {
  isExpanded = !isExpanded;
  panel.classList.toggle('expanded', isExpanded);

  if (isExpanded) {
    toggleIcon.classList.remove('fa-chevron-right');
    toggleIcon.classList.add('fa-chevron-left');
    loadBookmarks();
  } else {
    toggleIcon.classList.remove('fa-chevron-left');
    toggleIcon.classList.add('fa-chevron-right');
    hideAddForm();
    hideContextMenu();
    loadCollapsedIcons();
  }
}

toggleBtn.addEventListener('click', togglePanel);

// ===== Manual add =====
addManualBtn.addEventListener('click', () => {
  addForm.classList.add('visible');
  addManualBtn.style.display = 'none';
  addTitle.value = '';
  addUrl.value = 'https://';
  addTitle.focus();
});

function hideAddForm() {
  addForm.classList.remove('visible');
  addManualBtn.style.display = 'flex';
}

cancelBtn.addEventListener('click', hideAddForm);

saveBtn.addEventListener('click', async () => {
  const title = addTitle.value.trim();
  let url = addUrl.value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  try {
    await chrome.bookmarks.create({ title: title || url, url });
    hideAddForm();
    refresh();
  } catch (e) {
    console.error(e);
  }
});

// ===== Context menu =====
function showContextMenu(e, bookmarkId) {
  e.preventDefault();
  contextBookmarkId = bookmarkId;
  contextMenu.style.display = 'block';
  contextMenu.style.left = Math.min(e.clientX, window.innerWidth - 120) + 'px';
  contextMenu.style.top = Math.min(e.clientY, window.innerHeight - 80) + 'px';
}

function hideContextMenu() {
  contextMenu.style.display = 'none';
  contextBookmarkId = null;
}

document.addEventListener('click', (e) => {
  if (!contextMenu.contains(e.target)) hideContextMenu();
});

ctxEdit.addEventListener('click', async () => {
  if (!contextBookmarkId) return;
  const [bm] = await chrome.bookmarks.get(contextBookmarkId);
  editBookmarkId = contextBookmarkId;
  editTitle.value = bm.title || '';
  editUrl.value = bm.url || '';
  editModal.classList.add('visible');
  hideContextMenu();
  editTitle.focus();
});

ctxDelete.addEventListener('click', async () => {
  if (!contextBookmarkId) return;
  await chrome.bookmarks.remove(contextBookmarkId);
  hideContextMenu();
  refresh();
});

editCancel.addEventListener('click', () => {
  editModal.classList.remove('visible');
  editBookmarkId = null;
});

editSave.addEventListener('click', async () => {
  if (!editBookmarkId) return;
  const title = editTitle.value.trim();
  let url = editUrl.value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  await chrome.bookmarks.update(editBookmarkId, { title: title || url, url });
  editModal.classList.remove('visible');
  editBookmarkId = null;
  refresh();
});

// ===== Drag & Drop =====
function handleDragStart(e) {
  dragSrcEl = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.id);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.target.closest('.bookmark-item');
  if (target && target !== dragSrcEl) {
    const rect = target.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (e.clientY < mid) {
      target.parentNode.insertBefore(dragSrcEl, target);
    } else {
      target.parentNode.insertBefore(dragSrcEl, target.nextSibling);
    }
  }
}

function handleDragEnd() {
  this.classList.remove('dragging');
  saveOrder();
}

async function saveOrder() {
  const items = [...listEl.querySelectorAll('.bookmark-item')];
  // Move to "Other bookmarks" (id typically "2") with new index
  // To avoid breaking structure, move relative to each other
  for (let i = 0; i < items.length; i++) {
    const id = items[i].dataset.id;
    try {
      await chrome.bookmarks.move(id, { parentId: '2', index: i });
    } catch (e) {
      // if parentId 2 didn't work — try without parentId
      try {
        await chrome.bookmarks.move(id, { index: i });
      } catch (_) {}
    }
  }
  setTimeout(loadBookmarks, 200);
}

// ===== Render =====
function renderExpandedList(bookmarks) {
  listEl.innerHTML = '';

  if (bookmarks.length === 0) {
    listEl.innerHTML = `<div class="px-2 py-6 text-center text-gray-400 text-xs">No bookmarks</div>`;
    return;
  }

  bookmarks.forEach(bm => {
    const div = document.createElement('div');
    div.className = 'bookmark-item';
    div.draggable = true;
    div.dataset.id = bm.id;

    const iconWrap = document.createElement('div');
    iconWrap.className = 'icon-wrap';
    iconWrap.appendChild(createIconElement(bm.url));

    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = bm.title || bm.url;

    div.appendChild(iconWrap);
    div.appendChild(title);

    div.addEventListener('click', (e) => {
      if (e.button === 0) {
        chrome.tabs.create({ url: bm.url, active: true });
      }
    });

    div.addEventListener('contextmenu', (e) => showContextMenu(e, bm.id));

    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('dragend', handleDragEnd);

    listEl.appendChild(div);
  });
}

function renderCollapsedIcons(bookmarks) {
  collapsedIcons.innerHTML = '';
  const items = bookmarks.slice(0, 25);

  items.forEach(bm => {
    const btn = document.createElement('div');
    btn.className = 'collapsed-icon';
    btn.title = bm.title || bm.url;
    btn.appendChild(createIconElement(bm.url));

    btn.addEventListener('click', () => {
      chrome.tabs.create({ url: bm.url, active: true });
    });

    btn.addEventListener('contextmenu', (e) => showContextMenu(e, bm.id));

    collapsedIcons.appendChild(btn);
  });
}

function flattenBookmarks(nodes, result = []) {
  for (const node of nodes) {
    if (node.url) result.push(node);
    if (node.children) flattenBookmarks(node.children, result);
  }
  return result;
}

async function loadBookmarks() {
  try {
    const tree = await chrome.bookmarks.getTree();
    bookmarksCache = flattenBookmarks(tree).reverse();
    if (isExpanded) renderExpandedList(bookmarksCache);
  } catch (e) {
    console.error(e);
  }
}

async function loadCollapsedIcons() {
  try {
    const tree = await chrome.bookmarks.getTree();
    bookmarksCache = flattenBookmarks(tree).reverse();
    renderCollapsedIcons(bookmarksCache);
  } catch (e) {
    console.error(e);
  }
}

function refresh() {
  if (isExpanded) loadBookmarks();
  else loadCollapsedIcons();
}

chrome.bookmarks.onCreated.addListener(refresh);
chrome.bookmarks.onRemoved.addListener(refresh);
chrome.bookmarks.onChanged.addListener(refresh);
chrome.bookmarks.onMoved.addListener(refresh);

// Start
loadCollapsedIcons();
