import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  MessageSquare, Send, Clock, UserCheck, PlayCircle, 
  CheckCircle2, AlertCircle, RefreshCw, FileText 
} from 'lucide-react';

export default function ClientServiceRequests({ currentUser }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myClientId, setMyClientId] = useState(null);

  useEffect(() => {
    if (currentUser?.id) {
      initializeClientData();

      // ==========================================
      // SUSCRIPCIÓN WEB-SOCKETS (REALTIME) CLIENTE
      // ==========================================
      const channel = supabase
        .channel('realtime-client-requests')
        .on(
          'postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'service_requests' }, 
          (payload) => {
            if (payload.new.status !== payload.old.status) {
              const statusName = getStatusDisplay(payload.new.status).text;
              toast.success(`Tu solicitud ha cambiado de estado a: ${statusName}`, {
                icon: '🔔',
                duration: 5000,
                position: 'top-right',
                style: {
                  background: '#1e293b',
                  color: '#fff',
                  fontWeight: '600',
                  borderRadius: '0.5rem'
                }
              });
            }
            fetchMyRequests();
          }
        )
        .on(
          'postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'service_requests' }, 
          () => fetchMyRequests()
        )
        .subscribe((status) => {
          if(status === 'SUBSCRIBED') {
             console.log('📡 Conexión en Tiempo Real Activa (Cliente).');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  async function initializeClientData() {
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', currentUser.id)
      .single();

    if (profile?.client_id) {
      setMyClientId(profile.client_id);
      fetchMyRequests();
    } else {
      setLoading(false);
      toast.error("Tu perfil no tiene una empresa asignada. Contacta a soporte.");
    }
  }

  async function fetchMyRequests() {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('client_id', myClientId) 
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
    setLoading(false);
  }

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!titulo.trim() || !descripcion.trim()) {
      toast.error("Por favor llena el título y la descripción del problema.");
      return;
    }

    if (!myClientId) {
      toast.error("Error de vinculación: No se detectó tu empresa.");
      return;
    }

    setIsSubmitting(true);
    const actionToast = toast.loading("Enviando solicitud al equipo de soporte...");

    try {
      const { error } = await supabase
        .from('service_requests')
        .insert([{
          client_id: myClientId,
          requested_by: currentUser.id,
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          status: 'PENDIENTE'
        }]);

      if (error) throw error;

      toast.success("Solicitud enviada con éxito. En breve te asignaremos un técnico.", { id: actionToast });
      setTitulo('');
      setDescripcion('');
      fetchMyRequests();
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: actionToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'PENDIENTE':
        return { style: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', text: 'En Revisión (Administración)', icon: <Clock size={14}/> };
      case 'ASIGNADO':
        return { style: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800', text: 'Recibido - Técnico Asignado', icon: <UserCheck size={14}/> };
      case 'EN_PROCESO':
        return { style: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800', text: 'Trabajo en Progreso', icon: <PlayCircle size={14}/> };
      case 'COMPLETADO':
        return { style: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800', text: 'Servicio Completado', icon: <CheckCircle2 size={14}/> };
      default:
        return { style: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300', text: status, icon: null };
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      
      {/* ENCABEZADO MINIMALISTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
            <MessageSquare size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Centro de Soporte</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Levantar reporte o solicitar servicio</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* FORMULARIO DE NUEVA SOLICITUD (IZQUIERDA) */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit">
          <h3 className="font-semibold text-sm mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4 text-slate-900 dark:text-white">
            <Send size={16} className="text-blue-600 dark:text-blue-400" strokeWidth={1.5}/> Nuevo Reporte
          </h3>
          
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">¿Qué necesitas?</label>
              <input 
                type="text" 
                placeholder="Ej: Revisión de bomba, Fuga de agua..." 
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500" 
                value={titulo} 
                onChange={e => setTitulo(e.target.value)} 
                disabled={isSubmitting || !myClientId}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">Detalles del problema</label>
              <textarea 
                rows="4"
                placeholder="Describe brevemente la situación para enviar al técnico adecuado..." 
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500" 
                value={descripcion} 
                onChange={e => setDescripcion(e.target.value)}
                disabled={isSubmitting || !myClientId}
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || !myClientId} 
              className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" size={16}/> : <><Send size={16}/> Enviar Solicitud</>}
            </button>
          </form>
        </div>

        {/* HISTORIAL DE SOLICITUDES DEL CLIENTE (DERECHA) */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-slate-900 dark:text-white px-1">
            <Clock size={16} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5}/> Historial de Solicitudes
          </h3>

          {loading ? (
            <div className="p-12 text-center animate-pulse text-slate-400 dark:text-slate-500 font-medium text-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              Cargando historial...
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-16 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm space-y-4 flex flex-col items-center justify-center">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full border border-slate-100 dark:border-slate-700">
                <AlertCircle size={32} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aún no has solicitado ningún servicio.</p>
            </div>
          ) : (
            requests.map((ticket) => {
              const statusData = getStatusDisplay(ticket.status);
              return (
                <div key={ticket.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
                  
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5 flex-1">
                      <h4 className="font-semibold text-base text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                        <FileText size={16} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5}/> {ticket.titulo}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        Creado el: {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* BADGE DE ESTATUS DINÁMICO */}
                    <div className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border ${statusData.style}`}>
                      {statusData.icon}
                      {statusData.text}
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                    {ticket.descripcion}
                  </p>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
