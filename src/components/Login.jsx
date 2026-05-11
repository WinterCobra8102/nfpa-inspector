import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Flame, Lock, Mail, RefreshCw, ShieldAlert, ArrowRight } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1️⃣ Login
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      // 2️⃣ Confirmar que la sesión exista realmente
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error('No se pudo crear la sesión.');
      }

      // 3️⃣ Obtener usuario autenticado correctamente
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('Usuario no autenticado.');

      // 4️⃣ Obtener perfil (requiere RLS correctamente configurado)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        setError(
          'Cuenta válida, pero no tienes un PERFIL asignado. Contacta al administrador.'
        );
        setLoading(false);
        return;
      }

      // 5️⃣ Login exitoso
      onLoginSuccess({ ...user, ...profile });

    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
      
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>

      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-red-600 p-4 rounded-[1.5rem] shadow-xl shadow-red-600/30 mb-4 animate-pulse">
              <Flame size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">
              TLETL
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">
              Monitoring System v2.0
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 rounded-xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
              <ShieldAlert className="text-red-600" size={20} />
              <p className="text-[9px] font-black text-red-700 uppercase leading-tight">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-sm outline-none focus:border-red-600 transition-all text-slate-700"
                  placeholder="ejemplo@tletl.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-sm outline-none focus:border-red-600 transition-all text-slate-700"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <>
                  Ingresar al Sistema
                  <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            Ingeniería en Protección Contra Incendio<br />
            Mérida, Yucatán
          </p>
        </div>
      </div>
    </div>
  );
}