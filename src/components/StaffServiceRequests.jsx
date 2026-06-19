import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  ClipboardList, CheckCircle2, AlertCircle, Building2, 
  Calendar, RefreshCw, FileText, Play, CheckCheck
} from 'lucide-react';

export default function StaffServiceRequests({ currentUser }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      fetchMyRequests();

      // Suscripción para escuchar si el Admin le asigna un nuevo ticket en tiempo real
      const channel = supabase
        .channel('solicitudes-staff')
        .on(
          'postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'service_requests',
            filter: `tecnico_id=eq.${currentUser.id}` 
          }, 
          (payload) => {
            if (payload.new.status === 'ASIGNADO' && payload.old.status === 'PENDIENTE') {
                toast.success("¡Te han asignado una nueva Orden de Servicio!", {
                    duration: 5000,
                    icon: '🚀'
                });
            }
            fetchMyRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  async function fetchMyRequests() {
    // Busca TODAS las órdenes del técnico, excepto las completadas
    const { data, error } = await supabase
      .from('service_requests')
      .select(`
        *,
        clientes (
          nombre
        )
      `)
      .eq('tecnico_id', currentUser.id)
      .neq('status', 'COMPLETADO') // Ocultar las que ya terminó para no saturar su pantalla
      .order('created_at', { ascending: false });

    if (!error) {
      setRequests(data);
    } else {
      toast.error("Error al cargar tus órdenes de servicio.");
    }
    setLoading(false);
  }

  // --- LÓGICA DE RBAC: FLUJO OPERATIVO DEL TÉCNICO ---

  // Acción 1: El técnico acepta la orden y empieza a trabajar (Cambia a EN_PROCESO)
  const handleStartWork = async (requestId) => {
    setIsSubmitting(true);
    const actionToast = toast.loading("Iniciando orden de trabajo...");

    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: 'EN_PROCESO',
          updated_at: new Date().toISOString() // Aprovechando la columna que creaste en SQL
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success("Has iniciado el trabajo. El cliente ha sido notificado.", { id: actionToast });
      fetchMyRequests(); 
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: actionToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Acción 2: El técnico termina la reparación (Cambia a COMPLETADO)
  const handleCompleteWork = async (requestId, title) => {
    // Utilizamos una alerta de sistema limpia en lugar de la alerta roja de borrado
    const isConfirmed = window.confirm(`¿Estás seguro de concluir el trabajo:\n"${title}"?\n\nAl aceptar, esta orden desaparecerá de tu bandeja y se marcará como terminada.`);
    
    if (!isConfirmed) return;

    setIsSubmitting(true);
    const actionToast = toast.loading("Cerrando ticket de servicio...");

    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: 'COMPLETADO',
          fecha_resolucion: new Date().toISOString(), // Marca la hora exacta de terminación
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success("¡Orden completada y archivada exitosamente!", { id: actionToast });
      fetchMyRequests(); // Al recargar, desaparecerá de su lista
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: actionToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ASIGNADO':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
      case 'EN_PROCESO':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse';
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
            <ClipboardList size={24} className="text-red-600 dark:text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">Mi Bandeja Operativa</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Órdenes de servicio asignadas a tu perfil</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="animate-spin" size={16}/> Sincronizando tus órdenes...
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm space-y-3">
            <CheckCircle2 size={48} className="text-green-500 dark:text-green-400 mx-auto opacity-50" />
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">¡Todo al día!</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500">No tienes ninguna orden de servicio pendiente.</p>
          </div>
        ) : (
          requests.map((ticket) => (
            <div key={ticket.id} className="relative bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all">
              
              <div className="space-y-3 flex-1 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${getStatusBadge(ticket.status)}`}>
                    {ticket.status === 'ASIGNADO' ? 'NUEVA ASIGNACIÓN' : 'TRABAJO EN CURSO'}
                  </span>
                  <div className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Calendar size={12} /> {new Date(ticket.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 leading-snug flex items-center gap-2">
                    <FileText size={18} className="text-red-500 shrink-0" />
                    {ticket.titulo}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    {ticket.descripcion}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-blue-50 dark:bg-blue-900/20 w-fit px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800">
                  <Building2 size={14} className="text-blue-600 dark:text-blue-400" />
                  Sucursal a Visitar: <span className="font-bold text-blue-700 dark:text-blue-400 ml-1">{ticket.clientes?.nombre || 'Desconocida'}</span>
                </div>
              </div>

              {/* PANEL DE ACCIONES DEL TÉCNICO */}
              <div className="shrink-0 w-full md:w-56 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg flex flex-col justify-center space-y-3">
                {ticket.status === 'ASIGNADO' ? (
                  <>
                    <p className="text-xs text-center font-medium text-slate-500 dark:text-slate-400">¿Estás en sitio?</p>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleStartWork(ticket.id)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? <RefreshCw className="animate-spin" size={16}/> : <><Play size={16}/> Iniciar Trabajo</>}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-center space-y-1">
                        <AlertCircle size={20} className="text-amber-500 mx-auto animate-pulse" />
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">En Ejecución</p>
                    </div>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleCompleteWork(ticket.id, ticket.titulo)}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? <RefreshCw className="animate-spin" size={16}/> : <><CheckCheck size={18}/> Concluir Orden</>}
                    </button>
                  </>
                )}
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}