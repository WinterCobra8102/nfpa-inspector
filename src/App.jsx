import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks'; 
import { db } from './db';
import { supabase } from './supabaseClient'; 
import { Toaster } from 'react-hot-toast'; // <-- 1. IMPORTAMOS TOAST
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
  WifiOff,
  ShieldAlert,
  Flame,
  LayoutGrid,
  LogOut 
} from 'lucide-react';

import Login from './components/Login'; 
import Dashboard from './components/Dashboard'; 
import NewInspection from './components/NewInspection'; 
import InspectionHistory from './components/InspectionHistory'; 
import SitesView from './components/SitesView'; 
import CriticalFindings from './components/CriticalFindings'; 
import UserProfile from './components/UserProfile'; 
import StaffManagement from './components/StaffManagement'; 

function App() {
  // --- ESTADO DE AUTENTICACIÓN Y CARGA ---
  const [currentUser, setCurrentUser] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true); // Control de Splash Screen
  const [activeTab, setActiveTab] = useState('home'); 
  const [isSidebarOpen, setSidebarOpen] = useState(true); 
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // --- PERSISTENCIA DE SESIÓN Y ROLES ---
  useEffect(() => {
    const fetchProfile = async (userId) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (!error && data) {
        setCurrentUser(data);
      }
      setIsInitializing(false); // Quitar Splash Screen tras cargar perfil
    };

    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetchProfile(session.user.id);
        } else {
          setIsInitializing(false); // No hay sesión, ir directo al Login
        }
      } catch (error) {
        setIsInitializing(false);
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setIsInitializing(false);
      }
    });

    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // --- LÓGICA DE DATOS FILTRADA POR ROL ---
  const inspections = useLiveQuery(() => db.inspections.toArray());

  const visibleInspections = inspections?.filter(i => {
    if (!currentUser) return false;
    if (currentUser.role === 'CLIENTE') return i.clientId === currentUser.client_id;
    return true; 
  });

  const stats = {
    totalReports: visibleInspections?.length || 0,
    pendingSync: visibleInspections?.filter(i => !i.synced).length || 0,
    criticals: visibleInspections?.filter(i => i.overallStatus === 'CRÍTICO').length || 0,
    totalAssets: visibleInspections ? [...new Set(visibleInspections.map(i => i.equipmentName))].length : 0
  };

  const navigateTo = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setActiveTab('home');
  };

  // --- CONFIGURACIÓN GLOBAL DE ALERTAS (DISEÑO TLETL) ---
  const GlobalToaster = (
    <Toaster 
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#0f172a', // Fondo oscuro (slate-900)
          color: '#f8fafc', // Letra blanca
          border: '2px solid #1e293b', // Borde slate-800
          borderRadius: '1.5rem',
          fontWeight: '900',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: '#0f172a' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#0f172a' },
        },
      }}
    />
  );

  // --- 1. RENDERIZADO DE SPLASH SCREEN (Evita el parpadeo) ---
  if (isInitializing) {
    return (
      <>
        {GlobalToaster}
        <div className="h-screen w-screen bg-[#1a1a1a] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-red-600 blur-[120px] opacity-10 animate-pulse"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <Flame size={80} className="text-white animate-bounce mb-4" />
            <h2 className="text-white font-black text-3xl tracking-[0.4em] uppercase leading-none">TLETL</h2>
            <p className="text-red-600 text-[8px] font-black uppercase tracking-[0.5em] mt-3 opacity-80">
              Sincronizando Sistemas
            </p>
            
            <div className="w-24 h-1 bg-white/5 mt-6 rounded-full overflow-hidden border border-white/10">
              <div className="w-full h-full bg-red-600 animate-infinite-scroll"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- 2. PUERTA DE SEGURIDAD (LOGIN) ---
  if (!currentUser) {
    return (
      <>
        {GlobalToaster}
        <Login onLoginSuccess={setCurrentUser} />
      </>
    );
  }

  // --- 3. APLICACIÓN PRINCIPAL ---
  return (
    <>
      {GlobalToaster}
      <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden animate-in fade-in duration-700">
        
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[5999] md:hidden transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside className={`
          fixed inset-y-0 left-0 z-[6000] bg-[#1a1a1a] text-white transition-all duration-300 transform
          ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'} 
          md:relative md:translate-x-0 ${isSidebarOpen ? 'md:w-64' : 'md:w-20'}
          flex flex-col shadow-2xl h-full border-r border-white/5
        `}>
          <div className="p-4 bg-red-600 flex items-center justify-between shadow-lg shrink-0 overflow-hidden">
            <div className="flex items-center gap-3">
              <Flame size={28} className="shrink-0 text-white animate-pulse" />
              {(isSidebarOpen || isMobileMenuOpen) && (
                <div className="flex flex-col">
                  <span className="font-black text-lg tracking-tighter uppercase leading-none">TLETL</span>
                  <span className="text-[8px] font-bold tracking-[0.2em] opacity-80 uppercase">Fire Systems</span>
                </div>
              )}
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1 hover:bg-black/20 rounded-lg">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 mt-6 overflow-y-auto custom-scrollbar flex flex-col">
            <NavItem 
              icon={<LayoutGrid size={20} />} 
              label="Panel Principal" 
              active={activeTab === 'home'} 
              onClick={() => navigateTo('home')} 
              isOpen={isSidebarOpen || isMobileMenuOpen}
            />
            
            {['ADMIN', 'STAFF'].includes(currentUser.role) && (
              <NavItem 
                icon={<PlusCircle size={20} />} 
                label="Nueva Inspección" 
                active={activeTab === 'form'} 
                onClick={() => navigateTo('form')} 
                isOpen={isSidebarOpen || isMobileMenuOpen}
              />
            )}

            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label={currentUser.role === 'CLIENTE' ? "Mis Reportes" : "Historial Técnico"} 
              active={activeTab === 'list'} 
              onClick={() => navigateTo('list')} 
              isOpen={isSidebarOpen || isMobileMenuOpen}
            />
            
            <NavItem 
              icon={<MapPin size={20} />} 
              label="Ubicación de Sites" 
              active={activeTab === 'sites'} 
              onClick={() => navigateTo('sites')} 
              isOpen={isSidebarOpen || isMobileMenuOpen}
            />
            
            <div className="my-6 border-t border-white/10 mx-6" />
            
            {currentUser.role === 'ADMIN' && (
              <>
                <NavItem 
                  icon={<Users size={20} />} 
                  label="Inspectores" 
                  active={activeTab === 'staff'}
                  onClick={() => navigateTo('staff')}
                  isOpen={isSidebarOpen || isMobileMenuOpen} 
                />
                <NavItem icon={<Settings size={20} />} label="Parámetros NFPA" isOpen={isSidebarOpen || isMobileMenuOpen} />
              </>
            )}

            <div className="mt-auto mb-4">
               <NavItem 
                  icon={<LogOut size={20} className="text-red-400" />} 
                  label="Cerrar Sesión" 
                  onClick={handleLogout}
                  isOpen={isSidebarOpen || isMobileMenuOpen}
               />
            </div>
          </nav>

          <div className={`p-6 bg-black/40 flex items-center gap-3 text-[9px] font-black border-t border-white/5 ${isOnline ? 'text-green-400' : 'text-orange-400'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {(isSidebarOpen || isMobileMenuOpen) && (
              <span className="tracking-[0.2em]">{isOnline ? 'SISTEMA ONLINE' : 'SISTEMA OFFLINE'}</span>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
          
          <header className="bg-white h-16 border-b flex items-center justify-between px-4 md:px-6 shadow-sm z-[2000] shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  if (window.innerWidth < 768) setMobileMenuOpen(true);
                  else setSidebarOpen(!isSidebarOpen);
                }} 
                className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-600 transition-all active:scale-90"
              >
                <Menu size={24}/>
              </button>
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-600 hidden sm:block" />
                <h2 className="hidden sm:block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  {currentUser.role} ACCESS <span className="text-red-600">v2.0</span>
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div 
                onClick={() => navigateTo('profile')}
                className="flex items-center gap-3 border-l border-slate-100 pl-4 group cursor-pointer"
              >
                <div className="text-right hidden xs:block">
                  <p className="text-xs font-black text-slate-800 leading-none tracking-tight uppercase group-hover:text-red-600 transition-colors">
                    {currentUser.full_name || currentUser.email}
                  </p>
                  <p className="text-[9px] text-red-600 font-black uppercase mt-1">{currentUser.role}</p>
                </div>
                <div className="w-10 h-10 bg-[#1a1a1a] rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:bg-red-600 transition-all group-active:scale-90">
                  <UserIcon size={18} />
                </div>
              </div>
            </div>
          </header>

          <section className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0">
              {activeTab === 'home' && (
                <div className="h-full overflow-y-auto">
                  <Dashboard navigateTo={navigateTo} stats={stats} />
                </div>
              )}
              
              {activeTab === 'form' && ['ADMIN', 'STAFF'].includes(currentUser.role) && (
                <div className="h-full overflow-y-auto p-4 md:p-8 animate-in fade-in zoom-in-95 duration-300">
                  <NewInspection navigateTo={navigateTo} />
                </div>
              )}

              {activeTab === 'list' && (
                <div className="h-full overflow-y-auto p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
                  <InspectionHistory navigateTo={navigateTo} currentUser={currentUser} />
                </div>
              )}

              {activeTab === 'critical' && (
                <div className="h-full overflow-y-auto">
                  <CriticalFindings navigateTo={navigateTo} currentUser={currentUser} />
                </div>
              )}

              {activeTab === 'sites' && (
                <div className="h-full w-full">
                  <SitesView currentUser={currentUser} />
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="h-full overflow-y-auto p-4 md:p-8">
                  <UserProfile 
                    currentUser={currentUser} 
                    setCurrentUser={setCurrentUser} 
                    navigateTo={navigateTo} 
                  />
                </div>
              )}

              {activeTab === 'staff' && currentUser.role === 'ADMIN' && (
                <div className="h-full overflow-y-auto">
                  <StaffManagement currentUser={currentUser} />
                </div>
              )}
            </div>
          </section>

        </main>
      </div>
    </>
  );
}

function NavItem({ icon, label, active, onClick, isOpen }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center p-4 cursor-pointer transition-all duration-200 relative group mx-2 rounded-xl mb-1
        ${active 
          ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' 
          : 'hover:bg-white/5 text-slate-400 hover:text-white'
        }`}
    >
      <div className={`shrink-0 ${active ? 'scale-110' : 'group-hover:text-red-500'} transition-transform`}>
        {icon}
      </div>
      {(isOpen) && (
        <span className="ml-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
          {label}
        </span>
      )}
      {active && (
        <div className="absolute left-0 w-1.5 h-5 bg-white rounded-full ml-1 animate-in fade-in duration-500" />
      )}
    </div>
  );
}

export default App;