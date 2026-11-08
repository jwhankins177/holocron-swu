export type ConnectionMode='local-only'|'home-sync';
const KEY='holocron-connection-mode';

// A missing or unavailable preference must never start a network connection.
export function connectionMode():ConnectionMode{
 try{return localStorage.getItem(KEY)==='home-sync'?'home-sync':'local-only'}catch{return 'local-only'}
}

export function setConnectionMode(mode:ConnectionMode){
 localStorage.setItem(KEY,mode);
 window.dispatchEvent(new Event('holocron-connection-mode'));
}
