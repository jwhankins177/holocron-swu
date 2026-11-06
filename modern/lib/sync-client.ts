import {emptyWorkspace,makeId,validateBackup,type Workspace} from './model.ts';
import {mergeWorkspaces,same} from './sync-merge.ts';
import {readSync,commitSync,type SyncConfig} from './sync-store.ts';
let busy=false;
export let syncStatus='Sync is off';
function status(value:string){syncStatus=value;window.dispatchEvent(new Event('holocron-sync-status'))}
export function validateSyncUrl(value:string){const u=new URL(value.trim());if(u.protocol!=='https:'||!/^[-a-z0-9]+(?:\.[-a-z0-9]+)*\.ts\.net$/i.test(u.hostname)||u.username||u.password||u.search||u.hash||!['','/'].includes(u.pathname))throw Error('Use the HTTPS .ts.net address printed by the Windows installer, including its port.');return u.origin}
async function request(config:SyncConfig,method='GET',body?:unknown){const response=await fetch(config.url+'/v1/workspace',{method,headers:{Authorization:'Bearer '+config.key,'X-Holocron-Sync':'1',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});if(response.status===401)throw Error('Pairing key was rejected. Check the key in Sync settings.');if(response.status===409)throw Error('Another device synced first. Your changes are kept; retrying shortly.');if(!response.ok)throw Error('Home server returned '+response.status+'. Local edits are safe.');const r=await response.json();if(r.protocol!==1||typeof r.serverId!=='string'||!Number.isSafeInteger(r.revision)||r.revision<0)throw Error('This is not a compatible Holocron sync server.');return {...r,data:validateBackup(r.data||emptyWorkspace)} }
function friendlyError(e:any){return e?.name==='TypeError'||e?.name==='TimeoutError'||e?.name==='AbortError'?'Could not reach the home server. Confirm this device is online in Tailscale; if it is, allow local-network access for the browser and retry.':e?.message||'Sync paused. Local edits are safe.'}
async function pair(url:string,key:string){if(busy)throw Error('Wait for the current sync to finish.');url=validateSyncUrl(url);key=key.trim();if(!/^[A-Za-z0-9_-]{12,128}$/.test(key))throw Error('Paste the complete pairing key from the installer.');const {config,local}=await readSync();if(config)throw Error('Disconnect the current server before pairing another.');const candidate:SyncConfig={url,key,id:makeId(),base:emptyWorkspace};status('Checking the home server…');let remote;try{remote=await request(candidate)}catch(e:any){const message=friendlyError(e);status(message);throw Error(message)}await commitSync(local.revision,null,candidate);await performSync(remote,true)}
async function unpair(){if(busy)throw Error('Wait for the current sync to finish.');const {config,local}=await readSync();await commitSync(local.revision,config?.id||null,null);status('Sync is off')}
async function performSync(initialRemote?:Awaited<ReturnType<typeof request>>,throwOnFailure=false){if(busy)return;busy=true;try{
 const {config,local}=await readSync();if(!config){status('Sync is off');return}if(config.pending){status('Review sync conflicts');return}
 status('Syncing with home…');const remote=initialRemote||await request(config);
 if(config.serverId&&remote.serverId!==config.serverId)throw Error('The home server identity changed. Disconnect and pair again to review the new data.');
 const result=mergeWorkspaces(config.base,local.data,remote.data);const next={...config,serverId:remote.serverId};
 if(result.conflicts.length){await commitSync(local.revision,config.id,{...next,pending:{localRevision:local.revision,remote:remote.data,result}});status('Review '+result.conflicts.length+' sync conflict(s)');return}
 // Commit locally before network writes. A failed network write leaves base unchanged,
 // so the next three-way merge retries safely. Other local tabs use revision checks.
 let appliedRevision=local.revision;
 if(!same(result.data,local.data)){await commitSync(local.revision,config.id,next,result.data);appliedRevision++}
 const ack=same(result.data,remote.data)?remote:await request(config,'PUT',{protocol:1,expectedRevision:remote.revision,data:result.data});
 // If edits arrived during PUT, do not advance base or replace them; next attempt merges again.
 await commitSync(appliedRevision,config.id,{...next,base:ack.data,lastSync:new Date().toISOString()});status('Synced with home');
 }catch(e:any){const message=friendlyError(e);status(message);if(throwOnFailure)throw Error(message)}finally{busy=false}}
async function resolve(choices:Record<string,'local'|'remote'>){if(busy)throw Error('Wait for the current sync to finish.');const {config,local}=await readSync();if(!config?.pending)return;const p=config.pending;
 if(local.revision!==p.localRevision){await commitSync(local.revision,config.id,{...config,pending:undefined});await performSync();throw Error('Local edits changed. Review the refreshed conflicts before choosing.');}
 if(p.result.conflicts.some(c=>!choices[c.key]))throw Error('Choose a version for every conflict.');const result=mergeWorkspaces(config.base,local.data,p.remote,choices);
 await commitSync(local.revision,config.id,{...config,base:p.remote,pending:undefined},result.data);await performSync();
}

async function exclusive<T>(work:()=>Promise<T>){if(!navigator.locks)throw Error('Open the installed HTTPS app, or the standalone app in a current browser, to use home sync.');return navigator.locks.request('holocron-home-sync',work)}
export const connectSync=(url:string,key:string)=>exclusive(()=>pair(url,key));
export const disconnectSync=()=>exclusive(unpair);
export const resolveConflicts=(choices:Record<string,'local'|'remote'>)=>exclusive(()=>resolve(choices));
export async function syncNow(){try{if(!(await readSync()).config){status('Sync is off');return}await exclusive(performSync)}catch(e:any){status(e.message)}}

export const updatePairingKey=(key:string)=>exclusive(async()=>{key=key.trim();if(!/^[A-Za-z0-9_-]{12,128}$/.test(key))throw Error('Enter the 12-character key shown by the updated installer.');const {config,local}=await readSync();if(!config)throw Error('Connect a home server first.');const next={...config,key,id:makeId()};status('Checking the updated key…');let remote;try{remote=await request(next)}catch(e:any){const message=friendlyError(e);status(message);throw Error(message)}await commitSync(local.revision,config.id,next);await performSync(remote,true)});
