import {validatePlayRecords,type PlayRecords} from './play-records.ts';
import {validateCardDisplay} from './card-display.ts';
import type {QuickFilter,SortRule} from './card-display.ts';
export type Card={id:string;name:string;subtitle:string;type:string;set:string;number:string;aspects:string[];traits:string[];keywords:string[];cost:number|null;power:number|null;hp:number|null;arena:string;rarity:string;artist:string;variant:string;image:string;back:string;text:string;backText:string;epic:string;unique:boolean;core:string;canonical:string;foilOnly?:boolean};
export type Entry={id:string;count:number};
export type Owned={id:string;foil:boolean;count:number};
export type CollectionResolution={sourceId:string;kind:'catalog'|'token'|'non-catalog'|'ignored';targetId?:string;correctedId?:string;name?:string};
export type CollectionImport={collection:Owned[];resolutions:CollectionResolution[]};
export type ResolutionPreview={sourceId:string;destinationId:string;source:{normal:number;foil:number};existing:{normal:number;foil:number};after:{normal:number;foil:number};combines:boolean;unresolvedBefore:number;unresolvedAfter:number};
export type Deck={uid:string;name:string;author:string;leader:string;base:string;deck:Entry[];sideboard:Entry[];notes:string};
export type DeckVersion={uid:string;deckId:string;name:string;savedAt:string;deck:Deck};
export type FormatRules={date:string;premierSets:string[];premierSuspended:string[];eternalSuspended:string[]};
export type Favorites={cards:string[];decks:string[]};
export type CardList={uid:string;name:string;cards:string[]};
export type DeckFolder={uid:string;name:string;deckIds:string[]};
export type HolocronTheme='dark'|'light'|'moss'|'clay'|'olive'|'umber';
export type Workspace={achievementUnlocks?:Record<string,string>;playRecords?:PlayRecords;collection:Owned[];decks:Deck[];deckVersions?:DeckVersion[];formatRules?:FormatRules;favorites?:Favorites;resolutions?:CollectionResolution[];lists?:CardList[];settings?:{theme?:HolocronTheme;view?:'grid'|'table'|'large';size?:number;cardColumns?:number;deckFolders?:DeckFolder[];rarityBorders?:boolean;showDeckMembership?:boolean;cardSort?:SortRule[];quickFilters?:QuickFilter[]}};
export type Catalog={cards:Card[];sets:{code:string;name:string}[];updated:string;sources:string[]};
export const emptyWorkspace:Workspace={collection:[],decks:[]};
export function normalizeId(s:string){const m=s.trim().toUpperCase().match(/^([A-Z0-9]+)[_ -]([A-Z]*\d+[A-Z]*(?:-\d+)?)$/);if(!m)throw Error(`Invalid card ID: ${s}`);return `${m[1]}_${/^\d+$/.test(m[2])?m[2].padStart(3,'0'):m[2]}`}
export function csvRows(text:string):string[][]{const out:string[][]=[];let row:string[]=[],field='',quoted=false;const t=text.replace(/^\uFEFF/,'');for(let i=0;i<t.length;i++){const c=t[i];if(c==='"'){if(quoted&&t[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(field);field=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&t[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))out.push(row);row=[];field=''}else field+=c}if(quoted)throw Error('Unclosed quotation mark in CSV');row.push(field);if(row.some(x=>x.trim()))out.push(row);return out}
export function parseCollection(text:string):Owned[]{return parseCollectionImport(text).collection}
export function parseCollectionImport(text:string):CollectionImport {
 const rows=csvRows(text);if(!rows.length)throw Error('CSV is empty');
 const head=rows.shift()!.map(x=>x.trim().toLowerCase());
 for(const h of ['set','cardnumber','count','isfoil'])if(!head.includes(h))throw Error(`Missing CSV column: ${h}. Use the SWUDB collection export.`);
 const collection:Owned[]=[],resolutions:CollectionResolution[]=[];
 for(let i=0;i<rows.length;i++){
  const get=(h:string)=>String(rows[i][head.indexOf(h)]??'').trim();
  const count=Number(get('count'));if(!/^\d+$/.test(get('count'))||!Number.isSafeInteger(count)||count>100000)throw Error(`Row ${i+2}: invalid count`);
  const f=get('isfoil').toLowerCase();if(!['true','false','1','0'].includes(f))throw Error(`Row ${i+2}: IsFoil must be TRUE or FALSE`);
  const id=normalizeId(get('set')+'_'+get('cardnumber'));
  collection.push({id,count,foil:f==='true'||f==='1'});
  const kind=get('resolutionkind');
  if(kind)resolutions.push(validateResolution({sourceId:id,kind,targetId:get('targetid')||undefined,correctedId:get('correctedid')||undefined,name:get('resolutionname')||undefined}));
  else if(['targetid','correctedid','resolutionname'].some(h=>get(h)))throw Error(`Row ${i+2}: resolution details need a ResolutionKind`);
 }
 return {collection:mergeCollection([],collection),resolutions:validatedResolutions(resolutions)};
}
const quoteCsv=(value:string|number)=>{const s=String(value);return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
export function exportCardList(list:CardList,byId:ReadonlyMap<string,Card>,format:'json'|'csv'){
 const cards=list.cards.map(id=>{
  const card=byId.get(id);
  const [set='',number='']=id.split('_');
  return {id,name:card?.name??'',subtitle:card?.subtitle??'',set:card?.set??set,number:card?.number??number,variant:card?.variant??''};
 });
 if(format==='json')return JSON.stringify({name:list.name,cards},null,2);
 const rows=cards.map(({id,name,subtitle,set,number,variant})=>[id,name,subtitle,set,number,variant].map(quoteCsv).join(','));
 return ['Card ID,Name,Subtitle,Set,Card Number,Variant',...rows].join('\r\n')+'\r\n';
}

// SWU collector numbers include the printed set denominator for these releases.
const collectorTotals:Readonly<Record<string,number>>={SOR:252,SHD:262,TWI:257,JTL:262,LOF:264,SEC:264,LAW:264,ASH:264,HMW:272,IC27:194};
export function exportMassEntry(list:CardList,byId:ReadonlyMap<string,Card>){
 const lines:string[]=[],unmatched:string[]=[];
 for(const id of list.cards){
  const card=byId.get(id);
  if(!card?.name){unmatched.push(id);continue}
  const title=[card.name,card.subtitle].filter(Boolean).join(' - ').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();
  const total=collectorTotals[card.set];
  const number=total&&/^\d+$/.test(card.number)?card.number+'/'+total:card.number;
  lines.push(['1',title,card.set?'['+card.set+']':'',number].filter(Boolean).join(' '));
 }
 return {text:lines.join('\n'),unmatched};
}

export function mergeCollection(a:Owned[],b:Owned[]):Owned[]{const m=new Map<string,Owned>();for(const x of [...a,...b]){const k=x.id+':'+x.foil;m.set(k,{...x,count:(m.get(k)?.count||0)+x.count})}return [...m.values()].filter(x=>x.count>0)}
export function exportCollection(c:Owned[],resolutions?:CollectionResolution[]){
 const saved=validatedResolutions(resolutions||[]),enriched=saved.length>0,bySource=new Map(saved.map(r=>[r.sourceId,r]));
 // Retain saved decisions even if their final copy was removed. Zero-count rows carry metadata only.
 const sourceIds=new Set(c.map(row=>row.id)),rows=[...c,...saved.filter(r=>!sourceIds.has(r.sourceId)).map(r=>({id:r.sourceId,count:0,foil:false}))];
 return 'Set,CardNumber,Count,IsFoil'+(enriched?',ResolutionKind,TargetId,CorrectedId,ResolutionName':'')+'\r\n'+rows.map(x=>{
  const [set,number]=x.id.split('_'),r=bySource.get(x.id);const fields:(string|number)[]=[set,number,x.count,x.foil?'TRUE':'FALSE'];
  if(enriched)fields.push(r?.kind||'',r?.targetId||'',r?.correctedId||'',r?.name||'');
  return fields.map(quoteCsv).join(',');
 }).join('\r\n');
}

function validateResolution(value:any):CollectionResolution {
 if(!value||typeof value.sourceId!=='string'||!['catalog','token','non-catalog','ignored'].includes(value.kind))throw Error('Invalid collection resolution');
 const sourceId=normalizeId(value.sourceId),result:CollectionResolution={sourceId,kind:value.kind};
 for(const field of ['targetId','correctedId'] as const){if(value[field]!==undefined){if(typeof value[field]!=='string'||!value[field].trim())throw Error(`Invalid resolution ${field}`);result[field]=normalizeId(value[field])}}
 if(value.name!==undefined){if(typeof value.name!=='string'||value.name.length>200)throw Error('Resolution name must be 200 characters or fewer');if(value.name.trim())result.name=value.name.trim()}
 if(result.kind==='catalog'){
  if(!result.targetId)throw Error('Choose a catalog card to map this item to.');
  if(result.targetId===sourceId)throw Error('Choose a different catalog ID, or clear this resolution.');
 }else if(result.targetId)throw Error('Only a catalog mapping can have a target ID.');
 if(result.kind==='ignored'&&result.correctedId)throw Error('An ignored item keeps its original ID.');
 return result;
}
function validatedResolutions(value:any):CollectionResolution[]{
 if(!Array.isArray(value)||value.length>30000)throw Error('Invalid collection resolutions');
 const bySource=new Map<string,CollectionResolution>();
 for(const raw of value){const resolution=validateResolution(raw),previous=bySource.get(resolution.sourceId);if(previous&&JSON.stringify(previous)!==JSON.stringify(resolution))throw Error(`Conflicting resolutions for ${resolution.sourceId}. Use Replace or clear its saved resolution first.`);bySource.set(resolution.sourceId,resolution)}
 return [...bySource.values()];
}
function resolvedId(id:string,resolution?:CollectionResolution){return resolution?.kind==='catalog'?resolution.targetId||id:resolution?.kind==='token'||resolution?.kind==='non-catalog'?resolution.correctedId||id:id}

// Resolutions are applied to raw holdings exactly once. Saving or changing an alias never moves quantities.
export function effectiveCollection(workspace:Workspace):Owned[]{
 const resolutions=new Map((workspace.resolutions||[]).map(r=>[r.sourceId,r]));
 return mergeCollection([],workspace.collection.map(row=>({...row,id:resolvedId(row.id,resolutions.get(row.id))})));
}
export function unresolvedCollection(workspace:Workspace,byId:Map<string,Card>):Owned[]{
 const resolutions=new Map((workspace.resolutions||[]).map(r=>[r.sourceId,r]));
 return mergeCollection([],workspace.collection).filter(row=>{const r=resolutions.get(row.id);return r?r.kind==='catalog'&&!byId.has(r.targetId||''):!byId.has(row.id)});
}
export function setCollectionResolution(workspace:Workspace,resolution:CollectionResolution|null,sourceId:string,byId:Map<string,Card>):Workspace {
 const id=normalizeId(sourceId);let next:CollectionResolution|undefined;
 if(resolution){
  next=validateResolution(resolution);
  if(next.sourceId!==id)throw Error('The resolution must refer to the selected collection ID.');
  if(!workspace.collection.some(row=>row.id===id&&row.count>0))throw Error('This item is no longer in your collection.');
  if(next.kind==='catalog'&&!byId.has(next.targetId!))throw Error('This catalog ID was not found. Search for an existing card or classify the item as a token or non-catalog item.');
  if((next.kind==='token'||next.kind==='non-catalog')&&byId.has(next.correctedId||id))throw Error('This ID is in the catalog. Choose Map to catalog instead.');
  if((next.kind==='token'||next.kind==='non-catalog')&&next.correctedId&&next.correctedId!==id&&effectiveCollection({...workspace,collection:workspace.collection.filter(row=>row.id!==id)}).some(row=>row.id===next!.correctedId))throw Error('This corrected ID is already used by another collection item. Choose a unique ID to keep the items separate.');
  if((next.kind==='token'||next.kind==='non-catalog')&&next.correctedId&&next.correctedId!==id&&workspace.collection.some(row=>row.id===next!.correctedId))throw Error('This corrected ID belongs to another source item. Choose a unique ID to keep the items separate.');
 }
 const resolutions=(workspace.resolutions||[]).filter(r=>r.sourceId!==id);if(next)resolutions.push(next);
 return {...workspace,resolutions};
}
export function resolutionPreview(workspace:Workspace,sourceId:string,resolution:CollectionResolution|null,byId:Map<string,Card>):ResolutionPreview {
 const id=normalizeId(sourceId),updated=setCollectionResolution(workspace,resolution,id,byId),saved=updated.resolutions?.find(r=>r.sourceId===id),destinationId=resolvedId(id,saved);
 const quantities=(rows:Owned[])=>rows.reduce((counts,row)=>{counts[row.foil?'foil':'normal']+=row.count;return counts},{normal:0,foil:0});
 const source=quantities(workspace.collection.filter(row=>row.id===id));
 const existing=quantities(effectiveCollection({...updated,collection:updated.collection.filter(row=>row.id!==id)}).filter(row=>row.id===destinationId));
 return {sourceId:id,destinationId,source,existing,after:{normal:source.normal+existing.normal,foil:source.foil+existing.foil},combines:existing.normal+existing.foil>0,unresolvedBefore:unresolvedCollection(workspace,byId).length,unresolvedAfter:unresolvedCollection(updated,byId).length};
}
function validateResolutionDestinations(workspace:Workspace,byId?:Map<string,Card>):Workspace {
 for(const resolution of workspace.resolutions||[]){
  if(resolution.kind!=='token'&&resolution.kind!=='non-catalog')continue;
  const id=resolution.correctedId||resolution.sourceId;
  if(byId?.has(id))throw Error(`${id} is in the catalog. Map this item to the catalog instead of classifying it separately.`);
  const otherRows=workspace.collection.filter(row=>row.id!==resolution.sourceId);
  if(otherRows.some(row=>row.id===id)||effectiveCollection({...workspace,collection:otherRows}).some(row=>row.id===id))throw Error(`The classified ID ${id} conflicts with another collection item. Correct its ID or clear that resolution before importing.`);
 }
 return workspace;
}
export function applyCollectionImport(workspace:Workspace,incoming:CollectionImport,mode:'add'|'replace',byId?:Map<string,Card>):Workspace {
 const resolutions=validatedResolutions(incoming.resolutions||[]);
 if(mode==='replace')return validateResolutionDestinations({...workspace,collection:mergeCollection([],incoming.collection),resolutions},byId);
 return validateResolutionDestinations({...workspace,collection:mergeCollection(workspace.collection,incoming.collection),resolutions:validatedResolutions([...(workspace.resolutions||[]),...resolutions])},byId);
}
export function adjustEffectiveOwned(workspace:Workspace,cardId:string,foil:boolean,delta:number):Workspace {
 const id=normalizeId(cardId);if(typeof foil!=='boolean'||!Number.isSafeInteger(delta))throw Error('Invalid quantity change');if(!delta)return workspace;
 const resolutions=new Map((workspace.resolutions||[]).map(r=>[r.sourceId,r]));
 const collection=mergeCollection([],workspace.collection).map(row=>({...row}));
 const direct=collection.find(row=>row.id===id&&row.foil===foil&&resolvedId(row.id,resolutions.get(row.id))===id);
 const contributors=collection.filter(row=>row.foil===foil&&resolvedId(row.id,resolutions.get(row.id))===id).sort((a,b)=>a===direct?-1:b===direct?1:a.id.localeCompare(b.id));
 if(delta>0){
  // A direct ID that is itself remapped cannot receive copies without redirecting them again.
  const row=direct||(resolvedId(id,resolutions.get(id))!==id?contributors[0]:undefined);
  if(row)row.count+=delta;else if(resolvedId(id,resolutions.get(id))===id)collection.push({id,foil,count:delta});else throw Error('Clear this ID’s saved mapping before adding copies.');
 }else{let remaining=-delta;for(const row of contributors){const taken=Math.min(row.count,remaining);row.count-=taken;remaining-=taken;if(!remaining)break}}
 return {...workspace,collection:collection.filter(row=>row.count>0)};
}
export function parseDeck(text:string):Deck{const d=JSON.parse(text);if(!d||typeof d!=='object')throw Error('Expected a SWUDB deck object');const ref=(x:any,label:string)=>{if(!x||typeof x.id!=='string'||x.count!==1)throw Error(`${label} needs an id and count: 1`);return normalizeId(x.id)};const entries=(a:any,label:string):Entry[]=>{if(!Array.isArray(a))throw Error(`${label} must be an array`);const m=new Map<string,number>();for(const e of a){if(!e||typeof e.id!=='string'||!Number.isInteger(e.count)||e.count<1||e.count>100)throw Error(`Invalid ${label} entry`);const id=normalizeId(e.id);m.set(id,(m.get(id)||0)+e.count)}return [...m].map(([id,count])=>({id,count}))};return {uid:makeId(),name:String(d.metadata?.name||'Imported deck').slice(0,200),author:String(d.metadata?.author||''),leader:ref(d.leader,'Leader'),base:ref(d.base,'Base'),deck:entries(d.deck,'Deck'),sideboard:entries(d.sideboard||[],'Sideboard'),notes:''}}
export function deckExport(d:Deck){if(!d.leader||!d.base)throw Error('Choose a leader and base first');return {metadata:{name:d.name,author:d.author||'Holocron'},leader:{id:d.leader,count:1},base:{id:d.base,count:1},deck:d.deck,sideboard:d.sideboard}}
export function forceTableDeckUrl(deck:Deck){
 const payload=deckExport(deck);
 // ForceTable imports the JTL Chopper Base printing as Dagobah Swamp.
 if(payload.base.id==='JTL_029')payload.base.id='SOR_030';
 const ascii=JSON.stringify(payload).replace(/[^\x00-\x7f]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 return 'https://www.forcetable.net/swu/import?svc=swudb&id='+encodeURIComponent(btoa(ascii));
}
export function aspectPenalty(c:Card,leader?:Card,base?:Card){const available:Record<string,number>={};for(const a of [...leader?.aspects||[],...base?.aspects||[]])available[a]=(available[a]||0)+1;let missing=0;for(const a of c.aspects){if(available[a])available[a]--;else missing++}return missing*2}
export function probability(total:number,copies:number,draws:number){if(!total||copies<=0)return 0;let miss=1;for(let i=0;i<Math.min(draws,total);i++)miss*=Math.max(0,total-copies-i)/(total-i);return 1-miss}
export function deckWarnings(d:Deck,byId:Map<string,Card>){const w:string[]=[];const total=d.deck.reduce((s,x)=>s+x.count,0);if(total<50)w.push(`Main deck needs ${50-total} more cards for the standard 50-card minimum.`);if(d.sideboard.reduce((s,x)=>s+x.count,0)>10)w.push('Sideboard exceeds 10 cards.');if(byId.get(d.leader)?.type!=='Leader')w.push('Choose a valid leader.');if(byId.get(d.base)?.type!=='Base')w.push('Choose a valid base.');const counts=new Map<string,number>();for(const e of [...d.deck,...d.sideboard]){const c=byId.get(e.id);if(!c){w.push(`Unresolved card: ${e.id}`);continue}if(!['Unit','Event','Upgrade'].includes(c.type))w.push(`${c.name} cannot go in the main deck or sideboard.`);counts.set(c.core,(counts.get(c.core)||0)+e.count)}for(const [key,n] of counts)if(n>3)w.push(`${key.split('|').slice(0,2).filter(Boolean).join(' — ')}: ${n} copies across main and sideboard (normally max 3).`);return w}
export function validateAchievementUnlocks(x:any):Record<string,string>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length>1000)throw Error('Invalid achievements');for(const [key,value] of Object.entries(x))if(!/^[-A-Za-z0-9_.]{1,100}$/.test(key)||typeof value!=='string'||value.length>40||!Number.isFinite(Date.parse(value)))throw Error('Invalid achievement date');return {...x}}
export function validateBackup(d:any,byId?:Map<string,Card>):Workspace {if(!d||!Array.isArray(d.collection)||!Array.isArray(d.decks)||d.decks.length>500||d.collection.length>30000)throw Error('Invalid backup');const collection=d.collection.map((x:any)=>{if(typeof x.id!=='string'||typeof x.foil!=='boolean'||!Number.isInteger(x.count)||x.count<0||x.count>100000)throw Error('Invalid collection row in backup');return {...x,id:normalizeId(x.id)}});const deckIds=new Set<string>();const decks=d.decks.map((x:any)=>{if(typeof x.name!=='string'||x.name.length>200||typeof x.author!=='string'||x.author.length>200||typeof x.notes!=='string'||x.notes.length>20000)throw Error('Invalid deck details in backup');const parsed=parseDeck(JSON.stringify({metadata:{name:x.name,author:x.author},leader:{id:x.leader||'SOR_005',count:1},base:{id:x.base||'SOR_022',count:1},deck:x.deck,sideboard:x.sideboard}));const uid=x.uid??parsed.uid;if(typeof uid!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(uid)||deckIds.has(uid))throw Error('Invalid or duplicate deck ID in backup');deckIds.add(uid);return {...parsed,uid,leader:x.leader?normalizeId(x.leader):'',base:x.base?normalizeId(x.base):'',notes:x.notes}});return validateResolutionDestinations({collection:mergeCollection([],collection),decks,...(d.achievementUnlocks!==undefined?{achievementUnlocks:validateAchievementUnlocks(d.achievementUnlocks)}:{}),...(d.playRecords!==undefined?{playRecords:validatePlayRecords(d.playRecords)}:{}),...(d.favorites!==undefined?{favorites:validateFavorites(d.favorites)}:{}),...(d.resolutions!==undefined?{resolutions:validatedResolutions(d.resolutions)}:{}),...(d.lists!==undefined?{lists:validateLists(d.lists)}:{}),...(d.deckVersions!==undefined?{deckVersions:validateDeckVersions(d.deckVersions)}:{}),...(d.formatRules!==undefined?{formatRules:validateFormatRules(d.formatRules)}:{}),...(d.settings!==undefined?{settings:validateSettings(d.settings)}:{})},byId)}

export function makeId(){if(typeof crypto.randomUUID==='function')return crypto.randomUUID();return Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('')}

export function validateDeckVersions(value:any):DeckVersion[]{
 if(!Array.isArray(value)||value.length>200)throw Error('Invalid deck versions');
 const ids=new Set<string>();
 return value.map(v=>{
  if(!v||typeof v.uid!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(v.uid)||ids.has(v.uid)||typeof v.deckId!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(v.deckId)||typeof v.name!=='string'||!v.name.trim()||v.name.length>100||typeof v.savedAt!=='string'||!Number.isFinite(Date.parse(v.savedAt)))throw Error('Invalid deck version');
  ids.add(v.uid);
  const deck=validateBackup({collection:[],decks:[v.deck]}).decks[0];
  return {uid:v.uid,deckId:v.deckId,name:v.name,savedAt:v.savedAt,deck};
 });
}
export function validateFormatRules(value:any):FormatRules{
 if(!value||typeof value.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value.date)||!Number.isFinite(Date.parse(value.date)))throw Error('Rules JSON needs a date in YYYY-MM-DD format');
 const codes=(input:any,name:string,pattern:RegExp,max:number)=>{if(!Array.isArray(input)||input.length>max||input.some(x=>typeof x!=='string'||!pattern.test(x)))throw Error(`Invalid ${name} in rules JSON`);return [...new Set<string>(input)]};
 return {date:value.date,premierSets:codes(value.premierSets,'Premier sets',/^[A-Z0-9]{2,10}$/,100),premierSuspended:codes(value.premierSuspended,'Premier suspended IDs',/^[A-Z0-9]+_[A-Z0-9-]+$/,300),eternalSuspended:codes(value.eternalSuspended,'Eternal suspended IDs',/^[A-Z0-9]+_[A-Z0-9-]+$/,300)};
}

export function backupFilename(workspace:Workspace,date=new Date()) {
 const pad=(n:number)=>String(n).padStart(2,'0');
 const stamp=`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
 const cards=workspace.collection.reduce((total,row)=>total+row.count,0);
 return `Holocron_Backup_${cards}-cards_${stamp}.json`;
}
export function createBackup(workspace:Workspace,date=new Date()) {return {name:backupFilename(workspace,date),text:JSON.stringify({format:'holocron-backup-v1',exported:date.toISOString(),data:workspace},null,2)}}

export function validateFavorites(value:any):Favorites {
 if(!value||!Array.isArray(value.cards)||!Array.isArray(value.decks)||value.cards.length>30000||value.decks.length>500)throw Error('Invalid favorites in backup');
 const cards=value.cards.map((id:any)=>{if(typeof id!=='string')throw Error('Invalid favorite card');return normalizeId(id)});
 const decks=value.decks.map((id:any)=>{if(typeof id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(id))throw Error('Invalid favorite deck');return id});
 return {cards:[...new Set<string>(cards)],decks:[...new Set<string>(decks)]};
}
export function toggleFavorite(workspace:Workspace,kind:keyof Favorites,id:string):Workspace {
 const favorites=workspace.favorites||{cards:[],decks:[]};const list=favorites[kind];
 return {...workspace,favorites:{...favorites,[kind]:list.includes(id)?list.filter(x=>x!==id):[...list,id]}};
}

export function validateLists(value:any):CardList[]{
 if(!Array.isArray(value)||value.length>500)throw Error('Invalid lists in backup');
 const seen=new Set<string>();return value.map(x=>{
 if(!x||typeof x.uid!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(x.uid)||seen.has(x.uid)||typeof x.name!=='string'||!x.name.trim()||x.name.length>200||!Array.isArray(x.cards)||x.cards.length>30000)throw Error('Invalid card list');
 seen.add(x.uid);return {uid:x.uid,name:x.name,cards:[...new Set<string>(x.cards.map((id:any)=>{if(typeof id!=='string')throw Error('Invalid list card');return normalizeId(id)}))]};
 });
}
export function matchesAspects(values:string[],selected:string[],mode:string){return !selected.length||(mode==='all'?selected.every(a=>values.includes(a)):selected.some(a=>values.includes(a)))}
export function deckMembership(card:Card,decks:Deck[],byId:Map<string,Card>){return decks.filter(d=>[d.leader,d.base,...d.deck.map(x=>x.id),...d.sideboard.map(x=>x.id)].some(id=>id===card.id||byId.get(id)?.core===card.core))}

function validateDeckFolders(value:unknown):DeckFolder[]{
 if(!Array.isArray(value)||value.length>500)throw Error('Invalid deck folders');
 const folders=new Set<string>(),decks=new Set<string>();
 const validId=(id:unknown):id is string=>typeof id==='string'&&/^[-a-zA-Z0-9_]{1,100}$/.test(id);
 return value.map(folder=>{
  if(!folder||!validId(folder.uid)||folders.has(folder.uid)||typeof folder.name!=='string'||!folder.name.trim()||folder.name.length>80||!Array.isArray(folder.deckIds)||folder.deckIds.length>500)throw Error('Invalid deck folder');
  folders.add(folder.uid);
  const deckIds=folder.deckIds.map((id:unknown)=>{
   if(!validId(id)||decks.has(id))throw Error('Invalid deck folder membership');
   decks.add(id);
   return id;
  });
  return {uid:folder.uid,name:folder.name.trim(),deckIds};
 });
}

export function validateSettings(x:any){if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid preferences');const out:NonNullable<Workspace['settings']>={};if(x.theme!==undefined){if(!['dark','light','moss','clay','olive','umber'].includes(x.theme))throw Error('Invalid theme');out.theme=x.theme}if(x.view!==undefined){if(!['grid','table','large'].includes(x.view))throw Error('Invalid card view');out.view=x.view}if(x.size!==undefined){if(!Number.isInteger(x.size)||x.size<180||x.size>450)throw Error('Invalid card size');out.size=x.size}if(x.cardColumns!==undefined){if(!Number.isInteger(x.cardColumns)||x.cardColumns<0||x.cardColumns>8)throw Error('Invalid cards across');out.cardColumns=x.cardColumns}if(x.deckFolders!==undefined)out.deckFolders=validateDeckFolders(x.deckFolders);if(x.showDeckMembership!==undefined){if(typeof x.showDeckMembership!=='boolean')throw Error('Invalid deck membership display');out.showDeckMembership=x.showDeckMembership}return {...out,...validateCardDisplay(x)}}
