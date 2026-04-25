'use strict';

// ── Demo photos (Unsplash CDN) ──────────────────────────────────────────────
const DEMO_PHOTOS = [
  { id: 1, src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600', title: '云海山峰', category: 'nature', date: '2025-03-12', size: '4.2 MB' },
  { id: 2, src: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600', title: '城市夜景', category: 'city',   date: '2025-02-28', size: '3.8 MB' },
  { id: 3, src: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600', title: '自然光人像', category: 'people', date: '2025-04-01', size: '5.1 MB' },
  { id: 4, src: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600', title: '森林小径', category: 'nature', date: '2025-01-15', size: '3.2 MB' },
  { id: 5, src: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600', title: '霓虹街道', category: 'city',   date: '2025-03-05', size: '4.5 MB' },
  { id: 6, src: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600', title: '午后光影', category: 'people', date: '2025-02-10', size: '2.9 MB' },
  { id: 7, src: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600', title: '瀑布奇观', category: 'nature', date: '2025-04-08', size: '6.1 MB' },
  { id: 8, src: 'https://images.unsplash.com/photo-1514565131-fce0801e6c07?w=600', title: '玻璃幕墙', category: 'city',   date: '2024-12-20', size: '3.4 MB' },
  { id: 9, src: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600', title: '街头速写', category: 'people', date: '2025-01-30', size: '4.0 MB' },
  { id: 10,src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600', title: '日落雪峰', category: 'nature', date: '2025-03-22', size: '5.7 MB' },
  { id: 11,src: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=600', title: '夜幕桥影', category: 'city',   date: '2025-02-14', size: '3.6 MB' },
  { id: 12,src: 'https://images.unsplash.com/photo-1541516160071-4bb0c5af65ba?w=600', title: '咖啡时光', category: 'people', date: '2025-04-10', size: '2.2 MB' },
];

// ── State ───────────────────────────────────────────────────────────────────
let photos = loadPhotos();
let currentFilter = 'all';
let isMasonry = false;
let lbIndex = 0;
let deferredPrompt = null;

// ── DOM refs ────────────────────────────────────────────────────────────────
const gallery      = document.getElementById('gallery');
const emptyState   = document.getElementById('emptyState');
const totalCount   = document.getElementById('totalCount');
const showingCount = document.getElementById('showingCount');
const lightbox     = document.getElementById('lightbox');
const lbImg        = document.getElementById('lbImg');
const lbTitle      = document.getElementById('lbTitle');
const lbMeta       = document.getElementById('lbMeta');
const lbThumbs     = document.getElementById('lbThumbs');
const uploadArea   = document.getElementById('uploadArea');
const dropZone     = document.getElementById('dropZone');
const fileInput    = document.getElementById('fileInput');
const installBanner= document.getElementById('installBanner');
const toast        = document.getElementById('toast');

// ── Persistence ─────────────────────────────────────────────────────────────
function loadPhotos() {
  try {
    const saved = JSON.parse(localStorage.getItem('gallery_photos') || '[]');
    return saved.length ? saved : [...DEMO_PHOTOS];
  } catch { return [...DEMO_PHOTOS]; }
}

function savePhotos() {
  // only save user-uploaded photos (those without Unsplash URLs) to avoid quota issues
  const userPhotos = photos.filter(p => !p.src.includes('unsplash.com'));
  localStorage.setItem('gallery_photos', JSON.stringify(userPhotos));
}

// ── Render ──────────────────────────────────────────────────────────────────
function getFiltered() {
  return currentFilter === 'all' ? photos : photos.filter(p => p.category === currentFilter);
}

function render() {
  const filtered = getFiltered();
  totalCount.textContent = photos.length;
  showingCount.textContent = filtered.length < photos.length
    ? `显示 ${filtered.length} / ${photos.length} 张`
    : `共 ${photos.length} 张`;

  if (!filtered.length) {
    gallery.innerHTML = '';
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  gallery.innerHTML = filtered.map((p, i) => `
    <div class="photo-card" data-index="${i}" data-id="${p.id}">
      <img src="${p.src}" alt="${p.title}" loading="lazy" />
      <span class="photo-tag">${categoryLabel(p.category)}</span>
      <div class="photo-overlay">
        <div class="photo-title">${p.title}</div>
        <div class="photo-meta">${p.date} · ${p.size || ''}</div>
      </div>
      <div class="photo-actions">
        <button class="photo-action-btn" data-action="fav"   title="收藏">♡</button>
        <button class="photo-action-btn" data-action="share" title="分享">↗</button>
        <button class="photo-action-btn" data-action="del"   title="删除">✕</button>
      </div>
    </div>
  `).join('');

  // Events on cards
  gallery.querySelectorAll('.photo-card').forEach(card => {
    card.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (btn) { handleAction(btn.dataset.action, +card.dataset.id, e); return; }
      openLightbox(+card.dataset.index);
    });
  });
}

function categoryLabel(cat) {
  return { nature: '自然', city: '城市', people: '人像', other: '其他' }[cat] || cat;
}

// ── Lightbox ─────────────────────────────────────────────────────────────────
function openLightbox(index) {
  const filtered = getFiltered();
  lbIndex = index;
  updateLightbox();
  buildThumbs();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function updateLightbox() {
  const filtered = getFiltered();
  const p = filtered[lbIndex];
  if (!p) return;
  lbImg.src = p.src;
  lbImg.alt = p.title;
  lbTitle.textContent = p.title;
  lbMeta.textContent = `${categoryLabel(p.category)} · ${p.date}${p.size ? ' · ' + p.size : ''}`;
  lbThumbs.querySelectorAll('.lb-thumb').forEach((t, i) => t.classList.toggle('active', i === lbIndex));
  lbThumbs.children[lbIndex]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

function buildThumbs() {
  const filtered = getFiltered();
  lbThumbs.innerHTML = filtered.map((p, i) => `
    <img class="lb-thumb ${i === lbIndex ? 'active' : ''}" src="${p.src}" alt="${p.title}" data-i="${i}" loading="lazy" />
  `).join('');
  lbThumbs.querySelectorAll('.lb-thumb').forEach(t => {
    t.addEventListener('click', () => { lbIndex = +t.dataset.i; updateLightbox(); });
  });
}

document.getElementById('lbClose').addEventListener('click', closeLightbox);
document.getElementById('lbPrev').addEventListener('click', () => {
  lbIndex = (lbIndex - 1 + getFiltered().length) % getFiltered().length;
  updateLightbox();
});
document.getElementById('lbNext').addEventListener('click', () => {
  lbIndex = (lbIndex + 1) % getFiltered().length;
  updateLightbox();
});
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

// Keyboard nav
document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft')  { lbIndex = (lbIndex - 1 + getFiltered().length) % getFiltered().length; updateLightbox(); }
  if (e.key === 'ArrowRight') { lbIndex = (lbIndex + 1) % getFiltered().length; updateLightbox(); }
});

// Touch swipe
let tsX = 0;
lightbox.addEventListener('touchstart', e => tsX = e.touches[0].clientX, { passive: true });
lightbox.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - tsX;
  if (Math.abs(dx) < 40) return;
  if (dx < 0) { lbIndex = (lbIndex + 1) % getFiltered().length; }
  else        { lbIndex = (lbIndex - 1 + getFiltered().length) % getFiltered().length; }
  updateLightbox();
});

// ── Photo Actions ────────────────────────────────────────────────────────────
function handleAction(action, id, e) {
  e.stopPropagation();
  if (action === 'del') {
    if (confirm('删除这张照片？')) {
      photos = photos.filter(p => p.id !== id);
      savePhotos();
      render();
      showToast('照片已删除');
    }
  } else if (action === 'fav') {
    showToast('已收藏 ♥');
  } else if (action === 'share') {
    const p = photos.find(x => x.id === id);
    if (navigator.share && p) {
      navigator.share({ title: p.title, url: p.src }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(p?.src || '').then(() => showToast('链接已复制'));
    }
  }
}

// ── Filter ───────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

// ── View Toggle ──────────────────────────────────────────────────────────────
document.getElementById('viewToggle').addEventListener('click', () => {
  isMasonry = !isMasonry;
  gallery.className = 'gallery ' + (isMasonry ? 'masonry-view' : 'grid-view');
  document.getElementById('viewIcon').textContent = isMasonry ? '▤' : '⊞';
});

// ── Upload ───────────────────────────────────────────────────────────────────
document.getElementById('uploadBtn').addEventListener('click', () => {
  uploadArea.classList.toggle('visible');
});

['dragenter','dragover'].forEach(ev => dropZone.addEventListener(ev, e => {
  e.preventDefault(); dropZone.classList.add('drag-over');
}));
['dragleave','drop'].forEach(ev => dropZone.addEventListener(ev, e => {
  e.preventDefault(); dropZone.classList.remove('drag-over');
}));
dropZone.addEventListener('drop', e => processFiles(e.dataTransfer.files));
fileInput.addEventListener('change', () => processFiles(fileInput.files));

function processFiles(files) {
  const cats = ['nature', 'city', 'people', 'other'];
  let added = 0;
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      photos.unshift({
        id: Date.now() + Math.random(),
        src: ev.target.result,
        title: file.name.replace(/\.[^.]+$/, ''),
        category: cats[Math.floor(Math.random() * 3)],
        date: new Date().toISOString().slice(0, 10),
        size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
      });
      added++;
      if (added === files.length) {
        try { savePhotos(); } catch {}
        render();
        uploadArea.classList.remove('visible');
        showToast(`已添加 ${added} 张照片`);
      }
    };
    reader.readAsDataURL(file);
  });
}

// ── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── PWA Install ──────────────────────────────────────────────────────────────
function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

// Show banner: iOS always (needs manual steps), others on beforeinstallprompt
if (isIOS() && !isInStandaloneMode()) {
  installBanner.hidden = false;
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  installBanner.hidden = false;
});

document.getElementById('installBtn').addEventListener('click', async () => {
  if (isIOS()) {
    showInstallGuide();
    return;
  }
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('App 已安装！');
      installBanner.hidden = true;
    }
    deferredPrompt = null;
  } else {
    // Chrome: prompt already used or dismissed — show manual guide
    showInstallGuide();
  }
});

document.getElementById('installDismiss').addEventListener('click', () => {
  installBanner.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installBanner.hidden = true;
  document.getElementById('installGuide')?.remove();
  showToast('欢迎使用 Gallery App！');
});

function showInstallGuide() {
  const existing = document.getElementById('installGuide');
  if (existing) { existing.remove(); return; }

  const ios = isIOS();
  const guide = document.createElement('div');
  guide.id = 'installGuide';
  guide.innerHTML = `
    <div class="guide-backdrop"></div>
    <div class="guide-box">
      <button class="guide-close" onclick="document.getElementById('installGuide').remove()">✕</button>
      <h3 class="guide-title">安装到主屏幕</h3>
      ${ios ? `
        <p class="guide-note">请使用 <strong>Safari</strong> 浏览器打开本网站，然后：</p>
        <ol class="guide-steps">
          <li>点击底部工具栏的 <strong>分享</strong> 按钮 <span class="guide-icon">□↑</span></li>
          <li>向下滑动，选择 <strong>"添加到主屏幕"</strong></li>
          <li>点击右上角 <strong>"添加"</strong> 完成安装</li>
        </ol>
      ` : `
        <p class="guide-note">在 Chrome 浏览器中：</p>
        <ol class="guide-steps">
          <li>点击地址栏右侧的 <strong>安装图标</strong> <span class="guide-icon">⊕</span></li>
          <li>或点击右上角菜单 <strong>⋮</strong> → <strong>"安装 Photo Gallery"</strong></li>
          <li>在弹出窗口中点击 <strong>"安装"</strong></li>
        </ol>
      `}
      <p class="guide-tip">安装后可从主屏幕直接启动，体验媲美原生 App</p>
    </div>
  `;
  document.body.appendChild(guide);
  guide.querySelector('.guide-backdrop').addEventListener('click', () => guide.remove());
}

// ── Service Worker ───────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ── Init ─────────────────────────────────────────────────────────────────────
render();
