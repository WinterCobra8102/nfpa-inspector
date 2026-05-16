import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Calendar as CalendarIcon, Clock, CheckCircle2, SlidersHorizontal, 
  CalendarDays, CalendarRange, Activity, Search, BookOpen, X, Info,
  UserPlus, Save, FileText, ArrowRight, ArrowLeft, Plus // <-- IMPORTAMOS PLUS
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function IPMCalendar({ currentUser, navigateTo, selectedCompany, onBack }) {
  const [tasks, setTasks] = useState([]);
  const [technicians, setTechnicians] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS DE FILTROS ---
  const [activeWeek, setActiveWeek] = useState('Semana 1');
  const [filterColor, setFilterColor] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('Mayo'); 
  const [filterDay, setFilterDay] = useState('ALL');
  const [filterFreq, setFilterFreq] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- ESTADOS DE MODALES ---
  const [showGlossary, setShowGlossary] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false); // <-- CONTROL MODAL CREACIÓN
  const [selectedTask, setSelectedTask] = useState(null); 
  
  // ESTADO TEMPORAL PARA EDITAR TAREA EXISTENTE
  const [editData, setEditData] = useState({
    tecnico_id: '',
    fecha_programada: '',
    status: '',
    notas_tecnico: ''
  });

  // --- ESTADO TEMPORAL PARA CREAR NUEVA TAREA DESDE CERO ---
  const [newTask, setNewTask] = useState({
    custom_id: '', // Código personalizado ej: IPM-09 o 25-01
    title: '',
    color_code: 'red', // Por defecto NFPA 25
    frequency: 'Mensual',
    mes: 'Mayo',
    semana: 'Semana 1',
    day_of_week: 'Lunes',
    system: 'NFPA 25 (Agua)'
  });

  // Relación de Colores y Normas
  const categories = [
    { id: 'red', label: 'NFPA 25 (Agua)', class: 'bg-red-500', system: 'NFPA 25 (Agua)' },
    { id: 'orange', label: 'NFPA 72 (Alarma)', class: 'bg-orange-500', system: 'NFPA 72 (Alarma)' },
    { id: 'purple', label: 'NFPA 17A (Espuma)', class: 'bg-purple-500', system: 'NFPA 17A (Espuma)' },
    { id: 'green', label: 'NFPA 2001 (Limpios)', class: 'bg-green-500', system: 'NFPA 2001 (Limpios)' },
  ];

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const allDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const frequencies = ['Semanal', 'Mensual', 'Trimestral', 'Semestral', 'Anual', 'Quinquenal'];

  // Permisos según rol
  const canAssign = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  const canExecute = currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF';

  useEffect(() => {
    fetchIPMTasks();
    if (canAssign) fetchTechnicians();
  }, [currentUser, selectedCompany]);

  const fetchTechnicians = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, email').eq('role', 'STAFF');
    if (data) setTechnicians(data);
  };

  const fetchIPMTasks = async () => {
    setLoading(true);
    let query = supabase.from('ipm_tasks').select('*');
    
    if (selectedCompany) {
      query = query.eq('client_id', selectedCompany.id);
    } else if (currentUser?.role === 'MANAGER') {
      query = query.eq('client_id', currentUser.client_id);
    }
    
    const { data, error } = await query.order('id', { ascending: true });
    if (error) toast.error("Error al cargar calendario");
    else setTasks(data || []);
    setLoading(false);
  };

  // Abrir Modal de Tarea Existente
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setEditData({
      tecnico_id: task.tecnico_id || '',
      fecha_programada: task.fecha_programada || '',
      status: task.status || 'PENDIENTE',
      notas_tecnico: task.notas_tecnico || ''
    });
  };

  // --- FUNCIÓN GUARDAR / ACTUALIZAR TAREA EXISTENTE ---
  const handleSaveTask = async () => {
    if (canAssign) {
      if (!editData.tecnico_id) {
        toast.error("⚠️ Por favor, selecciona un técnico de la lista.");
        return;
      }
      if (!editData.fecha_programada) {
        toast.error("⚠️ Por favor, selecciona una fecha programada.");
        return;
      }
    }

    const loadingToast = toast.loading("Guardando actualización...");
    try {
      const updates = { ...editData };
      if (updates.tecnico_id === '') updates.tecnico_id = null;
      if (updates.fecha_programada === '') updates.fecha_programada = null;

      if (editData.status === 'COMPLETO' && selectedTask.status !== 'COMPLETO') {
        updates.fecha_realizacion = new Date().toISOString();
      }

      const { error } = await supabase.from('ipm_tasks').update(updates).eq('id', selectedTask.id);
      if (error) throw error;
      
      toast.success("Tarea actualizada correctamente", { id: loadingToast });
      setSelectedTask(null);
      fetchIPMTasks(); 
    } catch (error) {
      toast.error("Error al guardar: " + error.message, { id: loadingToast });
    }
  };

  // --- MÓDULO AGREGADO: FUNCIÓN PARA CREAR UNA NUEVA ACTIVIDAD DESDE CERO ---
  const handleCreateNewTask = async () => {
    if (!newTask.custom_id || !newTask.title) {
      toast.error("⚠️ El código y el título de la actividad son obligatorios.");
      return;
    }
    if (!selectedCompany) {
      toast.error("⚠️ Error: No hay ninguna empresa seleccionada para heredar la actividad.");
      return;
    }

    const loadingToast = toast.loading("Registrando nueva actividad en el cronograma...");
    try {
      // Buscamos el sistema de texto correspondiente al color seleccionado
      const matchedSystem = categories.find(c => c.id === newTask.color_code)?.system || 'NFPA 25';

      const taskPayload = {
        id: newTask.custom_id.toUpperCase(), // Se guarda como la clave primaria visible
        client_id: selectedCompany.id, // Amarrado de forma síncrona a la sucursal activa
        title: newTask.title.toUpperCase(),
        color_code: newTask.color_code,
        frequency: newTask.frequency,
        mes: newTask.mes,
        semana: newTask.semana,
        day_of_week: newTask.day_of_week,
        system: matchedSystem,
        status: 'PENDIENTE'
      };

      const { error } = await supabase.from('ipm_tasks').insert([taskPayload]);
      if (error) throw error;

      toast.success("¡Nueva actividad inyectada con éxito!", { id: loadingToast });
      setShowCreateModal(false);
      // Limpiamos el formulario para la siguiente creación
      setNewTask({
        custom_id: '', title: '', color_code: 'red', frequency: 'Mensual',
        mes: filterMonth === 'ALL' ? 'Mayo' : filterMonth, 
        semana: activeWeek, day_of_week: 'Lunes', system: 'NFPA 25 (Agua)'
      });
      fetchIPMTasks(); // Recarga reactiva instantánea
    } catch (error) {
      console.error(error);
      toast.error("Error al crear actividad: El código de ID ya existe o está duplicado.", { id: loadingToast });
    }
  };

  // --- MOTOR DE FILTRADO MULTICRITERIO ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.semana !== activeWeek) return false;
      if (filterColor !== 'ALL' && t.color_code !== filterColor) return false;
      if (filterMonth !== 'ALL' && t.mes?.toLowerCase() !== filterMonth.toLowerCase()) return false;
      if (filterDay !== 'ALL' && t.day_of_week !== filterDay) return false;
      if (filterFreq !== 'ALL' && t.frequency?.toLowerCase() !== filterFreq.toLowerCase()) return false;
      if (searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        return t.title.toLowerCase().includes(searchLower) || String(t.id).toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [tasks, filterColor, activeWeek, filterMonth, filterDay, filterFreq, searchTerm]);

  const daysToRender = filterDay === 'ALL' ? allDays : [filterDay];
  const completedTasks = filteredTasks.filter(t => t.status === 'COMPLETO').length;
  const progressPercent = filteredTasks.length > 0 ? Math.round((completedTasks / filteredTasks.length) * 100) : 0;

  if (loading) return (
    <div className="h-full flex items-center justify-center text-slate-500 font-black uppercase text-[10px] tracking-[0.3em] min-h-[50vh]">
      Sincronizando Cronograma...
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 animate-in fade-in duration-500 pb-32 relative overflow-hidden">
      
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-red-600 transition-all tracking-wider mb-2">
          <ArrowLeft size={14} /> Volver a Directorio de Empresas
        </button>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-xl border-2 border-slate-50">
        <div>
          <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em]">Cronograma de Servicios</p>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 leading-none mt-1">Calendario IPM</h2>
          {selectedCompany && (
            <p className="text-xs font-black text-red-600 uppercase mt-2">SUCURSAL: {selectedCompany.nombre}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* BOTÓN AGREGAR ACTIVIDAD (SOLO ADMIN/MANAGER) */}
          {canAssign && (
            <button 
              onClick={() => {
                setNewTask(prev => ({ ...prev, mes: filterMonth === 'ALL' ? 'Mayo' : filterMonth, semana: activeWeek }));
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-md shadow-red-600/10"
            >
              <Plus size={16} /> Agregar Actividad
            </button>
          )}

          <button 
            onClick={() => setShowGlossary(true)}
            className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95"
          >
            <BookOpen size={16} /> Glosario Normativo
          </button>

          <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100 items-center">
            <button onClick={() => setFilterColor('ALL')} className={`px-4 py-2 rounded-xl text-[9px] font-black transition-all ${filterColor === 'ALL' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>TODOS</button>
            {categories.map(cat => (
              <button
                key={cat.id} onClick={() => setFilterColor(cat.id)}
                className={`group relative w-8 h-8 rounded-full border-4 transition-all hover:scale-110 flex items-center justify-center ${cat.class} ${filterColor === cat.id ? 'border-slate-900 scale-110' : 'border-transparent opacity-40 hover:opacity-100'}`}
              >
                <div className="absolute -bottom-8 scale-0 group-hover:scale-100 transition-all bg-slate-900 text-white text-[8px] py-1 px-2 rounded-lg whitespace-nowrap z-50">{cat.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BARRA SUPERIOR DE FILTROS */}
      <div className="bg-slate-900 p-4 rounded-[1.5rem] flex flex-col lg:flex-row gap-4 items-center shadow-lg">
        <div className="w-full lg:w-1/3 bg-white/10 rounded-xl flex items-center px-4 border border-white/10 focus-within:border-red-500 transition-colors h-12">
          <Search size={16} className="text-slate-400 mr-2" />
          <input 
            type="text" 
            placeholder="Buscar válvula, bomba, hidrante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-white text-xs font-bold outline-none placeholder:text-slate-500"
          />
          {searchTerm && <button onClick={() => setSearchTerm('')}><X size={14} className="text-slate-400 hover:text-white"/></button>}
        </div>

        <div className="h-[1px] w-full lg:w-[1px] lg:h-8 bg-white/10" />

        <div className="flex-1 flex w-full flex-wrap gap-2">
          <div className="flex-1 min-w-[120px] bg-white/10 rounded-xl flex items-center px-3 border border-white/10 h-12">
            <CalendarDays size={14} className="text-slate-400" />
            <select className="w-full bg-transparent text-white text-xs font-bold p-2 outline-none appearance-none cursor-pointer" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="ALL" className="text-black">Todos los Meses</option>
              {months.map(m => <option key={m} value={m} className="text-black">{m}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[120px] bg-white/10 rounded-xl flex items-center px-3 border border-white/10 h-12">
            <CalendarRange size={14} className="text-slate-400" />
            <select className="w-full bg-transparent text-white text-xs font-bold p-2 outline-none appearance-none cursor-pointer" value={filterDay} onChange={(e) => setFilterDay(e.target.value)}>
              <option value="ALL" className="text-black">Toda la Semana</option>
              {allDays.map(d => <option key={d} value={d} className="text-black">{d}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[120px] bg-white/10 rounded-xl flex items-center px-3 border border-white/10 h-12">
            <Activity size={14} className="text-slate-400" />
            <select className="w-full bg-transparent text-white text-xs font-bold p-2 outline-none appearance-none cursor-pointer" value={filterFreq} onChange={(e) => setFilterFreq(e.target.value)}>
              <option value="ALL" className="text-black">Cualquier Frecuencia</option>
              {frequencies.map(f => <option key={f} value={f} className="text-black">{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE VISITA Y PROGRESO */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-[1.5rem]">
          <button onClick={() => setActiveWeek('Semana 1')} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeWeek === 'Semana 1' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>Visita 1 - Semana 1</button>
          <button onClick={() => setActiveWeek('Semana 3')} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeWeek === 'Semana 3' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>Visita 2 - Semana 3</button>
        </div>
        
        <div className="flex items-center gap-4 pr-4 w-full sm:w-auto">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avance del Filtro</p>
            <p className="text-xs font-black text-slate-800">{completedTasks} de {filteredTasks.length} Tareas</p>
          </div>
          <div className="w-24 sm:w-32 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* CUERPO DEL CALENDARIO */}
      <div className={`grid gap-4 ${filterDay === 'ALL' ? 'grid-cols-1 xl:grid-cols-5' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {daysToRender.map(dia => (
          <div key={dia} className="space-y-3 bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm min-h-[400px]">
            <div className="text-center py-2.5 bg-slate-50 rounded-xl border border-slate-100">
               <h4 className="font-black uppercase text-[11px] text-slate-800 tracking-[0.2em]">{dia}</h4>
            </div>
            
            <div className="space-y-3 pt-2">
              {filteredTasks.filter(t => t.day_of_week === dia).map(task => (
                <div 
                  key={task.id} 
                  onClick={() => handleTaskClick(task)}
                  className={`group p-4 rounded-2xl border-l-4 bg-slate-50 transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1 cursor-pointer relative overflow-hidden ${task.color_code === 'red' ? 'border-l-red-500' : task.color_code === 'orange' ? 'border-l-orange-500' : task.color_code === 'purple' ? 'border-l-purple-500' : 'border-l-green-500'}`}
                >
                  {task.tecnico_id && (
                    <div className="absolute top-0 right-0 bg-blue-100 text-blue-600 text-[8px] font-black px-2 py-1 rounded-bl-xl z-20">ASIGNADA</div>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded text-white ${task.color_code === 'red' ? 'bg-red-500' : task.color_code === 'orange' ? 'bg-orange-500' : task.color_code === 'purple' ? 'bg-purple-500' : 'bg-green-500'}`}>{task.id}</span>
                    <span className="text-[8px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">{task.frequency}</span>
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-700 leading-snug mb-4 pr-4">{task.title}</p>
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                    <div className={`w-1.5 h-1.5 rounded-full ${task.status === 'COMPLETO' ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{task.status}</span>
                  </div>
                </div>
              ))}

              {filteredTasks.filter(t => t.day_of_week === dia).length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center gap-2 opacity-30">
                  <CheckCircle2 size={24} className="text-slate-400" />
                  <span className="text-[8px] font-black text-slate-500 uppercase text-center">Sin Actividades</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- MÓDULO AGREGADO: MODAL PARA CREAR NUEVO "COSITO" DESDE CERO --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col border-t-8 border-red-600 animate-in zoom-in-95 duration-150">
            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
              <div>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider">Planificación Normativa</span>
                <h3 className="font-black uppercase text-slate-800 text-lg mt-2">Nueva Actividad de Mantenimiento</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Código de Actividad (ID Único)</label>
                  <input placeholder="Ej: IPM-09 o 25-01" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs outline-none focus:border-red-500 uppercase" value={newTask.custom_id} onChange={e => setNewTask({...newTask, custom_id: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Normativa Relacionada (Color)</label>
                  <select className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs outline-none focus:border-red-500" value={newTask.color_code} onChange={e => setNewTask({...newTask, color_code: e.target.value})}>
                    <option value="red">NFPA 25 (Sistemas Base Agua)</option>
                    <option value="orange">NFPA 72 (Alarma y Detección)</option>
                    <option value="purple">NFPA 17A (Agentes Espumosos)</option>
                    <option value="green">NFPA 2001 (Sistemas de Agentes Limpios)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Título / Descripción de la Tarea</label>
                <input placeholder="Ej: INSPECCIÓN DE VÁLVULAS MARIPOSA EN RISER..." className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs outline-none focus:border-red-500 uppercase" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Frecuencia del Ciclo</label>
                  <select className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs outline-none" value={newTask.frequency} onChange={e => setNewTask({...newTask, frequency: e.target.value})}>
                    {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Mes Programado</label>
                  <select className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs outline-none" value={newTask.mes} onChange={e => setNewTask({...newTask, mes: e.target.value})}>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Período de Visita (Quincena)</label>
                  <select className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs outline-none" value={newTask.semana} onChange={e => setNewTask({...newTask, semana: e.target.value})}>
                    <option value="Semana 1">Visita 1 - Semana 1</option>
                    <option value="Semana 3">Visita 2 - Semana 3</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Día de la Semana</label>
                  <select className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs outline-none" value={newTask.day_of_week} onChange={e => setNewTask({...newTask, day_of_week: e.target.value})}>
                    {allDays.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 bg-white border text-slate-500 font-black text-[10px] py-4 rounded-xl uppercase tracking-wider">Cancelar</button>
              <button onClick={handleCreateNewTask} className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-black text-[10px] py-4 rounded-xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"><Save size={14}/> Inyectar Actividad</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ORDEN DE TRABAJO (EDICIÓN EXISTENTE) */}
      {selectedTask && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedTask(null)} />
          <div className={`bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col border-t-8 ${
            selectedTask.color_code === 'red' ? 'border-red-500' : selectedTask.color_code === 'orange' ? 'border-orange-500' : selectedTask.color_code === 'purple' ? 'border-purple-500' : 'border-green-500'
          }`}>
            <div className="p-6 bg-slate-50 flex justify-between items-start border-b border-slate-100">
              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded text-white ${selectedTask.color_code === 'red' ? 'bg-red-500' : selectedTask.color_code === 'orange' ? 'bg-orange-500' : selectedTask.color_code === 'purple' ? 'bg-purple-500' : 'bg-green-500'}`}>
                  {selectedTask.id} • {selectedTask.system}
                </span>
                <h3 className="font-black uppercase text-slate-800 text-lg mt-3 leading-tight">{selectedTask.title}</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{selectedTask.frequency} | {selectedTask.day_of_week} ({selectedTask.semana} de {selectedTask.mes})</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-colors"><X size={20}/></button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[50vh]">
              {canAssign && (
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-blue-700 tracking-widest flex items-center gap-2 mb-2"><UserPlus size={14}/> Asignar a Técnico</label>
                    <select value={editData.tecnico_id} onChange={(e) => setEditData({...editData, tecnico_id: e.target.value})} className="w-full p-3 rounded-xl bg-white border border-blue-200 text-xs font-bold text-slate-700 outline-none focus:border-blue-500">
                      <option value="">-- Seleccionar Técnico --</option>
                      {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name || t.email}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-blue-700 tracking-widest flex items-center gap-2 mb-2"><CalendarDays size={14}/> Fecha Programada</label>
                    <input type="date" value={editData.fecha_programada} onChange={(e) => setEditData({...editData, fecha_programada: e.target.value})} className="w-full p-3 rounded-xl bg-white border border-blue-200 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" />
                  </div>
                </div>
              )}

              {canExecute && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest flex items-center gap-2 mb-2"><Activity size={14}/> Estatus de Inspección</label>
                    <select value={editData.status} onChange={(e) => setEditData({...editData, status: e.target.value})} className={`w-full p-3 rounded-xl border text-xs font-black outline-none ${editData.status === 'COMPLETO' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                      <option value="PENDIENTE">PENDIENTE (Programado)</option>
                      <option value="COMPLETO">COMPLETO (Realizado)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest flex items-center gap-2 mb-2"><FileText size={14}/> Observaciones / Hallazgos</label>
                    <textarea rows="3" placeholder="Ej: Se encontró oxidation ligera..." value={editData.notas_tecnico} onChange={(e) => setEditData({...editData, notas_tecnico: e.target.value})} className="w-full p-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-slate-400" />
                  </div>
                  
                  <button 
                    onClick={() => {
                      if(navigateTo) {
                         setSelectedTask(null);
                         navigateTo('form');
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors group"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">Ir al Formulario Oficial NFPA</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
              <button onClick={() => setSelectedTask(null)} className="flex-1 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={handleSaveTask} className="flex-[2] flex items-center justify-center gap-2 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-all"><Save size={16}/> Guardar Registro</button>
            </div>
          </div>
        </div>
      )}

      {/* GLOSARIO TÉCNICO */}
      {showGlossary && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowGlossary(false)} />
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-3">
                <Info size={24} className="text-blue-400" />
                <h3 className="font-black uppercase tracking-widest text-lg">Glosario Normativo</h3>
              </div>
              <button onClick={() => setShowGlossary(false)} className="p-2 bg-white/10 hover:bg-red-600 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="border border-red-100 rounded-2xl overflow-hidden">
                <div className="bg-red-50 p-3 border-b border-red-100 font-black text-red-700 text-xs uppercase tracking-widest flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full" /> NFPA 25 - Bombas, Hidrantes y Montantes</div>
                <div className="p-4 text-xs text-slate-600 space-y-2">
                  <p><strong>[25-XX]:</strong> Nomenclatura oficial NFPA 25.</p>
                  <p><strong>[S-X]:</strong> Tareas relacionadas con Bombas (Succión).</p>
                  <p><strong>[A-X]:</strong> Pruebas Anuales de Agua y Flujo.</p>
                  <p><strong>[T-X]:</strong> Pruebas Trimestrales de Agua.</p>
                </div>
              </div>

              <div className="border border-orange-100 rounded-2xl overflow-hidden">
                <div className="bg-orange-50 p-3 border-b border-orange-100 font-black text-orange-700 text-xs uppercase tracking-widest flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-full" /> NFPA 72 - Detección y Alarmas</div>
                <div className="p-4 text-xs text-slate-600 grid grid-cols-2 gap-2">
                  <p><strong>[P-X]:</strong> Panel de Control FPA5000.</p>
                  <p><strong>[B-X]:</strong> Baterías de Respaldo.</p>
                  <p><strong>[H-X]:</strong> Detectores de Humo.</p>
                  <p><strong>[C-X]:</strong> Detectores de Calor.</p>
                  <p><strong>[F-X]:</strong> Foto-Beams (Lineales).</p>
                  <p><strong>[E-X]:</strong> Estaciones Manuales.</p>
                  <p><strong>[N-X]:</strong> Dispositivos Notificación (Sirenas).</p>
                </div>
              </div>

              <div className="border border-purple-100 rounded-2xl overflow-hidden">
                <div className="bg-purple-50 p-3 border-b border-purple-100 font-black text-purple-700 text-xs uppercase tracking-widest flex items-center gap-2"><div className="w-3 h-3 bg-purple-500 rounded-full" /> NFPA 17A - Agentes Espumosos</div>
                <div className="p-4 text-xs text-slate-600 space-y-2">
                  <p><strong>[17A-XX]:</strong> Nomenclatura oficial NFPA 17A.</p>
                  <p><strong>[E-X]:</strong> Válvulas y proporcionadores de Espuma.</p>
                  <p><strong>[ET-X]:</strong> Pruebas de Tanque de Concentrado.</p>
                  <p><strong>[EA-X]:</strong> Pruebas Anuales (Laboratorio y Flujo).</p>
                </div>
              </div>

              <div className="border border-green-100 rounded-2xl overflow-hidden">
                <div className="bg-green-50 p-3 border-b border-green-100 font-black text-green-700 text-xs uppercase tracking-widest flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full" /> NFPA 2001 - Agentes Limpios</div>
                <div className="p-4 text-xs text-slate-600 space-y-2">
                  <p><strong>[2001-XX]:</strong> Nomenclatura oficial NFPA 2001.</p>
                  <p><strong>[L-X]:</strong> Inspección visual de sistema Limpio.</p>
                  <p><strong>[LS-X]:</strong> Pruebas Semestrales (Peso y Presión de Cilindros).</p>
                  <p><strong>[LA-X]:</strong> Pruebas Anuales (Door Fan Test, Hold Time).</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button onClick={() => setShowGlossary(false)} className="w-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl hover:bg-red-600 transition-colors">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}