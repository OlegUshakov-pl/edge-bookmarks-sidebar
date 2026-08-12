// ===== Side panel: bookmarks UI =====
// Extension page, so chrome.bookmarks / chrome.tabs are available directly.

(function () {
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
      if (s.match.test(url)) return { type: 'fa', class: s.icon, color: s.color };
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
    }
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

  function flatten(nodes, result = []) {
    for (const node of nodes) {
      if (node.url) result.push(node);
      if (node.children) flatten(node.children, result);
    }
    return result;
  }

  // ---------- Elements ----------
  const listEl = document.getElementById('ebm-list');
  const addCurrentBtn = document.getElementById('ebm-add-current');
  const addManualBtn = document.getElementById('ebm-add-manual');
  const addForm = document.getElementById('ebm-form');
  const addTitle = document.getElementById('ebm-add-title');
  const addUrl = document.getElementById('ebm-add-url');
  const saveBtn = document.getElementById('ebm-save');
  const cancelBtn = document.getElementById('ebm-cancel');
  const contextMenu = document.getElementById('ebm-context');
  const ctxEdit = document.getElementById('ebm-ctx-edit');
  const ctxDelete = document.getElementById('ebm-ctx-delete');
  const editModal = document.getElementById('ebm-edit');
  const editTitle = document.getElementById('ebm-edit-title');
  const editUrl = document.getElementById('ebm-edit-url');
  const editSave = document.getElementById('ebm-edit-save');
  const editCancel = document.getElementById('ebm-edit-cancel');

  // ---------- State ----------
  let bookmarksCache = [];
  let contextBookmarkId = null;
  let editBookmarkId = null;
  let dragSrcEl = null;

  async function loadBookmarks() {
    const tree = await chrome.bookmarks.getTree();
    bookmarksCache = flatten(tree).reverse(); // latest first
    render();
  }

  // ---------- Add current page ----------
  addCurrentBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https?:/i.test(tab.url || '')) return;
    const title = tab.title || tab.url;
    addCurrentBtn.classList.add('active');
    setTimeout(() => addCurrentBtn.classList.remove('active'), 350);
    await chrome.bookmarks.create({ title, url: tab.url });
  });

  // ---------- Manual add ----------
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

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = addTitle.value.trim();
    let url = addUrl.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (!/^https?:/i.test(url)) return;
    await chrome.bookmarks.create({ title: title || url, url });
    hideAddForm();
  });

  // ---------- Context menu ----------
  function showContextMenu(e, bookmarkId) {
    e.preventDefault();
    contextBookmarkId = bookmarkId;
    contextMenu.style.display = 'block';
    contextMenu.style.left = Math.min(e.clientX, window.innerWidth - 140) + 'px';
    contextMenu.style.top = Math.min(e.clientY, window.innerHeight - 90) + 'px';
  }
  function hideContextMenu() {
    contextMenu.style.display = 'none';
    contextBookmarkId = null;
  }
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) hideContextMenu();
  });

  ctxEdit.addEventListener('click', () => {
    if (!contextBookmarkId) return;
    const bm = bookmarksCache.find((b) => b.id === contextBookmarkId);
    if (!bm) return;
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
  });

  // ---------- Edit modal ----------
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
    if (!/^https?:/i.test(url)) return;
    await chrome.bookmarks.update(editBookmarkId, { title: title || url, url });
    editModal.classList.remove('visible');
    editBookmarkId = null;
  });

  // ---------- Drag & drop ----------
  function handleDragStart(e) {
    dragSrcEl = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
  }
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.ebm-bookmark-item');
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
    const items = [...listEl.querySelectorAll('.ebm-bookmark-item')];
    for (let i = 0; i < items.length; i++) {
      const id = items[i].dataset.id;
      const parentId = items[i].dataset.parent;
      let index = 0;
      for (let j = 0; j < i; j++) {
        if (items[j].dataset.parent === parentId) index++;
      }
      try {
        await chrome.bookmarks.move(id, { parentId, index });
      } catch (_) {}
    }
  }

  // ---------- Render ----------
  function render() {
    listEl.innerHTML = '';
    if (!bookmarksCache.length) {
      listEl.innerHTML = '<div class="ebm-empty">No bookmarks</div>';
      return;
    }
    for (const bm of bookmarksCache) {
      const div = document.createElement('div');
      div.className = 'ebm-bookmark-item';
      div.draggable = true;
      div.dataset.id = bm.id;
      div.dataset.parent = bm.parentId;

      const iconWrap = document.createElement('div');
      iconWrap.className = 'ebm-icon-wrap';
      iconWrap.appendChild(createIconElement(bm.url));

      const title = document.createElement('span');
      title.className = 'ebm-title';
      title.textContent = bm.title || bm.url;
      title.title = bm.title || bm.url;

      div.appendChild(iconWrap);
      div.appendChild(title);

      div.addEventListener('mouseup', (e) => {
        if (e.button === 0) chrome.tabs.create({ url: bm.url });
      });
      div.addEventListener('dragstart', handleDragStart);
      div.addEventListener('dragover', handleDragOver);
      div.addEventListener('dragend', handleDragEnd);
      div.addEventListener('contextmenu', (e) => showContextMenu(e, bm.id));

      listEl.appendChild(div);
    }
  }

  // ---------- Live sync ----------
  chrome.bookmarks.onCreated.addListener(loadBookmarks);
  chrome.bookmarks.onRemoved.addListener(loadBookmarks);
  chrome.bookmarks.onChanged.addListener(loadBookmarks);
  chrome.bookmarks.onMoved.addListener(loadBookmarks);

  loadBookmarks();
})();