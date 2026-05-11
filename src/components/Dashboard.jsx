import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { showConfirmDelete } from '../alerts';
import { 
  Flame, ClipboardList, Map as MapIcon, 
  CloudSync, AlertOctagon, ArrowUpRight,
  Building2, PlusCircle, Trash2, X, Building
} from 'lucide-react';

export default function Dashboard({ navigateTo, stats }) {
  // --- ESTADOS PARA GESTIÓN DE EMPRESAS ---
  const [clientes, setClientes] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRole();
    fetchClientes();
  }, []);

  const checkRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (data?.role === 'ADMIN') setIsAdmin(true);
    }
  };

  const fetchClientes = async () => {
    const { data, error } = await supabase.from('clientes').select('*').order('nombre', { ascending: true });
    if (!error && data) setClientes(data);
    setLoading(false);
  };

  const handleAddClient = async () => {
    if (!newClientName.trim()) return;
    const loadingToast = toast.loading("Registrando empresa...");
    
    const { data, error } = await supabase
      .from('clientes')
      .insert([{ nombre: newClientName.trim().toUpperCase() }])
      .select();

    if (error) {
      toast.error("Error: " + error.message, { id: loadingToast });
    } else {
      toast.success(`Empresa ${data[0].nombre} registrada.`, { id: loadingToast });
      setClientes([...clientes, data[0]].sort((a,b) => a.nombre.localeCompare(b.nombre)));
      setIsAdding(false);
      setNewClientName('');
    }
  };

  const handleDeleteClient = (clientId, clientName) => {
    showConfirmDelete(`LA EMPRESA ${clientName}`, async () => {
      const deleteToast = toast.loading("Eliminando empresa...");
      try {
        const { error } = await supabase.from('clientes').delete().eq('id', clientId);
        if (error) throw error;
        
        toast.success(`${clientName} eliminada del sistema.`, { id: deleteToast });
        setClientes(prev => prev.filter(c => c.id !== clientId));
      } catch (err) {
        toast.error("Error al eliminar: " + err.message, { id: deleteToast });
      }
    });
  };

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
    <div className="max-w-4xl mx-auto p-4 space-y-8 animate-in fade-in duration-700 pb-24">
      
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

      {/* ESTADO DE SINCRONIZACIÓN */}
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
          {['Isai Campos', 'Ing. En Servicio'].map((name, i) => (
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

      {/* --- NUEVA SECCIÓN: DIRECTORIO DE EMPRESAS (SaaS) --- */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between px-2 border-b-2 border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <Building2 className="text-slate-400" size={24} />
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg leading-none">Directorio de Empresas</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">SaaS Multi-Tenant</p>
            </div>
          </div>
          
          {isAdmin && (
            <button 
              onClick={() => setIsAdding(!isAdding)} 
              className={`text-[9px] font-black px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${isAdding ? 'bg-slate-200 text-slate-600' : 'bg-slate-900 text-white hover:bg-red-600 shadow-lg'}`}
            >
              {isAdding ? <X size={14}/> : <PlusCircle size={14}/>} 
              {isAdding ? 'CANCELAR' : 'AGREGAR EMPRESA'}
            </button>
          )}
        </div>

        {/* INPUT PARA AGREGAR NUEVA EMPRESA */}
        {isAdding && isAdmin && (
          <div className="flex gap-2 animate-in slide-in-from-top-2 bg-slate-50 p-4 rounded-[2rem] border-2 border-slate-100">
            <input 
              type="text" 
              placeholder="Escribe el nombre de la nueva empresa..." 
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
              className="w-full p-4 bg-white rounded-2xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-red-500 transition-all uppercase text-xs"
              autoFocus
            />
            <button 
              onClick={handleAddClient} 
              className="px-8 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/30"
            >
              Guardar
            </button>
          </div>
        )}

        {/* LISTA DE EMPRESAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {loading ? (
            <div className="col-span-full p-10 text-center animate-pulse text-slate-400 font-black uppercase text-[10px] tracking-widest">Cargando directorio...</div>
          ) : clientes.length === 0 ? (
            <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 p-10 rounded-[2rem] text-center">
              <Building size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Aún no hay empresas registradas</p>
            </div>
          ) : (
            clientes.map(cliente => (
              <div key={cliente.id} className="bg-white p-5 rounded-[1.5rem] border-2 border-slate-50 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <Building2 size={18} />
                  </div>
                  <h4 className="font-black text-xs uppercase text-slate-700 truncate tracking-tight" title={cliente.nombre}>
                    {cliente.nombre}
                  </h4>
                </div>
                
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteClient(cliente.id, cliente.nombre)}
                    className="p-2 text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    title="Eliminar Empresa"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}