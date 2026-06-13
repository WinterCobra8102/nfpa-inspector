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
          console.log('¡Alerta de WebSocket! Nueva Solicitud:', payload);
          
          toast.success("🚨 ¡NUEVA SOLICITUD DE SERVICIO!", {
            duration: 6000,
            position: 'top-right',
            style: { 
              background: '#ef4444', 
              color: '#fff', 
              fontWeight: '600', 
              borderRadius: '0.5rem'
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
      .subscribe((status) => {
        if(status === 'SUBSCRIBED') {
           console.log('📡 Conexión en Tiempo Real Activa.');
        }
      });

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDIENTE':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
      case 'ASIGNADO':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
      case 'EN_PROCESO':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800';
      case 'COMPLETADO':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800';
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      
      {/* ENCABEZADO MINIMALISTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-red-600 dark:text-red-500 border border-red-100 dark:border-red-900/30">
            <ClipboardList size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Panel de Solicitudes</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Bandeja de entrada y asignación de soporte</p>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center animate-pulse text-slate-400 dark:text-slate-500 font-medium text-sm">
            Cargando solicitudes entrantes...
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-16 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm space-y-4 flex flex-col items-center justify-center">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full border border-slate-100 dark:border-slate-700">
              <AlertCircle size={32} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No hay solicitudes de servicio registradas en el sistema.</p>
          </div>
        ) : (
          requests.map((ticket) => (
            <div key={ticket.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6 hover:shadow-md transition-shadow duration-200">
              
              {/* DETALLES DEL TICKET */}
              <div className="space-y-4 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${getStatusBadge(ticket.status)}`}>
                    {ticket.status === 'PENDIENTE' ? 'Por Confirmar' : ticket.status}
                  </span>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Calendar size={14} strokeWidth={1.5} /> {new Date(ticket.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    {ticket.titulo}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {ticket.descripcion}
                  </p>
                </div>

                {/* NOMBRE DEL NEGOCIO QUE SOLICITA */}
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 pt-2">
                  <Building2 size={16} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
                  <span>Sucursal: <span className="font-medium text-slate-900 dark:text-white">{ticket.clientes?.nombre || 'Desconocida'}</span></span>
                </div>
              </div>

              {/* ACCIÓN DE ASIGNACIÓN (DERECHA) */}
              <div className="shrink-0 w-full md:w-72 p-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg flex flex-col justify-center space-y-4">
                {ticket.status === 'PENDIENTE' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">Asignar Técnico</label>
                      <select 
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-colors"
                        value={selectedTechs[ticket.id] || ''}
                        onChange={(e) => handleTechChange(ticket.id, e.target.value)}
                      >
                        <option value="">Seleccionar técnico...</option>
                        {technicians.map(tech => (
                          <option key={tech.id} value={tech.id}>{tech.full_name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleAssignTechnician(ticket.id)}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? <RefreshCw className="animate-spin" size={16}/> : <><UserCheck size={16} strokeWidth={2}/> Confirmar Orden</>}
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <CheckCircle2 size={28} className="text-green-500" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Orden Procesada</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Técnico asignado correctamente.
                      </p>
                    </div>
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
