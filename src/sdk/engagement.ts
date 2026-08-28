/**
 * Platform engagement prompts (RundotGameAPI.popups): the Like dialog and the
 * Comments panel. The platform renders its own trusted UI and the PLAYER
 * acts; the game never likes on their behalf and never sees comment content.
 *
 * Posture, like every SDK surface: capability-gated (buttons stay hidden
 * until the host confirms availability), every call try/catch'd AND
 * promise-.catch()'d, and nothing here ever throws. In a plain browser the
 * SDK self-mocks, so local dev may or may not show the buttons; the real
 * behavior only appears inside the RUN host.
 *
 * Both prompts are host-side RPCs that resolve only when the player closes
 * the UI (the SDK allows up to 10 minutes), and the host may suppress them
 * (post-load window, cooldown, per-session cap, comments disabled). So each
 * action: re-checks availability at click time, refuses to fire while one
 * is in flight, and makes every non-success visible with a toast and a
 * host-visible log line instead of failing silently.
 */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { sdkReady } from './runSdk.ts';
import { store } from '../state/store.ts';

let inFlight: 'like' | 'comments' | null = null;

function log(message: string): void {
    try { RundotGameAPI.log(`[engagement] ${message}`); } catch { /* no host */ }
    console.log(`[engagement] ${message}`);
}

function toast(message: string): void {
    try {
        RundotGameAPI.popups.showToast(message, { variant: 'info' }).catch(() => {});
    } catch { /* toast is best-effort */ }
}

/**
 * Query capabilities + the player's like state and patch the store. Called
 * fire-and-forget from boot (main.tsx step 8); buttons render only after
 * the host answers.
 */
export function refreshEngagement(): void {
    if (!sdkReady()) return;
    try {
        RundotGameAPI.popups.canShowLikeDialog()
            .then(async (r) => {
                log(`boot: like dialog available=${String(r?.available)}`);
                if (!r?.available) return;
                let isLiked = false;
                try {
                    isLiked = (await RundotGameAPI.popups.getLikeState()).isLiked;
                } catch { /* read failed: still offer the prompt */ }
                store.patch({ likeAvailable: true, isLiked });
            })
            .catch((err) => log(`boot: like capability check failed (${String(err).slice(0, 120)})`));
        RundotGameAPI.popups.canShowCommentsPanel()
            .then((r) => {
                log(`boot: comments panel available=${String(r?.available)}`);
                if (r?.available) store.patch({ commentsAvailable: true });
            })
            .catch((err) => log(`boot: comments capability check failed (${String(err).slice(0, 120)})`));
    } catch { /* popups API missing entirely */ }
}

/** Show the platform Like prompt. Never call on load or in a loop. */
export function promptLike(): void {
    if (inFlight) { log(`like ignored: ${inFlight} already in flight`); return; }
    inFlight = 'like';
    try {
        RundotGameAPI.popups.showLikeDialog()
            .then((res) => {
                if (res.shown && res.liked) {
                    store.patch({ isLiked: true });
                    toast('Thanks for the like!');
                    log('like: liked');
                } else if (res.shown) {
                    log('like: dismissed');
                } else {
                    log(`like: not shown (${res.reason})`);
                    toast('Not available right now, try again in a moment.');
                }
            })
            .catch((err) => {
                log(`like: rpc failed (${String(err).slice(0, 120)})`);
                toast('Not available right now, try again in a moment.');
            })
            .finally(() => { inFlight = null; });
    } catch (err) {
        inFlight = null;
        log(`like: threw (${String(err).slice(0, 120)})`);
    }
}

/** Open the platform Comments panel for this game. */
export function openComments(): void {
    if (inFlight) { log(`comments ignored: ${inFlight} already in flight`); return; }
    inFlight = 'comments';
    try {
        // re-check at click time: availability can change after boot
        RundotGameAPI.popups.canShowCommentsPanel()
            .then((can) => {
                if (!can?.available) {
                    log('comments: host says unavailable at click time');
                    toast('Comments are not available right now.');
                    return null;
                }
                return RundotGameAPI.popups.showCommentsPanel();
            })
            .then((res) => {
                if (!res) return;
                if (res.shown) log('comments: panel shown, then dismissed');
                else {
                    log(`comments: not shown (${res.reason})`);
                    toast('Comments are not available right now, try again in a moment.');
                }
            })
            .catch((err) => {
                log(`comments: rpc failed (${String(err).slice(0, 120)})`);
                toast('Comments are not available right now, try again in a moment.');
            })
            .finally(() => { inFlight = null; });
    } catch (err) {
        inFlight = null;
        log(`comments: threw (${String(err).slice(0, 120)})`);
    }
}
