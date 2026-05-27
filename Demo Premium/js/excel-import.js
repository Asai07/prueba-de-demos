// js/excel-import.js
import { db } from './mock-firebase.js';
import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp, updateDoc } from "./mock-firebase.js";
import { getLimitePases, getTotalPasesGenerados } from './dashboard-state.js';

// Fix #2.2: Sin fallback hardcodeado — redirigir si no hay sesión activa
const eventoActivoId = localStorage.getItem('cliente_activo_id');
if (!eventoActivoId) { window.location.replace('index.html'); }

// ─── Normalizar apellido para comparación robusta ───────────────────────────
function normalizarNombre(str) {
    return String(str || '').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
        .replace(/\s+/g, ' ');                            // colapsar espacios
}

// ─── Generar código único con prefijo ───────────────────────────────────────
function generarCodigo(prefijo) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = `${prefijo}-`;
    const suffixLength = Math.max(4, 9 - codigo.length);
    for (let i = 0; i < suffixLength; i++) codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    return codigo;
}

// ─── Modal de carga del archivo ─────────────────────────────────────────────
window.abrirModalImportar = function () {
    NativeDrawer.fire({
        title: 'Importar Lista',
        subtitle: 'Carga tus invitados desde Excel',
        html: `
            <div class="space-y-6 text-left mt-2 pb-4">
                <div class="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl text-[13px] text-indigo-800 shadow-sm">
                    <ul class="space-y-2">
                        <li class="flex items-start gap-2"><i class="ph-bold ph-check text-indigo-500 mt-0.5"></i><span>1. Tu Excel requiere las columnas: <b>Apellidos</b> y <b>Pases</b>.</span></li>
                        <li class="flex items-start gap-2"><i class="ph-bold ph-check text-indigo-500 mt-0.5"></i><span>2. Opciones: <b>Integrantes</b>, <b>Teléfono</b> y <b>Mesa</b>.</span></li>
                        <li class="flex items-start gap-2"><i class="ph-bold ph-check text-indigo-500 mt-0.5"></i><span>3. Elige un prefijo para identificar los códigos (Ej. <b>SYM</b>).</span></li>
                    </ul>
                </div>

                <div>
                    <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Prefijo de los códigos <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <i class="ph-bold ph-text-aa absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                        <input type="text" id="drawer-prefijo-codigo" placeholder="Ej. SYM" maxlength="4" class="w-full pl-12 pr-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[15px] font-black text-primario uppercase focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-secundario uppercase mb-1.5 ml-1">Archivo Excel <span class="text-red-500">*</span></label>
                    <div class="relative group">
                        <input type="file" id="drawer-archivo-excel" accept=".xlsx, .xls, .csv" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                        <div id="drawer-dropzone" class="w-full bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center group-hover:border-brand group-hover:bg-brand-light/10 transition-colors flex flex-col items-center justify-center gap-2">
                            <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-brand group-hover:bg-brand-light/50 transition-colors">
                                <i class="ph-bold ph-upload-simple text-2xl"></i>
                            </div>
                            <p class="text-sm font-bold text-primario" id="drawer-file-name">Selecciona o arrastra el archivo</p>
                            <p class="text-xs text-secundario">.xlsx, .xls, .csv</p>
                        </div>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Procesar Archivo',
        showLoadingOnConfirm: true,
        didOpen: () => {
            const fileInput = document.getElementById('drawer-archivo-excel');
            const nameDisplay = document.getElementById('drawer-file-name');
            const dropzone = document.getElementById('drawer-dropzone');
            if (fileInput && nameDisplay) {
                fileInput.addEventListener('change', function () {
                    if (this.files && this.files.length > 0) {
                        nameDisplay.textContent = this.files[0].name;
                        nameDisplay.classList.add('text-brand');
                        if (dropzone) { dropzone.classList.add('border-brand', 'bg-brand-light/10'); dropzone.classList.remove('border-slate-300'); }
                    } else {
                        nameDisplay.textContent = 'Selecciona o arrastra el archivo';
                        nameDisplay.classList.remove('text-brand');
                        if (dropzone) { dropzone.classList.remove('border-brand', 'bg-brand-light/10'); dropzone.classList.add('border-slate-300'); }
                    }
                });
            }
        },
        preConfirm: () => {
            const fileInput = document.getElementById('drawer-archivo-excel');
            const prefijoInput = document.getElementById('drawer-prefijo-codigo').value.trim();
            if (!prefijoInput) { NativeDrawer.showValidationMessage('El prefijo es obligatorio', 'drawer-prefijo-codigo'); return false; }
            if (!fileInput.files.length) { NativeDrawer.showValidationMessage('Selecciona un archivo Excel'); return false; }
            return { file: fileInput.files[0], prefijo: prefijoInput.toUpperCase() };
        }
    }).then((result) => {
        if (result.isConfirmed) leerExcel(result.value.file, result.value.prefijo);
    });
}

// ─── Leer el archivo Excel y extraer filas válidas ───────────────────────────
function leerExcel(file, prefijo) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        let filaEncabezados = 0;
        for (let i = 0; i < rawData.length; i++) {
            if (rawData[i].some(c => String(c).toLowerCase().trim() === 'apellidos')) { filaEncabezados = i; break; }
        }

        const jsonArray = XLSX.utils.sheet_to_json(worksheet, { range: filaEncabezados });
        if (jsonArray.length === 0) { NativeModal.fire('Error', 'No se encontraron datos después de los encabezados.', 'error'); return; }

        analizarYProcesar(jsonArray, prefijo);
    };
    reader.readAsArrayBuffer(file);
}

// ─── NÚCLEO: Analizar Excel vs Firestore y ejecutar con confirmación ──────────
async function analizarYProcesar(datosJSON, prefijo) {
    // 1. Parsear y limpiar filas del Excel
    const filasExcel = [];
    datosJSON.forEach(fila => {
        const f = {};
        for (let k in fila) f[k.trim().toLowerCase()] = fila[k];
        const apellidos = String(f['apellidos'] || '').trim();
        if (apellidos) {
            filasExcel.push({
                apellidos,
                apellidosNorm: normalizarNombre(apellidos),
                pases: parseInt(f['pases'] || 1),
                integrantes: String(f['integrantes'] || '').trim(),
                mesa: String(f['mesa'] || f['mesa (opcional)'] || '').trim(),
                telefono: String(f['whatsapp'] || f['whatsapp (con lada)'] || f['teléfono'] || f['telefono'] || f['celular'] || '').replace(/(?!^\+)\D/g, '')
            });
        }
    });

    if (filasExcel.length === 0) {
        NativeModal.fire('Atención', 'El archivo no contenía invitados válidos.', 'warning');
        return;
    }

    // 2. Cargar invitados existentes de Firestore
    toast('Analizando lista...', { description: 'Comparando con invitados existentes...', duration: 5000 });
    let existentesPorApellido = {}; // { "apellidonormalizado": [ {invitado1}, {invitado2} ] }
    try {
        const snap = await getDocs(query(collection(db, 'invitados'), where('evento_id', '==', eventoActivoId)));
        snap.forEach(d => {
            const data = d.data();
            if (!data.is_master) {
                const key = normalizarNombre(data.nombre_familia);
                if (!existentesPorApellido[key]) existentesPorApellido[key] = [];
                existentesPorApellido[key].push({
                    id: d.id,
                    ...data,
                    integrantesNorm: normalizarNombre(data.integrantes || ''),
                    telNorm: String(data.telefono || '').replace(/(?!^\+)\D/g, '')
                });
            }
        });
    } catch (err) {
        NativeModal.fire('Error', 'No se pudo consultar la lista actual. Intenta de nuevo.', 'error');
        return;
    }

    // 3. Clasificar cada fila del Excel (Lógica Híbrida Inteligente)
    const nuevos = [];
    const actualizar = [];  // { id, apellidos, cambios: [{campo, antes, despues}], fila }
    const ignorados = [];   // Identificadores de fila sin cambios

    // Set para no emparejar a dos filas de Excel con el mismo invitado existente
    const idsExistentesUsados = new Set();

    filasExcel.forEach(fila => {
        const posiblesMatch = existentesPorApellido[fila.apellidosNorm] || [];

        // Determinar el mejor match según heurística
        let mejorMatch = null;
        let mejorPuntaje = -1;

        const filaIntegrantesNorm = normalizarNombre(fila.integrantes || '');
        const filaTelNorm = String(fila.telefono || '').replace(/(?!^\+)\D/g, '');
        const filaPases = Number(fila.pases) || 1;

        posiblesMatch.forEach(existente => {
            if (idsExistentesUsados.has(existente.id)) return; // Ya fue emparejado con otra fila del Excel

            let puntaje = 0;
            // Evaluamos similitudes fuertes
            if (filaIntegrantesNorm && filaIntegrantesNorm === existente.integrantesNorm) puntaje += 10;
            if (filaTelNorm && filaTelNorm === existente.telNorm) puntaje += 5;

            // Si no hay teléfono ni nombre en el Excel (solo apellidos), nos basamos en los pases, 
            // pero le damos baja prioridad comparado al nombre/teléfono.
            if (filaPases === (Number(existente.pases_asignados) || 1)) puntaje += 1;

            if (puntaje > mejorPuntaje) {
                mejorPuntaje = puntaje;
                mejorMatch = existente;
            }
        });

        // Si encontramos un candidato existente (con algún nivel mínimo de coincidencia o si es el único con ese apellido)
        if (mejorMatch && (mejorPuntaje > 0 || posiblesMatch.length === 1)) {

            idsExistentesUsados.add(mejorMatch.id); // Reclamar este registro para no volverlo a comparar

            const cambios = [];
            const pasesExistentes = Number(mejorMatch.pases_asignados) || 1;
            if (pasesExistentes !== filaPases) cambios.push({ campo: 'Pases', antes: pasesExistentes, despues: filaPases });

            const mesaExistente = String(mejorMatch.mesa || '').trim();
            const mesaNueva = String(fila.mesa || '').trim();
            if (mesaNueva && mesaExistente !== mesaNueva) cambios.push({ campo: 'Mesa', antes: mesaExistente || '—', despues: mesaNueva });

            const integrantesExistente = String(mejorMatch.integrantes || '').trim();
            const integrantesNuevos = String(fila.integrantes || '').trim();
            if (integrantesNuevos && integrantesExistente !== integrantesNuevos) cambios.push({ campo: 'Nombres', antes: integrantesExistente || '—', despues: integrantesNuevos });

            if (filaTelNorm && mejorMatch.telNorm !== filaTelNorm) cambios.push({ campo: 'Teléfono', antes: mejorMatch.telNorm || '—', despues: filaTelNorm });

            if (cambios.length > 0) {
                actualizar.push({ id: mejorMatch.id, nombresLabel: `${fila.apellidos} ${fila.integrantes ? '(' + fila.integrantes + ')' : ''}`, cambios, fila });
            } else {
                ignorados.push(`${fila.apellidos} ${fila.integrantes ? '(' + fila.integrantes + ')' : ''}`);
            }

        } else {
            // No existe o es un homónimo totalmente distinto (Nombres/Tel/Pases diferentes sin relación)
            nuevos.push(fila);
        }
    });

    // 4. Si TODO es duplicado sin cambios → error
    if (nuevos.length === 0 && actualizar.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Lista idéntica',
            html: `Todos los <b>${ignorados.length} invitados</b> del Excel ya existen en tu lista sin cambios. No hay nada que importar.`,
            confirmButtonColor: '#FC7643'
        });
        return;
    }

    // 5. Verificar límite de pases solo para los nuevos
    const pasesNuevos = nuevos.reduce((s, f) => s + f.pases, 0);
    const disponibles = getLimitePases() - getTotalPasesGenerados();
    if (pasesNuevos > disponibles) {
        Swal.fire({
            title: 'Límite Excedido',
            html: `Los nuevos invitados requieren <b>${pasesNuevos}</b> pases, pero solo tienes <b>${disponibles}</b> disponibles.<br><br>Reduce la lista o contacta a la agencia.`,
            icon: 'error',
            confirmButtonColor: '#FC7643'
        });
        return;
    }

    // 6. Mostrar resumen de confirmación
    let htmlResumen = `<div class="text-left space-y-4 text-sm mt-2">`;

    if (nuevos.length > 0) {
        htmlResumen += `
            <div class="bg-green-50 border border-green-200 rounded-xl p-3">
                <p class="font-bold text-green-700 mb-1.5 flex items-center gap-1.5">
                    <span class="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">${nuevos.length}</span>
                    Nuevos invitados a agregar
                </p>
                <ul class="space-y-0.5 text-green-800 text-xs max-h-24 overflow-y-auto">
                    ${nuevos.map(f => `<li>• ${f.apellidos} <span class="text-green-600">(${f.pases} pases)</span></li>`).join('')}
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
            `<li><b>${a.nombresLabel}:</b> ${a.cambios.map(c => `${c.campo} <span class="line-through text-amber-500">${c.antes}</span> → <b>${c.despues}</b>`).join(', ')}</li>`
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

    htmlResumen += `</div>`;

    const confirmacion = await Swal.fire({
        title: 'Resumen de Importación',
        html: htmlResumen,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Confirmar e Importar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#FC7643',
        cancelButtonColor: '#94a3b8',
        reverseButtons: true
    });

    if (!confirmacion.isConfirmed) return;

    // 7. Ejecutar el batch
    toast('Importando...', { description: 'Guardando cambios en la base de datos...', duration: 5000 });

    try {
        const batch = writeBatch(db);

        // Nuevos: set completo
        nuevos.forEach(fila => {
            const codigo = generarCodigo(prefijo);
            const ref = doc(collection(db, 'invitados'), codigo);
            const datos = {
                evento_id: eventoActivoId,
                nombre_familia: fila.apellidos,
                pases_asignados: fila.pases,
                integrantes: fila.integrantes,
                telefono: fila.telefono,
                estado: 'pendiente',
                asistiran: 0,
                quien_confirma: '',
                fecha_creacion: serverTimestamp()
            };
            if (fila.mesa) datos.mesa = fila.mesa;
            batch.set(ref, datos);
        });

        // Actualizaciones: solo los campos que cambiaron
        actualizar.forEach(({ id, fila, cambios }) => {
            const updates = {};
            cambios.forEach(c => {
                if (c.campo === 'Pases') updates.pases_asignados = fila.pases;
                if (c.campo === 'Mesa') updates.mesa = fila.mesa;
                if (c.campo === 'Nombres') updates.integrantes = fila.integrantes;
                if (c.campo === 'Teléfono') updates.telefono = fila.telefono;
            });
            batch.update(doc(db, 'invitados', id), updates);
        });

        await batch.commit();

        toast.success('¡Importación Completada!', {
            description: `${nuevos.length} nuevos • ${actualizar.length} actualizados • ${ignorados.length} omitidos`,
            className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl',
            duration: 5000
        });

    } catch (error) {
        console.error(error);
        toast.error('Error al importar', { description: error.message, className: 'bg-red-50/90 text-red-600 border border-red-100 font-bold shadow-xl backdrop-blur-md rounded-xl', duration: 5000 });
    }
}

