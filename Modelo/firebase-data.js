// Modelo/firebase-data.js

import { db } from './firebase-init.js'; 

export async function getRecentRecordsFromFirebase() {
    try {
        // La colección es 'consumos' (plural) y la ordenación por 'fecha' (minúscula)
        const recordsRef = db.collection("consumos"); 
        
        const querySnapshot = await recordsRef
            .orderBy("fecha", "desc") 
            .limit(5)
            .get(); 

        const recordsArray = querySnapshot.docs.map(doc => {
            const data = doc.data();

            // 🔑 CONVERSIÓN DE TIMESTAMP
            let fechaFormateada = 'N/A';
            if (data.fecha && typeof data.fecha.toDate === 'function') {
                // Formateamos la fecha para que se vea legible (dd/mm/yyyy)
                fechaFormateada = data.fecha.toDate().toLocaleDateString('es-ES'); 
            }

            return {
                id: doc.id,
                // 🚨 CORRECCIÓN DE NOMBRES DE CAMPOS
                edificio: data.edificio || 'Desconocido', // Usa 'edificio' (minúscula)
                consumo: data.kwh || 0,                   // Usa 'kwh' (minúscula)
                fecha: fechaFormateada                    // Usa la fecha formateada
            };
        });

        console.log("Datos de Firebase obtenidos y formateados con éxito.");
        return recordsArray;
        
    } catch (error) {
        console.error("Error al obtener registros recientes de Firestore:", error);
        return []; 
    }
}