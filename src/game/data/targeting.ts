/**
 * Targeting modes: which bug in range a tower attacks. Each tower type
 * declares a default in towers.ts, and the player can change it per placed
 * tower from the build sheet.
 *
 * Semantics (ties broken by "furthest along the path"):
 *   first       furthest along the path (the classic TD default)
 *   last        least far along the path
 *   closest     nearest to the tower itself
 *   strongest   toughest SPECIES in range (highest max hp)
 *   weakest     flimsiest SPECIES in range (lowest max hp)
 *   highest-hp  most CURRENT hp (fresh targets, spreads damage)
 *   lowest-hp   least CURRENT hp (finishes wounded targets)
 */
export type TargetingMode =
    | 'first'
    | 'last'
    | 'closest'
    | 'strongest'
    | 'weakest'
    | 'highest-hp'
    | 'lowest-hp';

/** Display order of the build sheet's Target row. */
export const TARGETING_MODES: TargetingMode[] = [
    'first',
    'last',
    'closest',
    'strongest',
    'weakest',
    'highest-hp',
    'lowest-hp',
];

/** Player-facing labels, kept short so all seven fit in one button row. */
export const TARGETING_LABELS: Record<TargetingMode, string> = {
    first: 'First',
    last: 'Last',
    closest: 'Close',
    strongest: 'Strong',
    weakest: 'Weak',
    'highest-hp': 'Hi HP',
    'lowest-hp': 'Lo HP',
};

/** Player-facing explanations for the Target help popup. Plain and short. */
export const TARGETING_DESCRIPTIONS: Record<TargetingMode, string> = {
    first: 'enemy furthest along the path',
    last: 'enemy closest to the start',
    closest: 'enemy closest to this tower',
    strongest: 'enemy with highest max HP',
    weakest: 'enemy with lowest max HP',
    'highest-hp': 'enemy with highest health remaining',
    'lowest-hp': 'enemy with lowest health remaining',
};
