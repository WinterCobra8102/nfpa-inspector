import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { 
  AlertOctagon, 
  FileDown, 
  MapPin, 
  ShieldAlert,
  Clock,
  ChevronLeft, // Importado para el botón de regreso
  Activity
} from 'lucide-react';
import { generatePDF } from '../utils/pdfGenerator';

// AÑADIMOS 'navigateTo' como prop
export default function CriticalFindings({ navigateTo }) { 
  
  const criticalReports = useLiveQuery(() => 
    db.inspections
      .filter(report => report.overallStatus === 'CRÍTICO')
      .reverse()
      .toArray()
  );

  if (!criticalReports) return (
    <div className="flex flex-col items-center justify-center p-20 text-red-600 animate-pulse">
      <Activity size={48} className="mb-4" />
      <p className="font-black uppercase text-xs tracking-[0.3em]">Escaneando Riesgos...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* BOTÓN DE REGRESO FUERA DEL HEADER PARA MÁS CLARIDAD */}
      <div className="px-4 pt-4">
        <button 
          onClick={() => navigateTo('home')}
          className="flex items-center gap-2 text-slate-400 hover:text-red-600 transition-all group"
        >
          <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:border-red-100">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Volver al Panel</span>
        </button>
      </div>

      {/* HEADER DE EMERGENCIA */}
      <div className="bg-red-600 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 scale-150">
          <AlertOctagon size={120} />
        </div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-xl border border-white/30 shadow-inner">
            <ShieldAlert size={36} />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Panel de Riesgos</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
              Atención Inmediata Requerida
            </p>
          </div>
        </div>
      </div>

      {/* ... (Resto del código igual) ... */}
      <div className="px-4 flex items-center justify-between">
        <span className="text-[10px] font-black text-red-600 uppercase bg-red-50 px-4 py-2 rounded-full border border-red-100 shadow-sm">
          {criticalReports.length} Hallazgos Críticos Detectados
        </span>
      </div>

      <div className="grid gap-4 px-4">
        {criticalReports.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] border-4 border-dotted border-slate-100 text-center">
            <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShieldAlert size={48} />
            </div>
            <p className="font-black uppercase text-sm text-slate-400 tracking-widest italic">Sistema libre de riesgos críticos</p>
          </div>
        ) : (
          criticalReports.map((report) => (
            <div key={report.id} className="bg-white border-2 border-red-50 rounded-[2.5rem] p-8 shadow-2xl shadow-red-900/5 hover:border-red-500 transition-all group relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-red-600"></div>
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase shadow-lg shadow-red-600/20">Crítico</span>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">{report.serviceCode}</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase leading-none tracking-tight group-hover:text-red-600 transition-colors">
                    {report.equipmentName}
                  </h3>
                  <div className="flex flex-wrap gap-5 pt-1">
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin size={16} className="text-red-500" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">
                        {report.location?.address?.split(',')[0] || 'Sin ubicación registrada'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">
                        Detectado el {new Date(report.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <button 
                    onClick={() => generatePDF(report)}
                    className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-[11px] uppercase shadow-xl hover:bg-red-600 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <FileDown size={18} /> Descargar Orden
                  </button>
                </div>
              </div>
              <div className="mt-6 p-6 bg-red-50/50 rounded-[1.5rem] border border-red-100 flex gap-4">
                <div className="shrink-0 text-red-600"><AlertOctagon size={20}/></div>
                <div>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Diagnóstico Técnico</p>
                  <p className="text-sm font-bold text-red-800 italic leading-relaxed">
                    "{report.observations || 'No se detalló el riesgo en el reporte.'}"
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