import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeAvailable,nativeCall,nativeLoad,nativeSave} from '../lib/native.ts';
test('hosted/SSR mode does not assume an Apple bridge',()=>{assert.equal(nativeAvailable(),false)});
test('Apple bridge forwards revision and data, and propagates storage errors',async()=>{
 const requests=[];
 globalThis.window={webkit:{messageHandlers:{holocron:{postMessage:async body=>{requests.push(body);if(body.action==='fail')throw Error('disk full');return {revision:'r1',data:body.data,status:'Saved locally'}}}}}};
 try {
  assert.equal(nativeAvailable(),true);
  await nativeLoad();
  const data={collection:[{id:'SOR_005',foil:true,count:2}],decks:[]};
  const result=await nativeSave(data,'r0');
  assert.deepEqual(requests,[{action:'load'},{action:'save',data,revision:'r0'}]);
  assert.equal(result.revision,'r1');
  await assert.rejects(nativeCall('fail'),/disk full/);
 } finally {delete globalThis.window}
});
