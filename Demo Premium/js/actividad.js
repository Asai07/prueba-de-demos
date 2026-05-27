// js/actividad.js
// Fix #11: Se eliminó el onSnapshot propio — ahora escucha el CustomEvent 'evt-invitados'
// que dashboard-core.js despacha desde su listener único. Esto elimina la conexión duplicada a Firestore.

const eventoActivoId = localStorage.getItem('cliente_activo_id');
if (!eventoActivoId) { window.location.replace('index.html'); }

const timelineContainer = document.getElementById('timeline-container');

function renderizarActividad(snapshot) {
    let actividades = [];

    snapshot.forEach((doc) => {
        const data = doc.data();

        // Si hay fecha de confirmación y ya no está pendiente
        if (data.fecha_confirmacion && data.estado !== 'pendiente') {
            actividades.push({
                tipo: data.estado, // 'confirmado' o 'declinado'
                fecha: data.fecha_confirmacion,
                data: data
            });
        }

        // Si hay fecha de envío de WhatsApp registrado
        if (data.fecha_wa) {
            actividades.push({
                tipo: 'whatsapp',
                fecha: data.fecha_wa,
                data: data
            });
        }
    });

    // Ordenar de más nueva a más vieja
    actividades.sort((a, b) => {
        const timeA = a.fecha && typeof a.fecha.toMillis === 'function' ? a.fecha.toMillis() : Date.now();
        const timeB = b.fecha && typeof b.fecha.toMillis === 'function' ? b.fecha.toMillis() : Date.now();
        return timeB - timeA;
    });

    // Fix #7: solo las últimas 3 actividades
    const ultimasActividades = actividades.slice(0, 3);

    let html = '';

    if (ultimasActividades.length === 0) {
        html = `<p class="text-sm text-secundario italic mt-4">Aún no hay actividad reciente.</p>`;
    } else {
        ultimasActividades.forEach((act) => {
            const guest = act.data;
            const fechaObj = act.fecha && typeof act.fecha.toDate === 'function' ? act.fecha.toDate() : new Date();
            const horaFormateada = fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const nombreMostrar = guest.nombre_familia || 'Invitado';

            let icono, colorBorde, colorTextoIcono, contenidoTarjeta;

            if (act.tipo === 'confirmado') {
                icono = 'ph-check'; colorBorde = 'border-green-100'; colorTextoIcono = 'text-green-500';
                let textoQuien = '';
                if (guest.quien_confirma && guest.quien_confirma.trim().toLowerCase() !== nombreMostrar.trim().toLowerCase()) {
                    textoQuien = `<p class="text-[11px] text-green-600 mb-1.5 font-medium"><i class="ph-bold ph-check mr-1"></i>Confirmado por: ${guest.quien_confirma}</p>`;
                }
                contenidoTarjeta = `
                    <div class="flex items-center justify-between mb-1">
                        <h4 class="text-sm font-bold text-primario">${nombreMostrar}</h4>
                        <span class="text-[10px] text-secundario font-bold tracking-wide">${horaFormateada}</span>
                    </div>
                    ${textoQuien}
                    <div class="flex items-center justify-between mt-1">
                        <p class="text-xs text-secundario">Asistirán <b class="text-primario">${guest.asistiran} persona(s)</b>.</p>
                        <div class="flex items-center gap-1.5 bg-brand-light text-brand px-2 py-1 rounded-md text-[10px] font-bold border border-pink-100 shadow-sm">
                            <i class="ph-fill ph-ticket text-xs"></i> ${guest.asistiran}
                        </div>
                    </div>`;
            } else if (act.tipo === 'declinado') {
                icono = 'ph-x'; colorBorde = 'border-red-100'; colorTextoIcono = 'text-red-500';
                let textoQuien = '';
                if (guest.quien_confirma && guest.quien_confirma.trim().toLowerCase() !== nombreMostrar.trim().toLowerCase()) {
                    textoQuien = `<p class="text-[11px] text-red-500 font-medium"><i class="ph-bold ph-x mr-1"></i>Declinado por: ${guest.quien_confirma}</p>`;
                } else {
                    textoQuien = `<p class="text-xs text-secundario">Declinó la invitación.</p>`;
                }
                contenidoTarjeta = `
                    <div class="flex items-center justify-between mb-1">
                        <h4 class="text-sm font-bold text-primario">${nombreMostrar}</h4>
                        <span class="text-[10px] text-secundario font-bold tracking-wide">${horaFormateada}</span>
                    </div>
                    ${textoQuien}`;
            } else if (act.tipo === 'whatsapp') {
                icono = 'ph-whatsapp-logo'; colorBorde = 'border-blue-100'; colorTextoIcono = 'text-blue-500';
                contenidoTarjeta = `
                    <div class="flex items-center justify-between mb-1">
                        <h4 class="text-sm font-bold text-primario">${nombreMostrar}</h4>
                        <span class="text-[10px] text-secundario font-bold tracking-wide">${horaFormateada}</span>
                    </div>
                    <p class="text-xs text-secundario font-medium mt-1"><i class="ph-fill ph-paper-plane-tilt mr-1 text-blue-400"></i> Mensaje de WhatsApp enviado.</p>`;
            }

            html += `
                <div class="relative pl-8 lg:pl-10 animate-nueva-notificacion mb-5 last:mb-0 group">
                    <div class="absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-white border-[3px] ${colorBorde} flex items-center justify-center ${colorTextoIcono} shadow-sm z-10 transition-transform group-hover:scale-110">
                        <i class="ph-bold ${icono} text-sm"></i>
                    </div>
                    <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:border-pink-100 hover:shadow-md transition-all">
                        ${contenidoTarjeta}
                    </div>
                </div>`;
        });
    }

    if (timelineContainer) timelineContainer.innerHTML = html;
}

// Fix #11: En lugar de abrir un onSnapshot propio (que duplicaría la conexión a Firestore),
// escuchar el CustomEvent que dashboard-core.js ya despacha con el snapshot actualizado.
document.addEventListener('evt-invitados', (e) => {
    renderizarActividad(e.detail);
});
