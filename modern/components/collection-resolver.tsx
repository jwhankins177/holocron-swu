'use client';

import {useId,useMemo,useRef,useState} from 'react';
import {Check,Search,X} from 'lucide-react';
import Modal from './modal';
import CardList,{CardArtButton} from './card-list';
import {effectiveCollection,normalizeId,resolutionPreview,setCollectionResolution,type Card,type CollectionResolution,type Workspace} from '../lib/model';

type Props={workspace:Workspace;cards:Card[];sourceId:string;onSave:(resolution:CollectionResolution|null)=>boolean;onDismiss:()=>void};
type Preview={workspace:Workspace;cards:Card[];resolution:CollectionResolution|null;impact:ReturnType<typeof resolutionPreview>;previous?:{id:string;before:{normal:number;foil:number};after:{normal:number;foil:number}}};
const choices:{kind:CollectionResolution['kind'];title:string;description:string}[]=[
 {kind:'catalog',title:'Map to catalog',description:'Match an existing card or token.'},
 {kind:'token',title:'Keep as a token',description:'Track a token missing from the catalog.'},
 {kind:'non-catalog',title:'Other collection item',description:'Keep a non-catalog item in your collection.'},
 {kind:'ignored',title:'Ignore this warning',description:'Dismiss the warning and keep every copy.'},
];
const readableKind=(kind:CollectionResolution['kind'])=>choices.find(choice=>choice.kind===kind)!.title;
const destination=(resolution:CollectionResolution|undefined,sourceId:string)=>resolution?.kind==='catalog'?resolution.targetId!:resolution?.correctedId||sourceId;

export default function CollectionResolver(props:Props){return <ResolverDialog key={props.sourceId} {...props}/>}

function ResolverDialog({workspace,cards,sourceId,onSave,onDismiss}:Props){
 const saved=workspace.resolutions?.find(resolution=>resolution.sourceId===sourceId);
 const [kind,setKind]=useState<CollectionResolution['kind']>(saved?.kind||'catalog');
 const [query,setQuery]=useState(sourceId);
 const [targetId,setTargetId]=useState(saved?.targetId||'');
 const [correctedId,setCorrectedId]=useState(saved?.correctedId||'');
 const [name,setName]=useState(saved?.name||'');
 const [clearing,setClearing]=useState(false);
 const [reviewed,setPreview]=useState<Preview|null>(null);
 const preview=reviewed?.workspace===workspace&&reviewed.cards===cards?reviewed:null;
 const [error,setError]=useState('');
 const prefix=useId();
 const previewRef=useRef<HTMLDivElement>(null);
 const byId=useMemo(()=>new Map(cards.map(card=>[card.id,card])),[cards]);
 const original=useMemo(()=>workspace.collection.filter(row=>row.id===sourceId),[workspace.collection,sourceId]);
 const sourceTotals=original.reduce((total,row)=>({...total,[row.foil?'foil':'normal']:total[row.foil?'foil':'normal']+row.count}),{normal:0,foil:0});
 const results=useMemo(()=>{
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if(!terms.length)return {cards:[] as Card[],count:0};
  const matching=cards.filter(card=>{
   const text=`${card.name} ${card.subtitle} ${card.id} ${card.id.replace('_',' ')} ${card.type} ${card.set} ${card.number} ${card.variant}`.toLowerCase();
   return terms.every(term=>text.includes(term));
  });
  return {cards:matching.slice(0,24),count:matching.length};
 },[cards,query]);
 const selectedCard=useMemo(()=>{try{return targetId.trim()?byId.get(normalizeId(targetId)):undefined}catch{return undefined}},[byId,targetId]);

 function edit(update:()=>void){update();setPreview(null);setError('')}
 function showPreview(){
  try{
   if(!clearing&&kind==='catalog'&&!targetId.trim())throw Error('Choose a catalog result or enter a catalog ID before previewing.');
   const resolution:CollectionResolution|null=clearing?null:kind==='catalog'
    ?{sourceId,kind,targetId:normalizeId(targetId)}
    :{sourceId,kind,...(kind!=='ignored'&&correctedId.trim()?{correctedId:normalizeId(correctedId)}:{}),...(kind!=='ignored'&&name.trim()?{name:name.trim()}:{})};
   const impact=resolutionPreview(workspace,sourceId,resolution,byId);
   const next=setCollectionResolution(workspace,resolution,sourceId,byId);
   const previousId=destination(saved,sourceId);
   const countAt=(data:Workspace,id:string)=>effectiveCollection(data).filter(row=>row.id===id).reduce((total,row)=>({...total,[row.foil?'foil':'normal']:total[row.foil?'foil':'normal']+row.count}),{normal:0,foil:0});
   const previous=saved&&previousId!==impact.destinationId?{id:previousId,before:countAt(workspace,previousId),after:countAt(next,previousId)}:undefined;
   setPreview({workspace,cards,resolution,impact,previous});setError('');
   requestAnimationFrame(()=>previewRef.current?.focus({preventScroll:false}));
  }catch(cause){setPreview(null);setError(cause instanceof Error?cause.message:'Check the details and try again.')}
 }
 function save(){
  if(!preview)return;
  try{if(!onSave(preview.resolution))setError('The resolution could not be saved. Your original rows are unchanged. Please try again.')}
  catch(cause){setError(cause instanceof Error?cause.message:'The resolution could not be saved. Please try again.')}
 }

 return <Modal label={`Resolve collection row ${sourceId}`} onDismiss={onDismiss}>
  <section className="modal collection-resolver" aria-labelledby={`${prefix}-title`}>
   <button type="button" className="close" onClick={onDismiss} aria-label="Close resolution without saving"><X size={20}/></button>
   <div className="eyebrow">COLLECTION RESOLUTION</div>
   <h2 id={`${prefix}-title`}>Resolve this collection row</h2>
   <p>Choose how Holocron should recognize this item. Your original import and every normal and foil copy are preserved.</p>
   <div className="resolver-source">
    <div><span>Imported ID</span><strong>{sourceId}</strong></div>
    <div className="resolver-finishes"><span>Normal <b>×{sourceTotals.normal}</b></span><span>Foil <b>×{sourceTotals.foil}</b></span></div>
   </div>
   {saved&&<div className="resolver-saved"><p><strong>Saved decision:</strong> {readableKind(saved.kind)}{destination(saved,sourceId)!==sourceId?` → ${destination(saved,sourceId)}`:''}{saved.name?` · ${saved.name}`:''}</p><button type="button" onClick={()=>edit(()=>setClearing(!clearing))}>{clearing?'Keep editing decision':'Undo saved decision'}</button></div>}
   {clearing?<div className="resolver-explanation"><h3>{byId.has(sourceId)?'Restore the imported row':'Return this row to unresolved'}</h3><p>Remove this saved decision and restore the imported ID, {sourceId}. The normal and foil quantities stay intact. Preview the change before saving.</p></div>:<>
    <fieldset className="resolver-choices">
     <legend>How would you like to resolve it?</legend>
     {choices.map(choice=><label key={choice.kind} className={kind===choice.kind?'is-selected':''}>
      <input type="radio" name={`${prefix}-kind`} value={choice.kind} checked={kind===choice.kind} onChange={()=>edit(()=>setKind(choice.kind))}/>
      <span><strong>{choice.title}</strong><small>{choice.description}</small></span>
     </label>)}
    </fieldset>
    {kind==='catalog'?<div className="resolver-catalog">
     <label htmlFor={`${prefix}-search`}>Search cards and tokens</label>
     <div className="resolver-search"><Search size={17} aria-hidden="true"/><input id={`${prefix}-search`} type="search" value={query} placeholder="Name, subtitle, ID, type or set…" onChange={event=>edit(()=>setQuery(event.target.value))}/></div>
     <p className="resolver-help">Search the full catalog, including alternate printings and available tokens. Select the exact printing you own.</p>
     <div className="resolver-search-status" role="status" aria-live="polite">{query.trim()?results.count?`${results.count.toLocaleString()} ${results.count===1?'match':'matches'}${results.count>24?' · showing the first 24; refine your search to see more.':''}`:'No catalog matches. Try a card name or set, or keep the item as a token or other collection item.':'Enter a name, ID, type or set to search.'}</div>
     {results.cards.length>0&&<CardList byId={byId} entries={results.cards.map(card=>({id:card.id,detail:card.id===selectedCard?.id?'Selected printing':card.variant}))} label="Catalog search results" onSelect={card=>edit(()=>setTargetId(card.id))} selectLabel="Map to this card"/>}
     <label htmlFor={`${prefix}-target`}>Catalog ID <span>(select above or enter an exact ID)</span></label>
     <input id={`${prefix}-target`} value={targetId} placeholder="Example: SOR_001" maxLength={80} spellCheck={false} onChange={event=>edit(()=>setTargetId(event.target.value))} aria-describedby={`${prefix}-target-help`}/>
     <p id={`${prefix}-target-help`} className={`resolver-help${selectedCard?' resolver-match':''}`}>{selectedCard?`Selected: ${selectedCard.name}${selectedCard.subtitle?` — ${selectedCard.subtitle}`:''} · ${selectedCard.id}`:'The destination must already exist in the catalog. No match is selected automatically.'}</p>
    </div>:kind==='ignored'?<div className="resolver-explanation"><h3>Dismiss the warning without losing data</h3><p>This row stays in your collection and exports with its original ID and quantities. It will leave the unresolved list. You can revisit it under saved resolutions at any time.</p></div>:<div className="resolver-classify">
     <div className="resolver-explanation"><p>{kind==='token'?'Keep this as a token even when the catalog has no matching entry.':'Keep this as an item outside the card catalog.'} It stays in your collection and exports, and leaves the unresolved list.</p></div>
     <div className="resolver-fields">
      <label htmlFor={`${prefix}-name`}>Display name <span>(optional)</span><input id={`${prefix}-name`} value={name} maxLength={200} placeholder={kind==='token'?'Example: Battle Droid token':'Describe this item'} onChange={event=>edit(()=>setName(event.target.value))}/></label>
      <label htmlFor={`${prefix}-corrected`}>Corrected ID <span>(optional)</span><input id={`${prefix}-corrected`} value={correctedId} maxLength={80} spellCheck={false} placeholder={sourceId} onChange={event=>edit(()=>setCorrectedId(event.target.value))}/></label>
     </div>
     <p className="resolver-help">Leave the corrected ID blank to keep {sourceId}. Use a set and number such as HMW_T001. If the ID exists in the catalog, choose “Map to catalog.”</p>
    </div>}
   </>}
   {error&&<p className="resolver-error" role="alert">{error}</p>}
   <div className="resolver-preview-action"><button type="button" onClick={showPreview}>{preview?'Refresh impact preview':'Preview impact'}</button><span>Review quantities before saving.</span></div>
   {preview&&<div className="resolver-impact" ref={previewRef} tabIndex={-1} aria-labelledby={`${prefix}-impact`}>
    <div className="resolver-impact-heading"><Check size={18} aria-hidden="true"/><h3 id={`${prefix}-impact`}>Impact preview</h3></div>
    <p><strong>{clearing?'Restore imported ID':kind==='ignored'?'Keep original ID':'Destination'}:</strong> {preview.impact.destinationId}{preview.resolution?.name?` · ${preview.resolution.name}`:''}</p>
    <div className="resolver-impact-table"><table><caption>Quantities at {preview.impact.destinationId} after this decision</caption><thead><tr><th scope="col">Finish</th><th scope="col">From this row</th><th scope="col">Already there</th><th scope="col">After save</th></tr></thead><tbody>
     {(['normal','foil'] as const).map(finish=><tr key={finish}><th scope="row">{finish==='foil'?'Foil':'Normal'}</th><td>{preview.impact.source[finish]}</td><td>{preview.impact.existing[finish]}</td><td><strong>{preview.impact.after[finish]}</strong></td></tr>)}
    </tbody></table></div>
    <p>{preview.impact.combines?'Existing quantities and this row are combined once, separately for each finish.':'All quantities and finishes stay intact.'} Saving or editing the decision never adds a second copy of the original row.</p>
    {preview.previous&&<p className="resolver-previous"><strong>Previous destination {preview.previous.id}:</strong> normal {preview.previous.before.normal} → {preview.previous.after.normal}; foil {preview.previous.before.foil} → {preview.previous.after.foil}. Only this source’s contribution moves.</p>}
    <div className="resolver-unresolved-count">Unresolved rows <strong>{preview.impact.unresolvedBefore} → {preview.impact.unresolvedAfter}</strong></div>
    <p className="resolver-preservation">Your original row is retained so this decision can be undone. Saved resolutions travel with Holocron backups and collection exports.</p>
   </div>}
   <footer className="resolver-footer"><button type="button" onClick={onDismiss}>Cancel</button><button type="button" className="primary" disabled={!preview} onClick={save}>{clearing?'Save undo locally':'Save resolution locally'}</button></footer>
  </section>
 </Modal>;
}
