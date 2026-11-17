import {effectiveCollection,aspectPenalty,deckWarnings,type Card,type Catalog,type Deck,type Entry,type Workspace,type FormatRules} from './model.ts';
import {DEFAULT_FORMAT_RULES,formatIssues} from './deck-tools.ts';
import {premierCards} from './premier.ts';

export const cardTitle=(card:Card|undefined,id='')=>card?[card.name,card.subtitle].filter(Boolean).join(' · '):id;
const coreOf=(id:string,byId:ReadonlyMap<string,Card>)=>byId.get(id)?.core||id;
export function ownedByCore(workspace:Workspace,byId:ReadonlyMap<string,Card>){
 const result=new Map<string,number>();
 for(const row of effectiveCollection(workspace)){const key=coreOf(row.id,byId);result.set(key,(result.get(key)||0)+row.count)}
 return result;
}
export function deckDemand(deck:Deck,byId:ReadonlyMap<string,Card>){
 const result=new Map<string,{id:string;count:number}>();
 for(const row of [{id:deck.leader,count:1},{id:deck.base,count:1},...deck.deck,...deck.sideboard]){if(!row.id)continue;const key=coreOf(row.id,byId),old=result.get(key);result.set(key,{id:old?.id||row.id,count:(old?.count||0)+row.count})}
 return result;
}
export function deckReadiness(deck:Deck,workspace:Workspace,byId:ReadonlyMap<string,Card>){
 const owned=ownedByCore(workspace,byId);
 const shortages=[...deckDemand(deck,byId)].map(([core,row])=>({...row,core,owned:owned.get(core)||0,missing:Math.max(0,row.count-(owned.get(core)||0))})).filter(row=>row.missing>0);
 const issues=deckWarnings(deck,new Map(byId));
 const missing=shortages.reduce((n,row)=>n+row.missing,0);
 return {shortages,missing,issues,buildable:missing===0&&issues.length===0};
}
export type Replacement={card:Card;available:number;score:number;reasons:string[];penalty:number};
export function replacementsFor(target:Card,deck:Deck,workspace:Workspace,byId:ReadonlyMap<string,Card>,legalIds?:ReadonlySet<string>):Replacement[]{
 if(!['Unit','Upgrade','Event'].includes(target.type))return [];
 const owned=ownedByCore(workspace,byId),demand=deckDemand(deck,byId),leader=byId.get(deck.leader),base=byId.get(deck.base),best=new Map<string,Replacement>();
 for(const card of byId.values()){
  if(card.core===target.core||card.type!==target.type||(target.type==='Unit'&&card.arena!==target.arena)||(legalIds&&!legalIds.has(card.id)))continue;
  const used=demand.get(card.core)?.count||0,available=Math.min(3-used,(owned.get(card.core)||0)-used);if(available<=0)continue;
  const costDistance=Math.abs((card.cost??99)-(target.cost??99));if(costDistance>2)continue;
  const penalty=aspectPenalty(card,leader,base);if(penalty>aspectPenalty(target,leader,base))continue;
  const keywords=card.keywords.filter(k=>target.keywords.includes(k)),traits=card.traits.filter(k=>target.traits.includes(k));
  const sameAspects=[...card.aspects].sort().join('|')===[...target.aspects].sort().join('|');
  const reasons=[`Same ${card.type.toLowerCase()}${card.type==='Unit'?' / '+card.arena.toLowerCase():''}`,costDistance===0?'Same printed cost':`${costDistance} cost ${Number(card.cost)>Number(target.cost)?'higher':'lower'}`,sameAspects?'Same aspects':penalty===0?'Fits leader/base aspects':`${penalty} extra aspect cost`,...(keywords.length?['Shares '+keywords.slice(0,3).join(', ')]:[]),...(traits.length?['Shares '+traits.slice(0,2).join(', ')]:[])];
  const score=40-costDistance*8+(sameAspects?12:0)+keywords.length*8+traits.length*3-penalty*4;
  const result={card,available,score,reasons,penalty},old=best.get(card.core);
  if(!old||score>old.score||(score===old.score&&card.variant==='Normal'&&old.card.variant!=='Normal'))best.set(card.core,result);
 }
 return [...best.values()].sort((a,b)=>b.score-a.score||cardTitle(a.card).localeCompare(cardTitle(b.card))).slice(0,6);
}
export function deckSummary(deck:Deck,workspace:Workspace,byId:ReadonlyMap<string,Card>){
 const curve=Array<number>(8).fill(0),aspects:Record<string,number>={};let costSum=0,known=0;
 for(const row of deck.deck){const c=byId.get(row.id);if(!c)continue;if(c.cost!==null){curve[Math.min(7,Math.max(0,c.cost))]+=row.count;costSum+=c.cost*row.count;known+=row.count}for(const a of c.aspects)aspects[a]=(aspects[a]||0)+row.count}
 return {curve,aspects,average:known?costSum/known:0,main:deck.deck.reduce((n,r)=>n+r.count,0),sideboard:deck.sideboard.reduce((n,r)=>n+r.count,0),missing:deckReadiness(deck,workspace,byId).missing};
}
export function compareDecks(left:Deck,right:Deck){
 const rows:{section:'Main deck'|'Sideboard';id:string;before:number;after:number;delta:number}[]=[];
 const counts=(entries:Entry[])=>{const m=new Map<string,number>();for(const row of entries)m.set(row.id,(m.get(row.id)||0)+row.count);return m};
 for(const section of ['deck','sideboard'] as const){const a=counts(left[section]),b=counts(right[section]);for(const id of new Set([...a.keys(),...b.keys()])){const before=a.get(id)||0,after=b.get(id)||0;if(before!==after)rows.push({section:section==='deck'?'Main deck':'Sideboard',id,before,after,delta:after-before})}}
 return {leader:left.leader===right.leader?null:{before:left.leader,after:right.leader},base:left.base===right.base?null:{before:left.base,after:right.base},rows};
}
export function legalityFor(deck:Deck,cards:Card[],byId:ReadonlyMap<string,Card>,format:'Premier'|'Eternal'='Premier',rules:FormatRules=DEFAULT_FORMAT_RULES,now=new Date()){
 const result=formatIssues(deck,byId,premierCards(cards,now,rules),format,rules);
 return {...result,structural:deckWarnings(deck,new Map(byId)),date:rules.date,count:result.missing.length+result.rotated.length+result.suspended.length};
}
export type Achievement={id:string;title:string;description:string;current:number;target:number;earned:boolean;earnedAt?:string;group:'Collection'|'Decks'|'Sets'};
export function collectionAchievements(workspace:Workspace,catalog:Catalog):Achievement[]{
 const byId=new Map(catalog.cards.map(card=>[card.id,card])),owned=effectiveCollection(workspace).filter(row=>row.count>0&&byId.has(row.id));
 const copies=owned.reduce((n,row)=>n+row.count,0),unique=new Set(owned.map(row=>coreOf(row.id,byId))).size,foils=owned.filter(row=>row.foil).reduce((n,row)=>n+row.count,0);
 const results:Achievement[]=[];
 const add=(id:string,title:string,description:string,current:number,target:number,group:Achievement['group'])=>{const earnedAt=workspace.achievementUnlocks?.[id];results.push({id,title,description,current,target,earned:current>=target||!!earnedAt,...(earnedAt?{earnedAt}:{}),group})};
 for(const target of [10,100,1000,5000])add('copies-'+target,`${target.toLocaleString()} cards collected`,'Catalog copies, including foils and alternate art.',copies,target,'Collection');
 for(const target of [10,100,500,1000])add('unique-'+target,`${target.toLocaleString()} different cards`,'Different gameplay cards; alternate art does not count twice.',unique,target,'Collection');
 for(const target of [10,100])add('foils-'+target,`${target} foils collected`,'Foil copies in your collection.',foils,target,'Collection');
 for(const target of [1,5,10,25,50])add('decks-'+target,`${target} ${target===1?'deck':'decks'} in the workshop`,'Saved decks in My decks, including builds in progress.',workspace.decks.length,target,'Decks');
 for(const set of catalog.sets){
  const normal=new Set(catalog.cards.filter(card=>card.set===set.code&&card.variant==='Normal'&&['Unit','Event','Upgrade','Base','Leader'].includes(card.type)).map(card=>card.core));if(normal.size<10)continue;
  const have=new Set(owned.filter(row=>byId.get(row.id)?.set===set.code&&normal.has(byId.get(row.id)!.core)).map(row=>byId.get(row.id)!.core)).size;
  for(const fraction of [.5,1])add(`set-${set.code}-${fraction}`,`${set.code} · ${fraction===1?'Set complete':'Halfway there'}`,`${fraction===1?'Every':'Half of the'} normal gameplay cards in ${set.name}. Any art or foil from this set counts.`,have,Math.ceil(normal.size*fraction),'Sets');
 }
 return results;
}
