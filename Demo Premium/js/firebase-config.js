// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "./mock-firebase.js";
import { getAuth } from "./mock-firebase.js";

export const firebaseConfig = {
    apiKey: "AIzaSyDpYSCtNqKTwPnwiBY86bexzB8pMMzlZKk",
    authDomain: "panel-eventos.firebaseapp.com",
    projectId: "panel-eventos",
    storageBucket: "panel-eventos.firebasestorage.app",
    messagingSenderId: "902684177768",
    appId: "1:902684177768:web:e47b9410f37a3b7b2f92dd",
    measurementId: "G-YC26B2NG1W"
};

// Inicializamos y exportamos la base de datos para que los demás archivos la usen
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const auth = getAuth(app);
