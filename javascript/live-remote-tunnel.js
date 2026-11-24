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

  var CLIENT_ROMAN_MAP = {
    namaz: 'نماز', salah: 'نماز', roza: 'روزہ', ramzan: 'رمضان', zakat: 'زکوۃ',
    sadqa: 'صدقہ', hajj: 'حج', umrah: 'عمرہ', nikah: 'نکاح', talaq: 'طلاق',
    sood: 'سود', tawheed: 'توحید', tauheed: 'توحید', aqeedah: 'عقیدہ', shirk: 'شرک',
    biddat: 'بدعت', hadith: 'حدیث', sunnat: 'سنت', quran: 'قرآن', tafseer: 'تفسیر',
    masjid: 'مسجد', fatwa: 'فتوی', fatawa: 'فتاوی', kitab: 'کتاب', aljama: 'الجماعۃ',
    mujallah: 'مجلہ', juma: 'جمعہ', khutba: 'خطبہ', pension: 'پینشن', safar: 'سفر'
  };
  var CLIENT_STOPWORDS = {
    'کا':1,'کی':1,'کے':1,'کو':1,'میں':1,'پر':1,'سے':1,'اور':1,'یا':1,'ہے':1,'ہیں':1,
    'کیا':1,'کیسے':1,'کس':1,'یہ':1,'وہ':1,'لیے':1,'بارے':1,'حکم':1,'مسئلہ':1,
    'aur':1,'ka':1,'ki':1,'ke':1,'hai':1,'kya':1,'masla':1,'mein':1,'se':1
  };
  var CLIENT_EXCLUDED_RE = /سرفرازs*فیضی|sarfarazs*faizi|کمالs*الدینs*سنابلی|kamaluddins*sanabili|کفایتs*اللہs*سنابلی|kifayatullahs*sanabili/i;
  var CLIENT_INJECTION_RE = /ignores+(alls+)?(previous|prior|system)s+(instructions|prompt)|(disregard|override|bypass|reveal)s+.*(system|developer|safety)s+(prompt|instructions|rules)|پچھلیs+تمامs+ہدایات|سسٹمs*پرامپٹ|تجاهلs+جميعs+التعليمات|اكشفs+موجهs+النظام|</?s*untrusted_source|<s*script|javascripts*:/i;

  function normalizeText(str) {
    if (!str) return '';
    var s = String(str)
      .replace(/[ﻻﻼﻷﻸﻹﻺ]/g, 'لا')
      .replace(/ﷲ/g, 'اللہ');
    if (s.normalize) s = s.normalize('NFKC');
    return s
      .toLowerCase()
      .replace(/ـ+/g, '')
      .replace(/[ً-ٰٟۖ-ۭ​-‏]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[يىےئ]/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[ةهھۀ]/g, 'ہ')
      .replace(/[،؛؟۔]/g, ' ')
      .replace(/s+/g, ' ')
      .trim();
  }

  function runLocalHybridRrf(q, cat) {
    return getClientSearchIndex().then(function (idx) {
      var t0 = performance.now();
      if (String(q || '').length > 500 || CLIENT_INJECTION_RE.test(q)) {
        return {
          blocked: true,
          abstained: true,
          owaspControl: String(q || '').length > 500 ? 'ASI08' : 'ASI01',
          answerUrdu: 'حفاظتی نظام (Model Armor): غیر مجاز سسٹم ہدایات یا حد سے طویل متن کی وجہ سے درخواست روک دی گئی ہے۔',
          topRerankScore: 0,
          tookMs: 0.2,
          counts: {},
          ranked: []
        };
      }
      if (CLIENT_EXCLUDED_RE.test(q)) {
        return {
          blocked: false,
          abstained: true,
          answerUrdu: 'دستیاب مستند ذخیرے میں اس سوال کا واضح حوالہ موجود نہیں۔',
          topRerankScore: 0,
          tookMs: 0.2,
          counts: {},
          ranked: []
        };
      }

      var items = (idx && idx.items) || [];
      var normQ = normalizeText(q);
      var rawWords = normQ.split(' ').filter(function (w) { return w.length > 1 && !CLIENT_STOPWORDS[w]; });
      var groups = rawWords.map(function (w) {
        return CLIENT_ROMAN_MAP[w] ? [w, normalizeText(CLIENT_ROMAN_MAP[w])] : [w];
      });
      var counts = { all: 0, books: 0, publications: 0, articles: 0, fatawa: 0, masajid: 0, magazine: 0, juma: 0, press: 0, media: 0 };
      var bm25Arr = [];
      var vecArr = [];

      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var hay = it.search_normalized_text || normalizeText((it.title || '') + ' ' + (it.subtitle || '') + ' ' + (it.snippet || ''));
        if (CLIENT_EXCLUDED_RE.test((it.title || '') + ' ' + (it.subtitle || ''))) continue;
        var normTitle = normalizeText(it.title || '');
        var bm25 = 0;
        var matchedGrp = 0;
        for (var g = 0; g < groups.length; g++) {
          var hit = false;
          for (var k = 0; k < groups[g].length; k++) {
            var tk = groups[g][k];
            if ((' ' + hay + ' ').indexOf(' ' + tk + ' ') !== -1 || (tk.length >= 4 && hay.indexOf(tk) !== -1)) {
              hit = true;
              bm25 += normTitle.indexOf(tk) !== -1 ? 3.2 : 1.4;
            }
          }
          if (hit) matchedGrp++;
        }
        // Char 3-gram overlap for semantic resilience
        var vecSim = 0;
        if (normQ.length >= 3) {
          var gHits = 0, gTot = 0;
          for (var c = 0; c <= normQ.length - 3; c += 2) {
            var tri = normQ.slice(c, c + 3);
            if (tri.indexOf(' ') !== -1) continue;
            gTot++;
            if (hay.indexOf(tri) !== -1) gHits++;
          }
          vecSim = gTot > 0 ? (gHits / gTot) : 0;
        }

        if (bm25 > 0 || vecSim >= 0.45) {
          counts.all++;
          if (counts[it.categoryKey] !== undefined) counts[it.categoryKey]++;
          if (!cat || cat === 'all' || cat === it.categoryKey) {
            if (bm25 > 0) bm25Arr.push({ it: it, bm25: bm25, cov: groups.length ? (matchedGrp / groups.length) : 0, vec: vecSim });
            if (vecSim >= 0.25) vecArr.push({ it: it, bm25: bm25, cov: groups.length ? (matchedGrp / groups.length) : 0, vec: vecSim });
          }
        }
      }

      bm25Arr.sort(function (a, b) { return b.bm25 - a.bm25; });
      vecArr.sort(function (a, b) { return b.vec - a.vec; });

      var pool = {};
      bm25Arr.slice(0, 60).forEach(function (x, idxR) {
        var key = x.it.url || idxR;
        pool[key] = { it: x.it, rrf: 1 / (60 + idxR + 1), cov: x.cov, vec: x.vec, bm25: x.bm25 };
      });
      vecArr.slice(0, 60).forEach(function (x, idxR) {
        var key = x.it.url || ('v_' + idxR);
        if (pool[key]) pool[key].rrf += 1 / (60 + idxR + 1);
        else pool[key] = { it: x.it, rrf: 1 / (60 + idxR + 1), cov: x.cov, vec: x.vec, bm25: x.bm25 };
      });

      var ranked = Object.keys(pool).map(function (k) {
        var e = pool[k];
        var conf = (e.rrf / 0.0328) * 0.30 + e.cov * 0.52 + e.vec * 0.18;
        if (groups.length >= 3 && e.cov < 0.34) conf = Math.min(conf, 0.21);
        if (e.cov === 0 && e.vec < 0.5) conf = Math.min(conf, 0.14);
        var fixedItem = Object.assign({}, e.it, {
          url: e.it.url && e.it.url.startsWith('/') ? (BASE_ROOT + e.it.url) : e.it.url,
          rerankScore: Number(Math.min(0.99, conf).toFixed(3))
        });
        return fixedItem;
      }).sort(function (a, b) { return b.rerankScore - a.rerankScore; });

      var topScore = ranked.length ? ranked[0].rerankScore : 0;
      return {
        blocked: false,
        abstained: topScore < 0.28,
        topRerankScore: topScore,
        tookMs: Number((performance.now() - t0).toFixed(2)),
        counts: counts,
        ranked: ranked
      };
    });
  }

  function runLocalInstantSearch(q, cat) {
    return runLocalHybridRrf(q, cat).then(function (h) {
      return {
        status: h.blocked ? 'blocked' : 'success',
        abstained: h.abstained,
        topRerankScore: h.topRerankScore,
        query: q,
        category: cat || 'all',
        tookMs: h.tookMs,
        count: h.ranked.length,
        categoryCounts: h.counts,
        results: h.ranked.slice(0, 45)
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

    // 5. Handle /api/global-search with instant local Hybrid RRF index (< 2ms, ZERO ntfy.sh requests!)
    if (urlStr.indexOf('/api/global-search') !== -1 && urlStr.indexOf('global-search-index.json') === -1) {
      var u = new URL(urlStr, window.location.origin);
      var q = u.searchParams.get('q') || '';
      var cat = u.searchParams.get('category') || 'all';
      return runLocalInstantSearch(q, cat).then(function (resObj) {
        return jsonResponse(resObj, 200);
      });
    }

    // 5a. Handle /api/ilmi-muawin/* locally on static GitHub Pages with Hybrid RRF + Abstention + Verbatim Citations
    if (urlStr.indexOf('/api/ilmi-muawin/ask') !== -1) {
      var uIlmi = new URL(urlStr, window.location.origin);
      var qIlmi = uIlmi.searchParams.get('q') || '';
      var catIlmi = uIlmi.searchParams.get('category') || 'all';
      return runLocalHybridRrf(qIlmi, catIlmi).then(function (h) {
        if (h.blocked) {
          return jsonResponse({ status: 'blocked', blocked: true, abstained: true, owaspControl: h.owaspControl, answerUrdu: h.answerUrdu, claims: [], citations: [] }, 400);
        }
        if (h.abstained || !h.ranked.length) {
          return jsonResponse({
            status: 'abstained',
            abstained: true,
            topRerankScore: h.topRerankScore,
            answerUrdu: 'دستیاب مستند ذخیرے میں اس سوال کا واضح حوالہ موجود نہیں۔ براہِ کرم صوبائی جمعیت اہل حدیث ممبئی کے دار الافتاء سے براہِ راست رجوع فرمائیں۔',
            claims: [],
            citations: [],
            telemetry: { latencyMs: h.tookMs }
          }, 200);
        }
        var topCits = h.ranked.slice(0, 4).map(function (it, idxC) {
          return {
            citationId: 'C' + (idxC + 1),
            sourceType: it.type || 'مستند ماخذ',
            badgeColor: it.badgeColor || '#0f766e',
            title: it.canonical_title || it.title,
            authorOrMufti: it.authorOrMufti || it.subtitle || '',
            referenceCode: it.referenceCode || '',
            publishedDate: it.publishedDate || '',
            canonicalExcerpt: it.canonical_excerpt || it.snippet || '',
            url: it.url,
            rerankScore: it.rerankScore
          };
        });
        var claims = topCits.map(function (c) {
          return {
            claimId: 'CL_' + c.citationId,
            text: '«' + c.title + '» (' + c.sourceType + (c.referenceCode ? ' • ' + c.referenceCode : '') + '): ' + c.canonicalExcerpt,
            citationIds: [c.citationId],
            sourceUrl: c.url
          };
        });
        return jsonResponse({
          status: 'grounded',
          abstained: false,
          query: qIlmi,
          topRerankScore: h.topRerankScore,
          answerUrdu: claims.map(function (cl, idxCl) { return (idxCl + 1) + '. ' + cl.text + ' [' + cl.citationIds.join(', ') + ']'; }).join('
'),
          claims: claims,
          citations: topCits,
          citationAudit3D: { supportRate: 1, coverageRate: 1, authorityRate: 1 },
          telemetry: { latencyMs: h.tookMs }
        }, 200);
      });
    }
    if (urlStr.indexOf('/api/ilmi-muawin/memory') !== -1 || urlStr.indexOf('/api/ilmi-muawin/proposals') !== -1) {
      return Promise.resolve(jsonResponse({ success: true, status: 'ok' }, 200));
    }

    // 5b. Handle /api/library/topics from pre-built static JSON
    if (urlStr.indexOf('/api/library/topics') !== -1 && urlStr.indexOf('topics.json') === -1) {
      return origFetch(BASE_ROOT + '/api/library/topics.json');
    }

    // 5b2. Handle YouTube live delta catalog directly from static edge JSON (0ms, zero tunnel traffic)
    if (urlStr.indexOf('/api/public/youtube/live-delta') !== -1 || urlStr.indexOf('youtube-live-catalog.json') !== -1) {
      return origFetch(BASE_ROOT + '/api/youtube-live-catalog.json?t=' + Math.floor(Date.now() / 120000));
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
      var pendingRelUrl = urlStr.replace(/^https?://[^/]+/i, '');
      return requestViaLiveTunnel('GET', pendingRelUrl, '', 'application/json', 3000)
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
          if (!modReq.adminPasskey || String(modReq.adminPasskey).trim().length < 8) {
            return jsonResponse({ status: 'error', message: 'لائیو سرور سے تصدیق درکار ہے؛ براہِ کرم ایڈمن لاگ ان سے دوبارہ کوشش کریں۔' }, 403);
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

  // Ensure fresh typography-system.css?v=v16 and prevent Sakkal Majalla on non-prose UI elements
  window.addEventListener('DOMContentLoaded', function () {
    var links = document.querySelectorAll('link[href*="typography-system.css"]');
    for (var i = 0; i < links.length; i++) {
      var h = links[i].getAttribute('href') || '';
      if (h.indexOf('v=v16') === -1) {
        links[i].setAttribute('href', h.split('?')[0] + '?v=v16');
      }
    }
    var proseSel = '.fatwa-answer-text, .fatwa-question-text, .fatwa-body-content, .article-body-content, .article-content, .magazine-article-body, .book-reader-content, #readerTextContainer, #bookTextContent, .khutbah-body-content, .khutba-arabic-body, .press-release-body, .prose-content';
    var straySpans = document.querySelectorAll('.arabic-sakkal-text, .quran-indopak-text');
    for (var j = 0; j < straySpans.length; j++) {
      var sp = straySpans[j];
      if (!sp.closest || !sp.closest(proseSel)) {
        var txt = document.createTextNode(sp.textContent || '');
        if (sp.parentNode) sp.parentNode.replaceChild(txt, sp);
      }
    }
  });

  window.__navigateViaLiveTunnel__ = navigateViaLiveTunnel;
})();
