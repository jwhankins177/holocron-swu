'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import type {Card} from '../lib/model';
import {cardTitle} from '../lib/insights';
import {useCardHighlight,HighlightBadge} from '../HighlightOptions';
import Modal from './modal';

export type CardListEntry={id:string;count?:number;detail?:string;values?:(string|number)[];key?:string};
function ImageFace({card,back=false}:{card:Card|undefined;back?:boolean}){
 const source=back&&card?.back?card.back:card?.image;
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[source]);
 return source&&!failed?<img loading="lazy" src={source} alt={cardTitle(card)} onError={()=>setFailed(true)}/>:<span className="shared-art-fallback"><strong>{card?.name??'Unknown card'}</strong><small>Artwork unavailable</small>{card?.text&&<span>{card.text}</span>}</span>;
}
function HighlightArtwork({card,back=false}:{card:Card;back?:boolean}){
 const {highlight,style}=useCardHighlight(card);
 return <span className={'shared-highlight-art card-preview-art'+(['Leader','Base'].includes(card.type)&&!back?' landscape':'')} data-highlight={highlight?style:undefined} style={highlight?{'--highlight-color':highlight.color} as CSSProperties:undefined} title={highlight?.label}><ImageFace card={card} back={back}/><HighlightBadge highlight={highlight}/></span>;
}
function Artwork({card,back=false}:{card:Card|undefined;back?:boolean}){return card?<HighlightArtwork card={card} back={back}/>:<ImageFace card={card}/>}
export function CardPreview({card,onClose}:{card:Card;onClose:()=>void}){
 const [back,setBack]=useState(false);
 return <Modal label={`Card image: ${cardTitle(card)}`} onDismiss={onClose}><section className="modal shared-card-preview"><div className="shared-card-preview-heading"><strong>{cardTitle(card)}</strong><button type="button" onClick={onClose} aria-label="Close card image">Close</button></div><div className={'shared-card-preview-art'+(['Leader','Base'].includes(card.type)&&!back?' landscape':'')}><Artwork card={card} back={back}/></div>{card.back&&<button type="button" onClick={()=>setBack(!back)}>{back?'Show front':'Show reverse'}</button>}<p>{card.id} · {card.type}{card.cost!==null?' · Cost '+card.cost:''}</p>{card.text&&<details><summary>Read card text</summary><p>{back&&card.backText?card.backText:card.text}</p></details>}</section></Modal>;
}
export function CardArtButton({card,onInspect,className=''}:{card:Card|undefined;onInspect?:(card:Card)=>void;className?:string}){
 const [open,setOpen]=useState(false);
 return <><button type="button" className={'shared-art-button '+className} disabled={!card} aria-label={card?'View '+cardTitle(card)+' card image':'Unknown card artwork'} onClick={()=>{if(card){if(onInspect)onInspect(card);else setOpen(true)}}}><Artwork card={card}/></button>{open&&card&&<CardPreview card={card} onClose={()=>setOpen(false)}/>}</>;
}
export default function CardList({byId,entries,label='Cards',columns=[],onSelect,selectLabel='Choose card',initialView='images'}:{byId:ReadonlyMap<string,Card>;entries:CardListEntry[];label?:string;columns?:string[];onSelect?:(card:Card)=>void;selectLabel?:string;initialView?:'images'|'table'|'large'}){
 const [view,setView]=useState(initialView),[selected,setSelected]=useState<Card|null>(null);
 const entryInfo=(entry:CardListEntry)=><>{entry.count!==undefined&&<strong>{entry.count}× </strong>}{entry.detail&&<span>{entry.detail}</span>}</>;
 return <section className="shared-card-list" aria-label={label}><div className="shared-card-list-controls"><strong>{label} · {entries.length}</strong><div role="group" aria-label={`${label} display`}><button type="button" aria-pressed={view==='images'} onClick={()=>setView('images')}>Images</button><button type="button" aria-pressed={view==='table'} onClick={()=>setView('table')}>Table</button><button type="button" aria-pressed={view==='large'} onClick={()=>setView('large')}>One card</button></div></div>{view==='table'?<div className="table-scroll"><table><thead><tr><th>Card</th><th>Details</th>{columns.map(column=><th key={column}>{column}</th>)}{onSelect&&<th>Choose</th>}</tr></thead><tbody>{entries.map((entry,i)=>{const card=byId.get(entry.id);return <tr key={entry.key??entry.id+'-'+i}><td><button type="button" className="shared-card-name" disabled={!card} onClick={()=>card&&setSelected(card)}>{cardTitle(card,entry.id)}</button><small>{entry.id}</small></td><td>{entryInfo(entry)}</td>{columns.map((column,index)=><td key={column}>{entry.values?.[index]??'—'}</td>)}{onSelect&&<td><button type="button" disabled={!card} onClick={()=>card&&onSelect(card)}>{selectLabel}</button></td>}</tr>})}</tbody></table></div>:<div className={'shared-card-grid'+(view==='large'?' shared-card-grid-large':'')}>{entries.map((entry,i)=>{const card=byId.get(entry.id);return <article className="shared-card-tile" key={entry.key??entry.id+'-'+i}><button type="button" className="shared-card-image" disabled={!card} aria-label={card?'View '+cardTitle(card)+' card image':entry.id+' artwork unavailable'} onClick={()=>card&&setSelected(card)}><Artwork card={card}/></button><strong>{cardTitle(card,entry.id)}</strong><small>{entry.id}</small><div>{entryInfo(entry)}</div>{columns.length>0&&<dl>{columns.map((column,index)=><div key={column}><dt>{column}</dt><dd>{entry.values?.[index]??'—'}</dd></div>)}</dl>}{onSelect&&<button type="button" disabled={!card} onClick={()=>card&&onSelect(card)}>{selectLabel}</button>}</article>})}</div>}{entries.length===0&&<p>No cards in this view.</p>}{selected&&<CardPreview card={selected} onClose={()=>setSelected(null)}/>}</section>;
}
