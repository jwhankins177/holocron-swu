import test from 'node:test';
import assert from 'node:assert/strict';
import {compareAspects,compareCards,defaultSort,orderedAspects} from '../modern/lib/card-display.ts';

const card = (id,cost,aspects) => ({id,name:id,subtitle:'',cost,aspects});
test('default card order is numeric cost, then color, with unpriced cards last',()=>{
 const cards = [
  card('neutral',2,[]), card('red',2,['Aggression']), card('unpriced',null,['Vigilance']),
  card('cheap',1,['Cunning']), card('green',2,['Heroism','Command']), card('blue',2,['Vigilance','Villainy']),
  card('expensive',10,['Vigilance']),
 ];
 const quantities = new Map();
 cards.sort((a,b)=>compareCards(a,b,defaultSort,quantities,quantities));
 assert.deepEqual(cards.map(({id})=>id),['cheap','blue','green','red','neutral','expensive','unpriced']);
});
test('aspect comparison groups equivalent icon sequences and distinguishes double aspects',()=>{
 assert.deepEqual(orderedAspects(['Heroism','Command','Command']),['Command','Command','Heroism']);
 assert.equal(compareAspects(['Villainy','Cunning'],['Cunning','Villainy']),0);
 assert.notEqual(compareAspects(['Command','Command'],['Command']),0);
});
