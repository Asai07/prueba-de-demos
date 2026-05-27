// ========================================================
// MÓDULO: ALERTAS Y NOTIFICACIONES (dashboard-alerts.js)
// ========================================================
import { db } from './mock-firebase.js';
import { doc, onSnapshot, collection, addDoc } from "./mock-firebase.js";
import { sanitize } from './utils.js';

window.copiarCodigoRapido = function (codigo) {
    navigator.clipboard.writeText(codigo).then(() => { toast.success(`Código ${codigo} copiado`, { className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' }); });
};

window.iniciarEscuchaGlobal = function () {
    onSnapshot(doc(db, "sistema", "alertas"), (docSnap) => {
        if (docSnap.exists()) {
            const config = docSnap.data();
            const banner = document.getElementById('global-alert-banner');
            const bannerText = document.getElementById('global-alert-text');
            const bannerIcon = document.getElementById('global-alert-icon');
            const bannerCloseBtn = banner ? banner.querySelector('button') : null;
            const bannerOcultoTexto = localStorage.getItem('banner_cerrado_texto');

            if (config.banner_activo && banner && bannerOcultoTexto !== config.banner_texto) {
                // Fix #1.4: textContent en vez de innerHTML para prevenir XSS desde Firestore
                bannerText.textContent = config.banner_texto;
                const clasesBase = "w-full shrink-0 relative text-white px-4 py-2.5 text-sm font-medium z-[100] shadow-md flex items-center justify-center gap-2 transition-all duration-500";
                if (config.banner_tipo === 'peligro') { banner.className = `${clasesBase} bg-red-500`; bannerIcon.innerHTML = '<i class="ph-fill ph-warning-circle"></i>'; }
                else if (config.banner_tipo === 'advertencia') { banner.className = `${clasesBase} bg-orange-500`; bannerIcon.innerHTML = '<i class="ph-fill ph-warning"></i>'; }
                else { banner.className = `${clasesBase} bg-blue-600`; bannerIcon.innerHTML = '<i class="ph-fill ph-info"></i>'; }
                banner.style.display = 'flex';
                if (bannerCloseBtn) { bannerCloseBtn.onclick = function () { banner.style.display = 'none'; localStorage.setItem('banner_cerrado_texto', config.banner_texto); }; }
            } else if (banner) { banner.style.display = 'none'; }

            if (config.modal_activo) {
                const versionVista = localStorage.getItem('anuncio_global_version');
                if (versionVista != config.modal_version) {
                    setTimeout(() => {
                        // Fix #1.4: Sanitizar contenido del modal contra XSS
                        const tituloSafe = sanitize(config.modal_titulo);
                        const textoSafe = sanitize(config.modal_texto);
                        // Solo permitimos URLs que empiecen con https:// para la imagen
                        const imagenUrl = (config.modal_imagen && config.modal_imagen.startsWith('https://')) ? config.modal_imagen : '';
                        const imagenHtml = imagenUrl ? `<div class="w-full h-48 mb-6 rounded-2xl overflow-hidden shadow-sm border border-slate-100"><img src="${imagenUrl}" class="w-full h-full object-cover" alt="Anuncio"></div>` : '';
                        Swal.fire({
                            html: `<div class="px-4 py-8 sm:px-10 sm:py-10 text-center">${imagenHtml}<h3 class="text-2xl sm:text-[28px] font-black text-slate-800 mb-4 tracking-tight leading-tight">${tituloSafe}</h3><p class="text-slate-500 text-base sm:text-lg leading-relaxed font-medium">${textoSafe}</p></div>`,
                            showConfirmButton: true, confirmButtonText: config.modal_boton_texto || '¡Entendido!', buttonsStyling: false,
                            customClass: { popup: 'rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-50 bg-white !p-0', htmlContainer: '!m-0 !p-0', actions: '!mt-0 !mb-8', confirmButton: 'inline-flex justify-center items-center bg-gradient-to-r from-brand to-brand-dark text-white font-bold text-lg px-10 py-3.5 rounded-2xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 ring-4 ring-indigo-100 focus:outline-none min-w-[200px]' }
                        }).then(() => { localStorage.setItem('anuncio_global_version', config.modal_version); });
                    }, 1500);
                }
            }
        }
    });
}

window.enviarNotificacionOrganizador = async function (emailOrganizador, familia, pases, nombreEvento) {
    if (!emailOrganizador) return;
    try {
        await addDoc(collection(db, "correos_salientes"), {
            to: emailOrganizador,
            message: {
                subject: `🔔 Nueva confirmación: ${familia} (${pases} pases)`,
                html: `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; background-color: #F8FAFC; padding: 40px 20px;"><div style="background: white; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.03);"><div style="height: 6px; background: linear-gradient(90deg, #FC7643, #CE5A4E);"></div><div style="padding: 35px 30px;"><h2 style="margin: 0 0 15px 0; font-size: 20px; color: #1E293B; letter-spacing: -0.5px;">¡Alguien más se une a la celebración! 🎉</h2><p style="margin: 0 0 25px 0; font-size: 15px; color: #64748B; line-height: 1.6;">Tienes una nueva confirmación de asistencia para <b>${nombreEvento}</b>.</p><div style="background: #F1F5F9; border-radius: 12px; padding: 20px; margin-bottom: 25px;"><p style="margin: 0 0 5px 0; font-size: 12px; color: #94A3B8; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Invitado / Familia</p><p style="margin: 0 0 15px 0; font-size: 18px; color: #0F172A; font-weight: bold;">${familia}</p><p style="margin: 0 0 5px 0; font-size: 12px; color: #94A3B8; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Pases Confirmados</p><p style="margin: 0; font-size: 18px; color: #FC7643; font-weight: 900;">${pases} lugares</p></div><div style="text-align: center;"><a href="https://eventoclic.com/Dashboard.html" style="display: inline-block; background-color: #1E293B; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 14px;">Ir a mi Dashboard</a></div></div></div><p style="text-align: center; color: #94A3B8; font-size: 12px; margin-top: 20px;">Este es un mensaje automático de tu panel de Eventoclic.</p></div>`
            }
        });
    } catch (error) { console.error("Error al notificar al organizador: ", error); }
}
