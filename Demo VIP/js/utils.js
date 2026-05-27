// ========================================================
// MÓDULO: UTILIDADES COMPARTIDAS (utils.js)
// Punto único de funciones reutilizables para toda la app.
// ========================================================

/**
 * Sanitiza un string contra XSS — convierte caracteres peligrosos
 * en entidades HTML. Usar siempre antes de inyectar datos externos al DOM.
 * @param {*} str — Valor a sanitizar (acepta null/undefined)
 * @returns {string}
 */
export function sanitize(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Normaliza un string para búsquedas tolerantes a acentos y mayúsculas.
 * Ej: "Sofía" → "sofia"
 * @param {string} str
 * @returns {string}
 */
export function normalize(str) {
    return str
        ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
        : '';
}

/**
 * Debounce profesional — retrasa la ejecución de `fn` hasta que el
 * usuario deje de invocarla por `waitMs` milisegundos.
 * @param {Function} fn
 * @param {number} waitMs
 * @returns {Function}
 */
export function debounce(fn, waitMs) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), waitMs);
    };
}

/**
 * Genera un hash SHA-256 de un string usando la Web Crypto API nativa.
 * Devuelve el hash como string hexadecimal en minúsculas.
 * @param {string} message
 * @returns {Promise<string>}
 */
export async function sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
