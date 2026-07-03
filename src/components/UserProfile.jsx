import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Shield,
  Save,
  RefreshCw,
  ChevronLeft,
  Lock,
  Camera,
} from "lucide-react";

export default function UserProfile({
  currentUser,
  setCurrentUser,
  navigateTo,
}) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(currentUser.full_name || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Estado para la subida de la foto
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // --- FUNCIÓN PARA SUBIR FOTO DE PERFIL ---
  const handleAvatarUpload = async (event) => {
    try {
      setUploadingAvatar(true);

      const file = event.target.files[0];
      if (!file) return;

      // Validaciones básicas de seguridad
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, sube un archivo de imagen válido.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        // Límite de 2MB
        toast.error("La imagen es muy pesada. Máximo 2MB.");
        return;
      }

      const loadingToast = toast.loading("Subiendo foto...");

      // 1. Limpiar el nombre y crear ruta única
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      // 2. Subir imagen al bucket 'avatars' de Supabase
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 3. Obtener la URL pública de la imagen
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // 4. Actualizar la tabla de profiles con la nueva URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", currentUser.id);

      if (updateError) throw updateError;

      // 5. Actualizar el estado global para que cambie en toda la app
      if (typeof setCurrentUser === "function") {
        setCurrentUser({ ...currentUser, avatar_url: publicUrl });
      }

      toast.success("Foto de perfil actualizada con éxito", {
        id: loadingToast,
      });
    } catch (error) {
      console.error("Error al subir foto:", error);
      toast.error("Ocurrió un error al subir la imagen.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // --- FUNCIÓN PARA GUARDAR TEXTO Y CONTRASEÑA ---
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
          password: newPassword.trim(),
        });
        if (authError) throw authError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName.toUpperCase() })
        .eq("id", currentUser.id);

      if (profileError) throw profileError;

      if (typeof setCurrentUser === "function") {
        setCurrentUser({ ...currentUser, full_name: fullName.toUpperCase() });
      }

      setNewPassword("");
      setConfirmPassword("");

      toast.success("Perfil actualizado correctamente", { id: loadingToast });
    } catch (err) {
      console.error("Error al actualizar:", err);
      if (err.message && err.message.includes("is not a function")) {
        toast.success(
          "Perfil actualizado. Recarga la página para ver los cambios.",
          { id: loadingToast },
        );
      } else {
        toast.error(err.message, { id: loadingToast });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (typeof navigateTo === "function") {
      navigateTo("BACK");
    } else {
      toast.error("Error de navegación. Revisa la consola.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleGoBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-500 transition-all active:scale-95"
        >
          <ChevronLeft size={16} /> Regresar
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 transition-colors">
        <h1 className="text-slate-900 dark:text-white text-xl font-semibold">
          Mi Perfil
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Gestiona tu información personal y credenciales de acceso
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 p-8 text-center transition-colors">
          {/* FOTO DE PERFIL INTERACTIVA */}
          <div className="relative group mx-auto w-24 h-24 mb-4">
            <div className="w-full h-full bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-sm overflow-hidden border-2 border-white dark:border-slate-800 relative z-0">
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt="Perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={40} />
              )}
            </div>

            {/* Overlay para subir imagen */}
            <label className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10">
              {uploadingAvatar ? (
                <RefreshCw size={24} className="text-white animate-spin" />
              ) : (
                <>
                  <Camera size={24} className="text-white mb-1" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    Cambiar
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </label>
          </div>

          <h2 className="text-slate-900 dark:text-white font-semibold text-lg">
            {currentUser.full_name || "Usuario"}
          </h2>
          <span className="inline-block mt-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 text-xs font-medium px-3 py-1 rounded-md border border-red-100 dark:border-red-900/30">
            {currentUser.role === "MANAGER"
              ? "Jefe de Sucursal"
              : currentUser.role}
          </span>
        </div>

        <form onSubmit={handleUpdate} className="p-8 space-y-6">
          <div className="grid gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                Nombre Completo
              </label>
              <div className="relative">
                <User
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-3.5 pl-11 pr-4 font-medium text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-slate-700 dark:text-slate-200 uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                Correo Electrónico (No editable)
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600"
                  size={16}
                />
                <input
                  type="text"
                  disabled
                  value={currentUser.email}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg py-3.5 pl-11 pr-4 font-medium text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                Identificador de Acceso
              </label>
              <div className="relative">
                <Shield
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600"
                  size={16}
                />
                <input
                  type="text"
                  disabled
                  value={currentUser.id}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg py-3.5 pl-11 pr-4 font-mono text-xs text-slate-400 dark:text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Lock size={14} className="text-red-600 dark:text-red-500" />{" "}
                Cambiar Contraseña de Acceso
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="Min. 6 caracteres"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-3.5 rounded-lg text-sm font-medium outline-none text-slate-700 dark:text-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                    Confirmar Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="Repetir contraseña"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-3.5 rounded-lg text-sm font-medium outline-none text-slate-700 dark:text-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed px-1">
                Si dejas estos campos vacíos, tu contraseña actual no se
                modificará.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white rounded-lg py-3.5 font-medium text-sm shadow-sm hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <>
                <Save size={18} /> Guardar Cambios
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
