/**
 * Run-over overlay: victory or defeat, waves cleared, kills, gem payout,
 * and the rewarded-ad gem bonus (watch an ad, get +50% of this run's gems,
 * once per run — the flow runs through the ads system's grantReward
 * chokepoint, so the daily cap, subscriber skip, and no-ads fallback all
 * apply). Retry bumps runId, remounting GameCanvas into a fresh engine.
 *
 * TODO: surface the Like/Comments prompts (src/sdk/engagement.ts) here on
 * the victory path — the SDK recommends asking after a win, and a player
 * who just cleared wave 10 is the right audience. They currently live on
 * the main menu only.
 */
import { useEffect, useState } from 'react';
import { sfx } from '../audio/audio.ts';
import { CONFIG } from '../game/config.ts';
import { adsSystem } from '../sdk/ads.ts';
import { addGems } from '../state/save.ts';
import { store, useStore } from '../state/store.ts';

export default function EndScreen() {
    const tdPhase = useStore((s) => s.tdPhase);
    const wave = useStore((s) => s.wave);
    const waveCount = useStore((s) => s.waveCount);
    const bestWave = useStore((s) => s.bestWave);
    const gemsEarned = useStore((s) => s.gemsEarned);
    const adBonusClaimed = useStore((s) => s.adBonusClaimed);
    const runKills = useStore((s) => s.runKills);
    const [confirmAd, setConfirmAd] = useState(false);
    const [busy, setBusy] = useState(false);

    // a fresh run-end always starts outside the confirm dialog
    useEffect(() => {
        setConfirmAd(false);
        setBusy(false);
    }, [tdPhase]);

    if (tdPhase !== 'won' && tdPhase !== 'lost') return null;
    const won = tdPhase === 'won';
    const cleared = won ? waveCount : wave - 1;
    const bonus = Math.ceil(gemsEarned * CONFIG.ads.gemBonusFactor);
    const ads = adsSystem();
    const offerBonus = bonus > 0 && !adBonusClaimed && !ads.capReached();

    const claimBonus = () => {
        setBusy(true);
        void ads
            .grantReward({
                productId: 'bonus_gameover_gems',
                description: `${bonus} bonus gems`,
                trigger: 'gameover_gems',
                name: 'Game over gem bonus',
                onReward: () => {
                    const save = addGems(bonus);
                    store.patch({
                        gems: save.gems,
                        gemsEarned: gemsEarned + bonus,
                        adBonusClaimed: true,
                    });
                    sfx.upgrade();
                },
            })
            .finally(() => {
                setBusy(false);
                setConfirmAd(false);
            });
    };

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/75 px-10">
            <h2 className={'text-4xl font-bold ' + (won ? 'text-primary' : 'text-red-400')}>
                {won ? 'Victory!' : 'Overrun!'}
            </h2>
            <p className="text-xl text-white/80 tabular-nums">
                Waves cleared: {cleared}/{waveCount}
            </p>
            {runKills > 0 && (
                <p className="text-[1.1rem] text-white/60 tabular-nums">Enemies defeated: {runKills}</p>
            )}
            {gemsEarned > 0 && (
                <p className="text-xl font-semibold text-white/85 tabular-nums">
                    💎 +{gemsEarned}
                    {adBonusClaimed && <span className="text-primary"> (bonus claimed!)</span>}
                </p>
            )}
            {bestWave > 0 && (
                <p className="text-[1.1rem] text-white/60 tabular-nums">Best: {bestWave}</p>
            )}
            {offerBonus && (
                <button
                    type="button"
                    className="w-64 rounded-2xl bg-amber-500 px-12 py-4 text-xl font-bold text-black shadow-lg transition-transform active:scale-95"
                    onClick={() => {
                        sfx.click();
                        setConfirmAd(true);
                    }}
                >
                    <span className="block">🎬 +{bonus} 💎</span>
                    <span className="block text-[1.1rem]">Watch Ad</span>
                </button>
            )}
            <button
                type="button"
                className="w-64 rounded-2xl bg-primary px-12 py-4 text-xl font-bold text-black shadow-lg transition-transform active:scale-95"
                onClick={() =>
                    store.patch({ tdPhase: 'build', selectedPad: null, runId: store.get().runId + 1 })
                }
            >
                {won ? 'Play Again' : 'Retry'}
            </button>
            <button
                type="button"
                className="w-64 rounded-2xl bg-sky-600 px-12 py-4 text-xl font-bold text-white shadow-lg transition-transform active:scale-95"
                onClick={() => store.patch({ phase: 'menu', selectedPad: null })}
            >
                Menu
            </button>
            {confirmAd && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-10">
                    <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-black/90 p-6">
                        <p className="text-center text-xl font-bold">
                            Watch an ad to earn {bonus} bonus gems?
                        </p>
                        <p className="text-center text-[1.1rem] text-white/60 tabular-nums">
                            {ads.remainingToday()}/{ads.maxPerDay} ads left today
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                className="flex-1 rounded-xl bg-white/10 py-3 text-[1.1rem] font-bold text-white/80 transition-transform active:scale-95"
                                onClick={() => {
                                    sfx.click();
                                    setConfirmAd(false);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                className={
                                    'flex-1 rounded-xl py-3 text-[1.1rem] font-bold transition-transform active:scale-95 ' +
                                    (busy ? 'bg-white/10 text-white/40' : 'bg-amber-500 text-black')
                                }
                                onClick={claimBonus}
                            >
                                {busy ? 'Loading…' : 'Watch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
