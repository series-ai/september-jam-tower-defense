/**
 * Status effects that can sit on a bug. The system is deliberately open:
 * to add a new effect, add a variant here, teach the engine's status pass
 * (sim/engine.ts) its rule, and give the view a way to show it
 * (towerScene.ts renders frozen as an ice cube, poison as a green tint,
 * burn as an orange tint). Towers apply effects via their def's `status`
 * field (towers.ts).
 *
 * Rules (engine):
 *  - Re-applying an effect of the same type REPLACES the old instance
 *    (refreshing its duration); different types coexist.
 *  - EXCEPT burn and poison, which share one "damage-over-time slot":
 *    applying either removes the other, so the two DoT towers compete
 *    instead of stacking.
 *  - Knockback is a very short-lived effect: for KNOCKBACK_TIME seconds
 *    the bug slides backward along the path (covering the full knockback
 *    distance), instead of teleporting — the shove reads as motion.
 */

/** An active effect instance on one enemy. */
export type StatusEffect =
    /** Movement at `factor` speed until `remaining` runs out. */
    | { type: 'slow'; remaining: number; factor: number }
    /** No movement at all until `remaining` runs out. */
    | { type: 'frozen'; remaining: number }
    /** `tickDamage` every `tickEvery` seconds until `remaining` runs out. */
    | { type: 'poison'; remaining: number; tickDamage: number; tickEvery: number; tickIn: number }
    /** Like poison, but fast and short; shares the DoT slot with poison. */
    | { type: 'burn'; remaining: number; tickDamage: number; tickEvery: number; tickIn: number }
    /** Sliding backward at `speed` units/s until `remaining` runs out. */
    | { type: 'knockback'; remaining: number; speed: number };

export type StatusType = StatusEffect['type'];

/** Inflict recipes that become lasting StatusEffect instances. */
export type LastingInflict =
    | { type: 'slow'; factor: number; duration: number }
    | { type: 'frozen'; duration: number }
    | { type: 'poison'; tickDamage: number; tickEvery: number; duration: number }
    | { type: 'burn'; tickDamage: number; tickEvery: number; duration: number };

/**
 * What a tower inflicts on hit (towers.ts `status` field). Knockback is the
 * one instantaneous recipe: the engine applies it directly instead of
 * creating an effect instance.
 */
export type StatusInflict = LastingInflict | { type: 'knockback'; distance: number };

/** How long a knockback shove takes to cover its distance, seconds. */
export const KNOCKBACK_TIME = 0.15;

/** Instantiate a lasting recipe as a live effect. */
export function makeEffect(s: LastingInflict, durationBonus: number, damageBonus: number): StatusEffect {
    switch (s.type) {
        case 'slow':
            return { type: 'slow', remaining: s.duration + durationBonus, factor: s.factor };
        case 'frozen':
            return { type: 'frozen', remaining: s.duration + durationBonus };
        case 'poison':
        case 'burn':
            return {
                type: s.type,
                remaining: s.duration + durationBonus,
                tickDamage: s.tickDamage + damageBonus,
                tickEvery: s.tickEvery,
                tickIn: s.tickEvery,
            };
    }
}
