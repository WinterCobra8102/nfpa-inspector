import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { Building2, MapPin, Calendar, ArrowRight, User, CheckCircle2, XOctagon } from 'lucide-react';

export default function CompaniesView({ onSelectCompany, currentUser }) {
  
  const isAdmin = currentUser?.role === 'ADMIN';
  const isManager = currentUser?.role === 'MANAGER';

  // --- GESTIÓN DE PRIVACIDAD MAESTRA Y DATOS ---
  const companies = useLiveQuery(async () => {
    if (!db || !db.clientes) return [];
    
    if (isManager) {
      if (currentUser?.client_id) {
        // Trae exclusivamente la empresa vinculada al Jefe de Sucursal
        return await db.clientes.where('id').equals(currentUser.client_id).toArray();
      }
      return [];
    }

    // Si eres el ADMIN general, barriendo el directorio global
    return await db.clientes.orderBy('nombre').toArray();
  }, [currentUser]);

  // --- CONTROL DE PAGOS / SUSPENSIÓN (SÓLO ADMIN) ---
  const togglePaymentStatus = async (companyId, currentStatus) => {
    const actionText = currentStatus ? "SUSPENDER" : "HABILITAR";
    
    if (window.confirm(`¿Está seguro de que desea ${actionText} el acceso a este cliente?`)) {
      try {
        const { error } = await supabase
          .from('clientes')
          .update({ is_active: !currentStatus })
          .eq('id', companyId);

        if (!error) {
          // Actualizamos la base de datos local para que la UI se refresque instantáneamente
          await db.clientes.update(companyId, { is_active: !currentStatus });
          toast.success(`Estatus actualizado: Cliente ${actionText === 'SUSPENDER' ? 'bloqueado' : 'activo'}`);
        } else {
          toast.error("Error al sincronizar con el servidor de licencias.");
        }
      } catch (err) {
        toast.error("Ocurrió un error de conexión.");
      }
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

      {/* RENDERIZADO EN CASO DE TABLA VACÍA */}
      {companies.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-12 text-center shadow-sm">
          <Building2 size={40} className="mx-auto text-slate-300 mb-3 animate-pulse" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
            No tienes sucursales vinculadas en tu cuenta de acceso.
          </p>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
            {isManager
              ? "Solicita al administrador global que asigne tu ID de sucursal en la ficha de equipo."
              : "Ve al apartado de 'Ubicación de Sites' para registrar una nueva sucursal con Google Maps."
            }
          </p>
        </div>
      ) : (
        <>
          {/* ========================================== */}
          {/* VISTA PARA ADMINISTRADORES: GESTIÓN DE LICENCIAS */}
          {/* ========================================== */}
          {isAdmin ? (
            <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-black text-slate-600 uppercase tracking-widest text-[9px]">
                    <th className="p-4">Planta Corporativa</th>
                    <th className="p-4 text-center">Estatus Licencia</th>
                    <th className="p-4 text-center">Control de Cobranza</th>
                    <th className="p-4 text-right">Mantenimientos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-900 uppercase text-xs">{company.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate max-w-xs">{company.direccion}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                          company.is_active !== false 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {company.is_active !== false ? 'Activo / Pagado' : 'Suspendido'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => togglePaymentStatus(company.id, company.is_active !== false)}
                          className={`mx-auto px-4 py-2 rounded font-black uppercase text-[9px] tracking-widest transition-all shadow-sm flex items-center gap-1.5 border active:scale-95 ${
                            company.is_active !== false
                              ? 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300'
                              : 'bg-slate-900 text-white border-transparent hover:bg-blue-600 shadow-lg'
                          }`}
                        >
                          {company.is_active !== false ? (
                            <> <XOctagon size={14}/> Suspender Servicio </>
                          ) : (
                            <> <CheckCircle2 size={14}/> Reactivar Acceso </>
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => onSelectCompany(company)}
                          className="inline-flex px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded font-black text-[9px] uppercase tracking-widest items-center gap-2 transition-colors border border-blue-200"
                        >
                          <Calendar size={12} /> Calendario IPM
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            
            /* ========================================== */
            /* VISTA ESTÁNDAR: TARJETAS (MANAGER/STAFF)  */
            /* ========================================== */
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
    </div>
  );
}