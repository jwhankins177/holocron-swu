'use client';
import {useState} from 'react';
import {X,Download,ArrowUpRight} from 'lucide-react';
import Modal from './modal';
import CardList,{CardArtButton} from './card-list';
import {starterDecks,starterSource,sameDeckList,type StarterDeck} from '../lib/starter-decks';
import type {Card,Deck} from '../lib/model';

export default function StarterDeckPicker({byId,decks,onImport,onClose,initialId=''}:{initialId?:string;byId:ReadonlyMap<string,Card>;decks:Deck[];onImport:(starter:StarterDeck)=>string|undefined;onClose:()=>void}){
 const [id,setId]=useState(initialId),[confirmed,setConfirmed]=useState(false),[error,setError]=useState('');
 const selected=starterDecks.find(deck=>deck.id===id);
 const existing=selected?decks.find(deck=>sameDeckList(deck,selected)):undefined;
 const cardName=(id:string)=>{const card=byId.get(id);return card?card.name+(card.subtitle?' · '+card.subtitle:''):id};
 const unavailable=selected&&[selected.leader,selected.base,...selected.deck.map(x=>x.id)].some(id=>!byId.has(id));
 return <Modal label="Import a starter deck" onDismiss={onClose}><section className="modal starter-picker">
  <button className="close" aria-label="Close starter decks" onClick={onClose}><X/></button>
  <div className="eyebrow">READY TO BUILD ON</div><h2>Import a starter deck</h2>
  <p>Choose from 20 official starters for single-leader play. Import adds a deck to My decks; your collection quantities stay unchanged.</p>
  <label>Starter deck<select autoFocus value={id} onChange={e=>{setId(e.target.value);setConfirmed(false);setError('')}}><option value="">Choose a starter…</option>{[...new Set(starterDecks.map(d=>d.set))].map(set=><optgroup key={set} label={set}>{starterDecks.filter(d=>d.set===set).map(d=><option key={d.id} value={d.id}>{d.name} · {set}</option>)}</optgroup>)}</select></label>
  {selected&&<div className="starter-preview" key={selected.id}>
   <div className="starter-commanders">{([['Leader',selected.leader],['Base',selected.base]] as const).map(([label,id])=><div key={label}><CardArtButton card={byId.get(id)}/><small>{label}</small><strong>{cardName(id)}</strong></div>)}</div>
   <p><strong>{selected.name} · {selected.set} Starter</strong><br/>50 main deck cards · 0 sideboard · 1 leader · 1 base</p>
   <details className="starter-card-list"><summary>Preview all {selected.deck.length} card entries</summary><CardList byId={byId} entries={selected.deck} label="Starter main deck"/></details>
   {unavailable&&<p role="alert">Some cards are missing from this catalog. Import is unavailable until the catalog is updated.</p>}
   {existing?<p className="starter-existing">This exact list is already saved as <strong>{existing.name}</strong>. Open it below.</p>:<label className="starter-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I reviewed this starter and want to add it as a deck.</span></label>}
   {error&&<p role="alert">{error}</p>}
   <button className="primary full" disabled={!!unavailable||!existing&&!confirmed} onClick={()=>{const message=onImport(selected);if(message)setError(message)}}>{existing?<ArrowUpRight size={18}/>:<Download size={18}/>} {existing?'Open existing deck':'Import into My decks'}</button>
  </div>}
  <p className="starter-source">Lists from <a href={starterSource} target="_blank" rel="noopener noreferrer">ForceTable</a> · checked November 9, 2026. Includes the 50-card Hoth decks; excludes Twin Suns. These are the original starter lists; use deck checks for your chosen format.</p>
 </section></Modal>;
}
