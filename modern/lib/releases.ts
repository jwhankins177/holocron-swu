export type Release={version:string;date:string;title:string;changes:string[]};
// Add each published release here. The Updates page displays the latest five.
export const releases:Release[]=[
 {version:'2.9.5',date:'2026-11-16',title:'Balanced logo spacing',changes:['Added comfortable padding around the home logo and centered the icon, title and subtitle on desktop and mobile.']},
 {version:'2.9.4',date:'2026-11-16',title:'High-visibility card highlights',changes:['Doubled outline thickness, added a strong inner halo, and replaced muted highlight colors with vivid colors matched to the legend.']},
 {version:'2.9.3',date:'2026-11-16',title:'Brighter card borders',changes:['Brighter colored card outlines with a subtle halo, plus a stronger Soft glow option.']},
 {version:'2.9.2',date:'2026-11-16',title:'Card highlight layering',changes:['Card outlines and glow rings now render above the artwork, keeping the complete border visible without blocking card controls.']},
 {version:'2.9.1',date:'2026-11-16',title:'See your cards, keep your game plan close',changes:['Choose rarity or custom card highlights by arena, type, cost, Premier eligibility, ownership or saved-deck membership.','Choose outline, corner, ribbon or glow overlays.','Refreshed the card detail screen and brighter, cleaner logo. Version information moved to the bottom of Options.','Added artwork and one-card views to card selection and supporting lists.','Prefilled practice plans for saved decks and fresh matches while preserving your edited notes.']},
 {version:'2.9.0',date:'2026-11-16',title:'Your collection, ready for game night',changes:[
  'Daily catalog checks with a last-good snapshot, visible refresh status, and official news links.',
  'Find saved and starter decks closest to what you own, and owned alternatives for missing cards.',
  'Compare decks and saved versions; review format warnings across your decks.',
  'Collection and deck achievements with set completion progress.',
  'Save match results from the live damage pad and review matchup statistics.',
  'Deck practice notes for openings, resources, and matchups, accessible while playing.',
  'Options → Updates now lists the last five published releases.'
 ]},
 {version:'2.8.1',date:'2026-11-10',title:'Battle Lab presentation',changes:['Improved the Battle Lab screen and card controls.']},
 {version:'2.8.0',date:'2026-11-10',title:'Battle Lab',changes:['Added the separate Battle Lab tool for testing against an AI opponent.']},
 {version:'2.7.20',date:'2026-11-09',title:'Solo table sizing',changes:['Added a cards-across control to the solo table.']},
 {version:'2.7.19',date:'2026-11-09',title:'Responsive lists',changes:['Long list names wrap inside narrow screens without widening the page.']}
];
