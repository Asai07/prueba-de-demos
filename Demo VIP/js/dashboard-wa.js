// ========================================================
// MÓDULO: MOTOR DE WHATSAPP (dashboard-wa.js)
// ========================================================
import { db } from './mock-firebase.js';
import { doc, updateDoc, serverTimestamp, getDoc, collection, query, where, getDocs, addDoc } from "./mock-firebase.js";
import { normalize, debounce } from './utils.js';
import { getMensajesWA, setMensajesWA, getLinkInvitacion, getFiltroEnviosWA, setFiltroEnviosWA } from './dashboard-state.js';
window.enviarWhatsApp = async function (telefono, familia, codigo, pases, esRecordatorio = false, mesa = "") {
    if (!telefono) return;
    const eventoActivoId = localStorage.getItem('cliente_activo_id');

    // Leemos las variables globales inyectadas desde el core
    const msjData = getMensajesWA();
    let plantilla = esRecordatorio ? msjData.customMsjRecordatorio : msjData.customMsjNuevo;
    let msj = plantilla.replace(/\[FAMILIA\]/g, familia)
        .replace(/\[PASES\]/g, pases)
        .replace(/\[CODIGO\]/g, codigo)
        .replace(/\[LINK\]/g, getLinkInvitacion())
        .replace(/\[MESA\]/g, mesa);

    // Fix #8: console.log eliminado — no exponer contenido de mensajes en DevTools
    const urlDirectaWA = `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(msj)}`;

    window.open(urlDirectaWA, '_blank');

    try { await updateDoc(doc(db, "invitados", codigo), { fecha_wa: serverTimestamp() }); }
    catch (error) { console.error("No se pudo registrar actividad de WA:", error); }
}

window.guardarAjustesWA = async function () {
    const eventoActivoId = localStorage.getItem('cliente_activo_id');
    const btn = document.querySelector('button[onclick="window.guardarAjustesWA()"]');
    // BUG-04: Guard — el botón puede no existir en el plan normal
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-lg"></i> Guardando...';
    btn.disabled = true;

    const nvo = document.getElementById('ajuste-msj-nuevo').value.trim();
    const rec = document.getElementById('ajuste-msj-recordatorio').value.trim();

    if (!nvo || !rec) {
        NativeModal.fire('Atención', 'Los mensajes no pueden quedar vacíos', 'warning');
        btn.innerHTML = originalText; btn.disabled = false; return;
    }

    try {
        await updateDoc(doc(db, "eventos", eventoActivoId), { msj_nuevo: nvo, msj_recordatorio: rec });
        setMensajesWA(nvo, rec);
        toast.success('Textos actualizados', { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
    } catch (error) {
        console.error(error); NativeModal.fire('Error', 'No se pudieron guardar los ajustes', 'error');
    } finally {
        btn.innerHTML = originalText; btn.disabled = false;
    }
}

// LÓGICA DE FILTROS DE WHATSAPP

window.cambiarFiltroEnvios = function (filtro, botonElemento) {
    setFiltroEnviosWA(filtro);
    const botones = document.querySelectorAll('.filtro-btn-envios');
    const clasesBase = 'filtro-btn-envios px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap cursor-pointer';

    botones.forEach(b => {
        const tipo = b.getAttribute('data-filtro'); b.className = clasesBase;
        if (tipo === 'todos') b.classList.add('bg-white', 'text-brand', 'border-pink-200', 'hover:bg-pink-50');
        if (tipo === 'pendientes_enviar') b.classList.add('bg-white', 'text-green-600', 'border-green-200', 'hover:bg-green-50');
        if (tipo === 'recordatorios') b.classList.add('bg-white', 'text-orange-500', 'border-orange-200', 'hover:bg-orange-50');
        if (tipo === 'respondidos') b.classList.add('bg-white', 'text-secundario', 'border-gray-200', 'hover:bg-gray-50');
    });

    botonElemento.className = clasesBase + ' shadow-sm text-white';
    if (filtro === 'todos') botonElemento.classList.add('bg-brand', 'border-brand', 'hover:bg-brand-dark');
    if (filtro === 'pendientes_enviar') botonElemento.classList.add('bg-green-500', 'border-green-500', 'hover:bg-green-600');
    if (filtro === 'recordatorios') botonElemento.classList.add('bg-orange-500', 'border-orange-500', 'hover:bg-orange-600');
    if (filtro === 'respondidos') botonElemento.classList.add('bg-secundario', 'border-secundario', 'hover:bg-gray-600');
    window.aplicarFiltrosEnvios();
}

window.aplicarFiltrosEnvios = function () {
    const input = document.getElementById('buscador-envios');
    // Fix #4.2: normalize importado desde utils.js
    const termino = input ? normalize(input.value) : '';
    const filasEnvios = document.querySelectorAll('#tabla-envios tr.fila-envio');

    filasEnvios.forEach(fila => {
        // PERF-01: textContent no fuerza reflow del layout (innerText sí lo hace)
        const textoFila = normalize(fila.textContent);
        const estado = fila.getAttribute('data-estado');
        const enviado = fila.getAttribute('data-enviado');
        const cumpleTexto = textoFila.includes(termino);
        let cumpleFiltro = false;

        const filtroActivoEnvios = getFiltroEnviosWA();
        if (filtroActivoEnvios === 'todos') { cumpleFiltro = true; }
        else if (filtroActivoEnvios === 'pendientes_enviar') { cumpleFiltro = (estado === 'pendiente' && enviado === 'no'); }
        else if (filtroActivoEnvios === 'recordatorios') { cumpleFiltro = (estado === 'pendiente' && enviado === 'si'); }
        else if (filtroActivoEnvios === 'respondidos') { cumpleFiltro = (estado === 'confirmado' || estado === 'declinado'); }

        if (cumpleTexto && cumpleFiltro) { fila.style.display = ''; } else { fila.style.display = 'none'; }
    });
}

// Fix #3.1: Pre-crear la función debounceada (la layout la referencia como window._debouncedFiltrosEnvios)
window._debouncedFiltrosEnvios = debounce(() => window.aplicarFiltrosEnvios(), 300);
// ========================================================
// MÓDULO: RECORDATORIOS POR CORREO MASIVO
// ========================================================

window.guardarAjustesCorreo = async function () {
    const eventoActivoId = localStorage.getItem('cliente_activo_id');
    const template = document.querySelector('input[name="mail-template"]:checked').value;

    const datosGuardar = {
        mail_template: template,
        mail_asunto: document.getElementById('ajuste-mail-asunto').value.trim(),
        mail_mensaje: document.getElementById('ajuste-mail-mensaje').value.trim(),
        mail_inc_hora: document.getElementById('chk-mail-hora').checked,

        mail_h1_icon: document.getElementById('ajuste-mail-h1-icon').value.trim(),
        mail_h1_tit: document.getElementById('ajuste-mail-h1-tit').value.trim(),
        mail_h1: document.getElementById('ajuste-mail-h1').value.trim(),

        mail_h2_icon: document.getElementById('ajuste-mail-h2-icon').value.trim(),
        mail_h2_tit: document.getElementById('ajuste-mail-h2-tit').value.trim(),
        mail_h2: document.getElementById('ajuste-mail-h2').value.trim(),

        mail_h3_icon: document.getElementById('ajuste-mail-h3-icon').value.trim(),
        mail_h3_tit: document.getElementById('ajuste-mail-h3-tit').value.trim(),
        mail_h3: document.getElementById('ajuste-mail-h3').value.trim(),

        mail_h4_icon: document.getElementById('ajuste-mail-h4-icon').value.trim(),
        mail_h4_tit: document.getElementById('ajuste-mail-h4-tit').value.trim(),
        mail_h4: document.getElementById('ajuste-mail-h4').value.trim(),

        mail_inc_btn: document.getElementById('chk-mail-boton').checked,
        mail_btn_texto: document.getElementById('ajuste-mail-btn-texto').value.trim(),
        mail_mapa: document.getElementById('ajuste-mail-mapa').value.trim(),
        mail_inc_qr: document.getElementById('chk-mail-qr').checked
    };

    try {
        await updateDoc(doc(db, "eventos", eventoActivoId), datosGuardar);
        toast.success('Ajustes Guardados', { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
    } catch (e) { console.error(e); NativeModal.fire('Error', 'No se guardaron los ajustes', 'error'); }
}

// Extrae el itinerario de la UI a un arreglo limpio
function recolectarItinerario() {
    let itinerario = [];
    for (let i = 1; i <= 4; i++) {
        let horaStr = document.getElementById(`ajuste-mail-h${i}`).value.trim();
        if (horaStr) {
            itinerario.push({
                icon: document.getElementById(`ajuste-mail-h${i}-icon`).value.trim() || '📌',
                tit: document.getElementById(`ajuste-mail-h${i}-tit`).value.trim() || 'Actividad',
                hora: horaStr
            });
        }
    }
    return itinerario;
}

window.vistaPreviaCorreo = function () {
    const asunto = document.getElementById('ajuste-mail-asunto').value.trim() || '[Sin asunto]';
    const mensaje = document.getElementById('ajuste-mail-mensaje').value.trim() || 'Tu mensaje centrado y elegante aparecerá aquí.';
    const templateId = document.querySelector('input[name="mail-template"]:checked').value;

    const incHora = document.getElementById('chk-mail-hora').checked;
    const itinerarioData = recolectarItinerario();

    const incBtn = document.getElementById('chk-mail-boton').checked;
    const btnTexto = document.getElementById('ajuste-mail-btn-texto').value.trim() || 'Botón de Acción';
    const link = document.getElementById('ajuste-mail-mapa').value.trim();
    const incQR = document.getElementById('chk-mail-qr').checked;

    let estilos = obtenerEstilosPlantilla(templateId);
    const nombreEvento = document.getElementById('sidebar-evento-nombre').innerText || 'Tu Evento';

    let htmlCorreo = generarHTMLCorreo(estilos, nombreEvento, mensaje, incHora, itinerarioData, incBtn, btnTexto, link, incQR, 'Familia Ejemplo', 'KXT-921');

    Swal.fire({
        title: '<h3 class="text-xl font-black text-primario mb-2">Vista Previa</h3>',
        html: `
            <div class="bg-gray-100 p-2 sm:p-4 rounded-2xl max-h-[65vh] overflow-y-auto border border-gray-200 text-sm shadow-inner text-left">
                <div class="mb-3 border-b border-gray-200 pb-2">
                    <p class="text-[11px] text-gray-500 font-bold uppercase tracking-wide">Asunto:</p>
                    <p class="text-sm font-bold text-gray-900">${asunto}</p>
                </div>
                ${htmlCorreo}
            </div>`,
        width: '600px',
        confirmButtonColor: '#4F46E5', confirmButtonText: 'Cerrar <i class="ph-bold ph-check ml-1"></i>',
        customClass: { popup: 'rounded-3xl' }
    });
}

window.enviarMailingMasivo = async function () {
    const eventoActivoId = localStorage.getItem('cliente_activo_id');
    const asunto = document.getElementById('ajuste-mail-asunto').value.trim();
    const mensaje = document.getElementById('ajuste-mail-mensaje').value.trim();
    if (!asunto || !mensaje) return NativeModal.fire('Faltan Datos', 'El asunto y el mensaje son obligatorios.', 'warning');

    // Removimos loader bloqueante ('Analizando...') porque la consulta Firestore toma pocos ms

    try {
        const eventoSnap = await getDoc(doc(db, "eventos", eventoActivoId));
        const datosEvento = eventoSnap.data();
        let usosRealizados = datosEvento.mail_usos || 0;

        if (usosRealizados >= 3) return NativeModal.fire('Límite Alcanzado', 'Has agotado los 3 envíos permitidos para este evento.', 'error');

        const q = query(collection(db, "invitados"), where("evento_id", "==", eventoActivoId), where("estado", "==", "confirmado"));
        const snap = await getDocs(q);
        let destinatarios = [];
        snap.forEach(doc => { const data = doc.data(); if (!data.is_master && data.email_invitado && data.email_invitado.includes('@')) destinatarios.push({ id: doc.id, ...data }); });

        if (destinatarios.length === 0) return NativeModal.fire('Lista Vacía', 'Ningún invitado confirmado tiene correo.', 'info');

        // Fix #2.3: Cálculo de envíos restantes coherente con el límite de 3
        const restantesDespues = Math.max(0, 3 - (usosRealizados + 1));
        const confirm = await Swal.fire({
            title: '¿Iniciar Envío Masivo?',
            html: `Se despacharán <b>${destinatarios.length} correos</b>.<br>Te quedarán <b>${restantesDespues} envío(s)</b> disponible(s) después de este.`,
            icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, enviar <i class="ph-bold ph-paper-plane-right ml-1"></i>', confirmButtonColor: '#2563EB'
        });

        if (!confirm.isConfirmed) return;
        toast('Enviando correos...', { id: 'toast-mail', description: 'No cierres esta pestaña.', duration: 100000 });

        const clearToasts = () => {
            const container = document.getElementById('sonner-toast-container');
            if (container) container.innerHTML = '';
        };

        const templateId = document.querySelector('input[name="mail-template"]:checked').value;
        const incHora = document.getElementById('chk-mail-hora').checked;
        const itinerarioData = recolectarItinerario();

        const incBtn = document.getElementById('chk-mail-boton').checked;
        const btnTexto = document.getElementById('ajuste-mail-btn-texto').value.trim();
        const link = document.getElementById('ajuste-mail-mapa').value.trim();
        const incQR = document.getElementById('chk-mail-qr').checked;
        const estilos = obtenerEstilosPlantilla(templateId);
        const nombreEvento = datosEvento.nombre_evento || 'Nuestro Evento';

        const promesasDeEnvio = destinatarios.map(inv => {
            let htmlCorreo = generarHTMLCorreo(estilos, nombreEvento, mensaje, incHora, itinerarioData, incBtn, btnTexto, link, incQR, inv.nombre_familia, inv.id);
            return addDoc(collection(db, "correos_salientes"), { to: inv.email_invitado, message: { subject: asunto, html: htmlCorreo } });
        });

        await Promise.all(promesasDeEnvio);
        await updateDoc(doc(db, "eventos", eventoActivoId), { mail_usos: usosRealizados + 1 });

        let usosNuevos = Math.max(0, 3 - (usosRealizados + 1));
        document.getElementById('mail-usos-restantes').innerText = usosNuevos;
        if (usosNuevos === 0) document.getElementById('mail-usos-restantes').classList.replace('text-primario', 'text-red-500');

        clearToasts();
        setTimeout(() => {
            toast.success('¡Envíos Exitosos!', { description: `Se entregaron ${destinatarios.length} correos.`, className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl', duration: 4000 });
        }, 50);

    } catch (e) {
        console.error(e);
        clearToasts();
        setTimeout(() => {
            toast.error('Error', { description: 'Fallo al enviar los correos.', className: 'bg-red-50/90 text-red-600 border border-red-100 font-bold shadow-xl backdrop-blur-md rounded-xl', duration: 4000 });
        }, 50);
    }
}

function obtenerEstilosPlantilla(id) {
    if (id === 'boda') return { gradiente: 'linear-gradient(135deg, #B48E4B 0%, #DFCA97 100%)', icono: '🥂', boton: '#B48E4B', titulo: '¡Nos vemos pronto!' };
    if (id === 'xv') return { gradiente: 'linear-gradient(135deg, #D946EF 0%, #8B5CF6 100%)', icono: '✨', boton: '#A855F7', titulo: '¡Falta muy poco!' };
    if (id === 'fiesta') return { gradiente: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)', icono: '🥳', boton: '#4F46E5', titulo: '¡Prepárate!' };
    return { gradiente: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)', icono: '⚠️', boton: '#DC2626', titulo: 'Aviso Importante' };
}

function generarHTMLCorreo(estilos, nomEvento, mensaje, incHora, itinerarioData, incBtn, btnTexto, link, incQR, familia, idBoleto) {
    // SEC-04: Sanitizar datos externos antes de inyectarlos en el HTML del correo
    const familiaSegura = String(familia || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const idBoletoSeguro = String(idBoleto || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let mensajeFormateado = mensaje.replace(/\n/g, '<br>');
    let bloqueMensaje = `<div style="background: white; border-radius: 16px; padding: 30px; margin-bottom: 25px; border: 1px solid #E2E8F0; color: #334155; font-size: 16px; line-height: 1.6; text-align: center; box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.02);"><p style="margin:0; font-weight: 500;">${mensajeFormateado}</p></div>`;

    // --- CONSTRUCCIÓN DINÁMICA DEL ITINERARIO ---
    let bloqueItinerario = '';
    if (incHora && itinerarioData.length > 0) {
        let itemsHTML = '';
        itinerarioData.forEach(item => {
            itemsHTML += `<div style="display: inline-block; padding: 12px; background: #F8FAFC; border-radius: 12px; margin: 5px; border: 1px solid #E2E8F0; min-width: 95px;"><span style="font-size: 24px; display: block; margin-bottom: 5px;">${item.icon}</span><span style="font-size: 10px; color: #64748B; text-transform: uppercase; font-weight: bold; display: block; letter-spacing: 0.5px;">${item.tit}</span><span style="font-size: 15px; color: #0F172A; font-weight: 900;">${item.hora}</span></div>`;
        });

        bloqueItinerario = `
            <div style="background: white; border-radius: 16px; padding: 25px 15px; margin-bottom: 25px; border: 1px solid #E2E8F0; text-align: center;">
                <p style="margin: 0 0 15px 0; font-size: 12px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.5px;">Itinerario del Evento</p>
                <div style="display: block;">
                    ${itemsHTML}
                </div>
            </div>
        `;
    }

    let bloqueBoton = (incBtn && link) ? `<div style="text-align: center; margin-bottom: 30px;"><a href="${link}" target="_blank" style="display: inline-block; background: ${estilos.boton}; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0, 0.15);">${btnTexto}</a></div>` : '';

    let bloqueQR = incQR ? `
        <div style="background: #FFF5F0; border: 2px dashed #FDBA74; border-radius: 20px; padding: 30px 20px; text-align: center;">
            <p style="margin: 0 0 5px 0; color: #C2410C; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Tu Ticket QR</p>
            <h3 style="margin: 0 0 15px 0; color: #1E293B; font-size: 22px; font-weight: 900;">${familiaSegura}</h3>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(idBoletoSeguro)}&color=0F172A&bgcolor=FFFFFF" style="width: 150px; height: 150px; margin: 0 auto; display: block; border-radius: 12px;">
            <p style="margin: 15px 0 0 0; font-family: monospace; font-size: 20px; font-weight: bold; color: #1E293B; letter-spacing: 3px;">${idBoletoSeguro}</p>
        </div>` : '';

    return `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F8FAFC; padding: 30px 15px;">
            <div style="background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.08); border: 1px solid #E2E8F0;">
                <div style="background: ${estilos.gradiente}; padding: 45px 20px; text-align: center;">
                    <div style="font-size: 36px; margin-bottom: 10px;">${estilos.icono}</div>
                    <h2 style="color: white; margin: 0; font-size: 26px; font-weight: 800;">${estilos.titulo}</h2>
                    <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px; margin-top: 8px;">Mensaje oficial de<br><b style="font-size: 22px; display: inline-block; margin-top: 5px; color: white;">${nomEvento}</b></p>
                </div>
                <div style="padding: 35px 30px;">
                    ${bloqueMensaje}
                    ${bloqueItinerario}
                    ${bloqueBoton}
                    ${bloqueQR}
                </div>
            </div>
        </div>
    `;
}

// Exponer para reutilización desde otros módulos (p.ej. notificaciones en dashboard-ui.js)
window.obtenerEstilosPlantilla = obtenerEstilosPlantilla;
window.generarHTMLCorreo = generarHTMLCorreo;

// Función para enviar correos individuales con los estilos del evento
window.enviarEmailConEstilos = async function (emailInvitado, familia, idBoleto, contenidoBase) {
    const eventoActivoId = localStorage.getItem('cliente_activo_id');
    const eventoSnap = await getDoc(doc(db, "eventos", eventoActivoId));
    const datosEvento = eventoSnap.data() || {};

    const templateId = datosEvento.mail_template || 'boda';
    const estilos = obtenerEstilosPlantilla(templateId);
    const nombreEvento = document.getElementById('sidebar-evento-nombre')?.innerText || datosEvento.nombre_evento || 'Tu Evento';
    const asunto = 'Actualización de tu Invitación';

    // Generar layout usando defaults básicos del evento
    const htmlCorreo = generarHTMLCorreo(
        estilos,
        nombreEvento,
        contenidoBase,
        false, // incHora
        [], // itinerario
        datosEvento.mail_inc_btn || false,
        datosEvento.mail_btn_texto || 'Ver Ubicación',
        datosEvento.mail_mapa || '',
        datosEvento.mail_inc_qr !== false, // incQR por defecto true
        familia,
        idBoleto
    );

    // Enviar a la colección de correos salientes
    await addDoc(collection(db, "correos_salientes"), {
        to: emailInvitado,
        message: { subject: asunto, html: htmlCorreo }
    });
};
