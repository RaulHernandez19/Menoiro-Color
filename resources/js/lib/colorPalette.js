import chroma from 'chroma-js';

/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  LUMINA COLOR · Motor de paletas de iluminación en OKLCH
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  ¿Por qué OKLCH y no HSL?
 *  HSL no es perceptualmente uniforme: un amarillo y un azul con la misma "L"
 *  en HSL se ven con brillos totalmente distintos. OKLCH separa el color en:
 *
 *    L → Luminosidad percibida   (0 = negro, 1 = blanco)
 *    C → Croma / saturación      (0 = gris, ~0.37 = máximo en sRGB)
 *    H → Tono / hue en grados    (≈ 30 rojo, ≈ 100 amarillo, ≈ 265 azul)
 *
 *  Al mover L en OKLCH el color se aclara u oscurece sin "ensuciarse" ni
 *  cambiar de tono, que es justo lo que necesitamos para simular luz.
 *
 *  Modelo de iluminación (lo que hacen los pintores y los artistas 3D):
 *    · Luces  → la fuente de luz (sol, bombilla) es cálida: subimos L,
 *               bajamos C (la luz intensa "lava" el pigmento) y desplazamos
 *               el tono hacia el AMARILLO.
 *    · Sombras → reciben la luz fría del cielo (luz ambiental): bajamos L,
 *               subimos ligeramente C (el pigmento se ve más denso) y
 *               desplazamos el tono hacia el AZUL.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Tonos destino en OKLCH (grados). */
const WARM_HUE = 95; // amarillo cálido de la luz directa
const COOL_HUE = 265; // azul del cielo / luz ambiental

/**
 * Excepción clásica de pintura: el arco corto amarillo → azul atraviesa el
 * VERDE, y una sombra amarilla verdosa se ve "enferma". Para tonos en este
 * rango, las sombras se enfrían rotando hacia ámbar/siena en su lugar.
 */
const GREENISH_SHADOW_RANGE = [55, 125];
const AMBER_HUE = 40;

/** Por debajo de este croma consideramos el color acromático (gris). */
const ACHROMATIC_CHROMA = 0.012;

/**
 * Definición declarativa de cada variación.
 *
 *  lightness → función (L base) ⇒ L nueva. Usamos interpolación hacia el
 *              blanco/negro en lugar de sumar constantes: así la paleta
 *              conserva el orden aunque la base sea muy clara u oscura.
 *  chroma    → multiplicador sobre el croma base.
 *  hueShift  → { toward: tono destino, amount: 0..1 fracción del arco }.
 *  minChroma → croma mínimo para que grises reciban un tinte sutil.
 */
const VARIATIONS = [
    {
        key: 'maxBrightness',
        name: 'Brillo Máximo',
        nameEn: 'Max Brightness',
        role: 'Especular · punto de máxima reflexión',
        lightness: (l) => lerp(l, 0.985, 0.88),
        chroma: 0.28,
        hueShift: { toward: WARM_HUE, amount: 0.35 },
        minChroma: 0.006,
    },
    {
        key: 'highLight',
        name: 'Luz Alta',
        nameEn: 'High Light',
        role: 'Zona que mira directo a la fuente',
        lightness: (l) => lerp(l, 1, 0.62),
        chroma: 0.6,
        hueShift: { toward: WARM_HUE, amount: 0.24 },
        minChroma: 0.008,
    },
    {
        key: 'mediumLight',
        name: 'Luz Media',
        nameEn: 'Medium Light',
        role: 'Transición iluminada',
        lightness: (l) => lerp(l, 1, 0.4),
        chroma: 0.85,
        hueShift: { toward: WARM_HUE, amount: 0.15 },
    },
    {
        key: 'baseLight',
        name: 'Luz Base',
        nameEn: 'Base Light',
        role: 'Color local bajo luz directa',
        lightness: (l) => lerp(l, 1, 0.18),
        chroma: 1.02,
        hueShift: { toward: WARM_HUE, amount: 0.07 },
    },
    {
        key: 'tintedWhite',
        name: 'Blanco Tintado',
        nameEn: 'Tinted White',
        role: 'Fondo / superficie neutra con alma',
        // L absoluta: siempre casi blanco, con apenas un susurro de tono.
        lightness: () => 0.975,
        chroma: 0.12,
        maxChroma: 0.022,
        hueShift: { toward: WARM_HUE, amount: 0.05 },
    },
    {
        key: 'softShadow',
        name: 'Sombra Suave',
        nameEn: 'Soft Shadow',
        role: 'Terminador · inicio de la sombra',
        lightness: (l) => lerp(l, 0, 0.16),
        chroma: 1.08,
        hueShift: { toward: COOL_HUE, amount: 0.1 },
        minChroma: 0.01,
    },
    {
        key: 'shadow',
        name: 'Sombra',
        nameEn: 'Shadow',
        role: 'Sombra propia del objeto',
        lightness: (l) => lerp(l, 0, 0.32),
        chroma: 1.14,
        hueShift: { toward: COOL_HUE, amount: 0.2 },
        minChroma: 0.016,
    },
    {
        key: 'deepShadow',
        name: 'Sombra Profunda',
        nameEn: 'Deep Shadow',
        role: 'Oclusión ambiental',
        lightness: (l) => lerp(l, 0, 0.5),
        chroma: 1.1,
        hueShift: { toward: COOL_HUE, amount: 0.3 },
        minChroma: 0.02,
    },
    {
        key: 'shadowCore',
        name: 'Núcleo de Sombra',
        nameEn: 'Shadow Core',
        role: 'Punto más oscuro del volumen',
        lightness: (l) => lerp(l, 0, 0.68),
        chroma: 0.9,
        hueShift: { toward: COOL_HUE, amount: 0.4 },
        minChroma: 0.02,
    },
    {
        key: 'illuminate',
        name: 'Iluminación',
        nameEn: 'Illuminate',
        role: 'Luz emisiva / rebote saturado',
        // Un "glow": muy luminoso pero, a diferencia de las luces, MÁS saturado.
        lightness: (l) => lerp(l, 1, 0.45),
        chroma: 1.3,
        hueShift: { toward: WARM_HUE, amount: 0.18 },
        minChroma: 0.02,
    },
    {
        key: 'shadowCast',
        name: 'Sombreado',
        nameEn: 'Shadow Cast',
        role: 'Sombra proyectada sobre el suelo',
        // La sombra proyectada recibe casi solo luz del cielo:
        // oscura, desaturada y muy desplazada hacia el azul.
        lightness: (l) => lerp(l, 0, 0.58),
        chroma: 0.5,
        hueShift: { toward: COOL_HUE, amount: 0.55 },
        minChroma: 0.018,
    },
];

/* ───────────────────────────── Utilidades ───────────────────────────── */

/** Interpolación lineal: t = 0 devuelve `from`, t = 1 devuelve `to`. */
function lerp(from, to, t) {
    return from + (to - from) * t;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * Desplaza un tono hacia otro por el ARCO MÁS CORTO del círculo cromático.
 *
 *  Ej.: de 350° (rosa) hacia 95° (amarillo) el camino corto es +105°
 *  (pasando por 0°), no −255°. La fórmula ((Δ + 540) mod 360) − 180
 *  normaliza la diferencia al rango [−180°, 180°].
 */
function shiftHue(hue, targetHue, amount) {
    const delta = ((targetHue - hue + 540) % 360) - 180;

    return (hue + delta * amount + 360) % 360;
}

/**
 * Gamut mapping: convierte OKLCH → sRGB sin "romper" el color.
 *
 *  Muchas combinaciones L/C/H no existen en sRGB. Si simplemente recortamos
 *  los canales RGB, el tono cambia de forma fea. En su lugar, mantenemos L y H
 *  fijos y reducimos C con búsqueda binaria hasta el máximo croma que sí
 *  cabe en pantalla (el mismo enfoque que recomienda CSS Color 4).
 */
function oklchToDisplayable(lightness, chromaValue, hue) {
    const candidate = chroma.oklch(lightness, chromaValue, hue);

    if (!candidate.clipped()) {
        return candidate;
    }

    let low = 0;
    let high = chromaValue;

    for (let i = 0; i < 18; i++) {
        const mid = (low + high) / 2;

        if (chroma.oklch(lightness, mid, hue).clipped()) {
            high = mid;
        } else {
            low = mid;
        }
    }

    return chroma.oklch(lightness, low, hue);
}

/**
 * Elige texto blanco o negro según cuál tenga mayor contraste WCAG
 * contra el fondo (ratio de luminancia relativa).
 */
export function getContrastText(color) {
    return chroma.contrast(color, '#ffffff') >= chroma.contrast(color, '#0b0c10') ? '#ffffff' : '#0b0c10';
}

/** Convierte un color chroma en la ficha que consume la UI. */
function describeColor(color) {
    const [r, g, b] = color.rgb();
    const [h, s, l] = color.hsl();
    const [okL, okC, okH] = color.oklch();
    const hue = Number.isNaN(h) ? 0 : h;

    return {
        hex: color.hex().toUpperCase(),
        rgb: { r, g, b },
        hsl: { h: Math.round(hue), s: Math.round(s * 100), l: Math.round(l * 100) },
        oklch: { l: okL, c: okC, h: Number.isNaN(okH) ? 0 : okH },
        rgbString: `rgb(${r}, ${g}, ${b})`,
        hslString: `hsl(${Math.round(hue)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
        textColor: getContrastText(color),
    };
}

/* ──────────────────────────── API pública ──────────────────────────── */

export function isValidHex(value) {
    return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function normalizeHex(value) {
    const trimmed = value.trim();

    return chroma(trimmed.startsWith('#') ? trimmed : `#${trimmed}`).hex().toUpperCase();
}

export function hexToRgb(hex) {
    const [r, g, b] = chroma(hex).rgb();

    return { r, g, b };
}

export function rgbToHex({ r, g, b }) {
    return chroma(r, g, b).hex().toUpperCase();
}

/**
 * Genera las 11 variaciones de iluminación a partir de un HEX.
 *
 * @param {string} baseHex  Color base, p. ej. "#7B5CFF".
 * @returns {{ base: object, variations: Record<string, object> }}
 */
export function generatePalette(baseHex) {
    const base = chroma(baseHex);

    // PASO 1 · Descomponer el color base en OKLCH.
    const [baseL, baseC, rawHue] = base.oklch();

    // PASO 2 · Los grises (croma ≈ 0) no tienen tono definido (NaN).
    //          Les asignamos un tono neutro; como su croma es ~0 no afecta
    //          al color base, pero permite que luces y sombras se tiñan.
    const isAchromatic = Number.isNaN(rawHue) || baseC < ACHROMATIC_CHROMA;
    const baseHue = Number.isNaN(rawHue) ? WARM_HUE : rawHue;

    const variations = {};

    for (const variation of VARIATIONS) {
        // PASO 3 · Luminosidad: interpolamos hacia blanco (luces) o negro (sombras).
        const lightness = clamp(variation.lightness(baseL), 0, 1);

        // PASO 4 · Tono: rotamos por el arco corto hacia amarillo o azul.
        //          En grises arrancamos directamente en el tono destino para
        //          obtener un tinte cálido/frío limpio.
        //          Los amarillos se sombrean hacia ámbar para evitar el verde.
        const [greenishFrom, greenishTo] = GREENISH_SHADOW_RANGE;
        const isYellowShadow =
            !isAchromatic &&
            variation.hueShift.toward === COOL_HUE &&
            baseHue >= greenishFrom &&
            baseHue <= greenishTo;
        const targetHue = isYellowShadow ? AMBER_HUE : variation.hueShift.toward;
        const startHue = isAchromatic ? targetHue : baseHue;
        const hue = shiftHue(startHue, targetHue, variation.hueShift.amount);

        // PASO 5 · Croma: escalamos la saturación y aplicamos límites.
        //          Además la atenuamos cerca de los extremos de L, donde el
        //          ojo ya no percibe croma (un negro "muy saturado" no existe).
        const extremeFalloff = Math.sin(Math.PI * clamp(lightness, 0.02, 0.98));
        let chromaValue = baseC * variation.chroma * (0.35 + 0.65 * extremeFalloff);

        if (variation.minChroma) {
            chromaValue = Math.max(chromaValue, variation.minChroma);
        }

        if (variation.maxChroma) {
            chromaValue = Math.min(chromaValue, variation.maxChroma);
        }

        // PASO 6 · Volver a sRGB sin salir del gamut y describir el resultado.
        const color = oklchToDisplayable(lightness, chromaValue, hue);

        variations[variation.key] = {
            key: variation.key,
            name: variation.name,
            nameEn: variation.nameEn,
            role: variation.role,
            ...describeColor(color),
        };
    }

    return {
        base: { key: 'base', name: 'Color Base', nameEn: 'Base Color', role: 'Tu color de partida', ...describeColor(base) },
        variations,
    };
}

/**
 * Color base aleatorio "agradable": en lugar de RGB al azar (que produce
 * muchos tonos sucios), muestreamos OKLCH en una franja de L y C media-alta.
 */
export function randomBaseColor() {
    const lightness = 0.55 + Math.random() * 0.22;
    const chromaValue = 0.11 + Math.random() * 0.12;
    const hue = Math.random() * 360;

    return oklchToDisplayable(lightness, chromaValue, hue).hex().toUpperCase();
}

/** Exporta la paleta como variables CSS listas para pegar. */
export function paletteToCss(palette) {
    const toVar = (key) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    const lines = [palette.base, ...Object.values(palette.variations)].map(
        (color) => `  --lumina-${toVar(color.key)}: ${color.hex};`,
    );

    return `:root {\n${lines.join('\n')}\n}`;
}
