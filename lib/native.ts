import type {Workspace} from './model';
type Reply={data:Workspace;revision:string;status:string;conflicts?:number};
declare global {interface Window {webkit?:{messageHandlers?:{holocron?:{postMessage:(body:unknown)=>Promise<any>}}};__HOLOCRON_CATALOG__?:import('./model').Catalog}}
export const nativeAvailable=()=>typeof window!=='undefined'&&!!window.webkit?.messageHandlers?.holocron;
export async function nativeCall(action:string,payload:Record<string,unknown>={}):Promise<any>{const bridge=window.webkit?.messageHandlers?.holocron;if(!bridge)throw Error('Apple app bridge unavailable');return bridge.postMessage({action,...payload})}
export const nativeLoad=():Promise<Reply>=>nativeCall('load');
export const nativeSave=(data:Workspace,revision:string):Promise<Reply>=>nativeCall('save',{data,revision});
