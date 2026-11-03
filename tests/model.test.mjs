import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCollection,exportCollection,mergeCollection,parseDeck,deckExport,aspectPenalty,probability,deckWarnings,validateBackup,createBackup,toggleFavorite} from '../lib/model.ts';
const catalog=JSON.parse(readFileSync(new URL('../public/catalog.json',import.meta.url)));
const byId=new Map(catalog.cards.map(c=>[c.id,c]));
test('CSV roundtrip retains foil, alternate printing, unknown card, and quantities',()=>{const input='\uFEFFSet,CardNumber,Count,IsFoil\r\nSOR,5,2,FALSE\r\nSOR,005,1,TRUE\r\nJTL,320,3,FALSE\r\nXYZ,999,1,FALSE';const rows=parseCollection(input);assert.equal(rows[0].id,'SOR_005');assert.deepEqual(parseCollection(exportCollection(rows)),rows);assert.equal(mergeCollection(rows,rows)[0].count,4)});
test('Invalid imports fail before mutation',()=>{for(const s of ['Set,CardNumber,Count,IsFoil\nSOR,005,-1,FALSE','Set,CardNumber,Count,IsFoil\nSOR,005,3,maybe','Set,CardNumber,Count,IsFoil\nSOR,005,3.5,FALSE'])assert.throws(()=>parseCollection(s))});
const raw={metadata:{name:'Validation fixture',author:'Test'},leader:{id:'SOR_005',count:1},base:{id:'SOR_025',count:1},deck:[{id:'SOR_095',count:3},{id:'SOR_102',count:2}],sideboard:[{id:'SOR_095',count:1}]};
test('Native SWUDB JSON roundtrip is exact',()=>{assert.deepEqual(deckExport(parseDeck(JSON.stringify(raw))),raw)});
test('Copy limit aggregates main and sideboard',()=>{assert.ok(deckWarnings(parseDeck(JSON.stringify(raw)),byId).some(x=>x.includes('4 copies')))});
test('Aspect multiplicity is counted, and extra available aspects do not reduce penalties',()=>{const c={aspects:['Command','Command','Heroism']};assert.equal(aspectPenalty(c,{aspects:['Command','Heroism']},{aspects:['Vigilance']}),2);assert.equal(aspectPenalty(c,{aspects:['Command','Heroism']},{aspects:['Command']}),0)});
test('Hypergeometric probability handles exact and empty cases',()=>{assert.equal(probability(50,0,6),0);assert.equal(probability(50,3,0),0);assert.equal(probability(50,3,50),1);assert.ok(Math.abs(probability(50,3,6)-0.3242857142857143)<.00001)});
test('Full backups restore unfinished decks',()=>{const d={uid:'a',name:'Work in progress',author:'Jonathon',leader:'',base:'',deck:[],sideboard:[],notes:'test'};const r=validateBackup({collection:[],decks:[d]});assert.equal(r.decks[0].leader,'');assert.equal(r.decks[0].notes,'test')});
test('Catalog identifiers unique and canonical references valid',()=>{assert.equal(byId.size,catalog.cards.length);for(const c of catalog.cards){assert.ok(byId.has(c.canonical),c.id);assert.ok(c.image.startsWith('https://'),c.id)}assert.equal(byId.get('SOR_005').name,'Luke Skywalker');assert.equal(byId.get('JTL_009').name,'Boba Fett');assert.equal(byId.get('HMW_018').type,'Leader')});
test('ForceTable transport survives base64 and JSON conversion',()=>{const s=JSON.stringify(raw);const encoded=encodeURIComponent(Buffer.from(s,'ascii').toString('base64'));assert.deepEqual(JSON.parse(Buffer.from(decodeURIComponent(encoded),'base64').toString()),raw)});

test('Full backup filename counts copies including foils, uses local date/time, and restores exactly',()=>{
 const workspace={collection:[{id:'SOR_005',foil:false,count:3},{id:'SOR_005',foil:true,count:2}],decks:[{uid:'deck-1',name:'My deck',author:'Jonathon',leader:'SOR_005',base:'SOR_025',deck:[{id:'SOR_095',count:3}],sideboard:[{id:'SOR_102',count:1}],notes:'Preserve these notes'},{uid:'deck-2',name:'Unfinished',author:'',leader:'',base:'',deck:[],sideboard:[],notes:''}]};
 const time=new Date(2026,10,3,18,4,9),backup=createBackup(workspace,time);
 assert.equal(backup.name,'Holocron_Backup_5-cards_2026-11-03_18-04-09.json');
 const parsed=JSON.parse(backup.text);assert.equal(parsed.format,'holocron-backup-v1');assert.equal(parsed.exported,time.toISOString());assert.deepEqual(validateBackup(parsed.data),workspace);
 assert.equal(createBackup({collection:[],decks:[]},time).name,'Holocron_Backup_0-cards_2026-11-03_18-04-09.json');
});
test('Full backup rejects duplicate deck IDs before replacing data',()=>{
 const deck={uid:'same',name:'Deck',author:'',leader:'',base:'',deck:[],sideboard:[],notes:''};
 assert.throws(()=>validateBackup({collection:[],decks:[deck,deck]}),/duplicate deck ID/);
});

test('Favorites toggle in one operation without changing ownership or decks',()=>{
 const original={collection:[{id:'SOR_005',foil:false,count:2}],decks:[]};
 const starred=toggleFavorite(original,'cards','SOR_005');
 assert.deepEqual(starred.favorites,{cards:['SOR_005'],decks:[]});
 assert.equal(starred.collection,original.collection);assert.equal(starred.decks,original.decks);assert.equal(original.favorites,undefined);
 assert.deepEqual(toggleFavorite(starred,'cards','SOR_005').favorites.cards,[]);
});
test('Full backups preserve card and deck favorites, including unknown card IDs',()=>{
 const deck={uid:'deck-1',name:'Favorite deck',author:'',leader:'',base:'',deck:[],sideboard:[],notes:'Keep'};
 const state={collection:[],decks:[deck],favorites:{cards:['SOR_005','XYZ_999'],decks:['deck-1']}};
 assert.deepEqual(validateBackup(JSON.parse(createBackup(state).text).data),state);
 assert.deepEqual(validateBackup({collection:[],decks:[]}),{collection:[],decks:[]});
 assert.throws(()=>validateBackup({...state,favorites:{cards:[42],decks:[]}}),/favorite/);
});
