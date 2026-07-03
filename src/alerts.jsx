import React from "react";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";

export const showConfirmDelete = (itemName, onConfirmAction) => {
  toast(
    (t) => (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-red-500" size={18} />
          <span className="font-semibold text-sm text-slate-800">
            ¿Eliminar {itemName}?
          </span>
        </div>
        <span className="text-xs text-slate-500">
          Esta acción es irreversible y borrará los datos de la base.
        </span>

        <div className="flex gap-2 mt-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium active:scale-[0.98] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              onConfirmAction();
            }}
            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium active:scale-[0.98] transition-all"
          >
            Eliminar
          </button>
        </div>
      </div>
    ),
    { duration: Infinity },
  );
};
