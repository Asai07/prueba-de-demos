// js/firebase-config.example.js
// ======================================================
// PLANTILLA DE CONFIGURACIÓN DE FIREBASE
// ======================================================
// 1. Copia este archivo a: js/firebase-config.js
// 2. Rellena los valores con los de tu proyecto en Firebase Console
//    (Configuración del proyecto → Tus aplicaciones → Config)
// 3. Asegúrate de que js/firebase-config.js esté en tu .gitignore
//    si tu repositorio es PÚBLICO.
//
// Nota: Si el repositorio es privado, está bien subir firebase-config.js
// directamente, siempre y cuando tengas la API key restringida en
// Google Cloud Console (HTTP referrers autorizados).
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "./mock-firebase.js";

const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.firebasestorage.app",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID",
    measurementId: "TU_MEASUREMENT_ID"  // Opcional
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
