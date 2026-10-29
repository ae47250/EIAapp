import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const root = new URL('../../',import.meta.url);
export const read = path => JSON.parse(readFileSync(new URL(path,root)));
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function verifyFreeze(){
 const manifest=read('evidence/eia-lookup-list/freeze-manifest.json');
 for(const [path,hash] of Object.entries(manifest.sha256))if(sha256(readFileSync(new URL(path,root)))!==hash)throw new Error('Frozen file changed: '+path);
 const source=readFileSync(new URL('lib/sources/eia/locked-form.js',root),'utf8');
 if(sha256(source.slice(source.indexOf('export function checkLockedForm('),source.indexOf('export function blockedLockedIntent(')))!==manifest.lockedFormChecksSha256)throw new Error('Frozen form checks changed');
 return manifest;
}
