import {useState} from 'react';
import type {ReactNode} from 'react';
import {compareCards,defaultSort,orderedAspects} from './lib/card-display';
import type {Card,Deck,Owned} from './lib/model';

type Props = {
 deck:Deck;
 byId:ReadonlyMap<string,Card>;
 collection:Owned[];
 onBack:()=>void;
 aspectIcons:(values:string[])=>ReactNode;
};

function specialPrinting(card:Card,foil:boolean){
 const variant=card.variant&&card.variant!=='Normal'?card.variant:'';
 return [variant,foil||card.foilOnly?'Foil':''].filter(Boolean).join(' · ');
}

export default function DeckAssembly({deck,byId,collection,onBack,aspectIcons}:Props){
 const [checked,setChecked]=useState<Set<string>>(new Set());
 const quantities=new Map<string,number>();
 const specialCopies=new Map<string,string[]>();
 for(const row of collection){
  const card=byId.get(row.id);
  if(!card||row.count<=0)continue;
  const special=specialPrinting(card,row.foil);
  if(!special)continue;
  const copies=specialCopies.get(card.core)??[];
  copies.push(`${row.count} × ${special} (${row.id})`);
  specialCopies.set(card.core,copies);
 }
 const sortEntries=(entries:Deck['deck'])=>[...entries].sort((a,b)=>{
  const first=byId.get(a.id),second=byId.get(b.id);
  return first&&second?compareCards(first,second,defaultSort,quantities,quantities):
   Number(!first)-Number(!second)||a.id.localeCompare(b.id);
 });
 const sections=[
  {name:'Leader and base',entries:[{id:deck.leader,count:1},{id:deck.base,count:1}].filter(entry=>entry.id)},
  {name:'Main deck',entries:sortEntries(deck.deck)},
  {name:'Sideboard',entries:sortEntries(deck.sideboard)},
 ];
 const rows=sections.flatMap(section=>section.entries.map(entry=>({...entry,key:section.name+':'+entry.id})));
 const total=rows.reduce((sum,row)=>sum+row.count,0);
 const pulled=rows.reduce((sum,row)=>sum+(checked.has(row.key)?row.count:0),0);
 return <section className="deck-assembly" aria-labelledby="assembly-title">
  <div className="section-line">
   <h2 id="assembly-title">Deck assembly</h2>
   <button onClick={onBack}>Back to deck</button>
  </div>
  <p>Check a row once you’ve pulled all copies listed for that card. Special printings you own are listed separately from the deck printing.</p>
  <div className="actions assembly-progress">
   <strong role="status">{pulled} of {total} copies pulled</strong>
   <button disabled={!checked.size} onClick={()=>setChecked(new Set())}>Clear checks</button>
  </div>
  {total===0&&<p>This deck has no cards to assemble yet.</p>}
  {sections.filter(section=>section.entries.length>0).map(section=><section className="assembly-section" key={section.name}>
   <h3>{section.name}</h3>
   <div className="table-scroll"><table>
    <thead><tr><th scope="col">Pulled</th><th scope="col">Card</th><th scope="col">Qty</th><th scope="col">Color / aspects</th><th scope="col">Cost</th><th scope="col">Special copy</th></tr></thead>
    <tbody>{section.entries.map(entry=>{
     const key=section.name+':'+entry.id;
     const card=byId.get(entry.id);
     const special=card?specialPrinting(card,false):'';
     const ownedSpecial=card?specialCopies.get(card.core):undefined;
     return <tr key={key}>
      <td><input type="checkbox" aria-label={`Pulled ${entry.count} × ${card?.name??entry.id} (${entry.id}) from ${section.name}`} checked={checked.has(key)}
       onChange={event=>{const on=event.target.checked;setChecked(previous=>{const next=new Set(previous);if(on)next.add(key);else next.delete(key);return next})}}/></td>
      <td><strong>{card?.name??entry.id}</strong><small>{[card?.subtitle,card?entry.id:'Catalog match unavailable'].filter(Boolean).join(' · ')}</small></td>
      <td>{entry.count}</td>
      <td>{card?<div className="assembly-aspects">{aspectIcons(card.aspects)}{orderedAspects(card.aspects).join(' / ')||'Neutral'}</div>:'—'}</td>
      <td>{card?.cost??'—'}</td>
      <td>{special?<strong>{special}</strong>:card?'Standard':'—'}{ownedSpecial&&<small>Owned: {ownedSpecial.join(', ')}</small>}</td>
     </tr>;
    })}</tbody>
   </table></div>
  </section>)}
 </section>;
}
