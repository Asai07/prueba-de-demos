// js/mock-firebase.js

// Mock DB and Auth
export const db = {};
export const auth = {};

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
            limite_pases: 50,
            mostrar_mesa: false,
            pedir_edades: true,
            pedir_menu: false,
            pedir_nombres: false,
            pedir_correo: false,
            link_invitacion: 'https://eventoclic.com/demo',
            nombre_cliente: 'Demo User',
            nombre_evento: 'Boda de Prueba Premium',
            fecha_evento: '2026-12-31'
        })
    };
}

export function onSnapshot(queryRef, callback, errorCallback) {
    // Generar invitados de prueba para el plan Premium (Normal)
    const invitadosMock = [];
    
    // Un código máster
    invitadosMock.push({
        id: 'DEMO-MASTER',
        data: () => ({
            is_master: true,
            pases_asignados: 2
        })
    });

    // Un invitado confirmado
    invitadosMock.push({
        id: 'COD-CONFIRMADO',
        data: () => ({
            is_master: false,
            estado: 'confirmado',
            nombre_familia: 'Familia García',
            asistiran: 4,
            adultos: 2,
            ninos: 2,
            pases_asignados: 4,
            quien_confirma: 'Juan García',
            codigo_origen: 'DEMO-MASTER',
            fecha_confirmacion: { toMillis: () => Date.now() - 100000 },
            fecha_creacion: { toMillis: () => Date.now() - 200000 }
        })
    });

    // Un invitado pendiente
    invitadosMock.push({
        id: 'COD-PENDIENTE',
        data: () => ({
            is_master: false,
            estado: 'pendiente',
            nombre_familia: 'Familia López',
            asistiran: 0,
            pases_asignados: 2,
            codigo_origen: 'DEMO-MASTER',
            fecha_creacion: { toMillis: () => Date.now() - 150000 },
            telefono: '5551234567'
        })
    });

    // Un invitado declinado
    invitadosMock.push({
        id: 'COD-DECLINADO',
        data: () => ({
            is_master: false,
            estado: 'declinado',
            nombre_familia: 'Familia Martínez',
            asistiran: 0,
            pases_asignados: 3,
            quien_confirma: 'Ana Martínez',
            codigo_origen: 'DEMO-MASTER',
            fecha_creacion: { toMillis: () => Date.now() - 180000 }
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

    // Return unsubscribe function
    return () => {};
}
