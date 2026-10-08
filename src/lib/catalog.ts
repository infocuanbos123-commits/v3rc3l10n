import { DramaItem, getExploreList } from './kisskh-api';
import { filterBrowseWithAI, browseMetadataCoolingDown } from './browse-ai';
import { sharedBrowseSettingsUnavailable } from './admin-settings';

export function matchesYear(item: DramaItem, year: string): boolean {
  const match = item.title.match(/\b((?:19|20)\d{2})\b/);
  if (!match) return false;
  return year === '2020' ? Number(match[1]) <= 2020 : match[1] === year;
}

export async function getCatalogPage(page: number, type: number, country: number, status: number, order: number, year = '', filter = filterBrowseWithAI) {
  const pageSize = 30;
  // Filter before slicing into visible pages, rather than reducing one 30-item page.
  // The upstream list exposes years in titles, so do not invent years for missing metadata.
  const matches: DramaItem[] = [];
  const seen = new Set<number>();
  let exhausted = false;
  const wanted = page * pageSize + 1;
  const sourcePageSize = year ? 100 : 30;
  for (let sourcePage = 1; sourcePage <= 100 && matches.length < wanted; sourcePage++) {
    const result = await getExploreList(sourcePage, type, 0, country, status, order, sourcePageSize);
    const candidates = result.data.filter(item => !seen.has(item.id) && (!year || matchesYear(item,year)));
    for (const item of await filter(candidates)) {
      if (!seen.has(item.id)) { matches.push(item); seen.add(item.id); }
    }
    if (filter === filterBrowseWithAI && (browseMetadataCoolingDown() || sharedBrowseSettingsUnavailable())) break;
    if (!result.data.length || sourcePage * result.pageSize >= result.totalCount) { exhausted = true; break; }
  }
  const start = (page - 1) * pageSize;
  return {
    data: matches.slice(start, start + pageSize), page, pageSize,
    totalCount: matches.length, hasNext: matches.length > start + pageSize,
    partial: !exhausted && matches.length < wanted,
  };
}
