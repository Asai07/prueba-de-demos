// ========================================================
// MÓDULO: INTERFAZ Y MODALES (dashboard-ui.js)
// ========================================================
import { db, auth } from './mock-firebase.js';
import { collection, query, where, getDocs, limit, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, increment, writeBatch, addDoc } from "./mock-firebase.js";
import { signOut } from "./mock-firebase.js";
import { sanitize } from './utils.js';
import { getLimitePases, getTotalPasesGenerados, getDatosCompletosVIP, getLinkInvitacion, getPaqueteContratado, getOpcionesMenu, getFlagsEvento } from './dashboard-state.js';

const eventoActivoId = localStorage.getItem('cliente_activo_id');

// Fix #4.1: sanitize importado desde utils.js — exposición global para onclick handlers
window.sanitize = sanitize;

// Helper: genera las opciones de menú dinámicas para los drawers de edición
const _menuEmojiMap = { 'Tradicional': '🍴', 'Vegetariano': '🥗', 'Vegano': '🌱', 'Infantil': '🧸' };
const _menuHoverMap = { 'Tradicional': 'hover:bg-orange-50', 'Vegetariano': 'hover:bg-green-50', 'Vegano': 'hover:bg-emerald-50', 'Infantil': 'hover:bg-amber-50' };
function generarOpcionesMenuDrawer(incluirSinCambios = false) {
    const opciones = getOpcionesMenu();
    let html = '';
    if (incluirSinCambios) {
        html += `<div class="drawer-option px-5 py-3.5 text-[15px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50" data-value="">-- Sin cambios --</div>`;
    }
    opciones.forEach(op => {
        const emoji = _menuEmojiMap[op] || '🍽️';
        const hover = _menuHoverMap[op] || 'hover:bg-slate-50';
        html += `<div class="drawer-option px-5 py-3.5 text-[15px] font-medium text-slate-700 cursor-pointer ${hover}" data-value="${op}">${emoji} ${op}</div>`;
    });
    return html;
}
function getMenuIconHTML(menuActual) {
    if (!menuActual) return '<span class="text-slate-400 font-normal">Seleccionar menú...</span>';
    const emoji = _menuEmojiMap[menuActual] || '🍽️';
    return `${emoji} ${menuActual}`;
}



// Fix #10: Cachear el objeto Audio — no crear uno nuevo en cada llamada
const _dingAudio = new Audio('./assets/ding.mp3');
_dingAudio.volume = 0.5;
window.reproducirDing = function () {
    _dingAudio.currentTime = 0;
    const playPromise = _dingAudio.play();
    if (playPromise !== undefined) { playPromise.catch(error => { console.warn("Nota: Clic previo requerido para audio.", error); }); }
}

// 2. CREAR NUEVO INVITADO
window.abrirModalNuevoInvitado = async function () {
    let prefijo = "VIP";
    try {
        const q = query(collection(db, "invitados"), where("evento_id", "==", eventoActivoId), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) { const primerDoc = snap.docs[0].id; if (primerDoc.includes('-')) { prefijo = primerDoc.split('-')[0]; } }
    } catch (e) { console.error("Error buscando prefijo", e); }

    NativeDrawer.fire({
        title: 'Nuevo Invitado',
        subtitle: 'Añade una nueva familia o titular a la lista.',
        html: `
            <div class="space-y-5 text-left mt-2 pb-4">
                <div>
                    <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Familia / Apellidos <span class="text-red-500">*</span></label>
                    <input type="text" id="drawer-familia" placeholder="Ej. Pérez Rangel" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal" autocomplete="off">
                </div>
                <div>
                    <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Integrantes (Opcional)</label>
                    <input type="text" id="drawer-integrantes" placeholder="Ej. Juan, María, Pedro" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal" autocomplete="off">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Pases <span class="text-red-500">*</span></label>
                        <input type="number" id="drawer-pases" min="1" value="2" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-black text-brand text-center focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">WhatsApp</label>
                        <input type="tel" id="drawer-wa" placeholder="Ej. 8123456789" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal" autocomplete="off">
                    </div>
                </div>
                ${getFlagsEvento().flagMostrarMesa ? `
                <div class="mt-4">
                    <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Mesa Asignada</label>
                    <input type="text" id="drawer-mesa" placeholder="Ej. 12" class="w-full px-5 py-3.5 bg-orange-50/50 border border-orange-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm" autocomplete="off">
                </div>` : ''}
            </div>
        `,
        showCancelButton: true, confirmButtonText: 'Guardar Invitado',
        showLoadingOnConfirm: true,
        preConfirm: () => {
            const familia = document.getElementById('drawer-familia').value.trim();
            const pases = parseInt(document.getElementById('drawer-pases').value);

            if (!familia) { NativeDrawer.showValidationMessage('El nombre es obligatorio', 'drawer-familia'); return false; }
            if (!pases || pases < 1) { NativeDrawer.showValidationMessage('Ingresa un número de pases válido', 'drawer-pases'); return false; }

            const disponibles = getLimitePases() - getTotalPasesGenerados();
            if (pases > disponibles) { NativeDrawer.showValidationMessage(`Límite excedido. Solo tienes ${disponibles} pases disponibles.`, 'drawer-pases'); return false; }

            return { familia, integrantes: document.getElementById('drawer-integrantes').value.trim(), pases, whatsapp: document.getElementById('drawer-wa').value.trim().replace(/\D/g, ''), mesa: getFlagsEvento().flagMostrarMesa ? document.getElementById('drawer-mesa').value.trim() : '' }
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

            let nuevoCodigo = '';
            let intentos = 0;
            const MAX_INTENTOS = 5;

            while (intentos < MAX_INTENTOS) {
                let sufijo = '';
                // Dinámicamente generar la longitud necesaria para que el total (prefijo + '-' + sufijo) sea 9
                const suffixLength = Math.max(4, 9 - (prefijo.length + 1));
                for (let i = 0; i < suffixLength; i++) sufijo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
                const candidato = `${prefijo}-${sufijo}`;
                try {
                    const existente = await getDoc(doc(db, "invitados", candidato));
                    if (!existente.exists()) { nuevoCodigo = candidato; break; }
                } catch (e) { console.warn('Error al verificar código, reintentando...', e); }
                intentos++;
            }

            if (!nuevoCodigo) {
                return NativeModal.fire('Error', 'No se pudo generar un código único. Intenta de nuevo.', 'error');
            }

            try {
                await setDoc(doc(db, "invitados", nuevoCodigo), {
                    evento_id: eventoActivoId,
                    nombre_familia: result.value.familia,
                    integrantes: result.value.integrantes,
                    pases_asignados: result.value.pases,
                    telefono: result.value.whatsapp,
                    mesa: result.value.mesa,
                    estado: 'pendiente',
                    asistiran: 0,
                    quien_confirma: '',
                    fecha_creacion: serverTimestamp()
                });
                toast.success('Invitado guardado', { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
            } catch (error) {
                console.error(error);
                NativeModal.fire('Error', 'Problema al guardar sincronización falló.', 'error');
            }
        }
    });
}

// Escuchador del botón Crear Invitado
document.addEventListener('DOMContentLoaded', () => {
    const btnNuevoInvitado = document.getElementById('btn-nuevo-invitado');
    if (btnNuevoInvitado) { btnNuevoInvitado.addEventListener('click', window.abrirModalNuevoInvitado); }
});

// 3. EDITAR Y ELIMINAR INVITADOS MAESTROS
window.eliminarInvitado = function (idDoc, familia) {
    NativeModal.fire({ title: '¿Eliminar invitado?', text: `Borrarás a "${familia}".`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonText: 'Cancelar', confirmButtonText: 'Sí, eliminar' }).then(async (result) => {
        if (result.isConfirmed) {
            try { await deleteDoc(doc(db, "invitados", idDoc)); toast.success('Eliminado', { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' }); }
            catch (error) { console.error(error); NativeModal.fire('Error', 'No se pudo eliminar.', 'error'); }
        }
    });
};

window.abrirModalEditarInvitado = function (idDoc, datosCodificados) {
    const data = JSON.parse(decodeURIComponent(datosCodificados));
    // Construir opciones del datalist con grupos existentes
    const gruposExistentes = window.getGruposUnicos ? window.getGruposUnicos(window._ultimoSnapshotGrupos) : new Set();
    const datalistOptsEdit = [...gruposExistentes].map(g => `<option value="${g}">`).join('');

    NativeDrawer.fire({
        title: 'Editar Invitado',
        subtitle: `ID: ${idDoc}`,
        html: `
            <div class="space-y-5 text-left mt-2 pb-4">
                <div>
                    <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Familia / Titular <span class="text-red-500">*</span></label>
                    <input type="text" id="drawer-edit-familia" value="${data.nombre_familia || ''}" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm">
                </div>
                <div>
                    <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Integrantes / Confirmó por</label>
                    <input type="text" id="drawer-edit-integrantes" value="${data.quien_confirma || data.integrantes || ''}" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Pases Asignados</label>
                        <input type="number" id="drawer-edit-pases" min="0" value="${data.pases_asignados || 1}" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-black text-brand text-center focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">WhatsApp</label>
                        <input type="tel" id="drawer-edit-wa" value="${data.telefono || ''}" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm">
                    </div>
                </div>
                ${getFlagsEvento().flagMostrarMesa ? `
                <div class="mt-4">
                    <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Mesa Asignada</label>
                    <input type="text" id="drawer-edit-mesa" value="${data.mesa || ''}" class="w-full px-5 py-3.5 bg-orange-50/50 border border-orange-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm" autocomplete="off">
                </div>` : ''}
                <div>
                    <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Estado</label>
                    <select id="drawer-edit-estado" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm appearance-none flex items-center justify-between" style="background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 1rem top 50%; background-size: 0.65rem auto;">
                        <option value="pendiente" ${data.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="confirmado" ${data.estado === 'confirmado' ? 'selected' : ''}>Confirmado</option>
                        <option value="declinado" ${data.estado === 'declinado' ? 'selected' : ''}>Declinado</option>
                    </select>
                </div>
            </div>
        `,
        showCancelButton: true, confirmButtonText: 'Guardar Cambios',
        showLoadingOnConfirm: true,
        preConfirm: () => {
            const pases = parseInt(document.getElementById('drawer-edit-pases').value);
            const dif = pases - parseInt(data.pases_asignados || 0);
            const familia = document.getElementById('drawer-edit-familia').value.trim();

            if (!familia) { NativeDrawer.showValidationMessage('El nombre es obligatorio', 'drawer-edit-familia'); return false; }

            if (dif > 0) {
                const disp = getLimitePases() - getTotalPasesGenerados();
                if (dif > disp) {
                    NativeDrawer.showValidationMessage(`Solo puedes agregar ${disp} pases extra acorde a tu límite actual.`, 'drawer-edit-pases');
                    return false;
                }
            }
            let datResult = {
                nombre_familia: familia,
                integrantes: document.getElementById('drawer-edit-integrantes').value.trim(),
                quien_confirma: document.getElementById('drawer-edit-integrantes').value.trim(),
                pases_asignados: pases,
                telefono: document.getElementById('drawer-edit-wa').value.trim().replace(/\D/g, ''),
                estado: document.getElementById('drawer-edit-estado').value,
                asistiran: document.getElementById('drawer-edit-estado').value === 'confirmado' ? pases : 0
            };
            if (getFlagsEvento().flagMostrarMesa) datResult.mesa = document.getElementById('drawer-edit-mesa').value.trim();
            return datResult;
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const dat = result.value;
                const pasesAnteriores = data.pases_asignados || 1;
                const estadoAnterior = data.estado;
                if ((dat.estado === 'confirmado' || dat.estado === 'declinado') && dat.estado !== estadoAnterior) { dat.fecha_confirmacion = serverTimestamp(); }

                // Set a global flag so dashboard-core knows we are running a post-edit modal and shouldn't interrupt
                window._isPostEditModalActive = true;

                // MODO OFFLINE BUG FIX: Si usamos await aquí, se quedará colgado si no hay internet.
                // Al quitar el await, Firebase guarda localmente y el panel responde rápido.
                updateDoc(doc(db, "invitados", idDoc), dat).catch(e => console.error("Error background sync:", e));

                // ── NOTIFICACIÓN POST-EDICIÓN ──────────────────────────────────────
                // BUG FIX: usar data.telefono (Firestore) como fallback si el campo de edición está vacío.
                // Esto cubre invitados confirmados que no tenían teléfono visible en el modal de edición.
                const telefono = dat.telefono || data.telefono;
                const emailInvitado = data.email_invitado; // Guardado por el formulario público
                const pasesCambiaron = dat.pases_asignados !== pasesAnteriores;
                const estadoCambio = dat.estado !== estadoAnterior;
                const tieneContacto = telefono || emailInvitado;

                if (tieneContacto && (pasesCambiaron || estadoCambio)) {
                    const sFamilia = sanitize(dat.nombre_familia);
                    let descripcionCambio = '';
                    if (pasesCambiaron) descripcionCambio += `<li>Pases: <b>${pasesAnteriores} → ${dat.pases_asignados}</b></li>`;
                    if (estadoCambio) descripcionCambio += `<li>Estado: <b>${estadoAnterior} → ${dat.estado}</b></li>`;

                    const botonesHTML = [];
                    if (telefono) botonesHTML.push(`<button id="notif-wa" class="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-bold text-sm rounded-xl transition-all group"><i class="ph-bold ph-whatsapp-logo text-xl"></i><div class="text-left flex-1"><p class="font-bold">WhatsApp</p><p class="text-[11px] font-normal text-green-600">${telefono}</p></div><i class="ph-bold ph-paper-plane-right text-lg opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all"></i></button>`);
                    if (emailInvitado) botonesHTML.push(`<button id="notif-mail" class="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-sm rounded-xl transition-all group"><i class="ph-bold ph-envelope text-xl"></i><div class="text-left flex-1"><p class="font-bold">Correo</p><p class="text-[11px] font-normal text-blue-600">${emailInvitado}</p></div><i class="ph-bold ph-paper-plane-right text-lg opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all"></i></button>`);

                    NativeModal.fire({
                        title: '<h3 class="text-lg font-black text-primario">¿Notificar al invitado?</h3>',
                        html: `
                            <div class="text-left space-y-4 mt-3">
                                <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                                    <p class="font-bold text-amber-800 mb-1">Cambios en <span class="text-brand">${sFamilia}</span>:</p>
                                    <ul class="text-amber-700 space-y-0.5 list-none">${descripcionCambio}</ul>
                                </div>
                                <p class="text-xs text-secundario"><strong>Selecciona la forma de informar al invitado.</strong><br>El QR del invitado sigue siendo válido, pero puede no conocer los cambios.</p>
                                <div class="space-y-2">${botonesHTML.join('')}</div>
                            </div>
                        `,
                        showConfirmButton: false,
                        showCancelButton: true,
                        cancelButtonText: 'Omitir',
                        willClose: () => { window._isPostEditModalActive = false; },
                        didOpen: () => {
                            const btnWA = document.getElementById('notif-wa');
                            const btnMail = document.getElementById('notif-mail');
                            const link = getLinkInvitacion();

                            if (btnWA) {
                                btnWA.addEventListener('click', () => {
                                    const msj = `¡Hola Familia ${dat.nombre_familia}! 🌟\n\nTe informamos que tu invitación ha sido actualizada.\n\n🎫 *Pases actualizados: ${dat.pases_asignados}*\n🔑 *Tu código:* ${idDoc}\n👉 *Ver invitación:* ${link}`;
                                    const urlDirectaWA = `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(msj)}`;
                                    window.open(urlDirectaWA, '_blank');
                                    window._isPostEditModalActive = false;
                                    NativeModal.closeModal();
                                    toast.success('¡Redirigiendo a WhatsApp!', { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
                                });
                            }
                            if (btnMail) {
                                btnMail.addEventListener('click', async () => {
                                    try {
                                        // Usar el sistema de diseño de correos existente (dashboard-wa.js)
                                        const eventoNombre = document.getElementById('sidebar-evento-nombre')?.textContent || 'Tu Evento';
                                        if (window.enviarEmailConEstilos) {
                                            const contenido = `Te informamos que tu invitación ha sido actualizada por el anfitrión.\n\n<b>Nuevos Pases:</b> ${dat.pases_asignados}`;
                                            await window.enviarEmailConEstilos(emailInvitado, dat.nombre_familia, idDoc, contenido);
                                            window._isPostEditModalActive = false;
                                            NativeModal.closeModal();
                                            toast.success('¡Correo enviado!', { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
                                        } else {
                                            throw new Error("Módulo de correos no cargado");
                                        }
                                    } catch (e) {
                                        console.error("Error al notificar por correo", e);
                                        toast.error('Falló el envío del correo', { className: 'bg-red-50/90 text-red-600 border border-red-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
                                    }
                                });
                            }
                        }
                    });
                } else {
                    toast.success('Invitado actualizado', { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
                    window._isPostEditModalActive = false;
                }
            } catch (error) {
                console.error(error);
                window._isPostEditModalActive = false;
                NativeModal.fire('Error', 'Problema al guardar sincronización falló.', 'error');
            }
        }
    });
};

// 4. FUNCIONES UI DE CHECKBOXES VIP
window.verificarSeleccionMasiva = function () {
    const seleccionados = document.querySelectorAll('.chk-asistente-vip:checked').length;
    const contenedorMasivo = document.getElementById('contenedor-acciones-masivas');
    const btnGruposDetalles = document.getElementById('btn-toggle-grupos-detalles');
    if (contenedorMasivo) {
        if (seleccionados > 0) {
            contenedorMasivo.classList.remove('hidden');
            contenedorMasivo.classList.add('flex');
            if (btnGruposDetalles) btnGruposDetalles.style.display = 'none';
        } else {
            contenedorMasivo.classList.add('hidden');
            contenedorMasivo.classList.remove('flex');
            if (btnGruposDetalles) btnGruposDetalles.style.display = 'flex';
        }
    }
}

window.toggleAllCheckboxesVIP = function () {
    const btn = document.getElementById('btn-select-all-vip'); if (!btn) return;
    const isChecked = btn.dataset.checked === 'true'; const newState = !isChecked;
    document.querySelectorAll('.chk-asistente-vip').forEach(chk => { const row = chk.closest('tr'); if (row.style.display !== 'none') chk.checked = newState; });
    btn.dataset.checked = newState.toString();
    if (newState) { btn.innerHTML = '<i class="ph-fill ph-check-square-offset text-brand text-lg"></i> <span class="hidden sm:inline">Desmarcar</span>'; btn.classList.replace('bg-gray-50', 'bg-brand-light'); btn.classList.replace('text-gray-600', 'text-brand'); }
    else { btn.innerHTML = '<i class="ph-bold ph-check-square-offset text-lg"></i> <span class="hidden sm:inline">Todos</span>'; btn.classList.replace('bg-brand-light', 'bg-gray-50'); btn.classList.replace('text-brand', 'text-gray-600'); }
    window.verificarSeleccionMasiva();
}

// 5. EDICIÓN Y ELIMINACIÓN DE ASISTENTES VIP
window.edicionMasivaVIP = async function () {
    const checkboxes = Array.from(document.querySelectorAll('.chk-asistente-vip:checked')); if (checkboxes.length === 0) return;
    NativeDrawer.fire({
        title: 'Edición Masiva',
        subtitle: `Editando ${checkboxes.length} pases al mismo tiempo.`,
        html: `
            <style>.drawer-custom-select.open .drawer-trigger { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2); background-color: #ffffff; } .drawer-custom-select.open .drawer-arrow { transform: rotate(180deg); color: #3b82f6; }</style>
            <div class="space-y-5 text-left mt-2 pb-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Menú</label>
                        <div class="drawer-custom-select relative text-left w-full z-50">
                            <div class="drawer-trigger flex items-center justify-between w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-primario cursor-pointer transition-all shadow-sm"><span id="drawer-select-text">-- Sin cambios --</span><i class="drawer-arrow ph-bold ph-caret-down transition-transform"></i></div>
                            <!-- Las opciones se moverán al body dinámicamente -->
                            <div class="drawer-options bg-white border border-slate-100 rounded-2xl shadow-xl z-[10000] opacity-0 pointer-events-none transition-all overflow-hidden hidden">${generarOpcionesMenuDrawer(true)}</div>
                            <input type="hidden" id="evip-menu" value="">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-orange-500 uppercase mb-1.5 ml-1"><i class="ph-fill ph-table"></i> N° Mesa</label>
                        <input id="evip-mesa" type="text" placeholder="Sin cambios" class="w-full px-5 py-3.5 bg-orange-50/50 border border-orange-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all shadow-sm placeholder:text-orange-300">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Alergias / Notas</label>
                    <input id="evip-alergias" type="text" placeholder="Sin cambios" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm placeholder:text-slate-400">
                </div>
            </div>
        `,
        showCancelButton: true, confirmButtonText: 'Aplicar a Todos',
        showLoadingOnConfirm: true,
        didOpen: () => {
            const wrapper = document.querySelector('.drawer-custom-select');
            const options = wrapper.querySelector('.drawer-options');

            // Move options to body to escape any overflow:hidden containers
            document.body.appendChild(options);

            wrapper.querySelector('.drawer-trigger').addEventListener('click', e => {
                e.stopPropagation();
                if (!wrapper.classList.contains('open')) {
                    const rect = wrapper.querySelector('.drawer-trigger').getBoundingClientRect();
                    options.style.position = 'fixed';
                    options.style.top = (rect.bottom + 8) + 'px';
                    options.style.left = rect.left + 'px';
                    options.style.width = rect.width + 'px';
                    wrapper.classList.add('open');
                    options.style.display = 'block';
                    setTimeout(() => {
                        options.style.opacity = '1';
                        options.style.pointerEvents = 'auto';
                    }, 10);
                } else {
                    wrapper.classList.remove('open');
                    options.style.opacity = '0';
                    options.style.pointerEvents = 'none';
                    setTimeout(() => {
                        if (!wrapper.classList.contains('open')) options.style.display = 'none';
                    }, 300);
                }
            });
            options.querySelectorAll('.drawer-option').forEach(opt => { opt.addEventListener('click', e => { e.stopPropagation(); document.getElementById('evip-menu').value = opt.dataset.value; document.getElementById('drawer-select-text').innerHTML = opt.innerHTML; wrapper.classList.remove('open'); options.style.opacity = '0'; options.style.pointerEvents = 'none'; setTimeout(() => { options.style.display = 'none'; }, 300); }); });
            window._drawerDropdownHandler = (e) => { if (!wrapper.contains(e.target) && !options.contains(e.target)) { wrapper.classList.remove('open'); options.style.opacity = '0'; options.style.pointerEvents = 'none'; setTimeout(() => { options.style.display = 'none'; }, 300); } };
            document.addEventListener('click', window._drawerDropdownHandler);
        },
        willClose: () => {
            if (window._drawerDropdownHandler) { document.removeEventListener('click', window._drawerDropdownHandler); window._drawerDropdownHandler = null; }

            // Cleanup the appended element
            const options = document.querySelector('.drawer-options');
            if (options && options.parentNode === document.body) {
                document.body.removeChild(options);
            }
        },
        preConfirm: () => { return { menu: document.getElementById('evip-menu').value, mesa: document.getElementById('evip-mesa').value.trim(), alergias: document.getElementById('evip-alergias').value.trim() } }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const formValues = result.value;
            toast('Guardando cambios masivos...', { id: 'toast-save', duration: 100000 });
            const clearToasts = () => { const c = document.getElementById('sonner-toast-container'); if (c) c.innerHTML = ''; };

            try {
                // BUG-01: Usar getDatosCompletosVIP() del módulo de estado en lugar de window.datosCompletosVIP
                const vipData = getDatosCompletosVIP();
                const act = {}; checkboxes.forEach(chk => { const idD = chk.dataset.iddoc; const idx = chk.dataset.index; if (!act[idD]) act[idD] = vipData[idD] ? JSON.parse(JSON.stringify(vipData[idD])) : []; if (formValues.menu !== "") act[idD][idx].menu = formValues.menu; if (formValues.mesa !== "") act[idD][idx].mesa = formValues.mesa; if (formValues.alergias !== "") act[idD][idx].alergias = formValues.alergias; });
                const promesas = []; for (const [idD, arr] of Object.entries(act)) { promesas.push(updateDoc(doc(db, "invitados", idD), { detalles_asistentes: arr }).catch(e => console.error(e))); }
                // No hacemos await estricto por la persistencia offline, asumimos éxito rápido
                document.getElementById('btn-select-all-vip').dataset.checked = "true"; window.toggleAllCheckboxesVIP();
                clearToasts(); setTimeout(() => toast.success('¡Cambios aplicados a todos!', { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' }), 50);
            } catch (e) {
                console.error(e);
                clearToasts(); setTimeout(() => NativeModal.fire('Error', 'Problema de conexión.', 'error'), 50);
            }
        }
    });
}

window.editarAsistenteVIP = async function (idDocClic, indexClic, nombreActual, menuActual, mesaActual, alergiasActual) {
    if (document.querySelectorAll('.chk-asistente-vip:checked').length > 1) return window.edicionMasivaVIP();
    let menuIconHTML = getMenuIconHTML(menuActual);

    NativeDrawer.fire({
        title: 'Editar Asistente',
        subtitle: `Personaliza la información individual`,
        html: `
            <style>.drawer-custom-select.open .drawer-trigger { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2); background-color: #ffffff; } .drawer-custom-select.open .drawer-arrow { transform: rotate(180deg); color: #3b82f6; }</style>
            <div class="space-y-5 text-left mt-2 pb-4">
                <div>
                    <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Nombre Completo <span class="text-red-500">*</span></label>
                    <input id="evip-nombre" type="text" value="${nombreActual}" placeholder="Ej. Juan Pérez" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Menú</label>
                        <div class="drawer-custom-select relative text-left w-full z-50">
                            <div class="drawer-trigger flex items-center justify-between w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-primario cursor-pointer transition-all shadow-sm"><span id="drawer-select-text">${menuIconHTML}</span><i class="drawer-arrow ph-bold ph-caret-down transition-transform"></i></div>
                            <div class="drawer-options bg-white border border-slate-100 rounded-2xl shadow-xl z-[10000] opacity-0 pointer-events-none transition-all overflow-hidden hidden">${generarOpcionesMenuDrawer(false)}</div>
                            <input type="hidden" id="evip-menu" value="${menuActual}">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-orange-500 uppercase mb-1.5 ml-1"><i class="ph-fill ph-table"></i> N° Mesa</label>
                        <input id="evip-mesa" type="text" value="${mesaActual}" placeholder="Ej. 12" class="w-full px-5 py-3.5 bg-orange-50/50 border border-orange-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all shadow-sm">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Alergias / Notas</label>
                    <input id="evip-alergias" type="text" value="${alergiasActual}" placeholder="Ej. Alérgico al maní" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-bold text-primario focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm">
                </div>
            </div>
        `,
        showCancelButton: true, confirmButtonText: 'Guardar Cambios',
        showLoadingOnConfirm: true,
        didOpen: () => {
            const wrapper = document.querySelector('.drawer-custom-select');
            const options = wrapper.querySelector('.drawer-options');

            // Si el modal restringe el overflow de elementos absolutos, lo mejor es mover las opciones al body.
            document.body.appendChild(options);

            wrapper.querySelector('.drawer-trigger').addEventListener('click', e => {
                e.stopPropagation();
                if (!wrapper.classList.contains('open')) {
                    const rect = wrapper.querySelector('.drawer-trigger').getBoundingClientRect();
                    options.style.position = 'fixed';
                    options.style.top = (rect.bottom + 8) + 'px';
                    options.style.left = rect.left + 'px';
                    options.style.width = rect.width + 'px';
                    wrapper.classList.add('open');
                    options.style.display = 'block';
                    // Pequeño delay para la animación
                    setTimeout(() => {
                        options.style.opacity = '1';
                        options.style.pointerEvents = 'auto';
                    }, 10);
                } else {
                    wrapper.classList.remove('open');
                    options.style.opacity = '0';
                    options.style.pointerEvents = 'none';
                    setTimeout(() => {
                        if (!wrapper.classList.contains('open')) options.style.display = 'none';
                    }, 300); // Wait for transition
                }
            });
            options.querySelectorAll('.drawer-option').forEach(opt => { opt.addEventListener('click', e => { e.stopPropagation(); document.getElementById('evip-menu').value = opt.dataset.value; document.getElementById('drawer-select-text').innerHTML = opt.innerHTML; wrapper.classList.remove('open'); options.style.opacity = '0'; options.style.pointerEvents = 'none'; setTimeout(() => { options.style.display = 'none'; }, 300); }); });
            window._drawerDropdownHandler2 = (e) => { if (!wrapper.contains(e.target) && !options.contains(e.target)) { wrapper.classList.remove('open'); options.style.opacity = '0'; options.style.pointerEvents = 'none'; setTimeout(() => { options.style.display = 'none'; }, 300); } };
            document.addEventListener('click', window._drawerDropdownHandler2);
        },
        willClose: () => {
            if (window._drawerDropdownHandler2) { document.removeEventListener('click', window._drawerDropdownHandler2); window._drawerDropdownHandler2 = null; }

            // Cleanup the appended element
            const options = document.querySelector('.drawer-options');
            if (options && options.parentNode === document.body) {
                document.body.removeChild(options);
            }
        },
        preConfirm: () => {
            const nombre = document.getElementById('evip-nombre').value.trim();
            if (!nombre) { NativeDrawer.showValidationMessage('El nombre es obligatorio', 'evip-nombre'); return false; }
            return { nombre, menu: document.getElementById('evip-menu').value, mesa: document.getElementById('evip-mesa').value.trim(), alergias: document.getElementById('evip-alergias').value.trim() }
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const formValues = result.value;
            try {
                // BUG-01: Usar getDatosCompletosVIP() del módulo de estado
                const vipData = getDatosCompletosVIP();
                let act = vipData[idDocClic] ? JSON.parse(JSON.stringify(vipData[idDocClic])) : [];
                if (act[indexClic]) { act[indexClic].nombre = formValues.nombre; act[indexClic].menu = formValues.menu; act[indexClic].alergias = formValues.alergias; act[indexClic].mesa = formValues.mesa; }
                updateDoc(doc(db, "invitados", idDocClic), { detalles_asistentes: act }).catch(e => console.error(e)); document.querySelectorAll('.chk-asistente-vip').forEach(c => c.checked = false); window.verificarSeleccionMasiva(); toast.success('Asistente guardado', { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
            } catch (error) { console.error(error); NativeModal.fire('Error', 'No se guardaron los cambios.', 'error'); }
        }
    });
}

window.eliminarMasivoVIP = async function () {
    const sel = Array.from(document.querySelectorAll('.chk-asistente-vip:checked')); if (sel.length === 0) return;
    const { isConfirmed } = await NativeModal.fire({ title: '¿Eliminar en grupo?', text: `Restarás ${sel.length} pases.`, icon: 'warning', showCancelButton: true, cancelButtonText: 'Cancelar', confirmButtonText: 'Eliminar', confirmButtonColor: '#EF4444' });
    if (!isConfirmed) return;
    toast('Eliminando...', { id: 'toast-delete', duration: 100000 });
    const clearToasts = () => { const c = document.getElementById('sonner-toast-container'); if (c) c.innerHTML = ''; };
    try {
        // BUG-01: Usar getDatosCompletosVIP() del módulo de estado
        const vipData = getDatosCompletosVIP();
        const docObj = {}; sel.forEach(chk => { const idDoc = chk.dataset.iddoc; const idx = parseInt(chk.dataset.index); const ads = parseInt(chk.dataset.adultos); const nns = parseInt(chk.dataset.ninos); const asis = parseInt(chk.dataset.asistiran); if (!docObj[idDoc]) { docObj[idDoc] = { idxs: [], orig: vipData[idDoc] ? JSON.parse(JSON.stringify(vipData[idDoc])) : [], adTot: ads, nnTot: nns, asTot: asis }; } docObj[idDoc].idxs.push(idx); });
        const promesas = [];
        for (const [idDoc, d] of Object.entries(docObj)) {
            d.idxs.sort((a, b) => b - a); let adR = 0, nnR = 0; d.idxs.forEach(idx => { if (idx < d.adTot) adR++; else nnR++; d.orig.splice(idx, 1); });
            let nAsis = Math.max(0, d.asTot - d.idxs.length); let act = { detalles_asistentes: d.orig, asistiran: nAsis };
            if (d.adTot > 0) act.adultos = Math.max(0, d.adTot - adR); if (d.nnTot > 0) act.ninos = Math.max(0, d.nnTot - nnR);
            if (nAsis === 0) act.estado = 'declinado'; promesas.push(updateDoc(doc(db, "invitados", idDoc), act).catch(e => console.error(e)));
        }
        // No hacemos await para que no se trabe en offline
        document.getElementById('btn-select-all-vip').dataset.checked = "true"; window.toggleAllCheckboxesVIP();
        clearToasts(); setTimeout(() => toast.success('Eliminados.', { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' }), 50);
    } catch (e) { console.error(e); clearToasts(); setTimeout(() => NativeModal.fire('Error', 'Fallo conexión.', 'error'), 50); }
}

window.eliminarAsistenteVIP = function (idDoc, index, cantAdultos, cantNinos, cantAsistiran) {
    if (document.querySelectorAll('.chk-asistente-vip:checked').length > 1) return window.eliminarMasivoVIP();
    NativeModal.fire({ title: '¿Eliminar asistente?', text: 'Se restará un pase.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#EF4444' }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // BUG-01: Usar getDatosCompletosVIP() del módulo de estado
                const vipData = getDatosCompletosVIP();
                let actList = vipData[idDoc] ? JSON.parse(JSON.stringify(vipData[idDoc])) : []; actList.splice(index, 1); let nAsis = Math.max(0, cantAsistiran - 1); let act = { detalles_asistentes: actList, asistiran: nAsis };
                if (cantAdultos > 0 || cantNinos > 0) { if (index < cantAdultos) act.adultos = Math.max(0, cantAdultos - 1); else act.ninos = Math.max(0, cantNinos - 1); }
                if (nAsis === 0) act.estado = 'declinado';
                updateDoc(doc(db, "invitados", idDoc), act).catch(e => console.error(e)); document.querySelectorAll('.chk-asistente-vip').forEach(c => c.checked = false); window.verificarSeleccionMasiva(); toast.success('Eliminado', { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
            } catch (error) { console.error(error); NativeModal.fire('Error', 'Fallo al eliminar.', 'error'); }
        }
    });
}
// ========================================================
// MÓDULO DE ESCÁNER QR (Flujo de Hostess)
// ========================================================
window.abrirScannerQR = function () {
    NativeModal.fire({
        title: '<h3 class="text-xl font-black text-primario flex items-center justify-center gap-2"><i class="ph-bold ph-camera text-indigo-500"></i> Escáner de Accesos</h3>',
        html: `
            <div class="mb-4 text-sm text-secundario">Apunta la cámara al Código QR del invitado.</div>
            <div id="qr-reader" class="mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl border-2 border-indigo-100 shadow-inner"></div>
        `,
        showCancelButton: true,
        showConfirmButton: false,
        cancelButtonText: 'Cerrar Cámara', // Fix #5: eliminado cancelButtonText duplicado
        didOpen: () => {
            window.html5QrCode = new Html5Qrcode("qr-reader");
            window._isModalQRClosed = false;
            // Configuramos la cámara (preferimos la trasera si está en celular)
            const config = { fps: 10, qrbox: { width: 220, height: 220 } };

            window.html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    // ¡BINGO! Leyó un código
                    window.html5QrCode.stop()
                        .then(() => {
                            window.html5QrCode.clear();
                            if (!window._isModalQRClosed) {
                                window._isModalQRClosed = true; // prevent multiple scans
                                NativeModal.closeModal();
                                // BUGFIX: wait for the 300ms close animation of the camera modal before firing the next modal
                                setTimeout(() => {
                                    window.procesarEscaneoQR(decodedText);
                                }, 350);
                            }
                        })
                        .catch(err => console.error("Error al detener cámara:", err));
                },
                (errorMessage) => { /* Ignoramos los errores de lectura frame por frame */ }
            ).then(() => {
                // If the user closed the modal while the camera was booting up
                if (window._isModalQRClosed) {
                    window.html5QrCode.stop()
                        .then(() => window.html5QrCode.clear())
                        .catch(err => console.error(err));
                }
            }).catch(err => {
                console.error("Error iniciando cámara", err);
                if (!window._isModalQRClosed) {
                    const el = document.getElementById('qr-reader');
                    if (el) el.innerHTML = '<p class="text-red-500 font-bold p-4 bg-red-50 rounded-xl">No se pudo acceder a la cámara. Verifica los permisos de tu navegador.</p>';
                }
            });
        },
        willClose: () => {
            window._isModalQRClosed = true;
            // Apagamos la cámara si el usuario cierra la ventana manualmente
            if (window.html5QrCode && window.html5QrCode.isScanning) {
                window.html5QrCode.stop()
                    .then(() => window.html5QrCode.clear())
                    .catch(e => console.error(e));
            }
        }
    });
}

// EL CEREBRO DE LA RECEPCIÓN
window.procesarEscaneoQR = async function (codigoBoleto) {
    toast('Verificando Boleto...', { id: 'toast-scan', duration: 100000 });
    const clearToasts = () => { const c = document.getElementById('sonner-toast-container'); if (c) c.innerHTML = ''; };

    try {
        const eventoActivoId = localStorage.getItem('cliente_activo_id');
        const docRef = doc(db, "invitados", codigoBoleto);
        const docSnap = await getDoc(docRef);
        clearToasts();

        // 1. ¿Existe el código?
        if (!docSnap.exists()) {
            return NativeModal.fire({ icon: 'error', title: 'Código Inválido', text: 'Este código no existe en la base de datos.', confirmButtonText: 'Volver a escanear' }).then(() => window.abrirScannerQR());
        }

        const data = docSnap.data();

        // 2. ¿Es un colado de otra fiesta?
        if (data.evento_id !== eventoActivoId) {
            return NativeModal.fire({ icon: 'error', title: 'Evento Incorrecto', text: 'Este pase pertenece a otro evento distinto.', confirmButtonText: 'Volver a escanear' }).then(() => window.abrirScannerQR());
        }

        // 3. ¿Realmente confirmó?
        if (data.estado !== 'confirmado') {
            return NativeModal.fire({ icon: 'warning', title: 'Acceso Denegado', text: `La invitación de la familia ${data.nombre_familia} se encuentra marcada como: ${data.estado.toUpperCase()}`, confirmButtonText: 'Volver a escanear' }).then(() => window.abrirScannerQR());
        }

        // 4. ¿Ya entraron todos?
        const ingresados = data.pases_ingresados || 0;
        const asistiran = data.asistiran || 0;

        if (ingresados >= asistiran) {
            return NativeModal.fire({ icon: 'warning', title: 'Pases Agotados', html: `La familia <b>${data.nombre_familia}</b> ya registró el ingreso de sus <b>${asistiran}</b> invitados en la entrada.`, confirmButtonText: 'Volver a escanear' }).then(() => window.abrirScannerQR());
        }

        // 5. ¡Pase Válido! Preguntamos cuántos de la familia están cruzando la puerta en este instante
        const restantes = asistiran - ingresados;

        // --- INICIO LÓGICA DE MESAS ---
        let htmlMesas = '';
        const paqueteContratado = (typeof getPaqueteContratado === 'function') ? getPaqueteContratado() : 'normal';

        if (paqueteContratado === 'vip' && data.detalles_asistentes && data.detalles_asistentes.length > 0) {
            // Agrupar por mesa
            const agrupado = {};
            let sinMesa = [];
            data.detalles_asistentes.forEach(asis => {
                const mesaAsis = asis.mesa ? asis.mesa.trim() : (data.mesa ? data.mesa.trim() : '');
                const nombreAsis = asis.nombre || 'Asistente';
                if (mesaAsis) {
                    if (!agrupado[mesaAsis]) agrupado[mesaAsis] = [];
                    agrupado[mesaAsis].push(nombreAsis);
                } else {
                    sinMesa.push(nombreAsis);
                }
            });

            const mesasKeys = Object.keys(agrupado);
            if (mesasKeys.length === 1 && sinMesa.length === 0) {
                // Todos están en la misma mesa
                htmlMesas = `
                    <div class="mt-3 bg-orange-50 border border-orange-100 p-2.5 rounded-lg flex items-center gap-2">
                        <i class="ph-fill ph-table text-orange-500 text-lg"></i>
                        <span class="text-sm font-bold text-orange-700">Mesa: ${sanitize(mesasKeys[0])} <span class="text-orange-500 font-normal text-xs ml-1">(Todos)</span></span>
                    </div>
                `;
            } else if (mesasKeys.length > 0) {
                // Mesas múltiples
                let listaMesas = mesasKeys.map(m => {
                    const nombres = agrupado[m].join(', ');
                    return `<div class="text-xs mb-1.5 last:mb-0"><span class="font-bold text-orange-700 block">Mesa ${sanitize(m)}</span><span class="text-orange-600">${sanitize(nombres)}</span></div>`;
                }).join('');

                if (sinMesa.length > 0) {
                    listaMesas += `<div class="text-xs mt-2 pt-2 border-t border-orange-200/50"><span class="font-bold text-slate-500 block">Sin mesa asignada</span><span class="text-slate-500">${sanitize(sinMesa.join(', '))}</span></div>`;
                }

                htmlMesas = `
                    <div class="mt-3 bg-orange-50/80 border border-orange-100 p-3 rounded-lg flex gap-2.5 items-start">
                        <i class="ph-fill ph-table text-orange-500 text-lg mt-0.5 shrink-0"></i>
                        <div class="flex-1">${listaMesas}</div>
                    </div>
                `;
            }
        } else if (data.mesa && data.mesa.trim() !== '') {
            // Paquete normal pero tiene mesa
            htmlMesas = `
                <div class="mt-3 bg-orange-50 border border-orange-100 p-2.5 rounded-lg flex items-center gap-2">
                    <i class="ph-fill ph-table text-orange-500 text-lg"></i>
                    <span class="text-sm font-bold text-orange-700">Mesa: ${sanitize(data.mesa.trim())}</span>
                </div>
            `;
        }
        // --- FIN LÓGICA DE MESAS ---

        NativeModal.fire({
            title: '<h3 class="text-2xl font-black text-green-600 mb-2">¡Pase Válido! 🎉</h3>',
            html: `
                <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-5 text-left shadow-sm">
                    <p class="text-[11px] text-secundario uppercase font-bold tracking-wider mb-1">Familia / Titular</p>
                    <p class="text-xl font-black text-primario mb-3">${data.nombre_familia}</p>
                    
                    ${htmlMesas}

                    <div class="flex justify-between items-center border-t border-slate-200 pt-3 ${htmlMesas ? 'mt-3' : ''}">
                        <span class="text-sm font-medium text-secundario">Pases Disponibles:</span>
                        <span class="bg-green-100 text-green-700 font-black px-4 py-1.5 rounded-lg text-lg">${restantes}</span>
                    </div>
                </div>
                <label class="block text-xs font-bold text-secundario uppercase mb-2">¿Cuántos de ellos ingresan ahora?</label>
                <input type="number" id="qr-pases-entrar" min="1" max="${restantes}" value="${restantes}" class="w-full text-center font-black text-4xl text-brand bg-brand-light/30 border-2 border-brand/30 rounded-xl py-4 focus:border-brand focus:outline-none transition-colors">
            `,
            showCancelButton: true,
            confirmButtonText: 'Registrar Ingreso <i class="ph-bold ph-check ml-1"></i>',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10B981',
            preConfirm: () => {
                const val = parseInt(document.getElementById('qr-pases-entrar').value);
                if (val < 1 || val > restantes) { NativeModal.showValidationMessage('Cantidad inválida'); return false; }
                return val;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                // Actualizamos la base de datos de forma segura usando increment() pero sin await (offline sync)
                updateDoc(docRef, {
                    pases_ingresados: increment(result.value)
                }).catch(e => console.error(e));

                toast.success(`Ingresaron ${result.value} de la Familia ${data.nombre_familia}`, { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });

                // MÁGIA DE HOSTESS: Vuelve a abrir la cámara en medio segundo para que siga escaneando sin tocar nada
                setTimeout(() => window.abrirScannerQR(), 700);
            } else {
                // Si la Hostess le dio a cancelar, también regresamos a la cámara por comodidad
                window.abrirScannerQR();
            }
        });

    } catch (e) {
        console.error(e);
        clearToasts();
        NativeModal.fire('Error', 'Hubo un problema de conexión con el servidor.', 'error');
    }
}
// ========================================================
// EDITAR EDADES EN PLAN BÁSICO
// ========================================================
window.editarEdadesBasico = function (idDoc, titular, adultos, ninos) {
    NativeDrawer.fire({
        title: 'Ajustar Edades',
        subtitle: `Modificando pases de ${titular}`,
        html: `
            <div class="space-y-5 text-left mt-2 pb-4">
                <div class="flex gap-4 justify-center mt-2">
                    <div class="flex-1">
                        <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Adultos 🧑</label>
                        <input type="number" id="drawer-edit-b-adultos" value="${adultos}" min="0" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-black text-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-sm text-center">
                    </div>
                    <div class="flex-1">
                        <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Niños 🧸</label>
                        <input type="number" id="drawer-edit-b-ninos" value="${ninos}" min="0" class="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-black text-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all shadow-sm text-center">
                    </div>
                </div>
                <div class="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl text-sm text-amber-800 flex items-start gap-3 shadow-sm">
                    <i class="ph-fill ph-warning-circle text-amber-500 text-xl shrink-0 mt-0.5"></i>
                    <p><strong>Atención:</strong> Guardar estos cambios modificará también el total de pases consumidos por el código.</p>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar Cambios',
        showLoadingOnConfirm: true,
        preConfirm: () => {
            const a = parseInt(document.getElementById('drawer-edit-b-adultos').value) || 0;
            const n = parseInt(document.getElementById('drawer-edit-b-ninos').value) || 0;
            return { adultos: a, ninos: n, total: a + n };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // Actualizamos en Firebase (sin await para soporte offline)
                updateDoc(doc(db, "invitados", idDoc), {
                    adultos: result.value.adultos,
                    ninos: result.value.ninos,
                    asistiran: result.value.total
                }).catch(e => console.error(e));
                toast.success('Cantidades actualizadas', { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
            } catch (e) {
                console.error(e);
                NativeModal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
            }
        }
    });
};
