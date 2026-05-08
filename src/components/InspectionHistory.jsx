import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { supabase } from '../supabaseClient'; // Importante para la nube
import { 
  FileDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  ClipboardList,
  ClipboardCheck,
  Trash2,
  Edit3,
  Eye,
  X,
  CheckSquare,
  Square,
  Layers,
  Cloud,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { generatePDF } from '../utils/pdfGenerator';

export default function InspectionHistory() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [tempObs, setTempObs] = useState("");
  const [tempStatus, setTempStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // useLiveQuery mantiene la UI reactiva a la base local Dexie
  const inspections = useLiveQuery(() => 
    db.inspections.orderBy('date').reverse().toArray()
  );

  // --- LÓGICA DE SINCRONIZACIÓN BIDIERECCIONAL ---
  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      // 1. SUBIR LO PENDIENTE (Nubecitas naranjas a la nube)
      const pendingReports = await db.inspections.filter(r => r.synced === 0 || !r.synced).toArray();
      
      if (pendingReports.length > 0) {
        for (const report of pendingReports) {
          // Quitamos el ID local para que Supabase no choque
          const { id, synced, ...dataToSync } = report;
          
          const { error } = await supabase.from('inspections').insert([dataToSync]);
          
          if (!error) {
            await db.inspections.update(id, { synced: 1 }); // Cambia a nube azul localmente
          } else {
            console.error("Error al subir a Supabase:", error);
          }
        }
      }

      // 2. BAJAR DE LA NUBE (Para que se vean en la PC)
      const { data: cloudData, error: fetchError } = await supabase
        .from('inspections')
        .select('*')
        .order('date', { ascending: false });

      if (!fetchError && cloudData) {
        // Usamos bulkPut para evitar duplicados locales
        await db.inspections.bulkPut(cloudData.map(item => ({ ...item, synced: 1 })));
      }
    } catch (e) {
      console.error("Fallo general de sincronización:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Cuando entras al historial por primera vez, intenta sincronizar
    handleSyncAll();
  }, []);

  const statusConfig = {
    'ÓPTIMO': { border: 'border-l-green-500', bg: 'bg-green-50/50', badge: 'bg-green-100 text-green-700', icon: <CheckCircle size={18} className="text-green-500" /> },
    'ADVERTENCIA': { border: 'border-l-yellow-500', bg: 'bg-yellow-50/50', badge: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle size={18} className="text-yellow-500" /> },
    'CRÍTICO': { border: 'border-l-red-500', bg: 'bg-red-50/50', badge: 'bg-red-100 text-red-700', icon: <XCircle size={18} className="text-red-500" /> },
    'PENDIENTE': { border: 'border-l-gray-300', bg: 'bg-gray-50', badge: 'bg-gray-200 text-gray-500', icon: null }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === inspections.length) setSelectedIds([]);
    else setSelectedIds(inspections.map(i => i.id));
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`¿Eliminar ${selectedIds.length} reportes?`)) {
      await db.inspections.bulkDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleDeleteIndividual = async (id) => {
    if (window.confirm("¿Eliminar este reporte?")) {
      await db.inspections.delete(id);
    }
  };

  const handleUpdate = async () => {
    try {
      await db.inspections.update(selectedReport.id, { 
        observations: tempObs,
        overallStatus: tempStatus,
        synced: 0 // Marcamos como pendiente para que el syncService lo suba
      });
      setEditMode(false);
      setSelectedReport(null);
    } catch (e) {
      alert("Error al actualizar.");
    }
  };

  if (!inspections) return (
    <div className="flex flex-col items-center justify-center p-20 text-blue-600">
      <div className="animate-spin mb-4"><Layers size={40} /></div>
      <p className="font-black uppercase text-xs tracking-widest text-center">Iniciando motor de datos...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-6 px-2 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 text-white">
            <ClipboardList size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Historial Técnico</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-blue-600 uppercase">Total: {inspections.length} reportes</span>
              {/* ESTE ES EL BOTÓN MÁGICO DE SINCRONIZACIÓN */}
              <button onClick={handleSyncAll} className="p-1 hover:bg-gray-100 rounded-full transition-all bg-white border border-slate-200 shadow-sm ml-2">
                <RefreshCw size={12} className={`${isSyncing ? 'animate-spin text-blue-500' : 'text-slate-600'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-red-700 transition-all">
              <Trash2 size={14} className="inline mr-2" /> Borrar ({selectedIds.length})
            </button>
          )}
          <button onClick={toggleSelectAll} className="bg-white border-2 border-gray-100 px-4 py-2.5 rounded-xl font-black text-[10px] text-gray-500 uppercase hover:border-blue-200 transition-all">
            {selectedIds.length === inspections?.length ? <CheckSquare size={16}/> : <Square size={16}/>}
          </button>
        </div>
      </div>

      {/* LISTADO */}
      <div className="grid gap-3 px-2">
        {inspections.length === 0 ? (
          <div className="bg-white p-20 rounded-[32px] border-2 border-dashed border-gray-100 text-center">
            <ClipboardCheck size={60} className="mx-auto mb-4 text-gray-200" />
            <p className="font-black uppercase text-sm text-gray-400 italic">No hay reportes en la nube ni locales</p>
          </div>
        ) : (
          inspections.map((item) => {
            const style = statusConfig[item.overallStatus] || statusConfig['PENDIENTE'];
            const isSelected = selectedIds.includes(item.id);

            return (
              <div key={item.id} className={`group flex flex-col md:flex-row items-start md:items-center p-4 rounded-3xl border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-50/50 shadow-lg' : `border-gray-50 ${style.bg}`} border-l-[12px] ${style.border}`}>
                <button onClick={() => toggleSelect(item.id)} className={`mr-4 p-1 rounded-lg ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>
                  {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                </button>

                <div className="flex items-center gap-4 flex-1 w-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-gray-800 text-md uppercase tracking-tight">{item.equipmentName}</h3>
                      <span className={`text-[8px] px-2 py-0.5 rounded-lg font-black uppercase ${style.badge}`}>{item.overallStatus}</span>
                      {item.synced ? <Cloud size={14} className="text-blue-400" /> : <CloudOff size={14} className="text-orange-400 animate-pulse" />}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                      {item.serviceCode} <span className="mx-2 text-gray-200">|</span> {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-4 md:mt-0 w-full md:w-auto justify-end">
                  <ActionIcon icon={<Eye size={18}/>} onClick={() => { setSelectedReport(item); setTempObs(item.observations); setTempStatus(item.overallStatus); setEditMode(false); }} />
                  <ActionIcon icon={<Edit3 size={18}/>} onClick={() => { setSelectedReport(item); setTempObs(item.observations); setTempStatus(item.overallStatus); setEditMode(true); }} />
                  <ActionIcon icon={<FileDown size={18}/>} onClick={() => generatePDF(item)} isPrimary />
                  <ActionIcon icon={<Trash2 size={18}/>} onClick={() => handleDeleteIndividual(item.id)} isDanger />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL (DETALLES/EDICIÓN) */}
      {selectedReport && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest mb-1">DETALLES TÉCNICOS</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">ID: {selectedReport.id}</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-gray-200 rounded-full"><X /></button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {editMode && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase text-center tracking-widest">Nivel de Urgencia</p>
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                    {['ÓPTIMO', 'ADVERTENCIA', 'CRÍTICO'].map(s => (
                      <button key={s} onClick={() => setTempStatus(s)} className={`flex-1 py-3 rounded-xl text-[9px] font-black transition-all ${tempStatus === s ? statusConfig[s].badge + ' shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observaciones</p>
                {editMode ? (
                  <textarea className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] font-bold h-32 outline-none text-sm transition-all" value={tempObs} onChange={(e) => setTempObs(e.target.value)} />
                ) : (
                  <div className="p-5 bg-blue-50/30 rounded-[24px] font-bold text-slate-700 italic text-sm border-2 border-blue-50">
                    "{selectedReport.observations || 'Sin diagnóstico registrado.'}"
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 border-t flex justify-end gap-3">
              <button onClick={() => setSelectedReport(null)} className="px-6 py-3 text-gray-500 font-black text-[10px] uppercase">Cerrar</button>
              {editMode && (
                <button onClick={handleUpdate} className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
                  Actualizar Reporte
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionIcon({ icon, onClick, isDanger, isPrimary }) {
  return (
    <button onClick={onClick} className={`p-3 rounded-xl transition-all active:scale-90 ${isDanger ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : isPrimary ? 'text-blue-600 hover:bg-blue-50 hover:text-blue-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}>
      {icon}
    </button>
  );
}