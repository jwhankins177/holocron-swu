export function create(pool,side='luke',rng=Math.random){
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 let uid=0;const player=side=>({side,hp:30,res:2,ready:2,hand:[],deck:shuffle(pool[side].flatMap((c,i)=>Array.from({length:i===16?2:3},()=>({...c,uid:++uid})))),units:[],discard:[],deployed:false,leaderReady:true,played:[]});
 const s={version:1,players:[player(side),player(side==='luke'?'vader':'luke')],turn:0,initiative:0,claimed:false,passed:[false,false],phase:'setup',round:1,log:['Choose two cards to resource, then keep or mulligan your opening hand.'],winner:null};
 s.players.forEach(p=>p.hand=p.deck.splice(0,6));return s;
}
export function targets(s,p,u){let enemies=s.players[1-p].units.filter(t=>t.arena===u.arena);const sent=enemies.filter(t=>t.text.includes('Sentinel'));return sent.length?sent.map(t=>t.uid):['base',...enemies.map(t=>t.uid)]}
export function actions(s){if(s.winner!==null)return [];const p=s.players[s.turn],i=s.turn;if(i!==0&&s.phase!=='action')return [];if(s.phase==='setup')return [...p.hand.map(c=>({type:'resource',id:c.uid})),...(!s.mulligan&&!s.setupCount?[{type:'mulligan'}]:[])];if(s.phase==='regroup')return [{type:'skip'},...p.hand.map(c=>({type:'resource',id:c.uid}))];
 const a=[{type:'pass'}];if(!s.claimed)a.push({type:'initiative'});for(const c of p.hand)if(c.cost<=p.ready)a.push({type:'play',id:c.uid});
 if(!p.deployed&&p.res>=(p.side==='luke'?6:7))a.push({type:'deploy'});
 if(!p.deployed&&p.leaderReady&&p.ready){if(p.side==='luke'){for(const u of p.units.filter(u=>u.hero&&p.played.includes(u.uid)))a.push({type:'ability',id:u.uid})}else if(p.played.some(id=>p.units.concat(p.discard).some(c=>c.uid===id&&c.villain))){for(const u of s.players.flatMap(p=>p.units))for(let base=0;base<2;base++)a.push({type:'ability',id:u.uid,base})}}
 for(const u of p.units.filter(u=>u.ready))for(const target of targets(s,i,u)){
  if(u.leader&&p.side==='luke')for(const shield of [null,...s.players.flatMap(p=>p.units).filter(t=>t.uid!==u.uid).map(t=>t.uid)])a.push({type:'attack',id:u.uid,target,bonus:shield});
  else if(u.leader&&p.side==='vader')for(const hit of [null,...s.players.flatMap(p=>p.units).map(t=>t.uid)])a.push({type:'attack',id:u.uid,target,bonus:hit});
  else a.push({type:'attack',id:u.uid,target});
 }return a;
}
function damage(u,n){if(n<=0)return;if(u.shields){u.shields--;return}u.damage+=n}
function cleanup(s){for(const p of s.players){for(const u of p.units.filter(u=>u.damage>=u.hp)){p.discard.push(u);if(u.leader)p.leaderReady=false}p.units=p.units.filter(u=>u.damage<u.hp)}if(s.players.some(p=>p.hp<=0)){s.winner=s.players[0].hp<=0?(s.players[1].hp<=0?'draw':1):0;s.phase='finished'}}
function draw(s,p,n){for(let i=0;i<n;i++){if(p.deck.length)p.hand.push(p.deck.shift());else p.hp-=3}cleanup(s)}
export function apply(state,a){if(!actions(state).some(x=>JSON.stringify(x)===JSON.stringify(a)))throw Error('Illegal action');const s=structuredClone(state),i=s.turn,p=s.players[i],enemy=s.players[1-i];const note=t=>s.log.push(t);
 if(a.type==='mulligan'){p.deck.push(...p.hand);p.deck.sort(()=>Math.random()-.5);p.hand=p.deck.splice(0,6);s.mulligan=true;note('Opening hand redrawn.');return s}
 if(s.phase==='setup'||s.phase==='regroup'){if(a.type==='resource'){const c=p.hand.find(c=>c.uid===a.id);p.hand=p.hand.filter(c=>c.uid!==a.id);if(s.phase==='regroup')p.res++;note('You resource '+c.name);s.setupCount=(s.setupCount||0)+1}if(s.phase==='setup'&&s.setupCount<2)return s;
 if(s.phase==='setup'){enemy.hand.splice(0,2)}else{if(enemy.hand.length){enemy.hand.sort((a,b)=>b.cost-a.cost);enemy.hand.shift();enemy.res++}}
 s.players.forEach(p=>{p.ready=p.res;p.leaderReady=true;p.played=[];p.units.forEach(u=>u.ready=true)});s.phase='action';s.turn=s.initiative;s.passed=[false,false];s.claimed=false;return s}
 if(a.type==='play'){const c=p.hand.find(c=>c.uid===a.id);p.hand=p.hand.filter(c=>c.uid!==a.id);p.ready-=c.cost;p.units.push({...c,damage:0,shields:c.text.includes('Shielded')?1:0,ready:false});p.played.push(c.uid);note(`${i?'AI':'You'} play ${c.name}.`)}
 if(a.type==='deploy'){p.deployed=true;p.units.push({uid:100000+i,name:p.side==='luke'?'Luke Skywalker':'Darth Vader',cost:0,power:p.side==='luke'?4:5,hp:p.side==='luke'?7:8,arena:'Ground',text:'Leader · On Attack',damage:0,shields:0,ready:true,leader:true,hero:p.side==='luke',villain:p.side==='vader'});note(`${i?'AI':'You'} deploy ${p.side}.`)}
 if(a.type==='ability'){p.ready--;p.leaderReady=false;const u=s.players.flatMap(p=>p.units).find(u=>u.uid===a.id);if(p.side==='luke')u.shields++;else{damage(u,1);s.players[a.base].hp--}note(`${p.side} uses leader ability.`)}
 if(a.type==='attack'){const u=p.units.find(u=>u.uid===a.id);u.ready=false;if(u.leader&&a.bonus!==null){const b=s.players.flatMap(p=>p.units).find(t=>t.uid===a.bonus);if(p.side==='luke')b.shields++;else damage(b,2);cleanup(s)}
 const restore=+(u.text.match(/Restore (\d+)/)||[])[1]||0;p.hp=Math.min(30,p.hp+restore);const power=u.power+(+(u.text.match(/Raid (\d+)/)||[])[1]||0);
 if(a.target==='base'){enemy.hp-=power;note(`${u.name} hits base for ${power}.`)}else{const t=enemy.units.find(t=>t.uid===a.target);if(t&&p.units.some(t=>t.uid===u.uid)){const excess=Math.max(0,power-(t.hp-t.damage));damage(t,power);damage(u,t.power);if(u.text.includes('Overwhelm'))enemy.hp-=excess;note(`${u.name} attacks ${t.name}.`)}}}
 if(a.type==='initiative'){s.initiative=i;s.claimed=true;s.passed[i]=true;note(`${i?'AI':'You'} take initiative.`)}else if(a.type==='pass'){s.passed[i]=true;note(`${i?'AI':'You'} pass.`)}else s.passed[i]=false;
 cleanup(s);if(s.winner!==null)return s;
 if(s.passed.every(Boolean)){s.round++;draw(s,p,2);draw(s,enemy,2);if(s.winner===null){s.phase='regroup';s.turn=0;note('Regroup: resource one card or skip.')}}else s.turn=s.claimed&&s.passed[1-i]?i:1-i;
 return s;
}
export function chooseAI(s){const aa=actions(s),p=s.players[s.turn],e=s.players[1-s.turn];const score=a=>{if(a.type==='deploy')return 80;if(a.type==='play')return 15+p.hand.find(c=>c.uid===a.id).cost*2;if(a.type==='ability')return 10;if(a.type==='attack'){const u=p.units.find(u=>u.uid===a.id);if(a.target==='base')return e.hp<=u.power?10000:22+u.power;const t=e.units.find(t=>t.uid===a.target);return 20+(u.power>=t.hp-t.damage?12:0)-(t.power>=u.hp-u.damage?8:0)+(a.bonus!==null?2:0)}return a.type==='initiative'?5:0};return aa.sort((a,b)=>score(b)-score(a))[0]}
