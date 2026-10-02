import chroma from 'chroma-js';
import { useClipboard } from '../../hooks/useClipboard';

/**
 * Tarjeta de una variación: el fondo ES el color generado y el texto
 * alterna blanco/negro según el contraste calculado en la paleta.
 * Clic en cualquier parte ⇒ copia el HEX con feedback "¡Copiado!".
 */
export default function ColorCard({ color, index, isBase = false }) {
    const [copied, copy] = useClipboard();
    const glow = chroma(color.hex).alpha(0.55).css();

    return (
        <button
            type="button"
            onClick={() => copy(color.hex)}
            aria-label={`Copiar ${color.name} ${color.hex}`}
            className="group animate-rise relative flex aspect-[4/5] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl p-4 text-left ring-1 ring-white/10 transition-[transform,box-shadow] duration-300 ease-out outline-none hover:z-10 hover:scale-105 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-electric sm:p-5"
            style={{
                backgroundColor: color.hex,
                color: color.textColor,
                animationDelay: `${index * 45}ms`,
                '--card-glow': glow,
            }}
        >
            {/* Brillo vítreo superior + glow con el propio color al hacer hover */}
            <span className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/20 via-white/0 to-black/10" />
            <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 shadow-[0_24px_60px_-12px_var(--card-glow)] transition-opacity duration-300 group-hover:opacity-100" />

            <span className="relative flex items-start justify-between gap-2">
                <span className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold tracking-widest uppercase">{color.name}</span>
                    <span className="text-[10px] tracking-wider uppercase opacity-60">{color.nameEn}</span>
                </span>

                {isBase && (
                    <span className="rounded-full border border-current/30 px-2 py-0.5 text-[9px] font-semibold tracking-widest uppercase">
                        Base
                    </span>
                )}
            </span>

            <span className="relative flex flex-col gap-2">
                <span className="hidden text-[11px] leading-snug opacity-70 sm:block">{color.role}</span>

                <span className="font-mono text-lg font-medium tracking-tight sm:text-xl">{color.hex}</span>

                <span className="flex flex-col gap-0.5 font-mono text-[10px] opacity-75 sm:text-[11px]">
                    <span>
                        RGB {color.rgb.r} · {color.rgb.g} · {color.rgb.b}
                    </span>
                    <span>
                        HSL {color.hsl.h}° · {color.hsl.s}% · {color.hsl.l}%
                    </span>
                </span>

                <span className="mt-1 flex h-6 items-center">
                    {copied ? (
                        <span
                            role="status"
                            className="animate-pop inline-flex items-center gap-1.5 rounded-full bg-black/80 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-white uppercase shadow-lg"
                        >
                            <CheckIcon />
                            ¡Copiado!
                        </span>
                    ) : (
                        <span className="inline-flex translate-y-1 items-center gap-1.5 rounded-full border border-current/25 px-2.5 py-1 text-[10px] font-semibold tracking-widest uppercase opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-90 group-focus-visible:translate-y-0 group-focus-visible:opacity-90">
                            <CopyIcon />
                            Copiar HEX
                        </span>
                    )}
                </span>
            </span>
        </button>
    );
}

function CopyIcon() {
    return (
        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="m5 12 5 5L20 7" />
        </svg>
    );
}
