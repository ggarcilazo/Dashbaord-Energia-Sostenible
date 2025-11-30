// Modelo/firebase-data.js

import { db } from './firebase-init.js';

/**
 * 📊 Ya lo usabas: últimos 5 registros para el dashboard
 */
export async function getRecentRecordsFromFirebase() {
    try {
        const recordsRef = db.collection('consumos');

        const querySnapshot = await recordsRef
            .orderBy('fecha', 'desc')
            .limit(5)
            .get();

        const recordsArray = querySnapshot.docs.map(doc => {
            const data = doc.data();

            let fechaFormateada = 'N/A';
            let fechaDate = null;

            if (data.fecha && typeof data.fecha.toDate === 'function') {
                fechaDate = data.fecha.toDate();
                fechaFormateada = fechaDate.toLocaleDateString('es-ES'); // dd/mm/aaaa
            }

            return {
                id: doc.id,
                edificio: data.edificio || 'Desconocido',
                consumo: data.kwh || 0,
                fecha: fechaFormateada,
                fechaDate: fechaDate
            };
        });

        console.log('Datos de Firebase obtenidos y formateados con éxito.');
        return recordsArray;
    } catch (error) {
        console.error('Error al obtener registros recientes de Firestore:', error);
        return [];
    }
}

/**
 * 🔥 RF12 – Resumen para la pantalla pública
 * SIEMPRE MUESTRA DATOS porque:
 *  - Toma la fecha más reciente de Firestore
 *  - Calcula consumo mensual y anual usando esa fecha
 */
export async function getCurrentEnergySummary() {
    try {
        const records = await getRecentRecordsFromFirebase();

        if (!records || records.length === 0) {
            return {
                periodo: 'Sin datos',
                consumoMensual: 0,
                pabellones: [],
                consumoAnualActual: 0,
                metaAnual: 10000
            };
        }

        // Filtrar los que sí tienen fecha válida
        const withDate = records.filter(r => r.fechaDate instanceof Date);

        if (withDate.length === 0) {
            return {
                periodo: 'Sin datos',
                consumoMensual: 0,
                pabellones: [],
                consumoAnualActual: 0,
                metaAnual: 10000
            };
        }

        // 1️⃣ Obtener la fecha más reciente
        let latestRecord = withDate[0];
        withDate.forEach(r => {
            if (r.fechaDate > latestRecord.fechaDate) {
                latestRecord = r;
            }
        });

        const latestDate = latestRecord.fechaDate;
        const refYear = latestDate.getFullYear();
        const refMonth = latestDate.getMonth(); // 0–11

        let consumoMensual = 0;
        let consumoAnualActual = 0;
        const pabellonesSet = new Set();

        // 2️⃣ Calcular consumo mensual y anual basado en la fecha más reciente
        withDate.forEach(r => {
            const d = r.fechaDate;
            const year = d.getFullYear();
            const month = d.getMonth();
            const kwh = Number(r.consumo) || 0;
            const edificio = r.edificio || 'Desconocido';

            if (year === refYear) {
                consumoAnualActual += kwh;

                if (month === refMonth) {
                    consumoMensual += kwh;
                    pabellonesSet.add(edificio);
                }
            }
        });

        // Formato bonito del periodo
        let periodo = latestDate.toLocaleDateString('es-ES', {
            month: 'long',
            year: 'numeric'
        });
        periodo = periodo.charAt(0).toUpperCase() + periodo.slice(1);

        const metaAnual = 10000;

        return {
            periodo,
            consumoMensual,
            pabellones: Array.from(pabellonesSet),
            consumoAnualActual,
            metaAnual
        };

    } catch (error) {
        console.error('Error al obtener resumen de energía:', error);
        return {
            periodo: 'Error',
            consumoMensual: 0,
            pabellones: [],
            consumoAnualActual: 0,
            metaAnual: 10000
        };
    }
}

/**
 * 🌐 RF13 – Gestión de usuarios (roles)
 */
export async function saveUserRole(uid, data) {
    return db.collection('users').doc(uid).set(data, { merge: true });
}

export async function getUserRole(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (!doc.exists) return null;
        const data = doc.data();
        return data.role || null;
    } catch (error) {
        console.error('Error al obtener rol de usuario:', error);
        return null;
    }
}
