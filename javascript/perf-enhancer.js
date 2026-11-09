/**
 * Global Frontend Speed, Top Navigation Progress Bar,
 * Live Instant Search Dropdown + Ctrl+K Command Palette,
 * Hardware-Accelerated 3D Perspective Animations & Prefetching Engine
 * Subai Jamiat Ahle Hadees Mumbai
 */
(function () {
  'use strict';

  // 1. Sleek Top Navigation Progress Bar + Global 3D & Instant Search CSS
  var progressBar = null;
  var progressTimer = null;

  function injectGlobalEnhancementStyles() {
    if (document.getElementById('sj-global-3d-search-styles')) return;
    var style = document.createElement('style');
    style.id = 'sj-global-3d-search-styles';
    style.textContent =
      '#sj-top-progress{position:fixed;top:0;left:0;right:0;height:3px;z-index:999999;pointer-events:none;opacity:0;transition:opacity .2s ease}' +
      '#sj-top-progress-bar{height:100%;width:0%;background:linear-gradient(90deg,#10b981,#0ea5e9,#f59e0b);box-shadow:0 0 10px rgba(16,185,129,.55);transition:width .22s cubic-bezier(.16,1,.3,1)}' +
      /* 3D Perspective & Depth Animations */
      '.sj-3d-tilt{transform-style:preserve-3d;will-change:transform;transition:transform .28s cubic-bezier(.16,1,.3,1),box-shadow .28s ease}' +
      '.sj-3d-reveal{opacity:0;transform:perspective(900px) translateY(22px) rotateX(4deg);transition:opacity .55s cubic-bezier(.16,1,.3,1),transform .55s cubic-bezier(.16,1,.3,1)}' +
      '.sj-3d-reveal.sj-visible{opacity:1;transform:perspective(900px) translateY(0) rotateX(0deg)}' +
      '#content .column .card{transition:transform .32s cubic-bezier(.16,1,.3,1),box-shadow .32s ease;transform-style:preserve-3d}' +
      '#content .column .card:hover{box-shadow:0 18px 38px rgba(15,81,50,.15)}' +
      /* Live Navbar Search Dropdown */
      '.navbar .search{position:relative}' +
      '#sj-live-search-dropdown{position:absolute;top:calc(100% + 8px);left:0;width:min(440px,92vw);background:#ffffff;border:1px solid #cbd5e1;border-radius:16px;box-shadow:0 22px 48px rgba(15,23,42,.22);z-index:99999;display:none;overflow:hidden;direction:rtl;text-align:right}' +
      '#sj-live-search-dropdown.open{display:block;animation:sjDropIn .18s cubic-bezier(.16,1,.3,1)}' +
      '@keyframes sjDropIn{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}' +
      '.sj-ls-header{background:linear-gradient(90deg,#064e3b,#0f766e);color:#fff;padding:8px 14px;font-size:12px;display:flex;justify-content:space-between;align-items:center}' +
      '.sj-ls-list{max-height:360px;overflow-y:auto;padding:6px}' +
      '.sj-ls-item{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:9px 12px;border-radius:10px;text-decoration:none;color:#0f172a;transition:background .15s ease;border-bottom:1px solid #f1f5f9}' +
      '.sj-ls-item:hover,.sj-ls-item.active{background:#f0fdf4}' +
      '.sj-ls-title{font-family:"Noto Nastaliq Urdu",serif;font-size:14px;font-weight:700;color:#0f172a;line-height:1.9}' +
      '.sj-ls-sub{font-size:11.5px;color:#64748b;margin-top:2px}' +
      '.sj-ls-badge{font-size:10.5px;font-weight:700;color:#fff;padding:2px 8px;border-radius:999px;white-space:nowrap;flex-shrink:0}' +
      '.sj-ls-footer{background:#f8fafc;padding:9px 14px;border-top:1px solid #e2e8f0;text-align:center}' +
      '.sj-ls-footer a{color:#0f766e;font-weight:800;font-size:12.5px;text-decoration:none;display:block}';
    document.head.appendChild(style);
  }

  function ensureProgressBar() {
    injectGlobalEnhancementStyles();
    if (progressBar) return progressBar;
    var wrap = document.createElement('div');
    wrap.id = 'sj-top-progress';
    wrap.innerHTML = '<div id="sj-top-progress-bar"></div>';
    document.body.appendChild(wrap);
    progressBar = wrap;
    return wrap;
  }

  function startTopProgress() {
    if (!document.body) return;
    var wrap = ensureProgressBar();
    var bar = wrap.firstElementChild;
    clearInterval(progressTimer);
    wrap.style.opacity = '1';
    bar.style.width = '18%';
    var w = 18;
    progressTimer = setInterval(function () {
      if (w < 86) {
        w += (90 - w) * 0.14;
        bar.style.width = w.toFixed(1) + '%';
      }
    }, 140);
  }

  function finishTopProgress() {
    if (!progressBar) return;
    var bar = progressBar.firstElementChild;
    clearInterval(progressTimer);
    bar.style.width = '100%';
    setTimeout(function () {
      if (progressBar) progressBar.style.opacity = '0';
      setTimeout(function () {
        if (bar) bar.style.width = '0%';
      }, 200);
    }, 150);
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || a.target === '_blank' || a.hasAttribute('download')) return;
    if (a.getAttribute('onclick')) return;
    try {
      var targetUrl = new URL(a.href, window.location.origin);
      if (targetUrl.origin === window.location.origin && targetUrl.href !== window.location.href) {
        startTopProgress();
      }
    } catch (_) {}
  });

  window.addEventListener('pageshow', finishTopProgress);

  // 2. Live Instant Search Dropdown on Navbar + Ctrl+K Shortcut
  function initLiveGlobalSearch() {
    injectGlobalEnhancementStyles();
    var searchContainer = document.querySelector('.navbar .search');
    var searchInput = document.querySelector('.navbar .search input');
    if (!searchContainer || !searchInput) return;

    searchInput.setAttribute('placeholder', 'تلاش کریں (کتب، فتاویٰ، مضامین، مساجد)... [Ctrl+K]');

    var dropdown = document.createElement('div');
    dropdown.id = 'sj-live-search-dropdown';
    searchContainer.appendChild(dropdown);

    var debounceTimer = null;
    var lastQuery = '';

    function renderDropdown(data) {
      if (!data || !data.query) {
        dropdown.classList.remove('open');
        return;
      }
      var items = data.results || [];
      var headerHtml =
        '<div class="sj-ls-header">' +
          '<span><i class="fa-solid fa-bolt" style="color:#fbbf24;"></i> فوری نتائج (' + (data.count || 0) + ')</span>' +
          '<span style="font-size:11px;opacity:.9;">⚡ ' + (data.tookMs || 0.3) + ' ms</span>' +
        '</div>';

      if (items.length === 0) {
        dropdown.innerHTML =
          headerHtml +
          '<div style="padding:18px;text-align:center;color:#64748b;font-size:13px;">کوئی فوری نتیجہ نہیں ملا۔ مکمل تلاش کے لیے Enter دبائیں۔</div>';
        dropdown.classList.add('open');
        return;
      }

      var listHtml = items.slice(0, 8).map(function (item) {
        return (
          '<a href="' + item.url + '" class="sj-ls-item">' +
            '<div style="min-width:0;flex:1;">' +
              '<div class="sj-ls-title">' + item.title + '</div>' +
              (item.subtitle ? '<div class="sj-ls-sub">' + item.subtitle + '</div>' : '') +
            '</div>' +
            '<span class="sj-ls-badge" style="background:' + (item.badgeColor || '#0f766e') + ';">' + item.type + '</span>' +
          '</a>'
        );
      }).join('');

      var footerHtml =
        '<div class="sj-ls-footer">' +
          '<a href="/search?q=' + encodeURIComponent(data.query) + '">تمام ' + data.count + ' نتائج تفصیل سے دیکھیں <i class="fa-solid fa-arrow-left"></i></a>' +
        '</div>';

      dropdown.innerHTML = headerHtml + '<div class="sj-ls-list">' + listHtml + '</div>' + footerHtml;
      dropdown.classList.add('open');
    }

    searchInput.addEventListener('input', function () {
      var q = (searchInput.value || '').trim();
      clearTimeout(debounceTimer);
      if (q.length < 1) {
        dropdown.classList.remove('open');
        lastQuery = '';
        return;
      }
      if (q === lastQuery) return;
      lastQuery = q;
      debounceTimer = setTimeout(function () {
        fetch('/api/global-search?q=' + encodeURIComponent(q) + '&limit=8')
          .then(function (r) { return r.json(); })
          .then(renderDropdown)
          .catch(function () {});
      }, 80);
    });

    searchInput.addEventListener('focus', function () {
      if ((searchInput.value || '').trim().length > 0 && dropdown.innerHTML) {
        dropdown.classList.add('open');
      }
    });

    document.addEventListener('click', function (e) {
      if (!searchContainer.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });

    // Global Keyboard Shortcut: Ctrl+K or Cmd+K focuses instant search
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchContainer) searchContainer.classList.add('active');
        searchInput.focus();
        searchInput.select();
      } else if (e.key === 'Escape') {
        dropdown.classList.remove('open');
      }
    });
  }

  // 3. Hardware-Accelerated 3D Perspective Tilt & Scroll Reveal Engine
  function init3DAnimations() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var tiltSelector = '.sj-3d-card, .sj-result-card, .book-card, .article-card, .pr-card';
    document.addEventListener('mousemove', function (e) {
      var card = e.target && e.target.closest ? e.target.closest(tiltSelector) : null;
      if (!card) return;
      var rect = card.getBoundingClientRect();
      if (rect.width < 80 || rect.height < 60) return;
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var rotateY = ((x / rect.width) - 0.5) * 8;
      var rotateX = (0.5 - (y / rect.height)) * 8;
      card.style.transform = 'perspective(900px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg) translateZ(6px)';
    }, { passive: true });

    document.addEventListener('mouseout', function (e) {
      var card = e.target && e.target.closest ? e.target.closest(tiltSelector) : null;
      if (!card) return;
      if (!card.contains(e.relatedTarget)) {
        card.style.transform = '';
      }
    }, { passive: true });

    // Scroll reveal for .sj-3d-reveal elements
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('sj-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });

      document.querySelectorAll('.sj-3d-reveal').forEach(function (el) {
        observer.observe(el);
      });
    } else {
      document.querySelectorAll('.sj-3d-reveal').forEach(function (el) {
        el.classList.add('sj-visible');
      });
    }
  }

  // 4. Native Browser Speculation Rules API
  function injectSpeculationRules() {
    if (HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
      var specScript = document.createElement('script');
      specScript.type = 'speculationrules';
      specScript.textContent = JSON.stringify({
        prefetch: [
          {
            source: 'document',
            where: {
              and: [
                { href_matches: '/*' },
                { not: { href_matches: '/admin*' } },
                { not: { href_matches: '/dashboard*' } },
                { not: { href_matches: '/logout*' } },
                { not: { href_matches: '/api/*' } }
              ]
            },
            eagerness: 'moderate'
          }
        ]
      });
      document.head.appendChild(specScript);
    }
  }

  // 5. Automatic Lazy-Loading & Async Decoding for Below-the-Fold Images
  function optimizeImages() {
    var imgs = document.querySelectorAll('img:not([loading])');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (i > 2 && !img.closest('.logo') && !img.closest('header')) {
        img.setAttribute('loading', 'lazy');
      }
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
    }
  }

  // 6. Instant Page Prefetching Fallback on Hover / Touchstart
  var prefetchedUrls = {};
  function prefetchUrl(url) {
    if (!url || prefetchedUrls[url]) return;
    if (url.indexOf(window.location.origin) !== 0 && url.charAt(0) !== '/') return;
    if (/\/(admin|dashboard|logout|api|delete)/i.test(url)) return;
    prefetchedUrls[url] = true;
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    link.as = 'document';
    document.head.appendChild(link);
  }

  function initInstantPrefetch() {
    var hoverTimer = null;
    document.addEventListener('mouseover', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || a.target === '_blank') return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () {
        prefetchUrl(a.href);
      }, 45);
    }, { passive: true });

    document.addEventListener('touchstart', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || a.target === '_blank') return;
      prefetchUrl(a.href);
    }, { passive: true });
  }

  // 7. Register PWA Service Worker
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
      });
    }
  }

  function bootAll() {
    optimizeImages();
    injectSpeculationRules();
    initInstantPrefetch();
    initLiveGlobalSearch();
    init3DAnimations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAll);
  } else {
    bootAll();
  }
  registerServiceWorker();
})();
