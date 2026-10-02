import chroma from 'chroma-js';

const withAlpha = (hex, alpha) => chroma(hex).alpha(alpha).css();

/**
 * Esfera 3D construida solo con CSS, iluminada con la PROPIA paleta:
 * el gradiente radial recorre Brillo Máximo → Núcleo de Sombra, como
 * una luz cálida situada arriba a la izquierda.
 */
export default function ColorSphere({ palette }) {
    const { base, variations: v } = palette;

    const sphereGradient = `radial-gradient(circle at 34% 28%,
        ${v.maxBrightness.hex} 0%,
        ${v.highLight.hex} 9%,
        ${v.mediumLight.hex} 20%,
        ${v.baseLight.hex} 33%,
        ${base.hex} 47%,
        ${v.softShadow.hex} 62%,
        ${v.shadow.hex} 75%,
        ${v.deepShadow.hex} 88%,
        ${v.shadowCore.hex} 100%)`;

    return (
        <div className="relative grid aspect-square w-full max-w-[19rem] place-items-center sm:max-w-[22rem]">
            {/* Halo ambiental del color base */}
            <div
                className="absolute inset-[12%] rounded-full opacity-60 blur-3xl transition-colors duration-500"
                style={{ backgroundColor: base.hex }}
            />

            {/* Órbita decorativa */}
            <div className="absolute inset-0 rounded-full border border-white/5" />
            <div className="absolute inset-[6%] rounded-full border border-dashed border-white/10" />

            <div className="animate-float relative z-10 aspect-square w-[68%]">
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: sphereGradient,
                        boxShadow: `
                            inset -22px -28px 50px ${withAlpha(v.shadowCore.hex, 0.6)},
                            inset 14px 16px 36px ${withAlpha(v.highLight.hex, 0.35)},
                            0 40px 90px -24px ${withAlpha(base.hex, 0.75)}
                        `,
                    }}
                />

                {/* Luz rebotada (Iluminación) en el borde inferior derecho */}
                <div
                    className="absolute inset-0 rounded-full mix-blend-screen"
                    style={{
                        background: `radial-gradient(circle at 78% 86%, ${withAlpha(v.illuminate.hex, 0.55)} 0%, transparent 32%)`,
                    }}
                />

                {/* Reflejo especular */}
                <div className="absolute top-[16%] left-[24%] h-[14%] w-[20%] -rotate-[30deg] rounded-full bg-white/80 blur-md" />
                <div className="absolute top-[20%] left-[29%] size-[5%] rounded-full bg-white blur-[1px]" />
            </div>

            {/* Sombra proyectada (Sombreado) */}
            <div
                className="absolute bottom-[6%] h-[9%] w-[52%] rounded-[50%] blur-xl"
                style={{ backgroundColor: withAlpha(v.shadowCast.hex, 0.9) }}
            />
        </div>
    );
}
