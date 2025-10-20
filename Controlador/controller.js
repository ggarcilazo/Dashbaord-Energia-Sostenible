// 🔑 Importar la instancia 'auth' (El Modelo)
import { auth } from '../Modelo/firebase-init.js'; 
import { getRecentRecordsFromFirebase } from '../Modelo/firebase-data.js'; // 👈 CAMBIO AQUÍ
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
    }, 10); // Pequeño retraso para la animación

    // 2. Ocultar y eliminar la alerta después de 4 segundos
    setTimeout(() => {
        alertElement.classList.remove('show');
        // Esperar a que termine la animación de salida antes de eliminar del DOM
        alertElement.addEventListener('transitionend', () => {
            alertElement.remove();
        });
    }, 4000);
}

// ----------------------------------------------------------------------
// --- 1. FUNCIÓN DE LOGIN (ALERTAS REEMPLAZADAS) ---
export function loginController(e) {
    e.preventDefault(); 
    
    // Obtener datos de la Vista (HTML)
    const email = document.getElementById('email').value;
    const password = document.getElementById('password-input').value; 
    
    // Llamada al Modelo (Firebase Auth)
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // Éxito
            showNotification('Acceso concedido. ¡Redirigiendo!', 'success');
            
            setTimeout(() => {
                window.location.href = '../Dashboard/dashboard.html'; 
            }, 1000); 
        })
        .catch((error) => {
            console.error(error);
            
            let errorMessage = "Ocurrió un error desconocido. Inténtalo más tarde.";
            
            // 🔑 Lógica para interceptar y simplificar el error
            // Error codes de Firebase comunes:
            switch (error.code) {
                case 'auth/user-not-found': // Usuario no existe
                case 'auth/wrong-password': // Contraseña incorrecta
                case 'auth/invalid-credential': // Credenciales inválidas (nuevo código)
                    // Para seguridad, siempre mostramos el mismo mensaje
                    errorMessage = "Correo o contraseña incorrectos.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "El formato del correo electrónico es inválido.";
                    break;
                case 'auth/user-disabled':
                    errorMessage = "Tu cuenta ha sido deshabilitada.";
                    break;
                default:
                    // Si es cualquier otro error, mostramos el mensaje por defecto
                    errorMessage = "Error de Acceso. Por favor, verifica tu conexión.";
            }

            // Mostrar la notificación con el mensaje amigable
            showNotification(errorMessage, 'error'); 
        });
}


// ----------------------------------------------------------------------
// --- 2. FUNCIÓN DE REGISTRO (ALERTAS REEMPLAZADAS) ---
export function registerController(e) {
    e.preventDefault(); 
    
    // Obtener datos de la Vista (HTML)
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value; 
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
        // 🔑 REEMPLAZO DE alert()
        return showNotification("Error: Las contraseñas no coinciden.", 'error');
    }

    // Llamada al Modelo (Firebase Auth)
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            // 🔑 REEMPLAZO DE alert()
            showNotification(`Cuenta creada exitosamente. Por favor, inicia sesión.`, 'success');
            
            // Redirigir después de un breve retraso para ver la notificación
            setTimeout(() => {
                window.location.href = 'login.html'; 
            }, 1000);
        })
        .catch((error) => {
            console.error(error);
            // 🔑 REEMPLAZO DE alert()
            showNotification(`Error de Registro: ${error.message}`, 'error'); 
        });
}

// ----------------------------------------------------------------------
// --- 3. FUNCIÓN PARA RESTABLECER CONTRASEÑA (ALERTAS REEMPLAZADAS) ---
export function sendPasswordReset(e) {
    e.preventDefault(); 
    
    // Obtener el correo del input con ID 'email'
    const email = document.getElementById('email').value;
    
    // Llamada al Modelo (Firebase Auth)
    auth.sendPasswordResetEmail(email)
        .then(() => {
            // 🔑 REEMPLAZO DE alert()
            showNotification('¡Enlace enviado! Revisa tu correo electrónico para restablecer tu contraseña. Serás redirigido.', 'info');
            
            // Redirigir al login después de un breve retraso para que el usuario lea el mensaje
            setTimeout(() => {
                window.location.href = 'login.html'; 
            }, 1500); 
            
        })
        .catch((error) => {
            console.error(error);
            // 🔑 REEMPLAZO DE alert()
            showNotification('Ocurrió un error. Por favor, verifica la dirección de correo.', 'error'); 
        });
}

// ----------------------------------------------------------------------
// --- 4. FUNCIÓN VISUAL (togglePassword) ---
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
// ======================================================
// GUIMARBOT IA - CONTROLADOR DEL CHAT
// Integrado con Google Gemini API (100% funcional)
// ======================================================

// 🧩 CONFIGURA AQUÍ TU API KEY DE GEMINI
const AIzaSyAeMFB4vYEB29CXQFVlCsGVmABWgkOInXY = "AIzaSyAeMFB4vYEB29CXQFVlCsGVmABWgkOInXY"; // 🔒 reemplaza por tu clave real

document.addEventListener('DOMContentLoaded', () => {

    // 🧩 CONFIGURA AQUÍ TU API KEY DE GEMINI (puede ir aquí o afuera)
    const API_KEY = "AIzaSyAeMFB4vYEB29CXQFVlCsGVmABWgkOInXY"; 

    // Referencias del DOM (SON LOCALES a este bloque)
    const aiIcon = document.getElementById("ai-icon");
    const aiWindow = document.getElementById("ai-window");
    const aiClose = document.getElementById("ai-close");
    const aiSend = document.getElementById("ai-send");
    const aiInput = document.getElementById("ai-input");
    const aiMessages = document.getElementById("ai-messages");

    // LÓGICA DE EVENTOS (aquí ya funcionan las variables)
    if (aiIcon) {
        aiIcon.addEventListener("click", () => {
            aiWindow.style.display = aiWindow.style.display === "flex" ? "none" : "flex";
            aiWindow.style.flexDirection = "column";
        });

        aiClose.addEventListener("click", () => {
            aiWindow.style.display = "none";
        });

        aiSend.addEventListener("click", sendMessage);
        aiInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") sendMessage();
        });
    }

// ======================================================
// FUNCIÓN PRINCIPAL: ENVIAR MENSAJE A GEMINI (Flujo Corregido)
// ======================================================
async function sendMessage() {
    const text = aiInput.value.trim();
    if (!text) return;

    appendMessage(text, "user");
    aiInput.value = "";
    appendMessage("⏳ Pensando...", "bot");
    
    let finalReply = null; 
    const lowerText = text.toLowerCase();

    // ----------------------------------------------------
    // 1. DETECCIÓN Y MANEJO DE INTENCIÓN LOCAL (FIREBASE)
    // ----------------------------------------------------
    const isLocalRequest = lowerText.includes("registro") || lowerText.includes("consumo más reciente") || lowerText.includes("datos de firebase") || lowerText.includes("últimos datos") || lowerText.includes("consumo mas reciente") || lowerText.includes("consumo total") || lowerText.includes("ayuda") || lowerText.includes("comandos"); // 🔑 ¡CORREGIDO!    
    if (isLocalRequest) {
        
        console.log("✅ Intención de Firebase detectada. Intentando obtener datos.");

        if (lowerText.includes("ayuda") || lowerText.includes("comandos")) {
            removeThinking();
            finalReply = `
                ¡Hola! Soy GuimarBot, tu asistente de gestión energética.
                <br><br>
                **Funcionalidades de Datos de Consumo:**
                <ul>
                    <li>**Consumo reciente (General):** "dame el consumo más reciente" o "ver registros".</li>
                    <li>**Consumo Total (General):** "dime el consumo total".</li>
                    <li>**Consumo Filtrado:** "consumo de la biblioteca" o "total de la administración".</li>
                    <li>**Preguntas a la IA:** Cualquier otra pregunta será respondida por la inteligencia artificial.</li>
                </ul>
                <br>
                ¿En qué puedo ayudarte hoy?
            `;
            appendMessage(finalReply, "bot");
            return; // 🛑 Salimos inmediatamente después de mostrar la ayuda
        }

        // Lógica de Detección de Edificio y Tipo de Consulta
        let edificioFiltro = null;
        let mensajeFiltro = "recientes";
        let isTotalRequest = lowerText.includes("consumo total"); // Bandera para el total

        if (lowerText.includes("biblioteca")) {
            edificioFiltro = "Biblioteca";
            mensajeFiltro = `de la ${edificioFiltro}`;
        } else if (lowerText.includes("administracion") || lowerText.includes("administración")) {
            edificioFiltro = "Edificio de Administración";
            mensajeFiltro = `del ${edificioFiltro}`;
        }
        
        try {
            // 🔑 LISTA DE EDIFICIOS VÁLIDOS (Necesaria para el manejo de errores de UX)  
            const edificiosValidos = ["Biblioteca", "Edificio de Administración"];

            const allRecords = await getRecentRecordsFromFirebase(); 
            
            let records = allRecords;

            if (edificioFiltro) {
                // Filtra los registros si se solicitó un edificio específico
                records = allRecords.filter(r => r.edificio && r.edificio.toLowerCase() === edificioFiltro.toLowerCase());
            }
            
            removeThinking(); 
            
            // --------------------------------------------------------------------
            // 🔑 NUEVO BLOQUE DE MANEJO DE RESPUESTAS (UX: 3 Casos)
            // --------------------------------------------------------------------

            // Caso 1: Error de filtrado (El usuario pidió un edificio que no existe, y SÍ tenemos datos en general)
            // Comprobamos: si hay filtro, si los registros están vacíos, y si la palabra clave no es uno de los edificios válidos
            if (edificioFiltro && records.length === 0 && allRecords.length > 0 && !edificiosValidos.map(e => e.toLowerCase()).includes(edificioFiltro.toLowerCase())) {
                
                finalReply = `⚠️ No se encontraron registros para el edificio "${edificioFiltro}". Por favor, verifica el nombre. Los edificios válidos son: **${edificiosValidos.join(', ')}**.`;
            
            } else if (records && records.length > 0) {
                
                // Caso 2: ÉXITO - CÁLCULO Y FORMATO
                const totalConsumo = records.reduce((sum, r) => sum + (r.consumo || 0), 0).toFixed(2);
                
                if (isTotalRequest) {
                    finalReply = `El **consumo total** de los registros ${mensajeFiltro} es de **${totalConsumo} kWh**.`;
                } else {
                    finalReply = `He encontrado los siguientes registros de consumo ${mensajeFiltro}: (Total: ${totalConsumo} kWh) <br>`;
                    finalReply += "<ul>";
                    records.slice(0, 5).forEach(r => { 
                        finalReply += `<li>**${r.edificio}**: **${r.consumo} kWh** (Fecha: ${r.fecha})</li>`;
                    });
                    finalReply += "</ul>";
                }
            } else {
                // Caso 3: ÉXITO (pero sin datos en general o no se encontraron registros bajo el filtro)
                finalReply = `No se encontraron registros de consumo ${mensajeFiltro} en la base de datos.`;
            }
            
            // --------------------------------------------------------------------
            
            appendMessage(finalReply, "bot");
            return; // SALIDA ANTICIPADA
        } catch (e) {
            // FALLO CRÍTICO DE FIREBASE (Este bloque sigue igual y es correcto)
            console.error("⛔ ERROR GRAVE al acceder a Firebase. Revisa Reglas o Índices:", e);
            removeThinking();
            finalReply = "⚠️ **Fallo en la Base de Datos:** Hubo un error al intentar obtener los datos. Revisa la consola (F12) para ver la razón exacta del error de Firebase (permisos/índice).";
            
            appendMessage(finalReply, "bot");
            return; // SALIDA ANTICIPADA
        }
    }

    // ----------------------------------------------------
    // 2. LLAMADA A GEMINI (Solo si NO se entró al IF de Firebase)
    // ----------------------------------------------------
    try {
        // 🔑 Creamos el prompt con instrucciones de formato y contexto.
        const promptText = `Eres GuimarBot, un asistente cuya especialidad es la gestión energética. Responde a la pregunta del usuario: "${text}". Sé breve y directo. Si la pregunta no es de energía, responde de igual forma, pero mantén un tono profesional. Utiliza formato Markdown (negritas **) para resaltar la información clave.`;        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    contents: [
                        { 
                            role: "user", 
                            parts: [{ text: promptText }] // 🔑 ENVIAMOS EL NUEVO PROMPT MEJORADO
                        }
                    ] 
                }),
            }
        );

        if (!response.ok) {
            removeThinking();
            appendMessage("⚠️ No se pudo conectar al modelo de IA.", "bot");
            console.error("Error de conexión:", response.status, await response.text());
            return;
        }

        const data = await response.json();
        
        // 🔑 1. OBTENER LA RESPUESTA EN BRUTO
        const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "🤖 No entendí tu mensaje.";
        
        // 🔑 NUEVA LÓGICA: Si la respuesta de la IA NO tiene ya una negrita (es decir, no usó Markdown),
        // la forzamos a que toda la respuesta esté en negrita para asegurar el formato deseado.

        let formattedReply = rawReply;
        if (!rawReply.includes('**') && rawReply.length < 50) {
            // Si la respuesta es corta y no tiene negritas, la rodeamos para que convertMarkdown funcione.
            formattedReply = `**${rawReply}**`;
        }

        // 2. CONVERTIR MARKDOWN A HTML Y ASIGNAR A finalReply
        finalReply = convertMarkdown(formattedReply); 

    } catch (error) {
            console.error("Error en conexión con IA:", error);
            // Aplicar conversión al mensaje de error
            finalReply = convertMarkdown("⚠️ Ocurrió un error al conectar con la IA."); 
    }


    // ----------------------------------------------------
    // 3. MOSTRAR RESPUESTA FINAL (Solo si vino de Gemini)
    // ----------------------------------------------------
    removeThinking();
    appendMessage(finalReply, "bot");
}

// ======================================================
// FUNCIONES AUXILIARES
// ======================================================
  function appendMessage(text, sender) {
    const msg = document.createElement("div");
    msg.className = sender === "user" ? "ai-user-msg" : "ai-bot-msg";
    msg.innerHTML = text;
    aiMessages.appendChild(msg);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  }

  function removeThinking() {
    const lastMsg = aiMessages.lastElementChild;
    if (lastMsg && lastMsg.textContent.includes("Pensando")) {
      aiMessages.removeChild(lastMsg);
    }
  }

  function convertMarkdown(text) {
    if (!text) return '';
    
    // 🔑 1. AJUSTE CRÍTICO: Reemplazar negritas Markdown (**) por negritas HTML (<strong>)
    // El patrón /\*\*(.*?)\*\*/gs utiliza la bandera 's' (dotall) para que el punto (.) 
    // capture saltos de línea también, y la 'g' (global) para todas las coincidencias.
    // También agregamos la conversión de saltos de línea para mejor formato en respuestas largas.
    
    let htmlText = text.replace(/\n/g, '<br>'); // Convertir saltos de línea primero
    
    // Usamos 's' para que '.' coincida también con \n (dotall)
    htmlText = htmlText.replace(/\*\*(.*?)\*\*/gs, '<strong>$1</strong>');
    
    // 2. Reemplazar cursiva Markdown (*) por cursiva HTML (<em>)
    htmlText = htmlText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return htmlText;
}

});