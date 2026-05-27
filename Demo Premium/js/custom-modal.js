// ========================================================
// MÓDULO: MODAL NATIVO TAILWIND (custom-modal.js)
// ========================================================

window.NativeModal = {
    overlay: null, window: null, iconContainer: null, icon: null, title: null, text: null, btnCancel: null, btnConfirm: null,
    validationWarning: null, resolvePromise: null,

    init() {
        this.overlay = document.getElementById('native-modal-overlay');
        this.window = document.getElementById('native-modal-window');
        this.iconContainer = document.getElementById('native-modal-icon-container');
        this.icon = document.getElementById('native-modal-icon');
        this.title = document.getElementById('native-modal-title');
        this.text = document.getElementById('native-modal-text');
        this.btnCancel = document.getElementById('native-modal-btn-cancel');
        this.btnConfirm = document.getElementById('native-modal-btn-confirm');

        // Creamos un contenedor para alertas de validación
        this.validationWarning = document.createElement('div');
        this.validationWarning.className = 'hidden mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 font-bold animate-shake';
        this.text.parentNode.insertBefore(this.validationWarning, this.text.nextSibling);

        if (!this.overlay) return;

        // Limpiar event listeners previos
        const newCancel = this.btnCancel.cloneNode(true);
        this.btnCancel.parentNode.replaceChild(newCancel, this.btnCancel);
        this.btnCancel = newCancel;

        const newConfirm = this.btnConfirm.cloneNode(true);
        this.btnConfirm.parentNode.replaceChild(newConfirm, this.btnConfirm);
        this.btnConfirm = newConfirm;

        this.btnCancel.addEventListener('click', () => this.close({ isConfirmed: false, isDismissed: true }));
        this.btnConfirm.addEventListener('click', async () => {
            if (this.currentConfig && this.currentConfig.preConfirm) {
                const result = await this.currentConfig.preConfirm();
                if (result === false) return; // Validación falló

                if (this.currentConfig.showLoadingOnConfirm) {
                    this.btnConfirm.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-lg"></i>';
                    this.btnConfirm.disabled = true;
                }
                this.close({ isConfirmed: true, value: result });
            } else {
                if (this.currentConfig && this.currentConfig.showLoadingOnConfirm) {
                    this.btnConfirm.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-lg"></i>';
                    this.btnConfirm.disabled = true;
                }
                this.close({ isConfirmed: true });
            }
        });
    },

    fire(arg1, arg2, arg3) {
        let config = {};
        if (typeof arg1 === 'string') {
            config.title = arg1;
            config.text = arg2 || '';
            config.icon = arg3 || 'info';
        } else {
            config = arg1;
        }

        this.currentConfig = config;

        return new Promise((resolve) => {
            if (!this.overlay) this.init();
            if (!this.overlay) {
                console.error("NativeModal: No se encontró el DOM del overlay.");
                resolve({ isConfirmed: false, isDenied: false, isDismissed: true });
                return;
            }

            this.resolvePromise = resolve;

            if (config.didOpen) setTimeout(config.didOpen, 100);

            // Contenido
            this.title.innerHTML = config.title || '';
            this.text.innerHTML = config.text || config.html || '';
            this.validationWarning.classList.add('hidden');
            this.validationWarning.innerHTML = '';

            // Botones
            this.btnCancel.classList.toggle('hidden', !config.showCancelButton);
            this.btnConfirm.classList.toggle('hidden', config.showConfirmButton === false);
            this.btnCancel.innerHTML = config.cancelButtonText || 'Cancelar';
            this.btnConfirm.innerHTML = config.confirmButtonText || 'Aceptar';
            this.btnConfirm.disabled = false;

            // Iconos y colores
            let iconClass = 'ph-info';
            let iconColor = 'text-blue-600';
            let iconBg = 'bg-blue-100';
            let btnBg = 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 border-blue-600';

            if (config.icon === 'error') {
                iconClass = 'ph-warning-circle';
                iconColor = 'text-red-600';
                iconBg = 'bg-red-100';
                btnBg = 'bg-red-500 hover:bg-red-600 shadow-red-500/20 border-red-500';
            } else if (config.icon === 'warning') {
                iconClass = 'ph-warning';
                iconColor = 'text-orange-500';
                iconBg = 'bg-orange-100';
                btnBg = config.confirmButtonColor ? '' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20 border-orange-500';
            } else if (config.icon === 'success') {
                iconClass = 'ph-check-circle';
                iconColor = 'text-green-600';
                iconBg = 'bg-green-100';
                btnBg = 'bg-green-500 hover:bg-green-600 shadow-green-500/20 border-green-500';
            } else if (config.icon === 'question') {
                iconClass = 'ph-question';
                iconColor = 'text-brand';
                iconBg = 'bg-brand/10';
                btnBg = 'bg-brand hover:bg-brand-dark shadow-brand/20 border-brand';
            }

            this.icon.className = `ph-bold ${iconClass} text-4xl leading-none ${iconColor}`;
            this.iconContainer.className = `mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-5 ${iconBg}`;

            this.btnConfirm.className = `w-full inline-flex justify-center items-center px-6 py-3 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all outline-none sm:w-auto sm:flex-1 border border-transparent ${btnBg}`;

            if (config.confirmButtonColor) {
                this.btnConfirm.style.backgroundColor = config.confirmButtonColor;
                this.btnConfirm.style.borderColor = config.confirmButtonColor;
                this.btnConfirm.className = `w-full inline-flex justify-center items-center px-6 py-3 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all outline-none sm:w-auto sm:flex-1 hover:brightness-110`;
            } else {
                this.btnConfirm.style.backgroundColor = '';
                this.btnConfirm.style.borderColor = '';
            }

            // Animación de entrada
            this.overlay.classList.remove('hidden');
            void this.overlay.offsetWidth; // Force reflow
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
        }, 300);
    },

    showValidationMessage(msg) {
        if (this.validationWarning) {
            this.validationWarning.innerHTML = `<i class="ph-bold ph-warning-circle mr-1"></i> ${msg}`;
            this.validationWarning.classList.remove('hidden');
            // Re-trigger shake animation
            this.validationWarning.style.animation = 'none';
            this.validationWarning.offsetHeight; /* trigger reflow */
            this.validationWarning.style.animation = null;
        }
    },

    closeModal() {
        this.close({ isConfirmed: false, isDismissed: true });
    }
};

window.NativeModal = NativeModal;
