# Holocron

Private Star Wars Unlimited collection and deck manager, built with React/Vinext and a per-user Cloudflare D1 workspace. The owner-private Sites access policy protects the hosted app; API handlers additionally require ChatGPT identity and scope queries by user ID. A fixture identity exists only in Vite development mode and is removed by the production build.

## Data and interchange

`public/catalog.json` is the compiled snapshot. `data/*.json` preserves raw SWU-DB and SWU API responses. Card IDs use SWU-DB set and number values, not conflicting promo IDs in the alternate API. Imported IDs are preserved, including unknown IDs (visible and exportable). Different services can assign variant numbers differently; records are never silently reassigned.

`lib/model.ts` owns CSV/JSON interchange, counting, baseline aspect checks, backup validation and probabilities. CSV supports BOM, quoted fields, CRLF, duplicate merging, replace/add modes. Deck imports never change collection counts. Equivalent names/subtitles/types aggregate for ownership and copy-limit warnings. Canonical IDs are used for newly added deck cards.

Collection/decks persist in D1. Optimistic revisions reject concurrent-device conflicts. Failed writes retain pending changes with retry and backup controls. Navigation warns while writes are pending. Full JSON backups include unfinished decks and notes. The local preview database is not deployed.

Deck versions and manually imported format rules are included in full backups. Recent workspace restore points and solo/live game tables stay on the current device in browser storage. The solo table is a manual card-zone simulator; the live tracker records base damage, resources, initiative, leader state, and unit counters without automating card effects.

## Checks

- `node node_modules/typescript/bin/tsc --noEmit`
- `node --experimental-strip-types --test tests/model.test.mjs`
- Build/package with the Sites skill helpers. Hosted migrations apply on publication.

Refresh raw inputs from `https://api.swu-db.com/cards/{set}` and `https://api.swuapi.com/export/all`, then run `python scripts/compile-catalog.py`. Inspect coverage and run tests before publishing. Catalog refresh never changes ownership. Preview sets are included; presence does not imply release or legality. Enriched keywords include text-derived matches, sometimes describing granted abilities.

## ForceTable

Tested transport: `https://www.forcetable.net/swu/import?svc=swudb&id=<URL-encoded base64 SWUDB JSON>`. It selects the imported deck as P1 in Quick Match; the visitor chooses the opponent. The live integration was checked using a small fixture: leader, base, units and counts matched. ForceTable may omit unimplemented cards; the app asks users to verify imported counts for newer sets.

## Limits

- One leader/base deck structure. Twin Suns cards can be browsed, but two-leader decks are not supported.
- Normal 50-card minimum, 10-card sideboard maximum, and 3-copy checks; not certification of current bans, rotation or card exceptions.
- Aspect costs are baseline comparisons, not a full conditional-cost rules engine.
- Lazy-loaded original-host images; unavailable art falls back to text. No public image mirror.
- File/paste interchange, not SWUDB account synchronization.
- No scanning/recognition, and no offline-first writes.
