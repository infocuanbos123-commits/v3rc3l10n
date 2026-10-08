import type { SubtitleItem } from './kisskh-api';

export function subtitleLanguage(land = '', label = '') {
  const language = `${land} ${label}`.toLowerCase();
  return /\b(?:en|eng|english)\b/.test(language) ? 'en' : /\b(?:id|ind|indonesia|indonesian|bahasa)\b/.test(language) ? 'id' : land || 'und';
}

export function normalizeSubtitles(input: unknown): SubtitleItem[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const tracks: SubtitleItem[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const sub = raw as Partial<SubtitleItem>;
    if (!sub.src || !/^https?:\/\//i.test(sub.src) || seen.has(sub.src)) continue;
    const land = subtitleLanguage(sub.land,sub.label);
    const label = land === 'en' ? 'English' : land === 'id' ? 'Bahasa Indonesia' : sub.label || land;
    seen.add(sub.src);
    tracks.push({src:sub.src,land,label,default:false});
  }
  const priority = (land: string) => land === 'en' ? 0 : land === 'id' ? 1 : 2;
  tracks.sort((a,b) => priority(a.land)-priority(b.land));
  if (tracks[0]) tracks[0].default = true;
  return tracks;
}

export function subtitleToVtt(content: string): string {
  const text = content.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  if (text.startsWith('WEBVTT')) return text;
  if (!/\d{2}:\d{2}(?::\d{2})?[,.]\d{3}\s*-->/.test(text)) throw new Error('File bukan subtitle SRT/VTT yang valid.');
  return 'WEBVTT\n\n'+text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,'$1.$2');
}
