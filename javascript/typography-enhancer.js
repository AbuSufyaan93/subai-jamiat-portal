/**
 * ============================================================================
 * SUBAI JAMIAT AHLE HADEES MUMBAI — AUTOMATIC TYPOGRAPHY & NUSOOS CLASSIFIER
 * ============================================================================
 * Automatically identifies and styles:
 *  1. Quranic Verses (﴿ ... ﴾, ۝, Basmalah, Quranic quotes) -> .quran-indopak-text
 *     (Rendered in Indian / Indo-Pak Quranic Font: Al Qalam Quran / Manzar IndoPak Naskh)
 *  2. Non-Quranic Arabic Nusoos (Hadiths « ... », Arabic text with tashkeel,
 *     Arabic Duas, Honorifics & Salutations) -> .arabic-sakkal-text
 *     (Rendered in Sakkal Majalla Bold / Scheherazade)
 *  3. All Urdu Text -> Default Manzar Lahori Nastaliq
 * ============================================================================
 */
(function () {
  if (window.__SJAHM_TYPOGRAPHY_ENHANCER__) return;
  window.__SJAHM_TYPOGRAPHY_ENHANCER__ = true;

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
    IFRAME: 1
  };

  // Urdu-specific characters that never appear in pure Arabic nusoos
  var URDU_ONLY_RE = /[ٹڈڑںےگپچژھ]/;

  // Arabic diacritics (Fathatan, Dammatan, Kasratan, Fatha, Damma, Kasra, Shadda, Sukun, Superscript Alef, Maddah)
  var TASHKEEL_RE = /[\u064B-\u0655\u0670\u06D6-\u06ED]/;

  // Combined matcher for:
  // Group 1: Quranic verses in ornate brackets ﴿ ... ﴾ or Basmalah with tashkeel
  // Group 2: Hadith / Arabic quotes in « ... »
  // Group 3: Contiguous Arabic phrases (2+ words) containing Tashkeel or Honorifics (ﷺ / ﷻ) without Urdu letters
  // Group 4: Common unvocalized Arabic Islamic phrases & salutations
  var NUSOOS_TOKEN_RE = /(﴿[^﴾]{2,1200}﴾|بِسْمِ\s*اللّٰ?هِ\s*الرَّحْمٰ?نِ\s*الرَّحِ[یي]ْمِ|بسم\s+الله\s+الرحمن\s+الرحيم)|(«[^»]{3,1200}»)|((?:[\u0621-\u064A\u0671\u064B-\u0655\u0670\uFDFA\uFDFB]+(?:\s+[\u0621-\u064A\u0671\u064B-\u0655\u0670\uFDFA\uFDFB،؛:.!؟]+){1,80}))|(\b(?:الحمد\s+لله(?:\s+رب\s+العالمين)?|والصلاة\s+والسلام\s+على\s+[^\n،.]{3,50}|صلى\s+الله\s+عليه\s+وسلم|رضي\s+الله\s+عن(?:ه|ها|هما|هم|هن)|رحمه(?:م)?\s+الله(?:\s+تعالى)?|حفظه(?:م)?\s+الله(?:\s+تعالى)?|قال\s+رسول\s+الله|قال\s+النبي|رواه\s+(?:البخاري|مسلم|أبو\s+داود|الترمذي|النسائي|ابن\s+ماجه|أحمد)|متفق\s+عليه|السلام\s+عليكم\s+ورحمة\s+الله(?:\s+وبركاته)?)\b|[ﷺﷻ])/g;

  function isAlreadyStyled(node) {
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
    if (!val || val.length < 2) return;

    // Quick pre-check: only run regex if node has Arabic/Quranic brackets, tashkeel, ﷺ, or Arabic letters
    if (
      val.indexOf('﴿') === -1 &&
      val.indexOf('«') === -1 &&
      val.indexOf('ﷺ') === -1 &&
      val.indexOf('ﷻ') === -1 &&
      val.indexOf('الله') === -1 &&
      val.indexOf('رواه') === -1 &&
      !TASHKEEL_RE.test(val)
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
      var isTashkeelSeq = Boolean(match[3]);
      var isPhrase = Boolean(match[4]);

      var classifyAs = null;

      if (isQuran) {
        classifyAs = 'quran-indopak-text';
      } else if (isGuillemet) {
        // Check if inside « ... » has Urdu-only letters; if not, it's an Arabic Hadith/quote
        if (!URDU_ONLY_RE.test(fullMatch)) {
          classifyAs = 'arabic-sakkal-text';
        }
      } else if (isTashkeelSeq) {
        // Must contain at least one Arabic diacritic or ﷺ/ﷻ and no Urdu-only characters
        if (!URDU_ONLY_RE.test(fullMatch) && (TASHKEEL_RE.test(fullMatch) || /[ﷺﷻ]/.test(fullMatch))) {
          // If it contains Quranic end-of-ayah symbol ۝ or ۞, classify as Quranic
          if (/[\u06DD\u06DE]/.test(fullMatch)) {
            classifyAs = 'quran-indopak-text';
          } else {
            classifyAs = 'arabic-sakkal-text';
          }
        }
      } else if (isPhrase) {
        if (!URDU_ONLY_RE.test(fullMatch)) {
          classifyAs = 'arabic-sakkal-text';
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

  function enhanceSubtree(root) {
    if (!root || !document.createTreeWalker) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) {
      if (!isAlreadyStyled(n)) {
        nodes.push(n);
      }
    }
    for (var i = 0; i < nodes.length; i++) {
      processTextNode(nodes[i]);
    }
  }

  function initTypographyEnhancer() {
    if (!document.body) return;
    enhanceSubtree(document.body);

    var debounceTimer = null;
    var pendingNodes = [];
    var obs = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType === 1 && !SKIP_TAGS[node.tagName]) {
            if (
              !node.classList.contains('quran-indopak-text') &&
              !node.classList.contains('arabic-sakkal-text')
            ) {
              pendingNodes.push(node);
            }
          }
        }
      }
      if (pendingNodes.length > 0 && !debounceTimer) {
        debounceTimer = setTimeout(function () {
          var batch = pendingNodes.slice(0, 60);
          pendingNodes = [];
          debounceTimer = null;
          for (var k = 0; k < batch.length; k++) {
            if (document.body.contains(batch[k])) {
              enhanceSubtree(batch[k]);
            }
          }
        }, 120);
      }
    });

    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTypographyEnhancer);
  } else {
    initTypographyEnhancer();
  }
})();
