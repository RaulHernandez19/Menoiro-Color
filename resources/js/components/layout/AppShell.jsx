const PAGES = [
    { id: 'lighting', label: 'Iluminación', href: '/' },
    { id: 'palettes', label: 'Paletas armónicas', href: '/paletas' },
];

/** Marco común de todas las ventanas: fondo, encabezado y pie. */
export default function AppShell({ page, glowColor = '#7B5CFF', children }) {
    return (
        <div className="relative isolate min-h-screen overflow-hidden">
            <Backdrop color={glowColor} />

            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:gap-10">
                <Header page={page} />
                <main>{children}</main>

                <footer className="flex flex-col items-center justify-between gap-2 border-t border-white/5 pt-6 text-[11px] tracking-wider text-zinc-500 sm:flex-row">
                    <span>Matemática de color en espacio OKLCH · gamut mapping sRGB</span>
                    <span className="tracking-widest uppercase">Menoiro Color</span>
                </footer>
            </div>
        </div>
    );
}

function Header({ page }) {
    return (
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <a href="/" className="flex items-center gap-3">
                <span className="relative grid size-9 place-items-center rounded-xl bg-panel ring-1 ring-white/10 shadow-glow">
                    <span className="size-4 rounded-full bg-[conic-gradient(from_200deg,#7b5cff,#ff8a5c,#ffe08a,#5cc8ff,#7b5cff)] blur-[0.5px]" />
                </span>
                <span className="flex flex-col leading-none">
                    <span className="text-sm font-bold tracking-[0.35em] text-white">MENOIRO</span>
                    <span className="mt-1 text-[10px] tracking-widest text-zinc-500 uppercase">Light & Shadow Palette Engine</span>
                </span>
            </a>

            <nav aria-label="Ventanas" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
                <ul className="flex w-max gap-1 rounded-full border border-white/10 bg-panel/70 p-1 backdrop-blur-xl">
                    {PAGES.map((item) => {
                        const isActive = item.id === page;

                        return (
                            <li key={item.id}>
                                <a
                                    href={item.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold tracking-widest whitespace-nowrap uppercase transition ${
                                        isActive ? 'bg-electric text-white shadow-glow' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    {item.label}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </header>
    );
}

/** Fondo: resplandor púrpura de marca + resplandor del color activo + retícula. */
function Backdrop({ color }) {
    return (
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-electric/20 blur-[120px]" />
            <div
                className="absolute top-40 right-[-10rem] size-[30rem] rounded-full opacity-25 blur-[120px] transition-colors duration-700"
                style={{ backgroundColor: color }}
            />
            <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
                    backgroundSize: '56px 56px',
                    maskImage: 'radial-gradient(ellipse at top, black 20%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at top, black 20%, transparent 70%)',
                }}
            />
        </div>
    );
}
