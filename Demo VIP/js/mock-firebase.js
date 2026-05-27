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
            limite_pases: 100,
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
    // Generar invitados de prueba para el plan VIP (Elite)
    const invitadosMock = [];
    
    // Un invitado confirmado
    invitadosMock.push({
        id: 'COD-VIP-CONFIRMADO',
        data: () => ({
            is_master: false,
            estado: 'confirmado',
            nombre_familia: 'Familia Ramírez',
            asistiran: 3,
            adultos: 2,
            ninos: 1,
            pases_asignados: 3,
            quien_confirma: 'Carlos Ramírez',
            codigo_origen: 'COD-VIP-CONFIRMADO',
            fecha_confirmacion: { toMillis: () => Date.now() - 100000 },
            fecha_creacion: { toMillis: () => Date.now() - 200000 },
            mesa: 'Mesa 1',
            detalles_asistentes: [
                { nombre: 'Carlos Ramírez', menu: 'Tradicional', mesa: 'Mesa 1', alergias: 'Ninguna' },
                { nombre: 'Laura Gómez', menu: 'Vegetariano', mesa: 'Mesa 1', alergias: 'Nueces' },
                { nombre: 'Carlitos Jr.', menu: 'Infantil', mesa: 'Mesa 1', alergias: 'Lactosa' }
            ]
        })
    });

    // Un invitado pendiente
    invitadosMock.push({
        id: 'COD-VIP-PENDIENTE',
        data: () => ({
            is_master: false,
            estado: 'pendiente',
            nombre_familia: 'Familia Sánchez',
            asistiran: 0,
            pases_asignados: 2,
            codigo_origen: 'COD-VIP-PENDIENTE',
            fecha_creacion: { toMillis: () => Date.now() - 150000 },
            telefono: '5559876543'
        })
    });

    const snapshot = {
        size: invitadosMock.length,
        forEach: (cb) => invitadosMock.forEach(cb),
        docChanges: () => []
    };

    setTimeout(() => {
        callback(snapshot);
    }, 500);

    return () => {};
}
