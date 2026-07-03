import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import { showConfirmDelete } from "../alerts";
import {
  Flame,
  ClipboardList,
  Map as MapIcon,
  CloudSync,
  AlertOctagon,
  ArrowUpRight,
  Building2,
  PlusCircle,
  Trash2,
  X,
  Building,
  MapPin,
  UserCircle,
  FileText,
  Edit3,
  Save,
  ExternalLink,
  ChevronRight,
  Phone,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

export default function Dashboard({ navigateTo, stats }) {
  const [clientes, setClientes] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedClient, setSelectedClient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showPass, setShowPass] = useState(false);

  // Estado para el perfil del usuario logueado
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const init = async () => {
      const profile = await checkRole();
      await fetchClientes(profile);
    };
    init();
  }, []);

  const checkRole = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from("profiles")
        .select("role, client_id")
        .eq("id", session.user.id)
        .single();
      if (data) {
        setUserProfile(data);
        if (data.role === "ADMIN") setIsAdmin(true);
        return data;
      }
    }
    return null;
  };

  const fetchClientes = async (forcedProfile = null) => {
    const profile = forcedProfile || userProfile;

    let query = supabase.from("clientes").select("*");

    if (profile && profile.role !== "ADMIN") {
      if (profile.client_id) {
        query = query.eq("id", profile.client_id);
      } else {
        setClientes([]);
        setLoading(false);
        return;
      }
    }

    const { data: clientsData, error: clientsError } = await query.order(
      "nombre",
      { ascending: true },
    );

    if (clientsError) {
      console.error("Error al cargar clientes:", clientsError.message);
      toast.error("Error al cargar empresas.");
      setLoading(false);
      return;
    }

    if (clientsData) {
      // === MAGIA DE INGENIERÍA: CRUCE DE DATOS ===
      // 1. Buscamos a todos los usuarios que tengan el rol de MANAGER en el sistema
      const { data: managersData, error: managersError } = await supabase
        .from("profiles")
        .select("client_id, full_name, email")
        .eq("role", "MANAGER");

      if (!managersError && managersData) {
        // 2. Cruzamos la información. Si la empresa tiene un Manager asignado, lo sobrescribimos.
        const clientesActualizados = clientsData.map((cliente) => {
          const managerEncontrado = managersData.find(
            (m) => m.client_id === cliente.id,
          );
          if (managerEncontrado) {
            return {
              ...cliente,
              encargado_nombre: managerEncontrado.full_name,
              encargado_email: managerEncontrado.email,
            };
          }
          return cliente;
        });
        setClientes(clientesActualizados);
      } else {
        // Si hay error buscando managers, mostramos los clientes como estaban
        setClientes(clientsData);
      }
    }

    setLoading(false);
  };

  const handleOpenDetails = (cliente) => {
    setSelectedClient(cliente);
    setEditData({ ...cliente, password: "" });
    setIsEditing(false);
  };

  const handleUpdateClient = async () => {
    const loadingToast = toast.loading("Sincronizando con el servidor...");

    try {
      const { error: clientError } = await supabase
        .from("clientes")
        .update({
          direccion: editData.direccion,
          telefono: editData.telefono,
          encargado_nombre: editData.encargado_nombre,
          encargado_email: editData.encargado_email,
          notas_internas: editData.notas_internas,
        })
        .eq("id", selectedClient.id);

      if (clientError) throw clientError;

      if (editData.password && editData.encargado_email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", editData.encargado_email)
          .single();

        if (profile) {
          await supabase.rpc("admin_update_user", {
            target_user_id: profile.id,
            new_password: editData.password,
          });

          await supabase
            .from("profiles")
            .update({
              client_id: selectedClient.id,
              role: "MANAGER",
            })
            .eq("id", profile.id);
        }
      }

      toast.success("Cambios aplicados con éxito", { id: loadingToast });
      await fetchClientes();
      setIsEditing(false);
      setSelectedClient({ ...editData });
    } catch (err) {
      toast.error("Error al guardar: " + err.message, { id: loadingToast });
    }
  };

  const handleDeleteClient = (clientId, clientName) => {
    setSelectedClient(null);

    setTimeout(() => {
      showConfirmDelete(`LA EMPRESA ${clientName}`, async () => {
        await supabase.from("clientes").delete().eq("id", clientId);
        toast.success("Empresa eliminada");
        fetchClientes();
      });
    }, 300);
  };

  const menuItems = [
    {
      id: "form",
      label: "Nueva Inspección",
      desc: "Protocolo NFPA",
      icon: Flame,
      color: "bg-red-600",
    },
    {
      id: "sites",
      label: "Asset Radar",
      desc: "Mapa en vivo",
      icon: MapIcon,
      count: stats?.totalAssets || 0,
      color: "bg-slate-800 dark:bg-slate-700",
    },
    {
      id: "list",
      label: "Historial Técnico",
      desc: "Reportes y PDF",
      icon: ClipboardList,
      count: stats?.totalReports || 0,
      color: "bg-slate-800 dark:bg-slate-700",
    },
    {
      id: "critical",
      label: "Hallazgos Críticos",
      desc: "Urgencias",
      icon: AlertOctagon,
      count: stats?.criticals || 0,
      color: "bg-red-600",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500 pb-32">
      {/* STATUS ONLINE */}
      <div className="flex justify-end items-center">
        <div className="bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-md border border-green-200 dark:border-green-800 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            Sistema Online
          </span>
        </div>
      </div>

      {/* GRID DE ACCESOS RÁPIDOS */}
      <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className="relative flex flex-col w-full overflow-hidden rounded-xl text-left shadow-sm hover:shadow-md transition-all group active:scale-[0.98] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            >
              <div
                className={`w-full h-[100px] ${item.color} flex items-center justify-center relative`}
              >
                <Icon size={40} className="text-white" strokeWidth={1.5} />

                {item.count !== undefined && (
                  <div className="absolute bottom-2 right-3 text-xs font-medium text-white/80">
                    {item.count.toString().padStart(2, "0")}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 px-4 py-4 flex flex-col justify-center">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight mb-0.5">
                  {item.label}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {item.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* DIRECTORIO DE EMPRESAS */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2
              className="text-slate-400 dark:text-slate-500"
              size={20}
              strokeWidth={1.5}
            />
            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
              {isAdmin ? "Directorio de Empresas" : "Mi Sucursal Asignada"}
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium text-sm">
            Cargando empresas...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clientes.length > 0 ? (
              clientes.map((cliente) => (
                <button
                  key={cliente.id}
                  onClick={() => handleOpenDetails(cliente)}
                  className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all text-left"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-red-50 dark:group-hover:bg-red-900/20 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors border border-slate-100 dark:border-slate-700">
                      <Building size={18} strokeWidth={1.5} />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-medium text-sm text-slate-900 dark:text-white truncate">
                        {cliente.nombre}
                      </h4>
                      {/* AQUÍ SE MUESTRA EL NOMBRE YA CRUZADO DESDE LA TABLA PROFILES */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {cliente.encargado_nombre || "Sin encargado"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className="text-slate-300 dark:text-slate-600 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors"
                    size={16}
                  />
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium text-sm col-span-full">
                No hay empresas registradas o no tienes acceso.
              </div>
            )}
          </div>
        )}
      </div>

      {/* PANEL LATERAL DE DETALLES */}
      {selectedClient && (
        <div className="fixed inset-0 z-[10000] flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedClient(null)}
          ></div>

          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 h-full shadow-xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-200 dark:border-slate-700">
            <div className="p-6 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 relative">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedClient(null);
                }}
                className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-500 transition-colors z-[10001] cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-4 mt-1">
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-red-600 dark:text-red-500 border border-red-100 dark:border-red-900/30">
                  <Building2 size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Ficha Técnica
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5 truncate max-w-[200px]">
                    {selectedClient.nombre}
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <MapPin
                      size={14}
                      className="text-red-500"
                      strokeWidth={1.5}
                    />{" "}
                    Planta
                  </h4>
                  {isAdmin && (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-red-600 dark:text-red-500 font-medium text-xs px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-100 dark:border-red-900/30"
                    >
                      {isEditing ? "Cancelar" : "Editar"}
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                      Dirección
                    </label>
                    {isEditing ? (
                      <textarea
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md p-3 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        rows="2"
                        value={editData.direccion || ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            direccion: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {selectedClient.direccion || "Sin domicilio registrado"}
                      </p>
                    )}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                      Teléfono
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md p-3 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        value={editData.telefono || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, telefono: e.target.value })
                        }
                      />
                    ) : (
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {selectedClient.telefono || "Sin teléfono"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                  <UserCircle
                    size={14}
                    className="text-red-500"
                    strokeWidth={1.5}
                  />{" "}
                  Responsable
                </h4>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                      Nombre del Jefe
                    </label>
                    {isEditing ? (
                      <input
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md p-3 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        value={editData.encargado_nombre || ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            encargado_nombre: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <p className="text-base font-semibold text-slate-900 dark:text-white">
                        {selectedClient.encargado_nombre || "Pendiente"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                        Email de Acceso
                      </label>
                      {isEditing ? (
                        <input
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md p-3 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          value={editData.encargado_email || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              encargado_email: e.target.value,
                            })
                          }
                        />
                      ) : (
                        <p className="text-sm text-red-600 dark:text-red-500 font-medium truncate">
                          {selectedClient.encargado_email || "Sin vincular"}
                        </p>
                      )}
                    </div>

                    {isEditing && (
                      <div className="animate-in slide-in-from-bottom-2 duration-300">
                        <label className="text-xs font-medium text-blue-600 dark:text-blue-400 block mb-1.5">
                          Asignar Contraseña
                        </label>
                        <div className="relative">
                          <input
                            type={showPass ? "text" : "password"}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md p-3 pr-10 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Nueva contraseña..."
                            value={editData.password || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                password: e.target.value,
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          >
                            {showPass ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                  <FileText size={14} strokeWidth={1.5} /> Notas Internas
                </h4>
                {isEditing ? (
                  <textarea
                    className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm text-slate-800 dark:text-slate-200 h-32 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    value={editData.notas_internas || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        notas_internas: e.target.value,
                      })
                    }
                  />
                ) : (
                  <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                    "
                    {selectedClient.notas_internas ||
                      "No hay requerimientos especiales para este sitio."}
                    "
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex gap-3">
              {isEditing ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleUpdateClient();
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Save size={16} /> Guardar Cambios
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigateTo("list")}
                    className="flex-1 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <ExternalLink size={16} /> Historial
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() =>
                        handleDeleteClient(
                          selectedClient.id,
                          selectedClient.nombre,
                        )
                      }
                      className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-lg hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition-colors border border-red-100 dark:border-red-900/30"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
