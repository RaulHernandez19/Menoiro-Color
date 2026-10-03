import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClipboard } from '../../hooks/useClipboard';
import { isValidHex, normalizeHex, randomBaseColor } from '../../lib/colorPalette';
import { HARMONY_RULES, byLightness, generateHarmonyPalette, mostSaturated, readablePairs } from '../../lib/harmonyPalettes';
import { LIGHTING_PALETTE, readShared } from '../../lib/paletteBus';
import AppShell from '../layout/AppShell';
import SegmentedControl from '../lumina/SegmentedControl';

const DEFAULT_BASE = '#E07A3A';
const HISTORY_LIMIT = 20;

export default function HarmonyPaletteStudio() {
    const [baseHex, setBaseHex] = useState(() => readShared(LIGHTING_PALETTE)?.baseHex ?? DEFAULT_BASE);
    const [hexInput, setHexInput] = useState(baseHex);
    const [ruleId, setRuleId] = useState('analogous');
    const [colors, setColors] = useState(() => generateHarmonyPalette(baseHex, 'analogous'));
    const [locked, setLocked] = useState([false, false, false, false, false]);
    const [history, setHistory] = useState([]);
    const [copiedKey, setCopiedKey] = useState(null);
    const [, copy] = useClipboard();

    const regenerate = useCallback(
        ({ base = baseHex, rule: nextRule = ruleId, jitter = true } = {}) => {
            setHistory((current) => [colors, ...current].slice(0, HISTORY_LIMIT));
            setColors(
                generateHarmonyPalette(base, nextRule, {
                    jitter,
                    locked: locked.map((isLocked, index) => (isLocked ? colors[index] : null)),
                }),
            );
        },
        [baseHex, colors, locked, ruleId],
    );

    // Barra espaciadora = nueva variación (como en Coolors).
    useEffect(() => {
        const handleKey = (event) => {
            const isTyping = event.target instanceof Element && event.target.closest('input, textarea, select, button');

            if (event.code !== 'Space' || isTyping) {
                return;
            }

            event.preventDefault();
            regenerate();
        };

        window.addEventListener('keydown', handleKey);

        return () => window.removeEventListener('keydown', handleKey);
    }, [regenerate]);

    const changeBase = (hex) => {
        setBaseHex(hex);
        setHexInput(hex);
        regenerate({ base: hex, jitter: false });
    };

    const changeRule = (nextRule) => {
        setRuleId(nextRule);
        setLocked([false, false, false, false, false]);
        setHistory((current) => [colors, ...current].slice(0, HISTORY_LIMIT));
        setColors(generateHarmonyPalette(baseHex, nextRule));
    };

    const undo = () => {
        const [previous, ...rest] = history;

        if (previous) {
            setColors(previous);
            setHistory(rest);
        }
    };

    const copyWithFeedback = (key, text) => {
        copy(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1400);
    };

    const exportJson = () => {
        const data = { app: 'Menoiro Color', format: 'harmony-palette', rule: ruleId, baseHex, colors: colors.map((color) => color.hex) };
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `menoiro-paleta-${ruleId}-${baseHex.slice(1).toLowerCase()}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const pairs = useMemo(() => readablePairs(colors).slice(0, 4), [colors]);
    const css = `:root {\n${colors.map((color, index) => `  --color-${index + 1}: ${color.hex};`).join('\n')}\n}`;

    return (
        <AppShell page="palettes" glowColor={baseHex}>
            <section className="flex flex-col gap-6">
                {/* ───────────── Controles ───────────── */}
                <div className="grid items-end gap-5 rounded-3xl border border-white/10 bg-panel/70 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
                    <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-semibold tracking-widest text-electric-soft uppercase">01 · Color base</span>
                        <div className="flex gap-2">
                            <div
                                className={`flex flex-1 items-center gap-3 rounded-xl border bg-black/30 px-3 focus-within:ring-2 ${
                                    isValidHex(hexInput) ? 'border-white/10 focus-within:ring-electric/30' : 'border-rose-500/60 focus-within:ring-rose-500/40'
                                }`}
                            >
                                <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-white/20" style={{ backgroundColor: baseHex }}>
                                    <input
                                        type="color"
                                        value={baseHex.toLowerCase()}
                                        onChange={(event) => changeBase(normalizeHex(event.target.value))}
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                        aria-label="Selector de color base"
                                    />
                                </label>
                                <input
                                    type="text"
                                    value={hexInput}
                                    maxLength={7}
                                    spellCheck={false}
                                    aria-label="Código HEX del color base"
                                    onChange={(event) => {
                                        const value = event.target.value.toUpperCase();
                                        setHexInput(value);

                                        if (isValidHex(value)) {
                                            changeBase(normalizeHex(value));
                                        }
                                    }}
                                    onBlur={() => setHexInput(baseHex)}
                                    className="w-full bg-transparent py-2.5 font-mono text-sm tracking-wider text-white uppercase outline-none"
                                />
                            </div>
                            <IconButton label="Color base aleatorio" onClick={() => changeBase(randomBaseColor())}>
                                <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
                                <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
                                <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
                                <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                            </IconButton>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const lighting = readShared(LIGHTING_PALETTE);
                                lighting && changeBase(lighting.baseHex);
                            }}
                            className="self-start text-[11px] tracking-wider text-zinc-400 underline decoration-white/20 underline-offset-4 hover:text-white"
                        >
                            Usar el color de Iluminación
                        </button>
                    </div>

                    <SegmentedControl label="02 · Regla de armonía" options={HARMONY_RULES} value={ruleId} onChange={changeRule} columns="grid-cols-3" />
                </div>

                {/* ───────────── Paleta ───────────── */}
                <div className="grid grid-cols-1 overflow-hidden rounded-3xl ring-1 ring-white/10 sm:h-[22rem] sm:grid-cols-5">
                    {colors.map((color, index) => (
                        <div
                            key={color.id}
                            className="group animate-rise relative flex min-h-24 flex-col justify-end gap-2 p-4 transition-[flex] sm:p-5"
                            style={{ backgroundColor: color.hex, color: color.textColor, animationDelay: `${index * 40}ms` }}
                        >
                            <div className="absolute top-3 right-3 flex gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                                <SwatchButton
                                    label={locked[index] ? 'Desbloquear color' : 'Bloquear color'}
                                    active={locked[index]}
                                    onClick={() => setLocked((current) => current.map((value, i) => (i === index ? !value : value)))}
                                >
                                    {locked[index] ? (
                                        <path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" />
                                    ) : (
                                        <path d="M7 11V8a5 5 0 0 1 9.6-2M5 11h14v10H5z" />
                                    )}
                                </SwatchButton>
                                <SwatchButton label="Copiar HEX" onClick={() => copyWithFeedback(color.id, color.hex)}>
                                    <rect x="9" y="9" width="12" height="12" rx="2" />
                                    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                                </SwatchButton>
                            </div>

                            {locked[index] && (
                                <span className="absolute top-3 left-3 rounded-full bg-black/30 px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase">
                                    Fijo
                                </span>
                            )}

                            <span className="font-mono text-lg font-medium tracking-tight sm:text-xl">
                                {copiedKey === color.id ? '¡Copiado!' : color.hex}
                            </span>
                            <span className="font-mono text-[10px] opacity-70">
                                L {Math.round(color.oklch.l * 100)} · C {color.oklch.c.toFixed(2)} · H {Math.round(color.oklch.h)}°
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <p className="text-[11px] text-zinc-500">
                        <kbd className="rounded border border-white/20 px-1.5 py-0.5 font-mono text-zinc-300">Espacio</kbd> genera una
                        variación · bloquea los colores que te gusten con el candado.
                    </p>
                    <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={undo} disabled={!history.length} className={ghostButton}>
                            Deshacer
                        </button>
                        <button
                            type="button"
                            onClick={() => regenerate()}
                            className="cursor-pointer rounded-full bg-electric px-5 py-2 text-[11px] font-semibold tracking-widest text-white uppercase shadow-glow transition hover:shadow-glow-lg"
                        >
                            Generar variación
                        </button>
                    </div>
                </div>

                {/* ───────────── Vista previa + uso ───────────── */}
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
                    <ScenePreview colors={colors} />

                    <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-panel/70 p-5 backdrop-blur-xl sm:p-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-semibold tracking-widest text-electric-soft uppercase">03 · Usar la paleta</span>
                            <h2 className="text-xl font-semibold tracking-tight text-white">Exportar y combinar</h2>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => copyWithFeedback('hex', colors.map((color) => color.hex).join(', '))} className={ghostButton}>
                                {copiedKey === 'hex' ? '¡Listo!' : 'HEX'}
                            </button>
                            <button type="button" onClick={() => copyWithFeedback('css', css)} className={ghostButton}>
                                {copiedKey === 'css' ? '¡Listo!' : 'CSS'}
                            </button>
                            <button type="button" onClick={exportJson} className={ghostButton}>
                                JSON
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">Combinaciones legibles</span>
                            {pairs.length ? (
                                pairs.map(({ background, foreground, ratio }) => (
                                    <div
                                        key={`${background.id}-${foreground.id}`}
                                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold"
                                        style={{ backgroundColor: background.hex, color: foreground.hex }}
                                    >
                                        Texto de ejemplo
                                        <span className="font-mono text-[11px]">{ratio.toFixed(1)}:1</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[11px] text-zinc-500">
                                    Ningún par llega a 4.5:1 (WCAG AA). Para texto, combina con blanco o negro.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <Tips />
            </section>
        </AppShell>
    );
}

const ghostButton =
    'cursor-pointer rounded-full border border-white/10 bg-black/30 px-4 py-2 text-[11px] font-semibold tracking-widest text-zinc-300 uppercase transition hover:border-electric/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Escena ilustrada con la paleta: el más claro de cielo, los intermedios en
 * capas de colinas, el más oscuro en primer plano y el más saturado como sol.
 * Así se ve si la paleta tiene profundidad (valores) y un foco de atención.
 */
function ScenePreview({ colors }) {
    const [darkest, dark, mid, light, lightest] = byLightness(colors);
    const accent = mostSaturated(colors);

    return (
        <figure className="flex flex-col gap-2">
            <svg viewBox="0 0 800 400" className="w-full overflow-hidden rounded-3xl ring-1 ring-white/10" role="img" aria-label="Escena de ejemplo con la paleta">
                <rect width="800" height="400" fill={lightest.hex} />
                <circle cx="590" cy="130" r="58" fill={accent.hex} />
                <path d="M0 250 Q 140 170 300 230 T 620 200 T 800 230 V400 H0Z" fill={light.hex} />
                <path d="M0 300 Q 180 230 380 290 T 800 270 V400 H0Z" fill={mid.hex} />
                <path d="M0 340 Q 220 300 460 345 T 800 330 V400 H0Z" fill={dark.hex} />
                <path d="M120 400 V300 l26 -40 l26 40 V400Z M480 400 V310 l20 -34 l20 34 V400Z" fill={darkest.hex} />
                <g fill={darkest.hex}>
                    <circle cx="330" cy="272" r="12" />
                    <path d="M318 287 h24 l6 50 h-36z" />
                </g>
                <circle cx="336" cy="292" r="4" fill={accent.hex} />
            </svg>
            <figcaption className="text-[11px] text-zinc-500">
                Vista previa: cielo = más claro, colinas = intermedios, primer plano = más oscuro, sol y detalle = más saturado.
            </figcaption>
        </figure>
    );
}

/** Lo que investigamos sobre cómo se construyen paletas que funcionan. */
function Tips() {
    const tips = [
        ['El valor manda', 'Si la paleta no tiene claros, medios y oscuros, la imagen se ve plana aunque los tonos combinen. Por eso cada regla fija una escala de luminosidad.'],
        ['Pocos colores intensos', 'Uno o dos colores saturados y el resto apagados. Si todos gritan, ninguno destaca.'],
        ['Percepción uniforme', 'Calculamos en OKLCH: al girar el tono el brillo percibido no salta (en HSL un amarillo y un azul "iguales" se ven distintos).'],
        ['Proporción 60-30-10 / 70-20-10', 'Un color domina, otro acompaña y uno acentúa: así se reparten las superficies en un diseño equilibrado.'],
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tips.map(([title, text]) => (
                <div key={title} className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-panel/50 p-4">
                    <span className="text-[11px] font-semibold tracking-widest text-electric-soft uppercase">{title}</span>
                    <p className="text-xs leading-relaxed text-zinc-400">{text}</p>
                </div>
            ))}
        </div>
    );
}

function IconButton({ label, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/10 bg-black/30 text-zinc-300 transition hover:border-electric/50 hover:text-white hover:shadow-glow"
        >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                {children}
            </svg>
        </button>
    );
}

function SwatchButton({ label, onClick, active = false, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={`grid size-8 cursor-pointer place-items-center rounded-full backdrop-blur transition ${active ? 'bg-black/50' : 'bg-black/20 hover:bg-black/40'}`}
        >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {children}
            </svg>
        </button>
    );
}
