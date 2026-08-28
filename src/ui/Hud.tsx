/**
 * In-game HUD: a React overlay above the Pixi canvas.
 *
 * Pattern to keep: the overlay itself is pointer-events-none so taps fall
 * through to the canvas (pad selection lives there); each interactive
 * control opts back in with pointer-events-auto.
 */
import { sfx } from '../audio/audio.ts';
import { startWave } from '../game/actions.ts';
import { store, useStore } from '../state/store.ts';

export default function Hud() {
    const coins = useStore((s) => s.coins);
    const lives = useStore((s) => s.lives);
    const wave = useStore((s) => s.wave);
    const waveCount = useStore((s) => s.waveCount);
    const tdPhase = useStore((s) => s.tdPhase);
    const speed = useStore((s) => s.speed);
    const paused = useStore((s) => s.paused);
    return (
        <div className="pointer-events-none absolute inset-0 pt-safe-top">
            <div className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-black/50 px-4 py-2 text-lg font-bold tabular-nums">
                        ♥ {lives} · 🪙 {coins}
                    </div>
                    <button
                        type="button"
                        className="pointer-events-auto rounded-xl bg-black/50 px-4 py-2 text-lg font-bold transition-transform active:scale-95"
                        onClick={() => store.patch({ phase: 'menu', selectedPad: null })}
                    >
                        Menu
                    </button>
                </div>
                {/* second row: wave counter, Start between it and the speed
                    buttons — up here it never covers a pad, and it stays
                    reachable while the tower details sheet is open */}
                <div className="flex items-center justify-between">
                    <div className="rounded-xl bg-black/50 px-4 py-2 text-[1.1rem] font-semibold tabular-nums">
                        {wave > waveCount ? `Wave ${wave} · Endless` : `Wave ${wave}/${waveCount}`}
                    </div>
                    {tdPhase === 'build' && (
                        <button
                            type="button"
                            className="pointer-events-auto rounded-2xl bg-primary px-7 py-2 text-xl font-bold text-black shadow-lg transition-transform active:scale-95"
                            onClick={() => {
                                sfx.startWave();
                                startWave();
                            }}
                        >
                            Start
                        </button>
                    )}
                    <div className="pointer-events-auto flex overflow-hidden rounded-xl bg-black/50">
                        {([1, 2, 3, 4] as const).map((s) => (
                            <button
                                key={s}
                                type="button"
                                className={
                                    'px-3.5 py-2 text-[1.1rem] font-bold transition-colors ' +
                                    (speed === s ? 'bg-primary text-black' : 'text-white/70')
                                }
                                onClick={() => store.patch({ speed: s })}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            {paused && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <p className="text-2xl font-bold">Paused</p>
                </div>
            )}
        </div>
    );
}
