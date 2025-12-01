// Modelo/firebase-init.js
// Usa los SDK v8 cargados desde los HTML (no imports de v9)
const firebaseConfig = {
  apiKey: "AIzaSyD6HJSabVKykdrLqpeMdmU8mBJm3XVW5_Y",
  authDomain: "energia-responsable-ucv.firebaseapp.com",
  projectId: "energia-responsable-ucv",
  storageBucket: "energia-responsable-ucv.appspot.com",
  messagingSenderId: "937222393939",
  appId: "1:937222393939:web:47a7010590a751f3ad76a6",
  measurementId: "G-X7SYCSS4QP"
};

// Inicializar Firebase (requiere que el HTML haya cargado los SDK v8)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Exportar auth, db y functions (cliente v8)
export const auth = firebase.auth();
export const db = firebase.firestore();
export const functions = firebase.functions ? firebase.functions() : null;
export const firebaseNamespace = firebase;



