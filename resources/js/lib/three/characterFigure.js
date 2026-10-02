import * as THREE from 'three';

/*
 * Figura estilizada (tipo maniquí de diseño de personajes) construida con
 * primitivas. Cada pieza pertenece a un rol de la regla 70-20-10:
 *
 *   DOMINANTE  → abrigo (torso + faldón), mangas superiores, hombreras,
 *                cuello alto y botas.
 *   SECUNDARIO → pantalones, antebrazos y cabello.
 *   ACENTO     → ojos, gema del pecho, cinturón, ribete del abrigo y puños.
 *   PIEL       → cabeza, cuello y manos (fuera de la regla).
 *
 * Las piezas se dimensionaron para que el ÁREA DE SUPERFICIE real de cada
 * rol se acerque a 70/20/10 (se calcula y se muestra en la interfaz).
 */

const D = 'dominant';
const S = 'secondary';
const A = 'accent';
const SKIN = 'skin';

const capsule = (radius, length) => new THREE.CapsuleGeometry(radius, length, 8, 24);
const sphere = (radius, thetaLength = Math.PI) => new THREE.SphereGeometry(radius, 32, 20, 0, Math.PI * 2, 0, thetaLength);
const torus = (radius, tube) => new THREE.TorusGeometry(radius, tube, 12, 48);

/** [rol, geometría, posición, rotación (rad), escala] */
const PARTS = [
    // ── Dominante ─────────────────────────────────────────────
    [D, capsule(0.27, 0.34), [0, 1.2, 0], [0, 0, 0], [1, 1, 0.74]], // torso
    [D, new THREE.CylinderGeometry(0.26, 0.46, 0.66, 40, 1), [0, 0.78, 0], [0, 0, 0], [1, 1, 0.8]], // faldón
    [D, capsule(0.09, 0.3), [-0.37, 1.22, 0], [0, 0, -0.16], [1, 1, 1]], // brazo izq.
    [D, capsule(0.09, 0.3), [0.37, 1.22, 0], [0, 0, 0.16], [1, 1, 1]], // brazo der.
    [D, sphere(0.12, Math.PI / 2), [-0.31, 1.4, 0], [0, 0, 0.35], [1, 0.8, 1]], // hombrera izq.
    [D, sphere(0.12, Math.PI / 2), [0.31, 1.4, 0], [0, 0, -0.35], [1, 0.8, 1]], // hombrera der.
    [D, new THREE.CylinderGeometry(0.13, 0.16, 0.14, 32, 1, true), [0, 1.5, 0], [0, 0, 0], [1, 1, 0.9]], // cuello alto
    [D, capsule(0.115, 0.1), [-0.12, 0.1, 0.03], [Math.PI / 2, 0, 0], [1, 1, 0.85]], // bota izq.
    [D, capsule(0.115, 0.1), [0.12, 0.1, 0.03], [Math.PI / 2, 0, 0], [1, 1, 0.85]], // bota der.

    // ── Secundario ────────────────────────────────────────────
    [S, capsule(0.085, 0.3), [-0.12, 0.38, 0], [0, 0, 0], [1, 1, 1]], // pierna izq.
    [S, capsule(0.085, 0.3), [0.12, 0.38, 0], [0, 0, 0], [1, 1, 1]], // pierna der.
    [S, capsule(0.068, 0.24), [-0.43, 0.94, 0], [0, 0, -0.1], [1, 1, 1]], // antebrazo izq.
    [S, capsule(0.068, 0.24), [0.43, 0.94, 0], [0, 0, 0.1], [1, 1, 1]], // antebrazo der.
    [S, sphere(0.218, Math.PI * 0.55), [0, 1.7, -0.01], [-0.25, 0, 0], [1, 1, 1]], // cabello
    [S, capsule(0.13, 0.08), [0, 1.63, -0.1], [0, 0, 0], [1.1, 1, 0.7]], // melena

    // ── Acento ────────────────────────────────────────────────
    [A, torus(0.265, 0.026), [0, 1.03, 0], [Math.PI / 2, 0, 0], [1, 0.76, 1]], // cinturón
    [A, torus(0.46, 0.02), [0, 0.45, 0], [Math.PI / 2, 0, 0], [1, 0.8, 1]], // ribete del faldón
    [A, new THREE.OctahedronGeometry(0.06), [0, 1.3, 0.19], [0, 0, 0], [0.8, 1, 0.5]], // gema
    [A, torus(0.07, 0.02), [-0.45, 0.8, 0], [Math.PI / 2, 0, 0], [1, 1, 1]], // puño izq.
    [A, torus(0.07, 0.02), [0.45, 0.8, 0], [Math.PI / 2, 0, 0], [1, 1, 1]], // puño der.
    [A, sphere(0.03), [-0.075, 1.7, 0.175], [0, 0, 0], [1, 1.2, 0.6]], // ojo izq.
    [A, sphere(0.03), [0.075, 1.7, 0.175], [0, 0, 0], [1, 1.2, 0.6]], // ojo der.

    // ── Piel ──────────────────────────────────────────────────
    [SKIN, sphere(0.2), [0, 1.68, 0], [0, 0, 0], [0.95, 1.05, 1]], // cabeza
    [SKIN, new THREE.CylinderGeometry(0.07, 0.08, 0.14, 24), [0, 1.52, 0], [0, 0, 0], [1, 1, 1]], // cuello
    [SKIN, sphere(0.065), [-0.46, 0.73, 0], [0, 0, 0], [1, 1.1, 1]], // mano izq.
    [SKIN, sphere(0.065), [0.46, 0.73, 0], [0, 0, 0], [1, 1.1, 1]], // mano der.
];

/** Área de superficie (en unidades de mundo) de una malla ya posicionada. */
function meshArea(mesh) {
    mesh.updateMatrixWorld(true);
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const position = geometry.attributes.position;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    let area = 0;

    for (let i = 0; i < position.count; i += 3) {
        a.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(position, i + 1).applyMatrix4(mesh.matrixWorld);
        c.fromBufferAttribute(position, i + 2).applyMatrix4(mesh.matrixWorld);
        area += new THREE.Triangle(a, b, c).getArea();
    }

    return area;
}

/** Sombreado de 3 tonos (cel shading) para un acabado de ilustración. */
function toonGradient() {
    const texture = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;

    return texture;
}

const DIMMED = new THREE.Color('#2b2c35');

export function createCharacterFigure() {
    const group = new THREE.Group();
    const gradientMap = toonGradient();
    const materials = Object.fromEntries(
        [D, S, A, SKIN].map((role) => [role, new THREE.MeshToonMaterial({ gradientMap })]),
    );
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: '#07080c', side: THREE.BackSide });
    const areas = { [D]: 0, [S]: 0, [A]: 0 };

    for (const [role, geometry, position, rotation, scale] of PARTS) {
        const mesh = new THREE.Mesh(geometry, materials[role]);
        mesh.position.set(...position);
        mesh.rotation.set(...rotation);
        mesh.scale.set(...scale);
        group.add(mesh);

        if (role in areas) {
            areas[role] += meshArea(mesh);
        }

        // Contorno "inverted hull": la misma pieza, un poco más grande y
        // vista por dentro, en negro. Grosor constante sin importar el tamaño.
        geometry.computeBoundingSphere();
        const grow = 1 + 0.014 / geometry.boundingSphere.radius;
        const outline = new THREE.Mesh(geometry, outlineMaterial);
        outline.position.copy(mesh.position);
        outline.rotation.copy(mesh.rotation);
        outline.scale.copy(mesh.scale).multiplyScalar(grow);
        group.add(outline);
    }

    const total = areas[D] + areas[S] + areas[A];

    /**
     * Aplica los colores. `highlight` (opcional) atenúa los demás roles para
     * señalar en la figura qué zonas corresponden a un rol.
     */
    const setColors = (colors, highlight = null) => {
        for (const role of [D, S, A, SKIN]) {
            const material = materials[role];
            const isDimmed = highlight && role !== highlight && role !== SKIN;
            material.color.set(colors[role]);

            if (isDimmed) {
                material.color.lerp(DIMMED, 0.8);
            }

            // El acento brilla un poco: son detalles que dirigen la mirada.
            material.emissive.set(role === A && !isDimmed ? colors[role] : '#000000');
            material.emissiveIntensity = role === A ? 0.45 : 0;
        }
    };

    const dispose = () => {
        group.traverse((node) => node.geometry?.dispose());
        Object.values(materials).forEach((material) => material.dispose());
        outlineMaterial.dispose();
        gradientMap.dispose();
    };

    return {
        group,
        setColors,
        dispose,
        proportions: {
            dominant: (areas[D] / total) * 100,
            secondary: (areas[S] / total) * 100,
            accent: (areas[A] / total) * 100,
        },
    };
}
