import { useMemo } from 'react';
import { hueWheelGradient } from '../../lib/colorPalette';

/**
 * Rueda cromática OKLCH con los colores ancla de la armonía activa.
 * El primer ancla es siempre el color base (punto más grande).
 */
export default function HarmonyWheel({ anchors, size = 'size-20' }) {
    const gradient = useMemo(() => hueWheelGradient(), []);
    const points = anchors.map((anchor) => {
        // 0° arriba y sentido horario, igual que el conic-gradient.
        const radians = (anchor.hue * Math.PI) / 180;

        return { ...anchor, x: 50 + 38 * Math.sin(radians), y: 50 - 38 * Math.cos(radians) };
    });

    return (
        <div className={`relative shrink-0 rounded-full p-1 ring-1 ring-white/10 ${size}`} title="Rueda de armonía (OKLCH)">
            <div
                className="absolute inset-1 rounded-full opacity-80"
                style={{
                    background: gradient,
                    maskImage: 'radial-gradient(circle, transparent 52%, black 54%)',
                    WebkitMaskImage: 'radial-gradient(circle, transparent 52%, black 54%)',
                }}
            />

            <svg className="absolute inset-1 overflow-visible" viewBox="0 0 100 100" aria-hidden="true">
                {points.length > 1 && (
                    <polygon
                        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                        fill="rgb(255 255 255 / 0.06)"
                        stroke="rgb(255 255 255 / 0.55)"
                        strokeWidth="1.2"
                        strokeDasharray="3 2.5"
                    />
                )}
            </svg>

            {points.map((point, index) => (
                <span
                    key={`${index}-${point.hue}`}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-void transition-all duration-500 ${
                        index === 0 ? 'size-3.5 shadow-[0_0_10px_rgb(255_255_255/0.5)]' : 'size-2.5'
                    }`}
                    style={{
                        left: `calc(4px + (100% - 8px) * ${point.x / 100})`,
                        top: `calc(4px + (100% - 8px) * ${point.y / 100})`,
                        backgroundColor: point.hex,
                    }}
                />
            ))}
        </div>
    );
}
