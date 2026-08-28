/**
 * Leaderboard wrapper: TWO all-time boards as modes of one leaderboard —
 * 'kills' (most enemies defeated in a run) and 'waves' (highest wave cleared).
 * See rundot/leaderboard.config.json; the boards are created automatically
 * on `rundot deploy`. Simple security mode, server keeps each player's
 * best, so every run can be submitted.
 *
 * Posture: leaderboards only exist inside the RUN host. In plain-browser
 * dev every call resolves to null/no-op and the UI shows its offline
 * state. Nothing here ever throws.
 */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { sdkReady } from './runSdk.ts';

/** The all-time period key from rundot/leaderboard.config.json. */
const PERIOD = 'alltime';

/** The two boards, as mode keys from rundot/leaderboard.config.json. */
export type BoardMode = 'kills' | 'waves';

export const BOARD_MODES: BoardMode[] = ['kills', 'waves'];

export const BOARD_LABELS: Record<BoardMode, string> = {
    kills: 'Enemies Defeated',
    waves: 'Waves Cleared',
};

/** True when the RUN host is present (boards can exist at all). */
export function leaderboardsAvailable(): boolean {
    return sdkReady();
}

/**
 * Submit a finished run to both boards, fire-and-forget. The server keeps
 * each player's best per board, so every run can be submitted; zero scores
 * are skipped (the config's minScore is 1).
 */
export function submitRunScores(kills: number, wavesCleared: number, seconds: number): void {
    if (!sdkReady()) return;
    const duration = Math.max(1, Math.round(seconds));
    const submit = (mode: BoardMode, score: number) => {
        if (score <= 0) return;
        try {
            RundotGameAPI.leaderboard
                .submitScore({ score, duration, mode, period: PERIOD })
                .catch((err) => console.warn(`[leaderboard] ${mode} submit failed`, err));
        } catch (err) {
            console.warn(`[leaderboard] ${mode} submit failed`, err);
        }
    };
    submit('kills', Math.floor(kills));
    submit('waves', Math.floor(wavesCleared));
}

/** One row of the board view. */
export interface BoardEntry {
    profileId: string;
    username: string;
    avatarUrl: string | null;
    rank: number | null;
    score: number;
}

/** Everything the leaderboard screen renders, in one shape. */
export interface BoardView {
    /** Top entries (up to 10). */
    top: BoardEntry[];
    /** The player's own entry (null if they have no ranked score yet). */
    you: BoardEntry | null;
    /** Neighbors around the player, when they are outside the top list. */
    before: BoardEntry[];
    after: BoardEntry[];
    totalPlayers: number;
}

function toEntry(e: {
    profileId: string; username: string; avatarUrl: string | null;
    rank: number | null; score: number;
}): BoardEntry {
    return {
        profileId: e.profileId,
        username: e.username,
        avatarUrl: e.avatarUrl,
        rank: e.rank,
        score: e.score,
    };
}

/**
 * Fetch one board: top 10 plus the player's surroundings, in one host
 * call. Null on failure or outside the host (UI shows offline/error).
 */
export async function fetchBoard(mode: BoardMode): Promise<BoardView | null> {
    if (!sdkReady()) return null;
    try {
        const r = await RundotGameAPI.leaderboard.getPodiumScores({
            mode,
            period: PERIOD,
            topCount: 10,
            contextAhead: 2,
            contextBehind: 2,
        });
        return {
            top: r.context.topEntries.map(toEntry),
            you: r.context.playerEntry ? toEntry(r.context.playerEntry) : null,
            before: r.context.beforePlayer.map(toEntry),
            after: r.context.afterPlayer.map(toEntry),
            totalPlayers: r.totalEntries,
        };
    } catch (err) {
        console.warn('[leaderboard] fetch failed', err);
        return null;
    }
}
