import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Flame,
  Lock,
  Mail,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  User,
  Building,
  Smartphone,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

export default function Login({ onLoginSuccess }) {
  // Estados generales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // viewMode: 'login' | 'request' | 'forgot' | 'request_success' | 'forgot_success'
  const [viewMode, setViewMode] = useState("login");

  // Estados de Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Estados de Solicitud de Acceso
  const [reqNombre, setReqNombre] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqRazon, setReqRazon] = useState("");
  const [reqTelefono, setReqTelefono] = useState("");

  // Estado de Recuperación
  const [forgotEmail, setForgotEmail] = useState("");

  // ==================== LÓGICA DE LOGIN (CON FIX OFFLINE) ====================
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Función interna para intentar el login offline
    const attemptOfflineLogin = () => {
      const cachedUser = localStorage.getItem("tle_user_cache");
      if (cachedUser) {
        const parsedUser = JSON.parse(cachedUser);
        // Validamos que el correo ingresado coincida con el guardado
        if (parsedUser.email === email.trim().toLowerCase()) {
          toast.success("Iniciando sesión en modo Offline");
          onLoginSuccess(parsedUser);
          return true;
        } else {
          setError(
            "El correo no coincide con el usuario guardado en este dispositivo.",
          );
          return false;
        }
      }
      setError(
        "No hay conexión a internet y no tienes una sesión guardada en este dispositivo.",
      );
      return false;
    };

    // 1. Si detecta que no hay red nativamente, entra offline directo
    if (!navigator.onLine) {
      attemptOfflineLogin();
      setLoading(false);
      return;
    }

    // 2. Si hay internet, intentamos con Supabase
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("No se pudo crear la sesión.");

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
      // 3. FALLBACK: Si falla por error de red o fetch, intentamos offline como rescate
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        if (!attemptOfflineLogin()) {
          setError(
            "Error de conexión. Verifica tu internet o intenta más tarde.",
          );
        }
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

  // ==================== LÓGICA DE SOLICITUD (API SMTP) ====================
  const handleRequestAccess = async (e) => {
    e.preventDefault();
    if (!reqNombre || !reqEmail || !reqRazon) {
      setError("Por favor completa los campos obligatorios.");
      return;
    }

    setLoading(true);
    setError(null);
    const loadingToast = toast.loading("Enviando solicitud...");

    try {
      const response = await fetch("/api/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: reqNombre.toUpperCase(),
          email: reqEmail.toLowerCase(),
          razonSocial: reqRazon.toUpperCase(),
          telefono: reqTelefono,
        }),
      });

      if (!response.ok) throw new Error("Error en el servidor");

      toast.success("Solicitud enviada", { id: loadingToast });
      setViewMode("request_success");
    } catch (err) {
      toast.error("Error al enviar la solicitud.", { id: loadingToast });
      setError("Hubo un problema al enviar la solicitud. Intenta más tarde.");
    } finally {
      setLoading(false);
    }
  };

  // ==================== LÓGICA DE RECUPERACIÓN DE CONTRASEÑA ====================
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setError("Ingresa tu correo para recuperar la contraseña.");
      return;
    }

    setLoading(true);
    setError(null);
    const loadingToast = toast.loading("Procesando solicitud...");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: window.location.origin, // Te redirige al inicio de tu app
      });

      if (error) throw error;

      toast.success("Instrucciones enviadas", { id: loadingToast });
      setViewMode("forgot_success");
    } catch (err) {
      toast.error("Error al procesar", { id: loadingToast });
      setError(
        "No pudimos enviar el correo. Verifica que esté bien escrito o contacta a soporte.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetViews = () => {
    setError(null);
    setViewMode("login");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
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

          {/* VISTA 1: INICIO DE SESIÓN */}
          {viewMode === "login" && (
            <form
              onSubmit={handleLogin}
              className="space-y-5 animate-in slide-in-from-left duration-300"
            >
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

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setViewMode("forgot");
                  }}
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-3.5 font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <>
                    Ingresar al Sistema{" "}
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setViewMode("request");
                  }}
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                >
                  ¿No tienes cuenta? Solicitar Acceso
                </button>
              </div>
            </form>
          )}

          {/* VISTA 2: SOLICITAR ACCESO */}
          {viewMode === "request" && (
            <form
              onSubmit={handleRequestAccess}
              className="space-y-4 animate-in slide-in-from-right duration-300"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Razón Social / Empresa *
                </label>
                <div className="relative">
                  <Building
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    size={16}
                  />
                  <input
                    type="text"
                    required
                    value={reqRazon}
                    onChange={(e) => setReqRazon(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 uppercase text-slate-700 dark:text-slate-200"
                    placeholder="Empresa"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Nombre Completo *
                </label>
                <div className="relative">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    size={16}
                  />
                  <input
                    type="text"
                    required
                    value={reqNombre}
                    onChange={(e) => setReqNombre(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 uppercase text-slate-700 dark:text-slate-200"
                    placeholder="Nombre completo"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Correo Institucional *
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    size={16}
                  />
                  <input
                    type="email"
                    required
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-slate-700 dark:text-slate-200"
                    placeholder="correo@empresa.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Teléfono (Opcional)
                </label>
                <div className="relative">
                  <Smartphone
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    size={16}
                  />
                  <input
                    type="tel"
                    value={reqTelefono}
                    onChange={(e) => setReqTelefono(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-slate-700 dark:text-slate-200"
                    placeholder="10 dígitos"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg py-3.5 font-semibold text-sm shadow-sm transition-colors disabled:opacity-50 active:scale-[0.98]"
                >
                  {loading ? "Enviando..." : "Solicitar Validación"}
                </button>
              </div>

              <button
                type="button"
                onClick={resetViews}
                className="w-full mt-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} /> Volver al Inicio
              </button>
            </form>
          )}

          {/* VISTA 3: RECUPERAR CONTRASEÑA */}
          {viewMode === "forgot" && (
            <form
              onSubmit={handleForgotPassword}
              className="space-y-5 animate-in slide-in-from-right duration-300"
            >
              <div className="text-center mb-2">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Recuperar Acceso
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Te enviaremos un enlace para restablecer tu contraseña. Asegúrate de revisar tu bandeja de entrada y la carpeta de spam.
                </p>
              </div>

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
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-3.5 pl-12 pr-4 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    placeholder="ejemplo@tletl.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-3.5 font-medium text-sm shadow-sm transition-all flex items-center justify-center disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  "Enviar Instrucciones"
                )}
              </button>

              <button
                type="button"
                onClick={resetViews}
                className="w-full text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} /> Regresar
              </button>
            </form>
          )}

          {/* VISTAS DE ÉXITO */}
          {(viewMode === "request_success" ||
            viewMode === "forgot_success") && (
            <div className="text-center py-4 animate-in zoom-in duration-300">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2
                  size={32}
                  className="text-green-600 dark:text-green-500"
                />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {viewMode === "request_success"
                  ? "Solicitud en Proceso"
                  : "Correo Enviado"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {viewMode === "request_success"
                  ? "Hemos recibido tu solicitud de acceso. Nuestro equipo validará la información y te contactará a la brevedad."
                  : "Si el correo está registrado en nuestro sistema, recibirás un enlace seguro para crear una nueva contraseña en los próximos minutos."}
              </p>
              <button
                onClick={resetViews}
                className="text-sm font-medium text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 flex items-center justify-center w-full gap-2"
              >
                <ArrowLeft size={16} /> Volver a Iniciar Sesión
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 p-5 text-center border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            Ingeniería en Protección Contra Incendio
            <br />
            Mérida, Yucatán ,México
          </p>
        </div>
      </div>
    </div>
  );
}
