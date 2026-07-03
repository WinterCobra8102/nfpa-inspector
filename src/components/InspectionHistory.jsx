import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { supabase } from "../supabaseClient";
import {
  FileDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ClipboardList,
  ClipboardCheck,
  Trash2,
  Edit3,
  Eye,
  X,
  CheckSquare,
  Square,
  Cloud,
  CloudOff,
  RefreshCw,
  Filter,
  Home,
  MapPin,
  User,
  FileText,
  Check,
  Image as ImageIcon,
  MessageSquare,
  Lock,
  Search,
  Building2,
} from "lucide-react";
import { generatePDF } from "../utils/pdfGenerator";
import toast from "react-hot-toast";
import { showConfirmDelete } from "../alerts";

export default function InspectionHistory({ navigateTo, currentUser }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const [filterStd, setFilterStd] = useState("TODOS");
  const [filterCat, setFilterCat] = useState("TODOS");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState("TODOS");

  const [tempObs, setTempObs] = useState("");
  const [tempStatus, setTempStatus] = useState("");
  const [tempOwnerName, setTempOwnerName] = useState("");
  const [tempDetails, setTempDetails] = useState({});
  const [tempVoltages, setTempVoltages] = useState([]);

  const inspections = useLiveQuery(() =>
    db.inspections.orderBy("date").reverse().toArray(),
  );

  // ✅ CORRECCIÓN: solo ADMIN puede eliminar
  const isAdmin = currentUser?.role === "ADMIN";

  const uniqueCompanies = React.useMemo(() => {
    if (!inspections) return [];
    const companies = inspections
      .map((item) => item.clientName)
      .filter(Boolean);
    return ["TODOS", ...new Set(companies)];
  }, [inspections]);

  const categoriesByStd = {
    "NFPA 25": [
      "BOMBAS",
      "HIDRANTES",
      "MANGUERAS",
      "ROCIADORES",
      "VÁLVULAS",
      "OBSERVACIONES",
    ],
    "NFPA 72": ["ALARMAS"],
  };

  const getCategoryFromCode = (code) => {
    if (!code) return "OTROS";
    const c = code.toUpperCase();
    if (
      c.includes("IPM-01") ||
      c.includes("IPM-08") ||
      c.includes("014") ||
      c.includes("015")
    )
      return "BOMBAS";
    if (c.includes("IPM-02") || c.includes("016")) return "MANGUERAS";
    if (c.includes("IPM-03") || c.includes("019")) return "ALARMAS";
    if (c.includes("IPM-04") || c.includes("039")) return "HIDRANTES";
    if (c.includes("IPM-05") || c.includes("041")) return "VÁLVULAS";
    if (c.includes("IPM-06") || c.includes("ROCIADORES")) return "ROCIADORES";
    if (c.includes("IPM-07") || c.includes("045")) return "OBSERVACIONES";
    return "OTROS";
  };

  const filteredInspections = inspections?.filter((item) => {
    const currentStd =
      item.standard ||
      (item.serviceCode === "IPM-03" || item.formCode === "F-SER-019"
        ? "NFPA 72"
        : "NFPA 25");
    const matchStd = filterStd === "TODOS" || currentStd === filterStd;

    const currentCat =
      item.category ||
      getCategoryFromCode(
        item.serviceCode || item.formCode || item.equipmentName,
      );
    const matchCat =
      filterCat === "TODOS" ||
      currentCat.toUpperCase() === filterCat.toUpperCase();

    const matchCompany =
      filterCompany === "TODOS" || item.clientName === filterCompany;

    const searchLower = searchTerm.toLowerCase();
    const matchSearch =
      !searchTerm ||
      item.equipmentName?.toLowerCase().includes(searchLower) ||
      item.clientName?.toLowerCase().includes(searchLower) ||
      item.formCode?.toLowerCase().includes(searchLower) ||
      item.serviceCode?.toLowerCase().includes(searchLower) ||
      item.generalObs?.toLowerCase().includes(searchLower);

    return matchStd && matchCat && matchCompany && matchSearch;
  });

  const handleOpenModal = (item, isEdit) => {
    if (!item) return;

    setSelectedReport(item);
    setTempObs(item.generalObs || item.observations || "");
    setTempStatus(item.overallStatus || "ÓPTIMO");
    setTempOwnerName(item.ownerName || "");

    let parsedDetails = {};
    try {
      if (typeof item.details === "string") {
        parsedDetails = JSON.parse(item.details);
      } else if (typeof item.details === "object" && item.details !== null) {
        parsedDetails = { ...item.details };
      }
    } catch (e) {
      console.error("Error al parsear detalles:", e);
    }
    setTempDetails(parsedDetails);

    let parsedVoltages = Array.from({ length: 6 }, () => ({
      min: "",
      max: "",
    }));
    try {
      if (typeof item.voltages === "string") {
        parsedVoltages = JSON.parse(item.voltages);
      } else if (Array.isArray(item.voltages)) {
        parsedVoltages = [...item.voltages];
      }
    } catch (e) {
      console.error("Error al parsear voltajes:", e);
    }
    setTempVoltages(parsedVoltages);

    setEditMode(isEdit);
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const pendingReports = await db.inspections
        .filter((r) => r.synced === 0 || !r.synced)
        .toArray();
      if (pendingReports.length > 0) {
        for (const report of pendingReports) {
          const dataToSync = {
            id: report.id,
            date: report.date,
            form_code: report.formCode || report.serviceCode || "F-SER-014",
            equipment_name: report.equipmentName,
            standard: report.standard || "NFPA 25",
            category:
              report.category ||
              getCategoryFromCode(report.formCode || report.serviceCode),
            overall_status: report.overallStatus || "ÓPTIMO",
            general_obs: report.generalObs || report.observations || "",
            client_id: report.clientId,
            client_name: report.clientName || "NO ESPECIFICADO",
            client_address: report.clientAddress || "No capturada",
            owner_name: report.ownerName,
            signature: report.signature,
            tech_signature: report.techSignature || null,
            location: report.location,
            performed_by: report.performedBy,
            voltages: report.voltages,
            details: report.details,
          };
          const { error } = await supabase
            .from("inspections")
            .upsert([dataToSync]);
          if (!error) await db.inspections.update(report.id, { synced: 1 });
        }
      }

      const { data: cloudData } = await supabase
        .from("inspections")
        .select("*")
        .order("date", { ascending: false });
      if (cloudData) {
        const localReadyData = cloudData.map((item) => ({
          id: item.id,
          date: item.date,
          clientId: item.client_id,
          clientName: item.client_name,
          clientAddress: item.client_address,
          ownerName: item.owner_name,
          equipmentName: item.equipment_name,
          standard: item.standard,
          category: item.category,
          formCode: item.form_code,
          serviceCode: item.form_code,
          overallStatus: item.overall_status,
          generalObs: item.general_obs,
          observations: item.general_obs,
          details: item.details,
          voltages: item.voltages,
          signature: item.signature,
          techSignature: item.tech_signature,
          location: item.location,
          performedBy: item.performed_by,
          synced: 1,
        }));
        await db.inspections.where("synced").equals(1).delete();
        await db.inspections.bulkPut(localReadyData);
      }
      toast.success("Sincronización Exitosa con la Nube");
    } catch (e) {
      console.error(e);
      toast.error("Error al sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  const statusConfig = {
    ÓPTIMO: {
      border: "border-l-green-500",
      badge:
        "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800",
      icon: <CheckCircle size={14} />,
    },
    ADVERTENCIA: {
      border: "border-l-yellow-500",
      badge:
        "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
      icon: <AlertTriangle size={14} />,
    },
    CRÍTICO: {
      border: "border-l-red-500",
      badge:
        "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800",
      icon: <XCircle size={14} />,
    },
    PENDIENTE: {
      border: "border-l-slate-300",
      badge:
        "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
      icon: null,
    },
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInspections?.length) setSelectedIds([]);
    else setSelectedIds(filteredInspections.map((i) => i.id));
  };

  // ✅ Eliminación masiva — solo ADMIN
  const handleBulkDelete = () => {
    if (!isAdmin) return;
    const totalSelected = selectedIds.length;
    showConfirmDelete(`${totalSelected} REPORTES FILTRADOS`, async () => {
      const deleteToast = toast.loading("Eliminando registros en masa...");
      try {
        await supabase.from("inspections").delete().in("id", selectedIds);
        await db.inspections.bulkDelete(selectedIds);
        setSelectedIds([]);
        toast.success("Registros eliminados del sistema", { id: deleteToast });
      } catch (err) {
        toast.error("Error al procesar el borrado masivo", { id: deleteToast });
      }
    });
  };

  // ✅ Eliminación individual — solo ADMIN
  const handleDeleteIndividual = (id, title) => {
    if (!isAdmin) return;
    const displayTitle = title ? title : "ESTE REPORTE TÉCNICO";
    showConfirmDelete(displayTitle, async () => {
      const deleteToast = toast.loading("Removiendo del historial...");
      try {
        await supabase.from("inspections").delete().eq("id", id);
        await db.inspections.delete(id);
        toast.success("Reporte eliminado permanentemente", { id: deleteToast });
      } catch (err) {
        toast.error("Error al eliminar el reporte", { id: deleteToast });
      }
    });
  };

  const handleUpdate = async () => {
    toast.loading("Actualizando registro local...", { id: "update_loader" });
    try {
      await db.inspections.update(selectedReport.id, {
        generalObs: tempObs,
        observations: tempObs,
        overallStatus: tempStatus,
        ownerName: tempOwnerName,
        details: tempDetails,
        voltages: tempVoltages,
        synced: 0,
      });
      toast.success("Reporte modificado con éxito", { id: "update_loader" });
      setEditMode(false);
      setSelectedReport(null);
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar cambios locales.", { id: "update_loader" });
    }
  };

  if (!inspections)
    return (
      <div className="p-20 text-center animate-pulse font-medium text-slate-400 dark:text-slate-500 text-sm">
        Cargando historial...
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 pb-20 animate-in fade-in">
      {/* Botón Volver */}
      <div>
        <button
          onClick={() => navigateTo("home")}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors group"
        >
          <Home size={16} strokeWidth={1.5} /> <span>Salir al Panel</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-red-600 dark:text-red-500 border border-red-100 dark:border-red-900/30">
            <ClipboardList size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Historial Técnico
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-800">
                {filteredInspections?.length} resultados
              </span>
              <button
                onClick={handleSyncAll}
                className="p-1.5 border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw
                  size={14}
                  className={
                    isSyncing
                      ? "animate-spin text-blue-500"
                      : "text-slate-400 dark:text-slate-500"
                  }
                />
              </button>
            </div>
          </div>
        </div>

        {/* Filtro de Norma */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1">
          {["TODOS", "NFPA 25", "NFPA 72"].map((std) => (
            <button
              key={std}
              onClick={() => {
                setFilterStd(std);
                setFilterCat("TODOS");
              }}
              className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${filterStd === std ? "bg-white dark:bg-slate-900 text-red-600 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              {std}
            </button>
          ))}
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTRO POR EMPRESA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Buscar por equipo, folio u observaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-red-600/30 focus:ring-4 focus:ring-red-600/5 transition-all text-slate-800 dark:text-slate-200"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors">
            <Building2 size={18} />
          </div>
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-red-600/30 focus:ring-4 focus:ring-red-600/5 transition-all text-slate-800 dark:text-slate-200 appearance-none"
          >
            {uniqueCompanies.map((company) => (
              <option key={company} value={company}>
                {company === "TODOS"
                  ? "Todas las empresas / sucursales"
                  : company}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <Filter size={14} />
          </div>
        </div>
      </div>

      {/* Filtro de Categoría */}
      {filterStd !== "TODOS" && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {["TODOS", ...categoriesByStd[filterStd]].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-4 py-2 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${filterCat === cat ? "bg-red-600 text-white border-red-600" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
            >
              {cat === "TODOS" ? "Cualquier tipo" : cat}
            </button>
          ))}
        </div>
      )}

      {/* ✅ Barra de Selección Masiva — solo visible para ADMIN */}
      {isAdmin && selectedIds.length > 0 && (
        <div className="p-4 bg-slate-900 dark:bg-slate-800 rounded-xl flex items-center justify-between text-white shadow-lg animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg">
              <ClipboardCheck size={18} />
            </div>
            <span className="text-sm font-semibold">
              {selectedIds.length} reportes seleccionados
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg text-xs font-bold transition-colors"
            >
              Eliminar Selección
            </button>
          </div>
        </div>
      )}

      {/* LISTADO TÉCNICO */}
      <div className="grid gap-3">
        {filteredInspections?.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-16 rounded-2xl border border-slate-200 dark:border-slate-700 text-center shadow-sm flex flex-col items-center justify-center space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full border border-slate-100 dark:border-slate-700">
              <Search
                size={32}
                className="text-slate-400 dark:text-slate-500"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                No se encontraron resultados
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Intenta con otros términos o filtros
              </p>
            </div>
            {(searchTerm ||
              filterCompany !== "TODOS" ||
              filterStd !== "TODOS") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterCompany("TODOS");
                  setFilterStd("TODOS");
                  setFilterCat("TODOS");
                }}
                className="text-red-600 dark:text-red-400 text-xs font-bold hover:underline mt-2"
              >
                Limpiar todos los filtros
              </button>
            )}
          </div>
        ) : (
          filteredInspections.map((item) => {
            const style =
              statusConfig[item.overallStatus] || statusConfig["PENDIENTE"];
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`flex flex-col p-5 bg-white dark:bg-slate-900 rounded-xl border-l-4 ${style.border} ${isSelected ? "border border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10" : "border border-slate-200 dark:border-slate-700"} shadow-sm hover:shadow-md transition-all`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    {/* ✅ Checkbox de selección — solo ADMIN */}
                    {isAdmin && (
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className={
                          isSelected
                            ? "text-red-600"
                            : "text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
                        }
                      >
                        {isSelected ? (
                          <CheckSquare size={22} />
                        ) : (
                          <Square size={22} />
                        )}
                      </button>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 dark:text-slate-400 tracking-wider">
                          {item.standard}
                        </span>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">
                          {item.equipmentName}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1.5">
                        <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                          <FileText size={12} />{" "}
                          {item.formCode || item.serviceCode || "IPM"}
                        </p>
                        <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                          <RefreshCw size={12} />{" "}
                          {new Date(item.date).toLocaleDateString()}
                        </p>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <MapPin size={12} />{" "}
                          {item.clientName || "Sin sucursal"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${style.badge}`}
                    >
                      {style.icon} {item.overallStatus}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {/* ✅ Ver y Editar disponibles para todos */}
                      <ActionIcon
                        icon={<Eye size={18} />}
                        onClick={() => handleOpenModal(item, false)}
                      />
                      <ActionIcon
                        icon={<Edit3 size={18} />}
                        onClick={() => handleOpenModal(item, true)}
                      />
                      <button
                        onClick={() => generatePDF(item)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <FileDown size={18} />
                      </button>
                      {/* ✅ Botón eliminar — SOLO ADMIN */}
                      {isAdmin && (
                        <button
                          onClick={() =>
                            handleDeleteIndividual(item.id, item.equipmentName)
                          }
                          className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {item.generalObs && (
                  <div className="mt-3 ml-10 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                      "{item.generalObs}"
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DETALLE / EDICIÓN */}
      {selectedReport && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedReport(null)}
          ></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-700">
            {/* Header Modal */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="bg-red-600 p-2.5 rounded-xl text-white shadow-lg shadow-red-600/20">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    {editMode
                      ? "Editar Reporte Técnico"
                      : "Detalles de Inspección"}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">
                    Folio:{" "}
                    {selectedReport.formCode || selectedReport.serviceCode}{" "}
                    &middot; {selectedReport.standard}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InfoBlock
                  icon={<Building2 size={16} />}
                  label="Sucursal / Cliente"
                  value={selectedReport.clientName}
                />
                <InfoBlock
                  icon={<MapPin size={16} />}
                  label="Ubicación en Sitio"
                  value={
                    selectedReport.location
                      ? typeof selectedReport.location === "object"
                        ? `Lat: ${selectedReport.location.lat}, Lng: ${selectedReport.location.lng}`
                        : selectedReport.location
                      : "No especificada"
                  }
                />
                <InfoBlock
                  icon={<User size={16} />}
                  label="Técnico Responsable"
                  value={selectedReport.performedBy || "Sin asignar"}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                    Diagnóstico General
                  </h4>
                  {editMode ? (
                    <div className="grid grid-cols-3 gap-2">
                      {["ÓPTIMO", "ADVERTENCIA", "CRÍTICO"].map((st) => (
                        <button
                          key={st}
                          onClick={() => setTempStatus(st)}
                          className={`py-3 rounded-xl text-[10px] font-bold border transition-all ${tempStatus === st ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20 scale-[1.02]" : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"}`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${statusConfig[selectedReport.overallStatus]?.badge}`}
                    >
                      {statusConfig[selectedReport.overallStatus]?.icon}{" "}
                      {selectedReport.overallStatus}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                    Nombre del Responsable (Firma)
                  </h4>
                  {editMode ? (
                    <input
                      type="text"
                      value={tempOwnerName}
                      onChange={(e) => setTempOwnerName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm outline-none focus:border-red-600 transition-all text-slate-800 dark:text-slate-200"
                    />
                  ) : (
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      {selectedReport.ownerName || "No capturado"}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                  Observaciones Técnicas y Hallazgos
                </h4>
                {editMode ? (
                  <textarea
                    value={tempObs}
                    onChange={(e) => setTempObs(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm outline-none focus:border-red-600 transition-all text-slate-800 dark:text-slate-200 resize-none"
                    placeholder="Describe los hallazgos técnicos..."
                  />
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 italic text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    "
                    {selectedReport.generalObs ||
                      "Sin observaciones adicionales registradas."}
                    "
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                  Puntos de Inspección (Checklist)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(tempDetails).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl"
                    >
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate mr-2">
                        {key}
                      </span>
                      {editMode ? (
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1">
                          {["SÍ", "NO", "N/A"].map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                setTempDetails((prev) => ({
                                  ...prev,
                                  [key]: option,
                                }))
                              }
                              className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${val === option ? "bg-white dark:bg-slate-900 text-red-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span
                          className={`text-[10px] font-black px-2 py-1 rounded ${val === "SÍ" ? "text-green-600 bg-green-50 dark:bg-green-900/20" : val === "NO" ? "text-red-600 bg-red-50 dark:bg-red-900/20" : "text-slate-400 bg-slate-50 dark:bg-slate-800"}`}
                        >
                          {val}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {tempVoltages &&
                tempVoltages.length > 0 &&
                tempVoltages.some((v) => v.min || v.max) && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                      Lecturas de Voltaje / Amperaje
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {tempVoltages.map((v, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center"
                        >
                          <span className="text-[9px] font-bold text-slate-400 block mb-2 uppercase">
                            Línea {idx + 1}
                          </span>
                          {editMode ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={v.min}
                                onChange={(e) => {
                                  const n = [...tempVoltages];
                                  n[idx].min = e.target.value;
                                  setTempVoltages(n);
                                }}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1 text-[10px] text-center outline-none focus:border-red-600"
                                placeholder="Min"
                              />
                              <input
                                type="text"
                                value={v.max}
                                onChange={(e) => {
                                  const n = [...tempVoltages];
                                  n[idx].max = e.target.value;
                                  setTempVoltages(n);
                                }}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1 text-[10px] text-center outline-none focus:border-red-600"
                                placeholder="Max"
                              />
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {v.min || "-"} / {v.max || "-"}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Footer Modal */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                {selectedReport.synced ? (
                  <Cloud size={14} className="text-green-500" />
                ) : (
                  <CloudOff size={14} className="text-amber-500" />
                )}
                {selectedReport.synced
                  ? "Sincronizado con la nube"
                  : "Pendiente de sincronización"}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cerrar
                </button>
                {editMode ? (
                  <button
                    onClick={handleUpdate}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-red-600/20 transition-all active:scale-95"
                  >
                    Guardar Cambios
                  </button>
                ) : (
                  <button
                    onClick={() => generatePDF(selectedReport)}
                    className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
                  >
                    <FileDown size={18} /> Descargar PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ icon, label, value }) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-2 text-red-600 mb-1.5">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
        {value || "No capturado"}
      </p>
    </div>
  );
}

function ActionIcon({ icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
    >
      {icon}
    </button>
  );
}
