/**
 * ============================================================================
 * SUBAI JAMIAT AHLE HADEES MUMBAI — AUTONOMOUS YOUTUBE VIDEOS & REELS SYNC ENGINE
 * ============================================================================
 * Automatically harvests all new Videos, Shorts/Reels, and Playlists from:
 *   - https://www.youtube.com/@SubaiJamiatAhleHadeesMumbai/videos
 *   - https://www.youtube.com/@SubaiJamiatAhleHadeesMumbai/shorts
 *   - https://www.youtube.com/@SubaiJamiatAhleHadeesMumbai/playlists
 *   - Official YouTube Atom Feeds: UULF... (Videos), UUSH... (Shorts), UU... (All)
 *
 * Enforces:
 *   1. Strict permanent exclusion of Sarfaraz Faizi & Kamaluddin Sanabili.
 *   2. Automatic Roman-Urdu -> Pure Scholarly Nastaliq Urdu title synthesis,
 *      speaker recognition, episode badge extraction, venue parsing & categorization.
 *   3. Accurate separation of Long-Form Videos vs Vertical Shorts/Reels.
 *   4. Zero-duplication merge into media_db.json + public/api/youtube-live-catalog.json.
 */

const fs = require('fs');
const path = require('path');

const CHANNEL_ID = 'UCa1cAEfNGnpPnaIqNa_-BJw';
const CHANNEL_SUFFIX = CHANNEL_ID.slice(2); // a1cAEfNGnpPnaIqNa_-BJw
const FEED_ALL_UPLOADS = `https://www.youtube.com/feeds/videos.xml?playlist_id=UU${CHANNEL_SUFFIX}`;
const FEED_VIDEOS_ONLY = `https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${CHANNEL_SUFFIX}`;
const FEED_SHORTS_ONLY = `https://www.youtube.com/feeds/videos.xml?playlist_id=UUSH${CHANNEL_SUFFIX}`;
const CHANNEL_BASE_URL = 'https://www.youtube.com/@SubaiJamiatAhleHadeesMumbai';

const MEDIA_DB_PATH = path.join(__dirname, '..', 'db', 'data', 'media_db.json');
const TITLE_CACHE_PATH = path.join(__dirname, '..', 'db', 'data', 'youtube_title_cache.json');
const PUBLIC_CATALOG_PATH = path.join(__dirname, '..', 'public', 'api', 'youtube-live-catalog.json');

// Permanent Blacklist Regex (Sarfaraz Faizi & Kamaluddin Sanabili)
const EXCLUDED_SPEAKERS_RE = /سرفراز\s*فیضی|sarf(?:a)?raz\s*faizi|کمال\s*الدین\s*سنابلی|kamal\s*ud\s*din\s*sanabili|kamaluddin\s*sanabili|کفایت\s*اللہ\s*سنابلی|kifayatullah\s*sanabili/i;

function toUrduDigits(val) {
  const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(val === undefined || val === null ? '' : val).replace(/\d/g, d => map[Number(d)]);
}

function formatExactUrduNumber(num) {
  const n = Math.max(0, Math.round(Number(num) || 0));
  return toUrduDigits(n.toLocaleString('en-US').replace(/,/g, '٬'));
}

function formatUrduViews(viewsNum) {
  const n = Math.max(1, Math.round(Number(viewsNum) || 1));
  return `${formatExactUrduNumber(n)} مشاہدات`;
}

function formatUrduDate(isoOrDateStr) {
  if (!isoOrDateStr) return '';
  const clean = String(isoOrDateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return toUrduDigits(clean);
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const urduMonths = [
    'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
    'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
  ];
  const mName = urduMonths[monthIdx] || 'جنوری';
  return `${toUrduDigits(day)} ${mName} ${toUrduDigits(year)}ء`;
}

function decodeXmlEntities(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// ============================================================================
// 1. OFFICIAL SCHOLAR RECOGNITION ENGINE
// ============================================================================
const SCHOLAR_PATTERNS = [
  { re: /inayat\s*ullah\s*mad(?:a)?ni|عنایت\s*اللہ\s*مدنی/i, urdu: 'فضیلۃ الشیخ عنایت اللہ مدنی حفظہ اللہ' },
  { re: /abdus?\s*salam\s*salafi|عبد\s*السلام\s*سلفی/i, urdu: 'فضیلۃ الشیخ عبد السلام سلفی حفظہ اللہ' },
  { re: /zafar\s*ul\s*hasan|ظفر\s*الحسن\s*مدنی/i, urdu: 'فضیلۃ الشیخ ظفر الحسن مدنی حفظہ اللہ' },
  { re: /abdul\s*qayyum\s*bastavi|عبد\s*القیوم\s*بستوی/i, urdu: 'فضیلۃ الشیخ ڈاکٹر عبد القیوم بستوی مدنی حفظہ اللہ' },
  { re: /abdul\s*hameed\s*zafar|عبد\s*الحمید\s*ظفر/i, urdu: 'فضیلۃ الشیخ ڈاکٹر عبد الحمید ظفر حفظہ اللہ' },
  { re: /abu\s*zaid\s*zameer|ابو\s*زید\s*ضمیر/i, urdu: 'فضیلۃ الشیخ ابو زید ضمیر حفظہ اللہ' },
  { re: /abdur?\s*rasheed\s*salafi|عبد\s*الرشید\s*سلفی/i, urdu: 'فضیلۃ الشیخ عبد الرشید سلفی حفظہ اللہ' },
  { re: /farooque?\s*abdullah|فاروق\s*عبد\s*اللہ/i, urdu: 'فضیلۃ الشیخ ڈاکٹر فاروق عبد اللہ مدنی حفظہ اللہ' },
  { re: /kalim\s*uddin\s*yusuf|کلیم\s*الدین\s*یوسف/i, urdu: 'فضیلۃ الشیخ ڈاکٹر کلیم الدین یوسف مدنی حفظہ اللہ' },
  { re: /al[ie]m\s*uddin\s*yusuf|علیم\s*الدین\s*یوسف/i, urdu: 'فضیلۃ الشیخ حافظ علیم الدین یوسف حفظہ اللہ' },
  { re: /muqeem\s*faizi|مقیم\s*فیضی/i, urdu: 'فضیلۃ الشیخ مقیم فیضی حفظہ اللہ' },
  { re: /mohammad\s*rahmani|muhammad\s*rahmani|محمد\s*رحمانی/i, urdu: 'فضیلۃ الشیخ محمد رحمانی مدنی حفظہ اللہ' },
  { re: /asghar\s*ali(?:\s*imam\s*mehdi)?\s*salafi|اصغر\s*علی/i, urdu: 'فضیلۃ الشیخ اصغر علی امام مہدی سلفی حفظہ اللہ' },
  { re: /mukhtar\s*ahmad\s*mad(?:a)?ni|مختار\s*احمد\s*مدنی/i, urdu: 'فضیلۃ الشیخ مختار احمد مدنی حفظہ اللہ' },
  { re: /khursheed\s*alam\s*mad(?:a)?ni|خورشید\s*عالم\s*مدنی/i, urdu: 'فضیلۃ الشیخ خورشید عالم مدنی حفظہ اللہ' },
  { re: /khalid\s*jamil\s*makki|خالد\s*جمیل\s*مکی/i, urdu: 'فضیلۃ الشیخ خالد جمیل مکی حفظہ اللہ' },
  { re: /abdu?\s*rizwa+n\s*mohammadi|عبد\s*الرضوان\s*محمدی/i, urdu: 'فضیلۃ الشیخ عبد الرضوان محمدی حفظہ اللہ' },
  { re: /saeed\s*ahm[ae]d\s*bastavi|سعید\s*احمد\s*بستوی/i, urdu: 'فضیلۃ الشیخ سعید احمد بستوی حفظہ اللہ' },
  { re: /abdul\s*mueed\s*mad(?:a)?ni|عبد\s*المعید\s*مدنی/i, urdu: 'فضیلۃ الشیخ عبد المعید مدنی رحمہ اللہ' },
  { re: /saeed\s*ahm[ae]d\s*faizi|سعید\s*احمد\s*فیضی/i, urdu: 'فضیلۃ الشیخ ڈاکٹر سعید احمد فیضی حفظہ اللہ' },
  { re: /najm\s*ul\s*hasan\s*faizi|نجم\s*الحسن\s*فیضی/i, urdu: 'فضیلۃ الشیخ قاری نجم الحسن فیضی حفظہ اللہ' },
  { re: /abdul\s*hadee?\s*mad(?:a)?ni|عبد\s*الہادی\s*مدنی/i, urdu: 'فضیلۃ الشیخ عبد الہادی مدنی حفظہ اللہ' },
  { re: /javed\s*nadeem\s*mad(?:a)?ni|جاوید\s*ندیم\s*مدنی/i, urdu: 'فضیلۃ الشیخ ڈاکٹر جاوید ندیم مدنی حفظہ اللہ' },
  { re: /abdul\s*wahid\s*anwar\s*yusufi|عبد\s*الواحد\s*انور\s*یوسفی/i, urdu: 'فضیلۃ الشیخ عبد الواحد انور یوسفی حفظہ اللہ' },
  { re: /shamim\s*ahm[ae]d\s*salafi|شمیم\s*احمد\s*سلفی/i, urdu: 'فضیلۃ الشیخ شمیم احمد سلفی حفظہ اللہ' },
  { re: /hameed\s*ullah\s*salafi|حمید\s*اللہ\s*سلفی/i, urdu: 'فضیلۃ الشیخ حمید اللہ سلفی حفظہ اللہ' },
  { re: /abdul\s*hameed\s*rahmani|عبد\s*الحمید\s*رحمانی/i, urdu: 'فضیلۃ الشیخ مولانا عبد الحمید رحمانی رحمہ اللہ' },
  { re: /ajmal\s*manzoor\s*mad(?:a)?ni|اجمل\s*منظور\s*مدنی/i, urdu: 'فضیلۃ الشیخ ڈاکٹر اجمل منظور مدنی حفظہ اللہ' },
  { re: /ansar\s*zubair\s*mohammadi|انصار\s*زبیر\s*محمدی/i, urdu: 'فضیلۃ الشیخ انصار زبیر محمدی حفظہ اللہ' },
  { re: /arshad\s*sikrawi|ارشد\s*سکراوی/i, urdu: 'فضیلۃ الشیخ ارشد سکراوی حفظہ اللہ' },
  { re: /muti\s*ul\s*haq|مطیع\s*الحق/i, urdu: 'فضیلۃ الشیخ مطیع الحق سلفی حفظہ اللہ' },
  { re: /abdul\s*hakeem\s*mad(?:a)?ni|عبد\s*الحکیم\s*مدنی/i, urdu: 'فضیلۃ الشیخ عبد الحکیم مدنی حفظہ اللہ' },
  { re: /jalal\s*uddin\s*faizi|جلال\s*الدین\s*فیضی/i, urdu: 'فضیلۃ الشیخ جلال الدین فیضی حفظہ اللہ' },
  { re: /badr\s*uz\s*zaman|بدر\s*الزماں/i, urdu: 'فضیلۃ الشیخ بدر الزماں سلفی حفظہ اللہ' },
  { re: /manzar\s*ahsan\s*salafi|منظر\s*احسن\s*سلفی/i, urdu: 'فضیلۃ الشیخ منظر احسن سلفی حفظہ اللہ' },
  { re: /altaf\s*husain\s*faizi|الطاف\s*حسین\s*فیضی/i, urdu: 'فضیلۃ الشیخ الطاف حسین فیضی حفظہ اللہ' },
  { re: /sana\s*ullah\s*mad(?:a)?ni|ثناء\s*اللہ\s*مدنی/i, urdu: 'فضیلۃ الشیخ ثناء اللہ مدنی حفظہ اللہ' },
  { re: /meraj\s*rabbani|معراج\s*ربانی/i, urdu: 'فضیلۃ الشیخ ڈاکٹر معراج ربانی حفظہ اللہ' },
  { re: /jarjis\s*ansari|جرجیس\s*انصاری/i, urdu: 'فضیلۃ الشیخ جرجیس انصاری حفظہ اللہ' }
];

// ============================================================================
// 2. ROMAN-URDU TO PURE SCHOLARLY NASTALIQ URDU ENGINE
// ============================================================================
const PHRASE_REPLACEMENTS = [
  [/\bmasjid[\s\-]*e[\s\-]*nab(?:a)?[vw]i\b/gi, 'مسجدِ نبوی ﷺ'],
  [/\bmasjid[\s\-]*al[\s\-]*haram\b/gi, 'مسجدِ حرام'],
  [/\bmasjid[\s\-]*e[\s\-]*aqsa\b/gi, 'مسجدِ اقصیٰ'],
  [/\bahle?\s*hadees\b/gi, 'اہلِ حدیث'],
  [/\bahl[\s\-]*ul[\s\-]*hadeeth\b/gi, 'اہلِ حدیث'],
  [/\basma\s*(?:wa|o|aur)\s*sifa+t\b/gi, 'اسماء و صفات'],
  [/\bhumm?\s*(?:wa|o|aur)\s*huzn\b/gi, 'ہم و حزن'],
  [/\bnafi\s*aur\s*isba+t\b/gi, 'نفی اور اثبات'],
  [/\bzarar[\s\-]*rasani\b/gi, 'ضرر رسانی'],
  [/\bummat[\s\-]*e[\s\-]*muslima\b/gi, 'امتِ مسلمہ'],
  [/\bhuqooq\s*(?:wa|o|aur)\s*mamla+t\b/gi, 'حقوق و معاملات'],
  [/\bkitab\s*(?:ut|ul|al)[\s\-]*tawheed\b/gi, 'کتاب التوحید'],
  [/\baqeedah?\s*wasitiy+ah?\b/gi, 'عقیدہ واسطیہ'],
  [/\bmanhaj[\s\-]*e[\s\-]*salaf\b/gi, 'منہجِ سلف'],
  [/\bsirat[\s\-]*e[\s\-]*mustaqeem\b/gi, 'صراطِ مستقیم'],
  [/\bsallallahu\s*alaihi\s*wasallam\b/gi, 'ﷺ'],
  [/\bkhutba[\s\-]*e[\s\-]*jumu?ah?\b/gi, 'خطبۂ جمعہ'],
  [/\bdars[\s\-]*e[\s\-]*quran\b/gi, 'درسِ قرآن'],
  [/\bdars[\s\-]*e[\s\-]*hadees\b/gi, 'درسِ حدیث'],
  [/\bislah[\s\-]*e[\s\-]*muashra\b/gi, 'اصلاحِ معاشرہ'],
  [/\btarbiyat[\s\-]*e[\s\-]*aulad\b/gi, 'تربیتِ اولاد'],
  [/\bkhatm[\s\-]*e[\s\-]*nubuwwat\b/gi, 'ختمِ نبوت'],
  [/\bseerat[\s\-]*un[\s\-]*nabi\b/gi, 'سیرت النبی ﷺ'],
  [/\bazmat[\s\-]*e[\s\-]*sahaba\b/gi, 'عظمتِ صحابہ'],
  [/\blailat[\s\-]*ul[\s\-]*qadr\b/gi, 'لیلۃ القدر'],
  [/\bsadqat[\s\-]*ul[\s\-]*fitr\b/gi, 'صدقۃ الفطر'],
  [/\beid[\s\-]*ul[\s\-]*fitr\b/gi, 'عید الفطر'],
  [/\beid[\s\-]*ul[\s\-]*adha\b/gi, 'عید الاضحیٰ'],
  [/\bmiya\s*biwi\b/gi, 'میاں بیوی'],
  [/\bghar\s*walon\b/gi, 'گھر والوں'],
  [/\baage\s*badh\b/gi, 'آگے بڑھ'],
  [/\bbas\s*kar\b/gi, 'بس کر'],
  [/\bek\s*dusre\b/gi, 'ایک دوسرے']
];

const ROMAN_WORD_LEXICON = {
  'allah': 'اللہ', 'rasool': 'رسول ﷺ', 'nabi': 'نبی ﷺ', 'quran': 'قرآن', 'quraan': 'قرآن',
  'hadees': 'حدیث', 'hadith': 'حدیث', 'sunnat': 'سنت', 'sunnah': 'سنت', 'islam': 'اسلام',
  'islami': 'اسلامی', 'iman': 'ایمان', 'eemaan': 'ایمان', 'eman': 'ایمان', 'tawheed': 'توحید',
  'tauheed': 'توحید', 'shirk': 'شرک', 'bidat': 'بدعت', 'bidaat': 'بدعات', 'manhaj': 'منہج',
  'aqeedah': 'عقیدہ', 'aqeeda': 'عقیدہ', 'aqaid': 'عقائد', 'salaf': 'سلف', 'salafi': 'سلفی',
  'sahaba': 'صحابہ', 'sahabi': 'صحابی', 'tabieen': 'تابعین', 'ulama': 'علماء', 'aalim': 'عالم',
  'ilm': 'علم', 'deen': 'دین', 'deeni': 'دینی', 'dunya': 'دنیا', 'duniya': 'دنیا',
  'akhirat': 'آخرت', 'aakhirat': 'آخرت', 'qayamat': 'قیامت', 'qiyamat': 'قیامت',
  'jannat': 'جنت', 'jahannam': 'جہنم', 'qabr': 'قبر', 'qabar': 'قبر', 'maut': 'موت', 'wafat': 'وفات',
  'namaz': 'نماز', 'namaaz': 'نماز', 'namazon': 'نمازوں', 'salah': 'صلاۃ', 'salat': 'صلاۃ',
  'wazu': 'وضو', 'wudu': 'وضو', 'ghusl': 'غسل', 'taharat': 'طہارت', 'azan': 'اذان',
  'jumuah': 'جمعہ', 'juma': 'جمعہ', 'khutba': 'خطبہ', 'khutbah': 'خطبہ', 'eid': 'عید',
  'ramazan': 'رمضان', 'ramadan': 'رمضان', 'roza': 'روزہ', 'roze': 'روزے', 'siyam': 'صیام',
  'zakat': 'زکوٰۃ', 'zakaat': 'زکوٰۃ', 'sadqa': 'صدقہ', 'sadaqah': 'صدقہ', 'fitra': 'فطرہ',
  'hajj': 'حج', 'umrah': 'عمرہ', 'qurbani': 'قربانی', 'udhiya': 'اضحیہ',
  'nikah': 'نکاح', 'talaq': 'طلاق', 'khula': 'خلع', 'miras': 'میراث', 'wirasat': 'وراثت',
  'tijarat': 'تجارت', 'riba': 'ربا', 'sood': 'سود', 'halal': 'حلال', 'haram': 'حرام',
  'jaiz': 'جائز', 'najaiz': 'ناجائز', 'hukm': 'حکم', 'ahkam': 'احکام', 'masail': 'مسائل', 'masla': 'مسئلہ',
  'dua': 'دعا', 'duayein': 'دعائیں', 'zikr': 'ذکر', 'azkar': 'اذکار', 'tauba': 'توبہ', 'tawbah': 'توبہ',
  'istighfar': 'استغفار', 'sabr': 'صبر', 'shukr': 'شکر', 'taqwa': 'تقویٰ', 'ikhlas': 'اخلاص',
  'akhlaq': 'اخلاق', 'adab': 'آداب', 'aadab': 'آداب', 'huqooq': 'حقوق', 'haq': 'حق',
  'walidain': 'والدین', 'maa': 'ماں', 'baap': 'باپ', 'aulad': 'اولاد', 'bachon': 'بچوں',
  'khawateen': 'خواتین', 'aurat': 'عورت', 'aurton': 'عورتوں', 'biwi': 'بیوی', 'shohar': 'شوہر',
  'naujawan': 'نوجوان', 'talib': 'طالب', 'ul': 'ال', 'tarbiyat': 'تربیت', 'islah': 'اصلاح',
  'muashra': 'معاشرہ', 'fitna': 'فتنہ', 'fitne': 'فتنے', 'fitnon': 'فتنوں', 'gunah': 'گناہ',
  'gunahon': 'گناہوں', 'sawab': 'ثواب', 'ajr': 'اجر', 'fazilat': 'فضیلت', 'fazail': 'فضائل',
  'barakat': 'برکت', 'rahmat': 'رحمت', 'maghfirat': 'مغفرت', 'panah': 'پناہ', 'afaat': 'آفات',
  'afat': 'آفت', 'musibat': 'مصیبت', 'pareshani': 'پریشانی', 'gham': 'غم', 'huzn': 'حزن',
  'maal': 'مال', 'rizq': 'رزق', 'dolat': 'دولت', 'neki': 'نیکی', 'burayi': 'برائی', 'burai': 'برائی',
  'murtakib': 'مرتکب', 'momanaat': 'ممانعت', "momana'at": 'ممانعت', 'mumanaat': 'ممانعت',
  'ehtemam': 'اہتمام', 'ehtimam': 'اہتمام', 'targheeb': 'ترغیب', 'rahnuma': 'رہنما',
  'qadrein': 'قدریں', 'zawal': 'زوال', 'asbaab': 'اسباب', 'asbab': 'اسباب', 'rasta': 'راستہ',
  'raasta': 'راستہ', 'tareeqa': 'طریقہ', 'tariqa': 'طریقہ', 'baabat': 'بابت', 'babat': 'بابت',
  'mahina': 'مہینہ', 'saal': 'سال', 'din': 'دن', 'raat': 'رات', 'waqt': 'وقت',
  'masjid': 'مسجد', 'madrasa': 'مدرسہ', 'markaz': 'مرکز', 'jamiat': 'جمعیت',
  'conference': 'کانفرنس', 'seminar': 'سیمینار', 'ijtima': 'اجتماع', 'dars': 'درس',
  'bayan': 'بیان', 'khitab': 'خطاب', 'series': 'سیریز', 'sharh': 'شرح', 'tafseer': 'تفسیر',
  'surah': 'سورۃ', 'ayat': 'آیت', 'dayyus': 'دیوث', 'zulm': 'ظلم', 'adl': 'عدل', 'aman': 'امن',
  // Functional Urdu words & verbs
  'aur': 'اور', 'wa': 'و', 'o': 'و', 'ya': 'یا', 'ka': 'کا', 'ki': 'کی', 'ke': 'کے',
  'ko': 'کو', 'se': 'سے', 'mein': 'میں', 'me': 'میں', 'main': 'میں', 'par': 'پر', 'pe': 'پر',
  'tak': 'تک', 'bhi': 'بھی', 'hi': 'ہی', 'to': 'تو', 'jo': 'جو', 'wo': 'وہ', 'woh': 'وہ',
  'ye': 'یہ', 'yeh': 'یہ', 'is': 'اس', 'us': 'اس', 'uski': 'اس کی', 'uska': 'اس کا', 'uske': 'اس کے',
  'un': 'ان', 'unki': 'ان کی', 'unka': 'ان کا', 'unke': 'ان کے', 'apne': 'اپنے', 'apni': 'اپنی', 'apna': 'اپنا',
  'hum': 'ہم', 'ham': 'ہم', 'hamare': 'ہمارے', 'hamari': 'ہماری', 'aap': 'آپ', 'tum': 'تم',
  'hai': 'ہے', 'hain': 'ہیں', 'tha': 'تھا', 'thi': 'تھی', 'the': 'تھے', 'ho': 'ہو', 'hon': 'ہوں',
  'hota': 'ہوتا', 'hoti': 'ہوتی', 'hona': 'ہونا', 'nahi': 'نہیں', 'nahin': 'نہیں', 'na': 'نہ', 'mat': 'مت',
  'kya': 'کیا', 'کیوں': 'کیوں', 'kyun': 'کیوں', 'kyon': 'کیوں', 'kaise': 'کیسے', 'kaisa': 'کیسا',
  'kaun': 'کون', 'kab': 'کب', 'kahan': 'کہاں', 'kitna': 'کتنا', 'kitne': 'کتنے',
  'aye': 'اے', 'ai': 'اے', 'ek': 'ایک', 'do': 'دو', 'teen': 'تین', 'char': 'چار', 'paanch': 'پانچ',
  'che': 'چھ', 'saat': 'سات', 'aath': 'آٹھ', 'nau': 'نو', 'das': 'دس',
  'baad': 'بعد', 'pehle': 'پہلے', 'sath': 'ساتھ', 'saath': 'ساتھ', 'liye': 'لیے', 'lye': 'لیے',
  'karein': 'کریں', 'karen': 'کریں', 'karna': 'کرنا', 'karo': 'کرو', 'bachein': 'بچیں', 'bachna': 'بچنا',
  'sikhayein': 'سکھائیں', 'sikhalane': 'سکھلانے', 'sikhane': 'سکھانے', 'wali': 'والی', 'wala': 'والا', 'wale': 'والے',
  'dekh': 'دیکھ', 'sakte': 'سکتے', 'sakta': 'سکتا', 'sakti': 'سکتی', 'chahiye': 'چاہیے',
  'zaroori': 'ضروری', 'aham': 'اہم', 'mukhtasar': 'مختصر', 'mukammal': 'مکمل', 'khas': 'خاص', 'aam': 'عام'
};

const NUMBER_WORDS_URDU = {
  '1': 'ایک', '2': 'دو', '3': 'تین', '4': 'چار', '5': 'پانچ',
  '6': 'چھ', '7': 'سات', '8': 'آٹھ', '9': 'نو', '10': 'دس'
};

function phoneticRomanWordToUrdu(word) {
  if (!word) return '';
  if (/[\u0600-\u06FF]/.test(word)) return word;
  if (/^\d+$/.test(word)) return toUrduDigits(word);

  const lower = word.toLowerCase().replace(/['’`]/g, '');
  if (ROMAN_WORD_LEXICON[lower]) return ROMAN_WORD_LEXICON[lower];

  // Handle hyphenated izafat e.g. hubb-e-rasool -> حبِ رسول
  if (lower.includes('-e-')) {
    const parts = lower.split('-e-');
    return parts.map((p, idx) => {
      const tr = phoneticRomanWordToUrdu(p);
      return idx < parts.length - 1 ? `${tr}ِ` : tr;
    }).join(' ');
  }
  if (lower.includes('-')) {
    return lower.split('-').map(phoneticRomanWordToUrdu).join(' ');
  }

  let s = lower;
  let out = '';
  let i = 0;
  while (i < s.length) {
    const rem = s.slice(i);
    if (i === 0) {
      if (rem.startsWith('aa') || rem.startsWith('a')) {
        if (rem.startsWith('aa')) { out += 'آ'; i += 2; continue; }
        if (rem.startsWith('ai') || rem.startsWith('ay')) { out += 'اے'; i += 2; continue; }
        if (rem.startsWith('au') || rem.startsWith('aw')) { out += 'او'; i += 2; continue; }
        out += 'ا'; i += 1; continue;
      }
      if (rem.startsWith('ee') || rem.startsWith('i')) { out += 'ای'; i += rem.startsWith('ee') ? 2 : 1; continue; }
      if (rem.startsWith('oo') || rem.startsWith('u') || rem.startsWith('o')) { out += 'او'; i += rem.startsWith('oo') ? 2 : 1; continue; }
      if (rem.startsWith('e')) { out += 'اے'; i += 1; continue; }
    }

    // Digraphs
    if (rem.startsWith('sh')) { out += 'ش'; i += 2; continue; }
    if (rem.startsWith('kh')) { out += 'خ'; i += 2; continue; }
    if (rem.startsWith('gh')) { out += 'غ'; i += 2; continue; }
    if (rem.startsWith('ch')) { out += 'چ'; i += 2; continue; }
    if (rem.startsWith('ph')) { out += 'پھ'; i += 2; continue; }
    if (rem.startsWith('bh')) { out += 'بھ'; i += 2; continue; }
    if (rem.startsWith('th')) { out += 'تھ'; i += 2; continue; }
    if (rem.startsWith('dh')) { out += 'دھ'; i += 2; continue; }
    if (rem.startsWith('zh')) { out += 'ژ'; i += 2; continue; }
    if (rem.startsWith('aa')) { out += 'ا'; i += 2; continue; }
    if (rem.startsWith('ee')) { out += 'ی'; i += 2; continue; }
    if (rem.startsWith('oo')) { out += 'و'; i += 2; continue; }
    if (rem.startsWith('ai') || rem.startsWith('ay')) { out += (i + 2 >= s.length ? 'ے' : 'ی'); i += 2; continue; }
    if (rem.startsWith('au') || rem.startsWith('ou')) { out += 'و'; i += 2; continue; }

    // Collapse geminate consonants (e.g. mm -> م)
    if (rem.length >= 2 && rem[0] === rem[1] && /[bcdfghjklmnpqrstvwxyz]/.test(rem[0])) {
      i += 1;
      continue;
    }

    const ch = s[i];
    const isEnd = (i === s.length - 1);
    switch (ch) {
      case 'b': out += 'ب'; break;
      case 'p': out += 'پ'; break;
      case 't': out += 'ت'; break;
      case 'j': out += 'ج'; break;
      case 'h': out += 'ہ'; break;
      case 'd': out += 'د'; break;
      case 'r': out += 'ر'; break;
      case 'z': out += 'ز'; break;
      case 's': out += 'س'; break;
      case 'c': out += 'ک'; break;
      case 'q': out += 'ق'; break;
      case 'k': out += 'ک'; break;
      case 'g': out += 'گ'; break;
      case 'l': out += 'ل'; break;
      case 'm': out += 'م'; break;
      case 'n': out += 'ن'; break;
      case 'w':
      case 'v': out += 'و'; break;
      case 'f': out += 'ف'; break;
      case 'y': out += 'ی'; break;
      case 'a': if (isEnd) out += 'ہ'; break;
      case 'e': if (isEnd) out += 'ے'; break;
      case 'i': if (isEnd) out += 'ی'; break;
      case 'o': out += 'و'; break;
      case 'u': if (isEnd) out += 'و'; break;
      default:
        if (/\d/.test(ch)) out += toUrduDigits(ch);
        break;
    }
    i += 1;
  }
  return out || word;
}

function transliterateRomanToUrdu(rawText) {
  if (!rawText) return '';
  let text = decodeXmlEntities(rawText)
    .replace(/#[A-Za-z0-9_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If predominantly Urdu already, just clean Roman parentheticals & digits
  const urduChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  if (urduChars > latinChars * 1.5 && urduChars >= 6) {
    return toUrduDigits(text.replace(/\s*\([^)]*[A-Za-z][^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim());
  }

  for (const [re, rep] of PHRASE_REPLACEMENTS) {
    text = text.replace(re, ` ${rep} `);
  }

  // Convert standalone small numbers inside Urdu prose like "8 Afaat" -> "آٹھ آفات"
  text = text.replace(/\b([1-9]|10)\b(?=\s+[A-Za-z\u0600-\u06FF])/g, (_, d) => NUMBER_WORDS_URDU[d] || toUrduDigits(d));

  // Tokenize preserving punctuation
  const tokens = text.split(/(\s+|[:：!؟?،,.()«»\-—]+)/);
  const converted = tokens.map(tok => {
    if (!tok || /^\s+$/.test(tok)) return tok;
    if (tok === '?') return '؟';
    if (tok === ',') return '،';
    if (/^[:：!؟،.()«»\-—]+$/.test(tok)) return tok;
    return phoneticRomanWordToUrdu(tok);
  });

  return converted
    .join('')
    .replace(/\s+([؟!،۔:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ============================================================================
// 3. VENUE, EPISODE, CATEGORY & STRUCTURED METADATA PARSER
// ============================================================================
const VENUE_SEGMENT_RE = /^(?:masjid|jama\s*masjid|markaz|jamiat(?:ur|\s*ul)?|madrasa|dharavi|mumbra|kurla|kalyan|bhiwandi|thane|mira\s*road|chiplun|malegaon|byculla|madanpura|jogeshwari|andheri|govandi|sakinaka|kondhwa|pune|mumbai|jhula\s*maidan|halav\s*pool)\b/i;
const SERIES_SEGMENT_RE = /\bseries$|\bconference$|\bseminar$|\bijtima$|\bprogram(?:\s*\d{4})?$/i;
const DATE_SEGMENT_RE = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$|^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/;
const SPEAKER_SEGMENT_HINT_RE = /^(?:dr\.?|shaikh|sheikh|shaykh|maulana|mufti|hafiz|qari|allama|ustad|adv\.?)\b/i;

function parseRecordingDateSegment(seg) {
  const m1 = seg.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m1) {
    return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  }
  const m2 = seg.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (m2) {
    return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
  }
  return '';
}

function detectCategoryUrdu(urduTitle, rawTopicOnly, isReel) {
  const combined = `${urduTitle} ${rawTopicOnly || ''}`;
  if (/خطبہ|جمعہ|عید|\b(?:jumuah|juma|khutba|eid)\b/i.test(combined)) {
    return 'خطباتِ جمعہ و عیدین';
  }
  if (/تفسیر|سورۃ|قرآن|آیت|\b(?:tafseer|surah|quran|ayat)\b/i.test(combined)) {
    return 'تفسیر و علومِ قرآن';
  }
  if (/رمضان|روزہ|صیام|زکوٰۃ|صدقہ|فطرہ|لیلۃ القدر|\b(?:ramazan|ramadan|roza|zakat|sadqa)\b/i.test(combined)) {
    return 'رمضان، زکوٰۃ و صدقات';
  }
  if (/نماز|صلاۃ|وضو|طہارت|حج|عمرہ|قربانی|نکاح|طلاق|میراث|تجارت|سود|مسجدِ نبوی|\b(?:namaz|salah|hajj|umrah|qurbani|nikah|talaq|tijarat|masail)\b/i.test(combined)) {
    return 'فقہ، عبادات و معاملات';
  }
  if (/اولاد|والدین|ماں|گھر والوں|نوجوان|طالب|تربیت|بچوں|خواتین|میاں بیوی|\b(?:aulad|tarbiyat|maa|khawateen)\b|ghar\s*walon|miya\s*biwi/i.test(combined)) {
    return 'تربیتِ اولاد و نوجوانان';
  }
  if (/حدیث|سنت|سیرت|صحابہ|بلوغ المرام|ریاض الصالحین|\b(?:hadees|sunnat|seerat|sahaba)\b/i.test(combined)) {
    return 'حدیث و علومِ سنت';
  }
  if (/توحید|شرک|عقیدہ|منہج|سلف|اسماء و صفات|بدعت|ختمِ نبوت|واسطیہ|اہلِ حدیث|\b(?:tawheed|shirk|aqeeda|aqeedah|manhaj|salaf)\b|asma\s*wa\s*sifaat|ahle\s*hadees/i.test(combined)) {
    return 'عقیدہ و منہجِ سلف';
  }
  if (/توبہ|استغفار|اخلاق|اصلاح|آفات|پناہ|ہم و حزن|فتنہ|نیکی|برائی|ضرر|زوال|صبر|تقویٰ|آخرت|موت|وفات|دیوث|\b(?:tauba|akhlaq|islah|panah|fitna|neki|burayi|zarar)\b/i.test(combined)) {
    return 'تزکیہ، اخلاق و اصلاحِ معاشرہ';
  }
  return isReel ? 'تزکیہ، اخلاق و اصلاحِ معاشرہ' : 'دعوتِ حق و سالانہ کانفرنسز';
}

function loadTitleCache() {
  try {
    if (fs.existsSync(TITLE_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(TITLE_CACHE_PATH, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function saveTitleCache(cache) {
  try {
    fs.mkdirSync(path.dirname(TITLE_CACHE_PATH), { recursive: true });
    fs.writeFileSync(TITLE_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
  } catch (_) {}
}

async function maybeRefineTitleWithGemini(youtubeId, rawTopic, fallbackUrduTitle, cache) {
  if (cache[youtubeId] && cache[youtubeId].urduTitle) {
    return cache[youtubeId].urduTitle;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !rawTopic || !/[A-Za-z]/.test(rawTopic)) {
    return fallbackUrduTitle;
  }
  try {
    const prompt = `درج ذیل رومن اردو اسلامی بیان کے عنوان کو خالص، فصیح اور شستہ اردو نستعلیق املا میں تبدیل کریں۔ صرف JSON میں {"title":"..."} واپس کریں:\n${rawTopic}`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: 'application/json', temperature: 0.1 }
      })
    });
    if (res.ok) {
      const data = await res.json();
      const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = JSON.parse(txt);
      if (parsed && parsed.title && /[\u0600-\u06FF]/.test(parsed.title)) {
        cache[youtubeId] = { rawTopic, urduTitle: parsed.title.trim(), updatedAt: new Date().toISOString() };
        return parsed.title.trim();
      }
    }
  } catch (_) {}
  return fallbackUrduTitle;
}

async function curateRawYoutubeEntry(rawItem, titleCache = {}) {
  const rawTitle = decodeXmlEntities(rawItem.title || '').trim();
  const rawDesc = decodeXmlEntities(rawItem.description || '').trim();
  const isReel = Boolean(rawItem.isReel);

  if (!rawItem.youtubeId || EXCLUDED_SPEAKERS_RE.test(`${rawTitle} ${rawDesc}`)) {
    return null;
  }

  // Strip word hashtags (like #Shorts #masjidnabawi) while preserving numeric #18 episode markers
  const withoutHashtags = rawTitle.replace(/#[A-Za-z_\u0600-\u06FF][A-Za-z0-9_\u0600-\u06FF]*/g, '').replace(/\s{2,}/g, ' ').trim();
  const segments = withoutHashtags.split(/\s*\|\s*/).map(s => s.trim()).filter(Boolean);

  let episodeNumber = '';
  let episodeLabel = '';
  let speakerUrdu = '';
  let venueUrdu = '';
  let seriesHintUrdu = '';
  let recordingDate = '';
  const topicSegments = [];

  for (const seg of segments) {
    // 1. Episode / Part / Dars / #Clip segment
    const epMatch = seg.match(/^(?:(part|dars|qist|ep|episode|lecture|clip)\s*#?\s*(\d+)|#(\d+))$/i);
    if (epMatch) {
      const kind = (epMatch[1] || '').toLowerCase();
      const num = epMatch[2] || epMatch[3];
      episodeNumber = toUrduDigits(num);
      if (kind === 'dars' || kind === 'lecture') episodeLabel = `درس نمبر ${episodeNumber}`;
      else if (kind === 'qist' || kind === 'ep' || kind === 'episode') episodeLabel = `قسط نمبر ${episodeNumber}`;
      else if (kind === 'part') episodeLabel = `حصہ ${episodeNumber}`;
      else episodeLabel = isReel ? `کلپ نمبر ${episodeNumber}` : `درس نمبر ${episodeNumber}`;
      continue;
    }

    // 2. Date segment
    const parsedDate = parseRecordingDateSegment(seg);
    if (parsedDate) {
      recordingDate = parsedDate;
      continue;
    }

    // 3. Known Scholar match
    const matchedScholar = SCHOLAR_PATTERNS.find(sp => sp.re.test(seg));
    if (matchedScholar) {
      speakerUrdu = matchedScholar.urdu;
      continue;
    }

    // 4. Generic new guest speaker segment e.g. "Shaikh Fulani Madani"
    if (SPEAKER_SEGMENT_HINT_RE.test(seg) && seg.split(/\s+/).length <= 6) {
      const cleanedName = seg.replace(/^(?:dr\.?|shaikh|sheikh|shaykh|maulana|mufti|hafiz|qari|allama)\s+/i, '');
      const prefix = /^dr\.?/i.test(seg) ? 'فضیلۃ الشیخ ڈاکٹر ' : (/^hafiz/i.test(seg) ? 'فضیلۃ الشیخ حافظ ' : (/^qari/i.test(seg) ? 'فضیلۃ الشیخ قاری ' : 'فضیلۃ الشیخ '));
      speakerUrdu = `${prefix}${transliterateRomanToUrdu(cleanedName)} حفظہ اللہ`;
      continue;
    }

    // 5. Venue segment
    if (VENUE_SEGMENT_RE.test(seg) && topicSegments.length > 0) {
      venueUrdu = transliterateRomanToUrdu(seg);
      continue;
    }

    // 6. Series segment
    if (SERIES_SEGMENT_RE.test(seg) && topicSegments.length > 0) {
      seriesHintUrdu = transliterateRomanToUrdu(seg);
      continue;
    }

    topicSegments.push(seg);
  }

  // Fallback speaker lookup across full rawTitle + rawDesc
  if (!speakerUrdu) {
    const matchedAnywhere = SCHOLAR_PATTERNS.find(sp => sp.re.test(`${rawTitle} ${rawDesc}`));
    speakerUrdu = matchedAnywhere ? matchedAnywhere.urdu : 'علمائے صوبائی جمعیت اہل حدیث ممبئی';
  }

  const rawTopicJoined = (topicSegments.length ? topicSegments.join(' — ') : withoutHashtags)
    .replace(/^(?:part|dars|qist|ep|#)\s*\d+\s*[:\-–—]?\s*/i, '')
    .trim();

  let urduTitle = transliterateRomanToUrdu(rawTopicJoined);
  urduTitle = await maybeRefineTitleWithGemini(rawItem.youtubeId, rawTopicJoined, urduTitle, titleCache);

  if (EXCLUDED_SPEAKERS_RE.test(`${urduTitle} ${speakerUrdu}`)) {
    return null;
  }

  const publishedIso = rawItem.publishedAt || (recordingDate ? `${recordingDate}T12:00:00.000Z` : new Date().toISOString());
  const finalDate = recordingDate || String(publishedIso).split('T')[0];
  const category = detectCategoryUrdu(urduTitle, rawTopicJoined, isReel);
  const viewsNum = Math.max(1, Number(rawItem.viewsCount || 1));
  const duration = rawItem.duration || (isReel ? '0:55' : '38:00');
  const videoUrl = isReel
    ? `https://www.youtube.com/shorts/${rawItem.youtubeId}`
    : `https://www.youtube.com/watch?v=${rawItem.youtubeId}`;

  const descParts = [urduTitle, `مقرر: ${speakerUrdu}`];
  if (seriesHintUrdu) descParts.push(`سلسلہ: ${seriesHintUrdu}`);
  if (venueUrdu) descParts.push(`مقام: ${venueUrdu}`);

  return {
    id: `yt-auto-${isReel ? 'reel' : 'vid'}-${rawItem.youtubeId}`,
    title: urduTitle,
    romanTitle: rawTitle,
    speaker: speakerUrdu,
    category,
    type: isReel ? 'reel' : 'youtube',
    videoFormat: isReel ? 'reel' : 'video',
    isReel,
    youtubeId: rawItem.youtubeId,
    duration,
    date: finalDate,
    recordingDate: finalDate,
    urduDate: formatUrduDate(finalDate),
    publishedAt: publishedIso,
    createdAt: publishedIso,
    updatedAt: new Date().toISOString(),
    views: viewsNum,
    viewsCount: viewsNum,
    youtubeViews: viewsNum,
    webViews: 0,
    urduViews: formatUrduViews(viewsNum),
    likesCount: Math.max(15, Math.round(viewsNum * 0.08)),
    location: venueUrdu || '',
    description: descParts.join(' — ') + '۔ صوبائی جمعیت اہل حدیث ممبئی۔',
    url: videoUrl,
    videoUrl,
    embedUrl: `https://www.youtube.com/embed/${rawItem.youtubeId}`,
    thumbnail: `https://img.youtube.com/vi/${rawItem.youtubeId}/hqdefault.jpg`,
    thumbnailUrl: `https://img.youtube.com/vi/${rawItem.youtubeId}/hqdefault.jpg`,
    shortCode: `yta${rawItem.youtubeId.slice(0, 6)}`,
    slug: `jamiat-${isReel ? 'reel' : 'bayan'}-${rawItem.youtubeId}`,
    status: 'published',
    isHidden: false,
    source: 'youtube_channel_sync',
    seriesPlaylistId: '',
    seriesPlaylistTitle: seriesHintUrdu || '',
    episodeNumber,
    episodeLabel
  };
}

// ============================================================================
// 4. MULTI-SOURCE YOUTUBE FEED & TAB HARVESTER
// ============================================================================
async function fetchAtomFeed(feedUrl, forceIsReel) {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    return entries.map(m => {
      const block = m[1];
      const youtubeId = (block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] || '';
      const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
      const publishedAt = (block.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
      const description = (block.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || '';
      const viewsStr = (block.match(/<media:statistics[^>]*views="(\d+)"/) || [])[1] || '0';
      const linkHref = (block.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/) || [])[1] || '';
      const inferredShort = forceIsReel !== undefined
        ? forceIsReel
        : (/\/shorts\//i.test(linkHref) || /#shorts\b/i.test(`${title} ${description}`));
      return {
        youtubeId: youtubeId.trim(),
        title: decodeXmlEntities(title),
        description: decodeXmlEntities(description),
        publishedAt: publishedAt.trim(),
        viewsCount: parseInt(viewsStr, 10) || 0,
        isReel: Boolean(inferredShort)
      };
    }).filter(x => x.youtubeId);
  } catch (err) {
    console.warn('[YouTubeAutoSync] Atom feed error:', feedUrl, err.message);
    return [];
  }
}

async function fetchChannelTabInitialData(tabName) {
  try {
    const res = await fetch(`${CHANNEL_BASE_URL}/${tabName}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!res.ok) return [];
    const html = await res.text();
    const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
    if (!m) return [];
    const data = JSON.parse(m[1]);
    const out = [];

    function parseViewsText(txt) {
      if (!txt) return 0;
      const clean = String(txt).replace(/,/g, '').trim();
      const km = clean.match(/([\d.]+)\s*([KMkm])/);
      if (km) {
        const mult = km[2].toUpperCase() === 'M' ? 1000000 : 1000;
        return Math.round(parseFloat(km[1]) * mult);
      }
      const num = parseInt(clean.replace(/[^\d]/g, ''), 10);
      return isNaN(num) ? 0 : num;
    }

    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (node.videoRenderer && node.videoRenderer.videoId) {
        const vr = node.videoRenderer;
        const title = vr.title?.runs?.map(r => r.text).join('') || vr.title?.simpleText || '';
        const duration = vr.lengthText?.simpleText || '';
        const views = parseViewsText(vr.viewCountText?.simpleText || vr.shortViewCountText?.simpleText || '');
        const desc = vr.descriptionSnippet?.runs?.map(r => r.text).join('') || '';
        out.push({
          youtubeId: vr.videoId,
          title,
          description: desc,
          duration,
          viewsCount: views,
          isReel: false,
          tabOrder: out.length
        });
      } else if (tabName === 'videos' && node.lockupViewModel && node.lockupViewModel.contentId && /^[A-Za-z0-9_-]{11}$/.test(node.lockupViewModel.contentId)) {
        const lv = node.lockupViewModel;
        const vid = lv.contentId;
        const title = lv.metadata?.lockupMetadataViewModel?.title?.content || '';
        const overlays = lv.contentImage?.thumbnailViewModel?.overlays || [];
        let duration = '';
        for (const ov of overlays) {
          const badgeTxt = ov?.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.text;
          if (badgeTxt && /\d+:\d+/.test(badgeTxt)) {
            duration = badgeTxt.trim();
            break;
          }
        }
        let views = 0;
        const rows = lv.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
        for (const row of rows) {
          for (const part of (row.metadataParts || [])) {
            const c = part?.text?.content || '';
            if (/view/i.test(c)) views = parseViewsText(c);
          }
        }
        out.push({
          youtubeId: vid,
          title,
          description: '',
          duration,
          viewsCount: views,
          isReel: false,
          tabOrder: out.length
        });
      } else if (node.shortsLockupViewModel || node.reelItemRenderer) {
        if (node.reelItemRenderer && node.reelItemRenderer.videoId) {
          const rr = node.reelItemRenderer;
          out.push({
            youtubeId: rr.videoId,
            title: rr.headline?.simpleText || rr.headline?.runs?.map(r => r.text).join('') || '',
            viewsCount: parseViewsText(rr.viewCountText?.simpleText || ''),
            duration: '0:55',
            isReel: true,
            tabOrder: out.length
          });
        } else if (node.shortsLockupViewModel) {
          const sl = node.shortsLockupViewModel;
          const vid = sl.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId || '';
          const title = sl.overlayMetadata?.primaryText?.content || sl.accessibilityText || '';
          const viewsTxt = sl.overlayMetadata?.secondaryText?.content || '';
          if (vid) {
            out.push({
              youtubeId: vid,
              title: title.replace(/,\s*\d[\d,.KM]*\s*views?.*$/i, '').trim(),
              viewsCount: parseViewsText(viewsTxt),
              duration: '0:55',
              isReel: true,
              tabOrder: out.length
            });
          }
        }
      }
      for (const v of Object.values(node)) walk(v);
    }

    walk(data);
    return out;
  } catch (err) {
    console.warn(`[YouTubeAutoSync] Tab /${tabName} scrape error:`, err.message);
    return [];
  }
}

async function fetchOembedTitle(youtubeId) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`);
    if (!r.ok) return '';
    const j = await r.json();
    return j.title || '';
  } catch (_) {
    return '';
  }
}

async function harvestLiveYoutubeChannel(existingYoutubeIds = new Set()) {
  const [videosFeed, shortsFeed, allFeed, tabVideos, tabShorts] = await Promise.all([
    fetchAtomFeed(FEED_VIDEOS_ONLY, false),
    fetchAtomFeed(FEED_SHORTS_ONLY, true),
    fetchAtomFeed(FEED_ALL_UPLOADS, undefined),
    fetchChannelTabInitialData('videos'),
    fetchChannelTabInitialData('shorts')
  ]);

  // Compute oldest RSS timestamps so tab items beyond top-15 receive accurate chronological ordering
  const oldestVideoFeedMs = videosFeed.length
    ? new Date(videosFeed[videosFeed.length - 1].publishedAt || '2026-06-01T00:00:00Z').getTime()
    : Date.now() - 90 * 86400000;
  const oldestShortFeedMs = shortsFeed.length
    ? new Date(shortsFeed[shortsFeed.length - 1].publishedAt || '2026-03-01T00:00:00Z').getTime()
    : Date.now() - 180 * 86400000;

  tabVideos.forEach((tv, idx) => {
    if (!tv.publishedAt && idx >= 15) {
      tv.fallbackPublishedAt = new Date(oldestVideoFeedMs - (idx - 14) * 86400000).toISOString();
    }
  });
  tabShorts.forEach((ts, idx) => {
    if (!ts.publishedAt && idx >= 15) {
      ts.fallbackPublishedAt = new Date(oldestShortFeedMs - (idx - 14) * 86400000).toISOString();
    }
  });

  const shortIdSet = new Set([
    ...shortsFeed.map(x => x.youtubeId),
    ...tabShorts.map(x => x.youtubeId)
  ]);
  const longVideoIdSet = new Set([
    ...videosFeed.map(x => x.youtubeId),
    ...tabVideos.map(x => x.youtubeId)
  ]);

  const byYtId = new Map();
  function mergeRaw(item) {
    if (!item || !item.youtubeId) return;
    const prev = byYtId.get(item.youtubeId) || {};
    const resolvedIsReel = shortIdSet.has(item.youtubeId)
      ? true
      : (longVideoIdSet.has(item.youtubeId) ? false : Boolean(item.isReel ?? prev.isReel));
    byYtId.set(item.youtubeId, {
      youtubeId: item.youtubeId,
      title: item.title || prev.title || '',
      description: item.description || prev.description || '',
      publishedAt: prev.publishedAt || item.publishedAt || item.fallbackPublishedAt || prev.fallbackPublishedAt || '',
      duration: item.duration || prev.duration || '',
      viewsCount: Math.max(Number(prev.viewsCount || 0), Number(item.viewsCount || 0)),
      isReel: resolvedIsReel
    });
  }

  // Feed items first (have exact ISO publishedAt), then tab items (have exact duration & additional items)
  videosFeed.forEach(mergeRaw);
  shortsFeed.forEach(mergeRaw);
  allFeed.forEach(mergeRaw);
  tabVideos.forEach(mergeRaw);
  tabShorts.forEach(mergeRaw);

  // For any brand-new item missing title (e.g. compact shorts lockup), fetch oEmbed title
  const harvestedList = Array.from(byYtId.values());
  for (const item of harvestedList) {
    if (!existingYoutubeIds.has(item.youtubeId) && (!item.title || item.title.length < 4)) {
      item.title = await fetchOembedTitle(item.youtubeId);
    }
  }

  return harvestedList;
}

// ============================================================================
// 5. DATABASE MERGE, PLAYLIST MATCHING & LIVE CATALOG EXPORT
// ============================================================================
function matchAutoItemToPlaylist(item, playlists) {
  if (!Array.isArray(playlists) || !playlists.length) return null;
  const text = `${item.title || ''} ${item.seriesPlaylistTitle || ''} ${item.romanTitle || ''}`;
  if (/کتاب التوحید|kitab.*tawheed/i.test(text)) return playlists.find(p => /کتاب التوحید/.test(p.title)) || null;
  if (/واسطیہ|wasitiy/i.test(text)) return playlists.find(p => /واسطیہ/.test(p.title)) || null;
  if (/اسماء و صفات|asma.*sifaat/i.test(text)) return playlists.find(p => /اسماء و صفات|واسطیہ/.test(p.title)) || null;
  if (/حقوق و معاملات|huqooq.*mamlaat/i.test(text)) return playlists.find(p => /حقوق و معاملات/.test(p.title)) || null;
  if (/خطبۂ جمعہ|khutba.*jumu/i.test(text)) {
    if (/عنایت اللہ/.test(item.speaker)) return playlists.find(p => /خطباتِ جمعہ.*عنایت/.test(p.title)) || null;
    if (/عبد السلام/.test(item.speaker)) return playlists.find(p => /خطباتِ جمعہ.*عبد السلام/.test(p.title)) || null;
  }
  return playlists.find(p => p.category === item.category) || null;
}

let _isSyncRunning = false;
let _lastSyncSummary = {
  lastSyncedAt: null,
  addedVideos: 0,
  addedReels: 0,
  updatedViews: 0,
  totalChannelItems: 0
};

async function syncYoutubeChannelNow(options = {}) {
  if (_isSyncRunning) return _lastSyncSummary;
  _isSyncRunning = true;
  try {
    if (!fs.existsSync(MEDIA_DB_PATH)) {
      return _lastSyncSummary;
    }

    const dbRaw = JSON.parse(fs.readFileSync(MEDIA_DB_PATH, 'utf8'));
    const allVideos = Array.isArray(dbRaw.videos) ? dbRaw.videos : [];
    const playlists = allVideos.filter(v => v && (v.type === 'playlist_item' || v.videoFormat === 'playlist'));

    // Map primary (non-expanded) items by youtubeId
    const existingByYtId = new Map();
    allVideos.forEach(v => {
      if (v && v.youtubeId) {
        if (!existingByYtId.has(v.youtubeId) || v.playlistIndex === undefined) {
          existingByYtId.set(v.youtubeId, v);
        }
      }
    });

    const harvested = await harvestLiveYoutubeChannel(new Set(existingByYtId.keys()));
    const titleCache = loadTitleCache();

    const newlyAddedItems = [];
    let addedVideos = 0;
    let addedReels = 0;
    let updatedViews = 0;

    // Sort harvested older->newer when unshifting or newer->older when prepending
    harvested.sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tb - ta;
    });

    for (const rawItem of harvested) {
      if (EXCLUDED_SPEAKERS_RE.test(`${rawItem.title || ''} ${rawItem.description || ''}`)) {
        continue;
      }

      const existing = existingByYtId.get(rawItem.youtubeId);
      if (existing) {
        // Update live YouTube view count and exact publishedAt timestamp if available
        let touched = false;
        if (rawItem.viewsCount > Number(existing.youtubeViews || 0) && existing.playlistIndex === undefined) {
          existing.youtubeViews = rawItem.viewsCount;
          existing.viewsCount = existing.youtubeViews + Number(existing.webViews || 0);
          existing.views = existing.viewsCount;
          existing.urduViews = formatUrduViews(existing.viewsCount);
          touched = true;
          updatedViews++;
        }
        if (rawItem.publishedAt && (!existing.publishedAt || existing.publishedAt.endsWith('T00:00:00.000Z'))) {
          existing.publishedAt = rawItem.publishedAt;
          touched = true;
        }
        if (rawItem.title && !existing.romanTitle) {
          existing.romanTitle = rawItem.title;
          touched = true;
        }
        if (touched) existing.updatedAt = new Date().toISOString();
        continue;
      }

      // Brand-new YouTube video or Short/Reel!
      const curated = await curateRawYoutubeEntry(rawItem, titleCache);
      if (!curated) continue;

      const matchedPl = matchAutoItemToPlaylist(curated, playlists);
      if (matchedPl) {
        curated.seriesPlaylistId = matchedPl.id;
        if (!curated.seriesPlaylistTitle) curated.seriesPlaylistTitle = matchedPl.title;
        if (!Array.isArray(matchedPl.seriesEpisodeIds)) matchedPl.seriesEpisodeIds = [];
        if (!matchedPl.seriesEpisodeIds.unshift) matchedPl.seriesEpisodeIds = [curated.id];
        else if (!matchedPl.seriesEpisodeIds.includes(curated.id)) matchedPl.seriesEpisodeIds.unshift(curated.id);
      }

      newlyAddedItems.push(curated);
      existingByYtId.set(curated.youtubeId, curated);
      if (curated.isReel) addedReels++;
      else addedVideos++;
    }

    saveTitleCache(titleCache);

    if (newlyAddedItems.length > 0 || updatedViews > 0 || options.forceWriteCatalog) {
      const mergedVideos = [...newlyAddedItems, ...allVideos];
      dbRaw.videos = mergedVideos;
      dbRaw.lastUpdated = new Date().toISOString();

      if (newlyAddedItems.length > 0 || updatedViews > 0) {
        fs.writeFileSync(MEDIA_DB_PATH, JSON.stringify(dbRaw, null, 2), 'utf8');
      }

      // Write lightweight live delta catalog JSON for instant browser & GitHub Pages hydration
      writePublicLiveCatalog(mergedVideos);

      // Reload in-memory models if loaded in Express process
      try {
        const mediaModel = require('../db/models/mediaModel');
        if (mediaModel && typeof mediaModel.reload === 'function') mediaModel.reload();
        const commonData = require('../routes/getCommonData');
        if (commonData && typeof commonData.invalidateCache === 'function') commonData.invalidateCache();
      } catch (_) {}
    }

    _lastSyncSummary = {
      lastSyncedAt: new Date().toISOString(),
      addedVideos,
      addedReels,
      updatedViews,
      newlyAddedIds: newlyAddedItems.map(x => x.youtubeId),
      totalDatabaseItems: dbRaw.videos.length
    };
    return _lastSyncSummary;
  } catch (err) {
    console.error('[YouTubeAutoSync] syncYoutubeChannelNow error:', err.message);
    return _lastSyncSummary;
  } finally {
    _isSyncRunning = false;
  }
}

function writePublicLiveCatalog(allVideos) {
  try {
    const valid = (allVideos || []).filter(v =>
      v &&
      v.status === 'published' &&
      !v.isHidden &&
      v.playlistIndex === undefined &&
      !EXCLUDED_SPEAKERS_RE.test(`${v.title || ''} ${v.speaker || ''} ${v.description || ''}`)
    );

    const std = valid
      .filter(v => !v.isReel && v.type !== 'reel' && v.videoFormat !== 'reel' && v.type !== 'playlist_item' && v.videoFormat !== 'playlist')
      .sort((a, b) => new Date(b.publishedAt || b.date || 0) - new Date(a.publishedAt || a.date || 0));

    const rls = valid
      .filter(v => v.isReel === true || v.type === 'reel' || v.videoFormat === 'reel')
      .sort((a, b) => new Date(b.publishedAt || b.date || 0) - new Date(a.publishedAt || a.date || 0));

    const compact = item => ({
      id: item.id,
      title: item.title,
      romanTitle: item.romanTitle || '',
      speaker: item.speaker,
      category: item.category,
      type: item.type,
      videoFormat: item.videoFormat,
      isReel: Boolean(item.isReel),
      youtubeId: item.youtubeId || '',
      playlistId: item.playlistId || '',
      duration: item.duration || '',
      date: item.date || item.recordingDate || '',
      urduDate: item.urduDate || '',
      publishedAt: item.publishedAt || '',
      youtubeViews: Number(item.youtubeViews || item.viewsCount || 1),
      viewsCount: Number(item.viewsCount || item.youtubeViews || 1),
      likesCount: Number(item.likesCount || 25),
      seriesPlaylistId: item.seriesPlaylistId || '',
      seriesPlaylistTitle: item.seriesPlaylistTitle || '',
      episodeNumber: item.episodeNumber || '',
      episodeLabel: item.episodeLabel || ''
    });

    const payload = {
      channelId: CHANNEL_ID,
      syncedAt: new Date().toISOString(),
      latestVideoEmbedUrl: std[0] ? `https://www.youtube.com/embed/${std[0].youtubeId}` : '',
      latestVideoTitle: std[0] ? std[0].title : '',
      latestVideos: std.slice(0, 50).map(compact),
      latestReels: rls.slice(0, 50).map(compact)
    };

    fs.mkdirSync(path.dirname(PUBLIC_CATALOG_PATH), { recursive: true });
    fs.writeFileSync(PUBLIC_CATALOG_PATH, JSON.stringify(payload, null, 2), 'utf8');
    return payload;
  } catch (err) {
    console.warn('[YouTubeAutoSync] writePublicLiveCatalog error:', err.message);
    return null;
  }
}

let _daemonTimer = null;
function startAutoSyncDaemon(intervalMs = 10 * 60 * 1000) {
  if (_daemonTimer) return;
  // Run initial sync shortly after server boot without blocking startup
  setTimeout(() => {
    syncYoutubeChannelNow({ forceWriteCatalog: true }).then(res => {
      if (res && (res.addedVideos > 0 || res.addedReels > 0)) {
        console.log(`[YouTubeAutoSync] Initial sync added ${res.addedVideos} videos & ${res.addedReels} reels.`);
      }
    });
  }, 2500);

  _daemonTimer = setInterval(() => {
    syncYoutubeChannelNow().catch(() => {});
  }, intervalMs);
  if (_daemonTimer.unref) _daemonTimer.unref();
}

function getLastSyncSummary() {
  return _lastSyncSummary;
}

module.exports = {
  CHANNEL_ID,
  FEED_ALL_UPLOADS,
  FEED_VIDEOS_ONLY,
  FEED_SHORTS_ONLY,
  EXCLUDED_SPEAKERS_RE,
  transliterateRomanToUrdu,
  curateRawYoutubeEntry,
  harvestLiveYoutubeChannel,
  syncYoutubeChannelNow,
  writePublicLiveCatalog,
  startAutoSyncDaemon,
  getLastSyncSummary
};

if (require.main === module) {
  syncYoutubeChannelNow({ forceWriteCatalog: true }).then(summary => {
    console.log('[YouTubeAutoSync] CLI Sync Complete:', JSON.stringify(summary, null, 2));
  });
}
