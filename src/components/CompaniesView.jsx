import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import {
  Building2,
  MapPin,
  Calendar,
  ArrowRight,
  User,
  CheckCircle2,
  XOctagon,
  X,
  ShieldAlert,
} from "lucide-react";

export default function CompaniesView({ onSelectCompany, currentUser }) {
  const isAdmin = currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "MANAGER";

  // Modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCompanyAction, setSelectedCompanyAction] = useState(null);

  // --- GESTIÓN DE PRIVACIDAD MAESTRA Y DATOS ---
  const companies = useLiveQuery(async () => {
    if (!db || !db.clientes) return [];

    if (isManager) {
      if (currentUser?.client_id) {
        return await db.clientes
          .where("id")
          .equals(currentUser.client_id)
          .toArray();
      }
      return [];
    }

    return await db.clientes.orderBy("nombre").toArray();
  }, [currentUser]);

  // --- PREPARAR SUSPENSIÓN CON MODAL ---
  const triggerPaymentStatus = (company) => {
    setSelectedCompanyAction(company);
    setShowConfirmModal(true);
  };

  // --- EJECUTAR SUSPENSIÓN REAL AL SERVIDOR Y BASE DE DATOS LOCAL ---
  const confirmPaymentStatus = async () => {
    if (!selectedCompanyAction) return;

    const newStatus = !selectedCompanyAction.is_active;
    const loadingToast = toast.loading(`Actualizando estatus de acceso...`);

    try {
      const { error } = await supabase
        .from("clientes")
        .update({ is_active: newStatus })
        .eq("id", selectedCompanyAction.id);

      if (error) throw error;

      await db.clientes.update(selectedCompanyAction.id, {
        is_active: newStatus,
      });

      toast.success(
        `Estatus actualizado. El cliente ahora está ${newStatus ? "ACTIVO" : "BLOQUEADO"}.`,
        { id: loadingToast },
      );
      setShowConfirmModal(false);
      setSelectedCompanyAction(null);
    } catch (err) {
      toast.error(`Error de servidor: ${err.message}`, { id: loadingToast });
    }
  };

  // --- CONTROL DE CARGA ASÍNCRONA ---
  if (!companies) {
    return (
      <div className="p-20 text-center font-medium text-slate-400 dark:text-slate-500 animate-pulse text-sm">
        Sincronizando directorio maestro...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-300">
      {/* ENCABEZADO */}
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Directorio de Empresas
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isManager
            ? "Mi sucursal asignada para el control del cronograma normativo"
            : isAdmin
              ? "Panel de control de licencias, estatus de cobranza y calendarios."
              : "Selecciona una sucursal para gestionar su cronograma de mantenimiento"}
        </p>
      </div>

      {companies.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-16 text-center shadow-sm flex flex-col items-center justify-center space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full border border-slate-100 dark:border-slate-700">
            <Building2
              size={32}
              className="text-slate-400 dark:text-slate-500"
              strokeWidth={1.5}
            />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            No tienes sucursales vinculadas en tu cuenta de acceso.
          </p>
        </div>
      ) : (
        <>
          {isAdmin ? (
            <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-medium uppercase">
                    <th className="px-6 py-4">Planta Corporativa</th>
                    <th className="px-6 py-4 text-center">Estatus Licencia</th>
                    <th className="px-6 py-4 text-center">
                      Control de Cobranza
                    </th>
                    <th className="px-6 py-4 text-right">Mantenimientos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                  {companies.map((company) => (
                    <tr
                      key={company.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {company.nombre}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">
                          {company.direccion}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border ${
                            company.is_active !== false
                              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                          }`}
                        >
                          {company.is_active !== false
                            ? "Servicio Activo"
                            : "Acceso Suspendido"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => triggerPaymentStatus(company)}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors border ${
                            company.is_active !== false
                              ? "bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                              : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent hover:bg-slate-800 dark:hover:bg-slate-100"
                          }`}
                        >
                          {company.is_active !== false ? (
                            <>
                              {" "}
                              <XOctagon size={14} /> Bloquear{" "}
                            </>
                          ) : (
                            <>
                              {" "}
                              <CheckCircle2 size={14} /> Reactivar{" "}
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onSelectCompany(company)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white rounded-md text-xs font-medium transition-colors border border-blue-200 dark:border-blue-800 hover:border-blue-600 dark:hover:border-blue-600"
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
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm flex flex-col justify-between group hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-500 border border-red-100 dark:border-red-900/30 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600 transition-colors">
                        <Building2 size={22} strokeWidth={1.5} />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-md border border-green-200 dark:border-green-800">
                          Ficha Activa
                        </span>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-lg leading-tight mt-1">
                          {company.nombre}
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      <p className="flex items-center gap-2">
                        <MapPin
                          size={14}
                          className="shrink-0 text-slate-400 dark:text-slate-500"
                          strokeWidth={1.5}
                        />
                        <span className="leading-tight">
                          {company.direccion}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <User
                          size={14}
                          className="shrink-0 text-slate-400 dark:text-slate-500"
                          strokeWidth={1.5}
                        />
                        Contacto:{" "}
                        <span className="font-medium text-slate-900 dark:text-white">
                          {company.encargado_nombre ||
                            company.responsable ||
                            "No asignado"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectCompany(company)}
                    className="mt-6 w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Calendar size={16} /> Ver Calendario IPM
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {showConfirmModal && selectedCompanyAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowConfirmModal(false)}
          />
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-xl relative z-10 overflow-hidden flex flex-col border-t-4 border-red-600 animate-in zoom-in-95 duration-200">
            <div className="p-8 flex flex-col items-center justify-center text-center">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full border border-red-100 dark:border-red-900/30 mb-4">
                <ShieldAlert
                  size={40}
                  className="text-red-600 dark:text-red-500"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="font-semibold text-xl text-slate-900 dark:text-white">
                {selectedCompanyAction.is_active !== false
                  ? "¿Bloquear Acceso?"
                  : "¿Reactivar Cuenta?"}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                {selectedCompanyAction.is_active !== false
                  ? `Estás a punto de suspender las licencias operativas de:`
                  : `Se reactivarán los servicios en la nube para:`}
              </p>
              <span className="text-red-600 dark:text-red-500 font-semibold text-lg mt-2 block">
                {selectedCompanyAction.nombre}
              </span>
            </div>

            <div className="px-8 pb-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Impacto del cambio
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {selectedCompanyAction.is_active !== false
                    ? "Los técnicos, gerentes y administradores asignados a esta sucursal perderán acceso total a la plataforma web de inmediato."
                    : "Los usuarios recuperarán el acceso a sus reportes y calendarios de inspección."}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium text-sm py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPaymentStatus}
                className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-3 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
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
