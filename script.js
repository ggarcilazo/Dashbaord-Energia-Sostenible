// script.js (Módulo Principal - Versión FINAL y COMPLETA con Edición/Eliminación)

// ==================================================================== 
// PASO 1: IMPORTAR Y CONFIGURAR FIREBASE Y GEMINI
// ==================================================================== 

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js"; 
import { 
    getAI, 
    getGenerativeModel, 
    GoogleAIBackend 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-ai.js"; 
import { 
    getDatabase, 
    ref, 
    onValue,
    set, 
    get 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js"; 


// Tu configuración de Firebase 
const firebaseConfig = { 
    apiKey: "AIzaSyCaYVPikBFl-ckUOfMxYNQuLSj9i8KS-oA", 
    authDomain: "energiaresponsable-ucv.firebaseapp.com", 
    databaseURL: "https://energiaresponsable-ucv-default-rtdb.firebaseio.com", 
    projectId: "energiaresponsable-ucv", 
    storageBucket: "energiaresponsable-ucv.firebasestorage.app", 
    messagingSenderId: "869717335179", 
    appId: "1:869717335179:web:c090a22f1251d3982ac88e" 
}; 

const firebaseApp = initializeApp(firebaseConfig); 
const db = getDatabase(firebaseApp); 

// Variables globales (Caché de datos y constantes de negocio)
let currentDashboardData = {};
const COSTO_KWH_SOL = 0.60; 
// 🚨 CACHÉ GLOBAL DE DATOS DE CONSUMO (CRÍTICA PARA RANKING Y EDICIÓN)
window.fullConsumoDataCache = null; 

// CONFIGURACIÓN DE GEMINI CON BÚSQUEDA WEB
const aiService = getAI(firebaseApp, { backend: new GoogleAIBackend() }); 

// Definir las herramientas: Habilitar Google Search
const tools = [
    { googleSearch: {} } 
];

const geminiModel = getGenerativeModel(aiService, { 
    model: "gemini-2.5-flash",
    config: {
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
        tools: tools // Herramientas añadidas (Google Search)
    }
}); 
const chat = geminiModel.startChat(); 


// ====================================================================
// FUNCIONES AUXILIARES
// ====================================================================

/**
 * Formatea un número como moneda peruana (S/).
 * @param {number} value - El valor numérico a formatear.
 * @returns {string} - El valor formateado.
 */
function formatMoney(value) {
    const num = parseFloat(value) || 0;
    return `S/ ${num.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
}

/**
 * Función auxiliar para obtener datos de Firebase de forma asíncrona.
 * @param {string} path - Ruta de Firebase.
 * @returns {Promise<object>} - Los datos del snapshot.
 */
async function getFirebaseData(path) {
    const dataRef = ref(db, path);
    const snapshot = await get(dataRef);
    return snapshot.val() || {};
}

/**
 * Formatea el texto de respuesta de la IA (Markdown simple) a HTML.
 */
function processMarkdownToHtml(text) {
    // Negritas: **texto** -> <strong>texto</strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Cursivas: *texto* -> <em>texto</em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Listas
    text = text.replace(/^- (.*)/gm, '<li>$1</li>');
    if (text.includes('<li>')) {
        text = '<ul>' + text + '</ul>';
    }
    // Saltos de línea
    text = text.replace(/\n/g, '<br>');
    return text;
}

// ====================================================================
// LÓGICA DE GENERACIÓN DE REPORTES PDF (JSPDF + HTML2CANVAS)
// ====================================================================

/**
 * Genera el reporte PDF tomando el HTML del reporte, convirtiéndolo a imagen
 * y luego creando el PDF para forzar la descarga directa.
 */
async function generatePdfReport() { 
    
    // 1. OBTENER DATOS MÁS RECIENTES DE FORMA SÍNCRONA
    try {
        const fullConsumoData = await getFirebaseData('consumo_mensual');
        const currentYear = new Date().getFullYear().toString();
        const goalData = await getFirebaseData(`metas/anual/${currentYear}`);
        const currentGoal = goalData.payment_goal || 100000;

        // Recalcular consumo anual y pago anual
        let totalAnnualPayment = 0;
        const annualTotals = {};
        for (const buildingCode in fullConsumoData) {
            const buildingData = fullConsumoData[buildingCode];
            for (const year in buildingData) {
                const yearMonths = buildingData[year];
                for (const month in yearMonths) {
                    const consumption = yearMonths[month].consumption || 0;
                    const price = yearMonths[month].price || 0;
                    annualTotals[year] = (annualTotals[year] || 0) + consumption;
                    if (year === currentYear) {
                         totalAnnualPayment += price;
                    }
                }
            }
        }

        const filterSelect = document.getElementById('ranking-filter');
        const selectedDate = filterSelect ? filterSelect.value : null;

        let currentMonthData = {
            periodo_seleccionado: 'N/A',
            consumo_total_kwh: 0,
            pago_total_soles: 0,
            ranking_pabellones: {}
        };
        
        if (selectedDate) {
            const [selectedYear, selectedMonth] = selectedDate.split('-');
            let totalKwhForSelectedMonth = 0;
            let totalPaymentForSelectedMonth = 0;
            const dataForAI = {};
            
            for (const buildingCode in fullConsumoData) {
                const monthlyData = fullConsumoData[buildingCode]?.[selectedYear]?.[selectedMonth];
                if (monthlyData && monthlyData.consumption) {
                    totalKwhForSelectedMonth += monthlyData.consumption;
                    totalPaymentForSelectedMonth += monthlyData.price || 0;
                    
                    let displayName;
                    switch(buildingCode) {
                        case 'a': displayName = 'Pabellón A'; break;
                        case 'b': displayName = 'Pabellón B'; break;
                        case 'c': displayName = 'Pabellón C'; break;
                        case 'd': displayName = 'Pabellón D'; break;
                        case 'e': displayName = 'Pabellón E'; break;
                        default: displayName = `Pabellón ${buildingCode.toUpperCase()}`;
                    }
                    dataForAI[displayName] = monthlyData.consumption;
                }
            }
            
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                                 "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const monthIndex = parseInt(selectedMonth, 10) - 1;

            currentMonthData = {
                periodo_seleccionado: `${monthNames[monthIndex]} ${selectedYear}`,
                consumo_total_kwh: totalKwhForSelectedMonth,
                pago_total_soles: totalPaymentForSelectedMonth,
                ranking_pabellones: dataForAI
            };
        }
        
        const dataForReport = {
            pago_anual_actual: { valor: totalAnnualPayment },
            meta_anual: { valor: currentGoal },
            mes_actual_dashboard: currentMonthData,
            consumo_anual_historico_total: { datos: annualTotals }
        };

        if (Object.keys(dataForReport.consumo_anual_historico_total.datos).length === 0) {
            alert("No hay datos de consumo disponibles para generar el reporte.");
            return;
        }

        const data = dataForReport;
        const date = new Date();
        const formattedDate = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

        const historicalData = data.consumo_anual_historico_total || { datos: {} };
        const ranking = data.mes_actual_dashboard.ranking_pabellones || {};
        
        
        // --- GENERAR SECCIONES DINÁMICAS ---
        
        // Ranking de Pabellones
        let rankingList = '';
        const sortedRanking = Object.entries(ranking).sort(([, a], [, b]) => b - a);
        if (sortedRanking.length > 0) {
            rankingList = sortedRanking.map(([pabellon, consumo]) => 
                `<li style="margin-bottom: 5px; font-size: 14px;"><strong>${pabellon}</strong>: ${consumo.toLocaleString('es-ES')} kWh</li>`
            ).join('');
            rankingList = `<ol style="margin-top: 10px; padding-left: 25px; line-height: 1.4;">${rankingList}</ol>`;
        } else {
            rankingList = '<p style="font-size: 14px;">No hay datos de ranking disponibles para el mes seleccionado.</p>';
        }

        // Datos Históricos Anuales
        let historicalTable = '';
        const sortedYears = Object.keys(historicalData.datos).sort().reverse();
        if (sortedYears.length > 0) {
            historicalTable = sortedYears.map(year => 
                `<tr><td style="border: 1px solid #ddd; padding: 8px;">${year}</td><td style="border: 1px solid #ddd; padding: 8px;">${historicalData.datos[year].toLocaleString('es-ES')} kWh</td></tr>`
            ).join('');
            historicalTable = `
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 30%;">Año</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Consumo Total (kWh)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historicalTable}
                    </tbody>
                </table>
            `;
        } else {
            historicalTable = '<p style="font-size: 14px;">No hay datos de consumo histórico anual disponibles.</p>';
        }

        // 3. Crear la estructura HTML del reporte
        const reportContentHtml = `
            <div style="padding: 30px; font-family: Arial, sans-serif; background-color: #fff; color: #333;">
                
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #004d99; padding-bottom: 10px;">
                    <h1 style="color: #004d99; font-size: 26px; margin: 0;">Reporte Energético - UCV Lima Norte</h1>
                    <p style="font-size: 12px; color: #666;">Generado el: <strong>${formattedDate}</strong></p>
                </div>

                <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 25px; border-radius: 5px;">
                    <h2 style="border-bottom: 2px solid #004d99; padding-bottom: 5px; margin-top: 0; font-size: 18px;">📊 Resumen Financiero y de Metas</h2>
                    <p style="font-size: 14px;"><strong>Periodo Seleccionado (Dashboard):</strong> ${currentMonthData.periodo_seleccionado || 'N/A'}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
                    <p style="font-size: 14px;"><strong>Pago Acumulado Anual (${currentYear}):</strong> ${formatMoney(data.pago_anual_actual?.valor)}</p>
                    <p style="font-size: 14px;"><strong>Meta Anual Establecida (${currentYear}):</strong> ${formatMoney(data.meta_anual?.valor)}</p>
                    <p style="font-size: 14px;"><strong>Consumo Total del Mes (Seleccionado):</strong> ${data.mes_actual_dashboard.consumo_total_kwh.toLocaleString('es-ES')} kWh</p>
                    <p style="font-size: 14px;"><strong>Pago Total del Mes (Seleccionado):</strong> ${formatMoney(data.mes_actual_dashboard.pago_total_soles)}</p>
                </div>

                <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 25px; border-radius: 5px;">
                    <h2 style="border-bottom: 2px solid #004d99; padding-bottom: 5px; margin-top: 0; font-size: 18px;">🏆 Ranking de Consumo por Pabellón (${currentMonthData.periodo_seleccionado || 'N/A'})</h2>
                    ${rankingList}
                </div>

                <div style="border: 1px solid #ccc; padding: 15px; border-radius: 5px;">
                    <h2 style="border-bottom: 2px solid #004d99; padding-bottom: 5px; margin-top: 0; font-size: 18px;">📈 Consumo Histórico Anual</h2>
                    ${historicalTable}
                </div>
                
            </div>
        `;

        // 4. Continuar con la lógica de generación de PDF...
        const tempContainer = document.createElement('div');
        tempContainer.id = 'temp-pdf-content';
        tempContainer.style.position = 'absolute';
        tempContainer.style.top = '-9999px'; 
        tempContainer.style.width = '1000px'; 
        tempContainer.innerHTML = reportContentHtml;
        
        document.body.appendChild(tempContainer);

        html2canvas(tempContainer, { 
            scale: 3, 
            useCORS: true,
            logging: false 
        })
        .then(canvas => {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4'); 
            
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgHeight = canvas.height * pdfWidth / canvas.width;
            let heightLeft = imgHeight;
            let position = 0; 

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= -1) { 
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            const reportFileName = `Reporte_UCV_Energia_${new Date().toISOString().slice(0, 10)}.pdf`;
            pdf.save(reportFileName);
        })
        .catch(error => {
            console.error("Error al generar el PDF con html2canvas/jsPDF:", error);
            alert("❌ Error al generar el PDF. Revisa la consola para detalles.");
        })
        .finally(() => {
            document.body.removeChild(tempContainer);
        });
        
    } catch (error) {
        console.error("Error al obtener datos de Firebase para el reporte:", error);
        alert("❌ Error crítico al cargar datos para el reporte: " + error.message);
    }
}


// ====================================================================
// LÓGICA DE FILTRADO Y RECALCULO DE RANKING
// ==================================================================== 

function populateRankingFilter(fullConsumoData) {
    const filterSelect = document.getElementById('ranking-filter');
    if (!filterSelect) return;
    const datesMap = new Map();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                         "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    for (const buildingCode in fullConsumoData) {
        const buildingData = fullConsumoData[buildingCode];
        for (const year in buildingData) {
            const yearData = buildingData[year];
            for (const month in yearData) { 
                const key = `${year}-${month}`;
                if (!datesMap.has(key)) {
                    const monthIndex = parseInt(month, 10) - 1;
                    const display = `${monthNames[monthIndex]} ${year}`;
                    datesMap.set(key, { key, display });
                }
            }
        }
    }
    const sortedDates = Array.from(datesMap.values()).sort((a, b) => {
        return b.key.localeCompare(a.key); 
    });
    filterSelect.innerHTML = '';
    
    let isFirst = true;
    if (sortedDates.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No hay datos disponibles';
        filterSelect.appendChild(option);
        if(typeof window.initRankingChartWithData === 'function') window.initRankingChartWithData([], []);
    } else {
        sortedDates.forEach(date => {
            const option = document.createElement('option');
            option.value = date.key;
            option.textContent = date.display;
            if (isFirst) {
                option.selected = true;
                isFirst = false;
            }
            filterSelect.appendChild(option);
        });
    }
    setupRankingFilterListener(fullConsumoData);
}

function setupRankingFilterListener(fullConsumoData) {
    const filterSelect = document.getElementById('ranking-filter');
    if (!filterSelect) return;
    window.fullConsumoDataCache = fullConsumoData; 

    filterSelect.addEventListener('change', (e) => {
        const selectedDate = e.target.value;
        updateRankingChartByMonth(selectedDate, window.fullConsumoDataCache);
    });
    
    if (filterSelect.value !== '') {
        const initialDate = filterSelect.value;
        updateRankingChartByMonth(initialDate, window.fullConsumoDataCache);
    }
}

function updateRankingChartByMonth(selectedDate, fullData) {
    
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                         "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    if (!selectedDate || selectedDate === '' || !fullData || Object.keys(fullData).length === 0) {
        if(typeof window.initRankingChartWithData === 'function') window.initRankingChartWithData([], []);
        if (typeof window.updateMonthlyKwhTotal === 'function') window.updateMonthlyKwhTotal(0, [], 0); 
        
        const [selectedYear, selectedMonth] = selectedDate ? selectedDate.split('-') : [new Date().getFullYear().toString(), (new Date().getMonth() + 1).toString().padStart(2, '0')];
        currentDashboardData.mes_actual_dashboard = {
            periodo_seleccionado: `${selectedMonth}/${selectedYear}`,
            consumo_total_kwh: 0,
            pago_total_soles: 0,
            ranking_pabellones: {}
        };
        currentDashboardData.datos_historicos_mensuales = {};
        currentDashboardData.meses_disponibles = { lista: [], contexto: 'No hay datos de consumo disponibles.' };
        return;
    }
    
    const [selectedYear, selectedMonth] = selectedDate.split('-');
    const rankingLabels = []; 
    const rankingValues = [];
    const dataForAI = {};
    
    let totalKwhForSelectedMonth = 0;
    let totalPaymentForSelectedMonth = 0;
    
    for (const buildingCode in fullData) {
        const monthlyData = fullData[buildingCode]?.[selectedYear]?.[selectedMonth]; 
        
        if (monthlyData && monthlyData.consumption) {
            const consumption = monthlyData.consumption; 
            const price = monthlyData.price || 0; 
            
            totalKwhForSelectedMonth += consumption;
            totalPaymentForSelectedMonth += price; 

            let displayName;
            switch(buildingCode) {
                case 'a': displayName = 'Pabellón A'; break;
                case 'b': displayName = 'Pabellón B'; break;
                case 'c': displayName = 'Pabellón C'; break;
                case 'd': displayName = 'Pabellón D'; break;
                case 'e': displayName = 'Pabellón E'; break;
                default: displayName = `Pabellón ${buildingCode.toUpperCase()}`;
            }

            rankingLabels.push(displayName); 
            rankingValues.push(consumption);
            dataForAI[displayName] = consumption;
        }
    }

    if (rankingLabels.length > 0 && typeof window.initRankingChartWithData === 'function') {
        window.initRankingChartWithData(rankingLabels, rankingValues);
    } else {
        if(typeof window.initRankingChartWithData === 'function') window.initRankingChartWithData([], []);
    }
    
    // ✅ Actualizar Widgets
    if (typeof window.updateMonthlyKwhTotal === 'function') {
        window.updateMonthlyKwhTotal(totalKwhForSelectedMonth, rankingLabels, totalPaymentForSelectedMonth);
    }
    
    // 🚨 ESTRUCTURA IA: Guardamos los datos completos de todos los meses y pabellones.
    currentDashboardData.datos_historicos_mensuales = fullData;

    // Información del mes actualmente seleccionado en el DASHBOARD
    currentDashboardData.mes_actual_dashboard = {
        periodo_seleccionado: `${monthNames[parseInt(selectedMonth, 10) - 1]} ${selectedYear}`,
        consumo_total_kwh: totalKwhForSelectedMonth,
        pago_total_soles: totalPaymentForSelectedMonth,
        ranking_pabellones: dataForAI
    };


    // 🚨 Mantenemos y generamos la lista de meses disponibles para la IA
    const availableMonths = [];
    for (const buildingCode in fullData) {
        const buildingData = fullData[buildingCode];
        for (const year in buildingData) {
            for (const month in buildingData[year]) {
                const monthIndex = parseInt(month, 10) - 1;
                const monthYear = `${monthNames[monthIndex]} ${year}`;
                if (!availableMonths.includes(monthYear)) {
                    availableMonths.push(monthYear);
                }
            }
        }
    }
    availableMonths.sort().reverse(); 

    currentDashboardData.meses_disponibles = {
        lista: availableMonths,
        contexto: `Tienes datos de pabellones por mes y año dentro de 'datos_historicos_mensuales'. Puedes responder consultas específicas de los meses listados aquí: ${availableMonths.join(', ')}.`
    };
}


// ==================================================================== 
// LÓGICA DE LECTURA DE DATOS DE ENERGÍA Y METAS
// ==================================================================== 

function fetchDataForRankingChart() {
    const consumoRef = ref(db, 'consumo_mensual');
    onValue(consumoRef, (snapshot) => {
        populateRankingFilter(snapshot.val() || {});
    }, (error) => { 
        console.error("Error al leer /consumo_mensual para ranking:", error);
        populateRankingFilter({}); 
    });
}

function fetchDataForComparisonChart() {
    const consumoRef = ref(db, 'consumo_mensual');
    onValue(consumoRef, (snapshot) => {
        const fullConsumoData = snapshot.val() || {};
        const annualTotals = {};
        for (const buildingCode in fullConsumoData) {
            const buildingData = fullConsumoData[buildingCode];
            for (const year in buildingData) {
                const yearMonths = buildingData[year];
                for (const month in yearMonths) {
                    const consumption = yearMonths[month].consumption || 0; 
                    annualTotals[year] = (annualTotals[year] || 0) + consumption;
                }
            }
        }
        
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 4; 
        const yearLabels = [];
        for (let i = 0; i < 5; i++) { yearLabels.push((startYear + i).toString()); }
        const chartData = yearLabels.map(year => annualTotals[year] || 0);

        if (chartData.some(val => val > 0) && typeof window.initComparisonChartWithData === 'function') {
            window.initComparisonChartWithData(yearLabels, chartData);
        } else {
             if(typeof window.initComparisonChartWithData === 'function') window.initComparisonChartWithData([], []);
        }
        
        currentDashboardData.consumo_anual_historico_total = {
            datos: annualTotals, 
            unidad: 'kWh',
            contexto: 'Consumo de energía total por año (kWh) en los últimos 5 años.'
        };

    }, (error) => { console.error("Error al leer /consumo_mensual para histórico:", error); });
}

function fetchDataForAnnualPayment() {
    const currentYear = new Date().getFullYear().toString();
    const consumoRef = ref(db, 'consumo_mensual');
    
    onValue(consumoRef, (snapshot) => {
        const fullConsumoData = snapshot.val() || {};
        let totalAnnualPayment = 0; 

        for (const buildingCode in fullConsumoData) {
            const annualData = fullConsumoData[buildingCode][currentYear];
            if (annualData) {
                for (const month in annualData) {
                    totalAnnualPayment += annualData[month].price || 0; 
                }
            }
        }
        
        const annualPaymentEl = document.getElementById('annual-payment-value');
        if (annualPaymentEl) {
            annualPaymentEl.textContent = formatMoney(totalAnnualPayment); 
        }

        currentDashboardData.pago_anual_actual = {
            valor: totalAnnualPayment,
            unidad: 'Soles (S/)',
            contexto: `Pago acumulado total para el año actual (${currentYear}).`
        };
        currentDashboardData.costo_kwh = COSTO_KWH_SOL;
        
        updateGoalProgress(totalAnnualPayment);

    }, (error) => { console.error("Error al leer datos para Pago Anual:", error); });
}


function fetchCurrentGoal(updateModal = false) {
    const currentYear = new Date().getFullYear().toString();
    const goalRef = ref(db, `metas/anual/${currentYear}`); 

    onValue(goalRef, (snapshot) => {
        const goalData = snapshot.val();
        const defaultGoal = 100000;
        let currentGoal = goalData ? goalData.payment_goal : defaultGoal;
        
        currentDashboardData.meta_anual = {
            valor: currentGoal,
            unidad: 'Soles (S/)',
            contexto: `Meta de pago anual para el año actual (${currentYear}). El objetivo es mantenerse por debajo de este valor.`
        };

        const goalValuesEl = document.getElementById('monthly-goal-values');
        const pagoActual = currentDashboardData.pago_anual_actual && currentDashboardData.pago_anual_actual.valor !== undefined
            ? currentDashboardData.pago_anual_actual.valor
            : 0;

        if (goalValuesEl) {
            if (typeof window.updateMonthlyGoal === 'function') {
                window.updateMonthlyGoal(pagoActual, currentGoal);
            } else {
                const targetEl = goalValuesEl.querySelector('.goal-target');
                const currentPaymentText = formatMoney(pagoActual);
                const targetGoalText = `Meta ${formatMoney(currentGoal)}`;
                
                goalValuesEl.firstChild.textContent = currentPaymentText + ' ';
                if(targetEl) targetEl.textContent = targetGoalText;
            }
            updateGoalProgress(pagoActual);
        }
        
        if (updateModal) {
            const goalInput = document.getElementById('current-goal-input');
            const paymentDisplay = document.getElementById('current-payment-display');

            if (goalInput) {
                goalInput.value = currentGoal.toFixed(2);
            }
            if (paymentDisplay) {
                paymentDisplay.value = formatMoney(pagoActual);
            }
        }
    }, (error) => { console.error("Error al leer /metas/anual:", error); });
}

function updateGoalProgress(currentPayment) {
    if (typeof window.updateMonthlyGoal === 'function') {
        const goal = currentDashboardData.meta_anual && currentDashboardData.meta_anual.valor || 100000;
        window.updateMonthlyGoal(currentPayment, goal);
        return;
    }
    
    // Lógica de fallback si updateMonthlyGoal no está cargada
    const goal = currentDashboardData.meta_anual && currentDashboardData.meta_anual.valor || 100000;
    const progressFill = document.getElementById('monthly-goal-progress');
    
    if (progressFill) {
        let percentage = (currentPayment / goal) * 100;

        if (percentage > 100) {
            percentage = 100;
            progressFill.style.backgroundColor = '#dc3545'; // Rojo si excede la meta (gasto)
        } else {
            progressFill.style.backgroundColor = '#28a745'; // Verde si está bajo o alcanza
        }
        
        progressFill.style.width = `${percentage}%`;
    }
}

function handleGoalConfigSubmit(e) {
    e.preventDefault();

    const goalValue = parseFloat(document.getElementById('current-goal-input').value);
    const currentYear = new Date().getFullYear().toString();
    const goalModal = document.getElementById('goal-config-modal');

    if (isNaN(goalValue) || goalValue <= 0) {
        alert("❌ Por favor, ingresa un valor de meta válido y positivo.");
        return;
    }

    const goalData = {
        payment_goal: goalValue,
        last_updated: new Date().toISOString()
    };

    const goalRef = ref(db, `metas/anual/${currentYear}`);
    
    set(goalRef, goalData)
        .then(() => {
            alert(`✅ Meta de S/ ${goalValue.toFixed(2)} guardada con éxito para el año ${currentYear}.`);
            if (goalModal) goalModal.classList.remove('active');
        })
        .catch((error) => {
            console.error("Error al guardar la meta: ", error);
            alert("❌ Error al guardar la meta: " + error.message);
        });
}

/**
 * Escuchador principal que inicializa todos los fetch de datos de Firebase.
 * Esta función es crítica para asegurar que `currentDashboardData` esté lleno.
 */
function setupDashboardDataListener() {
    // Escucha de datos de Consumo (para Ranking y Histórico)
    fetchDataForRankingChart();
    fetchDataForComparisonChart(); 

    // Escucha de datos de Pago Anual (que también desencadena la actualización de la Meta)
    fetchDataForAnnualPayment(); 
    
    // Escucha de la Meta Anual
    fetchCurrentGoal();
}

// ====================================================================
// LÓGICA DE EDICIÓN Y BORRADO DE DATOS (MES -> PABELLÓN)
// ====================================================================

function setupEditDataListener() {
    const fullData = window.fullConsumoDataCache;
    if (!fullData) {
        alert("Aún no se han cargado los datos de consumo. Intenta de nuevo en unos segundos.");
        return;
    }

    const monthSelect = document.getElementById('edit-month-select');
    const buildingSelect = document.getElementById('edit-building-select');
    const consumptionInput = document.getElementById('edit-consumption-input');
    const priceInput = document.getElementById('edit-price-input');
    // 🚨 FIX 1: Cambiar 'edit-data-form' a 'edit-form' (ID en el HTML)
    const editForm = document.getElementById('edit-form');
    const deleteBtn = document.getElementById('delete-data-btn');
    
    // Nuevos elementos UX del modal de edición
    const fieldsContainer = document.getElementById('edit-fields-container');
    const currentKwhDisplay = document.getElementById('current-kwh');
    const currentPriceDisplay = document.getElementById('current-price');
    const editMessage = document.getElementById('edit-message'); // Mensajes de estado

    // 1. POBLEMOS EL COMBOBOX DE MESES
    
    const datesMap = new Map();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    for (const buildingCode in fullData) {
        const buildingData = fullData[buildingCode];
        for (const year in buildingData) {
            for (const month in buildingData[year]) { 
                const key = `${year}-${month}`;
                if (!datesMap.has(key)) {
                    const monthIndex = parseInt(month, 10) - 1;
                    const display = `${monthNames[monthIndex]} ${year}`;
                    datesMap.set(key, { key, display });
                }
            }
        }
    }

    const sortedDates = Array.from(datesMap.values()).sort((a, b) => b.key.localeCompare(a.key));
    
    monthSelect.innerHTML = '<option value="">-- Selecciona Mes --</option>';
    buildingSelect.innerHTML = '<option value="">-- Selecciona Pabellón --</option>';
    consumptionInput.value = '';
    priceInput.value = '';
    
    // UX: Estado inicial del contenedor y mensajes
    if (fieldsContainer) fieldsContainer.style.display = 'none';
    if (editMessage) editMessage.textContent = '';
    if (currentKwhDisplay) currentKwhDisplay.textContent = '--';
    if (currentPriceDisplay) currentPriceDisplay.textContent = '--';
    
    sortedDates.forEach(date => {
        const option = document.createElement('option');
        option.value = date.key;
        option.textContent = date.display;
        monthSelect.appendChild(option);
    });
    
    // Deshabilitar campos de pabellón e inputs hasta que se seleccione el mes
    buildingSelect.disabled = true;
    consumptionInput.disabled = true;
    priceInput.disabled = true;
    editForm.querySelector('button[type="submit"]').disabled = true;
    deleteBtn.disabled = true;

    // 2. LISTENER PARA CAMBIO DE MES
    monthSelect.onchange = () => {
        const selectedDate = monthSelect.value;
        buildingSelect.innerHTML = '<option value="">-- Selecciona Pabellón --</option>';
        
        // UX: Limpiar y Ocultar
        if (fieldsContainer) fieldsContainer.style.display = 'none';
        if (editMessage) editMessage.textContent = '';
        if (currentKwhDisplay) currentKwhDisplay.textContent = '--';
        if (currentPriceDisplay) currentPriceDisplay.textContent = '--';

        buildingSelect.disabled = true;
        consumptionInput.disabled = true;
        priceInput.disabled = true;
        editForm.querySelector('button[type="submit"]').disabled = true;
        deleteBtn.disabled = true;


        if (!selectedDate) return;

        const [selectedYear, selectedMonth] = selectedDate.split('-');
        const pabellonesConDatos = new Set();

        for (const buildingCode in fullData) {
            // Chequeamos si el pabellón tiene datos para el mes/año seleccionado
            if (fullData[buildingCode]?.[selectedYear]?.[selectedMonth]?.consumption >= 0) {
                pabellonesConDatos.add(buildingCode);
            }
        }

        pabellonesConDatos.forEach(code => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `Pabellón ${code.toUpperCase()}`;
            buildingSelect.appendChild(option);
        });
        
        buildingSelect.disabled = pabellonesConDatos.size === 0;
    };
    
    // 3. LISTENER PARA CAMBIO DE PABELLÓN (CARGAR DATOS ACTUALES)
    buildingSelect.onchange = () => {
        const selectedDate = monthSelect.value;
        const selectedBuilding = buildingSelect.value;
        
        consumptionInput.value = '';
        priceInput.value = '';
        
        // UX: Limpiar y Ocultar
        if (fieldsContainer) fieldsContainer.style.display = 'none';
        if (editMessage) editMessage.textContent = '';
        if (currentKwhDisplay) currentKwhDisplay.textContent = '--';
        if (currentPriceDisplay) currentPriceDisplay.textContent = '--';

        consumptionInput.disabled = true;
        priceInput.disabled = true;
        editForm.querySelector('button[type="submit"]').disabled = true;
        deleteBtn.disabled = true;

        if (selectedDate && selectedBuilding) {
            const [selectedYear, selectedMonth] = selectedDate.split('-');
            const data = fullData[selectedBuilding]?.[selectedYear]?.[selectedMonth];

            if (data) {
                // UX FIX: Mostrar datos actuales en los spans
                if (currentKwhDisplay) currentKwhDisplay.textContent = data.consumption.toLocaleString('es-ES') + ' kWh';
                if (currentPriceDisplay) currentPriceDisplay.textContent = formatMoney(data.price);
                
                // Cargar valores a los inputs para edición
                consumptionInput.value = data.consumption.toFixed(0);
                priceInput.value = data.price.toFixed(2);
                
                // Mostrar campos y habilitar botones
                if (fieldsContainer) fieldsContainer.style.display = 'block'; // UX FIX
                consumptionInput.disabled = false;
                priceInput.disabled = false;
                editForm.querySelector('button[type="submit"]').disabled = false;
                deleteBtn.disabled = false;
            }
        }
    };
    
    // 4. MANEJO DE ENVÍO DEL FORMULARIO DE EDICIÓN
    editForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const selectedDate = monthSelect.value;
        const selectedBuilding = buildingSelect.value;
        const newConsumption = parseFloat(consumptionInput.value);
        const newPrice = parseFloat(priceInput.value);

        if (!selectedDate || !selectedBuilding || isNaN(newConsumption) || isNaN(newPrice)) {
            if (editMessage) editMessage.textContent = "❌ Por favor, selecciona un mes y pabellón, y asegúrate de que los valores sean válidos.";
            return;
        }

        const [year, month] = selectedDate.split('-');
        const dataPath = `consumo_mensual/${selectedBuilding}/${year}/${month}`;
        
        if (newConsumption < 0 || newPrice < 0) {
            if (editMessage) editMessage.textContent = "❌ Los valores de Consumo y Precio no pueden ser negativos.";
            return;
        }
        
        if (editMessage) {
            editMessage.textContent = 'Guardando...';
            editMessage.style.color = '#004d99';
        }

        try {
            await set(ref(db, dataPath), {
                consumption: newConsumption,
                price: newPrice
            });
            
            // UX FIX: Mostrar mensaje de éxito y recargar la UI del modal
            if (editMessage) {
                editMessage.textContent = `✅ ¡Edición exitosa! El registro de Pabellón ${selectedBuilding.toUpperCase()} para ${month}/${year} ha sido actualizado.`;
                editMessage.style.color = '#28a745';
            }
            
            // Recargar el listener para actualizar los datos actuales y el ranking
            setTimeout(() => {
                setupEditDataListener(); // Recargar datos en el modal
            }, 500);

        } catch (error) {
            console.error("Error al actualizar datos en Firebase:", error);
            if (editMessage) {
                editMessage.textContent = "❌ Error al guardar la edición.";
                editMessage.style.color = '#dc3545';
            }
        }
    };

    // 5. MANEJO DEL BOTÓN DE BORRAR
    deleteBtn.onclick = async () => {
        const selectedDate = monthSelect.value;
        const selectedBuilding = buildingSelect.value;

        if (!selectedDate || !selectedBuilding) {
             if (editMessage) editMessage.textContent = "Selecciona un mes y pabellón antes de intentar borrar.";
             return;
        }
        
        if (!confirm(`⚠️ ¿Estás seguro de que deseas BORRAR el registro COMPLETO del Pabellón ${selectedBuilding.toUpperCase()} para el período ${selectedDate}? Esta acción es irreversible.`)) {
            return;
        }

        const [year, month] = selectedDate.split('-');
        const dataPath = `consumo_mensual/${selectedBuilding}/${year}/${month}`;
        
        if (editMessage) {
            editMessage.textContent = 'Borrando...';
            editMessage.style.color = '#004d99';
        }

        try {
            await set(ref(db, dataPath), null); 
            
            // UX FIX: Mostrar mensaje de éxito y recargar la UI del modal
            if (editMessage) {
                editMessage.textContent = `🗑️ El registro de Pabellón ${selectedBuilding.toUpperCase()} para ${month}/${year} ha sido ELIMINADO exitosamente.`;
                editMessage.style.color = '#004d99';
            }
            
            // Recargar el listener para actualizar los combos (el registro borrado ya no debe aparecer)
            setTimeout(() => {
                setupEditDataListener(); // Recargar datos en el modal
            }, 500);

        } catch (error) {
            console.error("Error al borrar datos en Firebase:", error);
            if (editMessage) {
                editMessage.textContent = "❌ Error al intentar borrar el registro.";
                editMessage.style.color = '#dc3545';
            }
        }
    };
}


// ==================================================================== 
// LÓGICA DE INTERFAZ DE CHAT Y MODAL
// ==================================================================== 

document.addEventListener('DOMContentLoaded', () => {
    // 🚨 Inicialización de la escucha de datos al cargar el DOM
    setupDashboardDataListener();

    // Referencias a los Modales y Botones
    const uploadModal = document.getElementById('data-upload-modal');
    const goalModal = document.getElementById('goal-config-modal');
    // 🚨 FIX 4: Corregir la referencia al ID del Modal de Edición
    const editModal = document.getElementById('edit-data-modal'); 
    
    const uploadBtn = document.getElementById('upload-data-btn');
    const configGoalBtn = document.getElementById('config-goal-btn');
    const editBtn = document.getElementById('edit-data-btn'); 
    
    // Formularios y Chat
    const uploadForm = document.getElementById('upload-form');
    const goalConfigForm = document.getElementById('goal-config-form');
    const messagesContainer = document.getElementById('messages-container'); 
    const loadingIndicator = document.getElementById('loading-indicator'); 
    const promptInput = document.getElementById('prompt-input'); 
    const generateButton = document.getElementById('generate-button'); 
    
    const reportPdfBtn = document.getElementById('report-pdf-btn'); 

    // Función para añadir mensajes al chat
    function addMessageToChat(text, senderClass) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${senderClass}`;
        
        if (senderClass === 'ai-message') {
            messageDiv.innerHTML = processMarkdownToHtml(text);
        } else {
            messageDiv.textContent = text;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Función para generar contenido IA (PROMPT CON CONTEXTO DE DATOS)
    async function generateContent() { 
        const userPrompt = promptInput.value.trim(); 
        if (!userPrompt || generateButton.disabled) { return; } 

        addMessageToChat(userPrompt, 'user-message');
        promptInput.value = ''; 

        loadingIndicator.style.display = 'block'; 
        generateButton.disabled = true; 
        
        const dataSnapshotJson = JSON.stringify(currentDashboardData, null, 2);
        
        // PROMPT FINAL: Ajustado para UCV y mayor proactividad en búsqueda.
        const promptToSend = `
Eres un asistente de IA para recomendaciones energéticas. Estás configurado para trabajar exclusivamente con los datos del **Campus Lima Norte (Los Olivos) de la Universidad César Vallejo (UCV)**. Tienes acceso a los siguientes datos en formato JSON.

----------------------------------
${dataSnapshotJson}
----------------------------------

Instrucciones para la respuesta:
1. Responde a la solicitud del usuario de forma concisa y amigable.
2. Utiliza la sintaxis de Markdown (ej. **texto**) para resaltar valores numéricos importantes, periodos o estados.
3. **CRÍTICO: Si la pregunta no se puede responder con el JSON (información externa como divisas, precios de mercado o distribuidores fuera de la UCV), DEBES USAR LA BÚSQUEDA WEB AL INSTANTE.** NUNCA digas que necesitas buscar; haz la búsqueda e integra el resultado en tu respuesta.
4. Si el usuario pregunta por un mes o período específico (ej. "Octubre 2025" o "Noviembre"), debes buscar y extraer la información detallada de ese mes del campo \`datos_historicos_mensuales\` para construir tu respuesta.
5. Si la solicitud no es histórica, utiliza el campo \`mes_actual_dashboard\` como la información de contexto inmediato.
6. Al mencionar un valor numérico (consumo, pago, meta), SIEMPRE utiliza su unidad (Soles o kWh).
7. Usa la lista de \`meses_disponibles\` para informar al usuario sobre qué períodos puedes proporcionar datos.

Solicitud del usuario: ${userPrompt}
`;
        
        try { 
            const result = await chat.sendMessage(promptToSend); 
            let generatedText = "⚠️ Error interno: No se pudo extraer la respuesta del modelo."; 

            if (result && result.response && result.response.candidates && result.response.candidates.length > 0) {
                const candidate = result.response.candidates[0];
                if (candidate.finishReason === 'SAFETY') {
                    generatedText = "⚠️ La respuesta fue bloqueada por filtros de seguridad. Intenta una consulta diferente.";
                } else {
                    const textPart = candidate.content.parts.find(part => part.text); 
                    if (textPart) {
                        generatedText = textPart.text;
                    } else {
                        generatedText = "⚠️ El modelo no devolvió texto en el formato esperado o la respuesta fue vacía."; 
                    }
                }
            }

            addMessageToChat(generatedText, 'ai-message');
            
        } catch (error) { 
            console.error("Error al llamar a la API de Gemini:", error); 
            addMessageToChat(`⚠️ Error de conexión o configuración: ${error.message}`, 'ai-message');
            
        } finally { 
            loadingIndicator.style.display = 'none'; 
            generateButton.disabled = false; 
            promptInput.focus(); 
        } 
    } 

    // Eventos del Chat
    generateButton.addEventListener('click', generateContent); 
    promptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !generateButton.disabled) {
            e.preventDefault(); 
            generateContent();
        }
    });
    
    // Manejo de Apertura/Cierre de Modales: Subir Datos
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            if (uploadModal) uploadModal.classList.add('active');
        });
    }

    // Manejo de Apertura/Cierre de Modales: Configurar Meta
    if (configGoalBtn) {
        configGoalBtn.addEventListener('click', () => {
            fetchCurrentGoal(true); 
            if (goalModal) goalModal.classList.add('active');
        });
    }

    // 🚨 Manejo de Apertura/Cierre de Modales: EDITAR DATOS (Llama a la función configurada)
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (editModal) {
                // Inicializa el modal de edición (carga los combobox)
                setupEditDataListener(); 
                editModal.classList.add('active');
            }
        });
    }
    
    // ENLACE DEL BOTÓN DE REPORTE PDF
    if (reportPdfBtn) {
        reportPdfBtn.addEventListener('click', generatePdfReport);
    }

    // Cierre de Modales con close-btn
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (uploadModal) uploadModal.classList.remove('active');
            if (goalModal) goalModal.classList.remove('active');
            if (editModal) editModal.classList.remove('active'); // ✅ Cierre del Modal de Edición
        });
    });

    // Cierre de Modales haciendo click fuera
    window.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            uploadModal.classList.remove('active');
        } else if (e.target === goalModal) {
            goalModal.classList.remove('active');
        } else if (e.target === editModal) { // ✅ Cierre del Modal de Edición
            editModal.classList.remove('active');
        }
    });

    // Lógica de Manejo del Formulario de SUBIDA DE DATOS
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const building = document.getElementById('building-select').value;
            const newConsumption = parseFloat(document.getElementById('consumption-input').value);
            const newPrice = parseFloat(document.getElementById('price-input').value);
            const dateString = document.getElementById('date-input').value;
            
            const date = new Date(dateString + '-01T00:00:00'); 
            const year = date.getFullYear().toString();
            const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
            
            if (isNaN(newConsumption) || newConsumption <= 0) {
                alert("❌ Por favor, introduce un valor de consumo positivo y válido (kWh).");
                return;
            }
            if (isNaN(newPrice) || newPrice < 0) {
                alert("❌ Por favor, introduce un valor de precio válido (S/ 0 o más).");
                return;
            }

            const dataPath = `consumo_mensual/${building}/${year}/${month}`;
            const dataRef = ref(db, dataPath);

            try {
                const snapshot = await get(dataRef);
                const existingData = snapshot.val() || { consumption: 0, price: 0 };
                
                // CRÍTICO: Sumar a los valores existentes.
                const totalConsumption = (existingData.consumption || 0) + newConsumption;
                const totalPrice = (existingData.price || 0) + newPrice; 

                await set(dataRef, {
                    consumption: totalConsumption,
                    price: totalPrice
                });

                alert(`✅ ¡Registro exitoso!\nTotales Acumulados:\n- Consumo: ${totalConsumption.toLocaleString('es-ES')} kWh\n- Pago: S/ ${totalPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 } )}`);
                
                uploadForm.reset();
                if (uploadModal) uploadModal.classList.remove('active');

            } catch (error) {
                console.error("Error al guardar datos en Firebase:", error);
                alert("❌ Error al intentar guardar los datos. Revisa la consola.");
            }
        });
    }

    // Evento de Manejo del Formulario de CONFIGURACIÓN DE METAS
    if (goalConfigForm) {
        goalConfigForm.addEventListener('submit', handleGoalConfigSubmit);
    }


    // Lógica de Navegación de Vistas
    const dashboardView = document.getElementById('dashboard-view');
    const chatView = document.getElementById('chat-view');
    const menuItems = document.querySelectorAll('.menu-item[data-view]');

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            const targetViewId = this.getAttribute('data-view');

            if (targetViewId === 'dashboard-view') {
                if(dashboardView) dashboardView.style.display = 'flex';
                if(chatView) chatView.style.display = 'none';
            } else if (targetViewId === 'chat-view') {
                if(dashboardView) dashboardView.style.display = 'none';
                if(chatView) chatView.style.display = 'flex';
            }
        });
    });

     const menuToggleBtns = document.querySelectorAll('.menu-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    // Esta es la función que muestra u oculta el menú y el fondo
    const toggleSidebar = () => {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
    };

    // Le decimos a CADA botón de menú que al hacer clic, ejecute la función
    menuToggleBtns.forEach(btn => {
        btn.addEventListener('click', toggleSidebar);
    });

    // También le decimos al fondo oscuro que, al hacer clic, cierre el menú
    if (backdrop) {
        backdrop.addEventListener('click', toggleSidebar);
    }

}); // Fin de DOMContentLoaded

