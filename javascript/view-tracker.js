/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIFIED CLIENT-SIDE VIEW TRACKER
 * Subai Jamiat Ahle Hadees Mumbai
 * Privacy-safe, 3-second Active Visibility Beacon, Deduplicated per Session
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // Config
  var QUALIFIED_DURATION_MS = 3000; // 3 seconds active visibility required
  var ENDPOINT = '/api/views/register';
  var activeTimers = {};

  /**
   * Helper to get or create anonymous first-party visitor key (sj_vid)
   */
  function getVisitorKey() {
    var match = document.cookie.match(/(?:^|;\s*)sj_vid=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    // Generate fallback UUID if cookie not yet set
    var fallback = 'vid-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    try {
      document.cookie = 'sj_vid=' + encodeURIComponent(fallback) + '; path=/; max-age=31536000; SameSite=Lax';
    } catch (e) {}
    return fallback;
  }

  /**
   * Check if current user is an admin previewing drafts
   */
  function isAdminPreview() {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('preview') || urlParams.has('adminPreview');
  }

  /**
   * Update all DOM elements for this content with fresh count
   */
  function updateDomCounters(contentType, contentId, newCount) {
    if (newCount === undefined || newCount === null) return;
    var formatted = Number(newCount).toLocaleString('en-US');
    var selectors = [
      '.sj-view-counter[data-content-type="' + contentType + '"][data-content-id="' + contentId + '"]',
      '.sj-view-counter[data-content-id="' + contentId + '"]'
    ];
    selectors.forEach(function (sel) {
      var elements = document.querySelectorAll(sel);
      elements.forEach(function (el) {
        var numEl = el.querySelector('.view-count-number');
        if (numEl) {
          numEl.textContent = formatted;
        }
        el.setAttribute('title', formatted + ' مشاہدات');
        el.setAttribute('aria-label', formatted + ' مشاہدات');
      });
    });
  }

  /**
   * Send qualified view beacon to server
   */
  function sendBeacon(contentType, contentId) {
    if (isAdminPreview()) return;

    var storageKey = 'sj_viewed_' + contentType + '_' + contentId;
    try {
      if (sessionStorage.getItem(storageKey)) {
        // Already recorded during this session
        return;
      }
      sessionStorage.setItem(storageKey, '1');
    } catch (e) {
      // Storage unavailable / blocked
    }

    var payload = {
      contentType: contentType,
      contentId: String(contentId),
      visitorKey: getVisitorKey()
    };

    fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && data.success && data.uniqueViews !== undefined) {
          updateDomCounters(contentType, contentId, data.uniqueViews);
        }
      })
      .catch(function (err) {
        // Silently catch network errors
      });
  }

  /**
   * Start 3-second qualified visibility timer for a content item
   */
  function startQualifiedTracker(contentType, contentId) {
    if (!contentType || !contentId || isAdminPreview()) return;

    var key = contentType + ':' + contentId;
    if (activeTimers[key]) return; // Already running

    var storageKey = 'sj_viewed_' + contentType + '_' + contentId;
    try {
      if (sessionStorage.getItem(storageKey)) return;
    } catch (e) {}

    var elapsed = 0;
    var startTime = Date.now();

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        // User switched tab: pause accumulation
        if (activeTimers[key] && activeTimers[key].interval) {
          clearInterval(activeTimers[key].interval);
          activeTimers[key].interval = null;
        }
      } else if (document.visibilityState === 'visible') {
        // Tab focused again: resume accumulation
        resumeTimer();
      }
    }

    function resumeTimer() {
      if (!activeTimers[key]) return;
      startTime = Date.now();
      activeTimers[key].interval = setInterval(function () {
        var now = Date.now();
        elapsed += (now - startTime);
        startTime = now;

        if (elapsed >= QUALIFIED_DURATION_MS) {
          // Qualification met!
          cleanup();
          sendBeacon(contentType, contentId);
        }
      }, 500);
    }

    function cleanup() {
      if (activeTimers[key]) {
        if (activeTimers[key].interval) {
          clearInterval(activeTimers[key].interval);
        }
        document.removeEventListener('visibilitychange', onVisibilityChange);
        delete activeTimers[key];
      }
    }

    activeTimers[key] = {
      interval: null,
      cleanup: cleanup
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    if (document.visibilityState === 'visible') {
      resumeTimer();
    }
  }

  /**
   * Cancel tracking timer (e.g. user closed modal quickly before 3s)
   */
  function cancelQualifiedTracker(contentType, contentId) {
    var key = contentType + ':' + contentId;
    if (activeTimers[key]) {
      activeTimers[key].cleanup();
    }
  }

  /**
   * Public API for modal viewers (videos, posters, lightbox)
   */
  window.SJViewTracker = {
    track: startQualifiedTracker,
    cancel: cancelQualifiedTracker,
    updateDom: updateDomCounters
  };

  // Backwards compatible / convenient shorthand
  window.trackContentView = startQualifiedTracker;
  window.cancelContentView = cancelQualifiedTracker;

  /**
   * Auto-discover primary content on page load
   */
  function autoTrackPage() {
    // 1. Check meta tags
    var metaType = document.querySelector('meta[name="sj-content-type"]');
    var metaId = document.querySelector('meta[name="sj-content-id"]');

    if (metaType && metaId) {
      var cType = metaType.getAttribute('content');
      var cId = metaId.getAttribute('content');
      if (cType && cId) {
        startQualifiedTracker(cType, cId);
        return;
      }
    }

    // 2. Check primary content container
    var primaryEl = document.querySelector('[data-sj-primary-type][data-sj-primary-id]');
    if (primaryEl) {
      var pType = primaryEl.getAttribute('data-sj-primary-type');
      var pId = primaryEl.getAttribute('data-sj-primary-id');
      if (pType && pId) {
        startQualifiedTracker(pType, pId);
      }
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoTrackPage);
  } else {
    autoTrackPage();
  }
})();
