export type Guide={id:string;category:string;title:string;summary:string;sections:{title:string;body:string}[];cards:string[];sources:string[]};
export const guides:Guide[]=[
  {
    "id": "start",
    "category": "Learn the game",
    "title": "Your first game, without the confusion",
    "summary": "Actions, attacking, resources, leaders, and the two arenas.",
    "sections": [
      {
        "title": "What you bring",
        "body": "For standard constructed play, bring one leader, one base, and a draw deck of at least 50 cards. The leader and base are outside those 50. Tokens are separate game pieces, not cards to shuffle into the draw deck. Check the event’s format and current legality before choosing a list."
      },
      {
        "title": "Playing is not attacking",
        "body": "You and your opponent alternate actions. Playing a unit is usually one action; attacking with a ready unit is another. Units normally enter exhausted. An ability such as Ambush can create an exception. Events resolve their instructions; upgrades attach to a legal target."
      },
      {
        "title": "Ground and space",
        "body": "A unit normally attacks an enemy unit in its own arena or the enemy base. A ground Sentinel does not protect you from space attacks. Before committing resources, look at both arenas and ask where the next unopposed attack will come from."
      },
      {
        "title": "A round in practice",
        "body": "Start with six cards, take a full-hand mulligan if needed, and choose two cards as resources. During regroup, draw two, optionally resource one card, and ready your cards. Taking initiative means acting first next round but passing for the rest of this action phase; take it when your remaining actions are less valuable than going first."
      },
      {
        "title": "Leader deployment",
        "body": "Read the leader’s Epic Action. A resource threshold is not itself a payment: controlling six resources is different from exhausting six to pay a cost. Deployment is a major swing, so plan your preceding plays around it. The exact leader text determines how it deploys and what it does."
      }
    ],
    "cards": [],
    "sources": [
      "rules"
    ]
  },
  {
    "id": "build",
    "category": "Deckbuilding",
    "title": "Build a deck from a game plan",
    "summary": "A practical process, from leader choice to your first ten test games.",
    "sections": [
      {
        "title": "Write one sentence",
        "body": "Describe how you expect to win: “Build a durable board, stabilize with healing, then finish with a large threat,” or “Develop cheap vehicles and convert pilot discounts into extra attacks.” If two cards pull the plan in opposite directions, decide which plan matters more."
      },
      {
        "title": "Choose the leader and base together",
        "body": "Start with the exact leader version, not just the character’s name. Compare the aspects your base adds, its HP, and any ability. Pick the pair that supports your important early plays and finishing threats. A clever base effect is not free if the lower HP makes your bad matchup worse."
      },
      {
        "title": "Give every card a job",
        "body": "Separate your list into early plays, threats, answers, protection, resource acceleration, and finishers. A card can have several jobs. Use repeated copies of the effects you need reliably. A one-of should have a reason: a narrow matchup tool, a searchable effect, or a card you do not want in multiples."
      },
      {
        "title": "Build a curve you can actually use",
        "body": "Start at 50 draw cards unless a card or format requires otherwise. For a first unit-focused draft, roughly 35 units and 15 other cards is a useful starting point, not a rule. Include enough low-cost plays to do something in the opening rounds, and a deliberate plan for space. Adjust the mix after testing."
      },
      {
        "title": "Check the whole list",
        "body": "Look at the Statistics tab: early costs, arena coverage, aspect penalties, and missing copies. Count the main deck and sideboard together when checking the usual three-copy limit. Alternate art does not create a different gameplay card. Verify current restrictions separately."
      },
      {
        "title": "Test before shopping",
        "body": "Play several games before changing the list. Record the matchup, opening hand, resource choices, and the turn the game slipped away. Change a small group of cards for one specific reason, then test again. Prioritize singles that fix a repeated weakness rather than opening boosters hoping for one exact card."
      }
    ],
    "cards": [],
    "sources": [
      "construction",
      "rules"
    ]
  },
  {
    "id": "aspects",
    "category": "Deckbuilding",
    "title": "Colors, aspects, and the +2 penalty",
    "summary": "Avoid the off-color costs that spoiled earlier lists.",
    "sections": [
      {
        "title": "Read icons, not card borders",
        "body": "Vigilance is blue, Command green, Aggression red, Cunning yellow, Heroism white, and Villainy black. Your leader and base provide icons. Count each icon individually: having one Command icon does not cover a double-Command requirement."
      },
      {
        "title": "Work through a real example",
        "body": "Suppose your leader and base provide Vigilance, Heroism, and Command. A card requiring Aggression and Heroism is missing one icon, so its resource cost increases by 2. A double-Command card is also missing one icon. A card requiring Aggression and Villainy is missing two icons, adding 4."
      },
      {
        "title": "Exceptions must be explicit",
        "body": "An off-aspect card can be legal to include while being expensive to play. Leader text, alternate costs, and specific abilities can change the calculation. Check Piloting and Smuggle costs separately. Holocron’s printed-cost aspect check is a baseline, not an interpreter for every card ability."
      },
      {
        "title": "A clean first build",
        "body": "Start with cards your leader and base cover. Add an off-aspect card only after identifying the exact benefit, the actual cost you will pay, and why an on-aspect substitute cannot fill that job."
      }
    ],
    "cards": [],
    "sources": [
      "construction",
      "rules"
    ]
  },
  {
    "id": "styles",
    "category": "Deckbuilding",
    "title": "Playstyles and archetypes",
    "summary": "Aggro, tempo, midrange, ramp, control, fortress, and combo.",
    "sections": [
      {
        "title": "Aggro and swarm",
        "body": "Aggro tries to destroy the base before slower cards take over. Swarm spreads that pressure across many units or tokens. Your test is whether trades are buying more base damage or merely slowing your clock. Avoid filling the list with expensive cards that arrive after the game is decided."
      },
      {
        "title": "Tempo",
        "body": "Tempo combines a threat with a cheap way to disrupt the opponent’s next useful action. Exhausting or returning a unit is valuable when it creates an attack window, even if it does not remove that card permanently. You need a threat on the board to turn that window into progress."
      },
      {
        "title": "Midrange",
        "body": "Midrange plays efficient threats and flexible answers. Against aggro, become the defender and trade to stabilize. Against slower control, become the attacker and force answers. Its strength is changing roles; its trap is making every game plan equally mediocre."
      },
      {
        "title": "Ramp",
        "body": "Ramp increases your resource development so you can reach expensive plays ahead of schedule. Ready-a-resource effects improve spending within a round but are not necessarily permanent ramp. Build an early survival package and enough worthwhile top-end cards to justify the investment."
      },
      {
        "title": "Control and fortress",
        "body": "Control spends cards and actions answering threats until its own finishers take over. Fortress emphasizes protection, healing, Sentinels, and base fortifications. Both need a way to close the game. Healing without removing the source of damage often only postpones the loss."
      },
      {
        "title": "Combo and synergy",
        "body": "A combo relies on particular interactions to generate a decisive result. A synergy deck uses many cards that improve each other, such as Rebels, Imperials, or pilots. Add ways to function when the signature pairing is missing. Pilots describe a theme, not a single archetype: they can support tempo, midrange, or aggression."
      }
    ],
    "cards": [],
    "sources": [
      "rules"
    ]
  },
  {
    "id": "turns",
    "category": "Learn the game",
    "title": "Mulligans, resourcing, and sequencing",
    "summary": "Make better decisions with the cards you already own.",
    "sections": [
      {
        "title": "Keep a hand with a plan",
        "body": "Look for an opening play and a useful follow-up, not simply your favorite rare. Decide which two cards become starting resources before you keep. Against fast opponents, a slow hand needs unusually strong interaction to justify keeping it."
      },
      {
        "title": "Resource for this matchup",
        "body": "Ask what the next two rounds require. Resource redundant expensive cards, narrow answers that have no targets, or pieces you cannot assemble in time. Do not automatically resource the most expensive card if it is your only credible win condition."
      },
      {
        "title": "Spend your dangerous actions first",
        "body": "Before each action, check whether the opponent can defeat your ready unit, remove its pilot, or take lethal on the next action. Use attacks that might disappear. Conversely, developing a blocker first may be essential when you would otherwise lose."
      },
      {
        "title": "Trade or hit base?",
        "body": "Estimate the race using ready units, expected deployment, and likely blockers. Trading is good when it protects multiple future attacks or prevents lethal. Base damage is good when it forces the opponent to answer you. Count both arenas before deciding."
      },
      {
        "title": "Plan the deployment turn",
        "body": "Consider what you can play before and after deployment and what the opponent can do between those actions. Do not assume every effect resolves without an opposing action in between. Read abilities that explicitly grant another action or attack."
      }
    ],
    "cards": [],
    "sources": [
      "rules"
    ]
  },
  {
    "id": "fortress",
    "category": "Your playstyles",
    "title": "Build the healing fortress",
    "summary": "A wall that survives—and eventually wins.",
    "sections": [
      {
        "title": "Four pieces, one plan",
        "body": "Your defensive package needs early bodies, efficient answers, sustained protection or healing, and a finisher. If too many cards only heal, you can remain behind on board forever. A useful wall repeatedly prevents damage while your other cards improve the position."
      },
      {
        "title": "Sentinel is local to an arena",
        "body": "Protect ground and space separately. A big ground defender does not stop ships from attacking your base. Check for Saboteur, removal, and other effects that can bypass or dismantle your defense."
      },
      {
        "title": "Shield, heal, and Fortify do different jobs",
        "body": "A Shield token prevents an instance of preventable damage to its attached unit; it is not extra HP. Healing removes existing damage. Fortify identifies upgrades that attach to a base, and each fortification’s text explains its actual protection or disruption. Do not treat them as interchangeable."
      },
      {
        "title": "Your routes into the style",
        "body": "Luke Skywalker — Faithful Friend supports protecting Heroism units. Doctor Hemlock — Emotion Has No Place Here applies Weakness tokens to reduce enemy effectiveness. Grand Moff Tarkin — Tyrant of the Outer Rim (HMW_004) is a different leader from the Imperial Experience-token Tarkin: check the card below for his Fortify plan."
      },
      {
        "title": "A useful test",
        "body": "After a loss, separate “I died before stabilizing” from “I stabilized but could not finish.” The first points to cheaper interaction or arena coverage. The second points to a finisher or a way to protect it. Do not solve both by adding more passive healing."
      }
    ],
    "cards": [
      "SOR_005",
      "HMW_003",
      "HMW_004"
    ],
    "sources": [
      "homeworlds",
      "rules"
    ]
  },
  {
    "id": "pilots",
    "category": "Your playstyles",
    "title": "Pilots, vehicles, and your Han game plan",
    "summary": "Build around the ship-and-pilot style you enjoyed.",
    "sections": [
      {
        "title": "A vehicle must be useful alone",
        "body": "Choose ships you are happy to play without a pilot. A hand full of pilots and no legal host is a warning that the balance is wrong. In testing, record how often you have a pilot stranded in hand, then adjust the vehicle count or costs."
      },
      {
        "title": "Unit or upgrade?",
        "body": "A card with Piloting can be played as a unit or, using its Piloting ability, as an upgrade on a legal friendly Vehicle without a Pilot upgrade. Its upgrade mode uses the relevant Piloting cost and abilities. Outside play, that card is a unit; a search specifically for upgrades does not find it."
      },
      {
        "title": "Avoid putting everything on one ship",
        "body": "Upgrading one vehicle concentrates value. If the opponent removes the host, you can lose multiple cards’ worth of investment. Spread threats when possible, choose the right moment to commit, and keep an alternative plan when the host is answered."
      },
      {
        "title": "Han, Wedge, Boba, and Kazuda",
        "body": "Han Solo — Never Tell Me the Odds rewards planning around odd costs; inspect the exact different-odd-cost condition on his action. Wedge discounts playing cards through Piloting. Boba Fett — Any Methods Necessary adds pressure around non-combat damage and a deployment damage burst. Kazuda removes abilities, which can also remove drawbacks—but can strip benefits you wanted to keep."
      },
      {
        "title": "Practice the actual deployment",
        "body": "Pilot leaders have their own Epic Action options. Read the leader and attached-unit text before deploying; do not apply the ordinary unit-card Piloting rules by analogy to every leader situation. Read both faces in Holocron and test the sequence in ForceTable, checking that the simulator imported the correct leader."
      }
    ],
    "cards": [
      "JTL_017",
      "JTL_008",
      "JTL_009",
      "JTL_018",
      "JTL_012"
    ],
    "sources": [
      "piloting",
      "rules"
    ]
  },
  {
    "id": "leaders",
    "category": "Your playstyles",
    "title": "Playbooks for the leaders you have explored",
    "summary": "Version-specific strategy notes, not claims about today’s tournament rankings.",
    "sections": [
      {
        "title": "Luke and Vader starters",
        "body": "Luke — Faithful Friend: establish a unit worth protecting, use Shields to preserve future attacks, then turn your stable board into pressure. Vader — Dark Lord of the Sith: use the Villainy condition on his action deliberately, soften units for favorable trades, and plan for his seven-resource deployment. These are the SOR leaders; other Luke and Vader versions have different abilities."
      },
      {
        "title": "Leia is not always the same deck",
        "body": "Leia — Alliance General links Rebel attacks and rewards having multiple useful Rebel attackers. Leia — Get to Your Transports! from Intro Battle: Hoth heals units instead. Check the subtitle before copying a strategy: Rebel attack sequencing and a healing plan are different engines."
      },
      {
        "title": "Tarkin’s two very different plans",
        "body": "Tarkin — Oversector Governor improves Imperial units with Experience. Invest where the upgrade creates an extra surviving attack or a better trade, and avoid placing everything on one removable unit. The Homeworlds Tarkin instead builds around base fortifications and a late Death Star deployment."
      },
      {
        "title": "Ahsoka, Hemlock, and Palpatine",
        "body": "Ahsoka — Snips wants to maintain the unit count needed for Coordinate; spending your board carelessly switches off the payoff. Hemlock’s Weakness tokens reward careful combat math. Palpatine — Galactic Ruler asks you to manage sacrifice fodder, damage enemy units, and time his control-changing deployment. Each needs support cards that do useful work before the leader arrives."
      },
      {
        "title": "Use these with your actual list",
        "body": "Open the exact leader cards below, then compare your deck’s first few rounds, arena coverage, and finisher. These notes explain the engine; they do not assert that every named leader is currently format-legal, owned, or tournament-optimal."
      }
    ],
    "cards": [
      "SOR_005",
      "SOR_010",
      "SOR_009",
      "IBH_001",
      "SOR_007",
      "HMW_004",
      "TWI_011",
      "HMW_003",
      "SOR_006"
    ],
    "sources": [
      "rules"
    ]
  },
  {
    "id": "keywords",
    "category": "Reference",
    "title": "Keywords, in plain English",
    "summary": "A quick reference with buttons to find matching cards.",
    "sections": [
      {
        "title": "Use the glossary below",
        "body": "Search for a keyword such as Sentinel, Piloting, or Fortify. “Find cards” opens the catalog filtered to that keyword. The explanations describe the core idea; the card’s exact text, current errata, and official rules decide unusual interactions."
      },
      {
        "title": "Traits are different",
        "body": "Rebel, Imperial, Vehicle, Pilot, Force, and similar labels are traits. A trait does not automatically grant an ability. A Vehicle is not automatically a space unit, and a Pilot trait alone does not give the Piloting keyword."
      },
      {
        "title": "Timing words matter",
        "body": "When Played, On Attack, When Defeated, and constant abilities have different trigger conditions. A temporary bonus with “for this phase” expires at that boundary. Experience tokens stay attached until something removes them or their host leaves play."
      }
    ],
    "cards": [],
    "sources": [
      "rules"
    ]
  },
  {
    "id": "tokens",
    "category": "Reference",
    "title": "Tokens, dice, and damage tracking",
    "summary": "Use the counters you have without mixing up game effects.",
    "sections": [
      {
        "title": "Damage versus changed stats",
        "body": "Use one clearly identifiable counter for damage. Experience is +1/+1; Weakness is −1/−1. These change stats rather than representing damage or healing. If a temporary HP bonus expires, recheck whether the unit has lethal damage."
      },
      {
        "title": "Shields and Advantage",
        "body": "A Shield prevents a qualifying damage instance, then one Shield is defeated; it is not a generic +1 bonus. Advantage is a separate token upgrade with its own stats and expiration text. Inspect the token card when in doubt rather than treating every counter as Experience."
      },
      {
        "title": "Your dice and coins",
        "body": "D10s or D20s work well for base damage; use smaller dice for unit damage. Keep Experience, Shield, Weakness, and temporary modifiers visibly distinct with labeled markers. A coin can mark initiative. Agree with your opponent what each marker means before starting."
      },
      {
        "title": "Tokens and reverse sides",
        "body": "A token printed on the reverse of another card does not automatically upgrade that card. An ability must create or attach the token. Token units enter play when created by effects; keep their stats and ready/exhausted state clear. The Force and Credit tokens have their own rules and are not extra cards in your draw deck."
      }
    ],
    "cards": [
      "SOR_T01",
      "SOR_T02",
      "HMW_T02",
      "ASH_T02",
      "LOF_T03",
      "LAW_T01"
    ],
    "sources": [
      "rules"
    ]
  },
  {
    "id": "testing",
    "category": "Deckbuilding",
    "title": "Read your deck statistics and improve the list",
    "summary": "Turn the charts into useful changes instead of chasing a perfect curve.",
    "sections": [
      {
        "title": "Cost curve",
        "body": "The chart uses printed cost. It does not fully model Piloting, Smuggle, discounts, ramp, or aspect penalties. Look at what you can actually play on rounds one through three, then what your leader adds to the curve."
      },
      {
        "title": "Composition and arena coverage",
        "body": "Compare ground units, ships, events, and upgrades with the plan. A low space count is not automatically wrong, but you need a convincing answer to an opponent who develops space pressure. Lots of upgrades need enough suitable hosts."
      },
      {
        "title": "Draw probability",
        "body": "This estimates seeing at least one of a chosen number of copies in a sample from your deck, without a mulligan. It does not model searches, card draw, resourcing, or an entire combo. More copies improve access to a key card, but duplicates can be awkward when its use is narrow."
      },
      {
        "title": "Keep a short testing log",
        "body": "In Deck details, note: opponent’s leader/base; win or loss; early plays; resource mistakes; the card stranded in hand; and the missing answer. After several games, look for a recurring cause. Change a few slots, keep the old version with Duplicate deck, and compare."
      },
      {
        "title": "Tune before buying",
        "body": "Prioritize a third copy of an essential early play, a missing arena answer, or the actual finisher over a flashy card with no clear job. Exact shopping quantities require your latest collection: do not assume a saved deck reserves or consumes physical cards."
      }
    ],
    "cards": [],
    "sources": [
      "rules"
    ]
  },
  {
    "id": "events",
    "category": "Reference",
    "title": "Sideboards and your first store night",
    "summary": "Bring a legal list, understand your swaps, and learn from the games.",
    "sections": [
      {
        "title": "What a sideboard does",
        "body": "In standard constructed matches, the sideboard holds up to ten non-leader, non-base cards for changes between games. Keep the main deck and sideboard legal after swapping. The usual copy limit applies across both, not separately."
      },
      {
        "title": "Plan both sides of every swap",
        "body": "For each matchup, write “bring in X, remove Y.” Against aggression, you may need cheaper answers; against slower decks, resilient threats or disruption. Do not bring in cards merely because they are good in isolation if they remove the engine that makes your deck work."
      },
      {
        "title": "Pack the basics",
        "body": "Bring the sleeved deck, leader, base, sideboard if used, relevant tokens, clear damage counters, and an initiative marker. Keep a deck export handy. Tell the organizer you are learning and ask how the event handles rounds, reporting, and decklists."
      },
      {
        "title": "Verify the format",
        "body": "Premier, Eternal, Limited, and Twin Suns have different pools or construction requirements. A card being visible in the catalog does not mean it is legal in your event. Check the official rules, suspended-card information, and organizer’s format before playing. Holocron currently checks basic one-leader construction, not full tournament legality."
      }
    ],
    "cards": [],
    "sources": [
      "premier",
      "rules"
    ]
  },
  {
    "id": "collection",
    "category": "Using Holocron",
    "title": "Collection, favorites, and reading cards",
    "summary": "Find your Heroism cards, browse a deck, or keep an idea for later.",
    "sections": [
      {
        "title": "Read what you own",
        "body": "My collection shows owned printings. Filter by Heroism to see white-aspect cards, or by Leader to see leaders; those are different filters. Use Large images for a comfortable reading view. Open any card to see rules text and flip double-sided cards."
      },
      {
        "title": "One-tap favorites",
        "body": "Tap the star on a card or deck to save it. Tap again to remove it. Favorites has separate card and deck views. A card favorite identifies that exact printing, so it can remember artwork you like. Favoriting a card does not add it to your collection or a deck."
      },
      {
        "title": "Quantities and finishes",
        "body": "Foil and non-foil quantities are tracked separately for each printing. Equivalent gameplay copies are combined for deck availability. A deck is a plan: making or importing it does not increase or subtract collection quantities."
      },
      {
        "title": "Two decks for one event",
        "body": "The app shows missing cards for each deck individually. It does not reserve cards across multiple decks. If you want two decks with no overlap, add their combined needs by gameplay identity and compare that total with your owned quantities."
      },
      {
        "title": "Browse a whole deck",
        "body": "Open a deck and choose Cards, then Large images. Switch between main deck and sideboard. Use Statistics for cost and aspect checks; use Build to add cards. Favorites are a useful shortlist for future experiments."
      }
    ],
    "cards": [],
    "sources": []
  },
  {
    "id": "backup",
    "category": "Using Holocron",
    "title": "SWUDB imports, iCloud backups, and ForceTable",
    "summary": "Your data stays portable; no card scanner required.",
    "sections": [
      {
        "title": "Collection CSV versus deck JSON",
        "body": "Use a SWUDB collection CSV for ownership counts and foil flags. Use native SWUDB JSON for a deck: metadata, leader, base, deck, and optional sideboard, with exact set-prefixed card IDs such as JTL_009. Importing a deck does not add its cards to your collection."
      },
      {
        "title": "Replace versus Add",
        "body": "Replace collection sets quantities to the imported CSV. Add increases existing quantities, so importing the same file twice can double counts. Preview the file and check the total before confirming. Unknown IDs are preserved even when art is unavailable."
      },
      {
        "title": "Save a full backup to iCloud",
        "body": "Tap Backup. On a supported phone or tablet, choose Save to Files → iCloud Drive in the share sheet. Otherwise move the downloaded JSON into iCloud Drive using Files. The filename includes total card quantity and your device’s local date/time. A full backup includes collection quantities, decks, sideboards, notes, and favorites; it does not contain the card-art library."
      },
      {
        "title": "Restore on another device",
        "body": "Choose Import collection → Full backup, select the JSON from Files, preview, then confirm Replace with backup. This replaces the current workspace; save a backup of that workspace first if it has changes you want. Older Holocron backups still work, but files made before favorites existed contain no favorites."
      },
      {
        "title": "Manual backup is not live sync",
        "body": "Saving a JSON in iCloud copies that file between your devices. It does not automatically import later edits into Holocron. Open the desired file and restore it when you want that snapshot. We have deferred automatic iCloud app syncing."
      },
      {
        "title": "Practice on ForceTable",
        "body": "From a completed deck, tap Play on ForceTable, then select an opponent there. Check leader, base, and imported count, particularly for new cards. If clipboard export fails on iPad, use the SWUDB JSON file export instead. ForceTable needs internet; simulator behavior is not an official rules ruling."
      }
    ],
    "cards": [],
    "sources": []
  },
  {
    "id": "rarity",
    "category": "Reference",
    "title": "Rarity, foils, and alternate art",
    "summary": "Identify what you own without confusing a finish with a different card.",
    "sections": [
      {
        "title": "Three separate questions",
        "body": "Identify the gameplay card, its printing, and its finish. The same title and subtitle can appear in multiple sets or treatments. Use the set code and collector number to select the exact printing; then record whether your copy is foil."
      },
      {
        "title": "Rarity is not finish",
        "body": "Common, Uncommon, Rare, Legendary, and Special are rarity labels. Foil describes a treatment and can occur at different rarities. Hyperspace and Showcase are alternate presentations; an impressive-looking card is not automatically a Legendary. In Holocron, inspect Rarity and Art variant separately."
      },
      {
        "title": "Read the exact printing",
        "body": "Open the card details and compare its art and set/number with your physical card. If it is double-sided, inspect both faces. Do not identify an expensive variant solely from the character’s name or shine."
      },
      {
        "title": "Value versus usefulness",
        "body": "Market value depends on the exact printing, finish, condition, demand, and recent transactions. This app does not provide live prices. A valuable treatment does not make the gameplay effect stronger; a regular printing can do the same job in a deck."
      },
      {
        "title": "Buy for the deck you intend to play",
        "body": "If the goal is finishing a deck, identify the missing exact gameplay cards before buying. If the goal is collecting art, star the printing you like and keep its foil quantity separate. Check product contents rather than assuming a booster or starter contains every card sharing its theme."
      }
    ],
    "cards": [],
    "sources": [
      "collecting"
    ]
  },
  {
    "id": "sets",
    "category": "Reference",
    "title": "Find the set that fits your interests",
    "summary": "A map of the main mechanics, with card-search ideas rather than shopping promises.",
    "sections": [
      {
        "title": "The early foundations",
        "body": "Spark of Rebellion (SOR) establishes the core game: Rebels, Imperials, and the original keywords. Shadows of the Galaxy (SHD) adds Bounty, capture, and Smuggle. Twilight of the Republic (TWI) emphasizes unit counts with Coordinate, sacrifice-based discounts with Exploit, and Clone/Droid tokens."
      },
      {
        "title": "Ships, Force users, and schemes",
        "body": "Jump to Lightspeed (JTL) is your starting point for Piloting, Vehicles, and space battles. Legends of the Force (LOF) includes the Force token and Hidden. Secrets of Power (SEC) features Plot and disclose, making resource-zone planning and the aspect icons in your hand relevant."
      },
      {
        "title": "Credits, teamwork, and fortifications",
        "body": "A Lawless Time (LAW) includes Credit tokens and multi-aspect themes. Ashes of the Empire (ASH) introduces Support and temporary Advantage tokens. Homeworlds (HMW) brings Fortify upgrades for bases, Weakness tokens, and Beast tokens."
      },
      {
        "title": "Intro Battle: Hoth",
        "body": "IBH is a teaching product with its own card IDs and leader versions. Its Leia and Vader leaders should not be confused with the similarly named SOR starters. Compare subtitles and rules text before applying a deck guide."
      },
      {
        "title": "Use the catalog as the index",
        "body": "Choose a set in the catalog, then narrow by keyword, trait, aspect, or ability text. A mechanic is not necessarily exclusive to its debut set. The catalog also includes promos and previews; those are not evidence of current event legality or store availability."
      }
    ],
    "cards": [],
    "sources": [
      "rules",
      "piloting",
      "secrets",
      "ashes",
      "homeworlds"
    ]
  }
];
