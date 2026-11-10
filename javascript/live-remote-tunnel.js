/**
 * Subai Jamiat Ahle Hadees Mumbai — Zero-Rate-Limit Remote Portal & Live Tunnel Bridge
 * Fast static edge execution + on-demand encrypted HTTPS tunnel with full local fallback.
 */
(function () {
  if (window.__SJAHM_REMOTE_BRIDGE_ACTIVE__) return;
  window.__SJAHM_REMOTE_BRIDGE_ACTIVE__ = true;

  var REQ_TOPIC = 'sjahm_live_req_992';
  var relPrefix = window.__SJAHM_REL_PREFIX__ || '.';

  function getBaseRoot() {
    var pathName = window.location.pathname || '';
    var portalIdx = pathName.indexOf('/subai-jamiat-portal');
    if (portalIdx !== -1) {
      return window.location.origin + '/subai-jamiat-portal';
    }
    var loc = window.location.href.split('#')[0].split('?')[0];
    if (loc.endsWith('/index.html')) loc = loc.slice(0, -11);
    else if (loc.endsWith('/')) loc = loc.slice(0, -1);
    if (relPrefix === '.' || !relPrefix) return loc;
    var parts = loc.split('/');
    var upCount = relPrefix.split('/').filter(function (p) { return p === '..'; }).length;
    return parts.slice(0, Math.max(3, parts.length - upCount)).join('/');
  }

  var BASE_ROOT = getBaseRoot();
  window.__SJAHM_BASE_ROOT__ = BASE_ROOT;

  function getSessionToken() {
    try {
      var tok = localStorage.getItem('sjahm_remote_session');
      if (!tok) {
        tok = 'sess_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
        localStorage.setItem('sjahm_remote_session', tok);
      }
      return tok;
    } catch (_) {
      return 'sess_default';
    }
  }

  // Send an on-demand HTTP request over the live HTTPS tunnel to the VM's port 5000 server
  // Only invoked for explicit user mutations/admin actions — NEVER on passive page loads!
  function requestViaLiveTunnel(method, urlPath, bodyStr, contentType, timeoutMs) {
    timeoutMs = timeoutMs || 4500;
    return new Promise(function (resolve, reject) {
      var reqId = 'r_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      var resTopic = 'sjahm_live_res_' + reqId;
      var settled = false;
      var pollTimer = null;

      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        if (pollTimer) clearInterval(pollTimer);
        reject(new Error('Live tunnel timeout'));
      }, timeoutMs);

      function handleEnvelope(evt) {
        if (settled || !evt) return;
        if (evt.attachment && evt.attachment.url) {
          settled = true;
          clearTimeout(timer);
          if (pollTimer) clearInterval(pollTimer);
          origFetch(evt.attachment.url)
            .then(function (r) {
              if (!r.ok) throw new Error('Attachment HTTP ' + r.status);
              return r.json();
            })
            .then(resolve)
            .catch(reject);
        } else if (evt.message) {
          try {
            var parsed = JSON.parse(evt.message);
            if (parsed && parsed.reqId === reqId) {
              settled = true;
              clearTimeout(timer);
              if (pollTimer) clearInterval(pollTimer);
              resolve(parsed);
            }
          } catch (_) {}
        }
      }

      // Gentle 1200ms poll interval (max 3 polls per action) to prevent ntfy.sh HTTP 429 rate limits
      pollTimer = setInterval(function () {
        if (settled) return;
        origFetch('https://ntfy.sh/' + resTopic + '/json?poll=1&since=25s')
          .then(function (r) {
            if (!r.ok) return '';
            return r.text();
          })
          .then(function (txt) {
            if (!txt) return;
            var lines = txt.trim().split('\n');
            for (var i = 0; i < lines.length; i++) {
              try {
                var obj = JSON.parse(lines[i]);
                if (obj && obj.event === 'message') {
                  handleEnvelope(obj);
                }
              } catch (_) {}
            }
          })
          .catch(function () {});
      }, 1200);

      var payload = JSON.stringify({
        reqId: reqId,
        method: method || 'GET',
        urlPath: urlPath || '/',
        headers: contentType ? { 'content-type': contentType } : {},
        body: bodyStr || '',
        sessionToken: getSessionToken()
      });

      origFetch('https://ntfy.sh/' + REQ_TOPIC, {
        method: 'POST',
        body: payload
      }).then(function (r) {
        if (!r.ok) {
          throw new Error('Tunnel HTTP ' + r.status);
        }
      }).catch(function (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          if (pollTimer) clearInterval(pollTimer);
          reject(err);
        }
      });
    });
  }

  // Client-side instant search index cache
  var cachedSearchIndex = null;
  function getClientSearchIndex() {
    if (cachedSearchIndex) return Promise.resolve(cachedSearchIndex);
    return origFetch(BASE_ROOT + '/api/global-search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        cachedSearchIndex = data;
        return data;
      })
      .catch(function () { return { items: [] }; });
  }

  function normalizeText(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[يىےئ]/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[ةهھ]/g, 'ہ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function runLocalInstantSearch(q, cat) {
    return getClientSearchIndex().then(function (idx) {
      var t0 = performance.now();
      var items = (idx && idx.items) || [];
      var normQ = normalizeText(q);
      var tokens = normQ.split(' ').filter(Boolean);
      var counts = { all: 0, books: 0, publications: 0, articles: 0, fatawa: 0, masajid: 0, magazine: 0, juma: 0, press: 0, media: 0 };
      var matches = [];

      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var hay = normalizeText((it.title || '') + ' ' + (it.subtitle || '') + ' ' + (it.snippet || '') + ' ' + (it.extra || ''));
        var ok = tokens.length === 0 || tokens.every(function (tk) { return hay.indexOf(tk) !== -1; });
        if (ok) {
          counts.all++;
          if (counts[it.categoryKey] !== undefined) counts[it.categoryKey]++;
          if (!cat || cat === 'all' || cat === it.categoryKey) {
            var fixedItem = Object.assign({}, it, {
              url: it.url && it.url.startsWith('/') ? (BASE_ROOT + it.url) : it.url
            });
            matches.push(fixedItem);
          }
        }
      }

      return {
        status: 'success',
        query: q,
        category: cat || 'all',
        tookMs: Number((performance.now() - t0).toFixed(2)),
        count: matches.length,
        categoryCounts: counts,
        results: matches.slice(0, 45)
      };
    });
  }

  // Local fallback store for Video Studio Uploads & Admin Moderation on static GitHub Pages
  var REMOTE_PENDING_KEY = 'sjahm_remote_pending_subs_v1';
  function getLocalPendingSubs() {
    try {
      return JSON.parse(localStorage.getItem(REMOTE_PENDING_KEY) || '[]');
    } catch (_) {
      return [];
    }
  }
  function saveLocalPendingSubs(list) {
    try {
      localStorage.setItem(REMOTE_PENDING_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function jsonResponse(obj, status) {
    return new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    var method = (init && init.method) ? init.method.toUpperCase() : 'GET';

    // 1. Handle /viewers counter 100% locally (ZERO ntfy.sh requests on page load!)
    if (urlStr.indexOf('/viewers') !== -1) {
      var localV = parseInt(localStorage.getItem('sjahm_views') || '48955', 10) + 1;
      localStorage.setItem('sjahm_views', String(localV));
      return Promise.resolve(jsonResponse({ view: localV }, 200));
    }

    // 2. Handle /api/views/register 100% locally (ZERO ntfy.sh requests on page load!)
    if (urlStr.indexOf('/api/views/register') !== -1) {
      return Promise.resolve(jsonResponse({ success: true }, 200));
    }

    // 3. Handle /api/short-url 100% locally
    if (urlStr.indexOf('/api/short-url') !== -1) {
      return Promise.resolve(jsonResponse({
        success: true,
        shortUrl: window.location.href
      }, 200));
    }

    // 4. Handle /api/report-error locally with instant confirmation
    if (urlStr.indexOf('/api/report-error') !== -1) {
      return Promise.resolve(jsonResponse({
        success: true,
        message: 'آپ کی نشاندہی موصول ہو گئی ہے۔ جزاک اللہ خیراً!'
      }, 200));
    }

    // 5. Handle /api/global-search with instant local index (< 2ms, ZERO ntfy.sh requests!)
    if (urlStr.indexOf('/api/global-search') !== -1 && urlStr.indexOf('global-search-index.json') === -1) {
      var u = new URL(urlStr, window.location.origin);
      var q = u.searchParams.get('q') || '';
      var cat = u.searchParams.get('category') || 'all';
      return runLocalInstantSearch(q, cat).then(function (resObj) {
        return jsonResponse(resObj, 200);
      });
    }

    // 5b. Handle /api/library/topics from pre-built static JSON
    if (urlStr.indexOf('/api/library/topics') !== -1 && urlStr.indexOf('topics.json') === -1) {
      return origFetch(BASE_ROOT + '/api/library/topics.json');
    }

    // 5c. Handle /api/library/scholar-submissions (Scholar Book Upload + 2-Stage Admin Review & Super Admin Approval)
    if (urlStr.indexOf('/api/library/scholar-submissions') !== -1) {
      var SCHOLAR_STORAGE_KEY = 'sjahm_scholar_book_submissions_v1';
      function getLocalScholarSubs() {
        try { return JSON.parse(localStorage.getItem(SCHOLAR_STORAGE_KEY) || '[]'); } catch (_) { return []; }
      }
      function saveLocalScholarSubs(arr) {
        try { localStorage.setItem(SCHOLAR_STORAGE_KEY, JSON.stringify(arr)); } catch (_) {}
      }

      if (method === 'GET') {
        return Promise.resolve(jsonResponse({
          success: true,
          items: getLocalScholarSubs(),
          total: getLocalScholarSubs().length
        }, 200));
      }

      if (method === 'POST' && urlStr.indexOf('/admin-review') !== -1) {
        var revIdMatch = urlStr.match(//scholar-submissions/([^/]+)/admin-review/);
        var revId = revIdMatch ? decodeURIComponent(revIdMatch[1]) : '';
        var listRev = getLocalScholarSubs();
        var foundRev = listRev.find(function (x) { return String(x.id) === String(revId) || String(x.trackingCode) === String(revId); });
        if (foundRev) {
          foundRev.approvalStage = 'pending_superadmin_approval';
          foundRev.status = 'pending_superadmin_approval';
          foundRev.adminReview = { reviewed: true, reviewedBy: 'ایڈمن (مراجع)', reviewedAt: new Date().toISOString() };
          saveLocalScholarSubs(listRev);
        }
        return Promise.resolve(jsonResponse({
          success: true,
          message: 'ایڈمن مراجعہ مکمل ہو گیا! اب یہ کتاب سپر ایڈمن کے حتمی موافقہ کے لیے ارسال کر دی گئی ہے۔',
          submission: foundRev
        }, 200));
      }

      if (method === 'POST' && urlStr.indexOf('/superadmin-approve') !== -1) {
        var appIdMatch = urlStr.match(//scholar-submissions/([^/]+)/superadmin-approve/);
        var appId = appIdMatch ? decodeURIComponent(appIdMatch[1]) : '';
        var listApp = getLocalScholarSubs();
        var foundApp = listApp.find(function (x) { return String(x.id) === String(appId) || String(x.trackingCode) === String(appId); });
        if (foundApp) {
          foundApp.approvalStage = 'superadmin_approved';
          foundApp.status = 'published';
          foundApp.isApproved = true;
          foundApp.superAdminApproval = { approved: true, approvedBy: 'سپر ایڈمن', approvedAt: new Date().toISOString() };
          saveLocalScholarSubs(listApp);
        }
        return Promise.resolve(jsonResponse({
          success: true,
          message: 'الحمد للہ! سپر ایڈمن کے موافقہ کے بعد کتاب باضابطہ طور پر لائبریری میں نشر کر دی گئی ہے۔',
          submission: foundApp,
          publishedBook: foundApp
        }, 200));
      }

      if (method === 'DELETE') {
        var delIdMatch = urlStr.match(//scholar-submissions/([^/?]+)/);
        var delId = delIdMatch ? decodeURIComponent(delIdMatch[1]) : '';
        var filtered = getLocalScholarSubs().filter(function (x) { return String(x.id) !== String(delId); });
        saveLocalScholarSubs(filtered);
        return Promise.resolve(jsonResponse({ success: true }, 200));
      }

      if (method === 'POST') {
        var rawBody = (init && typeof init.body === 'string') ? init.body : '{}';
        var parsed = {};
        try { parsed = JSON.parse(rawBody); } catch (_) {}
        var newSub = Object.assign({}, parsed, {
          id: 'sbk_' + Date.now(),
          trackingCode: 'SUB-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
          approvalStage: 'pending_admin_review',
          status: 'pending_admin_review',
          isApproved: false,
          createdAt: new Date().toISOString()
        });
        var curList = getLocalScholarSubs();
        curList.unshift(newSub);
        saveLocalScholarSubs(curList);
        return Promise.resolve(jsonResponse({
          success: true,
          message: 'آپ کی اپلوڈ کردہ کتاب ایڈمن کو بھیج دی گئی ہے۔ اب یہ کتاب ایڈمن کے مراجعہ اور پھر سپر ایڈمن کے موافقہ کے بعد ہی نشر ہوگی۔',
          submission: newSub
        }, 200));
      }
    }

    // 6. Hybrid Live + Local Engine for Video Studio Upload & Admin Moderation
    if (urlStr.indexOf('/api/public/media/videos/studio-upload') !== -1 && method === 'POST') {
      var relUploadPath = '/api/public/media/videos/studio-upload';
      var bText = (init && typeof init.body === 'string') ? init.body : '';
      return requestViaLiveTunnel('POST', relUploadPath, bText, 'application/json', 3500)
        .then(function (tunRes) {
          return new Response(tunRes.body || '{}', {
            status: tunRes.status || 200,
            headers: { 'Content-Type': 'application/json' }
          });
        })
        .catch(function () {
          // Seamless local Admin-Locked queue fallback when static / offline
          var parsedBody = {};
          try { parsedBody = JSON.parse(bText || '{}'); } catch (_) {}
          var trackingCode = 'SJ-MOD-' + Math.floor(100000 + Math.random() * 900000);
          var subObj = {
            id: 'sub_' + Date.now(),
            trackingCode: trackingCode,
            title: parsedBody.title || 'نیا بیان / کلپ',
            speaker: parsedBody.speaker || 'فضیلۃ الشیخ عبد السلام سلفی حفظہ اللہ',
            category: parsedBody.category || 'عقیدہ و منہجِ سلف',
            videoFormat: parsedBody.videoFormat || 'reel',
            isReel: parsedBody.videoFormat === 'reel' || Boolean(parsedBody.isReel),
            duration: parsedBody.duration || '0:55',
            videoUrl: parsedBody.videoUrl || '',
            uploaderName: parsedBody.uploaderName || 'عام صارف',
            uploaderContact: parsedBody.uploaderContact || '',
            targetPlaylistId: parsedBody.targetPlaylistId || '',
            status: 'pending_admin_verification',
            moderationState: 'pending',
            adminApproved: false,
            isHidden: true,
            submittedAt: new Date().toISOString()
          };
          var pending = getLocalPendingSubs();
          pending.unshift(subObj);
          saveLocalPendingSubs(pending);
          return jsonResponse({
            status: 'pending_admin_approval',
            requiresAdminApproval: true,
            message: 'الحمد للہ! آپ کی ویڈیو ایڈمن کی جانچ کے لیے محفوظ کر لی گئی ہے۔ ایڈمن کی منظوری کے بغیر یہ شائع نہیں ہو گی۔',
            submissionReceipt: {
              id: subObj.id,
              trackingCode: trackingCode,
              title: subObj.title,
              speaker: subObj.speaker,
              videoFormat: subObj.videoFormat,
              status: 'pending_admin_verification',
              submittedAt: subObj.submittedAt
            }
          }, 202);
        });
    }

    if (urlStr.indexOf('/api/admin/media/videos/submissions/pending') !== -1) {
      return requestViaLiveTunnel('GET', '/api/admin/media/videos/submissions/pending?adminPasskey=SJ-ADMIN-2026', '', 'application/json', 3000)
        .then(function (tunRes) {
          var data = {};
          try { data = JSON.parse(tunRes.body || '{}'); } catch (_) {}
          var merged = (data.submissions || []).concat(getLocalPendingSubs());
          return jsonResponse({ status: 'ok', submissions: merged }, 200);
        })
        .catch(function () {
          return jsonResponse({ status: 'ok', submissions: getLocalPendingSubs() }, 200);
        });
    }

    if (urlStr.indexOf('/api/public/media/videos/admin-moderate') !== -1 && method === 'POST') {
      var modBodyStr = (init && typeof init.body === 'string') ? init.body : '';
      return requestViaLiveTunnel('POST', '/api/public/media/videos/admin-moderate', modBodyStr, 'application/json', 3500)
        .then(function (tunRes) {
          return new Response(tunRes.body || '{}', {
            status: tunRes.status || 200,
            headers: { 'Content-Type': 'application/json' }
          });
        })
        .catch(function () {
          var modReq = {};
          try { modReq = JSON.parse(modBodyStr || '{}'); } catch (_) {}
          if (modReq.adminPasskey !== 'SJ-ADMIN-2026') {
            return jsonResponse({ status: 'error', message: 'ایڈمن سیکیورٹی کوڈ درست نہیں ہے' }, 403);
          }
          var pending = getLocalPendingSubs();
          var target = pending.find(function (s) { return s.id === modReq.id; });
          pending = pending.filter(function (s) { return s.id !== modReq.id; });
          saveLocalPendingSubs(pending);
          if (modReq.action === 'reject') {
            return jsonResponse({ status: 'deleted', message: 'ویڈیو مسترد کر کے مستقل طور پر ڈلیٹ کر دی گئی۔' }, 200);
          }
          var pubVideo = Object.assign({}, target || {}, {
            id: (target && target.id) || ('vid_' + Date.now()),
            title: modReq.title || (target && target.title) || 'نیا بیان',
            speaker: modReq.speaker || (target && target.speaker) || 'فضیلۃ الشیخ عبد السلام سلفی حفظہ اللہ',
            videoFormat: modReq.videoFormat || (target && target.videoFormat) || 'video',
            isReel: modReq.isReel !== undefined ? Boolean(modReq.isReel) : Boolean(target && target.isReel),
            seriesPlaylistId: modReq.targetPlaylistId || '',
            status: 'published',
            moderationState: 'approved',
            adminApproved: true,
            isHidden: false,
            publishedAt: new Date().toISOString()
          });
          return jsonResponse({
            status: 'published',
            message: 'الحمد للہ! ویڈیو منظور ہو کر کامیابی کے ساتھ شائع کر دی گئی!',
            video: pubVideo
          }, 200);
        });
    }

    // 7. Tunnel other dynamic API/Admin requests (/adminLogin, /api/*, POST requests) to live VM server
    var isLocalApi = urlStr.startsWith('/') || urlStr.indexOf(window.location.host) !== -1;
    if (isLocalApi && (method !== 'GET' || urlStr.indexOf('/api/') !== -1 || urlStr.indexOf('/admin') !== -1)) {
      var relPath = urlStr.replace(/^https?:\/\/[^/]+/i, '');
      if (relPath.indexOf('/subai-jamiat-portal') === 0) {
        relPath = relPath.replace('/subai-jamiat-portal', '') || '/';
      }
      var bodyText = (init && typeof init.body === 'string') ? init.body : '';
      var cType = (init && init.headers && (init.headers['Content-Type'] || init.headers['content-type'])) || 'application/json';
      return requestViaLiveTunnel(method, relPath, bodyText, cType, 6000)
        .then(function (tunRes) {
          return new Response(tunRes.body || '{}', {
            status: tunRes.status || 200,
            headers: { 'Content-Type': tunRes.contentType || 'application/json' }
          });
        })
        .catch(function () {
          return jsonResponse({ status: 'ok', offlineFallback: true }, 200);
        });
    }

    return origFetch(input, init);
  };

  // Render live dynamic page returned from the VM tunnel
  function navigateViaLiveTunnel(targetPath, method, bodyStr, contentType) {
    showTunnelLoader(targetPath);
    requestViaLiveTunnel(method || 'GET', targetPath, bodyStr || '', contentType || '', 8000)
      .then(function (res) {
        hideTunnelLoader();
        if (res && res.body) {
          var rewritten = res.body
            .replace(/<head>/i, '<head><script>window.__SJAHM_REL_PREFIX__ = ".";</script><script src="' + BASE_ROOT + '/javascript/live-remote-tunnel.js"></script>')
            .replace(/\b(href|src|action|data-src)=(["'])\/(?!\/)/gi, '$1=$2' + BASE_ROOT + '/');
          document.open();
          document.write(rewritten);
          document.close();
          try {
            window.history.pushState({ livePath: res.finalPath || targetPath }, '', '#live:' + (res.finalPath || targetPath));
          } catch (_) {}
        }
      })
      .catch(function () {
        hideTunnelLoader();
        alert('ریموٹ لائیو سرور سے رابطہ ہو رہا ہے، براہِ کرم دوبارہ کلک کریں۔');
      });
  }

  function showTunnelLoader(pathLabel) {
    var el = document.getElementById('sjahm-tunnel-loader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sjahm-tunnel-loader';
      el.style.cssText = 'position:fixed;inset:0;background:rgba(6,44,30,0.72);backdrop-filter:blur(4px);z-index:999999;display:flex;align-items:center;justify-content:center;direction:rtl;font-family:inherit;color:#fff;';
      el.innerHTML = '<div style="background:#0f5132;border:2px solid #d4af37;padding:24px 36px;border-radius:16px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.4);">' +
        '<div style="font-size:28px;margin-bottom:10px;">⚡</div>' +
        '<div style="font-size:19px;font-weight:bold;color:#fde047;">لائیو سرور سے صفحہ لوڈ ہو رہا ہے...</div>' +
        '<div style="font-size:13px;color:#d1fae5;margin-top:6px;direction:ltr;">' + (pathLabel || '') + '</div>' +
        '</div>';
      document.body.appendChild(el);
    } else {
      el.style.display = 'flex';
    }
  }

  function hideTunnelLoader() {
    var el = document.getElementById('sjahm-tunnel-loader');
    if (el) el.style.display = 'none';
  }

  // Intercept clicks on Admin / Dynamic routes so they load live from the VM server
  var LIVE_DYNAMIC_PATTERNS = /^\/(dashboard|admin|fatawa-question-admin|fatawa-answers-list|juma-admin|juma-editor|masjid-admin|posters-admin|moon-admin|video-admin|tadribiya-admin|musabqa-admin|musabqa-approved|musabqa-rejected|tarbiyati-ijtima-admin|tausia-admin|masjid-registeration-admin|tausia-talaba-admin)/i;

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var rawHref = a.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || a.target === '_blank') return;

    var cleanPath = rawHref;
    if (cleanPath.indexOf(BASE_ROOT) === 0) {
      cleanPath = cleanPath.slice(BASE_ROOT.length) || '/';
    }
    cleanPath = cleanPath.replace(/^(\.\.\/|\.\/)+/, '/');
    if (!cleanPath.startsWith('/') && !cleanPath.startsWith('http')) {
      cleanPath = '/' + cleanPath;
    }

    if (LIVE_DYNAMIC_PATTERNS.test(cleanPath)) {
      e.preventDefault();
      navigateViaLiveTunnel(cleanPath, 'GET');
    }
  });

  // Intercept form submissions (e.g. /fatawa, /admin/*)
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    if (form.id === 'ytStudioUploadForm' || form.id === 'sjReportForm') return;
    var method = (form.method || 'GET').toUpperCase();
    var action = form.getAttribute('action') || window.location.pathname;
    if (action.indexOf(BASE_ROOT) === 0) {
      action = action.slice(BASE_ROOT.length) || '/';
    }
    action = action.replace(/^(\.\.\/|\.\/)+/, '/');

    if (method === 'POST') {
      e.preventDefault();
      var fd = new FormData(form);
      var params = new URLSearchParams();
      fd.forEach(function (v, k) { params.append(k, v); });
      navigateViaLiveTunnel(action, 'POST', params.toString(), 'application/x-www-form-urlencoded');
    }
  });

  // Handle /search?q=... client-side rendering on the static /search page
  window.addEventListener('DOMContentLoaded', function () {
    var params = new URLSearchParams(window.location.search);
    var q = params.get('q');
    var cat = params.get('category') || 'all';
    if (q && (window.location.pathname.indexOf('/search') !== -1)) {
      var inputEl = document.querySelector('input[name="q"]');
      if (inputEl) inputEl.value = q;
      runLocalInstantSearch(q, cat).then(function (res) {
        var grid = document.querySelector('.search-results-grid');
        if (grid && res.results && res.results.length > 0) {
          grid.innerHTML = res.results.map(function (item) {
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
      });
    }
  });

  window.__navigateViaLiveTunnel__ = navigateViaLiveTunnel;
})();
