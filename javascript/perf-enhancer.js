/**
 * Global Frontend Speed, Low-End Device Accelerator, 0ms In-Memory Instant Search,
 * Top Navigation Progress Bar, Ctrl+K Command Palette,
 * RAF-Throttled 3D Perspective & Instant Page Prefetching/Prerendering Engine
 * Subai Jamiat Ahle Hadees Mumbai
 */
(function () {
  'use strict';

  if (window.__SJ_PERF_ENHANCER_BOOTED__) return;
  window.__SJ_PERF_ENHANCER_BOOTED__ = true;

  // 0. Hardware & Device Capability Detector (Butter-Smooth on Low-End / Budget Systems)
  var isLowEndDevice = false;
  var isCoarsePointer = false;
  try {
    var cores = navigator.hardwareConcurrency || 8;
    var mem = navigator.deviceMemory || 8;
    var saveData = Boolean(navigator.connection && navigator.connection.saveData);
    var reducedMotion = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    isCoarsePointer = Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    if (cores <= 4 || mem <= 4 || saveData || reducedMotion) {
      isLowEndDevice = true;
      document.documentElement.classList.add('sj-low-end');
    }
    window.__SJ_LOW_END_DEVICE__ = isLowEndDevice;
    window.__SJ_COARSE_POINTER__ = isCoarsePointer;
  } catch (_) {}

  var ROMAN_URDU_MAP = {
    namaz: 'نماز', salah: 'نماز', salat: 'نماز',
    roza: 'روزہ', ramzan: 'رمضان', ramadan: 'رمضان',
    zakat: 'زکوٰۃ', sadqa: 'صدقہ', fitrana: 'فطرہ',
    hajj: 'حج', umrah: 'عمرہ', qurbani: 'قربانی',
    nikah: 'نکاح', talaq: 'طلاق', khula: 'خلع', wirasat: 'وراثت',
    sood: 'سود', tijarat: 'تجارت', karobar: 'کاروبار',
    tawheed: 'توحید', tauheed: 'توحید', aqeedah: 'عقیدہ', aqeeda: 'عقیدہ', shirk: 'شرک', biddat: 'بدعت',
    hadith: 'حدیث', hadees: 'حدیث', sunnat: 'سنت', sunnah: 'سنت',
    quran: 'قرآن', tafseer: 'تفسیر', seerat: 'سیرت',
    masjid: 'مسجد', masajid: 'مساجد', mosque: 'مسجد',
    fatwa: 'فتویٰ', fatawa: 'فتاویٰ', darulifta: 'دارالافتاء',
    kitab: 'کتاب', kutub: 'کتب', book: 'کتاب', library: 'مکتبہ',
    aljama: 'الجماعۃ', magazine: 'مجلہ', mujallah: 'مجلہ',
    juma: 'جمعہ', khutba: 'خطبہ',
    jamiat: 'جمعیت', mumbai: 'ممبئی', ahlehadees: 'اہل حدیث', salafi: 'سلفی',
    aina: 'آئینہ', aaina: 'آئینہ', press: 'پریس ریلیز', hilal: 'ہلال', moon: 'ہلال',
    video: 'ویڈیو', bayan: 'بیان', dars: 'درس'
  };

  function normalizeClientText(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[ةۀھه]/g, 'ہ')
      .replace(/[يىےئ]/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ؤ/g, 'و')
      .replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function expandClientTokens(rawQuery) {
    var norm = normalizeClientText(rawQuery);
    if (!norm) return [];
    var words = norm.split(' ').filter(Boolean);
    var out = [norm];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (out.indexOf(w) === -1) out.push(w);
      if (ROMAN_URDU_MAP[w]) {
        var mapped = normalizeClientText(ROMAN_URDU_MAP[w]);
        if (mapped && out.indexOf(mapped) === -1) out.push(mapped);
      }
    }
    return out;
  }

  function resolvePortalUrl(url) {
    if (!url) return '/';
    if (window.__SJAHM_BASE_ROOT__ && url.charAt(0) === '/' && url.indexOf(window.__SJAHM_BASE_ROOT__) !== 0) {
      return window.__SJAHM_BASE_ROOT__ + url;
    }
    return url;
  }

  // Preloaded Client-Side Corpus for 0ms Search
  var clientCorpus = null;
  var clientCorpusPromise = null;

  function loadClientSearchCorpus() {
    if (clientCorpus) return Promise.resolve(clientCorpus);
    if (clientCorpusPromise) return clientCorpusPromise;
    var indexUrl = resolvePortalUrl('/api/global-search-index.json');
    clientCorpusPromise = fetch(indexUrl)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var rawItems = (data && data.items) || [];
        for (var i = 0; i < rawItems.length; i++) {
          var it = rawItems[i];
          if (!it._normTitle) it._normTitle = normalizeClientText(it.title);
          if (!it._normSub) it._normSub = normalizeClientText(it.subtitle);
          if (!it._hay) it._hay = normalizeClientText((it.title || '') + ' ' + (it.subtitle || '') + ' ' + (it.snippet || ''));
        }
        clientCorpus = rawItems;
        return clientCorpus;
      })
      .catch(function () {
        clientCorpusPromise = null;
        return null;
      });
    return clientCorpusPromise;
  }

  function searchClientCorpusSync(rawQuery, categoryFilter, limit) {
    if (!clientCorpus || !clientCorpus.length) return null;
    var t0 = performance.now();
    var q = String(rawQuery || '').trim();
    var cat = String(categoryFilter || 'all').toLowerCase();
    var normQ = normalizeClientText(q);
    var tokens = expandClientTokens(q);
    var matches = [];
    var counts = { all: 0, books: 0, publications: 0, articles: 0, fatawa: 0, masajid: 0, magazine: 0, juma: 0, press: 0, media: 0 };

    for (var i = 0; i < clientCorpus.length; i++) {
      var it = clientCorpus[i];
      var nt = it._normTitle || '';
      var ns = it._normSub || '';
      var hay = it._hay || '';
      var score = 0;

      if (nt === normQ) score += 120;
      else if (nt.indexOf(normQ) === 0) score += 90;
      else if (nt.indexOf(normQ) !== -1) score += 65;

      if (ns && ns.indexOf(normQ) !== -1) score += 35;
      if (hay && hay.indexOf(normQ) !== -1) score += 20;

      for (var k = 0; k < tokens.length; k++) {
        var tk = tokens[k];
        if (!tk) continue;
        if (nt.indexOf(tk) !== -1) score += 25;
        else if (ns && ns.indexOf(tk) !== -1) score += 12;
        else if (hay && hay.indexOf(tk) !== -1) score += 6;
      }

      if (score > 0) {
        counts.all++;
        if (counts[it.categoryKey] !== undefined) counts[it.categoryKey]++;
        if (cat === 'all' || cat === it.categoryKey) {
          matches.push({
            categoryKey: it.categoryKey,
            type: it.type,
            badgeColor: it.badgeColor,
            title: it.title,
            subtitle: it.subtitle,
            snippet: it.snippet,
            url: resolvePortalUrl(it.url),
            icon: it.icon,
            score: score
          });
        }
      }
    }

    matches.sort(function (a, b) { return b.score - a.score; });
    var tookMs = Number((performance.now() - t0).toFixed(2));
    return {
      status: 'success',
      query: q,
      category: cat,
      tookMs: Math.max(0.05, tookMs),
      count: matches.length,
      categoryCounts: counts,
      results: matches.slice(0, limit || 40)
    };
  }

  // 1. Sleek Top Navigation Progress Bar + Global 3D & Instant Search CSS
  var progressBar = null;
  var progressTimer = null;

  function injectGlobalEnhancementStyles() {
    if (document.getElementById('sj-global-3d-search-styles')) return;
    var style = document.createElement('style');
    style.id = 'sj-global-3d-search-styles';
    style.textContent =
      '#sj-top-progress{position:fixed;top:0;left:0;right:0;height:3px;z-index:999999;pointer-events:none;opacity:0;transition:opacity .15s ease}' +
      '#sj-top-progress-bar{height:100%;width:0%;background:linear-gradient(90deg,#10b981,#0ea5e9,#f59e0b);box-shadow:0 0 10px rgba(16,185,129,.55);transition:width .18s cubic-bezier(.16,1,.3,1)}' +
      /* 3D Perspective & Depth Animations */
      '.sj-3d-tilt{transform-style:preserve-3d;transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s ease}' +
      '.sj-3d-reveal{opacity:0;transform:translateY(18px);transition:opacity .42s cubic-bezier(.16,1,.3,1),transform .42s cubic-bezier(.16,1,.3,1)}' +
      '.sj-3d-reveal.sj-visible{opacity:1;transform:translateY(0)}' +
      '#content .column .card{transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s ease}' +
      '#content .column .card:hover{box-shadow:0 14px 30px rgba(15,81,50,.13)}' +
      /* Live Navbar Search Dropdown */
      '.navbar .search{position:relative}' +
      '#sj-live-search-dropdown{position:absolute;top:calc(100% + 8px);left:0;width:min(450px,92vw);background:#ffffff;border:1px solid #cbd5e1;border-radius:16px;box-shadow:0 20px 44px rgba(15,23,42,.2);z-index:99999;display:none;overflow:hidden;direction:rtl;text-align:right}' +
      '#sj-live-search-dropdown.open{display:block}' +
      '.sj-ls-header{background:linear-gradient(90deg,#064e3b,#0f766e);color:#fff;padding:8px 14px;font-size:12px;display:flex;justify-content:space-between;align-items:center}' +
      '.sj-ls-list{max-height:360px;overflow-y:auto;padding:6px;overscroll-behavior:contain}' +
      '.sj-ls-item{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:9px 12px;border-radius:10px;text-decoration:none;color:#0f172a;transition:background .12s ease;border-bottom:1px solid #f1f5f9}' +
      '.sj-ls-item:hover,.sj-ls-item.active{background:#f0fdf4}' +
      '.sj-ls-title{font-family:"Mehr","Noto Nastaliq Urdu",serif;font-size:14px;font-weight:700;color:#0f172a;line-height:1.85}' +
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
    bar.style.width = '24%';
    var w = 24;
    progressTimer = setInterval(function () {
      if (w < 88) {
        w += (90 - w) * 0.18;
        bar.style.width = w.toFixed(1) + '%';
      }
    }, 100);
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
      }, 150);
    }, 100);
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

  // 2. 0ms Live Instant Search Dropdown on Navbar + /search Page Live Filtering + Ctrl+K
  function initLiveGlobalSearch() {
    injectGlobalEnhancementStyles();

    // Preload corpus during idle time so first keystroke is 0ms
    var scheduleIdle = window.requestIdleCallback || function (cb) { setTimeout(cb, 300); };
    scheduleIdle(function () {
      loadClientSearchCorpus();
    });

    // Also enhance /search dedicated page input for live instant filtering as user types
    var pageSearchInput = document.querySelector('.search-hero input[name="q"]');
    var pageSearchGrid = document.querySelector('.search-results-grid');
    if (pageSearchInput && pageSearchGrid) {
      var pageRaf = null;
      pageSearchInput.addEventListener('input', function () {
        var val = (pageSearchInput.value || '').trim();
        if (!val) return;
        if (pageRaf) cancelAnimationFrame(pageRaf);
        pageRaf = requestAnimationFrame(function () {
          var syncRes = searchClientCorpusSync(val, 'all', 45);
          if (syncRes && syncRes.results) {
            renderFullSearchGrid(pageSearchGrid, syncRes);
          } else {
            loadClientSearchCorpus().then(function () {
              var afterLoad = searchClientCorpusSync(val, 'all', 45);
              if (afterLoad && afterLoad.results) renderFullSearchGrid(pageSearchGrid, afterLoad);
            });
          }
        });
      });
    }

    var searchContainer = document.querySelector('.navbar .search');
    var searchInput = document.querySelector('.navbar .search input');
    if (!searchContainer || !searchInput) return;

    searchInput.setAttribute('placeholder', 'تلاش کریں (کتب، فتاویٰ، مضامین، مساجد، ویڈیوز)... [Ctrl+K]');

    var dropdown = document.createElement('div');
    dropdown.id = 'sj-live-search-dropdown';
    searchContainer.appendChild(dropdown);

    var rafId = null;
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
          '<span style="font-size:11px;opacity:.9;">⚡ ' + (data.tookMs || 0.1) + ' ms</span>' +
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

      var searchPageHref = resolvePortalUrl('/search?q=' + encodeURIComponent(data.query));
      var footerHtml =
        '<div class="sj-ls-footer">' +
          '<a href="' + searchPageHref + '">تمام ' + data.count + ' نتائج تفصیل سے دیکھیں <i class="fa-solid fa-arrow-left"></i></a>' +
        '</div>';

      dropdown.innerHTML = headerHtml + '<div class="sj-ls-list">' + listHtml + '</div>' + footerHtml;
      dropdown.classList.add('open');
    }

    searchInput.addEventListener('input', function () {
      var q = (searchInput.value || '').trim();
      if (rafId) cancelAnimationFrame(rafId);
      if (q.length < 1) {
        dropdown.classList.remove('open');
        lastQuery = '';
        return;
      }
      if (q === lastQuery) return;
      lastQuery = q;

      rafId = requestAnimationFrame(function () {
        var localFast = searchClientCorpusSync(q, 'all', 8);
        if (localFast) {
          renderDropdown(localFast);
          return;
        }
        fetch(resolvePortalUrl('/api/global-search?q=' + encodeURIComponent(q) + '&limit=8'))
          .then(function (r) { return r.json(); })
          .then(renderDropdown)
          .catch(function () {});
      });
    });

    searchInput.addEventListener('focus', function () {
      loadClientSearchCorpus();
      if ((searchInput.value || '').trim().length > 0 && dropdown.innerHTML) {
        dropdown.classList.add('open');
      }
    });

    document.addEventListener('click', function (e) {
      if (!searchContainer.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });

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

  function renderFullSearchGrid(gridEl, res) {
    if (!gridEl || !res) return;
    var items = res.results || [];
    if (!items.length) {
      gridEl.innerHTML = '<div style="background:#fff;border-radius:16px;padding:32px;text-align:center;color:#64748b;">کوئی نتیجہ نہیں ملا۔</div>';
      return;
    }
    gridEl.innerHTML = items.map(function (item) {
      return '<a href="' + item.url + '" class="search-result-card" style="display:flex;gap:16px;background:#fff;border-radius:16px;padding:20px;border:1px solid #e2e8f0;text-decoration:none;color:inherit;box-shadow:0 6px 18px rgba(15,23,42,0.05);">' +
        '<div style="width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.3rem;flex-shrink:0;background:' + (item.badgeColor || '#0f5132') + '"><i class="fa-solid ' + (item.icon || 'fa-file-lines') + '"></i></div>' +
        '<div style="flex:1;min-width:0;">' +
          '<span style="background:' + (item.badgeColor || '#0f5132') + '18;color:' + (item.badgeColor || '#0f5132') + ';border:1px solid ' + (item.badgeColor || '#0f5132') + '40;padding:2px 10px;border-radius:999px;font-size:0.8rem;font-weight:700;">' + item.type + '</span>' +
          '<h3 style="margin:6px 0 4px;font-size:1.25rem;color:#0f172a;font-weight:700;">' + item.title + '</h3>' +
          (item.subtitle ? '<div style="font-size:0.92rem;color:#0f5132;font-weight:600;margin-bottom:4px;">' + item.subtitle + '</div>' : '') +
          (item.snippet ? '<p style="margin:0;font-size:0.92rem;color:#475569;">' + item.snippet + '</p>' : '') +
        '</div></a>';
    }).join('');
  }

  // 3. Hardware-Accelerated RAF-Throttled 3D Perspective Tilt & Scroll Reveal Engine
  function init3DAnimations() {
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('sj-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.06, rootMargin: '120px 0px' });

      document.querySelectorAll('.sj-3d-reveal').forEach(function (el) {
        observer.observe(el);
      });
    } else {
      document.querySelectorAll('.sj-3d-reveal').forEach(function (el) {
        el.classList.add('sj-visible');
      });
    }

    // Skip mousemove 3D tilt on low-end or coarse touch devices to keep scrolling 100% butter-smooth
    if (isLowEndDevice || isCoarsePointer) return;

    var tiltSelector = '.sj-3d-card, .sj-result-card, .book-card, .article-card, .pr-card';
    var activeCard = null;
    var cachedRect = null;
    var tiltRaf = null;

    document.addEventListener('mouseover', function (e) {
      var card = e.target && e.target.closest ? e.target.closest(tiltSelector) : null;
      if (card && card !== activeCard) {
        activeCard = card;
        cachedRect = card.getBoundingClientRect();
      }
    }, { passive: true });

    document.addEventListener('mousemove', function (e) {
      if (!activeCard || !cachedRect || tiltRaf) return;
      var cx = e.clientX;
      var cy = e.clientY;
      tiltRaf = requestAnimationFrame(function () {
        tiltRaf = null;
        if (!activeCard || !cachedRect || cachedRect.width < 80 || cachedRect.height < 60) return;
        var x = cx - cachedRect.left;
        var y = cy - cachedRect.top;
        var rotateY = ((x / cachedRect.width) - 0.5) * 6;
        var rotateX = (0.5 - (y / cachedRect.height)) * 6;
        activeCard.style.transform = 'perspective(900px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg) translateZ(4px)';
      });
    }, { passive: true });

    document.addEventListener('mouseout', function (e) {
      if (!activeCard) return;
      if (!activeCard.contains(e.relatedTarget)) {
        activeCard.style.transform = '';
        activeCard = null;
        cachedRect = null;
      }
    }, { passive: true });

    window.addEventListener('scroll', function () {
      if (activeCard) {
        activeCard.style.transform = '';
        activeCard = null;
        cachedRect = null;
      }
    }, { passive: true });
  }

  // 4. Native Browser Speculation Rules API (Prefetch + Prerender for Instant 0ms Navigation)
  function injectSpeculationRules() {
    if (HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
      if (document.getElementById('sj-speculation-rules')) return;
      var specScript = document.createElement('script');
      specScript.id = 'sj-speculation-rules';
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
            eagerness: 'eager'
          }
        ],
        prerender: [
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
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (!img.hasAttribute('loading')) {
        if (i > 2 && !img.closest('.logo') && !img.closest('header') && !img.closest('.yt-inst-topbar')) {
          img.setAttribute('loading', 'lazy');
        }
      }
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
    }
  }

  // 6. Instant Zero-Delay Page Prefetching on Hover, Pointerdown, Touchstart & Idle Navbar Warmup
  var prefetchedUrls = {};
  var prefetchQueueCount = 0;

  function prefetchUrl(url, highPriority) {
    if (!url || prefetchedUrls[url]) return;
    try {
      var parsed = new URL(url, window.location.origin);
      if (parsed.origin !== window.location.origin) return;
      if (parsed.href === window.location.href) return;
      if (/\/(admin|dashboard|logout|api|delete)/i.test(parsed.pathname)) return;
      prefetchedUrls[url] = true;
      prefetchedUrls[parsed.href] = true;

      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = parsed.href;
      link.as = 'document';
      document.head.appendChild(link);

      // Warm browser/SW cache immediately on highPriority (hover/pointerdown/touchstart)
      if (highPriority && window.fetch) {
        fetch(parsed.href, { credentials: 'same-origin', headers: { 'x-sj-prefetch': '1' } }).catch(function () {});
      }
    } catch (_) {}
  }

  function initInstantPrefetch() {
    function handleLinkTrigger(e, highPriority) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || a.target === '_blank' || a.hasAttribute('download')) return;
      prefetchUrl(a.href, highPriority);
    }

    document.addEventListener('mouseover', function (e) {
      handleLinkTrigger(e, true);
    }, { passive: true });

    document.addEventListener('pointerdown', function (e) {
      handleLinkTrigger(e, true);
    }, { passive: true });

    document.addEventListener('touchstart', function (e) {
      handleLinkTrigger(e, true);
    }, { passive: true });

    // Pre-warm primary navigation links during browser idle time so first click is instant
    var runIdle = window.requestIdleCallback || function (cb) { setTimeout(cb, 650); };
    runIdle(function () {
      if (navigator.connection && navigator.connection.saveData) return;
      var navLinks = document.querySelectorAll('.navbar a[href], .yt-inst-nav-pills a[href], nav a[href]');
      for (var i = 0; i < navLinks.length && prefetchQueueCount < 14; i++) {
        var href = navLinks[i].getAttribute('href');
        if (href && href.charAt(0) !== '#' && href.indexOf('javascript:') !== 0 && navLinks[i].target !== '_blank') {
          prefetchQueueCount++;
          (function (u, delay) {
            setTimeout(function () { prefetchUrl(u, false); }, delay);
          })(navLinks[i].href, prefetchQueueCount * 90);
        }
      }
    });
  }

  // 7. Register PWA Service Worker (Works at both root '/' and '/subai-jamiat-portal/')
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        var swUrl = resolvePortalUrl('/sw.js');
        navigator.serviceWorker.register(swUrl).catch(function () {});
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
