import React from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

// Esta función recibe 2 cosas: El nombre de lo que vas a borrar, y la función a ejecutar si dicen que sí
export const showConfirmDelete = (itemName, onConfirmAction) => {
  toast((t) => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-red-500" size={20}/>
        <span className="font-black uppercase tracking-tighter">¿ELIMINAR {itemName}?</span>
      </div>
      <span className="text-[10px] text-slate-400 normal-case tracking-normal font-bold">
        Esta acción es irreversible y borrará los datos de la base.
      </span>
      
      <div className="flex gap-2 mt-2">
        <button 
          onClick={() => toast.dismiss(t.id)} 
          className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-black active:scale-95 transition-all"
        >
          CANCELAR
        </button>
        <button 
          onClick={() => {
            toast.dismiss(t.id); // Cerramos el toast
            onConfirmAction();   // ¡Ejecutamos el borrado real!
          }} 
          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-black active:scale-95 transition-all"
        >
          ELIMINAR
        </button>
      </div>
    </div>
  ), { duration: Infinity });
};