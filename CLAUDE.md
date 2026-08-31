# Tower Defense Template: Pixi.js v8 + React 19 + Tailwind v4

A batteries-included 2D tower defense for RUN.game. Everything gameplay-true
lives in a pure, render-free simulation engine driven by four data files;
the Pixi scene is a view over it, and `npm run balance` runs the SAME engine
headless to verify your tuning in seconds. Platform systems are wired and
working: per-player saves, a persistent gem economy with per-tower upgrade
tracks, two leaderboards, rewarded ads with a trusted-clock daily cap,
procedural audio with a settings screen, and Like/Comments prompts.

**Systems vs example content.** The engine, the status-effect system, the
board/aspect handling, and every platform system above are SYSTEMS: keep
them, tune them, or delete them whole (removal recipes below). The four
example towers, five example enemies, ten example waves, the board layout,
the palette, and every name on screen are EXAMPLE CONTENT: replace them —
your game should not look like the example.

## File Structure

- **src/main.tsx** — Boot sequence, numbered; ORDER matters (SDK init → save load → audio init → React mount → boot-cover lift → asset warm → menu → lifecycles + visibility fallback → fire-and-forget work). Add at the `ADAPT:` points; don't reorder.
- **src/game/config.ts** — THE TUNING HUB. Board (path waypoints, pads + gold-pad bonuses), economy (incl. `sellRefund`), display sizes (the zoom dial), colors, meta-upgrade curves, ads knobs. Its header maps the other three data files.
- **src/game/data/towers.ts** — The tower catalog: cost/range/rate/damage, attack kind (`projectile` with splash/arc, or `beam` with chains), optional status inflict, default targeting, in-run upgrade steps, and the tower's signature `metaUnique` gem track.
- **src/game/data/enemies.ts** — Enemy hp/speed/bounty/livesCost.
- **src/game/data/waves.ts** — The authored invasion, wave by wave (no hidden scaling), plus `waveAt()`: after the authored waves, ENDLESS waves are generated deterministically from the wave number (`ENDLESS` scaling knobs live beside it). There is no win state; runs end on a loss.
- **src/game/data/status.ts** — The status-effect system's types and rules (slow, frozen, poison, burn, knockback) plus `makeEffect`. Open by design; see the recipe.
- **src/game/data/targeting.ts** — The seven targeting modes: ids, button labels, help-popup descriptions.
- **src/game/sim/engine.ts** — The pure engine: spawning, movement + statuses, targeting, beams/projectiles, crits (seeded PRNG), economy, events. No Pixi, no DOM, no SDK at runtime. `createEngine(metaLevels)`.
- **src/game/towerScene.ts** — The view: renders engine state (sprite pools, hp bars, beams, ice cubes, tints, cosmetic lob arc), converts taps to pad selections, drains engine events into sounds, centers the board vertically per aspect ratio.
- **src/game/actions.ts** — React → engine bridge (place/upgrade/sell/targeting/startWave) + `syncStore`.
- **src/game/towerIcons.ts** — Renders tower textures to data URLs at boot for the DOM UI.
- **src/game/textures.ts** — Every texture via `art(alias, fallback)`: manifest-listed real art wins, else the procedural placeholder draws. `freeTexture()` on teardown never destroys real art.
- **src/audio/audio.ts** — Two WebAudio buses, synth SFX + sequenced music loop, volumes persisted. Header documents the real-file swap.
- **src/state/store.ts** / **src/state/save.ts** — UI-facing state bridge; per-player save (cloud + localStorage write-through) with meta levels, gems, audio volumes, and the ads cap slice.
- **src/sdk/** — `runSdk.ts` (init + lifecycles), `leaderboard.ts` (two boards as modes), `ads.ts` (this game's rewarded-ads instance), `engagement.ts` (Like/Comments prompts).
- **src/systems/ads.ts**, **src/shared/serverTime.ts** — Copied in from `@series-inc/run-game-helpers` (copy files in; never import that package at runtime).
- **src/ui/** — App (router + overlays), MainMenu, Hud, BuildSheet (build/upgrade/sell/targeting panel), EndScreen (summary + ad bonus), MetaUpgrades, Leaderboard, Settings, GemCounter, LoadingScreen.
- **scripts/simulate.ts** — `npm run balance`: three deterministic strategies vs your tuning, per-wave lives report.
- **rundot/leaderboard.config.json** — Board definitions; auto-created on `rundot deploy`.
- **game.config.prod.json** — Ships pre-baked with `kitId: "september-jam-tower-defense"` so `rundot init` can attribute the game to this kit and auto-enter it in the jam; do not remove or blank out `kitId`. `rundot init` fills in the rest (`gameId`, `keywords`) in place.

## Invariants (break these and things get weird)

- **The engine stays pure and deterministic.** No Pixi/DOM/SDK imports at runtime (type-only is fine), and NO `Math.random()` — the only randomness is the engine's seeded PRNG, so the simulator's verdicts match real play. New mechanics go in the engine; the scene only renders.
- **The path never stretches.** The board is designed for 1280 design units of height; taller screens center it (`boardHeight` in config). Stretching the path would change path length, and therefore difficulty, per device.
- **The store and engine references live on `globalThis`** (see store.ts). This defuses a real Windows + Vite + Tailwind dev bug where duplicate module copies split the app in two. Keep the pattern for any new singleton.
- **Store patches on discrete events only**, never per frame (`syncStore` diffs first). Per-frame state stays in the engine.
- **Game speed = more fixed-size substeps**, never bigger steps (towerScene tick). 4x is exactly 4 identical sim-seconds per second.
- **Scene teardown frees textures via `freeTexture()`** and each run is a fresh keyed remount (`store.runId`) — there is no reset code path to maintain.
- **After ANY tuning change, run `npm run balance`.** Its printed rule of thumb: sensible strategies win with scratches, the deliberately weak "miser" strategy must lose mid-game. Two traps it has caught: adding enemies adds bounty income (can make waves EASIER), and small coverage/geometry changes can flip marginal boss kills worth several lives.

## Art Spec (author real art at 2x these design-unit sizes)

| Alias | Display size | Notes |
|---|---|---|
| `tower-fox` `tower-owl` `tower-bear` `tower-squirrel` | 64 x 64 | Front-facing; add `tower-<id>` for your own |
| `enemy-beetle` | 42 x 42 | |
| `enemy-wasp` | 40 x 40 | |
| `enemy-snail` | 50 x 50 | |
| `enemy-hornet` | 46 x 46 | |
| `enemy-stag` | 66 x 66 | |
| `proj-fox` `proj-owl` `proj-bear` | 16 x 16 | Beam towers need no projectile |
| `pad` / `pad-gold` | 96 x 52 | Flat 3/4 ellipse on the ground |
| `burrow` | 110 x 64 | Path entrance/exit hole |
| `fx-ice` | 64 x 64 | Drawn semi-transparent over frozen enemies |
| `grass-tile` | 120 x 120 | MUST tile seamlessly on BOTH axes |

Drop a PNG in `public/images/`, list it in `src/assets/manifest.ts` under the
alias, done — the procedural placeholder steps aside, no code changes.

## UI Copy Style

- Never use em dashes in player-facing text. Use commas, parentheses, or separate lines instead. (Code comments are exempt.)
- Keep instructions short and imperative, one idea per line.
- Minimum text size: 1.1rem (~17.6px). Tailwind's text-xs/text-sm are below the floor; use text-[1.1rem] or larger.

## AI Agent Recipes (complete checklists for common requests)

After ANY recipe, run `npx tsc --noEmit` (strict unused checks are on, so
half-applied recipes fail) — and after gameplay recipes, `npm run balance`.

**"Add a tower"** (~5 touch points, all additive)
- `src/game/data/towers.ts`: add a def. Pick the attack kind (`projectile` with optional `splash`/`arc`, or `beam` with `chains`/`chainRange`/`chainFalloff`), an optional `status` (slow, frozen, poison, burn, knockback — see data/status.ts), a default `targeting`, two `upgrades` steps, and a `metaUnique` track (kinds: crit, chains, splash, status-duration, status-damage, knockback).
- `src/game/textures.ts`: add `make<Name>Texture` using the `art('tower-<id>', ...)` resolver (copy an existing critter's shape), and a `makeProj<Name>Texture` unless it is a beam tower.
- `src/game/towerScene.ts`: register both in the `tex.towers` / `tex.projectiles` maps (marked `ADAPT:`).
- `src/game/towerIcons.ts`: add the maker to `MAKERS` (marked `ADAPT:`).
- `src/audio/audio.ts`: optionally add a `sfx.shot` case for the id; unknown ids get the default thud.
- The build sheet, upgrades screen, engine, and sim pick the new tower up from the data automatically.

**"Add an enemy type"**
- `src/game/data/enemies.ts`: add the def (hp, speed, bounty, livesCost).
- `src/game/textures.ts`: add `make<Name>Texture` with alias `enemy-<id>` (use `bugBase` for the standard blob) and register it in towerScene's `tex.enemies` map; add its display size to `CONFIG.sizes.enemy`.
- Use it in `src/game/data/waves.ts`, then `npm run balance`.

**"Add or retune waves / difficulty"**
- Edit `src/game/data/waves.ts` (composition) and/or `src/game/data/enemies.ts` (stats) and/or `CONFIG.economy`.
- Run `npm run balance` after every change; remember bounty income rises with enemy count.

**"Add a status effect"**
- `src/game/data/status.ts`: add a variant to `StatusEffect` (and `LastingInflict` if it persists), extend `makeEffect`.
- `src/game/sim/engine.ts`: teach the status pass its rule — movement effects in `speedFactor`/the movement branch, periodic effects in `stepEffects`, application quirks in `applyInflict` (see the burn/poison one-DoT-slot rule and the knockback slide for two worked examples).
- `src/game/towerScene.ts`: give it a visual in the enemy-sync status block (tint, overlay sprite, or both).
- Give some tower's def the new `status` to inflict it.

**"Change the board (path, pads, bonuses)"**
- `CONFIG.path`: polyline waypoints; keep the first and last points just outside the designed 1280-unit board (burrow decals cap both ends). Changing the path changes its LENGTH, which changes difficulty: run `npm run balance`.
- `CONFIG.pads`: positions plus optional `bonus` (`{stat: 'damage'|'fireRate'|'range', mult}`); bonus pads render gold automatically. Keep pads ~85+ units clear of path centerlines (path is 72 wide, pads 96).
- `CONFIG.boardHeight` stays 1280 unless you redesign for a different reference height.

**"Remove rewarded ads"** (~7 touch points)
- Delete `src/systems/ads.ts`, `src/sdk/ads.ts`, `src/shared/serverTime.ts`.
- `src/ui/EndScreen.tsx`: remove the `adsSystem`/`addGems` imports, the `bonus`/`ads`/`offerBonus` consts, `claimBonus`, the Watch Ad button, and the confirm dialog.
- `src/main.tsx`: remove the `refreshServerTime` import and its three call sites (boot, onResume, onAwake).
- `src/state/save.ts`: remove the `AdsState` import, the `ads` field from `SaveData`/`DEFAULTS`/`parse()`, and `addGems`.
- `src/state/store.ts` + `src/game/towerScene.ts`: remove `adBonusClaimed` (field, init, and the patch in `checkEnd`).
- `src/game/config.ts`: remove the `ads` block.

**"Remove the leaderboards"**
- Delete `src/sdk/leaderboard.ts`, `src/ui/Leaderboard.tsx`, `rundot/leaderboard.config.json`.
- `src/game/towerScene.ts`: remove the `submitRunScores` import and call.
- `src/ui/MainMenu.tsx`: remove the Ranks button. `src/ui/App.tsx`: remove the overlay. `src/state/store.ts`: remove `ranksOpen`.
- `kills`/`elapsed` in the engine can stay (the end screen shows kills).

**"Remove the gem economy (meta upgrades)"** — remove ads first (its reward is gems)
- Delete `src/ui/MetaUpgrades.tsx`, `src/ui/GemCounter.tsx`, `src/game/towerIcons.ts`.
- `src/ui/MainMenu.tsx`: remove the Upgrades button and gem chip. `src/ui/App.tsx`: remove the overlay. `src/ui/EndScreen.tsx`: remove the gem lines.
- `src/state/store.ts`: remove `gems`, `gemsEarned`, `metaLevels`, `metaOpen`, `towerIcons`. `src/main.tsx`: remove their boot patches + `generateTowerIcons`.
- `src/state/save.ts`: remove `gems`/`meta` fields, `recordRunEnd` (keep a plain best-wave recorder), `buyMetaUpgrade`, `metaUpgradeCost`.
- `src/game/sim/engine.ts`: drop the `meta` parameter and the meta blocks in `applyLevel`; `src/game/data/towers.ts`: drop `metaUnique` from the defs and interface.

**"Use my art"** — see the Art Spec table; manifest entries only, no code.
**"Use my audio"** — follow the header of `src/audio/audio.ts`; the buses and volume API stay, only the sound-producing layer changes.
**"Rename the game"** — `<title>` in index.html, headings in `MainMenu.tsx` + `LoadingScreen.tsx`, `name` in package.json, `SAVE_KEY` in `src/state/save.ts`, and the two `globalThis` keys in store.ts/actions.ts.

## Verification (after scaffolding a game from this template)

- `npm install` clean; `npm run dev` boots (black cover → loading bar → menu, no console errors).
- Defend → place a tower on a plain and a gold pad, upgrade, sell (confirm dialog), switch targeting, start waves at 1x and 4x; clear the authored waves (fanfare, HUD flips to "Endless") and lose eventually; gems pay out; Watch Ad grants the bonus in dev (fake ad); meta upgrade applies next run.
- Ranks shows the loading → empty states in dev (the SDK self-mocks; real boards exist only in the host after deploy).
- Settings sliders change volumes and persist across reload.
- Portrait sizes in the device toolbar: board centers on tall screens, path exits into the burrows.
- `npm run balance` prints the three-strategy report and the playable band holds.
- `npm run build` passes; before first deploy: real 512x512 `public/thumbnail.jpg` + `rundot init` (once). After init, `game.config.prod.json` still carries `kitId: "september-jam-tower-defense"` (jam attribution).

## Dev-mode honesty

The SDK self-mocks in a plain browser: `sdkReady()` is true locally,
leaderboard fetches return an empty mock board (the UI shows EMPTY, not
offline), rewarded ads auto-complete, engagement prompts may report
unavailable, and saves go to localStorage only. Real behavior appears in
the RUN host.
