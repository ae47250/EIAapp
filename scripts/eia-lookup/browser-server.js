import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url);
const openai=readFileSync(`${homedir()}/Downloads/openai-api-key.txt`,'utf8').match(/sk-[A-Za-z0-9_-]+/g)||[];
const eia=readFileSync(`${homedir()}/Downloads/eia-api-key.txt`,'utf8').match(/(?<![A-Za-z0-9])[A-Za-z0-9]{40}(?![A-Za-z0-9])/g)||[];
if(openai.length!==1||eia.length!==1)throw new Error('Designated key file missing or ambiguous; no replacements created');
const child=spawn(process.execPath,['--import',fileURLToPath(new URL('./browser-transport.js',import.meta.url)),fileURLToPath(new URL('node_modules/next/dist/bin/next',root)),'start','-p','3188','-H','127.0.0.1'],{
 cwd:fileURLToPath(root),stdio:'inherit',env:{...process.env,LOGIN_REQUIRED:'off',OPENAI_MODEL:'gpt-6-luna',OPENAI_API_KEY:openai[0],EIA_API_KEY:eia[0]}
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('exit',code=>process.exit(code||0));
