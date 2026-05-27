// ========================================================
// MÓDULO: TABLAS, FILTROS Y CHECK-IN (dashboard-tables.js)
// ========================================================
import { db } from './mock-firebase.js';
import { doc, updateDoc, increment } from "./mock-firebase.js";
import { normalize, debounce } from './utils.js';
import { getCheckInMode, toggleCheckInMode, getFlagsEvento, getPaqueteContratado } from './dashboard-state.js';

// --- BUSCADOR Y FILTROS RÁPIDOS ---
const inputBuscador = document.querySelector('input[placeholder="Buscar familia..."]');
const botonesFiltro = document.querySelectorAll('.filtro-btn');
let filtroActivo = 'todos';

window.aplicarFiltrosGlobales = function () {
    const termino = inputBuscador ? normalize(inputBuscador.value).toLowerCase() : '';
    const tablaDirectorio = document.getElementById('tabla-directorio');
    if (!tablaDirectorio) return;

    const filasDirectorio = tablaDirectorio.querySelectorAll('tr.fila-invitado');
    let filasVisibles = 0;

    filasDirectorio.forEach(fila => {
        // PERF-01: textContent no fuerza reflow del layout (innerText sí lo hace)
        const textoFila = normalize(fila.textContent).toLowerCase();
        const estadoFila = fila.getAttribute('data-estado');
        const cumpleTexto = textoFila.includes(termino);
        let cumpleFiltro = false;

        const checkInMode = getCheckInMode();
        if (checkInMode) { cumpleFiltro = (estadoFila === 'confirmado'); }
        else { cumpleFiltro = (filtroActivo === 'todos' || estadoFila === filtroActivo); }

        if (cumpleTexto && cumpleFiltro) {
            fila.style.display = '';
            filasVisibles++;
        } else {
            fila.style.display = 'none';
        }
    });

    // Mostrar mensaje de sin resultados si todas las filas se ocultaron
    let msjFiltro = document.getElementById('tr-sin-resultados-filtro');

    // Obtener la fila genérica de "tabla vacía" ("Aún no hay invitados")
    const trVacioGral = tablaDirectorio.querySelector('tr[td_colspan="5"]:not(.fila-invitado):not(.fila-no-resultados)');
    if (!trVacioGral) {
        // En algunos casos no usa el atributo pero es el único sin class
        const posVacio = Array.from(tablaDirectorio.querySelectorAll('tr')).find(tr => !tr.className || tr.className === '');
        if (posVacio && posVacio.textContent.includes('Aún no hay')) {
            posVacio.style.display = filasDirectorio.length > 0 ? 'none' : '';
        }
    } else {
        trVacioGral.style.display = filasDirectorio.length > 0 ? 'none' : '';
    }

    if (filasVisibles === 0 && filasDirectorio.length > 0) {
        if (!msjFiltro) {
            msjFiltro = document.createElement('tr');
            msjFiltro.id = 'tr-sin-resultados-filtro';
            msjFiltro.className = 'fila-no-resultados';
            msjFiltro.innerHTML = `<td colspan="5" class="text-center py-10 text-secundario"><div class="w-12 h-12 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-2"><i class="ph-bold ph-magnifying-glass text-2xl text-gray-300"></i></div><p class="font-bold text-gray-400">Sin resultados para la búsqueda actual</p></td>`;
            tablaDirectorio.appendChild(msjFiltro);
        }
        msjFiltro.style.display = '';
    } else {
        if (msjFiltro) msjFiltro.style.display = 'none';
    }
};

// Fix #4.2: debounce importado desde utils.js — una sola fuente de verdad
window.debounceFunc = debounce;

if (inputBuscador) {
    inputBuscador.addEventListener('input', debounce(window.aplicarFiltrosGlobales, 300));
}

botonesFiltro.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filtroActivo = e.currentTarget.getAttribute('data-filtro');
        const clasesBase = 'filtro-btn px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap cursor-pointer';

        botonesFiltro.forEach(b => {
            const tipo = b.getAttribute('data-filtro'); b.className = clasesBase;
            if (tipo === 'todos') b.classList.add('bg-white', 'text-brand', 'border-pink-200', 'hover:bg-pink-50');
            if (tipo === 'confirmado') b.classList.add('bg-white', 'text-green-600', 'border-green-200', 'hover:bg-green-50');
            if (tipo === 'pendiente') b.classList.add('bg-white', 'text-orange-500', 'border-orange-200', 'hover:bg-orange-50');
            if (tipo === 'declinado') b.classList.add('bg-white', 'text-red-500', 'border-red-200', 'hover:bg-red-50');
        });

        e.currentTarget.className = clasesBase + ' shadow-sm text-white';
        if (filtroActivo === 'todos') e.currentTarget.classList.add('bg-brand', 'border-brand', 'hover:bg-brand-dark');
        if (filtroActivo === 'confirmado') e.currentTarget.classList.add('bg-green-500', 'border-green-500', 'hover:bg-green-600');
        if (filtroActivo === 'pendiente') e.currentTarget.classList.add('bg-orange-400', 'border-orange-400', 'hover:bg-orange-500');
        if (filtroActivo === 'declinado') e.currentTarget.classList.add('bg-red-500', 'border-red-500', 'hover:bg-red-600');
        window.aplicarFiltrosGlobales();
    });
});

// --- ORDENAMIENTO DE COLUMNAS ---
let columnaOrdenActual = ''; let ordenAscendente = true;
window.cambiarOrden = function (columna) {
    if (columnaOrdenActual === columna) { ordenAscendente = !ordenAscendente; } else { columnaOrdenActual = columna; ordenAscendente = true; }
    document.querySelectorAll('[id^="sort-icon-"]').forEach(icon => { icon.classList.remove('text-brand'); icon.classList.add('text-gray-300'); icon.style.transform = 'rotate(0deg)'; });
    const iconActivo = document.getElementById(`sort-icon-${columna}`);
    if (iconActivo) { iconActivo.classList.remove('text-gray-300'); iconActivo.classList.add('text-brand'); iconActivo.style.display = 'inline-block'; iconActivo.style.transition = 'transform 0.3s ease'; iconActivo.style.transform = ordenAscendente ? 'rotate(0deg)' : 'rotate(180deg)'; }
    window.aplicarOrdenamiento();
};

window.aplicarOrdenamiento = function () {
    const tbody = document.getElementById('tabla-directorio'); if (!tbody || !columnaOrdenActual) return;
    const filas = Array.from(tbody.querySelectorAll('tr.fila-invitado')); if (filas.length === 0) return;

    filas.sort((a, b) => {
        let valA = ''; let valB = '';
        try {
            if (columnaOrdenActual === 'familia') { valA = a.cells[0].textContent.toLowerCase().trim(); valB = b.cells[0].textContent.toLowerCase().trim(); }
            else if (columnaOrdenActual === 'codigo') { valA = a.cells[1].textContent.toLowerCase().trim(); valB = b.cells[1].textContent.toLowerCase().trim(); }
            else if (columnaOrdenActual === 'pases') { valA = parseInt(a.cells[2].textContent) || 0; valB = parseInt(b.cells[2].textContent) || 0; }
            else if (columnaOrdenActual === 'estado') { valA = a.getAttribute('data-estado') || ''; valB = b.getAttribute('data-estado') || ''; }
        } catch (error) { console.warn("Error ordenar:", error); }
        if (valA < valB) return ordenAscendente ? -1 : 1;
        if (valA > valB) return ordenAscendente ? 1 : -1;
        return 0;
    });
    // PERF-05: Usar DocumentFragment para mover filas de una vez, evitando múltiples reflows
    const frag = document.createDocumentFragment();
    filas.forEach(fila => frag.appendChild(fila));
    tbody.appendChild(frag);
};

// --- MODO CHECK-IN (RECEPCIÓN) ---
window.toggleCheckIn = function () {
    const checkInActivo = toggleCheckInMode();
    const btn = document.getElementById('btn-checkin');
    const barraFiltros = document.getElementById('barra-filtros');
    const tabla = document.getElementById('tabla-directorio-container');

    const btnImportar = document.getElementById('btn-importar-excel');
    const btnEscanear = document.getElementById('btn-escanear-qr');

    if (checkInActivo) {
        btn.classList.replace('bg-slate-800', 'bg-brand'); btn.classList.replace('hover:bg-black', 'hover:bg-brand-dark');
        btn.innerHTML = '<i class="ph-bold ph-x-circle text-lg"></i> <span class="hidden sm:inline">Salir de Recepción</span>';
        if (barraFiltros) barraFiltros.style.display = 'none';
        if (tabla) tabla.classList.add('tabla-en-checkin');

        // 🔥 MAGIA: Ocultamos Excel y mostramos Escáner (solo si el evento pide correos)
        if (btnImportar) btnImportar.style.display = 'none';

        const flags = getFlagsEvento();
        if (btnEscanear && flags.flagPedirCorreo) {
            btnEscanear.style.display = 'flex';
        }

        toast.info('Modo Recepción Activado', { className: 'bg-blue-50/90 text-blue-600 border border-blue-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
    } else {
        btn.classList.replace('bg-brand', 'bg-slate-800'); btn.classList.replace('hover:bg-brand-dark', 'hover:bg-black');
        btn.innerHTML = '<i class="ph-bold ph-scan text-lg"></i> <span class="hidden sm:inline">Modo Recepción</span>';
        if (barraFiltros) barraFiltros.style.display = 'flex';
        if (tabla) tabla.classList.remove('tabla-en-checkin');

        // Restauramos los botones a su estado normal
        if (btnEscanear) btnEscanear.style.display = 'none';

        // Solo devolvemos el de Excel si el cliente tiene paquete VIP
        const paqueteContratado = getPaqueteContratado();
        if (btnImportar && paqueteContratado !== 'normal') {
            btnImportar.style.display = 'flex';
        }

        toast.info('Modo Normal Restablecido', { className: 'bg-blue-50/90 text-blue-600 border border-blue-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
    }
    window.aplicarFiltrosGlobales();
};

// Fix #2.4: Usar increment() atómico para evitar race conditions entre hostesses
window.cambiarIngreso = async function (idDoc, cambio, maximo, actual) {
    const nuevoValor = actual + cambio; if (nuevoValor < 0 || nuevoValor > maximo) return;
    try {
        // Eliminado el await para permitir Offline Sync instantáneo en la UI
        updateDoc(doc(db, "invitados", idDoc), { pases_ingresados: increment(cambio) }).catch(e => console.error(e));
    }
    catch (error) { console.error("Error pases:", error); toast.error('Error interno', { className: 'bg-red-50/90 text-red-600 border border-red-100 font-bold shadow-xl backdrop-blur-md rounded-xl' }); }
};

// Fix #3.3 + #4.2: Usa normalize importado y se expone versión con debounce
window.buscarDetallesVIP = function (termino) {
    const textoBuscado = normalize(termino);
    const filas = document.querySelectorAll('.fila-detalle-vip');
    filas.forEach(fila => {
        // PERF-01: textContent en lugar de innerText para evitar reflow
        const contenidoFila = normalize(fila.textContent);
        if (contenidoFila.includes(textoBuscado)) { fila.style.display = ''; }
        else { fila.style.display = 'none'; }
    });
}
window.buscarDetallesVIPDebounced = debounce((termino) => window.buscarDetallesVIP(termino), 300);
