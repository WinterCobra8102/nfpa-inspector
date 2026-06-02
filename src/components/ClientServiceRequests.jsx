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

      // Suscripción en tiempo real para ver cuando el Admin o Técnico actualizan el ticket
      const channel = supabase
        .channel('realtime-client-requests')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'service_requests' 
        }, () => {
          fetchMyRequests();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  // 1. Primero obtenemos la ID de la empresa a la que pertenece este cliente
  async function initializeClientData() {
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', currentUser.id)
      .single();

    if (profile?.client_id) {
      setMyClientId(profile.client_id);
      fetchMyRequests(); // Una vez que sabemos su empresa, traemos sus tickets
    } else {
      setLoading(false);
      toast.error("Tu perfil no tiene una empresa asignada. Contacta a soporte.");
    }
  }

  // 2. Traemos solo los tickets de su empresa (protegido por RLS)
  async function fetchMyRequests() {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setRequests(data);
    }
    setLoading(false);
  }

  // 3. Enviar una nueva solicitud de servicio al Admin
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

  // Función para determinar el color e ícono del estatus
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'PENDIENTE':
        return { style: 'bg-amber-50 text-amber-600 border-amber-200', text: 'En Revisión (Administración)', icon: <Clock size={12}/> };
      case 'ASIGNADO':
        return { style: 'bg-blue-50 text-blue-600 border-blue-200', text: 'Recibido - Técnico Asignado', icon: <UserCheck size={12}/> };
      case 'EN_PROCESO':
        return { style: 'bg-purple-50 text-purple-600 border-purple-200', text: 'Trabajo en Progreso', icon: <PlayCircle size={12}/> };
      case 'COMPLETADO':
        return { style: 'bg-green-50 text-green-600 border-green-200', text: 'Servicio Completado', icon: <CheckCircle2 size={12}/> };
      default:
        return { style: 'bg-slate-50 text-slate-600', text: status, icon: null };
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 animate-in fade-in duration-500">
      
      {/* ENCABEZADO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-50">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-4 rounded-2xl text-white">
            <MessageSquare size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Centro de Soporte</h2>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Levantar Reporte o Solicitar Servicio</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* FORMULARIO DE NUEVA SOLICITUD (IZQUIERDA) */}
        <div className="md:col-span-1 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-lg h-fit">
          <h3 className="font-black uppercase text-xs mb-6 flex items-center gap-2 border-b pb-4 text-slate-800">
            <Send size={16} className="text-blue-600"/> Nuevo Reporte
          </h3>
          
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-2">¿Qué necesitas?</label>
              <input 
                type="text" 
                placeholder="Ej: Revisión de bomba, Fuga de agua..." 
                className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none uppercase text-slate-800 focus:border-blue-400 focus:bg-white border border-transparent transition-colors" 
                value={titulo} 
                onChange={e => setTitulo(e.target.value)} 
                disabled={isSubmitting || !myClientId}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-2">Detalles del problema</label>
              <textarea 
                rows="4"
                placeholder="Describe brevemente la situación para enviar al técnico adecuado..." 
                className="w-full p-3 bg-slate-50 rounded-xl text-xs font-medium outline-none text-slate-700 focus:border-blue-400 focus:bg-white border border-transparent transition-colors resize-none custom-scrollbar" 
                value={descripcion} 
                onChange={e => setDescripcion(e.target.value)}
                disabled={isSubmitting || !myClientId}
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || !myClientId} 
              className="w-full py-4 mt-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" size={16}/> : <><Send size={14}/> Enviar Solicitud</>}
            </button>
          </form>
        </div>

        {/* HISTORIAL DE SOLICITUDES DEL CLIENTE (DERECHA) */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-black uppercase text-xs mb-2 flex items-center gap-2 text-slate-800 px-2">
            <Clock size={16} className="text-slate-400"/> Historial de Solicitudes
          </h3>

          {loading ? (
            <div className="p-10 text-center animate-pulse text-slate-400 font-black uppercase text-[10px] tracking-wider bg-white rounded-[2rem] border-2 border-slate-50 shadow-sm">
              Cargando historial...
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] border-2 border-slate-50 text-center shadow-sm space-y-3">
              <AlertCircle size={40} className="text-slate-300 mx-auto" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Aún no has solicitado ningún servicio.</p>
            </div>
          ) : (
            requests.map((ticket) => {
              const statusData = getStatusDisplay(ticket.status);
              return (
                <div key={ticket.id} className="bg-white p-5 rounded-[1.5rem] border-2 border-slate-50 shadow-sm flex flex-col gap-3 hover:border-blue-100 transition-all">
                  
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-black text-sm uppercase text-slate-800 leading-none flex items-center gap-1.5">
                        <FileText size={14} className="text-slate-400"/> {ticket.titulo}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        Creado el: {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* BADGE DE ESTATUS DINÁMICO */}
                    <div className={`shrink-0 flex items-center gap-1.5 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider border ${statusData.style}`}>
                      {statusData.icon}
                      {statusData.text}
                    </div>
                  </div>

                  <p className="text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-xl">
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