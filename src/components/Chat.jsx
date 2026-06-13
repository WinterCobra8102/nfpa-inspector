import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  MessageSquare, Send, X, Users, Building2, User, 
  ChevronLeft, Settings, Plus, Search, Archive, CheckCircle2, Loader2,
  Trash2, AlertCircle, ShieldCheck
} from 'lucide-react';

const Chat = ({ currentUser }) => {
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [usersForNewChat, setUsersForNewChat] = useState([]);
  const [clientsForNewChat, setClientsForNewChat] = useState([]);
  const [selectedUserForNewChat, setSelectedUserForNewChat] = useState(null);
  const [selectedClientForNewChat, setSelectedClientForNewChat] = useState(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const messagesEndRef = useRef(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    fetchChatRooms();

    const roomsChannel = supabase
      .channel('chat_rooms_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => fetchChatRooms())
      .subscribe();

    const participantsChannel = supabase
      .channel('chat_participants_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants' }, () => fetchChatRooms())
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [currentUser]);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom.id);
      markRoomAsRead(selectedRoom.id);

      const messagesChannel = supabase
        .channel(`room_${selectedRoom.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${selectedRoom.id}` }, payload => {
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();
          markRoomAsRead(selectedRoom.id);
        })
        .subscribe();

      return () => { supabase.removeChannel(messagesChannel); };
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function fetchChatRooms() {
    if (!currentUser) return;
    setLoadingRooms(true);
    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          room_id,
          chat_rooms (*,
            clientes (nombre),
            chat_participants (
              user_id,
              profiles (full_name, role)
            )
          )
        `)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      const rooms = data.map(p => ({ ...p.chat_rooms }));
      rooms.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      setChatRooms(rooms);
    } catch (err) {
      console.error('Error rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  }

  async function fetchMessages(roomId) {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`*, sender:profiles(full_name, role)`)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (!error) setMessages(data);
    setLoadingMessages(false);
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: selectedRoom.id,
        sender_id: currentUser.id,
        content: newMessage.trim(),
      });

    if (!error) setNewMessage('');
  }

  async function markRoomAsRead(roomId) {
    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', currentUser.id);
  }

  const handleDeleteRoom = async (roomId) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('chat_rooms').delete().eq('id', roomId);
    if (!error) {
      toast.success('Chat eliminado');
      setSelectedRoom(null);
      setShowDeleteConfirm(null);
      fetchChatRooms();
    }
  };

  const openNewChatModal = async () => {
    setShowNewChatModal(true);
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .neq('id', currentUser.id)
      .order('full_name', { ascending: true });
    setUsersForNewChat(users || []);

    if (isAdmin) {
      const { data: clients } = await supabase.from('clientes').select('id, nombre').order('nombre', { ascending: true });
      setClientsForNewChat(clients || []);
    }
  };

  const handleCreatePrivateChat = async () => {
    if (!selectedUserForNewChat) return;
    setIsCreatingRoom(true);

    try {
      const { data: newRoom, error: roomErr } = await supabase
        .from('chat_rooms')
        .insert({ type: 'PRIVATE' })
        .select()
        .single();
      if (roomErr) throw roomErr;

      const { error: partErr } = await supabase
        .from('chat_participants')
        .insert([
          { room_id: newRoom.id, user_id: currentUser.id },
          { room_id: newRoom.id, user_id: selectedUserForNewChat.id }
        ]);
      if (partErr) throw partErr;

      toast.success('Chat iniciado');
      setShowNewChatModal(false);
      fetchChatRooms();
      setSelectedRoom(newRoom);
    } catch (error) {
      toast.error('Error al iniciar chat: ' + error.message);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleCreateGroupChat = async () => {
    const targetClientId = isAdmin ? selectedClientForNewChat?.id : currentUser.client_id;
    const targetClientName = isAdmin ? selectedClientForNewChat?.nombre : 'Mi Sucursal';

    if (!targetClientId) return;
    setIsCreatingRoom(true);

    try {
      const { data: newRoom, error: roomErr } = await supabase
        .from('chat_rooms')
        .insert({ type: 'GROUP', client_id: targetClientId, name: `Equipo ${targetClientName}` })
        .select()
        .single();
      if (roomErr) throw roomErr;

      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .or(`client_id.eq.${targetClientId},role.eq.ADMIN`);

      if (users) {
        const parts = users.map(u => ({ room_id: newRoom.id, user_id: u.id }));
        await supabase.from('chat_participants').insert(parts);
      }

      toast.success('Chat de equipo creado');
      setShowNewChatModal(false);
      fetchChatRooms();
      setSelectedRoom(newRoom);
    } catch (error) {
      toast.error('Error al crear chat');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const getRoomDisplayName = (room) => {
    if (room.type === 'GROUP') return room.name || room.clientes?.nombre || 'Chat de Sucursal';
    const other = room.chat_participants?.find(p => p.user_id !== currentUser.id);
    return other?.profiles?.full_name || 'Chat Privado';
  };

  return (
    <div className="flex h-full w-full bg-white dark:bg-slate-900 overflow-hidden font-sans relative">
      
      {/* VISTA 1: LISTA DE CHATS */}
      {!selectedRoom ? (
        <div className="w-full h-full flex flex-col">
          <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
            <div className="min-w-0 pr-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">Mensajes</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 truncate">Centro de Soporte</p>
            </div>
            <button onClick={openNewChatModal} className="p-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95 shrink-0">
              <Plus size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loadingRooms ? (
              <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-red-600 mb-2" /></div>
            ) : chatRooms.length === 0 ? (
              <div className="p-8 h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">No hay conversaciones activas</p>
                <button onClick={openNewChatModal} className="mt-4 text-xs font-bold text-red-600 hover:underline">Iniciar una ahora</button>
              </div>
            ) : (
              chatRooms.map(room => (
                <div 
                  key={room.id} 
                  onClick={() => setSelectedRoom(room)}
                  className="p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all relative group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm ${room.type === 'GROUP' ? 'bg-blue-600' : 'bg-slate-800 dark:bg-slate-700'}`}>
                      {room.type === 'GROUP' ? <Users size={20} /> : <User size={20} />}
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight mb-1">{getRoomDisplayName(room)}</h3>
                      <div className="flex items-center gap-2">
                         <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${room.type === 'GROUP' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {room.type === 'GROUP' ? 'Equipo' : 'Privado'}
                         </span>
                         <span className="text-[10px] text-slate-400 truncate">Pulsa para ver</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(room.id); }}
                        className="opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (

        /* VISTA 2: ÁREA DE CHAT ACTIVO */
        <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950/50">
          {/* Header del Chat */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900 shadow-sm z-10 shrink-0">
            <button onClick={() => setSelectedRoom(null)} className="p-2 -ml-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0">
              <ChevronLeft size={24} />
            </button>
            <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white ${selectedRoom.type === 'GROUP' ? 'bg-blue-600' : 'bg-slate-800'}`}>
              {selectedRoom.type === 'GROUP' ? <Users size={18}/> : <User size={18}/>}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{getRoomDisplayName(selectedRoom)}</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0"></div>
                <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter truncate">Canal en tiempo real</span>
              </div>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setShowDeleteConfirm(selectedRoom.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all shrink-0"
                title="Eliminar Conversación"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          
          {/* Lista de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUser.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] group`}>
                    {!isMe && (
                      <div className="flex items-center gap-2 mb-1.5 ml-1">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{msg.sender?.full_name}</span>
                      </div>
                    )}
                    <div className={`p-3 rounded-2xl shadow-sm relative ${isMe ? 'bg-red-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'}`}>
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-[9px] mt-1.5 font-medium opacity-60 ${isMe ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form (AQUÍ ESTÁ LA CORRECCIÓN DE LA "X" APLICANDO pr-20) */}
          <form onSubmit={sendMessage} className="p-3 pr-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2 items-center shrink-0">
            <div className="flex-1 min-w-0 relative">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Mensaje..."
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 dark:text-white transition-all outline-none"
              />
            </div>
            <button 
              type="submit" 
              disabled={!newMessage.trim()} 
              className="p-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-30 disabled:grayscale transition-all shadow-md shadow-red-600/20 active:scale-90 shrink-0"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Modal Confirmar Borrado */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">¿Eliminar Chat?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Esta acción es irreversible y borrará todos los mensajes para todos los participantes.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleDeleteRoom(showDeleteConfirm)} className="w-full py-3.5 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all">Eliminar</button>
              <button onClick={() => setShowDeleteConfirm(null)} className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Chat */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[8000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg dark:text-white">Nueva Conversación</h3>
              <button onClick={() => setShowNewChatModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <User size={14} />
                  <label className="text-[10px] font-bold uppercase tracking-widest">Chat Privado Directo</label>
                </div>
                <select 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm dark:text-white focus:ring-2 focus:ring-red-600 outline-none appearance-none transition-all"
                  onChange={(e) => setSelectedUserForNewChat(usersForNewChat.find(u => u.id === e.target.value))}
                >
                  <option value="">Seleccionar destinatario...</option>
                  {usersForNewChat.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
                </select>
                <button onClick={handleCreatePrivateChat} disabled={!selectedUserForNewChat || isCreatingRoom} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all disabled:opacity-30 shadow-lg">
                  Iniciar Chat Privado
                </button>
              </div>

              {isAdmin && (
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-blue-500">
                    <Building2 size={14} />
                    <label className="text-[10px] font-bold uppercase tracking-widest">Canal de Sucursal (Equipo)</label>
                  </div>
                  <select 
                    className="w-full p-4 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl text-sm dark:text-white focus:ring-2 focus:ring-blue-600 outline-none appearance-none transition-all"
                    onChange={(e) => setSelectedClientForNewChat(clientsForNewChat.find(c => c.id === e.target.value))}
                  >
                    <option value="">Seleccionar empresa/sucursal...</option>
                    {clientsForNewChat.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <button onClick={handleCreateGroupChat} disabled={!selectedClientForNewChat || isCreatingRoom} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-30 shadow-lg shadow-blue-600/20">
                    Crear Chat de Equipo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;