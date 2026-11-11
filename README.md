# Unbroken

A phone-first draft-and-season game set in Aster City. Build a starting five from an original cast, then try to go **30–0**.

No build step and no backend. The whole game is static HTML, CSS, and JavaScript, so it can sit on GitHub Pages.

## Play on your phone

The public site is [https://monkeyzman.github.io/unbroken/](https://monkeyzman.github.io/unbroken/).

GitHub Actions publishes `main` with `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`. In the repo, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions** once. After that, every push to `main` updates the site. Asset links are relative (`./css`, `./js`, `../fonts`) so the game loads under the `/unbroken/` path.

## Play locally

ES modules need a local server. Opening the file directly will not load the game.

```bash
python3 -m http.server 8747
```

Then open [http://127.0.0.1:8747](http://127.0.0.1:8747).

On GitHub Pages, publish the repository root. There is nothing to install.

## How a season works

1. Draft five heroes, one per role: Tank, Speedster, Brawler, Tech / Genius, Wildcard. Each slot offers three random cards.
2. Fight 30 rounds. Rounds 5, 10, 15, 20, 25, and 30 are bosses. Everyone else is a regular villain.
3. After each boss, the regulars change tier. New enemies, tougher numbers, and a new field trick. The city does this on the calendar, win or lose.
4. You play all 30 fights. The record, the best streak, and who you fell to are the result.
5. Share the card (Web Share API, with copy as the fallback). Draft again whenever you want.
6. Your best record stays on this device (`localStorage`).

**Daily Challenge** uses the UTC date as a seed. Everyone gets the same three cards per slot and the same fight rolls that day. Same picks, same season.

## The cast

45 original heroes across five factions. Nothing in the roster, the villain list, or the art is taken from Marvel, DC, or any other licensed book.

| Faction | Link | Boosts |
| --- | --- | --- |
| Solar Vanguard | Noon Oath | Defense |
| Night Circuit | Blackout Grid | Speed |
| Chrome Collegium | Proof Protocol | Smarts |
| Wildheart Pact | Pack Howl | Power |
| Velvet Void | Chorus Link | Teamwork |

Two heroes from one faction start a link. It stacks:

| Together | Bonus to that faction's stat |
| --- | --- |
| 2 | +8% |
| 3 | +15% |
| 4 | +24% |
| 5 | +35% |

Five different factions is **Five Banners**: +8% to every stat, and no pair bonus. Synergy is shown on the draft dock and on the result card.

Rarities are Common, Rare, Epic, and Legendary. A higher rarity is a higher stat total, but the shape of the stats matters more than the total once the bosses start cheating.

## What the stats do in a fight

A fight is a handful of exchanges. Both sides hit. The faster side usually swings first. Bars are squad resolve versus the foe.

- **Power**, mostly the Brawler's, is what actually drops people.
- **Speed**, mostly the Speedster's, wins initiative and can slip a grab.
- **Smarts**, mostly the Tech's, burns shields. Fists barely smudge them.
- **Defense**, mostly the Tank's, is how much of a hit you keep, and whether you can body-block a hunt.
- **Teamwork**, mostly the Wildcard's, shrinks the luck swing, can crack a mirror, can refuse one close killing blow, and can scribble a cut hero back onto the page.

Luck is a real swing. High Teamwork makes it a small one. A comfortable matchup can still drop, and a bad one can steal a round.

## Bosses

Each boss cheats in a different way, and each one is harder than the last for a good draft.

| Round | Boss | The cheat |
| --- | --- | --- |
| 5 | **Vesper Glass**, the Mirror Regent | **Mirrorcut.** She steals your loudest stat and hits you with it. A high Teamwork score cracks the glass down to a shard. A one-stat squad gets worn like a coat. |
| 10 | **Halder Voss**, the Clause King | **Fine Print.** A fat shield that regrows. Smarts burn it. Power mostly waits outside. |
| 15 | **Sable Quick**, the Red Afterimage | **Hunt the Swift.** She grabs your fastest hero. A Tank at 96+ Defense can body-block and gives up some plating. A Speedster at 104+ Speed is simply not there. If she connects, that hero leaves the page and her hits speed up. Synergy counts toward both numbers. |
| 20 | **Mother Orla**, the Bramble Saint | **Season Turn.** She gets stronger every exchange. Power and Speed end it early. A wall that tries to outlast her gets buried. A fast open hits harder. |
| 25 | **Saint Nulla**, the Pale Choir | **Hush.** Faction links go dark and Teamwork frays. A Tech at 97+ Smarts reboots half the link. Raw stats keep working. A squad that was mostly its bonus does not. |
| 30 | **The Ink Monarch**, Last Panel | **Editor's Cut.** Your highest-total hero is cut from the opening pages. An ink shield goes up. On the late pages the link is hushed and the fastest hero is hunted. Big Teamwork scribbles the ace back in on exchange 2 instead of 4. Five real contributors beat one superstar. |

## Enemy tiers

| Rounds | Tier | Field |
| --- | --- | --- |
| 1–4 | Gutter League | No game plan. They just swing. |
| 6–9 | Ledger Syndicate | **Paper Shield.** A contract-thin shield on every crook. |
| 11–14 | Marching Warhost | **Focused Fire.** Harder hits, worse if Power is your loudest stat. |
| 16–19 | Apex Menagerie | **Adaptation.** They learn. The hits swell every exchange. |
| 21–24 | Calamity Court | **Bad Weather.** Faction synergy is cut in half. |
| 26–29 | Epoch Beasts | **Extinction Pressure.** The era leans on your weakest hero, and the beasts grow. |

Individual villains add their own trick on top: a slip, a second swing, a sip of your best stat, extra plate, and so on.

## Balance

30–0 is meant to be rare and possible. `node sim/balance.mjs 2500` reprints the table. It needs Node 18 or newer and nothing else. The game itself does not need Node.

A **good draft** takes the strongest card in the slot, with a small preference for a faction link and for clearing a boss check (a Tank who can body-block, a Tech who can reboot a hush). A **greedy draft** ignores that and just takes the highest rarity, then the highest total. Measured over 2,500 seeds:

| Draft | 30–0 | Average wins | Boss win rates, rounds 5 through 30 |
| --- | --- | --- | --- |
| Good | 3.3% | 26.6 | 81%, 73%, 63%, 39%, 22%, 5% |
| Greedy | 3.3% | 26.5 | 81%, 68%, 63%, 36%, 20%, 5% |
| Random | 0.04% | 21.2 | 23%, 24%, 24%, 6%, 2%, 0% |
| Weakest card every time | 0% | 12.9 | essentially none past the first boss |

The regular season is where a good squad looks dominant, and where the danger still creeps up. Win rate stays around 96–100%, but leftover squad health falls from about **63%** in the Gutter League to about **31%** against the Epoch Beasts. Most perfect seasons die at a boss, and the last three bosses are where they die.

The cheats are not just bigger numbers. In isolation:

- A balanced legendary squad beat Vesper every time. A skewed squad of commons never did.
- A legendary Tech beat Halder about 94% of the time. A common Tech beat him about 29%.
- A legendary Tank stopped Sable every time. A common Tank never did.
- A burst squad beat Mother Orla about 99% of the time. A slow squad never did.
- A balanced legendary squad beat the Ink Monarch about 95% of the time. A lopsided common squad never did.

So a thoughtful draft can clear the early cheats, and the finale is still a real coin-flip only for the squads that were built for it. Most good drafts fall to the Ink Monarch. That is the 3% season.

## Files

- `index.html` — the page
- `css/styles.css` — comic-paper styling
- `js/` — roster, foes, combat, season flow, portraits, UI
- `sim/balance.mjs` — the season simulator behind the numbers above
- `fonts/` — Bangers and Outfit (SIL Open Font License), so the look does not depend on a CDN
