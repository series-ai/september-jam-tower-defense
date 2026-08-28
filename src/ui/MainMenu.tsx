/**
 * Main menu. The title is sized from the frame width so it always fits on
 * one line; buttons in a stack share one width. The Like/Comments row only
 * renders once the host confirms those prompts are available (engagement.ts).
 */
import { sfx } from '../audio/audio.ts';
import { openComments, promptLike } from '../sdk/engagement.ts';
import { store, useStore } from '../state/store.ts';
import GemCounter from './GemCounter.tsx';

export default function MainMenu() {
    const bestWave = useStore((s) => s.bestWave);
    const likeAvailable = useStore((s) => s.likeAvailable);
    const commentsAvailable = useStore((s) => s.commentsAvailable);
    const isLiked = useStore((s) => s.isLiked);
    return (
        <div className="relative flex h-full flex-col items-center justify-center gap-4 px-10">
            <div
                className="absolute right-5 top-5 flex items-center gap-2"
                style={{ marginTop: 'var(--safe-top)' }}
            >
                <GemCounter />
                <button
                    type="button"
                    aria-label="Settings"
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl transition-transform active:scale-95"
                    onClick={() => {
                        sfx.click();
                        store.patch({ settingsOpen: true });
                    }}
                >
                    ⚙
                </button>
            </div>
            {/* ADAPT: game title + tagline. The font-size calc keeps the
                title on one line at every frame width. */}
            <h1
                className="whitespace-nowrap font-bold tracking-wide text-primary"
                style={{ fontSize: 'calc(var(--game-w) * 0.1)' }}
            >
                TOWER DEFENSE
            </h1>
            {bestWave > 0 && (
                <div className="rounded-xl bg-white/5 px-6 py-3 text-[1.1rem] font-semibold text-white/80 tabular-nums">
                    Best: wave {bestWave}
                </div>
            )}
            <button
                type="button"
                className="w-64 rounded-2xl bg-primary px-12 py-4 text-xl font-bold text-black shadow-lg transition-transform active:scale-95"
                onClick={() => {
                    sfx.click();
                    store.patch({
                        phase: 'playing',
                        selectedPad: null,
                        runId: store.get().runId + 1,
                    });
                }}
            >
                Defend
            </button>
            <button
                type="button"
                className="w-64 rounded-2xl bg-sky-600 px-12 py-4 text-xl font-bold text-white shadow-lg transition-transform active:scale-95"
                onClick={() => {
                    sfx.click();
                    store.patch({ metaOpen: true });
                }}
            >
                Upgrades
            </button>
            <button
                type="button"
                className="w-64 rounded-2xl bg-violet-600 px-12 py-4 text-xl font-bold text-white shadow-lg transition-transform active:scale-95"
                onClick={() => {
                    sfx.click();
                    store.patch({ ranksOpen: true });
                }}
            >
                Ranks
            </button>
            <div className="text-center text-[1.1rem] leading-7 text-white/50">
                Tap a stone pad to place a tower
                <br />
                Start each wave when you are ready
                <br />
                Do not let the bugs through
            </div>
            {(likeAvailable || commentsAvailable) && (
                <div className="absolute inset-x-0 bottom-6 flex justify-center gap-3 pb-safe-bottom">
                    {likeAvailable && (
                        isLiked ? (
                            <span className="rounded-xl bg-white/5 px-5 py-3 text-[1.1rem] font-semibold text-primary">
                                ♥ Liked
                            </span>
                        ) : (
                            <button
                                type="button"
                                className="rounded-xl bg-white/10 px-5 py-3 text-[1.1rem] font-semibold text-white/85 transition-transform active:scale-95"
                                onClick={promptLike}
                            >
                                ♥ Like
                            </button>
                        )
                    )}
                    {commentsAvailable && (
                        <button
                            type="button"
                            className="rounded-xl bg-white/10 px-5 py-3 text-[1.1rem] font-semibold text-white/85 transition-transform active:scale-95"
                            onClick={openComments}
                        >
                            💬 Comments
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
