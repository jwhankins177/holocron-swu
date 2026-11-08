import test from 'node:test';
import assert from 'node:assert/strict';
import {kindsFromLegacyType,matchesCardKinds,validateCardDisplay,emptyFilters} from '../modern/lib/card-display.ts';

const ground={type:'Unit',arena:'Ground'};
const space={type:'Unit',arena:'Space'};
const event={type:'Event',arena:''};
const upgrade={type:'Upgrade',arena:''};

test('card kind choices can combine arenas with events and upgrades',()=>{
 const selected=['Unit:Ground','Event','Upgrade'];
 assert.equal(matchesCardKinds(ground,selected),true);
 assert.equal(matchesCardKinds(space,selected),false);
 assert.equal(matchesCardKinds(event,selected),true);
 assert.equal(matchesCardKinds(upgrade,selected),true);
 assert.equal(matchesCardKinds(space,[]),true);
});

test('existing type presets still map to the new picker',()=>{
 assert.deepEqual(kindsFromLegacyType('Unit','Ground'),['Unit:Ground']);
 assert.deepEqual(kindsFromLegacyType('Unit',''),['Unit:Ground','Unit:Space']);
 assert.deepEqual(kindsFromLegacyType('Event',''),['Event']);
 const legacy={...emptyFilters,type:'Unit'};
 delete legacy.kinds;
 assert.doesNotThrow(()=>validateCardDisplay({quickFilters:[{id:'old',name:'Units',scope:'catalog',filters:legacy}]}));
});
