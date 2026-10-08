import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import seed from '../data/browse-ai-seed.json';
import { hiddenTitleIds } from './admin-settings';
import { fetchFromKissKH, getCachedDramaDetail, type DramaItem, type DramaDetail } from './kisskh-api';
import { isHiddenFromBrowse } from './browse-policy';

const MODEL = 'Xenova/nli-deberta-v3-xsmall';
const VERSION = 'bl-only-nli-v3';
const labels = ['a romantic or sexual relationship between two men', 'a romantic relationship between a man and a woman', 'a romantic relationship between two women', 'parents raising a child', 'friendship and family relationships', 'crime and investigation', 'action and adventure', 'sports or reality television'];
type Verdict = { hidden: boolean; score: number; title?: string; version: string; expires: number };
type Classifier = (text: string, labels: string[], options: { hypothesis_template: string }) => Promise<{labels: string[]; scores: number[]}>;
type State = { records: Record<string,Verdict>; loaded?: Promise<void>; model?: Promise<Classifier>; pending: Map<number,Promise<boolean>>; queue: Promise<unknown>; writes: Promise<unknown>; metadataQueue?: Promise<unknown>; nextMetadataAt?: number; cooldownUntil?: number };
const root = globalThis as unknown as { __browseAI?: State };
const state: State = root.__browseAI ||= {records:{},pending:new Map(),queue:Promise.resolve(),writes:Promise.resolve()};
const cacheRoot = process.env.BROWSE_AI_CACHE_DIR || (process.env.VERCEL ? path.join(os.tmpdir(),'metromovies-ai') : path.join(process.cwd(),'.cache'));
const cacheFile = path.join(cacheRoot, 'browse-ai.json');

async function loadRecords() {
  await (state.loaded ||= (async () => {
    state.records = { ...seed };
    try {state.records = {...state.records,...JSON.parse(await readFile(cacheFile,'utf8'))};}
    catch { /* Bundled decisions keep a fresh instance useful without a disk cache. */ }
  })());
}
async function getModel() {
  return state.model ||= import('@huggingface/transformers').then(async ({ pipeline,env }) => {
    env.cacheDir = path.join(cacheRoot,'models');
    return await pipeline('zero-shot-classification',MODEL,{dtype:'q8',device:'cpu'}) as unknown as Classifier;
  });
}
export function interpretTheme(result: {labels:string[];scores:number[]}) {
  const index = result.labels.indexOf(labels[0]);
  const score = index >= 0 ? result.scores[index] : 0;
  // Relative NLI scores are not calibrated probabilities. GL is a separate label.
  return { hidden: result.labels[0] === labels[0] && score >= 0.65, score };
}
export function browseMetadataCoolingDown() {return (state.cooldownUntil || 0)>Date.now();}
async function readMetadata(id: number) {
  const cached = getCachedDramaDetail(id);
  if(cached) return cached;
  const task = (state.metadataQueue || Promise.resolve()).then(async () => {
    if (browseMetadataCoolingDown()) return null;
    const wait = Math.max(0,(state.nextMetadataAt || 0)-Date.now());
    if(wait) await new Promise(resolve => setTimeout(resolve,wait));
    state.nextMetadataAt=Date.now()+1800;
    try {return await fetchFromKissKH<DramaDetail>(`DramaList/Drama/${id}?isq=false`,86400);}
    catch(error) {
      if (error instanceof Error && /429|Cloudflare|terhubung|500|502|503|504/.test(error.message)) state.cooldownUntil=Date.now()+60000;
      return null;
    }
  });
  state.metadataQueue=task.catch(() => {});
  return task;
}
export async function isHiddenWithAI(item: DramaItem): Promise<boolean> {
  if (isHiddenFromBrowse(item)) return true;
  if (/\b(?:gl|yuri|girls?[’']?\s*love)\b/i.test(`${item.title} ${item.label || ''}`)) return false;
  await loadRecords();
  const saved = state.records[String(item.id)];
  if (saved?.version === VERSION && saved.expires > Date.now()) return saved.hidden;
  const existing = state.pending.get(item.id);
  if (existing) return existing;
  const task = (async () => {
    const detail = await readMetadata(item.id);
    // Hold unclassified titles when their synopsis is unavailable. Search stays complete.
    // A transient error must not become a week-long verdict.
    if (!detail?.description?.trim()) return true;
    const text = `${detail.title}. ${detail.description}`.slice(0,2400);
    const classify = async () => {
      if (isHiddenFromBrowse({...item,description:detail.description}) || /\bhis\s+(?:ex[- ]?)?(?:boyfriend|husband)\b/i.test(detail.description)) return {hidden:true,score:1};
      const model = await getModel();
      return interpretTheme(await model(text,labels,{hypothesis_template:'This story is about {}.'}));
    };
    const inference = state.queue.then(classify);
    state.queue = inference.catch(() => {});
    try {
      const verdict = await inference;
      state.records[String(item.id)] = {...verdict,title:item.title,version:VERSION,expires:Date.now()+7*86400000};
      state.writes = state.writes.then(async () => {
        await mkdir(path.dirname(cacheFile),{recursive:true});
        await writeFile(cacheFile+'.tmp',JSON.stringify(state.records));
        await rename(cacheFile+'.tmp',cacheFile);
      }).catch(error => console.error('Browse AI cache:',error.message));
      return verdict.hidden;
    } catch (error) {
      console.error('Browse AI unavailable:',error instanceof Error ? error.message : 'unknown');
      state.model = undefined;
      state.cooldownUntil=Date.now()+60000;
      return true;
    }
  })().finally(() => state.pending.delete(item.id));
  state.pending.set(item.id,task);
  return task;
}
export async function filterBrowseWithAI<T extends DramaItem>(items: T[]): Promise<T[]> {
  let manual: Set<number>;
  try {manual=await hiddenTitleIds();}
  catch {console.error('Shared browse settings unavailable');return [];}
  const visible = new Array<boolean>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({length:Math.min(3,items.length)},async () => {
    while (cursor < items.length) {
      const index = cursor++;
      visible[index] = !manual.has(items[index].id) && !(await isHiddenWithAI(items[index]));
    }
  }));
  return items.filter((_,index) => visible[index]);
}
