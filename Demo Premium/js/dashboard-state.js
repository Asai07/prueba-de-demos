// =======================================================================
// MÓDULO DE ESTADO GLOBAL DEL DASHBOARD (dashboard-state.js)
// Centraliza y protege las variables críticas usadas en la plataforma.
// Reemplaza el uso inseguro de variables "window."
// =======================================================================

const State = {
    // Configuración del Evento (Asentada por dashboard-core.js)
    evento: {
        paqueteContratado: 'normal',
        limitePases: 0,
        flagMostrarMesa: false,
        flagPedirEdades: false,
        flagPedirMenu: false,
        flagPedirNombres: false,
        opcionesMenu: null,
        linkInvitacion: '',
    },

    // Contadores en tiempo real (Asentados por dashboard-core.js / recalcular)
    contadores: {
        totalPasesGenerados: 0,
    },

    // Mensajería WhatsApp (Asentada y modificada por dashboard-wa.js)
    whatsapp: {
        customMsjNuevo: '¡Hola! Te comparto tu invitación...',
        customMsjRecordatorio: '¡Hola! Te recuerdo que tienes pases pendientes...',
        filtroActivoEnvios: 'todos'
    },

    // UI Interactiva y Filtros
    ui: {
        modoCheckInActivo: false,
    },

    // Datos exportables a Excel (Banqueteros y Control de Puerta)
    exportacion: {
        datosBanquete: [],
        datosCompletosVIP: {}
    }
};

// =======================================================================
// GETTERS Y SETTERS PROTEGIDOS
// =======================================================================

// --- Evento ---
export const setPaqueteContratado = (val) => { State.evento.paqueteContratado = val; };
export const getPaqueteContratado = () => State.evento.paqueteContratado;

export const setLimitePases = (val) => { State.evento.limitePases = val; };
export const getLimitePases = () => State.evento.limitePases;

export const setFlagsEvento = (mesa, edades, menu, nombres, correo) => {
    State.evento.flagMostrarMesa = mesa;
    State.evento.flagPedirEdades = edades;
    State.evento.flagPedirMenu = menu;
    State.evento.flagPedirNombres = nombres;
    State.evento.flagPedirCorreo = correo;
};
export const getFlagsEvento = () => State.evento;

export const setOpcionesMenu = (val) => { State.evento.opcionesMenu = val; };
export const getOpcionesMenu = () => State.evento.opcionesMenu || ['Tradicional', 'Vegetariano', 'Vegano', 'Infantil'];

export const setLinkInvitacion = (val) => { State.evento.linkInvitacion = val; };
export const getLinkInvitacion = () => State.evento.linkInvitacion;

// --- Contadores ---
export const setTotalPasesGenerados = (val) => { State.contadores.totalPasesGenerados = val; };
export const getTotalPasesGenerados = () => State.contadores.totalPasesGenerados;

// --- WhatsApp ---
export const setMensajesWA = (nuevo, recordatorio) => {
    State.whatsapp.customMsjNuevo = nuevo;
    State.whatsapp.customMsjRecordatorio = recordatorio;
};
export const getMensajesWA = () => State.whatsapp;

export const setFiltroEnviosWA = (val) => { State.whatsapp.filtroActivoEnvios = val; };
export const getFiltroEnviosWA = () => State.whatsapp.filtroActivoEnvios;

// --- UI ---
export const toggleCheckInMode = () => { State.ui.modoCheckInActivo = !State.ui.modoCheckInActivo; return State.ui.modoCheckInActivo; };
export const getCheckInMode = () => State.ui.modoCheckInActivo;

// --- Exportación ---
export const resetDatosExportacion = () => {
    State.exportacion.datosBanquete = [];
    State.exportacion.datosCompletosVIP = {};
};
export const addDatoBanquete = (dato) => { State.exportacion.datosBanquete.push(dato); };
export const getDatosBanquete = () => State.exportacion.datosBanquete;

export const setDatosCompletosVIP = (idDoc, detalles) => { State.exportacion.datosCompletosVIP[idDoc] = detalles; };
export const getDatosCompletosVIP = () => State.exportacion.datosCompletosVIP;
