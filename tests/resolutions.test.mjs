import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveCollection,unresolvedCollection,setCollectionResolution,resolutionPreview,parseCollectionImport,exportCollection,validateBackup,createBackup,applyCollectionImport,adjustEffectiveOwned} from '../lib/model.ts';

const byId=new Map([['SOR_005',{id:'SOR_005',name:'Luke Skywalker'}],['SOR_009',{id:'SOR_009',name:'Boba Fett'}]]);
const initial=()=>({collection:[{id:'HMW_T001',foil:false,count:2},{id:'HMW_T001',foil:true,count:3},{id:'ASH_T003',foil:false,count:1},{id:'SOR_005',foil:false,count:4},{id:'SOR_005',foil:true,count:1}],decks:[]});
const mapping={sourceId:'HMW_T001',kind:'catalog',targetId:'SOR_005'};
const count=(workspace,id,foil=false)=>effectiveCollection(workspace).find(row=>row.id===id&&row.foil===foil)?.count||0;

test('Mapping preserves raw quantities and finishes, and previews the exact merged destination',()=>{
 const before=initial(),snapshot=structuredClone(before);
 assert.deepEqual(resolutionPreview(before,'HMW_T001',mapping,byId),{sourceId:'HMW_T001',destinationId:'SOR_005',source:{normal:2,foil:3},existing:{normal:4,foil:1},after:{normal:6,foil:4},combines:true,unresolvedBefore:3,unresolvedAfter:1});
 const after=setCollectionResolution(before,mapping,'HMW_T001',byId);
 assert.equal(after.collection,before.collection);assert.deepEqual(before,snapshot);
 assert.equal(count(after,'SOR_005'),6);assert.equal(count(after,'SOR_005',true),4);
 assert.equal(effectiveCollection(after).reduce((n,row)=>n+row.count,0),11);
 assert.deepEqual(unresolvedCollection(after,byId),[{id:'ASH_T003',foil:false,count:1}]);
});

test('Repeated save, remapping, and undo derive each source only once',()=>{
 let state=setCollectionResolution(initial(),mapping,'HMW_T001',byId);
 for(let i=0;i<3;i++)state=setCollectionResolution(state,mapping,'HMW_T001',byId);
 assert.equal(count(state,'SOR_005'),6);assert.equal(state.resolutions.length,1);
 assert.equal(resolutionPreview(state,'HMW_T001',mapping,byId).existing.normal,4);
 state=setCollectionResolution(state,{...mapping,targetId:'SOR_009'},'HMW_T001',byId);
 assert.equal(count(state,'SOR_005'),4);assert.equal(count(state,'SOR_009'),2);assert.equal(count(state,'SOR_009',true),3);
 state=setCollectionResolution(state,null,'HMW_T001',byId);
 assert.deepEqual(effectiveCollection(state),initial().collection);assert.equal(unresolvedCollection(state,byId).length,3);
});

test('Ignore and token/non-catalog classifications are reversible and retain quantities',()=>{
 const base={collection:[{id:'HMW_T001',foil:false,count:1},{id:'ASH_T003',foil:false,count:1}],decks:[]};
 const ignored=setCollectionResolution(base,{sourceId:'HMW_T001',kind:'ignored'},'HMW_T001',byId);
 assert.equal(unresolvedCollection(ignored,byId).length,1);assert.equal(count(ignored,'HMW_T001'),1);
 const token=setCollectionResolution(ignored,{sourceId:'ASH_T003',kind:'token',correctedId:'ash t004',name:'  Clone Trooper  '},'ASH_T003',byId);
 assert.equal(unresolvedCollection(token,byId).length,0);assert.equal(count(token,'ASH_T004'),1);assert.equal(token.resolutions[1].name,'Clone Trooper');
 const custom=setCollectionResolution(token,{sourceId:'ASH_T003',kind:'non-catalog'},'ASH_T003',byId);
 assert.equal(count(custom,'ASH_T003'),1);assert.equal(count(custom,'ASH_T004'),0);
 assert.equal(unresolvedCollection(setCollectionResolution(custom,null,'HMW_T001',byId),byId).length,1);
 assert.deepEqual(custom.collection,base.collection);
});

test('Missing catalog destinations stay unresolved and mappings apply one level only',()=>{
 const state={collection:[{id:'HMW_T001',foil:false,count:1},{id:'SOR_005',foil:false,count:2}],decks:[],resolutions:[mapping,{sourceId:'SOR_005',kind:'catalog',targetId:'SOR_009'}]};
 assert.equal(count(state,'SOR_005'),1);assert.equal(count(state,'SOR_009'),2);
 const restored=validateBackup({...initial(),resolutions:[{...mapping,targetId:'OLD_999'}]});
 assert.equal(unresolvedCollection(restored,byId).length,3);
});

test('Invalid mapping and corrected-ID collisions fail before mutation',()=>{
 const state=initial(),snapshot=structuredClone(state);
 assert.throws(()=>setCollectionResolution(state,{...mapping,targetId:'MISSING_001'},'HMW_T001',byId),/not found/);
 assert.throws(()=>setCollectionResolution(state,{...mapping,targetId:'HMW_T001'},'HMW_T001',byId),/different catalog ID/);
 assert.throws(()=>setCollectionResolution(state,{...mapping,targetId:'not-an-id'},'HMW_T001',byId),/Invalid card ID/);
 assert.throws(()=>setCollectionResolution(state,mapping,'ASH_T003',byId),/selected collection ID/);
 assert.throws(()=>setCollectionResolution(state,{...mapping,sourceId:'NEW_001'},'NEW_001',byId),/no longer/);
 assert.throws(()=>setCollectionResolution(state,{sourceId:'HMW_T001',kind:'token',correctedId:'SOR_005'},'HMW_T001',byId),/Map to catalog/);
 assert.throws(()=>setCollectionResolution(state,{sourceId:'HMW_T001',kind:'token',correctedId:'ASH_T003'},'HMW_T001',byId),/already used|belongs to another/);
 const other=setCollectionResolution(state,{sourceId:'ASH_T003',kind:'token',correctedId:'TOK_001'},'ASH_T003',byId);
 assert.throws(()=>setCollectionResolution(other,{sourceId:'HMW_T001',kind:'non-catalog',correctedId:'TOK_001'},'HMW_T001',byId),/already used/);
 assert.deepEqual(state,snapshot);
});

test('Full JSON backup roundtrip preserves mappings, classifications, ignored items, and every finish',()=>{
 const state={...initial(),collection:[...initial().collection,{id:'CUSTOM_001',foil:true,count:7},{id:'CUSTOM_002',foil:false,count:2}],resolutions:[mapping,{sourceId:'ASH_T003',kind:'token',correctedId:'ASH_T004',name:'Clone, "Trooper"'},{sourceId:'CUSTOM_001',kind:'non-catalog',name:'Promo'},{sourceId:'CUSTOM_002',kind:'ignored'}]};
 assert.deepEqual(validateBackup(JSON.parse(createBackup(state).text).data),state);
 assert.deepEqual(validateBackup({collection:[],decks:[],resolutions:state.resolutions}).resolutions,state.resolutions);
});

test('Enriched CSV roundtrip retains original IDs and resolution metadata without double application',()=>{
 const state={...initial(),collection:[...initial().collection,{id:'CUSTOM_001',foil:true,count:7},{id:'CUSTOM_002',foil:false,count:2}],resolutions:[mapping,{sourceId:'ASH_T003',kind:'token',correctedId:'ASH_T004',name:'Clone, "Trooper"\nToken'},{sourceId:'CUSTOM_001',kind:'non-catalog',name:'Promo'},{sourceId:'CUSTOM_002',kind:'ignored'}]};
 const csv=exportCollection(state.collection,state.resolutions),imported=parseCollectionImport(csv);
 assert.ok(csv.startsWith('Set,CardNumber,Count,IsFoil,ResolutionKind,TargetId,CorrectedId,ResolutionName\r\n'));
 assert.deepEqual(imported,{collection:state.collection,resolutions:state.resolutions});
 const restored=applyCollectionImport({collection:[],decks:[]},imported,'replace');
 assert.deepEqual(effectiveCollection(restored),effectiveCollection(state));assert.equal(restored.resolutions.length,4);
 assert.equal(exportCollection(state.collection).split('\r\n')[0],'Set,CardNumber,Count,IsFoil');
 assert.deepEqual(parseCollectionImport(exportCollection(state.collection)),{collection:state.collection,resolutions:[]});
});

test('Add imports retain compatible mappings and reject conflicting destinations atomically',()=>{
 const state=setCollectionResolution(initial(),mapping,'HMW_T001',byId),snapshot=structuredClone(state);
 const incoming={collection:[{id:'HMW_T001',foil:false,count:1}],resolutions:[mapping]};
 const added=applyCollectionImport(state,incoming,'add');assert.equal(count(added,'SOR_005'),7);assert.equal(added.resolutions.length,1);
 assert.throws(()=>applyCollectionImport(state,{...incoming,resolutions:[{...mapping,targetId:'SOR_009'}]},'add'),/Conflicting resolutions/);
 assert.deepEqual(state,snapshot);
 assert.deepEqual(applyCollectionImport(state,{collection:[],resolutions:[]},'replace').resolutions,[]);
});

test('Conflicting or malformed resolution metadata in backups and CSV is rejected',()=>{
 assert.throws(()=>validateBackup({...initial(),resolutions:[mapping,{...mapping,targetId:'SOR_009'}]}),/Conflicting resolutions/);
 assert.throws(()=>validateBackup({...initial(),resolutions:[{...mapping,kind:'mystery'}]}),/Invalid collection resolution/);
 assert.throws(()=>validateBackup({...initial(),resolutions:[{sourceId:'HMW_T001',kind:'catalog'}]}),/Choose a catalog/);
 assert.throws(()=>parseCollectionImport('Set,CardNumber,Count,IsFoil,ResolutionKind,TargetId\nHMW,T001,1,FALSE,catalog,SOR_005\nHMW,T001,1,TRUE,catalog,SOR_009'),/Conflicting resolutions/);
 assert.throws(()=>parseCollectionImport('Set,CardNumber,Count,IsFoil,TargetId\nHMW,T001,1,FALSE,SOR_005'),/ResolutionKind/);
});

test('Quantity controls consume direct then mapped copies, preserve foil, and add direct copies',()=>{
 let state=setCollectionResolution(initial(),mapping,'HMW_T001',byId);
 state=adjustEffectiveOwned(state,'SOR_005',false,-5);
 assert.equal(count(state,'SOR_005'),1);assert.equal(count(state,'SOR_005',true),4);
 assert.equal(state.collection.find(row=>row.id==='HMW_T001'&&!row.foil).count,1);
 assert.equal(state.collection.some(row=>row.id==='SOR_005'&&!row.foil),false);
 state=adjustEffectiveOwned(state,'SOR_005',false,1);
 assert.equal(count(state,'SOR_005'),2);assert.equal(state.collection.find(row=>row.id==='SOR_005'&&!row.foil).count,1);
 state=adjustEffectiveOwned(state,'SOR_005',false,-100);assert.equal(count(state,'SOR_005'),0);assert.equal(count(state,'SOR_005',true),4);
 assert.deepEqual(state.resolutions,[mapping]);
});

test('Quantity controls handle multiple aliases deterministically without recursively moving copies',()=>{
 const state={collection:[{id:'BBB_001',foil:false,count:2},{id:'AAA_001',foil:false,count:2},{id:'SOR_005',foil:false,count:1}],decks:[],resolutions:[{sourceId:'BBB_001',kind:'catalog',targetId:'SOR_005'},{sourceId:'AAA_001',kind:'catalog',targetId:'SOR_005'}]};
 const adjusted=adjustEffectiveOwned(state,'SOR_005',false,-2);
 assert.equal(adjusted.collection.find(row=>row.id==='AAA_001').count,1);assert.equal(adjusted.collection.find(row=>row.id==='BBB_001').count,2);assert.equal(count(adjusted,'SOR_005'),3);
 assert.throws(()=>adjustEffectiveOwned(state,'SOR_005',false,0.5),/Invalid quantity/);
});

test('Enriched CSV retains mappings after a source quantity reaches zero',()=>{
 const state={collection:[{id:'SOR_005',foil:false,count:1}],decks:[],resolutions:[mapping,{sourceId:'ASH_T003',kind:'ignored'}]};
 const imported=parseCollectionImport(exportCollection(state.collection,state.resolutions));
 assert.deepEqual(imported.collection,state.collection);assert.deepEqual(imported.resolutions,state.resolutions);
 assert.deepEqual(parseCollectionImport(exportCollection([],state.resolutions)),{collection:[],resolutions:state.resolutions});
});

test('Imports reject corrected-ID collisions without altering stored data',()=>{
 const state=setCollectionResolution(initial(),{sourceId:'ASH_T003',kind:'token',correctedId:'TOKEN_001'},'ASH_T003',byId);
 assert.throws(()=>applyCollectionImport(state,{collection:[{id:'TOKEN_001',foil:false,count:2}],resolutions:[]},'add',byId),/conflicts with another/);
 const invalid={...initial(),resolutions:[{sourceId:'ASH_T003',kind:'token',correctedId:'SOR_009'}]};
 assert.throws(()=>validateBackup(invalid,byId),/in the catalog/);
 assert.throws(()=>applyCollectionImport(initial(),invalid,'replace',byId),/in the catalog/);
 assert.equal(state.collection.some(row=>row.id==='TOKEN_001'),false);
});
