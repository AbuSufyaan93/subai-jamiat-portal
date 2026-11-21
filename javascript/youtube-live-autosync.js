/**
 * ============================================================================
 * SUBAI JAMIAT AHLE HADEES MUMBAI — REAL-TIME BROWSER AUTO-SYNC ENGINE
 * ============================================================================
 * Keeps Islamic Tube (/video-gallery, /videos, /media, /bayanat) AND the
 * website's "تازہ ترین بیان" sidebar widget 100% up-to-date automatically:
 *   1. Reads /api/public/youtube/live-delta (or static ./api/youtube-live-catalog.json)
 *   2. Checks live YouTube UULF (Long-Form Videos) & UUSH (Shorts/Reels) feeds
 *      via CORS-safe RSS2JSON so brand-new uploads appear within seconds even
 *      between scheduled 30-minute GitHub Actions cloud builds!
 *   3. Strictly enforces the Two-Speaker Blacklist & Pure Nastaliq Urdu formatting.
 */
(function () {
  if (window.__SJAHM_YT_LIVE_AUTOSYNC_INIT__) return;
  window.__SJAHM_YT_LIVE_AUTOSYNC_INIT__ = true;

  var CHANNEL_SUFFIX = 'a1cAEfNGnpPnaIqNa_-BJw';
  var FEED_VIDEOS_URL = 'https://www.youtube.com/feeds/videos.xml?playlist_id=UULF' + CHANNEL_SUFFIX;
  var FEED_SHORTS_URL = 'https://www.youtube.com/feeds/videos.xml?playlist_id=UUSH' + CHANNEL_SUFFIX;
  var RSS_CACHE_KEY = 'sjahm_yt_live_rss_cache_v1';
  var RSS_TTL_MS = 4 * 60 * 1000; // 4 minutes cache

  var EXCLUDED_RE = /سرفراز\s*فیضی|sarf(?:a)?raz\s*faizi|کمال\s*الدین\s*سنابلی|kamal\s*ud\s*din\s*sanabili|kamaluddin\s*sanabili|کفایت\s*اللہ\s*سنابلی|kifayatullah\s*sanabili/i;

  function toUrduDigits(val) {
    return String(val === undefined || val === null ? '' : val).replace(/\d/g, function (d) {
      return '۰۱۲۳۴۵۶۷۸۹'[Number(d)];
    });
  }

  var SCHOLAR_MAP = [
    [/inayat\s*ullah\s*mad(?:a)?ni|عنایت\s*اللہ\s*مدنی/i, 'فضیلۃ الشیخ عنایت اللہ مدنی حفظہ اللہ'],
    [/abdus?\s*salam\s*salafi|عبد\s*السلام\s*سلفی/i, 'فضیلۃ الشیخ عبد السلام سلفی حفظہ اللہ'],
    [/zafar\s*ul\s*hasan|ظفر\s*الحسن\s*مدنی/i, 'فضیلۃ الشیخ ظفر الحسن مدنی حفظہ اللہ'],
    [/abdul\s*qayyum\s*bastavi|عبد\s*القیوم\s*بستوی/i, 'فضیلۃ الشیخ ڈاکٹر عبد القیوم بستوی مدنی حفظہ اللہ'],
    [/abdul\s*hameed\s*zafar|عبد\s*الحمید\s*ظفر/i, 'فضیلۃ الشیخ ڈاکٹر عبد الحمید ظفر حفظہ اللہ'],
    [/abu\s*zaid\s*zameer|ابو\s*زید\s*ضمیر/i, 'فضیلۃ الشیخ ابو زید ضمیر حفظہ اللہ'],
    [/abdur?\s*rasheed\s*salafi|عبد\s*الرشید\s*سلفی/i, 'فضیلۃ الشیخ عبد الرشید سلفی حفظہ اللہ'],
    [/farooque?\s*abdullah|فاروق\s*عبد\s*اللہ/i, 'فضیلۃ الشیخ ڈاکٹر فاروق عبد اللہ مدنی حفظہ اللہ'],
    [/kalim\s*uddin\s*yusuf|کلیم\s*الدین\s*یوسف/i, 'فضیلۃ الشیخ ڈاکٹر کلیم الدین یوسف مدنی حفظہ اللہ'],
    [/al[ie]m\s*uddin\s*yusuf|علیم\s*الدین\s*یوسف/i, 'فضیلۃ الشیخ حافظ علیم الدین یوسف حفظہ اللہ'],
    [/muqeem\s*faizi|مقیم\s*فیضی/i, 'فضیلۃ الشیخ مقیم فیضی حفظہ اللہ'],
    [/mohammad\s*rahmani|muhammad\s*rahmani|محمد\s*رحمانی/i, 'فضیلۃ الشیخ محمد رحمانی مدنی حفظہ اللہ'],
    [/asghar\s*ali(?:\s*imam\s*mehdi)?\s*salafi|اصغر\s*علی/i, 'فضیلۃ الشیخ اصغر علی امام مہدی سلفی حفظہ اللہ'],
    [/mukhtar\s*ahmad\s*mad(?:a)?ni|مختار\s*احمد\s*مدنی/i, 'فضیلۃ الشیخ مختار احمد مدنی حفظہ اللہ'],
    [/khursheed\s*alam|خورشید\s*عالم/i, 'فضیلۃ الشیخ خورشید عالم مدنی حفظہ اللہ'],
    [/khalid\s*jamil\s*makki|خالد\s*جمیل\s*مکی/i, 'فضیلۃ الشیخ خالد جمیل مکی حفظہ اللہ'],
    [/saeed\s*ahm[ae]d\s*bastavi|سعید\s*احمد\s*بستوی/i, 'فضیلۃ الشیخ سعید احمد بستوی حفظہ اللہ'],
    [/najm\s*ul\s*hasan\s*faizi|نجم\s*الحسن\s*فیضی/i, 'فضیلۃ الشیخ قاری نجم الحسن فیضی حفظہ اللہ'],
    [/javed\s*nadeem\s*mad(?:a)?ni|جاوید\s*ندیم\s*مدنی/i, 'فضیلۃ الشیخ ڈاکٹر جاوید ندیم مدنی حفظہ اللہ'],
    [/abdul\s*wahid\s*anwar|عبد\s*الواحد\s*انور/i, 'فضیلۃ الشیخ عبد الواحد انور یوسفی حفظہ اللہ'],
    [/ajmal\s*manzoor|اجمل\s*منظور/i, 'فضیلۃ الشیخ ڈاکٹر اجمل منظور مدنی حفظہ اللہ'],
    [/ansar\s*zubair|انصار\s*زبیر/i, 'فضیلۃ الشیخ انصار زبیر محمدی حفظہ اللہ']
  ];

  var PHRASES = [
    [/\bmasjid[\s\-]*e[\s\-]*nab(?:a)?[vw]i\b/gi, 'مسجدِ نبوی ﷺ'],
    [/\bmasjid[\s\-]*al[\s\-]*haram\b/gi, 'مسجدِ حرام'],
    [/\bahle?\s*hadees\b/gi, 'اہلِ حدیث'],
    [/\basma\s*(?:wa|o|aur)\s*sifa+t\b/gi, 'اسماء و صفات'],
    [/\bhumm?\s*(?:wa|o|aur)\s*huzn\b/gi, 'ہم و حزن'],
    [/\bnafi\s*aur\s*isba+t\b/gi, 'نفی اور اثبات'],
    [/\bzarar[\s\-]*rasani\b/gi, 'ضرر رسانی'],
    [/\bummat[\s\-]*e[\s\-]*muslima\b/gi, 'امتِ مسلمہ'],
    [/\bhuqooq\s*(?:wa|o|aur)\s*mamla+t\b/gi, 'حقوق و معاملات'],
    [/\bkitab\s*(?:ut|ul|al)[\s\-]*tawheed\b/gi, 'کتاب التوحید'],
    [/\bmanhaj[\s\-]*e[\s\-]*salaf\b/gi, 'منہجِ سلف'],
    [/\bsirat[\s\-]*e[\s\-]*mustaqeem\b/gi, 'صراطِ مستقیم'],
    [/\bkhutba[\s\-]*e[\s\-]*jumu?ah?\b/gi, 'خطبۂ جمعہ'],
    [/\bislah[\s\-]*e[\s\-]*muashra\b/gi, 'اصلاحِ معاشرہ'],
    [/\btarbiyat[\s\-]*e[\s\-]*aulad\b/gi, 'تربیتِ اولاد'],
    [/\bghar\s*walon\b/gi, 'گھر والوں'],
    [/\bmiya\s*biwi\b/gi, 'میاں بیوی'],
    [/\baage\s*badh\b/gi, 'آگے بڑھ'],
    [/\bbas\s*kar\b/gi, 'بس کر']
  ];

  var WORDS = {
    'allah': 'اللہ', 'rasool': 'رسول ﷺ', 'nabi': 'نبی ﷺ', 'quran': 'قرآن', 'hadees': 'حدیث',
    'sunnat': 'سنت', 'sunnah': 'سنت', 'islam': 'اسلام', 'islami': 'اسلامی', 'iman': 'ایمان',
    'tawheed': 'توحید', 'tauheed': 'توحید', 'shirk': 'شرک', 'bidat': 'بدعت', 'manhaj': 'منہج',
    'aqeedah': 'عقیدہ', 'aqeeda': 'عقیدہ', 'salaf': 'سلف', 'salafi': 'سلفی', 'sahaba': 'صحابہ',
    'ilm': 'علم', 'deen': 'دین', 'deeni': 'دینی', 'dunya': 'دنیا', 'akhirat': 'آخرت',
    'qayamat': 'قیامت', 'jannat': 'جنت', 'jahannam': 'جہنم', 'qabr': 'قبر', 'maut': 'موت', 'wafat': 'وفات',
    'namaz': 'نماز', 'namazon': 'نمازوں', 'salah': 'صلاۃ', 'wazu': 'وضو', 'jumuah': 'جمعہ', 'juma': 'جمعہ',
    'khutba': 'خطبہ', 'eid': 'عید', 'ramazan': 'رمضان', 'ramadan': 'رمضان', 'roza': 'روزہ',
    'zakat': 'زکوٰۃ', 'sadqa': 'صدقہ', 'hajj': 'حج', 'umrah': 'عمرہ', 'qurbani': 'قربانی',
    'nikah': 'نکاح', 'talaq': 'طلاق', 'miras': 'میراث', 'tijarat': 'تجارت', 'halal': 'حلال', 'haram': 'حرام',
    'hukm': 'حکم', 'ahkam': 'احکام', 'masail': 'مسائل', 'dua': 'دعا', 'zikr': 'ذکر', 'tauba': 'توبہ',
    'istighfar': 'استغفار', 'sabr': 'صبر', 'shukr': 'شکر', 'taqwa': 'تقویٰ', 'ikhlas': 'اخلاص',
    'akhlaq': 'اخلاق', 'huqooq': 'حقوق', 'haq': 'حق', 'walidain': 'والدین', 'maa': 'ماں', 'aulad': 'اولاد',
    'khawateen': 'خواتین', 'naujawan': 'نوجوان', 'talib': 'طالب', 'tarbiyat': 'تربیت', 'islah': 'اصلاح',
    'fitna': 'فتنہ', 'fitne': 'فتنے', 'gunah': 'گناہ', 'sawab': 'ثواب', 'fazilat': 'فضیلت',
    'rahmat': 'رحمت', 'panah': 'پناہ', 'afaat': 'آفات', 'maal': 'مال', 'rizq': 'رزق',
    'neki': 'نیکی', 'burayi': 'برائی', 'murtakib': 'مرتکب', 'momanaat': 'ممانعت', "momana'at": 'ممانعت',
    'ehtemam': 'اہتمام', 'targheeb': 'ترغیب', 'rahnuma': 'رہنما', 'qadrein': 'قدریں',
    'zawal': 'زوال', 'asbaab': 'اسباب', 'rasta': 'راستہ', 'tareeqa': 'طریقہ', 'baabat': 'بابت',
    'mahina': 'مہینہ', 'masjid': 'مسجد', 'dars': 'درس', 'bayan': 'بیان', 'tafseer': 'تفسیر', 'surah': 'سورۃ',
    'aur': 'اور', 'wa': 'و', 'ya': 'یا', 'ka': 'کا', 'ki': 'کی', 'ke': 'کے', 'ko': 'کو', 'se': 'سے',
    'mein': 'میں', 'me': 'میں', 'par': 'پر', 'tak': 'تک', 'bhi': 'بھی', 'hi': 'ہی', 'hai': 'ہے', 'hain': 'ہیں',
    'nahi': 'نہیں', 'na': 'نہ', 'kya': 'کیا', 'kaise': 'کیسے', 'kaun': 'کون', 'kyun': 'کیوں',
    'apne': 'اپنے', 'apni': 'اپنی', 'uski': 'اس کی', 'aye': 'اے', 'ek': 'ایک', 'do': 'دو', 'teen': 'تین',
    'char': 'چار', 'paanch': 'پانچ', 'che': 'چھ', 'saat': 'سات', 'aath': 'آٹھ', 'nau': 'نو', 'das': 'دس',
    'baad': 'بعد', 'pehle': 'پہلے', 'karein': 'کریں', 'bachein': 'بچیں', 'sikhayein': 'سکھائیں', 'sakte': 'سکتے'
  };

  function phoneticWord(w) {
    if (!w || /[\u0600-\u06FF]/.test(w)) return w || '';
    if (/^\d+$/.test(w)) return toUrduDigits(w);
    var lw = w.toLowerCase().replace(/['’`]/g, '');
    if (WORDS[lw]) return WORDS[lw];
    var out = '', i = 0;
    while (i < lw.length) {
      var r = lw.slice(i);
      if (i === 0) {
        if (r.indexOf('aa') === 0) { out += 'آ'; i += 2; continue; }
        if (r.indexOf('ai') === 0 || r.indexOf('ay') === 0) { out += 'اے'; i += 2; continue; }
        if (r[0] === 'a') { out += 'ا'; i += 1; continue; }
        if (r[0] === 'i' || r.indexOf('ee') === 0) { out += 'ای'; i += r.indexOf('ee') === 0 ? 2 : 1; continue; }
        if (r[0] === 'u' || r[0] === 'o' || r.indexOf('oo') === 0) { out += 'او'; i += r.indexOf('oo') === 0 ? 2 : 1; continue; }
      }
      if (r.indexOf('sh') === 0) { out += 'ش'; i += 2; continue; }
      if (r.indexOf('kh') === 0) { out += 'خ'; i += 2; continue; }
      if (r.indexOf('gh') === 0) { out += 'غ'; i += 2; continue; }
      if (r.indexOf('ch') === 0) { out += 'چ'; i += 2; continue; }
      if (r.indexOf('ph') === 0) { out += 'پھ'; i += 2; continue; }
      if (r.indexOf('bh') === 0) { out += 'بھ'; i += 2; continue; }
      if (r.indexOf('th') === 0) { out += 'تھ'; i += 2; continue; }
      if (r.indexOf('dh') === 0) { out += 'دھ'; i += 2; continue; }
      if (r.indexOf('aa') === 0) { out += 'ا'; i += 2; continue; }
      if (r.indexOf('ee') === 0) { out += 'ی'; i += 2; continue; }
      if (r.indexOf('oo') === 0) { out += 'و'; i += 2; continue; }
      if (r.length >= 2 && r[0] === r[1] && /[bcdfghjklmnpqrstvwxyz]/.test(r[0])) { i += 1; continue; }
      var c = lw[i], end = (i === lw.length - 1);
      var m = { b:'ب', p:'پ', t:'ت', j:'ج', h:'ہ', d:'د', r:'ر', z:'ز', s:'س', c:'ک', q:'ق', k:'ک', g:'گ', l:'ل', m:'م', n:'ن', w:'و', v:'و', f:'ف', y:'ی' };
      if (m[c]) out += m[c];
      else if (c === 'a' && end) out += 'ہ';
      else if (c === 'e' && end) out += 'ے';
      else if (c === 'i' && end) out += 'ی';
      else if (c === 'o') out += 'و';
      i += 1;
    }
    return out || w;
  }

  function toPureUrduTitle(raw) {
    var txt = String(raw || '').replace(/#[A-Za-z_\u0600-\u06FF][A-Za-z0-9_\u0600-\u06FF]*/g, ' ').replace(/\s+/g, ' ').trim();
    var uCnt = (txt.match(/[\u0600-\u06FF]/g) || []).length;
    var lCnt = (txt.match(/[A-Za-z]/g) || []).length;
    if (uCnt > lCnt * 1.5 && uCnt >= 6) return toUrduDigits(txt);
    for (var k = 0; k < PHRASES.length; k++) {
      txt = txt.replace(PHRASES[k][0], ' ' + PHRASES[k][1] + ' ');
    }
    var numWords = { '8': 'آٹھ', '7': 'سات', '5': 'پانچ', '4': 'چار', '3': 'تین', '2': 'دو', '1': 'ایک' };
    txt = txt.replace(/\b([1-8])\b(?=\s+[A-Za-z\u0600-\u06FF])/g, function (_, d) { return numWords[d] || toUrduDigits(d); });
    return txt.split(/(\s+|[:!؟?،,.()\-—]+)/).map(function (t) {
      if (!t || /^\s+$/.test(t)) return t;
      if (t === '?') return '؟';
      if (t === ',') return '،';
      if (/^[:!؟،.()\-—]+$/.test(t)) return t;
      return phoneticWord(t);
    }).join('').replace(/\s+([؟!،:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  }

  function curateClientEntry(entry, isReel) {
    if (!entry) return null;
    var link = entry.link || '';
    var vidMatch = link.match(/(?:v=|\/shorts\/)([A-Za-z0-9_-]{11})/) || String(entry.guid || '').match(/video:([A-Za-z0-9_-]{11})/);
    var ytId = entry.youtubeId || (vidMatch ? vidMatch[1] : '');
    var rawTitle = String(entry.title || '').trim();
    var rawDesc = String(entry.description || '').trim();
    if (!ytId || EXCLUDED_RE.test(rawTitle + ' ' + rawDesc)) return null;

    var clean = rawTitle.replace(/#[A-Za-z_\u0600-\u06FF][A-Za-z0-9_\u0600-\u06FF]*/g, '').trim();
    var segs = clean.split(/\s*\|\s*/).filter(Boolean);
    var spk = '', epNum = '', epLbl = '', topics = [];

    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      var epM = s.match(/^(?:(part|dars|qist|ep|lecture)\s*#?\s*(\d+)|#(\d+))$/i);
      if (epM) {
        epNum = toUrduDigits(epM[2] || epM[3]);
        epLbl = isReel ? ('کلپ نمبر ' + epNum) : ('درس نمبر ' + epNum);
        continue;
      }
      if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(s)) continue;
      var matchedSpk = null;
      for (var j = 0; j < SCHOLAR_MAP.length; j++) {
        if (SCHOLAR_MAP[j][0].test(s)) { matchedSpk = SCHOLAR_MAP[j][1]; break; }
      }
      if (matchedSpk) { spk = matchedSpk; continue; }
      if (/^(?:masjid|markaz|jamiat|madrasa|dharavi|mumbra|kurla|kalyan|bhiwandi|thane|chiplun)\b/i.test(s) && topics.length > 0) continue;
      if (/\b(?:series|conference|seminar)\b/i.test(s) && topics.length > 0) continue;
      topics.push(s);
    }

    if (!spk) {
      for (var m = 0; m < SCHOLAR_MAP.length; m++) {
        if (SCHOLAR_MAP[m][0].test(rawTitle + ' ' + rawDesc)) { spk = SCHOLAR_MAP[m][1]; break; }
      }
    }
    if (!spk) spk = 'علمائے صوبائی جمعیت اہل حدیث ممبئی';

    var rawTopic = (topics.length ? topics.join(' — ') : clean);
    var urduTitle = toPureUrduTitle(rawTopic);
    var cat = 'دعوتِ حق و سالانہ کانفرنسز';
    var comb = urduTitle + ' ' + rawTopic;
    if (/خطبہ|جمعہ|عید|\b(?:jumuah|juma|khutba|eid)\b/i.test(comb)) cat = 'خطباتِ جمعہ و عیدین';
    else if (/تفسیر|سورۃ|قرآن|آیت|\b(?:tafseer|surah|quran|ayat)\b/i.test(comb)) cat = 'تفسیر و علومِ قرآن';
    else if (/رمضان|روزہ|زکوٰۃ|صدقہ|\b(?:ramazan|ramadan|roza|zakat)\b/i.test(comb)) cat = 'رمضان، زکوٰۃ و صدقات';
    else if (/نماز|وضو|حج|عمرہ|قربانی|نکاح|تجارت|مسجدِ نبوی|\b(?:namaz|hajj|qurbani|tijarat)\b/i.test(comb)) cat = 'فقہ، عبادات و معاملات';
    else if (/اولاد|والدین|ماں|گھر والوں|نوجوان|تربیت|خواتین/i.test(comb)) cat = 'تربیتِ اولاد و نوجوانان';
    else if (/توحید|شرک|عقیدہ|منہج|سلف|اسماء و صفات|اہلِ حدیث/i.test(comb)) cat = 'عقیدہ و منہجِ سلف';
    else if (/توبہ|اخلاق|اصلاح|آفات|پناہ|ہم و حزن|فتنہ|نیکی|برائی|ضرر/i.test(comb) || isReel) cat = 'تزکیہ، اخلاق و اصلاحِ معاشرہ';

    var pubIso = entry.pubDate ? new Date(entry.pubDate.replace(' ', 'T') + (entry.pubDate.indexOf('Z') === -1 && entry.pubDate.indexOf('+') === -1 ? 'Z' : '')).toISOString() : new Date().toISOString();
    var dateOnly = pubIso.split('T')[0];

    return {
      id: 'yt-auto-' + (isReel ? 'reel-' : 'vid-') + ytId,
      youtubeId: ytId,
      title: urduTitle,
      romanTitle: rawTitle,
      speaker: spk,
      category: cat,
      isReel: Boolean(isReel),
      type: isReel ? 'reel' : 'youtube',
      videoFormat: isReel ? 'reel' : 'video',
      duration: isReel ? '0:55' : '32:00',
      date: dateOnly,
      publishedAt: pubIso,
      youtubeViews: 120,
      viewsCount: 120,
      episodeNumber: epNum,
      episodeLabel: epLbl
    };
  }

  function updateSidebarNewestVideo(embedUrl, title) {
    if (!embedUrl) return;
    var iframe = document.getElementById('sjSidebarNewestVideoIframe');
    if (iframe && iframe.getAttribute('src') !== embedUrl) {
      iframe.setAttribute('src', embedUrl);
      if (title) iframe.setAttribute('title', title);
    }
  }

  function resolveCatalogUrl() {
    var isGithubPages = window.location.hostname.indexOf('github.io') !== -1;
    var bucket = Math.floor(Date.now() / 120000);
    if (!isGithubPages && !window.__SJAHM_REL_PREFIX__) {
      return '/api/public/youtube/live-delta?t=' + bucket;
    }
    var prefix = window.__SJAHM_REL_PREFIX__ || '.';
    return prefix + '/api/youtube-live-catalog.json?t=' + bucket;
  }

  async function fetchRssViaJsonBridge(forceFresh) {
    try {
      if (!forceFresh) {
        var cached = JSON.parse(localStorage.getItem(RSS_CACHE_KEY) || 'null');
        if (cached && (Date.now() - cached.ts) < RSS_TTL_MS && Array.isArray(cached.items)) {
          return cached.items;
        }
      }
      var urls = [
        { url: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(FEED_VIDEOS_URL), isReel: false },
        { url: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(FEED_SHORTS_URL), isReel: true }
      ];
      var results = await Promise.all(urls.map(function (u) {
        return fetch(u.url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
      }));
      var curated = [];
      results.forEach(function (res, idx) {
        if (res && res.status === 'ok' && Array.isArray(res.items)) {
          res.items.forEach(function (entry) {
            var item = curateClientEntry(entry, urls[idx].isReel);
            if (item) curated.push(item);
          });
        }
      });
      if (curated.length > 0) {
        try {
          localStorage.setItem(RSS_CACHE_KEY, JSON.stringify({ ts: Date.now(), items: curated }));
        } catch (_) {}
      }
      return curated;
    } catch (_) {
      return [];
    }
  }

  async function runAutoSyncCycle(options) {
    options = options || {};
    var icon = document.getElementById('ytLiveSyncIcon');
    if (icon && options.isManual) icon.classList.add('fa-spin');

    try {
      var collected = [];
      var newestEmbed = '';
      var newestTitle = '';

      // 1. If manual trigger on Express backend, call POST /api/public/youtube/sync-now
      var isGithubPages = window.location.hostname.indexOf('github.io') !== -1;
      if (options.isManual && !isGithubPages) {
        try {
          var syncRes = await fetch('/api/public/youtube/sync-now', { method: 'POST' });
          if (syncRes.ok) {
            var syncJson = await syncRes.json();
            if (syncJson && syncJson.catalog) {
              var cat = syncJson.catalog;
              newestEmbed = cat.latestVideoEmbedUrl || '';
              newestTitle = cat.latestVideoTitle || '';
              collected = collected.concat(cat.latestVideos || [], cat.latestReels || []);
            }
          }
        } catch (_) {}
      }

      // 2. Fetch pre-curated live catalog JSON
      if (collected.length === 0) {
        try {
          var res = await fetch(resolveCatalogUrl());
          if (res.ok) {
            var data = await res.json();
            if (data) {
              newestEmbed = data.latestVideoEmbedUrl || '';
              newestTitle = data.latestVideoTitle || '';
              collected = collected.concat(data.latestVideos || [], data.latestReels || []);
            }
          }
        } catch (_) {}
      }

      // 3. Also check live YouTube RSS bridge for any upload published in the last few minutes
      if (typeof window.__mergeLiveYoutubeCatalog === 'function' || options.isManual) {
        var rssItems = await fetchRssViaJsonBridge(Boolean(options.isManual));
        if (rssItems.length > 0) {
          var firstStd = rssItems.find(function (x) { return !x.isReel; });
          if (firstStd && !newestEmbed) {
            newestEmbed = 'https://www.youtube.com/embed/' + firstStd.youtubeId;
            newestTitle = firstStd.title;
          }
          collected = collected.concat(rssItems);
        }
      }

      if (newestEmbed) {
        updateSidebarNewestVideo(newestEmbed, newestTitle);
      }

      if (typeof window.__mergeLiveYoutubeCatalog === 'function') {
        window.__mergeLiveYoutubeCatalog(collected, {
          showToast: Boolean(options.showToast || options.isManual),
          isManual: Boolean(options.isManual)
        });
      }
    } finally {
      if (icon) setTimeout(function () { icon.classList.remove('fa-spin'); }, 500);
    }
  }

  window.__triggerManualYoutubeSync = function () {
    runAutoSyncCycle({ isManual: true, showToast: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () { runAutoSyncCycle({ showToast: true }); }, 900);
    });
  } else {
    setTimeout(function () { runAutoSyncCycle({ showToast: true }); }, 900);
  }

  // Periodic quiet background check every 5 minutes while page remains open
  setInterval(function () {
    runAutoSyncCycle({ showToast: true });
  }, 5 * 60 * 1000);
})();
