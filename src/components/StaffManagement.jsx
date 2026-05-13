import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js'; 
import toast from 'react-hot-toast'; 
import { showConfirmDelete } from '../alerts'; 
import { 
  Users, UserPlus, Trash2, Shield, Mail, 
  RefreshCw, CheckCircle, X, Lock, Eye, EyeOff, Edit, Building2
} from 'lucide-react';

export default function StaffManagement({ currentUser }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- ESTADOS PARA GESTIÓN DE EMPRESAS ---
  const [listaEmpresas, setListaEmpresas] = useState([]);
  const [newClientId, setNewClientId] = useState('');
  const [editClientId, setEditClientId] = useState('');

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
  const [editPassword, setEditPassword] = useState(''); 
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      fetchStaff();
      fetchEmpresas(); // <-- Cargamos empresas al inicio

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

  // --- FUNCIÓN PARA CARGAR EMPRESAS ---
  async function fetchEmpresas() {
    const { data } = await supabase.from('clientes').select('id, nombre').order('nombre', { ascending: true });
    if (data) setListaEmpresas(data);
  }

  // --- FUNCIÓN DE REGISTRO ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newEmail || !newName || !newPassword) {
      toast.error("Todos los campos son obligatorios.");
      return;
    }
    // Validación si es manager
    if (newRole === 'MANAGER' && !newClientId) {
      toast.error("Debes asignar una empresa al encargado.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setIsSubmitting(true);
    const loadingToast = toast.loading("Registrando usuario...");

    try {
      const ghostClient = createClient(
        'https://wkjqbtmnrqbafzytrtfn.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFidG1ucnFiYWZ6eXRydGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjkwNTEsImV4cCI6MjA5Mzg0NTA1MX0.FVAh5nO7m0ixIuEM--uQqy3lRBYpz3L4GqodSDOmGkc',
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
      const { error: authError } = await ghostClient.auth.signUp({ email: newEmail, password: newPassword });
      if (authError) throw authError;

      // Seteamos el rol básico
      const { error: rpcError } = await supabase.rpc('admin_set_role', {
        target_email: newEmail, new_role: newRole, full_name_val: newName
      });
      if (rpcError) throw rpcError;

      // VINCULAMOS EMPRESA SI ES MANAGER
      if (newRole === 'MANAGER' && newClientId) {
        await supabase.from('profiles').update({ client_id: newClientId }).eq('email', newEmail);
      }

      toast.success(`${newName} registrado correctamente.`, { id: loadingToast });
      setNewEmail(''); setNewName(''); setNewPassword(''); setNewClientId('');
    } catch (err) {
      toast.error("Error: " + err.message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FUNCIÓN ABRIR MODAL EDICIÓN ---
  const openEditModal = (person) => {
    setEditingUser(person);
    setEditName(person.full_name);
    setEditRole(person.role);
    setEditClientId(person.client_id || ''); // <-- Cargamos su empresa actual
    setEditEmail(''); 
    setEditPassword(''); 
    setShowEditPassword(false);
  };

  // --- FUNCIÓN GUARDAR EDICIÓN ---
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const loadingToast = toast.loading("Actualizando perfil...");

    try {
      const { error } = await supabase.rpc('admin_update_user', {
        target_user_id: editingUser.id,
        new_email: editEmail, 
        new_name: editName,
        new_role: editRole,
        new_password: editPassword 
      });

      if (error) throw error;

      // ACTUALIZAMOS VÍNCULO DE EMPRESA
      await supabase.from('profiles').update({ 
        client_id: editRole === 'MANAGER' ? editClientId : null 
      }).eq('id', editingUser.id);

      toast.success("Perfil actualizado.", { id: loadingToast });
      setEditingUser(null);
    } catch (err) {
      toast.error("Error: " + err.message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FUNCIÓN DE BORRADO ---
  const handleDelete = (userId, userName) => {
    showConfirmDelete(userName, async () => {
      const deleteToast = toast.loading("Eliminando...");
      try {
        const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
        if (error) throw error;
        toast.success(`${userName} eliminado.`, { id: deleteToast });
      } catch (err) {
        toast.error("Error: " + err.message, { id: deleteToast });
      }
    });
  };

  if (currentUser?.role !== 'ADMIN') {
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
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1">Control de Usuarios y Roles</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* FORMULARIO DE CREACIÓN */}
        <div className="md:col-span-1 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-lg h-fit">
          <h3 className="font-black uppercase text-xs mb-6 flex items-center gap-2 border-b pb-4">
            <UserPlus size={16} className="text-red-600"/> Nuevo Registro
          </h3>
          
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Email</label>
              <input type="email" className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nombre</label>
              <input type="text" className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Password</label>
              <input type={showPassword ? "text" : "password"} className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Rango</label>
              <select className="w-full p-3 bg-slate-50 rounded-xl text-xs font-black uppercase outline-none" value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="STAFF">Inspector / Técnico</option>
                <option value="MANAGER">Jefe de Sucursal</option>
                <option value="ADMIN">Administrador Gral.</option>
              </select>
            </div>

            {/* DESPLEGABLE EMPRESA CREACIÓN */}
            {newRole === 'MANAGER' && (
              <div className="space-y-1 animate-in slide-in-from-top-2">
                <label className="text-[9px] font-black text-blue-600 uppercase ml-2 flex items-center gap-1"><Building2 size={10}/> Asignar Sucursal</label>
                <select className="w-full p-3 bg-blue-50 rounded-xl text-xs font-bold outline-none border border-blue-100" value={newClientId} onChange={e => setNewClientId(e.target.value)}>
                  <option value="">Seleccionar empresa...</option>
                  {listaEmpresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                </select>
              </div>
            )}

            <button disabled={isSubmitting} className="w-full py-4 mt-2 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
              {isSubmitting ? <RefreshCw className="animate-spin" size={16}/> : "Registrar"}
            </button>
          </form>
        </div>

        {/* LISTADO */}
        <div className="md:col-span-2 space-y-3">
          {loading ? (
            <div className="p-10 text-center animate-pulse text-slate-400 font-black uppercase text-[10px]">Cargando...</div>
          ) : (
            staff.map(person => (
              <div key={person.id} className="bg-white p-5 rounded-[1.5rem] border-2 border-slate-50 shadow-sm flex items-center justify-between group hover:border-red-100 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black ${person.role === 'ADMIN' ? 'bg-red-600' : person.role === 'MANAGER' ? 'bg-blue-600' : 'bg-slate-800'}`}>
                    {person.full_name?.charAt(0).toUpperCase() || 'T'}
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase text-slate-800 leading-none">{person.full_name}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-slate-100 text-slate-500">
                        {person.role === 'MANAGER' ? 'JEFE SUCURSAL' : person.role}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(person)} className="p-3 text-slate-300 hover:text-blue-500 transition-colors"><Edit size={20} /></button>
                  <button onClick={() => handleDelete(person.id, person.full_name)} className="p-3 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={20} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL DE EDICIÓN */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setEditingUser(null)} className="absolute top-6 right-6 text-slate-300 hover:text-red-600"><X size={20}/></button>
            <h3 className="font-black text-xl uppercase tracking-tighter mb-6">Editar Usuario</h3>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nombre</label>
                <input type="text" className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Rango</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl text-xs font-black uppercase outline-none" value={editRole} onChange={e => setEditRole(e.target.value)}>
                  <option value="STAFF">Inspector / Técnico</option>
                  <option value="MANAGER">Jefe de Sucursal</option>
                  <option value="ADMIN">Administrador Gral.</option>
                </select>
              </div>

              {/* DESPLEGABLE EMPRESA EDICIÓN */}
              {editRole === 'MANAGER' && (
                <div className="space-y-1 animate-in slide-in-from-top-2">
                  <label className="text-[9px] font-black text-blue-600 uppercase ml-2">Sucursal Asignada</label>
                  <select className="w-full p-3 bg-blue-50 rounded-xl text-xs font-bold outline-none border border-blue-100" value={editClientId} onChange={e => setEditClientId(e.target.value)}>
                    <option value="">Seleccionar empresa...</option>
                    {listaEmpresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                  </select>
                </div>
              )}

              <button disabled={isSubmitting} className="w-full py-4 mt-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">
                {isSubmitting ? "Cargando..." : "Guardar Cambios"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}