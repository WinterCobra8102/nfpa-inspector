import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import { showConfirmDelete } from "../alerts";
import {
  ClipboardList,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  RefreshCw,
  FileText,
  Trash2,
  AlertTriangle,
  MapPin,
  ShieldCheck,
} from "lucide-react";

export default function AdminServiceRequests({ currentUser }) {
  const [requests, setRequests] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ESTADO PARA EL NUEVO FORMULARIO DE ASIGNACIÓN (Técnico, Fecha, Hora, NFPA)
  const [assignmentData, setAssignmentData] = useState({});

  // Catálogo base de normativas NFPA
  const nfpaOptions = [
    "NFPA 10 (Extintores)",
    "NFPA 13 (Rociadores)",
    "NFPA 20 (Bombas)",
    "NFPA 25 (Inspección y Prueba)",
    "NFPA 72 (Alarmas)",
    "Otro / Revisión General",
  ];

  useEffect(() => {
    fetchRequests();
    fetchTechnicians();

    const channel = supabase
      .channel("nuevas-solicitudes-admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "service_requests" },
        (payload) => {
          toast.success("Nueva solicitud de servicio recibida", {
            duration: 6000,
            position: "top-right",
            style: {
              background: "#ef4444",
              color: "#fff",
              fontWeight: "500",
              borderRadius: "0.75rem",
            },
            iconTheme: { primary: "#fff", secondary: "#ef4444" },
          });
          fetchRequests();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "service_requests" },
        () => {
          fetchRequests();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchRequests() {
    const { data, error } = await supabase
      .from("service_requests")
      .select(
        `
        *,
        clientes (
          nombre
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (!error) {
      setRequests(data);
    } else {
      toast.error("Error al cargar las solicitudes de servicio");
    }
    setLoading(false);
  }

  async function fetchTechnicians() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "STAFF")
      .order("full_name", { ascending: true });

    if (!error) {
      setTechnicians(data);
    }
  }

  const handleAssignmentChange = (requestId, field, value) => {
    setAssignmentData((prev) => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        [field]: value,
      },
    }));
  };

  const handleAssignTechnician = async (requestId) => {
    const ticketData = assignmentData[requestId] || {};

    // Validaciones
    if (!ticketData.tecnico_id) {
      toast.error("Por favor, selecciona un técnico.");
      return;
    }
    if (!ticketData.fecha_programada || !ticketData.hora_programada) {
      toast.error("Debes establecer una fecha y hora para la cita técnica.");
      return;
    }

    setIsSubmitting(true);
    const actionToast = toast.loading(
      "Confirmando agenda y asignando técnico...",
    );

    try {
      const { error } = await supabase
        .from("service_requests")
        .update({
          tecnico_id: ticketData.tecnico_id,
          fecha_programada: ticketData.fecha_programada,
          hora_programada: ticketData.hora_programada,
          normativa_nfpa: ticketData.normativa_nfpa || null,
          status: "ASIGNADO",
          fecha_asignacion: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Solicitud confirmada y agendada correctamente.", {
        id: actionToast,
      });
      fetchRequests();
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: actionToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = (ticketId, ticketTitle) => {
    showConfirmDelete(`el reporte "${ticketTitle}"`, async () => {
      const deleteToast = toast.loading("Eliminando reporte del sistema...");
      try {
        const { error } = await supabase
          .from("service_requests")
          .delete()
          .eq("id", ticketId);

        if (error) throw error;

        toast.success("Reporte eliminado permanentemente.", {
          id: deleteToast,
        });
        fetchRequests();
      } catch (err) {
        toast.error(`Error al eliminar: ${err.message}`, { id: deleteToast });
      }
    });
  };

  const handlePurgeAllRequests = () => {
    showConfirmDelete(
      "TODOS los reportes del sistema (esta acción es irreversible)",
      async () => {
        const deleteToast = toast.loading("Vaciando bandeja de solicitudes...");
        try {
          const { error } = await supabase
            .from("service_requests")
            .delete()
            .not("id", "is", null);

          if (error) throw error;

          toast.success("Bandeja vaciada correctamente.", { id: deleteToast });
          fetchRequests();
        } catch (err) {
          toast.error(`Error al vaciar: ${err.message}`, { id: deleteToast });
        }
      },
    );
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDIENTE":
        return "bg-amber-50 text-amber-600 border border-amber-200";
      case "ASIGNADO":
        return "bg-blue-50 text-blue-600 border border-blue-200";
      case "EN_PROCESO":
        return "bg-purple-50 text-purple-600 border border-purple-200";
      case "COMPLETADO":
        return "bg-green-50 text-green-600 border border-green-200";
      default:
        return "bg-slate-50 text-slate-600";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-red-50 p-3 rounded-xl border border-red-100">
            <ClipboardList size={24} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              Panel de Solicitudes
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Bandeja de entrada y asignación de soporte
            </p>
          </div>
        </div>

        {currentUser?.role === "ADMIN" && requests.length > 0 && (
          <button
            onClick={handlePurgeAllRequests}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all active:scale-[0.98] border border-red-100 hover:border-red-600"
          >
            <AlertTriangle size={16} /> Vaciar Bandeja
          </button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            Cargando solicitudes entrantes...
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm space-y-3">
            <AlertCircle size={36} className="text-slate-300 mx-auto" />
            <p className="text-sm text-slate-400">
              No hay solicitudes de servicio registradas en el sistema.
            </p>
          </div>
        ) : (
          requests.map((ticket) => (
            <div
              key={ticket.id}
              className="relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-6 hover:border-slate-300 hover:shadow-md transition-all"
            >
              {currentUser?.role === "ADMIN" && (
                <button
                  onClick={() => handleDeleteRequest(ticket.id, ticket.titulo)}
                  className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-95"
                  title="Eliminar este reporte"
                >
                  <Trash2 size={16} />
                </button>
              )}

              <div className="space-y-3 flex-1 pr-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-md ${getStatusBadge(ticket.status)}`}
                  >
                    {ticket.status === "PENDIENTE"
                      ? "Por Confirmar"
                      : ticket.status}
                  </span>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} />{" "}
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-base text-slate-800 leading-snug flex items-center gap-2">
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    {ticket.titulo}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {ticket.descripcion}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-blue-50 w-fit px-3 py-1.5 rounded-lg border border-blue-100">
                    <Building2 size={14} className="text-blue-600" />
                    Sucursal:{" "}
                    <span className="text-blue-700 ml-1">
                      {ticket.clientes?.nombre || "Desconocida"}
                    </span>
                  </div>
                  {ticket.location && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-purple-50 w-fit px-3 py-1.5 rounded-lg border border-purple-100">
                      <MapPin size={14} className="text-purple-600" />
                      <span className="text-purple-700">Ubicación Adjunta</span>
                    </div>
                  )}
                </div>

                {/* Mostrar datos agendados si ya no está PENDIENTE */}
                {ticket.status !== "PENDIENTE" && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col sm:flex-row gap-4">
                    {ticket.fecha_programada && (
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <Calendar size={14} className="text-red-500" />
                        Cita Agendada:{" "}
                        <span className="font-bold text-red-600">
                          {new Date(
                            ticket.fecha_programada + "T00:00:00",
                          ).toLocaleDateString()}{" "}
                          a las {formatTime(ticket.hora_programada)}
                        </span>
                      </div>
                    )}
                    {ticket.normativa_nfpa && (
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        Norma:{" "}
                        <span className="font-bold text-emerald-600 uppercase">
                          {ticket.normativa_nfpa}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PANEL DE ASIGNACIÓN (Sólo si está PENDIENTE) */}
              <div className="shrink-0 w-full lg:w-70">
                {ticket.status === "PENDIENTE" ? (
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-4 shadow-sm">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">
                        1. Técnico Responsable
                      </label>
                      <select
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm outline-none text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                        value={assignmentData[ticket.id]?.tecnico_id || ""}
                        onChange={(e) =>
                          handleAssignmentChange(
                            ticket.id,
                            "tecnico_id",
                            e.target.value,
                          )
                        }
                      >
                        <option value="">Seleccionar técnico...</option>
                        {technicians.map((tech) => (
                          <option key={tech.id} value={tech.id}>
                            {tech.full_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">
                          2. Día
                        </label>
                        <input
                          type="date"
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm outline-none text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          value={
                            assignmentData[ticket.id]?.fecha_programada || ""
                          }
                          onChange={(e) =>
                            handleAssignmentChange(
                              ticket.id,
                              "fecha_programada",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      {/* AQUÍ ESTÁ EL NUEVO SELECTOR DE HORA AM/PM */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">
                          3. Hora
                        </label>
                        <select
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm outline-none text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          value={
                            assignmentData[ticket.id]?.hora_programada || ""
                          }
                          onChange={(e) =>
                            handleAssignmentChange(
                              ticket.id,
                              "hora_programada",
                              e.target.value,
                            )
                          }
                        >
                          <option value="">Seleccionar...</option>
                          {Array.from({ length: 48 }).map((_, i) => {
                            const hour24 = Math.floor(i / 2);
                            const minutes = i % 2 === 0 ? "00" : "30";
                            const ampm = hour24 >= 12 ? "PM" : "AM";
                            const hour12 = hour24 % 12 || 12;
                            const timeString = `${hour24.toString().padStart(2, "0")}:${minutes}:00`;
                            const displayString = `${hour12}:${minutes} ${ampm}`;

                            return (
                              <option key={timeString} value={timeString}>
                                {displayString}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">
                        4. Normativa NFPA (Opcional)
                      </label>
                      <select
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm outline-none text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                        value={assignmentData[ticket.id]?.normativa_nfpa || ""}
                        onChange={(e) =>
                          handleAssignmentChange(
                            ticket.id,
                            "normativa_nfpa",
                            e.target.value,
                          )
                        }
                      >
                        <option value="">Ninguna vinculación</option>
                        {nfpaOptions.map((nfpa) => (
                          <option key={nfpa} value={nfpa}>
                            {nfpa}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleAssignTechnician(ticket.id)}
                      className="w-full mt-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="animate-spin" size={16} />
                      ) : (
                        <>
                          <UserCheck size={16} /> Agendar y Asignar
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl h-full flex flex-col items-center justify-center p-6 space-y-2">
                    <CheckCircle2 size={32} className="text-green-500" />
                    <p className="text-sm font-bold text-slate-700 uppercase tracking-widest mt-2">
                      Agendado
                    </p>
                    <p className="text-xs text-slate-400 text-center leading-relaxed">
                      El técnico y el cliente ya tienen este evento en su panel.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
