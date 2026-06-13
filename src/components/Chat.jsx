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
      // 1. Crear sala
      const { data: newRoom, error: roomErr } = await supabase
        .from('chat_rooms')
        .insert({ type: 'PRIVATE' })
        .select()
        .single();
      if (roomErr) throw roomErr;

      // 2. Añadir participantes
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
    <div className="flex h-full bg-white dark:bg-slate-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className={`w-full md:w-85 border-r border-slate-200 dark:border-slate-800 flex flex-col ${selectedRoom ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mensajes</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Centro de Soporte</p>
          </div>
          <button onClick={openNewChatModal} className="p-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95">
            <Plus size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loadingRooms ? (
            <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-red-600 mb-2" /></div>
          ) : chatRooms.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No hay chats.</div>
          ) : (
            chatRooms.map(room => (
              <div 
                key={room.id} 
                onClick={() => setSelectedRoom(room)}
                className={`p-5 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all relative group ${selectedRoom?.id === room.id ? 'bg-red-50/50 dark:bg-red-900/10 border-l-4 border-l-red-600' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold ${room.type === 'GROUP' ? 'bg-blue-600' : 'bg-slate-800 dark:bg-slate-700'}`}>
                    {room.type === 'GROUP' ? <Users size={20}/> : <User size={20}/>}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight mb-1">{getRoomDisplayName(room)}</h3>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${room.type === 'GROUP' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {room.type === 'GROUP' ? 'Equipo' : 'Privado'}
                    </span>
                  </div>
                  {isAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(room.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${selectedRoom ? 'flex' : 'hidden md:flex'}`}>
        {selectedRoom ? (
          <>
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-white dark:bg-slate-900 shadow-sm z-10">
              <button onClick={() => setSelectedRoom(null)} className="md:hidden p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ChevronLeft /></button>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${selectedRoom.type === 'GROUP' ? 'bg-blue-600' : 'bg-slate-800'}`}>
                {selectedRoom.type === 'GROUP' ? <Users size={18}/> : <User size={18}/>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white truncate">{getRoomDisplayName(selectedRoom)}</h3>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Canal activo
                </span>
              </div>
              {isAdmin && (
                <button onClick={() => setShowDeleteConfirm(selectedRoom.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-all">
                  <Trash2 size={20} />
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-950/50">
              {messages.map(msg => {
                const isMe = msg.sender_id === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%]">
                      {!isMe && <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">{msg.sender?.full_name}</p>}
                      <div className={`p-4 rounded-2xl shadow-sm ${isMe ? 'bg-red-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'}`}>
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[9px] mt-2 opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-3.5 text-sm dark:text-white"
              />
              <button type="submit" disabled={!newMessage.trim()} className="p-3.5 bg-red-600 text-white rounded-2xl hover:bg-red-700 disabled:opacity-30 transition-all shadow-lg shadow-red-600/20 active:scale-90">
                <Send size={22} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50 dark:bg-slate-950/30">
            <MessageSquare size={48} className="text-red-600 opacity-10 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Centro de Soporte</h3>
            <p className="text-sm text-slate-500">Selecciona un chat para comenzar.</p>
          </div>
        )}
      </div>

      {/* Modal Confirmar Borrado */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><AlertCircle size={32} /></div>
            <h3 className="text-xl font-bold dark:text-white mb-2">¿Eliminar Chat?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Esta acción borrará la conversación para todos los participantes.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleDeleteRoom(showDeleteConfirm)} className="w-full py-3.5 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700">Eliminar</button>
              <button onClick={() => setShowDeleteConfirm(null)} className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Chat */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[8000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg dark:text-white">Nueva Conversación</h3>
              <button onClick={() => setShowNewChatModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chat Privado</label>
                <select 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm dark:text-white outline-none"
                  onChange={(e) => setSelectedUserForNewChat(usersForNewChat.find(u => u.id === e.target.value))}
                >
                  <option value="">Seleccionar destinatario...</option>
                  {usersForNewChat.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
                </select>
                <button onClick={handleCreatePrivateChat} disabled={!selectedUserForNewChat || isCreatingRoom} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all disabled:opacity-30">
                  Iniciar Chat Privado
                </button>
              </div>

              {isAdmin && (
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Chat de Sucursal</label>
                  <select 
                    className="w-full p-4 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl text-sm dark:text-white outline-none"
                    onChange={(e) => setSelectedClientForNewChat(clientsForNewChat.find(c => c.id === e.target.value))}
                  >
                    <option value="">Seleccionar empresa...</option>
                    {clientsForNewChat.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <button onClick={handleCreateGroupChat} disabled={!selectedClientForNewChat || isCreatingRoom} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-30">
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
