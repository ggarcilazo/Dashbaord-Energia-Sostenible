// Controlador/controller.js

// 🔑 Importar la instancia 'auth' (El Modelo)
import { auth } from '../Modelo/firebase-init.js';
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

      await saveUserRole(uid, {
        email,
        role,
        createdAt: new Date().toISOString(),
      });

      showNotification(
        'Cuenta creada exitosamente. Por favor, inicia sesión.',
        'success'
      );

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    })
    .catch((error) => {
      console.error(error);
      showNotification(`Error de Registro: ${error.message}`, 'error');
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
