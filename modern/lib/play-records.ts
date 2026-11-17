export type PracticeNotes={deckId:string;opening:string;resources:string;matchups:string;plan:string};
export type MatchRecord={uid:string;deckId:string;deckName:string;leader:string;base:string;opponent:string;opponentLeader:string;opponentBase:string;result:'win'|'loss'|'draw';playedAt:string;rounds:number;myDamage:number;opponentDamage:number;notes:string};
export type PlayRecords={practice:PracticeNotes[];matches:MatchRecord[]};
const key=/^[-a-zA-Z0-9_]{1,100}$/;
function string(x:unknown,max:number){if(typeof x!=='string'||x.length>max)throw Error('Invalid play record text');return x}
function identifier(x:unknown,optional=false){const s=string(x,100);if(!(optional&&!s)&&!key.test(s))throw Error('Invalid play record ID');return s}
export function validatePlayRecords(value:any):PlayRecords{
 if(!value||!Array.isArray(value.practice)||value.practice.length>500||!Array.isArray(value.matches)||value.matches.length>1000)throw Error('Invalid play records');
 const ids=new Set<string>();
 const practice=value.practice.map((p:any)=>{const deckId=identifier(p?.deckId);if(ids.has(deckId))throw Error('Duplicate practice notes');ids.add(deckId);return {deckId,plan:string(p.plan,5000),opening:string(p.opening,5000),resources:string(p.resources,5000),matchups:string(p.matchups,5000)}});
 ids.clear();
 const matches=value.matches.map((m:any)=>{if(!m||!['win','loss','draw'].includes(m.result)||!Number.isFinite(Date.parse(m.playedAt)))throw Error('Invalid match');const uid=identifier(m.uid);if(ids.has(uid))throw Error('Duplicate match');ids.add(uid);for(const k of ['rounds','myDamage','opponentDamage'])if(!Number.isInteger(m[k])||m[k]<0||m[k]>99)throw Error('Invalid match counter');return {uid,deckId:identifier(m.deckId),deckName:string(m.deckName,200),leader:identifier(m.leader,true),base:identifier(m.base,true),opponent:string(m.opponent,80),opponentLeader:identifier(m.opponentLeader,true),opponentBase:identifier(m.opponentBase,true),result:m.result,playedAt:string(m.playedAt,40),rounds:m.rounds,myDamage:m.myDamage,opponentDamage:m.opponentDamage,notes:string(m.notes,5000)} as MatchRecord});
 return {practice,matches};
}
export function saveMatch(records:PlayRecords|undefined,match:MatchRecord):PlayRecords{
 const matches=records?.matches??[];
 if(matches.length>=1000&&!matches.some(m=>m.uid===match.uid))throw Error('Match history is full. Export a backup before removing older results.');
 return validatePlayRecords({practice:records?.practice??[],matches:[match,...matches.filter(m=>m.uid!==match.uid)]});
}
export function matchStats(matches:MatchRecord[]){const wins=matches.filter(m=>m.result==='win').length,losses=matches.filter(m=>m.result==='loss').length,draws=matches.length-wins-losses;return {wins,losses,draws,winRate:matches.length?Math.round(wins/matches.length*100):0}}
