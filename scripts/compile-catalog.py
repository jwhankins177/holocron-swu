"""Compile the downloaded SWU-DB sets; enrich keywords from SWU API.
Refresh inputs with GET https://api.swu-db.com/cards/{set} and
https://api.swuapi.com/export/all, then run this script. Never alters ownership.
"""
import json,pathlib,datetime,collections,re
root=pathlib.Path(__file__).resolve().parents[1]; raw=json.loads((root/'data/source.json').read_text()); keywords={}
for c in raw['cards']:
 key=(c['name'],c.get('subtitle') or '',c['type']);keywords.setdefault(key,set()).update(c.get('keywords') or [])
order=['SOR','SHD','TWI','JTL','LOF','IBH','SEC','LAW','ASH','HMW'];order += sorted(p.stem.upper() for p in (root/'data').glob('*.json') if p.stem.upper() not in order+['SOURCE','CATALOG-REPORT']);cards={}
def num(v):
 try:return int(v)
 except:return None
for s in order:
 for c in json.loads((root/f'data/{s.lower()}.json').read_text())['data']:
  n=str(c['Number']);variant=c.get('VariantType','Normal');foil='foil' in variant.lower();n=n[:-1] if n.endswith('F') and foil else n
  id=c['Set']+'_'+(n.zfill(3) if n.isdigit() else n);name=c['Name'];sub=c.get('Subtitle','');typ=c['Type'];key=(name,sub,typ)
  if id in cards and foil:continue
  text=c.get('FrontText','');back=c.get('BackText','');kws=set(keywords.get(key,[]))
  for k in ['Ambush','Sentinel','Restore','Raid','Shielded','Saboteur','Grit','Overwhelm','Bounty','Smuggle','Exploit','Coordinate','Piloting','Hidden','Plot','Fortify']:
   if re.search(r'\b'+k+r'\b',text+' '+back,re.I):kws.add(k)
  cards[id]={'id':id,'name':name,'subtitle':sub,'type':typ,'set':c['Set'],'number':n,'aspects':c.get('Aspects',[]),'traits':[x.title() for x in c.get('Traits',[])],'keywords':sorted(kws),'cost':num(c.get('Cost')),'power':num(c.get('Power')),'hp':num(c.get('HP')),'arena':', '.join(c.get('Arenas',[])),'rarity':c.get('Rarity',''),'artist':c.get('Artist',''),'variant':variant,'image':c.get('FrontArt',''),'back':c.get('BackArt',''),'text':text,'backText':back,'epic':c.get('EpicAction',''),'unique':bool(c.get('Unique')),'core':'|'.join(key),'canonical':'','foilOnly':foil}
groups=collections.defaultdict(list)
for c in cards.values():groups[c['core']].append(c)
for group in groups.values():
 base=min(group,key=lambda c:(c['variant']!='Normal',order.index(c['set']) if c['set'] in order else 999,int(c['number']) if c['number'].isdigit() else 99999))
 for c in group:c['canonical']=base['id']
present=sorted({c['set'] for c in cards.values()},key=lambda s:order.index(s) if s in order else 999)
sets=[{'code':s,'name':next((x['name'] for x in raw['sets'] if x['code']==s),s)} for s in present]
out={'cards':list(cards.values()),'sets':sets,'updated':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sources':['https://www.swu-db.com/api','https://www.swuapi.com/docs']}
(root/'public/catalog.json').write_text(json.dumps(out,separators=(',',':')))
print(json.dumps({'printings':len(cards),'gameplayCards':len(groups),'missingImages':sum(not c['image'] for c in cards.values()),'sets':{s:sum(c['set']==s for c in cards.values()) for s in order}},indent=2))
