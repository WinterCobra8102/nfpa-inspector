import React, { useState } from 'react';
import { 
  BookOpen, X, FileText, ShieldCheck, 
  Droplets, Flame, Bell, Activity, ClipboardCheck, 
  AlertTriangle, Waves, Search 
} from 'lucide-react';

// Catálogo maestro de documentos NFPA
const NFPA_DOCS = [
  { 
    id: 'nfpa-3', 
    title: 'NFPA 3', 
    subtitle: 'Comisionamiento de Sistemas (2018)', 
    desc: 'Norma para el Comisionamiento de Sistemas de Protección contra Incendios y Seguridad Humana.', 
    icon: ClipboardCheck, 
    color: 'bg-slate-700', 
    file: '/docs/NFPA 3 2018 ESP.pdf' 
  },
  { 
    id: 'nfpa-4', 
    title: 'NFPA 4', 
    subtitle: 'Prueba de Sistemas Integrados (2018)', 
    desc: 'Norma para la Prueba de Sistemas Integrados de Protección contra Incendios y Seguridad Humana.', 
    icon: Activity, 
    color: 'bg-indigo-600', 
    file: '/docs/NFPA 4 2018 ESP.pdf' 
  },
  { 
    id: 'nfpa-13', 
    title: 'NFPA 13', 
    subtitle: 'Sistemas de Rociadores (2019)', 
    desc: 'Norma para la Instalación de Sistemas de Rociadores.', 
    icon: Droplets, 
    color: 'bg-cyan-600', 
    file: '/docs/NFPA 13 2019 ESP.pdf' 
  },
  { 
    id: 'nfpa-25', 
    title: 'NFPA 25', 
    subtitle: 'IPM Sistemas a Base de Agua (2017)', 
    desc: 'Norma para la Inspección, Prueba y Mantenimiento de Sistemas de Protección contra Incendios a Base de Agua.', 
    icon: ShieldCheck, 
    color: 'bg-blue-600', 
    file: '/docs/NFPA 25 2017 ES.pdf' 
  },
  { 
    id: 'nfpa-72', 
    title: 'NFPA 72', 
    subtitle: 'Alarmas y Señalización (2016)', 
    desc: 'Código Nacional de Alarmas de Incendio y Señalización.', 
    icon: Bell, 
    color: 'bg-red-600', 
    file: '/docs/NFPA 72 2016 ES.pdf' 
  },
  { 
    id: 'nfpa-170', 
    title: 'NFPA 170', 
    subtitle: 'Símbolos de Seguridad (2018)', 
    desc: 'Norma para Símbolos de Emergencia y Seguridad contra Incendios.', 
    icon: AlertTriangle, 
    color: 'bg-yellow-500', 
    file: '/docs/NFPA 170 2018 - ES.pdf' 
  },
  { 
    id: 'nfpa-704', 
    title: 'NFPA 704', 
    subtitle: 'Peligros de Materiales (2022)', 
    desc: 'Sistema Estándar para la Identificación de los Peligros de Materiales para Respuesta a Emergencias.', 
    icon: Flame, 
    color: 'bg-orange-500', 
    file: '/docs/NFPA 704 2022 ESP.pdf' 
  },
  { 
    id: 'nfpa-1962-2018', 
    title: 'NFPA 1962', 
    subtitle: 'Mangueras y Boquillas (2018)', 
    desc: 'Estándar para el Cuidado, Uso, Inspección, Prueba de Servicio y Reemplazo de Mangueras, Acoplamientos y Boquillas.', 
    icon: Waves, 
    color: 'bg-teal-600', 
    file: '/docs/NFPA 1962 2018 ESP.pdf' 
  },
  { 
    id: 'nfpa-1962-2008', 
    title: 'NFPA 1962', 
    subtitle: 'Mangueras y Boquillas (2008)', 
    desc: 'Norma para la Inspección, Cuidado y Uso de la Manguera contra Incendios (Edición Antigua).', 
    icon: Waves, 
    color: 'bg-teal-800', 
    file: '/docs/NFPA 1962 2008 ESP.pdf' 
  }
];

export default function NFPALibrary() {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Lógica de filtrado en tiempo real
  const filteredDocs = NFPA_DOCS.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER Y BUSCADOR */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-4 shrink-0">
          <div className="bg-slate-900 p-4 rounded-xl text-white shadow-md">
            <BookOpen size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none text-slate-800">Parámetros NFPA</h2>
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1">Biblioteca Digital de Normativas Oficiales</p>
          </div>
        </div>

        {/* Buscador en Tiempo Real */}
        <div className="relative flex-1 max-w-xl w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por norma, tema o palabra clave (Ej: Rociadores, 72, Mangueras)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-100 transition-all shadow-inner placeholder:text-slate-400"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* RESULTADOS DEL FILTRO */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <Search size={48} className="text-slate-200 mb-4" />
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">No se encontraron resultados</h3>
          <p className="text-xs font-bold text-slate-400 mt-2">Intenta con otros términos de búsqueda para "{searchTerm}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocs.map((doc) => {
            const IconComponent = doc.icon;
            return (
              <div 
                key={doc.id} 
                onClick={() => setSelectedDoc(doc)}
                className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-500 transition-all duration-300 cursor-pointer group flex flex-col h-full relative overflow-hidden"
              >
                {/* Decoración de fondo sutil */}
                <div className={`absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-10 transition-opacity ${doc.color.replace('bg-', 'text-')}`}>
                  <IconComponent size={120} />
                </div>

                <div className="relative z-10 flex-1">
                  <div className={`${doc.color} w-12 h-12 rounded-xl flex items-center justify-center text-white mb-5 shadow-md group-hover:scale-110 transition-transform`}>
                    <IconComponent size={20} />
                  </div>
                  
                  <h3 className="font-black text-2xl text-slate-800 tracking-tight leading-none mb-1">{doc.title}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{doc.subtitle}</p>
                  <p className="text-xs font-bold text-slate-500 leading-snug line-clamp-3">{doc.desc}</p>
                </div>
                
                <div className="relative z-10 mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-slate-400 group-hover:text-blue-600 transition-colors">
                  <span className="text-[9px] font-black uppercase tracking-widest">Abrir Visor</span>
                  <FileText size={16} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL VISOR DE PDF A PANTALLA COMPLETA */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex flex-col animate-in zoom-in-95 duration-200">
          
          {/* Topbar del visor (Limpiado y simplificado) */}
          <div className="bg-slate-900 p-4 border-b border-white/10 flex items-center justify-between shrink-0 shadow-2xl z-10">
            <div className="flex items-center gap-4 text-white">
              <div className={`${selectedDoc.color} p-2.5 rounded-lg shadow-inner`}>
                <selectedDoc.icon size={20} />
              </div>
              <div className="hidden sm:block">
                <h3 className="font-black text-lg md:text-xl uppercase leading-none tracking-tight">{selectedDoc.title}</h3>
                <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedDoc.subtitle}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedDoc(null)} 
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors shadow-lg active:scale-95 flex items-center gap-2"
                title="Cerrar Visor"
              >
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Cerrar Visor</span>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Contenedor del Iframe */}
          <div className="flex-1 w-full bg-[#525659] relative overflow-hidden flex items-center justify-center">
            {/* Fallback visual por si tarda en cargar */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 -z-10">
              <FileText size={64} className="mb-4 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest">Cargando Documento Seguro...</span>
            </div>
            
            <iframe 
              src={`${selectedDoc.file}#view=FitH`} 
              className="w-full h-full border-none relative z-10"
              loading="lazy"
              title={`Visor PDF ${selectedDoc.title}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}