import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveMatch,validatePlayRecords,matchStats} from '../modern/lib/play-records.ts';
import {validateBackup,createBackup} from '../modern/lib/model.ts';
const match={uid:'game-1',deckId:'deck-1',deckName:'Test deck',leader:'SOR_005',base:'SOR_022',opponent:'Friend',opponentLeader:'SOR_006',opponentBase:'SOR_025',result:'win',playedAt:'2026-11-16T12:00:00Z',rounds:6,myDamage:20,opponentDamage:30,notes:'Keep the opener.'};
test('saving the same game updates its result without duplicate history',()=>{const records=saveMatch(undefined,match);const updated=saveMatch(records,{...match,result:'loss'});assert.equal(updated.matches.length,1);assert.equal(updated.matches[0].result,'loss');assert.equal(records.matches[0].result,'win')});
test('practice and match records roundtrip with quantities and foil mapping untouched',()=>{const practice={deckId:'deck-1',plan:'Go wide',opening:'Keep two units',resources:'Resource late cards',matchups:'Play around removal'};const w={collection:[{id:'HMW_T001',count:2,foil:true}],decks:[],resolutions:[{sourceId:'HMW_T001',kind:'token',name:'Token'}],playRecords:{practice:[practice],matches:[match]}};const out=validateBackup(JSON.parse(createBackup(w).text).data);assert.deepEqual(out,w)});
test('malformed or duplicate records are rejected',()=>{assert.throws(()=>validatePlayRecords({practice:[],matches:[match,match]}));assert.throws(()=>validatePlayRecords({practice:[],matches:[{...match,myDamage:NaN}]}));assert.throws(()=>validatePlayRecords({practice:[],matches:[{...match,result:'maybe'}]}))});
test('match percentages handle draws and empty history explicitly',()=>{assert.equal(matchStats([]).winRate,0);assert.deepEqual(matchStats([match,{...match,result:'draw'},{...match,result:'loss'}]),{wins:1,losses:1,draws:1,winRate:33})});

test('hyphenated promo IDs survive collection backups',()=>{const w={collection:[{id:'TWIPQ_2-16',count:1,foil:true}],decks:[]};assert.deepEqual(validateBackup(w),w)});
