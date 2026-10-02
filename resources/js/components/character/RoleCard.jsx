import { useState } from 'react';
import { getContrastText } from '../../lib/colorPalette';

const SWATCH_HEIGHT = { dominant: 'h-36', secondary: 'h-24', accent: 'h-24' };

/**
 * Tarjeta de un rol (70 / 20 / 10). Su tamaño refleja el peso del rol.
 * Se activa con un clic (los clics en la paleta le asignan color) y acepta
 * colores arrastrados desde la paleta.
 */
export default function RoleCard({ role, color, part, reason, isActive, onSelect, onHover, onPartChange, onDropColor }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const textColor = getContrastText(color.hex);
    const isAccent = role.id === 'accent';

    return (
        <div
            onMouseEnter={() => onHover(role.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(role.id)}
            onBlur={() => onHover(null)}
            onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                onDropColor(event.dataTransfer.getData('text/plain'));
            }}
            className={`flex flex-col gap-3 rounded-2xl border bg-black/25 p-2.5 transition ${
                isActive ? 'border-electric/70 shadow-glow' : 'border-white/10 hover:border-white/20'
            } ${isDragOver ? 'scale-[1.02] border-white/60' : ''}`}
        >
            <button
                type="button"
                onClick={() => onSelect(role.id)}
                aria-pressed={isActive}
                aria-label={`Seleccionar rol ${role.label} (${role.percent}%) para asignarle un color`}
                className={`relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl p-3.5 text-left transition-colors duration-300 ${SWATCH_HEIGHT[role.id]}`}
                style={{
                    backgroundColor: color.hex,
                    color: textColor,
                    boxShadow: isAccent ? `0 0 0 1px rgb(255 255 255 / 0.25), 0 10px 40px -8px ${color.hex}` : undefined,
                }}
            >
                <span className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/20 via-white/0 to-black/10" />
                <span className="relative flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold tracking-widest uppercase">
                        {role.label} · {role.percent}%
                    </span>
                    {isAccent && <SparkIcon />}
                </span>
                <span className="relative flex flex-col">
                    <span className={`font-mono font-medium tracking-tight ${role.id === 'dominant' ? 'text-2xl' : 'text-base'}`}>
                        {color.hex}
                    </span>
                    {color.name && <span className="truncate text-[10px] tracking-wider uppercase opacity-70">{color.name}</span>}
                </span>
            </button>

            <label className="flex flex-col gap-1 px-1">
                <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Parte del personaje</span>
                <input
                    type="text"
                    value={part}
                    onChange={(event) => onPartChange(role.id, event.target.value)}
                    placeholder={role.defaultPart}
                    maxLength={60}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-electric/60 focus:ring-2 focus:ring-electric/30"
                />
            </label>

            {reason && <p className="px-1 text-[11px] leading-snug text-zinc-400">{reason}</p>}
        </div>
    );
}

function SparkIcon() {
    return (
        <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z" />
        </svg>
    );
}
