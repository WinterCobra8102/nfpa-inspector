import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks'; 
import { db } from './db';
import { supabase } from './supabaseClient'; 
import { Toaster } from 'react-hot-toast'; 
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
  LogOut,
  Calendar,
  Building2,
  Activity,
  MessageSquare,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';

import Login from './components/Login'; 
import Dashboard from './components/Dashboard'; 
import NewInspection from './components/NewInspection'; 
import InspectionHistory from './components/InspectionHistory'; 
import SitesView from './components/SitesView'; 
import CriticalFindings from './components/CriticalFindings'; 
import UserProfile from './components/UserProfile'; 
import StaffManagement from './components/StaffManagement';
import IPMCalendar from './components/IPMCalendar'; 
import CompaniesView from './components/CompaniesView';
import NFPALibrary from './components/NFPALibrary'; 
import PumpEfficiency from './components/PumpEfficiency';

import AdminServiceRequests from './components/AdminServiceRequests';
import StaffServiceRequests from './components/StaffServiceRequests';
import ClientServiceRequests from './components/ClientServiceRequests';

function App() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true); 
  const [activeTab, setActiveTab] = useState('home'); 
  const [isSidebarOpen, setSidebarOpen] = useState(true); 
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isCompanyActive, setIsCompanyActive] = useState(true);
  const [inspectionData, setInspectionData] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null); 

  // --- ESTADO PARA DARK MODE ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  // --- EFECTO PARA APLICAR CLASE DARK AL HTML ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const fetchProfile = async (userId) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (!error && data) {
        setCurrentUser(data);

        if (data.client_id) {
          const { data: clientData } = await supabase
            .from('clientes')
            .select('is_active')
            .eq('id', data.client_id)
            .single();
            
          if (clientData && clientData.is_active === false) {
            setIsCompanyActive(false); 
          } else {
            setIsCompanyActive(true);
          }
        } else {
          setIsCompanyActive(true);
        }

        try {
          const { data: remoteClientes, error: clientesError } = await supabase
            .from('clientes')
            .select('*');

          if (!clientesError && remoteClientes) {
            await db.clientes.clear();
            await db.clientes.bulkPut(remoteClientes);
          }
        } catch (syncErr) {
          console.error("Error en la sincronización inicial de empresas:", syncErr);
        }
      }
      setIsInitializing(false); 
    };

    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetchProfile(session.user.id);
        } else {
          setIsInitializing(false); 
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
        setIsCompanyActive(true); 
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

  const navigateTo = (tab, data = null) => {
    setActiveTab(tab);
    setInspectionData(data); 
    setMobileMenuOpen(false);
    window.scrollTo(0, 0); 
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setActiveTab('home');
    setSelectedCompany(null);
    setIsCompanyActive(true);
  };

  const GlobalToaster = (
    <Toaster 
      position="bottom-right"
      toastOptions={{
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff', 
          color: isDarkMode ? '#f8fafc' : '#1e293b', 
          border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, 
          borderRadius: '0.75rem',
          fontWeight: '500',
          fontSize: '13px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)'
        },
        success: { iconTheme: { primary: '#10b981', secondary: isDarkMode ? '#1e293b' : '#ffffff' } },
        error: { iconTheme: { primary: '#ef4444', secondary: isDarkMode ? '#1e293b' : '#ffffff' } },
      }}
    />
  );

  if (isInitializing) {
    return (
      <>
        {GlobalToaster}
        <div className="h-screen w-screen bg-white dark:bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center shadow-sm mb-6">
              <Flame size={32} className="text-white" />
            </div>
            <h2 className="text-slate-900 dark:text-white font-semibold text-xl tracking-tight">TLETL</h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Sincronizando sistemas...</p>
            <div className="w-20 h-1 bg-slate-100 dark:bg-slate-800 mt-6 rounded-full overflow-hidden">
              <div className="w-full h-full bg-red-600 animate-infinite-scroll"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        {GlobalToaster}
        <Login onLoginSuccess={setCurrentUser} />
      </>
    );
  }

  if (!isCompanyActive) {
    return (
      <>
        {GlobalToaster}
        <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-slate-900 p-6 text-center transition-colors duration-300">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center rounded-xl mb-6 border border-red-100 dark:border-red-900/30">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Acceso Suspendido</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-3">El acceso a la plataforma para esta cuenta corporativa ha sido restringido temporalmente por el departamento de administración.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-8 border border-slate-200 dark:border-slate-800 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">Código de Estatus: SUSP_SYS_2.0</p>
          <button onClick={handleLogout} className="mt-10 text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-500 transition-colors flex items-center gap-2">
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {GlobalToaster}
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden transition-colors duration-300">
        
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[5999] md:hidden transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside className={`
          fixed inset-y-0 left-0 z-[6000] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 transform
          ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} 
          md:relative md:translate-x-0 ${isSidebarOpen ? 'md:w-60' : 'md:w-[72px]'}
          flex flex-col h-full
        `}>
          {/* Logo */}
          <div className="p-4 flex items-center justify-between shrink-0 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center shrink-0">
                <Flame size={18} className="text-white" />
              </div>
              {(isSidebarOpen || isMobileMenuOpen) && (
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white tracking-tight leading-none">TLETL</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Fire Systems</span>
                </div>
              )}
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500">
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 mt-2 overflow-y-auto flex flex-col px-2">
            <NavItem icon={<LayoutGrid size={20} />} label="Panel Principal" active={activeTab === 'home'} onClick={() => navigateTo('home')} isOpen={isSidebarOpen || isMobileMenuOpen} />
            
            {['ADMIN', 'STAFF'].includes(currentUser.role) && (
              <NavItem icon={<PlusCircle size={20} />} label="Nueva Inspección" active={activeTab === 'form'} onClick={() => navigateTo('form')} isOpen={isSidebarOpen || isMobileMenuOpen} />
            )}

            <NavItem icon={<LayoutDashboard size={20} />} label={currentUser.role === 'CLIENTE' ? "Mis Reportes" : "Historial Técnico"} active={activeTab === 'list'} onClick={() => navigateTo('list')} isOpen={isSidebarOpen || isMobileMenuOpen} />
            
            <NavItem 
              icon={<MessageSquare size={20} />} 
              label={currentUser.role === 'CLIENTE' ? "Soporte Técnico" : "Órdenes de Servicio"} 
              active={activeTab === 'tickets'} 
              onClick={() => navigateTo('tickets')} 
              isOpen={isSidebarOpen || isMobileMenuOpen} 
            />

            <NavItem icon={<MapPin size={20} />} label="Ubicación de Sites" active={activeTab === 'sites'} onClick={() => navigateTo('sites')} isOpen={isSidebarOpen || isMobileMenuOpen} />
            <NavItem icon={<Building2 size={20} />} label={currentUser?.role === 'MANAGER' ? "Mi Sucursal (IPM)" : "Empresas (IPM)"} active={activeTab === 'companies' || activeTab === 'calendar'} onClick={() => { setSelectedCompany(null); navigateTo('companies'); }} isOpen={isSidebarOpen || isMobileMenuOpen} />
            
            <div className="my-3 border-t border-slate-100 dark:border-slate-800 mx-3" />
            
            {currentUser.role === 'ADMIN' && (
              <>
                <NavItem icon={<Users size={20} />} label="Usuarios" active={activeTab === 'staff'} onClick={() => navigateTo('staff')} isOpen={isSidebarOpen || isMobileMenuOpen} />
                <NavItem icon={<Settings size={20} />} label="Parámetros NFPA" active={activeTab === 'nfpa'} onClick={() => navigateTo('nfpa')} isOpen={isSidebarOpen || isMobileMenuOpen} />
              </>
            )}

            {['ADMIN', 'STAFF'].includes(currentUser.role) && (
              <NavItem 
                icon={<Activity size={20} />} 
                label="Eficiencia Bomba" 
                active={activeTab === 'pump-calc'} 
                onClick={() => navigateTo('pump-calc')} 
                isOpen={isSidebarOpen || isMobileMenuOpen}
              />
            )}

            <div className="mt-auto mb-2">
               <NavItem icon={<LogOut size={20} className="text-red-400 dark:text-red-500" />} label="Cerrar Sesión" onClick={handleLogout} isOpen={isSidebarOpen || isMobileMenuOpen} />
            </div>
          </nav>

          {/* Status bar */}
          <div className={`p-4 flex items-center gap-2.5 text-xs border-t border-slate-100 dark:border-slate-800 ${isOnline ? 'text-green-600 dark:text-green-500' : 'text-orange-500 dark:text-orange-400'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {(isSidebarOpen || isMobileMenuOpen) && <span className="font-medium">{isOnline ? 'Sistema Online' : 'Sistema Offline'}</span>}
            {(isSidebarOpen || isMobileMenuOpen) && isOnline && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
          
          {/* Top Header */}
          <header className="bg-white dark:bg-slate-900 h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 z-[2000] shrink-0 transition-colors duration-300">
            <div className="flex items-center gap-3">
              <button onClick={() => { if (window.innerWidth < 768) setMobileMenuOpen(true); else setSidebarOpen(!isSidebarOpen); }} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-all active:scale-95">
                <Menu size={20}/>
              </button>
              <div className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-red-600 hidden sm:block" />
                <span className="hidden sm:block text-xs font-medium text-slate-400 dark:text-slate-500">{currentUser.role} Access <span className="text-red-600 font-semibold">v2.0</span></span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* TOGGLE DARK MODE */}
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div onClick={() => navigateTo('profile')} className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800 pl-4 group cursor-pointer">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-none group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">{currentUser.full_name || currentUser.email}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{currentUser.role === 'MANAGER' ? 'Jefe de Sucursal' : currentUser.role}</p>
                </div>
                <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-red-50 dark:group-hover:bg-red-900/20 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">
                  <UserIcon size={16} />
                </div>
                <ChevronDown size={14} className="text-slate-300 dark:text-slate-600 hidden sm:block" />
              </div>
            </div>
          </header>

          {/* Content Area */}
          <section className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0">
              
              {/* --- NUEVA CABECERA INTEGRADA EN LA VISTA 'HOME' (PANEL PRINCIPAL) --- */}
              {activeTab === 'home' && (
                <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
                  <div className="p-4 md:p-6 pb-0">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6 mb-2">
                      <h1 className="text-slate-900 dark:text-white text-xl font-semibold">Panel de Control</h1>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Resumen general y métricas del sistema</p>
                    </div>
                  </div>
                  <Dashboard navigateTo={navigateTo} stats={stats} />
                </div>
              )}
              {/* ---------------------------------------------------------------------- */}

              {activeTab === 'form' && ['ADMIN', 'STAFF'].includes(currentUser.role) && <div className="h-full overflow-y-auto p-4 md:p-8"><NewInspection navigateTo={navigateTo} prefillData={inspectionData} /></div>}
              {activeTab === 'list' && <div className="h-full overflow-y-auto p-4 md:p-8"><InspectionHistory navigateTo={navigateTo} currentUser={currentUser} /></div>}
              {activeTab === 'critical' && <div className="h-full overflow-y-auto"><CriticalFindings navigateTo={navigateTo} currentUser={currentUser} /></div>}
              {activeTab === 'sites' && <div className="h-full w-full"><SitesView currentUser={currentUser} /></div>}
              {activeTab === 'companies' && <div className="h-full overflow-y-auto p-4 md:p-8"><CompaniesView currentUser={currentUser} onSelectCompany={(company) => { setSelectedCompany(company); setActiveTab('calendar'); }} /></div>}
              {activeTab === 'calendar' && <div className="h-full overflow-y-auto"><IPMCalendar currentUser={currentUser} navigateTo={navigateTo} selectedCompany={selectedCompany} onBack={() => { setSelectedCompany(null); setActiveTab('companies'); }} /></div>}
              {activeTab === 'profile' && <div className="h-full overflow-y-auto p-4 md:p-8"><UserProfile currentUser={currentUser} setCurrentUser={setCurrentUser} navigateTo={navigateTo} /></div>}
              {activeTab === 'staff' && currentUser.role === 'ADMIN' && <div className="h-full overflow-y-auto"><StaffManagement currentUser={currentUser} /></div>}
              {activeTab === 'nfpa' && currentUser.role === 'ADMIN' && <div className="h-full w-full overflow-y-auto"><NFPALibrary /></div>}
              {activeTab === 'pump-calc' && ['ADMIN', 'STAFF'].includes(currentUser.role) && (
                <div className="h-full overflow-y-auto p-4 md:p-8">
                  <PumpEfficiency />
                </div>
              )}

              {activeTab === 'tickets' && (
                <div className="h-full overflow-y-auto w-full bg-slate-50 dark:bg-slate-950">
                  {currentUser.role === 'ADMIN' && <AdminServiceRequests currentUser={currentUser} />}
                  {currentUser.role === 'STAFF' && <StaffServiceRequests currentUser={currentUser} />}
                  {['CLIENTE', 'MANAGER'].includes(currentUser.role) && <ClientServiceRequests currentUser={currentUser} />}
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
    <div onClick={onClick} className={`flex items-center px-3 py-2.5 cursor-pointer transition-all duration-200 relative group rounded-lg mb-0.5 
      ${active 
        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500' 
        : 'hover:bg-red-50 dark:hover:bg-red-900/10 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500'
      }`}>
      {active && <div className="absolute left-0 w-[3px] h-5 bg-red-600 dark:bg-red-500 rounded-r-full" />}
      <div className={`shrink-0 transition-colors`}>{icon}</div>
      {(isOpen) && <span className={`ml-3 text-sm whitespace-nowrap ${active ? 'font-medium' : 'font-normal'}`}>{label}</span>}
    </div>
  );
}

export default App;