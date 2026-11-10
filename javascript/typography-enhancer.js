/**
 * ============================================================================
 * SUBAI JAMIAT AHLE HADEES MUMBAI — SCHOLARLY PROSE NUSOOS CLASSIFIER
 * ============================================================================
 * Strict Rule:
 *  - Across all UI, navigation, buttons, chips, cards, headings, titles,
 *    video gallery, tables, and general Urdu text: 100% pure Urdu Nastaliq
 *    font (Manzar Lahori Nastaliq) is used WITHOUT any font-mixing.
 *  - ONLY inside the actual reading body of a Book (کتاب), Article (مستقل مضمون),
 *    Fatwa (فتویٰ), or Khutbah (خطبہ):
 *      1. Embedded Quranic Verses (﴿ ... ﴾, ۝) -> .quran-indopak-text
 *         (Indian / Indo-Pak Quranic Font)
 *      2. Embedded Hadith, Athar & Scholars' Arabic Quotes (« ... » or
 *         fully vocalized multi-word Arabic nusoos) -> .arabic-sakkal-text
 *         (Sakkal Majalla Bold)
 * ============================================================================
 */
(function () {
  if (window.__SJAHM_TYPOGRAPHY_ENHANCER__) return;
  window.__SJAHM_TYPOGRAPHY_ENHANCER__ = true;

  // Never run on the Video Gallery / Islamic Tube page where all titles/chips/cards are pure Urdu UI
  var pathName = (window.location && window.location.pathname) || '';
  if (
    pathName.indexOf('/videos') !== -1 ||
    pathName.indexOf('/video-gallery') !== -1 ||
    pathName.indexOf('/media') !== -1 ||
    document.getElementById('ytWatchTheater')
  ) {
    return;
  }

  // Only scan inside dedicated Book, Article, Fatwa, and Khutbah body prose containers
  var SCHOLARLY_PROSE_SELECTOR = [
    '.fatwa-answer-text',
    '.fatwa-question-text',
    '.fatwa-body-content',
    '.fatwa-detail-body',
    '.fatwa-content-body',
    '.article-body-content',
    '.article-full-text',
    '.article-content',
    '.article-body',
    '.book-reader-content',
    '.book-text-body',
    '#readerTextContainer',
    '#bookTextContent',
    '.khutbah-body-content',
    '.tauseeah-body-content',
    '[data-scholarly-prose="true"]'
  ].join(', ');

  var SKIP_TAGS = {
    SCRIPT: 1,
    STYLE: 1,
    TEXTAREA: 1,
    INPUT: 1,
    SELECT: 1,
    OPTION: 1,
    CODE: 1,
    PRE: 1,
    SVG: 1,
    NOSCRIPT: 1,
    IFRAME: 1,
    BUTTON: 1,
    A: 1,
    NAV: 1,
    HEADER: 1,
    FOOTER: 1,
    H1: 1,
    H2: 1,
    H3: 1,
    H4: 1,
    H5: 1,
    H6: 1
  };

  // Characters specific to Urdu prose (including Urdu گول ہ \u06C1 and ہائے مخلوط \u06BE and ے \u06D2)
  var URDU_ONLY_RE = /[ٹڈڑںےگپچژھہ]/;

  // True Arabic harakat (Fathatan, Dammatan, Kasratan, Fatha, Damma, Kasra, Shadda, Sukun)
  // Explicitly EXCLUDES \u0653 (Maddah in آ) and \u0670 (Khari Zabar in زکوٰۃ / صلوٰۃ / تعالیٰ)
  var TRUE_HARAKAT_GLOBAL_RE = /[\u064B-\u0652]/g;
  var TRUE_HARAKAT_TEST_RE = /[\u064B-\u0652]/;

  // Match ONLY:
  // Group 1: Quranic verses inside ornate brackets ﴿ ... ﴾
  // Group 2: Hadith / Athar / Arabic quotes inside « ... »
  // Group 3: Multi-word vocalized Arabic nusoos (3+ words with true Arabic harakat and NO Urdu letters)
  var NUSOOS_TOKEN_RE =
    /(﴿[^﴾]{2,1500}﴾)|(«[^»]{4,1500}»)|((?:[\u0621-\u064A\u0671\u064B-\u0652\u0670\uFDFA\uFDFB]+(?:\s+[\u0621-\u064A\u0671\u064B-\u0652\u0670\uFDFA\uFDFB،؛:.!؟]+){2,120}))/g;

  function countTrueHarakat(str) {
    var m = str.match(TRUE_HARAKAT_GLOBAL_RE);
    return m ? m.length : 0;
  }

  function isSkippedOrAlreadyStyled(node) {
    var p = node.parentNode;
    while (p && p.nodeType === 1) {
      if (SKIP_TAGS[p.tagName]) return true;
      if (
        p.classList &&
        (p.classList.contains('quran-indopak-text') ||
          p.classList.contains('arabic-sakkal-text') ||
          p.classList.contains('quran-verse') ||
          p.classList.contains('quran-text') ||
          p.classList.contains('arabic-nass') ||
          p.classList.contains('yt-chip') ||
          p.classList.contains('yt-card') ||
          p.getAttribute('contenteditable') === 'true')
      ) {
        return true;
      }
      p = p.parentNode;
    }
    return false;
  }

  function processTextNode(textNode) {
    var val = textNode.nodeValue;
    if (!val || val.length < 4) return;

    if (
      val.indexOf('﴿') === -1 &&
      val.indexOf('«') === -1 &&
      !TRUE_HARAKAT_TEST_RE.test(val)
    ) {
      return;
    }

    NUSOOS_TOKEN_RE.lastIndex = 0;
    var match;
    var lastIdx = 0;
    var frag = null;

    while ((match = NUSOOS_TOKEN_RE.exec(val)) !== null) {
      var fullMatch = match[0];
      var isQuran = Boolean(match[1]);
      var isGuillemet = Boolean(match[2]);
      var isVocalizedArabic = Boolean(match[3]);

      var classifyAs = null;

      if (isQuran) {
        classifyAs = 'quran-indopak-text';
      } else if (isGuillemet) {
        if (!URDU_ONLY_RE.test(fullMatch)) {
          classifyAs = 'arabic-sakkal-text';
        }
      } else if (isVocalizedArabic) {
        // Must have ZERO Urdu-specific letters AND at least 4 true Arabic harakat marks
        // so Urdu izafat (منہجِ سلف) or Urdu words never trigger this!
        if (!URDU_ONLY_RE.test(fullMatch) && countTrueHarakat(fullMatch) >= 4) {
          if (/[\u06DD\u06DE]/.test(fullMatch)) {
            classifyAs = 'quran-indopak-text';
          } else {
            classifyAs = 'arabic-sakkal-text';
          }
        }
      }

      if (!classifyAs) continue;

      if (!frag) {
        frag = document.createDocumentFragment();
      }
      if (match.index > lastIdx) {
        frag.appendChild(document.createTextNode(val.slice(lastIdx, match.index)));
      }
      var span = document.createElement('span');
      span.className = classifyAs;
      span.setAttribute('lang', 'ar');
      span.textContent = fullMatch;
      frag.appendChild(span);
      lastIdx = match.index + fullMatch.length;
    }

    if (frag && textNode.parentNode) {
      if (lastIdx < val.length) {
        frag.appendChild(document.createTextNode(val.slice(lastIdx)));
      }
      textNode.parentNode.replaceChild(frag, textNode);
    }
  }

  function enhanceContainer(container) {
    if (!container || !document.createTreeWalker) return;
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) {
      if (!isSkippedOrAlreadyStyled(n)) {
        nodes.push(n);
      }
    }
    for (var i = 0; i < nodes.length; i++) {
      processTextNode(nodes[i]);
    }
  }

  function initTypographyEnhancer() {
    if (!document.body) return;
    var containers = document.querySelectorAll(SCHOLARLY_PROSE_SELECTOR);
    for (var i = 0; i < containers.length; i++) {
      enhanceContainer(containers[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTypographyEnhancer);
  } else {
    initTypographyEnhancer();
  }

  window.__enhanceScholarlyProse__ = enhanceContainer;
})();
