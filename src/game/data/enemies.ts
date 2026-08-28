/**
 * The bugs. Consumed by the pure engine; `npm run balance` sees every edit.
 */
export interface EnemyDef {
    id: string;
    name: string;
    hp: number;
    /** Walk speed along the path, design units/second. */
    speed: number;
    /** Coins awarded on a kill. */
    bounty: number;
    /** Lives lost if it reaches the end. */
    livesCost: number;
}

export const ENEMIES: EnemyDef[] = [
    { id: 'beetle', name: 'Beetle', hp: 46, speed: 90, bounty: 5, livesCost: 1 },
    { id: 'wasp', name: 'Wasp', hp: 34, speed: 150, bounty: 5, livesCost: 1 },
    { id: 'snail', name: 'Snail', hp: 175, speed: 55, bounty: 10, livesCost: 1 },
    { id: 'hornet', name: 'Hornet', hp: 90, speed: 160, bounty: 8, livesCost: 1 },
    { id: 'stag', name: 'Stag Beetle', hp: 700, speed: 50, bounty: 30, livesCost: 3 },
];

export function enemyDef(id: string): EnemyDef {
    const def = ENEMIES.find((e) => e.id === id);
    if (!def) throw new Error(`unknown enemy: ${id}`);
    return def;
}
