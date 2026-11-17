import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionAchievements,compareDecks,deckReadiness,deckSummary,legalityFor,replacementsFor} from '../modern/lib/insights.ts';

const card=(id,extra={})=>({id,name:id,subtitle:'',core:id,canonical:id,type:'Unit',set:'SOR',number:id.split('_')[1],aspects:['Command'],traits:['Trooper'],keywords:['Sentinel'],cost:3,power:3,hp:4,arena:'Ground',rarity:'Common',artist:'',variant:'Normal',image:'',back:'',text:'',backText:'',epic:'',unique:false,...extra});
const cards=[card('SOR_001',{type:'Leader'}),card('SOR_020',{type:'Base'}),card('SOR_100'),card('SOR_101'),card('SOR_102',{arena:'Space'}),card('SOR_103',{cost:7}),card('SOR_104',{aspects:['Aggression']}),card('SOR_500',{core:'SOR_100',variant:'Hyperspace'})];
const byId=new Map(cards.map(c=>[c.id,c]));
const makeDeck=(extra={})=>({uid:'test',name:'Test',leader:'SOR_001',base:'SOR_020',deck:[{id:'SOR_100',count:3}],sideboard:[],notes:'',author:'',...extra});

test('readiness combines foils, variants and mapped quantities exactly once',()=>{
 const workspace={decks:[],collection:[{id:'SOR_100',count:1,foil:false},{id:'SOR_500',count:1,foil:true},{id:'UNK_001',count:1,foil:false}],resolutions:[{sourceId:'UNK_001',kind:'catalog',targetId:'SOR_100'}]};
 const result=deckReadiness(makeDeck(),workspace,byId);
 assert.equal(result.shortages.some(row=>row.core==='SOR_100'),false);
 assert.equal(result.missing,2); // leader and base still required
 assert.equal(result.buildable,false); // unfinished main deck must never claim readiness
});

test('empty deck cannot be ready even when zero copies are missing',()=>{
 const result=deckReadiness(makeDeck({leader:'',base:'',deck:[]}),{collection:[],decks:[]},byId);
 assert.equal(result.missing,0);assert.equal(result.buildable,false);assert.ok(result.issues.length>=3);
});

test('replacements reserve main and sideboard copies and respect standard copy cap',()=>{
 const deck=makeDeck({sideboard:[{id:'SOR_101',count:2}]});
 const workspace={decks:[deck],collection:[{id:'SOR_101',count:5,foil:false},{id:'SOR_102',count:4,foil:false},{id:'SOR_103',count:4,foil:false},{id:'SOR_104',count:4,foil:false}]};
 const suggested=replacementsFor(cards[2],deck,workspace,byId);
 assert.deepEqual(suggested.map(x=>x.card.id),['SOR_101']);assert.equal(suggested[0].available,1);
 assert.equal(replacementsFor(cards[2],makeDeck({sideboard:[{id:'SOR_101',count:3}]}),workspace,byId).length,0);
 assert.equal(replacementsFor(cards[2],deck,workspace,byId,new Set()).length,0);
});

test('comparison aggregates repeated entries and separates sideboard transfers',()=>{
 const before=makeDeck({deck:[{id:'SOR_100',count:1},{id:'SOR_100',count:1}],sideboard:[{id:'SOR_101',count:1}]}),after=makeDeck({deck:[{id:'SOR_100',count:1},{id:'SOR_101',count:1}]});
 const changes=compareDecks(before,after);
 assert.equal(changes.rows.length,3);
 assert.deepEqual(changes.rows.find(row=>row.id==='SOR_100'),{section:'Main deck',id:'SOR_100',before:2,after:1,delta:-1});
 assert.equal(changes.rows.find(row=>row.section==='Sideboard').delta,-1);
 assert.equal(compareDecks(before,{...before,leader:'SOR_002'}).leader.after,'SOR_002');
 const summary=deckSummary(before,{decks:[],collection:[]},byId);assert.equal(summary.curve[3],2);assert.equal(summary.sideboard,1);
});

test('legality flags suspension on alternate art and set rotation',()=>{
 const rules={date:'2026-11-09',premierSets:['SOR'],premierSuspended:['SOR_100'],eternalSuspended:[]};
 const result=legalityFor(makeDeck({deck:[{id:'SOR_500',count:1}]}),cards,byId,'Premier',rules,new Date('2026-11-16'));
 assert.deepEqual(result.suspended,['SOR_500']);assert.deepEqual(result.rotated,[]);
 assert.deepEqual(legalityFor(makeDeck(),cards,byId,'Eternal',rules).suspended,[]);
});

test('achievement totals exclude unknown IDs and set variants cannot inflate progress',()=>{
 const catalog={cards:Array.from({length:10},(_,i)=>card('SOR_'+String(100+i))).concat(card('SOR_500',{core:'SOR_100',variant:'Hyperspace'})),sets:[{code:'SOR',name:'Spark'}],updated:'',sources:[]};
 const collection=[...Array.from({length:5},(_,i)=>({id:'SOR_'+String(100+i),count:1,foil:false})),{id:'SOR_500',count:2,foil:true},{id:'UNK_001',count:100,foil:false}];
 const found=collectionAchievements({collection,decks:[makeDeck()]},catalog);
 assert.equal(found.find(x=>x.id==='copies-10').current,7);assert.equal(found.find(x=>x.id==='unique-10').current,5);
 assert.equal(found.find(x=>x.id==='set-SOR-0.5').earned,true);assert.equal(found.find(x=>x.id==='set-SOR-1').earned,false);assert.equal(found.find(x=>x.id==='decks-1').earned,true);
});

test('earned achievements stay unlocked after cards or decks are removed',()=>{
 const catalog={cards,sets:[{code:'SOR',name:'Spark'}],updated:'',sources:[]};
 const earnedAt='2026-11-17T03:30:00.000Z';
 const found=collectionAchievements({collection:[],decks:[],achievementUnlocks:{'copies-10':earnedAt,'decks-1':earnedAt}},catalog);
 for(const id of ['copies-10','decks-1']){const achievement=found.find(item=>item.id===id);assert.equal(achievement.current,0);assert.equal(achievement.earned,true);assert.equal(achievement.earnedAt,earnedAt)}
 assert.equal(found.find(item=>item.id==='copies-100').earned,false);
});
