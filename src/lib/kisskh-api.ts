import { cache } from 'react';
import { sourceFetch, sourceTimeoutMs } from './source-fetch';
import { normalizeSubtitles } from './subtitles';
import { SOURCE_ORIGIN, SOURCE_HEADERS, SourceError, assertSourceResponse, normalizeMediaUrl, detectMedia } from './source-client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { _0x54b991 } = require('./kisskh-crypto');

export interface DramaItem {
  id: number;
  title: string;
  thumbnail: string;
  episodesCount?: number;
  label?: string;
  favoriteID?: number;
}

export interface DramaDetail {
  id: number;
  title: string;
  thumbnail: string;
  description: string;
  releaseDate: string;
  trailer: string;
  country: string;
  status: string;
  type: string;
  nextEpDateID?: number;
  episodesCount: number;
  episodes: EpisodeItem[];
}

export interface EpisodeItem {
  id: number;
  number: number;
  sub: number;
}

export interface VideoStreamResult {
  video: string;
  format?: 'hls' | 'file';
  rawVideo?: string;
  video_tmp?: string;
  thirdParty?: string | null;
  type: number;
  subtitles: SubtitleItem[];
}

export interface SubtitleItem {
  src: string;
  label: string;
  land: string;
  default: boolean;
}

export function generateKkey(episodeId: number, isSub = false): string {
  const viGuid = '62f176f3bb1b5b8e70e39932ad34a0c7';
  const subGuid = 'VgV52sWhwvBSf8BsM3BRY9weWiiCbtGp';
  const appVer = '2.8.10';
  const platformVer = 4830201;
  const appName = 'kisskh';
  const guid = isSub ? subGuid : viGuid;

  return _0x54b991(
    episodeId,
    null,
    appVer,
    guid,
    platformVer,
    appName,
    appName,
    appName,
    appName,
    appName,
    appName
  );
}

interface CacheEntry { data: unknown; expiry: number; }
interface DirectState {
  cache: Map<string, CacheEntry>;
  pending: Map<string, Promise<unknown>>;
  failures: Map<string, { error: SourceError; expiry: number }>;
}
const globals = globalThis as unknown as { __kisskhDirect?: DirectState };
const state = globals.__kisskhDirect ||= { cache: new Map(), pending: new Map(), failures: new Map() };

export async function fetchFromKissKH<T>(endpoint: string, revalidate = 300): Promise<T | null> {
  const url = new URL(endpoint.startsWith('http') ? endpoint : '/api/' + endpoint.replace(/^\//, ''), SOURCE_ORIGIN).href;
  const cached = state.cache.get(url);
  if (cached && cached.expiry > Date.now()) return cached.data as T;
  const mayUseStale = cached && !url.includes('/Episode/') && !url.includes('/Sub/') && Date.now() - cached.expiry < 86400000;
  const failure = state.failures.get(url);
  if (failure && failure.expiry > Date.now()) {
    if (mayUseStale) return cached.data as T;
    throw failure.error;
  }
  const pending = state.pending.get(url);
  if (pending) return pending as Promise<T>;
  const task = (async () => {
    try {
      const response = await sourceFetch(url, { headers: SOURCE_HEADERS, next: { revalidate }, signal: AbortSignal.timeout(sourceTimeoutMs(15000)) });
      assertSourceResponse(response);
      const text = await response.text();
      let data: T;
      try { data = JSON.parse(text) as T; }
      catch { throw new SourceError('Sumber mengembalikan data yang tidak valid.', 'SOURCE_INVALID_JSON'); }
      if (data == null) throw new SourceError('Data sumber kosong.', 'SOURCE_EMPTY');
      if (state.cache.size >= 1000) state.cache.delete(state.cache.keys().next().value!);
      state.cache.set(url, { data, expiry: Date.now() + revalidate * 1000 });
      state.failures.delete(url);
      return data;
    } catch (error) {
      const failure = error instanceof SourceError ? error : new SourceError('Tidak bisa terhubung ke sumber. Coba lagi nanti.', 'SOURCE_CONNECTION');
      if (state.failures.size >= 1000) state.failures.delete(state.failures.keys().next().value!);
      state.failures.set(url, { error: failure, expiry: Date.now() + 30000 });
      // Only catalogue data may use a stale response; media URLs can expire.
      if (mayUseStale) return cached.data as T;
      throw failure;
    } finally { state.pending.delete(url); }
  })();
  state.pending.set(url, task);
  return task;
}

export async function getHomeShow(): Promise<DramaItem[]> {
  try {
    const res = await fetchFromKissKH<DramaItem[]>('DramaList/Show', 3600);
    return res || [];
  } catch (e) {
    console.error('getHomeShow error:', e);
    return [];
  }
}

export async function getLastUpdates(page = 1, type = 0, sub = 0): Promise<DramaItem[]> {
  try {
    const res = await fetchFromKissKH<DramaItem[]>(`DramaList/LastUpdate?page=${page}&type=${type}&sub=${sub}`, 3600);
    return (res || []).slice(0, 30);
  } catch (e) {
    console.error('getLastUpdates error:', e);
    return [];
  }
}

export async function getTopRating(page = 1, type = 0): Promise<DramaItem[]> {
  try {
    const res = await fetchFromKissKH<DramaItem[]>(`DramaList/TopRating?page=${page}&type=${type}`, 7200);
    return (res || []).slice(0, 30);
  } catch (e) {
    console.error('getTopRating error:', e);
    return [];
  }
}

export async function getUpcoming(page = 1, type = 0): Promise<DramaItem[]> {
  try {
    const res = await fetchFromKissKH<DramaItem[]>(`DramaList/Upcoming?page=${page}&type=${type}`, 7200);
    return (res || []).slice(0, 30);
  } catch (e) {
    console.error('getUpcoming error:', e);
    return [];
  }
}

export async function getAnime(page = 1, order = 1): Promise<DramaItem[]> {
  try {
    const res = await fetchFromKissKH<{
      page: number;
      pageSize: number;
      totalCount: number;
      data: DramaItem[];
    }>(`DramaList/List?page=${page}&pageSize=30&type=3&sub=0&country=0&status=0&order=${order}`, 7200);
    return res?.data || [];
  } catch (e) {
    console.error('getAnime error:', e);
    return [];
  }
}

export async function getMostView(country = 1): Promise<DramaItem[]> {
  try {
    const res = await fetchFromKissKH<DramaItem[]>(`DramaList/MostView?ispc=true&c=${country}`, 7200);
    return res || [];
  } catch (e) {
    console.error('getMostView error:', e);
    return [];
  }
}

export async function getHollywood(page = 1, order = 2): Promise<DramaItem[]> {
  try {
    const res = await fetchFromKissKH<{
      page: number;
      pageSize: number;
      totalCount: number;
      data: DramaItem[];
    }>(`DramaList/List?page=${page}&pageSize=30&type=0&sub=0&country=6&status=0&order=${order}`, 7200);
    return res?.data || [];
  } catch (e) {
    console.error('getHollywood error:', e);
    return [];
  }
}

export async function searchDramas(query: string, type = 0): Promise<DramaItem[]> {
  try {
    if (!query.trim()) return [];
    const res = await fetchFromKissKH<DramaItem[]>(`DramaList/Search?q=${encodeURIComponent(query.trim().replace(/\s+/g, ' '))}&type=${type}`, 3600);
    return res || [];
  } catch (e) {
    console.error('searchDramas error:', e);
    throw e;
  }
}

export const getDramaDetail = cache(async (id: number | string): Promise<DramaDetail | null> => {
  try {
    return await fetchFromKissKH<DramaDetail>(`DramaList/Drama/${id}?isq=false`, 86400);
  } catch (e) {
    console.error(`getDramaDetail ${id} error:`, e);
    return null;
  }
});

export function getCachedDramaDetail(id: number): DramaDetail | null {
  const entry = state.cache.get(new URL(`/api/DramaList/Drama/${id}?isq=false`,SOURCE_ORIGIN).href);
  return entry && entry.expiry>Date.now() ? entry.data as DramaDetail : null;
}

export async function getExploreList(
  page = 1,
  type = 0,
  sub = 0,
  country = 0,
  status = 0,
  order = 1,
  pageSize = 30
): Promise<{
  page: number;
  pageSize: number;
  totalCount: number;
  data: DramaItem[];
}> {
  try {
    // UI: latest, most viewed, top rated. The source uses 2 for latest and 1 for views.
    const sourceOrder = order === 1 ? 2 : order === 2 ? 1 : order;
    const res = await fetchFromKissKH<{
      page: number;
      pageSize: number;
      totalCount: number;
      data: DramaItem[];
    }>(`DramaList/List?page=${page}&pageSize=${pageSize}&type=${type}&sub=${sub}&country=${country}&status=${status}&order=${sourceOrder}`, 1800);
    return res || { page: 1, pageSize: 30, totalCount: 0, data: [] };
  } catch (e) {
    console.error('getExploreList error:', e);
    return { page: 1, pageSize: 30, totalCount: 0, data: [] };
  }
}

const streamPending = new Map<number, Promise<VideoStreamResult>>();
const streamCache = new Map<number, { result: VideoStreamResult; expiry: number }>();
export async function getEpisodeStreamAndSubs(episodeId: number): Promise<VideoStreamResult> {
  const cached = streamCache.get(episodeId);
  if (cached && cached.expiry > Date.now()) return cached.result;
  const pending = streamPending.get(episodeId);
  if (pending) return pending;
  const task = resolveEpisode(episodeId).finally(() => streamPending.delete(episodeId));
  streamPending.set(episodeId, task);
  return task;
}

async function resolveEpisode(episodeId: number): Promise<VideoStreamResult> {
  const videoKey = generateKkey(episodeId, false);
  const data = await fetchFromKissKH<{ Video?: string; Video_tmp?: string; ThirdParty?: string | null }>(
    SOURCE_ORIGIN + '/api/DramaList/Episode/' + episodeId + '.png?kkey=' + encodeURIComponent(videoKey), 300
  );
  const candidates = [...new Set([data?.Video, data?.Video_tmp].map(normalizeMediaUrl).filter((url): url is string => !!url && !/(^|\.)tickcounter\.com$/i.test(new URL(url).hostname)))];
  let lastError = new SourceError('Sumber belum menyediakan video langsung untuk episode ini. Halaman countdown atau embed tidak diputar.', 'SOURCE_NO_DIRECT_VIDEO');
  for (const url of candidates) {
    try {
      const format = await detectMedia(url);
      const subKey = generateKkey(episodeId, true);
      const subs = await fetchFromKissKH<SubtitleItem[]>(SOURCE_ORIGIN + '/api/Sub/' + episodeId + '?kkey=' + encodeURIComponent(subKey), 3600).catch(() => []);
      const result: VideoStreamResult = {
        video: '/api/stream/hls?url=' + encodeURIComponent(url) + '&format=' + format, rawVideo: url, format,
        type: 1, thirdParty: null, subtitles: normalizeSubtitles(subs),
      };
      if (streamCache.size >= 500) streamCache.delete(streamCache.keys().next().value!);
      streamCache.set(episodeId, { result, expiry: Date.now() + 300000 });
      return result;
    } catch (error) {
      if (error instanceof SourceError) lastError = error;
      else lastError = new SourceError('Tidak bisa terhubung ke sumber video.', 'SOURCE_CONNECTION');
    }
  }
  throw lastError;
}
