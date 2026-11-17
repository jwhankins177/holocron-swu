import {create,actions,apply,chooseAI} from './engine.mjs';
const $=id=>document.getElementById(id),pool=await fetch('./cards.json').then(r=>r.json()),key='holocron-battle-v1';let s,arena='Ground',selected=null,history=[],timer;
try{s=JSON.parse(localStorage.getItem(key));if(s?.version!==1)s=null}catch{}s??=create(pool);$('side').value=s.players[0].side;
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function cardArtwork(card) {
  if (!card.leader) return card.art;
  const number = card.hero ? '005' : '010';
  return `https://cdn.swu-db.com/images/cards/SOR/${number}-b.png`;
}

function cardPreview(card) {
  const art = cardArtwork(card);
  return art ? `<img src="${esc(art)}" alt="${esc(card.name)}">` : '';
}

// Keep the name and live stats readable even when the card image is unavailable.
document.addEventListener('error', event => {
  if (event.target instanceof HTMLImageElement) event.target.hidden = true;
}, true);

function modal(html){$('modalbody').innerHTML=html;$('modal').showModal()}
function act(a){if(s.turn===0)history.push(structuredClone(s));s=apply(s,a);selected=null;render()}
function options(aa,title){modal(`<h2>${esc(title)}</h2><div class="choices">${aa.map((a,i)=>`<button data-choice="${i}">${esc(label(a))}</button>`).join('')}</div>`);document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{$('modal').close();act(aa[+b.dataset.choice])})}
function unit(id){return s.players.flatMap(p=>p.units.concat(p.hand)).find(u=>u.uid===id)}
function label(a){if(a.type==='attack')return `Attack ${a.target==='base'?'base':unit(a.target)?.name}${a.bonus!==undefined?' · '+(a.bonus===null?'skip trigger':(s.players[s.turn].side==='luke'?'shield ':'damage ')+unit(a.bonus)?.name):''}`;if(a.type==='ability')return `${unit(a.id)?.name}${a.base!==undefined?' + '+(a.base===0?'your':'enemy')+' base':''}`;return a.type}
function render(){clearTimeout(timer);try{localStorage.setItem(key,JSON.stringify(s))}catch{}const aa=actions(s),p=s.players[0],e=s.players[1],human=s.turn===0&&s.winner===null;
 $('status').textContent=s.winner!==null?(s.winner==='draw'?'Draw.':s.winner===0?'Victory — enemy base defeated.':'Defeat — your base fell.'):`Round ${s.round} · ${s.phase==='setup'?`Choose ${2-(s.setupCount||0)} cards to resource`:s.phase==='regroup'?'Choose a resource or skip':human?'Your action':'Opponent is thinking…'} · Initiative: ${s.initiative===0?'you':'AI'}`;
 for(const [id,v] of [['enemy',e],['player',p]])$(id).innerHTML=`<div class="hp">${Math.max(0,v.hp)}<small>/ 30 HP</small></div><div><strong>${v.side==='luke'?'Luke Skywalker':'Darth Vader'}</strong><small>${v.ready}/${v.res} resources · ${v.deck.length} deck · ${v.hand.length} hand</small><small>${v.deployed?'Leader deployed':'Leader available at '+(v.side==='luke'?6:7)+' resources'}</small></div>`;
 if(selected&&human){const base=aa.filter(a=>a.type==='attack'&&a.id===selected&&a.target==='base');if(base.length){const b=document.createElement('button');b.textContent='Attack base';b.className='primary';b.onclick=()=>base.length===1?act(base[0]):options(base,'Attack trigger');$('enemy').append(b)}}
 const card = (card, inHand = false) => {
  const exhausted = !inHand && !card.ready;
  const art = cardArtwork(card);
  const condition = inHand ? `${card.cost} ◇` : exhausted ? 'Exhausted' : 'Ready';
  const shields = card.shields ? ` · ◉ ${card.shields}` : '';
  return `<button class="card ${exhausted ? 'exhausted' : ''} ${selected === card.uid ? 'selected' : ''}" data-card="${card.uid}" data-hand="${inHand}">
    <span class="card-portrait">${art ? `<img src="${esc(art)}" alt="" decoding="async">` : ''}</span>
    <strong>${esc(card.name)}</strong>
    <span class="stats">${card.power} ⚔ / ${card.hp - (card.damage || 0)} ♥</span>
    <small>${condition}${shields}</small>
  </button>`;
 };
 for(const [id,v] of [['opponents',e],['units',p]])$(id).innerHTML=v.units.filter(u=>u.arena===arena).map(c=>card(c)).join('')||'<span class="empty">Arena clear</span>';
 $('hand').innerHTML=p.hand.map(c=>card(c,true)).join('');$('handcount').textContent=p.hand.length+' cards';
 document.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{const id=+b.dataset.card,c=unit(id);if(!human)return;const attack=aa.filter(a=>a.type==='attack'&&a.id===selected&&a.target===id);if(attack.length){attack.length===1?act(attack[0]):options(attack,'Choose attack trigger');return}if(b.dataset.hand==='true'){if(s.phase!=='action'){const a=aa.find(a=>a.type==='resource'&&a.id===id);if(a)act(a);return}modal(`<h2>${esc(c.name)}</h2><p>${esc(c.text||'No special abilities.')}<br>${c.cost} resources · ${c.arena}</p>${cardPreview(c)}<button id="play" ${!aa.some(a=>a.type==='play'&&a.id===id)?'disabled':''}>Play card</button>`);$('play').onclick=()=>{$('modal').close();act(aa.find(a=>a.type==='play'&&a.id===id))}}else if(p.units.some(u=>u.uid===id)&&c.ready){selected=id;render()}else modal(`<h2>${esc(c.name)}</h2><p>${esc(c.text||'No special abilities.')}</p>${cardPreview(c)}`) });
 $('ground').textContent='◈ Ground · '+s.players.reduce((n,p)=>n+p.units.filter(u=>u.arena==='Ground').length,0);$('space').textContent='✦ Space · '+s.players.reduce((n,p)=>n+p.units.filter(u=>u.arena==='Space').length,0);$('ground').className=arena==='Ground'?'active':'';$('space').className=arena==='Space'?'active':'';
 $('controls').innerHTML='';for(const type of ['mulligan','deploy','ability','initiative','pass','skip']){const matches=aa.filter(a=>a.type===type);if(!matches.length||!human)continue;const b=document.createElement('button');b.textContent={mulligan:'Mulligan',deploy:'Deploy leader',ability:'Leader ability',initiative:'Take initiative',pass:'Pass',skip:'Skip resource'}[type];if(type==='initiative')b.className='primary';b.onclick=()=>matches.length===1?act(matches[0]):options(matches,'Choose target');$('controls').append(b)}
 $('log').innerHTML=s.log.slice(-50).reverse().map(t=>`<li>${esc(t)}</li>`).join('');$('undo').disabled=!history.length;$('pool').innerHTML=Object.entries(pool).map(([k,v])=>`<p><b>${k==='luke'?'Luke / Command':'Vader / Vigilance'}</b><br>${v.map((c,i)=>`${i===16?2:3}× ${esc(c.name)}`).join(' · ')}</p>`).join('');
 if(s.turn===1&&s.phase==='action'&&s.winner===null)timer=setTimeout(()=>{s=apply(s,chooseAI(s));render()},650);
}
$('close').onclick=()=>$('modal').close();$('ground').onclick=()=>{arena='Ground';render()};$('space').onclick=()=>{arena='Space';render()};$('new').onclick=()=>{modal('<h2>Start a new match?</h2><p>This replaces your saved match.</p><button id="confirm">Start match</button>');$('confirm').onclick=()=>{$('modal').close();history=[];s=create(pool,$('side').value);render()}};$('undo').onclick=()=>{clearTimeout(timer);s=history.pop();selected=null;render()};$('help').onclick=()=>modal('<h2>Battle Lab</h2><p>Choose two opening cards as resources. You can mulligan before choosing them. Units enter exhausted; deployed leaders enter ready. Select a ready unit, then an enemy in the same arena or Attack base. Sentinel protects its arena. During regroup, draw two and optionally resource one. Taking initiative ends your actions for the round. You can undo your last decision, including the AI response.</p>');render();
