// ========================================================
// MÓDULO: DRAWER NATIVO TAILWIND (custom-drawer.js)
// ========================================================

window.NativeDrawer = {
    overlay: null, window: null, title: null, subtitle: null, content: null,
    btnCancel: null, btnConfirm: null, resolvePromise: null,

    init() {
        this.overlay = document.getElementById('native-drawer-overlay');
        this.window = document.getElementById('native-drawer-window');
        this.title = document.getElementById('native-drawer-title');
        this.subtitle = document.getElementById('native-drawer-subtitle');
        this.content = document.getElementById('native-drawer-content');
        this.btnCancel = document.getElementById('native-drawer-btn-cancel');
        this.btnConfirm = document.getElementById('native-drawer-btn-confirm');

        if (!this.overlay || !this.window) return;

        // Limpiar botones
        const newCancel = this.btnCancel.cloneNode(true);
        this.btnCancel.parentNode.replaceChild(newCancel, this.btnCancel);
        this.btnCancel = newCancel;

        const newConfirm = this.btnConfirm.cloneNode(true);
        this.btnConfirm.parentNode.replaceChild(newConfirm, this.btnConfirm);
        this.btnConfirm = newConfirm;

        this.overlay.addEventListener('click', (e) => {
            // Si el clic ocurre FUERA de native-drawer-window (es decir, en el backdrop)
            if (!this.window.contains(e.target) && this.currentConfig && this.currentConfig.allowOutsideClick !== false) {
                this.close({ isConfirmed: false, isDismissed: true });
            }
        });

        this.btnCancel.addEventListener('click', () => this.close({ isConfirmed: false, isDismissed: true }));
        this.btnConfirm.addEventListener('click', async () => {

            if (this.currentConfig && this.currentConfig.preConfirm) {
                // Remove previous validation errors before trying again
                const prevErrors = document.querySelectorAll('.drawer-validation-error');
                prevErrors.forEach(el => el.remove());

                const result = await this.currentConfig.preConfirm();
                if (result === false) return; // Falló validación

                if (this.currentConfig.showLoadingOnConfirm) {
                    const originalText = this.btnConfirm.innerHTML;
                    this.btnConfirm.setAttribute('data-original-text', originalText);
                    this.btnConfirm.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-lg"></i> Procesando...';
                    this.btnConfirm.disabled = true;
                }
                this.close({ isConfirmed: true, value: result });
            } else {
                this.close({ isConfirmed: true });
            }
        });
    },

    fire(config) {
        this.currentConfig = config;

        return new Promise((resolve) => {
            if (!this.overlay) this.init();
            if (!this.overlay) {
                console.error("NativeDrawer: No se encontró el DOM del overlay.");
                resolve({ isConfirmed: false, isDismissed: true });
                return;
            }

            this.resolvePromise = resolve;

            // Header
            this.title.innerHTML = config.title || '';
            if (config.subtitle) {
                this.subtitle.innerHTML = config.subtitle;
                this.subtitle.classList.remove('hidden');
            } else {
                this.subtitle.innerHTML = '';
                this.subtitle.classList.add('hidden');
            }

            // Cuerpo del Drawer
            this.content.innerHTML = config.html || '';

            // Botonera Inferior
            this.btnCancel.classList.toggle('hidden', config.showCancelButton === false);
            this.btnConfirm.classList.toggle('hidden', config.showConfirmButton === false);

            this.btnCancel.innerHTML = config.cancelButtonText || 'Cancelar';
            this.btnConfirm.innerHTML = config.confirmButtonText || 'Guardar Cambios';

            // Restaurar estado de botón confirm (por si showLoadingOnConfirm lo deshabilitó)
            this.btnConfirm.disabled = false;

            // Colores del botón
            let btnBgClass = 'bg-brand hover:bg-brand-dark focus:ring-brand shadow-brand/20';
            if (config.confirmButtonColor) {
                this.btnConfirm.style.backgroundColor = config.confirmButtonColor;
                this.btnConfirm.className = `w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all outline-none focus:ring-4 hover:brightness-110 border border-transparent`;
            } else {
                this.btnConfirm.style.backgroundColor = '';
                this.btnConfirm.className = `w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all outline-none focus:ring-4 focus:ring-offset-1 border border-transparent ${btnBgClass}`;
            }

            // Hook onOpen
            if (config.didOpen) {
                setTimeout(config.didOpen, 100);
            }

            // Animación In (Zoom y Fade central)
            this.overlay.classList.remove('hidden');
            // Force reflow
            void this.overlay.offsetWidth;

            this.overlay.classList.remove('opacity-0');
            this.window.classList.remove('scale-95', 'opacity-0');
            this.window.classList.add('scale-100', 'opacity-100');
        });
    },

    close(resultObj) {
        if (this.currentConfig && this.currentConfig.willClose) {
            this.currentConfig.willClose();
        }

        this.overlay.classList.add('opacity-0');
        this.window.classList.remove('scale-100', 'opacity-100');
        this.window.classList.add('scale-95', 'opacity-0');

        setTimeout(() => {
            this.overlay.classList.add('hidden');
            if (this.resolvePromise) {
                this.resolvePromise(resultObj);
                this.resolvePromise = null;
            }
        }, 300); // Mismo tiempo que duration-300 en Tailwind
    },

    showValidationMessage(msg, inputId = null) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'drawer-validation-error flex items-start mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 font-bold animate-shake';
        errorDiv.innerHTML = `<i class="ph-bold ph-warning-circle text-lg mr-2 mt-0.5"></i> <span>${msg}</span>`;

        if (inputId) {
            const el = document.getElementById(inputId);
            if (el && el.parentNode) {
                el.parentNode.appendChild(errorDiv);
                el.focus();
                el.classList.add('border-red-500', 'ring-red-500');
                setTimeout(() => el.classList.remove('border-red-500', 'ring-red-500'), 3000);
            } else {
                this.content.appendChild(errorDiv); // Fallback: al fondo del modal
            }
        } else {
            this.content.appendChild(errorDiv);
        }
    }
};

window.NativeDrawer = NativeDrawer;
