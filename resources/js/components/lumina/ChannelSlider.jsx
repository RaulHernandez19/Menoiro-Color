/**
 * Slider de un canal RGB. El track muestra el gradiente real que obtendrías
 * moviendo solo ese canal, manteniendo los otros dos fijos.
 */
export default function ChannelSlider({ channel, label, rgb, onChange }) {
    const at = (value) => {
        const color = { ...rgb, [channel]: value };

        return `rgb(${color.r}, ${color.g}, ${color.b})`;
    };

    return (
        <label className="grid grid-cols-[1.25rem_1fr_2.75rem] items-center gap-3">
            <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">{label}</span>

            <input
                type="range"
                min="0"
                max="255"
                value={rgb[channel]}
                onChange={(event) => onChange(channel, Number(event.target.value))}
                className="channel-slider"
                style={{ background: `linear-gradient(to right, ${at(0)}, ${at(255)})` }}
                aria-label={`Canal ${label}`}
            />

            <span className="rounded-md bg-black/30 py-1 text-center font-mono text-xs text-zinc-300 tabular-nums ring-1 ring-white/5">
                {rgb[channel]}
            </span>
        </label>
    );
}
