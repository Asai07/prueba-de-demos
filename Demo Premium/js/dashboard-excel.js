// ========================================================
// MÓDULO: EXPORTACIONES EXCEL (dashboard-excel.js)
// ========================================================
import { db } from './mock-firebase.js';
import { collection, query, where, getDocs } from "./mock-firebase.js";
import { getFlagsEvento, getPaqueteContratado, getDatosBanquete } from './dashboard-state.js';

window.exportarDirectorio = async function () {
    const eventoActivoId = localStorage.getItem('cliente_activo_id');

    toast('Generando archivo...', { id: 'toast-export', description: 'Recopilando la lista final de confirmados', duration: 100000 });

    const clearToasts = () => {
        const container = document.getElementById('sonner-toast-container');
        if (container) container.innerHTML = '';
    };

    try {
        const q = query(collection(db, "invitados"), where("evento_id", "==", eventoActivoId));
        const snapshot = await getDocs(q);
        let datosExcel = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            if (!data.is_master && data.estado === 'confirmado') {
                let asisReales = parseInt(data.asistiran) || parseInt(data.pases_asignados) || 0;
                const nombreTitular = data.nombre_familia || "Desconocido";
                const confirmadoPor = data.quien_confirma || "Sin especificar";

                // Extraer nombres reales, con soporte especial para VIP (detalles_asistentes)
                let nombresReales = data.nombres_asistentes || data.integrantes || "-";
                if (data.detalles_asistentes && Array.isArray(data.detalles_asistentes) && data.detalles_asistentes.length > 0) {
                    const arrayNombres = data.detalles_asistentes.map(a => a.nombre).filter(n => n && n.trim() !== '');
                    if (arrayNombres.length > 0) { nombresReales = arrayNombres.join(', '); }
                }

                const flags = getFlagsEvento();

                let filaExcel = {
                    "Familia / Titular": nombreTitular
                };

                // Si 'Confirmado por' es idéntico a Titular, no hacemos una columna redundante
                if (confirmadoPor !== nombreTitular && confirmadoPor !== "Sin especificar") {
                    filaExcel["Confirmado por"] = confirmadoPor;
                }

                // Solo incluir "Integrantes (Reales)" en planes VIP donde se recopilan nombres individuales
                const esVIP = getPaqueteContratado && getPaqueteContratado() === 'vip';
                const tieneNombresDetallados = data.detalles_asistentes?.length > 0 || data.nombres_asistentes;
                if (esVIP || tieneNombresDetallados) {
                    filaExcel["Integrantes (Reales)"] = nombresReales;
                }

                // Solo agregar estas columnas si flagPedirEdades es explícitamente true o de algún modo se llenaron manual
                if (flags.flagPedirEdades || parseInt(data.adultos) > 0 || parseInt(data.ninos) > 0) {
                    filaExcel["Adultos"] = parseInt(data.adultos) || 0;
                    filaExcel["Niños"] = parseInt(data.ninos) || 0;
                }

                filaExcel["Pases Finales"] = asisReales;

                // WhatsApp solo aplica para el plan VIP (en el normal nunca se pide)
                if (esVIP && data.telefono) {
                    filaExcel["WhatsApp"] = data.telefono;
                }

                filaExcel["Código Usado"] = data.codigo_origen || doc.id;

                datosExcel.push(filaExcel);
            }
        });

        if (datosExcel.length === 0) {
            clearToasts();
            return toast.info('Lista Vacía', { description: 'Aún no tienes invitados confirmados para exportar.', className: 'bg-blue-50/90 text-blue-600 border border-blue-100 font-bold shadow-xl backdrop-blur-md rounded-xl', duration: 4000 });
        }

        const worksheet = XLSX.utils.json_to_sheet(datosExcel);
        const workbook = XLSX.utils.book_new();
        // Hicimos la 3ra columna (Integrantes) más ancha (wch: 40)
        worksheet['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, "Lista Final");
        XLSX.writeFile(workbook, `Confirmados_${eventoActivoId}.xlsx`);
        clearToasts();
        setTimeout(() => {
            toast.success('¡Descarga Lista!', { description: 'El archivo Excel se ha guardado.', className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl', duration: 4000 });
        }, 50);
    } catch (error) {
        console.error("Error al exportar:", error);
        clearToasts();
        setTimeout(() => {
            toast.error('Error', { description: 'Hubo un problema al generar tu archivo.', className: 'bg-red-50/90 text-red-600 border border-red-100 font-bold shadow-xl backdrop-blur-md rounded-xl', duration: 4000 });
        }, 50);
    }
};

window.exportarBanquete = function () { // (O como se llame tu función de este botón)
    const datosBanqueteExportar = getDatosBanquete();
    if (!datosBanqueteExportar || datosBanqueteExportar.length === 0) {
        return NativeModal.fire('Información vacía', 'No hay asistentes con detalles para exportar.', 'info');
    }

    const paqueteContratado = getPaqueteContratado();
    const flags = getFlagsEvento();

    // Nombres dinámicos dependiendo de lo que contrató el cliente
    let tipoExportacion = paqueteContratado === 'vip' ? "Detalles_VIP" : "Desglose_Edades";
    let nombreHoja = paqueteContratado === 'vip' ? "Lista Detallada" : "Control de Edades";

    if (paqueteContratado === 'vip') {
        if (flags.flagPedirMenu) { tipoExportacion = "Banquete"; nombreHoja = "Menús y Alergias"; }
        else if (flags.flagMostrarMesa) { tipoExportacion = "Mesas"; nombreHoja = "Asignación de Mesas"; }
    }

    const ws = XLSX.utils.json_to_sheet(datosBanqueteExportar);
    const wb = XLSX.utils.book_new();

    // Ajustamos el ancho de las columnas de Excel dinámicamente según el plan
    let anchosDeColumna = [];

    if (paqueteContratado === 'vip') {
        anchosDeColumna = [{ wch: 25 }, { wch: 25 }]; // Familia y Asistente
        if (flags.flagPedirEdades) anchosDeColumna.push({ wch: 15 });
        if (flags.flagMostrarMesa) anchosDeColumna.push({ wch: 15 });
        if (flags.flagPedirMenu) { anchosDeColumna.push({ wch: 18 }); anchosDeColumna.push({ wch: 30 }); }
    } else {
        // Columnas Plan Básico: Titular, Código, Adultos, Niños, Total
        anchosDeColumna = [{ wch: 30 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 18 }];
    }

    ws['!cols'] = anchosDeColumna;
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);

    const nombreArchivo = `${tipoExportacion}_${localStorage.getItem('cliente_nombre') || 'Evento'}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
    toast.success('Exito', { description: 'El archivo descargó correctamente', className: 'bg-green-50/90 text-green-600 border border-green-100 font-bold shadow-xl backdrop-blur-md rounded-xl' });
};
