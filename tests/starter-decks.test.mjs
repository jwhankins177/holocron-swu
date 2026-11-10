import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {starterDecks,starterDeckCopy,addStarterDeck,sameDeckList} from '../modern/lib/starter-decks.ts';
import {createBackup,validateBackup,parseDeck,deckExport} from '../modern/lib/model.ts';
const catalog=JSON.parse(readFileSync(new URL('../public/catalog.json',import.meta.url)));
const byId=new Map(catalog.cards.map(c=>[c.id,c]));
test('all 20 ForceTable single-leader starters have 50 valid catalog cards',()=>{
 assert.equal(starterDecks.length,20);assert.equal(new Set(starterDecks.map(x=>x.id)).size,20);
 for(const d of starterDecks){assert.equal(byId.get(d.leader)?.type,'Leader',d.name);assert.equal(byId.get(d.base)?.type,'Base',d.name);assert.equal(d.deck.reduce((n,x)=>n+x.count,0),50,d.name);assert.equal(d.sideboard.length,0);assert.equal(new Set(d.deck.map(x=>x.id)).size,d.deck.length);for(const c of d.deck){assert.ok(byId.has(c.id),c.id);assert.ok(c.count>=1&&c.count<=3);assert.ok(!['Leader','Base'].includes(byId.get(c.id).type));}}
});
test('import adds a separate deck and preserves collection, other decks, and preferences',()=>{
 const original={collection:[{id:'SOR_005',foil:true,count:2}],decks:[],settings:{theme:'moss'},lists:[]};const before=structuredClone(original);
 const result=addStarterDeck(original,starterDecks[0]);assert.deepEqual(original,before);assert.equal(result.workspace.collection,original.collection);assert.equal(result.workspace.settings,original.settings);assert.equal(result.workspace.decks.length,1);assert.equal(result.existing,false);
 const copy=starterDeckCopy(starterDecks[0]);assert.notEqual(copy.uid,result.deck.uid);copy.deck[0].count=99;assert.notEqual(starterDecks[0].deck[0].count,99);
});
test('repeat import opens an identical saved list, even if renamed or reordered',()=>{
 const first=addStarterDeck({collection:[],decks:[]},starterDecks[0]);first.deck.name='Renamed';first.deck.deck.reverse();const second=addStarterDeck(first.workspace,starterDecks[0]);assert.equal(second.existing,true);assert.equal(second.workspace,first.workspace);assert.equal(second.deck.uid,first.deck.uid);
 const changed=structuredClone(first.workspace);changed.decks[0].deck[0].count--;assert.equal(addStarterDeck(changed,starterDecks[0]).existing,false);
});
test('starter deck lists and provenance roundtrip through backup and SWUDB export',()=>{
 const workspace={collection:[],decks:starterDecks.map(starterDeckCopy)};const restored=validateBackup(JSON.parse(createBackup(workspace).text).data);assert.deepEqual(restored,workspace);for(const d of workspace.decks)assert.ok(sameDeckList(parseDeck(JSON.stringify(deckExport(d))),d));
});
test('deck limit rejects import without modifying workspace',()=>{
 const w={collection:[],decks:Array.from({length:500},()=>starterDeckCopy(starterDecks[0]))};assert.throws(()=>addStarterDeck(w,starterDecks[1]),/limit/);assert.equal(w.decks.length,500);assert.equal(addStarterDeck(w,starterDecks[0]).existing,true);
});
