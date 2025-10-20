// ======================================================
// CONTROLADOR DEL DASHBOARD - VERSIÓN FINAL FUNCIONAL
// ======================================================

import { auth, db } from "../Modelo/firebase-init.js";

export function initDashboard() {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "../Login/login.html";
      return;
    }
    startRealtimeListeners();
    bindUIActions();
    loadMeta();
  });
}

// ========================
// REFERENCIA RÁPIDA
// ========================
const q = (id) => document.getElementById(id);

// ========================
// EVENTOS PRINCIPALES
// ========================
function bindUIActions() {
  q("cerrar-sesion")?.addEventListener("click", () => auth.signOut());

  q("subir-datos")?.addEventListener("click", () =>
    openModal(
      "Subir Datos Manuales",
      `
      <form id="form-upload">
        <label>Edificio:</label>
        <select id="edificio" required>
          <option value="">Seleccione</option>
          <option value="Facultad de Ingeniería">Facultad de Ingeniería</option>
          <option value="Edificio de Administración">Edificio de Administración</option>
          <option value="Biblioteca">Biblioteca</option>
          <option value="Centro de Estudiantes">Centro de Estudiantes</option>
        </select>

        <label>Consumo (kWh):</label>
        <input id="kwh" type="number" min="0" step="0.01" required />

        <label>Fecha:</label>
        <input id="fecha" type="date" required />

        <button type="submit" class="login-button">Guardar</button>
      </form>
      `
    )
  );

  q("reporte-pdf")?.addEventListener("click", () =>
    openModal(
      "Generar Reporte PDF",
      `<p>¿Desea generar un reporte en PDF con los datos actuales?</p>
       <button id="confirm-pdf" class="login-button btn-pdf">Confirmar</button>`
    )
  );

  q("config-metas")?.addEventListener("click", () =>
    openModal(
      "Configurar Meta Anual",
      `
      <form id="form-meta">
        <label>Meta Anual (kWh):</label>
        <input id="meta" type="number" min="1" required />
        <button type="submit" class="login-button">Guardar</button>
      </form>
      `
    )
  );

  q("borrar-todo")?.addEventListener("click", loadEditDeleteModal);
}

// ========================
// MODAL GENERAL
// ========================
function openModal(title, bodyHTML) {
  const overlay = q("modal-overlay");
  if (!overlay) return;

  q("modal-title").textContent = title;
  q("modal-body").innerHTML = bodyHTML;
  overlay.style.display = "flex";

  q("modal-close").onclick = () => (overlay.style.display = "none");

  setTimeout(() => {
    q("form-upload")?.addEventListener("submit", saveData);
    q("form-meta")?.addEventListener("submit", saveMeta);
    q("confirm-pdf")?.addEventListener("click", () => {
      generatePDF();
      overlay.style.display = "none";
    });
  }, 100);
}

// ========================
// GUARDAR DATOS MANUALMENTE
// ========================
function saveData(e) {
  e.preventDefault();

  const edificio = q("edificio").value;
  const kwh = parseFloat(q("kwh").value || 0);
  const fecha = q("fecha").value;

  if (!edificio || isNaN(kwh) || !fecha) return;

  db.collection("consumos")
    .add({
      edificio,
      kwh,
      fecha: firebase.firestore.Timestamp.fromDate(new Date(fecha)),
    })
    .then(() => (q("modal-overlay").style.display = "none"));
}

// ========================
// GUARDAR META ANUAL
// ========================
function saveMeta(e) {
  e.preventDefault();
  const meta = parseFloat(q("meta").value || 0);
  if (isNaN(meta) || meta <= 0) return;

  const userId = auth.currentUser?.uid;
  if (!userId) return;

  db.collection("metas").doc(userId).set({
    meta,
    fecha: firebase.firestore.Timestamp.now(),
  });
  q("modal-overlay").style.display = "none";
}

// ========================
// CARGAR META GUARDADA
// ========================
function loadMeta() {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  db.collection("metas")
    .doc(userId)
    .get()
    .then((doc) => {
      if (doc.exists) {
        const meta = doc.data().meta;
        const metaBox = q("meta-info");
        if (metaBox) metaBox.textContent = `${meta} kWh`;
      }
    });
}

// ========================
// ESCUCHAR CAMBIOS EN TIEMPO REAL
// ========================
function startRealtimeListeners() {
  db.collection("consumos")
    .orderBy("fecha", "desc")
    .onSnapshot((snapshot) => {
      const data = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      updateDashboard(data);
    });
}

// ========================
// ACTUALIZAR DASHBOARD
// ========================
function updateDashboard(data) {
  const totals = {};
  data.forEach((r) => {
    if (!totals[r.edificio]) totals[r.edificio] = 0;
    totals[r.edificio] += r.kwh;
  });

  const ids = {
    "Facultad de Ingeniería": "fac-ingenieria",
    "Edificio de Administración": "admin",
    Biblioteca: "biblio",
    "Centro de Estudiantes": "centro",
  };

  Object.keys(ids).forEach((ed) => {
    q(ids[ed]).textContent = (totals[ed] || 0).toFixed(2) + " kWh";
  });

  const totalEnergy = Object.values(totals).reduce((a, b) => a + b, 0);
  q("stat-energy").textContent = totalEnergy.toFixed(2);
  q("stat-edificios").textContent = Object.keys(totals).length;

  updateAlerts(totals);
  updateTable(data);
  updateChart(totals);
}

// ========================
// ALERTAS Y RECOMENDACIONES
// ========================
function updateAlerts(totals) {
  const alertsContainer = q("alerts-list");
  alertsContainer.innerHTML = "";

  let count = 0;
  Object.keys(totals).forEach((edificio) => {
    const consumo = totals[edificio];
    let nivel = "";
    let clase = "";

    if (consumo > 300) {
      nivel = "🚨 Consumo Alto";
      clase = "alert-high-bg";
    } else if (consumo > 150) {
      nivel = "⚠️ Consumo Moderado";
      clase = "alert-moderate-bg";
    } else {
      nivel = "✅ Buen Consumo";
      clase = "alert-good-bg";
    }

    const alertDiv = document.createElement("div");
    alertDiv.className = `alert-item ${clase}`;
    alertDiv.innerHTML = `<strong>${nivel}</strong><br>${edificio} - ${consumo.toFixed(
      2
    )} kWh`;
    alertsContainer.appendChild(alertDiv);
    count++;
  });

  if (!count) alertsContainer.innerHTML = "<p>No hay alertas registradas.</p>";

  q("stat-alerts").textContent = count;
  q("stat-areas-alto").textContent = Object.values(totals).filter((v) => v > 300).length;
}

// ========================
// TABLA DE REGISTROS
// ========================
function updateTable(data) {
  const tbody = q("tabla-consumo");
  tbody.innerHTML = "";

  data.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.edificio}</td>
      <td>${r.kwh.toFixed(2)}</td>
      <td>${r.fecha.toDate().toLocaleDateString()}</td>
      <td><button onclick="deleteRecord('${r.id}')">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteRecord = function (id) {
  if (!confirm("¿Eliminar este registro?")) return;
  db.collection("consumos").doc(id).delete();
};

// ========================
// GRÁFICO DE CONSUMO
// ========================
let chart;
function updateChart(totals) {
  const ctx = q("activity-chart").getContext("2d");
  const labels = Object.keys(totals);
  const values = Object.values(totals);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Consumo (kWh)",
          data: values,
          backgroundColor: ["#007bff", "#ff9800", "#4caf50", "#ffc107"],
        },
      ],
    },
    options: { scales: { yAxes: [{ ticks: { beginAtZero: true } }] } },
  });
}

// ========================
// GENERAR REPORTE PDF
// ========================
async function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Reporte de Energía Responsable - UCV", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(10);
  doc.text("Generado: " + new Date().toLocaleString(), 10, 25);

  const snapshot = await db.collection("consumos").orderBy("fecha", "desc").get();
  if (snapshot.empty) return;

  let registros = [];
  snapshot.forEach((docSnap) => registros.push(docSnap.data()));

  const totales = {};
  registros.forEach((r) => {
    if (!totales[r.edificio]) totales[r.edificio] = 0;
    totales[r.edificio] += r.kwh;
  });

  doc.setFontSize(12);
  doc.text("Resumen por Edificio:", 10, 40);

  let y = 48;
  for (const [edificio, consumo] of Object.entries(totales)) {
    doc.text(`${edificio}: ${consumo.toFixed(2)} kWh`, 15, y);
    y += 7;
  }

  y += 5;
  doc.text("Registros Detallados:", 10, y);
  y += 6;
  doc.setFontSize(10);
  doc.text("Edificio", 10, y);
  doc.text("kWh", 80, y);
  doc.text("Fecha", 130, y);
  y += 5;
  doc.line(10, y, 200, y);
  y += 5;

  registros.forEach((r) => {
    doc.text(r.edificio, 10, y);
    doc.text(r.kwh.toFixed(2), 80, y);
    doc.text(r.fecha.toDate().toLocaleDateString(), 130, y);
    y += 6;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  const chartCanvas = document.getElementById("activity-chart");
  if (chartCanvas) {
    const img = chartCanvas.toDataURL("image/png", 1.0);
    doc.addPage();
    doc.text("Gráfico de Consumo Energético", pageWidth / 2, 15, { align: "center" });
    doc.addImage(img, "PNG", 15, 25, 180, 100);
  }

  doc.save("Reporte_Energia_UCV.pdf");
}

// ========================
// MODAL EDITAR / ELIMINAR
// ========================
async function loadEditDeleteModal() {
  const snapshot = await db.collection("consumos").get();
  if (snapshot.empty) {
    openModal("Editar o Eliminar", "<p style='color:#888;'>No hay registros.</p>");
    return;
  }

  let html = `
  <form id="edit-delete-form">
    <label>Seleccione un registro:</label>
    <select id="registro-select" required>
      <option value="" disabled selected>Seleccione...</option>`;

  snapshot.forEach((doc) => {
    const d = doc.data();
    const fecha = new Date(d.fecha.seconds * 1000).toLocaleDateString();
    html += `<option value="${doc.id}">${d.edificio} - ${fecha} (${d.kwh} kWh)</option>`;
  });

  html += `
    </select>
    <div id="edit-section" style="display:none;margin-top:15px;">
      <label>Nuevo Consumo (kWh):</label>
      <input id="nuevo-kwh" type="number" step="0.01" min="0" required />
      <div style="display:flex;gap:10px;margin-top:10px;">
        <button type="submit" class="login-button">Guardar</button>
        <button type="button" id="delete-selected" class="login-button btn-delete">Eliminar</button>
      </div>
    </div>
  </form>`;

  openModal("Editar o Eliminar Registros", html);

  setTimeout(() => {
    const select = q("registro-select");
    const section = q("edit-section");
    const form = q("edit-delete-form");
    const delBtn = q("delete-selected");

    select.addEventListener("change", () => (section.style.display = "block"));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = select.value;
      const nuevoKwh = parseFloat(q("nuevo-kwh").value);
      await db.collection("consumos").doc(id).update({ kwh: nuevoKwh });
      q("modal-overlay").style.display = "none";
    });

    delBtn.addEventListener("click", async () => {
      const id = select.value;
      if (!confirm("¿Seguro que deseas eliminar este registro?")) return;
      await db.collection("consumos").doc(id).delete();
      q("modal-overlay").style.display = "none";
    });
  }, 300);
}
