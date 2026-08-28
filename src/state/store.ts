/**
 * Tiny external store bridging game code (Pixi ticker, SDK callbacks, plain
 * modules) and React — no state-library dependency. Game code calls
 * store.patch(); React components subscribe with useStore(selector).
 *
 * Keep this store for UI-FACING state only (phase, HUD numbers, popups).
 * Per-frame simulation state stays inside the engine — patching the store
 * every frame re-renders React every frame (actions.syncStore diffs first).
 */
import { useSyncExternalStore } from 'react';
import type { TdPhase } from '../game/sim/engine.ts';
import type { MetaLevels } from './save.ts';

/** The UI-facing app state. */
export interface AppState {
    /** 'loading' → 'menu' → 'playing' */
    phase: 'loading' | 'menu' | 'playing';
    /** 0..1 progress of the critical-asset warm during 'loading' */
    loadProgress: number;
    /** Set by the host's onPause/onResume lifecycle hooks */
    paused: boolean;
    /** Bumped to remount GameCanvas — each run is one engine instance */
    runId: number;
    /** Mirrors of engine state for the HUD (diffed in actions.syncStore) */
    coins: number;
    lives: number;
    wave: number;
    waveCount: number;
    tdPhase: TdPhase;
    /** Game-speed multiplier (the engine substeps this many times per frame) */
    speed: 1 | 2 | 3 | 4;
    /** Pad index the player tapped (opens the build sheet); null = none */
    selectedPad: number | null;
    /** Bumped after coin-free engine mutations (e.g. targeting change) so the build sheet re-renders */
    padVersion: number;
    /** Highest wave fully cleared, ever (persisted) */
    bestWave: number;
    /** Meta currency (persisted) and what the last run just paid out */
    gems: number;
    gemsEarned: number;
    /** True once this run's watch-ad gem bonus has been claimed */
    adBonusClaimed: boolean;
    /** Persistent per-tower upgrade levels, mirrored for the upgrades menu */
    metaLevels: MetaLevels;
    /** The main menu's persistent-upgrades overlay */
    metaOpen: boolean;
    /** The leaderboards overlay */
    ranksOpen: boolean;
    /** The settings overlay + current audio volumes (0..1, persisted) */
    settingsOpen: boolean;
    musicVol: number;
    sfxVol: number;
    /** Bugs squashed in the run that just ended (end screen) */
    runKills: number;
    /** PNG data URLs of the tower art, generated at boot for DOM UI use */
    towerIcons: Record<string, string>;
    /** Platform engagement prompts: capability-gated by the host at boot */
    likeAvailable: boolean;
    commentsAvailable: boolean;
    isLiked: boolean;
}

const INITIAL: AppState = {
    phase: 'loading',
    loadProgress: 0,
    paused: false,
    runId: 0,
    coins: 0,
    lives: 0,
    wave: 1,
    waveCount: 10,
    tdPhase: 'build',
    speed: 1,
    selectedPad: null,
    padVersion: 0,
    bestWave: 0,
    gems: 0,
    gemsEarned: 0,
    adBonusClaimed: false,
    metaLevels: {},
    metaOpen: false,
    ranksOpen: false,
    settingsOpen: false,
    musicVol: 0.6,
    sfxVol: 0.8,
    runKills: 0,
    towerIcons: {},
    likeAvailable: false,
    commentsAvailable: false,
    isLiked: false,
};

/**
 * DEV ROBUSTNESS: the state lives on globalThis, not in module scope. On
 * Windows, Vite + the Tailwind plugin can transiently serve this module
 * under TWO urls (/src/... and /@fs/C:/...) after a hot reload, which
 * would give the Pixi scene and the React tree two separate stores
 * (symptoms: taps select pads but no sheet opens; towers and enemies stop
 * rendering). Anchoring the state globally makes every copy of this module
 * share one store. Harmless in production, where only one copy exists.
 */
interface StoreCore {
    state: AppState;
    listeners: Set<() => void>;
}
const host = globalThis as typeof globalThis & { __td_template_store__?: StoreCore };
const core: StoreCore = (host.__td_template_store__ ??= { state: INITIAL, listeners: new Set() });

export const store = {
    /** Read the current state (from game code; in React use useStore). */
    get: (): AppState => core.state,
    /** Shallow-merge a partial update and notify React subscribers. */
    patch(partial: Partial<AppState>): void {
        core.state = { ...core.state, ...partial };
        for (const l of core.listeners) l();
    },
    subscribe(l: () => void): () => void {
        core.listeners.add(l);
        return () => core.listeners.delete(l);
    },
};

/**
 * React hook. IMPORTANT: the selector must return a primitive or a stable
 * reference (e.g. s => s.phase). Returning a fresh object/array each call
 * makes React re-render forever.
 */
export function useStore<T = AppState>(
    selector: (s: AppState) => T = (s) => s as unknown as T
): T {
    return useSyncExternalStore(store.subscribe, () => selector(core.state));
}
