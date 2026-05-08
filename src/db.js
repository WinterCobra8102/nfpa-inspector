import Dexie from 'dexie';

export const db = new Dexie('NFPA_InspectorDB');

// Subimos a la versión 3 para indexar el campo 'synced'
// Esto permite que el syncService busque reportes no sincronizados de forma ultra rápida
db.version(3).stores({
  inspections: '++id, date, technician, serviceCode, overallStatus, equipmentName, synced',
  equipment: '++id, name, norm'
});

// Lógica de carga inicial de catálogos
db.on('populate', () => {
  db.equipment.bulkAdd([
    { id: 1, name: 'Extintores Portátiles', norm: 'NFPA 10' },
    { id: 2, name: 'Sistemas de Rociadores', norm: 'NFPA 13' },
    { id: 3, name: 'Bomba Diesel', norm: 'NFPA 20' },
    { id: 4, name: 'Gabinete/Mangueras', norm: 'NFPA 14' }
  ]);
});