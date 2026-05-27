// js/dashboard-core.js
import { db, auth } from './mock-firebase.js';
import { collection, query, where, onSnapshot, doc, getDoc, limit, serverTimestamp, writeBatch } from "./mock-firebase.js";
import { onAuthStateChanged } from "./mock-firebase.js";
import { sanitize } from './utils.js';
import {
    setPaqueteContratado, setLimitePases, setFlagsEvento, setLinkInvitacion, setMensajesWA,
    setTotalPasesGenerados, addDatoBanquete, setDatosCompletosVIP, getPaqueteContratado,
    getFlagsEvento, getCheckInMode, getDatosCompletosVIP, resetDatosExportacion, getLimitePases,
    getLinkInvitacion, setOpcionesMenu, getOpcionesMenu
} from './dashboard-state.js';

// Guard 1: Redirección inmediata síncrona visual
const eventoActivoId = localStorage.getItem('cliente_activo_id');
if (!eventoActivoId) { console.log('Bypassed redirect to index.html'); }

// Guard 2: Validación asíncrona robusta con Firebase Auth
// IMPORTANTE: arrancarDashboard() se llama AQUÍ, dentro del callback, para garantizar
// que el token de Auth ya esté resuelto antes de abrir el listener de Firestore.
// En Safari/Mac el token tarda más en restaurarse; llamarlo fuera causaría
// "Missing or insufficient permissions" en la primera carga.
let dashboardArrancoUnaVez = false;
onAuthStateChanged(auth, (user) => {
    if (!user && localStorage.getItem('cliente_activo_key') === 'auth_managed') {
        localStorage.clear();
        console.log('Bypassed redirect to index.html');
        return;
    }
    // Arrancar solo una vez (onAuthStateChanged puede dispararse varias veces)
    if (!dashboardArrancoUnaVez) {
        dashboardArrancoUnaVez = true;
        arrancarDashboard();
    }
});

const statTotales = document.querySelectorAll('.shadow-card h3')[0];
const statConfirmados = document.querySelectorAll('.shadow-card h3')[1];
const statPendientes = document.querySelectorAll('.shadow-card h3')[2];
const statDeclinados = document.querySelectorAll('.shadow-card h3')[3];

const tablaDirectorio = document.getElementById('tabla-directorio');
const tablaCodigos = document.getElementById('tabla-codigos');
const tablaUltimos = document.querySelector('#vista-dashboard table tbody');
const totalRegistrosText = document.getElementById('total-registros');

let limitePasesEvento = 0;
window.datosCompletosVIP = {};   // Inicializado aquí para evitar crash en dashboard-ui.js si se accede antes de primer render VIP
let primeraCargaDashboard = true;

async function cargarDatosEvento() {
    try {
        const eventoRef = doc(db, "eventos", eventoActivoId);
        const eventoSnap = await getDoc(eventoRef);
        if (eventoSnap.exists()) {
            const evData = eventoSnap.data();

            // --- SEGURIDAD: VERIFICACIÓN HARDCORE DEL LOCALSTORAGE ---
            const eventoActivoKey = localStorage.getItem('cliente_activo_key');
            // Fix #1.7: Permitir el paso si el inicio de sesión fue delegado a Firebase Auth Segura
            if (evData.password !== eventoActivoKey && eventoActivoKey !== 'auth_managed') {
                // Alguien intentó colarse o cambiaron la contraseña
                localStorage.clear();
                console.log('Bypassed redirect to index.html');
                return;
            }

            // 1. Asentar Estado Global Seguro
            setPaqueteContratado(evData.paquete_contratado || 'normal');
            setLimitePases(evData.limite_pases || 50);
            setFlagsEvento(
                evData.mostrar_mesa || false,
                evData.pedir_edades || false,
                evData.pedir_menu || false,
                evData.pedir_nombres || false,
                evData.pedir_correo || false
            );
            setLinkInvitacion(evData.link_invitacion || 'https://eventoclic.com/');
            setOpcionesMenu(evData.opciones_menu || null);

            const nombreCliente = sanitize(evData.nombre_cliente || 'Usuario');
            localStorage.setItem('cliente_nombre', nombreCliente.split(' ')[0]);
            if (document.getElementById('header-nombre')) document.getElementById('header-nombre').innerText = `Hola, ${nombreCliente.split(' ')[0]}`;

            // 1. Definimos los textos usando Códigos Universales (Inmunes a errores de Windows)
            const msjNuevoDef = "\u00a1Hola Familia [FAMILIA]! \uD83C\uDF1F\n\nHemos reservado *[PASES] pase(s)* para ustedes.\n\n\uD83C\uDFAB *C\u00f3digo:* [CODIGO]\n\uD83D\uDC49 *Confirmar aqu\u00ed:* [LINK]";
            const msjRecDef = "\u00a1Hola Familia [FAMILIA]! \uD83C\uDF1F\n\nFaltan pocos d\u00edas para nuestro evento y nos encantar\u00eda saber si contaremos con su asistencia.\n\n\uD83C\uDFAB *C\u00f3digo:* [CODIGO]\n\uD83D\uDC49 *Confirmar aqu\u00ed:* [LINK]";

            let textoNuevoFirebase = evData.msj_nuevo || "";
            let textoRecFirebase = evData.msj_recordatorio || "";

            // 2. AUTO-REPARACIÓN: Si detecta el dato envenenado ( o ??), lo purga y usa el limpio
            let customMsjNuevo = msjNuevoDef;
            if (textoNuevoFirebase && !textoNuevoFirebase.includes('\uFFFD') && !textoNuevoFirebase.includes('??')) {
                customMsjNuevo = textoNuevoFirebase;
            }

            let customMsjRecordatorio = msjRecDef;
            if (textoRecFirebase && !textoRecFirebase.includes('\uFFFD') && !textoRecFirebase.includes('??')) {
                customMsjRecordatorio = textoRecFirebase;
            }
            setMensajesWA(customMsjNuevo, customMsjRecordatorio);

            // Construye la interfaz llamando al nuevo archivo
            if (window.aplicarReglasSeguridadBase) window.aplicarReglasSeguridadBase();

            // Restaurar pestaña activa (se hace aquí, no en DOMContentLoaded,
            // porque las reglas de visibilidad ya están aplicadas en este punto)
            const pestanaGuardada = localStorage.getItem('pestanaActiva');
            if (pestanaGuardada && pestanaGuardada !== 'dashboard' && window.cambiarPestana) {
                window.cambiarPestana(pestanaGuardada);
            }

            if (document.getElementById('ajuste-msj-nuevo')) document.getElementById('ajuste-msj-nuevo').value = customMsjNuevo;
            if (document.getElementById('ajuste-msj-recordatorio')) document.getElementById('ajuste-msj-recordatorio').value = customMsjRecordatorio;
            // --- CARGAR DATOS DE CAMPAÑA DE CORREO ---
            if (document.getElementById('ajuste-mail-asunto')) {
                document.getElementById('ajuste-mail-asunto').value = evData.mail_asunto || '';
                document.getElementById('ajuste-mail-mensaje').value = evData.mail_mensaje || '';

                // Cargar Toggles y Valores Dinámicos
                const chkHora = document.getElementById('chk-mail-hora');
                const chkBtn = document.getElementById('chk-mail-boton');
                const chkQR = document.getElementById('chk-mail-qr');

                if (chkHora) {
                    chkHora.checked = evData.mail_inc_hora || false;

                    document.getElementById('ajuste-mail-h1-icon').value = evData.mail_h1_icon || '💍';
                    document.getElementById('ajuste-mail-h1-tit').value = evData.mail_h1_tit || 'Ceremonia';
                    document.getElementById('ajuste-mail-h1').value = evData.mail_h1 || '';

                    document.getElementById('ajuste-mail-h2-icon').value = evData.mail_h2_icon || '🥂';
                    document.getElementById('ajuste-mail-h2-tit').value = evData.mail_h2_tit || 'Recepción';
                    document.getElementById('ajuste-mail-h2').value = evData.mail_h2 || '';

                    document.getElementById('ajuste-mail-h3-icon').value = evData.mail_h3_icon || '🍽️';
                    document.getElementById('ajuste-mail-h3-tit').value = evData.mail_h3_tit || 'Banquete';
                    document.getElementById('ajuste-mail-h3').value = evData.mail_h3 || '';

                    document.getElementById('ajuste-mail-h4-icon').value = evData.mail_h4_icon || '🪩';
                    document.getElementById('ajuste-mail-h4-tit').value = evData.mail_h4_tit || 'Fiesta';
                    document.getElementById('ajuste-mail-h4').value = evData.mail_h4 || '';

                    document.getElementById('div-mail-hora').classList.toggle('hidden', !chkHora.checked);
                }
                if (chkBtn) {
                    chkBtn.checked = evData.mail_inc_btn || false;
                    document.getElementById('ajuste-mail-btn-texto').value = evData.mail_btn_texto || '📍 Ver Ubicación (Mapa)';
                    document.getElementById('ajuste-mail-mapa').value = evData.mail_mapa || '';
                    document.getElementById('div-mail-boton').classList.toggle('hidden', !chkBtn.checked);
                }
                if (chkQR) {
                    chkQR.checked = evData.mail_inc_qr !== false; // True por defecto
                }

                // Cargar la plantilla seleccionada
                let templateGuardada = evData.mail_template || 'boda';
                document.querySelectorAll('input[name="mail-template"]').forEach(radio => {
                    if (radio.value === templateGuardada) radio.checked = true;
                });

                // Calcular usos restantes
                let usosMail = evData.mail_usos || 0;
                let restantes = Math.max(0, 3 - usosMail);
                if (document.getElementById('mail-usos-restantes')) {
                    const badgeUsos = document.getElementById('mail-usos-restantes');
                    badgeUsos.innerText = restantes;
                    if (restantes === 0) badgeUsos.classList.replace('text-primario', 'text-red-500');
                }
            }
            // -----------------------------------------
            const tipo = evData.tipo_evento ? `${evData.tipo_evento} ` : '';
            if (document.getElementById('sidebar-evento-nombre')) document.getElementById('sidebar-evento-nombre').innerText = `${tipo}${evData.nombre_evento}`;

            if (evData.fecha_evento) {
                const hoy = new Date(); const fechaEvt = new Date(evData.fecha_evento + 'T12:00:00');
                const dif = Math.ceil((fechaEvt.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
                if (document.getElementById('sidebar-evento-fecha')) document.getElementById('sidebar-evento-fecha').innerText = dif > 0 ? `Faltan ${dif} días` : (dif === 0 ? '¡Es hoy! 🎉' : 'Evento finalizado');
            }
        }
    } catch (error) { console.error(error); }
}

// ========================================================
// FIX #9: CONSTRUCTORES DE FILAS — funciones puras reutilizables
// Extraídas del loop original para poder llamarlas también en
// las actualizaciones incrementales con docChanges().
// ========================================================

// Helper: obtiene el timestamp de un doc (en milisegundos) para ordenamiento.
// Usa fecha_confirmacion si se pide y existe; si no, fecha_creacion; si no, 0.
function getDocTimestamp(d, usarFechaConfirmacion = false) {
    const data = d.data();
    if (usarFechaConfirmacion) {
        const fc = data.fecha_confirmacion;
        if (fc && typeof fc.toMillis === 'function') return fc.toMillis();
    }
    const cr = data.fecha_creacion;
    return cr && typeof cr.toMillis === 'function' ? cr.toMillis() : 0;
}

// Helper: prioridad de estado para el orden de la tabla
function getEstadoPrioridad(d) {
    const estado = d.data().estado;
    if (estado === 'confirmado') return 0;
    if (estado === 'pendiente') return 1;
    if (estado === 'declinado') return 2;
    return 3; // sin estado (códigos master)
}

// Helper: ordena los docs — confirmados arriba, luego pendientes, luego declinados.
// Dentro de confirmados: por fecha de confirmación (más reciente primero).
// Dentro del resto: por fecha de creación (más reciente primero).
// Los códigos master (is_master) siempre al final del todo.
function sortDocs(snapshot) {
    const arr = [];
    snapshot.forEach(d => arr.push(d));
    arr.sort((a, b) => {
        const aData = a.data(); const bData = b.data();
        // Códigos master siempre al fondo
        if (aData.is_master && !bData.is_master) return 1;
        if (!aData.is_master && bData.is_master) return -1;
        // Ordenar por estado (confirmado → pendiente → declinado)
        const pA = getEstadoPrioridad(a); const pB = getEstadoPrioridad(b);
        if (pA !== pB) return pA - pB;
        // Dentro del mismo estado, más reciente primero
        // Para confirmados usamos fecha_confirmacion; para el resto fecha_creacion
        const usarConf = aData.estado === 'confirmado';
        return getDocTimestamp(b, usarConf) - getDocTimestamp(a, usarConf);
    });
    return arr;
}

function construirFilaInvitado(idDoc, data) {
    const paqueteContratado = getPaqueteContratado();
    const flags = getFlagsEvento();
    const sFamilia = sanitize(data.nombre_familia);
    const sCodigoOrigen = sanitize(data.codigo_origen || idDoc);
    const sQuienConfirma = sanitize(data.quien_confirma);
    const sIntegrantes = sanitize(data.integrantes);

    let badge = '';
    if (data.estado === 'confirmado') { badge = `<span class="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold bg-green-50 text-green-600 border border-green-100"><i class="ph-bold ph-check"></i> Confirmado</span>`; }
    else if (data.estado === 'declinado') { badge = `<span class="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold bg-red-50 text-red-600 border border-red-100"><i class="ph-bold ph-x"></i> Declinado</span>`; }
    else { badge = `<span class="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold bg-orange-50 text-orange-400 border border-orange-100"><i class="ph-bold ph-hourglass-medium"></i> Pendiente</span>`; }

    const iniciales = (sFamilia || 'F').substring(0, 2).toUpperCase();
    const textoLlave = paqueteContratado === 'vip' ? '' : `<p class="text-[9px] sm:text-[10px] text-secundario uppercase mt-0.5 font-medium">Usó llave: ${sCodigoOrigen || 'No registrada'}</p>`;

    let textoIntegrantes = '';
    if (data.estado === 'pendiente' && data.integrantes) { textoIntegrantes = `<p class="text-[10px] sm:text-[11px] text-secundario mt-0.5"><i class="ph-fill ph-users mr-1"></i>${sIntegrantes}</p>`; }
    else if (data.estado === 'confirmado' && data.quien_confirma) { textoIntegrantes = `<p class="text-[10px] sm:text-[11px] text-green-600 mt-0.5 font-medium"><i class="ph-bold ph-check mr-1"></i>Confirmado: ${sQuienConfirma}</p>`; }
    else if (data.estado === 'declinado' && data.quien_confirma) { textoIntegrantes = `<p class="text-[10px] sm:text-[11px] text-red-500 mt-0.5 font-medium"><i class="ph-bold ph-x mr-1"></i>Declinado: ${sQuienConfirma}</p>`; }

    let textoEdades = '';
    if (flags.flagPedirEdades && data.estado === 'confirmado') { textoEdades = `<div class="mt-1.5"><span class="inline-flex items-center gap-2 text-[10px] font-bold text-brand bg-orange-50 border border-orange-100 px-2 py-0.5 rounded shadow-sm">👨 ${data.adultos || 0} Adultos <span class="text-orange-200">|</span> 🧸 ${data.ninos || 0} Niños</span></div>`; }

    const datosSeguros = encodeURIComponent(JSON.stringify(data));
    const ingresados = data.pases_ingresados || 0;
    const filaCompletada = (ingresados >= data.asistiran && data.estado === 'confirmado') ? 'fila-completada' : '';

    // --- INICIO LÓGICA DE MESA PARA EL CHECKIN ---
    let textoMesaCheckin = '';
    const sMesaGeneral = sanitize(data.mesa || '').trim();
    if (paqueteContratado === 'vip' && data.detalles_asistentes && data.detalles_asistentes.length > 0) {
        const mesasUnicas = new Set();
        const nombresPorMesa = {};
        data.detalles_asistentes.forEach(a => {
            const mMesa = (a.mesa || '').trim() || sMesaGeneral;
            if (mMesa) {
                mesasUnicas.add(mMesa);
                if (!nombresPorMesa[mMesa]) nombresPorMesa[mMesa] = [];
                nombresPorMesa[mMesa].push(a.nombre || 'Invitado');
            }
        });

        if (mesasUnicas.size > 1) {
            // Si hay más de una mesa, decidimos cómo mostrarlo
            if (data.detalles_asistentes.length <= 3) {
                // Pocos integrantes: mostramos "Nombre (Mesa)" o "Nombre: Mesa X"
                let resumenText = '';
                const arr = [];
                for (const [mesa, nombres] of Object.entries(nombresPorMesa)) {
                    nombres.forEach(n => arr.push(`<span class="text-slate-600 block mb-0.5">${sanitize(n)}: <b class="text-orange-600 text-sm sm:text-base">${sanitize(mesa)}</b></span>`));
                }
                textoMesaCheckin = `<span class="text-[11px] sm:text-xs leading-tight font-medium">${arr.join('')}</span>`;
            } else {
                // Familia grande: resumimos las mesas
                const listaMesas = Array.from(mesasUnicas).map(m => sanitize(m)).join(', ');
                textoMesaCheckin = `<span class="bg-orange-50 text-orange-700 font-bold px-3 py-1.5 rounded-lg text-xs sm:text-sm border border-orange-100">Mesas <span class="text-orange-600 ml-1 text-sm sm:text-base">${listaMesas}</span></span>`;
            }
        } else if (mesasUnicas.size === 1) {
            textoMesaCheckin = `<span class="font-bold text-orange-600 text-sm sm:text-base">${sanitize([...mesasUnicas][0])}</span>`;
        } else {
            textoMesaCheckin = `<span class="text-slate-400 italic font-medium text-sm sm:text-base">—</span>`;
        }
    } else {
        textoMesaCheckin = sMesaGeneral ? `<span class="font-bold text-orange-600 text-sm sm:text-base">${sMesaGeneral}</span>` : `<span class="text-slate-400 italic font-medium text-sm sm:text-base">—</span>`;
    }
    // --- FIN LÓGICA DE MESA PARA EL CHECKIN ---

    return `<tr class="hover:bg-brand-light/30 transition-colors border-b border-gray-50 group fila-invitado ${filaCompletada}" data-estado="${data.estado}" data-iddoc="${idDoc}">
        <td class="px-4 sm:px-8 py-3 sm:py-4 flex items-center gap-3 sm:gap-4"><div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-brand-light to-orange-100 text-brand-dark font-bold flex items-center justify-center text-xs sm:text-sm shadow-sm border border-white shrink-0 group-hover:scale-110 transition-transform duration-300">${iniciales}</div>
        <div><p class="text-xs sm:text-sm font-bold text-primario group-hover:text-brand transition-colors duration-300">${sFamilia}</p>${textoIntegrantes}${textoEdades}${textoLlave}</div></td>
        <td class="col-normal px-3 sm:px-6 py-3 sm:py-4"><button onclick="window.copiarCodigoRapido('${sCodigoOrigen}')" class="font-mono text-[10px] font-bold text-brand-dark bg-brand-light border border-brand/20 px-2.5 py-1 rounded-lg hover:bg-brand hover:text-white transition-all flex items-center gap-1.5 w-max shadow-sm hover:shadow-md cursor-pointer group/btn" title="Click para copiar">${sCodigoOrigen} <i class="ph-bold ph-copy text-brand group-hover/btn:text-white transition-colors"></i></button></td>
        <td class="col-normal px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-secundario text-center sm:text-left">${data.asistiran || data.pases_asignados}</td>
        <td class="col-normal px-3 sm:px-6 py-3 sm:py-4">${badge}</td>
        <td class="col-normal px-3 sm:px-6 py-3 sm:py-4"><div class="flex items-center justify-center sm:justify-end gap-1.5"><button onclick="window.abrirModalEditarInvitado('${idDoc}', '${datosSeguros}')" class="text-secundario hover:text-blue-500 p-1.5 sm:p-2 bg-white border border-gray-100 rounded-lg hover:shadow transition-all" title="Editar"><i class="ph-bold ph-pencil-simple text-sm sm:text-base block"></i></button><button onclick="window.eliminarInvitado('${idDoc}', '${sFamilia}')" class="text-secundario hover:text-red-500 p-1.5 sm:p-2 bg-white border border-gray-100 rounded-lg hover:shadow transition-all" title="Eliminar"><i class="ph-bold ph-trash text-sm sm:text-base block"></i></button></div></td>
        <td class="col-checkin px-3 sm:px-6 py-3 sm:py-4 text-center" style="display: none;">${textoMesaCheckin}</td>
        <td class="col-checkin px-3 sm:px-6 py-3 sm:py-4" style="display: none;"><div class="flex items-center justify-center gap-2 sm:gap-3 bg-white rounded-xl w-max mx-auto px-1.5 sm:px-2 py-1 border border-pink-100 shadow-sm"><button onclick="window.cambiarIngreso('${idDoc}', -1, ${data.asistiran}, ${ingresados})" class="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed" ${ingresados <= 0 ? 'disabled' : ''}><i class="ph-bold ph-minus text-xs sm:text-base"></i></button><span class="font-black text-base sm:text-lg text-primario min-w-[25px] sm:min-w-[35px] text-center">${ingresados} <span class="text-[10px] sm:text-xs text-secundario font-medium">/ ${data.asistiran}</span></span><button onclick="window.cambiarIngreso('${idDoc}', 1, ${data.asistiran}, ${ingresados})" class="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-500 hover:text-white flex items-center justify-center font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed" ${ingresados >= data.asistiran ? 'disabled' : ''}><i class="ph-bold ph-plus text-xs sm:text-base"></i></button></div></td>
    </tr>`;
}

function construirFilaCodigo(idDoc, data) {
    const paqueteContratado = getPaqueteContratado();
    if (data.is_master) {
        const asignados = data.pases_asignados || 1;
        return `<tr class="hover:bg-brand-light/30 transition-colors border-b border-gray-50 group" data-iddoc="${idDoc}">
            <td class="px-8 py-4"><button onclick="window.copiarCodigoRapido('${idDoc}')" class="font-mono text-sm font-bold text-brand-dark bg-brand-light border border-brand/20 px-2.5 py-1 rounded-lg hover:bg-brand hover:text-white transition-all flex items-center gap-1.5 w-max shadow-sm hover:shadow-md cursor-pointer group/btn" title="Click para copiar">${idDoc} <i class="ph-bold ph-copy text-brand group-hover/btn:text-white transition-colors"></i></button></td>
            <td class="px-6 py-4 font-bold text-secundario group-hover:text-brand transition-colors duration-300">Pases por uso: ${asignados}</td>
            <td class="px-6 py-4"><span class="bg-green-50 text-green-600 px-3 py-1.5 rounded-full text-[10px] font-bold border border-green-100 uppercase tracking-widest flex items-center w-max gap-1.5"><i class="ph-bold ph-infinity text-sm"></i> Ilimitado</span></td>
            <td class="px-6 py-4 text-right"><button onclick="navigator.clipboard.writeText('Tu código de acceso es: ${idDoc} (Válido para registrar ${asignados} pases)'); toast.success('Código copiado', { description: 'Listo para enviar', className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' })" class="text-brand hover:text-white hover:bg-brand bg-white px-4 py-2 rounded-xl text-xs font-bold border border-pink-100 transition-all shadow-sm flex items-center gap-1.5 ml-auto group-hover:shadow-md"><i class="ph-bold ph-copy text-sm"></i> Copiar Formato</button></td>
        </tr>`;
    }
    if (paqueteContratado !== 'vip') return '';
    const sFamilia = sanitize(data.nombre_familia);
    const estadoCod = data.estado === 'pendiente' ? 'Disponible' : (data.estado === 'confirmado' ? 'Usado' : 'Declinado');
    const colorCod = data.estado === 'pendiente' ? 'bg-orange-50 text-orange-500 border-orange-100' : (data.estado === 'confirmado' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-100');
    const iconCod = data.estado === 'pendiente' ? 'ph-hourglass-medium' : (data.estado === 'confirmado' ? 'ph-check-circle' : 'ph-x-circle');
    return `<tr class="hover:bg-brand-light/30 transition-colors border-b border-gray-50 group" data-iddoc="${idDoc}">
        <td class="px-3 sm:px-8 py-3 sm:py-4"><button onclick="window.copiarCodigoRapido('${idDoc}')" class="font-mono text-xs sm:text-sm font-bold text-brand-dark bg-brand-light border border-brand/20 px-2.5 py-1 rounded-lg hover:bg-brand hover:text-white transition-all flex items-center gap-1.5 w-max shadow-sm hover:shadow-md cursor-pointer group/btn" title="Click para copiar">${idDoc} <i class="ph-bold ph-copy text-brand group-hover/btn:text-white transition-colors"></i></button></td>
        <td class="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-secundario group-hover:text-brand transition-colors duration-300 truncate max-w-[100px] sm:max-w-none">${sFamilia}</td>
        <td class="px-3 sm:px-6 py-3 sm:py-4"><span class="${colorCod} px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold border uppercase tracking-widest flex items-center w-max gap-1 sm:gap-1.5"><i class="ph-bold ${iconCod} text-xs sm:text-sm"></i> ${estadoCod}</span></td>
        <td class="px-3 sm:px-6 py-3 sm:py-4 text-center sm:text-right"><button onclick="navigator.clipboard.writeText('Tu código de acceso es: ${idDoc}'); toast.success('Código copiado', { description: 'Listo para enviar', className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' })" class="text-brand hover:text-white hover:bg-brand bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold border border-pink-100 transition-all shadow-sm flex items-center justify-center gap-1.5 ml-auto group-hover:shadow-md w-max"><i class="ph-bold ph-copy text-sm"></i> <span class="hidden sm:inline">Copiar Formato</span></button></td>
    </tr>`;
}

function construirFilaEnvio(idDoc, data) {
    const sFamilia = sanitize(data.nombre_familia);
    const tel = data.telefono || '';
    let accionWhatsApp = '';
    if (data.estado === 'confirmado' || data.estado === 'declinado') {
        const colorR = data.estado === 'confirmado' ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-500 bg-red-50 border-red-100';
        const iconR = data.estado === 'confirmado' ? 'ph-check-circle' : 'ph-x-circle';
        const textoR = data.estado === 'confirmado' ? 'Confirmado' : 'Declinado';
        accionWhatsApp = `<div class="flex justify-end"> <span class="flex items-center gap-1 text-[10px] font-bold ${colorR} border px-2.5 py-1 rounded-full"><i class="ph-fill ${iconR} text-sm"></i> ${textoR}</span></div>`;
    } else if (tel) {
        if (data.fecha_wa) {
            const fechaEnviado = typeof data.fecha_wa.toDate === 'function' ? data.fecha_wa.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';
            const safeMesa = data.mesa ? data.mesa.replace(/'/g, "\\'") : '';
            accionWhatsApp = `<div class="flex flex-col items-end gap-1.5"><button onclick="window.enviarWhatsApp('${tel}','${data.nombre_familia}','${idDoc}',${data.pases_asignados}, true, '${safeMesa}')" class="bg-orange-500 hover:bg-orange-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ml-auto transition-all shadow-sm w-max"><i class="ph-bold ph-bell-ringing text-sm sm:text-base"></i> <span class="hidden sm:inline">Recordar</span></button><span class="text-[9px] text-secundario font-medium">Enviado: ${fechaEnviado}</span></div>`;
        } else {
            const safeMesa = data.mesa ? data.mesa.replace(/'/g, "\\'") : '';
            accionWhatsApp = `<button onclick="window.enviarWhatsApp('${tel}','${data.nombre_familia}','${idDoc}',${data.pases_asignados}, false, '${safeMesa}')" class="bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ml-auto transition-all shadow-sm w-max"><i class="ph-bold ph-whatsapp-logo text-sm sm:text-base"></i> <span class="hidden sm:inline">Enviar</span></button>`;
        }
    }
    return `<tr class="hover:bg-brand-light/30 transition-colors group fila-envio" data-estado="${data.estado}" data-enviado="${data.fecha_wa ? 'si' : 'no'}" data-iddoc="${idDoc}">
        <td class="px-3 sm:px-8 py-3 sm:py-4 font-bold text-xs sm:text-sm text-primario truncate max-w-[90px] sm:max-w-none">${sFamilia}</td>
        <td class="px-2 sm:px-6 py-3 sm:py-4"><button onclick="window.copiarCodigoRapido('${idDoc}')" class="font-mono text-[10px] sm:text-xs font-bold text-brand-dark bg-brand-light border border-brand/20 px-1.5 sm:px-2.5 py-1 rounded-md hover:bg-brand hover:text-white transition-all flex items-center gap-1 sm:gap-1.5 w-max shadow-sm hover:shadow-md cursor-pointer group/btn" title="Click para copiar">${idDoc} <i class="ph-bold ph-copy text-brand group-hover/btn:text-white transition-colors hidden sm:inline-block"></i></button></td>
        <td class="px-2 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-sm">${tel ? tel : '<span class="text-red-400">Sin número</span>'}</td>
        <td class="px-3 sm:px-6 py-3 sm:py-4 text-right">${tel ? accionWhatsApp : '-'}</td>
    </tr>`;
}

function construirFilasVIP(idDoc, data) {
    if (!data.detalles_asistentes || data.detalles_asistentes.length === 0) {
        // CASO ESPECIAL EXCLUSIVO PARA XV AÑOS NATALIA (EVT-J4YX)
        // Solución a un listado subido manualmente en el que los confirmados no tienen data individual de asistentes.
        if (eventoActivoId === 'EVT-J4YX' && data.estado === 'confirmado') {
            data.detalles_asistentes = [{
                nombre: data.integrantes ? data.integrantes : ('Familia ' + (data.nombre_familia || '')),
                mesa: data.mesa || '',
                menu: '-',
                alergias: 'Generado desde importación'
            }];
        } else {
            return '';
        }
    }

    // Almacenar en state en lugar de window
    setDatosCompletosVIP(idDoc, data.detalles_asistentes);

    const sFamilia = sanitize(data.nombre_familia);
    return data.detalles_asistentes.map((asistente, index) => {
        let tipoPersona = 'Asistente'; let badgeTipo = 'bg-gray-100 text-gray-600';
        if (data.adultos !== undefined && data.ninos !== undefined) {
            if (index < data.adultos) { tipoPersona = 'Adultos'; badgeTipo = 'bg-blue-50 text-blue-600 border-blue-100'; }
            else { tipoPersona = 'Niños'; badgeTipo = 'bg-teal-50 text-teal-600 border-teal-100'; }
        }
        const mesaIndividual = asistente.mesa || data.mesa || '';
        const sNombreAsistente = sanitize(asistente.nombre || 'Sin nombre');
        const sMesaIndividual = sanitize(mesaIndividual);
        const sAlergias = sanitize(asistente.alergias || '');
        const textoMesa = sMesaIndividual ? `<span class="font-bold text-primario text-base">${sMesaIndividual}</span>` : '<span class="text-gray-300 text-xs italic">Sin asignar</span>';
        let badgeMenu = '-';
        if (asistente.menu) {
            let mc = 'bg-orange-50 text-orange-600 border-orange-100'; let mi = 'ph-fork-knife';
            if (asistente.menu === 'Vegetariano') { mc = 'bg-green-50 text-green-600 border-green-100'; mi = 'ph-leaf'; }
            else if (asistente.menu === 'Vegano') { mc = 'bg-emerald-50 text-emerald-600 border-emerald-100'; mi = 'ph-plant'; }
            else if (asistente.menu === 'Infantil') { mc = 'bg-amber-50 text-amber-600 border-amber-100'; mi = 'ph-baby'; }
            badgeMenu = `<span class="${mc} px-2.5 py-1 rounded font-bold text-[10px] border whitespace-nowrap inline-flex items-center gap-1"><i class="ph-bold ${mi}"></i> ${sanitize(asistente.menu)}</span>`;
        }
        const textoAlergias = sAlergias ? `<span class="text-red-500 font-bold text-xs"><i class="ph-bold ph-warning"></i> ${sAlergias}</span>` : '<span class="text-gray-300 italic text-xs">Ninguna</span>';
        const safeN = sNombreAsistente.replace(/'/g, "\\'"); const safeM = sanitize(asistente.menu || '').replace(/'/g, "\\'"); const safeMesa = sMesaIndividual.replace(/'/g, "\\'"); const safeA = sAlergias.replace(/'/g, "\\'");
        const asisTotal = data.asistiran || 0; const ads = data.adultos || 0; const nns = data.ninos || 0;

        const flags = getFlagsEvento();
        const tdEdades = flags.flagPedirEdades ? `<td class="px-6 py-4"><span class="px-2.5 py-1 border rounded uppercase tracking-widest text-[9px] font-bold ${badgeTipo}">${tipoPersona}</span></td>` : '';
        const tdMesa = flags.flagMostrarMesa ? `<td class="px-6 py-4 text-sm">${textoMesa}</td>` : '';
        const tdMenu = flags.flagPedirMenu ? `<td class="px-6 py-4">${badgeMenu}</td><td class="px-6 py-4">${textoAlergias}</td>` : '';

        return `<tr class="fila-detalle-vip bg-white hover:bg-brand-light/30 transition-colors group" data-iddoc="${idDoc}" data-index="${index}">
            <td class="px-6 py-4 text-sm font-bold text-secundario">${sFamilia}</td>
            <td class="px-6 py-4 text-sm font-black text-primario group-hover:text-brand transition-colors">${sNombreAsistente}</td>
            ${tdEdades}${tdMesa}${tdMenu}
    <td class="px-6 py-4 text-right"><div class="flex items-center justify-end gap-2.5">
        <input type="checkbox" data-iddoc="${idDoc}" data-index="${index}" data-adultos="${ads}" data-ninos="${nns}" data-asistiran="${asisTotal}" value="${idDoc}|${index}" class="chk-asistente-vip w-4 h-4 text-brand rounded border-gray-300 focus:ring-brand cursor-pointer shadow-sm mt-0.5" title="Seleccionar" onchange="window.verificarSeleccionMasiva()">
            <button onclick="window.editarAsistenteVIP('${idDoc}', ${index}, '${safeN}', '${safeM}', '${safeMesa}', '${safeA}')" class="text-secundario hover:text-brand p-1.5 bg-white border border-gray-100 rounded-lg hover:shadow transition-all" title="Editar asistente"><i class="ph-bold ph-pencil-simple text-base block"></i></button>
            <button onclick="window.eliminarAsistenteVIP('${idDoc}', ${index}, ${ads}, ${nns}, ${asisTotal})" class="text-red-400 hover:text-red-600 p-1.5 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-all shadow-sm" title="Eliminar asistente"><i class="ph-bold ph-trash text-base block"></i></button>
    </div></td>
        </tr>`;
    }).join('');
}

function construirFilaBasica(idDoc, data) {
    const paquete = getPaqueteContratado();
    const flags = getFlagsEvento();

    if (paquete === 'vip' || !flags.flagPedirEdades) return '';
    const nAdultos = data.adultos || 0; const nNinos = data.ninos || 0; const nTotal = data.asistiran || 0;
    const nTitular = sanitize(data.quien_confirma || data.nombre_familia || 'Sin nombre');
    const nCodigo = sanitize(data.codigo_origen || idDoc);
    return `<tr class="hover:bg-slate-50 transition-colors border-b border-slate-50" data-iddoc="${idDoc}">
        <td class="px-6 py-4"><p class="text-sm font-bold text-primario">${nTitular}</p></td>
        <td class="px-6 py-4"><span class="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">${nCodigo}</span></td>
        <td class="px-6 py-4 text-center"><span class="inline-flex items-center gap-1 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">🧑 ${nAdultos}</span></td>
        <td class="px-6 py-4 text-center"><span class="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">🧸 ${nNinos}</span></td>
        <td class="px-6 py-4 text-center"><span class="text-sm font-black text-primario">${nTotal}</span></td>
        <td class="px-6 py-4 text-right"><button onclick="window.editarEdadesBasico('${idDoc}', '${nTitular}', ${nAdultos}, ${nNinos})" class="text-slate-400 hover:text-brand p-2 transition-colors border border-transparent hover:border-brand-light rounded-lg bg-white shadow-sm" title="Editar Edades"><i class="ph-bold ph-pencil-simple text-lg block"></i></button></td>
    </tr>`;
}

// ========================================================
// RECALCULAR ESTADÍSTICAS — recorre docs en RAM, sin tocar tablas
// ========================================================
// Las estadísticas siempre se recalculan
function recalcularEstadisticas(snapshot) {
    resetDatosExportacion();
    let confirmadosReales = 0, declinadosReales = 0, totalInvitadosReales = 0;
    let vipAdultos = 0, vipNinos = 0;
    let menuTrad = 0, menuVeg = 0, menuVegan = 0, menuInf = 0;
    let mesasAsignadas = 0, mesasPendientes = 0;
    let historialRespuestas = [];
    let codigoEjemplo = '', pasesEjemplo = 1;

    let temporalPasesGenerados = 0;
    const paqueteContratado = getPaqueteContratado();
    const flags = getFlagsEvento();

    snapshot.forEach((d) => {
        const data = d.data(); const idDoc = d.id;
        if (data.is_master) {
            if (!codigoEjemplo) { codigoEjemplo = idDoc; pasesEjemplo = data.pases_asignados || 1; }
        } else {
            temporalPasesGenerados += parseInt(data.pases_asignados || 0);
            totalInvitadosReales++;
            if (data.estado === 'confirmado') {
                confirmadosReales += (data.asistiran || 0);
                vipAdultos += (data.adultos || 0); vipNinos += (data.ninos || 0);
                
                // CASO ESPECIAL EXCLUSIVO PARA XV AÑOS NATALIA (EVT-J4YX)
                if (eventoActivoId === 'EVT-J4YX' && (!data.detalles_asistentes || data.detalles_asistentes.length === 0)) {
                    data.detalles_asistentes = [{
                        nombre: data.integrantes ? data.integrantes : ('Familia ' + (data.nombre_familia || '')),
                        mesa: data.mesa || '',
                        menu: '-',
                        alergias: 'Generado desde importación'
                    }];
                }

                if (data.detalles_asistentes) {
                    setDatosCompletosVIP(idDoc, data.detalles_asistentes);
                    data.detalles_asistentes.forEach((a, idx) => {
                        if (a.menu === 'Tradicional') menuTrad++; else if (a.menu === 'Vegetariano') menuVeg++; else if (a.menu === 'Vegano') menuVegan++; else if (a.menu === 'Infantil') menuInf++;
                        if (a.mesa || data.mesa) { mesasAsignadas++; } else { mesasPendientes++; }

                        if (paqueteContratado === 'vip') {
                            let filaVIP = {
                                "Familia / Titular": data.quien_confirma || data.nombre_familia || 'Sin nombre',
                                "Asistente": a.nombre || 'Sin nombre'
                            };
                            if (flags.flagPedirEdades) {
                                let tipoPersona = 'Asistente';
                                if (data.adultos !== undefined && data.ninos !== undefined) {
                                    tipoPersona = idx < data.adultos ? 'Adulto' : 'Niño';
                                }
                                filaVIP["Tipo"] = tipoPersona;
                            }
                            if (flags.flagMostrarMesa) filaVIP["Mesa"] = a.mesa || data.mesa || '-';
                            if (flags.flagPedirMenu) {
                                filaVIP["Menú"] = a.menu || '-';
                                filaVIP["Alergias"] = a.alergias || 'Ninguna';
                            }
                            addDatoBanquete(filaVIP);
                        }
                    });
                } else if (paqueteContratado === 'vip') {
                    let filaVIP = {
                        "Familia / Titular": data.quien_confirma || data.nombre_familia || 'Sin nombre',
                        "Asistente": 'Pendiente de registrar'
                    };
                    if (flags.flagPedirEdades) filaVIP["Tipo"] = '-';
                    if (flags.flagMostrarMesa) filaVIP["Mesa"] = data.mesa || '-';
                    if (flags.flagPedirMenu) {
                        filaVIP["Menú"] = '-';
                        filaVIP["Alergias"] = '-';
                    }
                    addDatoBanquete(filaVIP);
                }
                if (paqueteContratado !== 'vip' && flags.flagPedirEdades) {
                    // Agregar a memoria manejada
                    addDatoBanquete({
                        familia: data.nombre_familia, titular: data.quien_confirma,
                        adultos: data.adultos || 0, ninos: data.ninos || 0,
                        total: data.asistiran || 0, mesa: data.mesa || 'Sin asignar'
                    });
                }
            } else if (data.estado === 'declinado') {
                declinadosReales++;
            }
            if (data.estado !== 'pendiente') historialRespuestas.push({ idDoc, ...data });
        }
    });

    // Guardar en Estado Central
    setTotalPasesGenerados(temporalPasesGenerados);
    const limitePases = getLimitePases();

    // En modo normal los códigos son genéricos (no individuales), así que el
    // total real de pases es el límite asignado por el admin, no la suma de códigos.
    // En VIP los registros sí son individuales y temporalPasesGenerados es correcto.
    const baseTotal = (paqueteContratado === 'vip') ? temporalPasesGenerados : limitePases;
    const pendientesBase = Math.max(0, baseTotal - confirmadosReales - declinadosReales);

    if (statTotales) statTotales.innerText = limitePases;
    if (statConfirmados) statConfirmados.innerText = confirmadosReales;
    if (statPendientes) statPendientes.innerText = pendientesBase;
    if (statDeclinados) statDeclinados.innerText = declinadosReales;
    if (totalRegistrosText) totalRegistrosText.innerText = totalInvitadosReales;

    // Optional legacy inputs (don't throw if absent)
    const elInv = document.getElementById('stat-invitados'); if (elInv) elInv.innerText = totalInvitadosReales;
    const elPas = document.getElementById('stat-pases'); if (elPas) elPas.innerText = `${temporalPasesGenerados} / ${limitePases}`;
    const elPasNum = document.getElementById('stat-pases-num'); if (elPasNum) elPasNum.innerText = baseTotal;
    const elConf = document.getElementById('stat-confirmados'); if (elConf) elConf.innerText = confirmadosReales;
    const elDecl = document.getElementById('stat-declinados'); if (elDecl) elDecl.innerText = declinadosReales;
    const elPend = document.getElementById('stat-pendientes'); if (elPend) elPend.innerText = pendientesBase;

    // Advertencia visual de límite
    const badgePases = document.getElementById('stat-pases');
    if (badgePases) {
        if (temporalPasesGenerados >= limitePases) {
            badgePases.classList.add('text-red-500'); badgePases.classList.remove('text-brand');
        } else {
            badgePases.classList.remove('text-red-500'); badgePases.classList.add('text-brand');
        }
    }

    // Actualizar BENTO GRID Gráfica de Asistencia (Desktop)
    const chartTotal = document.getElementById('chart-total-passes');
    if (chartTotal) {
        // Usamos baseTotal para que en modo Normal la gráfica refleje el límite del admin
        const pendientesGrafica = pendientesBase;

        chartTotal.innerText = baseTotal;

        document.getElementById('chart-val-conf').innerText = confirmadosReales;
        document.getElementById('chart-val-pend').innerText = pendientesGrafica;
        document.getElementById('chart-val-dec').innerText = declinadosReales;

        const pConf = baseTotal > 0 ? (confirmadosReales / baseTotal) * 100 : 0;
        const pPend = baseTotal > 0 ? (pendientesGrafica / baseTotal) * 100 : 0;
        const pDec = baseTotal > 0 ? (declinadosReales / baseTotal) * 100 : 0;
        const tasaResp = baseTotal > 0 ? ((confirmadosReales + declinadosReales) / baseTotal) * 100 : 0;

        // Animar anchos de barras y actualizar Chart.js
        setTimeout(() => {
            // Barras horizontales
            document.getElementById('chart-bar-conf').style.width = `${pConf}%`;
            document.getElementById('chart-bar-pend').style.width = `${pPend}%`;
            document.getElementById('chart-bar-dec').style.width = `${pDec}%`;

            // Actualizar Chart.js Doughnut
            const ctx = document.getElementById('attendanceChart');
            if (ctx && typeof Chart !== 'undefined') {
                const hasData = confirmadosReales > 0 || pendientesGrafica > 0 || declinadosReales > 0;
                const chartData = hasData ? [confirmadosReales, pendientesGrafica, declinadosReales] : [1];
                const chartColors = hasData ? ['#34d399', '#fbbf24', '#f87171'] : ['#f1f5f9']; // emerald-400, amber-400, red-400

                if (window.miGraficaAsistencia) {
                    window.miGraficaAsistencia.data.datasets[0].data = chartData;
                    window.miGraficaAsistencia.data.datasets[0].backgroundColor = chartColors;
                    window.miGraficaAsistencia.options.plugins.tooltip.enabled = hasData;
                    window.miGraficaAsistencia.update();
                } else {
                    window.miGraficaAsistencia = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: hasData ? ['Confirmados', 'Pendientes', 'Declinados'] : ['Sin Datos'],
                            datasets: [{
                                data: chartData,
                                backgroundColor: chartColors,
                                borderWidth: 0,
                                hoverOffset: 2
                            }]
                        },
                        options: {
                            cutout: '80%',
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: { enabled: hasData }
                            },
                            animation: { animateScale: true, animateRotate: true }
                        }
                    });
                }
            }
        }, 100); // Pequeño delay para permitir que el DOM se dibuje y Chart.js se cargue

        document.getElementById('chart-tasa-respuesta').innerText = `${Math.round(tasaResp)}%`;
    }

    ['stat-det-total', 'stat-det-adultos', 'stat-det-ninos', 'stat-det-trad', 'stat-det-veg', 'stat-det-vegan', 'stat-det-inf', 'stat-det-mesas-si', 'stat-det-mesas-no'].forEach((id, i) => {
        const el = document.getElementById(id); if (el) el.innerText = [confirmadosReales, vipAdultos, vipNinos, menuTrad, menuVeg, menuVegan, menuInf, mesasAsignadas, mesasPendientes][i];
    });
    if (document.getElementById('sidebar-pases-texto')) {
        document.getElementById('sidebar-pases-texto').innerHTML = `<span class="font-black text-purple-900">${confirmadosReales}</span> / ${limitePases} Confirmados`;
        document.getElementById('sidebar-progress-bar').style.width = `${Math.min(limitePases > 0 ? (confirmadosReales / limitePases) * 100 : 0, 100)}%`;
    }

    historialRespuestas.sort((a, b) => {
        const tA = a.fecha_confirmacion && typeof a.fecha_confirmacion.toMillis === 'function' ? a.fecha_confirmacion.toMillis() : 0;
        const tB = b.fecha_confirmacion && typeof b.fecha_confirmacion.toMillis === 'function' ? b.fecha_confirmacion.toMillis() : 0;
        return tB - tA;
    });
    const top5 = historialRespuestas.slice(0, 5);
    const htmlUltimos5 = top5.length === 0
        ? `<tr><td colspan="3" class="text-center py-10 text-secundario"><i class="ph-fill ph-hourglass-medium text-4xl mb-3 text-slate-300 block"></i>Esperando respuestas...</td></tr>`
        : top5.map(inv => {
            const iconoEstado = inv.estado === 'confirmado'
                ? '<div class="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm mx-auto group-hover:scale-125 transition-transform duration-300"><i class="ph-bold ph-check text-xs sm:text-sm"></i></div>'
                : '<div class="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm mx-auto group-hover:scale-125 transition-transform duration-300"><i class="ph-bold ph-x text-xs sm:text-sm"></i></div>';
            let nom = inv.nombre_familia || 'Sin nombre';
            if (nom.length > 20) nom = nom.substring(0, 18) + '...';
            const cod = inv.codigo_origen || inv.idDoc;
            return `<tr class="border-b border-gray-50 hover:bg-pink-50/60 transition-colors duration-300 group cursor-pointer"><td class="px-2 sm:px-6 py-3 sm:py-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-light to-orange-100 text-brand-dark font-bold flex items-center justify-center text-xs shadow-sm border border-white shrink-0 group-hover:scale-110 transition-transform duration-300">${nom.substring(0, 2).toUpperCase()}</div><p class="text-xs sm:text-sm font-bold text-primario group-hover:text-brand transition-colors duration-300">${nom}</p></div></td><td class="px-2 sm:px-6 py-3 sm:py-4"><button onclick="window.copiarCodigoRapido('${cod}')" class="font-mono text-[10px] sm:text-xs font-bold text-brand-dark bg-brand-light border border-brand/20 px-1.5 sm:px-2.5 py-1 rounded-md hover:bg-brand hover:text-white transition-all duration-300 flex items-center gap-1 sm:gap-1.5 w-max shadow-sm hover:shadow-md cursor-pointer group/btn">${cod} <i class="ph-bold ph-copy text-brand group-hover/btn:text-white transition-colors"></i></button></td><td class="px-2 sm:px-6 py-3 sm:py-4 text-center">${iconoEstado}</td></tr>`;
        }).join('');
    if (tablaUltimos) tablaUltimos.innerHTML = htmlUltimos5;

    if (paqueteContratado === 'normal' && document.getElementById('texto-wa')) {
        const msj = `¡Hola! Nos emociona invitarte a nuestra celebración. 🎉\n\nHemos reservado ${pasesEjemplo} pase(s) para ti.\n\nPor favor confirma tu asistencia en el siguiente enlace:\n👉 ${getLinkInvitacion()}\n\n🎫 Tu código de acceso es: ${codigoEjemplo || '[Tu Código]'}`;
        document.getElementById('texto-wa').value = msj;
    }
}

// ========================================================
// RENDER COMPLETO — Optimizado mediante DocumentFragment
// ========================================================
function renderCompleto(snapshot) {
    const paqueteContratado = getPaqueteContratado();
    const flags = getFlagsEvento();

    let maxRowsToRender = 500; // Limite de seguridad
    let rowsRendered = 0;

    // PERF-03: Usar arrays + join en lugar de concatenación de strings (más eficiente en memoria)
    const invitadosRows = []; const codigosRows = []; const enviosRows = [];
    const detallesVIPRows = []; const detallesBasicoRows = [];

    // Función auxiliar para inyecciones optimizadas en memoria
    const inyectarConFragmento = (idContenedor, htmlString, htmlVacio) => {
        const contenedor = document.getElementById(idContenedor);
        if (!contenedor) return;

        // Limpiar contenedor rápido
        while (contenedor.firstChild) {
            contenedor.removeChild(contenedor.firstChild);
        }

        const template = document.createElement('template');
        // Si hay contenido real, inyecta el contenido real; si no, inyecta el estado vacío
        template.innerHTML = htmlString ? htmlString : htmlVacio;
        const fragment = document.createDocumentFragment();
        fragment.appendChild(template.content);

        contenedor.appendChild(fragment);

        // Disparar los filtros globales si inyectamos en el directorio para asegurar el estado vacío correcto
        if (idContenedor === 'tabla-directorio' && window.aplicarFiltrosGlobales) {
            setTimeout(() => window.aplicarFiltrosGlobales(), 50);
        }
    };

    // Ordenar por fecha de creación antes de construir el HTML
    sortDocs(snapshot).forEach((d) => {
        if (rowsRendered >= maxRowsToRender) return; // Romper ejecución masiva
        rowsRendered++;

        const data = d.data(); const idDoc = d.id;
        codigosRows.push(construirFilaCodigo(idDoc, data));
        if (!data.is_master) {
            invitadosRows.push(construirFilaInvitado(idDoc, data));
            if (paqueteContratado === 'vip') {
                enviosRows.push(construirFilaEnvio(idDoc, data));
                if (data.estado === 'confirmado') detallesVIPRows.push(construirFilasVIP(idDoc, data));
            }
            if (data.estado === 'confirmado') detallesBasicoRows.push(construirFilaBasica(idDoc, data));
        }
    });

    inyectarConFragmento('tabla-codigos', codigosRows.join(''), `<tr><td colspan="4" class="text-center py-8 text-secundario">No se han generado llaves de acceso para ti.</td></tr>`);

    inyectarConFragmento('tabla-directorio', invitadosRows.join(''), `<tr><td colspan="5" class="text-center py-12 text-secundario"><div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3"><i class="ph-fill ph-users text-3xl text-gray-300"></i></div><p class="text-primario font-bold">Aún no hay invitados</p></td></tr>`);

    if (paqueteContratado === 'vip') {
        const cols = 3 + (flags.flagMostrarMesa ? 1 : 0) + (flags.flagPedirMenu ? 2 : 0);
        inyectarConFragmento('tabla-detalles-vip', detallesVIPRows.join(''), `<tr><td colspan="${cols}" class="text-center py-12 text-secundario">No hay invitados con información detallada registrada.</td></tr>`);
        inyectarConFragmento('tabla-envios', enviosRows.join(''), `<tr><td colspan="4" class="text-center py-12 text-secundario">No hay envíos configurados.</td></tr>`);
    } else {
        inyectarConFragmento('tabla-detalles-basico', detallesBasicoRows.join(''), `<tr><td colspan="6" class="text-center py-12 text-secundario">No hay desglose de edades registrado.</td></tr>`);
    }

    if (window.aplicarOrdenamiento) window.aplicarOrdenamiento();
    if (window.aplicarFiltrosGlobales) window.aplicarFiltrosGlobales();
    if (window.aplicarFiltrosEnvios) window.aplicarFiltrosEnvios();
}

// Exponer funciones de construcción de filas para dashboard-groups.js
window._construirFilaInvitadoFn = construirFilaInvitado;
window._construirFilasVIPFn = construirFilasVIP;
window._construirFilaBasicaFn = construirFilaBasica;
window._renderCompletoFn = renderCompleto;

// ========================================================
// ACTUALIZACIÓN QUIRÚRGICA — para cambios subsecuentes (#9)
// ========================================================
function actualizarFilasQuirurgicas(snapshot) {
    const paqueteContratado = getPaqueteContratado();
    const tDir = document.getElementById('tabla-directorio');
    const tVIP = document.getElementById('tabla-detalles-vip');
    const tBasico = document.getElementById('tabla-detalles-basico');
    const tCodigos = tablaCodigos;
    const tEnvios = document.getElementById('tabla-envios');

    // Helper: eliminar todas las filas de un doc en un contenedor y agregar el nuevo HTML en el mismo lugar
    const reemplazar = (contenedor, idDoc, nuevoHTML) => {
        if (!contenedor) return;
        const oldEls = Array.from(contenedor.querySelectorAll(`[data-iddoc="${idDoc}"]`));
        if (oldEls.length > 0) {
            if (nuevoHTML) oldEls[0].insertAdjacentHTML('beforebegin', nuevoHTML);
            oldEls.forEach(el => el.remove());
        } else if (nuevoHTML) {
            // Si por alguna razón no existía (ej. acaba de confirmarse), agregar al principio de la tabla
            contenedor.insertAdjacentHTML('afterbegin', nuevoHTML);
        }
    };

    snapshot.docChanges().forEach((change) => {
        const idDoc = change.doc.id;
        const data = change.doc.data();

        if (change.type === 'added') {
            // Nuevos invitados van al principio (son los más recientes)
            if (!data.is_master && tDir) tDir.insertAdjacentHTML('afterbegin', construirFilaInvitado(idDoc, data));
            if (tCodigos) tCodigos.insertAdjacentHTML('afterbegin', construirFilaCodigo(idDoc, data));
            if (!data.is_master && paqueteContratado === 'vip') {
                if (tEnvios) tEnvios.insertAdjacentHTML('afterbegin', construirFilaEnvio(idDoc, data));
                if (data.estado === 'confirmado' && tVIP) tVIP.insertAdjacentHTML('afterbegin', construirFilasVIP(idDoc, data));
            }
            if (!data.is_master && data.estado === 'confirmado' && tBasico) tBasico.insertAdjacentHTML('afterbegin', construirFilaBasica(idDoc, data));

        } else if (change.type === 'modified') {
            if (!data.is_master) {
                reemplazar(tDir, idDoc, construirFilaInvitado(idDoc, data));
                if (paqueteContratado === 'vip') {
                    reemplazar(tEnvios, idDoc, construirFilaEnvio(idDoc, data));
                    reemplazar(tVIP, idDoc, data.estado === 'confirmado' ? construirFilasVIP(idDoc, data) : null);
                }
                reemplazar(tBasico, idDoc, data.estado === 'confirmado' ? construirFilaBasica(idDoc, data) : null);
            }
            reemplazar(tCodigos, idDoc, construirFilaCodigo(idDoc, data));

        } else if (change.type === 'removed') {
            [tDir, tCodigos, tEnvios, tVIP, tBasico].forEach(t => {
                if (t) t.querySelectorAll(`[data-iddoc="${idDoc}"]`).forEach(el => el.remove());
            });
        }
    });

    if (window.aplicarOrdenamiento) window.aplicarOrdenamiento();
    if (window.aplicarFiltrosGlobales) window.aplicarFiltrosGlobales();
    if (window.aplicarFiltrosEnvios) window.aplicarFiltrosEnvios();
}

// ========================================================
// FIX #11: LISTENER ÚNICO — despacha CustomEvent para actividad.js
// ========================================================
function iniciarEscuchaDashboard() {
    // Mejora #12: Límite de 500 docs. Para eventos mayores, implementar paginación con startAfter()
    const LIMITE_DOCS = 500;
    onSnapshot(query(collection(db, "invitados"), where("evento_id", "==", eventoActivoId), limit(LIMITE_DOCS)), (snapshot) => {

        // Aviso si se está llegando al límite de paginación
        const bannerLimite = document.getElementById('banner-limite-paginacion');
        if (snapshot.size >= LIMITE_DOCS) {
            if (!bannerLimite) {
                const b = document.createElement('div');
                b.id = 'banner-limite-paginacion';
                b.className = 'w-full bg-amber-500 text-white text-xs font-bold text-center py-2 px-4 z-50';
                b.innerHTML = '⚠️ Se están mostrando los primeros 500 invitados. Contacta a soporte para activar la paginación completa.';
                document.body.prepend(b);
            }
        } else if (bannerLimite) {
            bannerLimite.remove();
        }

        // Notificaciones de cambios en vivo (confs/declinaciones)
        if (!primeraCargaDashboard) {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                if (!change.doc.metadata.hasPendingWrites && !data.is_master) {
                    if (change.type === 'modified' && data.estado === 'confirmado') {
                        if (window.reproducirDing) window.reproducirDing();
                        if (window.toast && !window._isPostEditModalActive) toast.success(`🎉 ¡${data.nombre_familia} ha confirmado!`, { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
                    } else if (change.type === 'modified' && data.estado === 'declinado') {
                        if (window.toast && !window._isPostEditModalActive) toast.info(`❌ ${data.nombre_familia} ha declinado.`, { className: 'bg-blue-50/90 text-blue-600 border border-blue-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
                    }
                }
            });
        }

        // Fix #11: Emitir el snapshot como CustomEvent — actividad.js lo escucha sin abrir su propio listener
        document.dispatchEvent(new CustomEvent('evt-invitados', { detail: snapshot }));

        // Fix #9: Primera carga = render completo; cambios = actualización quirúrgica de solo las filas afectadas
        if (primeraCargaDashboard) {
            renderCompleto(snapshot);
        } else {
            actualizarFilasQuirurgicas(snapshot);
        }

        // Notificar al módulo de grupos con el snapshot actualizado
        if (window.actualizarSnapshotGrupos) window.actualizarSnapshotGrupos(snapshot);

        // Las estadísticas siempre se recalculan (loop en RAM, no toca tablas del DOM)
        recalcularEstadisticas(snapshot);
        primeraCargaDashboard = false;
    }, (error) => {
        // OPT-04: Manejo de errores explícito en el listener de Firestore
        console.error('Error en el listener de invitados:', error);
        // IMPORTANTE: Siempre quitar el overlay aunque haya error, para no dejar el spinner colgado
        primeraCargaDashboard = false;
        const overlay = document.getElementById('loading-overlay');
        if (overlay) { overlay.style.opacity = '0'; overlay.style.transition = 'opacity 0.4s ease'; setTimeout(() => overlay.remove(), 400); }
        Swal.fire({
            icon: 'error',
            title: 'Error de Conexión',
            text: 'No se pudo cargar la lista de invitados. Por favor, recarga la página.',
            confirmButtonColor: '#f97316'
        });
    });
}

// ========================================================
// ARRANQUE DEL SISTEMA
// ========================================================
async function arrancarDashboard() {
    // OPT-05: Mostrar spinner de carga inicial hasta que llegue el primer snapshot
    const mainContent = document.getElementById('main-content') || document.querySelector('main');
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);';
    loadingOverlay.innerHTML = '<div style="width:48px;height:48px;border:4px solid #fde8df;border-top-color:#FC7643;border-radius:50%;animation:spin 0.8s linear infinite;"></div><p style="margin-top:16px;font-weight:700;color:#FC7643;font-size:14px;">Cargando tu evento...</p><style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(loadingOverlay);

    await cargarDatosEvento();
    iniciarEscuchaDashboard();
    if (window.iniciarEscuchaGlobal) window.iniciarEscuchaGlobal();

    // --- MODO OFFLINE: Indicadores Visuales ---
    window.addEventListener('offline', () => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Estás sin conexión',
                text: 'El panel seguirá funcionando. Los cambios se guardarán y sincronizarán automáticamente cuando regrese el internet.',
                icon: 'warning',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 5000,
                timerProgressBar: true
            });
        }
    });

    window.addEventListener('online', () => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Conexión restaurada',
                text: 'Registros sincronizados con el servidor.',
                icon: 'success',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        }
    });

    // Remover overlay cuando llegue el primer snapshot (primeraCargaDashboard pasa a false)
    const removerOverlay = setInterval(() => {
        if (!primeraCargaDashboard) {
            clearInterval(removerOverlay);
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.4s ease';
                setTimeout(() => overlay.remove(), 400);
            }
        }
    }, 100);
}
// arrancarDashboard() ya no se llama directamente aquí —
// se invoca desde onAuthStateChanged (arriba) para garantizar que el token
// de Firebase Auth esté disponible antes de abrir el listener de Firestore.
