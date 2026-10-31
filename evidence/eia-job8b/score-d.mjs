// Only Q4's conditional activity-button label is versioned. All other D checks
// and pass marks remain in the unchanged historical scorer.
import {scoreD as originalScoreD} from '../../scripts/eia-lookup/score-d-polish.js';
export function scoreD(result,expected,options){
 const revision=expected.question?.unsupportedActivityButton;
 if(!revision)return originalScoreD(result,expected,options);
 const next=structuredClone(expected);
 if(result.intent?.lockedForm?.unsupported_words?.length)next.question.buttons=next.question.buttons.map(label=>label===revision.from?revision.to:label);
 return originalScoreD(result,next,options);
}
