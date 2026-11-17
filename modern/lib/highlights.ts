import type {Card} from './model';
export type HighlightSettings={mode:'off'|'rarity'|'custom';by:'arena'|'type'|'cost'|'premier'|'owned'|'decks';style:'outline'|'corner'|'ribbon'|'glow'};
export type CardHighlight={key:string;label:string;color:string};
export type HighlightContext={premierIds?:ReadonlySet<string>;ownedByCore?:ReadonlyMap<string,number>;deckCores?:ReadonlySet<string>};
export const defaultHighlights:HighlightSettings={mode:'off',by:'arena',style:'outline'};
export function validateHighlightSettings(value:unknown):HighlightSettings{
 const x=value as HighlightSettings;
 if(!x||typeof x!=='object'||Array.isArray(x)||!['off','rarity','custom'].includes(x.mode)||!['arena','type','cost','premier','owned','decks'].includes(x.by)||!['outline','corner','ribbon','glow'].includes(x.style))throw Error('Invalid card highlight settings');
 return {mode:x.mode,by:x.by,style:x.style};
}
export function highlightSettings(settings?:{highlight?:HighlightSettings;rarityBorders?:boolean}):HighlightSettings{return settings?.highlight??{...defaultHighlights,mode:settings?.rarityBorders?'rarity':'off'}}
const rarityColors:Record<string,string>={Common:'#c7dfbd',Uncommon:'#49ffc2',Rare:'#ffd34d',Legendary:'#c893ff',Special:'#ff8eaa'};
const typeColors:Record<string,string>={Unit:'#9cff57',Ground:'#9cff57',Space:'#4cdaff',Event:'#f57aff',Upgrade:'#ffb33f',Leader:'#fff077',Base:'#d5f0b5',Token:'#d9e7ff'};
export function highlightFor(card:Card,settings:HighlightSettings,context:HighlightContext={}):CardHighlight|null{
 if(settings.mode==='off')return null;
 const result=(key:string,label:string,color:string):CardHighlight=>({key,label,color});
 if(settings.mode==='rarity')return result('rarity-'+card.rarity,card.rarity||'Unspecified rarity',rarityColors[card.rarity]??'#d9e7ff');
 if(settings.by==='arena'||settings.by==='type'){
  const type=settings.by==='arena'&&/Unit/.test(card.type)&&card.arena?card.arena:card.type;
  const key=type.includes('Upgrade')?'Upgrade':type.includes('Token')?'Token':type;
  return result('type-'+type,type,typeColors[key]??'#a4b89c');
 }
 if(settings.by==='cost'){
  if(card.cost===null)return result('no-cost','No printed cost','#d9e7ff');
  return result('cost-'+card.cost,`Cost ${card.cost}`,card.cost<=2?'#9cff57':card.cost<=4?'#fff077':card.cost<=6?'#ff9f59':'#c893ff');
 }
 if(settings.by==='premier')return context.premierIds&&!context.premierIds.has(card.id)?result('not-premier','Outside Premier pool','#ff7466'):null;
 if(settings.by==='owned'){
  if(!context.ownedByCore)return null;
  const count=context.ownedByCore.get(card.core)??0;
  return count>0?result('owned',`${count} owned`,'#9cff57'):result('unowned','Not owned','#ff7466');
 }
 if(settings.by==='decks')return context.deckCores?.has(card.core)?result('in-decks','In a saved deck','#ffd34d'):null;
 return null;
}
export function highlightLegend(settings:HighlightSettings):CardHighlight[]{
 if(settings.mode==='off')return [];
 if(settings.mode==='rarity')return Object.entries(rarityColors).map(([label,color])=>({key:label,label,color}));
 if(settings.by==='arena'||settings.by==='type')return Object.entries(typeColors).filter(([label])=>settings.by==='arena'?label!=='Unit':!['Ground','Space'].includes(label)).map(([label,color])=>({key:label,label,color}));
 if(settings.by==='cost')return [{key:'low',label:'Cost 0–2',color:'#9cff57'},{key:'mid',label:'Cost 3–4',color:'#fff077'},{key:'high',label:'Cost 5–6',color:'#ff9f59'},{key:'top',label:'Cost 7+',color:'#c893ff'}];
 if(settings.by==='owned')return [{key:'owned',label:'Owned',color:'#9cff57'},{key:'missing',label:'Not owned',color:'#ff7466'}];
 return [{key:settings.by,label:settings.by==='premier'?'Outside Premier pool':'In a saved deck',color:settings.by==='premier'?'#ff7466':'#ffd34d'}];
}
