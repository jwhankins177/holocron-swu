import {readFile,writeFile,mkdir,copyFile,readdir,stat,cp,link,open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,relative} from 'node:path';
import {build} from 'vite';
const smoke=process.argv.includes('--skip-art');
const allowMissing=process.argv.includes('--allow-missing-art')||smoke;
const ios=process.argv.includes('--ios');
const output='outputs/standalone';
const app=join(output,'app');
const catalog=JSON.parse(await readFile('public/catalog.json','utf8'));
const urls=[...new Set(catalog.cards.flatMap(c=>[c.image,c.back]).filter(Boolean))];
const file=u=>createHash('sha256').update(u).digest('hex')+'.img';
await mkdir('offline/art',{recursive:true});
const known=new Set(await readdir('offline/art'));
let done=0,missing=[];
async function validArt(path){try{if((await stat(path)).size<100)return false;const f=await open(path,'r');try{const b=Buffer.alloc(12);await f.read(b,0,12,0);return b.subarray(0,3).equals(Buffer.from([255,216,255]))||b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'}finally{await f.close()}}catch{return false}}
async function worker(){while(urls.length){const u=urls.pop(),name=file(u),path='offline/art/'+name;if(!known.has(name)||!await validArt(path)){if(smoke){missing.push({url:u,error:'Skipped for smoke build'});continue}try{const r=await fetch(u,{signal:AbortSignal.timeout(30000)});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw Error('HTTP '+r.status);await writeFile(path,new Uint8Array(await r.arrayBuffer()));if(!await validArt(path))throw Error('Downloaded image is invalid')}catch(e){missing.push({url:u,error:e.message});continue}}done++;if(done%250===0)console.log(`${done} images ready`)}}
await Promise.all(Array.from({length:12},worker));
await writeFile('offline/art-report.json',JSON.stringify({ready:done,missing},null,2));
if(missing.length&&!allowMissing)throw Error(`${missing.length} images unavailable. See offline/art-report.json. Re-run to resume. An incomplete build requires --allow-missing-art.`);
for(const c of catalog.cards)for(const k of ['image','back'])if(c[k])c[k]='./art/'+file(c[k]);
await writeFile('offline/catalog.json',JSON.stringify(catalog));
const css=(await readFile('app/globals.css','utf8')).replace(/^@import url\([^\n]+\);\s*/,'');
await writeFile('offline/offline.css',css+'\nbody{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}.local-status{position:fixed;right:12px;bottom:12px;z-index:50;background:#173b34;color:#eaf3e9;border:1px solid #547b67;border-radius:8px;padding:8px 12px;box-shadow:0 4px 18px #0005}\n');
await build({configFile:'offline/vite.config.mjs'});
await copyFile('offline/catalog.json',join(app,'catalog.json'));
for(const name of ['manifest.webmanifest','holocron-icon-v19-192.png','holocron-icon-v19-512.png','apple-touch-icon-v19.png','favicon.svg'])await copyFile(join('public',name),join(app,name));
await copyFile('offline/sw.js',join(app,'sw.js'));
await copyFile('offline/art-report.json',join(app,'art-report.json'));
await mkdir(join(app,'art'),{recursive:true});
for(const name of await readdir('offline/art')){
 const source=join('offline/art',name),destination=join(app,'art',name);
 try{await link(source,destination)}catch(error){if(error.code==='EXDEV'||error.code==='EPERM'||error.code==='EACCES')await copyFile(source,destination);else throw error}
}
const versionSource=await readFile('modern/lib/version.ts','utf8');
const version=versionSource.match(/APP_VERSION = '([^']+)'/)?.[1]||'unknown';
const files=[];let bytes=0;
async function collect(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await collect(path);else if(entry.isFile()){files.push('./'+relative(app,path).replaceAll('\\','/'));bytes+=(await stat(path)).size}}}
await collect(app);
files.sort();
await writeFile(join(app,'asset-manifest.json'),JSON.stringify({version,files,bytes}));
await copyFile('standalone/server.mjs',join(output,'server.mjs'));
await copyFile('standalone/start.ps1',join(output,'start.ps1'));
await copyFile('standalone/start.cmd',join(output,'start.cmd'));
await copyFile('standalone/enable-sync.ps1',join(output,'enable-sync.ps1'));
await copyFile('standalone/rotate-key.mjs',join(output,'rotate-key.mjs'));
await copyFile('standalone/rotate-key.cmd',join(output,'rotate-key.cmd'));
await mkdir(join(output,'runtime'),{recursive:true});
if(process.platform==='win32')await copyFile(process.execPath,join(output,'runtime','node.exe'));
else console.warn('This build was made outside Windows. Copy a Windows Node.js runtime to runtime/node.exe before distributing.');
if(ios){await cp(app,'native/ios/Holocron/Web',{recursive:true,force:true});console.log('iOS web bundle copied to native/ios/Holocron/Web')}
console.log(`Standalone package: ${output} · v${version} · ${done} art files; ${missing.length} unavailable${smoke?' (smoke build only)':''}.`);
