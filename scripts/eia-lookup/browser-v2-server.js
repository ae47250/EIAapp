import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url),read=p=>readFileSync(`${homedir()}/Downloads/${p}`,'utf8').trim();
const openai=read('openai-api-key.txt'),eia=read('eia-api-key.txt');
if(!/^sk-[A-Za-z0-9_-]+$/.test(openai)||!eia)throw new Error('Designated existing keys unavailable.');
const child=spawn(process.execPath,['--import',fileURLToPath(new URL('./browser-v2-transport.js',import.meta.url)),fileURLToPath(new URL('node_modules/next/dist/bin/next',root)),'start','-p','3189','-H','127.0.0.1'],{
 cwd:fileURLToPath(root),stdio:'inherit',env:{...process.env,LOGIN_REQUIRED:'off',OPENAI_MODEL:'gpt-6-luna',OPENAI_API_KEY:openai,EIA_API_KEY:eia}
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('exit',code=>process.exit(code||0));
