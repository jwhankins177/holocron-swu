import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeWorkspaces} from '../modern/lib/sync-merge.ts';

test('sync keeps foil quantities and collection mappings across independent edits',()=>{
 const base={collection:[{id:'HMW_T001',foil:false,count:1}],decks:[]};
 const local={...base,collection:[...base.collection,{id:'HMW_T001',foil:true,count:2}],resolutions:[{sourceId:'HMW_T001',kind:'token',correctedId:'HMW_T002'}]};
 const remote={...base,collection:[{id:'HMW_T001',foil:false,count:3}]};
 const merged=mergeWorkspaces(base,local,remote);
 assert.deepEqual(merged.conflicts,[]);
 assert.deepEqual(merged.data.collection,[{id:'HMW_T001',foil:false,count:3},{id:'HMW_T001',foil:true,count:2}]);
 assert.deepEqual(merged.data.resolutions,local.resolutions);
});

test('conflicting collection mappings require an explicit device choice',()=>{
 const base={collection:[{id:'HMW_T001',foil:false,count:1}],decks:[]};
 const local={...base,resolutions:[{sourceId:'HMW_T001',kind:'token'}]};
 const remote={...base,resolutions:[{sourceId:'HMW_T001',kind:'ignored'}]};
 const pending=mergeWorkspaces(base,local,remote);
 assert.equal(pending.conflicts.length,1);
 assert.equal(pending.conflicts[0].key,'resolution:HMW_T001');
 assert.deepEqual(mergeWorkspaces(base,local,remote,{'resolution:HMW_T001':'remote'}).data.resolutions,remote.resolutions);
});
