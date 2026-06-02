import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  Wrench, MapPin, Phone, Clock, PlayCircle, 
  CheckCircle2, AlertCircle, Building2, FileText, CheckCircle
} from 'lucide-react';

export default function StaffServiceRequests({ currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      fetchMyTasks();

      // Suscripción en tiempo real: Si el admin le asigna una tarea ahorita, aparecerá sola.
      const channel = supabase
        .channel('realtime-staff-requests')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'service_requests',
            filter: `tecnico_id=eq.${currentUser.id}`
        }, () => {
          fetchMyTasks();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  // Obtener SOLO las solicitudes asignadas a este técnico
  async function fetchMyTasks() {
    const { data, error } = await supabase
      .from('service_requests')
      .select(`
        *,
        clientes (
          nombre,
          direccion,
          telefono
        )
      `)
      .eq('tecnico_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setTasks(data);
    } else {
      toast.error("Error al cargar tus asignaciones.");
    }
    setLoading(false);
  }

  // Función para avanzar el estado del ticket
  const handleUpdateStatus = async (taskId, currentStatus) => {
    setIsUpdating(true);
    let newStatus = '';
    let toastMsg = '';

    if (currentStatus === 'ASIGNADO') {
      newStatus = 'EN_PROCESO';
      toastMsg = 'Has iniciado el trabajo. El cliente ha sido notificado.';
    } else if (currentStatus === 'EN_PROCESO') {
      newStatus = 'COMPLETADO';
      toastMsg = '¡Trabajo finalizado con éxito!';
    }

    const actionToast = toast.loading("Actualizando estatus...");

    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      toast.success(toastMsg, { id: actionToast });
      fetchMyTasks();
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: actionToast });
    } finally {
      setIsUpdating(false);
    }
  };

  // Función auxiliar para pintar los colores del estatus
  const getStatusBadge = (status) => {
    switch (status) {
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
          <div className="bg-red-600 p-4 rounded-2xl text-white">
            <Wrench size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Mis Órdenes de Servicio</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Trabajos Asignados por Administración</p>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-10 text-center animate-pulse text-slate-400 font-black uppercase text-[10px] tracking-wider">
            Sincronizando tareas...
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border-2 border-slate-50 text-center shadow-sm space-y-3">
            <CheckCircle size={40} className="text-green-400 mx-auto" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">No tienes órdenes de servicio pendientes.</p>
          </div>
        ) : (
          tasks.map((ticket) => (
            <div key={ticket.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-red-100 transition-all">
              
              {/* DETALLES DEL TICKET */}
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${getStatusBadge(ticket.status)}`}>
                    {ticket.status === 'ASIGNADO' ? '🔵 Nueva Orden' : ticket.status === 'EN_PROCESO' ? '🟣 En Progreso' : '🟢 Finalizado'}
                  </span>
                  <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Clock size={12} /> Asignado: {new Date(ticket.fecha_asignacion || ticket.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight leading-snug flex items-center gap-2">
                    <FileText size={18} className="text-slate-400 shrink-0" />
                    {ticket.titulo}
                  </h3>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                    {ticket.descripcion}
                  </p>
                </div>

                {/* INFO DEL CLIENTE (DONDE TIENE QUE IR EL TÉCNICO) */}
                <div className="grid md:grid-cols-2 gap-2 mt-2">
                  <div className="flex items-start gap-2 text-[10px] font-bold text-slate-600 bg-white p-2 rounded-lg border border-slate-100 uppercase">
                    <Building2 size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <span><span className="text-slate-400 block text-[8px]">Sucursal</span> {ticket.clientes?.nombre || 'No especificada'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[10px] font-bold text-slate-600 bg-white p-2 rounded-lg border border-slate-100 uppercase">
                    <MapPin size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <span><span className="text-slate-400 block text-[8px]">Dirección</span> {ticket.clientes?.direccion || 'No especificada'}</span>
                  </div>
                  {ticket.clientes?.telefono && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-white p-2 rounded-lg border border-slate-100 uppercase md:col-span-2">
                      <Phone size={14} className="text-green-500 shrink-0" />
                      <span><span className="text-slate-400 mr-1">Contacto:</span> {ticket.clientes.telefono}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* BOTONES DE ACCIÓN (NO HAY BOTÓN DE CANCELAR) */}
              <div className="shrink-0 w-full md:w-56 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-center space-y-3">
                {ticket.status === 'ASIGNADO' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus(ticket.id, ticket.status)}
                    className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <PlayCircle size={16}/> Iniciar Trabajo
                  </button>
                )}

                {ticket.status === 'EN_PROCESO' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus(ticket.id, ticket.status)}
                    className="w-full py-4 bg-purple-600 hover:bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 animate-pulse"
                  >
                    <CheckCircle2 size={16}/> Finalizar Tarea
                  </button>
                )}

                {ticket.status === 'COMPLETADO' && (
                  <div className="text-center py-2 space-y-1.5">
                    <CheckCircle2 size={28} className="text-green-500 mx-auto" />
                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Trabajo Terminado</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">
                      Administración notificada.
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