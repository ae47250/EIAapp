import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../../', import.meta.url);
const budget = JSON.parse(readFileSync(new URL('evidence/eia-locked-form/budget.json',root)));
if(!budget.permitted)throw new Error('Budget unavailable');
const matches = readFileSync(`${homedir()}/Downloads/openai-api-key.txt`,'utf8').match(/sk-[A-Za-z0-9_-]+/g)||[];
if(matches.length!==1)throw new Error('Working key missing or ambiguous');
const child=spawn(process.execPath,['--import',fileURLToPath(new URL('./browser-transport.js',import.meta.url)),fileURLToPath(new URL('node_modules/next/dist/bin/next',root)),'start','-p','3187','-H','127.0.0.1'],{
 cwd:fileURLToPath(root),stdio:'inherit',env:{...process.env,LOGIN_REQUIRED:'off',OPENAI_MODEL:'gpt-6-luna',OPENAI_API_KEY:matches[0],EIA_API_KEY:''}
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code||0));
