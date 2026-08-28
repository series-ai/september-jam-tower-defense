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
 */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { sdkReady } from './runSdk.ts';
import { store } from '../state/store.ts';

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
                if (!r?.available) return;
                let isLiked = false;
                try {
                    isLiked = (await RundotGameAPI.popups.getLikeState()).isLiked;
                } catch { /* read failed: still offer the prompt */ }
                store.patch({ likeAvailable: true, isLiked });
            })
            .catch(() => { /* host too old or offline */ });
        RundotGameAPI.popups.canShowCommentsPanel()
            .then((r) => {
                if (r?.available) store.patch({ commentsAvailable: true });
            })
            .catch(() => { /* host too old or offline */ });
    } catch { /* popups API missing entirely */ }
}

/** Show the platform Like prompt. Never call on load or in a loop. */
export function promptLike(): void {
    try {
        RundotGameAPI.popups.showLikeDialog()
            .then((res) => {
                if (res.shown && res.liked) {
                    store.patch({ isLiked: true });
                    RundotGameAPI.popups
                        .showToast('Thanks for the like!', { variant: 'success' })
                        .catch(() => { /* toast is best-effort */ });
                }
            })
            .catch(() => { /* suppressed or offline */ });
    } catch { /* non-fatal */ }
}

/** Open the platform Comments panel for this game. */
export function openComments(): void {
    try {
        RundotGameAPI.popups.showCommentsPanel().catch(() => { /* suppressed or offline */ });
    } catch { /* non-fatal */ }
}
