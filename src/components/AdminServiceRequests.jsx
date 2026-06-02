import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  ClipboardList, UserCheck, Clock, CheckCircle2, 
  AlertCircle, Building2, Calendar, RefreshCw, FileText 
} from 'lucide-react';

export default function AdminServiceRequests() {
  const [requests, setRequests] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTechs, setSelectedTechs] = useState({}); // Guarda el técnico seleccionado por cada fila o ticket

  useEffect(() => {
    fetchRequests();
    fetchTechnicians();

    // Suscripción en tiempo real para ver solicitudes nuevas de inmediato
    const channel = supabase
      .channel('realtime-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Obtener las solicitudes uniendo los datos del cliente para saber qué negocio lo pide
  async function fetchRequests() {
    const { data, error } = await supabase
      .from('service_requests')
      .select(`
        *,
        clientes (
          nombre
        )
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setRequests(data);
    } else {
      toast.error("Error al cargar las solicitudes de servicio");
    }
    setLoading(false);
  }

  // Obtener la lista de técnicos disponibles para el menú desplegable
  async function fetchTechnicians() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'STAFF')
      .order('full_name', { ascending: true });

    if (!error) {
      setTechnicians(data);
    }
  }

  // Manejar el cambio de opción en el select de técnicos
  const handleTechChange = (requestId, techId) => {
    setSelectedTechs(prev => ({
      ...prev,
      [requestId]: techId
    }));
  };

  // Confirmar y guardar la asignación del técnico manualmente
  const handleAssignTechnician = async (requestId) => {
    const tecnicoId = selectedTechs[requestId];
    
    if (!tecnicoId) {
      toast.error("Por favor, selecciona un técnico antes de confirmar.");
      return;
    }

    setIsSubmitting(true);
    const actionToast = toast.loading("Confirmando solicitud y asignando técnico...");

    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          tecnico_id: tecnicoId,
          status: 'ASIGNADO',
          fecha_asignacion: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success("Solicitud confirmada. Al cliente le aparecerá el estatus actualizado.", { id: actionToast });
      fetchRequests(); // Refrescar la lista
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: actionToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función auxiliar para pintar los colores del estatus
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDIENTE':
        return 'bg-amber-50 text-amber-600 border border-amber-200';
      case 'ASIGNADO':
        return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'EN_PROCESO':
        return 'bg-purple-50 text-purple-600 border border-purple-200';
      case 'COMPLETADO':
        return 'bg-green-50 text-green-600 border border-green-200';
      default:
        return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 animate-in fade-in duration-500">
      
      {/* ENCABEZADO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-50">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-4 rounded-2xl text-white">
            <ClipboardList size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Panel de Solicitudes</h2>
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1">Bandeja de Entrada y Asignación de Soporte</p>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-10 text-center animate-pulse text-slate-400 font-black uppercase text-[10px] tracking-wider">
            Cargando solicitudes entrantes...
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border-2 border-slate-50 text-center shadow-sm space-y-3">
            <AlertCircle size={40} className="text-slate-300 mx-auto" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">No hay solicitudes de servicio registradas en el sistema.</p>
          </div>
        ) : (
          requests.map((ticket) => (
            <div key={ticket.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-red-100 transition-all">
              
              {/* DETALLES DEL TICKET */}
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${getStatusBadge(ticket.status)}`}>
                    {ticket.status === 'PENDIENTE' ? '⚠️ Por Confirmar' : ticket.status}
                  </span>
                  <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Calendar size={12} /> {new Date(ticket.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-black text-base text-slate-800 uppercase tracking-tight leading-snug flex items-center gap-2">
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    {ticket.titulo}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    {ticket.descripcion}
                  </p>
                </div>

                {/* NOMBRE DEL NEGOCIO QUE SOLICITA */}
                <div className="flex items-center gap-2 text-xs font-black text-slate-700 bg-blue-50/60 w-fit px-3 py-1.5 rounded-xl border border-blue-100 uppercase tracking-tight">
                  <Building2 size={14} className="text-blue-600" />
                  Sucursal: <span className="text-blue-700 ml-1">{ticket.clientes?.nombre || 'Desconocida'}</span>
                </div>
              </div>

              {/* ACCIÓN DE ASIGNACIÓN (DERECHA) */}
              <div className="shrink-0 w-full md:w-64 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-center space-y-3">
                {ticket.status === 'PENDIENTE' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Asignar Técnico</label>
                      <select 
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none uppercase text-slate-800 focus:border-red-400"
                        value={selectedTechs[ticket.id] || ''}
                        onChange={(e) => handleTechChange(ticket.id, e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        {technicians.map(tech => (
                          <option key={tech.id} value={tech.id}>{tech.full_name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleAssignTechnician(ticket.id)}
                      className="w-full py-3 bg-slate-900 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? <RefreshCw className="animate-spin" size={12}/> : <><UserCheck size={14}/> Confirmar Orden</>}
                    </button>
                  </>
                ) : (
                  <div className="text-center py-2 space-y-1.5 animate-in fade-in">
                    <CheckCircle2 size={24} className="text-green-500 mx-auto" />
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Orden Procesada</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">
                      Técnico asignado correctamente.
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