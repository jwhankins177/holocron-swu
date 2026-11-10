import type {Card,FormatRules} from './model';
import {DEFAULT_FORMAT_RULES} from './deck-tools.ts';

const deckCardTypes = new Set(['Leader', 'Base', 'Unit', 'Upgrade', 'Event']);

// The November 2026 card pool. Add the next rotation when its date is confirmed.
export function premierCards(cards: Card[], today = new Date(), rules:FormatRules=DEFAULT_FORMAT_RULES) {
  const premierSets=new Set(rules.premierSets);
  const suspended=new Set(rules.premierSuspended);
  const iconsReleased = today >= new Date('2026-11-20T00:00:00');
  const available = (card: Card) => card.set !== 'IC27' || iconsReleased;
  const suspendedCores = new Set(cards.filter(card => suspended.has(card.id)).map(card => card.core));
  const legalCores = new Set(cards.filter(card =>
    deckCardTypes.has(card.type) &&
    (premierSets.has(card.set) || card.set === 'IC27' && iconsReleased) &&
    !suspendedCores.has(card.core)
  ).map(card => card.core));
  return new Set(cards.filter(card => available(card) && legalCores.has(card.core)).map(card => card.id));
}
