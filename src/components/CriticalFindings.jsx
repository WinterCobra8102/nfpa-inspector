import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import {
  AlertOctagon,
  FileDown,
  MapPin,
  ShieldAlert,
  Clock,
  ChevronLeft,
  Activity,
} from "lucide-react";
import { generatePDF } from "../utils/pdfGenerator";

export default function CriticalFindings({ onBack }) {
  // Obtenemos los reportes de forma segura con Dexie
  const criticalReports = useLiveQuery(() =>
    db.inspections
      .filter((report) => report.overallStatus === "CRÍTICO")
      .toArray(),
  );

  if (!criticalReports)
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400 dark:text-slate-500 animate-pulse">
        <Activity size={32} className="mb-4" strokeWidth={1.5} />
        <p className="font-medium text-sm">Escaneando riesgos...</p>
      </div>
    );

  // Invertimos el arreglo DESPUÉS de que Dexie lo entregó para no romper la base de datos
  const displayReports = [...criticalReports].reverse();

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 pb-20 animate-in fade-in duration-500">
      {/* BOTÓN DE REGRESO */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors group"
        >
          <ChevronLeft
            size={18}
            className="group-hover:-translate-x-1 transition-transform"
            strokeWidth={1.5}
          />
          <span className="text-sm font-medium">Volver al Panel</span>
        </button>
      </div>

      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-red-600 dark:text-red-500 border border-red-100 dark:border-red-900/30">
          <ShieldAlert size={28} strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Panel de Riesgos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Atención inmediata requerida
          </p>
        </div>
      </div>

      {/* CONTADOR */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-md border border-red-200 dark:border-red-800">
          {displayReports.length} Hallazgos Críticos Detectados
        </span>
      </div>

      {/* LISTADO DE HALLAZGOS */}
      <div className="grid gap-4">
        {displayReports.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-16 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm flex flex-col items-center justify-center space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-full border border-green-100 dark:border-green-800">
              <ShieldAlert
                size={32}
                className="text-green-500 dark:text-green-400"
                strokeWidth={1.5}
              />
            </div>
            <p className="font-medium text-sm text-slate-500 dark:text-slate-400">
              Sistema libre de riesgos críticos
            </p>
          </div>
        ) : (
          displayReports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
              <div className="flex flex-col md:flex-row justify-between gap-6 pl-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="bg-red-600 text-white text-xs font-medium px-2.5 py-1 rounded-md">
                      Crítico
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {report.formCode || report.serviceCode || "IPM"}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white leading-tight group-hover:text-red-600 transition-colors">
                    {report.equipmentName}
                  </h3>
                  <div className="flex flex-wrap gap-5 pt-1">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <MapPin
                        size={14}
                        className="text-slate-400 dark:text-slate-500"
                        strokeWidth={1.5}
                      />
                      <span className="text-sm">
                        {report.clientName || "Sin ubicación registrada"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Clock size={14} strokeWidth={1.5} />
                      <span className="text-sm">
                        Detectado el{" "}
                        {new Date(report.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => generatePDF(report)}
                    className="w-full md:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-lg font-medium text-sm hover:bg-red-600 dark:hover:bg-red-600 dark:hover:text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <FileDown size={16} /> Descargar Orden
                  </button>
                </div>
              </div>

              {/* DIAGNÓSTICO */}
              <div className="mt-5 ml-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30 flex gap-3">
                <div className="shrink-0 text-red-500 dark:text-red-400">
                  <AlertOctagon size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                    Diagnóstico Técnico
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed">
                    "
                    {report.generalObs ||
                      report.observations ||
                      "No se detalló el riesgo en el reporte."}
                    "
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}