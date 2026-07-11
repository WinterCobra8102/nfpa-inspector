import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import { showConfirmDelete } from "../alerts";
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  RefreshCw,
  X,
  Lock,
  Eye,
  EyeOff,
  Edit,
  Building2,
  Smartphone,
  Globe,
  MapPin,
} from "lucide-react";

export default function StaffManagement({ currentUser }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [listaEmpresas, setListaEmpresas] = useState([]);
  const [listaTenants, setListaTenants] = useState([]);
  const [newClientId, setNewClientId] = useState("");
  const [editClientId, setEditClientId] = useState("");

  // ESTADOS DE CREACIÓN
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState("STAFF");
  const [newTenantId, setNewTenantId] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ESTADOS DE CREACIÓN DE NUEVA REGIÓN (GOOGLE MAPS)
  const [showNewTenantInput, setShowNewTenantInput] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [creatingTenant, setCreatingTenant] = useState(false);
  const regionInputRef = useRef(null);

  // ESTADOS DE EDICIÓN
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("STAFF");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editTenantId, setEditTenantId] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  // --- REGLA DE SEGURIDAD MAESTRA (ISAI MOO) ---
  const isSuperAdmin =
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.email === "isacm6635@gmail.com";
  const isAdmin = currentUser?.role === "ADMIN" || isSuperAdmin;
  const isManager = currentUser?.role === "MANAGER"; 

  // INICIALIZACIÓN INICIAL
  useEffect(() => {
    if (isAdmin || isManager) {
      fetchStaff();
      fetchEmpresas();
      if (isSuperAdmin) fetchTenants();

      const channel = supabase
        .channel("profiles-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          () => {
            fetchStaff();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  // INICIALIZACIÓN DE GOOGLE MAPS AUTOCOMPLETE
  useEffect(() => {
    if (showNewTenantInput && regionInputRef.current && window.google) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        regionInputRef.current,
        {
          types: ["(regions)"], 
        },
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place && place.formatted_address) {
          setNewTenantName(place.formatted_address.toUpperCase());
        }
      });
    }
  }, [showNewTenantInput]);

  // ==================== LÓGICA DE FILTRADO SAAS (TENANTS) ====================
  async function fetchStaff() {
    let query = supabase
      .from("profiles")
      .select("*, tenants(nombre)")
      .neq("role", "CLIENTE");

    if (!isSuperAdmin) {
      query = query.eq("tenant_id", currentUser.tenant_id);
    }

    query = query.order("full_name", { ascending: true });

    const { data, error } = await query;
    if (!error) setStaff(data);
    setLoading(false);
  }

  async function fetchEmpresas() {
    let query = supabase
      .from("clientes")
      .select("id, nombre, is_active")
      .order("nombre", { ascending: true });
    if (!isSuperAdmin) {
      query = query.eq("tenant_id", currentUser.tenant_id);
    }
    const { data } = await query;
    if (data) setListaEmpresas(data);
  }

  async function fetchTenants() {
    const { data } = await supabase
      .from("tenants")
      .select("id, nombre")
      .order("nombre", { ascending: true });
    if (data) setListaTenants(data);
  }

  // ==================== CREAR REGIÓN ====================
  const handleCreateNewTenant = async () => {
    if (!newTenantName.trim()) {
      toast.error("Busca y selecciona una región de Google Maps.");
      return;
    }

    setCreatingTenant(true);
    const tId = toast.loading("Registrando nueva jurisdicción...");

    try {
      const { data, error } = await supabase
        .from("tenants")
        .insert([
          { nombre: newTenantName.trim().toUpperCase(), is_active: true },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success(`Región ${data.nombre} dada de alta con éxito.`, {
        id: tId,
      });
      await fetchTenants();
      setNewTenantId(data.id);
      setNewTenantName("");
      setShowNewTenantInput(false);
    } catch (err) {
      toast.error("Error al crear la región: " + err.message, { id: tId });
    } finally {
      setCreatingTenant(false);
    }
  };

  // ==================== SEPARACIÓN VISUAL DE PERSONAL ====================
  const regionalAdmins = useMemo(() => {
    if (!isAdmin) return [];
    return staff.filter(
      (person) =>
        person.role === "SUPER_ADMIN" ||
        person.role === "ADMIN" ||
        person.email === "isacm6635@gmail.com",
    );
  }, [staff, isAdmin]);

  const operativeTeam = useMemo(() => {
    let team = staff.filter(
      (person) => person.role === "MANAGER" || person.role === "STAFF",
    );
    if (isManager) {
      team = team.filter((person) => person.role === "STAFF");
    }
    return team;
  }, [staff, isManager]);

  // ==================== CREAR USUARIO Y ENVIAR CORREO ====================
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (!newEmail || !newName || !newPassword) {
      toast.error("Todos los campos obligatorios deben llenarse.");
      return;
    }
    if (newRole === "MANAGER" && !newClientId) {
      toast.error("Debes asignar una empresa a este Jefe de Sucursal.");
      return;
    }
    if (isSuperAdmin && newRole === "ADMIN" && !newTenantId) {
      toast.error("Debes asignar una Región/Franquicia a este Admin Regional.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Creando usuario y enviando accesos...");

    try {
      // 1. Asignación de Región (Tenant)
      let assignedTenantId = currentUser.tenant_id;
      if (isSuperAdmin) {
        if (newRole === "SUPER_ADMIN") assignedTenantId = null;
        if (newRole === "ADMIN") assignedTenantId = newTenantId;
      }

      // 2. Creación en Supabase Auth
      const { data: newUserId, error: rpcError } = await supabase.rpc(
        "admin_create_user",
        {
          p_email: newEmail.trim().toLowerCase(),
          p_password: newPassword,
          p_full_name: newName.toUpperCase(),
          p_role: newRole,
          p_client_id: newRole === "MANAGER" ? newClientId : null,
        },
      );

      if (rpcError) throw rpcError;

      // 3. Actualización de Perfil (Profiles)
      await supabase
        .from("profiles")
        .update({
          phone: newPhone || null,
          email: newEmail.trim().toLowerCase(),
          tenant_id: assignedTenantId,
        })
        .eq("id", newUserId);

      // 4. DISPARO DEL CORREO DE BIENVENIDA (API SMTP)
      try {
        let nombreRegion = "YUCATÁN"; // Default
        if (isSuperAdmin && newTenantId) {
          const tenantInfo = listaTenants.find((t) => t.id === newTenantId);
          if (tenantInfo) nombreRegion = tenantInfo.nombre;
          else nombreRegion = "ADMINISTRACIÓN CENTRAL";
        } else if (currentUser?.tenants?.nombre) {
          nombreRegion = currentUser.tenants.nombre;
        }

        const emailResponse = await fetch("/api/notify-registration", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: newEmail.trim().toLowerCase(),
            name: newName.toUpperCase(),
            password: newPassword,
            role: newRole,
            razonSocial: nombreRegion,
          }),
        });

        if (!emailResponse.ok) {
           console.warn("La API de correos devolvió un error, pero el usuario sí se creó.");
        }
      } catch (emailErr) {
        console.warn("Falla de red al enviar el correo:", emailErr);
      }
      
      // 5. Finalizar con éxito
      toast.success(
        `${newName.toUpperCase()} dado de alta. Credenciales enviadas.`,
        { id: loadingToast }
      );

      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewClientId("");
      setNewTenantId("");
      setNewPhone("");
      setNewRole("STAFF");
      setShowPassword(false);
      fetchStaff();
    } catch (err) {
      console.error("Error al crear usuario:", err);
      toast.error("Error al registrar: " + err.message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (person) => {
    setEditingUser(person);
    setEditName(person.full_name || "");
    setEditEmail(person.email || "");
    setEditRole(person.role);
    setEditPhone(person.phone || "");
    setEditClientId(person.client_id || "");
    setEditTenantId(person.tenant_id || "");
    setEditPassword("");
    setShowEditPassword(false);
  };

  const handleUpdateUser = async (e) => {
    if (e) e.preventDefault();

    if (editPassword.trim() !== "" && editPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Actualizando parámetros...");

    try {
      const isSelfEditing = editingUser.id === currentUser?.id;

      if (isSelfEditing && editPassword.trim() !== "") {
        const { error: authError } = await supabase.auth.updateUser({
          password: editPassword.trim(),
        });
        if (authError) throw authError;
      }

      if (isAdmin) {
        const { error } = await supabase.rpc("admin_update_user", {
          target_user_id: editingUser.id,
          new_email: editEmail,
          new_name: editName.toUpperCase(),
          new_role: editRole,
          new_password:
            !isSelfEditing && editPassword.trim() !== ""
              ? editPassword.trim()
              : "",
        });
        if (error) throw error;

        await supabase
          .from("profiles")
          .update({
            client_id: editRole === "MANAGER" ? editClientId : null,
            tenant_id:
              isSuperAdmin && editRole === "ADMIN"
                ? editTenantId
                : editingUser.tenant_id,
            phone: editPhone || null,
            email: editEmail.trim().toLowerCase(),
            full_name: editName.toUpperCase(),
          })
          .eq("id", editingUser.id);
      } else if (isManager) {
        const updateData = { client_id: editClientId || null };
        if (isSelfEditing) {
          updateData.phone = editPhone || null;
          updateData.full_name = editName.toUpperCase();
        }
        const { error } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", editingUser.id);
        if (error) throw error;
      }

      toast.success("Parámetros actualizados con éxito.", { id: loadingToast });
      setEditingUser(null);
      fetchStaff();
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
        const { error } = await supabase.rpc("admin_delete_user", {
          target_user_id: userId,
        });
        if (error) throw error;
        toast.success(`${userName} eliminado del sistema.`, {
          id: deleteToast,
        });
        fetchStaff();
      } catch (err) {
        toast.error("Error: " + err.message, { id: deleteToast });
      }
    });
  };

  if (!isAdmin && !isManager) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-20 text-center space-y-4">
        <Shield size={48} className="text-red-600 opacity-20" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-xl">
          Acceso Restringido
        </h2>
      </div>
    );
  }

  const canModifyFields = (person) => {
    if (isSuperAdmin) return true;
    if (
      isAdmin &&
      person.role !== "SUPER_ADMIN" &&
      person.email !== "isacm6635@gmail.com"
    )
      return true;
    if (isManager && person?.id === currentUser?.id) return true;
    return false;
  };

  const UserCard = ({ person }) => {
    const isThisUserSuper =
      person.role === "SUPER_ADMIN" || person.email === "isacm6635@gmail.com";

    return (
      <div
        key={person.id}
        className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm overflow-hidden shrink-0 border border-slate-100 dark:border-slate-700 ${!person.avatar_url ? (person.role === "ADMIN" || isThisUserSuper ? "bg-slate-900 dark:bg-white dark:text-slate-900" : person.role === "MANAGER" ? "bg-blue-600" : "bg-red-600") : "bg-transparent"}`}
          >
            {person.avatar_url ? (
              <img
                src={person.avatar_url}
                alt={person.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              person.full_name?.charAt(0).toUpperCase() || "U"
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200">
                {person.full_name || "Sin Nombre"}{" "}
                {person.id === currentUser?.id && (
                  <span className="text-blue-500 dark:text-blue-400 font-normal text-xs">
                    (tú)
                  </span>
                )}
              </h4>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${isThisUserSuper ? "bg-amber-100 text-amber-700 border border-amber-200" : person.role === "ADMIN" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : person.role === "MANAGER" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"}`}
              >
                {isThisUserSuper
                  ? "Admin General"
                  : person.role === "MANAGER"
                    ? "Jefe Sucursal"
                    : person.role === "STAFF"
                      ? "Técnico"
                      : "Admin Regional"}
                {person.role === "ADMIN" &&
                  person.tenants?.nombre &&
                  ` | ${person.tenants.nombre}`}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {person.email}{" "}
              {person.phone && (
                <span className="text-slate-500 dark:text-slate-400">
                  {" "}
                  · {person.phone}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => openEditModal(person)}
            className="p-2.5 text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Edit size={18} />
          </button>
          {isAdmin && currentUser?.id !== person.id && !isThisUserSuper && (
            <button
              onClick={() => handleDelete(person.id, person.full_name)}
              className="p-2.5 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
            <Users size={24} className="text-red-600 dark:text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Gestión de Equipo
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Directorio Central de Usuarios
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {isAdmin ? (
          <div className="md:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
              <UserPlus size={16} className="text-red-600 dark:text-red-500" />{" "}
              Nuevo Registro
            </h3>

            <form
              onSubmit={handleCreateUser}
              autoComplete="off"
              className="space-y-4 text-slate-700 dark:text-slate-300"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  name="fake_name_create"
                  autoComplete="off"
                  placeholder="Ej: Carlos Mendoza"
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium outline-none uppercase focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-slate-800 dark:text-slate-200"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  name="fake_email_create"
                  autoComplete="off"
                  placeholder="ejemplo@tletl.com"
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-slate-800 dark:text-slate-200"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Teléfono Celular
                </label>
                <div className="relative flex items-center">
                  <Smartphone
                    size={14}
                    className="absolute left-3 text-slate-400 dark:text-slate-500"
                  />
                  <input
                    type="tel"
                    name="fake_phone_create"
                    autoComplete="off"
                    placeholder="9999002211"
                    className="w-full p-3 pl-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-slate-800 dark:text-slate-200"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Password Inicial
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="fake_password_create"
                    autoComplete="new-password"
                    placeholder="Min. 6 caracteres"
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium outline-none pr-10 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-slate-800 dark:text-slate-200"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Rango / Rol
                </label>
                <select
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-slate-800 dark:text-slate-200"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="STAFF">Inspector / Técnico</option>
                  <option value="MANAGER">Jefe de Sucursal</option>

                  {isSuperAdmin && (
                    <option value="ADMIN">Admin Regional</option>
                  )}
                  {isSuperAdmin && (
                    <option value="SUPER_ADMIN">Admin General</option>
                  )}
                </select>
              </div>

              {newRole === "MANAGER" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-blue-600 dark:text-blue-400 ml-1 flex items-center gap-1">
                    <Building2 size={12} /> Asignar Sucursal
                  </label>
                  <select
                    className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                  >
                    <option value="">Seleccionar empresa...</option>
                    {listaEmpresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ASIGNACIÓN Y CREACIÓN DE REGIÓN (Con Google Maps) */}
              {isSuperAdmin && newRole === "ADMIN" && (
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700 mt-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xs font-bold text-amber-600 dark:text-amber-500 flex items-center gap-1">
                      <Globe size={12} /> Asignar Región/País (SaaS)
                    </label>
                    {!showNewTenantInput && (
                      <button
                        type="button"
                        onClick={() => setShowNewTenantInput(true)}
                        className="text-[10px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full transition-colors"
                      >
                        + Nueva Región
                      </button>
                    )}
                  </div>

                  {showNewTenantInput ? (
                    <div className="flex gap-2">
                      <div className="relative w-full">
                        <MapPin
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-500/50"
                          size={14}
                        />
                        <input
                          ref={regionInputRef}
                          type="text"
                          placeholder="Buscar estado o país..."
                          className="w-full p-2.5 pl-8 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-sm font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 uppercase text-slate-800 dark:text-slate-200"
                          value={newTenantName}
                          onChange={(e) => setNewTenantName(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateNewTenant}
                        disabled={creatingTenant || !newTenantName}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-3 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        {creatingTenant ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          "Guardar"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewTenantInput(false);
                          setNewTenantName("");
                        }}
                        className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <select
                      className="w-full p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg text-sm font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
                      value={newTenantId}
                      onChange={(e) => setNewTenantId(e.target.value)}
                    >
                      <option value="">Seleccionar región...</option>
                      {listaTenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 mt-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  "Registrar en Sistema"
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="md:col-span-1 bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 h-fit">
            <Shield size={20} className="text-blue-500 dark:text-blue-400" />
            <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">
              Acceso de Monitoreo
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Como Jefe de Sucursal puedes ver el equipo asignado y editar tu
              propio perfil.
            </p>
          </div>
        )}

        <div className="md:col-span-2 space-y-8">
          {loading ? (
            <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm">
              Cargando directorio...
            </div>
          ) : (
            <>
              {isAdmin && regionalAdmins.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 pl-1 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <Shield size={14} /> Administradores Generales y Regionales
                  </h3>
                  {regionalAdmins.map((person) => (
                    <UserCard key={person.id} person={person} />
                  ))}
                </div>
              )}

              {operativeTeam.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 pl-1 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <Users size={14} /> Equipo Operativo y Técnico
                  </h3>
                  {operativeTeam.map((person) => (
                    <UserCard key={person.id} person={person} />
                  ))}
                </div>
              )}

              {regionalAdmins.length === 0 && operativeTeam.length === 0 && (
                <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm">
                  No hay personal registrado en esta región.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            onClick={() => setEditingUser(null)}
          />

          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-xl relative overflow-hidden flex flex-col max-h-[85vh] text-slate-700 dark:text-slate-300 border-t-4 border-red-600">
            <div className="p-5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-medium">
                  Ficha Técnica
                </span>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white mt-1">
                  {editingUser.id === currentUser?.id
                    ? "Mi Cuenta de Acceso"
                    : "Modificar Perfil"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleUpdateUser}
              className="p-5 space-y-4 overflow-y-auto flex-1"
              autoComplete="off"
            >
              <input type="text" style={{ display: "none" }} />
              <input type="password" style={{ display: "none" }} />

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  name="fake_name_edit"
                  autoComplete="off"
                  disabled={!canModifyFields(editingUser)}
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium outline-none uppercase disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-200"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Correo Electrónico
                </label>
                <input
                  type="text"
                  name="fake_email_edit"
                  autoComplete="off"
                  disabled={!isAdmin}
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium outline-none disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-200"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Teléfono Móvil
                </label>
                <input
                  type="tel"
                  name="fake_phone_edit"
                  autoComplete="off"
                  disabled={!canModifyFields(editingUser)}
                  placeholder="Capturar número..."
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium outline-none disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-200"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Rango / Privilegios
                </label>
                <select
                  disabled={!isAdmin}
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium outline-none disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-200"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  <option value="STAFF">Inspector / Técnico</option>
                  <option value="MANAGER">Jefe de Sucursal</option>
                  {isSuperAdmin && (
                    <option value="ADMIN">Admin Regional</option>
                  )}
                  {isSuperAdmin && (
                    <option value="SUPER_ADMIN">Admin General</option>
                  )}
                </select>
              </div>

              {editRole === "MANAGER" && isAdmin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-blue-600 dark:text-blue-400 ml-1">
                    Sucursal Asignada
                  </label>
                  <select
                    className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                    value={editClientId}
                    onChange={(e) => setEditClientId(e.target.value)}
                  >
                    <option value="">Seleccionar empresa...</option>
                    {listaEmpresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isSuperAdmin && editRole === "ADMIN" && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <label className="text-xs font-bold text-amber-600 dark:text-amber-500 ml-1 flex items-center gap-1">
                    <Globe size={12} /> Región / Franquicia (SaaS)
                  </label>
                  <select
                    className="w-full p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg text-sm font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
                    value={editTenantId}
                    onChange={(e) => setEditTenantId(e.target.value)}
                  >
                    <option value="">Seleccionar región...</option>
                    {listaTenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {canModifyFields(editingUser) && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg space-y-2 mt-2">
                  <label className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                    <Lock size={12} />{" "}
                    {editingUser.id === currentUser?.id
                      ? "Cambiar mi Contraseña"
                      : "Restablecer Contraseña"}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showEditPassword ? "text" : "password"}
                      name="fake_password_edit"
                      autoComplete="new-password"
                      placeholder="Escribe la nueva contraseña..."
                      className="w-full p-2.5 pr-10 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-lg font-medium text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-200"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showEditPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-red-500/70 dark:text-red-400/70 leading-tight px-1">
                    Si dejas este apartado vacío, la contraseña actual no se
                    Actualizará
                  </p>
                </div>
              )}
            </form>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium text-sm py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleUpdateUser}
                className="flex-[2] bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <RefreshCw className="animate-spin" size={14} />
                ) : (
                  "Guardar Parámetros"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}