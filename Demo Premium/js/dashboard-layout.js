// ========================================================
// MÓDULO: RENDERIZADO Y REGLAS DE UI (dashboard-layout.js)
// ========================================================

import { getFlagsEvento, getPaqueteContratado, getOpcionesMenu } from './dashboard-state.js';

window.aplicarReglasSeguridadBase = function () {
    const paqueteContratado = getPaqueteContratado();
    const flags = getFlagsEvento();
    const flagEvtPedirEdades = flags.flagPedirEdades;
    const flagEvtPedirNombres = flags.flagPedirNombres;
    const flagEvtPedirMenu = flags.flagPedirMenu;
    const flagEvtMostrarMesa = flags.flagMostrarMesa;
    const flagEvtPedirCorreo = flags.flagPedirCorreo;
    const vistaInvitaciones = document.getElementById('vista-invitaciones');

    // --- MAGIA FASE 3: OCULTAR/MOSTRAR COLUMNAS DINÁMICAMENTE ---
    const thEdades = document.getElementById('th-edades');
    const thMesa = document.getElementById('th-mesa');
    const thMenu = document.getElementById('th-menu');
    const thAlergias = document.getElementById('th-alergias');
    // --- MAGIA: TABLA VIP VS TABLA BÁSICA ---
    const tablaVIP = document.getElementById('tabla-modo-vip');
    const tablaBasica = document.getElementById('tabla-modo-basico');

    // 1. SUBTÍTULO INTELIGENTE Y DINÁMICO
    const subtituloDetalles = document.getElementById('subtitulo-detalles');

    if (subtituloDetalles) {
        let modulos = [];
        if (flagEvtPedirEdades) modulos.push("edades");
        if (flagEvtMostrarMesa) modulos.push("mesas");
        if (flagEvtPedirMenu) modulos.push("platillos");

        if (modulos.length > 0) {
            // Une las palabras con comas y pone una "y" en la última (Ej: edades, mesas y platillos)
            let textoModulos = modulos.join(", ").replace(/, ([^,]*)$/, " y $1");
            subtituloDetalles.innerText = `Desglose individual para control de ${textoModulos}.`;
        } else {
            subtituloDetalles.innerText = `Desglose general de asistentes registrados.`;
        }
    }

    // 2. MOSTRAR LA TABLA CORRECTA Y CONTROLES
    const btnMasivoVIP = document.getElementById('btn-select-all-vip');
    const btnGruposDetalles = document.getElementById('btn-toggle-grupos-detalles'); // Módulo de grupos

    if (paqueteContratado === 'vip') {
        if (tablaVIP) tablaVIP.classList.remove('hidden');
        if (tablaBasica) tablaBasica.classList.add('hidden');
        if (btnMasivoVIP) btnMasivoVIP.classList.remove('hidden'); // Lo mostramos en VIP
        if (btnGruposDetalles) btnGruposDetalles.style.display = 'flex'; // Activo para VIP
    } else {
        if (tablaVIP) tablaVIP.classList.add('hidden');
        if (tablaBasica) tablaBasica.classList.remove('hidden');
        if (btnMasivoVIP) btnMasivoVIP.classList.add('hidden'); // Lo ocultamos en Básico
        if (btnGruposDetalles) btnGruposDetalles.style.display = 'none'; // Desactivado para Normal/Básico
    }

    // Fix #4: Se eliminó bloque duplicado de visibilidad de tablas que estaba abajo de éste
    if (thEdades) thEdades.style.display = flagEvtPedirEdades ? '' : 'none';
    if (thMesa) thMesa.style.display = flagEvtMostrarMesa ? '' : 'none';
    if (thMenu) thMenu.style.display = flagEvtPedirMenu ? '' : 'none';
    if (thAlergias) thAlergias.style.display = flagEvtPedirMenu ? '' : 'none';

    // --- MAGIA FASE 3.1: OCULTAR/MOSTRAR TARJETAS SUPERIORES ---
    const cardEdades = document.getElementById('tarjeta-edades');
    const cardDietas = document.getElementById('tarjeta-dietas');
    const cardMenu = document.getElementById('tarjeta-menu');
    const cardMesas = document.getElementById('tarjeta-mesas');
    const cardCorreo = document.getElementById('ajustes-correo-container');

    if (cardEdades) cardEdades.style.display = flagEvtPedirEdades ? 'flex' : 'none';
    // Solo mostrar tarjeta de Dietas si el evento tiene Vegetariano o Vegano entre sus opciones
    const opcionesMenu = getOpcionesMenu();
    const tieneDietas = opcionesMenu.includes('Vegetariano') || opcionesMenu.includes('Vegano');
    if (cardDietas) cardDietas.style.display = (flagEvtPedirMenu && tieneDietas) ? 'flex' : 'none';
    if (cardMenu) cardMenu.style.display = flagEvtPedirMenu ? 'flex' : 'none';
    if (cardMesas) cardMesas.style.display = flagEvtMostrarMesa ? 'block' : 'none';
    // Solo mostramos el módulo de Mailings si tienen la bandera de correo activa
    if (cardCorreo) cardCorreo.style.display = flagEvtPedirCorreo ? 'flex' : 'none';

    const htmlGestorEnviosVIP = `
        <div class="bg-white rounded-2xl shadow-suave border border-pink-50 overflow-hidden flex flex-col min-h-[70vh]">
            <div class="px-4 sm:px-8 py-4 sm:py-6 border-b border-pink-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                <div><h2 class="text-lg sm:text-xl font-bold text-primario">Gestor de Envíos WhatsApp</h2></div>
                <div class="relative w-full sm:w-64 shrink-0">
                    <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="buscador-envios" oninput="if(window._debouncedFiltrosEnvios){ window._debouncedFiltrosEnvios(); } else if(window.aplicarFiltrosEnvios) { window.aplicarFiltrosEnvios(); }" placeholder="Buscar familia..." class="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all">
                </div>
            </div>
            <div class="px-4 sm:px-8 py-3 bg-gray-50/40 border-b border-pink-50 flex items-center gap-2.5 overflow-x-auto hide-scrollbar filtros-bar-ios">
                <button onclick="window.cambiarFiltroEnvios('todos', this)" class="filtro-btn-envios px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap shadow-sm text-white bg-brand border-brand hover:bg-brand-dark" data-filtro="todos">Todos</button>
                <button onclick="window.cambiarFiltroEnvios('pendientes_enviar', this)" class="filtro-btn-envios px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap bg-white text-green-600 border-green-200 hover:bg-green-50" data-filtro="pendientes_enviar">Pendientes de enviar</button>
                <button onclick="window.cambiarFiltroEnvios('recordatorios', this)" class="filtro-btn-envios px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap bg-white text-orange-500 border-orange-200 hover:bg-orange-50" data-filtro="recordatorios">Recordatorios</button>
                <button onclick="window.cambiarFiltroEnvios('respondidos', this)" class="filtro-btn-envios px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap bg-white text-secundario border-gray-200 hover:bg-gray-50" data-filtro="respondidos">Confirmados / Declinados</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left min-w-max"><tbody id="tabla-envios" class="divide-y divide-gray-50"></tbody></table>
            </div>
        </div>`;

    const htmlGestorEnviosBasico = `
        <div class="bg-white rounded-2xl shadow-suave border border-pink-50 overflow-hidden flex flex-col">
            <div class="px-6 lg:px-8 py-6 border-b border-pink-50 bg-white">
                <h2 class="text-xl font-bold text-primario">Mensaje de Invitación</h2>
                <p class="text-sm text-secundario mt-1">Plantilla sugerida. Puedes editar este texto, copiarlo y enviarlo a tus invitados por tu cuenta.</p>
            </div>
            <div class="p-6 lg:p-8">
                <textarea id="texto-wa" rows="8" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-primario focus:outline-none focus:ring-2 focus:ring-brand transition-all"></textarea>
                <div class="mt-4 flex justify-end">
                    <button onclick="navigator.clipboard.writeText(document.getElementById('texto-wa').value); toast.success('Mensaje copiado', { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' })" class="bg-brand hover:bg-brand-dark text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-brand/30 transition-all flex items-center gap-2 transform hover:-translate-y-0.5">
                        <i class="ph-bold ph-copy text-lg"></i> Copiar Mensaje
                    </button>
                </div>
            </div>
        </div>`;

    if (paqueteContratado === 'normal') {
        if (document.getElementById('btn-nuevo-invitado')) document.getElementById('btn-nuevo-invitado').style.display = 'none';
        if (document.getElementById('btn-importar-excel')) document.getElementById('btn-importar-excel').style.display = 'none';
        if (document.getElementById('tab-codigos')) document.getElementById('tab-codigos').classList.remove('hidden');

        if (document.getElementById('tab-ajustes')) { document.getElementById('tab-ajustes').classList.add('hidden'); document.getElementById('tab-ajustes').style.display = 'none'; }

        // CORRECCIÓN: Revisar si tienen mesa o alguna función VIP a la carta
        if (flagEvtPedirEdades || flagEvtPedirNombres || flagEvtPedirMenu || flagEvtMostrarMesa) {
            if (document.getElementById('tab-detalles')) {
                document.getElementById('tab-detalles').classList.remove('hidden');
                document.getElementById('tab-detalles').style.display = 'flex';
            }
        } else {
            if (document.getElementById('tab-detalles')) {
                document.getElementById('tab-detalles').classList.add('hidden');
                document.getElementById('tab-detalles').style.display = 'none';
            }
        }

        if (vistaInvitaciones && typeof htmlGestorEnviosBasico !== 'undefined') vistaInvitaciones.innerHTML = htmlGestorEnviosBasico;
    } else {
        if (document.getElementById('tab-codigos')) document.getElementById('tab-codigos').classList.remove('hidden');
        const subtituloCodigos = document.querySelector('#vista-codigos p');
        if (subtituloCodigos) subtituloCodigos.innerText = "Estos son los códigos únicos y personalizados para cada una de tus familias invitadas.";

        if (document.getElementById('tab-ajustes')) {
            document.getElementById('tab-ajustes').classList.remove('hidden');
            document.getElementById('tab-ajustes').style.display = 'flex';
        }

        // CORRECCIÓN: La pestaña Detalles ahora se activa si tienen cualquiera de las 4 funciones
        if (flagEvtPedirEdades || flagEvtPedirNombres || flagEvtPedirMenu || flagEvtMostrarMesa) {
            if (document.getElementById('tab-detalles')) {
                document.getElementById('tab-detalles').classList.remove('hidden');
                document.getElementById('tab-detalles').style.display = 'flex';
            }
        } else {
            if (document.getElementById('tab-detalles')) {
                document.getElementById('tab-detalles').classList.add('hidden');
                document.getElementById('tab-detalles').style.display = 'none';
            }
        }

        if (vistaInvitaciones && typeof htmlGestorEnviosVIP !== 'undefined') vistaInvitaciones.innerHTML = htmlGestorEnviosVIP;
    }
}
