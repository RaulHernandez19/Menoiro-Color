import { useEffect, useMemo, useRef, useState } from 'react';
import { buildScheme, exportJson, exportPng, importJson } from '../../lib/characterExport';
import { ROLES, parseHexList, roleWarnings, suggestRoles } from '../../lib/characterRoles';
import { HARMONY_MODES, TEMPERATURES, generatePalette } from '../../lib/colorPalette';
import { HARMONY_PALETTE, LIGHTING_PALETTE, useSharedPalette } from '../../lib/paletteBus';
import AppShell from '../layout/AppShell';
import SegmentedControl from '../lumina/SegmentedControl';
import CharacterPreview3D from './CharacterPreview3D';
import RoleCard from './RoleCard';

const STORAGE_KEY = 'menoiro:character-designer';

const SOURCES = [
    { id: 'lighting', label: 'Iluminación', description: 'Los 12 tonos del generador principal, actualizados en vivo.' },
    { id: 'harmony', label: 'Armónica', description: 'La última paleta enviada desde "Paletas armónicas".' },
    { id: 'custom', label: 'Pegar HEX', description: 'Cualquier paleta: pega códigos HEX separados por comas o espacios.' },
];

const SKINS = [
    { label: 'Clara', hex: '#F2CBAA' },
    { label: 'Media', hex: '#D8A27C' },
    { label: 'Morena', hex: '#A86E4C' },
    { label: 'Oscura', hex: '#6A4331' },
    { label: 'Fantasía', hex: '#9FB7E8' },
];

/** Las reglas de "Paletas armónicas" se traducen a los 4 modos del sugeridor. */
const RULE_TO_HARMONY = {
    analogous: 'analogous',
    monochromatic: 'monochromatic',
    complementary: 'complementary',
    splitComplementary: 'complementary',
    triadic: 'triadic',
    tetradic: 'triadic',
};

const DEFAULT_PARTS = Object.fromEntries(ROLES.map((role) => [role.id, role.defaultPart]));

/** Si la ventana de Iluminación aún no ha publicado nada, usamos su paleta por defecto. */
const FALLBACK_LIGHTING = (() => {
    const palette = generatePalette('#7B5CFF', { harmony: 'monochromatic', temperature: 'warm' });

    return {
        harmony: 'monochromatic',
        temperature: 'warm',
        baseHex: palette.base.hex,
        colors: [palette.base, ...Object.values(palette.variations)].map(({ key, name, hex }) => ({ key, name, hex })),
        isFallback: true,
    };
})();

const labelOf = (options, id) => options.find((option) => option.id === id)?.label ?? id;

function loadSaved() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
    } catch {
        return {};
    }
}

export default function CharacterDesigner() {
    const [saved] = useState(loadSaved);
    const [source, setSource] = useState(saved.source ?? 'lighting');
    const [customText, setCustomText] = useState(saved.customText ?? '#2B2D42, #8D99AE, #EDF2F4, #EF233C, #D90429');
    const [manualContext, setManualContext] = useState(saved.manualContext ?? { harmony: 'complementary', temperature: 'warm' });
    // Cada rol guarda la CLAVE del tono (p. ej. "shadow") además del HEX:
    // si cambias el color base en Iluminación, el rol sigue al mismo tono.
    const [assignment, setAssignment] = useState(saved.assignment ?? null);
    const [parts, setParts] = useState(saved.parts ?? DEFAULT_PARTS);
    const [skin, setSkin] = useState(saved.skin ?? SKINS[0].hex);
    const [activeRole, setActiveRole] = useState('dominant');
    const [hoveredRole, setHoveredRole] = useState(null);
    const [autoRotate, setAutoRotate] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const [suggestion, setSuggestion] = useState(null);
    const [proportions, setProportions] = useState(null);
    const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
    const [notice, setNotice] = useState(null);
    const previewRef = useRef(null);
    const importRef = useRef(null);

    const lighting = useSharedPalette(LIGHTING_PALETTE) ?? FALLBACK_LIGHTING;
    const harmonyShared = useSharedPalette(HARMONY_PALETTE);

    const palette = useMemo(() => {
        if (source === 'lighting') {
            return lighting.colors;
        }

        if (source === 'harmony') {
            return harmonyShared?.colors ?? [];
        }

        return parseHexList(customText);
    }, [source, lighting, harmonyShared, customText]);

    // Contexto de armonía/temperatura para el sugeridor.
    const context = useMemo(() => {
        if (source === 'lighting') {
            return { harmony: lighting.harmony, temperature: lighting.temperature };
        }

        if (source === 'harmony' && harmonyShared) {
            return { harmony: RULE_TO_HARMONY[harmonyShared.rule] ?? 'monochromatic', temperature: manualContext.temperature };
        }

        return manualContext;
    }, [source, lighting, harmonyShared, manualContext]);

    const suggestions = useMemo(() => suggestRoles(palette, context), [palette, context]);

    const applySuggestion = (index) => {
        const next = suggestions[index % suggestions.length];

        if (!next) {
            return;
        }

        setAssignment(
            Object.fromEntries(
                ROLES.map((role) => {
                    const color = palette.find((item) => item.hex === next[role.id]);

                    return [role.id, { key: color.key, hex: color.hex, name: color.name }];
                }),
            ),
        );
        setSuggestion({ index: index % suggestions.length, ...next });
    };

    // Primera vez (o tras cambiar de paleta): arrancamos con la mejor sugerencia.
    useEffect(() => {
        if (!assignment && suggestions.length) {
            applySuggestion(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assignment, suggestions]);

    // Recordar el trabajo entre visitas (solo en este navegador).
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ source, customText, manualContext, assignment, parts, skin }));
        } catch {
            // Sin almacenamiento disponible: no pasa nada.
        }
    }, [source, customText, manualContext, assignment, parts, skin]);

    // Resuelve cada rol contra la paleta actual (sigue al tono por su clave).
    const resolved = useMemo(() => {
        if (!assignment) {
            return null;
        }

        return Object.fromEntries(
            ROLES.map((role) => {
                const entry = assignment[role.id];
                const live = palette.find((color) => color.key === entry.key);

                return [role.id, live ?? entry];
            }),
        );
    }, [assignment, palette]);

    const previewColors = useMemo(
        () =>
            resolved
                ? { dominant: resolved.dominant.hex, secondary: resolved.secondary.hex, accent: resolved.accent.hex, skin }
                : { dominant: '#3A3B45', secondary: '#2A2B33', accent: '#7B5CFF', skin },
        [resolved, skin],
    );

    const warnings = resolved ? roleWarnings(previewColors) : [];
    const isSuggestionApplied =
        suggestion && resolved && ROLES.every((role) => suggestion[role.id] === resolved[role.id].hex);

    const changeSource = (next) => {
        setSource(next);
        setAssignment(null);
        setSuggestion(null);
    };

    const assignColor = (roleId, color) => {
        setAssignment((current) => ({ ...current, [roleId]: { key: color.key, hex: color.hex, name: color.name } }));
    };

    const flash = (message) => {
        setNotice(message);
        setTimeout(() => setNotice(null), 2500);
    };

    const scheme = () =>
        buildScheme({
            roles: ROLES,
            assignment: previewColors,
            parts,
            palette,
            skin,
            source: {
                type: source,
                label:
                    source === 'lighting'
                        ? `Iluminación ${lighting.baseHex} · ${labelOf(HARMONY_MODES, context.harmony)} · ${labelOf(TEMPERATURES, context.temperature)}`
                        : source === 'harmony'
                          ? `Armónica · ${harmonyShared?.ruleLabel ?? ''}`
                          : 'Personalizada',
                harmony: context.harmony,
                temperature: context.temperature,
            },
        });

    const save = async (format) => {
        setIsSaveMenuOpen(false);

        if (format === 'json') {
            exportJson(scheme());
        } else {
            await exportPng(scheme(), previewRef.current.capture());
        }

        flash(format === 'json' ? 'Esquema guardado como JSON.' : 'Lámina guardada como PNG.');
    };

    const handleImport = async (event) => {
        const file = event.target.files[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        try {
            const imported = await importJson(file);
            const text = imported.palette.map((color) => color.hex).join(', ');
            const importedPalette = parseHexList(text);
            const entry = (hex) => {
                const color = importedPalette.find((item) => item.hex === hex) ?? { key: hex, hex, name: null };

                return { key: color.key, hex: color.hex, name: color.name };
            };

            setSource('custom');
            setCustomText(text);
            setAssignment({ dominant: entry(imported.assignment.dominant), secondary: entry(imported.assignment.secondary), accent: entry(imported.assignment.accent) });
            setParts(imported.parts);
            setSkin(imported.skin ?? skin);
            setSuggestion(null);
            flash('Esquema importado.');
        } catch (exception) {
            flash(exception.message || 'No se pudo leer el archivo.');
        }
    };

    const roleOf = (hex) => ROLES.filter((role) => resolved?.[role.id].hex === hex);

    return (
        <AppShell page="character" glowColor={previewColors.dominant}>
            <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-10">
                {/* ───────────── Vista previa 3D ───────────── */}
                <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
                    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-panel/50 backdrop-blur-xl">
                        <CharacterPreview3D
                            ref={previewRef}
                            colors={previewColors}
                            highlight={hoveredRole}
                            autoRotate={autoRotate}
                            onProportions={setProportions}
                            className="h-[min(68vh,640px)] min-h-96 w-full"
                        />

                        <div className="pointer-events-none absolute inset-x-5 top-5 flex items-start justify-between gap-3">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-semibold tracking-widest text-electric-soft uppercase">Regla 70 · 20 · 10</span>
                                <h1 className="text-xl font-semibold tracking-tight text-white">Diseño de personaje</h1>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAutoRotate((value) => !value)}
                                aria-pressed={autoRotate}
                                className="pointer-events-auto cursor-pointer rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[10px] font-semibold tracking-widest text-zinc-300 uppercase backdrop-blur transition hover:text-white"
                            >
                                {autoRotate ? 'Detener giro' : 'Girar'}
                            </button>
                        </div>

                        <p className="pointer-events-none absolute inset-x-5 bottom-4 text-center text-[10px] tracking-widest text-zinc-500 uppercase">
                            Arrastra para girar · pasa el ratón por un rol para ver su zona
                        </p>
                    </div>

                    <ProportionBar colors={previewColors} proportions={proportions} />

                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">Piel</span>
                        {SKINS.map((option) => (
                            <button
                                key={option.hex}
                                type="button"
                                onClick={() => setSkin(option.hex)}
                                title={option.label}
                                aria-label={`Piel ${option.label}`}
                                aria-pressed={skin === option.hex}
                                className={`size-7 cursor-pointer rounded-full ring-2 transition ${
                                    skin === option.hex ? 'ring-white' : 'ring-white/10 hover:ring-white/40'
                                }`}
                                style={{ backgroundColor: option.hex }}
                            />
                        ))}
                        <span className="text-[11px] text-zinc-500">La piel no cuenta en la regla.</span>
                    </div>
                </div>

                {/* ───────────── Controles ───────────── */}
                <div className="flex min-w-0 flex-col gap-6">
                    <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-panel/70 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-semibold tracking-widest text-electric-soft uppercase">01 · Paleta</span>
                            <h2 className="text-xl font-semibold tracking-tight text-white">De dónde salen los colores</h2>
                        </div>

                        <SegmentedControl label="Origen" options={SOURCES} value={source} onChange={changeSource} columns="grid-cols-3" />

                        <SourceStatus source={source} lighting={lighting} harmonyShared={harmonyShared} />

                        {source === 'custom' && (
                            <textarea
                                value={customText}
                                onChange={(event) => {
                                    setCustomText(event.target.value);
                                    setAssignment(null);
                                }}
                                rows={2}
                                aria-label="Códigos HEX de tu paleta"
                                className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-electric/60 focus:ring-2 focus:ring-electric/30"
                            />
                        )}

                        {palette.length >= 3 ? (
                            <div className="flex flex-col gap-2">
                                <div className="grid grid-cols-6 gap-2">
                                    {palette.map((color) => (
                                        <button
                                            key={`${color.key}-${color.hex}`}
                                            type="button"
                                            draggable
                                            onDragStart={(event) => event.dataTransfer.setData('text/plain', color.key)}
                                            onClick={() => assignColor(activeRole, color)}
                                            title={`${color.name ?? ''} ${color.hex}`.trim()}
                                            aria-label={`Asignar ${color.name ?? color.hex} a ${labelOf(ROLES.map((role) => ({ id: role.id, label: role.label })), activeRole)}`}
                                            className="relative aspect-square cursor-pointer rounded-lg ring-1 ring-white/15 transition hover:scale-110 hover:ring-white/60"
                                            style={{ backgroundColor: color.hex }}
                                        >
                                            {roleOf(color.hex).length > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 flex gap-0.5">
                                                    {roleOf(color.hex).map((role) => (
                                                        <span
                                                            key={role.id}
                                                            className="rounded-full bg-white px-1 font-mono text-[9px] leading-4 font-bold text-black shadow"
                                                        >
                                                            {role.percent}
                                                        </span>
                                                    ))}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[11px] text-zinc-500">
                                    Clic en un color para asignarlo a{' '}
                                    <span className="font-semibold text-zinc-200">{ROLES.find((role) => role.id === activeRole).label}</span>, o
                                    arrástralo a cualquier rol.
                                </p>
                            </div>
                        ) : (
                            <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-zinc-500">
                                Se necesitan al menos 3 colores.
                            </p>
                        )}

                        {source !== 'lighting' && (
                            <div className="grid grid-cols-2 gap-3">
                                <ContextSelect
                                    label="Armonía"
                                    options={HARMONY_MODES}
                                    value={context.harmony}
                                    disabled={source === 'harmony'}
                                    onChange={(harmony) => setManualContext((current) => ({ ...current, harmony }))}
                                />
                                <ContextSelect
                                    label="Temperatura"
                                    options={TEMPERATURES}
                                    value={context.temperature}
                                    onChange={(temperature) => setManualContext((current) => ({ ...current, temperature }))}
                                />
                            </div>
                        )}
                    </div>

                    {resolved && (
                        <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-panel/70 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6">
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-semibold tracking-widest text-electric-soft uppercase">02 · Roles</span>
                                    <h2 className="text-xl font-semibold tracking-tight text-white">Asigna cada color</h2>
                                </div>
                                {isSuggestionApplied && (
                                    <span className="rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-[10px] font-semibold tracking-widest text-electric-soft uppercase">
                                        Sugerencia {suggestion.index + 1} de {suggestions.length}
                                    </span>
                                )}
                            </div>

                            <RoleCard
                                role={ROLES[0]}
                                color={resolved.dominant}
                                part={parts.dominant}
                                reason={isSuggestionApplied ? suggestion.reasons.dominant : null}
                                isActive={activeRole === 'dominant'}
                                onSelect={setActiveRole}
                                onHover={setHoveredRole}
                                onPartChange={(id, value) => setParts((current) => ({ ...current, [id]: value }))}
                                onDropColor={(key) => {
                                    const color = palette.find((item) => item.key === key);
                                    color && assignColor('dominant', color);
                                }}
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                                {ROLES.slice(1).map((role) => (
                                    <div key={role.id} className={role.id === 'secondary' ? 'sm:col-span-3' : 'sm:col-span-2'}>
                                        <RoleCard
                                            role={role}
                                            color={resolved[role.id]}
                                            part={parts[role.id]}
                                            reason={isSuggestionApplied ? suggestion.reasons[role.id] : null}
                                            isActive={activeRole === role.id}
                                            onSelect={setActiveRole}
                                            onHover={setHoveredRole}
                                            onPartChange={(id, value) => setParts((current) => ({ ...current, [id]: value }))}
                                            onDropColor={(key) => {
                                                const color = palette.find((item) => item.key === key);
                                                color && assignColor(role.id, color);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {warnings.length > 0 && (
                                <ul className="flex flex-col gap-1.5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-[11px] text-amber-200/85">
                                    {warnings.map((warning) => (
                                        <li key={warning}>⚠ {warning}</li>
                                    ))}
                                </ul>
                            )}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => applySuggestion(isSuggestionApplied ? suggestion.index + 1 : 0)}
                                    disabled={!suggestions.length}
                                    className="group relative flex flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-electric px-4 py-3.5 text-xs font-semibold tracking-widest whitespace-nowrap text-white uppercase shadow-glow transition duration-300 hover:-translate-y-0.5 hover:bg-[#8a6eff] hover:shadow-glow-lg disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                                    <WandIcon />
                                    {isSuggestionApplied ? 'Otra sugerencia' : 'Sugerir por Armonía'}
                                </button>

                                <div className="relative flex-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsSaveMenuOpen((open) => !open)}
                                        aria-expanded={isSaveMenuOpen}
                                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/30 px-4 py-3.5 text-xs font-semibold tracking-widest whitespace-nowrap text-white uppercase transition hover:border-electric/60 hover:shadow-glow"
                                    >
                                        <SaveIcon />
                                        Guardar esquema
                                    </button>

                                    {isSaveMenuOpen && (
                                        <div className="absolute right-0 bottom-full z-20 mb-2 flex w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-panel shadow-2xl">
                                            <MenuItem onClick={() => save('png')} title="Lámina PNG" hint="Figura + roles + paleta, lista para compartir" />
                                            <MenuItem onClick={() => save('json')} title="Archivo JSON" hint="HEX, roles y partes; se puede volver a importar" />
                                            <MenuItem
                                                onClick={() => {
                                                    setIsSaveMenuOpen(false);
                                                    importRef.current.click();
                                                }}
                                                title="Importar JSON…"
                                                hint="Abrir un esquema guardado antes"
                                            />
                                        </div>
                                    )}
                                    <input ref={importRef} type="file" accept="application/json,.json" onChange={handleImport} className="sr-only" tabIndex={-1} />
                                </div>
                            </div>

                            <p role="status" className="h-4 text-center text-[11px] text-emerald-300">
                                {notice}
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </AppShell>
    );
}

function SourceStatus({ source, lighting, harmonyShared }) {
    if (source === 'lighting') {
        return lighting.isFallback ? (
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-200/85">
                Paleta de ejemplo. Abre{' '}
                <a href="/" target="_blank" rel="noopener" className="font-semibold underline underline-offset-2">
                    Iluminación
                </a>{' '}
                y pulsa "Generar Paleta": los 12 tonos llegarán aquí en vivo.
            </p>
        ) : (
            <p className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/60" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                En vivo desde Iluminación · <span className="font-mono text-zinc-200">{lighting.baseHex}</span> ·{' '}
                {labelOf(HARMONY_MODES, lighting.harmony)} · Luz {labelOf(TEMPERATURES, lighting.temperature).toLowerCase()}
            </p>
        );
    }

    if (source === 'harmony') {
        return harmonyShared ? (
            <p className="text-[11px] text-zinc-400">
                Paleta {harmonyShared.ruleLabel?.toLowerCase()} de <span className="font-mono text-zinc-200">{harmonyShared.baseHex}</span>.
            </p>
        ) : (
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-200/85">
                Aún no has enviado ninguna paleta. Ve a{' '}
                <a href="/paletas" target="_blank" rel="noopener" className="font-semibold underline underline-offset-2">
                    Paletas armónicas
                </a>{' '}
                y pulsa "Usar en Personaje".
            </p>
        );
    }

    return null;
}

function ContextSelect({ label, options, value, onChange, disabled = false }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">{label}</span>
            <select
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="cursor-pointer rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white outline-none focus:border-electric/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {options.map((option) => (
                    <option key={option.id} value={option.id} className="bg-panel">
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

/** Barra de proporción: objetivo 70/20/10 y el área real medida en la figura. */
function ProportionBar({ colors, proportions }) {
    return (
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-panel/60 p-4 backdrop-blur">
            <div className="flex h-4 overflow-hidden rounded-full ring-1 ring-white/10">
                {ROLES.map((role) => (
                    <span
                        key={role.id}
                        className="transition-colors duration-300"
                        style={{ width: `${role.percent}%`, backgroundColor: colors[role.id] }}
                    />
                ))}
            </div>
            <div className="flex justify-between gap-2 text-[10px] tracking-widest text-zinc-500 uppercase">
                {ROLES.map((role) => (
                    <span key={role.id}>
                        {role.label} {role.percent}%
                    </span>
                ))}
            </div>
            {proportions && (
                <p className="text-[11px] text-zinc-500">
                    Superficie real en la figura:{' '}
                    <span className="font-mono text-zinc-300">
                        {proportions.dominant.toFixed(0)} / {proportions.secondary.toFixed(0)} / {proportions.accent.toFixed(0)}
                    </span>
                </p>
            )}
        </div>
    );
}

function MenuItem({ onClick, title, hint }) {
    return (
        <button type="button" onClick={onClick} className="flex cursor-pointer flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-white/5">
            <span className="text-sm font-semibold text-white">{title}</span>
            <span className="text-[11px] text-zinc-500">{hint}</span>
        </button>
    );
}

function WandIcon() {
    return (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m4 20 11-11M14 4v2M18 6l-1.5 1.5M20 10h-2M17 3l.6 1.4L19 5l-1.4.6L17 7l-.6-1.4L15 5l1.4-.6L17 3Z" />
        </svg>
    );
}

function SaveIcon() {
    return (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
        </svg>
    );
}
