import React, { useState, useEffect } from "react";
import {
  BookOpen,
  X,
  FileText,
  ShieldCheck,
  Droplets,
  Flame,
  Bell,
  Activity,
  ClipboardCheck,
  AlertTriangle,
  Waves,
  Search,
  Loader2,
} from "lucide-react";

// ==========================================
// CATÁLOGO MAESTRO DE NORMAS NFPA
// Rutas absolutas optimizadas (Sin espacios para Vercel)
// ==========================================
const NFPA_DOCS = [
  {
    id: "nfpa-3",
    title: "NFPA 3",
    subtitle: "Comisionamiento de Sistemas (2018)",
    desc: "Norma para el Comisionamiento de Sistemas de Protección contra Incendios y Seguridad Humana.",
    icon: ClipboardCheck,
    color: "bg-slate-700",
    file: "/docs/NFPA_3_2018_ESP.pdf",
  },
  {
    id: "nfpa-4",
    title: "NFPA 4",
    subtitle: "Prueba de Sistemas Integrados (2018)",
    desc: "Norma para la Prueba de Sistemas Integrados de Protección contra Incendios y Seguridad Humana.",
    icon: Activity,
    color: "bg-indigo-600",
    file: "/docs/NFPA_4_2018_ESP.pdf",
  },
  {
    id: "nfpa-13",
    title: "NFPA 13",
    subtitle: "Sistemas de Rociadores (2019)",
    desc: "Norma para la Instalación de Sistemas de Rociadores.",
    icon: Droplets,
    color: "bg-cyan-600",
    file: "/docs/NFPA_13_2019_ESP.pdf",
  },
  {
    id: "nfpa-25",
    title: "NFPA 25",
    subtitle: "IPM Sistemas a Base de Agua (2017)",
    desc: "Norma para la Inspección, Prueba y Mantenimiento de Sistemas de Protección contra Incendios a Base de Agua.",
    icon: ShieldCheck,
    color: "bg-blue-600",
    file: "/docs/NFPA_25_2017_ES.pdf",
  },
  {
    id: "nfpa-72",
    title: "NFPA 72",
    subtitle: "Alarmas y Señalización (2016)",
    desc: "Código Nacional de Alarmas de Incendio y Señalización.",
    icon: Bell,
    color: "bg-red-600",
    file: "/docs/NFPA_72_2016_ES.pdf",
  },
  {
    id: "nfpa-170",
    title: "NFPA 170",
    subtitle: "Símbolos de Seguridad (2018)",
    desc: "Norma para Símbolos de Emergencia y Seguridad contra Incendios.",
    icon: AlertTriangle,
    color: "bg-yellow-500",
    file: "/docs/NFPA_170_2018_ES.pdf",
  },
  {
    id: "nfpa-704",
    title: "NFPA 704",
    subtitle: "Peligros de Materiales (2022)",
    desc: "Sistema Estándar para la Identificación de los Peligros de Materiales para Respuesta a Emergencias.",
    icon: Flame,
    color: "bg-orange-500",
    file: "/docs/NFPA_704_2022_ESP.pdf",
  },
  {
    id: "nfpa-1962-2018",
    title: "NFPA 1962",
    subtitle: "Mangueras y Boquillas (2018)",
    desc: "Estándar para el Cuidado, Uso, Inspección, Prueba de Servicio y Reemplazo de Mangueras, Acoplamientos y Boquillas.",
    icon: Waves,
    color: "bg-teal-600",
    file: "/docs/NFPA_1962_2018_ESP.pdf",
  },
  {
    id: "nfpa-1962-2008",
    title: "NFPA 1962",
    subtitle: "Mangueras y Boquillas (2008)",
    desc: "Norma para la Inspección, Cuidado y Uso de la Manguera contra Incendios (Edición Antigua).",
    icon: Waves,
    color: "bg-teal-800",
    file: "/docs/NFPA_1962_2008_ESP.pdf",
  },
];

// ==========================================
// COMPONENTE OPTIMIZADO PARA CARGA DE PDF
// ==========================================
const PDFViewer = ({ doc, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  // Truco para forzar al navegador a limpiar memoria al desmontar
  useEffect(() => {
    return () => setIsLoading(true);
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex flex-col animate-in fade-in duration-200">
      {/* Topbar del visor */}
      <div className="bg-slate-900 px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-3 text-white">
          <div className={`${doc.color} p-2 rounded-lg`}>
            <doc.icon size={18} />
          </div>
          <div className="hidden sm:block">
            <h3 className="font-semibold text-base leading-none">
              {doc.title}
            </h3>
            <span className="text-xs text-slate-400 mt-0.5">
              {doc.subtitle}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm active:scale-95 flex items-center gap-2"
          title="Cerrar Visor"
        >
          <span className="text-sm font-medium hidden md:inline">
            Cerrar Visor
          </span>
          <X size={18} />
        </button>
      </div>

      {/* Contenedor Principal Optimizado */}
      <div className="flex-1 w-full bg-[#323639] relative overflow-hidden flex items-center justify-center">
        {/* Pantalla de Carga Fluida */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#323639] z-10 animate-pulse">
            <Loader2 size={48} className="text-slate-400 animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">
              Preparando Documento
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Optimizando rendimiento...
            </p>
          </div>
        )}

        {/* Iframe Blindado */}
        {/* Usamos toolbar=0 para algunos navegadores y #view=FitH para forzar un renderizado vertical suave */}
        <iframe
          src={`${doc.file}#toolbar=0&view=FitH`}
          className={`w-full h-full border-none relative z-0 transition-opacity duration-500 ${isLoading ? "opacity-0" : "opacity-100"}`}
          title={`Visor PDF ${doc.title}`}
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function NFPALibrary() {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDocs = NFPA_DOCS.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.desc.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* HEADER Y BUSCADOR */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-4 shrink-0">
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
            <BookOpen size={28} className="text-red-600 dark:text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Parámetros NFPA
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Biblioteca Digital de Normativas Oficiales
            </p>
          </div>
        </div>

        {/* Buscador en Tiempo Real */}
        <div className="relative flex-1 max-w-xl w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400 dark:text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar por norma, tema o palabra clave (Ej: Rociadores, 72, Mangueras)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* RESULTADOS DEL FILTRO */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <Search
            size={40}
            className="text-slate-200 dark:text-slate-700 mb-4"
          />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            No se encontraron resultados
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Intenta con otros términos de búsqueda para "{searchTerm}".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredDocs.map((doc) => {
            const IconComponent = doc.icon;
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 cursor-pointer group flex flex-col h-full relative overflow-hidden"
              >
                {/* Decoración de fondo sutil */}
                <div
                  className={`absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity ${doc.color.replace("bg-", "text-")}`}
                >
                  <IconComponent size={120} />
                </div>

                <div className="relative z-10 flex-1">
                  <div
                    className={`${doc.color} w-11 h-11 rounded-lg flex items-center justify-center text-white mb-4 shadow-sm group-hover:scale-105 transition-transform`}
                  >
                    <IconComponent size={18} />
                  </div>

                  <h3 className="font-semibold text-xl text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
                    {doc.subtitle}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {doc.desc}
                  </p>
                </div>

                <div className="relative z-10 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">
                  <span className="text-xs font-medium">Abrir Visor</span>
                  <FileText size={16} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RENDERIZADO DEL VISOR OPTIMIZADO */}
      {selectedDoc && (
        <PDFViewer doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}
