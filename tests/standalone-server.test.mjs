import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHolocronServer} from '../standalone/server.mjs';

test('standalone server preserves revisions, rejects stale writes, and serves only app files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'holocron-server-test-'));
 const appDir=join(dir,'app'),dataDir=join(dir,'private');
 await mkdir(appDir);await writeFile(join(appDir,'index.html'),'<h1>Holocron</h1>');
 await mkdir(join(appDir,'art'));await writeFile(join(appDir,'art','card.img'),Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]));
 let instance;
 try{
  instance=await createHolocronServer({appDir,dataDir,port:0});
  const url=`http://127.0.0.1:${instance.address.port}`;
  const headers={Authorization:`Bearer ${instance.config.key}`,'X-Holocron-Sync':'1'};
  const get=()=>fetch(url+'/v1/workspace',{headers});
  assert.equal((await fetch(url+'/')).status,200);
  assert.match((await fetch(url+'/art/card.img')).headers.get('content-type'),/image\/png/);
  const preflight=await fetch(url+'/v1/workspace',{method:'OPTIONS',headers:{Origin:'https://laptop.tail.ts.net','Access-Control-Request-Method':'PUT'}});
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('access-control-allow-origin'),'https://laptop.tail.ts.net');
  assert.equal((await fetch(url+'/private/server.json')).status,404);
  assert.equal((await fetch(url+'/v1/workspace')).status,401);
  const first=await (await get()).json();
  assert.deepEqual(first.data,{collection:[],decks:[]});
  assert.equal(first.revision,0);
  const data={collection:[{id:'SOR_001',foil:false,count:2},{id:'SOR_001',foil:true,count:1}],decks:[],resolutions:[{sourceId:'HMW_T001',kind:'token'}]};
  const put=revision=>fetch(url+'/v1/workspace',{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({protocol:1,expectedRevision:revision,data})});
  const saved=await (await put(0)).json();
  assert.equal(saved.revision,1);
  assert.deepEqual(saved.data,data);
  assert.equal((await put(0)).status,409);
  assert.equal((await fetch(url+'/v1/workspace',{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({protocol:1,expectedRevision:1,data:{collection:[{id:'BAD',foil:false,count:1}],decks:[]}})})).status,400);
  assert.deepEqual(JSON.parse(await readFile(join(dataDir,'revisions','000000000001.json'),'utf8')).data,data);
  await new Promise((accept,reject)=>instance.server.close(error=>error?reject(error):accept()));
  instance=await createHolocronServer({appDir,dataDir,port:0});
  assert.equal(instance.config.serverId,first.serverId);
  assert.deepEqual((await (await fetch(`http://127.0.0.1:${instance.address.port}/v1/workspace`,{headers})).json()).data,data);
 }finally{
  if(instance?.server.listening)await new Promise(accept=>instance.server.close(accept));
  await rm(dir,{recursive:true,force:true});
 }
});
