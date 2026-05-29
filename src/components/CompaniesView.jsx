import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { Building2, MapPin, Calendar, ArrowRight, User, CheckCircle2, XOctagon, X, ShieldAlert } from 'lucide-react';

export default function CompaniesView({ onSelectCompany, currentUser }) {
  
  const isAdmin = currentUser?.role === 'ADMIN';
  const isManager = currentUser?.role === 'MANAGER';
  
  // Modal de confirmación estilizado TLETL
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCompanyAction, setSelectedCompanyAction] = useState(null);

  // --- GESTIÓN DE PRIVACIDAD MAESTRA Y DATOS ---
  const companies = useLiveQuery(async () => {
    if (!db || !db.clientes) return [];
    
    if (isManager) {
      if (currentUser?.client_id) {
        return await db.clientes.where('id').equals(currentUser.client_id).toArray();
      }
      return [];
    }

    return await db.clientes.orderBy('nombre').toArray();
  }, [currentUser]);

  // --- PREPARAR SUSPENSIÓN CON MODAL ELEGANTE ---
  const triggerPaymentStatus = (company) => {
    setSelectedCompanyAction(company);
    setShowConfirmModal(true);
  };

  // --- EJECUTAR SUSPENSIÓN REAL AL SERVIDOR Y BASE DE DATOS LOCAL ---
  const confirmPaymentStatus = async () => {
    if (!selectedCompanyAction) return;
    
    const newStatus = !selectedCompanyAction.is_active; // Invertimos el estatus actual
    const loadingToast = toast.loading(`Actualizando estatus de acceso...`);

    try {
      // 1. Mandamos la actualización real al servidor Supabase
      const { error } = await supabase
        .from('clientes')
        .update({ is_active: newStatus })
        .eq('id', selectedCompanyAction.id);

      if (error) throw error;

      // 2. Reflejamos el cambio de inmediato en la base local (Dexie)
      await db.clientes.update(selectedCompanyAction.id, { is_active: newStatus });
      
      toast.success(`Estatus actualizado. El cliente ahora está ${newStatus ? 'ACTIVO' : 'BLOQUEADO'}.`, { id: loadingToast });
      setShowConfirmModal(false);
      setSelectedCompanyAction(null);
    } catch (err) {
      toast.error(`Error de servidor: ${err.message}`, { id: loadingToast });
    }
  };

  // --- CONTROL DE CARGA ASÍNCRONA ---
  if (!companies) {
    return (
      <div className="p-20 text-center font-black text-slate-400 animate-pulse text-[10px] tracking-[0.3em]">
        SINCRONIZANDO DIRECTORIO MAESTRO...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Directorio de Empresas</h2>
        <p className="text-xs font-bold text-slate-400 uppercase mt-1">
          {isManager 
            ? "Mi sucursal asignada para el control del cronograma normativo"
            : isAdmin 
              ? "Panel de control de licencias, estatus de cobranza y calendarios."
              : "Selecciona una sucursal para gestionar su cronograma de mantenimiento"
          }
        </p>
      </div>

      {companies.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-12 text-center shadow-sm">
          <Building2 size={40} className="mx-auto text-slate-300 mb-3 animate-pulse" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
            No tienes sucursales vinculadas en tu cuenta de acceso.
          </p>
        </div>
      ) : (
        <>
          {isAdmin ? (
            <div className="overflow-x-auto bg-white border border-slate-200 rounded-[2rem] shadow-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700 font-black text-white uppercase tracking-widest text-[9px]">
                    <th className="p-5">Planta Corporativa</th>
                    <th className="p-5 text-center">Estatus Licencia</th>
                    <th className="p-5 text-center">Control de Cobranza</th>
                    <th className="p-5 text-right">Mantenimientos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5">
                        <p className="font-bold text-slate-900 uppercase text-xs">{company.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate max-w-xs">{company.direccion}</p>
                      </td>
                      <td className="p-5 text-center">
                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          company.is_active !== false 
                            ? 'bg-green-100 text-green-700 border border-green-200 shadow-inner' 
                            : 'bg-red-100 text-red-700 border border-red-200 shadow-inner'
                        }`}>
                          {company.is_active !== false ? '✅ Servicio Activo' : '❌ Acceso Suspendido'}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <button
                          type="button"
                          onClick={() => triggerPaymentStatus(company)}
                          className={`mx-auto px-5 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all shadow-md flex items-center justify-center gap-2 border active:scale-95 ${
                            company.is_active !== false
                              ? 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300'
                              : 'bg-slate-900 text-white border-transparent hover:bg-blue-600'
                          }`}
                        >
                          {company.is_active !== false ? (
                            <> <XOctagon size={14}/> Bloquear </>
                          ) : (
                            <> <CheckCircle2 size={14}/> Reactivar </>
                          )}
                        </button>
                      </td>
                      <td className="p-5 text-right">
                        <button
                          onClick={() => onSelectCompany(company)}
                          className="inline-flex px-5 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest items-center gap-2 transition-colors border border-blue-200 shadow-sm"
                        >
                          <Calendar size={14} /> Calendario
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map((company) => (
                <div 
                  key={company.id} 
                  className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl flex flex-col justify-between group hover:border-red-500 transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-red-50 rounded-2xl text-red-600 transition-colors group-hover:bg-red-600 group-hover:text-white">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded">
                          Ficha Activa
                        </span>
                        <h3 className="font-black text-slate-800 text-lg uppercase leading-tight mt-1 tracking-tight">
                          {company.nombre}
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs font-bold text-slate-600 uppercase">
                      <p className="flex items-center gap-2 text-slate-400">
                        <MapPin size={14} className="shrink-0" /> 
                        <span className="text-slate-600 normal-case font-bold leading-tight">
                          {company.direccion}
                        </span>
                      </p>
                      <p className="flex items-center gap-2 text-slate-400">
                        <User size={14} className="shrink-0" /> 
                        Contacto: <span className="text-slate-700 font-black">
                          {company.encargado_nombre || company.responsable || 'No asignado'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectCompany(company)}
                    className="mt-6 w-full py-4 bg-slate-900 hover:bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md"
                  >
                    <Calendar size={14} /> Ver Calendario IPM 
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* MODAL ELEGANTE TLETL PARA CONFIRMAR SUSPENSIÓN */}
      {showConfirmModal && selectedCompanyAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowConfirmModal(false)} />
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col border-t-8 border-red-600 animate-in zoom-in-95 duration-200 text-center">
            
            <div className="bg-red-50 p-8 flex flex-col items-center justify-center border-b border-red-100">
              <ShieldAlert size={64} className="text-red-600 mb-4 animate-pulse" />
              <h3 className="font-black uppercase tracking-tighter text-2xl text-slate-900 leading-none">
                {selectedCompanyAction.is_active !== false ? '¿Bloquear Acceso?' : '¿Reactivar Cuenta?'}
              </h3>
            </div>
            
            <div className="p-8">
              <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase">
                {selectedCompanyAction.is_active !== false 
                  ? `Estás a punto de suspender las licencias operativas de la empresa `
                  : `Se reactivarán los servicios en la nube para `}
                <span className="text-red-600 font-black block text-lg mt-2">{selectedCompanyAction.nombre}</span>
              </p>
              
              <div className="mt-6 p-4 bg-slate-100 rounded-xl border border-slate-200 text-left">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Impacto del Estatus</p>
                <p className="text-[11px] font-bold text-slate-700">
                  {selectedCompanyAction.is_active !== false 
                    ? "Los técnicos, gerentes y administradores asignados a esta sucursal perderán acceso total a la plataforma web de inmediato."
                    : "Los usuarios recuperarán el acceso a sus reportes y calendarios de inspección."}
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className="flex-1 bg-white border border-slate-200 text-slate-500 font-black text-[10px] py-4 rounded-xl uppercase tracking-wider hover:bg-slate-100 transition-all shadow-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmPaymentStatus}
                className="flex-[2] bg-slate-900 hover:bg-red-600 text-white font-black text-[10px] py-4 rounded-xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                Confirmar Acción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}