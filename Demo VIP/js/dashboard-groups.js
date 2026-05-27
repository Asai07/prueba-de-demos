// ========================================================
// MÓDULO: AGRUPAMIENTO POR FAMILIA (dashboard-groups.js)
// ========================================================
// Agrupa visualmente las filas de invitados bajo encabezados
// de familia. No modifica Firestore — todo es presentacional.
// El campo opcional `grupo_familia` en cada doc de invitado
// es el que determina el grupo al que pertenece.
// ========================================================

// Estado del módulo (privado)
let _modoGruposActivo = false;
let _ultimoSnapshot = null;

import { getPaqueteContratado } from './dashboard-state.js';

// --------------------------------------------------------
// PALETA DE COLORES POR GRUPO
// 8 colores vibrantes, se asignan ciclicamente por orden de aparición.
// El Map garantiza que cada grupo siempre recibe el mismo color durante la sesión.
// --------------------------------------------------------
const _COLORES_GRUPO = [
    { bg: '#EDE9FE', border: '#7C3AED', text: '#5B21B6', pill: '#DDD6FE', pillText: '#4C1D95' }, // violet
    { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B', pill: '#FECACA', pillText: '#7F1D1D' }, // red
    { bg: '#D1FAE5', border: '#059669', text: '#065F46', pill: '#A7F3D0', pillText: '#064E3B' }, // emerald
    { bg: '#DBEAFE', border: '#2563EB', text: '#1E40AF', pill: '#BFDBFE', pillText: '#1E3A8A' }, // blue
    { bg: '#FEF3C7', border: '#D97706', text: '#92400E', pill: '#FDE68A', pillText: '#78350F' }, // amber
    { bg: '#FCE7F3', border: '#DB2777', text: '#9D174D', pill: '#FBCFE8', pillText: '#831843' }, // pink
    { bg: '#CCFBF1', border: '#0D9488', text: '#115E59', pill: '#99F6E4', pillText: '#134E4A' }, // teal
    { bg: '#E0E7FF', border: '#4F46E5', text: '#312E81', pill: '#C7D2FE', pillText: '#1E1B4B' }, // indigo
];
const _colorIndexMap = new Map(); // nombreGrupo -> index
let _colorCounter = 0;

function _getColorGrupo(nombreGrupo) {
    if (!_colorIndexMap.has(nombreGrupo)) {
        _colorIndexMap.set(nombreGrupo, _colorCounter % _COLORES_GRUPO.length);
        _colorCounter++;
    }
    return _COLORES_GRUPO[_colorIndexMap.get(nombreGrupo)];
}

// --------------------------------------------------------
// toggleAgrupadoPorFamilia()
// Punto de entrada principal — llama desde los botones HTML
// --------------------------------------------------------
window.toggleAgrupadoPorFamilia = function () {
    const paqueteContratado = getPaqueteContratado();
    if (paqueteContratado === 'normal' || paqueteContratado === 'basico') return;

    _modoGruposActivo = !_modoGruposActivo;
    window._modoGrupos = _modoGruposActivo;
    // Persistir preferencia
    localStorage.setItem('gruposDetallesActivo', _modoGruposActivo ? '1' : '0');
    // Actualizar textos e íconos de TODOS los botones toggle
    document.querySelectorAll('.btn-toggle-grupos').forEach(btn => {
        const icono = btn.querySelector('i');
        const texto = btn.querySelector('span.toggle-label');
        if (_modoGruposActivo) {
            btn.classList.add('bg-slate-700', 'hover:bg-slate-800');
            btn.classList.remove('bg-orange-500', 'hover:bg-orange-600', 'shadow-orange-500/20');
            if (icono) { icono.className = 'ph-bold ph-rows text-lg'; }
            if (texto) texto.textContent = 'Vista Normal';
        } else {
            btn.classList.remove('bg-slate-700', 'hover:bg-slate-800');
            btn.classList.add('bg-orange-500', 'hover:bg-orange-600', 'shadow-orange-500/20');
            if (icono) { icono.className = 'ph-bold ph-tree-structure text-lg'; }
            if (texto) texto.textContent = 'Agrupar Familias';
        }
    });

    if (_ultimoSnapshot) {
        if (_modoGruposActivo) {
            _renderGrupoDetalles(_ultimoSnapshot);
        } else {
            // Restaurar render normal de detalles
            if (window._renderCompletoFn) window._renderCompletoFn(_ultimoSnapshot);
        }
    }
};

// --------------------------------------------------------
// actualizarSnapshotGrupos(snapshot)
// Llamado desde dashboard-core.js en cada render para tener
// el snapshot más reciente disponible.
// --------------------------------------------------------
window.actualizarSnapshotGrupos = function (snapshot) {
    const paqueteContratado = getPaqueteContratado();
    const esElPrimero = (_ultimoSnapshot === null);
    _ultimoSnapshot = snapshot;
    window._ultimoSnapshotGrupos = snapshot;

    if (paqueteContratado === 'normal' || paqueteContratado === 'basico') {
        _modoGruposActivo = false;
        window._modoGrupos = false;
        return; // No renderizar colores ni grupos
    }

    // Restaurar preferencia guardada en la primera carga
    if (esElPrimero && localStorage.getItem('gruposDetallesActivo') === '1') {
        _modoGruposActivo = true;
        window._modoGrupos = true;
        // Actualizar apariencia de los botones
        document.querySelectorAll('.btn-toggle-grupos').forEach(btn => {
            const icono = btn.querySelector('i');
            const texto = btn.querySelector('span.toggle-label');
            btn.classList.add('bg-slate-700', 'hover:bg-slate-800');
            btn.classList.remove('bg-orange-500', 'hover:bg-orange-600', 'shadow-orange-500/20');
            if (icono) icono.className = 'ph-bold ph-rows text-lg';
            if (texto) texto.textContent = 'Vista Normal';
        });
    }

    if (_modoGruposActivo) {
        _renderGrupoDetalles(snapshot);
    }
};

// --------------------------------------------------------
// _agrupar(docs, keyFn)
// Agrupa un arreglo de docs por la clave que devuelve keyFn.
// Los docs sin clave van al grupo especial "__sin_grupo__".
// --------------------------------------------------------
function _agrupar(docs, keyFn) {
    const grupos = new Map();
    const sinGrupo = [];
    docs.forEach(d => {
        const key = keyFn(d);
        if (key) {
            if (!grupos.has(key)) grupos.set(key, []);
            grupos.get(key).push(d);
        } else {
            sinGrupo.push(d);
        }
    });
    return { grupos, sinGrupo };
}

// --------------------------------------------------------
// _renderGrupoInvitados(snapshot)
// Re-renderiza tabla-directorio agrupada por grupo_familia
// --------------------------------------------------------
function _renderGrupoInvitados(snapshot) {
    const contenedor = document.getElementById('tabla-directorio');
    if (!contenedor) return;

    // Recolectar docs no-master
    const docs = [];
    snapshot.forEach(d => { if (!d.data().is_master) docs.push(d); });

    const { grupos, sinGrupo } = _agrupar(docs, d => (d.data().grupo_familia || '').trim());

    // Si no hay ningún grupo asignado, mostrar empty state con instrucciones
    if (grupos.size === 0) {
        const sinGrupoHTML = sinGrupo.map(d =>
            window._construirFilaInvitadoFn ? window._construirFilaInvitadoFn(d.id, d.data()) : ''
        ).join('');

        const tpl = document.createElement('template');
        tpl.innerHTML = `
            <tr class="grupo-header-row">
                <td colspan="5" class="px-4 sm:px-8 py-4 bg-gradient-to-r from-violet-50 to-white border-t-2 border-b border-violet-100">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                            <i class="ph-bold ph-info text-base"></i>
                        </div>
                        <div>
                            <p class="font-black text-sm text-violet-800">No hay grupos asignados</p>
                            <p class="text-[11px] text-violet-500 mt-0.5">Edita un invitado y llena el campo <b>Grupo / Familia</b> para empezar a agrupar. El cambio se verá al instante.</p>
                        </div>
                    </div>
                </td>
            </tr>
            ${sinGrupoHTML}`;
        while (contenedor.firstChild) contenedor.removeChild(contenedor.firstChild);
        contenedor.appendChild(tpl.content);
        if (window.aplicarFiltrosGlobales) window.aplicarFiltrosGlobales();
        return;
    }

    let html = '';

    // Grupos con nombre
    grupos.forEach((miembros, nombreGrupo) => {
        const totalPases = miembros.reduce((s, d) => s + (d.data().asistiran || d.data().pases_asignados || 0), 0);
        const confirmados = miembros.filter(d => d.data().estado === 'confirmado').length;
        const pendientes = miembros.filter(d => d.data().estado === 'pendiente').length;
        const declinados = miembros.filter(d => d.data().estado === 'declinado').length;
        const color = _getColorGrupo(nombreGrupo);

        html += _headerRow(nombreGrupo, miembros.length, totalPases, confirmados, pendientes, declinados, 5, false, false, color);
        miembros.forEach(d => {
            if (window._construirFilaInvitadoFn) {
                html += _addColorBorder(window._construirFilaInvitadoFn(d.id, d.data()), color);
            }
        });
    });

    // Invitados sin grupo
    if (sinGrupo.length > 0) {
        html += _separadorRow('Sin grupo asignado', sinGrupo.length, 5);
        sinGrupo.forEach(d => {
            if (window._construirFilaInvitadoFn) {
                html += window._construirFilaInvitadoFn(d.id, d.data());
            }
        });
    }

    if (!html) {
        html = `<tr><td colspan="5" class="text-center py-12 text-secundario">
            <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <i class="ph-fill ph-users-three text-3xl text-gray-300"></i>
            </div>
            <p class="text-primario font-bold">Nadie ha confirmado aún</p></td></tr>`;
    }

    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    while (contenedor.firstChild) contenedor.removeChild(contenedor.firstChild);
    contenedor.appendChild(tpl.content);

    // Re-aplicar filtros de búsqueda si existen
    if (window.aplicarFiltrosGlobales) window.aplicarFiltrosGlobales();
}

// --------------------------------------------------------
// _renderGrupoDetalles(snapshot)
// Re-renderiza tabla-detalles-vip y tabla-detalles-basico
// agrupadas por nombre_familia (agrupamiento automático).
// --------------------------------------------------------
function _renderGrupoDetalles(snapshot) {
    _renderGrupoDetallesVIP(snapshot);
    _renderGrupoDetallesBasico(snapshot);
}

function _renderGrupoDetallesVIP(snapshot) {
    const contenedor = document.getElementById('tabla-detalles-vip');
    if (!contenedor || contenedor.closest('table').classList.contains('hidden')) return;

    const eventoActivoId = localStorage.getItem('cliente_activo_id');

    const docs = [];
    snapshot.forEach(d => {
        const data = d.data();
        
        // CASO ESPECIAL EXCLUSIVO PARA XV AÑOS NATALIA (EVT-J4YX)
        if (eventoActivoId === 'EVT-J4YX' && data.estado === 'confirmado' && (!data.detalles_asistentes || data.detalles_asistentes.length === 0)) {
            data.detalles_asistentes = [{
                nombre: data.integrantes ? data.integrantes : ('Familia ' + (data.nombre_familia || '')),
                mesa: data.mesa || '',
                menu: '-',
                alergias: 'Generado desde importación'
            }];
        }

        if (!data.is_master && data.estado === 'confirmado' && data.detalles_asistentes?.length > 0) {
            docs.push({ id: d.id, data: () => data });
        }
    });

    if (!docs.length) return;

    const { grupos, sinGrupo } = _agrupar(docs, d => (d.data().nombre_familia || '').trim());

    // Calcular número de columnas según flags
    let cols = 3; // Familia + Asistente + Acciones siempre
    const thEdades = document.getElementById('th-edades');
    const thMesa = document.getElementById('th-mesa');
    const thMenu = document.getElementById('th-menu');
    const thAlergias = document.getElementById('th-alergias');
    if (thEdades && !thEdades.classList.contains('hidden')) cols++;
    if (thMesa && !thMesa.classList.contains('hidden')) cols++;
    if (thMenu && !thMenu.classList.contains('hidden')) cols += 2; // Menú + Alergias juntos

    let html = '';

    grupos.forEach((miembros, nombreGrupo) => {
        const totalAsistentes = miembros.reduce((s, d) => s + (d.data().detalles_asistentes?.length || 0), 0);
        const color = _getColorGrupo(nombreGrupo);
        html += _headerRow(nombreGrupo, miembros.length, totalAsistentes, 0, 0, 0, cols, true, false, color);
        miembros.forEach(d => {
            if (window._construirFilasVIPFn) html += _addColorBorder(window._construirFilasVIPFn(d.id, d.data()), color);
        });
    });

    if (sinGrupo.length > 0) {
        if (grupos.size > 0) html += _separadorRow('Sin nombre de familia', sinGrupo.length, cols);
        sinGrupo.forEach(d => {
            if (window._construirFilasVIPFn) html += window._construirFilasVIPFn(d.id, d.data());
        });
    }

    if (!html) return;

    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    while (contenedor.firstChild) contenedor.removeChild(contenedor.firstChild);
    contenedor.appendChild(tpl.content);
}

function _renderGrupoDetallesBasico(snapshot) {
    const contenedor = document.getElementById('tabla-detalles-basico');
    if (!contenedor || contenedor.closest('table').classList.contains('hidden')) return;

    const docs = [];
    snapshot.forEach(d => {
        const data = d.data();
        if (!data.is_master && data.estado === 'confirmado') docs.push(d);
    });

    if (!docs.length) return;

    const { grupos, sinGrupo } = _agrupar(docs, d => (d.data().nombre_familia || '').trim());

    let html = '';

    grupos.forEach((miembros, nombreGrupo) => {
        const totalAsistentes = miembros.reduce((s, d) => s + (d.data().asistiran || 0), 0);
        const color = _getColorGrupo(nombreGrupo);
        html += _headerRow(nombreGrupo, miembros.length, totalAsistentes, 0, 0, 0, 6, false, true, color);
        miembros.forEach(d => {
            if (window._construirFilaBasicaFn) html += _addColorBorder(window._construirFilaBasicaFn(d.id, d.data()), color);
        });
    });

    if (sinGrupo.length > 0) {
        if (grupos.size > 0) html += _separadorRow('Sin nombre de familia', sinGrupo.length, 6);
        sinGrupo.forEach(d => {
            if (window._construirFilaBasicaFn) html += window._construirFilaBasicaFn(d.id, d.data());
        });
    }

    if (!html) return;

    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    while (contenedor.firstChild) contenedor.removeChild(contenedor.firstChild);
    contenedor.appendChild(tpl.content);
}

// --------------------------------------------------------
// _addColorBorder(html, color)
// Inyecta el borde izquierdo de color a TODAS las filas <tr>.
// Usa replaceAll para cubrir múltiples filas (ej. invitados VIP
// que generan varias filas por asistente).
// --------------------------------------------------------
function _addColorBorder(html, color) {
    // Por solicitud del usuario, removemos el borde lateral extra en las filas individuales.
    // Solo el encabezado de familia conserva su banda de color a la izquierda.
    return html;
}

// --------------------------------------------------------
// _headerRow() — genera la fila de encabezado de grupo
// --------------------------------------------------------
function _headerRow(nombre, numFamilias, totalPases, confirmados, pendientes, declinados, cols, esVIP = false, esBasico = false, color = null) {
    const c = color || _COLORES_GRUPO[0];
    const badgesEstado = (!esVIP && !esBasico) ? `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700 border border-green-200">
            <i class="ph-bold ph-check"></i> ${confirmados} conf.
        </span>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 text-orange-600 border border-orange-200">
            <i class="ph-bold ph-hourglass-medium"></i> ${pendientes} pend.
        </span>
        ${declinados > 0 ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-600 border border-red-200">
            <i class="ph-bold ph-x"></i> ${declinados} dec.
        </span>` : ''}
    ` : '';

    const labelPases = totalPases === 1
        ? (esVIP || esBasico ? 'asistente' : 'pase')
        : (esVIP || esBasico ? 'asistentes' : 'pases');

    return `
    <tr class="grupo-header-row" data-grupo="${nombre.replace(/"/g, '&quot;')}" style="border-left: 4px solid ${c.border}; border-image: linear-gradient(to bottom, ${c.border}, ${c.border}40) 1;">
        <td colspan="${cols}" class="px-4 sm:px-8 py-3 bg-slate-50/70 border-y border-slate-100 backdrop-blur-sm">
            <div class="flex items-center gap-3 flex-wrap">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style="background: ${c.pill}; color: ${c.text};">
                    <i class="ph-bold ph-users-three text-sm"></i>
                </div>
                <span class="font-black text-sm" style="color: ${c.text};">${nombre}</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm" style="color: ${c.pillText}; background: ${c.pill}; border-color: ${c.border}20;">
                    ${numFamilias} ${numFamilias === 1 ? 'familia' : 'familias'} &middot; ${totalPases} ${labelPases}
                </span>
                ${badgesEstado}
            </div>
        </td>
    </tr>`;
}

// --------------------------------------------------------
// _separadorRow() — fila divisoria para invitados sin grupo
// --------------------------------------------------------
function _separadorRow(etiqueta, cantidad, cols) {
    return `
    <tr class="grupo-separador-row">
        <td colspan="${cols}" class="px-4 sm:px-8 py-2 bg-slate-50 border-t border-b border-slate-200">
            <div class="flex items-center gap-2">
                <i class="ph-bold ph-dots-three text-slate-400"></i>
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">${etiqueta} (${cantidad})</span>
            </div>
        </td>
    </tr>`;
}

// --------------------------------------------------------
// getGruposUnicos(snapshot)
// Devuelve un Set con todos los grupo_familia del snapshot.
// Usado para alimentar el <datalist> de autocompletado.
// --------------------------------------------------------
window.getGruposUnicos = function (snapshot) {
    const grupos = new Set();
    if (!snapshot) return grupos;
    snapshot.forEach(d => {
        const g = (d.data().grupo_familia || '').trim();
        if (g) grupos.add(g);
    });
    return grupos;
};
