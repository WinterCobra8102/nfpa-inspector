import Dexie from 'dexie';

export const db = new Dexie('NFPA_InspectorDB');

// --- VERSIÓN 3: ESQUEMA BASE ---
db.version(3).stores({
  inspections: '++id, date, technician, serviceCode, overallStatus, equipmentName, synced',
  equipment: '++id, name, norm'
});

// --- VERSIÓN 4: ACTUALIZACIÓN PARA CALENDARIO MULTICLIENTE ---
// Declaramos la nueva versión para inyectar la tabla ipm_tasks e indexar las columnas de filtrado
db.version(4).stores({
  inspections: '++id, date, clientId, client_id, standard, category, synced',
  ipm_tasks: '++id, client_id, day, visit_week, status'
});

// Lógica de carga inicial de catálogos (Solo corre la primera vez que se instala la App)
db.on('populate', () => {
  db.equipment.bulkAdd([
    { id: 1, name: 'Extintores Portátiles', norm: 'NFPA 10' },
    { id: 2, name: 'Sistemas de Rociadores', norm: 'NFPA 13' },
    { id: 3, name: 'Bomba Diesel', norm: 'NFPA 20' },
    { id: 4, name: 'Gabinete/Mangueras', norm: 'NFPA 14' }
  ]);
});