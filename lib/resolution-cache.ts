import {normalizeId,validateBackup} from './model.ts';
import type {CollectionResolution,Owned,Workspace} from './model.ts';

export type ResolutionCacheStorage={getItem(key:string):string|null;setItem(key:string,value:string):void};
export type ResolutionCacheResult={workspace:Workspace;recovered:boolean;conflict:boolean};
type CachedResolutions={format:'holocron-resolution-cache-v1';baseRevision:string;collectionSignature:string;resolutions:CollectionResolution[]};

function revisionKey(revision:number|string):string {
 if(typeof revision==='number'&&Number.isSafeInteger(revision)&&revision>=0)return String(revision);
 if(typeof revision==='string'&&revision.length>0&&revision.length<=200)return revision;
 throw Error('Invalid workspace revision');
}

// This describes the raw holdings, before any aliases are applied. Store the exact
// representation instead of a short hash so a collision cannot replay stale aliases.
function collectionSignature(collection:Owned[]):string {
 return JSON.stringify(collection.map(row=>[row.id,row.foil,row.count] as const).sort((a,b)=>a[0].localeCompare(b[0])||Number(a[1])-Number(b[1])||a[2]-b[2]));
}

function isCollectionSignature(value:unknown):value is string {
 if(typeof value!=='string')return false;
 const rows:unknown=JSON.parse(value);
 if(!Array.isArray(rows)||rows.length>30000)return false;
 const collection:Owned[]=[];
 for(const row of rows){
  if(!Array.isArray(row)||row.length!==3||typeof row[0]!=='string'||normalizeId(row[0])!==row[0]||typeof row[1]!=='boolean'||!Number.isSafeInteger(row[2])||row[2]<=0)return false;
  collection.push({id:row[0],foil:row[1],count:row[2]});
 }
 return collectionSignature(collection)===value;
}

function resolutionSignature(resolutions:CollectionResolution[]):string {
 return JSON.stringify([...resolutions].sort((a,b)=>a.sourceId.localeCompare(b.sourceId)));
}

/** Save only resolution metadata, under the caller's signed-in-user storage key. */
export function writeResolutionCache(storage:ResolutionCacheStorage,key:string,workspace:Workspace,revision:number|string):void {
 try{
  if(!key||!storage)throw Error('Browser storage is unavailable');
  const validated=validateBackup({collection:workspace.collection,decks:[],resolutions:workspace.resolutions||[]});
  const cached:CachedResolutions={format:'holocron-resolution-cache-v1',baseRevision:revisionKey(revision),collectionSignature:collectionSignature(validated.collection),resolutions:validated.resolutions||[]};
  const serialized=JSON.stringify(cached);
  storage.setItem(key,serialized);
  if(storage.getItem(key)!==serialized)throw Error('Browser storage did not retain the save');
 }catch(error){
  const reason=error instanceof Error?error.message:'Browser storage is unavailable';
  throw Error(`Could not save collection resolutions locally. Keep this window open and enable browser storage or free up space, then try again. ${reason}`);
 }
}

/** Recover metadata only against the exact remote revision and raw holdings. */
export function readResolutionCache(storage:ResolutionCacheStorage,key:string,remoteWorkspace:Workspace,revision:number|string):ResolutionCacheResult {
 const unchanged:ResolutionCacheResult={workspace:remoteWorkspace,recovered:false,conflict:false};
 try{
  if(!key||!storage)return unchanged;
  const serialized=storage.getItem(key);if(!serialized)return unchanged;
  const cached=JSON.parse(serialized);
  if(!cached||cached.format!=='holocron-resolution-cache-v1'||typeof cached.baseRevision!=='string'||revisionKey(cached.baseRevision)!==cached.baseRevision||!isCollectionSignature(cached.collectionSignature)||!Array.isArray(cached.resolutions))return unchanged;
  const resolutions=validateBackup({collection:[],decks:[],resolutions:cached.resolutions}).resolutions||[];
  const remote=validateBackup({collection:remoteWorkspace.collection,decks:[],resolutions:remoteWorkspace.resolutions||[]});
  const differs=resolutionSignature(resolutions)!==resolutionSignature(remote.resolutions||[]);
  if(!differs)return unchanged;
  if(cached.baseRevision!==revisionKey(revision)||cached.collectionSignature!==collectionSignature(remote.collection))return {...unchanged,conflict:true};
  return {workspace:{...remoteWorkspace,resolutions},recovered:true,conflict:false};
 }catch{
  // A corrupt entry or unavailable storage must never replace remote holdings.
  return unchanged;
 }
}
