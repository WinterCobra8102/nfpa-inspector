import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { showConfirmDelete } from '../alerts';
import { 
  Flame, ClipboardList, Map as MapIcon, CloudSync, AlertOctagon, 
  ArrowUpRight, Building2, PlusCircle, Trash2, X, Building,
  MapPin, UserCircle, FileText, Edit3, Save, ExternalLink, ChevronRight, 
  Phone, Lock, Eye, EyeOff
} from 'lucide-react';

export default function Dashboard({ navigateTo, stats }) {
  const [clientes, setClientes] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedClient, setSelectedClient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showPass, setShowPass] = useState(false);

  // Estado para el perfil del usuario logueado
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Ejecutamos una tras otra para asegurar que fetchClientes tenga el perfil
    const init = async () => {
      const profile = await checkRole();
      await fetchClientes(profile);
    };
    init();
  }, []);

  const checkRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Modificado para traer también el client_id
      const { data } = await supabase.from('profiles').select('role, client_id').eq('id', session.user.id).single();
      if (data) {
        setUserProfile(data);
        if (data.role === 'ADMIN') setIsAdmin(true);
        return data;
      }
    }
    return null;
  };

  const fetchClientes = async (forcedProfile = null) => {
    const profile = forcedProfile || userProfile;
    
    let query = supabase.from('clientes').select('*');

    // --- MODIFICACIÓN DE FILTRO DE SUCURSAL ---
    // Si no es ADMIN, filtramos obligatoriamente por su client_id
    if (profile && profile.role !== 'ADMIN') {
      if (profile.client_id) {
        query = query.eq('id', profile.client_id);
      } else {
        // Si no tiene sucursal asignada, no mostramos nada por seguridad
        setClientes([]);
        setLoading(false);
        return;
      }
    }

    const { data, error } = await query.order('nombre', { ascending: true });
    if (!error && data) setClientes(data);
    setLoading(false);
  };

  const handleOpenDetails = (cliente) => {
    setSelectedClient(cliente);
    setEditData({ ...cliente, password: '' }); 
    setIsEditing(false);
  };

  const handleUpdateClient = async () => {
    const loadingToast = toast.loading("Sincronizando con el servidor...");
    
    try {
      // 1. Actualización de la tabla 'clientes'
      const { error: clientError } = await supabase
        .from('clientes')
        .update({
          direccion: editData.direccion,
          telefono: editData.telefono,
          encargado_nombre: editData.encargado_nombre,
          encargado_email: editData.encargado_email,
          notas_internas: editData.notas_internas
        })
        .eq('id', selectedClient.id);

      if (clientError) throw clientError;

      // 2. Intento de actualizar acceso (Password y Rol)
      if (editData.password && editData.encargado_email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', editData.encargado_email)
          .single();

        if (profile) {
          // Actualizamos Auth y el perfil para vincularlo a esta empresa
          await supabase.rpc('admin_update_user', {
            target_user_id: profile.id,
            new_password: editData.password
          });

          await supabase
            .from('profiles')
            .update({ 
              client_id: selectedClient.id,
              role: 'MANAGER' 
            })
            .eq('id', profile.id);
        }
      }

      toast.success("Cambios aplicados con éxito", { id: loadingToast });
      await fetchClientes();
      setIsEditing(false);
      setSelectedClient({ ...editData });
    } catch (err) {
      toast.error("Error al guardar: " + err.message, { id: loadingToast });
    }
  };

  const handleAddClient = async () => {
    if (!newClientName.trim()) return;
    const { error } = await supabase.from('clientes').insert([{ nombre: newClientName.trim().toUpperCase() }]);
    if (!error) {
      toast.success("Empresa dada de alta");
      fetchClientes();
      setIsAdding(false);
      setNewClientName('');
    }
  };

  const handleDeleteClient = (clientId, clientName) => {
    showConfirmDelete(`LA EMPRESA ${clientName}`, async () => {
      await supabase.from('clientes').delete().eq('id', clientId);
      toast.success("Empresa eliminada");
      fetchClientes();
      setSelectedClient(null);
    });
  };

  const menuItems = [
    { id: 'form', label: 'Nueva Inspección', desc: 'Protocolo NFPA', icon: <Flame size={32} />, color: 'bg-red-600' },
    { id: 'sites', label: 'Asset Radar', desc: 'Mapa en vivo', icon: <MapIcon size={32} />, color: 'bg-slate-900', count: stats?.totalAssets || 0 },
    { id: 'list', label: 'Historial Técnico', desc: 'Reportes y PDF', icon: <ClipboardList size={32} />, color: 'bg-slate-800', count: stats?.totalReports || 0 },
    { id: 'critical', label: 'Hallazgos Críticos', desc: 'Urgencias', icon: <AlertOctagon size={32} />, color: 'bg-orange-600', count: stats?.criticals || 0 }
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-10 animate-in fade-in duration-700 pb-32">
      
      {/* HEADER */}
      <div className="flex justify-between items-center px-2 pt-4">
        <div>
          <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] mb-1">Ingeniería Tletl</p>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Panel de Control</h1>
        </div>
        <div className="bg-green-50 px-3 py-1.5 rounded-2xl border border-green-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Sistema Online</span>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
        {menuItems.map((item) => (
          <button key={item.id} onClick={() => navigateTo(item.id)} className="relative overflow-hidden bg-white border-2 border-slate-50 p-8 rounded-[2.5rem] text-left shadow-xl shadow-slate-100 hover:border-red-600 transition-all group active:scale-95">
            <div className={`inline-flex p-4 rounded-[1.5rem] ${item.color} text-white mb-6 shadow-lg group-hover:scale-110 transition-transform`}>{item.icon}</div>
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">{item.label}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{item.desc}</p>
            {item.count !== undefined && <div className="absolute top-8 right-8 text-2xl font-black text-slate-200 group-hover:text-red-50 transition-colors">{item.count.toString().padStart(2, '0')}</div>}
          </button>
        ))}
      </div>

      {/* DIRECTORIO */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Building2 className="text-slate-400" size={22} />
            <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">
               {isAdmin ? 'Directorio de Empresas' : 'Mi Sucursal Asignada'}
            </h3>
          </div>
          {isAdmin && (
            <button onClick={() => setIsAdding(!isAdding)} className="text-[9px] font-black px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-red-600 transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-slate-900/20">
              {isAdding ? <X size={14}/> : <PlusCircle size={14}/>} {isAdding ? 'CANCELAR' : 'AGREGAR'}
            </button>
          )}
        </div>

        {isAdding && (
          <div className="flex gap-3 animate-in slide-in-from-top-4 bg-slate-50 p-5 rounded-[2rem] border-2 border-dashed border-slate-200 mx-4">
            <input type="text" placeholder="NOMBRE DE LA EMPRESA..." value={newClientName} onChange={e => setNewClientName(e.target.value)} className="w-full p-4 bg-white rounded-2xl font-bold text-xs uppercase outline-none border-2 border-transparent focus:border-red-500 shadow-inner" autoFocus />
            <button onClick={handleAddClient} className="px-8 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-lg active:scale-90 transition-all">Guardar</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
          {clientes.map(cliente => (
            <button key={cliente.id} onClick={() => handleOpenDetails(cliente)} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-md flex items-center justify-between group hover:border-red-600 hover:-translate-y-1 transition-all text-left">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-red-50 group-hover:text-red-600 transition-all duration-500"><Building size={20} /></div>
                <div className="overflow-hidden">
                  <h4 className="font-black text-[11px] uppercase text-slate-700 truncate tracking-tight">{cliente.nombre}</h4>
                  <p className="text-[9px] font-bold text-slate-300 uppercase truncate mt-0.5">{cliente.encargado_nombre || 'Sin encargado'}</p>
                </div>
              </div>
              <ChevronRight className="text-slate-200 group-hover:text-red-600" size={18} />
            </button>
          ))}
        </div>
      </div>

      {/* PANEL LATERAL */}
      {selectedClient && (
        <div className="fixed inset-0 z-[10000] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedClient(null)}></div>
          
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l-8 border-red-600">
            
            <div className="p-8 bg-slate-900 text-white relative">
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedClient(null); }} 
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-red-600 rounded-xl text-white transition-all z-[10001] cursor-pointer"
              >
                <X size={20}/>
              </button>

              <div className="flex items-center gap-4 mt-2">
                <div className="bg-red-600 p-4 rounded-2xl shadow-xl shadow-red-600/20"><Building2 size={28}/></div>
                <div>
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.4em]">Ficha Técnica</span>
                  <h2 className="text-xl font-black uppercase mt-1 truncate max-w-[180px]">{selectedClient.nombre}</h2>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={14} className="text-red-600"/> Planta</h4>
                  {isAdmin && (
                    <button onClick={() => setIsEditing(!isEditing)} className="text-red-600 font-black text-[9px] uppercase px-3 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                      {isEditing ? 'Cancelar' : 'Editar'}
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Dirección</label>
                    {isEditing ? (
                      <textarea className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-red-500" rows="2" value={editData.direccion || ''} onChange={e => setEditData({...editData, direccion: e.target.value})}/>
                    ) : (
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">{selectedClient.direccion || 'Sin domicilio registrado'}</p>
                    )}
                  </div>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Teléfono</label>
                    {isEditing ? (
                      <input type="text" className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-red-500" value={editData.telefono || ''} onChange={e => setEditData({...editData, telefono: e.target.value})}/>
                    ) : (
                      <p className="text-xs font-bold text-slate-600">{selectedClient.telefono || 'Sin teléfono'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><UserCircle size={14} className="text-red-600"/> Responsable</h4>
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white border-b-4 border-red-600 space-y-5 shadow-xl">
                   <div>
                     <label className="text-[8px] font-black text-white/30 uppercase block mb-1">Nombre del Jefe</label>
                     {isEditing ? (
                       <input className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-red-500" value={editData.encargado_nombre || ''} onChange={e => setEditData({...editData, encargado_nombre: e.target.value})}/>
                     ) : (
                       <p className="text-base font-black truncate">{selectedClient.encargado_nombre || 'Pendiente'}</p>
                     )}
                   </div>
                   
                   <div className="space-y-4">
                      <div>
                        <label className="text-[8px] font-black text-white/30 uppercase block mb-1">Email de Acceso</label>
                        {isEditing ? (
                          <input className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-red-500" value={editData.encargado_email || ''} onChange={e => setEditData({...editData, encargado_email: e.target.value})}/>
                        ) : (
                          <p className="text-[10px] font-bold text-red-500 truncate">{selectedClient.encargado_email || 'Sin vincular'}</p>
                        )}
                      </div>

                      {isEditing && (
                        <div className="animate-in slide-in-from-bottom-2 duration-300">
                          <label className="text-[8px] font-black text-blue-400 uppercase block mb-1">Asignar Contraseña</label>
                          <div className="relative">
                            <input 
                              type={showPass ? "text" : "password"} 
                              className="w-full bg-white/10 border border-white/20 rounded-xl p-3 pr-10 text-xs font-bold text-white outline-none focus:border-blue-500"
                              placeholder="Nueva contraseña..."
                              value={editData.password || ''}
                              onChange={e => setEditData({...editData, password: e.target.value})}
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                              {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </button>
                          </div>
                        </div>
                      )}
                   </div>
                </div>
              </div>

              <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 shadow-inner">
                <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3 flex items-center gap-2"><FileText size={16}/> Notas Internas</h4>
                {isEditing ? (
                  <textarea className="w-full bg-white border border-orange-200 rounded-xl p-4 text-xs font-bold h-32 outline-none focus:border-orange-500" value={editData.notas_internas || ''} onChange={e => setEditData({...editData, notas_internas: e.target.value})}/>
                ) : (
                  <p className="text-[10px] font-bold text-orange-900/60 leading-relaxed italic">
                    "{selectedClient.notas_internas || 'No hay requerimientos especiales para este sitio.'}"
                  </p>
                )}
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
              {isEditing ? (
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleUpdateClient(); }} 
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-xl shadow-red-600/20 active:scale-95 transition-all"
                >
                  <Save size={18}/> Guardar Cambios
                </button>
              ) : (
                <>
                  <button onClick={() => navigateTo('list')} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-slate-900/20"><ExternalLink size={18}/> Historial</button>
                  {isAdmin && (
                    <button onClick={() => handleDeleteClient(selectedClient.id, selectedClient.nombre)} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-95"><Trash2 size={20}/></button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}