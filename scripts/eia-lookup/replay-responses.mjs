// Exhaustive local response inventory and deterministic validation replay.
// This tests code reading saved answers, never the model reading a changed prompt.
import {readFileSync,readdirSync,statSync,mkdirSync,writeFileSync,appendFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {normalizeLockedFormV2,checkLockedFormV2,repairLockedFormV2} from '../../lib/sources/eia/locked-form-v2.js';
import {applyReplyUpdate} from '../../lib/sources/eia/locked-form-reply-update.js';
import {checkLockedFormShapeV2} from '../../lib/sources/eia/locked-form-schema-v2.js';
const out=process.argv[2];if(!out||existsSync(out))throw new Error('New output folder required');mkdirSync(out,{recursive:true});
const unique=new Map(),parseErrors=[],roots=['evidence',homedir()+'/Documents/EIAapp-Evidence'];
function collect(value,path){
 if(!value||typeof value!=='object')return;
 if(value.body?.input&&value.response){const key=createHash('sha256').update(JSON.stringify([value.body,value.response])).digest('hex');if(unique.has(key))unique.get(key).paths.push(path);else unique.set(key,{key,body:value.body,response:value.response,paths:[path]});return;}
 if(Array.isArray(value))value.forEach((v,i)=>collect(v,path+'#'+i));
 else for(const [k,v]of Object.entries(value))if(['attempts','modelAttempts','records','results','cases'].includes(k))collect(v,path+'#'+k);
}
function walk(dir){for(const ent of readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+ent.name;if(path.includes('/eia-job9')||path.includes('/job9/')||path.includes('/retrieval/'))continue;if(ent.isDirectory())walk(path);else if(/\.json(?:l)?(?:\.gz)?$/.test(ent.name)&&!/(eia-\d+|source-|ui|metadata|inventory|row-check|snapshot)/.test(ent.name)){
 try{const buffer=readFileSync(path),text=(path.endsWith('.gz')?gunzipSync(buffer):buffer).toString();if(!text.includes('"response"')||!text.includes('"body"'))continue;if(/\.jsonl(?:\.gz)?$/.test(path))text.trim().split('\n').forEach((s,i)=>collect(JSON.parse(s),path+':'+(i+1)));else collect(JSON.parse(text),path);}catch(e){parseErrors.push({path,error:e.message});}
}}}
for(const root of roots)walk(root);
const rows=[];
for(const record of unique.values()){
 const {body,response}=record;const text=response.output_text??(response.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
 let raw;try{raw=JSON.parse(text);}catch{rows.push({key:record.key,paths:record.paths,status:'no structured response'});continue;}
 const outputs={};
 for(const flag of ['on','off']){
  process.env.EIA_TEXT_REPAIR=flag;
  try{
   const rawQuery=body.input.match(/Raw query: ("(?:[^"\\]|\\.)*")/);
   if(rawQuery&&checkLockedFormShapeV2(raw).valid){
    const query=JSON.parse(rawQuery[1]),normalized=normalizeLockedFormV2(raw,query),check=checkLockedFormV2(normalized,query),form=check.valid?normalized:repairLockedFormV2(normalized,query),final=checkLockedFormV2(form,query);
    outputs[flag]={kind:'initial',valid:final.valid,errors:final.errors,rejectedChecks:check.errors,form};
   }else if(body.text?.format?.name==='eia_reply_update'){
    const match=body.input.match(/Asked field: ([^\n]+)\nCurrent repaired form: (.+)\nTyped reply: (.+)$/s);if(!match){outputs[flag]={status:'no fixture',reason:'parent context absent'};continue;}
    const form=JSON.parse(match[2]),reply=JSON.parse(match[3]);
    // Historical field evidence is not in a model request. Reconstruct only
    // the literal source spans available in its parent; never invent aliases.
    const quoteText=[...form.geographies,...form.excluded_geographies,...form.topics,...form.excluded_topics,form.sector,form.frequency,form.years].map(x=>x.quoted_words||'').concat(form.unsupported_words).join(' ');
    try{const result=applyReplyUpdate(form,quoteText,{about:match[1],reply,answer:raw});outputs[flag]={kind:'reply',valid:true,form:result.form,parentSource:'available parent quotes only'};}catch(e){if(e.replyError)outputs[flag]={kind:'reply',valid:true,disposition:'rejected',reason:e.code,parentSource:'available parent quotes only'};else throw e;}
   }else outputs[flag]={status:'no fixture',reason:'historical model schema or input format differs'};
  }catch(e){outputs[flag]={valid:false,error:e.message};}
 }
 rows.push({key:record.key,paths:record.paths,outputs,different:JSON.stringify(outputs.on)!==JSON.stringify(outputs.off)});
}
for(const r of rows)appendFileSync(out+'/responses.jsonl',JSON.stringify(r)+'\n');
const failures=rows.filter(r=>Object.values(r.outputs||{}).some(o=>o.valid===false));
const summary={roots,uniqueResponses:unique.size,sourceRecords:[...unique.values()].reduce((n,r)=>n+r.paths.length,0),parseErrors,failures:failures.map(r=>({key:r.key,paths:r.paths,outputs:r.outputs})),differences:rows.filter(r=>r.different).map(r=>({key:r.key,paths:r.paths,on:r.outputs.on,off:r.outputs.off})),unavailable:rows.filter(r=>r.status||Object.values(r.outputs||{}).some(o=>o.status==='no fixture')).length,pass:!failures.length&&!parseErrors.length,promptChanged:false,limitation:'Historical schemas are reported no fixture. Typed-parent replay reconstructs only saved parent quotes and does not test the model reading the current parent. Complete dialogue replay is separately run by run-suite.mjs.'};
writeFileSync(out+'/summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({...summary,failures:failures.length,differences:summary.differences.length}));if(!summary.pass)process.exitCode=1;
