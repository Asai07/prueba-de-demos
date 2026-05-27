// ================================================================
// MÓDULO: MODAL DE BIENVENIDA — Eventoclic Dashboard
// ================================================================
// Se inyecta dinámicamente en el <body> de Dashboard.html.
// Usa localStorage para mostrarse solo la primera vez.
// Clave: 'ec_bienvenida_visto_v1'
// Para forzarlo de nuevo (nueva versión): cambiar sufijo a _v2
// ================================================================

(function () {
    'use strict';

    const MODAL_KEY = 'ec_bienvenida_visto_v1';
    const MODAL_NEVER_KEY = 'ec_bienvenida_nunca_v1';

    // ── Emails / Teléfonos de contacto ──────────────────────────
    const SOPORTE_EMAIL = 'hola@eventoclic.com';
    const WHATSAPP_NUM = '528130550688'; // Sin +, sin espacios. Ej: 5215512345678

    // ── Orden de pasos ──────────────────────────────────────────
    // 0 = Video Tutorial, 1 = Información, 2 = Contacto
    const STEPS = ['ec-tab-tutorial', 'ec-tab-info', 'ec-tab-contact'];

    // ── HTML del modal ──────────────────────────────────────────
    const modalHTML = `
    <style>
        @keyframes ec-blob-pulse {
            0%, 100% { transform: scale(1);    opacity: .12; }
            50%       { transform: scale(1.07); opacity: .20; }
        }
        #ec-welcome-modal .ec-blob-a { animation: ec-blob-pulse 6s ease-in-out infinite; }
        #ec-welcome-modal .ec-blob-b { animation: ec-blob-pulse 8s ease-in-out 2s infinite; }
        #ec-welcome-modal .ec-tab-indicator { transition: opacity .25s ease; }

        /* ─── Mobile-first fixes ─── */
        @media (max-width: 767px) {
            #ec-welcome-content {
                max-height: 92vh;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }
            /* Reducir tamaño de blobs en móvil */
            #ec-welcome-modal .ec-blob-a { width: 200px !important; height: 200px !important; }
            #ec-welcome-modal .ec-blob-b { width: 180px !important; height: 180px !important; }
            /* El panel CTA se vuelve horizontal compacto en móvil */
            #ec-cta-panel {
                flex-direction: row !important;
                align-items: center !important;
                gap: 12px !important;
                padding: 16px !important;
                border-top: 1px solid #FFEDD5;
            }
            #ec-cta-panel .ec-cta-graphic { display: none !important; }
            #ec-cta-panel .ec-cta-text h3 { font-size: 0.95rem !important; margin-bottom: 0 !important; }
            #ec-cta-panel .ec-cta-text p  { display: none !important; }
            #ec-cta-panel .ec-cta-btns {
                margin-top: 0 !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 8px !important;
                margin-left: auto;
                flex-shrink: 0;
            }
            #ec-accept-modal, #ec-next-modal {
                padding: 10px 18px !important;
                font-size: 0.8rem !important;
            }
            #ec-never-modal { font-size: 0.72rem !important; white-space: nowrap; }
            /* Tabs con scroll horizontal en móvil */
            #ec-tabs-bar {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
            }
            #ec-tabs-bar::-webkit-scrollbar { display: none; }
            .ec-tab-btn { white-space: nowrap; }
            /* Tab container con altura fija apropiada para móvil */
            #ec-tab-container {
                min-height: 260px !important;
            }
        }

        /* Paso a paso: indicador de puntos */
        #ec-step-dots span {
            display: inline-block;
            width: 7px; height: 7px;
            border-radius: 9999px;
            background: rgba(206,90,78,0.25);
            transition: width .3s ease, background .3s ease;
            flex-shrink: 0;
        }
        #ec-step-dots span.active {
            width: 20px;
            background: linear-gradient(90deg, #CE5A4E, #FC7643);
            border-radius: 9999px;
        }
    </style>

    <div id="ec-welcome-modal"
         class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6
                opacity-0 pointer-events-none transition-opacity duration-500">

        <!-- Overlay -->
        <div class="absolute inset-0 bg-primario/40 backdrop-blur-md"></div>

        <!-- Tarjeta -->
        <div id="ec-welcome-content"
             class="relative w-full max-w-5xl bg-white
                    rounded-2xl sm:rounded-[2rem] overflow-hidden
                    border border-orange-100
                    shadow-[0_30px_80px_-10px_rgba(206,90,78,0.18)]
                    transform scale-95 transition-all duration-500">

            <!-- Blobs decorativos -->
            <div class="ec-blob-a absolute top-[-15%] left-[-8%] w-[500px] h-[500px]
                        rounded-full mix-blend-multiply filter blur-[100px] pointer-events-none"
                 style="background-color:rgba(252,118,67,0.15);"></div>
            <div class="ec-blob-b absolute bottom-[-15%] right-[-8%] w-[450px] h-[450px]
                        rounded-full mix-blend-multiply filter blur-[100px] pointer-events-none"
                 style="background-color:rgba(206,90,78,0.12);"></div>

            <!-- Layout principal -->
            <div class="relative z-10 flex flex-col md:flex-row">

                <!-- ── Panel izquierdo / principal ── -->
                <div class="flex-1 flex flex-col p-5 sm:p-8 md:border-r border-orange-100">

                    <!-- Encabezado -->
                    <div class="flex items-center gap-3 mb-5">
                        <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-brand-dark to-brand
                                    flex items-center justify-center shadow-lg shadow-brand/30 shrink-0">
                            <img src="assets/imagotipo.png" alt="Eventoclic" class="w-5 h-5 object-contain">
                        </div>
                        <h2 class="text-xl sm:text-3xl font-black text-primario tracking-tight leading-tight">
                            Bienvenido
                        </h2>
                        <!-- Botón cerrar (móvil: visible en encabezado) -->
                        <button id="ec-close-modal-top"
                                class="ml-auto md:hidden w-8 h-8 flex items-center justify-center rounded-full
                                       bg-white hover:bg-orange-100 border border-orange-200
                                       text-secundario hover:text-brand-dark transition-all shadow-sm">
                            <i class="ph-bold ph-x text-sm"></i>
                        </button>
                    </div>

                    <!-- Tabs -->
                    <div id="ec-tabs-bar" class="flex gap-5 sm:gap-6 border-b border-orange-100 pb-3 mb-5 relative">
                        <button class="ec-tab-btn text-sm sm:text-base font-bold text-brand-dark relative"
                                data-target="ec-tab-tutorial">
                            Video Tutorial
                            <div class="ec-tab-indicator absolute -bottom-[13px] left-0 w-full h-[2px]
                                        bg-gradient-to-r from-brand-dark to-brand"></div>
                        </button>
                        <button class="ec-tab-btn text-sm sm:text-base font-semibold text-secundario
                                       hover:text-primario transition-colors relative"
                                data-target="ec-tab-info">
                            Información
                            <div class="ec-tab-indicator absolute -bottom-[13px] left-0 w-full h-[2px]
                                        bg-gradient-to-r from-brand-dark to-brand opacity-0"></div>
                        </button>
                        <button class="ec-tab-btn text-sm sm:text-base font-semibold text-secundario
                                       hover:text-primario transition-colors relative"
                                data-target="ec-tab-contact">
                            Contacto
                            <div class="ec-tab-indicator absolute -bottom-[13px] left-0 w-full h-[2px]
                                        bg-gradient-to-r from-brand-dark to-brand opacity-0"></div>
                        </button>
                    </div>

                    <!-- Contenido de tabs -->
                    <div id="ec-tab-container" class="relative flex-1" style="min-height:270px;">

                        <!-- Tab: Video -->
                        <div id="ec-tab-tutorial"
                             class="ec-tab-content absolute inset-0 transition-opacity duration-300 flex flex-col">
                            <p class="text-secundario mb-4 text-sm sm:text-base leading-relaxed">
                                Aprende a gestionar a tus invitados a través de tu dashboard
                                con este tutorial paso a paso.
                            </p>
                            <div class="flex-1 w-full bg-orange-50/50 rounded-xl overflow-hidden
                                        border border-orange-100 relative" style="min-height:200px;">
                                <iframe id="ec-tutorial-video" class="absolute inset-0 w-full h-full"
                                        src=""
                                        title="Video Tutorial Eventoclic" frameborder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowfullscreen></iframe>
                            </div>
                        </div>

                        <!-- Tab: Información -->
                        <div id="ec-tab-info"
                             class="ec-tab-content absolute inset-0 opacity-0 pointer-events-none
                                    transition-opacity duration-300 overflow-y-auto">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 pb-2">
                                <div class="bg-brand-light p-4 rounded-xl border border-orange-100 hover:shadow-md transition-all">
                                    <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2 shadow-sm">
                                        <i class="ph-fill ph-users text-brand text-lg"></i>
                                    </div>
                                    <h4 class="text-brand-dark font-bold mb-1 text-sm sm:text-base">Gestión de Invitados</h4>
                                    <p class="text-xs sm:text-sm text-secundario leading-relaxed">
                                        Agrega, edita y monitorea el estado de cada persona en tiempo real.
                                    </p>
                                </div>
                                <div class="bg-brand-light p-4 rounded-xl border border-orange-100 hover:shadow-md transition-all">
                                    <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2 shadow-sm">
                                        <i class="ph-fill ph-check-circle text-green-500 text-lg"></i>
                                    </div>
                                    <h4 class="text-brand-dark font-bold mb-1 text-sm sm:text-base">Confirmaciones</h4>
                                    <p class="text-xs sm:text-sm text-secundario leading-relaxed">
                                        Los asistentes confirman su asistencia desde la invitación o formulario conectado.
                                    </p>
                                </div>
                                <div class="bg-brand-light p-4 rounded-xl border border-orange-100 hover:shadow-md transition-all">
                                    <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2 shadow-sm">
                                        <i class="ph-fill ph-chart-bar text-brand text-lg"></i>
                                    </div>
                                    <h4 class="text-brand-dark font-bold mb-1 text-sm sm:text-base">Métricas en Vivo</h4>
                                    <p class="text-xs sm:text-sm text-secundario leading-relaxed">
                                        Visualiza los datos de asistencia en tiempo real.
                                    </p>
                                </div>
                                <div class="bg-brand-light p-4 rounded-xl border border-orange-100 hover:shadow-md transition-all">
                                    <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2 shadow-sm">
                                        <i class="ph-fill ph-whatsapp-logo text-green-500 text-lg"></i>
                                    </div>
                                    <h4 class="text-brand-dark font-bold mb-1 text-sm sm:text-base">WhatsApp Masivo</h4>
                                    <p class="text-xs sm:text-sm text-secundario leading-relaxed">
                                        Envía invitaciones y recordatorios personalizados con un solo clic.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Tab: Contacto -->
                        <div id="ec-tab-contact"
                             class="ec-tab-content absolute inset-0 opacity-0 pointer-events-none
                                    transition-opacity duration-300 overflow-y-auto">
                            <p class="text-secundario mb-4 text-sm sm:text-base leading-relaxed">
                                Si encuentras algún problema técnico con el panel o la recepción
                                de datos, contáctanos directamente.
                            </p>
                            <div class="space-y-3">

                                <!-- Email clickable -->
                                <a href="mailto:${SOPORTE_EMAIL}"
                                   class="flex items-center gap-3 sm:gap-4 bg-brand-light p-4 rounded-xl
                                          border border-orange-100 hover:shadow-md hover:border-brand/40
                                          transition-all group cursor-pointer no-underline">
                                    <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center
                                                shadow-sm shrink-0 group-hover:bg-brand group-hover:text-white
                                                text-brand transition-colors">
                                        <i class="ph-fill ph-envelope-simple text-lg"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <p class="text-sm font-bold text-primario">Soporte Técnico</p>
                                        <p class="text-xs sm:text-sm text-brand-dark font-medium group-hover:underline truncate">
                                            ${SOPORTE_EMAIL}
                                        </p>
                                    </div>
                                    <i class="ph-bold ph-arrow-up-right text-brand-dark ml-auto opacity-0
                                              group-hover:opacity-100 transition-opacity shrink-0"></i>
                                </a>

                                <!-- WhatsApp clickable -->
                                <a href="https://wa.me/${WHATSAPP_NUM}"
                                   target="_blank" rel="noopener noreferrer"
                                   class="flex items-center gap-3 sm:gap-4 bg-green-50 p-4 rounded-xl
                                          border border-green-100 hover:shadow-md hover:border-green-300
                                          transition-all group cursor-pointer no-underline">
                                    <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center
                                                shadow-sm shrink-0 group-hover:bg-green-500 group-hover:text-white
                                                text-green-500 transition-colors">
                                        <i class="ph-fill ph-whatsapp-logo text-lg"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <p class="text-sm font-bold text-primario">WhatsApp Directo</p>
                                        <p class="text-xs sm:text-sm text-green-600 font-medium group-hover:underline truncate">
                                            Abrir chat de soporte
                                        </p>
                                    </div>
                                    <i class="ph-bold ph-arrow-up-right text-green-600 ml-auto opacity-0
                                              group-hover:opacity-100 transition-opacity shrink-0"></i>
                                </a>

                            </div>
                        </div>

                    </div><!-- /tab container -->
                </div><!-- /panel izquierdo -->

                <!-- ── Panel derecho: CTA ── -->
                <div id="ec-cta-panel"
                     class="w-full md:w-[280px] p-5 sm:p-8 flex flex-col justify-between
                            bg-gradient-to-br from-[#FFF8F5] to-[#FFF1EB]">

                    <!-- Cerrar (solo desktop) -->
                    <div class="hidden md:flex justify-end">
                        <button id="ec-close-modal"
                                class="w-8 h-8 flex items-center justify-center rounded-full
                                       bg-white hover:bg-orange-100 border border-orange-200
                                       text-secundario hover:text-brand-dark transition-all shadow-sm">
                            <i class="ph-bold ph-x text-sm"></i>
                        </button>
                    </div>

                    <!-- Gráfico decorativo -->
                    <div class="ec-cta-graphic flex justify-center my-auto drop-shadow-[0_0_20px_rgba(252,118,67,0.2)] py-4 md:py-0">
                        <svg width="100" height="100" viewBox="0 0 100 100" class="opacity-90">
                            <defs>
                                <linearGradient id="ecModalGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%"   stop-color="#CE5A4E"/>
                                    <stop offset="50%"  stop-color="#FC7643"/>
                                    <stop offset="100%" stop-color="#F5A165"/>
                                </linearGradient>
                            </defs>
                            <g fill="none" stroke="url(#ecModalGrad2)" stroke-width="2.2"
                               stroke-linecap="round" stroke-linejoin="round">
                                <rect x="20" y="20" width="40" height="40" rx="6"/>
                                <rect x="40" y="40" width="40" height="40" rx="6"/>
                                <circle cx="20" cy="20" r="3.5" fill="white" stroke="url(#ecModalGrad2)"/>
                                <circle cx="60" cy="20" r="3.5" fill="white" stroke="url(#ecModalGrad2)"/>
                                <circle cx="20" cy="60" r="3.5" fill="white" stroke="url(#ecModalGrad2)"/>
                                <circle cx="80" cy="80" r="3.5" fill="white" stroke="url(#ecModalGrad2)"/>
                                <circle cx="40" cy="80" r="3.5" fill="white" stroke="url(#ecModalGrad2)"/>
                                <circle cx="80" cy="40" r="3.5" fill="white" stroke="url(#ecModalGrad2)"/>
                            </g>
                        </svg>
                    </div>

                    <!-- CTA -->
                    <div class="ec-cta-text">
                        <h3 class="text-lg sm:text-xl font-black text-primario mb-1 sm:mb-2 tracking-tight">¡Todo listo!</h3>
                        <p class="text-sm text-secundario mb-4 leading-relaxed">
                            Tu dashboard está configurado y listo para usar. ¡Empieza cuando quieras!
                        </p>

                        <!-- Botones CTA -->
                        <div class="ec-cta-btns flex flex-col gap-2 mt-2">
                            <!-- Botón Siguiente (pasos 0 y 1): lleva los dots integrados -->
                            <button id="ec-next-modal"
                                    class="w-full group px-5 py-3.5
                                           bg-gradient-to-r from-brand-dark to-brand hover:opacity-90
                                           text-white text-sm font-bold rounded-xl
                                           transition-all duration-300 flex items-center justify-between
                                           shadow-lg shadow-brand/25 transform hover:-translate-y-0.5">
                                <div id="ec-step-dots" class="flex items-center gap-[5px]">
                                    <span class="active"></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span>Siguiente</span>
                                    <i class="ph-bold ph-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
                                </div>
                            </button>

                            <button id="ec-accept-modal"
                                    class="w-full px-6 py-3.5
                                           bg-gradient-to-r from-brand-dark to-brand hover:opacity-90
                                           text-white text-sm font-bold rounded-xl
                                           transition-all duration-300 flex items-center justify-center
                                           shadow-lg shadow-brand/25 transform hover:-translate-y-0.5
                                           hidden">
                                <span>Entendido</span>
                            </button>

                            <!-- Botón No volver a mostrar (solo paso 2, oculto inicialmente) -->
                            <button id="ec-never-modal"
                                    class="w-full flex items-center justify-center gap-1.5
                                           text-xs text-secundario hover:text-red-500
                                           py-2 transition-colors text-center hidden
                                           group">
                                <i class="ph-bold ph-x text-[10px] opacity-60 group-hover:opacity-100 transition-opacity"></i>
                                <span class="border-b border-transparent group-hover:border-red-300 transition-colors pb-px">
                                    No volver a mostrar
                                </span>
                            </button>
                        </div>
                    </div>

                </div><!-- /panel derecho -->
            </div><!-- /layout -->
        </div><!-- /tarjeta -->
    </div><!-- /modal -->`;

    // ── Inyectar en el DOM ──────────────────────────────────────
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // ── Referencias ─────────────────────────────────────────────
    const modal = document.getElementById('ec-welcome-modal');
    const content = document.getElementById('ec-welcome-content');
    const video = document.getElementById('ec-tutorial-video');
    const btnNext = document.getElementById('ec-next-modal');
    const btnAccept = document.getElementById('ec-accept-modal');
    const btnNever = document.getElementById('ec-never-modal');
    const stepDots = document.getElementById('ec-step-dots');
    const tabBtns = modal.querySelectorAll('.ec-tab-btn');
    const tabContents = modal.querySelectorAll('.ec-tab-content');

    let currentStep = 0;

    // ── Helpers de tab ──────────────────────────────────────────
    function activateTab(targetId) {
        // Resetear todos los tabs
        tabBtns.forEach(b => {
            b.classList.remove('text-brand-dark', 'font-bold');
            b.classList.add('text-secundario', 'font-semibold');
            b.querySelector('.ec-tab-indicator').classList.add('opacity-0');
        });

        // Ocultar todos los contenidos
        tabContents.forEach(c => {
            c.classList.remove('opacity-100');
            c.classList.add('opacity-0', 'pointer-events-none');
        });

        // Activar el tab seleccionado
        const activeBtn = modal.querySelector(`.ec-tab-btn[data-target="${targetId}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('text-secundario', 'font-semibold');
            activeBtn.classList.add('text-brand-dark', 'font-bold');
            activeBtn.querySelector('.ec-tab-indicator').classList.remove('opacity-0');
        }

        // Mostrar el contenido objetivo
        const target = document.getElementById(targetId);
        if (target) {
            target.classList.remove('pointer-events-none');
            setTimeout(() => {
                target.classList.remove('opacity-0');
                target.classList.add('opacity-100');
            }, 50);
        }
    }

    // ── Actualizar indicador de pasos ───────────────────────────
    function updateDots(step) {
        const dots = stepDots.querySelectorAll('span');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === step);
        });
    }

    // ── Actualizar botones según el paso ────────────────────────
    function updateButtons(step) {
        const isLast = step === STEPS.length - 1;
        btnNext.classList.toggle('hidden', isLast);
        btnAccept.classList.toggle('hidden', !isLast);
        btnNever.classList.toggle('hidden', !isLast);
    }

    // ── Navegar a un paso ───────────────────────────────────────
    function goToStep(step) {
        currentStep = step;
        activateTab(STEPS[step]);
        updateDots(step);
        updateButtons(step);
    }

    // ── Abrir / cerrar ──────────────────────────────────────────
    function openWelcome() {
        goToStep(0);
        modal.classList.remove('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }

    function closeWelcome(remember) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
        if (video) { const s = video.src; video.src = s; } // detiene el video
        localStorage.setItem(MODAL_KEY, '1');
        if (remember) {
            localStorage.setItem(MODAL_NEVER_KEY, '1');
        }
    }

    // Solo mostrar si nunca se ha visto (o si marcó "no volver a mostrar")
    // DESACTIVADO TEMPORALMENTE (Faltan videos tutoriales)
    /*
    if (!localStorage.getItem(MODAL_KEY) && !localStorage.getItem(MODAL_NEVER_KEY)) {
        setTimeout(openWelcome, 700);
    }
    */

    // ── Listeners ───────────────────────────────────────────────
    // Cerrar con X (desktop)
    const closeDesktop = document.getElementById('ec-close-modal');
    if (closeDesktop) closeDesktop.addEventListener('click', () => closeWelcome(false));

    // Cerrar con X (móvil, en encabezado)
    const closeMobile = document.getElementById('ec-close-modal-top');
    if (closeMobile) closeMobile.addEventListener('click', () => closeWelcome(false));

    // Botón siguiente
    btnNext.addEventListener('click', () => {
        if (currentStep < STEPS.length - 1) {
            goToStep(currentStep + 1);
        }
    });

    // Botón entendido (último paso)
    btnAccept.addEventListener('click', () => closeWelcome(false));

    // Botón "no volver a mostrar"
    btnNever.addEventListener('click', () => closeWelcome(true));

    // Escape
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeWelcome(false); });

    // Click en tabs manuales (siguen funcionando)
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const stepIdx = STEPS.indexOf(targetId);
            if (stepIdx !== -1) {
                goToStep(stepIdx);
            }
        });
    });

})();
