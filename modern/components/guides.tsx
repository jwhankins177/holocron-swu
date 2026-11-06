import {useState,useRef} from 'react';
import {BookOpen,Search,ArrowLeft,ArrowUpRight} from 'lucide-react';
import {guides} from '../lib/guides';
import type {Card} from '../lib/model';
const sources:Record<string,{name:string;url:string}>={collecting:{name:'FFG: Booster Pack Breakdown',url:'https://starwarsunlimited.com/articles/boosting-ahead-of-release'},ashes:{name:'FFG: Ashes of the Empire',url:'https://starwarsunlimited.com/products/set-8-ashes-of-the-empire'},secrets:{name:'FFG: Secrets of Power',url:'https://starwarsunlimited.com/articles/secrets-of-power'},rules:{name:'Official rules, errata & restrictions',url:'https://starwarsunlimited.com/how-to-play?chapter=rules'},construction:{name:'FFG: Under Construction',url:'https://starwarsunlimited.com/articles/under-construction'},piloting:{name:'FFG: Piloting rules update',url:'https://starwarsunlimited.com/articles/comprehensive-rules-update-lightspeed'},homeworlds:{name:'FFG: Homeworlds mechanics',url:'https://starwarsunlimited.com/articles/homeworlds'},premier:{name:'Official Premier format',url:'https://starwarsunlimited.com/how-to-play?chapter=premier'}};
const keywords:[string,string][]=[
 ['Ambush','When played, the unit may ready and attack an enemy unit. It does not grant a free attack on a base.'],
 ['Bounty','The opponent may collect the listed reward when the unit is defeated or captured. Read the exact reward.'],
 ['Coordinate','The listed ability is active while you control at least three units.'],
 ['Exploit','While playing this card, defeat up to the indicated number of your units; each reduces the cost by two.'],
 ['Fortify','This upgrade attaches to your base. Its own text explains the effect; the keyword is not a universal damage reduction.'],
 ['Grit','The unit gets one extra power for each damage on it. Damage still counts against its HP.'],
 ['Hidden','A unit with Hidden cannot be attacked if it was played this phase. It is not general immunity to events or abilities. Check interactions such as also having Sentinel.'],
 ['Overwhelm','When attacking a unit, excess combat damage can reach the defending player’s base. Check Shields and unusual damage interactions.'],
 ['Piloting','Play the card as an upgrade on a legal friendly Vehicle using its Piloting cost instead of its normal unit mode.'],
 ['Plot','When you deploy a leader, you may play this card from your resources, paying its cost, and replace that resource with your deck’s top card.'],
 ['Raid','Adds the stated amount of power while the unit is attacking. It does not increase HP.'],
 ['Restore','When the unit attacks, heal the stated amount from your base. It does not heal the attacker.'],
 ['Saboteur','The attacker can ignore Sentinel and defeats the defender’s Shields as part of its attack ability.'],
 ['Sentinel','Restricts the opponent’s attacks in this unit’s arena: they must attack a Sentinel there unless an effect allows otherwise.'],
 ['Shielded','When played, the unit gains a Shield token. This does not continuously replace a lost Shield.'],
 ['Smuggle','Play this card out of your resource zone for its Smuggle cost and replace the resource with your deck’s top card.'],
 ['Support','When played—or deployed for a leader with Support—the ability may let another unit attack with the supporting unit’s other abilities for that attack. Read the card’s exact trigger.']
];
export default function Guides({cards,onCard,onKeyword}:{cards:Card[];onCard:(card:Card)=>void;onKeyword:(keyword:string)=>void}){
 const [query,setQuery]=useState(''),[category,setCategory]=useState('All'),[selected,setSelected]=useState('');
 const heading=useRef<HTMLHeadingElement>(null);
 const guide=guides.find(g=>g.id===selected);
 const filtered=guides.filter(g=>(category==='All'||g.category===category)&&[g.title,g.summary,...g.sections.flatMap(s=>[s.title,s.body]),...(g.id==='keywords'?keywords.flat():[])].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 function choose(id:string){setSelected(id);requestAnimationFrame(()=>{heading.current?.focus();heading.current?.scrollIntoView({block:'start',behavior:'smooth'})})}
 return <section className="guides-area" aria-label="SWU guides">
 {guide?<>
 <button className="guide-back" onClick={()=>choose('')}><ArrowLeft size={16}/>All guides</button>
 <article className="guide-reader"><div className="eyebrow">{guide.category}</div><h2 tabIndex={-1} ref={heading}>{guide.title}</h2><p className="guide-intro">{guide.summary}</p><nav className="guide-toc" aria-label="In this guide">{guide.sections.map((s,i)=><a href={'#guide-section-'+i} key={s.title}>{s.title}</a>)}</nav>
 {guide.sections.map((s,i)=><section id={'guide-section-'+i} key={s.title}><h3>{s.title}</h3><p>{s.body}</p></section>)}
 {guide.id==='keywords'&&<div className="keyword-grid">{keywords.map(([name,body])=><section key={name}><h3>{name}</h3><p>{body}</p><button onClick={()=>onKeyword(name)}>Find cards <ArrowUpRight size={14}/></button></section>)}</div>}
 {guide.cards.length>0&&<section><h3>Read the cards</h3><div className="guide-card-links">{guide.cards.map(id=>{const c=cards.find(c=>c.id===id);return c?<button key={id} onClick={()=>onCard(c)}><img src={c.image} alt="" loading="lazy"/><span><strong>{c.name}</strong><small>{c.subtitle||c.type} · {c.id}</small></span><BookOpen size={17}/></button>:<span key={id}>{id} · catalog loading</span>})}</div></section>}
 <footer className="guide-sources"><strong>References & scope</strong><p>Rules references checked November 2, 2026. Strategy notes are practical guidance, not current tournament rankings. Card text comes from the bundled catalog; current official errata takes precedence.</p>{guide.sources.map(key=><span className="guide-reference" key={key}>{sources[key].name}</span>)}</footer></article>
 </>:<><div className="guide-hero"><BookOpen size={32}/><div><h2 tabIndex={-1} ref={heading}>Your SWU field guide</h2><p>From your first turn to your next deck. Practical answers for building, collecting, and playing.</p></div><span>{guides.length} guides</span></div><div className="guide-tools"><label className="search"><Search size={18}/><input aria-label="Search guides" placeholder="Deckbuilding, pilots, healing, tokens…" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="guide-categories" aria-label="Guide categories">{['All',...new Set(guides.map(g=>g.category))].map(c=><button key={c} aria-pressed={category===c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c}</button>)}</div></div><div className="guide-grid">{filtered.map(g=><button key={g.id} className="guide-tile" onClick={()=>choose(g.id)}><span className="eyebrow">{g.category}</span><h3>{g.title}</h3><p>{g.summary}</p><span className="guide-read">Read guide <ArrowUpRight size={17}/></span></button>)}</div>{!filtered.length&&<div className="empty"><h3>No guides match that search</h3><button onClick={()=>{setQuery('');setCategory('All')}}>Clear guide filters</button></div>}<p className="guide-footnote">Start with “Your first game,” then “Build a deck from a game plan.” The reference guides stay close when you need a quick answer.</p></>}
 </section>
}
