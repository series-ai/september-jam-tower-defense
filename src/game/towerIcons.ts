/**
 * Tower icons for the React UI (upgrades menu). The tower art is Pixi
 * textures (procedural, or real art via the manifest — same art() resolver
 * either way), so to show it in DOM we render each texture once with a
 * tiny throwaway renderer and extract a PNG data URL. Generated
 * fire-and-forget at boot (main.tsx step 8) into store.towerIcons.
 */
import { autoDetectRenderer, type Renderer, type Texture } from 'pixi.js';
import { TOWERS } from './data/towers.ts';
import {
    freeTexture,
    makeBearTexture,
    makeFoxTexture,
    makeOwlTexture,
    makeSquirrelTexture,
} from './textures.ts';

// ADAPT: register your new tower's texture maker here too, or the
// upgrades screen shows its name without a portrait.
const MAKERS: Record<string, (renderer: Renderer) => Texture> = {
    fox: makeFoxTexture,
    owl: makeOwlTexture,
    bear: makeBearTexture,
    squirrel: makeSquirrelTexture,
};

/** Render every tower's texture to a data URL. Never throws; may be empty. */
export async function generateTowerIcons(): Promise<Record<string, string>> {
    try {
        const renderer = (await autoDetectRenderer({
            width: 16,
            height: 16,
            backgroundAlpha: 0,
        })) as Renderer;
        const icons: Record<string, string> = {};
        for (const t of TOWERS) {
            const maker = MAKERS[t.id];
            if (!maker) continue; // new tower type without an icon maker: no icon, no crash
            const tex = maker(renderer);
            icons[t.id] = await renderer.extract.base64(tex);
            freeTexture(tex); // frees procedural placeholders; manifest art survives
        }
        renderer.destroy();
        return icons;
    } catch {
        return {}; // no WebGL: the UI simply shows names without icons
    }
}
