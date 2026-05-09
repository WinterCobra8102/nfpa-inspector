import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { supabase } from '../supabaseClient';
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
  RefreshCw,
  Droplets,
  Bell,
  LayoutGrid,
  ChevronRight,
  Home // Añadido para el botón de regreso
} from 'lucide-react';
import { generatePDF } from '../utils/pdfGenerator';

// AÑADIMOS navigateTo COMO PROP
export default function InspectionHistory({ navigateTo }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [tempObs, setTempObs] = useState("");
  const [tempStatus, setTempStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [filterStd, setFilterStd] = useState('TODOS');

  const inspections = useLiveQuery(() => 
    db.inspections.orderBy('date').reverse().toArray()
  );

  const filteredInspections = inspections?.filter(item => {
    if (filterStd === 'TODOS') return true;
    return item.standard === filterStd;
  });

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const pendingReports = await db.inspections.filter(r => r.synced === 0 || !r.synced).toArray();
      if (pendingReports.length > 0) {
        for (const report of pendingReports) {
          const dataToSync = {
            id: report.id, 
            date: report.date,
            service_code: report.serviceCode, 
            equipment_name: report.equipmentName, 
            norm: report.norm,
            standard: report.standard,
            overall_status: report.overallStatus, 
            observations: report.observations,
            photo: report.photo
          };
          const { error } = await supabase.from('inspections').insert([dataToSync]);
          if (!error) await db.inspections.update(report.id, { synced: 1 });
        }
      }

      const { data: cloudData, error: fetchError } = await supabase
        .from('inspections')
        .select('*')
        .order('date', { ascending: false });

      if (!fetchError && cloudData) {
        const localReadyData = cloudData.map(item => ({
          id: item.id,
          date: item.date,
          serviceCode: item.service_code || item.serviceCode,
          equipmentName: item.equipment_name || item.equipmentName,
          norm: item.norm,
          standard: item.standard,
          overallStatus: item.overall_status || item.overallStatus,
          observations: item.observations,
          photo: item.photo,
          synced: 1
        }));
        await db.inspections.where('synced').equals(1).delete();
        await db.inspections.bulkPut(localReadyData);
      }
    } catch (e) {
      console.error("Error sincronización:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const statusConfig = {
    'ÓPTIMO': { border: 'border-l-green-500', bg: 'bg-green-50/30', badge: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} /> },
    'ADVERTENCIA': { border: 'border-l-yellow-500', bg: 'bg-yellow-50/30', badge: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle size={14} /> },
    'CRÍTICO': { border: 'border-l-red-500', bg: 'bg-red-50/30', badge: 'bg-red-100 text-red-700', icon: <XCircle size={14} /> },
    'PENDIENTE': { border: 'border-l-gray-300', bg: 'bg-gray-50', badge: 'bg-gray-200 text-gray-500', icon: null }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInspections?.length) setSelectedIds([]);
    else setSelectedIds(filteredInspections.map(i => i.id));
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`¿Confirmas eliminar ${selectedIds.length} reportes?`)) {
      await supabase.from('inspections').delete().in('id', selectedIds);
      await db.inspections.bulkDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleDeleteIndividual = async (id) => {
    if (window.confirm("¿Eliminar reporte permanentemente?")) {
      await supabase.from('inspections').delete().eq('id', id);
      await db.inspections.delete(id);
    }
  };

  const handleUpdate = async () => {
    await db.inspections.update(selectedReport.id, { 
      observations: tempObs,
      overallStatus: tempStatus,
      synced: 0 
    });
    setEditMode(false);
    setSelectedReport(null);
  };

  if (!inspections) return <div className="p-20 text-center animate-pulse font-black text-slate-400">CARGANDO HISTORIAL...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* BOTÓN REGRESO AL PANEL */}
      <div className="px-4 pt-4">
        <button 
          onClick={() => navigateTo('home')} 
          className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-red-600 group transition-all"
        >
          <Home size={14} className="group-hover:scale-110" /> Salir al Panel
        </button>
      </div>

      {/* HEADER TÉCNICO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-6 px-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-4 rounded-[1.5rem] shadow-xl text-white">
            <ClipboardList size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Historial Tletl</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded-md">
                {filteredInspections?.length} {filterStd === 'TODOS' ? 'TOTALES' : filterStd}
              </span>
              <button onClick={handleSyncAll} className="p-1.5 hover:bg-slate-100 rounded-full transition-all border shadow-sm">
                <RefreshCw size={14} className={`${isSyncing ? 'animate-spin text-blue-500' : 'text-slate-400'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* SELECTOR DE NORMA */}
        <div className="flex bg-slate-100 p-1.5 rounded-[1.2rem] gap-1 shadow-inner">
          {[
            { id: 'TODOS', icon: <LayoutGrid size={14}/> },
            { id: 'NFPA 25', icon: <Droplets size={14}/> },
            { id: 'NFPA 72', icon: <Bell size={14}/> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setFilterStd(tab.id); setSelectedIds([]); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[0.8rem] text-[10px] font-black transition-all ${filterStd === tab.id ? 'bg-white text-red-600 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab.icon} {tab.id}
            </button>
          ))}
        </div>
      </div>

      {/* ... (El resto del listado, acciones masivas y modal se mantienen exactamente igual) ... */}
      {selectedIds.length > 0 && (
        <div className="mx-4 p-4 bg-slate-900 rounded-[1.5rem] flex items-center justify-between animate-in slide-in-from-top duration-300 shadow-2xl">
          <span className="text-white text-[10px] font-black uppercase ml-2">{selectedIds.length} Seleccionados</span>
          <div className="flex gap-2">
            <button onClick={toggleSelectAll} className="px-4 py-2 text-white border border-white/20 rounded-xl text-[9px] font-black uppercase">Desmarcar</button>
            <button onClick={handleBulkDelete} className="bg-red-600 px-6 py-2 rounded-xl text-white text-[9px] font-black uppercase shadow-lg">Eliminar</button>
          </div>
        </div>
      )}

      <div className="grid gap-4 px-4">
        {filteredInspections?.length === 0 ? (
          <div className="bg-white p-20 rounded-[2.5rem] border-4 border-dotted border-slate-100 text-center">
            <ClipboardCheck size={48} className="mx-auto mb-4 text-slate-200" />
            <p className="font-black uppercase text-xs text-slate-400 tracking-widest">No hay registros en {filterStd}</p>
          </div>
        ) : (
          filteredInspections.map((item) => {
            const style = statusConfig[item.overallStatus] || statusConfig['PENDIENTE'];
            const isSelected = selectedIds.includes(item.id);

            return (
              <div key={item.id} className={`group flex flex-col p-5 rounded-[2rem] border-2 transition-all active:scale-[0.98] ${isSelected ? 'border-red-600 bg-red-50/30' : `border-slate-50 bg-white hover:border-slate-200 shadow-sm`} border-l-[10px] ${style.border}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <button onClick={() => toggleSelect(item.id)} className={`mt-1 transition-colors ${isSelected ? 'text-red-600' : 'text-slate-200 hover:text-slate-400'}`}>
                      {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${item.standard === 'NFPA 25' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                          {item.standard || 'S/N'}
                        </span>
                        <h3 className="font-black text-slate-800 text-sm uppercase leading-tight">{item.equipmentName}</h3>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2">
                        {item.serviceCode} <span className="text-slate-200">•</span> {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black ${style.badge}`}>
                      {style.icon} {item.overallStatus}
                    </div>
                    {item.synced ? <Cloud size={16} className="text-blue-400" /> : <CloudOff size={16} className="text-orange-400 animate-pulse" />}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                   <div className="flex gap-1">
                      <ActionIcon icon={<Eye size={18}/>} onClick={() => { setSelectedReport(item); setTempObs(item.observations); setTempStatus(item.overallStatus); setEditMode(false); }} />
                      <ActionIcon icon={<Edit3 size={18}/>} onClick={() => { setSelectedReport(item); setTempObs(item.observations); setTempStatus(item.overallStatus); setEditMode(true); }} />
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => generatePDF(item)} className="bg-slate-800 text-white px-5 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg flex items-center gap-2 active:scale-90 transition-all">
                        <FileDown size={14}/> PDF
                      </button>
                      <button onClick={() => handleDeleteIndividual(item.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors">
                        <Trash2 size={18}/>
                      </button>
                   </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE DETALLES/EDICIÓN */}
      {selectedReport && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
              <div>
                <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">{selectedReport.standard}</span>
                <h3 className="font-black text-slate-800 uppercase text-lg tracking-tighter">Detalles del Servicio</h3>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              {editMode && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase text-center tracking-widest">Cambiar Estado Global</p>
                  <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                    {['ÓPTIMO', 'ADVERTENCIA', 'CRÍTICO'].map(s => (
                      <button key={s} onClick={() => setTempStatus(s)} className={`flex-1 py-3 rounded-xl text-[9px] font-black transition-all ${tempStatus === s ? 'bg-white text-red-600 shadow-md scale-105' : 'text-slate-400'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnóstico Técnico</p>
                {editMode ? (
                  <textarea className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold h-32 outline-none text-sm focus:border-red-500 transition-all" value={tempObs} onChange={(e) => setTempObs(e.target.value)} />
                ) : (
                  <div className="p-6 bg-red-50/30 rounded-[2rem] font-bold text-slate-700 italic text-sm border-2 border-red-50/50">
                    "{selectedReport.observations || 'Sin diagnóstico registrado.'}"
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 border-t flex justify-end gap-3">
              <button onClick={() => setSelectedReport(null)} className="px-6 py-3 text-slate-400 font-black text-[10px] uppercase">Cerrar</button>
              {editMode && (
                <button onClick={handleUpdate} className="px-10 py-3 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">
                  Guardar Cambios
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
    <button onClick={onClick} className="p-3 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-90">
      {icon}
    </button>
  );
}