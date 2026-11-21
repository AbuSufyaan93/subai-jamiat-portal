/**
 * ============================================================================
 * GITHUB ACTIONS PERPETUAL YOUTUBE VIDEOS & REELS SYNC SCRIPT
 * ============================================================================
 * Runs automatically every 30 minutes on GitHub's cloud infrastructure inside
 * AbuSufyaan93/subai-jamiat-portal so that ANY new Video or Short/Reel uploaded
 * on @SubaiJamiatAhleHadeesMumbai is curated into pure Nastaliq Urdu and
 * published into the static GitHub Pages portal automatically 24/7/365.
 */
const fs = require('fs');
const path = require('path');
const core = require('./youtubeAutoSyncCore');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_FILE = path.join(ROOT, 'api', 'youtube-live-catalog.json');
const SEARCH_INDEX_FILE = path.join(ROOT, 'api', 'global-search-index.json');
const GALLERY_FILES = [
  'video-gallery/index.html',
  'video-gallery.html',
  'videos/index.html',
  'videos.html',
  'media/index.html',
  'media.html',
  'bayanat/index.html',
  'bayanat.html'
];

async function runCloudPortalSync() {
  const mainGalleryPath = path.join(ROOT, 'video-gallery/index.html');
  if (!fs.existsSync(mainGalleryPath)) {
    console.log('[GitHubSync] video-gallery/index.html not found, skipping.');
    return;
  }

  const galleryHtml = fs.readFileSync(mainGalleryPath, 'utf8');
  const scriptMatch = galleryHtml.match(/<script id="ytInitialDataJson" type="application\/json">([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    console.log('[GitHubSync] ytInitialDataJson block not found.');
    return;
  }

  let items = JSON.parse(scriptMatch[1]);
  const existingByYtId = new Map();
  items.forEach(v => {
    if (v && v.youtubeId && v.playlistIndex === undefined) {
      existingByYtId.set(v.youtubeId, v);
    }
  });

  // Harvest directly from YouTube UULF (Videos), UUSH (Shorts), UU (All), and /videos + /shorts tabs
  const harvested = await core.harvestLiveYoutubeChannel(new Set(existingByYtId.keys()));
  harvested.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  const newCompactItems = [];
  let updatedViewsCount = 0;

  for (const raw of harvested) {
    if (core.EXCLUDED_SPEAKERS_RE.test(`${raw.title || ''} ${raw.description || ''}`)) continue;
    const ex = existingByYtId.get(raw.youtubeId);
    if (ex) {
      if (raw.viewsCount > Number(ex.youtubeViews || 0)) {
        ex.youtubeViews = raw.viewsCount;
        ex.viewsCount = raw.viewsCount;
        updatedViewsCount++;
      }
      if (raw.publishedAt && (!ex.publishedAt || ex.publishedAt.endsWith('T00:00:00.000Z'))) {
        ex.publishedAt = raw.publishedAt;
      }
      continue;
    }

    const curated = await core.curateRawYoutubeEntry(raw, {});
    if (!curated) continue;

    const compact = {
      id: curated.id,
      title: curated.title,
      romanTitle: curated.romanTitle || '',
      speaker: curated.speaker,
      category: curated.category,
      type: curated.type,
      videoFormat: curated.videoFormat,
      isReel: Boolean(curated.isReel),
      youtubeId: curated.youtubeId,
      playlistId: '',
      duration: curated.duration,
      date: curated.date,
      publishedAt: curated.publishedAt,
      urduDate: curated.urduDate,
      youtubeViews: curated.youtubeViews,
      viewsCount: curated.viewsCount,
      likesCount: curated.likesCount
    };
    if (curated.episodeNumber) compact.episodeNumber = curated.episodeNumber;
    if (curated.episodeLabel) compact.episodeLabel = curated.episodeLabel;
    if (curated.seriesPlaylistTitle) compact.seriesPlaylistTitle = curated.seriesPlaylistTitle;

    newCompactItems.push(compact);
    existingByYtId.set(compact.youtubeId, compact);
  }

  if (newCompactItems.length === 0 && updatedViewsCount === 0 && fs.existsSync(CATALOG_FILE)) {
    console.log('[GitHubSync] No new YouTube videos or shorts since last sync.');
    return;
  }

  items = [...newCompactItems, ...items];

  // Update all gallery HTML files with the updated ytInitialDataJson payload
  const serialized = JSON.stringify(items);
  for (const rel of GALLERY_FILES) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) continue;
    const html = fs.readFileSync(p, 'utf8');
    const nextHtml = html.replace(
      /<script id="ytInitialDataJson" type="application\/json">[\s\S]*?<\/script>/,
      `<script id="ytInitialDataJson" type="application/json">${serialized}</script>`
    );
    if (nextHtml !== html) fs.writeFileSync(p, nextHtml, 'utf8');
  }

  // Update api/youtube-live-catalog.json
  const primaryValid = items.filter(v =>
    v &&
    v.playlistIndex === undefined &&
    !core.EXCLUDED_SPEAKERS_RE.test(`${v.title || ''} ${v.speaker || ''}`)
  );
  const stdSorted = primaryValid
    .filter(v => !v.isReel && v.type !== 'reel' && v.videoFormat !== 'reel' && v.type !== 'playlist_item' && v.videoFormat !== 'playlist')
    .sort((a, b) => new Date(b.publishedAt || b.date || 0) - new Date(a.publishedAt || a.date || 0));
  const reelsSorted = primaryValid
    .filter(v => v.isReel === true || v.type === 'reel' || v.videoFormat === 'reel')
    .sort((a, b) => new Date(b.publishedAt || b.date || 0) - new Date(a.publishedAt || a.date || 0));

  const catalogPayload = {
    channelId: core.CHANNEL_ID,
    syncedAt: new Date().toISOString(),
    latestVideoEmbedUrl: stdSorted[0] ? `https://www.youtube.com/embed/${stdSorted[0].youtubeId}` : '',
    latestVideoTitle: stdSorted[0] ? stdSorted[0].title : '',
    latestVideos: stdSorted.slice(0, 50),
    latestReels: reelsSorted.slice(0, 50)
  };
  fs.mkdirSync(path.dirname(CATALOG_FILE), { recursive: true });
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalogPayload, null, 2), 'utf8');

  // Update homepage sidebar iframe if newest video changed
  const rootIndexPath = path.join(ROOT, 'index.html');
  if (stdSorted[0] && fs.existsSync(rootIndexPath)) {
    const idxHtml = fs.readFileSync(rootIndexPath, 'utf8');
    const updatedIdx = idxHtml.replace(
      /(<iframe[^>]*id="sjSidebarNewestVideoIframe"[^>]*src=")[^"]*(")/i,
      `$1https://www.youtube.com/embed/${stdSorted[0].youtubeId}$2`
    );
    if (updatedIdx !== idxHtml) fs.writeFileSync(rootIndexPath, updatedIdx, 'utf8');
  }

  // Append brand-new items to global-search-index.json
  if (newCompactItems.length > 0 && fs.existsSync(SEARCH_INDEX_FILE)) {
    try {
      const sIdx = JSON.parse(fs.readFileSync(SEARCH_INDEX_FILE, 'utf8'));
      if (sIdx && Array.isArray(sIdx.items)) {
        const seenIds = new Set(sIdx.items.map(x => x.id));
        newCompactItems.forEach(item => {
          if (!seenIds.has(item.id)) {
            sIdx.items.unshift({
              id: item.id,
              title: item.title,
              subtitle: item.speaker,
              snippet: `${item.category} • ${item.isReel ? 'اسلامک ریل / شارٹ' : 'علمی بیان'}`,
              extra: item.romanTitle || '',
              categoryKey: 'media',
              categoryLabel: item.isReel ? 'اسلامک ریلز' : 'ویڈیو بیانات',
              url: `/video-gallery?q=${encodeURIComponent(item.title)}`
            });
          }
        });
        fs.writeFileSync(SEARCH_INDEX_FILE, JSON.stringify(sIdx), 'utf8');
      }
    } catch (_) {}
  }

  console.log(`[GitHubSync] Synced ${newCompactItems.length} new items and updated ${updatedViewsCount} view counts.`);
}

runCloudPortalSync().catch(err => {
  console.error('[GitHubSync] Fatal error:', err);
  process.exit(1);
});
