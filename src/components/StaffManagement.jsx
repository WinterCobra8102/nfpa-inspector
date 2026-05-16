import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js'; 
import toast from 'react-hot-toast'; 
import { showConfirmDelete } from '../alerts'; 
import { 
  Users, UserPlus, Trash2, Shield, Mail, 
  RefreshCw, CheckCircle, X, Lock, Eye, EyeOff, Edit, Building2, Smartphone
} from 'lucide-react';

export default function StaffManagement({ currentUser }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- GESTIÓN DE EMPRESAS ---
  const [listaEmpresas, setListaEmpresas] = useState([]);
  const [newClientId, setNewClientId] = useState('');
  const [editClientId, setEditClientId] = useState('');

  // ESTADOS DE CREACIÓN (EXCLUSIVOS ADMIN)
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState(''); 
  const [newRole, setNewRole] = useState('STAFF');
  const [showPassword, setShowPassword] = useState(false);

  // ESTADOS DE EDICIÓN
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('STAFF');
  const [editPhone, setEditPhone] = useState(''); 
  const [editPassword, setEditPassword] = useState(''); 
  const [showEditPassword, setShowEditPassword] = useState(false);

  // --- CONTROL DE PERMISOS SEGÚN EL ROL LOGUEADO ---
  const isAdmin = currentUser?.role === 'ADMIN';
  const isManager = currentUser?.role === 'MANAGER';

  useEffect(() => {
    if (isAdmin || isManager) {
      fetchStaff();
      fetchEmpresas(); 

      const channel = supabase
        .channel('profiles-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            fetchStaff();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [currentUser]);

  async function fetchStaff() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'CLIENTE')
      .order('full_name', { ascending: true });
    
    if (!error) setStaff(data);
    setLoading(false);
  }

  async function fetchEmpresas() {
    const { data } = await supabase.from('clientes').select('id, nombre').order('nombre', { ascending: true });
    if (data) setListaEmpresas(data);
  }

  // --- FILTRO DE PRIVACIDAD VISUAL ---
  const visibleStaff = useMemo(() => {
    if (isAdmin) return staff; 
    if (isManager) return staff.filter(person => person.role !== 'ADMIN'); 
    return [];
  }, [staff, currentUser]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!isAdmin) return; 

    if (!newEmail || !newName || !newPassword) {
      toast.error("Todos los campos obligatorios deben llenarse.");
      return;
    }
    if (newRole === 'MANAGER' && !newClientId) {
      toast.error("Debes asignar una empresa al encargado.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    
    setIsSubmitting(true);
    const loadingToast = toast.loading("Registrando usuario en el sistema...");

    try {
      const ghostClient = createClient(
        'https://wkjqbtmnrqbafzytrtfn.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFidG1ucnFiYWZ6eXRydGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjkwNTEsImV4cCI6MjA5Mzg0NTA1MX0.FVAh5nO7m0ixIuEM--uQqy3lRBYpz3L4GqodSDOmGkc',
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
      const { error: authError } = await ghostClient.auth.signUp({ email: newEmail, password: newPassword });
      if (authError) throw authError;

      const { error: rpcError } = await supabase.rpc('admin_set_role', {
        target_email: newEmail, new_role: newRole, full_name_val: newName.toUpperCase()
      });
      if (rpcError) throw rpcError;

      await supabase.from('profiles').update({ 
        phone: newPhone || null,
        client_id: newRole === 'MANAGER' ? newClientId : null 
      }).eq('email', newEmail);

      toast.success(`${newName.toUpperCase()} registrado correctamente.`, { id: loadingToast });
      setNewEmail(''); setNewName(''); setNewPassword(''); setNewClientId(''); setNewPhone('');
    } catch (err) {
      toast.error("Error: " + err.message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (person) => {
    setEditingUser(person);
    setEditName(person.full_name || '');
    setEditEmail(person.email || ''); 
    setEditRole(person.role);
    setEditPhone(person.phone || ''); 
    setEditClientId(person.client_id || ''); 
    setEditPassword(''); 
    setShowEditPassword(false);
  };

  const handleUpdateUser = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    const loadingToast = toast.loading("Actualizando parámetros...");

    try {
      if (isAdmin) {
        const { error } = await supabase.rpc('admin_update_user', {
          target_user_id: editingUser.id,
          new_email: editEmail, 
          new_name: editName.toUpperCase(),
          new_role: editRole,
          new_password: editPassword.trim() !== '' ? editPassword : null 
        });
        if (error) throw error;

        await supabase.from('profiles').update({ 
          client_id: editRole === 'MANAGER' ? editClientId : null,
          phone: editPhone || null
        }).eq('id', editingUser.id);

      } else if (isManager) {
        const { error } = await supabase.from('profiles').update({ 
          client_id: editClientId || null
        }).eq('id', editingUser.id);
        if (error) throw error;
      }

      toast.success("Parámetros actualizados con éxito.", { id: loadingToast });
      setEditingUser(null);
    } catch (err) {
      toast.error("Error: " + err.message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (userId, userName) => {
    if (!isAdmin) return; 
    showConfirmDelete(userName, async () => {
      const deleteToast = toast.loading("Eliminando accesos del sistema...");
      try {
        const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
        if (error) throw error;
        toast.success(`${userName} eliminado del sistema.`, { id: deleteToast });
      } catch (err) {
        toast.error("Error: " + err.message, { id: deleteToast });
      }
    });
  };

  if (!isAdmin && !isManager) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-20 text-center space-y-4">
        <Shield size={64} className="text-red-600 opacity-20" />
        <h2 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Acceso Restringido</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-50">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-4 rounded-2xl text-white">
            <Users size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Gestión de Equipo</h2>
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1">Directorio Central de Usuarios</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {isAdmin ? (
          <div className="md:col-span-1 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-lg h-fit">
            <h3 className="font-black uppercase text-xs mb-6 flex items-center gap-2 border-b pb-4">
              <UserPlus size={16} className="text-red-600"/> Nuevo Registro
            </h3>
            
            <form onSubmit={handleCreateUser} className="space-y-4 text-slate-700">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-2">Nombre Completo</label>
                <input type="text" autoComplete="off" placeholder="Ej: CARLOS MENDOZA" className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none uppercase" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-2">Correo Electrónico</label>
                <input type="email" autoComplete="new-email" placeholder="ejemplo@tletl.com" className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-2">Teléfono Celular</label>
                <div className="relative flex items-center">
                  <Smartphone size={14} className="absolute left-3 text-slate-400" />
                  <input type="tel" placeholder="9999002211" className="w-full p-3 pl-9 bg-slate-50 rounded-xl text-xs font-bold outline-none" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-2">Password Inicial</label>
                <div className="relative flex items-center">
                  <input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="••••••••" className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none pr-10" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-2">Rango / Rol</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl text-xs font-black uppercase outline-none" value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="STAFF">Inspector / Técnico</option>
                  <option value="MANAGER">Jefe de Sucursal</option>
                  <option value="ADMIN">Administrador Gral.</option>
                </select>
              </div>
              {newRole === 'MANAGER' && (
                <div className="space-y-1 animate-in slide-in-from-top-2">
                  <label className="text-[9px] font-black text-blue-600 uppercase ml-2 flex items-center gap-1"><Building2 size={10}/> Asignar Sucursal</label>
                  <select className="w-full p-3 bg-blue-50 rounded-xl text-xs font-bold outline-none border border-blue-100" value={newClientId} onChange={e => setNewClientId(e.target.value)}>
                    <option value="">Seleccionar empresa...</option>
                    {listaEmpresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" disabled={isSubmitting} className="w-full py-4 mt-2 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg flex items-center justify-center gap-2">
                {isSubmitting ? <RefreshCw className="animate-spin" size={16}/> : "Registrar en Sistema"}
              </button>
            </form>
          </div>
        ) : (
          <div className="md:col-span-1 bg-slate-900 p-6 rounded-[2rem] text-white space-y-3 h-fit border-t-4 border-blue-500 shadow-xl">
            <Shield size={24} className="text-blue-400"/>
            <h4 className="font-black text-xs uppercase tracking-wider">Acceso de Monitoreo</h4>
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase">Estás operando bajo el rango de Jefe de Sucursal. Tienes autorización para revisar el staff técnico y coordinar asignaciones, mas no para crear o corromper accesos de seguridad.</p>
          </div>
        )}

        {/* LISTADO */}
        <div className="md:col-span-2 space-y-3">
          {loading ? (
            <div className="p-10 text-center animate-pulse text-slate-400 font-black uppercase text-[10px]">Cargando Directorio...</div>
          ) : (
            visibleStaff.map(person => (
              <div key={person.id} className="bg-white p-5 rounded-[1.5rem] border-2 border-slate-50 shadow-sm flex items-center justify-between group hover:border-red-100 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black ${person.role === 'ADMIN' ? 'bg-slate-900' : person.role === 'MANAGER' ? 'bg-blue-600' : 'bg-red-600'}`}>
                    {person.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm uppercase text-slate-800 leading-none">{person.full_name || 'Sin Nombre'}</h4>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${person.role === 'ADMIN' ? 'bg-slate-900 text-white' : person.role === 'MANAGER' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                        {person.role === 'MANAGER' ? 'JEFE SUCURSAL' : person.role === 'STAFF' ? 'TÉCNICO' : person.role}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 lowercase">{person.email} {person.phone && <span className="text-slate-500 font-black uppercase"> • 📱 {person.phone}</span>}</p>
                  </div>
                </div>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(person)} className="p-3 text-slate-300 hover:text-blue-500 transition-colors"><Edit size={20} /></button>
                  {isAdmin && currentUser?.id !== person.id && (
                    <button onClick={() => handleDelete(person.id, person.full_name)} className="p-3 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={20} /></button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL DE EDICIÓN CON ALTURA CONTROLADA Y BOTÓN FIJO */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* Al hacer clic en el fondo borroso, también se cierra de forma segura */}
          <div className="absolute inset-0" onClick={() => setEditingUser(null)} />
          
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] text-slate-700 border-t-8 border-slate-900 animate-in zoom-in-95 duration-200">
            
            {/* CABECERA MAESTRA (SIEMPRE QUEDA FIJA Y VISIBLE EN PANTALLA) */}
            <div className="p-6 bg-slate-50 border-b flex justify-between items-center shrink-0 relative z-30">
              <div>
                <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Ficha Técnica</span>
                <h3 className="font-black text-xl uppercase tracking-tighter mt-1">Modificar Perfil</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingUser(null)} 
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-xl transition-all active:scale-90"
              >
                <X size={22}/>
              </button>
            </div>

            {/* FORMULARIO INTERNO CON DETECTOR DE DESBORDAMIENTO (SCROLL AUTOMÁTICO INTERNO) */}
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar" autoComplete="off">
              <input type="text" style={{ display: 'none' }} />
              <input type="password" style={{ display: 'none' }} />

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nombre Completo</label>
                <input type="text" disabled={isManager} autoComplete="off" className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none uppercase disabled:opacity-50" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Correo Electrónico</label>
                <input type="text" disabled={isManager} autoComplete="off" className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none disabled:opacity-50" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Teléfono Movil</label>
                <input type="tel" disabled={isManager} autoComplete="off" placeholder="Capturar número..." className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none disabled:opacity-50" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Rango / Privilegios</label>
                <select disabled={isManager} className="w-full p-3 bg-slate-50 rounded-xl text-xs font-black uppercase outline-none disabled:opacity-50" value={editRole} onChange={e => setEditRole(e.target.value)}>
                  <option value="STAFF">Inspector / Técnico</option>
                  <option value="MANAGER">Jefe de Sucursal</option>
                  <option value="ADMIN">Administrador Gral.</option>
                </select>
              </div>

              <div className="space-y-1 animate-in slide-in-from-top-2">
                <label className="text-[9px] font-black text-blue-600 uppercase ml-2">Sucursal Asignada</label>
                <select className="w-full p-3 bg-blue-50 rounded-xl text-xs font-bold outline-none border border-blue-100" value={editClientId} onChange={e => setEditClientId(e.target.value)}>
                  <option value="">Seleccionar empresa...</option>
                  {listaEmpresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                </select>
              </div>

              {isAdmin && (
                <div className="p-4 bg-red-50/60 border border-red-100 rounded-2xl space-y-2 mt-2">
                  <label className="text-[9px] font-black uppercase text-red-600 tracking-wider flex items-center gap-1">
                    <Lock size={12}/> Reestablecer Contraseña (Soporte)
                  </label>
                  <div className="relative flex items-center">
                    <input type={showEditPassword ? "text" : "password"} autoComplete="new-password" placeholder="Nueva contraseña temporal..." className="w-full p-2.5 pr-10 bg-white border border-red-200 rounded-xl font-bold text-xs outline-none focus:border-red-500" value={editPassword} onChange={e => setEditPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 text-slate-400 hover:text-slate-600">
                      {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[7.5px] font-bold text-red-500 leading-none px-1">Si dejas esta celda en blanco, las claves actuales del usuario no sufrirán modificaciones.</p>
                </div>
              )}
            </form>

            {/* PIE DE PÁGINA FIJO (NUNCA SE VA AL FONDO NI SE PIERDE) */}
            <div className="p-4 bg-slate-50 border-t flex gap-3 shrink-0 relative z-30">
              <button 
                type="button" 
                onClick={() => setEditingUser(null)} 
                className="flex-1 bg-white border border-slate-200 text-slate-500 font-black text-[10px] py-4 rounded-xl uppercase tracking-wider hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button"
                disabled={isSubmitting} 
                onClick={handleUpdateUser}
                className="flex-[2] bg-slate-900 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {isSubmitting ? <RefreshCw className="animate-spin" size={14}/> : "Guardar Parámetros"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}