import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Flame,
  Lock,
  Mail,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

export default function Login({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. COMPROBAR SI ESTAMOS OFFLINE ANTES DE HABLAR CON SUPABASE
    if (!navigator.onLine) {
      const cachedUser = localStorage.getItem("tle_user_cache");

      if (cachedUser) {
        toast.success("Iniciando sesión en modo Offline");
        onLoginSuccess(JSON.parse(cachedUser));
        setLoading(false);
        return;
      } else {
        setError(
          "No hay conexión a internet y no tienes una sesión guardada en este dispositivo.",
        );
        setLoading(false);
        return;
      }
    }

    // 2. SI HAY INTERNET, PROCEDER NORMALMENTE
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error("No se pudo crear la sesión.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Usuario no autenticado.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        setError(
          "Cuenta válida, pero no tienes un PERFIL asignado. Contacta al administrador.",
        );
        setLoading(false);
        return;
      }

      // Guardar en caché para futuros logins offline
      const userDataToSave = { ...user, ...profile };
      localStorage.setItem("tle_user_cache", JSON.stringify(userDataToSave));

      onLoginSuccess(userDataToSave);
    } catch (err) {
      // MANEJO DE ERRORES MEJORADO PARA RED
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        setError(
          "Error de conexión. Verifica tu internet o intenta más tarde.",
        );
      } else {
        setError(
          err.message === "Invalid login credentials"
            ? "Correo o contraseña incorrectos"
            : err.message,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos sutiles */}
      <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-50 dark:bg-red-900/10 rounded-full blur-[100px]"></div>

      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-red-600 p-3.5 rounded-xl shadow-sm mb-4">
              <Flame size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              TLETL
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Monitoring System v2.0
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300">
              <ShieldAlert
                className="text-red-600 dark:text-red-500 shrink-0"
                size={18}
              />
              <p className="text-sm text-red-700 dark:text-red-300 leading-tight">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  size={18}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-3.5 pl-12 pr-4 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  placeholder="ejemplo@tletl.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  size={18}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-3.5 pl-12 pr-4 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-3.5 font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <>
                  Ingresar al Sistema
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 p-5 text-center border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            Ingeniería en Protección Contra Incendio
            <br />
            Mérida, Yucatán
          </p>
        </div>
      </div>
    </div>
  );
}
