const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Callable function to create user profile in 'users' collection.
exports.createUserProfile = functions.https.onCall(async (data, context) => {
  // Context.auth contains the authenticated user when callable is called from logged in client using firebase SDK
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'La solicitud debe provenir de un usuario autenticado.');
  }

  const uid = context.auth.uid;
  const role = (data && data.role) ? data.role : 'estudiante';
  const allowedRoles = ['estudiante', 'docente']; // 'admin' should only be assigned server-side manually

  if (!allowedRoles.includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Role no válido.');
  }

  const email = context.auth.token.email || data.email || '';

  try {
    const docRef = db.collection('users').doc(uid);
    await docRef.set({
      uid,
      email,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true };
  } catch (err) {
    console.error('Error al crear el perfil del usuario en Cloud Function:', err);
    throw new functions.https.HttpsError('internal', 'Error del servidor: No se pudo crear el perfil.');
  }
});
