import {validateBackup,type Workspace} from './model.ts';
export type Conflict={key:string;label:string;local:any;remote:any};
export type MergeResult={data:Workspace;conflicts:Conflict[]};
export function canonical(v:any):string {if(v===undefined)return 'undefined';if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v)}
export const same=(a:any,b:any)=>canonical(a)===canonical(b);
export function mergeWorkspaces(base:Workspace,local:Workspace,remote:Workspace,choices:Record<string,'local'|'remote'>={}):MergeResult {
 const conflicts:Conflict[]=[];
 function choose(key:string,label:string,b:any,l:any,r:any){
  if(same(l,r))return l;if(same(l,b))return r;if(same(r,b))return l;
  if(choices[key])return choices[key]==='local'?l:r;
  conflicts.push({key,label,local:l??null,remote:r??null});return l;
 }
 function rows(key:string,b:any[],l:any[],r:any[],id:(x:any)=>string,label:(x:any)=>string){
  const bm=new Map(b.map(x=>[id(x),x])),lm=new Map(l.map(x=>[id(x),x])),rm=new Map(r.map(x=>[id(x),x]));
  return [...new Set([...bm.keys(),...lm.keys(),...rm.keys()])].sort().map(k=>choose(key+':'+k,label(lm.get(k)||rm.get(k)||bm.get(k)),bm.get(k),lm.get(k),rm.get(k))).filter(x=>x!==undefined);
 }
 function setMerge(b:string[],l:string[],r:string[]){return [...new Set([...b,...l,...r])].sort().filter(x=>choose('favorite:'+x,x,b.includes(x),l.includes(x),r.includes(x)))}
 const collection=rows('collection',base.collection,local.collection,remote.collection,x=>x.id+':'+x.foil,x=>x.id+(x.foil?' · foil':' · non-foil'));
 const decks=rows('deck',base.decks,local.decks,remote.decks,x=>x.uid,x=>'Deck: '+x.name);
 const lists=rows('list',base.lists||[],local.lists||[],remote.lists||[],x=>x.uid,x=>'List: '+x.name);
 const favorites={cards:setMerge(base.favorites?.cards||[],local.favorites?.cards||[],remote.favorites?.cards||[]),decks:setMerge(base.favorites?.decks||[],local.favorites?.decks||[],remote.favorites?.decks||[])};
 const settings:Record<string,any>={};for(const k of new Set([...Object.keys(base.settings||{}),...Object.keys(local.settings||{}),...Object.keys(remote.settings||{})])){const v=choose('setting:'+k,'Preference: '+k,(base.settings as any)?.[k],(local.settings as any)?.[k],(remote.settings as any)?.[k]);if(v!==undefined)settings[k]=v}
 return {data:validateBackup({collection,decks,lists,favorites,settings}),conflicts};
}
