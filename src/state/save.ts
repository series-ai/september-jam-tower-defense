/**
 * Persistence: the per-player save, written to RUN's appStorage when the
 * host is present and mirrored to localStorage always (so plain-browser dev
 * keeps progress too, and reads never wait on the host).
 *
 * Posture: loads happen once at boot (main.tsx step 2) into memory; writes
 * are write-through and fire-and-forget. Nothing here ever throws.
 */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { CONFIG } from '../game/config.ts';
import { TOWERS } from '../game/data/towers.ts';
import { sdkReady } from '../sdk/runSdk.ts';
import type { AdsState } from '../systems/ads.ts';

// Bump the suffix if the shape ever changes incompatibly (new optional
// fields with defaults do NOT need a bump; parse() fills them in).
// ADAPT: your game's save key — two games scaffolded from this template
// must not share one, or their localStorage saves collide in dev.
const SAVE_KEY = 'td-template:save:v1';

export type MetaStat = 'damage' | 'speed' | 'range' | 'unique';

export interface MetaStatLevels {
    damage: number;
    speed: number;
    range: number;
    /** The tower's signature track (towers.ts metaUnique). */
    unique: number;
}

/** Persistent upgrade levels, keyed by tower id. */
export type MetaLevels = Record<string, MetaStatLevels>;

export interface SaveData {
    /** Highest wave fully cleared across all runs. */
    bestWave: number;
    /** Meta currency, earned at the end of every run. */
    gems: number;
    /** Persistent per-tower upgrade levels. */
    meta: MetaLevels;
    /** Audio volumes, 0..1 per bus. */
    audio: { music: number; sfx: number };
    /** Rewarded-ads daily cap slice (systems/ads.ts mutates it in place). */
    ads: AdsState;
}

function emptyMeta(): MetaLevels {
    const meta: MetaLevels = {};
    for (const t of TOWERS) meta[t.id] = { damage: 0, speed: 0, range: 0, unique: 0 };
    return meta;
}

const DEFAULTS: SaveData = {
    bestWave: 0,
    gems: 0,
    meta: emptyMeta(),
    audio: { music: 0.6, sfx: 0.8 },
    ads: { watchedToday: 0, lastResetDay: null },
};

let data: SaveData = structuredClone(DEFAULTS);

/** Validate a raw stored blob. Unknown/corrupt input falls back to defaults. */
function parse(raw: string | null): SaveData | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        const num = (v: unknown, min: number, max: number) => {
            const n = Math.floor(Number(v));
            return Number.isFinite(n) && n >= min ? Math.min(n, max) : 0;
        };
        const meta = emptyMeta();
        const rawMeta = (parsed.meta ?? {}) as Partial<MetaLevels>;
        for (const t of TOWERS) {
            const m = rawMeta[t.id];
            if (!m) continue;
            meta[t.id] = {
                damage: num(m.damage, 0, CONFIG.meta.maxLevel),
                speed: num(m.speed, 0, CONFIG.meta.maxLevel),
                range: num(m.range, 0, CONFIG.meta.maxLevel),
                unique: num(m.unique, 0, t.metaUnique.maxLevel),
            };
        }
        const vol = (v: unknown, fallback: number) => {
            const f = Number(v);
            return Number.isFinite(f) ? Math.min(1, Math.max(0, f)) : fallback;
        };
        const rawAudio = (parsed.audio ?? {}) as Partial<SaveData['audio']>;
        return {
            bestWave: num(parsed.bestWave, 0, Number.MAX_SAFE_INTEGER),
            gems: num(parsed.gems, 0, Number.MAX_SAFE_INTEGER),
            meta,
            audio: {
                music: vol(rawAudio.music, DEFAULTS.audio.music),
                sfx: vol(rawAudio.sfx, DEFAULTS.audio.sfx),
            },
            ads: {
                watchedToday: num((parsed.ads as Partial<AdsState> | undefined)?.watchedToday, 0, 10000),
                lastResetDay:
                    typeof parsed.ads?.lastResetDay === 'string' ? parsed.ads.lastResetDay : null,
            },
        };
    } catch {
        return null;
    }
}

/** Load the save into memory. Call once at boot, after initSdk(). */
export async function loadSave(): Promise<SaveData> {
    let loaded: SaveData | null = null;
    if (sdkReady()) {
        try {
            loaded = parse(await RundotGameAPI.appStorage.getItem(SAVE_KEY));
        } catch {
            /* host storage unavailable — fall through to localStorage */
        }
    }
    if (!loaded) {
        try { loaded = parse(localStorage.getItem(SAVE_KEY)); } catch { /* blocked storage */ }
    }
    data = loaded ?? structuredClone(DEFAULTS);
    return data;
}

export function getSave(): SaveData {
    return data;
}

/** Write-through persist of the in-memory save. Fire-and-forget, never throws. */
export function flushSave(): void {
    const raw = JSON.stringify(data);
    try { localStorage.setItem(SAVE_KEY, raw); } catch { /* blocked storage */ }
    if (sdkReady()) {
        try {
            RundotGameAPI.appStorage.setItem(SAVE_KEY, raw).catch(() => { /* offline */ });
        } catch { /* non-fatal */ }
    }
}

/**
 * A run ended: record the best wave and pay out gems. Clearing wave N pays
 * N * gemsPerWave, so later waves are worth more (a full run pays the
 * triangular sum). Returns the gems earned for the end screen.
 */
export function recordRunEnd(wavesCleared: number): { gemsEarned: number; save: SaveData } {
    const n = Math.max(0, Math.floor(wavesCleared));
    let gemsEarned = 0;
    for (let w = 1; w <= n; w++) gemsEarned += w * CONFIG.meta.gemsPerWave;
    data = {
        ...data,
        bestWave: Math.max(data.bestWave, n),
        gems: data.gems + gemsEarned,
    };
    flushSave();
    return { gemsEarned, save: data };
}

/** Grant bonus gems (rewarded-ad placement). Returns the new save. */
export function addGems(amount: number): SaveData {
    data = { ...data, gems: data.gems + Math.max(0, Math.floor(amount)) };
    flushSave();
    return data;
}

/** Cost in gems of buying INTO the next level, given the current level. */
export function metaUpgradeCost(currentLevel: number): number {
    return CONFIG.meta.costBase + CONFIG.meta.costStep * currentLevel;
}

let audioFlushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Persist slider-driven volume changes, debounced 400ms so dragging a
 * slider does not hammer storage. Values apply to the buses immediately at
 * the call site; this only records them.
 */
export function setAudioVolumes(music: number, sfxVol: number): void {
    data = { ...data, audio: { music, sfx: sfxVol } };
    if (audioFlushTimer) clearTimeout(audioFlushTimer);
    audioFlushTimer = setTimeout(() => {
        audioFlushTimer = null;
        flushSave();
    }, 400);
}

/**
 * Buy one meta upgrade level for a tower's stat. Returns the new save, or
 * null if maxed or unaffordable (callers disable the button, but never
 * trust the UI).
 */
export function buyMetaUpgrade(towerId: string, stat: MetaStat): SaveData | null {
    const levels = data.meta[towerId];
    if (!levels) return null;
    const level = levels[stat];
    const cap = stat === 'unique'
        ? TOWERS.find((t) => t.id === towerId)?.metaUnique.maxLevel ?? 0
        : CONFIG.meta.maxLevel;
    if (level >= cap) return null;
    const cost = metaUpgradeCost(level);
    if (data.gems < cost) return null;
    data = {
        ...data,
        gems: data.gems - cost,
        meta: {
            ...data.meta,
            [towerId]: { ...levels, [stat]: level + 1 },
        },
    };
    flushSave();
    return data;
}
