import chroma from 'chroma-js';

/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  Regla 70-20-10 para diseño de personajes
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  · DOMINANTE (70 %) — ropa base, armadura, cuerpo. Define la identidad y el
 *    tono emocional. Debe aguantar mucha superficie sin cansar: valor medio
 *    y saturación moderada.
 *  · SECUNDARIO (20 %) — pantalones, mangas, cabello, accesorios grandes.
 *    Separa las formas del dominante: necesita CONTRASTE DE VALOR con él y
 *    ser más tranquilo para no competir.
 *  · ACENTO (10 %) — ojos, gemas, líneas de luz. Dirige la mirada: es el
 *    más saturado y el que más se diferencia del dominante.
 *
 *  "Sugerir por Armonía" prueba TODAS las combinaciones posibles de la
 *  paleta (dominante × secundario × acento) y puntúa cada una con estas
 *  reglas, ajustadas al modo de armonía y a la temperatura elegidos.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const ROLES = [
    { id: 'dominant', label: 'Dominante', percent: 70, defaultPart: 'Abrigo y torso' },
    { id: 'secondary', label: 'Secundario', percent: 20, defaultPart: 'Pantalones, mangas y cabello' },
    { id: 'accent', label: 'Acento', percent: 10, defaultPart: 'Ojos, gema y cinturón' },
];

const WARM_HUE = 60; // naranja-amarillo en OKLCH

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/** Distancia angular entre dos tonos (0..180). */
const hueDistance = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

function analyze(color) {
    const [l, c, h] = chroma(color.hex).oklch();
    const hue = Number.isNaN(h) ? 0 : h;
    const chromaValue = c || 0;

    return {
        ...color,
        l,
        c: chromaValue,
        h: hue,
        // +1 = muy cálido (naranja), −1 = muy frío (azul), 0 = neutro/gris.
        warmth: chromaValue < 0.02 ? 0 : Math.cos(((hue - WARM_HUE) * Math.PI) / 180) * clamp01(chromaValue / 0.12),
    };
}

/** Cuánto se ajusta la temperatura del color a la temperatura pedida (0..1). */
function temperatureFit(warmth, temperature, invert = false) {
    const sign = invert ? -1 : 1;

    if (temperature === 'warm') {
        return 0.5 + 0.5 * warmth * sign;
    }

    if (temperature === 'cool') {
        return 0.5 - 0.5 * warmth * sign;
    }

    return 1 - Math.abs(warmth) * 0.4;
}

function dominantScore(d, { maxChroma, temperature }) {
    // Los casi blancos/negros no sirven para cubrir el 70 % de un personaje.
    if (d.l < 0.18 || d.l > 0.93) {
        return -1;
    }

    const value = 1 - clamp01(Math.abs(d.l - 0.5) / 0.28);
    const chromaFit = 1 - clamp01(Math.abs(d.c / maxChroma - 0.55) / 0.55);

    // El color base del generador es la identidad elegida por el usuario.
    const identity = d.key === 'base' ? 0.25 : 0;

    return 0.45 * value + 0.3 * chromaFit + 0.25 * temperatureFit(d.warmth, temperature) + identity;
}

function secondaryScore(d, s, { harmony, temperature, maxChroma }) {
    const valueGap = Math.abs(d.l - s.l);
    const valueContrast = 1 - clamp01(Math.abs(valueGap - 0.22) / 0.22);
    const calm = s.c <= d.c * 1.15 ? 1 : clamp01(1 - (s.c / Math.max(d.c, 0.01) - 1.15));
    const distance = hueDistance(d.h, s.h);

    const hueFit = {
        monochromatic: 1,
        analogous: 1 - clamp01(Math.abs(distance - 30) / 45),
        // Soporte de la misma familia o un neutro; el opuesto se reserva al acento.
        complementary: distance < 45 ? 1 : s.c < maxChroma * 0.35 ? 0.8 : 0.3,
        triadic: 1 - clamp01(Math.abs(distance - 120) / 90),
    }[harmony] ?? 0.5;

    // Contraste de temperatura: con luz cálida, el secundario un poco más
    // frío que el dominante da profundidad (y al revés con luz fría).
    const warmthGap = (d.warmth - s.warmth) / 2;
    const temperatureContrast = temperature === 'neutral' ? 0.5 : temperatureFit(warmthGap, temperature);
    const extremePenalty = s.l < 0.1 || s.l > 0.97 ? 0.4 : 1;

    return (0.4 * valueContrast + 0.2 * calm + 0.25 * hueFit + 0.15 * temperatureContrast) * extremePenalty;
}

function accentScore(d, s, a, { harmony, temperature, maxChroma }) {
    const saturation = a.c / maxChroma;
    const pop = clamp01(chroma.deltaE(d.hex, a.hex) / 45);
    const distinct = clamp01(chroma.deltaE(s.hex, a.hex) / 30);
    const distance = hueDistance(d.h, a.h);

    const hueFit = {
        // Sin otro tono disponible, el acento destaca por valor.
        monochromatic: clamp01(Math.abs(d.l - a.l) / 0.3),
        analogous: 1 - clamp01(Math.abs(distance - 60) / 60),
        complementary: distance / 180,
        triadic: (1 - clamp01(Math.abs(distance - 120) / 90)) * (hueDistance(s.h, a.h) > 60 ? 1 : 0.6),
    }[harmony] ?? 0.5;

    // Luz cálida → acentos cálidos (fuego, oro); luz fría → acentos fríos (magia, neón).
    const temperatureMatch = temperatureFit(a.warmth, temperature);
    const readable = a.l >= 0.45 && a.l <= 0.92 ? 1 : 0.55;

    return (0.35 * saturation + 0.2 * pop + 0.15 * distinct + 0.2 * hueFit + 0.1 * temperatureMatch) * readable;
}

/**
 * Devuelve las mejores asignaciones (de mejor a peor) para la paleta.
 *
 * @param {{hex: string, name?: string}[]} colors
 * @param {{ harmony?: string, temperature?: string }} context
 */
export function suggestRoles(colors, { harmony = 'monochromatic', temperature = 'neutral' } = {}, limit = 6) {
    const unique = [...new Map(colors.map((color) => [color.hex, color])).values()].map(analyze);

    if (unique.length < 3) {
        return [];
    }

    const context = { harmony, temperature, maxChroma: Math.max(...unique.map((color) => color.c), 0.01) };
    const candidates = [];

    for (const d of unique) {
        const dScore = dominantScore(d, context);

        if (dScore < 0) {
            continue;
        }

        for (const s of unique) {
            if (s === d) {
                continue;
            }

            const sScore = secondaryScore(d, s, context);

            for (const a of unique) {
                if (a === d || a === s) {
                    continue;
                }

                const aScore = accentScore(d, s, a, context);
                candidates.push({ score: dScore + 0.9 * sScore + 1.1 * aScore, d, s, a });
            }
        }
    }

    candidates.sort((x, y) => y.score - x.score);

    // Variedad: no repetir el mismo par dominante + acento entre sugerencias.
    const seen = new Set();
    const picked = [];

    for (const candidate of candidates) {
        const signature = `${candidate.d.hex}|${candidate.a.hex}`;

        if (!seen.has(signature)) {
            seen.add(signature);
            picked.push(candidate);
        }

        if (picked.length === limit) {
            break;
        }
    }

    return picked.map(({ d, s, a }) => ({
        dominant: d.hex,
        secondary: s.hex,
        accent: a.hex,
        reasons: explain(d, s, a, context),
    }));
}

const maxChromaOf = (...colors) => Math.max(...colors.map((color) => color.c), 0.01);

function explain(d, s, a, { harmony }) {
    const percent = (value) => `${Math.round(value * 100)}%`;
    const accentHue = Math.round(hueDistance(d.h, a.h));

    const accentWhy = {
        monochromatic: `destaca por valor (${percent(Math.abs(d.l - a.l))} de diferencia de luminosidad) dentro del mismo matiz`,
        complementary: `está a ${accentHue}° del dominante: el lado complementario de tu paleta`,
        analogous: `está a ${accentHue}° del dominante: el vecino más lejano de la armonía análoga`,
        triadic: `está a ${accentHue}° del dominante, en otro vértice del triángulo`,
    }[harmony];

    return {
        dominant: `${d.key === 'base' ? 'Tu color base, la identidad del personaje. ' : ''}${
            d.l < 0.35 ? 'Valor oscuro' : d.l > 0.68 ? 'Valor claro' : 'Valor medio'
        } (L ${percent(d.l)})${
            d.c / maxChromaOf(d, s, a) > 0.85
                ? ' y saturación alta: un personaje con mucha energía; el acento tendrá que ganarse la atención por valor.'
                : d.l > 0.68
                  ? ' y saturación moderada: un personaje luminoso y suave.'
                  : d.l < 0.35
                    ? ' y saturación moderada: un personaje sobrio y con peso.'
                    : ' y saturación moderada: aguanta grandes superficies sin cansar la vista.'
        }`,
        secondary: `${percent(Math.abs(d.l - s.l))} de contraste de valor con el dominante para separar las formas, y ${
            s.c <= d.c ? 'más apagado' : 'similar en saturación'
        } para no competir.`,
        accent: `Uno de los tonos más intensos de la paleta y ${accentWhy}: atrae la mirada a los detalles clave.`,
    };
}

/** Avisos de diseño sobre la asignación actual (cualquiera, manual o sugerida). */
export function roleWarnings({ dominant, secondary, accent }) {
    const [d, s, a] = [dominant, secondary, accent].map((hex) => analyze({ hex }));
    const warnings = [];

    if (Math.abs(d.l - s.l) < 0.08) {
        warnings.push('Dominante y secundario tienen casi el mismo valor: las formas se fundirán en escala de grises.');
    }

    if (chroma.deltaE(d.hex, a.hex) < 15) {
        warnings.push('El acento se parece demasiado al dominante: no va a destacar.');
    }

    // Un acento puede destacar por saturación o por valor; si no hace ninguna, se pierde.
    if (a.c < d.c * 0.8 && Math.abs(a.l - d.l) < 0.2) {
        warnings.push('El acento es menos saturado que el dominante y tiene un valor parecido: no va a destacar.');
    }

    if (d.hex === s.hex || d.hex === a.hex || s.hex === a.hex) {
        warnings.push('Hay un color repetido en dos roles.');
    }

    return warnings;
}

/** Parsea una paleta pegada por el usuario: HEX separados por comas, espacios o líneas. */
export function parseHexList(text) {
    const matches = text.match(/#?\b[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) ?? [];

    return [...new Set(matches.map((value) => chroma(value.startsWith('#') ? value : `#${value}`).hex().toUpperCase()))].map(
        (hex, index) => ({ key: `custom-${index}`, name: `Color ${index + 1}`, hex }),
    );
}
