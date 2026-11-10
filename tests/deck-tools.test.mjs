import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {acrossDeckShortages,formatIssues,deckVersionChanges} from '../modern/lib/deck-tools.ts';
import {validateBackup,createBackup,validateFormatRules} from '../modern/lib/model.ts';
import {premierCards} from '../modern/lib/premier.ts';
import {readHistory,writeHistory} from '../modern/lib/change-history.ts';

const catalog=JSON.parse(readFileSync(new URL('../public/catalog.json',import.meta.url)));
const byId=new Map(catalog.cards.map(card=>[card.id,card]));
const makeDeck=(uid,name,count)=>({uid,name,author:'',leader:'SOR_005',base:'SOR_025',deck:[{id:'SOR_095',count}],sideboard:[],notes:''});

test('across-deck shortages count simultaneous copies and collapse printings',()=>{
 const decks=[makeDeck('one','One',2),makeDeck('two','Two',2)];
 const rows=acrossDeckShortages(decks,[{id:'SOR_095',foil:false,count:2},{id:'SOR_095',foil:true,count:1}],byId);
 assert.equal(rows.find(row=>row.id==='SOR_095').missing,1);
 assert.deepEqual([...rows.find(row=>row.id==='SOR_095').decks],['One','Two']);
});

test('format check flags dated Premier suspensions and omits them in Eternal',()=>{
 const deck={...makeDeck('one','One',1),deck:[{id:'ASH_052',count:1}]};
 assert.ok(formatIssues(deck,byId,new Set(['ASH_052','SOR_005','SOR_025']),'Premier').suspended.includes('ASH_052'));
 assert.equal(formatIssues(deck,byId,new Set(),'Eternal').suspended.length,0);
});

test('saved deck versions survive full backup and report changed copies',()=>{
 const deck=makeDeck('one','One',2),saved={...deck,deck:[{id:'SOR_095',count:1}]};
 const workspace={collection:[],decks:[deck],deckVersions:[{uid:'version-one',deckId:'one',name:'First build',savedAt:'2026-11-09T00:00:00.000Z',deck:saved}]};
 assert.deepEqual(validateBackup(JSON.parse(createBackup(workspace).text).data),workspace);
 assert.ok(deckVersionChanges(deck,saved,byId).some(text=>text.startsWith('+1')));
});

test('manual rules update changes Premier filtering and survives backup',()=>{
 const rules=validateFormatRules({date:'2026-11-09',premierSets:['SOR'],premierSuspended:['SOR_095'],eternalSuspended:[]});
 const pool=premierCards(catalog.cards,new Date('2026-11-09'),rules);
 assert.equal(pool.has('SOR_095'),false);
 assert.equal(pool.has('ASH_052'),false);
 const deck=makeDeck('one','One',1);
 assert.ok(formatIssues(deck,byId,pool,'Premier',rules).suspended.includes('SOR_095'));
 assert.deepEqual(validateBackup(JSON.parse(createBackup({collection:[],decks:[deck],formatRules:rules}).text).data).formatRules,rules);
});

test('local restore points stay scoped to the workspace revision',()=>{
 const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
 const point={at:'2026-11-09T00:00:00.000Z',label:'Deck change',before:{collection:[],decks:[makeDeck('one','One',1)]}};
 writeHistory(storage,'owner',7,[point]);
 assert.deepEqual(readHistory(storage,'owner',7),[point]);
 assert.deepEqual(readHistory(storage,'owner',8),[]);
 assert.deepEqual(readHistory(storage,'another-owner',7),[]);
});
