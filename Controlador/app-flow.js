// ESTE DE AQUI CONTROLA LO QUE ES LA VISIBILIDAD DE LAS CONTRASEÑAS
// MAS QUE NADA ES ALGO VISUAL PARA EL USUARIO Y COMODIDAD

// Archivo: Controlador/controller.js

// 🔑 CLAVE: Usar 'export' y recibir 'event' como parámetro
export function togglePassword(event) { 
    // Ahora 'event' es el parámetro recibido, no la variable global.
    const toggleIcon = event.currentTarget;
    
    // 2. Encontrar el input de contraseña asociado
    const passwordInput = toggleIcon.previousElementSibling;

    // 3. Comprobar y alternar el tipo de campo y el ícono
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.textContent = 'visibility'; // Ojo abierto
    } else {
        passwordInput.type = 'password';
        toggleIcon.textContent = 'visibility_off'; // Ojo tachado
    }
}

// ⚠️ NOTA: Debes agregar una función loginController vacía temporalmente para que el HTML 
// pueda importarla sin errores de sintaxis, incluso si aún no tiene la lógica de Firebase.
export function loginController(e) {
    e.preventDefault(); 
    console.log("Login Controlador llamado. La lógica de Firebase va aquí.");
}


export function registerController(e) {
    e.preventDefault(); 
    console.log("Controlador de Registro llamado. La lógica de Firebase va aquí.");

    // Aquí iría la lógica de registro de Firebase y validación de contraseñas.
    
    // Ejemplo de validación simple:
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    if (password !== confirmPassword) {
        alert("Las contraseñas no coinciden.");
        return;
    }
    // ... lógica de Firebase para crear usuario ...
}