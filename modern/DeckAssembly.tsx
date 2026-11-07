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

function isSpecial(card:Card,foil=false){
 return foil||card.foilOnly||Boolean(card.variant&&card.variant!=='Normal');
}

export default function DeckAssembly({deck,byId,collection,onBack,aspectIcons}:Props){
 const [checked,setChecked]=useState<Set<string>>(new Set());
 const quantities=new Map<string,number>();
 const ownedCopies=new Map<string,number>();
 const specialCopies=new Set<string>();
 for(const row of collection){
  if(row.count<=0)continue;
  const card=byId.get(row.id);
  const key=card?.core??row.id;
  ownedCopies.set(key,(ownedCopies.get(key)??0)+row.count);
  if(card&&isSpecial(card,row.foil))specialCopies.add(key);
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
  <p>Check a row after pulling all copies. Special means the deck uses a special printing or you own one.</p>
  <div className="actions assembly-progress">
   <strong role="status">{pulled} of {total} copies pulled</strong>
   <button disabled={!checked.size} onClick={()=>setChecked(new Set())}>Clear checks</button>
  </div>
  {total===0&&<p>This deck has no cards to assemble yet.</p>}
  {sections.filter(section=>section.entries.length>0).map(section=><section className="assembly-section" key={section.name}>
   <h3>{section.name}</h3>
   <div className="table-scroll"><table>
    <thead><tr><th scope="col">Done</th><th scope="col" aria-label="Card image"></th><th scope="col">Card</th><th scope="col">Need</th><th scope="col">Owned</th><th scope="col">Color</th><th scope="col">Cost</th><th scope="col">Special</th></tr></thead>
    <tbody>{section.entries.map(entry=>{
     const key=section.name+':'+entry.id;
     const card=byId.get(entry.id);
     const copyKey=card?.core??entry.id;
     const special=card&&(isSpecial(card)||specialCopies.has(copyKey));
     const aspects=card?orderedAspects(card.aspects).join(', '):'';
     return <tr key={key}>
      <td><label className="assembly-check"><input type="checkbox" aria-label={`Pulled ${entry.count} × ${card?.name??entry.id} (${entry.id}) from ${section.name}`} checked={checked.has(key)}
       onChange={event=>{const on=event.target.checked;setChecked(previous=>{const next=new Set(previous);if(on)next.add(key);else next.delete(key);return next})}}/></label></td>
      <td>{card?.image&&<img className="assembly-thumbnail" src={card.image} alt="" loading="lazy" decoding="async"/>}</td>
      <td><strong>{card?.name??entry.id}</strong><small>{card?card.subtitle:'Catalog match unavailable'}</small></td>
      <td>{entry.count}</td>
      <td>{ownedCopies.get(copyKey)??0}</td>
      <td>{card&&<span className="assembly-aspects" role="img" aria-label={aspects||'Neutral'}>{aspects?aspectIcons(card.aspects):<span className="dots assembly-neutral"><span/></span>}</span>}</td>
      <td>{card?.cost??'—'}</td>
      <td>{card?<abbr aria-label={special?'Yes':'No'}>{special?'Y':'N'}</abbr>:'—'}</td>
     </tr>;
    })}</tbody>
   </table></div>
  </section>)}
 </section>;
}
