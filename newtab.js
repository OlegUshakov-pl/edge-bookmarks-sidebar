// ===== New Tab page: bookmarks sidebar (uses chrome.bookmarks directly) =====

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
      return { type: 'img', src: 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=32' };
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

    var img = document.createElement('img');
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

  function flatten(nodes, result) {
    result = result || [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].url) result.push(nodes[i]);
      if (nodes[i].children) flatten(nodes[i].children, result);
    }
    return result;
  }

  // ---------- State ----------
  var bookmarksCache = [];
  var isExpanded = false;
  var contextBookmarkId = null;
  var editBookmarkId = null;
  var dragSrcEl = null;

  // ---------- Elements ----------
  var rail = document.getElementById('ebm-rail');
  var collapsedEl = document.getElementById('ebm-collapsed');
  var contentEl = document.getElementById('ebm-content');
  var expandedEl = document.getElementById('ebm-expanded');
  var listEl = document.getElementById('ebm-list');
  var toggleBtn = document.getElementById('ebm-toggle');
  var toggleIcon = document.getElementById('ebm-toggle-icon');
  var addCurrentBtn = document.getElementById('ebm-add-current');
  var addManualBtn = document.getElementById('ebm-add-manual');
  var addForm = document.getElementById('ebm-form');
  var addTitle = document.getElementById('ebm-add-title');
  var addUrl = document.getElementById('ebm-add-url');
  var saveBtn = document.getElementById('ebm-save');
  var cancelBtn = document.getElementById('ebm-cancel');
  var contextMenu = document.getElementById('ebm-context');
  var ctxEdit = document.getElementById('ebm-ctx-edit');
  var ctxDelete = document.getElementById('ebm-ctx-delete');
  var editModal = document.getElementById('ebm-edit');
  var editTitle = document.getElementById('ebm-edit-title');
  var editUrl = document.getElementById('ebm-edit-url');
  var editSave = document.getElementById('ebm-edit-save');
  var editCancel = document.getElementById('ebm-edit-cancel');

  // ---------- Load bookmarks ----------
  async function loadBookmarks() {
    const tree = await chrome.bookmarks.getTree();
    bookmarksCache = flatten(tree).reverse();
    render();
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

  // ---------- Add current page ----------
  addCurrentBtn.addEventListener('click', async function () {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https?:/i.test(tab.url || '')) return;
    const title = tab.title || tab.url;
    addCurrentBtn.classList.add('active');
    setTimeout(function () { addCurrentBtn.classList.remove('active'); }, 350);
    await chrome.bookmarks.create({ title: title, url: tab.url });
  });

  // ---------- Manual add ----------
  addManualBtn.addEventListener('click', function () {
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
  addForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var title = addTitle.value.trim();
    var url = addUrl.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    await chrome.bookmarks.create({ title: title || url, url: url });
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
  document.addEventListener('click', function (e) {
    if (!contextMenu.contains(e.target)) hideContextMenu();
  });
  ctxEdit.addEventListener('click', function () {
    if (!contextBookmarkId) return;
    var bm = bookmarksCache.find(function (b) { return b.id === contextBookmarkId; });
    if (!bm) return;
    editBookmarkId = contextBookmarkId;
    editTitle.value = bm.title || '';
    editUrl.value = bm.url || '';
    editModal.classList.add('visible');
    hideContextMenu();
    editTitle.focus();
  });
  ctxDelete.addEventListener('click', async function () {
    if (!contextBookmarkId) return;
    await chrome.bookmarks.remove(contextBookmarkId);
    hideContextMenu();
  });

  // ---------- Edit modal ----------
  editCancel.addEventListener('click', function () {
    editModal.classList.remove('visible');
    editBookmarkId = null;
  });
  editSave.addEventListener('click', async function () {
    if (!editBookmarkId) return;
    var title = editTitle.value.trim();
    var url = editUrl.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    await chrome.bookmarks.update(editBookmarkId, { title: title || url, url: url });
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
    var target = e.target.closest('.ebm-bookmark-item');
    if (target && target !== dragSrcEl) {
      var rect = target.getBoundingClientRect();
      var mid = rect.top + rect.height / 2;
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
    var items = Array.from(listEl.querySelectorAll('.ebm-bookmark-item'));
    for (var i = 0; i < items.length; i++) {
      var id = items[i].dataset.id;
      var parentId = items[i].dataset.parent;
      var index = 0;
      for (var j = 0; j < i; j++) {
        if (items[j].dataset.parent === parentId) index++;
      }
      try {
        await chrome.bookmarks.move(id, { parentId: parentId, index: index });
      } catch (_) {}
    }
  }

  // ---------- Render ----------
  function renderExpandedList(bookmarks) {
    listEl.innerHTML = '';
    if (!bookmarks || bookmarks.length === 0) {
      listEl.innerHTML = '<div class="ebm-empty">No bookmarks</div>';
      return;
    }
    bookmarks.forEach(function (bm) {
      var div = document.createElement('div');
      div.className = 'ebm-bookmark-item';
      div.draggable = true;
      div.dataset.id = bm.id;
      div.dataset.parent = bm.parentId;

      var iconWrap = document.createElement('div');
      iconWrap.className = 'ebm-icon-wrap';
      iconWrap.appendChild(createIconElement(bm.url));

      var title = document.createElement('span');
      title.className = 'ebm-title';
      title.textContent = bm.title || bm.url;
      title.title = bm.title || bm.url;

      div.appendChild(iconWrap);
      div.appendChild(title);

      div.addEventListener('mouseup', function (e) {
        if (e.button === 0) chrome.tabs.create({ url: bm.url });
      });
      div.addEventListener('contextmenu', function (e) { showContextMenu(e, bm.id); });
      div.addEventListener('dragstart', handleDragStart);
      div.addEventListener('dragover', handleDragOver);
      div.addEventListener('dragend', handleDragEnd);

      listEl.appendChild(div);
    });
  }

  function renderCollapsedIcons(bookmarks) {
    collapsedEl.innerHTML = '';
    var items = (bookmarks || []).slice(0, 25);
    items.forEach(function (bm) {
      var btn = document.createElement('div');
      btn.className = 'ebm-collapsed-icon';
      btn.title = bm.title || bm.url;
      btn.appendChild(createIconElement(bm.url));
      btn.addEventListener('mouseup', function (e) {
        if (e.button === 0) chrome.tabs.create({ url: bm.url });
      });
      btn.addEventListener('contextmenu', function (e) { showContextMenu(e, bm.id); });
      collapsedEl.appendChild(btn);
    });
  }

  function render() {
    if (isExpanded) renderExpandedList(bookmarksCache);
    else renderCollapsedIcons(bookmarksCache);
  }

  // ---------- Live sync ----------
  chrome.bookmarks.onCreated.addListener(loadBookmarks);
  chrome.bookmarks.onRemoved.addListener(loadBookmarks);
  chrome.bookmarks.onChanged.addListener(loadBookmarks);
  chrome.bookmarks.onMoved.addListener(loadBookmarks);

  loadBookmarks();
})();