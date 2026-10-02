import chroma from 'chroma-js';

/*
 * Exportación del esquema de color del personaje:
 *   · JSON: datos completos (roles, HEX, partes, paleta de origen) que se
 *     pueden volver a importar en la herramienta.
 *   · PNG: una "lámina de color" lista para compartir o pegar en un
 *     documento de diseño (figura 3D + bloques 70/20/10 + paleta).
 */

function download(filename, href) {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.click();
}

const slug = (scheme) => `menoiro-personaje-${scheme.roles[0].hex.slice(1).toLowerCase()}`;

export function buildScheme({ roles, assignment, parts, palette, source, skin }) {
    return {
        app: 'Menoiro Color',
        format: 'character-color-scheme',
        version: 1,
        rule: '70-20-10',
        createdAt: new Date().toISOString(),
        source,
        skin,
        roles: roles.map((role) => {
            const hex = assignment[role.id];
            const [r, g, b] = chroma(hex).rgb();

            return {
                role: role.id,
                label: role.label,
                percent: role.percent,
                hex,
                rgb: { r, g, b },
                colorName: palette.find((color) => color.hex === hex)?.name ?? null,
                part: parts[role.id],
            };
        }),
        palette: palette.map(({ name, hex }) => ({ name, hex })),
    };
}

export function exportJson(scheme) {
    const blob = new Blob([JSON.stringify(scheme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    download(`${slug(scheme)}.json`, url);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lee un JSON exportado y devuelve { assignment, parts, skin } o lanza Error. */
export async function importJson(file) {
    const data = JSON.parse(await file.text());

    if (data.format !== 'character-color-scheme' || !Array.isArray(data.roles)) {
        throw new Error('Ese archivo no es un esquema de Menoiro Color.');
    }

    const byRole = Object.fromEntries(data.roles.map((role) => [role.role, role]));

    return {
        assignment: { dominant: byRole.dominant.hex, secondary: byRole.secondary.hex, accent: byRole.accent.hex },
        parts: { dominant: byRole.dominant.part, secondary: byRole.secondary.part, accent: byRole.accent.part },
        skin: data.skin,
        palette: data.palette,
    };
}

const loadImage = (src) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });

function roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
}

/** Dibuja la lámina en un canvas 1600 × 1000 y la descarga como PNG. */
export async function exportPng(scheme, snapshotDataUrl) {
    await document.fonts.ready;

    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1000;
    const context = canvas.getContext('2d');
    const font = (weight, size, family = 'Space Grotesk') => `${weight} ${size}px "${family}", system-ui, sans-serif`;

    // Fondo
    context.fillStyle = '#0B0C10';
    context.fillRect(0, 0, 1600, 1000);
    const glow = context.createRadialGradient(400, 420, 40, 400, 420, 520);
    glow.addColorStop(0, chroma(scheme.roles[0].hex).alpha(0.35).css());
    glow.addColorStop(1, 'rgba(11, 12, 16, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, 820, 1000);

    // Figura
    const snapshot = await loadImage(snapshotDataUrl);
    const scale = Math.min(760 / snapshot.width, 900 / snapshot.height);
    const width = snapshot.width * scale;
    const height = snapshot.height * scale;
    context.drawImage(snapshot, 40 + (760 - width) / 2, 60 + (900 - height) / 2, width, height);

    // Encabezado
    const left = 860;
    context.fillStyle = '#A28DFF';
    context.font = font(600, 16);
    context.letterSpacing = '4px';
    context.fillText('REGLA 70 · 20 · 10', left, 92);
    context.fillStyle = '#FFFFFF';
    context.font = font(600, 40);
    context.letterSpacing = '0px';
    context.fillText('Esquema de color del personaje', left, 140);

    // Bloques proporcionales: la altura de cada rol refleja su porcentaje.
    const blockTop = 180;
    const blockHeight = 600;
    let y = blockTop;

    for (const role of scheme.roles) {
        const h = (blockHeight * role.percent) / 100 - 12;
        const text = chroma.contrast(role.hex, '#ffffff') >= chroma.contrast(role.hex, '#0b0c10') ? '#FFFFFF' : '#0B0C10';

        roundedRect(context, left, y, 700, h, 18);
        context.fillStyle = role.hex;
        context.fill();

        context.fillStyle = text;
        context.font = font(700, role.percent >= 20 ? 18 : 14);
        context.letterSpacing = '3px';
        context.fillText(`${role.label.toUpperCase()} · ${role.percent}%`, left + 24, y + (role.percent >= 20 ? 40 : 28));
        context.letterSpacing = '0px';

        context.font = font(500, role.percent >= 20 ? 30 : 18, 'JetBrains Mono');
        context.textAlign = 'right';
        context.fillText(role.hex, left + 676, y + (role.percent >= 20 ? 44 : 30));
        context.textAlign = 'left';

        if (role.percent >= 20) {
            context.font = font(400, 20);
            context.fillText(role.part || '—', left + 24, y + 76);
        } else {
            context.font = font(400, 14);
            context.fillText(role.part || '—', left + 260, y + 28);
        }

        y += h + 12;
    }

    // Paleta de origen
    const swatchWidth = 700 / scheme.palette.length;
    scheme.palette.forEach((color, index) => {
        context.fillStyle = color.hex;
        context.fillRect(left + index * swatchWidth, 820, swatchWidth, 48);
    });
    context.fillStyle = '#71717A';
    context.font = font(500, 14);
    context.letterSpacing = '2px';
    const sourceLabel = scheme.source?.label ? `PALETA · ${scheme.source.label.toUpperCase()}` : 'PALETA DE ORIGEN';
    context.fillText(sourceLabel, left, 900);
    context.fillText('MENOIRO COLOR', left + 540, 900);

    download(`${slug(scheme)}.png`, canvas.toDataURL('image/png'));
}
