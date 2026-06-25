import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks'; 
import { db } from './db';
import { supabase } from './supabaseClient'; 
import { Toaster, toast } from 'react-hot-toast'; 
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

// --- INTEGRACIÓN CHAT ---
import Chat from './components/Chat';

function App() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true); 
  const [activeTab, setActiveTab] = useState('home'); 
  const [previousTab, setPreviousTab] = useState('home');
  const [isSidebarOpen, setSidebarOpen] = useState(true); 
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isCompanyActive, setIsCompanyActive] = useState(true);
  const [inspectionData, setInspectionData] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null); 

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  const [isChatOpen, setIsChatOpen] = useState(false);

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
    if (!currentUser) return;

    const channel = supabase
      .channel('global_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          if (payload.new.sender_id === currentUser.id) return;

          const activeRoomId = sessionStorage.getItem('activeChatRoom');
          
          if (activeRoomId === payload.new.room_id) return;

          const { data: isParticipant } = await supabase
            .from('chat_participants')
            .select('room_id')
            .eq('room_id', payload.new.room_id)
            .eq('user_id', currentUser.id)
            .single();

          if (isParticipant) {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', payload.new.sender_id)
              .single();

            toast.custom((t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-slate-200 dark:border-slate-800`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white">
                        <MessageSquare size={20} />
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Nuevo mensaje de {senderProfile?.full_name || 'Alguien'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 truncate">
                        {payload.new.content}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setIsChatOpen(true);
                      toast.dismiss(t.id);
                    }}
                    className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-bold text-red-600 hover:text-red-500 focus:outline-none"
                  >
                    Ver
                  </button>
                </div>
              </div>
            ), { duration: 4000 });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  useEffect(() => {
    const fetchProfile = async (userId) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (!error && data) {
          setCurrentUser(data);
          
          // --- NUEVO: GUARDAR SESIÓN EN CACHÉ PARA USO OFFLINE ---
          localStorage.setItem('tle_user_cache', JSON.stringify(data));

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
            console.warn("Offline: no se pudieron sincronizar clientes", syncErr);
          }
        }
      } catch (err) {
        console.warn("Modo Offline: Usando caché de la aplicación", err);
      } finally {
        // --- NUEVO: ASEGURAR QUE SIEMPRE SE QUITE LA PANTALLA DE CARGA ---
        setIsInitializing(false); 
      }
    };

    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // --- NUEVO: CARGA RÁPIDA DESDE CACHÉ ANTES DE CONSULTAR A SUPABASE ---
          const cachedUser = localStorage.getItem('tle_user_cache');
          if (cachedUser) {
            setCurrentUser(JSON.parse(cachedUser));
            setIsInitializing(false); 
          }
          await fetchProfile(session.user.id);
        } else {
          setIsInitializing(false); 
        }
      } catch (error) {
        // --- NUEVO: SI NO HAY RED PARA VALIDAR SESIÓN, INTENTAR CON LA CACHÉ ---
        console.warn("Modo Offline (Session): Usando caché local", error);
        const cachedUser = localStorage.getItem('tle_user_cache');
        if (cachedUser) {
          setCurrentUser(JSON.parse(cachedUser));
        }
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
    if (tab === 'BACK') {
      setActiveTab(previousTab || 'home');
      window.scrollTo(0, 0);
      return;
    }

    if (tab === 'profile') {
      setPreviousTab(activeTab);
    }

    setActiveTab(tab);
    setInspectionData(data); 
    setMobileMenuOpen(false);
    window.scrollTo(0, 0); 
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('tle_user_cache'); // Llimpiar caché al salir
    setCurrentUser(null);
    setActiveTab('home');
    setSelectedCompany(null);
    setIsCompanyActive(true);
    setIsChatOpen(false);
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
            
            {currentUser.role === 'ADMIN' && (
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

            <NavItem icon={<MapPin size={20} />} label="Registrar empresas" active={activeTab === 'sites'} onClick={() => navigateTo('sites')} isOpen={isSidebarOpen || isMobileMenuOpen} />
            
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
              <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <Menu size={20} />
              </button>
              <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="hidden md:flex p-2 -ml-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <Menu size={20} />
              </button>
              <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 hidden md:block" />
              <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
                {activeTab === 'home' ? 'Panel de Control' : 
                 activeTab === 'form' ? 'Nueva Inspección' : 
                 activeTab === 'list' ? 'Historial de Reportes' : 
                 activeTab === 'sites' ? 'Registrar empresas' :
                 activeTab === 'profile' ? 'Mi Perfil' :
                 activeTab === 'staff' ? 'Gestión de Equipo' :
                 activeTab === 'calendar' ? 'Calendario IPM' :
                 activeTab === 'companies' ? 'Empresas y Sucursales' :
                 activeTab === 'nfpa' ? 'Parámetros NFPA' :
                 activeTab === 'pump-calc' ? 'Eficiencia de Bomba' :
                 activeTab === 'tickets' ? 'Órdenes de Servicio' :
                 activeTab === 'criticals' ? 'Hallazgos Críticos' : ''}
              </h1>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800" />
              
              <div className="flex items-center gap-3 pl-1">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">{currentUser.full_name}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{currentUser.role}</span>
                </div>
                <button onClick={() => navigateTo('profile')} className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 overflow-hidden group p-0">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={18} className="group-hover:scale-110 transition-transform" />
                  )}
                </button>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {activeTab === 'home' && <Dashboard currentUser={currentUser} navigateTo={navigateTo} stats={stats} />}
            {activeTab === 'form' && <NewInspection navigateTo={navigateTo} prefillData={inspectionData} />}
            {activeTab === 'list' && <InspectionHistory currentUser={currentUser} navigateTo={navigateTo} />}
            {activeTab === 'sites' && <SitesView currentUser={currentUser} />}
            
            {activeTab === 'profile' && <UserProfile currentUser={currentUser} setCurrentUser={setCurrentUser} navigateTo={navigateTo} />}
            
            {activeTab === 'staff' && <StaffManagement currentUser={currentUser} />}
            {activeTab === 'companies' && <CompaniesView currentUser={currentUser} onSelectCompany={(c) => { setSelectedCompany(c); navigateTo('calendar'); }} />}
            {activeTab === 'calendar' && <IPMCalendar currentUser={currentUser} selectedCompany={selectedCompany} onBack={() => navigateTo('companies')} />}
            {activeTab === 'nfpa' && <NFPALibrary currentUser={currentUser} />}
            {activeTab === 'pump-calc' && <PumpEfficiency currentUser={currentUser} />}
            {activeTab === 'criticals' && <CriticalFindings currentUser={currentUser} onBack={() => navigateTo('home')} />}
            
            {activeTab === 'tickets' && (
              currentUser.role === 'ADMIN' ? <AdminServiceRequests currentUser={currentUser} /> :
              currentUser.role === 'STAFF' ? <StaffServiceRequests currentUser={currentUser} navigateTo={navigateTo} /> :
              <ClientServiceRequests currentUser={currentUser} />
            )}
          </div>
        </main>
      </div>

      {/* --- INTEGRACIÓN BOTÓN FLOTANTE DE CHAT --- */}
      {currentUser && (
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`fixed bottom-6 right-6 z-[7000] p-4 rounded-full shadow-2xl transition-all duration-300 active:scale-90 ${isChatOpen ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 rotate-90' : 'bg-red-600 text-white hover:bg-red-700 hover:scale-110'}`}
          title={isChatOpen ? "Cerrar Chat" : "Chat de Soporte"}
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      )}

      {/* --- INTEGRACIÓN VENTANA DE CHAT --- */}
      {isChatOpen && currentUser && (
        <div className="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 z-[6999] w-full h-full md:w-[400px] md:h-[600px] bg-white dark:bg-slate-900 md:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <Chat currentUser={currentUser} />
        </div>
      )}
    </>
  );
}

// --- SUB-COMPONENTE NAVITEM ---
function NavItem({ icon, label, active, onClick, isOpen }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 my-0.5 rounded-xl transition-all duration-200 group
        ${active 
          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 font-semibold shadow-sm border border-red-100 dark:border-red-900/30' 
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}
      `}
    >
      <span className={`${active ? 'text-red-600 dark:text-red-500' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'} transition-colors`}>
        {icon}
      </span>
      {isOpen && <span className="text-sm tracking-tight">{label}</span>}
      {active && isOpen && <div className="ml-auto w-1.5 h-1.5 bg-red-600 dark:bg-red-500 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.5)]"></div>}
    </button>
  );
}

export default App;