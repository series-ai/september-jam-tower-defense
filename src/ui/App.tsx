/**
 * Screen router. One phase visible at a time; the 'playing' phase stacks the
 * React HUD, build sheet, and end screen above the Pixi canvas.
 *
 * #app-frame (styled in styles/app.css) is the device frame: a centered
 * portrait column that fills phones edge-to-edge and letterboxes on desktop.
 * Everything — canvas and DOM UI — lives inside it, so they always align.
 */
import { useStore } from '../state/store.ts';
import LoadingScreen from './LoadingScreen.tsx';
import MainMenu from './MainMenu.tsx';
import Hud from './Hud.tsx';
import BuildSheet from './BuildSheet.tsx';
import EndScreen from './EndScreen.tsx';
import MetaUpgrades from './MetaUpgrades.tsx';
import Leaderboard from './Leaderboard.tsx';
import Settings from './Settings.tsx';
import GameCanvas from '../game/GameCanvas.tsx';

export default function App() {
    const phase = useStore((s) => s.phase);
    const runId = useStore((s) => s.runId);
    const metaOpen = useStore((s) => s.metaOpen);
    const ranksOpen = useStore((s) => s.ranksOpen);
    const settingsOpen = useStore((s) => s.settingsOpen);
    return (
        <div id="app-frame" className="bg-surface text-white">
            {phase === 'loading' && <LoadingScreen />}
            {phase === 'menu' && <MainMenu />}
            {phase === 'playing' && (
                <div className="absolute inset-0">
                    {/* keyed on runId: each run is a fresh engine + scene */}
                    <GameCanvas key={runId} />
                    <Hud />
                    <BuildSheet />
                    <EndScreen />
                </div>
            )}
            {/* overlays, not phases, so nothing unmounts underneath */}
            {metaOpen && <MetaUpgrades />}
            {ranksOpen && <Leaderboard />}
            {settingsOpen && <Settings />}
        </div>
    );
}
