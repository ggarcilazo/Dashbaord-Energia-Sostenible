// Controlador/public-display-controller.js

import { getCurrentEnergySummary } from '../Modelo/firebase-data.js';

document.addEventListener('DOMContentLoaded', async () => {
  const periodElem = document.getElementById('public-current-period');
  const monthlyElem = document.getElementById('public-monthly-consumption');
  const pavilionElem = document.getElementById('public-pavilion-text');
  const annualInfoElem = document.getElementById('public-annual-info');
  const metaBarElem = document.getElementById('public-meta-bar');

  async function cargarDatos() {
    try {
      const data = await getCurrentEnergySummary();

      periodElem.textContent = data.periodo || 'Periodo actual';
      monthlyElem.textContent = `${data.consumoMensual || 0} kWh`;
      pavilionElem.textContent =
        `Pabellones involucrados: ${
          (data.pabellones && data.pabellones.length > 0)
            ? data.pabellones.join(', ')
            : '–'
        }`;

      annualInfoElem.textContent =
        `Consumo anual: ${data.consumoAnualActual || 0} kWh / Meta: ${data.metaAnual || 0}`;

      const porcentaje = data.metaAnual
        ? Math.min(100, ((data.consumoAnualActual || 0) / data.metaAnual) * 100)
        : 0;

      metaBarElem.style.width = `${porcentaje}%`;
    } catch (error) {
      console.error('Error cargando panel público', error);
    }
  }

  // Carga inicial
  await cargarDatos();

  // Refresca cada 60 segundos
  setInterval(cargarDatos, 60000);
});
