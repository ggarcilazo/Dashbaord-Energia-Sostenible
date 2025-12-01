// Controlador/controller.js

// 🔑 Importar la instancia 'auth' (El Modelo)
import { auth, functions } from '../Modelo/firebase-init.js';
import { saveUserRole, getUserRole } from '../Modelo/firebase-data.js';

// --- FUNCIÓN DE NOTIFICACIÓN PERSONALIZADA ---
export function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container');
  if (!container) return console.error('Contenedor de notificaciones no encontrado.');

  const alertElement = document.createElement('div');
  alertElement.classList.add('custom-alert', `alert-${type}`);
  alertElement.textContent = message;

  container.appendChild(alertElement);

  // 1. Mostrar la alerta con animación
  setTimeout(() => {
    alertElement.classList.add('show');
  }, 10);

  // 2. Ocultar y eliminar la alerta después de 4 segundos
  setTimeout(() => {
    alertElement.classList.remove('show');
    alertElement.addEventListener('transitionend', () => {
      alertElement.remove();
    });
  }, 4000);
}

// ----------------------------------------------------------------------
// --- 1. FUNCIÓN DE LOGIN (CON CARGA DE ROL) ---
// ----------------------------------------------------------------------
export function loginController(e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password-input').value;

  auth
    .signInWithEmailAndPassword(email, password)
    .then(async (cred) => {
      // 🔹 Obtenemos el rol del usuario
      const uid = cred.user.uid;
      const role = await getUserRole(uid);

      // Guardamos el rol en localStorage para usarlo en el dashboard
      localStorage.setItem('ucvEnergyRole', role || 'estudiante');

      showNotification('Acceso concedido. ¡Redirigiendo!', 'success');

      setTimeout(() => {
        window.location.href = '../Dashboard/dashboard.html';
      }, 1000);
    })
    .catch((error) => {
      console.error(error);

      let errorMessage = 'Ocurrió un error desconocido. Inténtalo más tarde.';

      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Correo o contraseña incorrectos.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'El formato del correo electrónico es inválido.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Tu cuenta ha sido deshabilitada.';
          break;
        default:
          errorMessage = 'Error de Acceso. Por favor, verifica tu conexión.';
      }

      showNotification(errorMessage, 'error');
    });
}

// ----------------------------------------------------------------------
// --- 2. FUNCIÓN DE REGISTRO (CON GUARDADO DE ROL) ---
// ----------------------------------------------------------------------
export function registerController(e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  // 🔹 Nuevo: campo de rol (select en create-account.html)
  const roleSelect = document.getElementById('role');
  const role = roleSelect ? roleSelect.value : 'estudiante';

  if (password !== confirmPassword) {
    return showNotification('Error: Las contraseñas no coinciden.', 'error');
  }

  auth
    .createUserWithEmailAndPassword(email, password)
    .then(async (cred) => {
      // 🔹 Guardamos el rol en la colección "users"
      const uid = cred.user.uid;

      // Use a Cloud Function (callable) to save profile server-side via Admin SDK.
      // This avoids Firestore client rules issues when trying to write from the client.
      let functionSaveSucceeded = false;
      try {
        if (functions && typeof functions.httpsCallable === 'function') {
          const createUserProfile = functions.httpsCallable('createUserProfile');
          const payload = { role: role || 'estudiante' };
          // callable functions automatically carry the user's auth context
          await createUserProfile(payload);
          functionSaveSucceeded = true;
        } else {
          // Fallback: attempt to save directly to Firestore client (may fail due to rules)
          await saveUserRole(uid, { email, role, createdAt: new Date().toISOString() });
          functionSaveSucceeded = true;
        }
      } catch (error) {
        console.error('Error guardando rol del usuario en Firestore:', error);
        // Si falla la escritura en Firestore por permisos, intentamos revertir el usuario creado en Auth
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            await currentUser.delete();
            showNotification('Cuenta creada en Auth, pero no se pudo guardar el perfil en la base de datos. La cuenta ha sido eliminada. Contacta al administrador para más detalles.', 'error');
          } catch (deleteError) {
            console.error('No se pudo eliminar la cuenta luego de fallo en Firestore:', deleteError);
            showNotification('Se creó la cuenta pero hubo un problema al guardar el perfil y no se pudo eliminar la cuenta. Pide soporte al administrador.', 'error');
          }
        } else {
          showNotification('Cuenta creada, pero no se pudo guardar el perfil en la base de datos. Contacta al administrador.', 'error');
        }
        return;
      }

      if (functionSaveSucceeded) {
        showNotification('Cuenta creada exitosamente. Por favor, inicia sesión.', 'success');
      } else {
        showNotification('La cuenta fue creada, pero hubo problemas guardando el perfil. Contacta al administrador.', 'info');
      }

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    })
    .catch((error) => {
      console.error('Error durante el registro:', error);

      // Mapear códigos de error comunes para mensajes amistosos
      let userMessage = 'Error de Registro. Intenta nuevamente.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          userMessage = 'El correo ya está en uso. Intenta iniciar sesión o usa la opción "Olvidé mi contraseña".';
          break;
        case 'auth/invalid-email':
          userMessage = 'El formato del correo electrónico es inválido.';
          break;
        case 'auth/weak-password':
          userMessage = 'La contraseña es muy débil. Usa al menos 6 caracteres.';
          break;
        default:
          userMessage = `Error de Registro: ${error.message}`;
      }

      showNotification(userMessage, 'error');
    });
}

// ----------------------------------------------------------------------
// --- 3. FUNCIÓN PARA RESTABLECER CONTRASEÑA ---
// ----------------------------------------------------------------------
export function sendPasswordReset(e) {
  e.preventDefault();

  const email = document.getElementById('email').value;

  auth
    .sendPasswordResetEmail(email)
    .then(() => {
      showNotification(
        '¡Enlace enviado! Revisa tu correo electrónico para restablecer tu contraseña. Serás redirigido.',
        'info'
      );

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    })
    .catch((error) => {
      console.error(error);
      showNotification(
        'Ocurrió un error. Por favor, verifica la dirección de correo.',
        'error'
      );
    });
}

// ----------------------------------------------------------------------
// --- 4. FUNCIÓN VISUAL (togglePassword) ---
// ----------------------------------------------------------------------
export function togglePassword(event) {
  const toggleIcon = event.currentTarget;
  const passwordInput = toggleIcon.previousElementSibling;

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.textContent = 'visibility';
  } else {
    passwordInput.type = 'password';
    toggleIcon.textContent = 'visibility_off';
  }
}
