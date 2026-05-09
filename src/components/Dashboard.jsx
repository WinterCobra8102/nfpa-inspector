import React from 'react';
import { 
  Flame, ClipboardList, Map as MapIcon, 
  Users, Settings, CloudSync, AlertOctagon,
  ChevronRight, ArrowUpRight
} from 'lucide-react';

export default function Dashboard({ navigateTo, stats }) {
  // Los botones del grid ya usan navigateTo(item.id), 
  // así que 'critical' ya envía la señal a App.jsx
  const menuItems = [
    { 
      id: 'form', 
      label: 'Nueva Inspección', 
      desc: 'Iniciar protocolo NFPA',
      icon: <Flame size={32} />, 
      color: 'bg-red-600',
      badge: 'NFPA 25/72'
    },
    { 
      id: 'sites', 
      label: 'Asset Radar', 
      desc: 'Mapa de activos en vivo',
      icon: <MapIcon size={32} />, 
      color: 'bg-slate-900',
      count: stats?.totalAssets || 0
    },
    { 
      id: 'list', 
      label: 'Historial Técnico', 
      desc: 'Reportes y PDF',
      icon: <ClipboardList size={32} />, 
      color: 'bg-slate-800',
      count: stats?.totalReports || 0
    },
    { 
      id: 'critical', 
      label: 'Hallazgos Críticos', 
      desc: 'Urgencias detectadas',
      icon: <AlertOctagon size={32} />, 
      color: 'bg-orange-600',
      count: stats?.criticals || 0
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER DE BIENVENIDA */}
      <div className="flex justify-between items-end pt-4">
        <div>
          <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-1">Ingeniería Tletl</p>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Panel de Control</h1>
        </div>
        <div className="text-right">
           <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-green-700 uppercase">Sistema Operativo</span>
           </div>
        </div>
      </div>

      {/* ESTADO DE SINCRONIZACIÓN (CORREGIDO: Ahora navega al historial) */}
      <div 
        onClick={() => navigateTo('list')}
        className="bg-white border-2 border-slate-100 p-6 rounded-[2.5rem] shadow-sm flex items-center justify-between group active:scale-95 transition-all cursor-pointer hover:border-blue-400"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <CloudSync size={24} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase">Historial de Reportes</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stats?.pendingSync || 0} reportes pendientes</p>
          </div>
        </div>
        <ArrowUpRight className="text-slate-300 group-hover:text-blue-600 transition-colors" />
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigateTo(item.id)}
            className="relative overflow-hidden bg-white border-2 border-slate-50 p-6 rounded-[2.5rem] text-left shadow-xl shadow-slate-200/50 hover:border-red-600 transition-all group active:scale-95"
          >
            <div className={`inline-flex p-4 rounded-[1.5rem] ${item.color} text-white mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
              {item.icon}
            </div>
            
            <div className="space-y-1">
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">{item.label}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase">{item.desc}</p>
            </div>

            {item.count !== undefined && (
              <div className="absolute top-6 right-6">
                <span className="text-2xl font-black text-slate-200 group-hover:text-red-100 transition-colors">
                  {item.count.toString().padStart(2, '0')}
                </span>
              </div>
            )}
            {item.badge && (
               <div className="absolute top-6 right-6 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded-md">
                 {item.badge}
               </div>
            )}
          </button>
        ))}
      </div>

      {/* EQUIPO */}
      <div className="space-y-4 pt-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Gestión de Equipo</h4>
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
          {['Isai Moo', 'Ing. Residente'].map((name, i) => (
            <div key={i} className="p-5 flex items-center justify-between border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-black text-[10px]">
                  {name.charAt(0)}
                </div>
                <span className="text-xs font-black text-slate-700 uppercase">{name}</span>
              </div>
              <span className="text-[8px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-md">ACTIVO</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}