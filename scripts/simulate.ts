/**
 * Headless balance simulator — `npm run balance`.
 *
 * Runs the EXACT game engine (src/game/sim/engine.ts) against canned
 * build strategies at 30 steps/simulated-second, no rendering, and reports
 * per-wave lives so tuning changes in config/data are verifiable in seconds:
 *
 *   - If every strategy loses early, the waves are too hard (unwinnable).
 *   - If the deliberately weak "miser" strategy wins, they are too easy.
 *   - The playable band is: sensible strategies win, the miser does not.
 *
 * Strategies buy during build phases only (like a calm player). They are
 * deterministic, so a given config always prints the same table.
 */
import { CONFIG } from '../src/game/config.ts';
import { WAVES } from '../src/game/data/waves.ts';
import { createEngine, type Engine } from '../src/game/sim/engine.ts';

const DT = 1 / 30;
/** Endless never ends: stop the sim this many waves past the authored set. */
const MAX_WAVES = WAVES.length + 15;
/** Safety valve: no wave should take longer than this to resolve. */
const MAX_WAVE_SECONDS = 300;

/** Pad build priority: center double-coverage pads first, corners last. */
const PAD_PRIORITY = [2, 1, 3, 4, 5, 0, 6, 7];

interface Strategy {
    name: string;
    /** Called every build phase; spend what you want. */
    buy(e: Engine): void;
}

function nextFreePad(e: Engine): number | null {
    for (const pad of PAD_PRIORITY) {
        if (!e.state.towers.some((t) => t.padIndex === pad)) return pad;
    }
    return null;
}

/** Upgrade the cheapest available upgrade, repeatedly. */
function upgradeCheapest(e: Engine): boolean {
    let bestPad = -1;
    let bestCost = Infinity;
    for (const t of e.state.towers) {
        if (t.level > t.def.upgrades.length) continue;
        const cost = t.def.upgrades[t.level - 1].cost;
        if (cost < bestCost) {
            bestCost = cost;
            bestPad = t.padIndex;
        }
    }
    if (bestPad < 0 || e.state.coins < bestCost) return false;
    return e.upgradeTower(bestPad);
}

const STRATEGIES: Strategy[] = [
    {
        // everything into foxes, then upgrades — the single-tower baseline
        name: 'fox-spam',
        buy(e) {
            let acted = true;
            while (acted) {
                acted = false;
                const pad = nextFreePad(e);
                if (pad !== null && e.placeTower(pad, 'fox')) acted = true;
                else if (upgradeCheapest(e)) acted = true;
            }
        },
    },
    {
        // intended composition: a bit of everything the roster offers
        name: 'balanced',
        buy(e) {
            const buildOrder = ['fox', 'owl', 'squirrel', 'bear', 'fox', 'squirrel', 'fox', 'bear'];
            let acted = true;
            while (acted) {
                acted = false;
                const pad = nextFreePad(e);
                const built = e.state.towers.length;
                if (pad !== null && built < buildOrder.length && e.placeTower(pad, buildOrder[built])) {
                    acted = true;
                } else if (upgradeCheapest(e)) {
                    acted = true;
                }
            }
        },
    },
    {
        // deliberately weak: two foxes, never another purchase. Must LOSE,
        // or the waves are too easy.
        name: 'miser (should lose)',
        buy(e) {
            if (e.state.towers.length < 2) {
                const pad = nextFreePad(e);
                if (pad !== null) e.placeTower(pad, 'fox');
            }
        },
    },
];

function run(strategy: Strategy): void {
    const e = createEngine();
    const rows: string[] = [];
    while (e.state.phase === 'build' && e.state.waveIndex < MAX_WAVES) {
        strategy.buy(e);
        const waveNo = e.state.waveIndex + 1;
        const livesBefore = e.state.lives;
        const towerCount = e.state.towers.length;
        const coinsBefore = e.state.coins;
        e.startWave();
        let t = 0;
        while (e.state.phase === 'wave' && t < MAX_WAVE_SECONDS) {
            e.step(DT);
            t += DT;
        }
        if (t >= MAX_WAVE_SECONDS) {
            rows.push(`  wave ${waveNo}: STALLED after ${MAX_WAVE_SECONDS}s (bug or unkillable enemy?)`);
            break;
        }
        const leaked = livesBefore - e.state.lives;
        rows.push(
            `  wave ${String(waveNo).padStart(2)}: ` +
            `lives ${String(e.state.lives).padStart(2)} ` +
            `(leaked ${leaked}) towers ${towerCount} ` +
            `coins ${coinsBefore}->${e.state.coins} ` +
            `cleared in ${t.toFixed(0)}s`
        );
        if (e.state.phase === 'lost') break;
    }
    const outcome =
        e.state.phase === 'lost'
            ? `LOST on wave ${e.state.waveIndex + 1}`
            : `SURVIVED to the sim cap (wave ${MAX_WAVES}) with ${e.state.lives}/${CONFIG.economy.startLives} lives`;
    console.log(`\n${strategy.name}: ${outcome}`);
    for (const r of rows) console.log(r);
}

console.log(`Balance simulation — ${WAVES.length} waves, dt=${DT.toFixed(3)}s`);
for (const s of STRATEGIES) run(s);

console.log('\nReading the results:');
console.log(`  - balanced and fox-spam should clear all ${WAVES.length} authored waves, then die somewhere in endless.`);
console.log('  - miser must LOSE, ideally around waves 4-6.');
console.log('  - Endless is meant to kill everyone eventually; if a strategy survives to the cap, scaling is too soft.');
