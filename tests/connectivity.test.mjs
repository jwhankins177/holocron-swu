import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {connectionMode,setConnectionMode} from '../modern/lib/connectivity.ts';

test('connection preference defaults off and stays off when storage is unavailable',()=>{
 const values=new Map(),events=[];
 globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 globalThis.window={dispatchEvent:event=>events.push(event.type)};
 assert.equal(connectionMode(),'local-only');
 setConnectionMode('home-sync');
 assert.equal(connectionMode(),'home-sync');
 setConnectionMode('local-only');
 assert.equal(connectionMode(),'local-only');
 assert.deepEqual(events,['holocron-connection-mode','holocron-connection-mode']);
 globalThis.localStorage={getItem:()=>{throw Error('blocked')}};
 assert.equal(connectionMode(),'local-only');
 delete globalThis.localStorage;
 delete globalThis.window;
});

test('local-only service worker serves cached files and never fetches missing remote files or sync API',async()=>{
 const handlers={},entries=new Map(),calls=[];
 const cache={match:async key=>entries.get(typeof key==='string'?new URL(key,'https://app.example/').href:key.url||key.href),put:async(key,value)=>entries.set(typeof key==='string'?new URL(key,'https://app.example/').href:key.href,value)};
 const scope={
  self:{location:{href:'https://app.example/sw.js',origin:'https://app.example',hostname:'app.example'},addEventListener:(name,handler)=>handlers[name]=handler,skipWaiting:async()=>{},clients:{claim:async()=>{}}},
  caches:{open:async()=>cache},URL,Response,
  fetch:async request=>{calls.push(request.url);return new Response('network')}
 };
 runInNewContext(await readFile(new URL('../offline/sw.js',import.meta.url),'utf8'),scope);
 async function dispatch(url,{headers={},mode='same-origin'}={}){let result;handlers.fetch({request:{url,method:'GET',mode,headers:{get:name=>headers[name]||null}},respondWith:value=>result=value});return result?await result:null}
 assert.equal((await dispatch('https://app.example/assets/missing.js')).status,503);
 assert.equal((await dispatch('https://app.example/v1/workspace')).status,503);
 assert.deepEqual(calls,[]);
 await cache.put('https://app.example/assets/cached.js',new Response('cached'));
 assert.equal(await (await dispatch('https://app.example/assets/cached.js')).text(),'cached');
 assert.deepEqual(calls,[]);
 assert.equal(await (await dispatch('https://app.example/assets/manual.js',{headers:{'X-Holocron-Install':'1'}})).text(),'network');
 assert.equal(calls.length,1);
 let persisted;handlers.message({data:{type:'HOLOCRON_CONNECTION_MODE',mode:'home-sync'},waitUntil:value=>persisted=value,ports:[]});await persisted;
 assert.equal(await (await dispatch('https://app.example/assets/online.js')).text(),'network');
 assert.equal(calls.length,2);
});
