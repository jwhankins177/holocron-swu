export type Release={version:string;date:string;title:string;changes:string[]};
// Add each published release here. The Updates page displays the latest five.
export const releases:Release[]=[
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
