import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Building2, MapPin, Calendar, ArrowRight, User } from 'lucide-react';

export default function CompaniesView({ onSelectCompany, currentUser }) {
  
  // --- GESTIÓN DE PRIVACIDAD MAESTRA (OFFLINE-READY Y BLINDADO) ---
  // Evaluamos el rol del usuario en tiempo de ejecución. Si es MANAGER, filtramos localmente en Dexie
  // para que solo tenga visibilidad e interacción con su propia sucursal asignada.
  const companies = useLiveQuery(async () => {
    if (!db || !db.clientes) return [];
    
    const isAdmin = currentUser?.role === 'ADMIN';
    const isManager = currentUser?.role === 'MANAGER';

    if (isManager) {
      if (currentUser?.client_id) {
        // Trae exclusivamente la empresa vinculada al Jefe de Sucursal
        return await db.clientes.where('id').equals(currentUser.client_id).toArray();
      }
      // Si un manager por error no tiene ID de cliente, le escupimos un arreglo vacío por pura seguridad
      return [];
    }

    // Si eres el ADMIN general, sigue barriendo el directorio de manera global
    return await db.clientes.orderBy('nombre').toArray();
  }, [currentUser]);

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
          {currentUser?.role === 'MANAGER' 
            ? "Mi sucursal asignada para el control del cronograma normativo"
            : "Selecciona una sucursal para gestionar su cronograma de mantenimiento normativo"
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
            {currentUser?.role === 'MANAGER'
              ? "Solicita al administrador global que asigne tu ID de sucursal en la ficha de equipo."
              : "Ve al apartado de 'Ubicación de Sites' para registrar una nueva sucursal con Google Maps."
            }
          </p>
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
    </div>
  );
}