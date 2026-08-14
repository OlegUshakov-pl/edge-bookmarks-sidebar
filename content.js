// ===== Content script: renders the bookmarks rail directly on the page =====
// No chrome.bookmarks / chrome.tabs here ÔÇö everything goes through background.

(function () {
  if (document.getElementById('ebm-rail')) return;

  // ---------- Icon helpers ----------
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
    }
    var domain = '';
    try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch (_) {}
    var letter = (domain.charAt(0) || '?').toUpperCase();
    var hue = 0;
    for (var k = 0; k < domain.length; k++) hue = (hue * 31 + domain.charCodeAt(k)) % 360;

    var fallback = document.createElement('div');
    fallback.style.cssText = 'width:18px;height:18px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#fff;flex-shrink:0;background:hsl(' + hue + ',50%,45%)';
    fallback.textContent = letter;

    const img = document.createElement('img');
    img.src = info.src;
    img.alt = '';
    img.onerror = function () {
      if (img.parentNode) img.parentNode.replaceChild(fallback, img);
    };
    var timer = setTimeout(function () {
      if (img.parentNode && img.naturalWidth === 0) img.parentNode.replaceChild(fallback, img);
    }, 3000);
    img.onload = function () { clearTimeout(timer); };
    return img;
  }

  // ---------- Build DOM ----------
  const rail = document.createElement('div');
  rail.id = 'ebm-rail';
  rail.innerHTML = `
    <button id="ebm-add-current" class="ebm-icon-btn" title="Add current page">
      <i class="fa-solid fa-plus"></i>
    </button>
    <div id="ebm-content">
      <div id="ebm-collapsed"></div>
      <div id="ebm-expanded">
        <div id="ebm-list"></div>
        <button id="ebm-add-manual" class="ebm-add-manual" title="Add bookmark">
          <i class="fa-solid fa-plus"></i>
        </button>
        <div id="ebm-form">
          <input type="text" id="ebm-add-title" placeholder="Title">
          <input type="url" id="ebm-add-url" placeholder="https://">
          <div class="ebm-actions">
            <button id="ebm-save">Save</button>
            <button id="ebm-cancel">Cancel</button>
          </div>
        </div>
      </div>
    </div>
    <button id="ebm-toggle" class="ebm-icon-btn" title="Expand / collapse">
      <i id="ebm-toggle-icon" class="fa-solid fa-chevron-right"></i>
    </button>
    <div id="ebm-context">
      <button id="ebm-ctx-edit"><i class="fa-solid fa-pen"></i> Edit</button>
      <button id="ebm-ctx-delete" class="danger"><i class="fa-solid fa-trash"></i> Delete</button>
    </div>
    <div id="ebm-edit">
      <div id="ebm-edit-box">
        <input type="text" id="ebm-edit-title" placeholder="Title">
        <input type="url" id="ebm-edit-url" placeholder="https://">
        <div class="ebm-actions">
          <button id="ebm-edit-save">OK</button>
          <button id="ebm-edit-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(rail);

  // Font Awesome for brand/service icons
  const fa = document.createElement('link');
  fa.rel = 'stylesheet';
  fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
  document.head.appendChild(fa);

  // ---------- Element refs ----------
  const toggleBtn = document.getElementById('ebm-toggle');
  const toggleIcon = document.getElementById('ebm-toggle-icon');
  const addCurrentBtn = document.getElementById('ebm-add-current');
  const collapsedEl = document.getElementById('ebm-collapsed');
  const contentEl = document.getElementById('ebm-content');
  const expandedEl = document.getElementById('ebm-expanded');
  const listEl = document.getElementById('ebm-list');
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
  let isExpanded = false;
  let bookmarksCache = [];
  let contextBookmarkId = null;
  let editBookmarkId = null;
  let dragSrcEl = null;

  // ---------- Messaging ----------
  function send(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (resp) => resolve(resp));
    });
  }

  // ---------- Expand / collapse ----------
  function togglePanel() {
    isExpanded = !isExpanded;
    rail.classList.toggle('expanded', isExpanded);
    if (isExpanded) {
      toggleIcon.classList.remove('fa-chevron-right');
      toggleIcon.classList.add('fa-chevron-left');
      renderExpandedList(bookmarksCache);
    } else {
      toggleIcon.classList.remove('fa-chevron-left');
      toggleIcon.classList.add('fa-chevron-right');
      hideAddForm();
      hideContextMenu();
      renderCollapsedIcons(bookmarksCache);
    }
  }
  toggleBtn.addEventListener('click', togglePanel);

  function toggleVisibility() {
    rail.classList.toggle('hidden');
  }

  // ---------- Add current page ----------
  addCurrentBtn.addEventListener('click', async () => {
    const url = location.href;
    if (!/^https?:/i.test(url)) return;
    const title = document.title || url;
    addCurrentBtn.classList.add('active');
    setTimeout(() => addCurrentBtn.classList.remove('active'), 350);
    await send({ type: 'addCurrent', title, url });
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

  saveBtn.addEventListener('click', async () => {
    const title = addTitle.value.trim();
    let url = addUrl.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    await send({ type: 'addManual', title: title || url, url });
    hideAddForm();
  });

  // ---------- Context menu ----------
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
    await send({ type: 'remove', id: contextBookmarkId });
    hideContextMenu();
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
    await send({ type: 'update', id: editBookmarkId, title: title || url, url });
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
      await send({ type: 'move', id: items[i].dataset.id, index: i });
    }
  }

  // ---------- Render ----------
  function renderExpandedList(bookmarks) {
    listEl.innerHTML = '';
    if (!bookmarks || bookmarks.length === 0) {
      listEl.innerHTML = `<div class="ebm-empty">No bookmarks</div>`;
      return;
    }
    bookmarks.forEach((bm) => {
      const div = document.createElement('div');
      div.className = 'ebm-bookmark-item';
      div.draggable = true;
      div.dataset.id = bm.id;

      const iconWrap = document.createElement('div');
      iconWrap.className = 'ebm-icon-wrap';
      iconWrap.appendChild(createIconElement(bm.url));

      const title = document.createElement('span');
      title.className = 'ebm-title';
      title.textContent = bm.title || bm.url;

      div.appendChild(iconWrap);
      div.appendChild(title);

      div.addEventListener('click', (e) => {
        if (e.button === 0) window.open(bm.url, '_blank');
      });
      div.addEventListener('contextmenu', (e) => showContextMenu(e, bm.id));
      div.addEventListener('dragstart', handleDragStart);
      div.addEventListener('dragover', handleDragOver);
      div.addEventListener('dragend', handleDragEnd);

      listEl.appendChild(div);
    });
  }

  function renderCollapsedIcons(bookmarks) {
    collapsedEl.innerHTML = '';
    const items = (bookmarks || []).slice(0, 25);
    items.forEach((bm) => {
      const btn = document.createElement('div');
      btn.className = 'ebm-collapsed-icon';
      btn.title = bm.title || bm.url;
      btn.appendChild(createIconElement(bm.url));
      btn.addEventListener('click', () => window.open(bm.url, '_blank'));
      btn.addEventListener('contextmenu', (e) => showContextMenu(e, bm.id));
      collapsedEl.appendChild(btn);
    });
  }

  function refresh() {
    if (isExpanded) renderExpandedList(bookmarksCache);
    else renderCollapsedIcons(bookmarksCache);
  }

  // ---------- Background messages ----------
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'bookmarksChanged') {
      bookmarksCache = msg.bookmarks || [];
      refresh();
    } else if (msg.type === 'toggle') {
      toggleVisibility();
    }
  });

  // ---------- Init ----------
  // Keep the background service worker alive while this page is open.
  try { chrome.runtime.connect(); } catch (_) {}

  send({ type: 'getBookmarks' }).then((data) => {
    bookmarksCache = data || [];
    renderCollapsedIcons(bookmarksCache);
  });
})();
