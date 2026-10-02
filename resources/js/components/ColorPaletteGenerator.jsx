import { useEffect, useMemo, useState } from 'react';
import { useClipboard } from '../hooks/useClipboard';
import { LIGHTING_PALETTE, publishShared } from '../lib/paletteBus';
import AppShell from './layout/AppShell';
import {
    DEFAULT_OPTIONS,
    HARMONY_MODES,
    TEMPERATURES,
    generatePalette,
    getHarmonyAnchors,
    getTemperatureSwatches,
    hexToRgb,
    isValidHex,
    normalizeHex,
    paletteToCss,
    randomBaseColor,
    rgbToHex,
} from '../lib/colorPalette';
import ChannelSlider from './lumina/ChannelSlider';
import ColorCard from './lumina/ColorCard';
import ColorSphere from './lumina/ColorSphere';
import HarmonyWheel from './lumina/HarmonyWheel';
import SegmentedControl from './lumina/SegmentedControl';

const DEFAULT_COLOR = '#7B5CFF';

/** Etiquetas de los extremos de la rampa según la temperatura de la luz. */
const RAMP_LABELS = {
    warm: ['Luz · cálida', 'Sombra · fría'],
    neutral: ['Luz · neutra', 'Sombra · neutra'],
    cool: ['Luz · fría', 'Sombra · cálida'],
};

const TEMPERATURE_SWATCHES = Object.fromEntries(
    TEMPERATURES.map((option) => [option.id, getTemperatureSwatches(option.id)]),
);

const labelOf = (options, id) => options.find((option) => option.id === id)?.label;

/** Orden visual de la rampa de luz → sombra bajo la esfera. */
const RAMP_ORDER = [
    'tintedWhite',
    'maxBrightness',
    'highLight',
    'mediumLight',
    'illuminate',
    'baseLight',
    'softShadow',
    'shadow',
    'deepShadow',
    'shadowCast',
    'shadowCore',
];

const CHANNELS = [
    { channel: 'r', label: 'R' },
    { channel: 'g', label: 'G' },
    { channel: 'b', label: 'B' },
];

export default function ColorPaletteGenerator() {
    // Ajustes "confirmados" (color + armonía + temperatura): disparan el
    // recálculo de la paleta de tarjetas al pulsar "Generar Paleta".
    const [committed, setCommitted] = useState({ color: DEFAULT_COLOR, ...DEFAULT_OPTIONS });
    // Ajustes en edición: la esfera, la rueda y la rampa los muestran en vivo.
    const [draftColor, setDraftColor] = useState(DEFAULT_COLOR);
    const [draftHarmony, setDraftHarmony] = useState(DEFAULT_OPTIONS.harmony);
    const [draftTemperature, setDraftTemperature] = useState(DEFAULT_OPTIONS.temperature);
    // Texto crudo del input HEX (puede ser inválido mientras se escribe).
    const [hexInput, setHexInput] = useState(DEFAULT_COLOR);
    const [palette, setPalette] = useState(() => generatePalette(DEFAULT_COLOR, DEFAULT_OPTIONS));
    // Se incrementa en cada "Generar" para re-animar la cuadrícula.
    const [generation, setGeneration] = useState(0);
    const [cssCopied, copyCss] = useClipboard();

    // Recalcular la paleta cada vez que se confirman nuevos ajustes.
    useEffect(() => {
        const nextPalette = generatePalette(committed.color, committed);
        setPalette(nextPalette);

        // Comparte la paleta con el módulo de personaje (otra pestaña).
        publishShared(LIGHTING_PALETTE, {
            harmony: committed.harmony,
            temperature: committed.temperature,
            baseHex: nextPalette.base.hex,
            colors: [nextPalette.base, ...Object.values(nextPalette.variations)].map(({ key, name, hex }) => ({ key, name, hex })),
        });
    }, [committed]);

    const draftOptions = useMemo(
        () => ({ harmony: draftHarmony, temperature: draftTemperature }),
        [draftHarmony, draftTemperature],
    );
    const draftPalette = useMemo(() => generatePalette(draftColor, draftOptions), [draftColor, draftOptions]);
    const draftRgb = useMemo(() => hexToRgb(draftColor), [draftColor]);
    // Anclas de cada modo para el color actual: se dibujan en las pestañas.
    const harmonyAnchors = useMemo(
        () =>
            Object.fromEntries(
                HARMONY_MODES.map((mode) => [mode.id, getHarmonyAnchors(draftColor, mode.id, draftTemperature)]),
            ),
        [draftColor, draftTemperature],
    );
    const isHexInvalid = !isValidHex(hexInput);
    const hasPendingChanges =
        draftColor !== committed.color ||
        draftHarmony !== committed.harmony ||
        draftTemperature !== committed.temperature;

    const updateDraft = (hex) => {
        setDraftColor(hex);
        setHexInput(hex);
    };

    const commit = (hex) => {
        setCommitted({ color: hex, ...draftOptions });
        setGeneration((current) => current + 1);
    };

    const handleHexChange = (event) => {
        const value = event.target.value.toUpperCase();
        setHexInput(value.startsWith('#') || value === '' ? value : `#${value}`);

        if (isValidHex(value)) {
            setDraftColor(normalizeHex(value));
        }
    };

    const handleChannelChange = (channel, value) => {
        updateDraft(rgbToHex({ ...draftRgb, [channel]: value }));
    };

    const handleRandom = () => {
        const hex = randomBaseColor();
        updateDraft(hex);
        commit(hex);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        commit(draftColor);
    };

    const cards = [palette.base, ...Object.values(palette.variations)];
    const { oklch } = draftPalette.base;

    return (
        <AppShell page="lighting" glowColor={draftColor}>
            {/* ───────────── Controles | Esfera + Paleta ───────────── */}
            <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-10">
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-panel/70 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7"
                >
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold tracking-widest text-electric-soft uppercase">
                            01 · Color base
                        </span>
                        <h2 className="text-xl font-semibold tracking-tight text-white">Define tu fuente de luz</h2>
                    </div>

                    {/* HEX */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="hex-input" className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                            Código HEX
                        </label>

                        <div className="flex gap-2">
                            <div
                                className={`flex flex-1 items-center gap-3 rounded-xl border bg-black/30 px-3 transition focus-within:ring-2 ${
                                    isHexInvalid
                                        ? 'border-rose-500/60 focus-within:ring-rose-500/40'
                                        : 'border-white/10 focus-within:border-electric/60 focus-within:ring-electric/30'
                                }`}
                            >
                                <label
                                    className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-white/20"
                                    style={{ backgroundColor: draftColor }}
                                    title="Abrir selector de color"
                                >
                                    <input
                                        type="color"
                                        value={draftColor.toLowerCase()}
                                        onChange={(event) => updateDraft(normalizeHex(event.target.value))}
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                        aria-label="Selector de color"
                                    />
                                </label>

                                <input
                                    id="hex-input"
                                    type="text"
                                    value={hexInput}
                                    onChange={handleHexChange}
                                    onBlur={() => setHexInput(draftColor)}
                                    maxLength={7}
                                    spellCheck={false}
                                    autoComplete="off"
                                    aria-invalid={isHexInvalid}
                                    className="w-full bg-transparent py-3 font-mono text-base tracking-wider text-white uppercase outline-none placeholder:text-zinc-600"
                                    placeholder="#7B5CFF"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleRandom}
                                title="Color aleatorio"
                                aria-label="Generar color aleatorio"
                                className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/10 bg-black/30 text-zinc-300 transition hover:border-electric/50 hover:text-white hover:shadow-glow"
                            >
                                <DiceIcon />
                            </button>
                        </div>

                        <p className={`h-4 text-[11px] ${isHexInvalid ? 'text-rose-400' : 'text-zinc-500'}`}>
                            {isHexInvalid ? 'Usa un HEX válido de 3 o 6 dígitos.' : 'Pulsa Enter o "Generar Paleta" para aplicar.'}
                        </p>
                    </div>

                    {/* RGB */}
                    <div className="flex flex-col gap-4">
                        <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">Canales RGB</span>
                        {CHANNELS.map(({ channel, label }) => (
                            <ChannelSlider
                                key={channel}
                                channel={channel}
                                label={label}
                                rgb={draftRgb}
                                onChange={handleChannelChange}
                            />
                        ))}
                    </div>

                    {/* Lectura OKLCH */}
                    <dl className="grid grid-cols-3 divide-x divide-white/5 rounded-xl border border-white/5 bg-black/20 font-mono">
                        {[
                            ['L', `${(oklch.l * 100).toFixed(1)}%`],
                            ['C', oklch.c.toFixed(3)],
                            ['H', `${oklch.h.toFixed(0)}°`],
                        ].map(([term, value]) => (
                            <div key={term} className="flex flex-col items-center gap-0.5 py-2.5">
                                <dt className="text-[9px] tracking-widest text-zinc-500 uppercase">OKLCH · {term}</dt>
                                <dd className="text-sm text-zinc-200 tabular-nums">{value}</dd>
                            </div>
                        ))}
                    </dl>

                    <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold tracking-widest text-electric-soft uppercase">
                            02 · Armonía y luz
                        </span>
                        <h2 className="text-xl font-semibold tracking-tight text-white">Cómo viaja el color</h2>
                    </div>

                    <SegmentedControl
                        label="Modo de armonía"
                        options={HARMONY_MODES}
                        value={draftHarmony}
                        onChange={setDraftHarmony}
                        renderPreview={(option) => (
                            <span className="flex -space-x-1">
                                {harmonyAnchors[option.id].map((anchor, index) => (
                                    <span
                                        key={index}
                                        className="size-2.5 rounded-full ring-1 ring-black/60"
                                        style={{ backgroundColor: anchor.hex }}
                                    />
                                ))}
                            </span>
                        )}
                    />

                    {draftPalette.harmony.isAchromatic && draftHarmony !== 'monochromatic' && (
                        <p className="-mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-200/80">
                            Este color es casi gris: no tiene matiz que girar, así que la armonía apenas se nota.
                        </p>
                    )}

                    <SegmentedControl
                        label="Temperatura de la luz"
                        options={TEMPERATURES}
                        value={draftTemperature}
                        onChange={setDraftTemperature}
                        columns="grid-cols-3"
                        renderPreview={(option) => (
                            <span
                                className="size-3 rounded-full ring-1 ring-black/60"
                                style={{
                                    background: `linear-gradient(135deg, ${TEMPERATURE_SWATCHES[option.id].light} 50%, ${TEMPERATURE_SWATCHES[option.id].shadow} 50%)`,
                                }}
                            />
                        )}
                    />

                    <button
                        type="submit"
                        disabled={isHexInvalid}
                        className={`group relative flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-electric px-5 py-3.5 text-sm font-semibold tracking-widest text-white uppercase transition duration-300 hover:-translate-y-0.5 hover:bg-[#8a6eff] hover:shadow-glow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none ${
                            hasPendingChanges ? 'shadow-glow-lg' : 'shadow-glow'
                        }`}
                    >
                        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                        <SparklesIcon />
                        Generar Paleta
                        {hasPendingChanges && (
                            <span className="relative flex size-2" aria-label="Cambios sin aplicar">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/70" />
                                <span className="relative inline-flex size-2 rounded-full bg-white" />
                            </span>
                        )}
                    </button>
                </form>

                <div className="flex min-w-0 flex-col gap-6">
                    {/* Esfera + resumen de la paleta */}
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
                        <ColorSphere palette={draftPalette} className="w-full max-w-[16rem] shrink-0 sm:w-56" />

                        <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-semibold tracking-widest text-electric-soft uppercase">
                                        03 · Paleta de iluminación
                                    </span>
                                    <h2 className="text-xl font-semibold tracking-tight text-white">
                                        {cards.length} tonos derivados de{' '}
                                        <span className="font-mono">{palette.base.hex}</span>
                                    </h2>
                                    <span className="text-[11px] tracking-widest text-zinc-500 uppercase">
                                        {labelOf(HARMONY_MODES, palette.harmony.mode)} · Luz{' '}
                                        {labelOf(TEMPERATURES, palette.harmony.temperature)?.toLowerCase()}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => copyCss(paletteToCss(palette))}
                                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-panel/70 px-4 py-2 text-[11px] font-semibold tracking-widest text-zinc-300 uppercase backdrop-blur transition hover:border-electric/50 hover:text-white hover:shadow-glow"
                                >
                                    {cssCopied ? '¡CSS copiado!' : 'Copiar variables CSS'}
                                </button>
                            </div>

                            {/* Vista previa en vivo: armonía + rampa luz → sombra */}
                            <div className="flex w-full items-center gap-4">
                                <HarmonyWheel anchors={draftPalette.harmony.anchors} />

                                <div className="flex min-w-0 flex-1 flex-col gap-2">
                                    <div className="flex items-center justify-between gap-2 text-[10px] tracking-widest uppercase">
                                        <span className="font-semibold text-zinc-300">
                                            {labelOf(HARMONY_MODES, draftHarmony)}
                                        </span>
                                        <span className="text-zinc-500">
                                            Luz {labelOf(TEMPERATURES, draftTemperature)?.toLowerCase()}
                                        </span>
                                    </div>
                                    <div className="flex h-3 overflow-hidden rounded-full ring-1 ring-white/10">
                                        {RAMP_ORDER.map((key) => (
                                            <span
                                                key={key}
                                                className="flex-1 transition-colors duration-500"
                                                style={{ backgroundColor: draftPalette.variations[key].hex }}
                                                title={draftPalette.variations[key].name}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-between gap-2 text-[10px] tracking-widest text-zinc-500 uppercase">
                                        <span>{RAMP_LABELS[draftTemperature][0]}</span>
                                        <span className="font-mono text-zinc-300">{draftColor}</span>
                                        <span>{RAMP_LABELS[draftTemperature][1]}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cuadrícula de variaciones */}
                    <div key={generation} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                        {cards.map((color, index) => (
                            <ColorCard key={color.key} color={color} index={index} isBase={index === 0} />
                        ))}
                    </div>
                </div>
            </section>
        </AppShell>
    );
}

function SparklesIcon() {
    return (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z" />
        </svg>
    );
}

function DiceIcon() {
    return (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
            <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
            <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        </svg>
    );
}
