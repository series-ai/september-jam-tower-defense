/**
 * The invasion, wave by wave. Entries in a wave spawn sequentially (with a
 * short gap between entries), each entry spawning `count` of one bug type
 * every `spacing` seconds. No hidden scaling: what you read is what attacks,
 * and what `npm run balance` simulates.
 */
export interface WaveEntry {
    enemy: string;
    count: number;
    spacing: number;
}

export interface Wave {
    entries: WaveEntry[];
}

/** Gap between one entry finishing and the next starting, seconds. */
export const ENTRY_GAP = 0.8;

export const WAVES: Wave[] = [
    { entries: [{ enemy: 'beetle', count: 6, spacing: 1.1 }] },
    { entries: [{ enemy: 'beetle', count: 10, spacing: 0.9 }] },
    { entries: [{ enemy: 'beetle', count: 6, spacing: 0.9 }, { enemy: 'wasp', count: 4, spacing: 0.8 }] },
    { entries: [{ enemy: 'wasp', count: 10, spacing: 0.7 }, { enemy: 'beetle', count: 4, spacing: 0.8 }] },
    { entries: [{ enemy: 'snail', count: 4, spacing: 1.4 }, { enemy: 'beetle', count: 8, spacing: 0.7 }] },
    { entries: [{ enemy: 'wasp', count: 8, spacing: 0.6 }, { enemy: 'snail', count: 4, spacing: 1.2 }] },
    { entries: [{ enemy: 'beetle', count: 14, spacing: 0.5 }, { enemy: 'hornet', count: 4, spacing: 0.9 }] },
    { entries: [{ enemy: 'snail', count: 10, spacing: 0.9 }, { enemy: 'wasp', count: 8, spacing: 0.55 }] },
    { entries: [{ enemy: 'hornet', count: 12, spacing: 0.6 }, { enemy: 'snail', count: 6, spacing: 0.9 }] },
    { entries: [{ enemy: 'stag', count: 3, spacing: 3.0 }, { enemy: 'hornet', count: 10, spacing: 0.55 }, { enemy: 'snail', count: 6, spacing: 0.8 }] },
];
