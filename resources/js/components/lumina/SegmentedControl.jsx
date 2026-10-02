/**
 * Pestañas tipo "radio group": una sola opción activa, navegable con teclado
 * (Tab para entrar, flechas para moverse), como un <input type="radio">.
 */
export default function SegmentedControl({ label, options, value, onChange, columns = 'grid-cols-2', renderPreview }) {
    const handleKeyDown = (event) => {
        const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];

        if (!direction) {
            return;
        }

        event.preventDefault();
        const index = options.findIndex((option) => option.id === value);
        const next = options[(index + direction + options.length) % options.length];
        onChange(next.id);
        event.currentTarget.parentElement.querySelector(`[data-id="${next.id}"]`)?.focus();
    };

    const active = options.find((option) => option.id === value);

    return (
        <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">{label}</span>

            <div role="radiogroup" aria-label={label} className={`grid gap-1.5 rounded-xl border border-white/10 bg-black/30 p-1.5 ${columns}`}>
                {options.map((option) => {
                    const isActive = option.id === value;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            role="radio"
                            data-id={option.id}
                            aria-checked={isActive}
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => onChange(option.id)}
                            onKeyDown={handleKeyDown}
                            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase transition outline-none focus-visible:ring-2 focus-visible:ring-electric/60 ${
                                isActive
                                    ? 'bg-electric/20 text-white shadow-glow'
                                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                            }`}
                        >
                            {renderPreview?.(option, isActive)}
                            {option.label}
                        </button>
                    );
                })}
            </div>

            <p className="min-h-4 text-[11px] leading-snug text-zinc-500">{active?.description}</p>
        </div>
    );
}
