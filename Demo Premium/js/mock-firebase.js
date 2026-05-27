// js/mock-firebase.js

// Mock DB and Auth
export const db = {};
export const auth = {};

// Mock Firebase SDK functions (needed by firebase-config.js and other files)
export function initializeApp() { return {}; }
export function initializeFirestore() { return db; }
export function persistentLocalCache() { return {}; }
export function persistentMultipleTabManager() { return {}; }
export function signOut() { return Promise.resolve(); }

// Mock auth state
export function getAuth() { return auth; }
export function onAuthStateChanged(authObj, callback) {
    // Simulate immediate login success
    setTimeout(() => {
        callback({ uid: 'demo-user', email: 'demo@eventoclic.com' });
    }, 100);
}

// Mock Firestore functions
export function getFirestore() { return db; }
export function collection(db, path) { return path; }
export function query(col, ...args) { return { col, args }; }
export function where(field, op, value) { return { field, op, value }; }
export function limit(n) { return { limit: n }; }
export function doc(db, path, id) { return { path, id }; }
export function serverTimestamp() { return new Date(); }
export function writeBatch(db) { 
    return {
        update: () => {},
        set: () => {},
        delete: () => {},
        commit: async () => {}
    }; 
}
export async function updateDoc() { return true; }
export async function setDoc() { return true; }
export async function deleteDoc() { return true; }

export async function getDoc(docRef) {
    // Return event data
    return {
        exists: () => true,
        data: () => ({
            paquete_contratado: 'normal',
            limite_pases: 80,
            mostrar_mesa: false,
            pedir_edades: true,
            pedir_menu: false,
            pedir_nombres: false,
            pedir_correo: false,
            link_invitacion: 'https://eventoclic.com/demo',
            nombre_cliente: 'Demo User',
            nombre_evento: 'Boda de Prueba Premium',
            fecha_evento: '2026-12-31',
            password: 'demo'
        })
    };
}

export function onSnapshot(queryRef, callback, errorCallback) {
    const now = Date.now();
    const invitadosMock = [];

    // ── Códigos Máster ──
    invitadosMock.push({ id: 'BODA-2026', data: () => ({ is_master: true, pases_asignados: 3 }) });
    invitadosMock.push({ id: 'EVENTO-VIP', data: () => ({ is_master: true, pases_asignados: 2 }) });

    // ── 8 Confirmados ──
    invitadosMock.push({ id: 'INV-001', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia García Hernández',
        asistiran: 4, adultos: 2, ninos: 2, pases_asignados: 4,
        quien_confirma: 'Roberto García', codigo_origen: 'BODA-2026',
        fecha_confirmacion: { toMillis: () => now - 86400000 },
        fecha_creacion: { toMillis: () => now - 604800000 }
    }) });

    invitadosMock.push({ id: 'INV-002', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia López Méndez',
        asistiran: 3, adultos: 2, ninos: 1, pases_asignados: 3,
        quien_confirma: 'María López', codigo_origen: 'BODA-2026',
        fecha_confirmacion: { toMillis: () => now - 172800000 },
        fecha_creacion: { toMillis: () => now - 604800000 }
    }) });

    invitadosMock.push({ id: 'INV-003', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Rodríguez Torres',
        asistiran: 2, adultos: 2, ninos: 0, pases_asignados: 2,
        quien_confirma: 'Carlos Rodríguez', codigo_origen: 'EVENTO-VIP',
        fecha_confirmacion: { toMillis: () => now - 259200000 },
        fecha_creacion: { toMillis: () => now - 518400000 }
    }) });

    invitadosMock.push({ id: 'INV-004', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Martínez Ríos',
        asistiran: 5, adultos: 3, ninos: 2, pases_asignados: 5,
        quien_confirma: 'Andrea Martínez', codigo_origen: 'BODA-2026',
        fecha_confirmacion: { toMillis: () => now - 345600000 },
        fecha_creacion: { toMillis: () => now - 691200000 }
    }) });

    invitadosMock.push({ id: 'INV-005', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Sánchez Vega',
        asistiran: 2, adultos: 2, ninos: 0, pases_asignados: 2,
        quien_confirma: 'Luis Sánchez', codigo_origen: 'EVENTO-VIP',
        fecha_confirmacion: { toMillis: () => now - 432000000 },
        fecha_creacion: { toMillis: () => now - 777600000 }
    }) });

    invitadosMock.push({ id: 'INV-006', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Ramírez Castillo',
        asistiran: 3, adultos: 2, ninos: 1, pases_asignados: 3,
        quien_confirma: 'Patricia Ramírez', codigo_origen: 'BODA-2026',
        fecha_confirmacion: { toMillis: () => now - 518400000 },
        fecha_creacion: { toMillis: () => now - 864000000 }
    }) });

    invitadosMock.push({ id: 'INV-007', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Díaz Moreno',
        asistiran: 4, adultos: 3, ninos: 1, pases_asignados: 4,
        quien_confirma: 'Fernando Díaz', codigo_origen: 'BODA-2026',
        fecha_confirmacion: { toMillis: () => now - 604800000 },
        fecha_creacion: { toMillis: () => now - 950400000 }
    }) });

    invitadosMock.push({ id: 'INV-008', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Herrera Luna',
        asistiran: 2, adultos: 2, ninos: 0, pases_asignados: 2,
        quien_confirma: 'Gabriela Herrera', codigo_origen: 'EVENTO-VIP',
        fecha_confirmacion: { toMillis: () => now - 691200000 },
        fecha_creacion: { toMillis: () => now - 1036800000 }
    }) });

    // ── 4 Pendientes ──
    invitadosMock.push({ id: 'INV-009', data: () => ({
        is_master: false, estado: 'pendiente', nombre_familia: 'Familia Torres Aguilar',
        asistiran: 0, pases_asignados: 3, codigo_origen: 'BODA-2026',
        fecha_creacion: { toMillis: () => now - 432000000 }, telefono: '5551234567'
    }) });

    invitadosMock.push({ id: 'INV-010', data: () => ({
        is_master: false, estado: 'pendiente', nombre_familia: 'Familia Flores Ortega',
        asistiran: 0, pases_asignados: 4, codigo_origen: 'BODA-2026',
        fecha_creacion: { toMillis: () => now - 518400000 }, telefono: '5559876543'
    }) });

    invitadosMock.push({ id: 'INV-011', data: () => ({
        is_master: false, estado: 'pendiente', nombre_familia: 'Familia Vargas Peña',
        asistiran: 0, pases_asignados: 2, codigo_origen: 'EVENTO-VIP',
        fecha_creacion: { toMillis: () => now - 604800000 }, telefono: '5554567890'
    }) });

    invitadosMock.push({ id: 'INV-012', data: () => ({
        is_master: false, estado: 'pendiente', nombre_familia: 'Familia Mendoza Cruz',
        asistiran: 0, pases_asignados: 3, codigo_origen: 'BODA-2026',
        fecha_creacion: { toMillis: () => now - 691200000 }, telefono: '5557891234'
    }) });

    // ── 3 Declinados ──
    invitadosMock.push({ id: 'INV-013', data: () => ({
        is_master: false, estado: 'declinado', nombre_familia: 'Familia Jiménez Ruiz',
        asistiran: 0, pases_asignados: 2, quien_confirma: 'Pedro Jiménez',
        codigo_origen: 'BODA-2026', fecha_creacion: { toMillis: () => now - 777600000 }
    }) });

    invitadosMock.push({ id: 'INV-014', data: () => ({
        is_master: false, estado: 'declinado', nombre_familia: 'Familia Reyes Guzmán',
        asistiran: 0, pases_asignados: 3, quien_confirma: 'Sofía Reyes',
        codigo_origen: 'EVENTO-VIP', fecha_creacion: { toMillis: () => now - 864000000 }
    }) });

    invitadosMock.push({ id: 'INV-015', data: () => ({
        is_master: false, estado: 'declinado', nombre_familia: 'Familia Castro Navarro',
        asistiran: 0, pases_asignados: 2, quien_confirma: 'Jorge Castro',
        codigo_origen: 'BODA-2026', fecha_creacion: { toMillis: () => now - 950400000 }
    }) });

    const snapshot = {
        size: invitadosMock.length,
        forEach: (cb) => invitadosMock.forEach(cb),
        docChanges: () => []
    };

    setTimeout(() => { callback(snapshot); }, 500);
    return () => {};
}
