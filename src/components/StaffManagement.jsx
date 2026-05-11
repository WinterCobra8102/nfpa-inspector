import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js'; 
import toast from 'react-hot-toast'; 
import { showConfirmDelete } from '../alerts'; 
import { 
  Users, UserPlus, Trash2, Shield, Mail, 
  RefreshCw, CheckCircle, X, Lock, Eye, EyeOff, Edit
} from 'lucide-react';

export default function StaffManagement({ currentUser }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ESTADOS DE CREACIÓN
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('STAFF');
  const [showPassword, setShowPassword] = useState(false);

  // ESTADOS DE EDICIÓN
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('STAFF');
  const [editPassword, setEditPassword] = useState(''); // <-- NUEVO ESTADO PARA PASSWORD EDITABLE
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      fetchStaff();

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

  // --- FUNCIÓN DE REGISTRO ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newEmail || !newName || !newPassword) {
      toast.error("Todos los campos son obligatorios.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setIsSubmitting(true);
    const loadingToast = toast.loading("Registrando técnico...");

    try {
      const ghostClient = createClient(
        'https://wkjqbtmnrqbafzytrtfn.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFidG1ucnFiYWZ6eXRydGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjkwNTEsImV4cCI6MjA5Mzg0NTA1MX0.FVAh5nO7m0ixIuEM--uQqy3lRBYpz3L4GqodSDOmGkc',
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
      const { error: authError } = await ghostClient.auth.signUp({ email: newEmail, password: newPassword });
      if (authError) throw authError;

      const { error: rpcError } = await supabase.rpc('admin_set_role', {
        target_email: newEmail, new_role: newRole, full_name_val: newName
      });
      if (rpcError) throw rpcError;

      toast.success(`${newName} ha sido registrado oficialmente.`, { id: loadingToast });
      setNewEmail(''); setNewName(''); setNewPassword('');
    } catch (err) {
      toast.error("Error al registrar: " + err.message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FUNCIÓN ABRIR MODAL EDICIÓN ---
  const openEditModal = (person) => {
    setEditingUser(person);
    setEditName(person.full_name);
    setEditRole(person.role);
    setEditEmail(''); 
    setEditPassword(''); // Reiniciamos el password
    setShowEditPassword(false);
  };

  // --- FUNCIÓN GUARDAR EDICIÓN ---
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (editPassword && editPassword.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Actualizando perfil...");

    try {
      const { error } = await supabase.rpc('admin_update_user', {
        target_user_id: editingUser.id,
        new_email: editEmail, 
        new_name: editName,
        new_role: editRole,
        new_password: editPassword // <-- Enviamos la contraseña a la base de datos
      });

      if (error) throw error;
      toast.success(`Perfil de ${editName} actualizado.`, { id: loadingToast });
      setEditingUser(null);
    } catch (err) {
      toast.error("Error al actualizar: " + err.message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FUNCIÓN DE BORRADO ---
  const handleDelete = (userId, userName) => {
    showConfirmDelete(userName, async () => {
      const deleteToast = toast.loading("Eliminando del sistema...");
      try {
        const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
        if (error) throw error;
        toast.success(`${userName} eliminado correctamente.`, { id: deleteToast });
      } catch (err) {
        toast.error("Error al eliminar: " + err.message, { id: deleteToast });
      }
    });
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-20 text-center space-y-4">
        <Shield size={64} className="text-red-600 opacity-20" />
        <h2 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Acceso Restringido</h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Solo personal administrativo de TLETL puede gestionar el equipo</p>
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
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1">Panel de Control de Inspectores</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* FORMULARIO DE CREACIÓN */}
        <div className="md:col-span-1 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-lg h-fit">
          <h3 className="font-black uppercase text-xs mb-6 flex items-center gap-2 border-b pb-4">
            <UserPlus size={16} className="text-red-600"/> Nuevo Técnico
          </h3>
          
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Email de Acceso</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input 
                  type="email" placeholder="correo@tletl.com" autoComplete="off"
                  className="w-full p-3 pl-10 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-red-500 outline-none transition-all"
                  value={newEmail} onChange={e => setNewEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nombre Completo</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input 
                  type="text" placeholder="Nombre del inspector" autoComplete="off"
                  className="w-full p-3 pl-10 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-red-500 outline-none transition-all"
                  value={newName} onChange={e => setNewName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Contraseña Temporal</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input 
                  type={showPassword ? "text" : "password"} placeholder="Min. 6 caracteres" autoComplete="new-password"
                  className="w-full p-3 pl-10 pr-10 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-red-500 outline-none transition-all"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Rango en TLETL</label>
              <select 
                className="w-full p-3 bg-slate-50 rounded-xl text-xs font-black uppercase border-2 border-transparent focus:border-red-500 outline-none transition-all"
                value={newRole} onChange={e => setNewRole(e.target.value)}
              >
                <option value="STAFF">Inspector / Técnico</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>

            <button disabled={isSubmitting} className="w-full py-4 mt-2 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {isSubmitting ? <RefreshCw className="animate-spin" size={16}/> : "Registrar Técnico"}
            </button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-3">
          {loading ? (
            <div className="p-10 text-center animate-pulse text-slate-400 font-black uppercase text-[10px] tracking-widest italic">Cargando equipo...</div>
          ) : (
            staff.map(person => (
              <div key={person.id} className="bg-white p-5 rounded-[1.5rem] border-2 border-slate-50 shadow-sm flex items-center justify-between group hover:border-red-100 transition-all animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shadow-lg ${person.role === 'ADMIN' ? 'bg-red-600 shadow-red-600/20' : 'bg-slate-800'}`}>
                    {person.full_name?.charAt(0).toUpperCase() || 'T'}
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase text-slate-800 leading-none">{person.full_name || 'Técnico'}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${person.role === 'ADMIN' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                        {person.role}
                      </span>
                      <span className="text-slate-200 text-xs">|</span>
                      <span className="text-[9px] font-bold text-green-500 uppercase tracking-tighter flex items-center gap-1">
                        <CheckCircle size={10} /> ONLINE
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openEditModal(person)}
                    className="p-3 text-slate-300 hover:text-blue-500 transition-colors active:scale-90"
                    title="Editar Perfil"
                  >
                    <Edit size={20} />
                  </button>
                  <button 
                    onClick={() => handleDelete(person.id, person.full_name)}
                    className="p-3 text-slate-300 hover:text-red-600 transition-colors active:scale-90"
                    title="Eliminar Usuario"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
          {staff.length === 0 && !loading && (
            <div className="bg-slate-50/50 border-4 border-dashed border-slate-100 p-20 rounded-[3rem] text-center">
                <Users size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="font-black text-slate-300 uppercase text-xs tracking-widest">No hay personal registrado</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE EDICIÓN FLOTANTE */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in p-4">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl relative border-4 border-slate-50 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setEditingUser(null)} 
              className="absolute top-6 right-6 text-slate-300 hover:text-red-600 transition-colors bg-slate-50 p-2 rounded-full"
            >
              <X size={20}/>
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl"><Edit size={24}/></div>
              <div>
                <h3 className="font-black text-xl uppercase tracking-tighter text-slate-800 leading-none">Editar Perfil</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Modificando a {editingUser.full_name}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Modificar Nombre</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input 
                    type="text" 
                    className="w-full p-3 pl-10 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all"
                    value={editName} onChange={e => setEditName(e.target.value)} required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 flex justify-between pr-2">
                  <span>Modificar Correo</span>
                  <span className="text-slate-300">(Opcional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input 
                    type="email" placeholder="Dejar en blanco para no cambiar"
                    className="w-full p-3 pl-10 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                    value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* CAJA DE CONTRASEÑA NUEVA */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 flex justify-between pr-2">
                  <span>Modificar Contraseña</span>
                  <span className="text-slate-300">(Opcional)</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input 
                    type={showEditPassword ? "text" : "password"} 
                    placeholder="Dejar en blanco para no cambiar" autoComplete="new-password"
                    className="w-full p-3 pl-10 pr-10 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                    value={editPassword} onChange={e => setEditPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors">
                    {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Modificar Rango</label>
                <select 
                  className="w-full p-3 bg-slate-50 rounded-xl text-xs font-black uppercase border-2 border-transparent focus:border-blue-500 outline-none transition-all"
                  value={editRole} onChange={e => setEditRole(e.target.value)}
                >
                  <option value="STAFF">Inspector / Técnico</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <button disabled={isSubmitting} className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <RefreshCw className="animate-spin" size={16}/> : "Guardar Cambios"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}