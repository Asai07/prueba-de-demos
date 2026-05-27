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
        callback({ uid: 'demo-user-vip', email: 'vip@eventoclic.com' });
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
            paquete_contratado: 'vip',
            limite_pases: 150,
            mostrar_mesa: true,
            pedir_edades: true,
            pedir_menu: true,
            pedir_nombres: true,
            pedir_correo: true,
            link_invitacion: 'https://eventoclic.com/demo-vip',
            nombre_cliente: 'Demo VIP',
            nombre_evento: 'XV Años Elite',
            fecha_evento: '2026-12-31',
            password: 'demo'
        })
    };
}

export function onSnapshot(queryRef, callback, errorCallback) {
    const now = Date.now();
    const invitadosMock = [];

    // ── 10 Confirmados con detalles VIP ──
    invitadosMock.push({ id: 'VIP-001', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Ramírez Castillo',
        asistiran: 4, adultos: 3, ninos: 1, pases_asignados: 4,
        quien_confirma: 'Carlos Ramírez', codigo_origen: 'VIP-001', mesa: 'Mesa 1',
        fecha_confirmacion: { toMillis: () => now - 86400000 },
        fecha_creacion: { toMillis: () => now - 604800000 },
        detalles_asistentes: [
            { nombre: 'Carlos Ramírez', menu: 'Tradicional', mesa: 'Mesa 1', alergias: '' },
            { nombre: 'Laura Gómez', menu: 'Vegetariano', mesa: 'Mesa 1', alergias: 'Nueces' },
            { nombre: 'Daniela Ramírez', menu: 'Tradicional', mesa: 'Mesa 1', alergias: '' },
            { nombre: 'Carlitos Jr.', menu: 'Infantil', mesa: 'Mesa 1', alergias: 'Lactosa' }
        ]
    }) });

    invitadosMock.push({ id: 'VIP-002', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia López Méndez',
        asistiran: 3, adultos: 2, ninos: 1, pases_asignados: 3,
        quien_confirma: 'María López', codigo_origen: 'VIP-002', mesa: 'Mesa 2',
        fecha_confirmacion: { toMillis: () => now - 172800000 },
        fecha_creacion: { toMillis: () => now - 604800000 },
        detalles_asistentes: [
            { nombre: 'María López', menu: 'Vegetariano', mesa: 'Mesa 2', alergias: 'Gluten' },
            { nombre: 'Ricardo López', menu: 'Tradicional', mesa: 'Mesa 2', alergias: '' },
            { nombre: 'Sofía López', menu: 'Infantil', mesa: 'Mesa 2', alergias: '' }
        ]
    }) });

    invitadosMock.push({ id: 'VIP-003', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Hernández Rojas',
        asistiran: 2, adultos: 2, ninos: 0, pases_asignados: 2,
        quien_confirma: 'Alejandro Hernández', codigo_origen: 'VIP-003', mesa: 'Mesa 3',
        fecha_confirmacion: { toMillis: () => now - 259200000 },
        fecha_creacion: { toMillis: () => now - 518400000 },
        detalles_asistentes: [
            { nombre: 'Alejandro Hernández', menu: 'Tradicional', mesa: 'Mesa 3', alergias: '' },
            { nombre: 'Valentina Torres', menu: 'Vegano', mesa: 'Mesa 3', alergias: 'Mariscos' }
        ]
    }) });

    invitadosMock.push({ id: 'VIP-004', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia García Vega',
        asistiran: 5, adultos: 3, ninos: 2, pases_asignados: 5,
        quien_confirma: 'Andrea García', codigo_origen: 'VIP-004', mesa: 'Mesa 1',
        fecha_confirmacion: { toMillis: () => now - 345600000 },
        fecha_creacion: { toMillis: () => now - 691200000 },
        detalles_asistentes: [
            { nombre: 'Andrea García', menu: 'Tradicional', mesa: 'Mesa 1', alergias: '' },
            { nombre: 'Miguel Vega', menu: 'Tradicional', mesa: 'Mesa 1', alergias: 'Camarón' },
            { nombre: 'Fernando García', menu: 'Vegetariano', mesa: 'Mesa 4', alergias: '' },
            { nombre: 'Lucía Vega', menu: 'Infantil', mesa: 'Mesa 4', alergias: '' },
            { nombre: 'Emiliano García', menu: 'Infantil', mesa: 'Mesa 4', alergias: 'Lactosa' }
        ]
    }) });

    invitadosMock.push({ id: 'VIP-005', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Sánchez Medina',
        asistiran: 2, adultos: 2, ninos: 0, pases_asignados: 2,
        quien_confirma: 'Luis Sánchez', codigo_origen: 'VIP-005', mesa: 'Mesa 2',
        fecha_confirmacion: { toMillis: () => now - 432000000 },
        fecha_creacion: { toMillis: () => now - 777600000 },
        detalles_asistentes: [
            { nombre: 'Luis Sánchez', menu: 'Tradicional', mesa: 'Mesa 2', alergias: '' },
            { nombre: 'Ana Medina', menu: 'Vegano', mesa: 'Mesa 2', alergias: '' }
        ]
    }) });

    invitadosMock.push({ id: 'VIP-006', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Díaz Moreno',
        asistiran: 3, adultos: 2, ninos: 1, pases_asignados: 3,
        quien_confirma: 'Fernando Díaz', codigo_origen: 'VIP-006', mesa: 'Mesa 3',
        fecha_confirmacion: { toMillis: () => now - 518400000 },
        fecha_creacion: { toMillis: () => now - 864000000 },
        detalles_asistentes: [
            { nombre: 'Fernando Díaz', menu: 'Tradicional', mesa: 'Mesa 3', alergias: '' },
            { nombre: 'Claudia Moreno', menu: 'Vegetariano', mesa: 'Mesa 3', alergias: 'Nueces, Soya' },
            { nombre: 'Mateo Díaz', menu: 'Infantil', mesa: 'Mesa 3', alergias: '' }
        ]
    }) });

    invitadosMock.push({ id: 'VIP-007', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Herrera Luna',
        asistiran: 2, adultos: 2, ninos: 0, pases_asignados: 2,
        quien_confirma: 'Gabriela Herrera', codigo_origen: 'VIP-007', mesa: 'Mesa 5',
        fecha_confirmacion: { toMillis: () => now - 604800000 },
        fecha_creacion: { toMillis: () => now - 950400000 },
        detalles_asistentes: [
            { nombre: 'Gabriela Herrera', menu: 'Vegano', mesa: 'Mesa 5', alergias: '' },
            { nombre: 'Rodrigo Luna', menu: 'Tradicional', mesa: 'Mesa 5', alergias: 'Picante' }
        ]
    }) });

    invitadosMock.push({ id: 'VIP-008', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Ortega Campos',
        asistiran: 4, adultos: 2, ninos: 2, pases_asignados: 4,
        quien_confirma: 'Paola Ortega', codigo_origen: 'VIP-008', mesa: 'Mesa 4',
        fecha_confirmacion: { toMillis: () => now - 691200000 },
        fecha_creacion: { toMillis: () => now - 1036800000 },
        detalles_asistentes: [
            { nombre: 'Paola Ortega', menu: 'Tradicional', mesa: 'Mesa 4', alergias: '' },
            { nombre: 'Sergio Campos', menu: 'Tradicional', mesa: 'Mesa 4', alergias: '' },
            { nombre: 'Valentina Campos', menu: 'Infantil', mesa: 'Mesa 4', alergias: 'Huevo' },
            { nombre: 'Diego Campos', menu: 'Infantil', mesa: 'Mesa 4', alergias: '' }
        ]
    }) });

    invitadosMock.push({ id: 'VIP-009', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Ruiz Estrada',
        asistiran: 2, adultos: 2, ninos: 0, pases_asignados: 2,
        quien_confirma: 'Elena Ruiz', codigo_origen: 'VIP-009', mesa: 'Mesa 5',
        fecha_confirmacion: { toMillis: () => now - 777600000 },
        fecha_creacion: { toMillis: () => now - 1123200000 },
        detalles_asistentes: [
            { nombre: 'Elena Ruiz', menu: 'Vegetariano', mesa: 'Mesa 5', alergias: '' },
            { nombre: 'Javier Estrada', menu: 'Tradicional', mesa: 'Mesa 5', alergias: '' }
        ]
    }) });

    invitadosMock.push({ id: 'VIP-010', data: () => ({
        is_master: false, estado: 'confirmado', nombre_familia: 'Familia Navarro Ibarra',
        asistiran: 3, adultos: 2, ninos: 1, pases_asignados: 3,
        quien_confirma: 'Daniela Navarro', codigo_origen: 'VIP-010', mesa: 'Mesa 2',
        fecha_confirmacion: { toMillis: () => now - 864000000 },
        fecha_creacion: { toMillis: () => now - 1209600000 },
        detalles_asistentes: [
            { nombre: 'Daniela Navarro', menu: 'Tradicional', mesa: 'Mesa 2', alergias: 'Maní' },
            { nombre: 'Omar Ibarra', menu: 'Tradicional', mesa: 'Mesa 2', alergias: '' },
            { nombre: 'Renata Ibarra', menu: 'Infantil', mesa: 'Mesa 2', alergias: '' }
        ]
    }) });

    // ── 3 Pendientes ──
    invitadosMock.push({ id: 'VIP-011', data: () => ({
        is_master: false, estado: 'pendiente', nombre_familia: 'Familia Torres Aguilar',
        asistiran: 0, pases_asignados: 3, codigo_origen: 'VIP-011',
        fecha_creacion: { toMillis: () => now - 432000000 }, telefono: '5551234567'
    }) });

    invitadosMock.push({ id: 'VIP-012', data: () => ({
        is_master: false, estado: 'pendiente', nombre_familia: 'Familia Flores Reyes',
        asistiran: 0, pases_asignados: 4, codigo_origen: 'VIP-012',
        fecha_creacion: { toMillis: () => now - 518400000 }, telefono: '5559876543'
    }) });

    invitadosMock.push({ id: 'VIP-013', data: () => ({
        is_master: false, estado: 'pendiente', nombre_familia: 'Familia Vargas Peña',
        asistiran: 0, pases_asignados: 2, codigo_origen: 'VIP-013',
        fecha_creacion: { toMillis: () => now - 604800000 }, telefono: '5554567890'
    }) });

    // ── 2 Declinados ──
    invitadosMock.push({ id: 'VIP-014', data: () => ({
        is_master: false, estado: 'declinado', nombre_familia: 'Familia Jiménez Solís',
        asistiran: 0, pases_asignados: 2, quien_confirma: 'Pedro Jiménez',
        codigo_origen: 'VIP-014', fecha_creacion: { toMillis: () => now - 777600000 }
    }) });

    invitadosMock.push({ id: 'VIP-015', data: () => ({
        is_master: false, estado: 'declinado', nombre_familia: 'Familia Guzmán Ríos',
        asistiran: 0, pases_asignados: 3, quien_confirma: 'Sofía Guzmán',
        codigo_origen: 'VIP-015', fecha_creacion: { toMillis: () => now - 864000000 }
    }) });

    const snapshot = {
        size: invitadosMock.length,
        forEach: (cb) => invitadosMock.forEach(cb),
        docChanges: () => []
    };

    setTimeout(() => { callback(snapshot); }, 500);
    return () => {};
}
