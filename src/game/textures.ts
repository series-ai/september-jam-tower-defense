/**
 * Every texture the game uses comes from here, resolved in two steps:
 *
 *   1. REAL ART — if the alias is listed in src/assets/manifest.ts (and so
 *      was loaded at boot), that image is used.
 *   2. PROCEDURAL FALLBACK — otherwise the placeholder is drawn at runtime,
 *      so the game always runs, even with zero bundled images.
 *
 * To swap in your art: drop a PNG in public/images/, add it to the manifest
 * under the alias named on the make*() function below, done — no code
 * changes anywhere else.
 *
 * Aliases (display sizes live in CONFIG.sizes; author real art at 2x them):
 *   'tower-fox' / 'tower-owl' / 'tower-bear' / 'tower-squirrel'
 *                                              the towers, front-facing
 *   'enemy-beetle' / 'enemy-wasp' / 'enemy-snail' / 'enemy-hornet' / 'enemy-stag'
 *   'proj-fox' / 'proj-owl' / 'proj-bear'      projectiles (beams draw as lines)
 *   'fx-ice'                                   translucent cube over frozen enemies
 *   'pad'                                      stone build spot (flat 3/4 ellipse)
 *   'pad-gold'                                 bonus build spot (gold, star etched)
 *   'burrow'                                   hole the bugs enter/exit through
 *   'grass-tile'                               ground, must tile on BOTH axes
 *
 * Procedural textures are drawn at 2x their design-unit display size and
 * scaled down by the sprites that use them, so edges stay crisp at high DPR.
 */
import { Assets, Graphics, Texture, type Renderer } from 'pixi.js';
import { CONFIG } from './config.ts';

const C = CONFIG.colors;
const SS = 2;

const generated = new WeakSet<Texture>();

/** Manifest-listed art wins; the drawn placeholder is the fallback. */
function art(alias: string, fallback: () => Texture): Texture {
    if (Assets.cache.has(alias)) return Assets.get<Texture>(alias);
    return fallback();
}

function gen(renderer: Renderer, draw: (g: Graphics) => void): Texture {
    const g = new Graphics();
    draw(g);
    const tex = renderer.generateTexture({ target: g, resolution: 1 });
    g.destroy();
    generated.add(tex);
    return tex;
}

/**
 * Scene teardown MUST use this instead of texture.destroy(): generated
 * placeholders are per-scene and freed; manifest-loaded art is shared in
 * the Assets cache and must survive scene remounts.
 */
export function freeTexture(tex: Texture): void {
    if (generated.has(tex)) tex.destroy(true);
}

const T = CONFIG.sizes.tower * SS;

/** Fox: orange, pointed ears, white muzzle. */
export function makeFoxTexture(renderer: Renderer): Texture {
    return art('tower-fox', () => gen(renderer, (g) => {
        const w = T;
        const h = T;
        // ears
        g.poly([w * 0.14, h * 0.3, w * 0.24, h * 0.02, w * 0.4, h * 0.24]).fill(C.fox);
        g.poly([w * 0.86, h * 0.3, w * 0.76, h * 0.02, w * 0.6, h * 0.24]).fill(C.fox);
        g.poly([w * 0.19, h * 0.24, w * 0.25, h * 0.08, w * 0.34, h * 0.22]).fill(C.foxDark);
        g.poly([w * 0.81, h * 0.24, w * 0.75, h * 0.08, w * 0.66, h * 0.22]).fill(C.foxDark);
        // head/body
        g.roundRect(w * 0.08, h * 0.18, w * 0.84, h * 0.78, w * 0.3).fill(C.fox);
        // muzzle
        g.ellipse(w * 0.5, h * 0.68, w * 0.26, h * 0.2).fill(C.belly);
        g.ellipse(w * 0.5, h * 0.58, w * 0.07, h * 0.05).fill(C.eyePupil);
        // eyes
        g.circle(w * 0.33, h * 0.46, w * 0.08).fill(C.eyeWhite);
        g.circle(w * 0.67, h * 0.46, w * 0.08).fill(C.eyeWhite);
        g.circle(w * 0.33, h * 0.475, w * 0.04).fill(C.eyePupil);
        g.circle(w * 0.67, h * 0.475, w * 0.04).fill(C.eyePupil);
    }));
}

/** Owl: violet-grey, huge eyes, tufts. */
export function makeOwlTexture(renderer: Renderer): Texture {
    return art('tower-owl', () => gen(renderer, (g) => {
        const w = T;
        const h = T;
        // tufts
        g.poly([w * 0.2, h * 0.22, w * 0.14, h * 0.02, w * 0.36, h * 0.14]).fill(C.owlDark);
        g.poly([w * 0.8, h * 0.22, w * 0.86, h * 0.02, w * 0.64, h * 0.14]).fill(C.owlDark);
        // body
        g.roundRect(w * 0.08, h * 0.1, w * 0.84, h * 0.86, w * 0.36).fill(C.owl);
        // belly feathers
        g.ellipse(w * 0.5, h * 0.76, w * 0.28, h * 0.18).fill(C.belly);
        // eye discs
        g.circle(w * 0.33, h * 0.4, w * 0.17).fill(C.belly);
        g.circle(w * 0.67, h * 0.4, w * 0.17).fill(C.belly);
        g.circle(w * 0.33, h * 0.4, w * 0.09).fill(C.eyePupil);
        g.circle(w * 0.67, h * 0.4, w * 0.09).fill(C.eyePupil);
        g.circle(w * 0.36, h * 0.37, w * 0.03).fill(C.eyeWhite);
        g.circle(w * 0.7, h * 0.37, w * 0.03).fill(C.eyeWhite);
        // beak
        g.poly([w * 0.5, h * 0.48, w * 0.44, h * 0.58, w * 0.56, h * 0.58]).fill(C.wasp);
    }));
}

/** Bear: big, brown, round ears. */
export function makeBearTexture(renderer: Renderer): Texture {
    return art('tower-bear', () => gen(renderer, (g) => {
        const w = T;
        const h = T;
        // ears
        g.circle(w * 0.22, h * 0.14, w * 0.13).fill(C.bear);
        g.circle(w * 0.78, h * 0.14, w * 0.13).fill(C.bear);
        g.circle(w * 0.22, h * 0.14, w * 0.06).fill(C.bearDark);
        g.circle(w * 0.78, h * 0.14, w * 0.06).fill(C.bearDark);
        // body
        g.roundRect(w * 0.04, h * 0.1, w * 0.92, h * 0.86, w * 0.32).fill(C.bear);
        // muzzle
        g.ellipse(w * 0.5, h * 0.62, w * 0.24, h * 0.18).fill(C.belly);
        g.ellipse(w * 0.5, h * 0.55, w * 0.08, h * 0.055).fill(C.eyePupil);
        // eyes
        g.circle(w * 0.32, h * 0.4, w * 0.055).fill(C.eyePupil);
        g.circle(w * 0.68, h * 0.4, w * 0.055).fill(C.eyePupil);
    }));
}

/** Squirrel: russet, big tail arcing behind, tufted ears. */
export function makeSquirrelTexture(renderer: Renderer): Texture {
    return art('tower-squirrel', () => gen(renderer, (g) => {
        const w = T;
        const h = T;
        // the tail, arcing up behind the body
        g.ellipse(w * 0.82, h * 0.42, w * 0.2, h * 0.4).fill(C.squirrelDark);
        g.ellipse(w * 0.78, h * 0.3, w * 0.13, h * 0.2).fill(C.squirrel);
        // ears
        g.poly([w * 0.18, h * 0.28, w * 0.26, h * 0.04, w * 0.38, h * 0.24]).fill(C.squirrel);
        g.poly([w * 0.62, h * 0.24, w * 0.72, h * 0.04, w * 0.8, h * 0.26]).fill(C.squirrel);
        // body
        g.roundRect(w * 0.06, h * 0.18, w * 0.7, h * 0.78, w * 0.26).fill(C.squirrel);
        // belly
        g.ellipse(w * 0.41, h * 0.72, w * 0.22, h * 0.2).fill(C.belly);
        // eyes
        g.circle(w * 0.26, h * 0.42, w * 0.07).fill(C.eyeWhite);
        g.circle(w * 0.54, h * 0.42, w * 0.07).fill(C.eyeWhite);
        g.circle(w * 0.27, h * 0.435, w * 0.035).fill(C.eyePupil);
        g.circle(w * 0.55, h * 0.435, w * 0.035).fill(C.eyePupil);
        // static spark above the head
        g.poly([
            w * 0.46, h * 0.02, w * 0.4, h * 0.14, w * 0.46, h * 0.14,
            w * 0.4, h * 0.26, w * 0.52, h * 0.12, w * 0.46, h * 0.12,
        ]).fill(C.lightning);
    }));
}

function bugBase(g: Graphics, w: number, h: number, body: number, dark: number): void {
    g.ellipse(w * 0.5, h * 0.55, w * 0.42, h * 0.38).fill(body);
    g.ellipse(w * 0.5, h * 0.3, w * 0.24, h * 0.2).fill(dark);
    // eyes on the head blob
    g.circle(w * 0.42, h * 0.26, w * 0.045).fill(C.eyeWhite);
    g.circle(w * 0.58, h * 0.26, w * 0.045).fill(C.eyeWhite);
}

export function makeBeetleTexture(renderer: Renderer): Texture {
    return art('enemy-beetle', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.enemy.beetle * SS;
        bugBase(g, s, s, C.beetle, C.beetleDark);
        g.rect(s * 0.48, s * 0.36, s * 0.04, s * 0.54).fill(C.beetleDark); // shell split
    }));
}

export function makeWaspTexture(renderer: Renderer): Texture {
    return art('enemy-wasp', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.enemy.wasp * SS;
        // wings
        g.ellipse(s * 0.2, s * 0.42, s * 0.18, s * 0.1).fill({ color: 0xffffff, alpha: 0.5 });
        g.ellipse(s * 0.8, s * 0.42, s * 0.18, s * 0.1).fill({ color: 0xffffff, alpha: 0.5 });
        bugBase(g, s, s, C.wasp, C.waspDark);
        g.rect(s * 0.2, s * 0.5, s * 0.6, s * 0.09).fill(C.waspDark);
        g.rect(s * 0.24, s * 0.68, s * 0.52, s * 0.09).fill(C.waspDark);
    }));
}

export function makeSnailTexture(renderer: Renderer): Texture {
    return art('enemy-snail', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.enemy.snail * SS;
        // body/foot
        g.ellipse(s * 0.45, s * 0.78, s * 0.4, s * 0.16).fill(C.snail);
        g.circle(s * 0.16, s * 0.5, s * 0.11).fill(C.snail); // head
        g.circle(s * 0.13, s * 0.45, s * 0.028).fill(C.eyePupil);
        // shell spiral
        g.circle(s * 0.58, s * 0.5, s * 0.3).fill(C.snailShell);
        g.circle(s * 0.58, s * 0.5, s * 0.18).fill(C.snail);
        g.circle(s * 0.58, s * 0.5, s * 0.08).fill(C.snailShell);
    }));
}

export function makeHornetTexture(renderer: Renderer): Texture {
    return art('enemy-hornet', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.enemy.hornet * SS;
        g.ellipse(s * 0.2, s * 0.38, s * 0.2, s * 0.11).fill({ color: 0xffffff, alpha: 0.5 });
        g.ellipse(s * 0.8, s * 0.38, s * 0.2, s * 0.11).fill({ color: 0xffffff, alpha: 0.5 });
        bugBase(g, s, s, C.hornet, C.waspDark);
        g.rect(s * 0.2, s * 0.52, s * 0.6, s * 0.09).fill(C.waspDark);
        // stinger
        g.poly([s * 0.5, s * 0.98, s * 0.44, s * 0.84, s * 0.56, s * 0.84]).fill(C.waspDark);
    }));
}

export function makeStagTexture(renderer: Renderer): Texture {
    return art('enemy-stag', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.enemy.stag * SS;
        // mandibles
        g.poly([s * 0.34, s * 0.2, s * 0.18, s * 0.0, s * 0.3, s * 0.0, s * 0.44, s * 0.16]).fill(C.stag);
        g.poly([s * 0.66, s * 0.2, s * 0.82, s * 0.0, s * 0.7, s * 0.0, s * 0.56, s * 0.16]).fill(C.stag);
        bugBase(g, s, s, C.stag, C.beetleDark);
        g.rect(s * 0.48, s * 0.36, s * 0.04, s * 0.54).fill(C.beetleDark);
        // angry brows
        g.rect(s * 0.36, s * 0.2, s * 0.1, s * 0.025).fill(C.eyeWhite);
        g.rect(s * 0.54, s * 0.2, s * 0.1, s * 0.025).fill(C.eyeWhite);
    }));
}

export function makeProjFoxTexture(renderer: Renderer): Texture {
    return art('proj-fox', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.projectile * SS;
        g.poly([s * 0.5, 0, s, s * 0.5, s * 0.5, s, 0, s * 0.5]).fill(C.arrow);
    }));
}

export function makeProjOwlTexture(renderer: Renderer): Texture {
    return art('proj-owl', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.projectile * SS;
        g.circle(s / 2, s / 2, s * 0.4).fill(C.frost);
        g.circle(s / 2, s / 2, s * 0.2).fill(C.eyeWhite);
    }));
}

export function makeProjBearTexture(renderer: Renderer): Texture {
    return art('proj-bear', () => gen(renderer, (g) => {
        const s = CONFIG.sizes.projectile * SS;
        g.circle(s / 2, s / 2, s * 0.5).fill(C.boulder);
        g.circle(s * 0.38, s * 0.38, s * 0.14).fill({ color: 0xffffff, alpha: 0.35 });
    }));
}

/** Translucent ice cube, drawn over frozen bugs (scaled per bug by the view). */
export function makeIceCubeTexture(renderer: Renderer): Texture {
    return art('fx-ice', () => gen(renderer, (g) => {
        const s = 64 * SS;
        g.roundRect(0, 0, s, s, s * 0.18).fill({ color: C.ice, alpha: 0.55 });
        g.roundRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88, s * 0.14)
            .stroke({ width: s * 0.05, color: 0xffffff, alpha: 0.5 });
        // glint
        g.poly([s * 0.16, s * 0.34, s * 0.34, s * 0.16, s * 0.44, s * 0.16, s * 0.16, s * 0.44])
            .fill({ color: 0xffffff, alpha: 0.55 });
    }));
}

/** Stone build pad: flat 3/4 ellipse. */
export function makePadTexture(renderer: Renderer): Texture {
    return art('pad', () => gen(renderer, (g) => {
        const w = CONFIG.sizes.pad.w * SS;
        const h = CONFIG.sizes.pad.h * SS;
        g.ellipse(w * 0.5, h * 0.55, w * 0.48, h * 0.42).fill(C.padDark);
        g.ellipse(w * 0.5, h * 0.48, w * 0.44, h * 0.36).fill(C.pad);
        g.ellipse(w * 0.36, h * 0.4, w * 0.09, h * 0.09).fill(C.padDark);
        g.ellipse(w * 0.62, h * 0.55, w * 0.07, h * 0.08).fill(C.padDark);
    }));
}

/** GOLD build pad: a bonus spot (config pads with a `bonus`). */
export function makeGoldPadTexture(renderer: Renderer): Texture {
    return art('pad-gold', () => gen(renderer, (g) => {
        const w = CONFIG.sizes.pad.w * SS;
        const h = CONFIG.sizes.pad.h * SS;
        g.ellipse(w * 0.5, h * 0.55, w * 0.48, h * 0.42).fill(C.goldDark);
        g.ellipse(w * 0.5, h * 0.48, w * 0.44, h * 0.36).fill(C.gold);
        // star etched into the stone
        const cx = w * 0.5;
        const cy = h * 0.48;
        const pts: number[] = [];
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? w * 0.11 : w * 0.045;
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8);
        }
        g.poly(pts).fill(C.goldShine);
        g.ellipse(w * 0.34, h * 0.36, w * 0.06, h * 0.07).fill(C.goldShine);
    }));
}

/** Burrow: the dark hole bugs crawl out of (path start) and escape into (path end). */
export function makeBurrowTexture(renderer: Renderer): Texture {
    return art('burrow', () => gen(renderer, (g) => {
        const w = 110 * SS;
        const h = 64 * SS;
        // mounded dirt rim
        g.ellipse(w * 0.5, h * 0.5, w * 0.5, h * 0.48).fill(C.pathEdge);
        g.ellipse(w * 0.5, h * 0.46, w * 0.44, h * 0.38).fill(C.pathDirt);
        // the hole
        g.ellipse(w * 0.5, h * 0.52, w * 0.36, h * 0.28).fill(0x120e16);
        // inner shadow crescent
        g.ellipse(w * 0.5, h * 0.42, w * 0.3, h * 0.14).fill(0x000000);
    }));
}

/** Grass tile — MUST tile seamlessly on both axes (speckles off the edges). */
export function makeGrassTexture(renderer: Renderer): Texture {
    return art('grass-tile', () => gen(renderer, (g) => {
        const s = 120 * SS;
        g.rect(0, 0, s, s).fill(C.grass);
        const specks: [number, number][] = [
            [0.2, 0.3], [0.55, 0.18], [0.75, 0.55], [0.3, 0.7], [0.6, 0.82], [0.12, 0.55],
        ];
        for (const [x, y] of specks) {
            g.roundRect(s * x, s * y, s * 0.06, s * 0.03, 4).fill(C.grassSpeck);
        }
    }));
}
