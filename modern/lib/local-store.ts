import {emptyWorkspace,validateBackup,type Workspace} from './model.ts';
export type LocalRecord={revision:number;data:Workspace};
let database:Promise<IDBDatabase>|undefined;
export function openLocalStore(){
 if(!database)database=new Promise<IDBDatabase>((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('This browser cannot store your collection locally. Use a browser with IndexedDB enabled.'));return}
  const request=indexedDB.open('holocron-local',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('workspace');
  request.onerror=()=>{database=undefined;reject(request.error||Error('Local storage could not open.'))};
  request.onblocked=()=>{database=undefined;reject(Error('Close other Holocron windows, then reopen this one.'))};
  request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();database=undefined};resolve(request.result)};
 });return database;
}
export async function loadLocal():Promise<LocalRecord>{const db=await openLocalStore();return new Promise((resolve,reject)=>{
 const tx=db.transaction('workspace','readonly');const req=tx.objectStore('workspace').get('current');
 tx.oncomplete=()=>{const record=req.result;if(record===undefined)resolve({revision:0,data:emptyWorkspace});else if(!Number.isSafeInteger(record.revision)||!record.data)reject(Error('The local collection could not be read. It has not been reset. Restore a backup.'));else {try{resolve({...record,data:validateBackup(record.data)})}catch{reject(Error('The local collection is invalid. It has not been reset. Restore a backup.'))}}};
 tx.onabort=()=>reject(tx.error||Error('Local read failed.'));tx.onerror=()=>{};
})}
export function prepareSave(data:Workspace,expected:number,current:number){if(expected!==current)throw Error('Another Holocron window saved newer changes. Export a backup of these edits, then reload before editing.');return {revision:current+1,data:validateBackup(data)}}
export async function saveLocal(data:Workspace,revision:string):Promise<LocalRecord>{const db=await openLocalStore();return new Promise((resolve,reject)=>{
 const tx=db.transaction('workspace','readwrite');const store=tx.objectStore('workspace');const read=store.get('current');let saved:LocalRecord;let failure:unknown;
 read.onsuccess=()=>{try{saved=prepareSave(data,Number(revision),read.result?.revision||0);store.put(saved,'current')}catch(e){failure=e;tx.abort()}};
 tx.oncomplete=()=>resolve(saved!);tx.onabort=()=>reject(failure||tx.error||Error('Local save failed. Export a backup before closing.'));tx.onerror=()=>{};
})}
