/*
 * Comparte la paleta de Iluminación con la pestaña de Paletas armónicas vía
 * localStorage ("Usar el color de Iluminación").
 */

export const LIGHTING_PALETTE = 'menoiro:lighting-palette';

export function readShared(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
}

export function publishShared(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({ ...data, updatedAt: Date.now() }));
    } catch {
        // Almacenamiento bloqueado (modo privado): no pasa nada, se pierde la sincronización.
    }
}
