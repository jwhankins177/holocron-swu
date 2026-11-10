import {validateBackup,type Workspace} from './model.ts';
export type ChangePoint={at:string;label:string;before:Workspace};
const storageKey=(key:string)=>`holocron-history-${key}`;
export function readHistory(storage:Storage,key:string,revision:number|string):ChangePoint[]{
 try{const raw=storage.getItem(storageKey(key));if(!raw)return [];const parsed=JSON.parse(raw);if(String(parsed.revision)!==String(revision)||!Array.isArray(parsed.items))return [];return parsed.items.slice(0,15).map((item:any)=>({at:String(item.at),label:String(item.label),before:validateBackup(item.before)}))}catch{return []}
}
export function writeHistory(storage:Storage,key:string,revision:number|string,items:ChangePoint[]){if(key)storage.setItem(storageKey(key),JSON.stringify({revision:String(revision),items:items.slice(0,15)}))}
export function changeLabel(before:Workspace,after:Workspace){
 if(before.collection!==after.collection)return 'Collection change';
 if(before.decks!==after.decks)return 'Deck change';
 if(before.deckVersions!==after.deckVersions)return 'Deck version change';
 if(before.formatRules!==after.formatRules)return 'Format rules update';
 if(before.resolutions!==after.resolutions)return 'Collection resolution';
 if(before.lists!==after.lists)return 'List change';
 return 'Workspace preference';
}
