/** Browsing preferences only. Search and direct title/episode access stay complete. */
type BrowseItem = { id: number; title: string; label?: string; description?: string; genres?: string[] };

// The source catalogue has no genre field. Keep verified exceptions here rather
// than guessing a theme from actors, names, countries or adult-content labels.
export const verifiedBrowseThemes = [
  { id: 10826, title: 'Revenged Love', source: 'https://www.viki.com/tv/41152c-revenged-love' },
  { id: 10958, title: 'ABO Desire the Series', source: 'https://www.viki.com/tv/41187c-desire-the-series' },
  { id: 9316, title: 'Shutline', source: 'https://www.lezhinth.com/detail/shutline' },
  { id: 7853, title: 'Mignon', source: 'source synopsis explicitly labels this BL anime' },
  { id: 11805, title: 'Unexpectedly Naughty Fukami', source: 'https://sevenseasentertainment.com/series/unexpectedly-naughty-fukami/' },
  { id: 6637, title: 'Dangerous Drugs of Sex', source: 'https://www.gagaoolala.com/en/category/4/bl?tag=Lust' },
  { id: 10440, title: 'The Boy Next World', source: 'https://www.iq.com/album/the-boy-next-world-2025-1dcaj55w4y5?lang=en_us' },
  { id: 10029, title: 'Berlin Drifters', source: 'https://www.shiroari.com/habakari/bd/BerlinDrifters.html' },
  { id: 13786, title: "School Trip: Joined a Group I'm Not Close To", source: 'https://www.viki.com/tv/41622c' },
  { id: 13782, title: 'When It Rains, It Pours', source: 'https://www.viki.com/tv/41013c-when-it-rains-it-pours' },
  { id: 13879, title: 'Twisted Tie', source: 'https://www.youtube.com/watch?v=8MJvXSvhHLw' },
  { id: 13880, title: 'Fool in Love (2026)', source: 'https://www.iq.com/album/fool-in-love-yeu-mot-ke-ngoc-2026-1vby5hezxel?lang=vi_vn' },
  { id: 13781, title: 'The Proper Way to Write Love', source: 'https://tv.apple.com/jp/show/the-proper-way-to-write-love/umc.cmc.4d0svo7onin68wyl7k04tu91y?l=en' },
  { id: 13783, title: 'The Journey to Killing You', source: 'https://www.gagaoolala.com/en/videos/5815/the-journey-to-killing-you' },
  { id: 13713, title: 'Till I See You', source: 'https://www.gagaoolala.com/sc/category/4/bl?tag=BL' },
  { id: 13386, title: 'Secret Lover: The Last Promise', source: 'https://www.gagaoolala.com/sc/category/4/bl?tag=BL' },
] as const;

const knownIds = new Set<number>(verifiedBrowseThemes.map(item => item.id));
const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const knownTitles = verifiedBrowseThemes.map(item => normalize(item.title));
const explicitTheme = /\b(?:bl|yaoi|danmei|boys?[’']?\s*love|gay\s+(?:romance|love|relationship))\b/i;

export function isHiddenFromBrowse(item: BrowseItem): boolean {
  if (knownIds.has(item.id)) return true;
  const title = normalize(item.title);
  if (knownTitles.some(known => title === known || title.startsWith(known + ' '))) return true;
  return explicitTheme.test([item.title, item.label, item.description, ...(item.genres || [])].filter(Boolean).join(' '));
}

export function filterBrowseItems<T extends BrowseItem>(items: T[]): T[] {
  return items.filter(item => !isHiddenFromBrowse(item));
}
