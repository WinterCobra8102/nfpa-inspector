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
import { showConfirmDelete } from '../alerts'; 

export default function InspectionHistory({ navigateTo }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [filterStd, setFilterStd] = useState('TODOS');
  const [filterCat, setFilterCat] = useState('TODOS');

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
    'ÓPTIMO': { border: 'border-l-green-500', badge: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800', icon: <CheckCircle size={14} /> },
    'ADVERTENCIA': { border: 'border-l-yellow-500', badge: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800', icon: <AlertTriangle size={14} /> },
    'CRÍTICO': { border: 'border-l-red-500', badge: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800', icon: <XCircle size={14} /> },
    'PENDIENTE': { border: 'border-l-slate-300', badge: 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700', icon: null }
  };

  const toggleSelect = (id) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };
  const toggleSelectAll = () => { if (selectedIds.length === filteredInspections?.length) setSelectedIds([]); else setSelectedIds(filteredInspections.map(i => i.id)); };
  
  const handleBulkDelete = () => {
    const totalSelected = selectedIds.length;
    showConfirmDelete(`${totalSelected} REPORTES FILTRADOS`, async () => {
      const deleteToast = toast.loading("Eliminando registros en masa...");
      try {
        await supabase.from('inspections').delete().in('id', selectedIds);
        await db.inspections.bulkDelete(selectedIds); 
        setSelectedIds([]);
        toast.success("Registros eliminados del sistema", { id: deleteToast });
      } catch (err) {
        toast.error("Error al procesar el borrado masivo", { id: deleteToast });
      }
    });
  };

  const handleDeleteIndividual = (id, title) => {
    const displayTitle = title ? title : "ESTE REPORTE TÉCNICO";
    showConfirmDelete(displayTitle, async () => {
      const deleteToast = toast.loading("Removiendo del historial...");
      try {
        await supabase.from('inspections').delete().eq('id', id);
        await db.inspections.delete(id);
        toast.success("Reporte eliminado permanentemente", { id: deleteToast });
      } catch (err) {
        toast.error("Error al eliminar el reporte", { id: deleteToast });
      }
    });
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

  if (!inspections) return <div className="p-20 text-center animate-pulse font-medium text-slate-400 dark:text-slate-500 text-sm">Cargando historial...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 pb-20 animate-in fade-in">
      
      {/* Botón Volver */}
      <div>
        <button onClick={() => navigateTo('home')} className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors group">
          <Home size={16} strokeWidth={1.5} /> <span>Salir al Panel</span>
        </button>
      </div>

      {/* Header y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-red-600 dark:text-red-500 border border-red-100 dark:border-red-900/30">
            <ClipboardList size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Historial Técnico</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-800">
                {filteredInspections?.length} resultados
              </span>
              <button onClick={handleSyncAll} className="p-1.5 border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <RefreshCw size={14} className={isSyncing ? 'animate-spin text-blue-500' : 'text-slate-400 dark:text-slate-500'} />
              </button>
            </div>
          </div>
        </div>

        {/* Filtro de Norma */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1">
          {['TODOS', 'NFPA 25', 'NFPA 72'].map(std => (
            <button 
              key={std} 
              onClick={() => { setFilterStd(std); setFilterCat('TODOS'); }} 
              className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${filterStd === std ? 'bg-white dark:bg-slate-900 text-red-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {std}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro de Categoría */}
      {filterStd !== 'TODOS' && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['TODOS', ...categoriesByStd[filterStd]].map(cat => (
            <button 
              key={cat} 
              onClick={() => setFilterCat(cat)} 
              className={`px-4 py-2 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${filterCat === cat ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
            >
              {cat === 'TODOS' ? 'Cualquier tipo' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Barra de Selección Masiva */}
      {selectedIds.length > 0 && (
        <div className="p-4 bg-slate-900 dark:bg-slate-800 rounded-lg flex items-center justify-between text-white">
          <span className="text-sm font-medium">{selectedIds.length} seleccionados</span>
          <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-md text-xs font-medium transition-colors">
            Eliminar Selección
          </button>
        </div>
      )}
      
      {/* LISTADO TÉCNICO */}
      <div className="grid gap-3">
        {filteredInspections?.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-16 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm flex flex-col items-center justify-center space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full border border-slate-100 dark:border-slate-700">
              <Filter size={32} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
            </div>
            <p className="font-medium text-sm text-slate-500 dark:text-slate-400">Sin registros con estos filtros</p>
          </div>
        ) : (
          filteredInspections.map((item) => {
            const style = statusConfig[item.overallStatus] || statusConfig['PENDIENTE'];
            const isSelected = selectedIds.includes(item.id);
            return (
              <div key={item.id} className={`flex flex-col p-5 bg-white dark:bg-slate-900 rounded-xl border-l-4 ${style.border} ${isSelected ? 'border border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10' : 'border border-slate-200 dark:border-slate-700'} shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex justify-between">
                  <div className="flex gap-4">
                    <button onClick={() => toggleSelect(item.id)} className={isSelected ? 'text-red-600' : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400'}>
                      {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400">{item.standard}</span>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{item.equipmentName}</h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {item.formCode || item.serviceCode || 'IPM'} &middot; {new Date(item.date).toLocaleDateString()} &middot; <span className="text-slate-600 dark:text-slate-300">{item.clientName || 'Sin sucursal'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded-md text-xs font-medium ${style.badge}`}>
                      {item.overallStatus || 'PENDIENTE'}
                    </div>
                    {item.synced ? <Cloud size={14} className="text-blue-400" /> : <CloudOff size={14} className="text-orange-400 animate-pulse" />}
                  </div>
                </div>
                <div className="flex justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex gap-1">
                    <button type="button" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors" onClick={() => handleOpenModal(item, false)}><Eye size={16}/></button>
                    <button type="button" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-500 transition-colors" onClick={() => handleOpenModal(item, true)}><Edit3 size={16}/></button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => generatePDF(item)} className="bg-slate-900 dark:bg-white hover:bg-red-600 dark:hover:bg-red-600 text-white dark:text-slate-900 dark:hover:text-white px-4 py-2 rounded-md font-medium text-xs flex items-center gap-2 transition-colors">
                      <FileDown size={14}/> PDF
                    </button>
                    <button onClick={() => handleDeleteIndividual(item.id, item.equipmentName)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-500 transition-colors">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE PREVISUALIZACIÓN / EDICIÓN */}
      {selectedReport && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[92vh] rounded-xl overflow-hidden flex flex-col shadow-xl animate-in zoom-in-95 duration-200">
            
            {/* Header del Modal */}
            <div className="bg-slate-50 dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-md border border-red-100 dark:border-red-900/30">
                  {editMode ? "Modo Editor" : "Previsualización"}
                </span>
                <h3 className="font-semibold text-xl text-slate-900 dark:text-white mt-2">{selectedReport.equipmentName}</h3>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-2 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-500 transition-colors border border-slate-200 dark:border-slate-700">
                <X size={18}/>
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
              
              {/* Banner de Información */}
              <div className="bg-red-600 p-6 rounded-xl text-white">
                <h4 className="text-lg font-semibold">TLETL - Protección Contra Incendios</h4>
                <p className="text-sm opacity-80 mt-1">Formato Técnico: {selectedReport.formCode || 'IPM'} &middot; Norma: {selectedReport.standard}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/20 text-sm">
                  <p>Técnico Operador: <span className="opacity-90">{selectedReport.performedBy || 'Isai Moo'}</span></p>
                  <p>Fecha de Registro: <span className="opacity-90">{new Date(selectedReport.date).toLocaleString()}</span></p>
                </div>
              </div>

              {/* Datos de Localización */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                  <MapPin size={14} strokeWidth={1.5}/> Datos de Localización de la Sucursal
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700 dark:text-slate-300">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Empresa / Sucursal</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedReport.clientName || 'NO ESPECIFICADO'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Responsable Conformidad</p>
                    {editMode ? (
                      <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 p-2.5 rounded-md text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={tempOwnerName} onChange={e => setTempOwnerName(e.target.value)} />
                    ) : (
                      <p className="font-medium text-slate-900 dark:text-white">{tempOwnerName || 'No capturado'}</p>
                    )}
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Dirección de Google Maps</p>
                    <p className="text-slate-600 dark:text-slate-300 leading-tight">{selectedReport.clientAddress || 'No mapeada en la ficha técnica'}</p>
                  </div>
                </div>
              </div>

              {/* Selector de Estatus (Solo en modo edición) */}
              {editMode && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center">Modificar Diagnóstico del Semáforo Global</p>
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                    {['ÓPTIMO', 'ADVERTENCIA', 'CRÍTICO'].map(s => (
                      <button key={s} type="button" onClick={() => setTempStatus(s)} className={`flex-1 py-3 rounded-md text-xs font-medium transition-all ${tempStatus === s ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-3">Puntos del Checklist Evaluados</p>
                
                {Object.keys(tempDetails).length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No se capturaron celdas específicas en este reporte.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(tempDetails).map(([pointName, val]) => (
                      <div key={pointName} className="border-b border-slate-100 dark:border-slate-700 pb-4 space-y-2 last:border-0 last:pb-0">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                          <span className="text-sm text-slate-700 dark:text-slate-300 leading-tight flex-1">{pointName}</span>
                          
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
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tempDetails[pointName]?.status === opt.k ? `${opt.c} shadow-sm` : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                                >
                                  {opt.l}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className={`px-3 py-1.5 rounded-md text-xs font-medium shrink-0 text-center ${
                              val.status === 'bien' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' :
                              val.status === 'advertencia' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800' :
                              val.status === 'critico' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}>
                              {val.status === 'bien' ? 'OK' : val.status === 'advertencia' ? 'ADV' : val.status === 'critico' ? 'Crítico' : 'N/A'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                          <MessageSquare size={13} className="text-slate-300 dark:text-slate-600 shrink-0"/>
                          {editMode ? (
                            <input className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none" value={tempDetails[pointName]?.note || ''} placeholder="Modificar nota..." onChange={e => setTempDetails(prev => ({ ...prev, [pointName]: { ...prev[pointName], note: e.target.value } }))} />
                          ) : (
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-none">{val.note || 'Sin observaciones registradas.'}</p>
                          )}
                          {val.photo && <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 shrink-0 ml-auto bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md border border-green-200 dark:border-green-800"><ImageIcon size={12}/> Evidencia</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Voltajes */}
              {tempVoltages.some(v => v.min || v.max || editMode) && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center border-b border-slate-100 dark:border-slate-700 pb-3">Registros de Voltaje de Arranque</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400"><span>Ciclo</span><span>V. Mínimo</span><span>V. Máximo</span></div>
                  {tempVoltages.map((v, i) => (
                    <div key={i} className="grid grid-cols-3 gap-3 items-center">
                      <span className="text-sm text-slate-700 dark:text-slate-300 text-center">{i+1}er Arranque</span>
                      {editMode ? (
                        <input type="number" className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md text-center text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-500" value={v.min || ''} onChange={e => { const n = [...tempVoltages]; n[i].min = e.target.value; setTempVoltages(n); }} />
                      ) : (
                        <span className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-md text-center border border-slate-100 dark:border-slate-700">{v.min ? `${v.min} V` : '-'}</span>
                      )}
                      {editMode ? (
                        <input type="number" className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md text-center text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-500" value={v.max || ''} onChange={e => { const n = [...tempVoltages]; n[i].max = e.target.value; setTempVoltages(n); }} />
                      ) : (
                        <span className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-md text-center border border-slate-100 dark:border-slate-700">{v.max ? `${v.max} V` : '-'}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Observación General */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2"><FileText size={14} strokeWidth={1.5}/> Observación Técnica General Final</label>
                {editMode ? (
                  <textarea className="w-full h-28 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none text-slate-700 dark:text-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500" value={tempObs} onChange={e => setTempObs(e.target.value)} />
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-700 leading-relaxed">"{tempObs || 'Sin comentarios registrados.'}"</p>
                )}
              </div>

              {/* Firmas */}
              {(selectedReport.signature || selectedReport.techSignature) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                  
                  <div className="flex flex-col items-center text-center p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1"><Lock size={12}/> Firma Técnico Operador</p>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 w-full h-28 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                      {selectedReport.techSignature ? (
                        <img src={selectedReport.techSignature} alt="Firma Técnico" className="max-h-full object-contain" />
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">No capturada</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center text-center p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1"><User size={12}/> Firma Conformidad Cliente</p>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 w-full h-28 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                      {selectedReport.signature ? (
                        <img src={selectedReport.signature} alt="Firma Cliente" className="max-h-full object-contain" />
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">No capturada</span>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Footer del Modal */}
            <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setSelectedReport(null)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-medium text-sm transition-colors">
                Cerrar
              </button>
              {editMode && (
                <button type="button" onClick={handleUpdate} className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors flex items-center gap-2">
                  <Check size={14}/> Guardar Cambios
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
    <button type="button" onClick={onClick} className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
      {icon}
    </button>
  );
}
