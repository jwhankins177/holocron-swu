import type {Card,Deck,Owned,FormatRules} from './model';
export const PREMIER_RULES_DATE='2026-11-09';
export const PREMIER_RULES_URL='https://starwarsunlimited.com/articles/premier-format-update-november-2026';
export const PREMIER_SUSPENDED=new Set(['ASH_011','ASH_052','ASH_079','ASH_248','SEC_179']);
export const DEFAULT_FORMAT_RULES:FormatRules={date:PREMIER_RULES_DATE,premierSets:['JTL','LOF','IBH','SEC','LAW','ASH','HMW'],premierSuspended:[...PREMIER_SUSPENDED],eternalSuspended:[]};

export function formatIssues(deck:Deck,byId:ReadonlyMap<string,Card>,premierIds:ReadonlySet<string>,format:'Premier'|'Eternal',rules:FormatRules=DEFAULT_FORMAT_RULES){
 const entries=[{id:deck.leader,count:1},{id:deck.base,count:1},...deck.deck,...deck.sideboard].filter(x=>x.id);
 const unique=[...new Set(entries.map(x=>x.id))];
 const missing=unique.filter(id=>!byId.has(id));
 const suspendedCores=new Set((format==='Premier'?rules.premierSuspended:rules.eternalSuspended).map(id=>byId.get(id)?.core??id));
 const suspended=unique.filter(id=>suspendedCores.has(byId.get(id)?.core??id));
 const rotated=format==='Premier'?unique.filter(id=>byId.has(id)&&!premierIds.has(id)&&!suspended.includes(id)):[];
 return {missing,rotated,suspended};
}

export function acrossDeckShortages(decks:Deck[],collection:Owned[],byId:ReadonlyMap<string,Card>){
 const owned=new Map<string,number>(),required=new Map<string,{id:string;count:number;decks:Set<string>}>();
 for(const row of collection){const core=byId.get(row.id)?.core??row.id;owned.set(core,(owned.get(core)??0)+row.count)}
 for(const deck of decks)for(const entry of [{id:deck.leader,count:1},{id:deck.base,count:1},...deck.deck,...deck.sideboard]){
  if(!entry.id)continue;const core=byId.get(entry.id)?.core??entry.id;
  const item=required.get(core)??{id:entry.id,count:0,decks:new Set<string>()};item.count+=entry.count;item.decks.add(deck.name);required.set(core,item);
 }
 return [...required].map(([core,item])=>({...item,owned:owned.get(core)??0,missing:Math.max(0,item.count-(owned.get(core)??0)),name:byId.get(item.id)?.name??item.id})).filter(x=>x.missing>0).sort((a,b)=>b.missing-a.missing||a.name.localeCompare(b.name));
}

export function deckVersionChanges(current:Deck,saved:Deck,byId:ReadonlyMap<string,Card>){
 const changes:string[]=[];
 if(current.leader!==saved.leader)changes.push('Leader changed');
 if(current.base!==saved.base)changes.push('Base changed');
 for(const section of ['deck','sideboard'] as const){
  const before=new Map(saved[section].map(x=>[x.id,x.count]));const after=new Map(current[section].map(x=>[x.id,x.count]));
  for(const id of new Set([...before.keys(),...after.keys()])){const delta=(after.get(id)??0)-(before.get(id)??0);if(delta)changes.push(`${delta>0?'+':''}${delta} ${byId.get(id)?.name??id} (${section==='deck'?'main':'sideboard'})`)}
 }
 return changes;
}
