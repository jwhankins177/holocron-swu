import type {Workspace} from './model';
import {loadLocal,saveLocal} from './local-store';
declare global {interface Window {__HOLOCRON_CATALOG__?:import('./model').Catalog;__HOLOCRON_STANDALONE__?:boolean}}
export const nativeAvailable=()=>typeof window!=='undefined';
const standalone=()=>typeof window!=='undefined'&&window.__HOLOCRON_STANDALONE__===true;
const appleBridge=()=>standalone()?window.webkit?.messageHandlers?.holocron:undefined;
export async function nativeLoad():Promise<{data:Workspace;revision:string;status:string;localKey:string}>{
 const bridge=appleBridge();
 if(bridge){const result=await bridge.postMessage({action:'load'});return {...result,localKey:'holocron-native-resolutions'};}
 if(standalone()){const result=await loadLocal();return {...result,revision:String(result.revision),status:'Saved locally',localKey:'holocron-standalone-resolutions'};}
 const response=await fetch('/api/workspace',{cache:'no-store'});
 const payload=await response.json() as {error?:string;revision?:number;data?:Workspace;localKey?:string};
 if(!response.ok||!payload.data)throw Error(payload.error||'Unable to load your private workspace');
 return {data:payload.data,localKey:payload.localKey||'',revision:String(payload.revision),status:'Saved to your private workspace'};
}
export async function nativeSave(data:Workspace,revision:string):Promise<{data:Workspace;revision:string;status:string}>{
 const bridge=appleBridge();
 if(bridge)return bridge.postMessage({action:'save',data,revision});
 if(standalone()){const result=await saveLocal(data,revision);window.dispatchEvent(new Event('holocron-sync-state'));return {...result,revision:String(result.revision),status:'Saved locally'};}
 const response=await fetch('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,revision:Number(revision)})});
 const payload=await response.json() as {error?:string;revision?:number;data?:Workspace;localKey?:string};
 if(!response.ok)throw Error(payload.error||'Unable to save your private workspace');
 return {data,revision:String(payload.revision),status:'Saved to your private workspace'};
}
type SavePicker = (options: {
 suggestedName: string;
 types: {description: string; accept: Record<string, string[]>}[];
}) => Promise<FileSystemFileHandle>;

async function saveExport(name: string, data: string) {
 const csv = name.endsWith('.csv');
 const plain = name.endsWith('.txt');
 const extension = csv ? '.csv' : plain ? '.txt' : '.json';
 const type = csv ? 'text/csv' : plain ? 'text/plain' : 'application/json';
 const file = new File([data],name,{type});
 const picker = (window as Window & {showSaveFilePicker?: SavePicker}).showSaveFilePicker;
 if(picker){
  let handle: FileSystemFileHandle | undefined;
  try{
   handle=await picker.call(window,{suggestedName:name,types:[{description:csv?'CSV spreadsheet':plain?'Text file':'JSON file',accept:{[type]:[extension]}}]});
  }catch(error){
   if(error instanceof DOMException && error.name==='AbortError')return false;
   // Embedded or restricted browser contexts can block the native picker.
   if(!(error instanceof DOMException) || !['SecurityError','NotAllowedError'].includes(error.name))throw error;
  }
  if(handle){
   const writable=await handle.createWritable();
   await writable.write(file);
   await writable.close();
   return true;
  }
 }
 const appleMobile=/iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
 if(appleMobile && navigator.share && navigator.canShare?.({files:[file]})){
  try{await navigator.share({files:[file]});return true}
  catch(error){if(error instanceof DOMException && error.name==='AbortError')return false}
 }
 const url=URL.createObjectURL(file);
 const link=document.createElement('a');
 link.href=url;
 link.download=name;
 document.body.appendChild(link);
 link.click();
 link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
 return true;
}

export async function nativeCall(action:string,payload:Record<string,unknown>={}):Promise<any>{
 if(action==='load')return nativeLoad();
 if(action==='save')return nativeSave(payload.data as Workspace,String(payload.revision));
 const bridge=appleBridge();
 if(bridge)return bridge.postMessage({action,...payload});
 if(action==='conflicts'){window.dispatchEvent(new Event('holocron-storage'));return true}
 if(action==='copy'){await navigator.clipboard.writeText(String(payload.text));return true}
 if(action==='open'){const url=new URL(String(payload.url));if(url.protocol!=='https:'||url.hostname!=='www.forcetable.net')throw Error('Only ForceTable opens online from this app.');window.open(url.href,'_blank','noopener,noreferrer');return true}
 if(action==='export')return saveExport(String(payload.name),String(payload.data));
 throw Error('Unsupported local action');
}
