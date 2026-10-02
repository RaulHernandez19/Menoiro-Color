import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ColorPaletteGenerator from './components/ColorPaletteGenerator';

createRoot(document.getElementById('app')).render(
    <StrictMode>
        <ColorPaletteGenerator />
    </StrictMode>,
);
