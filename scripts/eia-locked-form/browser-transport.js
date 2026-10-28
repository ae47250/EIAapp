// Local evaluation transport only. Load with node --import; never imported by app code.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
const keys = JSON.parse(readFileSync(new URL('tests/fixtures/eia/locked-form/answer-key.json', root)));
const allowed = keys.filter(k => ['F9', 'O6', 'O7'].includes(k.id));
const directory = new URL('evidence/eia-locked-form/browser/', root);
if (existsSync(directory)) throw new Error('Browser evaluation already started; refusing duplicate calls');
mkdirSync(directory);
const nativeFetch = globalThis.fetch;
const counts = new Map();
globalThis.fetch = async (url, init) => {
  const address = String(url);
  if (address.includes('api.eia.gov')) throw new Error('Live EIA calls forbidden in this evaluation');
  if (address !== 'https://api.openai.com/v1/responses') return nativeFetch(url, init);
  const body = JSON.parse(init.body);
  const raw = body.input.split('\nRaw query: ')[1]?.split('\n')[0];
  const query = JSON.parse(raw);
  const item = allowed.find(k => k.query === query);
  if (!item || (counts.get(item.id) || 0) >= 2) throw new Error('Browser call limit reached or query outside frozen browser set');
  const attempt = counts.get(item.id) || 0; counts.set(item.id, attempt + 1);
  body.model = 'gpt-6-luna'; body.reasoning = { effort: 'low' }; body.max_output_tokens = 16000;
  const start = Date.now();
  // The app's unchanged production timer is 30 seconds. This transport uses the
  // explicitly authorized 90-second evaluation timer instead, only in this process.
  try {
    const response = await nativeFetch(url, { ...init, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const data = await response.clone().json();
    writeFileSync(new URL(`${item.id}-${attempt}.json`,directory),JSON.stringify({id:item.id,query,attempt,body,status:response.status,response:data,elapsedMs:Date.now()-start},null,2)+'\n');
    return response;
  } catch (error) {
    writeFileSync(new URL(`${item.id}-${attempt}.json`,directory),JSON.stringify({id:item.id,query,attempt,body,error:error.name,elapsedMs:Date.now()-start},null,2)+'\n');
    throw error;
  }
};
