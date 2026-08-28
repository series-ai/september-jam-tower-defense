/**
 * The rendered view over the pure engine (sim/engine.ts): one run per scene
 * instance. Everything gameplay-true happens in the engine; this file only
 * draws state, forwards taps, and keeps sprite pools in sync. A restart is a
 * keyed React remount (store.runId), so there is no in-scene reset path.
 *
 * All positions/sizes are design units (stage.ts).
 */
import {
    Container,
    Graphics,
    Sprite,
    TilingSprite,
    type Application,
    type FederatedPointerEvent,
    type Texture,
    type Ticker,
} from 'pixi.js';
import { CONFIG } from './config.ts';
import { WAVES } from './data/waves.ts';
import { createEngine } from './sim/engine.ts';
import { registerEngine, syncStore } from './actions.ts';
import {
    freeTexture,
    makeBearTexture,
    makeBeetleTexture,
    makeBurrowTexture,
    makeFoxTexture,
    makeGoldPadTexture,
    makeGrassTexture,
    makeHornetTexture,
    makeIceCubeTexture,
    makeOwlTexture,
    makePadTexture,
    makeProjBearTexture,
    makeProjFoxTexture,
    makeProjOwlTexture,
    makeSnailTexture,
    makeSquirrelTexture,
    makeStagTexture,
    makeWaspTexture,
} from './textures.ts';
import { store } from '../state/store.ts';
import { getSave, recordRunEnd } from '../state/save.ts';
import { submitRunScores } from '../sdk/leaderboard.ts';
import { sfx } from '../audio/audio.ts';
import type { Stage } from './stage.ts';

/** The scene contract: every createXxxScene(app, stage) returns one of these. */
export interface Scene {
    destroy(): void;
}

export function createTowerScene(app: Application, stage: Stage): Scene {
    const SZ = CONFIG.sizes;

    const tex = {
        grass: makeGrassTexture(app.renderer),
        pad: makePadTexture(app.renderer),
        padGold: makeGoldPadTexture(app.renderer),
        burrow: makeBurrowTexture(app.renderer),
        ice: makeIceCubeTexture(app.renderer),
        towers: {
            fox: makeFoxTexture(app.renderer),
            owl: makeOwlTexture(app.renderer),
            bear: makeBearTexture(app.renderer),
            squirrel: makeSquirrelTexture(app.renderer),
            // ADAPT: register your new tower's texture maker here (and its
            // projectile below, unless it is a beam tower)
        } as Record<string, Texture>,
        enemies: {
            beetle: makeBeetleTexture(app.renderer),
            wasp: makeWaspTexture(app.renderer),
            snail: makeSnailTexture(app.renderer),
            hornet: makeHornetTexture(app.renderer),
            stag: makeStagTexture(app.renderer),
        } as Record<string, Texture>,
        projectiles: {
            fox: makeProjFoxTexture(app.renderer),
            owl: makeProjOwlTexture(app.renderer),
            bear: makeProjBearTexture(app.renderer),
        } as Record<string, Texture>,
    };

    // ---- static board ------------------------------------------------------
    const grass = new TilingSprite({ texture: tex.grass, width: stage.width, height: stage.designHeight() });
    grass.tileScale.set(0.5);
    // boardRoot carries EVERYTHING gameplay-positioned. The board is designed
    // for a 1280-unit-tall screen; on taller aspects boardRoot is offset so
    // the extra height splits evenly above and below — the path itself never
    // stretches, keeping path length (and therefore balance) identical on
    // every device and in the headless simulator.
    const boardRoot = new Container();
    const board = new Container(); // path, burrows, pads, selection ring
    const world = new Container(); // towers, enemies, projectiles (y-sorted)
    world.sortableChildren = true;
    boardRoot.addChild(board, world);
    stage.root.addChild(grass, boardRoot);

    // the bugs' road: fat rounded polyline, edge stroke first for a border
    const road = new Graphics();
    const drawRoad = (g: Graphics, width: number, color: number) => {
        g.moveTo(CONFIG.path[0].x, CONFIG.path[0].y);
        for (let i = 1; i < CONFIG.path.length; i++) g.lineTo(CONFIG.path[i].x, CONFIG.path[i].y);
        g.stroke({ width, color, cap: 'round', join: 'round' });
    };
    drawRoad(road, SZ.pathWidth + 14, CONFIG.colors.pathEdge);
    drawRoad(road, SZ.pathWidth, CONFIG.colors.pathDirt);
    board.addChild(road);

    // burrows at both ends of the road, so bugs appear and vanish INTO
    // something no matter where the board sits vertically
    for (const end of [CONFIG.path[0], CONFIG.path[CONFIG.path.length - 1]]) {
        const hole = new Sprite(tex.burrow);
        hole.anchor.set(0.5);
        hole.width = 110;
        hole.height = 64;
        hole.position.set(end.x, end.y);
        board.addChild(hole);
    }

    for (const pad of CONFIG.pads) {
        // gold stone for bonus pads, plain stone otherwise
        const p = new Sprite(pad.bonus ? tex.padGold : tex.pad);
        p.anchor.set(0.5);
        p.width = SZ.pad.w;
        p.height = SZ.pad.h;
        p.position.set(pad.x, pad.y);
        board.addChild(p);
    }

    // selection highlight + range preview for the selected pad
    const selection = new Graphics();
    board.addChild(selection);

    // lightning beams: short-lived glowing polylines above the world
    const beamLayer = new Graphics();
    beamLayer.zIndex = 9000;
    world.addChild(beamLayer);
    const BEAM_TTL = 0.18;
    const beams: { points: { x: number; y: number }[]; ttl: number }[] = [];

    function drawBeams(dt: number): void {
        beamLayer.clear();
        for (let i = beams.length - 1; i >= 0; i--) {
            const b = beams[i];
            b.ttl -= dt;
            if (b.ttl <= 0) {
                beams.splice(i, 1);
                continue;
            }
            const alpha = b.ttl / BEAM_TTL;
            beamLayer.moveTo(b.points[0].x, b.points[0].y);
            for (let p = 1; p < b.points.length; p++) beamLayer.lineTo(b.points[p].x, b.points[p].y);
            beamLayer.stroke({ width: 9, color: CONFIG.colors.lightning, alpha: alpha * 0.45 });
            beamLayer.moveTo(b.points[0].x, b.points[0].y);
            for (let p = 1; p < b.points.length; p++) beamLayer.lineTo(b.points[p].x, b.points[p].y);
            beamLayer.stroke({ width: 3.5, color: 0xffffff, alpha });
        }
    }

    const anchorBoard = () => {
        const dh = stage.designHeight();
        grass.height = dh;
        boardRoot.y = Math.max(0, (dh - CONFIG.boardHeight) / 2);
    };
    anchorBoard();
    const offResize = stage.onResize(anchorBoard);

    // ---- engine (with the player's persistent meta upgrades applied) -------
    const engine = createEngine(getSave().meta);
    registerEngine(engine);
    store.patch({
        selectedPad: null,
        waveCount: WAVES.length,
        tdPhase: 'build',
        wave: 1,
    });
    syncStore();

    // ---- tap-to-select pads ------------------------------------------------
    const onTap = (e: FederatedPointerEvent) => {
        // convert through boardRoot so pad hit-tests track the vertical offset
        const local = boardRoot.toLocal(e.global);
        let hit: number | null = null;
        for (let i = 0; i < CONFIG.pads.length; i++) {
            if (Math.hypot(local.x - CONFIG.pads[i].x, local.y - CONFIG.pads[i].y) < CONFIG.padTapRadius) {
                hit = i;
                break;
            }
        }
        store.patch({ selectedPad: hit === store.get().selectedPad ? null : hit });
    };
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointertap', onTap);

    // ---- sprite pools synced from engine state -----------------------------
    interface EnemyView { node: Container; sprite: Sprite; hpBar: Graphics; ice: Sprite; lastHp: number }
    const enemyViews = new Map<number, EnemyView>();
    const projViews = new Map<number, Sprite>();
    const towerViews = new Map<number, Container>(); // by padIndex
    const towerLevels = new Map<number, number>();

    function syncEnemies(): void {
        const alive = new Set<number>();
        for (const e of engine.state.enemies) {
            alive.add(e.uid);
            let v = enemyViews.get(e.uid);
            if (!v) {
                const node = new Container();
                const size = SZ.enemy[e.def.id as keyof typeof SZ.enemy] ?? 44;
                const shadow = new Graphics();
                shadow.ellipse(0, size * 0.42, size * 0.4, size * 0.14)
                    .fill({ color: CONFIG.colors.shadow, alpha: 0.2 });
                const sprite = new Sprite(tex.enemies[e.def.id]);
                sprite.anchor.set(0.5);
                sprite.width = size;
                sprite.height = size;
                const hpBar = new Graphics();
                hpBar.y = -size * 0.62;
                const ice = new Sprite(tex.ice);
                ice.anchor.set(0.5);
                ice.width = size * 1.25;
                ice.height = size * 1.25;
                ice.visible = false;
                node.addChild(shadow, sprite, ice, hpBar);
                world.addChild(node);
                v = { node, sprite, hpBar, ice, lastHp: -1 };
                enemyViews.set(e.uid, v);
            }
            v.node.position.set(e.x, e.y);
            v.node.zIndex = e.y;
            // status visuals: ice cube while frozen; green tint for poison,
            // orange for burn (the two never coexist — one DoT slot)
            let frozen = false;
            let tint = 0xffffff;
            for (const s of e.effects) {
                if (s.type === 'frozen') frozen = true;
                if (s.type === 'poison') tint = 0x9fe87a;
                if (s.type === 'burn') tint = 0xffa15c;
            }
            v.ice.visible = frozen;
            v.sprite.tint = tint;
            if (v.lastHp !== e.hp) {
                v.lastHp = e.hp;
                const frac = Math.max(0, e.hp / e.maxHp);
                v.hpBar.clear();
                if (frac < 1) {
                    v.hpBar.rect(-18, 0, 36, 6).fill(CONFIG.colors.hpBack);
                    v.hpBar.rect(-18, 0, 36 * frac, 6).fill(CONFIG.colors.hpFill);
                }
            }
        }
        for (const [uid, v] of enemyViews) {
            if (!alive.has(uid)) {
                v.node.destroy({ children: true });
                enemyViews.delete(uid);
            }
        }
    }

    function syncProjectiles(): void {
        const alive = new Set<number>();
        for (const p of engine.state.projectiles) {
            alive.add(p.uid);
            let s = projViews.get(p.uid);
            if (!s) {
                s = new Sprite(tex.projectiles[p.towerId]);
                s.anchor.set(0.5);
                s.width = SZ.projectile;
                s.height = SZ.projectile;
                s.zIndex = 5000; // always above the crowd
                world.addChild(s);
                projViews.set(p.uid, s);
            }
            // the bear's boulder lobs: a cosmetic vertical arc from launch
            // progress (the sim itself flies straight, so balance is unmoved)
            if (p.arc) {
                const travelled = Math.hypot(p.x - p.sx, p.y - p.sy);
                const progress = Math.min(1, travelled / Math.max(1, p.flight));
                s.position.set(p.x, p.y - Math.sin(Math.PI * progress) * 55);
            } else {
                s.position.set(p.x, p.y);
            }
        }
        for (const [uid, s] of projViews) {
            if (!alive.has(uid)) {
                s.destroy();
                projViews.delete(uid);
            }
        }
    }

    function syncTowers(): void {
        // sold towers: drop their sprites
        const occupied = new Set(engine.state.towers.map((t) => t.padIndex));
        for (const [pad, node] of towerViews) {
            if (!occupied.has(pad)) {
                node.destroy({ children: true });
                towerViews.delete(pad);
                towerLevels.delete(pad);
            }
        }
        for (const t of engine.state.towers) {
            let node = towerViews.get(t.padIndex);
            if (!node) {
                node = new Container();
                const shadow = new Graphics();
                shadow.ellipse(0, SZ.tower * 0.42, SZ.tower * 0.42, SZ.tower * 0.15)
                    .fill({ color: CONFIG.colors.shadow, alpha: 0.22 });
                const sprite = new Sprite(tex.towers[t.def.id]);
                sprite.anchor.set(0.5);
                sprite.width = SZ.tower;
                sprite.height = SZ.tower;
                const pips = new Graphics();
                pips.y = SZ.tower * 0.58;
                node.addChild(shadow, sprite, pips);
                node.position.set(t.x, t.y - 14); // tower stands on the pad
                node.zIndex = t.y;
                world.addChild(node);
                towerViews.set(t.padIndex, node);
                towerLevels.set(t.padIndex, 0);
            }
            if (towerLevels.get(t.padIndex) !== t.level) {
                towerLevels.set(t.padIndex, t.level);
                const pips = node.children[2] as Graphics;
                pips.clear();
                for (let i = 0; i < t.level; i++) {
                    pips.circle((i - (t.level - 1) / 2) * 14, 0, 5).fill(CONFIG.colors.arrow);
                }
            }
        }
    }

    function drawSelection(): void {
        selection.clear();
        const sel = store.get().selectedPad;
        if (sel === null) return;
        const pad = CONFIG.pads[sel];
        selection.ellipse(pad.x, pad.y, SZ.pad.w * 0.62, SZ.pad.h * 0.62)
            .stroke({ width: 4, color: 0xffffff, alpha: 0.8 });
        const t = engine.state.towers.find((tw) => tw.padIndex === sel);
        if (t) {
            selection.circle(pad.x, pad.y, t.range)
                .stroke({ width: 3, color: CONFIG.colors.range, alpha: 0.35 });
        }
    }

    /**
     * Engine events → sounds, capped per frame so a 4x-speed massacre stays
     * an accent, not a wall of noise: one shot per tower type, a couple of
     * pops/leaks, and the one-shot jingles.
     */
    function playEvents(evts: ReturnType<typeof engine.drainEvents>): void {
        const shotTypes = new Set<string>();
        let deaths = 0;
        let leaks = 0;
        for (const e of evts) {
            if (e.type === 'beam') {
                beams.push({ points: e.points, ttl: BEAM_TTL });
                if (!shotTypes.has(e.towerId)) {
                    shotTypes.add(e.towerId);
                    sfx.shot(e.towerId);
                }
            } else if (e.type === 'shot' && !shotTypes.has(e.towerId)) {
                shotTypes.add(e.towerId);
                sfx.shot(e.towerId);
            } else if (e.type === 'death' && deaths < 2) {
                deaths++;
                sfx.death();
            } else if (e.type === 'leak' && leaks < 2) {
                leaks++;
                sfx.leak();
            } else if (e.type === 'wave-clear') {
                // clearing the last authored wave is the campaign milestone
                if (e.cleared === WAVES.length) sfx.win();
                else sfx.waveClear();
            } else if (e.type === 'lost') {
                sfx.lose();
            }
        }
    }

    // ---- run end bookkeeping ----------------------------------------------
    let ended = false;
    function checkEnd(): void {
        if (ended) return;
        const phase = engine.state.phase;
        if (phase === 'lost') {
            ended = true;
            // waveIndex counts fully CLEARED waves at this point
            const { gemsEarned, save } = recordRunEnd(engine.state.waveIndex);
            // fire-and-forget: both boards, server keeps each player's best
            submitRunScores(engine.state.kills, engine.state.waveIndex, engine.state.elapsed);
            store.patch({
                bestWave: save.bestWave,
                gems: save.gems,
                gemsEarned,
                adBonusClaimed: false,
                runKills: engine.state.kills,
                selectedPad: null,
            });
        }
    }

    // ---- tick --------------------------------------------------------------
    const tick = (ticker: Ticker) => {
        const dt = Math.min(ticker.deltaMS, 50) / 1000;
        // Speed-up runs MORE substeps of the same dt (never one bigger step),
        // so 4x is exactly 4 seconds of identical simulation per second.
        for (let i = 0; i < store.get().speed; i++) engine.step(dt);
        playEvents(engine.drainEvents());
        syncStore();
        syncEnemies();
        syncProjectiles();
        syncTowers();
        drawBeams(dt);
        drawSelection();
        checkEnd();
    };
    app.ticker.add(tick);

    return {
        destroy() {
            app.ticker.remove(tick);
            app.stage.off('pointertap', onTap);
            offResize();
            registerEngine(null);
            grass.destroy();
            boardRoot.destroy({ children: true });
            freeTexture(tex.grass);
            freeTexture(tex.pad);
            freeTexture(tex.padGold);
            freeTexture(tex.burrow);
            freeTexture(tex.ice);
            for (const t of Object.values(tex.towers)) freeTexture(t);
            for (const t of Object.values(tex.enemies)) freeTexture(t);
            for (const t of Object.values(tex.projectiles)) freeTexture(t);
        },
    };
}
