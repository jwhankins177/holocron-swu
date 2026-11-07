import type {Workspace} from './model';
declare global {interface Window {__HOLOCRON_CATALOG__?:import('./model').Catalog}}
export const nativeAvailable=()=>typeof window!=='undefined';
export async function nativeLoad():Promise<{data:Workspace;revision:string;status:string;localKey:string}>{
 const response=await fetch('/api/workspace',{cache:'no-store'});
 const payload=await response.json() as {error?:string;revision?:number;data?:Workspace;localKey?:string};
 if(!response.ok||!payload.data)throw Error(payload.error||'Unable to load your private workspace');
 return {data:payload.data,localKey:payload.localKey||'',revision:String(payload.revision),status:'Saved to your private workspace'};
}
export async function nativeSave(data:Workspace,revision:string):Promise<{data:Workspace;revision:string;status:string}>{
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
 if(action==='conflicts'){window.dispatchEvent(new Event('holocron-storage'));return true}
 if(action==='copy'){await navigator.clipboard.writeText(String(payload.text));return true}
 if(action==='open'){const url=new URL(String(payload.url));if(url.protocol!=='https:'||url.hostname!=='www.forcetable.net')throw Error('Only ForceTable opens online from this app.');window.open(url.href,'_blank','noopener,noreferrer');return true}
 if(action==='export')return saveExport(String(payload.name),String(payload.data));
 throw Error('Unsupported local action');
}
