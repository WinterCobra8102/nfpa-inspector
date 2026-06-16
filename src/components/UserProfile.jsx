import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { User, Mail, Shield, Save, RefreshCw, ChevronLeft, Lock } from 'lucide-react';

export default function UserProfile({ currentUser, setCurrentUser, navigateTo }) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(currentUser.full_name || '');

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (newPassword.trim() !== "") {
      if (newPassword !== confirmPassword) {
        toast.error("Las contraseñas introducidas no coinciden.");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
    }

    setLoading(true);
    const loadingToast = toast.loading("Actualizando perfil...");

    try {
      if (newPassword.trim() !== "") {
        const { error: authError } = await supabase.auth.updateUser({
          password: newPassword.trim()
        });
        if (authError) throw authError;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.toUpperCase() })
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      setCurrentUser({ ...currentUser, full_name: fullName.toUpperCase() });
      
      setNewPassword("");
      setConfirmPassword("");

      toast.success('Perfil actualizado correctamente', { id: loadingToast });
    } catch (err) {
      toast.error(err.message, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Función de navegación segura
  const handleGoBack = () => {
    if (typeof navigateTo === 'function') {
      // Cambia 'dashboard' por el nombre real de tu vista principal si es diferente
      navigateTo('dashboard'); 
    } else {
      console.error("⚠️ ERROR: La función 'navigateTo' no se está pasando desde el componente padre.");
      toast.error("Error de navegación. Revisa la consola.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      
      {/* BOTÓN VOLVER */}
      <div className="flex items-center justify-between">
        <button 
          type="button"
          onClick={handleGoBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-red-600 transition-all active:scale-95"
        >
          <ChevronLeft size={16} /> Volver al Panel
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6">
        <h1 className="text-slate-900 dark:text-white text-xl font-semibold">Mi Perfil</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Gestiona tu información personal y credenciales de acceso</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <div className="bg-slate-50 border-b border-slate-200 p-8 text-center">
          <div className="w-20 h-20 bg-red-600 rounded-xl mx-auto flex items-center justify-center text-white shadow-sm">
            <User size={36} />
          </div>
          <h2 className="text-slate-900 mt-4 font-semibold text-lg">{currentUser.full_name || 'Usuario'}</h2>
          <span className="inline-block mt-2 bg-red-50 text-red-600 text-xs font-medium px-3 py-1 rounded-md border border-red-100">
            {currentUser.role === 'MANAGER' ? 'Jefe de Sucursal' : currentUser.role}
          </span>
        </div>

        <form onSubmit={handleUpdate} className="p-8 space-y-6">
          <div className="grid gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-3.5 pl-11 pr-4 font-medium text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-slate-700 uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Correo Electrónico (No editable)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="text" disabled
                  value={currentUser.email}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg py-3.5 pl-11 pr-4 font-medium text-sm text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Identificador de Acceso</label>
              <div className="relative">
                <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="text" disabled
                  value={currentUser.id}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg py-3.5 pl-11 pr-4 font-mono text-xs text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mt-4 pt-6 border-t border-slate-100 space-y-4">
              <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
                <Lock size={14} className="text-red-600" /> Cambiar Contraseña de Acceso
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 ml-1">Nueva Contraseña</label>
                  <input 
                    type="password" 
                    placeholder="Min. 6 caracteres" 
                    className="w-full bg-white border border-slate-200 p-3.5 rounded-lg text-sm font-medium outline-none text-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 ml-1">Confirmar Contraseña</label>
                  <input 
                    type="password" 
                    placeholder="Repetir contraseña" 
                    className="w-full bg-white border border-slate-200 p-3.5 rounded-lg text-sm font-medium outline-none text-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed px-1">
                Si dejas estos campos vacíos, tu contraseña actual no se modificará.
              </p>
            </div>

          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-red-600 text-white rounded-lg py-3.5 font-medium text-sm shadow-sm hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <><Save size={18} /> Guardar Cambios</>}
          </button>
        </form>
      </div>
    </div>
  );
}