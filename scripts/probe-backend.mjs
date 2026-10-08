import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createBackend } from '../backend/server.mjs';

const token = randomBytes(32).toString('hex');
const server = createBackend({token, origin:process.env.KISSKH_BASE_URL, dnsServers:process.env.SOURCE_DNS_SERVERS, mediaHosts:process.env.SOURCE_MEDIA_HOSTS});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
try {
  const child=spawn(process.execPath,['scripts/check-live.mjs',`http://127.0.0.1:${server.address().port}`,'--backend'],{
    stdio:'inherit',env:{...process.env,SOURCE_BACKEND_TOKEN:token},
  });
  process.exitCode=await new Promise(resolve=>{child.on('exit',code=>resolve(code??1));child.on('error',()=>resolve(1));});
} finally {
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
}
