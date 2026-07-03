import Dexie from "dexie";

export const db = new Dexie("NFPA_InspectorDB");

db.version(3).stores({
  inspections:
    "++id, date, technician, serviceCode, overallStatus, equipmentName, synced",
  equipment: "++id, name, norm",
});

db.version(5).stores({
  inspections: "++id, date, clientId, client_id, standard, category, synced",
  equipment: "++id, name, norm",
  clientes: "id, nombre, direccion", // <-- ¡AQUÍ ESTÁ LA CORRECCIÓN CRÍTICA!
  ipm_tasks: "++id, client_id, day, visit_week, status",
});

db.on("populate", () => {
  db.equipment.bulkAdd([
    { id: 1, name: "Extintores Portátiles", norm: "NFPA 10" },
    { id: 2, name: "Sistemas de Rociadores", norm: "NFPA 13" },
    { id: 3, name: "Bomba Diesel", norm: "NFPA 20" },
    { id: 4, name: "Gabinete/Mangueras", norm: "NFPA 14" },
  ]);
});
