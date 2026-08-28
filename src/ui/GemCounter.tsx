/**
 * The gem balance chip, shared by the main menu (top-right, beside the
 * settings gear) and the upgrades screen header.
 */
import { useStore } from '../state/store.ts';

export default function GemCounter() {
    const gems = useStore((s) => s.gems);
    return (
        <div className="flex h-12 items-center rounded-xl bg-black/40 px-4 text-[1.1rem] font-semibold tabular-nums text-white/90">
            💎 {gems}
        </div>
    );
}
