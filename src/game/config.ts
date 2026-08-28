/**
 * ============================== TUNING HUB ==============================
 * Every gameplay number lives in exactly four files, all data, no logic:
 *
 *   src/game/config.ts        <- YOU ARE HERE: board layout, economy
 *                                (incl. the sell refund), lives, sizes
 *   src/game/data/towers.ts   <- tower stats, costs, upgrade tracks,
 *                                default targeting (modes: data/targeting.ts)
 *   src/game/data/enemies.ts  <- bug hp/speed/bounty
 *   src/game/data/waves.ts    <- what attacks, wave by wave
 *
 * Numbers are in design units (720-wide stage, see stage.ts) and seconds.
 * All four files feed the pure simulation engine (src/game/sim/engine.ts),
 * which also powers `npm run balance` — run it after ANY tuning change to
 * verify the game is still winnable but not trivial, without playtesting.
 * ========================================================================
 */
export const CONFIG = {
    colors: {
        grass: 0x2c4a2e,
        grassSpeck: 0x3d6242,
        pathDirt: 0x8a6b45,
        pathEdge: 0x6e5335,
        pad: 0x767f74,
        padDark: 0x5b635a,
        gold: 0xf5c542,
        goldDark: 0xc99a1e,
        goldShine: 0xffe58a,
        // towers (towers)
        fox: 0xe8823a,
        foxDark: 0xb85f22,
        belly: 0xf7e8d4,
        owl: 0x9d8ec4,
        owlDark: 0x7a6ba3,
        bear: 0x8a5a33,
        bearDark: 0x6e4626,
        eyeWhite: 0xffffff,
        eyePupil: 0x1b1b2b,
        // bugs (enemies)
        beetle: 0x3a5683,
        beetleDark: 0x283c5e,
        wasp: 0xf0c030,
        waspDark: 0x2b2b2b,
        snail: 0xc48a5a,
        snailShell: 0x8a5a8f,
        hornet: 0xe4572e,
        stag: 0x2f2545,
        // towers (new towers)
        squirrel: 0xb0713d,
        squirrelDark: 0x8a5527,
        frog: 0x5fbf4a,
        frogDark: 0x3f8f31,
        penguin: 0x2e3440,
        penguinDark: 0x1d2129,
        beak: 0xf0913a,
        salamander: 0xe25822,
        salamanderDark: 0xb03a12,
        ram: 0xd9d2c4,
        ramDark: 0xb3a98f,
        horn: 0x8a744f,
        fire: 0xff8c42,
        // projectiles + fx
        arrow: 0xffe58a,
        frost: 0xbfe8ff,
        boulder: 0x8f97a5,
        lightning: 0xffe873,
        poison: 0x7ed957,
        ice: 0xa8e4ff,
        hpBack: 0x1b1b2b,
        hpFill: 0x7bd94a,
        range: 0xffffff,
        shadow: 0x000000,
    },

    /** On-screen display sizes in design units (textures draw at 2x these). */
    sizes: {
        tower: 64,
        enemy: { beetle: 42, wasp: 40, snail: 50, hornet: 46, stag: 66 },
        pad: { w: 96, h: 52 },
        projectile: 16,
        pathWidth: 72,
    },

    /**
     * The designed board height in design units. The board is drawn for a
     * 9:16 screen (1280 units); on taller screens the whole board is
     * vertically centered in the extra space (see towerScene.ts), so the
     * PATH NEVER STRETCHES: path length, and therefore balance, is
     * identical on every device and in `npm run balance`.
     */
    boardHeight: 1280,

    /**
     * The bugs' road, as polyline waypoints. Enemies climb out of a burrow
     * at the first point and escape into one at the last; both ends get a
     * burrow decal so entering/leaving reads as intentional at any offset.
     */
    path: [
        { x: 170, y: 90 },
        { x: 170, y: 330 },
        { x: 610, y: 330 },
        { x: 610, y: 640 },
        { x: 110, y: 640 },
        { x: 110, y: 950 },
        { x: 610, y: 950 },
        { x: 610, y: 1300 },
    ],

    /**
     * Build spots. The center pads reach two path legs; corners reach one.
     * A pad with a `bonus` is a GOLD stone: any tower built there gets the
     * stat multiplier. Bonuses sit on the weaker-coverage pads on purpose,
     * so "great spot" vs "great bonus" is a real decision.
     */
    pads: [
        { x: 360, y: 215, bonus: { stat: 'damage', mult: 1.5 } },
        // x250 on purpose: at x200 this pad also covers the first corner
        // (the sim showed that extra coverage is worth ~3 lives)
        { x: 250, y: 485, bonus: null },
        { x: 360, y: 485, bonus: null },
        { x: 520, y: 485, bonus: null },
        { x: 200, y: 795, bonus: null },
        { x: 520, y: 795, bonus: { stat: 'range', mult: 1.5 } },
        { x: 200, y: 1090, bonus: { stat: 'fireRate', mult: 1.5 } },
        { x: 450, y: 1090, bonus: null },
    ],

    /** Tap tolerance for selecting a pad, from its center. */
    padTapRadius: 58,

    economy: {
        startCoins: 140,   // two cheap towers, or one mid + savings
        startLives: 10,
        waveBonus: 15,     // flat build-phase income per cleared wave
        /**
         * Fraction of a tower's TOTAL spend (purchase plus upgrades bought)
         * refunded on sell: at 0.75, a tower that cost 200 in total sells
         * for 150. Refunds round down. 1 would make repositioning free;
         * low values make placement a commitment.
         */
        sellRefund: 0.75,
    },

    /**
     * Meta progression: gems earned at the end of every run buy PERSISTENT
     * per-tower upgrades from the main menu (damage, attack speed, range;
     * ten levels each). These multiply on top of in-run upgrades.
     *
     * NOTE: `npm run balance` simulates with ZERO meta levels on purpose —
     * it verifies the base game a brand-new player faces.
     */
    meta: {
        /** Gems for clearing wave N = N * this (a full 10-wave run pays 55). */
        gemsPerWave: 1,
        maxLevel: 10,
        /** Buying INTO level n (1-based) costs costBase + costStep * (n - 1). */
        costBase: 4,
        costStep: 2,
        /** Effect per level, as a fraction added to the base stat. */
        damagePerLevel: 0.05,  // +50% damage at level 10
        speedPerLevel: 0.04,   // +40% attack speed at level 10
        rangePerLevel: 0.02,   // +20% range at level 10
    },

    /** Rewarded ads (systems/ads.ts, copied in from run-game-helpers). */
    ads: {
        /** Game-wide daily rewarded-watch budget shared by every placement. */
        maxPerDay: 15,
        /** Game-over placement: bonus gems = ceil(gemsEarned * this). */
        gemBonusFactor: 0.5,
    },
} as const;
