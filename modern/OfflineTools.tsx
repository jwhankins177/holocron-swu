import {useEffect,useState} from 'react';
import Modal from './components/modal';
import {emptyWorkspace,type Catalog,type Workspace} from './lib/model';
import {connectionMode} from './lib/connectivity';
import {APP_VERSION} from './lib/version';
const CACHE='holocron-local-v2';
const loopback=()=>['localhost','127.0.0.1','[::1]'].includes(location.hostname);
async function tellWorkerMode(){
 const mode=connectionMode();
 const cache=await caches.open(CACHE);
 await cache.put(new URL('./connection-mode',location.href),new Response(mode));
 const worker=navigator.serviceWorker.controller||(await navigator.serviceWorker.getRegistration('./'))?.active;
 worker?.postMessage({type:'HOLOCRON_CONNECTION_MODE',mode});
}
type Manifest={files:string[];bytes:number;version:string};
type Phase='priority'|'full'|'ready';
declare global{interface Window{__HOLOCRON_CATALOG__?:Catalog}}

function priorityArtwork(catalog:Catalog|undefined,workspace:Workspace){
 const ids=new Set<string>();
 for(const item of workspace.collection)if(item.count>0)ids.add(item.id);
 for(const deck of workspace.decks){if(deck.leader)ids.add(deck.leader);if(deck.base)ids.add(deck.base);for(const item of [...deck.deck,...deck.sideboard])ids.add(item.id)}
 for(const list of workspace.lists||[])for(const id of list.cards)ids.add(id);
 for(const id of workspace.favorites?.cards||[])ids.add(id);
 const byId=new Map((catalog?.cards||[]).map(card=>[card.id,card]));
 const files=new Set<string>();
 for(const id of ids){const card=byId.get(id);if(card?.image)files.add(card.image);if(card?.back)files.add(card.back)}
 return files;
}

export default function OfflineTools(){
 const [open,setOpen]=useState(false),[status,setStatus]=useState('Checking offline files…'),[progress,setProgress]=useState(0),[total,setTotal]=useState(0),[priorityTotal,setPriorityTotal]=useState(0),[priorityProgress,setPriorityProgress]=useState(0),[phase,setPhase]=useState<Phase>('priority'),[running,setRunning]=useState(false),[error,setError]=useState(''),[workspace,setWorkspace]=useState<Workspace>(emptyWorkspace);
 useEffect(()=>{
  const show=()=>setOpen(true),workspaceChanged=(event:Event)=>{const next=(event as CustomEvent<Workspace>).detail;if(next)setWorkspace(next)};
  window.addEventListener('holocron-storage',show);window.addEventListener('holocron-workspace',workspaceChanged);
  const modeChanged=()=>{void tellWorkerMode().catch(e=>setError(e.message))};
  const storageChanged=(event:StorageEvent)=>{if(event.key==='holocron-connection-mode')modeChanged()};
  window.addEventListener('holocron-connection-mode',modeChanged);
  window.addEventListener('storage',storageChanged);
  async function setup(){
   if(location.protocol==='file:'){setStatus('Local app and artwork folder');return}
   if(!('serviceWorker'in navigator)||!isSecureContext){setStatus('Offline installation needs HTTPS or localhost');setOpen(true);return}
   try{
    const remoteLocalOnly=connectionMode()==='local-only'&&!loopback();
    if(!remoteLocalOnly)await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    const cache=await caches.open(CACHE);
    await tellWorkerMode();
    if(remoteLocalOnly&&!await cache.match('./asset-manifest.json')){setStatus('Prepare offline files to use this device without a connection');setOpen(true);return}
    const manifestResponse=remoteLocalOnly?await cache.match('./asset-manifest.json'):await fetch('./asset-manifest.json',{headers:{'X-Holocron-Install':'1'}});
    if(!manifestResponse)throw Error('Installation manifest is not saved yet.');
    if(!manifestResponse.ok)throw Error('Cannot load the installation manifest.');
    const manifest:Manifest=await manifestResponse.json();setTotal(manifest.files.length);
    const keys=new Set((await cache.keys()).map(r=>new URL(r.url).pathname));
    const cached=manifest.files.filter(file=>keys.has(new URL(file,location.href).pathname)).length;setProgress(cached);
    const priority=priorityArtwork(window.__HOLOCRON_CATALOG__,workspace);
    const priorityFiles=manifest.files.filter(file=>!file.startsWith('./art/')||priority.has(file));
    const priorityCached=priorityFiles.filter(file=>keys.has(new URL(file,location.href).pathname)).length;
    setPriorityTotal(priorityFiles.length);setPriorityProgress(priorityCached);
    const readyMarker=await cache.match(new URL('./offline-ready',location.href));
    const allReady=manifest.version===APP_VERSION&&cached===manifest.files.length&&!!await cache.match(new URL('./index.html',location.href))&&!!readyMarker&&await readyMarker.text()===manifest.version;
    if(allReady){await cache.put(new URL('./offline-ready',location.href),new Response(manifest.version));setPhase('ready');setStatus('Ready to use offline');return}
    const marker=await cache.match(new URL('./offline-priority-ready',location.href));
    const priorityReady=manifest.version===APP_VERSION&&priorityCached===priorityFiles.length&&!!marker&&await marker.text()===manifest.version;
    if(priorityReady){setPhase('full');setStatus('Your cards are ready · full artwork download available')}
    else{setPhase('priority');setStatus(priorityFiles.length?'Prepare your cards for offline use':'Download artwork to finish offline setup')}
    setOpen(true);
   }catch(e:any){setStatus('Offline setup incomplete');setError(e.message);setOpen(true)}
  }
  void setup();return()=>{window.removeEventListener('holocron-storage',show);window.removeEventListener('holocron-workspace',workspaceChanged);window.removeEventListener('holocron-connection-mode',modeChanged);window.removeEventListener('storage',storageChanged)};
 },[]);

 async function downloadFiles(files:string[],cache:Cache,onFile:()=>void){
  const missing:string[]=[];for(const file of files)if(!await cache.match(file))missing.push(file);
  let failure:Error|undefined;let next=0;
  async function worker(){while(next<missing.length&&!failure){const file=missing[next++];try{const response=await fetch(file,{headers:{'X-Holocron-Install':'1'}});if(!response.ok)throw Error('Could not download '+file);await cache.put(file,response);onFile()}catch(e:any){failure=e instanceof Error?e:Error(String(e))}}}
  await Promise.all(Array.from({length:8},worker));if(failure)throw failure;
 }

 async function install(){
  setRunning(true);setError('');let currentPhase:Phase='priority';let prepared=false;
  try{
   await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
   await navigator.serviceWorker.ready;
   await tellWorkerMode();
   const response=await fetch('./asset-manifest.json',{headers:{'X-Holocron-Install':'1'}});if(!response.ok)throw Error('Cannot load the installation manifest.');const manifest:Manifest=await response.json();
   if(phase==='ready'&&manifest.version===APP_VERSION){setStatus('Offline app and cards are up to date');return}
   const cache=await caches.open(CACHE);if(navigator.storage?.persist)await navigator.storage.persist();
   await cache.put('./asset-manifest.json',new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}}));
   const oldMarker=await cache.match(new URL('./offline-priority-ready',location.href));
   if(!oldMarker||await oldMarker.text()!==manifest.version)for(const file of manifest.files)if(!file.startsWith('./art/')&&!file.startsWith('./assets/'))await cache.delete(file);
   const keys=new Set((await cache.keys()).map(r=>new URL(r.url).pathname));
   const pending=manifest.files.filter(file=>!keys.has(new URL(file,location.href).pathname));
   setTotal(manifest.files.length);setProgress(manifest.files.length-pending.length);
   const prioritySet=priorityArtwork(window.__HOLOCRON_CATALOG__,workspace);
   const priorityFiles=manifest.files.filter(file=>!file.startsWith('./art/')||prioritySet.has(file));
   let priorityDone=priorityFiles.filter(file=>keys.has(new URL(file,location.href).pathname)).length;
   setPriorityTotal(priorityFiles.length);setPriorityProgress(priorityDone);
   const priorityMarker=new URL('./offline-priority-ready',location.href);
   const marker=await cache.match(priorityMarker);
   const hasPriorityMarker=!!marker&&await marker.text()===manifest.version;
   if(!hasPriorityMarker||priorityDone<priorityFiles.length){
    currentPhase='priority';setPhase(currentPhase);setStatus('Preparing your cards…');
    await downloadFiles(priorityFiles,cache,()=>{priorityDone++;setPriorityProgress(priorityDone);setProgress(value=>value+1)});
    // Verify priority assets before telling the user their collection is ready.
    for(const file of priorityFiles)if(!await cache.match(file))throw Error('A card image is missing. Retry setup to resume.');
    await cache.put(priorityMarker,new Response(manifest.version));
    prepared=true;
   }
   currentPhase='full';setPhase(currentPhase);
   if(prepared){setStatus(manifest.version!==APP_VERSION?'Updated offline files saved · reload Holocron':'Your cards are ready · full artwork download available');setOpen(manifest.version!==APP_VERSION);return}
   setStatus('Downloading the full artwork library');setOpen(false);
   let cachedCount=0;for(const file of manifest.files)if(await cache.match(file))cachedCount++;
   setProgress(cachedCount);
   const estimate=await navigator.storage?.estimate?.();
   const remainingBytes=manifest.bytes*(Math.max(0,manifest.files.length-cachedCount)/Math.max(1,manifest.files.length));
   if(estimate?.quota&&estimate.usage!==undefined&&estimate.quota-estimate.usage<remainingBytes*1.1)throw Error('Your cards are ready, but this browser may not have enough free storage for the complete art library. Free space, then retry the full download.');
   await downloadFiles(manifest.files,cache,()=>{cachedCount++;setProgress(cachedCount)});
   for(const file of manifest.files)if(!await cache.match(file))throw Error('An offline file is missing. Retry setup to resume.');
   if(!await cache.match(new URL('./index.html',location.href)))throw Error('The app shell is not cached. Reopen Holocron and retry.');
   await cache.put(new URL('./offline-ready',location.href),new Response(manifest.version));setPhase('ready');setStatus('Ready to use offline');setError('');
  }catch(e:any){setError(e.message);setStatus(currentPhase==='full'?'Your cards are ready · full artwork paused':'Offline setup incomplete · Retry to resume')}
  finally{setRunning(false)}
 }

 const progressText=phase==='priority'?`${priorityProgress.toLocaleString()} / ${priorityTotal.toLocaleString()} essential files · ${progress.toLocaleString()} / ${total.toLocaleString()} total cached`:phase==='full'?`${progress.toLocaleString()} / ${total.toLocaleString()} files cached`:`${total.toLocaleString()} files ready`;
 const buttonText=running?(phase==='priority'?'Preparing your cards…':'Downloading remaining artwork'):phase==='ready'?'Check for manual updates':phase==='full'?'Continue full artwork download':'Prepare my cards first';
 return <><button className="local-status" onClick={()=>setOpen(true)}>{status}</button>{open&&<Modal label="Local storage and offline setup" onDismiss={()=>setOpen(false)}><section className="modal local-setup"><button className="close" onClick={()=>setOpen(false)} aria-label="Close storage settings">×</button><h2>Everything on this device</h2><p>No account. No sign-in. Your collection, decks, lists, and favorites save in this browser on this device.</p><h3>{status}</h3>{location.protocol!=='file:'&&<><p>Save the app and artwork for your collection, decks, lists, and favorites. You can then choose whether to download the entire card art library. Keep Holocron open while a download runs. Checking for a manual update contacts this app's address only when you press the button.</p>{total>0&&<><progress max={Math.max(total,1)} value={Math.min(progress,total)}/><p>{progressText}</p></>}<button className="primary" disabled={running} onClick={()=>void install()}>{buttonText}</button>{phase==='ready'&&<p className="success">Full card artwork is saved on this device.</p>}</>}{error&&<p role="alert" className="warning">{error}</p>}<p>Use Backup to keep a JSON copy in Files. Clearing this app’s browser data or deleting its storage can remove your collection. iCloud file backups are manual.</p><p>{connectionMode()==='local-only'?'In Local-only mode, ForceTable is the only external link and opens when you choose Play on ForceTable.':'Home sync contacts your paired server while this app is open; reference links open only when you choose them.'} Card browsing, guides, deckbuilding, statistics, imports, exports, lists, and favorites work locally.</p></section></Modal>}</>;
}
