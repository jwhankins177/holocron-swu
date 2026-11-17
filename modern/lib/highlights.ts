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
const rarityColors:Record<string,string>={Common:'#92a68f',Uncommon:'#72b8a1',Rare:'#d4ad61',Legendary:'#b5a0df',Special:'#d78b81'};
const typeColors:Record<string,string>={Unit:'#94bd7c',Ground:'#94bd7c',Space:'#80b7d5',Event:'#d0a0d2',Upgrade:'#dfad69',Leader:'#e0c77f',Base:'#9eaa91',Token:'#9ea7b8'};
export function highlightFor(card:Card,settings:HighlightSettings,context:HighlightContext={}):CardHighlight|null{
 if(settings.mode==='off')return null;
 const result=(key:string,label:string,color:string):CardHighlight=>({key,label,color});
 if(settings.mode==='rarity')return result('rarity-'+card.rarity,card.rarity||'Unspecified rarity',rarityColors[card.rarity]??'#9ea7b8');
 if(settings.by==='arena'||settings.by==='type'){
  const type=settings.by==='arena'&&/Unit/.test(card.type)&&card.arena?card.arena:card.type;
  const key=type.includes('Upgrade')?'Upgrade':type.includes('Token')?'Token':type;
  return result('type-'+type,type,typeColors[key]??'#a4b89c');
 }
 if(settings.by==='cost'){
  if(card.cost===null)return result('no-cost','No printed cost','#9ea7b8');
  return result('cost-'+card.cost,`Cost ${card.cost}`,card.cost<=2?'#94bd7c':card.cost<=4?'#e0c77f':card.cost<=6?'#df9b76':'#b5a0df');
 }
 if(settings.by==='premier')return context.premierIds&&!context.premierIds.has(card.id)?result('not-premier','Outside Premier pool','#df927e'):null;
 if(settings.by==='owned'){
  if(!context.ownedByCore)return null;
  const count=context.ownedByCore.get(card.core)??0;
  return count>0?result('owned',`${count} owned`,'#94bd7c'):result('unowned','Not owned','#df927e');
 }
 if(settings.by==='decks')return context.deckCores?.has(card.core)?result('in-decks','In a saved deck','#d4ad61'):null;
 return null;
}
export function highlightLegend(settings:HighlightSettings):CardHighlight[]{
 if(settings.mode==='off')return [];
 if(settings.mode==='rarity')return Object.entries(rarityColors).map(([label,color])=>({key:label,label,color}));
 if(settings.by==='arena'||settings.by==='type')return Object.entries(typeColors).filter(([label])=>settings.by==='arena'?label!=='Unit':!['Ground','Space'].includes(label)).map(([label,color])=>({key:label,label,color}));
 if(settings.by==='cost')return [{key:'low',label:'Cost 0–2',color:'#94bd7c'},{key:'mid',label:'Cost 3–4',color:'#e0c77f'},{key:'high',label:'Cost 5–6',color:'#df9b76'},{key:'top',label:'Cost 7+',color:'#b5a0df'}];
 if(settings.by==='owned')return [{key:'owned',label:'Owned',color:'#94bd7c'},{key:'missing',label:'Not owned',color:'#df927e'}];
 return [{key:settings.by,label:settings.by==='premier'?'Outside Premier pool':'In a saved deck',color:settings.by==='premier'?'#df927e':'#d4ad61'}];
}
