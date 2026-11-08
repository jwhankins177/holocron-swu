import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {mkdir,open,readFile,rename,stat,writeFile} from 'node:fs/promises';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {dirname,extname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const MAX_WORKSPACE_BYTES=20*1024*1024;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.img':'application/octet-stream'};
const empty={collection:[],decks:[]};

function json(response,status,value,origin){
 response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})});
 response.end(JSON.stringify(value));
}
function allowedOrigin(value){
 if(!value)return null;
 try{const u=new URL(value);if((u.protocol==='https:'&&u.hostname.endsWith('.ts.net'))||(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))return u.origin}catch{}
 return null;
}
function validHost(value){
 const host=(value||'').split(':')[0].toLowerCase();
 return ['localhost','127.0.0.1','[::1]'].includes(host)||host.endsWith('.ts.net');
}
function sameKey(received,expected){
 if(typeof received!=='string'||!received.startsWith('Bearer '))return false;
 const a=Buffer.from(received.slice(7)),b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}
function workspaceShape(value){
 const id=value=>typeof value==='string'&&/^[A-Z0-9]+_[A-Z0-9]+$/.test(value);
 const entries=value=>Array.isArray(value)&&value.length<=500&&value.every(row=>row&&id(row.id)&&Number.isSafeInteger(row.count)&&row.count>=0&&row.count<=100000);
 return !!(value&&typeof value==='object'&&!Array.isArray(value)&&Array.isArray(value.collection)&&value.collection.length<=30000&&value.collection.every(row=>row&&id(row.id)&&typeof row.foil==='boolean'&&Number.isSafeInteger(row.count)&&row.count>=0&&row.count<=100000)&&Array.isArray(value.decks)&&value.decks.length<=500&&value.decks.every(deck=>deck&&typeof deck.uid==='string'&&typeof deck.name==='string'&&typeof deck.author==='string'&&typeof deck.notes==='string'&&(!deck.leader||id(deck.leader))&&(!deck.base||id(deck.base))&&entries(deck.deck)&&entries(deck.sideboard))&&(!value.resolutions||Array.isArray(value.resolutions)&&value.resolutions.length<=30000&&value.resolutions.every(row=>row&&id(row.sourceId)&&['catalog','token','non-catalog','ignored'].includes(row.kind)&&(!row.targetId||id(row.targetId))&&(!row.correctedId||id(row.correctedId)))));
}
async function imageMime(path){
 const file=await open(path,'r');
 try{const bytes=Buffer.alloc(16);await file.read(bytes,0,16,0);
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
  if(bytes.subarray(0,3).equals(Buffer.from([255,216,255])))return 'image/jpeg';
  if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'image/webp';
  return 'application/octet-stream';
 }finally{await file.close()}
}
async function atomicJson(path,value){
 const temporary=path+'.'+randomBytes(8).toString('hex')+'.tmp';
 await writeFile(temporary,JSON.stringify(value),{flag:'wx'});
 await rename(temporary,path);
}
async function readBody(request){
 let size=0;const chunks=[];
 for await(const chunk of request){size+=chunk.length;if(size>MAX_WORKSPACE_BYTES)throw Object.assign(Error('Workspace exceeds the 20 MB limit.'),{status:413});chunks.push(chunk)}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw Object.assign(Error('Invalid JSON.'),{status:400})}
}

export async function createHolocronServer({appDir,dataDir,port=8765,host='127.0.0.1'}={}){
 const root=resolve(appDir||join(dirname(fileURLToPath(import.meta.url)),'app'));
 const data=resolve(dataDir||join(dirname(fileURLToPath(import.meta.url)),'data'));
 await mkdir(data,{recursive:true});
 await mkdir(join(data,'revisions'),{recursive:true});
 const configPath=join(data,'server.json'),workspacePath=join(data,'workspace.json');
 let config;
 try{config=JSON.parse(await readFile(configPath,'utf8'))}catch(error){if(error.code!=='ENOENT')throw error;config={serverId:randomBytes(16).toString('hex'),key:randomBytes(24).toString('base64url')};await writeFile(configPath,JSON.stringify(config,null,2),{flag:'wx',mode:0o600})}
 if(typeof config.serverId!=='string'||typeof config.key!=='string'||config.key.length<12)throw Error('Invalid server configuration; existing data was not changed.');
 let current;
 try{current=JSON.parse(await readFile(workspacePath,'utf8'))}catch(error){if(error.code!=='ENOENT')throw error;current={revision:0,data:empty};await writeFile(workspacePath,JSON.stringify(current),{flag:'wx'})}
 if(!Number.isSafeInteger(current.revision)||current.revision<0||!workspaceShape(current.data))throw Error('Invalid saved workspace; existing data was not changed.');
 let queue=Promise.resolve();
 const server=createServer(async(request,response)=>{
  const origin=allowedOrigin(request.headers.origin);
  if(!validHost(request.headers.host)){json(response,421,{error:'Unrecognized host.'});return}
  let path;
  try{path=new URL(request.url||'/',`http://${request.headers.host}`).pathname}catch{json(response,400,{error:'Invalid URL.'},origin);return}
  if(path==='/v1/workspace'){
   if(request.method==='OPTIONS'){
    if(!origin){json(response,403,{error:'Origin not allowed.'});return}
    response.writeHead(204,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, PUT, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type, X-Holocron-Sync','Access-Control-Max-Age':'600','Vary':'Origin'});response.end();return;
   }
   if(!['GET','PUT'].includes(request.method||'')){json(response,405,{error:'Method not allowed.'},origin);return}
   if(request.headers['x-holocron-sync']!=='1'||!sameKey(request.headers.authorization,config.key)){json(response,401,{error:'Pairing key rejected.'},origin);return}
   if(request.method==='GET'){json(response,200,{protocol:1,serverId:config.serverId,...current},origin);return}
   try{
    const incoming=await readBody(request);
    if(incoming?.protocol!==1||!Number.isSafeInteger(incoming.expectedRevision)||!workspaceShape(incoming.data))throw Object.assign(Error('Invalid workspace payload.'),{status:400});
    const result=queue.then(async()=>{
     if(incoming.expectedRevision!==current.revision)return {status:409,body:{error:'Revision changed.',revision:current.revision}};
     const next={revision:current.revision+1,data:incoming.data};
     await atomicJson(join(data,'revisions',String(next.revision).padStart(12,'0')+'.json'),next);
     await atomicJson(workspacePath,next);
     current=next;
     return {status:200,body:{protocol:1,serverId:config.serverId,...current}};
    });
    queue=result.then(()=>{},()=>{});
    const {status,body}=await result;json(response,status,body,origin);
   }catch(error){json(response,error.status||500,{error:error.status?error.message:'Could not save workspace; previous revision is preserved.'},origin)}
   return;
  }
  if(!['GET','HEAD'].includes(request.method||'')){json(response,405,{error:'Method not allowed.'});return}
  let pathname;
  try{pathname=decodeURIComponent(path)}catch{json(response,400,{error:'Invalid path.'});return}
  if(pathname.includes('\\')||pathname.split('/').includes('..')){json(response,403,{error:'Forbidden.'});return}
  if(pathname==='/**'){response.writeHead(302,{'Location':'/','Cache-Control':'no-store'});response.end();return}
  const target=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(target!==root&&!target.startsWith(root+sep)){json(response,403,{error:'Forbidden.'});return}
  try{
   const file=await stat(target);if(!file.isFile())throw Error('Not a file');
   response.writeHead(200,{'Content-Type':extname(target)==='.img'?await imageMime(target):mime[extname(target)]||'application/octet-stream','Content-Length':file.size,'X-Content-Type-Options':'nosniff','Cache-Control':pathname.startsWith('/art/')||pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-store'});
   if(request.method==='HEAD')response.end();else createReadStream(target).pipe(response);
  }catch{json(response,404,{error:'File not found.'})}
 });
 await new Promise((accept,reject)=>{server.once('error',reject);server.listen(port,host,accept)});
 return {server,address:server.address(),config,dataDir:data};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const options={appDir:process.env.HOLOCRON_APP_DIR,dataDir:process.env.HOLOCRON_DATA_DIR,port:Number(process.env.HOLOCRON_PORT||8765)};
 createHolocronServer(options).then(({address,config,dataDir})=>{
  console.log(`Holocron is running at http://127.0.0.1:${address.port}/`);
  console.log(`Pairing key: ${config.key}`);
  console.log(`Private data: ${dataDir}`);
  console.log('For cross-device HTTPS, run tailscale serve --bg --https=443 '+address.port);
 }).catch(error=>{console.error(error.message);process.exitCode=1});
}
