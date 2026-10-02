import { useEffect, useMemo, useState } from 'react';
import { useClipboard } from '../hooks/useClipboard';
import {
    generatePalette,
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

const DEFAULT_COLOR = '#7B5CFF';

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
    // Color "confirmado": dispara el recálculo de la paleta de tarjetas.
    const [baseColor, setBaseColor] = useState(DEFAULT_COLOR);
    // Color en edición: la esfera lo previsualiza en vivo mientras ajustas.
    const [draftColor, setDraftColor] = useState(DEFAULT_COLOR);
    // Texto crudo del input HEX (puede ser inválido mientras se escribe).
    const [hexInput, setHexInput] = useState(DEFAULT_COLOR);
    const [palette, setPalette] = useState(() => generatePalette(DEFAULT_COLOR));
    // Se incrementa en cada "Generar" para re-animar la cuadrícula.
    const [generation, setGeneration] = useState(0);
    const [cssCopied, copyCss] = useClipboard();

    // Recalcular la paleta cada vez que se confirma un nuevo color base.
    useEffect(() => {
        setPalette(generatePalette(baseColor));
    }, [baseColor]);

    const draftPalette = useMemo(() => generatePalette(draftColor), [draftColor]);
    const draftRgb = useMemo(() => hexToRgb(draftColor), [draftColor]);
    const isHexInvalid = !isValidHex(hexInput);
    const hasPendingChanges = draftColor !== baseColor;

    const updateDraft = (hex) => {
        setDraftColor(hex);
        setHexInput(hex);
    };

    const commit = (hex) => {
        setBaseColor(hex);
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
        <div className="relative isolate min-h-screen overflow-hidden">
            <Backdrop color={draftColor} />

            <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8 lg:gap-14">
                <Header />

                {/* ───────────── Controles + Esfera ───────────── */}
                <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-12">
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

                    {/* Escenario de la esfera */}
                    <div className="flex flex-col items-center gap-6">
                        <ColorSphere palette={draftPalette} />

                        <div className="flex w-full max-w-md flex-col gap-2">
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
                            <div className="flex justify-between text-[10px] tracking-widest text-zinc-500 uppercase">
                                <span>Luz · cálida</span>
                                <span className="font-mono text-zinc-300">{draftColor}</span>
                                <span>Sombra · fría</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ───────────── Cuadrícula de variaciones ───────────── */}
                <section className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-semibold tracking-widest text-electric-soft uppercase">
                                02 · Paleta de iluminación
                            </span>
                            <h2 className="text-xl font-semibold tracking-tight text-white">
                                {cards.length} tonos derivados de <span className="font-mono">{palette.base.hex}</span>
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={() => copyCss(paletteToCss(palette))}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-panel/70 px-4 py-2 text-[11px] font-semibold tracking-widest text-zinc-300 uppercase backdrop-blur transition hover:border-electric/50 hover:text-white hover:shadow-glow"
                        >
                            {cssCopied ? '¡CSS copiado!' : 'Copiar variables CSS'}
                        </button>
                    </div>

                    <div key={generation} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                        {cards.map((color, index) => (
                            <ColorCard key={color.key} color={color} index={index} isBase={index === 0} />
                        ))}
                    </div>
                </section>

                <footer className="flex flex-col items-center justify-between gap-2 border-t border-white/5 pt-6 text-[11px] tracking-wider text-zinc-500 sm:flex-row">
                    <span>Matemática de color en espacio OKLCH · gamut mapping sRGB</span>
                    <span className="tracking-widest uppercase">Menoiro Color</span>
                </footer>
            </div>
        </div>
    );
}

function Header() {
    return (
        <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <span className="relative grid size-9 place-items-center rounded-xl bg-panel ring-1 ring-white/10 shadow-glow">
                    <span className="size-4 rounded-full bg-[conic-gradient(from_200deg,#7b5cff,#ff8a5c,#ffe08a,#5cc8ff,#7b5cff)] blur-[0.5px]" />
                </span>
                <div className="flex flex-col leading-none">
                    <span className="text-sm font-bold tracking-[0.35em] text-white">MENOIRO COLOR</span>
                    <span className="mt-1 text-[10px] tracking-widest text-zinc-500 uppercase">Light & Shadow Palette Engine</span>
                </div>
            </div>

            <span className="hidden items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-[10px] font-semibold tracking-widest text-electric-soft uppercase sm:inline-flex">
                <span className="size-1.5 rounded-full bg-electric shadow-[0_0_8px_#7b5cff]" />
                OKLCH Engine
            </span>
        </header>
    );
}

/** Fondo: resplandor púrpura de marca + resplandor del color activo + retícula. */
function Backdrop({ color }) {
    return (
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-electric/20 blur-[120px]" />
            <div
                className="absolute top-40 right-[-10rem] size-[30rem] rounded-full opacity-25 blur-[120px] transition-colors duration-700"
                style={{ backgroundColor: color }}
            />
            <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
                    backgroundSize: '56px 56px',
                    maskImage: 'radial-gradient(ellipse at top, black 20%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at top, black 20%, transparent 70%)',
                }}
            />
        </div>
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
