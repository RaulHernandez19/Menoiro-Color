import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Copia texto al portapapeles.
 * `navigator.clipboard` solo existe en contextos seguros (HTTPS / localhost),
 * así que en dominios locales tipo `*.test` caemos a `execCommand('copy')`.
 */
async function writeToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);

        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
    } finally {
        document.body.removeChild(textarea);
    }
}

/**
 * Devuelve `[copied, copy]`: `copied` se mantiene en `true` durante
 * `resetAfter` ms tras una copia exitosa, para mostrar feedback visual.
 */
export function useClipboard(resetAfter = 1400) {
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => () => clearTimeout(timeoutRef.current), []);

    const copy = useCallback(
        async (text) => {
            try {
                await writeToClipboard(text);
                setCopied(true);
                clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => setCopied(false), resetAfter);
            } catch {
                setCopied(false);
            }
        },
        [resetAfter],
    );

    return [copied, copy];
}
