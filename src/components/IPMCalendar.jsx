import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  CalendarDays,
  CalendarRange,
  Activity,
  Search,
  BookOpen,
  X,
  Info,
  UserPlus,
  Save,
  FileText,
  ArrowRight,
  ArrowLeft,
  Plus,
  Lock as LockIcon,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";

export default function IPMCalendar({
  currentUser,
  navigateTo,
  selectedCompany,
  onBack,
}) {
  const [tasks, setTasks] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeWeek, setActiveWeek] = useState("Semana 1");
  const [filterColor, setFilterColor] = useState("ALL");
  const [filterMonth, setFilterMonth] = useState("Mayo");
  const [filterDay, setFilterDay] = useState("ALL");
  const [filterFreq, setFilterFreq] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [showGlossary, setShowGlossary] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showLockAlert, setShowLockAlert] = useState(false);

  const [editData, setEditData] = useState({
    tecnico_id: "",
    fecha_programada: "",
    status: "",
    notas_tecnico: "",
  });

  const [newTask, setNewTask] = useState({
    custom_id: "",
    title: "",
    color_code: "red",
    frequency: "Mensual",
    mes: "Mayo",
    semana: "Semana 1",
    day_of_week: "Lunes",
  });

  const categories = [
    { id: "red", label: "NFPA 25 (Agua)", class: "bg-red-500" },
    { id: "orange", label: "NFPA 72 (Alarma)", class: "bg-orange-500" },
    { id: "purple", label: "NFPA 17A (Espuma)", class: "bg-purple-500" },
    { id: "green", label: "NFPA 2001 (Limpios)", class: "bg-green-500" },
  ];

  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const allDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  const frequencies = [
    "Semanal",
    "Mensual",
    "Trimestral",
    "Semestral",
    "Anual",
    "Quinquenal",
  ];

  const canAssign =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";
  const canExecute =
    currentUser?.role === "ADMIN" || currentUser?.role === "STAFF";

  useEffect(() => {
    fetchIPMTasks();
    if (canAssign) fetchTechnicians();
  }, [currentUser, selectedCompany]);

  const fetchTechnicians = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "STAFF");
    if (data) setTechnicians(data);
  };

  const fetchIPMTasks = async () => {
    setLoading(true);
    let query = supabase.from("ipm_tasks").select("*");

    if (currentUser?.role === "MANAGER") {
      query = query.eq(
        "client_id",
        currentUser.client_id || "00000000-0000-0000-0000-000000000000",
      );
    } else if (selectedCompany) {
      query = query.eq("client_id", selectedCompany.id);
    } else {
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data, error } = await query.order("id", { ascending: true });
    if (error) toast.error("Error al cargar calendario");
    else setTasks(data || []);
    setLoading(false);
  };

  const handleTaskClick = (task) => {
    const isLocked =
      currentUser?.role === "MANAGER" && task.created_by_role === "ADMIN";

    if (isLocked) {
      setShowLockAlert(true);
      return;
    }

    setSelectedTask(task);
    setEditData({
      tecnico_id: task.tecnico_id || "",
      fecha_programada: task.fecha_programada || "",
      status: task.status || "PENDIENTE",
      notas_tecnico: task.notas_tecnico || "",
    });
  };

  const handleSaveTask = async () => {
    if (canAssign) {
      if (!editData.tecnico_id) {
        toast.error("Por favor, selecciona un técnico de la lista.");
        return;
      }
      if (!editData.fecha_programada) {
        toast.error("Por favor, selecciona una fecha programada.");
        return;
      }
    }

    const loadingToast = toast.loading("Guardando actualización...");
    try {
      const updates = { ...editData };
      if (updates.tecnico_id === "") updates.tecnico_id = null;
      if (updates.fecha_programada === "") updates.fecha_programada = null;

      if (
        editData.status === "COMPLETO" &&
        selectedTask.status !== "COMPLETO"
      ) {
        updates.fecha_realizacion = new Date().toISOString();
      }

      const { error } = await supabase
        .from("ipm_tasks")
        .update(updates)
        .eq("id", selectedTask.id);
      if (error) throw error;

      toast.success("Tarea actualizada correctamente", { id: loadingToast });
      setSelectedTask(null);
      fetchIPMTasks();
    } catch (error) {
      toast.error("Error al guardar: " + error.message, { id: loadingToast });
    }
  };

  const handleCreateNewTask = async () => {
    if (!newTask.custom_id || !newTask.title) {
      toast.error("El código y el título son obligatorios.");
      return;
    }

    const targetClientId =
      currentUser?.role === "MANAGER"
        ? currentUser.client_id
        : selectedCompany?.id;

    if (!targetClientId) {
      toast.error(
        "Error: No se detectó una sucursal válida para alojar esta actividad.",
      );
      return;
    }

    const loadingToast = toast.loading("Agregando actividad al cronograma...");
    try {
      const matchedCategory = categories.find(
        (c) => c.id === newTask.color_code,
      );

      const taskPayload = {
        id: newTask.custom_id.toUpperCase(),
        client_id: targetClientId,
        title: newTask.title.toUpperCase(),
        color_code: newTask.color_code,
        frequency: newTask.frequency,
        mes: newTask.mes,
        semana: newTask.semana,
        day_of_week: newTask.day_of_week,
        system: matchedCategory ? matchedCategory.label : "NFPA 25 (Agua)",
        status: "PENDIENTE",
        created_by_role: currentUser?.role || "ADMIN",
      };

      const { error } = await supabase.from("ipm_tasks").insert([taskPayload]);
      if (error) throw error;

      toast.success("Actividad inyectada con éxito", { id: loadingToast });
      setShowCreateModal(false);
      setNewTask({
        custom_id: "",
        title: "",
        color_code: "red",
        frequency: "Mensual",
        mes: filterMonth === "ALL" ? "Mayo" : filterMonth,
        semana: activeWeek,
        day_of_week: "Lunes",
      });
      fetchIPMTasks();
    } catch (error) {
      console.error(error);
      toast.error(
        "Error al insertar: Comprueba que el código de ID no esté duplicado.",
        { id: loadingToast },
      );
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.semana !== activeWeek) return false;
      if (filterColor !== "ALL" && t.color_code !== filterColor) return false;
      if (
        filterMonth !== "ALL" &&
        t.mes?.toLowerCase() !== filterMonth.toLowerCase()
      )
        return false;
      if (filterDay !== "ALL" && t.day_of_week !== filterDay) return false;
      if (
        filterFreq !== "ALL" &&
        t.frequency?.toLowerCase() !== filterFreq.toLowerCase()
      )
        return false;
      if (searchTerm.trim() !== "") {
        const searchLower = searchTerm.toLowerCase();
        return (
          t.title.toLowerCase().includes(searchLower) ||
          String(t.id).toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [
    tasks,
    filterColor,
    activeWeek,
    filterMonth,
    filterDay,
    filterFreq,
    searchTerm,
  ]);

  const daysToRender = filterDay === "ALL" ? allDays : [filterDay];
  const completedTasks = filteredTasks.filter(
    (t) => t.status === "COMPLETO",
  ).length;
  const progressPercent =
    filteredTasks.length > 0
      ? Math.round((completedTasks / filteredTasks.length) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500 pb-32 relative overflow-hidden">
      {onBack && currentUser?.role !== "MANAGER" && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors mb-2"
        >
          <ArrowLeft size={16} strokeWidth={1.5} /> Volver a Directorio de
          Empresas
        </button>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <p className="text-xs font-medium text-red-600 dark:text-red-500 mb-1">
            Cronograma de Servicios
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Calendario IPM
          </h2>
          {currentUser?.role === "MANAGER" ? (
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-2">
              Sucursal vinculada de acceso
            </p>
          ) : (
            selectedCompany && (
              <p className="text-xs font-medium text-red-600 dark:text-red-500 mt-2">
                Sucursal: {selectedCompany.nombre}
              </p>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {canAssign && (
            <button
              onClick={() => {
                setNewTask((prev) => ({
                  ...prev,
                  mes: filterMonth === "ALL" ? "Mayo" : filterMonth,
                  semana: activeWeek,
                }));
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
              <Plus size={16} /> Agregar Actividad
            </button>
          )}

          <button
            onClick={() => setShowGlossary(true)}
            className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-100 dark:border-blue-900/30"
          >
            <BookOpen size={16} /> Glosario
          </button>

          <div className="flex gap-2 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 items-center">
            <button
              onClick={() => setFilterColor("ALL")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterColor === "ALL" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterColor(cat.id)}
                className={`group relative w-7 h-7 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center ${cat.class} ${filterColor === cat.id ? "border-slate-900 dark:border-white scale-110" : "border-transparent opacity-40 hover:opacity-100"}`}
              >
                <div className="absolute -bottom-8 scale-0 group-hover:scale-100 transition-all bg-slate-900 text-white text-[9px] py-1 px-2 rounded-md whitespace-nowrap z-50">
                  {cat.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FILTROS - La barra oscura se mantiene igual en ambos modos */}
      <div className="bg-slate-900 p-4 rounded-xl flex flex-col lg:flex-row gap-4 items-center shadow-sm">
        <div className="w-full lg:w-1/3 bg-white/10 rounded-lg flex items-center px-4 border border-white/10 focus-within:border-red-500 transition-colors h-11">
          <Search size={16} className="text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Buscar válvula, bomba, hidrante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-white text-sm outline-none placeholder:text-slate-500"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")}>
              <X size={14} className="text-slate-400 hover:text-white" />
            </button>
          )}
        </div>
        <div className="h-[1px] w-full lg:w-[1px] lg:h-8 bg-white/10" />
        <div className="flex-1 flex w-full flex-wrap gap-2">
          <div className="flex-1 min-w-[120px] bg-white/10 rounded-lg flex items-center px-3 border border-white/10 h-11">
            <CalendarDays size={14} className="text-slate-400" />
            <select
              className="w-full bg-transparent text-white text-sm p-2 outline-none appearance-none cursor-pointer"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="ALL" className="text-black">
                Todos los Meses
              </option>
              {months.map((m) => (
                <option key={m} value={m} className="text-black">
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[120px] bg-white/10 rounded-lg flex items-center px-3 border border-white/10 h-11">
            <CalendarRange size={14} className="text-slate-400" />
            <select
              className="w-full bg-transparent text-white text-sm p-2 outline-none appearance-none cursor-pointer"
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
            >
              <option value="ALL" className="text-black">
                Toda la Semana
              </option>
              {allDays.map((d) => (
                <option key={d} value={d} className="text-black">
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[120px] bg-white/10 rounded-lg flex items-center px-3 border border-white/10 h-11">
            <Activity size={14} className="text-slate-400" />
            <select
              className="w-full bg-transparent text-white text-sm p-2 outline-none appearance-none cursor-pointer"
              value={filterFreq}
              onChange={(e) => setFilterFreq(e.target.value)}
            >
              <option value="ALL" className="text-black">
                Cualquier Frecuencia
              </option>
              {frequencies.map((f) => (
                <option key={f} value={f} className="text-black">
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE SEMANA + PROGRESO */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveWeek("Semana 1")}
            className={`px-5 py-2 rounded-md text-xs font-medium transition-colors ${activeWeek === "Semana 1" ? "bg-white dark:bg-slate-900 text-red-600 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            Visita 1 - Semana 1
          </button>
          <button
            onClick={() => setActiveWeek("Semana 3")}
            className={`px-5 py-2 rounded-md text-xs font-medium transition-colors ${activeWeek === "Semana 3" ? "bg-white dark:bg-slate-900 text-red-600 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            Visita 2 - Semana 3
          </button>
        </div>
        <div className="flex items-center gap-4 pr-4 w-full sm:w-auto">
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Avance del Filtro
            </p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {completedTasks} de {filteredTasks.length} Tareas
            </p>
          </div>
          <div className="w-24 sm:w-32 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
            <div
              className="h-full bg-green-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* TABLERO */}
      <div
        className={`grid gap-4 ${filterDay === "ALL" ? "grid-cols-1 xl:grid-cols-5" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}
      >
        {daysToRender.map((dia) => (
          <div
            key={dia}
            className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[400px]"
          >
            <div className="text-center py-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
              <h4 className="font-medium text-xs text-slate-700 dark:text-slate-300 tracking-wide">
                {dia}
              </h4>
            </div>
            <div className="space-y-3 pt-2">
              {filteredTasks
                .filter((t) => t.day_of_week === dia)
                .map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className={`group p-4 rounded-lg border-l-4 bg-slate-50 dark:bg-slate-800 transition-all hover:bg-white dark:hover:bg-slate-700 hover:shadow-md hover:-translate-y-0.5 cursor-pointer relative overflow-hidden ${task.color_code === "red" ? "border-l-red-500" : task.color_code === "orange" ? "border-l-orange-500" : task.color_code === "purple" ? "border-l-purple-500" : "border-l-green-500"}`}
                  >
                    {task.tecnico_id && (
                      <div className="absolute top-0 right-0 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-medium px-2 py-0.5 rounded-bl-lg border-b border-l border-blue-100 dark:border-blue-800 z-20">
                        Asignada
                      </div>
                    )}
                    {task.created_by_role === "ADMIN" && (
                      <div className="absolute bottom-1.5 right-2 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors">
                        <LockIcon size={10} />
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded text-white ${task.color_code === "red" ? "bg-red-500" : task.color_code === "orange" ? "bg-orange-500" : task.color_code === "purple" ? "bg-purple-500" : "bg-green-500"}`}
                      >
                        {task.id}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                        {task.frequency}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug mb-4 pr-4">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${task.status === "COMPLETO" ? "bg-green-500" : "bg-amber-400 animate-pulse"}`}
                      />
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              {filteredTasks.filter((t) => t.day_of_week === dia).length ===
                0 && (
                <div className="py-12 flex flex-col items-center justify-center gap-2 opacity-40">
                  <CheckCircle2
                    size={24}
                    className="text-slate-400 dark:text-slate-500"
                    strokeWidth={1.5}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    Sin Actividades
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CREAR NUEVA ACTIVIDAD */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-xl shadow-xl relative z-10 overflow-hidden flex flex-col border-t-4 border-red-600 animate-in zoom-in-95 duration-150">
            <div className="p-6 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <span className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-md text-xs font-medium border border-red-100 dark:border-red-900/30">
                  Planificación Normativa
                </span>
                <h3 className="font-semibold text-slate-900 dark:text-white text-lg mt-2">
                  Nueva Actividad IPM
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                    Código de Actividad (ID Único)
                  </label>
                  <input
                    placeholder="Ej: IPM-09 o 25-01"
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 uppercase"
                    value={newTask.custom_id}
                    onChange={(e) =>
                      setNewTask({ ...newTask, custom_id: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                    Normativa Relacionada
                  </label>
                  <select
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-500"
                    value={newTask.color_code}
                    onChange={(e) =>
                      setNewTask({ ...newTask, color_code: e.target.value })
                    }
                  >
                    <option value="red">NFPA 25 (Sistemas Base Agua)</option>
                    <option value="orange">NFPA 72 (Alarma y Detección)</option>
                    <option value="purple">NFPA 17A (Agentes Espumosos)</option>
                    <option value="green">NFPA 2001 (Agentes Limpios)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                  Título / Descripción de la Tarea
                </label>
                <input
                  placeholder="Ej: INSPECCIÓN DE VÁLVULAS..."
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 uppercase"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                    Frecuencia
                  </label>
                  <select
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none"
                    value={newTask.frequency}
                    onChange={(e) =>
                      setNewTask({ ...newTask, frequency: e.target.value })
                    }
                  >
                    {frequencies.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                    Mes Programado
                  </label>
                  <select
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none"
                    value={newTask.mes}
                    onChange={(e) =>
                      setNewTask({ ...newTask, mes: e.target.value })
                    }
                  >
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                    Período de Visita
                  </label>
                  <select
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none"
                    value={newTask.semana}
                    onChange={(e) =>
                      setNewTask({ ...newTask, semana: e.target.value })
                    }
                  >
                    <option value="Semana 1">Visita 1 - Semana 1</option>
                    <option value="Semana 3">Visita 2 - Semana 3</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                    Día de la Semana
                  </label>
                  <select
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none"
                    value={newTask.day_of_week}
                    onChange={(e) =>
                      setNewTask({ ...newTask, day_of_week: e.target.value })
                    }
                  >
                    {allDays.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium text-sm py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNewTask}
                className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-3 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Save size={14} /> Agregar Actividad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN EXISTENTE */}
      {selectedTask && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setSelectedTask(null)}
          />
          <div
            className={`bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-xl relative z-10 overflow-hidden flex flex-col border-t-4 ${
              selectedTask.color_code === "red"
                ? "border-red-500"
                : selectedTask.color_code === "orange"
                  ? "border-orange-500"
                  : selectedTask.color_code === "purple"
                    ? "border-purple-500"
                    : "border-green-500"
            }`}
          >
            <div className="p-6 bg-slate-50 dark:bg-slate-800 flex justify-between items-start border-b border-slate-200 dark:border-slate-700">
              <div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-md text-white ${selectedTask.color_code === "red" ? "bg-red-500" : selectedTask.color_code === "orange" ? "bg-orange-500" : selectedTask.color_code === "purple" ? "bg-purple-500" : "bg-green-500"}`}
                >
                  {selectedTask.id} &middot; {selectedTask.system}
                </span>
                <h3 className="font-semibold text-slate-900 dark:text-white text-lg mt-3 leading-tight">
                  {selectedTask.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedTask.frequency} | {selectedTask.day_of_week} (
                  {selectedTask.semana} de {selectedTask.mes})
                </p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[50vh]">
              {canAssign && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-2">
                      <UserPlus size={14} /> Asignar a Técnico
                    </label>
                    <select
                      value={editData.tecnico_id}
                      onChange={(e) =>
                        setEditData({ ...editData, tecnico_id: e.target.value })
                      }
                      className="w-full p-3 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Seleccionar Técnico --</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name || t.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-2">
                      <CalendarDays size={14} /> Fecha Programada
                    </label>
                    <input
                      type="date"
                      value={editData.fecha_programada}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          fecha_programada: e.target.value,
                        })
                      }
                      className="w-full p-3 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {canExecute && (
                <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2 mb-2">
                      <Activity size={14} /> Estatus de Inspección
                    </label>
                    <select
                      value={editData.status}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                      className={`w-full p-3 rounded-lg border text-sm outline-none ${editData.status === "COMPLETO" ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400" : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"}`}
                    >
                      <option value="PENDIENTE">PENDIENTE (Programado)</option>
                      <option value="COMPLETO">COMPLETO (Realizado)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2 mb-2">
                      <FileText size={14} /> Observaciones / Hallazgos
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Ej: Se encontró oxidación ligera en brida..."
                      value={editData.notas_tecnico}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          notas_tecnico: e.target.value,
                        })
                      }
                      className="w-full p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (navigateTo) {
                        setSelectedTask(null);
                        navigateTo("form");
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors group"
                  >
                    <span className="text-sm font-medium">
                      Ir al Formulario Oficial NFPA
                    </span>
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setSelectedTask(null)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-sm py-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cerrar
              </button>

              <button
                onClick={handleSaveTask}
                className="flex-[2] flex items-center justify-center gap-2 bg-red-600 text-white font-medium text-sm py-3 rounded-lg shadow-sm hover:bg-red-700 transition-colors"
              >
                <Save size={16} /> Guardar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ALERTA DE BLOQUEO */}
      {showLockAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowLockAlert(false)}
          />
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-xl relative z-10 overflow-hidden flex flex-col text-center border-t-4 border-red-600 animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 dark:bg-red-900/20 p-8 flex flex-col items-center justify-center border-b border-red-100 dark:border-red-900/30">
              <ShieldAlert
                size={48}
                className="text-red-600 dark:text-red-500 mb-4"
              />
              <h3 className="font-semibold text-2xl text-slate-900 dark:text-white">
                Acceso Denegado
              </h3>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Esta actividad forma parte del{" "}
                <span className="text-slate-900 dark:text-white font-semibold">
                  Plan Maestro Normativo
                </span>{" "}
                y ha sido creada por el{" "}
                <span className="text-red-600 dark:text-red-500 font-semibold">
                  Administrador General
                </span>
                .
              </p>
              <div className="mt-5 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-left">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                  <LockIcon size={12} /> Detalles del Bloqueo
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Tu rango de <strong>{currentUser?.role}</strong> no cuenta con
                  los privilegios necesarios para alterar, posponer o eliminar
                  registros de esta jerarquía.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setShowLockAlert(false)}
                className="w-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium text-sm py-3 rounded-lg transition-colors shadow-sm"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOSARIO */}
      {showGlossary && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowGlossary(false)}
          />
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-xl relative z-10 animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-50 dark:bg-slate-800 p-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                <Info
                  size={20}
                  className="text-blue-500 dark:text-blue-400"
                  strokeWidth={1.5}
                />
                <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                  Glosario Normativo
                </h3>
              </div>
              <button
                onClick={() => setShowGlossary(false)}
                className="p-2 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-500 transition-colors border border-slate-200 dark:border-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="border border-red-100 dark:border-red-900/30 rounded-lg overflow-hidden">
                <div className="bg-red-50 dark:bg-red-900/20 p-3 border-b border-red-100 dark:border-red-900/30 font-medium text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full" /> NFPA
                  25 - Bombas, Hidrantes y Montantes
                </div>
                <div className="p-4 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                  <p>
                    <strong>&#91;25-XX&#93;:</strong> Nomenclatura oficial NFPA
                    25.
                  </p>
                  <p>
                    <strong>&#91;S-X&#93;:</strong> Tareas relacionadas con
                    Bombas (Succión).
                  </p>
                  <p>
                    <strong>&#91;A-X&#93;:</strong> Pruebas Anuales de Agua y
                    Flujo.
                  </p>
                  <p>
                    <strong>&#91;T-X&#93;:</strong> Pruebas Trimestrales de
                    Agua.
                  </p>
                </div>
              </div>
              <div className="border border-orange-100 dark:border-orange-900/30 rounded-lg overflow-hidden">
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 border-b border-orange-100 dark:border-orange-900/30 font-medium text-orange-700 dark:text-orange-400 text-xs flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />{" "}
                  NFPA 72 - Detección y Alarmas
                </div>
                <div className="p-4 text-sm text-slate-600 dark:text-slate-300 grid grid-cols-2 gap-2">
                  <p>
                    <strong>&#91;P-X&#93;:</strong> Panel de Control FPA5000.
                  </p>
                  <p>
                    <strong>&#91;B-X&#93;:</strong> Baterías de Respaldo.
                  </p>
                  <p>
                    <strong>&#91;H-X&#93;:</strong> Detectores de Humo.
                  </p>
                  <p>
                    <strong>&#91;C-X&#93;:</strong> Detectores de Calor.
                  </p>
                  <p>
                    <strong>&#91;F-X&#93;:</strong> Foto-Beams (Lineales).
                  </p>
                  <p>
                    <strong>&#91;E-X&#93;:</strong> Estaciones Manuales.
                  </p>
                  <p>
                    <strong>&#91;N-X&#93;:</strong> Dispositivos Notificación
                    (Sirenas).
                  </p>
                </div>
              </div>
              <div className="border border-purple-100 dark:border-purple-900/30 rounded-lg overflow-hidden">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 border-b border-purple-100 dark:border-purple-900/30 font-medium text-purple-700 dark:text-purple-400 text-xs flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />{" "}
                  NFPA 17A - Agentes Espumosos
                </div>
                <div className="p-4 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                  <p>
                    <strong>&#91;17A-XX&#93;:</strong> Nomenclatura oficial NFPA
                    17A.
                  </p>
                  <p>
                    <strong>&#91;E-X&#93;:</strong> Válvulas y proporcionadores
                    de Espuma.
                  </p>
                  <p>
                    <strong>&#91;ET-X&#93;:</strong> Pruebas de Tanque de
                    Concentrado.
                  </p>
                  <p>
                    <strong>&#91;EA-X&#93;:</strong> Pruebas Anuales
                    (Laboratorio y Flujo).
                  </p>
                </div>
              </div>
              <div className="border border-green-100 dark:border-green-900/30 rounded-lg overflow-hidden">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 border-b border-green-100 dark:border-green-900/30 font-medium text-green-700 dark:text-green-400 text-xs flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full" /> NFPA
                  2001 - Agentes Limpios
                </div>
                <div className="p-4 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                  <p>
                    <strong>&#91;2001-XX&#93;:</strong> Nomenclatura oficial
                    NFPA 2001.
                  </p>
                  <p>
                    <strong>&#91;L-X&#93;:</strong> Inspección visual de sistema
                    Limpio.
                  </p>
                  <p>
                    <strong>&#91;LS-X&#93;:</strong> Pruebas Semestrales (Peso y
                    Presión de Cilindros).
                  </p>
                  <p>
                    <strong>&#91;LA-X&#93;:</strong> Pruebas Anuales (Door Fan
                    Test, Hold Time).
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center">
              <button
                onClick={() => setShowGlossary(false)}
                className="w-full bg-slate-900 dark:bg-white hover:bg-red-600 dark:hover:bg-red-600 text-white dark:text-slate-900 dark:hover:text-white font-medium text-sm py-3 rounded-lg transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
