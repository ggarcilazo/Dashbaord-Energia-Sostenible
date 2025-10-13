// dashboard_functions.js (Manejo de Chart.js y Formato de Widgets - FINAL)

// Variables globales para los gráficos
let rankingChart = null;
let comparisonChart = null;

/**
 * Función de formato de dinero (Soles)
 */
function formatMoney(amount) {
    // Si amount es 0, undefined o null, retorna S/ --
    if (amount === undefined || amount === null || amount === 0) return 'S/ --'; 
    
    // Usamos el formato local para comas en miles y dos decimales
    return 'S/ ' + amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Función de formato de energía (kWh)
 */
function formatEnergy(amount) {
    // Si amount es 0, undefined o null, retorna -- kWh
    if (amount === undefined || amount === null || amount === 0) return '-- kWh';
    
    // El formato no debe tener decimales para kWh
    return amount.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' kWh';
}


// ====================================================================
// 1. Ranking Chart (Barras)
// ====================================================================

window.initRankingChartWithData = function(labels, data) {
    const ctx = document.getElementById('rankingChart').getContext('2d');
    
    // Si ya existe, destruirlo
    if (rankingChart) {
        rankingChart.destroy();
    }
    
    // Lógica para mostrar mensaje si no hay datos
    if (labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.textAlign = 'center';
        return; 
    }

    // Ordenar los datos (ranking, de mayor a menor consumo)
    const sortedData = labels.map((label, index) => ({
        label,
        value: data[index]
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
                    title: {
                        display: true,
                        text: 'Consumo (kWh)'
                    }
                }
            }
        }
    });
};


// ====================================================================
// 2. Comparison Chart (Línea)
// ====================================================================

window.initComparisonChartWithData = function(labels, data) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');

    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    // Lógica para mostrar mensaje si no hay datos
    if (labels.length === 0 || data.every(val => val === 0)) {
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
                    title: {
                        display: true,
                        text: 'Consumo (kWh)'
                    }
                }
            }
        }
    });
};

// ====================================================================
// 3. Widget Consumo Mensual Total (ACTUALIZADO CON PAGO)
// ====================================================================

window.updateMonthlyKwhTotal = function(totalKwh, participatingBuildings, totalPayment) {
    const kwhElement = document.getElementById('monthly-kwh-total');
    const buildingsElement = document.getElementById('monthly-buildings-list');
    // 🚨 ELEMENTO DE PAGO TOTAL
    const paymentElement = document.getElementById('monthly-payment-total'); 

    if (kwhElement) {
        // 1. Actualizar el valor de kWh
        kwhElement.textContent = formatEnergy(totalKwh);
    }
    
    if (buildingsElement) {
        // 2. Actualizar la lista de pabellones
        if (totalKwh === 0 || participatingBuildings.length === 0) {
             buildingsElement.textContent = 'Sin datos de pabellones.';
             buildingsElement.style.color = '#777';
        } else {
            // Unimos los nombres de los pabellones con ', '
            const list = participatingBuildings.join(', '); 
            buildingsElement.textContent = list;
            buildingsElement.style.color = '#333'; 
        }
    }

    // 🚨 LÓGICA DE PAGO: Actualizar el valor del pago total del mes
    if (paymentElement) {
        paymentElement.textContent = formatMoney(totalPayment);
    }
};


// ====================================================================
// 4. Actualización de Widgets de Valor Único
// ====================================================================

// Widget: Meta Anual (Progreso)
window.updateMonthlyGoal = function(current, target) {
    const goalValuesElement = document.getElementById('monthly-goal-values');
    const progressBarElement = document.getElementById('monthly-goal-progress');
    
    // Si no hay datos (target es 0), mostramos '--'
    if (target === 0 || target === null || target === undefined) { 
        goalValuesElement.innerHTML = formatMoney(current) + ' <span class="goal-target">Meta S/ --</span>';
        progressBarElement.style.width = '0%';
        progressBarElement.style.backgroundColor = '#ccc';
        return;
    }

    const percentage = Math.min(100, (current / target) * 100);
    
    goalValuesElement.innerHTML = formatMoney(current) + ' <span class="goal-target">Meta ' + formatMoney(target) + '</span>';
    
    // Rojo si excede la meta (es decir, el gasto supera la meta de ahorro)
    progressBarElement.style.width = percentage + '%';
    progressBarElement.style.backgroundColor = percentage >= 100 ? '#dc3545' : '#28a745'; 
};