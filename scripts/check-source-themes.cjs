const fs = require('node:fs');
const ts = require('typescript');
process.loadEnvFile('.env.local');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const { getDramaDetail } = require('../src/lib/kisskh-api.ts');
(async()=>{
  for(const id of [13719,13783,13713,13576,13854,13575]) {
    const detail = await getDramaDetail(id);
    console.log(JSON.stringify({id,title:detail?.title,description:detail?.description}));
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
})();
