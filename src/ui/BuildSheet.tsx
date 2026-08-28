/**
 * Bottom sheet for the selected pad: pick a tower for an empty pad, or
 * manage the one standing there (upgrade top-right, sell beside it with a
 * confirmation dialog, and a Target row to pick the tower's targeting mode).
 * Engine state is read synchronously via actions.getEngine(); re-renders
 * ride on store changes (coins, selection, padVersion). Selling keeps the
 * pad selected, so the sheet flips straight to the build options.
 */
import { useEffect, useState } from 'react';
import { sfx } from '../audio/audio.ts';
import { getEngine, placeTower, sellTower, setTargeting, upgradeTower } from '../game/actions.ts';
import { CONFIG } from '../game/config.ts';
import { TARGETING_DESCRIPTIONS, TARGETING_LABELS, TARGETING_MODES } from '../game/data/targeting.ts';
import { TOWERS, type TowerDef } from '../game/data/towers.ts';
import { store, useStore } from '../state/store.ts';

/** Player-facing label for a gold pad's bonus. */
function bonusLabel(bonus: NonNullable<(typeof CONFIG.pads)[number]['bonus']>): string {
    const pct = Math.round((bonus.mult - 1) * 100);
    const stat = bonus.stat === 'damage' ? 'damage' : bonus.stat === 'fireRate' ? 'fire rate' : 'radius';
    return `${pct}% ${stat} bonus!`;
}

function BonusBadge({ padIndex }: { padIndex: number }) {
    const bonus = CONFIG.pads[padIndex].bonus;
    if (!bonus) return null;
    return (
        <div className="flex items-center justify-center gap-2">
            <span className="text-xl">⭐</span>
            <span className="text-[1.1rem] font-bold text-primary">{bonusLabel(bonus)}</span>
        </div>
    );
}

/** One-word build-card tag for what makes each tower special. */
function tagFor(def: TowerDef): string {
    if (def.attack.kind === 'beam') return 'Chains';
    if (def.status?.type === 'slow') return 'Slows';
    if (def.status?.type === 'poison') return 'Poison';
    if (def.status?.type === 'burn') return 'Burns';
    if (def.status?.type === 'frozen') return 'Freezes';
    if (def.status?.type === 'knockback') return 'Knocks';
    if (def.attack.kind === 'projectile' && def.attack.splash > 0) return 'Splash';
    return 'Rapid';
}

export default function BuildSheet() {
    const selectedPad = useStore((s) => s.selectedPad);
    const coins = useStore((s) => s.coins);
    const tdPhase = useStore((s) => s.tdPhase);
    const towerIcons = useStore((s) => s.towerIcons);
    useStore((s) => s.padVersion); // re-render on coin-free engine mutations
    const [confirmSell, setConfirmSell] = useState(false);
    const [showTargetHelp, setShowTargetHelp] = useState(false);

    // a new selection always starts with both popups closed
    useEffect(() => {
        setConfirmSell(false);
        setShowTargetHelp(false);
    }, [selectedPad]);

    const engine = getEngine();
    if (selectedPad === null || !engine) return null;
    if (tdPhase === 'lost') return null;

    const tower = engine.state.towers.find((t) => t.padIndex === selectedPad);
    const refund = tower ? Math.floor(tower.spent * CONFIG.economy.sellRefund) : 0;

    return (
        <>
            <div className="absolute inset-x-0 bottom-0 pb-safe-bottom">
                <div className="mx-3 mb-3 rounded-2xl bg-black/80 p-4">
                    {!tower ? (
                        <div className="grid grid-cols-3 gap-2">
                            {TOWERS.map((def) => {
                                const affordable = coins >= def.cost;
                                return (
                                    <button
                                        key={def.id}
                                        type="button"
                                        disabled={!affordable}
                                        className={
                                            'flex w-full flex-col items-center gap-1 rounded-xl p-3 transition-transform active:scale-95 ' +
                                            (affordable ? 'bg-white/10' : 'bg-white/5 opacity-40')
                                        }
                                        onClick={() => {
                                            sfx.place();
                                            placeTower(selectedPad, def.id);
                                            store.patch({ selectedPad: null });
                                        }}
                                    >
                                        {towerIcons[def.id] && (
                                            <img src={towerIcons[def.id]} alt="" className="h-12 w-12" />
                                        )}
                                        <span className="text-xl font-bold">{def.name}</span>
                                        <span className="text-[1.1rem] text-white/70 tabular-nums">🪙 {def.cost}</span>
                                        <span className="text-[1.1rem] text-white/50">{tagFor(def)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 px-1">
                            {/* header: name + stats left; sell, then upgrade, in the top-right */}
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xl font-bold">
                                        {tower.def.name} · Lv {tower.level}
                                    </p>
                                    <p className="text-[1.1rem] text-white/60 tabular-nums">
                                        {Math.round(tower.damage)} dmg · {tower.fireRate.toFixed(1)}/s
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="rounded-xl bg-red-500/80 px-5 py-3 text-[1.1rem] font-bold text-white transition-transform active:scale-95"
                                        onClick={() => setConfirmSell(true)}
                                    >
                                        Sell
                                    </button>
                                    {tower.level <= tower.def.upgrades.length ? (
                                        (() => {
                                            const cost = tower.def.upgrades[tower.level - 1].cost;
                                            const affordable = coins >= cost;
                                            return (
                                                <button
                                                    type="button"
                                                    disabled={!affordable}
                                                    className={
                                                        'rounded-xl px-5 py-3 text-[1.1rem] font-bold transition-transform active:scale-95 ' +
                                                        (affordable ? 'bg-primary text-black' : 'bg-white/10 text-white/40')
                                                    }
                                                    onClick={() => {
                                                        sfx.upgrade();
                                                        upgradeTower(selectedPad);
                                                    }}
                                                >
                                                    Upgrade 🪙 {cost}
                                                </button>
                                            );
                                        })()
                                    ) : (
                                        <span className="rounded-xl bg-white/10 px-5 py-3 text-[1.1rem] font-bold text-white/50">
                                            Max
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* targeting: label + help, then one button per mode, active lit */}
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-[1.1rem] font-semibold text-white/60">Target:</p>
                                    <button
                                        type="button"
                                        aria-label="What do the targeting options mean?"
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[1.1rem] font-bold text-white/70 transition-transform active:scale-95"
                                        onClick={() => setShowTargetHelp(true)}
                                    >
                                        ?
                                    </button>
                                </div>
                                <div className="mt-1 flex gap-1">
                                    {TARGETING_MODES.map((mode) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            className={
                                                'flex-1 rounded-lg px-1 py-2 text-center text-[1.1rem] font-semibold transition-colors ' +
                                                (tower.targeting === mode
                                                    ? 'bg-primary text-black'
                                                    : 'bg-white/10 text-white/70')
                                            }
                                            onClick={() => {
                                                sfx.click();
                                                setTargeting(selectedPad, mode);
                                            }}
                                        >
                                            {TARGETING_LABELS[mode]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* the gold pad's perk, under the target row */}
                            <BonusBadge padIndex={selectedPad} />
                        </div>
                    )}
                    {/* on an empty pad, show the perk just above Close */}
                    {!tower && (
                        <div className="mt-3">
                            <BonusBadge padIndex={selectedPad} />
                        </div>
                    )}
                    <button
                        type="button"
                        className="mt-3 w-full rounded-xl bg-white/10 py-2 text-[1.1rem] font-semibold text-white/70 transition-transform active:scale-95"
                        onClick={() => store.patch({ selectedPad: null })}
                    >
                        Close
                    </button>
                </div>
            </div>
            {showTargetHelp && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-8">
                    <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-black/90 p-6">
                        <p className="text-center text-xl font-bold">Targeting</p>
                        <p className="text-[1.1rem] text-white/60">
                            Who this tower attacks when several bugs are in range:
                        </p>
                        <div className="flex flex-col gap-2">
                            {TARGETING_MODES.map((mode) => (
                                <p key={mode} className="text-[1.1rem] leading-6">
                                    <span className="font-bold text-primary">{TARGETING_LABELS[mode]}:</span>
                                    <span className="text-white/80"> {TARGETING_DESCRIPTIONS[mode]}</span>
                                </p>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="mt-2 w-full rounded-xl bg-primary py-3 text-[1.1rem] font-bold text-black transition-transform active:scale-95"
                            onClick={() => setShowTargetHelp(false)}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
            {confirmSell && tower && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-10">
                    <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-black/90 p-6">
                        <p className="text-center text-xl font-bold">
                            Sell {tower.def.name} for 🪙 {refund}?
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                className="flex-1 rounded-xl bg-white/10 py-3 text-[1.1rem] font-bold text-white/80 transition-transform active:scale-95"
                                onClick={() => setConfirmSell(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="flex-1 rounded-xl bg-red-500/80 py-3 text-[1.1rem] font-bold text-white transition-transform active:scale-95"
                                onClick={() => {
                                    sfx.sell();
                                    setConfirmSell(false);
                                    sellTower(selectedPad);
                                }}
                            >
                                Sell +{refund}c
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
