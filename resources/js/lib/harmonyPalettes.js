import chroma from 'chroma-js';
import { getContrastText, oklchToDisplayable } from './colorPalette.js';

/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  Paletas armónicas de 5 colores
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Lo que dice la teoría (y la práctica de ilustración y diseño):
 *
 *  1. El tono (hue) decide si los colores "combinan": se eligen con reglas
 *     geométricas del círculo cromático (análogos, complementarios…).
 *  2. Pero lo que hace que una paleta FUNCIONE es el VALOR: si todos los
 *     colores tienen la misma luminosidad, la imagen se ve plana y no se lee.
 *     Por eso cada plantilla fija una escala de luminosidad (oscuro → claro).
 *  3. La saturación no debe ser igual en todos: unos pocos colores intensos
 *     y el resto más apagados para que los intensos destaquen.
 *  4. Trabajamos en OKLCH (perceptual): girar el tono no cambia el brillo
 *     percibido, así las reglas geométricas se ven equilibradas de verdad.
 *
 *  Cada plantilla define 5 "huecos": giro de tono respecto al base,
 *  luminosidad objetivo y factor de croma. El hueco `base: true` es tu color.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const HARMONY_RULES = [
    {
        id: 'analogous',
        label: 'Análoga',
        description: 'Vecinos en el círculo (±40°). Tranquila y natural, como un atardecer o un bosque.',
        slots: [
            { hue: -40, lightness: 0.32, chroma: 0.9 },
            { hue: -20, lightness: 0.5, chroma: 1 },
            { hue: 0, base: true },
            { hue: 20, lightness: 0.74, chroma: 0.85 },
            { hue: 40, lightness: 0.9, chroma: 0.45 },
        ],
    },
    {
        id: 'monochromatic',
        label: 'Monocromática',
        description: 'Un solo matiz en varios valores. Elegante y fácil de controlar.',
        slots: [
            { hue: 0, lightness: 0.24, chroma: 0.75 },
            { hue: 0, lightness: 0.42, chroma: 1 },
            { hue: 0, base: true },
            { hue: 0, lightness: 0.78, chroma: 0.65 },
            { hue: 0, lightness: 0.94, chroma: 0.22 },
        ],
    },
    {
        id: 'complementary',
        label: 'Complementaria',
        description: 'Tu color y su opuesto (180°). Máximo contraste: úsalo con moderación.',
        slots: [
            { hue: 0, lightness: 0.3, chroma: 0.8 },
            { hue: 0, base: true },
            { hue: 0, lightness: 0.88, chroma: 0.3 },
            { hue: 180, lightness: 0.5, chroma: 1 },
            { hue: 180, lightness: 0.76, chroma: 0.6 },
        ],
    },
    {
        id: 'splitComplementary',
        label: 'Compl. dividida',
        description: 'En vez del opuesto exacto, sus dos vecinos (150° y 210°). Contraste con menos tensión.',
        slots: [
            { hue: 0, lightness: 0.3, chroma: 0.8 },
            { hue: 0, base: true },
            { hue: 150, lightness: 0.62, chroma: 0.9 },
            { hue: 210, lightness: 0.72, chroma: 0.85 },
            { hue: 0, lightness: 0.92, chroma: 0.28 },
        ],
    },
    {
        id: 'triadic',
        label: 'Triádica',
        description: 'Tres colores equidistantes (120°). Vibrante y equilibrada; deja uno como protagonista.',
        slots: [
            { hue: 0, lightness: 0.3, chroma: 0.8 },
            { hue: 0, base: true },
            { hue: 120, lightness: 0.66, chroma: 0.9 },
            { hue: 240, lightness: 0.52, chroma: 0.9 },
            { hue: 0, lightness: 0.92, chroma: 0.25 },
        ],
    },
    {
        id: 'tetradic',
        label: 'Tetrádica',
        description: 'Dos pares complementarios (90°). La más rica: elige un dominante claro.',
        slots: [
            { hue: 0, base: true },
            { hue: 90, lightness: 0.7, chroma: 0.75 },
            { hue: 180, lightness: 0.42, chroma: 0.9 },
            { hue: 270, lightness: 0.78, chroma: 0.7 },
            { hue: 0, lightness: 0.93, chroma: 0.22 },
        ],
    },
];

/** Variación aleatoria suave: ±hue, ±luminosidad, ×croma. */
const JITTER = { hue: 12, lightness: 0.06, chroma: [0.8, 1.15] };

const random = (min, max) => min + Math.random() * (max - min);

let nextId = 0;

function describe(color, slot) {
    const hex = color.hex().toUpperCase();
    const [l, c, h] = color.oklch();

    return {
        id: `swatch-${++nextId}`,
        hex,
        oklch: { l, c: c || 0, h: Number.isNaN(h) ? 0 : h },
        textColor: getContrastText(color),
        slot,
    };
}

/**
 * Genera los 5 colores de una regla. Los colores bloqueados (`locked`, por
 * índice) se conservan tal cual; el resto se recalcula con una variación
 * aleatoria si `jitter` es true (botón "Generar" / barra espaciadora).
 */
export function generateHarmonyPalette(baseHex, ruleId, { locked = [], jitter = false } = {}) {
    const rule = HARMONY_RULES.find((item) => item.id === ruleId) ?? HARMONY_RULES[0];
    const [baseL, baseC, rawHue] = chroma(baseHex).oklch();
    const baseHue = Number.isNaN(rawHue) ? 0 : rawHue;
    // Grises: les damos algo de croma para que la regla tenga sentido.
    const workingChroma = Math.max(baseC, 0.06);

    return rule.slots.map((slot, index) => {
        if (locked[index]) {
            return locked[index];
        }

        if (slot.base && !jitter) {
            return describe(chroma(baseHex), index);
        }

        const hue = baseHue + slot.hue + (jitter ? random(-JITTER.hue, JITTER.hue) : 0);
        const lightness = slot.base ? baseL : slot.lightness;
        const factor = slot.base ? 1 : slot.chroma;
        const finalLightness = Math.min(0.97, Math.max(0.12, lightness + (jitter ? random(-JITTER.lightness, JITTER.lightness) : 0)));
        const finalChroma = workingChroma * factor * (jitter ? random(...JITTER.chroma) : 1);

        return describe(oklchToDisplayable(finalLightness, finalChroma, ((hue % 360) + 360) % 360), index);
    });
}

/** Pares de la paleta legibles como texto/fondo (WCAG AA ≥ 4.5:1). */
export function readablePairs(colors) {
    const pairs = [];

    colors.forEach((background, i) => {
        colors.forEach((foreground, j) => {
            if (i < j) {
                const ratio = chroma.contrast(background.hex, foreground.hex);

                if (ratio >= 4.5) {
                    pairs.push({ background, foreground, ratio });
                }
            }
        });
    });

    return pairs.sort((a, b) => b.ratio - a.ratio);
}

/** Orden de oscuro a claro (para la escena de vista previa). */
export function byLightness(colors) {
    return [...colors].sort((a, b) => a.oklch.l - b.oklch.l);
}

/** El más saturado (el "acento" natural de la paleta). */
export function mostSaturated(colors) {
    return colors.reduce((best, color) => (color.oklch.c > best.oklch.c ? color : best), colors[0]);
}
