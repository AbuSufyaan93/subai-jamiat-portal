/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UNIFIED INTERACTION SYSTEM (SHARE, COPY, REPORT ERROR)
 * Client Controller Architecture
 * Subai Jamiat Ahle Hadees Mumbai
 * ══════════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  let currentShareData = {
    type: 'f',
    id: '',
    title: '',
    url: '',
    shortUrl: ''
  };

  let currentReportData = {
    type: 'fatwa',
    id: '',
    title: '',
    url: ''
  };

  let toastTimer = null;

  // ─── Clipboard Helper with Reliable Fallback ───
  function copyTextToClipboard(text, successMsg = 'لنک کاپی ہو گیا') {
    if (!text) return;

    function onCopied() {
      showToast('✓ ' + successMsg);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(onCopied)
        .catch(() => fallbackCopy(text, onCopied));
    } else {
      fallbackCopy(text, onCopied);
    }
  }

  function fallbackCopy(text, cb) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful && cb) cb();
    } catch (err) {
      console.error('Fallback copy failed:', err);
      prompt('کاپی کرنے کے لیے نیچے دیے گئے لنک کو سلیکٹ کریں:', text);
    }
  }

  // ─── Floating Toast Notification ───
  function showToast(message) {
    let toast = document.getElementById('sjToastFeedback');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'sjToastFeedback';
      toast.className = 'sj-toast-feedback';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${message}</span>`;
    toast.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // ─── Open Share Modal (Reference Image 4) ───
  function openShareModal(options = {}) {
    const type = (options.type || 'f').toLowerCase();
    const id = options.id || '';
    const title = options.title || document.title;
    const rawUrl = options.url || window.location.href;

    const fullTargetUrl = rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}${rawUrl}`;

    currentShareData = {
      type,
      id,
      title,
      url: fullTargetUrl,
      shortUrl: fullTargetUrl // temporary default
    };

    const modal = document.getElementById('sjShareModalBackdrop');
    const input = document.getElementById('sjShareShortUrlInput');
    const btnPill = document.getElementById('sjBtnCopyShortPill');

    if (!modal) return;

    // Reset pill button text
    if (btnPill) {
      btnPill.innerHTML = '<i class="fa-regular fa-copy"></i> <span>مختصر لنک کاپی کریں</span>';
      btnPill.classList.remove('copied');
    }

    // Default immediate preview before async resolution
    if (input) {
      input.value = `${window.location.origin}/${type}/${id || 'share'}`;
    }

    // Display modal immediately for instant snappy UX
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Fetch canonical Short URL asynchronously from Backend Service
    fetch('/api/short-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type,
        id: id,
        url: fullTargetUrl
      })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.shortUrl) {
          currentShareData.shortUrl = res.shortUrl;
          if (input) input.value = res.shortUrl;
          updateSocialShareLinks(res.shortUrl, title);
        } else {
          updateSocialShareLinks(fullTargetUrl, title);
        }
      })
      .catch(() => {
        updateSocialShareLinks(fullTargetUrl, title);
      });
  }

  function updateSocialShareLinks(shareUrl, title) {
    const encUrl = encodeURIComponent(shareUrl);
    const encTitle = encodeURIComponent(title);

    const tg = document.getElementById('sjShareTelegram');
    const wa = document.getElementById('sjShareWhatsapp');
    const tw = document.getElementById('sjShareX');
    const fb = document.getElementById('sjShareFacebook');

    if (tg) tg.href = `https://t.me/share/url?url=${encUrl}&text=${encTitle}`;
    if (wa) wa.href = `https://api.whatsapp.com/send?text=${encTitle}%0A${encUrl}`;
    if (tw) tw.href = `https://twitter.com/intent/tweet?text=${encTitle}&url=${encUrl}`;
    if (fb) fb.href = `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`;
  }

  function copyModalShortUrl() {
    const input = document.getElementById('sjShareShortUrlInput');
    const btnPill = document.getElementById('sjBtnCopyShortPill');
    const textToCopy = (input && input.value) ? input.value : currentShareData.shortUrl;

    copyTextToClipboard(textToCopy, 'مختصر لنک کاپی ہو گیا!');

    if (btnPill) {
      btnPill.classList.add('copied');
      btnPill.innerHTML = '<i class="fa-solid fa-check"></i> <span>✓ کاپی ہو گیا!</span>';
      setTimeout(() => {
        btnPill.classList.remove('copied');
        btnPill.innerHTML = '<i class="fa-regular fa-copy"></i> <span>مختصر لنک کاپی کریں</span>';
      }, 2000);
    }
  }

  // ─── Open Report Error Dialog ───
  function openReportModal(options = {}) {
    const rawUrl = options.url || window.location.href;
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}${rawUrl}`;
    currentReportData = {
      type: options.type || 'fatwa',
      id: options.id || '',
      title: options.title || document.title,
      url: fullUrl
    };

    const modal = document.getElementById('sjReportModalBackdrop');
    if (!modal) return;

    // Set Context
    const titleEl = document.getElementById('sjReportContextTitle');
    const urlEl = document.getElementById('sjReportContextUrl');
    const descEl = document.getElementById('sjReportDescription');
    const errStatus = document.getElementById('sjReportStatusMsg');

    if (titleEl) titleEl.innerText = currentReportData.title;
    if (urlEl) urlEl.innerText = currentReportData.url;
    if (descEl) descEl.value = '';
    if (errStatus) errStatus.style.display = 'none';

    // Reset error chips to 'text'
    const chips = document.querySelectorAll('input[name="sj_error_type"]');
    chips.forEach(c => {
      c.checked = (c.value === 'text');
      const label = c.closest('.sj-error-chip-label');
      if (label) {
        if (c.value === 'text') label.classList.add('active');
        else label.classList.remove('active');
      }
    });

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (descEl) descEl.focus();
  }

  function submitErrorReport(e) {
    if (e) e.preventDefault();

    const descEl = document.getElementById('sjReportDescription');
    const nameEl = document.getElementById('sjReportUserName');
    const contactEl = document.getElementById('sjReportUserContact');
    const errStatus = document.getElementById('sjReportStatusMsg');
    const btnSubmit = document.getElementById('sjBtnSubmitReport');

    const desc = descEl ? descEl.value.trim() : '';
    if (desc.length < 5) {
      if (errStatus) {
        errStatus.style.display = 'block';
        errStatus.style.background = '#fef2f2';
        errStatus.style.color = '#991b1b';
        errStatus.innerText = 'براہ کرم غلطی کی وضاحت کم از کم 5 حروف میں تحریر فرمائیں۔';
      }
      if (descEl) descEl.focus();
      return;
    }

    const typeRadio = document.querySelector('input[name="sj_error_type"]:checked');
    const errorType = typeRadio ? typeRadio.value : 'text';

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>ارسال ہو رہا ہے...</span>';
    }

    fetch('/api/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentType: currentReportData.type,
        contentId: currentReportData.id,
        contentTitle: currentReportData.title,
        url: currentReportData.url,
        errorType: errorType,
        description: desc,
        userName: nameEl ? nameEl.value.trim() : '',
        userContact: contactEl ? contactEl.value.trim() : ''
      })
    })
      .then(r => r.json())
      .then(res => {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<span>ارسال کریں (Submit Report)</span>';
        }

        if (res.success) {
          if (errStatus) {
            errStatus.style.display = 'block';
            errStatus.style.background = '#ecfdf5';
            errStatus.style.color = '#065f46';
            errStatus.innerText = '✓ شکریہ! آپ کی نشاندہی موصول ہو گئی ہے۔ انتظامیہ جلد جائزہ لے گی۔';
          }
          setTimeout(() => {
            closeAllModals();
            showToast('✓ غلطی کی نشاندہی کامیابی سے ارسال ہو گئی');
          }, 1400);
        } else {
          if (errStatus) {
            errStatus.style.display = 'block';
            errStatus.style.background = '#fef2f2';
            errStatus.style.color = '#991b1b';
            errStatus.innerText = res.message || 'رپورٹ بھیجنے میں خرابی پیش آئی۔';
          }
        }
      })
      .catch(() => {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<span>ارسال کریں (Submit Report)</span>';
        }
        if (errStatus) {
          errStatus.style.display = 'block';
          errStatus.style.background = '#fef2f2';
          errStatus.style.color = '#991b1b';
          errStatus.innerText = 'سرور سے رابطہ نہ ہو سکا۔';
        }
      });
  }

  function closeAllModals() {
    const shareModal = document.getElementById('sjShareModalBackdrop');
    const reportModal = document.getElementById('sjReportModalBackdrop');
    if (shareModal) shareModal.style.display = 'none';
    if (reportModal) reportModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // ─── Single Item Copy Handler (Image 3 Button 1) ───
  function handleItemCopy(btn, options = {}) {
    let textToCopy = options.text || options.url || window.location.href;
    if (textToCopy.startsWith('/')) {
      textToCopy = window.location.origin + textToCopy;
    }
    const title = options.title || 'فتویٰ';

    btn.classList.add('copied');
    copyTextToClipboard(textToCopy, `لنک کاپی ہو گیا!`);

    setTimeout(() => {
      btn.classList.remove('copied');
    }, 1800);
  }

  // ─── Event Binding on Page Load ───
  document.addEventListener('DOMContentLoaded', () => {
    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllModals();
    });

    // Delegated click handler for .sj-actions-group and buttons
    document.addEventListener('click', (e) => {
      // Backdrop click to close
      if (e.target.classList.contains('sj-modal-backdrop')) {
        closeAllModals();
        return;
      }

      // Close buttons
      if (e.target.closest('.sj-modal-close') || e.target.closest('.sj-btn-close-modal')) {
        closeAllModals();
        return;
      }

      // Copy Short Link Pill Button in Share Modal
      if (e.target.closest('#sjBtnCopyShortPill')) {
        copyModalShortUrl();
        return;
      }

      // Action Button: Copy
      const copyBtn = e.target.closest('[data-sj-action="copy"]');
      if (copyBtn) {
        e.preventDefault();
        const group = copyBtn.closest('[data-sj-container]') || copyBtn;
        const type = group.getAttribute('data-sj-type') || 'f';
        const id = group.getAttribute('data-sj-id') || '';
        const title = group.getAttribute('data-sj-title') || document.title;
        const url = group.getAttribute('data-sj-url') || window.location.href;
        const text = group.getAttribute('data-sj-text') || url;

        handleItemCopy(copyBtn, { type, id, title, url, text });
        return;
      }

      // Action Button: Share
      const shareBtn = e.target.closest('[data-sj-action="share"]');
      if (shareBtn) {
        e.preventDefault();
        const group = shareBtn.closest('[data-sj-container]') || shareBtn;
        const type = group.getAttribute('data-sj-type') || 'f';
        const id = group.getAttribute('data-sj-id') || '';
        const title = group.getAttribute('data-sj-title') || document.title;
        const url = group.getAttribute('data-sj-url') || window.location.href;

        openShareModal({ type, id, title, url });
        return;
      }

      // Action Button: Report
      const reportBtn = e.target.closest('[data-sj-action="report"]');
      if (reportBtn) {
        e.preventDefault();
        const group = reportBtn.closest('[data-sj-container]') || reportBtn;
        const type = group.getAttribute('data-sj-type') || 'fatwa';
        const id = group.getAttribute('data-sj-id') || '';
        const title = group.getAttribute('data-sj-title') || document.title;
        const url = group.getAttribute('data-sj-url') || window.location.href;

        openReportModal({ type, id, title, url });
        return;
      }

      // Error radio chip styling
      const chipInput = e.target.closest('input[name="sj_error_type"]');
      if (chipInput) {
        document.querySelectorAll('.sj-error-chip-label').forEach(l => l.classList.remove('active'));
        const parentLabel = chipInput.closest('.sj-error-chip-label');
        if (parentLabel) parentLabel.classList.add('active');
      }
    });

    // Auto-select text in short URL input
    const shortInput = document.getElementById('sjShareShortUrlInput');
    if (shortInput) {
      shortInput.addEventListener('click', function () {
        this.select();
      });
    }

    // Submit report form
    const reportForm = document.getElementById('sjReportForm');
    if (reportForm) {
      reportForm.addEventListener('submit', submitErrorReport);
    }
  });

  // Export globally under window.SJInteraction
  window.SJInteraction = {
    copyText: copyTextToClipboard,
    openShareModal,
    openReportModal,
    closeAllModals,
    showToast
  };

  // Backwards compatibility wrappers
  window.copyCurrentPermalink = function () {
    const url = window.location.href;
    copyTextToClipboard(url, 'فتویٰ کا مستقل لنک کاپی کر لیا گیا!');
  };

  window.copyFatwaLink = function (slugOrId) {
    const fullUrl = `${window.location.origin}/fatawa/${slugOrId}`;
    copyTextToClipboard(fullUrl, 'فتویٰ کا لنک کاپی کر لیا گیا!');
  };

})();
