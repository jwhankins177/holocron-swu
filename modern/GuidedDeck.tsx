import {useMemo,useState} from 'react';
import {aspectPenalty,deckWarnings,probability} from './lib/model';
import type {Card,Deck} from './lib/model';

type Section = 'deck' | 'sideboard';
type Step = 'Leader' | 'Base' | 'Early plays' | 'Build out' | 'Review';
const steps: Step[] = ['Leader','Base','Early plays','Build out','Review'];
const plans = {
 Balanced: {early: 12, note: 'Start with flexible units and interaction, then add a few finishers.'},
 Aggro: {early: 16, note: 'Use cheap units to establish pressure, and favor cards that keep damage flowing.'},
 Control: {early: 10, note: 'Prioritize early interaction, then add durable threats that can close the game.'},
};
const drawTypes = ['Unit','Event','Upgrade'];
const quantity = (entries: Deck[Section]) => entries.reduce((total,entry)=>total+entry.count,0);

type Props = {
 deck: Deck;
 cards: Card[];
 byId: Map<string,Card>;
 owned: Map<string,number>;
 premierIds: Set<string>;
 onEdit: (edit:(deck:Deck)=>Deck)=>void;
 onDetail: (card:Card)=>void;
 onExport: ()=>void;
};

export default function GuidedDeck({deck,cards,byId,owned,premierIds,onEdit,onDetail,onExport}:Props) {
 const leader = byId.get(deck.leader), base = byId.get(deck.base);
 const [step,setStep] = useState<Step>(()=>!leader?'Leader':!base?'Base':deck.deck.length?'Build out':'Early plays');
 const [plan,setPlan] = useState<keyof typeof plans>('Balanced');
 const [query,setQuery] = useState('');
 const [arena,setArena] = useState('');
 const [type,setType] = useState('');
 const [cost,setCost] = useState('');
 const [ownedOnly,setOwnedOnly] = useState(false);
 const [includePenalty,setIncludePenalty] = useState(false);
 const [premier,setPremier] = useState(true);
 const [section,setSection] = useState<Section>('deck');
 const [limit,setLimit] = useState(30);
 const total = quantity(deck.deck), sideTotal = quantity(deck.sideboard);
 const selected = [...deck.deck,...deck.sideboard];
 const byCore = new Map<string,number>();
 for(const entry of selected){
  const core = byId.get(entry.id)?.core ?? entry.id;
  byCore.set(core,(byCore.get(core) ?? 0)+entry.count);
 }
 const curve = Array<number>(10).fill(0);
 const mix = {Ground:0,Space:0,Event:0,Upgrade:0};
 let early = 0, penalties = 0, missing = 0;
 for(const entry of deck.deck){
  const card=byId.get(entry.id);
  if(!card)continue;
  const penalty=aspectPenalty(card,leader,base);
  if(penalty)penalties+=entry.count;
  if(card.cost!==null){
   const cost=card.cost+penalty;
   curve[Math.min(9,cost)]+=entry.count;
   if(cost<=2)early+=entry.count;
  }
  if(card.type==='Unit'){
   if(card.arena==='Ground'||card.arena==='Space')mix[card.arena]+=entry.count;
  }else if(card.type==='Event'||card.type==='Upgrade')mix[card.type]+=entry.count;
 }
 for(const card of [leader,base])if(card)byCore.set(card.core,(byCore.get(card.core)??0)+1);
 for(const [core,n] of byCore)missing+=Math.max(0,n-(owned.get(core)??0));
 const warnings=deckWarnings(deck,byId);
 const illegal=[...new Set([deck.leader,deck.base,...selected.map(entry=>entry.id)])]
  .filter(id=>id&&byId.has(id)&&!premierIds.has(id));
 const choosing = step==='Leader'||step==='Base';
 const candidates = useMemo(()=>{
  const term=query.trim().toLowerCase();
  const seen=new Set<string>();
  return cards.filter(card=>{
   if(card.variant!=='Normal'||card.foilOnly||seen.has(card.core))return false;
   if(choosing ? card.type!==step : !drawTypes.includes(card.type))return false;
   if(premier&&!premierIds.has(card.id))return false;
   if(ownedOnly&&!owned.get(card.core))return false;
   if(term&&![card.name,card.subtitle,card.id,card.text,...card.keywords,...card.traits].join(' ').toLowerCase().includes(term))return false;
   if(!choosing){
    const penalty=aspectPenalty(card,leader,base);
    if((!includePenalty&&penalty)||(type&&card.type!==type)||(arena&&card.arena!==arena))return false;
    if(step==='Early plays'&&(card.cost===null||card.cost+penalty>2))return false;
    if(cost&&(card.cost===null||Math.min(9,card.cost+penalty)!==Number(cost)))return false;
   }
   seen.add(card.core);
   return true;
  }).sort((a,b)=>(choosing?0:(a.cost??99)+aspectPenalty(a,leader,base)-(b.cost??99)-aspectPenalty(b,leader,base))||a.name.localeCompare(b.name));
 },[cards,query,choosing,step,premier,premierIds,ownedOnly,owned,includePenalty,type,arena,cost,leader,base]);

 function go(next:Step){
  setStep(next);setQuery('');setType('');setArena('');setCost('');setLimit(30);
  if(next!=='Build out')setSection('deck');
 }
 function pick(card:Card){
  if(card.type==='Leader'||card.type==='Base'){
   const field=card.type==='Leader'?'leader':'base';
   onEdit(current=>({...current,[field]:card.id}));
   go(card.type==='Leader'?'Base':'Early plays');
   return;
  }
  onEdit(current=>{
   const copies=[...current.deck,...current.sideboard].reduce((n,e)=>n+((byId.get(e.id)?.core??e.id)===card.core?e.count:0),0);
   if(copies>=3 || ownedOnly&&copies>=(owned.get(card.core)??0) || section==='sideboard'&&quantity(current.sideboard)>=10)return current;
   const existing=current[section].find(e=>e.id===card.id);
   const entries=existing?current[section].map(e=>e===existing?{...e,count:e.count+1}:e):[...current[section],{id:card.id,count:1}];
   return {...current,[section]:entries};
  });
 }
 function remove(id:string,from:Section){
  onEdit(current=>({...current,[from]:current[from].flatMap(e=>e.id!==id?[e]:e.count>1?[{...e,count:e.count-1}]:[])}));
 }

 const tips:Record<Step,string>={
  Leader:'Pick a leader whose ability gives the deck a clear plan. Read both faces and note when they deploy.',
  Base:'Your base supplies an aspect. Use it to unlock key cards or double an aspect you already have.',
  'Early plays':'Find plays you can afford at two resources. A cheap event counts here, but check that you have units to establish a board too.',
  'Build out':'Fill the middle of your curve, add a way to answer threats in both arenas, and keep a few cards that can finish a game.',
  Review:'Check the rules, then play a few opening hands. If you keep passing early or holding expensive cards, adjust the curve.',
 };
 const formatChecks=[
  {ok:leader?.type==='Leader'&&base?.type==='Base',text:'One leader and one base'},
  {ok:total>=50,text:`${total}/50 main deck minimum`},
  {ok:sideTotal<=10,text:`${sideTotal}/10 sideboard slots (optional)`},
  {ok:!warnings.some(w=>w.includes('copies across')||w.includes('cannot go')||w.includes('Unresolved')),text:'Valid card types and up to 3 copies per card across main and sideboard'},
  {ok:illegal.length===0,text:illegal.length?`${illegal.length} distinct cards outside Premier`:'All selected cards are in Holocron’s Premier pool'},
 ];
 const tuningChecks=[
  {ok:early>=plans[plan].early,text:`${early}/${plans[plan].early} early plays · ${plan.toLowerCase()} starting target`},
  {ok:mix.Ground>0&&mix.Space>0,text:'Units in both arenas, or a deliberate plan for the other arena'},
  {ok:penalties===0,text:`${penalties} main-deck copies with a baseline aspect penalty`},
  {ok:missing===0,text:`${missing} copies missing from your collection`},
 ];
 return <section className="guided-deck" aria-label="Guided deck builder">
  <div className="guided-intro">
   <div><h2>Guided deck builder</h2><p>{total}/50 main deck · {early} early plays · {sideTotal}/10 sideboard. Picks save as you go.</p></div>
   <label>Deck template <select value={plan} onChange={e=>setPlan(e.target.value as keyof typeof plans)}>
    {Object.keys(plans).map(name=><option key={name}>{name}</option>)}
   </select></label>
  </div>
  <nav className="guided-steps" aria-label="Deck building steps">
   {steps.map((name,i)=><button key={name} className={step===name?'selected':''} aria-current={step===name?'step':undefined}
    disabled={name==='Base'&&!leader||i>=2&&i<4&&(!leader||!base)} onClick={()=>go(name)}>{i+1}. {name}</button>)}
  </nav>
  <div className="guided-columns">
   <section className="stat-panel guided-picker">
    <h3>{step==='Leader'?'Choose a leader':step==='Base'?'Choose a base':step}</h3>
    <p>{tips[step]}</p>
    {step==='Build out'&&<p>{plans[plan].note}</p>}
    {step==='Review'?<>
     <p>Premier uses at least 50 main-deck cards and up to 10 sideboard cards. The checklist separates format requirements from tuning goals.</p>
     {illegal.length>0&&<ul>{illegal.map(id=><li key={id}>{byId.get(id)?.name} ({id})</li>)}</ul>}
     {warnings.length>0&&<ul>{warnings.map(warning=><li key={warning}>{warning}</li>)}</ul>}
     <button onClick={()=>go(leader&&base?'Build out':leader?'Base':'Leader')}>Keep building</button>
     <button className="primary" disabled={!leader||!base} onClick={onExport}>Export SWUDB JSON</button>
    </>:<>
     <div className="guided-filters">
      <input aria-label="Find cards for this step" placeholder="Search cards, traits, or keywords" value={query} onChange={e=>{setQuery(e.target.value);setLimit(30)}}/>
      <label><input type="checkbox" checked={premier} onChange={e=>{setPremier(e.target.checked);setLimit(30)}}/> Premier only</label>
      <label><input type="checkbox" checked={ownedOnly} onChange={e=>{setOwnedOnly(e.target.checked);setLimit(30)}}/> Only owned</label>
      {!choosing&&<>
       <label><input type="checkbox" checked={includePenalty} onChange={e=>{setIncludePenalty(e.target.checked);setLimit(30)}}/> Include aspect penalties</label>
       <select aria-label="Card type" value={type} onChange={e=>{setType(e.target.value);setLimit(30)}}><option value="">All card types</option>{drawTypes.map(t=><option key={t}>{t}</option>)}</select>
       <select aria-label="Arena" value={arena} onChange={e=>{setArena(e.target.value);setLimit(30)}}><option value="">All arenas</option><option>Ground</option><option>Space</option></select>
       {step==='Build out'&&<select aria-label="Effective resource cost" value={cost} onChange={e=>{setCost(e.target.value);setLimit(30)}}><option value="">Any resource cost</option>{curve.map((_,n)=><option key={n} value={n}>{n===9?'9+':n} cost</option>)}</select>}
       {step==='Build out'&&<select aria-label="Add cards to" value={section} onChange={e=>setSection(e.target.value as Section)}><option value="deck">Main deck</option><option value="sideboard">Sideboard</option></select>}
      </>}
     </div>
     {!choosing&&<p className="muted">Baseline cost adds 2 resources per missing aspect icon. Alternate costs and card effects can differ.</p>}
     <p>{candidates.length.toLocaleString()} matching cards</p>
     <ul className="guided-results">
      {candidates.slice(0,limit).map(card=>{
       const penalty=choosing?0:aspectPenalty(card,leader,base);
       const copies=byCore.get(card.core)??0;
       const ownedCount=owned.get(card.core)??0;
       const isChosen=card.id===deck.leader||card.id===deck.base;
       const unavailable=choosing?isChosen:copies>=3||ownedOnly&&copies>=ownedCount||section==='sideboard'&&sideTotal>=10;
       return <li key={card.id}>
        <div><button className="text-button" onClick={()=>onDetail(card)}><b>{card.name}</b>{card.subtitle&&<small>{card.subtitle}</small>}</button>
         <small>{card.aspects.join(' / ')||'Neutral'} · {card.arena||card.type} · {ownedCount} owned{!choosing?` · ${copies}/3 in deck + sideboard`:''}</small></div>
        {!choosing&&card.cost!==null&&<strong className={penalty?'warning':''}>{card.cost+penalty} cost{penalty>0?` (+${penalty})`:''}</strong>}
        <button disabled={unavailable} aria-label={(choosing?'Choose ':'Add ')+card.name} onClick={()=>pick(card)}>{choosing?(isChosen?'Selected':'Choose'):'Add'}</button>
       </li>;
      })}
     </ul>
     <div className="guided-filters">
      {candidates.length>limit&&<button onClick={()=>setLimit(limit+30)}>Show more cards</button>}
      {step==='Early plays'&&<button className="primary" onClick={()=>go('Build out')}>Continue to build out</button>}
      {step==='Build out'&&<button className="primary" onClick={()=>go('Review')}>Review deck</button>}
     </div>
    </>}
   </section>
   <aside className="guided-tracker">
    <section className="stat-panel"><h3>Live deck checklist</h3>
     <progress aria-label="Main deck progress" value={Math.min(total,50)} max={50}/>
     {([{heading:'Premier requirements',items:formatChecks},{heading:'Tuning and collection',items:tuningChecks}]).map(({heading,items})=><div key={heading}>
      <h4>{heading}</h4><ul className="guided-checklist">{items.map(item=><li key={item.text}><span aria-label={item.ok?'Met':'Review'}>{item.ok?'✓':'○'}</span>{item.text}</li>)}</ul>
     </div>)}
     <h3>Resource curve</h3><p>Main deck · baseline cost with aspect penalties</p>
     <div className="bars guided-curve">{curve.map((n,i)=><div key={i}><span>{n}</span><i style={{height:(n?Math.max(4,n/Math.max(1,...curve)*68):2)+'px'}}/><small>{i===9?'9+':i}</small></div>)}</div>
     <p>{mix.Ground} Ground · {mix.Space} Space · {mix.Event} Events · {mix.Upgrade} Upgrades</p>
     {total>=6&&<p><strong>{Math.round(probability(total,early,6)*100)}%</strong> chance of an early play in the opening six, before a mulligan.</p>}
    </section>
    <section className="stat-panel"><h3>Your picks</h3>
     {(['deck','sideboard'] as const).map(from=><details key={from}><summary>{from==='deck'?'Main deck':'Sideboard'} ({quantity(deck[from])})</summary>
      <ul className="guided-results">{deck[from].map(e=><li key={e.id}><span>{e.count} × {byId.get(e.id)?.name??e.id}</span>
       <button onClick={()=>remove(e.id,from)} aria-label={`Remove one ${byId.get(e.id)?.name??e.id} from ${from==='deck'?'main deck':'sideboard'}`}>−</button></li>)}</ul>
     </details>)}
    </section>
   </aside>
  </div>
 </section>;
}
