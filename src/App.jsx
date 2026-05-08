import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardCheck, 
  Settings, 
  Users, 
  MapPin,
  Menu,
  X,
  User as UserIcon,
  Wifi,
  WifiOff
} from 'lucide-react';

import NewInspection from './components/NewInspection'; 
import InspectionHistory from './components/InspectionHistory'; 
import SitesView from './components/SitesView'; 

function App() {
  const [activeTab, setActiveTab] = useState('list'); 
  const [isSidebarOpen, setSidebarOpen] = useState(true); 
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const navigateTo = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false); // Cierra el menú al elegir opción
  };

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden">
      
      {/* CAPA DE FONDO OSCURO (Solo para móvil) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR PROFESIONAL */}
      <aside className={`
        fixed inset-y-0 left-0 z-[4000] bg-[#2c3e50] text-white transition-all duration-300 transform
        ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'} 
        md:relative md:translate-x-0 ${isSidebarOpen ? 'md:w-64' : 'md:w-20'}
        flex flex-col shadow-2xl h-full
      `}>
        {/* CABECERA DEL MENÚ */}
        <div className="p-4 bg-[#3498db] flex items-center justify-between shadow-lg shrink-0">
          <div className="flex items-center gap-3">
            <ClipboardCheck size={28} className="shrink-0" />
            {(isSidebarOpen || isMobileMenuOpen) && (
              <span className="font-black text-lg tracking-tight uppercase italic">Site Inspector</span>
            )}
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1 hover:bg-white/20 rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* LISTA DE OPCIONES - Scrollable si hay muchas */}
        <nav className="flex-1 mt-4 overflow-y-auto custom-scrollbar">
          <NavItem 
            icon={<PlusCircle size={20} />} 
            label="Nueva Inspección" 
            active={activeTab === 'form'} 
            onClick={() => navigateTo('form')} 
            isOpen={isSidebarOpen || isMobileMenuOpen}
          />
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Historial de Reportes" 
            active={activeTab === 'list'} 
            onClick={() => navigateTo('list')} 
            isOpen={isSidebarOpen || isMobileMenuOpen}
          />
          <NavItem 
            icon={<MapPin size={20} />} 
            label="Sites (Mapa)" 
            active={activeTab === 'sites'} 
            onClick={() => navigateTo('sites')} 
            isOpen={isSidebarOpen || isMobileMenuOpen}
          />
          
          <div className="my-6 border-t border-gray-600/30 mx-6" />
          
          <NavItem icon={<Users size={20} />} label="Inspectores" isOpen={isSidebarOpen || isMobileMenuOpen} onClick={() => setMobileMenuOpen(false)} />
          <NavItem icon={<Settings size={20} />} label="Ajustes" isOpen={isSidebarOpen || isMobileMenuOpen} onClick={() => setMobileMenuOpen(false)} />
        </nav>

        {/* ESTATUS DE RED */}
        <div className={`p-6 bg-slate-900/50 flex items-center gap-3 text-[10px] font-black border-t border-white/5 ${isOnline ? 'text-green-400' : 'text-orange-400'}`}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {(isSidebarOpen || isMobileMenuOpen) && (
            <span className="tracking-[0.2em]">{isOnline ? 'CONEXIÓN ESTABLE' : 'MODO OFFLINE'}</span>
          )}
        </div>
      </aside>

      {/* CUERPO DE LA APP */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        
        {/* BARRA SUPERIOR (HEADER) */}
        <header className="bg-white h-16 border-b flex items-center justify-between px-4 md:px-6 shadow-sm z-[2000] shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (window.innerWidth < 768) setMobileMenuOpen(true);
                else setSidebarOpen(!isSidebarOpen);
              }} 
              className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-all active:scale-90"
            >
              <Menu size={24}/>
            </button>
            <h2 className="hidden sm:block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              Tletl Monitoring
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 border-l border-slate-100 pl-4 group cursor-pointer">
              <div className="text-right hidden xs:block">
                <p className="text-xs font-black text-slate-800 leading-none tracking-tight">Isai Moo</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Engineer</p>
              </div>
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:bg-blue-600 transition-transform group-active:scale-90">
                <UserIcon size={18} />
              </div>
            </div>
          </div>
        </header>

        {/* VISTAS DINÁMICAS */}
        <section className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0">
            {activeTab === 'form' && (
              <div className="h-full overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300">
                <NewInspection />
              </div>
            )}
            {activeTab === 'list' && (
              <div className="h-full overflow-y-auto p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
                <InspectionHistory />
              </div>
            )}
            {activeTab === 'sites' && (
              <div className="h-full w-full">
                <SitesView />
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, isOpen }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center p-4 cursor-pointer transition-all duration-200 relative group mx-2 rounded-xl mb-1
        ${active 
          ? 'bg-[#3498db] text-white shadow-lg' 
          : 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
        }`}
    >
      <div className="shrink-0">{icon}</div>
      {(isOpen) && (
        <span className="ml-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
          {label}
        </span>
      )}
      {active && <div className="absolute left-0 w-1 h-6 bg-white rounded-full ml-1" />}
    </div>
  );
}

export default App;
// Versión final Tletl