// ------------------ FIREBASE CONFIG ------------------
const firebaseConfig = {
  apiKey: "AIzaSyAeAQ5jxjH-dCkYsJHjNCbfpT8oGO7LqJ8",
  authDomain: "bancoweb-1ed7a.firebaseapp.com",
  projectId: "bancoweb-1ed7a",
  messagingSenderId: "242150606441",
  appId: "1:242150606441:web:5d645ace83710c4ead84f8",
  measurementId: "G-PBVQT05MXN"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Exportar instancias
const auth = firebase.auth();
const db = firebase.firestore();
const rdb = firebase.database();

// Configurar persistencia de autenticación
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => {
    console.log("✅ Persistencia de sesión configurada");
  })
  .catch((error) => {
    console.error("❌ Error en persistencia:", error);
  });

// Exportar todas las instancias
export { auth, db, rdb };