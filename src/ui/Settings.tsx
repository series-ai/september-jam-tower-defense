/**
 * Settings overlay (store.settingsOpen): music and sound volume sliders.
 * Sliders apply to the audio buses immediately; persistence is debounced
 * in save.setAudioVolumes so dragging does not hammer storage.
 */
import { setMusicVolume, setSfxVolume, sfx } from '../audio/audio.ts';
import { setAudioVolumes } from '../state/save.ts';
import { store, useStore } from '../state/store.ts';

function Slider({ label, value, onChange }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
}) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-xl font-bold">{label}</span>
                <span className="text-[1.1rem] tabular-nums text-white/60">{Math.round(value * 100)}%</span>
            </div>
            <input
                type="range"
                min={0}
                max={100}
                value={Math.round(value * 100)}
                className="h-3 w-full accent-[#8bd450]"
                onChange={(e) => onChange(Number(e.target.value) / 100)}
            />
        </div>
    );
}

export default function Settings() {
    const musicVol = useStore((s) => s.musicVol);
    const sfxVol = useStore((s) => s.sfxVol);

    const apply = (music: number, sound: number) => {
        setMusicVolume(music);
        setSfxVolume(sound);
        setAudioVolumes(music, sound);
        store.patch({ musicVol: music, sfxVol: sound });
    };

    return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 bg-surface px-10">
            <h2 className="text-3xl font-bold text-primary">Settings</h2>
            <div className="flex w-full max-w-sm flex-col gap-6">
                <Slider label="Music" value={musicVol} onChange={(v) => apply(v, sfxVol)} />
                <Slider
                    label="Sound"
                    value={sfxVol}
                    onChange={(v) => {
                        apply(musicVol, v);
                        sfx.click(); // hear the new level while dragging
                    }}
                />
            </div>
            <button
                type="button"
                className="w-64 rounded-2xl bg-white/15 px-12 py-4 text-xl font-bold text-white shadow-lg transition-transform active:scale-95"
                onClick={() => {
                    sfx.click();
                    store.patch({ settingsOpen: false });
                }}
            >
                Back
            </button>
        </div>
    );
}
