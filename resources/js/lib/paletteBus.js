import { useEffect, useState } from 'react';

/*
 * Bus de paletas entre ventanas del mismo navegador.
 *
 * El generador de iluminación y el de paletas armónicas PUBLICAN su paleta;
 * el módulo de personaje (que se abre en otra pestaña) se SUSCRIBE y se
 * actualiza en vivo. Usamos BroadcastChannel para el aviso instantáneo y
 * localStorage para que una pestaña recién abierta lea el último valor.
 */

export const LIGHTING_PALETTE = 'menoiro:lighting-palette';
export const HARMONY_PALETTE = 'menoiro:harmony-palette';

const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('menoiro-color');

export function readShared(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
}

export function publishShared(key, data) {
    const message = { ...data, updatedAt: Date.now() };

    try {
        localStorage.setItem(key, JSON.stringify(message));
    } catch {
        // Almacenamiento bloqueado (modo privado): el canal sigue funcionando.
    }

    channel?.postMessage({ key, message });
}

/** Último valor publicado bajo `key`, actualizado en vivo. */
export function useSharedPalette(key) {
    const [value, setValue] = useState(() => readShared(key));

    useEffect(() => {
        const handleMessage = (event) => event.data?.key === key && setValue(event.data.message);
        // Respaldo para navegadores sin BroadcastChannel.
        const handleStorage = (event) => event.key === key && setValue(readShared(key));

        channel?.addEventListener('message', handleMessage);
        window.addEventListener('storage', handleStorage);

        return () => {
            channel?.removeEventListener('message', handleMessage);
            window.removeEventListener('storage', handleStorage);
        };
    }, [key]);

    return value;
}
