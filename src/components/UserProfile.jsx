import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast'; // <-- IMPORTAMOS NUESTRO SISTEMA GLOBAL DE ALERTAS
import { User, Mail, Shield, Save, RefreshCw, ChevronLeft, Lock } from 'lucide-react';

export default function UserProfile({ currentUser, setCurrentUser, navigateTo }) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(currentUser.full_name || '');

  // === NUEVOS ESTADOS COMPATIBLES PARA AUTOGESTIÓN DE CONTRASEÑA ===
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdate = async (e) => {
    e.preventDefault();

    // === VALIDACIONES DE SEGURIDAD ANTES DE ENVIAR A LA NUBE ===
    if (newPassword.trim() !== "") {
      if (newPassword !== confirmPassword) {
        toast.error("⚠️ Las contraseñas introducidas no coinciden.");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("⚠️ La contraseña debe tener al menos 6 caracteres.");
        return;
      }
    }

    setLoading(true);
    const loadingToast = toast.loading("Actualizando perfil...");

    try {
      // 1. Si el usuario capturó campos de contraseña, actualizamos sus credenciales en Supabase Auth
      if (newPassword.trim() !== "") {
        const { error: authError } = await supabase.auth.updateUser({
          password: newPassword.trim()
        });
        if (authError) throw authError;
      }

      // 2. Actualizamos los metadatos públicos en la tabla de perfiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.toUpperCase() }) // Normalizamos a mayúsculas institucionales
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      // Actualizar el estado global en App.jsx para que el header cambie al instante
      setCurrentUser({ ...currentUser, full_name: fullName.toUpperCase() });
      
      // Reseteamos las cajas de texto de claves de forma limpia
      setNewPassword("");
      setConfirmPassword("");

      // Actualizamos el toast a éxito
      toast.success('Perfil actualizado correctamente', { id: loadingToast });
    } catch (err) {
      // Actualizamos el toast a error
      toast.error(err.message, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in duration-500">
      {/* CABECERA */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigateTo('home')}
          className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-red-600 transition-all"
        >
          <ChevronLeft size={16} /> Volver al Panel
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-slate-50">
        <div className="bg-slate-900 p-10 text-center relative">
          <div className="w-24 h-24 bg-red-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-2xl shadow-red-600/40 relative z-10">
            <User size={48} />
          </div>
          <h2 className="text-white mt-4 font-black uppercase tracking-tight text-xl">{currentUser.full_name || 'Usuario'}</h2>
          <span className="bg-red-600/20 text-red-500 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-red-500/30">
            {currentUser.role === 'MANAGER' ? 'JEFE DE SUCURSAL' : currentUser.role}
          </span>
        </div>

        <form onSubmit={handleUpdate} className="p-10 space-y-6">
          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-sm outline-none focus:border-red-600 transition-all text-slate-700 uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Correo Electrónico (No editable)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-200" size={18} />
                <input 
                  type="text" disabled
                  value={currentUser.email}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-12 pr-4 font-bold text-sm text-slate-300 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Identificador de Acceso</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-200" size={18} />
                <input 
                  type="text" disabled
                  value={currentUser.id}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-12 pr-4 font-mono text-[10px] text-slate-300 cursor-not-allowed"
                />
              </div>
            </div>

            {/* === BLOQUE DE AJUSTE RESPONSIVE: APARTADO REAL DE AUTOGESTIÓN DE CLAVES === */}
            <div className="mt-4 pt-6 border-t border-slate-100 space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Lock size={12} className="text-red-600" /> Cambiar Contraseña de Acceso
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-2">Nueva Contraseña</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl text-sm font-bold outline-none text-slate-700 focus:border-red-600 transition-all"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-2">Confirmar Contraseña</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl text-sm font-bold outline-none text-slate-700 focus:border-red-600 transition-all"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[8px] font-bold text-slate-400 leading-none px-1 uppercase tracking-tight">
                Si dejas estos campos vacíos, tu contraseña de acceso actual no sufrirá cambios.
              </p>
            </div>

          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <RefreshCw size={20} className="animate-spin" /> : <><Save size={20} /> Guardar Cambios</>}
          </button>
        </form>
      </div>
    </div>
  );
}