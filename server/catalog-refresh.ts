import type {Card,Catalog} from '../modern/lib/model.ts';
import type {NewsItem,CatalogChange,UpdateStatus} from '../modern/lib/news-types.ts';
import bundled from '../public/catalog.json' with {type:'json'};

export const fallbackCatalog=bundled as Catalog;
const API='https://api.swu-db.com';
const NEWS='https://admin.starwarsunlimited.com/api/articles';
const idPattern=/^[A-Z0-9]+_[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const codePattern=/^[A-Z0-9]{2,12}$/;
type Pointer={current:string;previous?:string};
type Metadata={checkedAt?:string;catalogSuccessAt?:string;newsCheckedAt?:string;catalogError?:string|null;newsError?:string|null;news?:NewsItem[];changes?:CatalogChange[]};
type SourceSet={setId:string;fullName:string;numberCards?:number};
const text=(v:unknown)=>typeof v==='string'?v:'';
const array=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[];
const numeric=(v:unknown)=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const put=(db:D1Database,key:string,value:unknown)=>db.prepare('INSERT INTO catalog_cache (key,payload,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(key,JSON.stringify(value),new Date().toISOString());
async function read<T>(db:D1Database,key:string):Promise<T|null>{const row=await db.prepare('SELECT payload FROM catalog_cache WHERE key=?').bind(key).first<{payload:string}>();return row?JSON.parse(row.payload) as T:null}

export async function catalogSnapshot(db?:D1Database):Promise<Catalog>{
 if(!db)return fallbackCatalog;
 const pointer=await read<Pointer>(db,'pointer');if(!pointer)return fallbackCatalog;
 const rows=await db.prepare('SELECT payload FROM catalog_cache WHERE key LIKE ? ORDER BY key').bind(`snapshot:${pointer.current}:%`).all<{payload:string}>();
 if(!rows.results.length)throw Error('Saved catalog is unavailable.');
 return JSON.parse(rows.results.map(row=>JSON.parse(row.payload) as string).join('')) as Catalog;
}
export async function updateStatus(db?:D1Database):Promise<UpdateStatus>{
 const catalog=await catalogSnapshot(db);const meta=db?await read<Metadata>(db,'status'):null;const pointer=db?await read<Pointer>(db,'pointer'):null;
 return {checkedAt:meta?.checkedAt??null,catalogSuccessAt:meta?.catalogSuccessAt??null,catalogUpdated:catalog.updated,newsCheckedAt:meta?.newsCheckedAt??null,catalogError:meta?.catalogError??null,newsError:meta?.newsError??null,news:meta?.news??[],changes:meta?.changes??[],printings:catalog.cards.length,sets:catalog.sets.length,canRollback:!!pointer?.previous};
}
async function json(url:string):Promise<any>{
 const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/json'}});
 if(!response.ok)throw Error(`Source returned HTTP ${response.status}: ${new URL(url).hostname}`);
 const body=await response.text();if(body.length>15000000)throw Error('Source response exceeds the size limit.');
 try{return JSON.parse(body)}catch{throw Error(`Invalid source JSON: ${new URL(url).hostname}`)}
}
export function sourceSets(value:unknown):SourceSet[]{
 if(!Array.isArray(value)||!value.length||value.length>250)throw Error('Invalid set index.');
 const result=value.map(x=>{if(!x||!codePattern.test(x.setId)||typeof x.fullName!=='string')throw Error('Invalid set in source index.');return {setId:x.setId,fullName:x.fullName,numberCards:x.numberCards}});
 if(new Set(result.map(x=>x.setId)).size!==result.length)throw Error('Duplicate source sets.');return result;
}
export function compileSet(value:any,code:string,previous:ReadonlyMap<string,Card>):Card[]{
 if(!value||!Array.isArray(value.data)||value.data.length>5000||value.total_cards!==value.data.length)throw Error(`Incomplete source response for ${code}.`);
 const cards=new Map<string,Card>();
 for(const raw of value.data){
  const variant=text(raw.VariantType)||'Normal',foil=/foil/i.test(variant);let number=String(raw.Number??'');if(foil&&number.endsWith('F'))number=number.slice(0,-1);if(/^\d+$/.test(number))number=number.padStart(3,'0');
  const id=String(raw.Set)+'_'+number;if(raw.Set!==code||!idPattern.test(id)||!text(raw.Name)||!text(raw.Type))throw Error(`Invalid card in ${code}.`);
  if(cards.has(id)){const existing=cards.get(id)!;if(foil&&!existing.foilOnly)continue;if(!foil&&existing.foilOnly)cards.delete(id);else throw Error(`Duplicate catalog ID ${id}.`)}
  const old=previous.get(id),name=text(raw.Name),subtitle=text(raw.Subtitle),type=text(raw.Type),front=text(raw.FrontText),back=text(raw.BackText);
  const keywords=new Set(array(raw.Keywords));for(const kw of ['Ambush','Sentinel','Restore','Raid','Shielded','Saboteur','Grit','Overwhelm','Bounty','Smuggle','Exploit','Coordinate','Piloting','Hidden','Plot','Fortify'])if(new RegExp(`\\b${kw}\\b`,'i').test(front+' '+back))keywords.add(kw);
  // Preserve enrichment when a source has no keyword list; card IDs and ownership are never rewritten.
  if(!Array.isArray(raw.Keywords))for(const kw of old?.keywords??[])keywords.add(kw);
  cards.set(id,{id,name,subtitle,type,set:code,number,aspects:array(raw.Aspects),traits:array(raw.Traits).map(x=>x.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())),keywords:[...keywords].sort(),cost:numeric(raw.Cost),power:numeric(raw.Power),hp:numeric(raw.HP),arena:array(raw.Arenas).join(', '),rarity:text(raw.Rarity),artist:text(raw.Artist),variant,image:text(raw.FrontArt),back:text(raw.BackArt),text:front,backText:back,epic:text(raw.EpicAction),unique:!!raw.Unique,core:[name,subtitle,type].join('|'),canonical:'',foilOnly:foil});
 }
 return [...cards.values()];
}
export function finishCatalog(previous:Catalog,cards:Card[],sets:SourceSet[],now:string):Catalog{
 const ids=new Set(cards.map(c=>c.id));if(ids.size!==cards.length)throw Error('Duplicate catalog IDs.');
 const missing=previous.cards.filter(c=>!ids.has(c.id));if(missing.length)throw Error(`Update held for review: ${missing.length} existing card IDs are missing. The previous catalog is still active.`);
 if(cards.length<previous.cards.length||cards.length>100000)throw Error('Unexpected catalog size.');
 const oldById=new Map(previous.cards.map(c=>[c.id,c])),groups=new Map<string,Card[]>();for(const c of cards){const group=groups.get(c.core)??[];group.push(c);groups.set(c.core,group)}
 for(const group of groups.values()){const stable=group.map(c=>oldById.get(c.id)?.canonical).find(id=>id&&group.some(c=>c.id===id));const canonical=stable??[...group].sort((a,b)=>Number(a.variant!=='Normal')-Number(b.variant!=='Normal')||a.id.localeCompare(b.id))[0].id;for(const c of group)c.canonical=canonical}
 return {cards:cards.sort((a,b)=>a.id.localeCompare(b.id)),sets:sets.map(s=>({code:s.setId,name:s.fullName})).sort((a,b)=>a.code.localeCompare(b.code)),updated:now,sources:['https://www.swu-db.com/api']};
}
export function catalogDifference(before:Catalog,after:Catalog,now:string):CatalogChange{
 const old=new Map(before.cards.map(c=>[c.id,c]));const added:string[]=[],corrected:string[]=[];
 for(const c of after.cards){const previous=old.get(c.id);if(!previous)added.push(c.id);else if(JSON.stringify(previous)!==JSON.stringify(c))corrected.push(c.id)}
 return {at:now,added:added.slice(0,200),corrected:corrected.slice(0,200),addedCount:added.length,correctedCount:corrected.length,kind:'refresh'};
}
export function parseNews(payload:any,now=Date.now()):NewsItem[]{
 if(!Array.isArray(payload?.data)||!payload.data.length)throw Error('Official news feed is unavailable.');
 const items:NewsItem[]=[];
 for(const row of payload.data){const a=row?.attributes;if(!a||typeof a.title!=='string'||typeof a.slug!=='string'||!/^[-a-z0-9]+$/.test(a.slug))continue;const date=a.publishOn||a.publishedAt;if(!Number.isFinite(Date.parse(date))||Date.parse(date)>now)continue;
  items.push({title:a.title.slice(0,200),description:text(a.description).replace(/<[^>]*>/g,'').slice(0,200),url:`https://starwarsunlimited.com/articles/${a.slug}`,published:date,category:/format|suspens|rotat|rules|errata/i.test(a.title+' '+text(a.description))?'Rules & legality':'Game news'});
 }
 if(!items.length)throw Error('No dated official news entries were available.');return items.slice(0,12);
}
async function news(){const params=new URLSearchParams({'locale':'en','pagination[pageSize]':'12','sort':'publishOn:desc','fields[0]':'title','fields[1]':'slug','fields[2]':'publishOn','fields[3]':'publishedAt','fields[4]':'description','filters[publishedAt][$lte]':new Date().toISOString()});return parseNews(await json(NEWS+'?'+params))}
export async function refreshCatalog(db:D1Database,action:'refresh'|'rollback'='refresh'):Promise<UpdateStatus>{
 const time=Date.now(),now=new Date(time).toISOString();
 await db.prepare("INSERT OR IGNORE INTO catalog_cache (key,payload,updated_at) VALUES ('lock','0',?)").bind(now).run();
 const lock=await db.prepare("UPDATE catalog_cache SET payload=?,updated_at=? WHERE key='lock' AND CAST(payload AS INTEGER) < ?").bind(String(time+300000),now,time).run();
 if(!lock.meta.changes)return {...await updateStatus(db),busy:true};
 try{
  const meta=await read<Metadata>(db,'status')??{},pointer=await read<Pointer>(db,'pointer');
  if(action==='rollback'){
   if(!pointer?.previous)throw Error('No previous catalog snapshot is available.');
   await db.batch([put(db,'pointer',{current:pointer.previous,previous:pointer.current}),put(db,'status',{...meta,changes:[{at:now,added:[],corrected:[],addedCount:0,correctedCount:0,kind:'rollback'},...meta.changes??[]].slice(0,10)})]);return updateStatus(db);
  }
  // Avoid repeated downloads from double taps; the next scheduled check remains independent.
  if(meta.checkedAt&&time-Date.parse(meta.checkedAt)<60000)return updateStatus(db);
  const previous=await catalogSnapshot(db);let next:Catalog|null=null;let diff:CatalogChange|null=null;
  const newsPromise=news().then(items=>{meta.news=items;meta.newsCheckedAt=now;meta.newsError=null}).catch(error=>{meta.newsError=error instanceof Error?error.message:'News check failed.'});
  try{
   const sets=sourceSets(await json(API+'/sets')),known=new Set(sets.map(s=>s.setId));if(previous.sets.some(s=>!known.has(s.code)))throw Error('Update held: the set index is missing existing sets.');
   const old=new Map(previous.cards.map(c=>[c.id,c])),rows:Card[][]=[];let cursor=0;
   const outcomes=await Promise.allSettled(Array.from({length:4},async()=>{while(cursor<sets.length){if(Date.now()-time>120000)throw Error('Catalog source checks exceeded two minutes; the last working catalog is retained.');const set=sets[cursor++];rows.push(compileSet(await json(API+'/cards/'+set.setId.toLowerCase()),set.setId,old))}}));for(const result of outcomes)if(result.status==='rejected')throw result.reason;
   next=finishCatalog(previous,rows.flat(),sets,now);diff=catalogDifference(previous,next,now);meta.catalogError=null;meta.catalogSuccessAt=now;
  }catch(error){meta.catalogError=error instanceof Error?error.message:'Catalog check failed.'}
  await newsPromise;meta.checkedAt=now;
  if(next&&diff&&(diff.addedCount||diff.correctedCount||JSON.stringify(next.sets)!==JSON.stringify(previous.sets)||!pointer)){
   const writeSnapshot=async(generation:string,catalog:Catalog)=>{const serialized=JSON.stringify(catalog),chunks:string[]=[];for(let i=0;i<serialized.length;i+=100000)chunks.push(serialized.slice(i,i+100000));for(let i=0;i<chunks.length;i+=10)await db.batch(chunks.slice(i,i+10).map((chunk,index)=>put(db,`snapshot:${generation}:${String(i+index).padStart(5,'0')}`,chunk)))};
   const generation=crypto.randomUUID(),previousGeneration=pointer?.current??'bundled';if(!pointer)await writeSnapshot(previousGeneration,previous);await writeSnapshot(generation,next);
   meta.changes=[diff,...meta.changes??[]].slice(0,10);
   await db.batch([put(db,'pointer',{current:generation,previous:previousGeneration}),put(db,'status',meta)]);
   // Keep the active and prior generation only. Cleanup failure cannot invalidate the new pointer.
   if(pointer?.previous)await db.prepare('DELETE FROM catalog_cache WHERE key LIKE ?').bind(`snapshot:${pointer.previous}:%`).run().catch(()=>{});
  }else await put(db,'status',meta).run();
  return updateStatus(db);
 }finally{await db.prepare("UPDATE catalog_cache SET payload='0' WHERE key='lock' AND payload=?").bind(String(time+300000)).run()}
}
