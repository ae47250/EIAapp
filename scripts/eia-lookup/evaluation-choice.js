// Harness-only: user-visible choice labels are case-insensitive.
export function findEvaluationChoice(result,label) {
 const words=s=>String(s??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
 const matches=(result?.choices||[]).filter(c=>words(c.label)===words(label));
 if(matches.length!==1)throw new Error('Required button '+(matches.length?'ambiguous: ':'unavailable: ')+label);
 return matches[0];
}
