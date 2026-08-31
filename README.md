# Tower Defense Template for RUN.game

Build your own 2D tower defense: Pixi.js v8, React 19, Tailwind CSS v4,
TypeScript, Vite, and the RundotGameAPI SDK, with the platform patterns
already in place and a complete, tuned game loop to make yours. All art is
drawn procedurally and all audio is synthesized at runtime, so it is
playable the moment you clone it — and every placeholder steps aside the
moment you drop in a real asset.

What is wired and working:

- A **pure simulation engine** (no rendering, deterministic) driven entirely by data files, with the Pixi scene as a view over it
- A **headless balance verifier**: `npm run balance` plays your tuning with three strategies and reports per-wave lives in seconds
- Four example towers covering the mechanic space (rapid shot, slowing shot, splash with a lobbed arc, chaining lightning beam), five example enemies, ten authored waves and then **endless** generated waves (survive as long as you can) — all replace-or-delete example content
- A **status-effect system** (slow, frozen, poison, burn, knockback) designed for adding more
- Seven **targeting modes** per placed tower, with a player-facing help popup
- Tap-to-build pads (including gold **bonus pads**), in-run upgrades, selling with a confirmation, 1x to 4x game speed
- **Persistent progression**: gems earned per run buy per-tower upgrade tracks (damage, speed, range, plus each tower's signature track)
- **Two leaderboards** (most kills, highest wave), **rewarded ads** with a trusted-clock daily cap, **Like/Comments prompts**, per-player cloud saves, procedural music/SFX with a settings screen

## Quick Start

```bash
npm install
npm run dev            # http://localhost:5173
npm run balance        # headless balance check, no browser needed
```

## Make It Yours

1. **Tune the board and economy** — `src/game/config.ts` is the tuning hub: path waypoints, pad positions and bonuses, coin economy, display sizes (the zoom dial), colors.
2. **Make the towers and enemies yours** — `src/game/data/towers.ts` and `enemies.ts` are pure data; the engine, UI, shop, and simulator all follow. The shipped four are examples: rename, retune, replace, extend.
3. **Design the invasion** — `src/game/data/waves.ts`, with `npm run balance` after every change. The printed rule of thumb tells you when tuning is in the playable band.
4. **Swap in your art and audio** — drop PNGs in `public/images/` and list them in `src/assets/manifest.ts` under the alias in the art spec table (CLAUDE.md); follow the header of `src/audio/audio.ts` for real sound files. No display or playback code changes either way.
5. **Rename and deploy** — the rename checklist and everything else agents or humans need lives in CLAUDE.md, including complete recipes for adding towers, enemies, waves, and status effects, and for removing whole systems (ads, leaderboards, the gem economy).

## Deploy to RUN.game

Needs the [RUN.game CLI](https://github.com/series-ai/rundot-cli-releases).

```bash
rundot login
rundot init --name <your-game> --description "<desc>" --build-path dist --orientation Portrait
npm run build
rundot deploy
```

`rundot init` runs ONCE per game; after that, iterating is `npm run build && rundot deploy`. The repo ships a `game.config.prod.json` with the kit's `kitId` baked in — `rundot init` keeps it and fills in your game's details, and that `kitId` is what enters your game in the jam, so don't delete it. The two leaderboards are created automatically on first deploy from `rundot/leaderboard.config.json`. Deploys are **private by default** (`--public` to list on Explore). Replace `public/thumbnail.jpg` first: exactly 512x512 JPG (`rundot deploy` rejects placeholders).

## Where Things Live

```
src/main.tsx                 // boot sequence, in the order that matters
src/game/config.ts           // THE TUNING HUB (board, economy, sizes, colors)
src/game/data/               // towers, enemies, waves, statuses, targeting — all data
src/game/sim/engine.ts       // the pure simulation engine
src/game/towerScene.ts       // the Pixi view over the engine
src/game/textures.ts         // art(alias, fallback): real art wins, placeholder draws
src/audio/audio.ts           // music + SFX on two buses; real-file swap documented
src/state/                   // store (UI state) + save (cloud + localStorage)
src/sdk/                     // SDK init, leaderboards, rewarded ads, engagement
src/systems/, src/shared/    // copy-in platform modules (ads core, trusted clock)
src/ui/                      // menu, HUD, build sheet, end screen, shops, settings
scripts/simulate.ts          // npm run balance
rundot/leaderboard.config.json
```

All intended edit points carry `ADAPT:` comments — search the source for
`ADAPT:`. Architecture details, invariants, the art spec, and AI Agent
Recipes are in CLAUDE.md. For platform details, see the
[RUN.game developer docs](https://series-1.gitbook.io/rundot-docs).
