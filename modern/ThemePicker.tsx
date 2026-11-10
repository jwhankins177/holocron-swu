import type {HolocronTheme} from './lib/model';

const themeOptions:{id:HolocronTheme;name:string;description:string;colors:[string,string,string,string]}[]=[
 {id:'dark',name:'Classic night',description:'The current Holocron look',colors:['#111B18','#1C2A25','#2D715F','#E2EAE6']},
 {id:'light',name:'Soft day',description:'Warm, low-glare light',colors:['#F6F7F1','#E8EDE2','#194D43','#243A37']},
 {id:'moss',name:'Moss & Brass',description:'Deep forest and antique gold',colors:['#20261F','#2F392D','#B89A5A','#E6DDC8']},
 {id:'clay',name:'Clay & Walnut',description:'Warm brown and terracotta',colors:['#241D19','#3A2B23','#C0805F','#E8D7C2']},
 {id:'olive',name:'Olive & Sandstone',description:'Olive green and soft sand',colors:['#29291F','#3C3D2C','#C6AC73','#E7DFC8']},
 {id:'umber',name:'Umber & Sage',description:'Earthy charcoal and sage',colors:['#25231E','#363A30','#91A181','#E5DCC9']},
];

export function normalizeTheme(value:string|null):HolocronTheme{return themeOptions.find(option=>option.id===value)?.id??'dark'}

export default function ThemePicker({theme,onSelect,disabled=false}:{theme:HolocronTheme;onSelect:(theme:HolocronTheme)=>void;disabled?:boolean}){
 const active=themeOptions.find(option=>option.id===theme)??themeOptions[0];
 return <details className="theme-picker"><summary aria-label={`Color theme: ${active.name}`}>Theme · {active.name}</summary><div className="theme-options" role="group" aria-label="Color themes">{themeOptions.map(option=><button type="button" key={option.id} aria-pressed={theme===option.id} disabled={disabled} onClick={event=>{onSelect(option.id);event.currentTarget.closest('details')?.removeAttribute('open')}}><span className="theme-swatches" aria-hidden="true">{option.colors.map((color,index)=><i key={index} style={{backgroundColor:color}}/>)}</span><span className="theme-option-copy"><strong>{option.name}</strong><small>{option.description}</small></span><span className="theme-check" aria-hidden="true">{theme===option.id?'✓':''}</span></button>)}</div></details>;
}
