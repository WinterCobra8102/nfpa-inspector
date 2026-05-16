import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { supabase } from '../supabaseClient';
import { 
  FileDown, AlertTriangle, CheckCircle, XCircle, ClipboardList, ClipboardCheck, 
  Trash2, Edit3, Eye, X, CheckSquare, Square, Cloud, CloudOff, RefreshCw, 
  Filter, Home, MapPin, User, FileText, Check, Image as ImageIcon, MessageSquare, Lock
} from 'lucide-react';
import { generatePDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

export default function InspectionHistory({ navigateTo }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // ESTADOS DE FILTRADO
  const [filterStd, setFilterStd] = useState('TODOS');
  const [filterCat, setFilterCat] = useState('TODOS');

  // ESTADOS TEMPORALES DE EDICIÓN AVANZADA
  const [tempObs, setTempObs] = useState("");
  const [tempStatus, setTempStatus] = useState("");
  const [tempOwnerName, setTempOwnerName] = useState("");
  const [tempDetails, setTempDetails] = useState({});
  const [tempVoltages, setTempVoltages] = useState([]);

  const inspections = useLiveQuery(() => db.inspections.orderBy('date').reverse().toArray());

  const categoriesByStd = {
    'NFPA 25': ['BOMBAS', 'HIDRANTES', 'MANGUERAS', 'ROCIADORES', 'VÁLVULAS', 'OBSERVACIONES'],
    'NFPA 72': ['ALARMAS']
  };

  const getCategoryFromCode = (code) => {
    if (!code) return 'OTROS';
    const c = code.toUpperCase();
    if (c.includes('IPM-01') || c.includes('IPM-08') || c.includes('014') || c.includes('015')) return 'BOMBAS';
    if (c.includes('IPM-02') || c.includes('016')) return 'MANGUERAS';
    if (c.includes('IPM-03') || c.includes('019')) return 'ALARMAS';
    if (c.includes('IPM-04') || c.includes('039')) return 'HIDRANTES';
    if (c.includes('IPM-05') || c.includes('041')) return 'VÁLVULAS';
    if (c.includes('IPM-06') || c.includes('ROCIADORES')) return 'ROCIADORES';
    if (c.includes('IPM-07') || c.includes('045')) return 'OBSERVACIONES';
    return 'OTROS';
  };

  const filteredInspections = inspections?.filter(item => {
    const currentStd = item.standard || ((item.serviceCode === 'IPM-03' || item.formCode === 'F-SER-019') ? 'NFPA 72' : 'NFPA 25');
    const matchStd = filterStd === 'TODOS' || currentStd === filterStd;
    const currentCat = item.category || getCategoryFromCode(item.serviceCode || item.formCode || item.equipmentName);
    return matchStd && (filterCat === 'TODOS' || currentCat.toUpperCase() === filterCat.toUpperCase());
  });

  const handleOpenModal = (item, isEdit) => {
    setSelectedReport(item);
    setTempObs(item.generalObs || item.observations || "");
    setTempStatus(item.overallStatus || "ÓPTIMO");
    setTempOwnerName(item.ownerName || "");
    setTempDetails(item.details ? JSON.parse(JSON.stringify(item.details)) : {});
    setTempVoltages(item.voltages ? JSON.parse(JSON.stringify(item.voltages)) : Array.from({ length: 6 }, () => ({ min: '', max: '' })));
    setEditMode(isEdit);
  };

  // === MOTOR DE SINCRONIZACIÓN CORREGIDO ===
  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const pendingReports = await db.inspections.filter(r => r.synced === 0 || !r.synced).toArray();
      if (pendingReports.length > 0) {
        for (const report of pendingReports) {
          const dataToSync = {
            id: report.id, date: report.date,
            form_code: report.formCode || report.serviceCode || 'F-SER-014',
            equipment_name: report.equipmentName,
            standard: report.standard || 'NFPA 25',
            category: report.category || getCategoryFromCode(report.formCode || report.serviceCode),
            overall_status: report.overallStatus || 'ÓPTIMO',
            general_obs: report.generalObs || report.observations || '',
            client_id: report.clientId, 
            client_name: report.clientName || 'NO ESPECIFICADO', 
            client_address: report.clientAddress || 'No capturada', 
            owner_name: report.ownerName,
            signature: report.signature, 
            
            // CORRECCIÓN CRÍTICA 1: Enviamos de forma explícita la firma Base64 del Técnico evaluador a la nube
            tech_signature: report.techSignature || null, 
            
            location: report.location, performed_by: report.performedBy,
            voltages: report.voltages, details: report.details
          };
          const { error } = await supabase.from('inspections').upsert([dataToSync]);
          if (!error) await db.inspections.update(report.id, { synced: 1 });
        }
      }
      
      const { data: cloudData } = await supabase.from('inspections').select('*').order('date', { ascending: false });
      if (cloudData) {
        const localReadyData = cloudData.map(item => ({
          id: item.id, date: item.date, clientId: item.client_id, clientName: item.client_name, clientAddress: item.client_address, ownerName: item.owner_name,
          equipmentName: item.equipment_name, standard: item.standard, category: item.category,
          formCode: item.form_code, serviceCode: item.form_code, overallStatus: item.overall_status,
          generalObs: item.general_obs, observations: item.general_obs, details: item.details,
          voltages: item.voltages, signature: item.signature,
          
          // CORRECCIÓN CRÍTICA 2: Mapeamos de vuelta la columna remota hacia la propiedad local IndexedDB (Dexie)
          techSignature: item.tech_signature, 
          
          location: item.location,
          performedBy: item.performed_by, synced: 1
        }));
        await db.inspections.where('synced').equals(1).delete();
        await db.inspections.bulkPut(localReadyData);
      }
      toast.success("Sincronización Exitosa con la Nube");
    } catch (e) { console.error(e); toast.error("Error al sincronizar"); } finally { setIsSyncing(false); }
  };

  const statusConfig = {
    'ÓPTIMO': { border: 'border-l-green-500', badge: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} /> },
    'ADVERTENCIA': { border: 'border-l-yellow-500', badge: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle size={14} /> },
    'CRÍTICO': { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700', icon: <XCircle size={14} /> },
    'PENDIENTE': { border: 'border-l-gray-300', badge: 'bg-gray-200 text-gray-500', icon: null }
  };

  const toggleSelect = (id) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };
  const toggleSelectAll = () => { if (selectedIds.length === filteredInspections?.length) setSelectedIds([]); else setSelectedIds(filteredInspections.map(i => i.id)); };
  
  const handleBulkDelete = async () => {
    if (window.confirm(`¿Eliminar ${selectedIds.length} reportes?`)) {
      await supabase.from('inspections').delete().in('id', selectedIds);
      await db.inspections.bulkDelete(selectedIds); setSelectedIds([]);
      toast.success("Registros eliminados");
    }
  };

  const handleDeleteIndividual = async (id) => {
    if (window.confirm("¿Eliminar reporte permanentemente?")) {
      await supabase.from('inspections').delete().eq('id', id);
      await db.inspections.delete(id);
      toast.success("Reporte eliminado");
    }
  };

  const handleUpdate = async () => {
    toast.loading("Actualizando registro local...", { id: "update_loader" });
    try {
      await db.inspections.update(selectedReport.id, { 
        generalObs: tempObs, 
        observations: tempObs, 
        overallStatus: tempStatus,
        ownerName: tempOwnerName,
        details: tempDetails,
        voltages: tempVoltages,
        synced: 0 
      });
      toast.success("Reporte modificado con éxito", { id: "update_loader" });
      setEditMode(false); 
      setSelectedReport(null);
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar cambios locales.", { id: "update_loader" });
    }
  };

  if (!inspections) return <div className="p-20 text-center animate-pulse font-black text-slate-400">CARGANDO HISTORIAL...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in">
      <div className="px-4 pt-4"><button onClick={() => navigateTo('home')} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-red-600 group"><Home size={14} /> Salir al Panel</button></div>
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-6 px-4 gap-4">
        <div className="flex items-center gap-4"><div className="bg-red-600 p-4 rounded-[1.5rem] text-white"><ClipboardList size={28} /></div><div><h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Historial Tletl</h2><div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-black text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded-md">{filteredInspections?.length} RESULTADOS</span><button onClick={handleSyncAll} className="p-1.5 border shadow-sm rounded-full"><RefreshCw size={14} className={isSyncing ? 'animate-spin text-blue-500' : 'text-slate-400'} /></button></div></div></div>
        <div className="flex bg-slate-100 p-1.5 rounded-[1.2rem] gap-1">{['TODOS', 'NFPA 25', 'NFPA 72'].map(std => <button key={std} onClick={() => { setFilterStd(std); setFilterCat('TODOS'); }} className={`px-5 py-2.5 rounded-[0.8rem] text-[10px] font-black ${filterStd === std ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}>{std}</button>)}</div>
      </div>
      {filterStd !== 'TODOS' && (
        <div className="px-4"><div className="flex gap-2 overflow-x-auto pb-2">{['TODOS', ...categoriesByStd[filterStd]].map(cat => <button key={cat} onClick={() => setFilterCat(cat)} className={`px-4 py-2 rounded-xl text-[9px] font-black border ${filterCat === cat ? 'bg-red-600 text-white' : 'bg-white text-slate-400'}`}>{cat === 'TODOS' ? 'CUALQUIER TIPO' : cat}</button>)}</div></div>
      )}
      {selectedIds.length > 0 && (
        <div className="mx-4 p-4 bg-slate-900 rounded-[1.5rem] flex items-center justify-between text-white"><span className="text-[10px] font-black uppercase">{selectedIds.length} Seleccionados</span><button onClick={handleBulkDelete} className="bg-red-600 px-6 py-2 rounded-xl text-[9px] font-black uppercase">Eliminar Selección</button></div>
      )}
      
      {/* LISTADO TÉCNICO */}
      <div className="grid gap-4 px-4">
        {filteredInspections?.length === 0 ? (
          <div className="bg-white p-20 rounded-[2.5rem] text-center"><Filter size={48} className="mx-auto mb-4 text-slate-200" /><p className="font-black uppercase text-xs text-slate-400 tracking-widest">Sin registros con estos filtros</p></div>
        ) : (
          filteredInspections.map((item) => {
            const style = statusConfig[item.overallStatus] || statusConfig['PENDIENTE']; const isSelected = selectedIds.includes(item.id);
            return (
              <div key={item.id} className={`flex flex-col p-5 bg-white rounded-[2rem] border-2 border-l-[10px] ${style.border} ${isSelected ? 'border-red-600 bg-red-50/10' : 'border-slate-50'}`}>
                <div className="flex justify-between"><div className="flex gap-4"><button onClick={() => toggleSelect(item.id)} className={isSelected ? 'text-red-600' : 'text-slate-200'}>{isSelected ? <CheckSquare size={26} /> : <Square size={26} />}</button><div><div className="flex items-center gap-2"><span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 rounded-md">{item.standard}</span><h3 className="font-black text-slate-800 text-sm uppercase">{item.equipmentName}</h3></div><p className="text-[10px] text-slate-400 font-bold mt-1">{item.formCode || item.serviceCode || 'IPM'} • {new Date(item.date).toLocaleDateString()} • <span className="text-slate-500">{item.clientName || 'Sin sucursal'}</span></p></div></div><div className="flex flex-col items-end gap-2"><div className={`px-3 py-1 rounded-full text-[9px] font-black ${style.badge}`}>{item.overallStatus || 'PENDIENTE'}</div>{item.synced ? <Cloud size={16} className="text-blue-400" /> : <CloudOff size={16} className="text-orange-400 animate-pulse" />}</div></div>
                <div className="flex justify-between mt-4 pt-4 border-t"><div className="flex gap-2">
                  <button type="button" className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-700" onClick={() => handleOpenModal(item, false)}><Eye size={18}/></button>
                  <button type="button" className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-red-600" onClick={() => handleOpenModal(item, true)}><Edit3 size={18}/></button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => generatePDF(item)} className="bg-slate-800 hover:bg-red-600 text-white px-5 py-2 rounded-xl font-black text-[9px] uppercase flex items-center gap-2"><FileDown size={14}/> PDF</button>
                  <button onClick={() => handleDeleteIndividual(item.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={18}/></button>
                </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE VISUALIZACIÓN */}
      {selectedReport && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-50 w-full max-w-4xl h-[92vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <span className="bg-red-600 px-3 py-1 rounded-md text-[9px] font-black tracking-widest uppercase">{editMode ? "Modo Editor de Datos" : "Previsualización del Reporte"}</span>
                <h3 className="font-black text-xl uppercase mt-1 tracking-tight">{selectedReport.equipmentName}</h3>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-3 bg-white/10 hover:bg-red-600 rounded-full text-white transition-colors"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
              
              <div className="bg-red-600 p-6 rounded-3xl text-white shadow-md">
                <h4 className="text-xl font-black tracking-tight">TLETL - PROTECCIÓN CONTRA INCENDIOS</h4>
                <p className="text-xs font-bold opacity-80 mt-1 uppercase">FORMATO TÉCNICO: {selectedReport.formCode || 'IPM'} • NORMA: {selectedReport.standard}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/20 text-xs font-bold uppercase">
                  <p>🔧 Técnico Operador: <span className="font-normal opacity-90">{selectedReport.performedBy || 'Isai Moo'}</span></p>
                  <p>📅 Fecha de Registro: <span className="font-normal opacity-90">{new Date(selectedReport.date).toLocaleString()}</span></p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12}/> Datos de Localización de la Sucursal</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
                  <div className="space-y-1">
                    <p className="text-slate-400 font-black text-[9px] uppercase">Empresa / Sucursal</p>
                    <p className="text-sm font-black text-slate-900 uppercase">{selectedReport.clientName || 'NO ESPECIFICADO'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-black text-[9px] uppercase">Responsable Conformidad</p>
                    {editMode ? (
                      <input className="w-full bg-slate-50 border p-2 rounded-xl text-slate-800 font-bold mt-1 outline-none focus:border-red-500" value={tempOwnerName} onChange={e => setTempOwnerName(e.target.value)} />
                    ) : (
                      <p className="text-sm text-slate-900 uppercase">{tempOwnerName || 'No capturado'}</p>
                    )}
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <p className="text-slate-400 font-black text-[9px] uppercase">Dirección de Google Maps</p>
                    <p className="text-slate-600 font-bold leading-tight">{selectedReport.clientAddress || 'No mapeada en la ficha técnica'}</p>
                  </div>
                </div>
              </div>

              {editMode && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Modificar Diagnóstico del Semáforo Global</p>
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                    {['ÓPTIMO', 'ADVERTENCIA', 'CRÍTICO'].map(s => (
                      <button key={s} type="button" onClick={() => setTempStatus(s)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tempStatus === s ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Puntos del Checklist Evaluados</p>
                
                {Object.keys(tempDetails).length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold text-center italic py-4">No se capturaron celdas específicas en este reporte.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(tempDetails).map(([pointName, val]) => (
                      <div key={pointName} className="border-b pb-4 space-y-2 last:border-0 last:pb-0">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 leading-tight flex-1">{pointName}</span>
                          
                          {editMode ? (
                            <div className="flex gap-1 shrink-0">
                              {[
                                { k: 'bien', l: 'OK', c: 'bg-green-600 text-white' },
                                { k: 'advertencia', l: 'ADV', c: 'bg-yellow-500 text-black' },
                                { k: 'critico', l: 'X', c: 'bg-red-600 text-white' },
                                { k: 'na', l: 'N/A', c: 'bg-slate-400 text-white' }
                              ].map(opt => (
                                <button
                                  key={opt.k}
                                  type="button"
                                  onClick={() => setTempDetails(prev => ({ ...prev, [pointName]: { ...prev[pointName], status: opt.k } }))}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${tempDetails[pointName]?.status === opt.k ? `${opt.c} shadow-md scale-105` : 'bg-slate-50 text-slate-400'}`}
                                >
                                  {opt.l}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-wider shrink-0 text-center uppercase ${
                              val.status === 'bien' ? 'bg-green-100 text-green-700' :
                              val.status === 'advertencia' ? 'bg-yellow-100 text-yellow-700' :
                              val.status === 'critico' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {val.status === 'bien' ? '✓ OK' : val.status === 'advertencia' ? '⚠ ADV' : val.status === 'critico' ? '✗ CRÍTICO' : 'N/A'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <MessageSquare size={13} className="text-slate-300 shrink-0"/>
                          {editMode ? (
                            <input className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none" value={tempDetails[pointName]?.note || ''} placeholder="Modificar nota..." onChange={e => setTempDetails(prev => ({ ...prev, [pointName]: { ...prev[pointName], note: e.target.value } }))} />
                          ) : (
                            <p className="text-xs font-bold text-slate-600 leading-none">{val.note || 'Sin observaciones registradas.'}</p>
                          )}
                          {val.photo && <div className="flex items-center gap-1 text-[9px] font-black text-green-600 uppercase tracking-wider shrink-0 ml-auto bg-green-50 px-2 py-1 rounded-md border border-green-200"><ImageIcon size={12}/> Evidencia</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {tempVoltages.some(v => v.min || v.max || editMode) && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b pb-2">Registros de Voltaje de Arranque</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-black text-slate-400 uppercase"><span>Ciclo</span><span>V. Mínimo</span><span>V. Máximo</span></div>
                  {tempVoltages.map((v, i) => (
                    <div key={i} className="grid grid-cols-3 gap-3 items-center">
                      <span className="font-bold text-xs text-slate-700 text-center">{i+1}º Arranque</span>
                      {editMode ? (
                        <input type="number" className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-bold outline-none" value={v.min || ''} onChange={e => { const n = [...tempVoltages]; n[i].min = e.target.value; setTempVoltages(n); }} />
                      ) : (
                        <span className="text-xs font-black text-slate-800 bg-slate-50 p-2 rounded-xl">{v.min ? `${v.min} V` : '-'}</span>
                      )}
                      {editMode ? (
                        <input type="number" className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-bold outline-none" value={v.max || ''} onChange={e => { const n = [...tempVoltages]; n[i].max = e.target.value; setTempVoltages(n); }} />
                      ) : (
                        <span className="text-xs font-black text-slate-800 bg-slate-50 p-2 rounded-xl">{v.max ? `${v.max} V` : '-'}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Observación Técnica General Final</label>
                {editMode ? (
                  <textarea className="w-full h-28 p-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none text-slate-700 focus:border-red-500" value={tempObs} onChange={e => setTempObs(e.target.value)} />
                ) : (
                  <p className="text-sm font-bold text-slate-700 italic bg-red-50/20 p-5 rounded-2xl border border-red-100/40">"{tempObs || 'Sin comentarios registrados.'}"</p>
                )}
              </div>

              {/* === APARTADO VISUAL ADICIONAL: CONSOLA DE FIRMAS DUALES EN MODAL === */}
              {(selectedReport.signature || selectedReport.techSignature) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900 p-6 rounded-[2rem] border-2 border-dashed border-white/10 shadow-xl">
                  
                  {/* FIRMA OPERADOR TLETL */}
                  <div className="flex flex-col items-center text-center p-3 bg-white/5 rounded-2xl">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-3 flex items-center gap-1"><Lock size={10}/> Firma Técnico Operador TLETL</p>
                    <div className="bg-white rounded-2xl p-2 w-full h-28 flex items-center justify-center overflow-hidden shadow-inner">
                      {selectedReport.techSignature ? (
                        <img src={selectedReport.techSignature} alt="Firma Técnico" className="max-h-full object-contain" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 italic">No capturada en la base local</span>
                      )}
                    </div>
                  </div>

                  {/* FIRMA DE CONFORMIDAD DEL CLIENTE */}
                  <div className="flex flex-col items-center text-center p-3 bg-white/5 rounded-2xl">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-3 flex items-center gap-1"><User size={10}/> Firma Conformidad Cliente</p>
                    <div className="bg-white rounded-2xl p-2 w-full h-28 flex items-center justify-center overflow-hidden shadow-inner">
                      {selectedReport.signature ? (
                        <img src={selectedReport.signature} alt="Firma Cliente" className="max-h-full object-contain" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 italic">No capturada de conformidad</span>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>

            <div className="p-6 bg-white border-t flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setSelectedReport(null)} className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all">Cerrar Visualizador</button>
              {editMode && (
                <button type="button" onClick={handleUpdate} className="px-10 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center gap-2">
                  <Check size={14}/> Guardar Todos los Cambios
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function ActionIcon({ icon, onClick }) {
  return (
    <button type="button" onClick={onClick} className="p-3 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-90">
      {icon}
    </button>
  );
}