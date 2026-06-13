import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { showConfirmDelete } from '../alerts'; 
import { 
  ClipboardList, UserCheck, Clock, CheckCircle2, 
  AlertCircle, Building2, Calendar, RefreshCw, FileText, Trash2, AlertTriangle 
} from 'lucide-react';

export default function AdminServiceRequests({ currentUser }) {
  const [requests, setRequests] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTechs, setSelectedTechs] = useState({}); 

  useEffect(() => {
    fetchRequests();
    fetchTechnicians();

    const channel = supabase
      .channel('nuevas-solicitudes-admin')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'service_requests' }, 
        (payload) => {
          toast.success("Nueva solicitud de servicio recibida", {
            duration: 6000,
            position: 'top-right',
            style: { 
              background: '#ef4444', 
              color: '#fff', 
              fontWeight: '500', 
              borderRadius: '0.75rem'
            },
            iconTheme: { primary: '#fff', secondary: '#ef4444' }
          });
          fetchRequests();
        }
      )
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'service_requests' }, 
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const handleTechChange = (requestId, techId) => {
    setSelectedTechs(prev => ({
      ...prev,
      [requestId]: techId
    }));
  };

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
          .from('service_requests')
          .delete()
          .eq('id', ticketId);

        if (error) throw error;

        toast.success("Reporte eliminado permanentemente.", { id: deleteToast });
        fetchRequests(); 
      } catch (err) {
        toast.error(`Error al eliminar: ${err.message}`, { id: deleteToast });
      }
    });
  };

  const handlePurgeAllRequests = () => {
    showConfirmDelete("TODOS los reportes del sistema (esta acción es irreversible)", async () => {
      const deleteToast = toast.loading("Vaciando bandeja de solicitudes...");
      try {
        const { error } = await supabase
          .from('service_requests')
          .delete()
          .not('id', 'is', null); 

        if (error) throw error;

        toast.success("Bandeja vaciada correctamente.", { id: deleteToast });
        fetchRequests(); 
      } catch (err) {
        toast.error(`Error al vaciar: ${err.message}`, { id: deleteToast });
      }
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDIENTE':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
      case 'ASIGNADO':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
      case 'EN_PROCESO':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800';
      case 'COMPLETADO':
        return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800';
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
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">Panel de Solicitudes</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Bandeja de entrada y asignación de soporte</p>
          </div>
        </div>

        {currentUser?.role === 'ADMIN' && requests.length > 0 && (
          <button 
            onClick={handlePurgeAllRequests}
            className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-600 dark:hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white dark:hover:text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all active:scale-[0.98] border border-red-100 dark:border-red-800 hover:border-red-600 dark:hover:border-red-600"
          >
            <AlertTriangle size={16} /> Vaciar Bandeja
          </button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm">
            Cargando solicitudes entrantes...
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm space-y-3">
            <AlertCircle size={36} className="text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400 dark:text-slate-500">No hay solicitudes de servicio registradas en el sistema.</p>
          </div>
        ) : (
          requests.map((ticket) => (
            <div key={ticket.id} className="relative bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all">
              
              {currentUser?.role === 'ADMIN' && (
                <button 
                  onClick={() => handleDeleteRequest(ticket.id, ticket.titulo)}
                  className="absolute top-4 right-4 p-2 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-95"
                  title="Eliminar este reporte"
                >
                  <Trash2 size={16} />
                </button>
              )}

              <div className="space-y-3 flex-1 pr-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md ${getStatusBadge(ticket.status)}`}>
                    {ticket.status === 'PENDIENTE' ? 'Por Confirmar' : ticket.status}
                  </span>
                  <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Calendar size={12} /> {new Date(ticket.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-base text-slate-800 dark:text-slate-200 leading-snug flex items-center gap-2">
                    <FileText size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    {ticket.titulo}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {ticket.descripcion}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20 w-fit px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800">
                  <Building2 size={14} className="text-blue-600 dark:text-blue-400" />
                  Sucursal: <span className="text-blue-700 dark:text-blue-400 ml-1">{ticket.clientes?.nombre || 'Desconocida'}</span>
                </div>
              </div>

              <div className="shrink-0 w-full md:w-60 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg flex flex-col justify-center space-y-3">
                {ticket.status === 'PENDIENTE' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Asignar Técnico</label>
                      <select 
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium outline-none text-slate-800 dark:text-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
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
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? <RefreshCw className="animate-spin" size={14}/> : <><UserCheck size={14}/> Confirmar Orden</>}
                    </button>
                  </>
                ) : (
                  <div className="text-center py-2 space-y-1.5">
                    <CheckCircle2 size={20} className="text-green-500 mx-auto" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Orden Procesada</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                      Técnico asignado. El cliente podrá ver el estatus actualizado.
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
