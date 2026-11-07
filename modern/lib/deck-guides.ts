import {aspectPenalty, type Card, type Deck} from './model.ts';
import type {Guide} from './guides';

const label=(card:Card)=>[card.name,card.subtitle].filter(Boolean).join(' — ');
const unit=(card:Card)=>card.type==='Unit';
const has=(card:Card,keyword:string)=>card.keywords.some(value=>value.toLowerCase()===keyword.toLowerCase());
const trait=(card:Card,name:string)=>card.traits.some(value=>value.toLowerCase()===name.toLowerCase());
const profiles=[
 {name:'Vehicles and Piloting',match:(c:Card)=>has(c,'Piloting')||trait(c,'Vehicle'),
  plan:'Build a board of vehicles first, then turn a surviving chassis into a larger threat. Keep a second vehicle in reserve if your opponent can remove the first.',
  turn:'Compare the pilot’s unit mode with its upgrade mode. Spread threats against removal and upgrade a vehicle when it can survive long enough to earn the investment.'},
 {name:'Defense and recovery',match:(c:Card)=>['Sentinel','Restore','Fortify','Shielded'].some(k=>has(c,k)),
  plan:'Stabilize the arena dealing the most damage to your base. Then use the breathing room to develop a threat that can end the game.',
  turn:'Sequence healing after damage where possible. Use Sentinel in the arena you need to defend and preserve a ready unit that can attack or trade next round.'},
 {name:'Board pressure',match:(c:Card)=>['Raid','Coordinate','Overwhelm','Saboteur'].some(k=>has(c,k)),
  plan:'Develop multiple attackers and make the opponent spend actions reacting. Trade when it protects several future attacks or clears a path to the base.',
  turn:'Count base damage before taking a trade. If you already have enough threats, hold a follow-up for the next round instead of committing every card.'},
 {name:'Board control',match:(c:Card)=>has(c,'Ambush')||/defeat (?:a|an|target|all) |deal \d+ damage to .*unit/i.test(c.text),
  plan:'Contest early attackers, then use targeted answers to buy time for your more expensive cards.',
  turn:'Save flexible answers for the enemy threat that matters most. Compare the value of removing it now with developing a unit that can contest the board over several rounds.'},
];

const leaderPlans:Record<string,string>={
 JTL_008:'Open with a Vehicle and keep a Pilot in hand to use Wedge’s front-side discount. Keep a friendly Vehicle without a Pilot available if you plan to deploy him as an upgrade at five resources. After Wedge is attached, attack before playing the Pilot you want his attack trigger to discount.',
 JTL_017:'Keep a unit ready for Han’s attack action. Compare the odd and even costs, but plan the attack around the combat result before counting on the bonus. Before deploying Han, count your odd-cost units and upgrades so you have a follow-up for any resources you ready.',
 JTL_012:'Lead with a Fighter and attack with it before trying to use Luke’s front-side damage. For deployment, prioritize a Fighter that can survive and attack repeatedly so Luke’s attached ability can keep damaging enemy units.',
 ASH_005:'Use early units that can survive a trade so Luke can heal them afterward. Once deployed, use small attacks to trigger healing and decide whether saving the attacker or restoring your base matters more before each attack.',
 SOR_005:'When possible, leave one resource open after playing a Heroism unit worth protecting. Once Luke deploys, use his attack to protect a second threat and make the opponent spend extra actions removing your board.',
 SOR_007:'Start with an Imperial unit you expect to survive. Put Experience where it changes combat math. Before Tarkin attacks, identify another Imperial unit that can use the Experience immediately or survive a trade because of it.',
 SOR_009:'Keep two Rebels ready when you want to threaten consecutive attacks. Plan the first attack to clear a blocker or change combat math for the second. Save the leader action for a window where both attacks matter.',
 SOR_010:'Play a Villainy card before budgeting for Vader’s ping. Look for damage that finishes a unit or changes the next trade. On the deployment round, keep a target in mind for his attack damage.',
 HMW_003:'Use Weakness to change combat math before an attack. Spread tokens where they open favorable trades, and use Hemlock’s deployed attack trigger to set up your next action.',
 HMW_004:'Build a Fortify setup that buys time and count down the opponent’s remaining base HP. Plan your big round around reaching 10 or less remaining HP before regroup with the Death Star deployed.',
 HMW_010:'Set up early board presence before spending two resources and discarding a card for a Beast. Keep expendable cards for the action and save enough resources to pay for the Beast trigger when Tarfful attacks after deployment.',
 HMW_014:'Use cheap units to attack higher-cost units when the trade or the card draw is worth it. Keep at least one unit costing three or less around when Wicket attacks after deployment.',
};

export function buildDeckGuide(deck:Deck,byId:ReadonlyMap<string,Card>):Guide{
 const leader=byId.get(deck.leader),base=byId.get(deck.base);
 const leaderId=leader?.canonical??leader?.id;
 const leaderPlan=leaderId?leaderPlans[leaderId]:undefined;
 const pairReady=Boolean(leader&&base);
 const count=(entries:Deck['deck'])=>entries.reduce((sum,row)=>sum+row.count,0);
 const total=count(deck.deck),sideTotal=count(deck.sideboard);
 const rows=deck.deck.flatMap(row=>{
  const card=byId.get(row.id);
  return card?[{card,count:row.count,cost:card.cost,penalty:pairReady&&!(leaderId==='HMW_004'&&card.type==='Upgrade'&&has(card,'Fortify'))?aspectPenalty(card,leader,base):0}]:[];
 });
 const priced=rows.flatMap(row=>row.cost===null?[]:[{...row,printed:row.cost,effective:row.cost+row.penalty}]);
 const sum=(test:(row:typeof rows[number])=>boolean)=>rows.reduce((n,row)=>n+(test(row)?row.count:0),0);
 const examples=(group:typeof priced,limit=4)=>[...group].sort((a,b)=>b.count-a.count||a.effective-b.effective||a.card.name.localeCompare(b.card.name)).slice(0,limit);
 const list=(group:typeof priced)=>group.map(row=>`${label(row.card)} (${row.count}×, ${row.effective} resources)`).join(', ');
 const openings=priced.filter(row=>unit(row.card)&&row.effective<=2);
 const openingCards=examples(openings);
 const bridgeCards=examples(priced.filter(row=>row.effective>=3&&row.effective<=4));
 const finishCards=examples(priced.filter(row=>row.effective>=5&&unit(row.card)));
 const offAspect=examples(priced.filter(row=>row.penalty>0));
 const ground=sum(row=>unit(row.card)&&row.card.arena.toLowerCase().includes('ground'));
 const space=sum(row=>unit(row.card)&&row.card.arena.toLowerCase().includes('space'));
 const unknown=total-sum(()=>true);
 const profilesByCount=profiles.map(profile=>({profile,copies:sum(row=>profile.match(row.card))})).sort((a,b)=>b.copies-a.copies);
 const primary=profilesByCount[0];
 const profile=primary.copies>=Math.max(4,total*.16)?primary.profile:undefined;
 const curve=[[0,2],[3,4],[5,6],[7,Infinity]].map(([min,max])=>priced.filter(r=>r.effective>=min&&r.effective<=max).reduce((n,r)=>n+r.count,0));
 const sideCards=deck.sideboard.map(row=>`${row.count}× ${byId.has(row.id)?label(byId.get(row.id)!):row.id}`);
 const costs=pairReady?'Aspect-adjusted baseline costs are shown. Alternate costs and card abilities can change what you pay.':'Printed costs are shown until both a leader and base are set.';
 const sections=[
  {title:'Game plan',body:`${profile?profile.name+'\n'+profile.plan:'Build an early board, then use your strongest midgame plays to turn board position into base damage.'}\n\n${total} main-deck copies · ${ground} ground-unit copies · ${space} space-unit copies · ${sideTotal} sideboard copies.${unknown?` The catalog could not match ${unknown} main-deck copies, so they are excluded from the analysis below.`:''}${deck.notes.trim()?'\n\nYour saved notes\n'+deck.notes.trim():''}`},
  {title:'Leader and base',body:`${leader?label(leader):deck.leader||'Choose a leader'} · ${base?label(base):deck.base||'Choose a base'}. ${base?.hp!=null?`Your base starts at ${base.hp} HP. `:''}${leader?.cost!=null?`The leader has a printed ${leader.cost}-resource deployment threshold. Plan the preceding round around what its deployed side can do.`:''}\n\nBefore the first turn, read the leader’s front-side action, deployment text, and the base ability. Decide which is worth saving resources or initiative for.${leaderPlan?'\n\n'+leaderPlan:''}`},
  {title:'Opening hand and mulligan',body:`${openingCards.length?'Look for an opening unit you can pay for with two resources and a follow-up for the next round. Start with '+list(openingCards)+'.':'The catalog shows no units you can play for two resources at the baseline cost. Look for a cheap setup effect or alternate cost, or consider adding more opening units.'}\n\nKeep a hand that gives you a first play and leaves two expendable cards to resource. Consider a mulligan when your hand can do neither. Against early pressure, favor a play in the arena the opponent is likely to contest.`},
  {title:'Rounds 1–3',body:`At two resources, establish a unit or make a setup play. At three and four, decide whether the priority is a second arena, a trade, or pressure on the enemy base. ${bridgeCards.length?'Your three- and four-resource options include '+list(bridgeCards)+'.':'This list has no known plays in that cost band. Check for alternate costs before relying on a smooth opening.'}\n\n${profile?.turn??'Compare attacking before a unit can be removed with developing another threat. Take initiative when acting first next round is worth giving up your remaining actions.'}`},
  {title:'Deployment and closing',body:`${finishCards.length?'Your larger unit threats include '+list(finishCards)+'. Pick one to preserve when resourcing, based on the arena and the opponent’s available answers.':'Look to close with the board you’ve already developed. Keep enough follow-up in hand to rebuild after a trade.'}\n\nOn the deployment round, compare deploying early to secure the leader’s impact with forcing an opponent to spend an answer first. In the late game, count ready attackers and base damage before committing to another board trade.`},
  {title:'Matchups and sideboard',body:`Against fast decks, resource expensive situational cards and keep cheap plays that contest the first attacker. Against slow decks, spread threats and keep one follow-up. Against space pressure, ${space>0?'look for a space unit you can play before the opposing board snowballs.':'this list has no known space units, so plan to race or verify that your events can interact across arenas.'}\n\n${sideCards.length?'Your saved sideboard: '+sideCards.join(', ')+'. Swap by job: add a card that solves a problem you saw, and cut a card that was too slow or had poor targets.':'The saved sideboard is empty. During practice, record which effects you wish you could bring in and which cards repeatedly become resources.'}`},
  {title:'Curve and practice checklist',body:`Main deck by resource cost: 0–2: ${curve[0]}, 3–4: ${curve[1]}, 5–6: ${curve[2]}, 7+: ${curve[3]}. ${costs}\n\n${offAspect.length?'Check the aspect penalties on '+list(offAspect)+'.\n\n':''}Play three practice games. Record your opening play, the first round you fell behind, and whether the deployment turn improved your position. Change one cluster of cards at a time so you can tell what helped.`},
 ];
 return {id:'deck:'+deck.uid,category:'My decks',title:deck.name,
  summary:`${leader?label(leader):'Leader pending'} · ${base?.name??'Base pending'} · ${total} main-deck cards`,
  sections,cards:[...new Set([leader?.id,base?.id,...[...openingCards,...bridgeCards,...finishCards].map(row=>row.card.id)].filter((id):id is string=>Boolean(id)))],sources:['rules']};
}
