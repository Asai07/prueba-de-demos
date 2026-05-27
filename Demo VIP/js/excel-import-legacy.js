// js/excel-import-legacy.js
// ─────────────────────────────────────────────────────────────
// IMPORTADOR LEGACY — Herramienta de migración de un solo uso
// Lee un Excel que ya contiene códigos generados y estados de
// confirmación (desde Google Sheets u otro sistema anterior) y
// los crea/actualiza en Firebase conservando su estado original.
//
// ⚠️  Este archivo es INDEPENDIENTE de excel-import.js.
//     No modifica ni interfiere con el importador estándar.
//     Una vez completada la migración, el botón y el script
//     pueden ser removidos del Dashboard.html sin consecuencias.
// ─────────────────────────────────────────────────────────────
import { db } from './mock-firebase.js';
import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp } from "./mock-firebase.js";
import { getLimitePases, getTotalPasesGenerados } from './dashboard-state.js';

const eventoActivoId = localStorage.getItem('cliente_activo_id');
if (!eventoActivoId) { console.log('Bypassed redirect to index.html'); }

// ─── Normalizar texto para comparaciones ─────────────────────
function normalizarTexto(str) {
    return String(str || '').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

// ─── Determinar estado desde la columna "Confirmado" ─────────
function parseEstado(valor) {
    const v = normalizarTexto(valor);
    if (v === 'si' || v === 'sí' || v === 's' || v === 'yes' || v === '1' || v === 'true') return 'confirmado';
    if (v === 'no' || v === 'n' || v === '0' || v === 'false' || v === 'declinado') return 'declinado';
    return 'pendiente'; // vacío o cualquier otra cosa
}

// ─── Modal del importador legacy ─────────────────────────────
window.abrirModalImportarLegacy = function () {
    NativeDrawer.fire({
        title: 'Migrar Lista Legacy',
        subtitle: 'Importa invitados con códigos ya existentes',
        html: `
            <div class="space-y-6 text-left mt-2 pb-4">
                <div class="bg-purple-50/50 border border-purple-100 p-4 rounded-2xl text-[13px] text-purple-800 shadow-sm">
                    <p class="font-bold text-purple-700 mb-2 flex items-center gap-1.5"><i class="ph-bold ph-warning text-amber-500"></i> Herramienta de migración</p>
                    <ul class="space-y-2">
                        <li class="flex items-start gap-2"><i class="ph-bold ph-check text-purple-500 mt-0.5"></i><span>Tu Excel debe tener las columnas: <b>Familia</b>, <b>Código</b> y <b>Cantidad de pases</b>.</span></li>
                        <li class="flex items-start gap-2"><i class="ph-bold ph-check text-purple-500 mt-0.5"></i><span>Opcionales: <b>Nombre de invitados (opcional)</b>, <b>Número de mesa</b>, <b>Confirmado</b>.</span></li>
                        <li class="flex items-start gap-2"><i class="ph-bold ph-check text-purple-500 mt-0.5"></i><span>Los códigos existentes se usarán tal cual (no se generan nuevos).</span></li>
                        <li class="flex items-start gap-2"><i class="ph-bold ph-info text-blue-500 mt-0.5"></i><span>La columna <b>Número de invitados</b> se ignora.</span></li>
                    </ul>
                </div>

                <div>
                    <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Archivo Excel <span class="text-red-500">*</span></label>
                    <div class="relative group">
                        <input type="file" id="legacy-archivo-excel" accept=".xlsx, .xls, .csv" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                        <div id="legacy-dropzone" class="w-full bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center group-hover:border-purple-400 group-hover:bg-purple-50/10 transition-colors flex flex-col items-center justify-center gap-2">
                            <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-purple-500 group-hover:bg-purple-50 transition-colors">
                                <i class="ph-bold ph-upload-simple text-2xl"></i>
                            </div>
                            <p class="text-sm font-bold text-primario" id="legacy-file-name">Selecciona o arrastra el archivo</p>
                            <p class="text-xs text-secundario">.xlsx, .xls, .csv</p>
                        </div>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Procesar Migración',
        showLoadingOnConfirm: true,
        didOpen: () => {
            const fileInput = document.getElementById('legacy-archivo-excel');
            const nameDisplay = document.getElementById('legacy-file-name');
            const dropzone = document.getElementById('legacy-dropzone');
            if (fileInput && nameDisplay) {
                fileInput.addEventListener('change', function () {
                    if (this.files && this.files.length > 0) {
                        nameDisplay.textContent = this.files[0].name;
                        nameDisplay.classList.add('text-purple-600');
                        if (dropzone) { dropzone.classList.add('border-purple-400', 'bg-purple-50/10'); dropzone.classList.remove('border-slate-300'); }
                    } else {
                        nameDisplay.textContent = 'Selecciona o arrastra el archivo';
                        nameDisplay.classList.remove('text-purple-600');
                        if (dropzone) { dropzone.classList.remove('border-purple-400', 'bg-purple-50/10'); dropzone.classList.add('border-slate-300'); }
                    }
                });
            }
        },
        preConfirm: () => {
            const fileInput = document.getElementById('legacy-archivo-excel');
            if (!fileInput.files.length) { NativeDrawer.showValidationMessage('Selecciona un archivo Excel'); return false; }
            return { file: fileInput.files[0] };
        }
    }).then((result) => {
        if (result.isConfirmed) leerExcelLegacy(result.value.file);
    });
}

// ─── Leer el archivo Excel ───────────────────────────────────
function leerExcelLegacy(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Buscar fila de encabezados (la que contenga "Familia" o "Código")
        let filaEncabezados = 0;
        for (let i = 0; i < rawData.length; i++) {
            const fila = rawData[i].map(c => String(c || '').toLowerCase().trim());
            if (fila.some(c => c === 'familia' || c === 'código' || c === 'codigo')) {
                filaEncabezados = i;
                break;
            }
        }

        const jsonArray = XLSX.utils.sheet_to_json(worksheet, { range: filaEncabezados });
        if (jsonArray.length === 0) {
            NativeModal.fire('Error', 'No se encontraron datos después de los encabezados.', 'error');
            return;
        }

        analizarYProcesarLegacy(jsonArray);
    };
    reader.readAsArrayBuffer(file);
}

// ─── NÚCLEO: Analizar datos legacy y ejecutar la migración ───
async function analizarYProcesarLegacy(datosJSON) {
    // 1. Parsear filas del Excel
    const filasExcel = [];
    const sinCodigo = [];

    datosJSON.forEach(fila => {
        const f = {};
        for (let k in fila) f[k.trim().toLowerCase()] = fila[k];

        const familia = String(f['familia'] || '').trim();
        const codigo = String(f['código'] || f['codigo'] || '').trim().toUpperCase();
        const pases = parseInt(f['cantidad de pases'] || f['pases'] || 1);
        const integrantes = String(f['nombre de invitados (opcional)'] || f['integrantes'] || f['nombre de invitados'] || '').trim();
        const mesa = String(f['número de mesa'] || f['numero de mesa'] || f['mesa'] || '').trim();
        const estadoRaw = String(f['confirmado'] || '').trim();
        const estado = parseEstado(estadoRaw);

        if (!familia) return; // Fila vacía

        if (!codigo) {
            sinCodigo.push(familia);
            return;
        }

        filasExcel.push({ familia, codigo, pases, integrantes, mesa, estado });
    });

    if (filasExcel.length === 0) {
        let msg = 'El archivo no contenía invitados con código válido.';
        if (sinCodigo.length > 0) msg += `\n\n${sinCodigo.length} fila(s) sin código fueron omitidas.`;
        NativeModal.fire('Atención', msg, 'warning');
        return;
    }

    // 2. Cargar invitados existentes de Firestore
    toast('Analizando lista legacy...', { description: 'Comparando con la base de datos...', duration: 5000 });
    let existentesPorCodigo = {};
    try {
        const snap = await getDocs(query(collection(db, 'invitados'), where('evento_id', '==', eventoActivoId)));
        snap.forEach(d => {
            existentesPorCodigo[d.id] = d.data();
        });
    } catch (err) {
        NativeModal.fire('Error', 'No se pudo consultar la lista actual. Intenta de nuevo.', 'error');
        return;
    }

    // 3. Clasificar cada fila
    const nuevos = [];
    const actualizar = [];
    const ignorados = [];

    filasExcel.forEach(fila => {
        const existente = existentesPorCodigo[fila.codigo];

        if (existente) {
            // Ya existe — verificar si hay cambios
            const cambios = [];
            const pasesExistentes = Number(existente.pases_asignados) || 1;
            if (pasesExistentes !== fila.pases) cambios.push({ campo: 'Pases', antes: pasesExistentes, despues: fila.pases });

            const mesaExistente = String(existente.mesa || '').trim();
            if (fila.mesa && mesaExistente !== fila.mesa) cambios.push({ campo: 'Mesa', antes: mesaExistente || '—', despues: fila.mesa });

            const estadoExistente = existente.estado || 'pendiente';
            if (estadoExistente !== fila.estado) cambios.push({ campo: 'Estado', antes: estadoExistente, despues: fila.estado });

            const integrantesExistente = String(existente.integrantes || '').trim();
            if (fila.integrantes && integrantesExistente !== fila.integrantes) cambios.push({ campo: 'Nombres', antes: integrantesExistente || '—', despues: fila.integrantes });

            if (cambios.length > 0) {
                actualizar.push({ codigo: fila.codigo, label: fila.familia, cambios, fila });
            } else {
                ignorados.push(fila.familia);
            }
        } else {
            nuevos.push(fila);
        }
    });

    // 4. TODO duplicado sin cambios
    if (nuevos.length === 0 && actualizar.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Lista idéntica',
            html: `Todos los <b>${ignorados.length} invitados</b> del Excel ya existen sin cambios. No hay nada que migrar.`,
            confirmButtonColor: '#8B5CF6'
        });
        return;
    }

    // 5. Verificar límite de pases (solo para nuevos)
    const pasesNuevos = nuevos.reduce((s, f) => s + f.pases, 0);
    const disponibles = getLimitePases() - getTotalPasesGenerados();
    if (pasesNuevos > disponibles) {
        Swal.fire({
            title: 'Límite Excedido',
            html: `Los nuevos invitados requieren <b>${pasesNuevos}</b> pases, pero solo tienes <b>${disponibles}</b> disponibles.<br><br>Contacta a la agencia para ampliar el límite.`,
            icon: 'error',
            confirmButtonColor: '#8B5CF6'
        });
        return;
    }

    // 6. Contar estados para el resumen
    const confirmadosCount = filasExcel.filter(f => f.estado === 'confirmado').length;
    const declinadosCount = filasExcel.filter(f => f.estado === 'declinado').length;
    const pendientesCount = filasExcel.filter(f => f.estado === 'pendiente').length;

    // 7. Mostrar resumen de confirmación
    let htmlResumen = `<div class="text-left space-y-4 text-sm mt-2">`;

    // Resumen de estados
    htmlResumen += `
        <div class="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <p class="font-bold text-purple-700 mb-2 text-xs flex items-center gap-1.5"><i class="ph-bold ph-chart-pie-slice"></i> Distribución de estados en el Excel</p>
            <div class="flex gap-3 text-xs">
                <span class="bg-green-100 text-green-700 px-2 py-1 rounded-lg font-bold">✅ ${confirmadosCount} Confirmados</span>
                <span class="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-bold">⏳ ${pendientesCount} Pendientes</span>
                <span class="bg-red-100 text-red-700 px-2 py-1 rounded-lg font-bold">❌ ${declinadosCount} Declinados</span>
            </div>
        </div>`;

    if (nuevos.length > 0) {
        htmlResumen += `
            <div class="bg-green-50 border border-green-200 rounded-xl p-3">
                <p class="font-bold text-green-700 mb-1.5 flex items-center gap-1.5">
                    <span class="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">${nuevos.length}</span>
                    Nuevos invitados a crear
                </p>
                <ul class="space-y-0.5 text-green-800 text-xs max-h-24 overflow-y-auto">
                    ${nuevos.map(f => `<li>• ${f.familia} <span class="text-green-600">(${f.codigo} · ${f.pases} pases · ${f.estado})</span></li>`).join('')}
                </ul>
            </div>`;
    }

    if (actualizar.length > 0) {
        htmlResumen += `
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p class="font-bold text-amber-700 mb-1.5 flex items-center gap-1.5">
                    <span class="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">${actualizar.length}</span>
                    Se actualizarán estos invitados
                </p>
                <ul class="space-y-1.5 text-amber-800 text-xs max-h-32 overflow-y-auto">
                    ${actualizar.map(a =>
            `<li><b>${a.label} (${a.codigo}):</b> ${a.cambios.map(c => `${c.campo} <span class="line-through text-amber-500">${c.antes}</span> → <b>${c.despues}</b>`).join(', ')}</li>`
        ).join('')}
                </ul>
            </div>`;
    }

    if (ignorados.length > 0) {
        htmlResumen += `
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p class="font-bold text-slate-500 text-xs flex items-center gap-1.5">
                    <span class="w-5 h-5 bg-slate-300 text-white rounded-full flex items-center justify-center text-[10px] font-black">${ignorados.length}</span>
                    Sin cambios (se omitirán)
                </p>
            </div>`;
    }

    if (sinCodigo.length > 0) {
        htmlResumen += `
            <div class="bg-red-50 border border-red-200 rounded-xl p-3">
                <p class="font-bold text-red-500 text-xs flex items-center gap-1.5">
                    <i class="ph-bold ph-warning"></i> ${sinCodigo.length} fila(s) sin código fueron omitidas
                </p>
                <ul class="text-red-600 text-xs mt-1 max-h-16 overflow-y-auto">
                    ${sinCodigo.map(f => `<li>• ${f}</li>`).join('')}
                </ul>
            </div>`;
    }

    htmlResumen += `</div>`;

    const confirmacion = await Swal.fire({
        title: 'Resumen de Migración Legacy',
        html: htmlResumen,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Confirmar Migración',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#8B5CF6',
        cancelButtonColor: '#94a3b8',
        reverseButtons: true
    });

    if (!confirmacion.isConfirmed) return;

    // 8. Ejecutar el batch
    toast('Migrando datos legacy...', { description: 'Creando registros en la base de datos...', duration: 5000 });

    try {
        const batch = writeBatch(db);

        // Nuevos: crear con el código original como ID del documento
        nuevos.forEach(fila => {
            const ref = doc(collection(db, 'invitados'), fila.codigo);
            const datos = {
                evento_id: eventoActivoId,
                nombre_familia: fila.familia,
                pases_asignados: fila.pases,
                integrantes: fila.integrantes,
                telefono: '',
                estado: fila.estado,
                asistiran: fila.estado === 'confirmado' ? fila.pases : 0,
                quien_confirma: fila.estado === 'confirmado' ? fila.familia : '',
                fecha_creacion: serverTimestamp()
            };
            if (fila.mesa) datos.mesa = fila.mesa;
            if (fila.estado !== 'pendiente') datos.fecha_confirmacion = serverTimestamp();
            batch.set(ref, datos);
        });

        // Actualizaciones: solo los campos que cambiaron
        actualizar.forEach(({ codigo, fila, cambios }) => {
            const updates = {};
            cambios.forEach(c => {
                if (c.campo === 'Pases') updates.pases_asignados = fila.pases;
                if (c.campo === 'Mesa') updates.mesa = fila.mesa;
                if (c.campo === 'Nombres') updates.integrantes = fila.integrantes;
                if (c.campo === 'Estado') {
                    updates.estado = fila.estado;
                    updates.asistiran = fila.estado === 'confirmado' ? fila.pases : 0;
                    updates.quien_confirma = fila.estado === 'confirmado' ? fila.familia : '';
                    if (fila.estado !== 'pendiente') updates.fecha_confirmacion = serverTimestamp();
                }
            });
            batch.update(doc(db, 'invitados', codigo), updates);
        });

        await batch.commit();

        toast.success('¡Migración Completada!', {
            description: `${nuevos.length} creados • ${actualizar.length} actualizados • ${ignorados.length} omitidos`,
            className: 'bg-purple-50/90 text-purple-600 border border-purple-100 font-bold shadow-xl backdrop-blur-md rounded-xl',
            duration: 6000
        });

    } catch (error) {
        console.error(error);
        toast.error('Error en la migración', { description: error.message, className: 'bg-red-50/90 text-red-600 border border-red-100 font-bold shadow-xl backdrop-blur-md rounded-xl', duration: 5000 });
    }
}
