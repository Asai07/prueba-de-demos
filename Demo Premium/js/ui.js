// js/ui.js
import { auth } from './mock-firebase.js';
import { signOut } from "./mock-firebase.js";
document.addEventListener('DOMContentLoaded', () => {
    const nombreCliente = localStorage.getItem('cliente_nombre');
    if (nombreCliente) {
        const hTit = document.getElementById('header-titulo');
        if (hTit) hTit.innerText = `¡Hola, ${nombreCliente}! 👋`;
    }

    // Construir el link de soporte con datos del cliente
    // El nombre del evento puede no estar listo aún (viene de Firestore),
    // así que usamos un MutationObserver para actualizarlo en cuanto aparezca.
    function actualizarLinkSoporte() {
        const btnSoporte = document.getElementById('btn-soporte-wa');
        if (!btnSoporte) return;

        const nombre = localStorage.getItem('cliente_nombre') || 'un cliente';
        const elEvento = document.getElementById('sidebar-evento-nombre');
        const evento = (elEvento && elEvento.innerText.trim() && elEvento.innerText !== 'Cargando...')
            ? elEvento.innerText.trim()
            : 'mi evento';

        const msj = `Hola, soy ${nombre}, necesito ayuda en mi dashboard "${evento}" de eventoclic.com`;
        btnSoporte.href = `https://wa.me/528130550688?text=${encodeURIComponent(msj)}`;
    }

    // Llamada inicial (puede usar el valor por defecto si el evento aún no cargó)
    actualizarLinkSoporte();

    // Observer: actualiza el link en cuanto sidebar-evento-nombre tenga el nombre real
    const elEvento = document.getElementById('sidebar-evento-nombre');
    if (elEvento) {
        const observer = new MutationObserver(() => {
            actualizarLinkSoporte();
            if (elEvento.innerText && elEvento.innerText !== 'Cargando...') {
                observer.disconnect(); // Ya no necesitamos seguir observando
            }
        });
        observer.observe(elEvento, { childList: true, characterData: true, subtree: true });
    }
});


const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('mobile-overlay');

window.toggleMenu = function () {
    if (!sidebar || !overlay) return;
    const isClosed = sidebar.classList.contains('-translate-x-full');
    if (isClosed) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

window.cambiarPestana = function (idVista) {
    // 1. CANDADO ABSOLUTO: Ocultar todas las vistas a la fuerza y reiniciar animación
    document.querySelectorAll('.vista-seccion').forEach(seccion => {
        seccion.classList.add('hidden');
        seccion.classList.remove('block', 'animate-fade-in-up');
        seccion.style.display = 'none'; // Fuerza bruta
    });

    // 2. MOSTRAR SOLO LA VISTA DESTINO Y ANIMARLA
    const vistaDestino = document.getElementById(`vista-${idVista}`);
    if (vistaDestino) {
        vistaDestino.classList.remove('hidden');
        vistaDestino.classList.add('block');
        vistaDestino.style.display = 'block'; // Fuerza bruta

        // Forzar un reflow para que la animación CSS se reinicie
        void vistaDestino.offsetWidth;

        // Agregar la clase de animación premium
        vistaDestino.classList.add('animate-fade-in-up');
    }

    // 3. ACTUALIZAR DISEÑO DE BOTONES
    document.querySelectorAll('.nav-btn').forEach(btn => {
        // Recordamos si este botón debía estar oculto por las reglas de seguridad
        const debeEstarOculto = btn.classList.contains('hidden') || btn.style.display === 'none';

        // Reseteamos clases al estado inactivo
        btn.className = "nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-secundario font-medium hover:bg-brand-light hover:text-brand-dark transition-all border border-transparent";

        // Si debía estar oculto, lo volvemos a ocultar a la fuerza
        if (debeEstarOculto) {
            btn.classList.add('hidden');
            btn.style.display = 'none';
        } else {
            btn.style.display = 'flex'; // Garantizamos que se vea bien
        }

        // Limpiamos íconos
        const icono = btn.querySelector('i');
        if (icono) {
            icono.classList.remove('ph-fill');
            if (!icono.classList.contains('ph-bold')) icono.classList.add('ph');
        }
    });

    // 4. ENCENDER EL BOTÓN ACTIVO
    const btnActivo = document.getElementById(`tab-${idVista}`);
    if (btnActivo) {
        btnActivo.className = "nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand-dark to-brand text-white font-bold transition-all shadow-md shadow-brand/20 border border-transparent";
        btnActivo.style.display = 'flex';

        const iconActivo = btnActivo.querySelector('i');
        if (iconActivo) {
            iconActivo.classList.remove('ph', 'ph-bold');
            iconActivo.classList.add('ph-fill');
        }
    }

    // 5. CAMBIAR EL TÍTULO
    const nombreCliente = localStorage.getItem('cliente_nombre') || '';
    const titulos = {
        'dashboard': `¡Hola, ${nombreCliente}! 👋`,
        'codigos': 'Mis Códigos',
        'invitados': 'Directorio de Invitados',
        'invitaciones': 'Centro de Envíos',
        'ajustes': 'Ajustes de Plataforma',
        'detalles': 'Desglose de asistentes'
    };
    const headerTitulo = document.getElementById('header-titulo');
    if (headerTitulo && titulos[idVista]) {
        headerTitulo.innerText = titulos[idVista];
    }

    // 6. MOSTRAR BOTÓN DE SOPORTE SÓLO EN DASHBOARD
    const btnSoporte = document.getElementById('btn-soporte-wa');
    if (btnSoporte) {
        if (idVista === 'dashboard') {
            btnSoporte.style.display = 'flex';
        } else {
            btnSoporte.style.display = 'none';
        }
    }

    if (window.innerWidth < 1024) toggleMenu();

    // Persistir la pestaña activa
    localStorage.setItem('pestanaActiva', idVista);
}

window.cerrarSesion = function () {
    NativeModal.fire({
        title: '¿Cerrar sesión?',
        text: 'Tendrás que volver a ingresar tu correo y contraseña.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#FC7643',
        cancelButtonColor: '#718096',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await signOut(auth);
            } catch (error) {
                console.error("Error signing out: ", error);
            }
            localStorage.clear();
            window.location.href = 'index.html';
        }
    });
}
