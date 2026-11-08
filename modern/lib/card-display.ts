import type {Card} from './model';

export const sortLabels = {
  name: 'Card name', aspects: 'Color / aspects', cost: 'Cost', power: 'Power', hp: 'HP',
  owned: 'Quantity owned', foil: 'Foil quantity', text: 'Ability text', set: 'Set & number',
  type: 'Card type', rarity: 'Rarity', variant: 'Art variant', artist: 'Artist',
  arena: 'Arena', traits: 'Traits', keywords: 'Keywords',
};
type SortKey = keyof typeof sortLabels;
export type SortRule = {key: SortKey; direction: 'asc' | 'desc'};
export const defaultSort: SortRule[] = [{key: 'cost', direction: 'asc'}, {key: 'aspects', direction: 'asc'}];
export const aspectOrder = ['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy'];
const aspectRank = (aspect: string) => {
  const rank = aspectOrder.indexOf(aspect);
  return rank < 0 ? aspectOrder.length : rank;
};
export function orderedAspects(aspects: readonly string[]) {
  return [...aspects].sort((a,b) => aspectRank(a) - aspectRank(b) || a.localeCompare(b));
}
export function compareAspects(a: readonly string[], b: readonly string[]) {
  if (!a.length || !b.length) return Number(!a.length) - Number(!b.length);
  const left = orderedAspects(a), right = orderedAspects(b);
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const difference = aspectRank(left[i]) - aspectRank(right[i]) || left[i].localeCompare(right[i]);
    if (difference) return difference;
  }
  return left.length - right.length;
}
export function sortRule(key: SortKey): SortRule {
  return {key, direction: ['power', 'hp', 'owned', 'foil'].includes(key) ? 'desc' : 'asc'};
}

export function compareCards(a: Card, b: Card, rules: SortRule[], owned: Map<string, number>, foils: Map<string, number>) {
  for (const {key, direction} of rules) {
    let difference: number;
    if (key === 'cost' || key === 'power' || key === 'hp') {
      const left = a[key], right = b[key];
      if (left === null && right === null) continue;
      if (left === null) return 1;
      if (right === null) return -1;
      difference = left - right;
    } else if (key === 'owned' || key === 'foil') {
      const counts = key === 'owned' ? owned : foils;
      difference = (counts.get(key === 'owned' ? a.core : a.id) ?? 0) -
        (counts.get(key === 'owned' ? b.core : b.id) ?? 0);
    } else if (key === 'set') {
      difference = a.set.localeCompare(b.set) || a.number.localeCompare(b.number, undefined, {numeric: true});
    } else if (key === 'aspects') {
      difference = compareAspects(a.aspects, b.aspects);
    } else if (key === 'name') {
      difference = a.name.localeCompare(b.name) || a.subtitle.localeCompare(b.subtitle);
    } else {
      difference = String(a[key]).localeCompare(String(b[key]));
    }
    if (difference) return direction === 'desc' ? -difference : difference;
  }
  return a.name.localeCompare(b.name) || a.subtitle.localeCompare(b.subtitle) || a.id.localeCompare(b.id);
}

export const emptyFilters = {
  q: '', aspect: [] as string[], aspectMode: 'any', type: '', kinds: [] as string[], set: '', keyword: '', trait: '',
  rarity: '', finish: '', variant: '', arena: '', ability: '', artist: '',
  maxCost: '', minPower: '', minHp: '', onlyOwned: false, onlyUnowned: false, premierOnly: false, allPrintings: false,
};
export type CardFilters = typeof emptyFilters;
export const cardKindOptions = [
  {value: 'Unit:Ground', label: 'Ground units'},
  {value: 'Unit:Space', label: 'Space units'},
  {value: 'Event', label: 'Events'},
  {value: 'Upgrade', label: 'Upgrades'},
  {value: 'Leader', label: 'Leaders'},
  {value: 'Base', label: 'Bases'},
  {value: 'Token Unit', label: 'Token units'},
  {value: 'Token Upgrade', label: 'Token upgrades'},
  {value: 'Force Token', label: 'Force tokens'},
  {value: 'Credit Token', label: 'Credit tokens'},
] as const;
export function cardKind(card: Pick<Card, 'type' | 'arena'>) {
  return card.type === 'Unit' && card.arena ? `Unit:${card.arena}` : card.type;
}
export function matchesCardKinds(card: Pick<Card, 'type' | 'arena'>, kinds: readonly string[]) {
  return kinds.length === 0 || kinds.includes(cardKind(card));
}
export function kindsFromLegacyType(type: string, arena: string) {
  if (type !== 'Unit') return type ? [type] : [];
  return arena ? [`Unit:${arena}`] : ['Unit:Ground', 'Unit:Space'];
}
export type QuickFilter = {id: string; name: string; scope: 'collection' | 'catalog'; filters: CardFilters};
export const defaultQuickFilters: QuickFilter[] = [
  {id: 'heroism', name: 'My Heroism cards', scope: 'collection', filters: {...emptyFilters, aspect: ['Heroism']}},
  {id: 'leaders', name: 'My leaders', scope: 'collection', filters: {...emptyFilters, type: 'Leader'}},
  {id: 'foils', name: 'My foils', scope: 'collection', filters: {...emptyFilters, finish: 'foil'}},
];

export function validateCardDisplay(settings: Record<string, unknown>) {
  const {rarityBorders, cardSort, quickFilters} = settings;
  if (rarityBorders !== undefined && typeof rarityBorders !== 'boolean') throw Error('Invalid rarity border setting');
  if (cardSort !== undefined && (!Array.isArray(cardSort) || !cardSort.length || cardSort.length > 2 ||
    cardSort.some(rule => !rule || !Object.hasOwn(sortLabels, rule.key) || !['asc', 'desc'].includes(rule.direction)) ||
    new Set(cardSort.map(rule => rule.key)).size !== cardSort.length)) throw Error('Invalid card sort');
  if (quickFilters !== undefined && (!Array.isArray(quickFilters) || quickFilters.length > 30 ||
    quickFilters.some(preset => !preset || typeof preset.id !== 'string' || typeof preset.name !== 'string' ||
      !preset.name.trim() || preset.name.length > 60 || !['collection', 'catalog'].includes(preset.scope) ||
      !preset.filters || Object.entries(emptyFilters).some(([key, value]) =>
        (key === 'premierOnly' || key === 'onlyUnowned' || key === 'kinds') && preset.filters[key] === undefined ? false :
        Array.isArray(value) ? !Array.isArray(preset.filters[key]) || preset.filters[key].some((item: unknown) => typeof item !== 'string')
          : typeof preset.filters[key] !== typeof value)) ||
    new Set(quickFilters.map(preset => preset.id)).size !== quickFilters.length)) throw Error('Invalid quick filters');
  return {
    ...(rarityBorders !== undefined && {rarityBorders}),
    ...(cardSort !== undefined && {cardSort: cardSort as SortRule[]}),
    ...(quickFilters !== undefined && {quickFilters: quickFilters as QuickFilter[]}),
  };
}
