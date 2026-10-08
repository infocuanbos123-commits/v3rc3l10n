import { pipeline, env } from '@huggingface/transformers';
import assert from 'node:assert/strict';
env.cacheDir = './.cache/models';
console.log('Loading local classifier...');
const classify = await pipeline('zero-shot-classification', 'Xenova/nli-deberta-v3-xsmall', {dtype:'q8', device:'cpu'});
for (const text of [
  'Two male coworkers fall in love with each other and begin a romantic relationship.',
  'A young woman falls in love with a wealthy businessman. Together they overcome obstacles.',
  'Two women fall in love with each other and begin dating.',
  'Jake, a gang member, meets an auto mechanic named Moon Shingun. Their relationship soon becomes romantic.',
  'Two brothers fight monsters and protect their family.',
  'In the near future, architect Otone Komoto is married to Kensuke, who runs a construction company. The married couple decide to welcome a humanoid robot into their home as their son.',
]) {
  const result=await classify(text,['a romantic or sexual relationship between two men','a romantic relationship between a man and a woman','a romantic relationship between two women','parents raising a child','friendship and family relationships','crime and investigation','action and adventure','sports or reality television'],{hypothesis_template:'This story is about {}.'});
  const expectedBL=text.startsWith('Two male') || text.startsWith('Jake,');
  const hidden=result.labels[0]==='a romantic or sexual relationship between two men' && result.scores[0]>=0.65;
  assert.equal(hidden,expectedBL,text);
  console.log(JSON.stringify({expectedBL,hidden,label:result.labels[0],score:result.scores[0]}));
}
console.log('6 local AI regression cases passed.');
