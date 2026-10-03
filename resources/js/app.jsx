import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import ColorPaletteGenerator from './components/ColorPaletteGenerator';

// Cada ventana es una página propia (ver routes/web.php).
const PAGES = {
    lighting: ColorPaletteGenerator,
    palettes: lazy(() => import('./components/palettes/HarmonyPaletteStudio')),
};

const root = document.getElementById('app');
const Page = PAGES[root.dataset.page] ?? ColorPaletteGenerator;

createRoot(root).render(
    <StrictMode>
        <Suspense fallback={null}>
            <Page />
        </Suspense>
    </StrictMode>,
);
