import chroma from 'chroma-js';

/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  MENOIRO COLOR · Motor de paletas de iluminación en OKLCH
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
 *  Al mover L en OKLCH el color se aclara u oscurece sin "ensuciarse", y al
 *  mover H el brillo percibido no salta. Eso permite que TODAS las variaciones
 *  conserven una luminosidad y saturación coherentes.
 *
 *  Cada variación se construye en tres capas independientes:
 *
 *    1. RAMPA DE VALOR  → L sube hacia el blanco (luces) o baja hacia el
 *                         negro (sombras). Define la "forma" del volumen.
 *    2. ARMONÍA         → el tono viaja desde el color base hacia los colores
 *                         de la armonía elegida: las luces hacia un extremo
 *                         y las sombras hacia el otro.
 *    3. TEMPERATURA     → la fuente de luz tiñe el resultado: cálida (luces
 *                         ámbar / sombras azul-violeta), fría (luces azuladas /
 *                         sombras terrosas) o neutra (sin tinte térmico).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ───────────────────────────── Opciones ───────────────────────────── */

export const HARMONY_MODES = [
    {
        id: 'monochromatic',
        label: 'Monocromático',
        description: 'Un solo matiz: luces y sombras solo cambian de valor y temperatura.',
    },
    {
        id: 'complementary',
        label: 'Complementario',
        description: 'Las sombras viajan hacia el color opuesto (+180°) y se neutralizan.',
    },
    {
        id: 'analogous',
        label: 'Análogo',
        description: 'Luces hacia un vecino (±30°) y sombras hacia el otro.',
    },
    {
        id: 'triadic',
        label: 'Triádico',
        description: 'Luces y sombras hacia los vértices del triángulo (±120°).',
    },
];

export const TEMPERATURES = [
    { id: 'warm', label: 'Cálida', description: 'Luces amarillo-naranja, sombras azul-violeta.' },
    { id: 'neutral', label: 'Neutra', description: 'Matiz puro: solo actúan el valor y la armonía.' },
    { id: 'cool', label: 'Fría', description: 'Luces azuladas, sombras cálidas y terrosas.' },
];

export const DEFAULT_OPTIONS = { harmony: 'monochromatic', temperature: 'warm' };

/**
 * Tonos destino (OKLCH) hacia los que la temperatura empuja cada lado.
 *  · Cálida: la luz del sol es ámbar y el cielo que rellena la sombra es azul.
 *  · Fría:   luz de cielo nublado / luna; las sombras reciben rebote cálido.
 *  · Neutra: sin destino → el matiz no se altera térmicamente.
 */
const THERMAL_TARGETS = {
    warm: { light: 80, shadow: 285 },
    cool: { light: 235, shadow: 45 },
    neutral: null,
};

/**
 * Cuánto del desplazamiento de la armonía se aplica en la variación más
 * extrema (profundidad 1). El análogo usa el ángulo completo (30°); en
 * triádico y complementario no llegamos al 100 % para no perder la identidad
 * del color base.
 */
const HARMONY_STRENGTH = { monochromatic: 0, complementary: 0.65, analogous: 1, triadic: 0.72 };

/** Tono por el que pasa el giro complementario cuando la luz es Neutra. */
const NEUTRAL_COMPLEMENT_PATH = 330;

/**
 * Neutralización: en pintura, mezclar un color con su complementario lo
 * agrisa. Reproducimos ese efecto bajando el croma de las sombras en las
 * armonías que cruzan el círculo cromático.
 */
const HARMONY_NEUTRALIZATION = { monochromatic: 0, complementary: 0.3, analogous: 0, triadic: 0.15 };

/**
 * Excepción clásica de pintura: el arco amarillo → azul atraviesa el VERDE,
 * y una sombra amarilla verdosa se ve "enferma". Para tonos en este rango,
 * las sombras frías se resuelven hacia ámbar/siena en su lugar.
 */
const GREENISH_SHADOW_RANGE = [55, 125];
const AMBER_HUE = 40;

/** Por debajo de este croma consideramos el color acromático (gris). */
const ACHROMATIC_CHROMA = 0.012;

/**
 * Definición declarativa de cada variación.
 *
 *  side      → 'light' | 'shadow': a qué extremo de la armonía/temperatura viaja.
 *  depth     → 0..1, qué tan lejos llega en ese extremo (más luz o más sombra).
 *  lightness → función (L base) ⇒ L nueva. Interpolamos hacia blanco/negro en
 *              lugar de sumar constantes, así el orden se conserva aunque la
 *              base sea muy clara u oscura.
 *  chroma    → multiplicador sobre el croma base.
 *  thermal   → 0..1, fracción del arco que recorre hacia el tono térmico.
 *  minChroma / maxChroma → límites de croma (tintes en grises, blancos sutiles).
 */
const VARIATIONS = [
    {
        key: 'maxBrightness',
        name: 'Brillo Máximo',
        nameEn: 'Max Brightness',
        role: 'Especular · punto de máxima reflexión',
        side: 'light',
        depth: 1,
        lightness: (l) => lerp(l, 0.985, 0.88),
        chroma: 0.28,
        thermal: 0.35,
        minChroma: 0.006,
    },
    {
        key: 'highLight',
        name: 'Luz Alta',
        nameEn: 'High Light',
        role: 'Zona que mira directo a la fuente',
        side: 'light',
        depth: 0.8,
        lightness: (l) => lerp(l, 1, 0.62),
        chroma: 0.6,
        thermal: 0.26,
        minChroma: 0.008,
    },
    {
        key: 'mediumLight',
        name: 'Luz Media',
        nameEn: 'Medium Light',
        role: 'Transición iluminada',
        side: 'light',
        depth: 0.55,
        lightness: (l) => lerp(l, 1, 0.4),
        chroma: 0.85,
        thermal: 0.16,
    },
    {
        key: 'baseLight',
        name: 'Luz Base',
        nameEn: 'Base Light',
        role: 'Color local bajo luz directa',
        side: 'light',
        depth: 0.28,
        lightness: (l) => lerp(l, 1, 0.18),
        chroma: 1.02,
        thermal: 0.08,
    },
    {
        key: 'tintedWhite',
        name: 'Blanco Tintado',
        nameEn: 'Tinted White',
        role: 'Fondo / superficie neutra con alma',
        side: 'light',
        depth: 0.4,
        // L absoluta: siempre casi blanco, con apenas un susurro de tono.
        lightness: () => 0.975,
        chroma: 0.12,
        maxChroma: 0.022,
        thermal: 0.08,
    },
    {
        key: 'softShadow',
        name: 'Sombra Suave',
        nameEn: 'Soft Shadow',
        role: 'Terminador · inicio de la sombra',
        side: 'shadow',
        depth: 0.25,
        lightness: (l) => lerp(l, 0, 0.16),
        chroma: 1.08,
        thermal: 0.1,
        minChroma: 0.01,
    },
    {
        key: 'shadow',
        name: 'Sombra',
        nameEn: 'Shadow',
        role: 'Sombra propia del objeto',
        side: 'shadow',
        depth: 0.5,
        lightness: (l) => lerp(l, 0, 0.32),
        chroma: 1.14,
        thermal: 0.2,
        minChroma: 0.016,
    },
    {
        key: 'deepShadow',
        name: 'Sombra Profunda',
        nameEn: 'Deep Shadow',
        role: 'Oclusión ambiental',
        side: 'shadow',
        depth: 0.72,
        lightness: (l) => lerp(l, 0, 0.5),
        chroma: 1.1,
        thermal: 0.3,
        minChroma: 0.02,
    },
    {
        key: 'shadowCore',
        name: 'Núcleo de Sombra',
        nameEn: 'Shadow Core',
        role: 'Punto más oscuro del volumen',
        side: 'shadow',
        depth: 0.9,
        lightness: (l) => lerp(l, 0, 0.68),
        chroma: 0.9,
        thermal: 0.4,
        minChroma: 0.02,
    },
    {
        key: 'illuminate',
        name: 'Iluminación',
        nameEn: 'Illuminate',
        role: 'Luz emisiva / rebote saturado',
        side: 'light',
        depth: 0.65,
        // Un "glow": muy luminoso pero, a diferencia de las luces, MÁS saturado.
        lightness: (l) => lerp(l, 1, 0.45),
        chroma: 1.3,
        thermal: 0.18,
        minChroma: 0.02,
    },
    {
        key: 'shadowCast',
        name: 'Sombreado',
        nameEn: 'Shadow Cast',
        role: 'Sombra proyectada sobre el suelo',
        side: 'shadow',
        depth: 1,
        // La sombra proyectada recibe casi solo luz ambiental:
        // oscura, desaturada y la más alejada del matiz base.
        lightness: (l) => lerp(l, 0, 0.58),
        chroma: 0.5,
        thermal: 0.55,
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

/** Normaliza cualquier ángulo al rango [0°, 360°). */
function wrapHue(hue) {
    return ((hue % 360) + 360) % 360;
}

/** Diferencia firmada más corta entre dos tonos, en el rango [−180°, 180°]. */
function hueDelta(from, to) {
    return ((to - from + 540) % 360) - 180;
}

/**
 * Desplaza un tono hacia otro por el ARCO MÁS CORTO del círculo cromático.
 *
 *  Ej.: de 350° (rosa) hacia 95° (amarillo) el camino corto es +105°
 *  (pasando por 0°), no −255°.
 */
function shiftHue(hue, targetHue, amount) {
    return wrapHue(hue + hueDelta(hue, targetHue) * amount);
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
 * Calcula hacia dónde viaja el tono en cada lado (luz / sombra) según la
 * armonía. Devuelve desplazamientos FIRMADOS en grados y los tonos ancla
 * de la armonía (para dibujarlos en la rueda cromática).
 *
 *  La temperatura decide qué extremo le toca a cada lado: en análogo y
 *  triádico, las luces van hacia el vecino más cercano al tono de la luz
 *  (p. ej. el más amarillo si la luz es cálida) y las sombras hacia el otro.
 *  En complementario, el giro de 180° se hace por el lado del círculo que
 *  pasa cerca del tono térmico de la sombra.
 */
function resolveHarmony(baseHue, harmony, temperature) {
    const thermal = THERMAL_TARGETS[temperature];

    // Elige entre dos desplazamientos (+offset / −offset) el que acerca el
    // tono al destino térmico. Sin temperatura, el positivo va a las luces.
    const pickToward = (offset, target) => {
        if (target === undefined) {
            return offset;
        }

        const positive = Math.abs(hueDelta(baseHue + offset, target));
        const negative = Math.abs(hueDelta(baseHue - offset, target));

        return positive <= negative ? offset : -offset;
    };

    switch (harmony) {
        case 'complementary': {
            // El "medio camino" (±90°) indica por qué lado del círculo girar.
            // Sin temperatura giramos por el lado magenta, que evita que las
            // sombras crucen el verde (el recorrido que peor sienta a la piel
            // y a los amarillos).
            const direction = Math.sign(pickToward(90, thermal?.shadow ?? NEUTRAL_COMPLEMENT_PATH)) || 1;

            return { light: 0, shadow: 180 * direction, anchors: [baseHue, baseHue + 180] };
        }

        case 'analogous':
        case 'triadic': {
            const angle = harmony === 'analogous' ? 30 : 120;
            const light = pickToward(angle, thermal?.light);

            return { light, shadow: -light, anchors: [baseHue, baseHue + angle, baseHue - angle] };
        }

        default:
            return { light: 0, shadow: 0, anchors: [baseHue] };
    }
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
 * @param {{ harmony?: string, temperature?: string }} options
 * @returns {{ base: object, variations: Record<string, object>, harmony: object }}
 */
export function generatePalette(baseHex, { harmony = 'monochromatic', temperature = 'warm' } = {}) {
    const base = chroma(baseHex);
    const thermal = THERMAL_TARGETS[temperature];

    // PASO 1 · Descomponer el color base en OKLCH.
    const [baseL, baseC, rawHue] = base.oklch();

    // PASO 2 · Los grises (croma ≈ 0) no tienen tono definido (NaN).
    //          Les asignamos un tono por defecto; como su croma es ~0 no
    //          afecta al color base, pero permite que luces y sombras se tiñan.
    const isAchromatic = Number.isNaN(rawHue) || baseC < ACHROMATIC_CHROMA;
    const baseHue = Number.isNaN(rawHue) ? (thermal?.light ?? 80) : rawHue;

    // PASO 3 · Resolver la armonía: cuántos grados gira cada lado.
    const harmonyOffsets = resolveHarmony(baseHue, harmony, temperature);
    const strength = HARMONY_STRENGTH[harmony] ?? 0;
    const neutralization = HARMONY_NEUTRALIZATION[harmony] ?? 0;

    const variations = {};

    for (const variation of VARIATIONS) {
        const isLight = variation.side === 'light';

        // PASO 4 · Valor: interpolamos L hacia blanco (luces) o negro (sombras).
        const lightness = clamp(variation.lightness(baseL), 0, 1);

        // PASO 5 · Armonía: el tono base gira hacia el ancla de su lado,
        //          tanto más cuanto más extrema es la variación (depth).
        const harmonyOffset = isLight ? harmonyOffsets.light : harmonyOffsets.shadow;
        let hue = wrapHue(baseHue + harmonyOffset * strength * variation.depth);

        // PASO 6 · Temperatura: el tinte de la fuente de luz se aplica encima
        //          de la armonía. Neutra = sin tinte térmico.
        if (thermal) {
            let thermalTarget = isLight ? thermal.light : thermal.shadow;

            // Los amarillos no se sombrean hacia azul (pasaría por verde).
            const [greenishFrom, greenishTo] = GREENISH_SHADOW_RANGE;
            const crossesGreen = !isLight && temperature === 'warm' && hue >= greenishFrom && hue <= greenishTo;

            if (crossesGreen && !isAchromatic) {
                thermalTarget = AMBER_HUE;
            }

            // En grises arrancamos directamente en el tono térmico para
            // obtener un tinte limpio en vez de girar desde un tono inexistente.
            hue = isAchromatic ? thermalTarget : shiftHue(hue, thermalTarget, variation.thermal);
        }

        // PASO 7 · Croma: escalamos la saturación del base y la atenuamos
        //          cerca de los extremos de L, donde el ojo ya no percibe
        //          croma (un negro "muy saturado" no existe). Las armonías que
        //          cruzan el círculo neutralizan además las sombras.
        const extremeFalloff = Math.sin(Math.PI * clamp(lightness, 0.02, 0.98));
        const harmonyNeutralization = 1 - neutralization * variation.depth * (isLight ? 0.4 : 1);
        let chromaValue = baseC * variation.chroma * (0.35 + 0.65 * extremeFalloff) * harmonyNeutralization;

        // Los grises en modo Neutro se quedan grises: sin croma mínimo.
        const allowsTint = !(isAchromatic && !thermal);

        if (variation.minChroma && allowsTint) {
            chromaValue = Math.max(chromaValue, variation.minChroma);
        }

        if (variation.maxChroma) {
            chromaValue = Math.min(chromaValue, variation.maxChroma);
        }

        // PASO 8 · Volver a sRGB sin salir del gamut y describir el resultado.
        const color = oklchToDisplayable(lightness, chromaValue, hue);

        variations[variation.key] = {
            key: variation.key,
            name: variation.name,
            nameEn: variation.nameEn,
            role: variation.role,
            side: variation.side,
            ...describeColor(color),
        };
    }

    return {
        base: {
            key: 'base',
            name: 'Color Base',
            nameEn: 'Base Color',
            role: 'Tu color de partida',
            side: 'base',
            ...describeColor(base),
        },
        variations,
        harmony: {
            mode: harmony,
            temperature,
            isAchromatic,
            anchors: describeAnchors(harmonyOffsets.anchors, baseL, baseC),
        },
    };
}

/** Convierte los tonos ancla en colores visibles (para la rueda y las pestañas). */
function describeAnchors(anchorHues, baseL, baseC) {
    const lightness = clamp(baseL, 0.5, 0.8);
    const chromaValue = Math.max(baseC, 0.09);

    return anchorHues.map((anchorHue) => ({
        hue: wrapHue(anchorHue),
        hex: oklchToDisplayable(lightness, chromaValue, wrapHue(anchorHue)).hex().toUpperCase(),
    }));
}

/** Solo las anclas de una armonía, sin calcular la paleta completa. */
export function getHarmonyAnchors(baseHex, harmony, temperature) {
    const [baseL, baseC, rawHue] = chroma(baseHex).oklch();
    const baseHue = Number.isNaN(rawHue) ? (THERMAL_TARGETS[temperature]?.light ?? 80) : rawHue;

    return describeAnchors(resolveHarmony(baseHue, harmony, temperature).anchors, baseL, baseC);
}

/** Par de colores (luz, sombra) que representa cada temperatura en la UI. */
export function getTemperatureSwatches(temperature) {
    const targets = THERMAL_TARGETS[temperature];

    if (!targets) {
        return { light: '#F2F2F2', shadow: '#3A3A3A' };
    }

    return {
        light: oklchToDisplayable(0.86, 0.13, targets.light).hex(),
        shadow: oklchToDisplayable(0.42, 0.13, targets.shadow).hex(),
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

/**
 * Rueda cromática como `conic-gradient`: muestreamos OKLCH a L y C fijas,
 * así todos los tonos de la rueda se perciben con el mismo brillo.
 */
export function hueWheelGradient(steps = 24) {
    const stops = Array.from({ length: steps + 1 }, (_, index) => {
        const hue = (index / steps) * 360;

        return oklchToDisplayable(0.72, 0.15, hue).hex();
    });

    // conic-gradient arranca arriba (0°) y gira en sentido horario,
    // igual que dibujamos los ángulos de tono en la rueda.
    return `conic-gradient(${stops.join(', ')})`;
}

/** Exporta la paleta como variables CSS listas para pegar. */
export function paletteToCss(palette) {
    const toVar = (key) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    const harmonyLabel = HARMONY_MODES.find((mode) => mode.id === palette.harmony.mode)?.label;
    const temperatureLabel = TEMPERATURES.find((option) => option.id === palette.harmony.temperature)?.label;
    const lines = [palette.base, ...Object.values(palette.variations)].map(
        (color) => `  --lumina-${toVar(color.key)}: ${color.hex};`,
    );

    return `/* ${palette.base.hex} · ${harmonyLabel} · Luz ${temperatureLabel?.toLowerCase()} */\n:root {\n${lines.join('\n')}\n}`;
}
