// =====================================================
// 📊 DASHBOARD CONTROLLER - UCV
// Manejo de gráficos, widgets y alertas inteligentes
// =====================================================

// Variables globales para los gráficos
let rankingChart = null;
let comparisonChart = null;

/**
 * 💰 Formato de dinero (Soles)
 */
function formatMoney(amount) {
    if (amount === undefined || amount === null || amount === 0)
        return 'S/ --';
    return 'S/ ' + amount.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * ⚡ Formato de energía (kWh)
 */
function formatEnergy(amount) {
    if (amount === undefined || amount === null || amount === 0)
        return '-- kWh';
    return amount.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' kWh';
}

// =====================================================
// 1️⃣ Ranking Chart (Barras)
// =====================================================
window.initRankingChartWithData = function (labels, data) {
    const el = document.getElementById('rankingChart');
    if (!el) return;
    const ctx = el.getContext('2d');

    if (rankingChart) rankingChart.destroy();

    if (!labels || labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.textAlign = 'center';
        return;
    }

    const sortedData = labels.map((label, index) => ({
        label,
        value: data[index] || 0
    })).sort((a, b) => b.value - a.value);

    const sortedLabels = sortedData.map(item => item.label);
    const sortedValues = sortedData.map(item => item.value);

    rankingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: 'Consumo (kWh)',
                data: sortedValues,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Consumo (kWh)' }
                }
            }
        }
    });
};

// =====================================================
// 2️⃣ Comparison Chart (Línea)
// =====================================================
window.initComparisonChartWithData = function (labels, data) {
    const el = document.getElementById('comparisonChart');
    if (!el) return;
    const ctx = el.getContext('2d');

    if (comparisonChart) comparisonChart.destroy();

    if (!labels || labels.length === 0 || data.every(val => val === 0)) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.textAlign = 'center';
        return;
    }

    comparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Consumo Total Anual (kWh)',
                data: data,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Consumo (kWh)' }
                }
            }
        }
    });
};

// =====================================================
// 3️⃣ Widget Consumo Mensual Total (con Pago)
// =====================================================
window.updateMonthlyKwhTotal = function (totalKwh, participatingBuildings, totalPayment) {
    const kwhElement = document.getElementById('monthly-kwh-total');
    const buildingsElement = document.getElementById('monthly-buildings-list');
    const paymentElement = document.getElementById('monthly-payment-total');

    if (kwhElement)
        kwhElement.textContent = formatEnergy(totalKwh);

    if (buildingsElement) {
        if (!participatingBuildings || totalKwh === 0 || participatingBuildings.length === 0) {
            buildingsElement.textContent = 'Sin datos de pabellones.';
            buildingsElement.style.color = '#777';
        } else {
            buildingsElement.textContent = participatingBuildings.join(', ');
            buildingsElement.style.color = '#333';
        }
    }

    if (paymentElement)
        paymentElement.textContent = formatMoney(totalPayment);
};

// =====================================================
// 4️⃣ Meta Anual (Progreso)
// =====================================================
window.updateMonthlyGoal = function (current, target) {
    const goalValuesElement = document.getElementById('monthly-goal-values');
    const progressBarElement = document.getElementById('monthly-goal-progress');

    if (!goalValuesElement || !progressBarElement) return;

    if (target === 0 || target === null || target === undefined) {
        goalValuesElement.innerHTML = formatMoney(current) + ' <span class="goal-target">Meta S/ --</span>';
        progressBarElement.style.width = '0%';
        progressBarElement.style.backgroundColor = '#ccc';
        return;
    }

    const percentage = Math.min(100, (current / target) * 100);
    goalValuesElement.innerHTML = formatMoney(current) +
        ' <span class="goal-target">Meta ' + formatMoney(target) + '</span>';
    progressBarElement.style.width = percentage + '%';
    progressBarElement.style.backgroundColor = percentage >= 100 ? '#dc3545' : '#28a745';
};

// =====================================================
// 5️⃣ ALERTAS DE CONSUMO INTELIGENTES (USANDO EL MODAL)
// - Clasificación: alta (>=120%), media (>=100%), baja (<100%)
// - Se muestran siempre en el modal al hacer click en la campana
// - La campana cambia de color según el estado (rojo si hay alta, naranja si hay media, negro/normal si solo bajas o ninguna)
// =====================================================
window.checkForEnergyAlerts = function () {
    const promedio = window.promedioHistoricoConsumo || {};
    const ultimo = window.ultimoConsumoMensual || {};

    // Guardaremos alertas en esta estructura
    const alertas = {
        alta: [],
        media: [],
        baja: []
    };

    // Recorremos todos los pabellones que tiene último consumo
    for (const pab in ultimo) {
        const prom = Number(promedio[pab] || 0);
        const ult = Number(ultimo[pab] || 0);

        // Si no hay promedio (0) no podemos clasificar — lo saltamos
        if (prom === 0 && ult === 0) continue;
        if (prom === 0 && ult > 0) {
            // Si no hay promedio pero hay consumo reciente considerarlo como 'media' (o puedes ajustarlo)
            alertas.media.push(`🟡 ${pab}: Consumo reportado (${ult.toLocaleString('es-ES')} kWh) — sin promedio histórico.`);
            continue;
        }

        // Evitar division por 0
        if (prom === 0) continue;

        const ratio = ult / prom;

        if (ratio >= 1.20) {
            alertas.alta.push(`🔴 ${pab}: Consumo ALTO (${ult.toLocaleString('es-ES')} kWh) — Promedio: ${prom.toLocaleString('es-ES')} kWh`);
        } else if (ratio >= 1.0) {
            alertas.media.push(`🟡 ${pab}: Consumo MEDIO (${ult.toLocaleString('es-ES')} kWh) — Promedio: ${prom.toLocaleString('es-ES')} kWh`);
        } else {
            alertas.baja.push(`🟢 ${pab}: Consumo OK (${ult.toLocaleString('es-ES')} kWh) — Promedio: ${prom.toLocaleString('es-ES')} kWh`);
        }
    }

    // Guardamos alertas activas en una variable global (útil para mostrar en otros sitios)
    // Unificamos todas en un array ordenado: altas → medias → bajas
    window.activeAlerts = [].concat(alertas.alta, alertas.media, alertas.baja);

    // Actualizar la campana visualmente
    const bellIcon = document.querySelector(".notification-icon");
    if (bellIcon) {
        // Limpiar clases previas
        bellIcon.classList.remove("active-alert", "medium-alert", "low-alert");

        if (alertas.alta.length > 0) {
            // Si existen alertas altas, campana roja
            bellIcon.classList.add("active-alert");
            bellIcon.setAttribute("title", `${alertas.alta.length} alerta(s) ALTA(S)`);
        } else if (alertas.media.length > 0) {
            // Si existen medias pero no altas, campana naranja
            bellIcon.classList.add("medium-alert");
            bellIcon.setAttribute("title", `${alertas.media.length} alerta(s) MEDIA(S)`);
        } else if (alertas.baja.length > 0) {
            // Si solo hay bajas, la campana indica OK pero mostramos conteo
            bellIcon.classList.add("low-alert");
            bellIcon.setAttribute("title", `${alertas.baja.length} alerta(s) baja(s) - todo dentro de rango`);
        } else {
            // No hay alertas
            bellIcon.removeAttribute("title");
        }
    }

    // También queremos que el modal muestre todas las alertas ordenadas por severidad
    const alertListEl = document.getElementById('alert-list');
    if (alertListEl) {
        if (window.activeAlerts.length === 0) {
            alertListEl.innerHTML = "No hay alertas activas actualmente ✅";
        } else {
            // Construimos HTML con secciones
            let html = '';

            if (alertas.alta.length > 0) {
                html += `<div style="margin-bottom:6px;"><h4 style="margin:4px 0;color:#b02a37">🔴 Alertas Altas</h4>`;
                alertas.alta.forEach(a => { html += `<p style="margin:2px 0">${a}</p>`; });
                html += `</div>`;
            }

            if (alertas.media.length > 0) {
                html += `<div style="margin-bottom:6px;"><h4 style="margin:4px 0;color:#b37400">🟡 Alertas Medias</h4>`;
                alertas.media.forEach(a => { html += `<p style="margin:2px 0">${a}</p>`; });
                html += `</div>`;
            }

            if (alertas.baja.length > 0) {
                html += `<div style="margin-bottom:6px;"><h4 style="margin:4px 0;color:#2e7d32">🟢 Alertas Bajas</h4>`;
                alertas.baja.forEach(a => { html += `<p style="margin:2px 0">${a}</p>`; });
                html += `</div>`;
            }

            alertListEl.innerHTML = html;
        }
    }
};

// =====================================================
// 6️⃣ Gráfico Mensual: Actual vs Promedio Histórico
// =====================================================
window.initMonthlyComparisonChart = function (labels, consumoActual, consumoPromedio) {
    const el = document.getElementById("monthlyTotalChart");
    if (!el) return;
    const ctx = el.getContext("2d");

    if (window.monthlyTotalChart) {
        window.monthlyTotalChart.destroy();
    }

    window.monthlyTotalChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Consumo del Mes (kWh)",
                    data: consumoActual,
                    backgroundColor: "rgba(54, 162, 235, 0.7)"
                },
                {
                    label: "Promedio Histórico (kWh)",
                    data: consumoPromedio,
                    backgroundColor: "rgba(201, 203, 207, 0.7)"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
};

// =====================================================
// 🏆 RANKING DE AHORRO ENERGÉTICO (GAMIFICACIÓN)
// =====================================================
window.updateGamificationRanking = function () {
    const promedio = window.promedioHistoricoConsumo || {};
    const ultimo = window.ultimoConsumoMensual || {};

    const rankingContainer = document.getElementById("gamification-list");
    if (!rankingContainer) return;

    let ranking = [];

    for (const pab in promedio) {
        const prom = promedio[pab];
        const ult = ultimo[pab];

        if (prom === 0) continue;

        const ahorro = ((prom - ult) / prom) * 100;

        ranking.push({
            pabellon: pab,
            promedio: prom,
            actual: ult,
            ahorro: ahorro
        });
    }

    ranking.sort((a, b) => b.ahorro - a.ahorro);

    if (ranking.length === 0) {
        rankingContainer.innerHTML = "<p>No hay datos suficientes.</p>";
        return;
    }

    rankingContainer.innerHTML = ranking.map((item, index) => {
        const medal = index === 0 ? "🥇" :
            index === 1 ? "🥈" :
                index === 2 ? "🥉" : "🔹";

        return `
            <p>${medal} <strong>Pabellón ${item.pabellon}</strong> — Ahorro: ${item.ahorro.toFixed(1)}%</p>
        `;
    }).join("");
};

// ======================================================================
// 🔔 MODALES + SIMULADOR DE AHORRO
// ======================================================================
document.addEventListener("DOMContentLoaded", () => {

    // ==========================
    // 🔔 MODAL: ALERTAS
    // ==========================
    const bellIcon = document.querySelector(".notification-icon");
    const alertModal = document.getElementById("alert-modal");
    const closeBtn = document.getElementById("close-alert-modal");
    const alertList = document.getElementById("alert-list");

    // Aseguramos que la campana refleje el estado actual al iniciar
    if (typeof window.checkForEnergyAlerts === "function") {
        // esperar un tick para que datos (si existen) se hayan calculado
        setTimeout(() => {
            try { window.checkForEnergyAlerts(); } catch (e) { console.error(e); }
        }, 200);
    }

    if (bellIcon) {
        bellIcon.addEventListener("click", () => {
            // Mostrar contenido del modal (ya fue generado por checkForEnergyAlerts)
            if (window.activeAlerts && window.activeAlerts.length > 0) {
                // Si existen alertas activas, alertList ya contiene HTML clasificado
                // (checkForEnergyAlerts se encarga de actualizar alert-list)
            } else {
                // si no existen, asegurar mensaje
                if (alertList) alertList.textContent = "No hay alertas activas actualmente ✅";
            }

            if (alertModal) alertModal.classList.add("active");

            // Al abrir el modal, se considera "leído": restaurar apariencia normal de la campana
            bellIcon.classList.remove("active-alert", "medium-alert", "low-alert");
            bellIcon.removeAttribute("title");

            // NOTA: No destruyo window.activeAlerts aquí para que puedas ver el detalle,
            // pero si quieres que al abrir modal las alertas se consideren leídas y se borren:
            // window.activeAlerts = [];
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            if (alertModal) alertModal.classList.remove("active");
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === alertModal) {
            alertModal.classList.remove("active");
        }
    });

    // ==========================
    // 🟩 SIMULADOR DE AHORRO
    // ==========================
    const btnCalcular = document.getElementById("sim-calcular");
    const selectPab = document.getElementById("sim-pabellon");
    const inputPorc = document.getElementById("sim-porcentaje");
    const divResultados = document.getElementById("sim-resultados");

    if (btnCalcular) {
        btnCalcular.addEventListener("click", () => {
            const pab = selectPab.value;
            const porc = Number(inputPorc.value);

            if (!pab) {
                alert("Seleccione un pabellón.");
                return;
            }

            if (!window.ultimoConsumoMensual || !window.fullConsumoDataCache) {
                alert("No hay datos suficientes para realizar la simulación.");
                return;
            }

            const consumoActual = window.ultimoConsumoMensual[pab] || 0;
            let costoActual = 0;

            const pabData = window.fullConsumoDataCache[pab.toLowerCase()];
            if (pabData) {
                const years = Object.keys(pabData).sort();
                const lastYear = years[years.length - 1];
                const months = Object.keys(pabData[lastYear]).sort();
                const lastMonth = months[months.length - 1];

                costoActual = Number(pabData[lastYear][lastMonth].price) || 0;
            }

            const nuevoConsumo = consumoActual - (consumoActual * porc / 100);
            const nuevoCosto = costoActual - (costoActual * porc / 100);
            const ahorro = costoActual - nuevoCosto;

            divResultados.innerHTML = `
                <p><strong>Consumo actual:</strong> ${consumoActual.toLocaleString("es-ES")} kWh</p>
                <p><strong>Costo actual:</strong> S/ ${costoActual.toFixed(2)}</p>
                <p><strong>Nuevo consumo:</strong> ${nuevoConsumo.toLocaleString("es-ES")} kWh</p>
                <p><strong>Nuevo costo:</strong> S/ ${nuevoCosto.toFixed(2)}</p>
                <p><strong>Ahorro estimado:</strong> 
                   <span style="color:green; font-weight:bold;">S/ ${ahorro.toFixed(2)}</span>
                </p>
            `;
        });
    }
    // ========================== GESTIÓN DE ROLES (RF13) ==========================

    // Aplica permisos de visualización según el rol guardado en localStorage
    function applyRolePermissions() {
        // Rol guardado al hacer login (controller.js)
        const role = localStorage.getItem('ucvEnergyRole') || 'estudiante';
        console.log('[Roles] Rol actual:', role);

        // Mostrar el rol en el sidebar
        const roleLabel = document.getElementById('current-user-role-label');
        if (roleLabel) {
            const names = {
                admin: 'Administrador',
                docente: 'Docente',
                estudiante: 'Estudiante'
            };
            roleLabel.textContent = names[role] || role;
        }

        // Ocultar elementos con data-role-visible si el rol NO está permitido
        document.querySelectorAll('[data-role-visible]').forEach(el => {
            const allowed = (el.getAttribute('data-role-visible') || '')
                .split(',')
                .map(r => r.trim())
                .filter(r => r.length > 0);

            if (allowed.length > 0 && !allowed.includes(role)) {
                el.style.display = 'none';
            }
        });
    }

    // Ejecutar cuando cargue el dashboard
    document.addEventListener('DOMContentLoaded', () => {
        try {
            applyRolePermissions();
        } catch (e) {
            console.error('Error aplicando permisos de rol:', e);
        }
    });


}); // FIN DEL DOMContentLoaded
