import test from 'node:test';
import assert from 'node:assert/strict';
import {readResolutionCache,writeResolutionCache} from '../lib/resolution-cache.ts';

const key='holocron-resolutions:user-one';
const collection=[{id:'HMW_T001',foil:false,count:1},{id:'HMW_T001',foil:true,count:2},{id:'ASH_T003',foil:false,count:1}];
const remote=()=>({collection:structuredClone(collection),decks:[],favorites:{cards:['SOR_005'],decks:[]}});
const resolved=()=>({...remote(),resolutions:[{sourceId:'HMW_T001',kind:'catalog',targetId:'SOR_005'},{sourceId:'ASH_T003',kind:'token',name:'Token'}]});
function memoryStorage(){const data=new Map();return {getItem:name=>data.get(name)??null,setItem:(name,value)=>data.set(name,value)}}

test('Local resolutions recover after a failed remote save, preserving raw quantities, foils and unrelated workspace data',()=>{
 const storage=memoryStorage(),workspace=resolved();
 writeResolutionCache(storage,key,workspace,7);
 const server=remote(),result=readResolutionCache(storage,key,server,7);
 assert.equal(result.recovered,true);assert.equal(result.conflict,false);
 assert.deepEqual(result.workspace,workspace);
 assert.equal(result.workspace.collection,server.collection);assert.equal(result.workspace.decks,server.decks);assert.equal(result.workspace.favorites,server.favorites);
 assert.equal(server.resolutions,undefined);
 const cache=JSON.parse(storage.getItem(key));
 assert.equal(cache.collection,undefined);assert.equal(cache.decks,undefined);assert.equal(cache.favorites,undefined);
});

test('A changed remote revision never replays different cached resolutions',()=>{
 const storage=memoryStorage();writeResolutionCache(storage,key,resolved(),7);
 const server=remote(),result=readResolutionCache(storage,key,server,8);
 assert.deepEqual(result,{workspace:server,recovered:false,conflict:true});assert.equal(result.workspace,server);
 assert.ok(storage.getItem(key),'The pending local choices remain available');
});

test('A changed raw collection never replays cached resolutions even when the revision matches',()=>{
 const storage=memoryStorage();writeResolutionCache(storage,key,resolved(),7);
 for(const mutate of [w=>w.collection[0].count++,w=>w.collection[0].foil=true,w=>w.collection[0].id='HMW_T002',w=>w.collection.pop()]){
  const server=remote();mutate(server);
  assert.deepEqual(readResolutionCache(storage,key,server,7),{workspace:server,recovered:false,conflict:true});
 }
});

test('An unchanged metadata set has no conflict at a newer revision or reordered raw collection',()=>{
 const storage=memoryStorage();writeResolutionCache(storage,key,resolved(),7);
 const server=resolved();server.resolutions.reverse();server.collection.reverse();
 assert.deepEqual(readResolutionCache(storage,key,server,9),{workspace:server,recovered:false,conflict:false});
});

test('Raw collection order and resolution order do not affect valid recovery',()=>{
 const storage=memoryStorage();writeResolutionCache(storage,key,resolved(),7);
 const server=remote();server.collection.reverse();
 const result=readResolutionCache(storage,key,server,'7');
 assert.equal(result.recovered,true);assert.deepEqual(result.workspace.collection,server.collection);
});

test('Clearing all mappings is a recoverable local change',()=>{
 const storage=memoryStorage();writeResolutionCache(storage,key,{...resolved(),resolutions:[]},7);
 const result=readResolutionCache(storage,key,resolved(),7);
 assert.equal(result.recovered,true);assert.deepEqual(result.workspace.resolutions,[]);assert.deepEqual(result.workspace.collection,collection);
});

test('Writing a confirmed remote save advances the cache revision and avoids replaying a previous choice',()=>{
 const storage=memoryStorage();writeResolutionCache(storage,key,resolved(),7);writeResolutionCache(storage,key,resolved(),8);
 const server=resolved();assert.deepEqual(readResolutionCache(storage,key,server,8),{workspace:server,recovered:false,conflict:false});
 assert.equal(readResolutionCache(storage,key,remote(),7).conflict,true);
});

test('User-specific keys cannot recover another account’s choices',()=>{
 const storage=memoryStorage();writeResolutionCache(storage,key,resolved(),7);
 const server=remote();assert.deepEqual(readResolutionCache(storage,'holocron-resolutions:user-two',server,7),{workspace:server,recovered:false,conflict:false});
});

test('Malformed cache data and invalid mappings are ignored safely',()=>{
 const storage=memoryStorage();writeResolutionCache(storage,key,resolved(),7);const valid=JSON.parse(storage.getItem(key));
 for(const invalid of ['{',JSON.stringify(null),JSON.stringify({...valid,format:'old'}),JSON.stringify({...valid,baseRevision:null}),JSON.stringify({...valid,collectionSignature:'not JSON'}),JSON.stringify({...valid,collectionSignature:'[["not-an-id",false,1]]'}),JSON.stringify({...valid,resolutions:[{sourceId:'HMW_T001',kind:'catalog'}]}),JSON.stringify({...valid,resolutions:[{sourceId:'HMW_T001',kind:'forgotten'}]})]){
  storage.setItem(key,invalid);const server=remote();assert.deepEqual(readResolutionCache(storage,key,server,7),{workspace:server,recovered:false,conflict:false});
 }
});

test('Storage failures do not break remote loading and produce a clear error on local save',()=>{
 const blocked={getItem(){throw Error('Storage disabled')},setItem(){throw Error('Quota exceeded')}};
 const server=remote();assert.deepEqual(readResolutionCache(blocked,key,server,7),{workspace:server,recovered:false,conflict:false});
 assert.throws(()=>writeResolutionCache(blocked,key,resolved(),7),/Could not save collection resolutions locally.*Quota exceeded/);
 const noOp={getItem:()=>null,setItem(){}};
 assert.throws(()=>writeResolutionCache(noOp,key,resolved(),7),/did not retain the save/);
 assert.throws(()=>writeResolutionCache(undefined,key,resolved(),7),/Browser storage is unavailable/);
});

test('Invalid metadata cannot be written over the previous good cache',()=>{
 const storage=memoryStorage();writeResolutionCache(storage,key,resolved(),7);const good=storage.getItem(key);
 assert.throws(()=>writeResolutionCache(storage,key,{...resolved(),resolutions:[{sourceId:'HMW_T001',kind:'catalog'}]},7),/Choose a catalog card/);
 assert.equal(storage.getItem(key),good);
});
