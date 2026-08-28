/**
 * The bridge between React UI and the running engine. The scene registers
 * its engine instance here; UI components call these actions and read
 * results through the store (never holding engine state in React).
 */
import { store } from '../state/store.ts';
import type { TargetingMode } from './data/targeting.ts';
import type { Engine } from './sim/engine.ts';

/**
 * DEV ROBUSTNESS: the engine reference lives on globalThis for the same
 * reason as the store's state (see store.ts) — Vite on Windows can serve
 * duplicate copies of this module after a hot reload, and a module-scoped
 * reference would strand the UI's copy at null.
 */
const host = globalThis as typeof globalThis & { __td_template_engine__?: { current: Engine | null } };
const slot = (host.__td_template_engine__ ??= { current: null });

export function registerEngine(e: Engine | null): void {
    slot.current = e;
}

export function getEngine(): Engine | null {
    return slot.current;
}

/** Patch UI-facing engine values into the store (only what changed). */
export function syncStore(): void {
    const engine = slot.current;
    if (!engine) return;
    const s = engine.state;
    const cur = store.get();
    const wave = s.waveIndex + 1; // unbounded: endless after the authored waves
    if (
        cur.coins !== s.coins ||
        cur.lives !== s.lives ||
        cur.wave !== wave ||
        cur.tdPhase !== s.phase
    ) {
        store.patch({ coins: s.coins, lives: s.lives, wave, tdPhase: s.phase });
    }
}

export function placeTower(padIndex: number, towerId: string): void {
    if (slot.current?.placeTower(padIndex, towerId)) syncStore();
}

export function upgradeTower(padIndex: number): void {
    if (slot.current?.upgradeTower(padIndex)) syncStore();
}

export function sellTower(padIndex: number): void {
    if (slot.current?.sellTower(padIndex)) syncStore();
}

export function setTargeting(padIndex: number, mode: TargetingMode): void {
    if (slot.current?.setTargeting(padIndex, mode)) {
        // costs no coins, so bump the nonce to re-render the build sheet
        store.patch({ padVersion: store.get().padVersion + 1 });
    }
}

export function startWave(): void {
    if (slot.current?.startWave()) syncStore();
}
